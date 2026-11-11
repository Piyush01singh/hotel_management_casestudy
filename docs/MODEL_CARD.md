# Model Card: StayWise AI Extreme Gradient Boosting Forecaster

**Model Name:** StayWise XGBoost Forecaster v1.0  
**Model Architecture:** Extreme Gradient Boosted Regression Trees (`xgboost.XGBRegressor`)  
**Pipeline Preprocessing:** StandardScaler + Categorical One-Hot Encoders + Non-Linear Physical Capacity Clamping  
**Date of Evaluation:** 2026-11-06T14:57:43.574047  
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
| **StayWise AI (XGBoost)** | **1.318** | **1.939** | **4.68%** | **61.8% relative error reduction** |

---

## 4. Error Breakdown by Room Category

| Room Category | Capacity | XGBoost MAE | XGBoost RMSE | XGBoost WAPE | Baseline WAPE |
|---|---|---|---|---|---|
| **Standard (STD)** | 70 | **1.97** | 2.725 | **3.49%** | 11.16% |
| **Deluxe (DLX)** | 40 | **1.357** | 1.98 | **4.07%** | 9.99% |
| **Suite (SUI)** | 20 | **1.187** | 1.598 | **7.73%** | 17.23% |
| **Executive (EXE)** | 10 | **0.76** | 1.067 | **10.29%** | 20.51% |

---

## 5. Error Breakdown by Forecast Horizon

| Horizon Window | XGBoost MAE | XGBoost RMSE | XGBoost WAPE |
|---|---|---|---|
| **Short Horizon (1–7 Days Ahead)** | **0.974** | 1.426 | **3.45%** |
| **Medium Horizon (8–14 Days Ahead)** | **1.641** | 2.318 | **5.85%** |

---

## 6. Uncertainty Quantification & Empirical Test Coverage

Prediction bounds are calibrated on validation error residuals across stratified lead-time windows:

| Horizon Stratum | 80% Quantile Interval Offset | 80% Test Coverage | 95% Quantile Interval Offset | 95% Test Coverage |
|---|---|---|---|---|
| **Short (1–3 Days)** | [-1.216, +1.129] | **82.57%** | [-2.277, +2.321] | **95.83%** |
| **Medium (4–7 Days)** | [-1.862, +2.309] | **81.16%** | [-4.121, +4.254] | **97.41%** |
| **Long (8–14 Days)** | [-2.579, +3.479] | **82.84%** | [-5.526, +6.237] | **97.53%** |

---

## 7. Model Explainability: Top Feature Importances & SHAP

### Top Feature Importances (Gain Weight)
- **`otb_rooms`**: 76.3%
- **`hist_same_dow_lag`**: 9.2%
- **`category_EXE`**: 3.1%
- **`lead_time`**: 2.5%
- **`hist_rolling_mean_7d`**: 2.4%
- **`hist_rolling_mean_28d`**: 1.7%
- **`room_capacity`**: 1.3%
- **`event_impact_score`**: 0.7%

### Top TreeSHAP Global Mean (|SHAP| Attributions)
- **`otb_rooms`**: 12.856 rooms impact
- **`lead_time`**: 1.727 rooms impact
- **`hist_rolling_mean_28d`**: 1.631 rooms impact
- **`hist_same_dow_lag`**: 1.482 rooms impact
- **`hist_rolling_mean_7d`**: 0.590 rooms impact
- **`day_of_week`**: 0.571 rooms impact
- **`month`**: 0.402 rooms impact
- **`is_weekend`**: 0.402 rooms impact

---

## 8. Responsible AI, Privacy & Limitations

1. **Guest Privacy Safeguards:** Model features use aggregate counts (`otb_rooms`, `otb_cancellations`). Zero personally identifiable information (PII) such as guest names, phone numbers, or credit card tokens are ingested or retained.
2. **Representativeness & Bias:** The model is calibrated for resort and full-service hotel operations with weekday/weekend dynamics. Properties with distinct seasonality (e.g. ski lodges or airport transit hubs) require localized recalibration.
3. **Failure Modes & Degradation Scenarios:**
   - Extreme macro disruptions.
   - Unannounced hotel wing renovations reducing physical capacity without updating `room_capacity`.
