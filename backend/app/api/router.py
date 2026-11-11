from fastapi import APIRouter
from backend.app.api.endpoints import health, forecasts, models, scenarios, operations, datasets, reports

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(forecasts.router, prefix="/forecasts", tags=["Forecasts"])
api_router.include_router(models.router, prefix="/models", tags=["Models"])
api_router.include_router(scenarios.router, prefix="/scenarios", tags=["Scenarios"])
api_router.include_router(operations.router, prefix="/operations", tags=["Operations"])
api_router.include_router(datasets.router, prefix="/datasets", tags=["Datasets"])
api_router.include_router(reports.router, prefix="/reports", tags=["Reports"])
