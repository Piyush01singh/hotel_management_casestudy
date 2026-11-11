import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_endpoint():
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["model_loaded"] is True
    assert data["database"] == "connected"

def test_datasets_summary():
    res = client.get("/api/datasets/summary")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert data["records"]["ground_truth_actuals"] > 1000
    assert len(data["quality_audits"]) >= 5

def test_forecast_inference_7d():
    res = client.post("/api/forecasts", json={
        "hotel_id": "HOTEL_01",
        "room_category": "ALL",
        "horizon_days": 7
    })
    assert res.status_code == 200
    data = res.json()
    assert len(data["predictions"]) == 7 * 4  # 7 days * 4 room categories
    assert data["total_forecast_room_nights"] > 0
    first_pred = data["predictions"][0]
    assert 0 <= first_pred["predicted_occupied_rooms"] <= first_pred["capacity"]
    assert first_pred["uncertainty_80_lower"] <= first_pred["predicted_occupied_rooms"]
    assert first_pred["predicted_occupied_rooms"] <= first_pred["uncertainty_80_upper"]

def test_forecast_inference_14d_single_category():
    res = client.post("/api/forecasts", json={
        "hotel_id": "HOTEL_01",
        "room_category": "STD",
        "horizon_days": 14
    })
    assert res.status_code == 200
    data = res.json()
    assert len(data["predictions"]) == 14
    for p in data["predictions"]:
        assert p["room_category"] == "STD"
        assert p["capacity"] == 70

def test_historical_replay():
    res = client.post("/api/forecasts/history", json={
        "hotel_id": "HOTEL_01",
        "cutoff_date": "2024-04-15",
        "horizon_days": 7,
        "room_category": "ALL"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["replay_mae"] >= 0
    assert data["interval_coverage_pct"] > 50.0
    assert len(data["comparisons"]) == 7 * 4

def test_models_metrics_and_explain():
    res_m = client.get("/api/models/metrics")
    assert res_m.status_code == 200
    data_m = res_m.json()
    assert "overall_models" in data_m

    res_e = client.get("/api/models/explain")
    assert res_e.status_code == 200
    data_e = res_e.json()
    assert len(data_e["feature_importances"]) > 0
    assert len(data_e["shap_attributions"]) > 0

def test_scenario_simulation():
    res = client.post("/api/scenarios/simulate", json={
        "hotel_id": "HOTEL_01",
        "horizon_days": 7,
        "demand_factor": 1.20,
        "cancellation_shift": -0.05,
        "capacity_delta_std": -5
    })
    assert res.status_code == 200
    data = res.json()
    assert len(data["daily_results"]) == 7
    assert data["scenario_total_room_nights"] > 0
    assert data["room_night_delta"] > 0  # +20% demand should increase room nights

def test_operations_planning():
    res = client.post("/api/operations/calculate", json={
        "horizon_days": 7,
        "departure_turnover_rate": 0.40,
        "staff_shift_hours": 7.5
    })
    assert res.status_code == 200
    data = res.json()
    assert len(data["daily_plans"]) == 7
    assert data["total_clean_hours"] > 0
    assert data["average_daily_housekeepers"] > 0
    assert "assumptions_applied" in data

def test_report_export_csv():
    res = client.get("/api/reports/export/forecast?horizon_days=7")
    assert res.status_code == 200
    assert res.headers["content-type"].startswith("text/csv")
    assert "Stay Date" in res.text

def test_invalid_horizon_validation():
    # Horizon > 14 should fail validation
    res = client.post("/api/forecasts", json={
        "horizon_days": 21
    })
    assert res.status_code == 422

def test_forecast_compare_endpoint():
    res = client.get("/api/forecasts/compare?horizon_days=7")
    assert res.status_code == 200
    data = res.json()
    assert "staywise_xgboost" in data["models_compared"]
    assert "ridge_regression" in data["models_compared"]
    assert "seasonal_naive" in data["models_compared"]
    assert len(data["comparisons"]) == 7 * 4
    for item in data["comparisons"]:
        assert item["predicted_xgboost"] >= 0
        assert item["predicted_ridge"] >= 0
        assert item["predicted_naive"] >= 0

def test_forecast_multi_model_selection():
    res_xgb = client.get("/api/forecasts?horizon_days=7&model_name=xgboost")
    res_ridge = client.get("/api/forecasts?horizon_days=7&model_name=ridge")
    res_naive = client.get("/api/forecasts?horizon_days=7&model_name=seasonal_naive")

    assert res_xgb.status_code == 200
    assert res_ridge.status_code == 200
    assert res_naive.status_code == 200

    assert res_xgb.json()["model_used"] == "staywise_xgboost"
    assert res_ridge.json()["model_used"] == "ridge_regression"
    assert res_naive.json()["model_used"] == "seasonal_naive"

def test_modular_catalog_endpoints():
    res_ds = client.get("/api/datasets")
    assert res_ds.status_code == 200

    res_val = client.get("/api/datasets/validate")
    assert res_val.status_code == 200
    assert res_val.json()["status"] == "VALID"

    res_models = client.get("/api/models")
    assert res_models.status_code == 200
    assert res_models.json()["production_champion"] == "staywise_xgboost"

    res_scen = client.get("/api/scenarios")
    assert res_scen.status_code == 200
    assert len(res_scen.json()["supported_simulations"]) >= 3

    res_ops = client.get("/api/operations")
    assert res_ops.status_code == 200
    assert "cleaning_benchmarks_minutes" in res_ops.json()

    res_rep = client.get("/api/reports")
    assert res_rep.status_code == 200
    assert len(res_rep.json()["available_exports"]) >= 2

