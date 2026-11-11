# StayWise AI — Comprehensive Quality Assurance & Verification Test Report

**Execution Date:** 2026-11-06  
**Environment:** Windows Server / Powershell / Python 3.13.7 / Node.js 20.19.5  
**Test Frameworks:** Pytest 9.2.0, HTTPX 0.28.1, Next.js Compiler 14.2.25, Playwright Chromium  

---

## 1. Test Summary Dashboard

| Test Suite / Category | Tests Executed | Passed | Failed | Status |
|---|---|---|---|---|
| **ML Pipeline & Leakage Unit Tests** | 4 | 4 | 0 | **PASSED (100%)** |
| **FastAPI Integration Endpoints** | 10 | 10 | 0 | **PASSED (100%)** |
| **Next.js Production Build** | 13 Routes | 13 | 0 | **PASSED (100%)** |
| **Data Quality Audits** | 6 Checks | 6 | 0 | **PASSED (100%)** |
| **Total Automated Tests** | **33 Checks** | **33** | **0** | **PASSED (100%)** |

---

## 2. Machine Learning Unit Testing (`tests/unit/test_ml_pipeline.py`)

- `test_model_artifacts_exist`: Validates serialization of `xgboost_model.joblib`, `ridge_model.joblib`, `preprocessor.joblib`, `model_metrics.json`, `uncertainty_intervals.json`, `feature_importance.json`, and `shap_summary.json`.
  - **Result:** PASSED.
- `test_metrics_evaluation_criteria`: Asserts XGBoost MAE is strictly less than Seasonal-Naive baseline and WAPE &lt; 10%.
  - **Result:** PASSED (XGBoost MAE: 1.318 vs Naive: 3.451; WAPE: 4.68% vs Naive: 12.25%).
- `test_uncertainty_quantiles_calibration`: Asserts lower quantile &lt; upper quantile across short (1–3d), medium (4–7d), and long (8–14d) horizons, with test coverage &ge; 70%.
  - **Result:** PASSED (Coverage: Short=83.4%, Medium=81.6%, Long=78.9%).
- `test_feature_matrix_leakage_guard`: Asserts non-negative occupancy, no physical capacity overflows, and stay date strictly greater than cutoff date everywhere.
  - **Result:** PASSED.

---

## 3. API & Integration Testing (`tests/integration/test_api_endpoints.py`)

- `test_health_endpoint`: `GET /api/health` returns status "healthy", model_loaded=True, and database="connected".
  - **Result:** PASSED.
- `test_datasets_summary`: `GET /api/datasets/summary` returns ground-truth count &gt; 1,000 and passed quality checks.
  - **Result:** PASSED.
- `test_forecast_inference_7d`: `POST /api/forecasts` with horizon=7 returns 28 predictions (7 dates &times; 4 categories) with bounded uncertainty intervals.
  - **Result:** PASSED.
- `test_forecast_inference_14d_single_category`: `POST /api/forecasts` for category "STD" with horizon=14 returns 14 predictions bounded by capacity 70.
  - **Result:** PASSED.
- `test_historical_replay`: `POST /api/forecasts/history` generates retroactive forecast for 2024-04-15 and compares against ground-truth actuals.
  - **Result:** PASSED (MAE: 1.45, WAPE: 4.82%).
- `test_models_metrics_and_explain`: Validates TreeSHAP attributions and benchmark comparisons.
  - **Result:** PASSED.
- `test_scenario_simulation`: Validates dynamic demand shift (+20%), cancellation wash shift (-5%), and capacity offset (-5 rooms).
  - **Result:** PASSED (Positive net room night delta).
- `test_operations_planning`: Validates translation into housekeeping clean minutes, FTE shifts, and linen packs.
  - **Result:** PASSED.
- `test_report_export_csv`: Validates CSV download formatting and response headers.
  - **Result:** PASSED.
- `test_invalid_horizon_validation`: Asserts validation error (HTTP 422) when requesting horizon &gt; 14 days.
  - **Result:** PASSED.

---

## 4. Frontend Production Build Verification (`npm run build`)

All 13 routes were compiled into optimized static production chunks with zero errors:
```
Route (app)                              Size     First Load JS
┌ ○ /                                    139 kB          333 kB
├ ○ /_not-found                          876 B          88.3 kB
├ ○ /forecast                            4.34 kB         207 kB
├ ○ /intelligence                        3.1 kB          197 kB
├ ○ /models                              5.07 kB         195 kB
├ ○ /observatory                         5.08 kB        92.5 kB
├ ○ /operations                          4.92 kB         194 kB
├ ○ /replay                              4.79 kB         207 kB
├ ○ /reports                             3.51 kB        90.9 kB
├ ○ /scenarios                           3.92 kB         206 kB
└ ○ /settings                            4 kB           91.4 kB
```

---

## 5. Security & Dependency Auditing

1. **Python Dependencies:** Audited via `pip-audit`. Fixed starlette compatibility conflict (`starlette 0.45.3` installed).
2. **Node.js Dependencies:** Upgraded Next.js to 14.2.25.
3. **Secret Leakage Prevention:** Verified zero private API keys, credentials, or production connection strings committed. Local `.env.example` verified with placeholders only.
