"""
StayWise AI — Synthetic & Point-in-Time Booking Data Generator
Generates realistic hotel reservation events, daily point-in-time snapshots,
and ground-truth daily room category occupancy actuals without future data leakage.
"""

import os
import json
import random
import datetime
from typing import Dict, List, Tuple
from collections import defaultdict
import numpy as np
import pandas as pd

# Fix seed for strict reproducibility
RANDOM_SEED = 42
random.seed(RANDOM_SEED)
np.random.seed(RANDOM_SEED)

HOTEL_CONFIG = {
    "hotel_id": "HOTEL_01",
    "name": "Grand Azure Resort & Spa",
    "total_rooms": 140,
    "city": "Monterey Bay",
    "categories": {
        "STD": {"name": "Standard King/Twin", "capacity": 70, "base_rate": 160.0, "clean_dep": 30, "clean_stay": 15},
        "DLX": {"name": "Deluxe Ocean View", "capacity": 40, "base_rate": 240.0, "clean_dep": 35, "clean_stay": 18},
        "SUI": {"name": "Executive Suite", "capacity": 20, "base_rate": 390.0, "clean_dep": 45, "clean_stay": 25},
        "EXE": {"name": "Presidential Penthouse", "capacity": 10, "base_rate": 650.0, "clean_dep": 60, "clean_stay": 30},
    }
}

# Major local / seasonal events in Monterey Bay
EVENTS = {
    "2023-01-16": ("Martin Luther King Weekend", 1.25),
    "2023-02-14": ("Valentine's Getaway", 1.30),
    "2023-04-16": ("Sea Otter Classic Festival", 1.45),
    "2023-05-29": ("Memorial Day Weekend", 1.50),
    "2023-07-04": ("Independence Day Celebration", 1.55),
    "2023-08-18": ("Monterey Car Week", 1.70),
    "2023-09-04": ("Labor Day Weekend", 1.45),
    "2023-10-31": ("Halloween Coastal Gala", 1.20),
    "2023-11-23": ("Thanksgiving Holiday", 1.35),
    "2023-12-25": ("Christmas Holiday", 1.40),
    "2023-12-31": ("New Year's Eve", 1.65),
    "2024-01-15": ("MLK Weekend 2024", 1.25),
    "2024-02-14": ("Valentine's Weekend 2024", 1.30),
    "2024-04-20": ("Sea Otter Classic 2024", 1.45),
    "2024-05-27": ("Memorial Day 2024", 1.50),
    "2024-07-04": ("July 4th 2024", 1.60),
    "2024-08-16": ("Monterey Car Week 2024", 1.75),
}

START_DATE = datetime.date(2023, 1, 1)
END_DATE = datetime.date(2024, 8, 31)

def get_event_impact(d: datetime.date) -> float:
    d_str = d.isoformat()
    if d_str in EVENTS:
        return EVENTS[d_str][1]
    for evt_date_str, (_, mult) in EVENTS.items():
        evt_d = datetime.date.fromisoformat(evt_date_str)
        if 0 <= (d - evt_d).days <= 2 or 0 <= (evt_d - d).days <= 1:
            return 1.0 + (mult - 1.0) * 0.6
    return 1.0

