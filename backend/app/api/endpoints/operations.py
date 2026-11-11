from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.schemas.forecast_schemas import OperationsWorkloadRequest, OperationsWorkloadResponse
from backend.app.services.operations_service import operations_service

router = APIRouter()

@router.get("")
def get_operations_standards():
    return {
        "service": "StayWise Operations Planner",
        "cleaning_benchmarks_minutes": {
            "STD": {"departure_clean": 30, "stayover_clean": 15, "linen_sets": 1.0},
            "DLX": {"departure_clean": 35, "stayover_clean": 18, "linen_sets": 1.2},
            "SUI": {"departure_clean": 45, "stayover_clean": 25, "linen_sets": 1.8},
            "EXE": {"departure_clean": 60, "stayover_clean": 30, "linen_sets": 2.5}
        },
        "default_shift_hours": 7.5,
        "default_turnover_rate": 0.35,
        "calculator_endpoint": "/api/operations/calculate"
    }

@router.post("/calculate", response_model=OperationsWorkloadResponse)
def calculate_workload_post(req: OperationsWorkloadRequest, db: Session = Depends(get_db)):
    return operations_service.calculate_workload(req, db)

@router.get("/calculate", response_model=OperationsWorkloadResponse)
def calculate_workload_get(
    horizon_days: int = Query(default=7, ge=1, le=14),
    departure_turnover_rate: float = Query(default=0.35, ge=0.1, le=0.9),
    staff_shift_hours: float = Query(default=7.5, ge=4.0, le=10.0),
    db: Session = Depends(get_db)
):
    req = OperationsWorkloadRequest(
        horizon_days=horizon_days,
        departure_turnover_rate=departure_turnover_rate,
        staff_shift_hours=staff_shift_hours
    )
    return operations_service.calculate_workload(req, db)
