# Graph Report - piyush_aiproject  (2026-11-06)

## Corpus Check
- Corpus is ~34,946 words - fits in a single context window. You may not need a graph.

## Summary
- 294 nodes · 634 edges · 13 communities (8 shown, 5 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Demand Forecast Interface
- Model Lab & Metrics API
- Frontend Core Dependencies
- Data Observatory API
- Forecast & Replay Routers
- Core Backend Configuration
- TypeScript Toolchain
- Operations Planner Router
- Scenario Studio Service

## God Nodes (most connected - your core abstractions)
1. `Navbar()` - 21 edges
2. `ForecastRequest` - 19 edges
3. `compilerOptions` - 16 edges
4. `react` - 15 edges
5. `lucide-react` - 14 edges
6. `BookingSnapshot` - 11 edges
7. `ForecastService` - 11 edges
8. `OccupancyActual` - 10 edges
9. `OperationsWorkloadRequest` - 10 edges
10. `RoomCategory` - 9 edges

## Surprising Connections (you probably didn't know these)
- `get_available_snapshot_dates()` --uses--> `BookingSnapshot`  [INFERRED]
  backend/app/api/endpoints/forecasts.py → backend/app/models/entities.py
- `calculate_workload_post()` --uses--> `OperationsWorkloadRequest`  [INFERRED]
  backend/app/api/endpoints/operations.py → backend/app/schemas/forecast_schemas.py
- `calculate_workload_get()` --uses--> `OperationsWorkloadRequest`  [INFERRED]
  backend/app/api/endpoints/operations.py → backend/app/schemas/forecast_schemas.py
- `export_forecast_csv()` --uses--> `ForecastRequest`  [INFERRED]
  backend/app/api/endpoints/reports.py → backend/app/schemas/forecast_schemas.py
- `export_operations_csv()` --uses--> `OperationsWorkloadRequest`  [INFERRED]
  backend/app/api/endpoints/reports.py → backend/app/schemas/forecast_schemas.py

## Import Cycles
- None detected.

## Communities (13 total, 5 thin omitted)

### Community 0 - "Demand Forecast Interface"
Cohesion: 0.08
Nodes (22): DemandForecastPage(), BookingIntelligencePage(), CANCELLATION_BY_LEAD, DOW_OCCUPANCY, LEAD_TIME_DATA, PICKUP_PACE_CURVE, ModelLabPage(), DataObservatoryPage() (+14 more)

### Community 1 - "Model Lab & Metrics API"
Cohesion: 0.08
Nodes (17): get_model_explanations(), get_model_metrics(), get_test_predictions_sample(), build_daily_snapshots(), generate_booking_events(), get_event_impact(), save_datasets(), run_eda() (+9 more)

### Community 2 - "Frontend Core Dependencies"
Cohesion: 0.06
Nodes (41): dependencies, clsx@^2.1.1, lucide-react@^0.475.0, next@^14.2.25, react@^18.3.1, react-dom@^18.3.1, recharts@^2.15.1, tailwind-merge@^2.6.0 (+33 more)

### Community 3 - "Data Observatory API"
Cohesion: 0.10
Nodes (10): get_datasets_summary(), validate_dataset(), get_health(), calculate_workload_get(), calculate_workload_post(), export_forecast_csv(), export_operations_csv(), simulate_scenario() (+2 more)

### Community 4 - "Forecast & Replay Routers"
Cohesion: 0.16
Nodes (19): create_forecast(), get_available_snapshot_dates(), get_forecast(), replay_history_get(), replay_history_post(), DailyOperationsPlan, ForecastRequest, ForecastResponse (+11 more)

### Community 5 - "Core Backend Configuration"
Cohesion: 0.17
Nodes (10): Settings, seed_database(), BookingSnapshot, Hotel, ModelMetric, OccupancyActual, RoomCategory, PredictionPoint (+2 more)

### Community 6 - "TypeScript Toolchain"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 8 - "Operations Planner Router"
Cohesion: 0.50
Nodes (3): metadata, RootLayout(), Sidebar()

## Knowledge Gaps
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `ForecastRequest` connect `Forecast & Replay Routers` to `Data Observatory API`, `Core Backend Configuration`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `ForecastRequest` (e.g. with `create_forecast()` and `get_forecast()`) actually correct?**
  _`ForecastRequest` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Should `Demand Forecast Interface` be split into smaller, more focused modules?**
  _Cohesion score 0.07982583454281568 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Demand Forecast Interface` to `Frontend Core Dependencies`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Should `Model Lab & Metrics API` be split into smaller, more focused modules?**
  _Cohesion score 0.07510204081632653 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `Demand Forecast Interface` to `Frontend Core Dependencies`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Should `Frontend Core Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.06025369978858351 - nodes in this community are weakly interconnected._