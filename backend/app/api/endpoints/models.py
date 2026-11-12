import os
import json
from fastapi import APIRouter
from backend.app.core.config import settings

router = APIRouter()

@router.get("")
def get_models_overview():
    metrics_path = os.path.join(settings.ML_ARTIFACTS_DIR, "model_metrics.json")
    metrics = {}
    if os.path.exists(metrics_path):
        with open(metrics_path, "r", encoding="utf-8") as f:
            metrics = json.load(f)
    return {
        "production_champion": "staywise_xgboost",
        "supported_models": [
            {
                "id": "staywise_xgboost",
                "name": "StayWise XGBoost Regressor",
                "status": "production",
                "mae": metrics.get("overall_models", {}).get("staywise_xgboost", {}).get("mae"),
                "wape": metrics.get("overall_models", {}).get("staywise_xgboost", {}).get("wape")
            },
            {
                "id": "ridge_regression",
                "name": "Ridge Regression (L2 Regularized)",
                "status": "candidate",
                "mae": metrics.get("overall_models", {}).get("ridge_regression", {}).get("mae"),
                "wape": metrics.get("overall_models", {}).get("ridge_regression", {}).get("wape")
            },
            {
                "id": "seasonal_naive",
                "name": "Seasonal Naive Baseline (Same DOW Lag)",
                "status": "baseline",
                "mae": metrics.get("overall_models", {}).get("seasonal_naive", {}).get("mae"),
                "wape": metrics.get("overall_models", {}).get("seasonal_naive", {}).get("wape")
            }
        ],
        "feature_count": len(metrics.get("feature_columns", [])),
        "trained_timestamp": metrics.get("trained_timestamp")
    }

@router.get("/metrics")
def get_model_metrics():
    metrics_path = os.path.join(settings.ML_ARTIFACTS_DIR, "model_metrics.json")
    if os.path.exists(metrics_path):
        with open(metrics_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"error": "Metrics artifact not found"}

@router.get("/explain")
def get_model_explanations():
    feat_path = os.path.join(settings.ML_ARTIFACTS_DIR, "feature_importance.json")
    shap_path = os.path.join(settings.ML_ARTIFACTS_DIR, "shap_summary.json")

    feat_importances = {}
    shap_summary = {}

    if os.path.exists(feat_path):
        with open(feat_path, "r", encoding="utf-8") as f:
            feat_importances = json.load(f)

    if os.path.exists(shap_path):
        with open(shap_path, "r", encoding="utf-8") as f:
            shap_summary = json.load(f)

    return {
        "feature_importances": feat_importances,
        "shap_attributions": shap_summary
    }

@router.get("/explain/sample")
def get_sample_prediction_explanation():
    sample_exp_path = os.path.join(settings.ML_ARTIFACTS_DIR, "sample_prediction_explanation.json")
    if os.path.exists(sample_exp_path):
        with open(sample_exp_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"error": "Sample prediction explanation artifact not found"}

@router.get("/test-predictions")
def get_test_predictions_sample():
    sample_path = os.path.join(settings.ML_ARTIFACTS_DIR, "test_predictions_sample.json")
    if os.path.exists(sample_path):
        with open(sample_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []
