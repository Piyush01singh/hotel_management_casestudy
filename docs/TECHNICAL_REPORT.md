# StayWise AI — Comprehensive Engineering & Machine Learning Technical Report

**Product:** StayWise AI — Hotel Occupancy & Room-Demand Forecasting Platform  
**Architecture:** Decoupled SaaS (FastAPI backend + Next.js App Router frontend)  
**Lead Authors:** Principal Software Architect & Senior ML Engineer  
**Evaluation Standard:** 100-mark Autonomous Build Assessment Specification  

---

## 1. Problem Formulation & Temporal Modeling Principles

In lodging operations, revenue management is often decoupled from ground operations. Furthermore, naive machine learning formulations suffer from implicit temporal leakage (e.g. evaluating models across random K-Fold splits where future cancellations leak into past predictions).

### 1.1 Formal Mathematical Formulation
- **Prediction Target ($y_{d, k}$):** Number of occupied rooms for category $k \in \{\text{STD}, \text{DLX}, \text{SUI}, \text{EXE}\}$ on future stay date $d \in [t_0 + 1, t_0 + H]$, given daily end-of-day cutoff snapshot $t_0$, where $H \in \{7, 14\}$.
- **Physical Boundedness Constraint:**
  $$0 \le \hat{y}_{d,k} \le \text{Capacity}_k$$
  Any unbounded linear model is clipped via the non-linear transformation:
  $$\hat{y}_{d,k}^{\text{clamped}} = \min(\text{Capacity}_k, \max(0, \hat{y}_{d,k}))$$

### 1.2 Point-in-Time Snapshot Isolation
For any prediction generated at cutoff $t_0$ (23:59:59):
1. **Eligible Reservations:** Only reservations created on or before $t_0$ are included.
2. **Cancellation Truth:** A cancellation is recognized at $t_0$ *if and only if* the guest cancelled on or before $t_0$. Future cancellations occurring after $t_0$ remain counted as active `otb_rooms`, mirroring exact real-world PMS conditions.
3. **Historical Actuals:** Historical lags (`hist_same_dow_lag`, `hist_rolling_mean_7d`, `hist_rolling_mean_28d`) are calculated strictly using stay dates $\le t_0$.

---

## 2. Exploratory Data Analysis & Empirical Data Generation

A deterministic synthetic generator was developed based on empirical hospitality distributions published by Antonio, Almeida, and Nunes (2019):
- **Raw Reservation Events:** 70,187 bookings generated across 609 stay dates (2023-01-01 to 2024-08-31).
- **Daily EOD Snapshots:** 30,016 point-in-time snapshot records covering 536 consecutive cutoff days with horizons 1 to 14.
- **Ground Truth Actuals:** 2,436 realized category-stay occupancy records.
- **Data Quality:** 0 missing values, 0 duplicate booking IDs, 0 negative room counts, 0 capacity overflow records, and 100% chronological isolation.

---

## 3. Comparative Model Development & Benchmark Evaluation

### 3.1 Candidate Models
1. **Seasonal-Naive Baseline:**
   Predicts demand using the demand observed for the identical room category on the corresponding day-of-week 7 days prior.
2. **Ridge Regression:**
   L2-regularized linear model with standard scaling and one-hot encoded categorical variables.
3. **StayWise AI (XGBoost Regressor):**
   Tree ensemble with max depth 5, learning rate 0.06, subsample 0.85, colsample 0.85, and early stopping on the validation set.

### 3.2 Chronological Split & Results (Held-Out Test Set)

| Model Name | MAE (Rooms) | RMSE (Rooms) | WAPE (%) | Performance Delta vs. Baseline |
|---|---|---|---|---|
| **Seasonal-Naive Baseline** | 3.451 | 5.417 | 12.25% | *Reference Baseline* |
| **Ridge Regression** | 1.861 | 2.758 | 6.61% | **46.0% relative WAPE reduction** |
| **StayWise AI (XGBoost)** | **1.316** | **1.937** | **4.67%** | **61.9% relative WAPE reduction** |

### 3.3 Error Breakdown by Room Category & Forecast Horizon (XGBoost)
- **By Category (MAE / RMSE / WAPE):**
  - `STD` (Cap 70): `1.954` / `2.708` / `3.46%` (vs. Baseline WAPE `11.16%`)
  - `DLX` (Cap 40): `1.355` / `1.976` / `4.06%` (vs. Baseline WAPE `9.99%`)
  - `SUI` (Cap 20): `1.189` / `1.609` / `7.74%` (vs. Baseline WAPE `17.23%`)
  - `EXE` (Cap 10): `0.767` / `1.089` / `10.37%` (vs. Baseline WAPE `20.51%`) — smaller room pools have higher percentage variance (`WAPE`) even when absolute error is < 1 room.
- **By Forecast Horizon:**
  - **1–7 Days Ahead:** `MAE = 0.974`, `RMSE = 1.434`, `WAPE = 3.45%`
  - **8–14 Days Ahead:** `MAE = 1.637`, `RMSE = 2.310`, `WAPE = 5.83%`

---

## 4. Uncertainty Quantification & Interval Calibration

To provide risk boundaries for revenue and operational leaders, StayWise AI quantifies prediction uncertainty using empirical validation error residuals ($y_{\text{val}} - \hat{y}_{\text{val}}$) stratified across lead-time horizons:
- **Short Horizon (1–3 Days):** 80% interval $[-1.229, +1.141]$ rooms | **83.84% empirical test coverage** (95% cov: 94.22%)
- **Medium Horizon (4–7 Days):** 80% interval $[-1.895, +2.239]$ rooms | **80.91% empirical test coverage** (95% cov: 96.67%)
- **Long Horizon (8–14 Days):** 80% interval $[-2.569, +3.474]$ rooms | **82.04% empirical test coverage** (95% cov: 97.76%)

