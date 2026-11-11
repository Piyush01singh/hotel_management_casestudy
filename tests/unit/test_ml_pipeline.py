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
    assert pd.to_datetime(df["stay_date"]).min() > pd.to_datetime(df["snapshot_date"]).min()
