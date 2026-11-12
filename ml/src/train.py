"""
StayWise AI — Machine Learning Training, Evaluation, Uncertainty & Explainability
Implements Seasonal Naive Baseline, Ridge Regression, and XGBoost Regressor.
Performs strict chronological evaluation, computes MAE/RMSE/WAPE by category and horizon,
calibrates uncertainty intervals, extracts TreeSHAP values, and serializes all artifacts.
"""

import os
import json
import datetime
from typing import Dict, Any, List, Tuple
import numpy as np
import pandas as pd
import joblib

from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import Ridge
import xgboost as xgb

RANDOM_SEED = 42

FEATURE_COLS = [
    "lead_time",
    "day_of_week",
    "is_weekend",
    "month",
    "event_impact_score",
    "otb_rooms",
    "otb_cancellations",
    "pickup_1d",
    "pickup_7d",
    "otb_occupancy_ratio",
    "cancellation_rate_otb",
    "hist_same_dow_lag",
    "hist_rolling_mean_7d",
    "hist_rolling_mean_28d",
    "room_capacity",
    "category_STD",
    "category_DLX",
    "category_SUI",
    "category_EXE"
]

TARGET_COL = "target_occupied_rooms"

def compute_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    mae = float(np.mean(np.abs(y_true - y_pred)))
    rmse = float(np.sqrt(np.mean((y_true - y_pred) ** 2)))
    sum_true = float(np.sum(y_true))
    wape = float((np.sum(np.abs(y_true - y_pred)) / (sum_true + 1e-6)) * 100.0)
    return {
        "mae": round(mae, 3),
        "rmse": round(rmse, 3),
        "wape": round(wape, 2)
    }

