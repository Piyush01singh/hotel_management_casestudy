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
| **Ridge Regression** | 1.861 | 2.758 | 6.61% | **46.1% relative WAPE reduction** |
| **StayWise AI (XGBoost)** | **1.318** | **1.939** | **4.68%** | **61.8% relative WAPE reduction** |

---

## 4. Uncertainty Quantification & Interval Calibration

To provide risk boundaries for revenue and operational leaders, StayWise AI quantifies prediction uncertainty using empirical validation error quantiles stratified across lead-time horizons:
- **Short Horizon (1–3 Days):** 80% interval $[-1.87, +1.92]$ rooms | **83.4% empirical test coverage**
- **Medium Horizon (4–7 Days):** 80% interval $[-2.14, +2.28]$ rooms | **81.6% empirical test coverage**
- **Long Horizon (8–14 Days):** 80% interval $[-2.65, +2.81]$ rooms | **78.9% empirical test coverage**

95% intervals are also computed and bounded between $[0, \text{Capacity}_k]$.

---

## 5. Model Explainability via TreeSHAP

Model transparency is provided through exact TreeSHAP attributions computed via the XGBoost C++ engine:
1. **`hist_same_dow_lag` (0.648 rooms impact):** Strongest baseline anchor for recurring weekly rhythms.
2. **`otb_rooms` (0.582 rooms impact):** Primary volume driver as lead time converges towards arrival.
3. **`room_capacity` (0.514 rooms impact):** Structural ceiling enforcing room category scale.
4. **`lead_time` (0.342 rooms impact):** Non-linear decay factor regulating pickup expectations.
5. **`event_impact_score` (0.285 rooms impact):** Multiplier for conventions and holiday festivals.
6. **`otb_occupancy_ratio` (0.210 rooms impact):** Pace velocity indicator.

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
