# Technical Requirements Document (TRD): StayWise AI

## 1. System Architecture Overview

StayWise AI is organized as a decoupled, multi-tier full-stack application:
- **Client Tier:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, Recharts / ECharts, Canvas/Three.js 3D room property visualizer.
- **API Tier:** FastAPI (Python 3.13) with asynchronous request handlers, Pydantic v2 data models, and structured error boundaries.
- **ML / Analytics Engine:** Scikit-learn, XGBoost, SHAP, Pandas, NumPy, Joblib pipeline serialization.
- **Data Persistence:** SQLite with SQLAlchemy ORM (relational schema tracking hotels, rooms, booking events, snapshots, predictions, and model metrics).

```
   +--------------------------------------------------------------+
   |                     Next.js 14+ Frontend                     |
   | (Command Center, Forecast, Intel, Model Lab, Scenarios, Ops) |
   +------------------------------+-------------------------------+
                                  | REST / JSON
                                  v
   +--------------------------------------------------------------+
   |                      FastAPI Backend                         |
   |   - /api/forecasts           - /api/scenarios                |
   |   - /api/models/metrics      - /api/operations               |
   |   - /api/forecasts/history   - /api/datasets                 |
   +--------------+-------------------------------+---------------+
                  |                               |
                  v                               v
   +-----------------------------+ +------------------------------+
   |       SQLite Database       | |     Serialized ML Models     |
   | - booking_events            | | - pipeline.joblib            |
   | - booking_snapshots         | | - xgboost_model.joblib       |
   | - occupancy_actuals         | | - ridge_model.joblib         |
   | - model_metrics             | | - uncertainty_params.json    |
   +-----------------------------+ +------------------------------+
```

---

## 2. Machine Learning Technical Specifications

### 2.1 Prediction Formulation
- **Prediction Unit:** Property $\times$ Stay Date ($d$) $\times$ Room Category ($k$) given Snapshot Cutoff Date ($t_0$).
- **Target Variable ($y_{d, k}$):** Number of occupied room nights for category $k$ on stay date $d \in [t_0 + 1, t_0 + H]$, where $H \in \{7, 14\}$.
- **Physical Boundedness Constraint:**
  $$0 \le \hat{y}_{d,k} \le \text{Capacity}_k$$
- **Occupancy Rate:**
  $$\text{OccRate}_{d,k} = \frac{\hat{y}_{d,k}}{\text{Capacity}_k} \times 100\%$$

### 2.2 Temporal Isolation & Leakage Prevention
To guarantee realistic forecasting:
1. All feature inputs are computed solely using data recorded prior to or at 23:59:59 on snapshot date $t_0$.
2. Any reservation created, cancelled, or modified after $t_0$ is strictly excluded from feature generation for that cutoff.
3. Chronological splitting:
   - **Training Set:** 60% earliest historical stay dates.
   - **Validation Set:** Next 20% stay dates.
   - **Held-Out Test Set:** Final 20% stay dates (never seen during feature selection or hyperparameter tuning).

### 2.3 Feature Matrix Schema
For each $(d, k, t_0)$:
- **Calendar & Seasonality:** Day of week (0-6), is_weekend, month (1-12), day_of_month, holiday_flag, local_event_impact.
- **Lead Time Dynamics:** Lead time $L = d - t_0$ (in days).
- **On-The-Books (OTB) Current State:**
  - `otb_reservations`: Confirmed active reservations for date $d$ on books at $t_0$.
  - `otb_cancellations_to_date`: Historical cancellations for date $d$ received before $t_0$.
- **Pickup Velocities:**
  - `pickup_1d`: Change in OTB bookings between $t_0 - 1$ and $t_0$ for date $d$.
  - `pickup_7d`: Net pickup over previous 7 days.
- **Historical Demand Lags:**
  - `lag_same_dow_7d`: Occupancy on the same day-of-week 7 days prior.
  - `lag_same_dow_14d`: Occupancy on the same day-of-week 14 days prior.
  - `rolling_mean_7d`: Property rolling average demand over past 7 days.
  - `rolling_mean_28d`: Property rolling average demand over past 28 days.
- **Category Inventory:**
  - `room_capacity`: Maximum physical inventory of category $k$.
  - `category_encoded`: Categorical encoding for Standard, Deluxe, Suite, Executive.

### 2.4 Model Architectures
1. **Seasonal-Naive Baseline:**
   Predicts demand using the demand observed for the identical room category on the corresponding day-of-week 7 days prior:
   $$\hat{y}_{d,k}^{\text{naive}} = y_{d-7, k}$$
2. **Ridge Regression:**
   L2-regularized linear baseline with standardized features and one-hot encoded categorical variables.
3. **Gradient Boosting Regressor (XGBoost / HistGradientBoosting):**
   Non-linear ensemble learning with tree depth regularization, handling interaction terms between lead time, pickup pace, and seasonality.

### 2.5 Uncertainty Quantification
Quantile regression / calibrated empirical residual intervals:
- Compute 80% ($[q_{0.10}, q_{0.90}]$) and 95% ($[q_{0.025}, q_{0.975}]$) error quantiles from the validation set stratified by lead-time horizon ($1-3$ days, $4-7$ days, $8-14$ days).
- Bounded prediction intervals:
  $$\hat{y}_{\text{lower}} = \max(0, \hat{y} + q_{\alpha/2})$$
  $$\hat{y}_{\text{upper}} = \min(\text{Capacity}_k, \hat{y} + q_{1 - \alpha/2})$$

---

## 3. Operations Translation Logic

Operational metrics are calculated transparently using hospitality industry standard coefficients:
- **Housekeeping Minutes:**
  $$\text{CleanMinutes}_{d} = \sum_k \hat{y}_{d,k} \times (\text{TurnoverRate}_k \times M_{\text{dep}, k} + (1 - \text{TurnoverRate}_k) \times M_{\text{stay}, k})$$
  *(Standard: 30 min departure / 15 min stayover; Suite: 45 min departure / 25 min stayover)*.
- **Housekeeping FTE Hours:** $\text{FTE\_Hours}_d = \text{CleanMinutes}_d / 60$.
- **Linen Par Packs:** $\text{LinenSets}_d = \text{CleanMinutes}_d \text{ weighted by bed configurations}$.
- **Front Desk Staff Allocation:** Base coverage (2 agents) + 1 additional agent per 50 anticipated check-ins.

---

## 4. API Endpoints Contract
- `GET /api/health` — System status, ML model load state, database connectivity.
- `GET /api/datasets/summary` — Data observatory metrics, record count, date ranges, quality checks.
- `POST /api/forecasts` — Real-time inference request accepting horizon (7 or 14), category filter, and optional cutoff date.
- `GET /api/forecasts/history` — Point-in-time historical replay with ground-truth actuals comparison.
- `GET /api/models/metrics` — Quantitative evaluation across candidate models (MAE, RMSE, WAPE) by category and horizon.
- `GET /api/models/explain` — SHAP values and feature importance weights.
- `POST /api/scenarios/simulate` — Dynamic simulation with demand factor, cancellation shift, capacity adjustment, and event uplift.
- `POST /api/operations/calculate` — Workload translation for housekeeping, linen, and staffing.
- `GET /api/reports/export` — Formatted CSV / JSON report downloads.
