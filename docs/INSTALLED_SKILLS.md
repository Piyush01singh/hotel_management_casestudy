# Installed Tools, Skills & Environment Registry

This document records all environment tooling, agent skills, libraries, and verification statuses for **StayWise AI** in workspace `D:\piyush_aiproject`.

---

## 1. Core Runtime Environment

| Tool / Runtime | Installed Version | Purpose | Verification Status |
|---|---|---|---|
| **Python** | 3.13.7 | Primary backend, data engineering, and ML runtime | Verified (`python --version`) |
| **Node.js** | v20.19.5 | Next.js frontend development and SSR runtime | Verified (`node --version`) |
| **npm** | 10.8.2 | Frontend package manager | Verified (`npm --version`) |
| **Git** | 2.48.1.windows.1 | Version control | Verified (`git --version`) |

---

## 2. Python Packages & ML Ecosystem

| Package | Version | Role in StayWise AI | Status |
|---|---|---|---|
| `fastapi` | 0.120.0 | High-performance asynchronous REST API backend | Verified |
| `uvicorn` | 0.38.0 | ASGI web server for FastAPI | Verified |
| `pydantic` | 2.12.3 | Strict request/response validation and schemas | Verified |
| `pandas` | 2.2.3 | Time-series data manipulation and feature transformations | Verified |
| `numpy` | 2.2.4 | Vectorized computations and numerical statistics | Verified |
| `scikit-learn`| 1.6.1 | ML models (Ridge, HistGradientBoostingRegressor, metrics) | Verified |
| `xgboost` | 3.1.1 | Extreme Gradient Boosting regression pipeline | Verified |
| `shap` | 0.49.1 | TreeSHAP model explainability and feature attributions | Verified |
| `joblib` | 1.4.2 | Pipeline and trained model serialization | Verified |
| `httpx` | 0.28.1 | Async HTTP client for API integration testing | Verified |
| `pytest` | 9.2.0 | Test runner for unit, integration, and ML validation | Verified (`pytest --version`) |
| `pytest-asyncio` | 1.4.1.post1 | Async test runner for FastAPI endpoints | Verified |
| `pip-audit` | 2.10.1 | Python dependency vulnerability scanner | Verified (`pip-audit --version`) |
| `graphifyy` | 0.9.103 | Architecture knowledge graph builder & community detector | Verified |

---

## 3. Agent Skills & Tooling Registry

| Skill Name | Skill Location | Description / Purpose | Utilization in StayWise AI |
|---|---|---|---|
| **graphify** | `C:\Users\ashwa\.gemini\config\skills\graphify\SKILL.md` | Codebase architecture graph builder, dependency mapping, community detection | Run as the final architectural analysis step producing `graphify-out/GRAPH_REPORT.md` |
| **android-cli** | `C:\Users\ashwa\.gemini\config\plugins\android-cli-plugin\skills\SKILL.md` | Android development CLI tool | Not utilized for web SaaS platform |
| **android-device-hub** | `C:\Users\ashwa\.gemini\config\plugins\android-cli-plugin\skills\device-hub\SKILL.md` | Android device mirroring & inspection | Not utilized for web SaaS platform |
| **compose-preview** | `C:\Users\ashwa\.gemini\config\plugins\android-cli-plugin\skills\compose-preview\SKILL.md` | Jetpack Compose UI rendering | Not utilized for web SaaS platform |

---

## 4. Frontend & Testing Tooling Plan

- **Frontend:** Next.js 14+ (App Router), TypeScript, Tailwind CSS, Lucide React icons, Recharts / ECharts, Canvas/Three.js hotel property visualizer.
- **Auditing Tools:** `npm audit` for frontend CVEs, `pip-audit` for backend CVEs, `pytest` for backend/ML test suites, Playwright for end-to-end browser workflows.
