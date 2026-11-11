# StayWise AI — Hotel Occupancy & Room-Demand Forecasting

> *"Predict demand. Understand occupancy. Plan smarter."*

StayWise AI is an enterprise-grade hotel demand forecasting and operational decision-support platform. It bridges advanced time-series machine learning with frontline hospitality operations, generating room-category specific demand forecasts, calibrated statistical uncertainty intervals, point-in-time historical forecast replays, interactive what-if scenarios, and automated housekeeping workload quotas.

---

## 🌟 Key Product Differentiators

1. **Room-Category Specific Forecasting:** Disaggregates hotel demand across physical room categories (Standard, Deluxe, Suite, Executive) while strictly enforcing physical inventory limits ($0 \le \hat{y} \le \text{Capacity}$).
2. **Strict Zero Target/Future Leakage:** Organizes reservation records into daily end-of-day snapshots ($t_0$). No future cancellations or reservations are leaked into historical prediction features.
3. **Calibrated Statistical Uncertainty Bounds:** Provides bounded 80% and 95% confidence intervals derived from empirical validation error residuals.
4. **Historical Forecast Replay:** Enables operators to travel back to any historical cutoff date, inspect data known at that time, run model inference, and audit predictions against realized ground-truth actuals.
5. **TreeSHAP Explainability:** Transparent feature attributions explaining the exact mathematical drivers of demand (lag patterns, lead-time decay, on-the-books pace, event uplift).
6. **Scenario Studio:** Interactive sandbox for testing what-if hypotheses (demand surges, cancellation wash shifts, maintenance closures).
7. **Frontline Operations Planner:** Automatically translates forecasted room nights into cleaning hours, housekeeper FTE shift requirements, linen par quotas, and front-desk check-in staffing.
8. **Interactive 3D Property Twin:** Lightweight Three.js building representation with floor-level category inspection.

---

## 🏗️ Technology Stack

- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, Recharts, Three.js, Lucide Icons.
- **Backend API:** FastAPI (Python 3.13), Pydantic v2 schemas, asynchronous request handling.
- **Database:** SQLite with SQLAlchemy ORM (relational schema tracking hotels, room categories, booking snapshots, actuals, and model metrics).
- **Machine Learning:** Extreme Gradient Boosting (`xgboost`), Scikit-learn (`StandardScaler`, `Ridge`), TreeSHAP, Joblib pipeline serialization.
- **Testing & Auditing:** Pytest, HTTPX, Playwright, Next.js build verification, `pip-audit`.
- **Architecture Knowledge Graph:** Graphify.

---

## 📊 Benchmark Model Performance (Held-Out Test Set)

Evaluated on strictly chronological, untouched test stay dates (5,796 observations across 110 dates):

| Model Name | MAE (Rooms) | RMSE (Rooms) | WAPE (%) | Performance Delta vs. Baseline |
|---|---|---|---|---|
| **Seasonal-Naive Baseline** | 3.451 | 5.417 | 12.25% | *Reference Baseline* |
| **Ridge Regression** | 1.861 | 2.758 | 6.61% | **46.1% relative WAPE reduction** |
| **StayWise AI (XGBoost)** | **1.318** | **1.939** | **4.68%** | **61.8% relative WAPE reduction** |

---

## 🚀 Quick Start & Reproducibility Guide

### 1. Prerequisites
- Python 3.11+ (Python 3.13.7 verified)
- Node.js 18+ (Node.js 20.19.5 verified) and npm

### 2. Environment Setup
```powershell
# Copy environment configuration
cp .env.example .env

# Install backend dependencies
pip install -r backend/requirements.txt

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Data Pipeline & Model Training
```powershell
# 1. Generate realistic booking events & snapshots (30,000+ records)
python ml/src/data_generation.py

# 2. Engineer leakage-free time-series features
python ml/src/feature_engineering.py

# 3. Run exploratory data analysis
python ml/src/eda.py

# 4. Train models, calibrate uncertainty, extract TreeSHAP, and save artifacts
python ml/src/train.py

# 5. Initialize and seed SQLite database
python -m backend.app.database.seed
```

### 4. Run the Test Suites
```powershell
# Run backend unit and API integration tests
python -m pytest tests/
```

### 5. Launch the Application

**Start the FastAPI Backend (Port 8000):**
```powershell
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
Interactive API documentation available at: `http://127.0.0.1:8000/api/docs`

**Start the Next.js Frontend (Port 3000):**
```powershell
cd frontend
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 📁 Repository Structure

```
D:\piyush_aiproject
│
├── frontend/                     # Next.js 14+ SaaS Frontend
│   ├── app/                      # App router pages (Command Center, Forecast, Replay, etc.)
│   ├── components/               # Sidebar, Navbar, PropertyViewer3D
│   ├── lib/                      # Typed API client
│   └── package.json
│
├── backend/                      # FastAPI Backend
│   ├── app/
│   │   ├── api/endpoints/        # REST routers (forecasts, scenarios, operations, etc.)
│   │   ├── core/                 # Config & settings
│   │   ├── database/             # SQLAlchemy session & seed script
│   │   ├── models/               # Relational entities
│   │   ├── schemas/              # Pydantic v2 schemas
│   │   └── services/             # Forecast, Replay, Scenario, Operations services
│   └── requirements.txt
│
├── ml/                           # Machine Learning Pipeline
│   ├── data/                     # Raw, processed, and synthetic datasets
│   ├── src/                      # Generation, feature engineering, training, EDA
│   ├── artifacts/                # Serialized models, TreeSHAP, metrics, uncertainty intervals
│   └── requirements.txt
│
├── tests/
│   ├── unit/                     # ML pipeline and uncertainty unit tests
│   ├── integration/              # FastAPI endpoint integration tests
│   └── e2e/                      # Playwright end-to-end browser tests
│
├── docs/                         # Technical Documentation Suite
│   ├── PRD.md                    # Product Requirements Document
│   ├── TRD.md                    # Technical Requirements Document
│   ├── COMPETITOR_ANALYSIS.md    # Industry benchmarking (Duetto, IDeaS, Atomize, Lighthouse)
│   ├── ARCHITECTURE.md           # System design & data flow specifications
│   ├── DATA_DICTIONARY.md        # Schemas & feature definitions
│   ├── EDA_REPORT.md             # Exploratory Data Analysis Report
│   ├── MODEL_CARD.md             # Model Card for XGBoost Forecaster
│   ├── TECHNICAL_REPORT.md       # Comprehensive Engineering & ML Report
│   ├── TEST_REPORT.md            # Test execution records
│   ├── INSTALLED_SKILLS.md       # Installed tools & environment registry
│   └── DEMO_SCRIPT.md            # 3–5 minute demonstration script
│
├── graphify-out/                 # Knowledge Graph & Community Extraction
├── SUBMISSION_CHECKLIST.md       # 100-mark assessment verification checklist
└── README.md
```

---

## 📜 License & Compliance
This software is provided under the Apache 2.0 License. All features respect guest privacy by processing aggregate booking counts only; zero personally identifiable information (PII) is stored or retained.
