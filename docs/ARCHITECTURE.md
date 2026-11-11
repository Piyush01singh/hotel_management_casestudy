# StayWise AI — System Architecture & Design

## 1. High-Level Architecture Diagram

```
+----------------------------------------------------------------------------------------------------+
|                                      FRONTEND (Next.js 14+)                                        |
|                                                                                                    |
|  +--------------------+  +--------------------+  +--------------------+  +--------------------+    |
|  |   Command Center   |  |   Demand Forecast  |  | Booking Intelligence|  |     Model Lab      |    |
|  |  (3D Room Canvas)  |  |  (7d/14d & Bounds) |  |   (Pickup & Lead)  |  | (Metrics & SHAP)   |    |
|  +--------------------+  +--------------------+  +--------------------+  +--------------------+    |
|  +--------------------+  +--------------------+  +--------------------+  +--------------------+    |
|  |  Scenario Studio   |  | Operations Planner |  |  Data Observatory  |  | Historical Replay  |    |
|  | (What-If Controls) |  | (Housekeeping/Linen)| | (Data Quality QA)  |  | (Snapshot Replay)  |    |
|  +--------------------+  +--------------------+  +--------------------+  +--------------------+    |
+-------------------------------------------------+--------------------------------------------------+
                                                  | HTTPS / REST (JSON)
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                    BACKEND API (FastAPI)                                           |
|                                                                                                    |
|  +------------------+  +------------------+  +------------------+  +------------------+            |
|  |  Forecast Router |  |  Scenario Router |  |  Operations Router| |  Model Info Router|           |
|  |  /api/forecasts  |  |  /api/scenarios  |  |  /api/operations |  |  /api/models     |           |
|  +--------+---------+  +--------+---------+  +--------+---------+  +--------+---------+            |
|           |                     |                     |                     |                      |
|           v                     v                     v                     v                      |
|  +------------------------------------------------------------------------------------+            |
|  |                                  SERVICES LAYER                                    |            |
|  |  - ForecastService: loads serialized model pipeline & computes bounded intervals   |            |
|  |  - ScenarioService: simulates demand/cancellation/capacity shocks                  |            |
|  |  - OperationsService: computes turnover, clean minutes, linen par, staffing FTE    |            |
|  |  - ReplayService: point-in-time snapshot retrieval & ground truth delta           |            |
|  +-------------------------------------+----------------------------------------------+            |
+----------------------------------------+-----------------------------------------------------------+
                                         |
               +-------------------------+-------------------------+
               |                                                   |
               v                                                   v
+-----------------------------+                     +-----------------------------+
|    PERSISTENCE (SQLite)     |                     |    SERIALIZED ML PIPELINE   |
|                             |                     |                             |
| - hotels                    |                     | - pipeline_preprocessor.bin |
| - room_categories           |                     | - xgb_forecaster.joblib     |
| - booking_events (PMS logs) |                     | - ridge_forecaster.joblib   |
| - booking_snapshots (OTB)   |                     | - uncertainty_calibrator.json|
| - occupancy_actuals         |                     | - feature_importances.json  |
| - model_run_metrics         |                     | - shap_attributions.json    |
+-----------------------------+                     +-----------------------------+
```

---

## 2. Temporal Data Flow & Leakage Guardrails

```
Booking Stream (PMS) ----> Cutoff Filter (t0 <= 2024-06-30 23:59:59) ----> OTB Snapshot (t0)
                                                                                  |
Ground Truth Actuals (Historical prior to t0) ----------------------------------->+
                                                                                  |
Calendar Features (DOW, Month, Holidays) ----------------------------------------->+
                                                                                  |
                                                                                  v
                                                                     Feature Vector x_(d, k, t0)
                                                                                  |
                                                                                  v
                                                                      Trained ML Model
                                                                                  |
                                                                                  v
                                                              Bounded Prediction y_hat in [0, Cap]
                                                                        + [q_0.10, q_0.90]
```

Every feature entering inference contains an explicit temporal origin proof. At any cutoff date $t_0$, records occurring after $t_0$ are completely masked.

---

## 3. Operations Computation Flow
```
Predicted Occupied Rooms (y_hat)
       |
       +---> Turnover Factor (35% departure turnover, 65% stayover)
       |        |
       |        +---> Departure Clean Minutes (30 min STD/DLX, 45 min SUI/EXE)
       |        +---> Stayover Clean Minutes (15 min STD/DLX, 25 min SUI/EXE)
       |        |
       |        v
       |     Total Housekeeping Cleaning Hours = Sum(Minutes) / 60
       |     Recommended Housekeepers (FTE Shifts of 7.5 hrs)
       |
       +---> Bedding & Linen Requirements (Fitted sheets, duvet covers, bath towels)
       |
       +---> Front Desk Agents = Base Staffing (2) + Check-in Surge Buffer
```

---

## 4. Key Design Decisions & Trade-Offs

1. **Lightweight & Self-Contained Persistence:** SQLite with SQLAlchemy ORM enables instant reproducibility without requiring an external PostgreSQL daemon, while preserving strict foreign keys and relational schemas.
2. **Deterministic Synthetic Data Generation:** Antonio et al. (2019) public hotel booking dataset does not contain multi-horizon historical daily snapshots. To guarantee zero data leakage and support historical point-in-time replay, StayWise AI implements a deterministic booking simulator based on published empirical hotel distributions.
3. **Double Boundary Clipping:** In hotel forecasting, predicting negative rooms or rooms greater than physical inventory is fatal to operations. StayWise AI applies non-linear clamp transforms: $\text{clip}(0, \text{Capacity})$.
