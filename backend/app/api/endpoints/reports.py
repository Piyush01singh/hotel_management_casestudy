import io
import csv
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.schemas.forecast_schemas import ForecastRequest, OperationsWorkloadRequest
from backend.app.services.forecast_service import forecast_service
from backend.app.services.operations_service import operations_service

router = APIRouter()

@router.get("")
def get_reports_catalog():
    return {
        "service": "StayWise Reports & Export Center",
        "available_exports": [
            {
                "id": "forecast_csv",
                "name": "Demand Forecast & CI Bands Export",
                "format": "CSV",
                "endpoint": "/api/reports/export/forecast",
                "parameters": ["horizon_days (1-14)", "room_category (ALL, STD, DLX, SUI, EXE)"]
            },
            {
                "id": "operations_csv",
                "name": "Housekeeping & Linen Workload Schedule",
                "format": "CSV",
                "endpoint": "/api/reports/export/operations",
                "parameters": ["horizon_days (1-14)"]
            }
        ]
    }

@router.get("/export/forecast")
def export_forecast_csv(
    horizon_days: int = Query(default=14, ge=1, le=14),
    room_category: str = "ALL",
    db: Session = Depends(get_db)
):
    req = ForecastRequest(
        hotel_id="HOTEL_01",
        room_category=room_category,
        horizon_days=horizon_days
    )
    res = forecast_service.generate_forecast(req, db)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Stay Date", "Day of Week", "Room Category", "Lead Time Days",
        "OTB Confirmed Rooms", "Predicted Occupied Rooms", "Capacity",
        "Predicted Occupancy Rate %", "80% CI Lower", "80% CI Upper",
        "95% CI Lower", "95% CI Upper", "Risk Status"
    ])

    for p in res.predictions:
        writer.writerow([
            p.stay_date, p.day_of_week, p.room_category, p.lead_time,
            p.otb_rooms, p.predicted_occupied_rooms, p.capacity,
            p.predicted_occupancy_rate, p.uncertainty_80_lower, p.uncertainty_80_upper,
            p.uncertainty_95_lower, p.uncertainty_95_upper, p.risk_level
        ])

    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=staywise_forecast_{res.cutoff_date}.csv"}
    )

@router.get("/export/operations")
def export_operations_csv(
    horizon_days: int = Query(default=14, ge=1, le=14),
    db: Session = Depends(get_db)
):
    req = OperationsWorkloadRequest(horizon_days=horizon_days)
    res = operations_service.calculate_workload(req, db)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Stay Date", "Day of Week", "Expected Occupied Rooms",
        "Turnovers (Departures)", "Stayovers", "Cleaning Minutes Total",
        "Housekeeping Hours Needed", "Suggested Housekeepers FTE",
        "Linen Par Sets Needed", "Front Desk Agents", "Risk Status"
    ])

    for p in res.daily_plans:
        writer.writerow([
            p.stay_date, p.day_of_week, p.expected_occupied_rooms,
            p.expected_turnovers, p.expected_stayovers, p.cleaning_minutes_total,
            p.housekeeping_hours_needed, p.suggested_housekeepers_fte,
            p.linen_sets_needed, p.front_desk_agents_needed, p.workload_risk_flag
        ])

    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=staywise_operations_plan.csv"}
    )
