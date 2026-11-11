from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.services.forecast_service import forecast_service

router = APIRouter()

@router.get("/health")
def get_health(db: Session = Depends(get_db)):
    is_model_loaded = forecast_service.model is not None
    return {
        "status": "healthy",
        "service": "StayWise AI Forecasting API",
        "version": "1.0.0",
        "model_loaded": is_model_loaded,
        "database": "connected"
    }
