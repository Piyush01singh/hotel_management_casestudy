from typing import Optional, List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models.entities import BookingSnapshot
from backend.app.schemas.forecast_schemas import (
    ForecastRequest, ForecastResponse, HistoricalReplayRequest, HistoricalReplayResponse,
    ForecastComparisonResponse
)
from backend.app.services.forecast_service import forecast_service
from backend.app.services.replay_service import replay_service

router = APIRouter()

@router.post("", response_model=ForecastResponse)
def create_forecast(req: ForecastRequest, db: Session = Depends(get_db)):
    return forecast_service.generate_forecast(req, db)

@router.get("", response_model=ForecastResponse)
def get_forecast(
    hotel_id: str = "HOTEL_01",
    room_category: str = "ALL",
    horizon_days: int = Query(default=7, ge=1, le=14),
    cutoff_date: Optional[str] = None,
    model_name: Optional[str] = Query(default="xgboost"),
    db: Session = Depends(get_db)
):
    req = ForecastRequest(
        hotel_id=hotel_id,
        room_category=room_category,
        horizon_days=horizon_days,
        cutoff_date=cutoff_date,
        model_name=model_name
    )
    return forecast_service.generate_forecast(req, db)

@router.post("/compare", response_model=ForecastComparisonResponse)
def compare_forecasts_post(req: ForecastRequest, db: Session = Depends(get_db)):
    return forecast_service.compare_forecasts(req, db)

@router.get("/compare", response_model=ForecastComparisonResponse)
def compare_forecasts_get(
    hotel_id: str = "HOTEL_01",
    room_category: str = "ALL",
    horizon_days: int = Query(default=7, ge=1, le=14),
    cutoff_date: Optional[str] = None,
    db: Session = Depends(get_db)
):
    req = ForecastRequest(
        hotel_id=hotel_id,
        room_category=room_category,
        horizon_days=horizon_days,
        cutoff_date=cutoff_date
    )
    return forecast_service.compare_forecasts(req, db)

@router.post("/history", response_model=HistoricalReplayResponse)
def replay_history_post(req: HistoricalReplayRequest, db: Session = Depends(get_db)):
    return replay_service.replay_forecast(req, db)

@router.get("/history", response_model=HistoricalReplayResponse)
def replay_history_get(
    hotel_id: str = "HOTEL_01",
    cutoff_date: str = "2024-04-15",
    horizon_days: int = Query(default=7, ge=1, le=14),
    room_category: str = "ALL",
    db: Session = Depends(get_db)
):
    req = HistoricalReplayRequest(
        hotel_id=hotel_id,
        cutoff_date=cutoff_date,
        horizon_days=horizon_days,
        room_category=room_category
    )
    return replay_service.replay_forecast(req, db)

@router.get("/snapshots")
def get_available_snapshot_dates(db: Session = Depends(get_db)):
    # Return distinct snapshot dates
    rows = db.query(BookingSnapshot.snapshot_date).distinct().order_by(BookingSnapshot.snapshot_date.desc()).all()
    dates = [str(r[0]) for r in rows]
    return {
        "count": len(dates),
        "latest": dates[0] if dates else None,
        "earliest": dates[-1] if dates else None,
        "sample_dates": dates[::14]  # every 2 weeks for clean dropdown selector
    }