def train_and_evaluate(base_data_dir: str, artifacts_dir: str, docs_dir: str):
    os.makedirs(artifacts_dir, exist_ok=True)
    features_path = os.path.join(base_data_dir, "processed", "feature_matrix.csv")
    df = pd.read_csv(features_path)

    # Sort strictly chronologically by stay_date
    df["stay_date_dt"] = pd.to_datetime(df["stay_date"]).dt.date
    df = df.sort_values(by=["stay_date_dt", "snapshot_date", "room_category"]).reset_index(drop=True)

    unique_stay_dates = np.array(sorted(df["stay_date_dt"].unique()))
    n_dates = len(unique_stay_dates)
    
    train_idx_end = int(n_dates * 0.60)
    val_idx_end = int(n_dates * 0.80)

    train_dates = set(unique_stay_dates[:train_idx_end])
    val_dates = set(unique_stay_dates[train_idx_end:val_idx_end])
    test_dates = set(unique_stay_dates[val_idx_end:])

    train_mask = df["stay_date_dt"].isin(train_dates)
    val_mask = df["stay_date_dt"].isin(val_dates)
    test_mask = df["stay_date_dt"].isin(test_dates)

    train_df = df[train_mask].copy()
    val_df = df[val_mask].copy()
    test_df = df[test_mask].copy()

    print(f"Dataset split: Train={len(train_df)} ({len(train_dates)} dates), "
          f"Val={len(val_df)} ({len(val_dates)} dates), "
          f"Test={len(test_df)} ({len(test_dates)} dates)")

    X_train = train_df[FEATURE_COLS].values
    y_train = train_df[TARGET_COL].values
    cap_train = train_df["room_capacity"].values

    X_val = val_df[FEATURE_COLS].values
    y_val = val_df[TARGET_COL].values
    cap_val = val_df["room_capacity"].values

    X_test = test_df[FEATURE_COLS].values
    y_test = test_df[TARGET_COL].values
    cap_test = test_df["room_capacity"].values

    # Preprocessor for Linear/Ridge model
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    X_test_scaled = scaler.transform(X_test)

    # 1. Seasonal Naive Baseline
    pred_naive_val = np.clip(val_df["hist_same_dow_lag"].values, 0, cap_val)
    pred_naive_test = np.clip(test_df["hist_same_dow_lag"].values, 0, cap_test)
    metrics_naive = compute_metrics(y_test, pred_naive_test)

    # 2. Ridge Regression
    ridge_model = Ridge(alpha=10.0, random_state=RANDOM_SEED)
    ridge_model.fit(X_train_scaled, y_train)
    pred_ridge_val = np.clip(ridge_model.predict(X_val_scaled), 0, cap_val)
    pred_ridge_test = np.clip(ridge_model.predict(X_test_scaled), 0, cap_test)
    metrics_ridge = compute_metrics(y_test, pred_ridge_test)

    # 3. XGBoost Regressor with validation early stopping
    xgb_model = xgb.XGBRegressor(
        n_estimators=250,
        max_depth=5,
        learning_rate=0.06,
        subsample=0.85,
        colsample_bytree=0.85,
        early_stopping_rounds=25,
        eval_metric="rmse",
        random_state=RANDOM_SEED,
        n_jobs=-1
    )
    xgb_model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        verbose=False
    )
    pred_xgb_val = np.clip(xgb_model.predict(X_val), 0, cap_val)
    pred_xgb_test = np.clip(xgb_model.predict(X_test), 0, cap_test)
    metrics_xgb = compute_metrics(y_test, pred_xgb_test)

    print("\n--- Model Benchmark Performance (Held-Out Test Set) ---")
    print(f"Seasonal Naive Baseline : MAE={metrics_naive['mae']:.3f}, RMSE={metrics_naive['rmse']:.3f}, WAPE={metrics_naive['wape']:.2f}%")
    print(f"Ridge Regression        : MAE={metrics_ridge['mae']:.3f}, RMSE={metrics_ridge['rmse']:.3f}, WAPE={metrics_ridge['wape']:.2f}%")
    print(f"StayWise AI (XGBoost)   : MAE={metrics_xgb['mae']:.3f}, RMSE={metrics_xgb['rmse']:.3f}, WAPE={metrics_xgb['wape']:.2f}%")

    # 4. Error Breakdown by Category and Forecast Horizon (for XGBoost)
    test_eval_df = test_df.reset_index(drop=True).copy()
    test_eval_df["y_true"] = y_test
    test_eval_df["y_pred_xgb"] = pred_xgb_test
    test_eval_df["y_pred_ridge"] = pred_ridge_test
    test_eval_df["y_pred_naive"] = pred_naive_test

    category_metrics = {}
    for cat in ["STD", "DLX", "SUI", "EXE"]:
        sub = test_eval_df[test_eval_df["room_category"] == cat]
        category_metrics[cat] = {
            "xgb": compute_metrics(sub["y_true"].values, sub["y_pred_xgb"].values),
            "ridge": compute_metrics(sub["y_true"].values, sub["y_pred_ridge"].values),
            "naive": compute_metrics(sub["y_true"].values, sub["y_pred_naive"].values),
            "count": len(sub)
        }

    horizon_metrics = {}
    h1_7 = test_eval_df[test_eval_df["lead_time"] <= 7]
    h8_14 = test_eval_df[test_eval_df["lead_time"] > 7]
    horizon_metrics["1_7_days"] = {
        "xgb": compute_metrics(h1_7["y_true"].values, h1_7["y_pred_xgb"].values),
        "ridge": compute_metrics(h1_7["y_true"].values, h1_7["y_pred_ridge"].values),
        "naive": compute_metrics(h1_7["y_true"].values, h1_7["y_pred_naive"].values),
    }
    horizon_metrics["8_14_days"] = {
        "xgb": compute_metrics(h8_14["y_true"].values, h8_14["y_pred_xgb"].values),
        "ridge": compute_metrics(h8_14["y_true"].values, h8_14["y_pred_ridge"].values),
        "naive": compute_metrics(h8_14["y_true"].values, h8_14["y_pred_naive"].values),
    }

    # 5. Uncertainty Calibration on Validation Residuals
    val_residuals = y_val - pred_xgb_val
    val_leads = val_df["lead_time"].values
    
    horizon_buckets = {
        "short_1_3d": (1, 3),
        "medium_4_7d": (4, 7),
        "long_8_14d": (8, 14)
    }
    uncertainty_calibrations = {}

    for b_name, (h_min, h_max) in horizon_buckets.items():
        mask = (val_leads >= h_min) & (val_leads <= h_max)
        res_bucket = val_residuals[mask]
        
        q80_low = float(np.percentile(res_bucket, 10))
        q80_high = float(np.percentile(res_bucket, 90))

        q95_low = float(np.percentile(res_bucket, 2.5))
        q95_high = float(np.percentile(res_bucket, 97.5))

        test_mask_b = (test_df["lead_time"].values >= h_min) & (test_df["lead_time"].values <= h_max)
        test_y_b = y_test[test_mask_b]
        test_pred_b = pred_xgb_test[test_mask_b]
        test_cap_b = cap_test[test_mask_b]

        lower_80 = np.clip(test_pred_b + q80_low, 0, test_cap_b)
        upper_80 = np.clip(test_pred_b + q80_high, 0, test_cap_b)
        cov_80 = float(np.mean((test_y_b >= lower_80) & (test_y_b <= upper_80)) * 100.0)

        lower_95 = np.clip(test_pred_b + q95_low, 0, test_cap_b)
        upper_95 = np.clip(test_pred_b + q95_high, 0, test_cap_b)
        cov_95 = float(np.mean((test_y_b >= lower_95) & (test_y_b <= upper_95)) * 100.0)

        uncertainty_calibrations[b_name] = {
            "lead_range": [h_min, h_max],
            "q80": {"lower_offset": round(q80_low, 3), "upper_offset": round(q80_high, 3), "test_coverage_pct": round(cov_80, 2)},
            "q95": {"lower_offset": round(q95_low, 3), "upper_offset": round(q95_high, 3), "test_coverage_pct": round(cov_95, 2)}
        }

    # 6. Feature Importance & TreeSHAP Attributions via XGBoost Booster C++ Engine
    feature_importances = dict(zip(FEATURE_COLS, [round(float(v), 4) for v in xgb_model.feature_importances_]))
    sorted_importances = dict(sorted(feature_importances.items(), key=lambda item: item[1], reverse=True))

    print("Extracting TreeSHAP attributions via XGBoost engine...")
    sample_size = min(500, len(X_test))
    np.random.seed(RANDOM_SEED)
    sample_indices = np.random.choice(len(X_test), size=sample_size, replace=False)
    X_shap_sample = X_test[sample_indices]
    
    # Native exact TreeSHAP computation matching early-stopped booster trees
    iter_range = (0, xgb_model.best_iteration + 1) if getattr(xgb_model, "best_iteration", None) is not None else None
    dmatrix_sample = xgb.DMatrix(X_shap_sample)
    contribs = xgb_model.get_booster().predict(dmatrix_sample, pred_contribs=True, iteration_range=iter_range)
    # The last column is the base expected value, preceding columns are feature contributions
    shap_vals = contribs[:, :-1]
    mean_abs_shap = np.mean(np.abs(shap_vals), axis=0)
    shap_ranking = dict(sorted(zip(FEATURE_COLS, [round(float(s), 4) for s in mean_abs_shap]), key=lambda x: x[1], reverse=True))

    # 7. Save All Artifacts
    joblib.dump(xgb_model, os.path.join(artifacts_dir, "xgboost_model.joblib"))
    joblib.dump(ridge_model, os.path.join(artifacts_dir, "ridge_model.joblib"))
    joblib.dump(scaler, os.path.join(artifacts_dir, "preprocessor.joblib"))

    full_metrics = {
        "trained_timestamp": datetime.datetime.now().isoformat(),
        "evaluation_period": {
            "train_start": str(min(train_dates)),
            "train_end": str(max(train_dates)),
            "val_start": str(min(val_dates)),
            "val_end": str(max(val_dates)),
            "test_start": str(min(test_dates)),
            "test_end": str(max(test_dates))
        },
        "sample_sizes": {
            "train": len(train_df),
            "val": len(val_df),
            "test": len(test_df)
        },
        "overall_models": {
            "seasonal_naive": metrics_naive,
            "ridge_regression": metrics_ridge,
            "staywise_xgboost": metrics_xgb
        },
        "by_room_category": category_metrics,
        "by_forecast_horizon": horizon_metrics,
        "feature_columns": FEATURE_COLS
    }

    with open(os.path.join(artifacts_dir, "model_metrics.json"), "w", encoding="utf-8") as f:
        json.dump(full_metrics, f, indent=2)

    with open(os.path.join(artifacts_dir, "uncertainty_intervals.json"), "w", encoding="utf-8") as f:
        json.dump(uncertainty_calibrations, f, indent=2)

    with open(os.path.join(artifacts_dir, "feature_importance.json"), "w", encoding="utf-8") as f:
        json.dump(sorted_importances, f, indent=2)

    with open(os.path.join(artifacts_dir, "shap_summary.json"), "w", encoding="utf-8") as f:
        json.dump(shap_ranking, f, indent=2)

    sample_test_records = test_eval_df.sample(n=min(300, len(test_eval_df)), random_state=RANDOM_SEED)[
        ["snapshot_date", "stay_date", "room_category", "lead_time", "y_true", "y_pred_xgb", "y_pred_ridge", "y_pred_naive"]
    ].to_dict(orient="records")

    with open(os.path.join(artifacts_dir, "test_predictions_sample.json"), "w", encoding="utf-8") as f:
        json.dump(sample_test_records, f, indent=2)

    # Generate concrete single-prediction & error case study via exact TreeSHAP
    test_eval_df["abs_error"] = np.abs(test_eval_df["y_true"] - test_eval_df["y_pred_xgb"])
    typical_idx = int((test_eval_df["abs_error"] - test_eval_df["abs_error"].median()).abs().idxmin())
    worst_idx = int(test_eval_df["abs_error"].idxmax())

    def build_local_explanation(row_pos: int, label: str) -> Dict[str, Any]:
        row = test_eval_df.iloc[row_pos]
        x_row = X_test[row_pos : row_pos + 1]
        contrib = xgb_model.get_booster().predict(
            xgb.DMatrix(x_row), pred_contribs=True, iteration_range=iter_range
        )[0]
        base_val = float(contrib[-1])
        feat_contribs = {
            col: round(float(val), 4)
            for col, val in zip(FEATURE_COLS, contrib[:-1])
        }
        sorted_contribs = dict(
            sorted(feat_contribs.items(), key=lambda item: abs(item[1]), reverse=True)
        )
        lead = int(row["lead_time"])
        bucket_key = "short_1_3d" if lead <= 3 else ("medium_4_7d" if lead <= 7 else "long_8_14d")
        u_info = uncertainty_calibrations[bucket_key]
        pred_clamped = float(row["y_pred_xgb"])
        cap_val = int(row["room_capacity"])
        low_80 = float(np.clip(round(pred_clamped + u_info["q80"]["lower_offset"], 1), 0, cap_val))
        high_80 = float(np.clip(round(pred_clamped + u_info["q80"]["upper_offset"], 1), 0, cap_val))
        return {
            "case_type": label,
            "snapshot_date": str(row["snapshot_date"]),
            "stay_date": str(row["stay_date"]),
            "room_category": str(row["room_category"]),
            "lead_time": lead,
            "room_capacity": cap_val,
            "actual_occupied_rooms": int(row["y_true"]),
            "predicted_occupied_rooms": round(pred_clamped, 2),
            "absolute_error": round(float(row["abs_error"]), 2),
            "uncertainty_80_interval": [low_80, high_80],
            "within_80_interval": bool(low_80 <= int(row["y_true"]) <= high_80),
            "shap_base_value": round(base_val, 4),
            "raw_model_output": round(float(base_val + sum(contrib[:-1])), 4),
            "feature_values": {col: round(float(row[col]), 4) for col in FEATURE_COLS},
            "shap_contributions_sorted": sorted_contribs,
        }

    local_explanations = {
        "typical_prediction_case": build_local_explanation(typical_idx, "Representative Held-Out Test Prediction"),
        "high_error_case": build_local_explanation(worst_idx, "Highest-Error Held-Out Test Case"),
        "limitations_note": (
            "Forecast uncertainty widens with booking lead time because late reservations and last-minute "
            "cancellations have not yet materialized at cutoff t0. Sudden unmodeled demand shocks or "
            "capacity changes outside historical patterns can fall outside the 80% empirical residual band."
        ),
    }
    with open(os.path.join(artifacts_dir, "sample_prediction_explanation.json"), "w", encoding="utf-8") as f:
        json.dump(local_explanations, f, indent=2)

    print("Model artifacts successfully saved!")

    # 8. Generate docs/MODEL_CARD.md
    generate_model_card(full_metrics, uncertainty_calibrations, sorted_importances, shap_ranking, docs_dir)