95% intervals are also computed and bounded between $[0, \text{Capacity}_k]$.

---

## 5. Model Explainability via TreeSHAP & Error Case Analysis

### 5.1 Global Feature Attributions (Mean $|$SHAP$|$ across Held-Out Test Sample)
Model transparency is provided through exact TreeSHAP attributions computed via the XGBoost C++ booster (`pred_contribs=True`, `iteration_range=(0, best_iteration+1)`):
1. **`otb_rooms` (12.858 rooms impact):** Primary volume driver reflecting confirmed reservations on the books as of $t_0$.
2. **`lead_time` (1.733 rooms impact):** Regulates expected remaining booking pickup and cancellation wash before arrival.
3. **`hist_rolling_mean_28d` (1.623 rooms impact):** Captures medium-term seasonal demand baseline strictly from stay dates $\le t_0$.
4. **`hist_same_dow_lag` (1.382 rooms impact):** Recurring day-of-week anchor from realized occupancy $\le t_0$.
5. **`hist_rolling_mean_7d` (0.704 rooms impact):** Short-term momentum signal as of cutoff $t_0$.
6. **`day_of_week` (0.512 rooms impact)** & **`event_impact_score` (0.357 rooms impact):** Capture leisure weekend peaks and holiday/festival demand spikes.

### 5.2 Single-Prediction & High-Error Case Walkthrough (`sample_prediction_explanation.json`)
- **Representative Prediction (`t0 = 2024-06-19` $\rightarrow$ `stay_date = 2024-07-03`, `EXE`, `lead_time = 14d`, Capacity `10`):**
  - **Actual:** `10` rooms | **Predicted:** `9.17` rooms (`abs_error = 0.83`), inside 80% CI `[6.6, 10.0]`.
  - **Explanation:** From the global SHAP base value of `22.70`, `otb_rooms = 7` pulls down `-12.42` (reflecting EXE's 10-room scale), while pre-July 4th `event_impact_score = 1.36` (`+1.63`) and `lead_time = 14` (`+1.92`) lift the forecast toward full capacity.
- **Highest-Error Held-Out Case (`t0 = 2024-06-07` $\rightarrow$ `stay_date = 2024-06-20`, `STD`, `lead_time = 13d`, Capacity `70`):**
  - **Actual:** `35` rooms | **Predicted:** `46.26` rooms (`abs_error = 11.26`), outside 80% CI `[43.7, 49.7]`.
  - **Why it missed:** At `t0 = 2024-06-07` (13 days out), `otb_rooms` was `28`, while `hist_rolling_mean_28d` (`57.36`) and `hist_same_dow_lag` (`50.0`) were elevated from prior early-summer weeks. The model projected `+18` additional net rooms over the remaining 13 days (`lead_time +5.64`, `hist_rolling_mean_28d +3.92`, `hist_same_dow_lag +3.27`), whereas realized demand stayed soft at `35` due to slower pickup and post-cutoff wash. This illustrates why long-lead predictions carry wider uncertainty bands and require human revenue review.

---

## 6. Outlier Handling, Representativeness, Bias, Privacy & Human Oversight

1. **Outlier & Boundary Handling:** Synthetic and historical booking counts are validated for non-negativity (`occupied_rooms >= 0`), lead-time clipping (`0 <= lead_time_days <= 180`), and strict physical capacity clamping ($0 \le \hat{y} \le \text{Capacity}_k$).
2. **Representativeness & Bias:** Trained on a single 140-key coastal resort profile with Fri/Sat leisure peaks and specific local events; transfer to urban business hotels or ski resorts requires localized retraining and calendar recalibration.
3. **Privacy & Security:** Zero guest PII (`name`, `email`, `phone`, `payment`) is ingested or retained; only aggregate room counts are stored.
4. **Failure Modes & Human-in-the-Loop Governance:** StayWise AI is strictly a **decision-support** tool. Unmodeled macro shocks, sudden group block cancellations after $t_0$, or unrecorded room-wing closures degrade accuracy; Scenario Studio and Operations Planner require human manager confirmation before finalizing rosters or pricing.

---

## 6. Frontline Operational Workload Translation

StayWise AI bridges the revenue-operations divide by translating occupied room night forecasts into operational quotas:
- **Housekeeping Cleaning Minutes:** Departure turnover cleans (30m STD, 35m DLX, 45m SUI, 60m EXE) vs. Stayover cleans (15m STD, 18m DLX, 25m SUI, 30m EXE).
- **Staffing Roster:** Converts clean minutes into required productive shifts (7.5 hours per FTE housekeeper).
- **Linen Par Units:** Calculates bed sheet, pillowcase, and bath towel par replenishment.
- **Front Desk Rostering:** Base staffing (2 agents) + 1 agent per 40 anticipated turnover check-ins.
- **Operational Risk Flagging:** Triggers warning banners when daily cleaning exceeds 28 hours or reaches critical overtime threshold (&gt;40 hours).

---

## 7. Product Novelty: Historical Forecast Replay

A distinguishing capability of StayWise AI is the **Historical Forecast Replay**:
- Users can dial the calendar back to any historical date $T_0$.
- The system reconstructs the exact snapshot of On-The-Books bookings known at that time.
- The model generates the forward prediction.
- Realized actuals are plotted against the prediction, providing operational leaders with a transparent audit trail of past model accuracy.
