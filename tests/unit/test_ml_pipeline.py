import os
import json
import pytest
import numpy as np
import pandas as pd
import joblib

from backend.app.core.config import settings

def test_model_artifacts_exist():
    """Verify all serialized artifacts exist and are non-empty."""
    artifacts = [
        "xgboost_model.joblib",
        "ridge_model.joblib",
        "preprocessor.joblib",
        "model_metrics.json",
        "uncertainty_intervals.json",
        "feature_importance.json",
        "shap_summary.json"
    ]
    for art in artifacts:
        p = os.path.join(settings.ML_ARTIFACTS_DIR, art)
        assert os.path.exists(p), f"Artifact missing: {art}"
        assert os.path.getsize(p) > 0, f"Artifact empty: {art}"

def test_metrics_evaluation_criteria():
    """Verify that XGBoost outperforms seasonal naive baseline and metrics are valid."""
    metrics_path = os.path.join(settings.ML_ARTIFACTS_DIR, "model_metrics.json")
    with open(metrics_path, "r", encoding="utf-8") as f:
        metrics = json.load(f)

    overall = metrics["overall_models"]
    assert "staywise_xgboost" in overall
    assert "seasonal_naive" in overall
    assert "ridge_regression" in overall

    xgb_mae = overall["staywise_xgboost"]["mae"]
    naive_mae = overall["seasonal_naive"]["mae"]
    assert xgb_mae < naive_mae, "XGBoost MAE must beat seasonal naive baseline"
    assert overall["staywise_xgboost"]["wape"] < 10.0, "XGBoost WAPE should be < 10% on test set"

def test_uncertainty_quantiles_calibration():
    """Verify that calibrated intervals have positive width and expected coverage."""
    unc_path = os.path.join(settings.ML_ARTIFACTS_DIR, "uncertainty_intervals.json")
    with open(unc_path, "r", encoding="utf-8") as f:
        unc = json.load(f)

    for h_name in ["short_1_3d", "medium_4_7d", "long_8_14d"]:
        assert h_name in unc
        q80 = unc[h_name]["q80"]
        q95 = unc[h_name]["q95"]
        assert q80["lower_offset"] < q80["upper_offset"]
        assert q95["lower_offset"] <= q80["lower_offset"]
        assert q95["upper_offset"] >= q80["upper_offset"]
        assert q80["test_coverage_pct"] >= 70.0, "80% interval coverage should be reasonable"

def test_feature_matrix_leakage_guard():
    """Verify no stay date precedes or equals cutoff in the snapshots feature matrix."""
    fm_path = os.path.join(settings.ML_DATA_DIR, "processed", "feature_matrix.csv")
    df = pd.read_csv(fm_path)
    
    assert (df["target_occupied_rooms"] < 0).sum() == 0, "No negative target values"
    assert (df["target_occupied_rooms"] > df["room_capacity"]).sum() == 0, "No capacity overshoots"
    assert (pd.to_datetime(df["stay_date"]) <= pd.to_datetime(df["snapshot_date"])).sum() == 0


def test_zero_future_leakage_invariance():
    """Perturbing ground-truth actuals strictly after t0 must NOT alter engineered features at t0."""
    from ml.src.feature_engineering import engineer_features
    from ml.src.train import FEATURE_COLS

    snap_path = os.path.join(settings.ML_DATA_DIR, "synthetic", "booking_snapshots.csv")
    act_path = os.path.join(settings.ML_DATA_DIR, "processed", "occupancy_actuals.csv")

    snaps = pd.read_csv(snap_path)
    actuals = pd.read_csv(act_path)

    cutoff = "2024-04-15"
    sub_snaps = snaps[snaps["snapshot_date"] == cutoff].copy()

    feat_clean = engineer_features(sub_snaps, actuals)

    # Corrupt actuals strictly after cutoff t0 (except keep target column lookup identical for row alignment)
    # Specifically check all input FEATURE_COLS remain bitwise identical when post-t0 actuals change
    actuals_perturbed = actuals.copy()
    mask_future = actuals_perturbed["stay_date"] > cutoff
    actuals_perturbed.loc[mask_future, "occupied_rooms"] = 0
    feat_perturbed = engineer_features(sub_snaps, actuals_perturbed)

    np.testing.assert_allclose(
        feat_clean[FEATURE_COLS].values,
        feat_perturbed[FEATURE_COLS].values,
        err_msg="Feature values changed when future (> t0) actuals were perturbed — temporal leakage detected!"
    )


def test_training_serving_parity():
    """Verify FastAPI ForecastService generates exact same predictions as offline training matrix for historical cutoff."""
    from backend.app.database.session import SessionLocal
    from backend.app.schemas.forecast_schemas import ForecastRequest
    from backend.app.services.forecast_service import forecast_service
    from ml.src.train import FEATURE_COLS

    fm_path = os.path.join(settings.ML_DATA_DIR, "processed", "feature_matrix.csv")
    fm = pd.read_csv(fm_path)
    cutoff = "2024-04-15"
    sub = fm[(fm["snapshot_date"] == cutoff) & (fm["lead_time"] <= 7)].sort_values(
        by=["stay_date", "room_category"]
    ).reset_index(drop=True)

    xgb_model = joblib.load(os.path.join(settings.ML_ARTIFACTS_DIR, "xgboost_model.joblib"))
    expected_preds = np.round(np.clip(xgb_model.predict(sub[FEATURE_COLS].values), 0.0, sub["room_capacity"].values), 1)

    db = SessionLocal()
    try:
        res = forecast_service.generate_forecast(
            ForecastRequest(hotel_id="HOTEL_01", room_category="ALL", horizon_days=7, cutoff_date=cutoff, model_name="xgboost"),
            db
        )
    finally:
        db.close()

    served_preds = np.array([p.predicted_occupied_rooms for p in res.predictions])
    np.testing.assert_allclose(
        served_preds, expected_preds, atol=0.11,
        err_msg="Serving predictions diverged from offline feature matrix predictions!"
    )


def test_zero_pii_in_datasets():
    """Verify no personally identifiable information (PII) columns exist in raw or processed datasets."""
    forbidden_cols = {"guest_name", "name", "email", "phone", "ssn", "credit_card", "address", "passport"}
    for rel_path in ["raw/hotel_booking_events.csv", "processed/feature_matrix.csv"]:
        df_head = pd.read_csv(os.path.join(settings.ML_DATA_DIR, rel_path), nrows=5)
        cols_lower = {c.lower() for c in df_head.columns}
        assert not (cols_lower & forbidden_cols), f"PII columns detected in {rel_path}: {cols_lower & forbidden_cols}"


def test_sample_prediction_shap_additivity():
    """Verify local TreeSHAP contributions sum cleanly to raw model prediction."""
    exp_path = os.path.join(settings.ML_ARTIFACTS_DIR, "sample_prediction_explanation.json")
    assert os.path.exists(exp_path), "sample_prediction_explanation.json missing"
    with open(exp_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    for key in ["typical_prediction_case", "high_error_case"]:
        case = data[key]
        reconstructed = case["shap_base_value"] + sum(case["shap_contributions_sorted"].values())
        assert abs(reconstructed - case["raw_model_output"]) < 0.05