def generate_model_card(
    metrics: Dict[str, Any],
    uncertainty: Dict[str, Any],
    importances: Dict[str, float],
    shap_summary: Dict[str, float],
    docs_dir: str
):
    overall = metrics["overall_models"]
    by_cat = metrics["by_room_category"]
    by_h = metrics["by_forecast_horizon"]

    md = f"""# Model Card: StayWise AI Extreme Gradient Boosting Forecaster

**Model Name:** StayWise XGBoost Forecaster v1.0  
**Model Architecture:** Extreme Gradient Boosted Regression Trees (`xgboost.XGBRegressor`)  
**Pipeline Preprocessing:** StandardScaler + Categorical One-Hot Encoders + Non-Linear Physical Capacity Clamping  
**Date of Evaluation:** {metrics['trained_timestamp']}  
**License:** Apache 2.0  

---

## 1. Intended Use & Prediction Formulation

- **Primary Prediction Task:** Predict the number of occupied room nights for a specific hotel property, room category ($k$), and future stay date ($d$) evaluated from an end-of-day cutoff snapshot ($t_0$).
- **Forecast Horizons:** 1 to 14 days ahead ($H \\in [1, 14]$).
- **Physical Constraints:** Output predictions $\\hat{{y}}$ are strictly bounded:
  $$0 \\le \\hat{{y}}_{{d,k}} \\le \\text{{Capacity}}_k$$
- **Primary Users:** Hotel Revenue Managers, Directors of Operations, General Managers, Housekeeping Supervisors.
- **Out-of-Scope Uses:** Does not replace real-time payment gateways or customer credit scoring.

---

## 2. Chronological Data Splits & Evaluation Integrity

To avoid temporal leakage, random K-Fold cross-validation was strictly prohibited. The dataset was partitioned sequentially by stay date:

| Split Segment | Date Range | Observation Count | Role in Development |
|---|---|---|---|
| **Training Set (60%)** | {metrics['evaluation_period']['train_start']} to {metrics['evaluation_period']['train_end']} | {metrics['sample_sizes']['train']:,} | Model parameter optimization |
| **Validation Set (20%)** | {metrics['evaluation_period']['val_start']} to {metrics['evaluation_period']['val_end']} | {metrics['sample_sizes']['val']:,} | Early stopping & residual interval calibration |
| **Held-Out Test Set (20%)** | {metrics['evaluation_period']['test_start']} to {metrics['evaluation_period']['test_end']} | {metrics['sample_sizes']['test']:,} | Final unbiased evaluation & reporting |

---

## 3. Comparative Benchmark Evaluation

All models were evaluated on identical held-out test data ({metrics['sample_sizes']['test']:,} records):

| Model Name | MAE (Rooms) | RMSE (Rooms) | WAPE (%) | Performance Delta vs. Baseline |
|---|---|---|---|---|
| **Seasonal-Naive Baseline** | {overall['seasonal_naive']['mae']} | {overall['seasonal_naive']['rmse']} | {overall['seasonal_naive']['wape']}% | *Reference Baseline* |
| **Ridge Regression** | {overall['ridge_regression']['mae']} | {overall['ridge_regression']['rmse']} | {overall['ridge_regression']['wape']}% | **{overall['seasonal_naive']['mae'] - overall['ridge_regression']['mae']:.2f} MAE reduction** |
| **StayWise AI (XGBoost)** | **{overall['staywise_xgboost']['mae']}** | **{overall['staywise_xgboost']['rmse']}** | **{overall['staywise_xgboost']['wape']}%** | **{((overall['seasonal_naive']['wape'] - overall['staywise_xgboost']['wape']) / overall['seasonal_naive']['wape']) * 100:.1f}% relative error reduction** |

---

## 4. Error Breakdown by Room Category

| Room Category | Capacity | XGBoost MAE | XGBoost RMSE | XGBoost WAPE | Baseline WAPE |
|---|---|---|---|---|---|
| **Standard (STD)** | 70 | **{by_cat['STD']['xgb']['mae']}** | {by_cat['STD']['xgb']['rmse']} | **{by_cat['STD']['xgb']['wape']}%** | {by_cat['STD']['naive']['wape']}% |
| **Deluxe (DLX)** | 40 | **{by_cat['DLX']['xgb']['mae']}** | {by_cat['DLX']['xgb']['rmse']} | **{by_cat['DLX']['xgb']['wape']}%** | {by_cat['DLX']['naive']['wape']}% |
| **Suite (SUI)** | 20 | **{by_cat['SUI']['xgb']['mae']}** | {by_cat['SUI']['xgb']['rmse']} | **{by_cat['SUI']['xgb']['wape']}%** | {by_cat['SUI']['naive']['wape']}% |
| **Executive (EXE)** | 10 | **{by_cat['EXE']['xgb']['mae']}** | {by_cat['EXE']['xgb']['rmse']} | **{by_cat['EXE']['xgb']['wape']}%** | {by_cat['EXE']['naive']['wape']}% |

---

## 5. Error Breakdown by Forecast Horizon

| Horizon Window | XGBoost MAE | XGBoost RMSE | XGBoost WAPE |
|---|---|---|---|
| **Short Horizon (1–7 Days Ahead)** | **{by_h['1_7_days']['xgb']['mae']}** | {by_h['1_7_days']['xgb']['rmse']} | **{by_h['1_7_days']['xgb']['wape']}%** |
| **Medium Horizon (8–14 Days Ahead)** | **{by_h['8_14_days']['xgb']['mae']}** | {by_h['8_14_days']['xgb']['rmse']} | **{by_h['8_14_days']['xgb']['wape']}%** |

---

## 6. Uncertainty Quantification & Empirical Test Coverage

Prediction bounds are calibrated on validation error residuals across stratified lead-time windows:

| Horizon Stratum | 80% Quantile Interval Offset | 80% Test Coverage | 95% Quantile Interval Offset | 95% Test Coverage |
|---|---|---|---|---|
| **Short (1–3 Days)** | [{uncertainty['short_1_3d']['q80']['lower_offset']}, +{uncertainty['short_1_3d']['q80']['upper_offset']}] | **{uncertainty['short_1_3d']['q80']['test_coverage_pct']}%** | [{uncertainty['short_1_3d']['q95']['lower_offset']}, +{uncertainty['short_1_3d']['q95']['upper_offset']}] | **{uncertainty['short_1_3d']['q95']['test_coverage_pct']}%** |
| **Medium (4–7 Days)** | [{uncertainty['medium_4_7d']['q80']['lower_offset']}, +{uncertainty['medium_4_7d']['q80']['upper_offset']}] | **{uncertainty['medium_4_7d']['q80']['test_coverage_pct']}%** | [{uncertainty['medium_4_7d']['q95']['lower_offset']}, +{uncertainty['medium_4_7d']['q95']['upper_offset']}] | **{uncertainty['medium_4_7d']['q95']['test_coverage_pct']}%** |
| **Long (8–14 Days)** | [{uncertainty['long_8_14d']['q80']['lower_offset']}, +{uncertainty['long_8_14d']['q80']['upper_offset']}] | **{uncertainty['long_8_14d']['q80']['test_coverage_pct']}%** | [{uncertainty['long_8_14d']['q95']['lower_offset']}, +{uncertainty['long_8_14d']['q95']['upper_offset']}] | **{uncertainty['long_8_14d']['q95']['test_coverage_pct']}%** |

---

## 7. Model Explainability: Top Feature Importances & SHAP

### Top Feature Importances (Gain Weight)
"""
    for feat, imp in list(importances.items())[:8]:
        md += f"- **`{feat}`**: {imp * 100:.1f}%\n"

    md += "\n### Top TreeSHAP Global Mean (|SHAP| Attributions)\n"
    for feat, val in list(shap_summary.items())[:8]:
        md += f"- **`{feat}`**: {val:.3f} rooms impact\n"

    md += """
---

## 8. Responsible AI, Privacy & Limitations

1. **Guest Privacy Safeguards:** Model features use aggregate counts (`otb_rooms`, `otb_cancellations`). Zero personally identifiable information (PII) such as guest names, phone numbers, or credit card tokens are ingested or retained.
2. **Representativeness & Bias:** The model is calibrated for resort and full-service hotel operations with weekday/weekend dynamics. Properties with distinct seasonality (e.g. ski lodges or airport transit hubs) require localized recalibration.
3. **Failure Modes & Degradation Scenarios:**
   - Extreme macro disruptions.
   - Unannounced hotel wing renovations reducing physical capacity without updating `room_capacity`.
"""

    card_path = os.path.join(docs_dir, "MODEL_CARD.md")
    with open(card_path, "w", encoding="utf-8") as f:
        f.write(md)
    print(f"Generated Model Card -> {card_path}")

if __name__ == "__main__":
    b_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../data"))
    a_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../artifacts"))
    d_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../docs"))
    train_and_evaluate(b_dir, a_dir, d_dir)
