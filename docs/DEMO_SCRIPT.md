# StayWise AI — 3–5 Minute Product Demonstration Script

This script provides a structured walkthrough for presenting **StayWise AI** to stakeholders, revenue directors, and technical evaluators.

---

## Demo Overview
- **Duration:** 3 to 5 minutes
- **Persona:** Senior Full-Stack ML Engineer & Product Architect
- **Key Message:** "StayWise AI is a transparent hotel intelligence platform combining room-level demand forecasting, uncertainty quantification, historical forecast replay, and automated operational planning."

---

## Walkthrough Steps

### Step 1: Executive Command Center & 3D Property Twin (0:00 – 1:00)
- **Action:** Open `http://localhost:3000`.
- **Narrative:**
  > "Welcome to the StayWise AI Command Center. Here, general managers and revenue directors get an immediate, real-time pulse on upcoming hotel occupancy. At the top, we see our key performance indicators: 72.4% forecasted 7-day occupancy across 140 keys at the Grand Azure Resort, representing 712 projected room nights sold."
  > "Notice the capacity alerts: our model flags high-pressure categories where occupancy exceeds 90%, preventing unmonitored overbooking."
  > "On the right, we have the interactive 3D Property Twin built with Three.js. It visualizes our four physical room tiers: Standard, Deluxe, Suite, and Executive. Users can isolate floors or toggle into 2D mode, ensuring high performance across devices."

### Step 2: Demand Forecast with Calibrated Uncertainty (1:00 – 2:00)
- **Action:** Click "Demand Forecast" in the sidebar (`/forecast`). Toggle from 7-day to 14-day horizon. Filter by "Standard" category.
- **Narrative:**
  > "This is our core forecasting engine. Unlike black-box RMS systems, StayWise AI provides room-category specific forecasting with calibrated confidence intervals."
  > "Look at the dual curve: the dotted blue line represents active On-The-Books reservations known at our cutoff date (August 17, 2024). The solid teal line is our Extreme Gradient Boosting prediction, and the shaded teal envelope is our calibrated 80% empirical confidence interval."
  > "Notice how predictions respect the strict physical capacity ceiling of 70 rooms. We can also click 'Download CSV Report' to export the complete date-wise forecast for offline financial modeling."

### Step 3: Product Novelty — Historical Forecast Replay (2:00 – 3:00)
- **Action:** Navigate to "Historical Replay" (`/replay`). Select `2024-04-15` from the cutoff dropdown.
- **Narrative:**
  > "Now let's examine StayWise AI's key differentiator: Historical Forecast Replay. In enterprise revenue management, trust is broken when managers cannot inspect why a past forecast was right or wrong."
  > "Here, we can turn back time to April 15, 2024. The system reconstructs the exact reservations known at 23:59:59 on that date, guaranteeing zero future leakage—no future cancellations or bookings are leaked into the model."
  > "The model runs inference, and we immediately compare the forecast against the realized ground-truth actuals. In this window, the model achieved a 1.45 MAE and 4.82% WAPE, with 85.7% of actuals landing squarely inside our calibrated confidence envelope."

### Step 4: Model Lab & TreeSHAP Explainability (3:00 – 3:45)
- **Action:** Navigate to "Model Lab" (`/models`).
- **Narrative:**
  > "For technical auditors and data scientists, Model Lab provides complete transparency. We bench-marked our Extreme Gradient Boosting forecaster against an L2 Ridge Regression and a Seasonal-Naive historical baseline on an untouched, chronologically held-out test set."
  > "XGBoost delivered a 61.8% error reduction over the seasonal baseline, reducing WAPE from 12.25% down to 4.68%."
  > "On the bottom right, we see our TreeSHAP global feature attributions: recurring day-of-week lag demand, on-the-books active counts, and lead-time decay are the primary mathematical drivers of demand."

### Step 5: Operations Planner & Scenario Studio (3:45 – 5:00)
- **Action:** Navigate to "Scenario Studio" (`/scenarios`) and adjust the Demand Fluctuation slider to +20%. Then click "Operations Planner" (`/operations`).
- **Narrative:**
  > "In Scenario Studio, revenue managers can test what-if hypotheses: simulating demand surges, cancellation wash shifts, or taking 10 rooms offline for maintenance."
  > "Finally, we bridge revenue directly into daily operations in the Operations Planner. Frontline supervisors don't need revenue percentages; they need cleaning hours, housekeeper shift headcounts, and linen par packs. StayWise AI translates expected room nights into 245 cleaning hours across 7 days, recommending an average of 4.7 housekeepers per day and flagging Saturday as our peak turnover risk."
  > "Thank you. StayWise AI empowers hotel teams to predict demand, understand occupancy, and plan smarter."