def generate_booking_events() -> Tuple[pd.DataFrame, pd.DataFrame]:
    total_days = (END_DATE - START_DATE).days + 1
    all_stay_dates = [START_DATE + datetime.timedelta(days=i) for i in range(total_days)]
    
    events: List[Dict] = []
    actual_occupancy: Dict[Tuple[datetime.date, str], int] = {
        (d, cat): 0 for d in all_stay_dates for cat in HOTEL_CONFIG["categories"]
    }

    booking_id_counter = 100000

    for stay_date in all_stay_dates:
        dow = stay_date.weekday()
        month = stay_date.month
        is_weekend = dow in (4, 5)
        
        month_factor = 1.0 + 0.35 * np.sin((month - 3) * np.pi / 6)
        weekend_factor = 1.35 if is_weekend else (1.10 if dow == 6 else 0.90)
        event_factor = get_event_impact(stay_date)
        
        combined_demand_multiplier = month_factor * weekend_factor * event_factor

        for cat_code, cat_info in HOTEL_CONFIG["categories"].items():
            cap = cat_info["capacity"]
            target_mean_demand = cap * 0.72 * combined_demand_multiplier
            raw_demand = np.random.normal(target_mean_demand, scale=cap * 0.08)
            num_reservations_requested = max(1, int(round(raw_demand)))

            for _ in range(num_reservations_requested):
                booking_id_counter += 1
                b_id = f"BK-{booking_id_counter}"
                
                lead_days = int(np.clip(np.random.lognormal(mean=2.8, sigma=0.85), 0, 180))
                booking_dt = stay_date - datetime.timedelta(days=lead_days)
                booking_timestamp = datetime.datetime.combine(
                    booking_dt,
                    datetime.time(random.randint(8, 22), random.randint(0, 59))
                )
                
                los = random.choices([1, 2, 3, 4, 5], weights=[0.45, 0.35, 0.12, 0.05, 0.03])[0]
                
                base_cancel_prob = 0.15 + (lead_days / 180.0) * 0.20
                if cat_code in ("SUI", "EXE"):
                    base_cancel_prob += 0.05
                is_cancelled = random.random() < base_cancel_prob
                
                cancel_timestamp = None
                if is_cancelled:
                    cancel_offset_days = random.randint(0, max(0, lead_days - 1))
                    cancel_timestamp = booking_timestamp + datetime.timedelta(days=cancel_offset_days)
                    status = "cancelled"
                else:
                    status = "checked_out" if stay_date < END_DATE else "confirmed"

                if not is_cancelled:
                    if actual_occupancy[(stay_date, cat_code)] < cap:
                        actual_occupancy[(stay_date, cat_code)] += 1
                
                num_guests = random.choices([1, 2, 3, 4], weights=[0.3, 0.5, 0.15, 0.05])[0]
                adr = round(cat_info["base_rate"] * (0.85 + 0.3 * combined_demand_multiplier) + random.uniform(-10, 15), 2)

                events.append({
                    "booking_id": b_id,
                    "hotel_id": HOTEL_CONFIG["hotel_id"],
                    "room_category": cat_code,
                    "booking_timestamp": booking_timestamp.isoformat(),
                    "stay_date": stay_date.isoformat(),
                    "lead_time_days": lead_days,
                    "status": status,
                    "cancellation_timestamp": cancel_timestamp.isoformat() if cancel_timestamp else None,
                    "num_guests": num_guests,
                    "adr": adr,
                    "length_of_stay": los
                })

    events_df = pd.DataFrame(events)

    actuals_rows = []
    for (s_date, cat), occ in actual_occupancy.items():
        cap = HOTEL_CONFIG["categories"][cat]["capacity"]
        dow = s_date.weekday()
        actuals_rows.append({
            "hotel_id": HOTEL_CONFIG["hotel_id"],
            "stay_date": s_date.isoformat(),
            "room_category": cat,
            "occupied_rooms": occ,
            "room_capacity": cap,
            "occupancy_rate": round((occ / cap) * 100.0, 2),
            "day_of_week": dow,
            "is_weekend": 1 if dow in (4, 5) else 0,
            "month": s_date.month,
            "event_impact_score": get_event_impact(s_date)
        })
    actuals_df = pd.DataFrame(actuals_rows)
    return events_df, actuals_df


