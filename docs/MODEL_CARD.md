# Model Card: StayWise AI Extreme Gradient Boosting Forecaster

**Model Name:** StayWise XGBoost Forecaster v1.0  
**Model Architecture:** Extreme Gradient Boosted Regression Trees (`xgboost.XGBRegressor`)  
**Pipeline Preprocessing:** StandardScaler + Categorical One-Hot Encoders + Non-Linear Physical Capacity Clamping  
**Date of Evaluation:** 2026-11-12T11:15:44.100894  
**License:** Apache 2.0  

---

## 1. Intended Use & Prediction Formulation

- **Primary Prediction Task:** Predict the number of occupied room nights for a specific hotel property, room category ($k$), and future stay date ($d$) evaluated from an end-of-day cutoff snapshot ($t_0$).
- **Forecast Horizons:** 1 to 14 days ahead ($H \in [1, 14]$).
- **Physical Constraints:** Output predictions $\hat{y}$ are strictly bounded:
  $$0 \le \hat{y}_{d,k} \le \text{Capacity}_k$$
- **Primary Users:** Hotel Revenue Managers, Directors of Operations, General Managers, Housekeeping Supervisors.
- **Out-of-Scope Uses:** Does not replace real-time payment gateways or customer credit scoring.

---

## 2. Chronological Data Splits & Evaluation Integrity

To avoid temporal leakage, random K-Fold cross-validation was strictly prohibited. The dataset was partitioned sequentially by stay date:

| Split Segment | Date Range | Observation Count | Role in Development |
|---|---|---|---|
| **Training Set (60%)** | 2023-03-02 to 2024-01-24 | 18,060 | Model parameter optimization |
| **Validation Set (20%)** | 2024-01-25 to 2024-05-13 | 6,160 | Early stopping & residual interval calibration |
| **Held-Out Test Set (20%)** | 2024-05-14 to 2024-08-31 | 5,796 | Final unbiased evaluation & reporting |

---

## 3. Comparative Benchmark Evaluation

All models were evaluated on identical held-out test data (5,796 records):

| Model Name | MAE (Rooms) | RMSE (Rooms) | WAPE (%) | Performance Delta vs. Baseline |
|---|---|---|---|---|
| **Seasonal-Naive Baseline** | 3.451 | 5.417 | 12.25% | *Reference Baseline* |
| **Ridge Regression** | 1.861 | 2.758 | 6.61% | **1.59 MAE reduction** |
| **StayWise AI (XGBoost)** | **1.316** | **1.937** | **4.67%** | **61.9% relative error reduction** |

---

## 4. Error Breakdown by Room Category

| Room Category | Capacity | XGBoost MAE | XGBoost RMSE | XGBoost WAPE | Baseline WAPE |
|---|---|---|---|---|---|
| **Standard (STD)** | 70 | **1.954** | 2.708 | **3.46%** | 11.16% |
| **Deluxe (DLX)** | 40 | **1.355** | 1.976 | **4.06%** | 9.99% |
| **Suite (SUI)** | 20 | **1.189** | 1.609 | **7.74%** | 17.23% |
| **Executive (EXE)** | 10 | **0.767** | 1.089 | **10.37%** | 20.51% |

---

## 5. Error Breakdown by Forecast Horizon

| Horizon Window | XGBoost MAE | XGBoost RMSE | XGBoost WAPE |
|---|---|---|---|
| **Short Horizon (1–7 Days Ahead)** | **0.974** | 1.434 | **3.45%** |
| **Medium Horizon (8–14 Days Ahead)** | **1.637** | 2.31 | **5.83%** |

---

## 6. Uncertainty Quantification & Empirical Test Coverage

Prediction bounds are calibrated on validation error residuals across stratified lead-time windows:

| Horizon Stratum | 80% Quantile Interval Offset | 80% Test Coverage | 95% Quantile Interval Offset | 95% Test Coverage |
|---|---|---|---|---|
| **Short (1–3 Days)** | [-1.229, +1.141] | **83.84%** | [-2.244, +2.119] | **94.22%** |
| **Medium (4–7 Days)** | [-1.895, +2.239] | **80.91%** | [-4.159, +4.056] | **96.67%** |
| **Long (8–14 Days)** | [-2.569, +3.474] | **82.04%** | [-5.279, +6.528] | **97.76%** |

---

## 7. Model Explainability: Top Feature Importances & SHAP

### Top Feature Importances (Gain Weight)
- **`otb_rooms`**: 79.2%
- **`hist_same_dow_lag`**: 9.1%
- **`hist_rolling_mean_7d`**: 3.2%
- **`lead_time`**: 2.5%
- **`hist_rolling_mean_28d`**: 1.7%
- **`room_capacity`**: 0.7%
- **`event_impact_score`**: 0.6%
- **`otb_occupancy_ratio`**: 0.6%

### Top TreeSHAP Global Mean (|SHAP| Attributions)
- **`otb_rooms`**: 12.858 rooms impact
- **`lead_time`**: 1.733 rooms impact
- **`hist_rolling_mean_28d`**: 1.623 rooms impact
- **`hist_same_dow_lag`**: 1.381 rooms impact
- **`hist_rolling_mean_7d`**: 0.704 rooms impact
- **`day_of_week`**: 0.512 rooms impact
- **`month`**: 0.397 rooms impact
- **`is_weekend`**: 0.382 rooms impact

---

## 8. Responsible AI, Privacy & Limitations

1. **Guest Privacy Safeguards:** Model features use aggregate counts (`otb_rooms`, `otb_cancellations`). Zero personally identifiable information (PII) such as guest names, phone numbers, or credit card tokens are ingested or retained.
2. **Representativeness & Bias:** The model is calibrated for resort and full-service hotel operations with weekday/weekend dynamics. Properties with distinct seasonality (e.g. ski lodges or airport transit hubs) require localized recalibration.
3. **Failure Modes & Degradation Scenarios:**
   - Extreme macro disruptions.
   - Unannounced hotel wing renovations reducing physical capacity without updating `room_capacity`.
