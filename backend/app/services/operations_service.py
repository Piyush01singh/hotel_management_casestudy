from typing import Dict, Any, List
import math
from sqlalchemy.orm import Session

from backend.app.schemas.forecast_schemas import (
    OperationsWorkloadRequest, OperationsWorkloadResponse, DailyOperationsPlan, ForecastRequest
)
from backend.app.services.forecast_service import forecast_service

class OperationsService:
    def calculate_workload(self, req: OperationsWorkloadRequest, db: Session) -> OperationsWorkloadResponse:
        # 1. Fetch ML forecast
        fc_req = ForecastRequest(
            hotel_id="HOTEL_01",
            room_category="ALL",
            horizon_days=req.horizon_days
        )
        fc_res = forecast_service.generate_forecast(fc_req, db)

        # Hospitality standard cleaning time benchmarks (in minutes)
        CLEAN_TIMES = {
            "STD": {"dep": 30, "stay": 15, "linen_par": 1.0},
            "DLX": {"dep": 35, "stay": 18, "linen_par": 1.2},
            "SUI": {"dep": 45, "stay": 25, "linen_par": 1.8},
            "EXE": {"dep": 60, "stay": 30, "linen_par": 2.5},
        }

        # Group predictions by stay_date
        by_date = {}
        for p in fc_res.predictions:
            d = p.stay_date
            if d not in by_date:
                by_date[d] = {
                    "day_of_week": p.day_of_week,
                    "categories": []
                }
            by_date[d]["categories"].append(p)

        daily_plans: List[DailyOperationsPlan] = []
        total_cleaning_minutes = 0
        peak_cleaning_hours = 0.0
        peak_date = ""

        turnover_rate = req.departure_turnover_rate
        stayover_rate = 1.0 - turnover_rate

        for d_str, info in sorted(by_date.items()):
            day_rooms = 0.0
            day_minutes = 0
            day_linen_packs = 0.0

            for p in info["categories"]:
                r_count = p.predicted_occupied_rooms
                day_rooms += r_count

                times = CLEAN_TIMES.get(p.room_category, CLEAN_TIMES["STD"])
                
                # Turnovers vs Stayovers
                n_dep = r_count * turnover_rate
                n_stay = r_count * stayover_rate

                min_for_cat = (n_dep * times["dep"]) + (n_stay * times["stay"])
                day_minutes += int(round(min_for_cat))
                day_linen_packs += (n_dep * times["linen_par"] * 1.5) + (n_stay * times["linen_par"] * 0.5)

            clean_hours = round(day_minutes / 60.0, 1)
            total_cleaning_minutes += day_minutes

            if clean_hours > peak_cleaning_hours:
                peak_cleaning_hours = clean_hours
                peak_date = d_str

            # Housekeeper FTE count (each shift = req.staff_shift_hours)
            housekeepers_fte = math.ceil(clean_hours / req.staff_shift_hours)

            # Front desk staffing: Base 2 agents, plus 1 agent for every 40 check-ins (turnovers)
            turnovers_count = int(round(day_rooms * turnover_rate))
            stayovers_count = int(round(day_rooms * stayover_rate))
            front_desk_agents = 2 + (turnovers_count // 40)

            # Workload risk
            if clean_hours >= 40.0:
                risk_flag = "Critical Overtime Risk"
            elif clean_hours >= 28.0:
                risk_flag = "High Turnaround Pressure"
            else:
                risk_flag = "Normal Operations"

            daily_plans.append(DailyOperationsPlan(
                stay_date=d_str,
                day_of_week=info["day_of_week"],
                expected_occupied_rooms=round(day_rooms, 1),
                expected_turnovers=turnovers_count,
                expected_stayovers=stayovers_count,
                cleaning_minutes_total=day_minutes,
                housekeeping_hours_needed=clean_hours,
                suggested_housekeepers_fte=housekeepers_fte,
                linen_sets_needed=int(math.ceil(day_linen_packs)),
                front_desk_agents_needed=front_desk_agents,
                workload_risk_flag=risk_flag
            ))

        total_hours = round(total_cleaning_minutes / 60.0, 1)
        avg_hk = round(total_hours / (len(daily_plans) * req.staff_shift_hours), 1) if daily_plans else 0.0

        return OperationsWorkloadResponse(
            horizon_days=req.horizon_days,
            total_clean_hours=total_hours,
            average_daily_housekeepers=avg_hk,
            peak_cleaning_date=peak_date,
            peak_cleaning_hours=peak_cleaning_hours,
            assumptions_applied={
                "departure_turnover_rate": turnover_rate,
                "staff_shift_hours": req.staff_shift_hours,
                "clean_times_standard": "30m dep / 15m stay",
                "clean_times_deluxe": "35m dep / 18m stay",
                "clean_times_suite": "45m dep / 25m stay",
                "clean_times_executive": "60m dep / 30m stay",
                "disclaimer": "Assumption-based operational conversions from ML occupied room predictions."
            },
            daily_plans=daily_plans
        )

operations_service = OperationsService()
