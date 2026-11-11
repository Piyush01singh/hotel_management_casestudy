# Product Requirements Document (PRD): StayWise AI

**Product Name:** StayWise AI  
**Tagline:** "Predict demand. Understand occupancy. Plan smarter."  
**Target Users:** Hotel General Managers, Revenue Managers, Operations Directors, Housekeeping Leads, Business Analysts.  
**Version:** 1.0.0-MVP  

---

## 1. Executive Summary & Problem Statement
Hotels operate with perishable inventory: an unsold room night can never be resold once the night passes. Traditional hotel management relies on static Excel spreadsheets, gut feelings, or opaque enterprise RMS tools that fail to explain *why* demand will spike or drop. Furthermore, operational teams (front desk, housekeeping, linen logistics) are often blindsided by demand fluctuations because revenue forecasts are not directly converted into actionable operational workloads.

**StayWise AI** solves this by providing:
1. Highly accurate room-category level demand forecasting (7-day and 14-day horizons).
2. Transparent machine-learning models featuring SHAP explainability and statistical uncertainty bounds.
3. Historical forecast replay ensuring zero temporal data leakage.
4. Interactive scenario simulations (what-if testing).
5. Downstream operational translation into housekeeping hours, linen replenishment, and staffing allocations.

---

## 2. User Personas

### Persona A: Elena Vance — Revenue Manager (4-Star Boutique Hotel, 140 rooms)
- **Goal:** Optimize room rates and maximize RevPAR across 4 room categories (Standard, Deluxe, Suite, Executive).
- **Pain Point:** Enterprise RMS is too opaque; cannot explain to the GM why the forecast shifted.
- **StayWise AI Value:** Clear feature attribution (SHAP), historical forecast replay, and scenario testing.

### Persona B: Marcus Reed — Director of Operations
- **Goal:** Align housekeeping shifts, linen laundry contracts, and front desk staffing with actual guest occupancy.
- **Pain Point:** Receives revenue percentages too late; results in either overtime payroll or understaffed turnaround delays.
- **StayWise AI Value:** Operations Planner translating room nights directly into clean minutes, linen quotas, and staff headcounts.

---

## 3. Product Scope & Functional Modules

### 3.1 Module 1: Command Center (Executive Overview)
- Key Metrics Cards: Today's Occupancy %, 7-day Average Forecast Occupancy, Available Inventory, Expected Occupied Room Nights.
- Capacity alerts: Overbooking / capacity pressure warnings (>90% utilization).
- Room category distribution breakdown.
- Visual 3D property overview displaying floor occupancy intensity.

### 3.2 Module 2: Demand Forecast (Core Prediction Engine)
- Forecast Horizon selector: 7-day and 14-day horizons.
- Filters: Hotel property and Room Category (All, Standard, Deluxe, Suite, Executive).
- Visualization: Dual-line chart showing historical actuals, current On-The-Books (OTB) reservations, point prediction, and shaded 80%/95% confidence intervals.
- Data table with date-wise expected occupied room nights, predicted occupancy rate, remaining capacity, and risk flags.
- CSV / Report export.

### 3.3 Module 3: Booking Intelligence
- Lead-time distribution analysis (0-3 days, 4-7 days, 8-14 days, 15-30 days, 30+ days).
- Booking pickup pace curves (cumulative bookings by days before stay).
- Cancellation trends and net pickup velocity.
- Day-of-week occupancy profiling and seasonality patterns.

### 3.4 Module 4: Model Lab (Transparency & Governance)
- Benchmark comparison: Seasonal Naive baseline vs. Ridge Regression vs. XGBoost / Gradient Boosting.
- Metrics evaluation: MAE (Mean Absolute Error), RMSE (Root Mean Squared Error), and WAPE (Weighted Absolute Percentage Error).
- Error breakdowns by room category and forecast horizon.
- Residual distribution analysis.
- Feature importance ranking and SHAP summary plots.

### 3.5 Module 5: Scenario Studio (Interactive What-If Simulation)
- Interactive adjustment sliders:
  - Demand fluctuation factor (-30% to +30%)
  - Cancellation rate shift (-20% to +20%)
  - Room inventory change (temporary maintenance room closures)
  - Special local event uplift toggle (conference, festival, sports event)
- Real-time simulation of expected occupied rooms and capacity pressure alerts.
- Explicit visual distinction between model baseline predictions and hypothetical scenario forecasts.

### 3.6 Module 6: Operations Planner
- Translation of predicted room nights into operational workloads:
  - Housekeeping turnaround minutes (Stayover vs. Departure clean times).
  - Linen requirements (bed sheets, pillowcases, bath towels).
  - Suggested staffing capacity (cleaning shifts, front desk hours).
  - High-pressure warning triggers when required staffing exceeds normal threshold.

### 3.7 Module 7: Data Observatory & Quality Assurance
- Dataset provenance and ingestion health.
- Automated data quality checks: missing value detection, invalid stay dates, negative room counts, duplicates.
- Date coverage and freshness indicators.
- Historical snapshot completeness.

### 3.8 Module 8: Historical Forecast Replay
- Retroactive snapshot selector: Pick any past cutoff date $T_0$.
- Instantly reconstruct the booking state as of $T_0$.
- Generate out-of-sample forecast for $T_0 + 1$ to $T_0 + 14$.
- Compare forecast against realized ground-truth actuals to verify real-world historical model reliability.

---

## 4. Non-Functional Requirements
- **Latency:** Inference endpoint execution < 150 ms.
- **Reproducibility:** Deterministic synthetic data generator with seeded RNG and reproducible pipeline scripts.
- **Security:** Zero credential exposure, local storage, validated Pydantic schemas, safe file uploads.
- **Usability:** Premium responsive dark-mode UI with high contrast, responsive design for desktop and tablet viewports.
