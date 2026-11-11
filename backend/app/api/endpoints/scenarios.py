from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.database.session import get_db
from backend.app.schemas.forecast_schemas import ScenarioSimulateRequest, ScenarioSimulateResponse
from backend.app.services.scenario_service import scenario_service

router = APIRouter()

@router.get("")
def get_scenarios_overview():
    return {
        "service": "StayWise What-If Scenario Studio",
        "supported_simulations": [
            {
                "id": "demand_surge",
                "name": "High-Demand Surge (+20% Market Pace)",
                "demand_factor": 1.2,
                "cancellation_shift": 0.0
            },
            {
                "id": "cancellation_wave",
                "name": "Extreme Cancellation Wave (+15% Cancellations)",
                "demand_factor": 1.0,
                "cancellation_shift": 0.15
            },
            {
                "id": "renovation_closure",
                "name": "Standard Wing Renovation Closure (-15 rooms)",
                "demand_factor": 1.0,
                "cancellation_shift": 0.0,
                "capacity_delta_std": -15
            }
        ],
        "parameter_constraints": {
            "demand_factor": {"min": 0.5, "max": 1.6, "default": 1.0},
            "cancellation_shift": {"min": -0.3, "max": 0.3, "default": 0.0},
            "capacity_delta_per_category": {"min": -50, "max": 50, "default": 0}
        }
    }

@router.post("/simulate", response_model=ScenarioSimulateResponse)
def simulate_scenario(req: ScenarioSimulateRequest, db: Session = Depends(get_db)):
    return scenario_service.simulate(req, db)
