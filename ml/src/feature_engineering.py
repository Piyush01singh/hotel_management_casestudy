"""
StayWise AI — Feature Engineering Pipeline
Constructs time-series features strictly respecting prediction cutoffs (t0)
to ensure zero future/target leakage.
"""

import os
import json
import datetime
from typing import Tuple, Dict, Any
import numpy as np
import pandas as pd

CALENDAR_EVENTS = {
    "2023-01-16": 1.25, "2023-02-14": 1.30, "2023-04-16": 1.45,
    "2023-05-29": 1.50, "2023-07-04": 1.55, "2023-08-18": 1.70,
    "2023-09-04": 1.45, "2023-10-31": 1.20, "2023-11-23": 1.35,
    "2023-12-25": 1.40, "2023-12-31": 1.65, "2024-01-15": 1.25,
    "2024-02-14": 1.30, "2024-04-20": 1.45, "2024-05-27": 1.50,
    "2024-07-04": 1.60, "2024-08-16": 1.75
}

def get_event_impact(d: datetime.date) -> float:
    d_str = d.isoformat()
    if d_str in CALENDAR_EVENTS:
        return CALENDAR_EVENTS[d_str]
    for evt_date_str, mult in CALENDAR_EVENTS.items():
        evt_d = datetime.date.fromisoformat(evt_date_str)
        if 0 <= (d - evt_d).days <= 2 or 0 <= (evt_d - d).days <= 1:
            return 1.0 + (mult - 1.0) * 0.6
    return 1.0