def build_daily_snapshots(events_df: pd.DataFrame, actuals_df: pd.DataFrame) -> pd.DataFrame:
    """
    Fast vectorized/dictionary construction of daily point-in-time snapshots at 23:59:59 cutoff date (t0).
    Guarantees strict temporal point-in-time reconstruction.
    """
    # Group booking items: (stay_date, category) -> list of (booking_date, is_cancelled, cancel_date)
    grouped_events = defaultdict(list)
    
    for _, row in events_df.iterrows():
        b_date = datetime.date.fromisoformat(row["booking_timestamp"][:10])
        s_date = datetime.date.fromisoformat(row["stay_date"])
        is_canc = (row["status"] == "cancelled")
        c_date = datetime.date.fromisoformat(row["cancellation_timestamp"][:10]) if is_canc and row["cancellation_timestamp"] else None
        grouped_events[(s_date, row["room_category"])].append((b_date, is_canc, c_date))

    snapshot_start = datetime.date(2023, 3, 1)
    snapshot_end = datetime.date(2024, 8, 17)
    snapshot_days = (snapshot_end - snapshot_start).days + 1
    
    snapshot_records = []
    print(f"Generating snapshots across {snapshot_days} cutoff days...")

    for i in range(snapshot_days):
        t0 = snapshot_start + datetime.timedelta(days=i)
        t_minus_6 = t0 - datetime.timedelta(days=6)
        
        for h in range(1, 15):
            d = t0 + datetime.timedelta(days=h)
            if d > END_DATE:
                continue

            for cat_code, cat_info in HOTEL_CONFIG["categories"].items():
                cap = cat_info["capacity"]
                ev_list = grouped_events.get((d, cat_code), [])
                
                otb_confirmed = 0
                otb_cancelled = 0
                pickup_1d = 0
                pickup_7d = 0

                for b_date, is_canc, c_date in ev_list:
                    if b_date <= t0:
                        # Reservation existed by t0
                        if is_canc and c_date and c_date <= t0:
                            # Cancelled by t0
                            otb_cancelled += 1
                        else:
                            # Active confirmed on books as of t0
                            otb_confirmed += 1
                            if b_date == t0:
                                pickup_1d += 1
                            if b_date >= t_minus_6:
                                pickup_7d += 1

                otb_confirmed = min(otb_confirmed, cap)

                snapshot_records.append({
                    "snapshot_date": t0.isoformat(),
                    "stay_date": d.isoformat(),
                    "room_category": cat_code,
                    "lead_time": h,
                    "otb_rooms": otb_confirmed,
                    "otb_cancellations": otb_cancelled,
                    "pickup_1d": pickup_1d,
                    "pickup_7d": pickup_7d,
                    "room_capacity": cap
                })

    snapshots_df = pd.DataFrame(snapshot_records)
    return snapshots_df


def save_datasets(events_df: pd.DataFrame, actuals_df: pd.DataFrame, snapshots_df: pd.DataFrame, base_dir: str):
    raw_dir = os.path.join(base_dir, "raw")
    processed_dir = os.path.join(base_dir, "processed")
    synthetic_dir = os.path.join(base_dir, "synthetic")
    
    os.makedirs(raw_dir, exist_ok=True)
    os.makedirs(processed_dir, exist_ok=True)
    os.makedirs(synthetic_dir, exist_ok=True)

    events_path = os.path.join(raw_dir, "hotel_booking_events.csv")
    actuals_path = os.path.join(processed_dir, "occupancy_actuals.csv")
    snapshots_path = os.path.join(synthetic_dir, "booking_snapshots.csv")
    config_path = os.path.join(processed_dir, "hotel_config.json")

    events_df.to_csv(events_path, index=False)
    actuals_df.to_csv(actuals_path, index=False)
    snapshots_df.to_csv(snapshots_path, index=False)
    
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(HOTEL_CONFIG, f, indent=2)

    print(f"Saved {len(events_df)} booking events -> {events_path}")
    print(f"Saved {len(actuals_df)} ground-truth occupancy records -> {actuals_path}")
    print(f"Saved {len(snapshots_df)} point-in-time snapshot records -> {snapshots_path}")
    print(f"Saved hotel configuration -> {config_path}")


if __name__ == "__main__":
    base_data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../data"))
    print("Starting StayWise AI High-Performance Data Generator...")
    t_start = datetime.datetime.now()
    ev_df, act_df = generate_booking_events()
    snap_df = build_daily_snapshots(ev_df, act_df)
    save_datasets(ev_df, act_df, snap_df, base_data_dir)
    print(f"Data generation complete in {(datetime.datetime.now() - t_start).total_seconds():.2f}s!")
