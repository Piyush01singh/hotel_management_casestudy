from typing import Dict, Any, List
import numpy as np
from sqlalchemy.orm import Session

from backend.app.schemas.forecast_schemas import (
    ScenarioSimulateRequest, ScenarioSimulateResponse, ScenarioDateResult, ForecastRequest
)
from backend.app.services.forecast_service import forecast_service

class ScenarioService:
    def simulate(self, req: ScenarioSimulateRequest, db: Session) -> ScenarioSimulateResponse:
        # 1. Obtain baseline model prediction
        fc_req = ForecastRequest(
            hotel_id=req.hotel_id,
            room_category="ALL",
            horizon_days=req.horizon_days
        )
        base_res = forecast_service.generate_forecast(fc_req, db)

        # Category capacity delta map
        cap_deltas = {
            "STD": req.capacity_delta_std,
            "DLX": req.capacity_delta_dlx,
            "SUI": req.capacity_delta_sui,
            "EXE": req.capacity_delta_exe,
        }

        # Group by stay date
        by_date = {}
        for p in base_res.predictions:
            d = p.stay_date
            if d not in by_date:
                by_date[d] = {
                    "day_of_week": p.day_of_week,
                    "categories": []
                }
            by_date[d]["categories"].append(p)

        daily_results: List[ScenarioDateResult] = []
        base_total = 0.0
        scen_total = 0.0
        pressure_days = 0

        event_mult = req.event_uplift_override if req.event_uplift_override else 1.0

        for d_str, info in sorted(by_date.items()):
            day_base_rooms = 0.0
            day_scen_rooms = 0.0
            day_capacity = 0
            day_breached = False

            for p in info["categories"]:
                cat = p.room_category
                base_r = p.predicted_occupied_rooms
                base_cap = p.capacity
                new_cap = max(1, base_cap + cap_deltas.get(cat, 0))

                # Apply scenario math
                adjusted_rooms = base_r * req.demand_factor * (1.0 - req.cancellation_shift) * event_mult
                
                # Check breach against capacity
                if adjusted_rooms > new_cap:
                    day_breached = True
                
                clamped_scen = float(np.clip(adjusted_rooms, 0.0, new_cap))

                day_base_rooms += base_r
                day_scen_rooms += clamped_scen
                day_capacity += new_cap

            base_occ_pct = round((day_base_rooms / max(1, day_capacity)) * 100.0, 1)
            scen_occ_pct = round((day_scen_rooms / max(1, day_capacity)) * 100.0, 1)
            delta_occ = round(scen_occ_pct - base_occ_pct, 1)

            if scen_occ_pct >= 90.0 or day_breached:
                pressure_days += 1

            daily_results.append(ScenarioDateResult(
                stay_date=d_str,
                day_of_week=info["day_of_week"],
                baseline_predicted_rooms=round(day_base_rooms, 1),
                scenario_predicted_rooms=round(day_scen_rooms, 1),
                capacity=day_capacity,
                baseline_occupancy_pct=base_occ_pct,
                scenario_occupancy_pct=scen_occ_pct,
                occupancy_delta_pct=delta_occ,
                capacity_breached=day_breached
            ))

            base_total += day_base_rooms
            scen_total += day_scen_rooms

        delta_nights = round(scen_total - base_total, 1)
        delta_pct = round((delta_nights / max(1.0, base_total)) * 100.0, 1)

        return ScenarioSimulateResponse(
            parameters={
                "demand_factor": req.demand_factor,
                "cancellation_shift": req.cancellation_shift,
                "capacity_deltas": cap_deltas,
                "event_uplift_override": req.event_uplift_override
            },
            baseline_total_room_nights=round(base_total, 1),
            scenario_total_room_nights=round(scen_total, 1),
            room_night_delta=delta_nights,
            room_night_delta_pct=delta_pct,
            capacity_pressure_days=pressure_days,
            daily_results=daily_results
        )

scenario_service = ScenarioService()