def engineer_features(
    snapshots_df: pd.DataFrame,
    actuals_df: pd.DataFrame
) -> pd.DataFrame:
    """
    Transforms snapshots and past actuals into a rigorous, leakage-free feature matrix.
    Every record represents (t0, stay_date, room_category).
    All lag and actual statistics are computed strictly on stay dates <= t0.
    """
    snapshots_df = snapshots_df.copy()
    actuals_df = actuals_df.copy()

    actuals_df["stay_date_dt"] = pd.to_datetime(actuals_df["stay_date"]).dt.date
    snapshots_df["snapshot_date_dt"] = pd.to_datetime(snapshots_df["snapshot_date"]).dt.date
    snapshots_df["stay_date_dt"] = pd.to_datetime(snapshots_df["stay_date"]).dt.date

    # 1. Merge ground-truth target for stay_date
    target_lookup = actuals_df.set_index(["stay_date_dt", "room_category"])["occupied_rooms"].to_dict()
    snapshots_df["target_occupied_rooms"] = snapshots_df.apply(
        lambda r: target_lookup.get((r["stay_date_dt"], r["room_category"]), np.nan), axis=1
    )

    # 2. Add calendar features for stay_date
    snapshots_df["day_of_week"] = snapshots_df["stay_date_dt"].apply(lambda d: d.weekday())
    snapshots_df["is_weekend"] = snapshots_df["day_of_week"].apply(lambda dow: 1 if dow in (4, 5) else 0)
    snapshots_df["month"] = snapshots_df["stay_date_dt"].apply(lambda d: d.month)
    snapshots_df["event_impact_score"] = snapshots_df["stay_date_dt"].apply(get_event_impact)

    # 3. Booking ratios
    snapshots_df["otb_occupancy_ratio"] = (
        snapshots_df["otb_rooms"] / snapshots_df["room_capacity"]
    ).clip(0.0, 1.0)
    snapshots_df["cancellation_rate_otb"] = (
        snapshots_df["otb_cancellations"] / (snapshots_df["otb_rooms"] + snapshots_df["otb_cancellations"] + 1e-4)
    ).clip(0.0, 1.0)

    # 4. Strictly leakage-free historical lag features:
    # Build a fast lookup for past actuals by (stay_date_dt, room_category)
    actuals_matrix = actuals_df.pivot(index="stay_date_dt", columns="room_category", values="occupied_rooms").sort_index()

    # Precompute rolling statistics on actuals
    rolling_7d = actuals_matrix.rolling(7, min_periods=1).mean()
    rolling_28d = actuals_matrix.rolling(28, min_periods=1).mean()

    # For each row, find the most recent known same-day-of-week occupancy <= t0
    # and the rolling 7d/28d demand as of cutoff t0
    hist_lag_dow_list = []
    hist_roll7_list = []
    hist_roll28_list = []

    # Cache per (t0, cat, dow)
    dow_cache: Dict[Tuple[datetime.date, str, int], float] = {}
    roll_cache: Dict[Tuple[datetime.date, str], Tuple[float, float]] = {}

    for _, row in snapshots_df.iterrows():
        t0 = row["snapshot_date_dt"]
        cat = row["room_category"]
        dow = row["day_of_week"]

        # Cache check for rolling stats
        if (t0, cat) not in roll_cache:
            if t0 in rolling_7d.index:
                r7 = float(rolling_7d.loc[t0, cat])
                r28 = float(rolling_28d.loc[t0, cat])
            else:
                # Find latest date <= t0
                valid_dates = rolling_7d.index[rolling_7d.index <= t0]
                if len(valid_dates) > 0:
                    latest = valid_dates[-1]
                    r7 = float(rolling_7d.loc[latest, cat])
                    r28 = float(rolling_28d.loc[latest, cat])
                else:
                    r7 = float(row["room_capacity"] * 0.7)
                    r28 = float(row["room_capacity"] * 0.7)
            roll_cache[(t0, cat)] = (r7, r28)
        
        r7, r28 = roll_cache[(t0, cat)]
        hist_roll7_list.append(r7)
        hist_roll28_list.append(r28)

        # Cache check for same DOW lag
        if (t0, cat, dow) not in dow_cache:
            # Look backwards from t0 for the latest stay date with the same dow
            days_back = (t0.weekday() - dow) % 7
            if days_back == 0:
                days_back = 7 # exactly 1 week ago
            latest_same_dow = t0 - datetime.timedelta(days=days_back)
            
            if (latest_same_dow, cat) in target_lookup:
                lag_val = float(target_lookup[(latest_same_dow, cat)])
            else:
                lag_val = float(row["room_capacity"] * 0.7)
            dow_cache[(t0, cat, dow)] = lag_val

        hist_lag_dow_list.append(dow_cache[(t0, cat, dow)])

    snapshots_df["hist_same_dow_lag"] = hist_lag_dow_list
    snapshots_df["hist_rolling_mean_7d"] = hist_roll7_list
    snapshots_df["hist_rolling_mean_28d"] = hist_roll28_list

    # 5. One-hot encode room categories
    for cat in ["STD", "DLX", "SUI", "EXE"]:
        snapshots_df[f"category_{cat}"] = (snapshots_df["room_category"] == cat).astype(int)

    # Clean and filter
    snapshots_df = snapshots_df.dropna(subset=["target_occupied_rooms"])
    snapshots_df["target_occupied_rooms"] = snapshots_df["target_occupied_rooms"].astype(int)

    return snapshots_df

if __name__ == "__main__":
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../data"))
    snapshots_path = os.path.join(base_dir, "synthetic", "booking_snapshots.csv")
    actuals_path = os.path.join(base_dir, "processed", "occupancy_actuals.csv")
    output_path = os.path.join(base_dir, "processed", "feature_matrix.csv")

    print(f"Loading snapshots from {snapshots_path}...")
    snapshots_df = pd.read_csv(snapshots_path)
    actuals_df = pd.read_csv(actuals_path)

    print("Running feature engineering...")
    features_df = engineer_features(snapshots_df, actuals_df)
    features_df.to_csv(output_path, index=False)
    print(f"Engineered {len(features_df)} rows with {features_df.shape[1]} columns -> {output_path}")
