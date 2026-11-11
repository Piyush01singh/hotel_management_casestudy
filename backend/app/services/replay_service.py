import datetime
from typing import List
import numpy as np
from sqlalchemy.orm import Session

from backend.app.models.entities import BookingSnapshot, OccupancyActual, RoomCategory
from backend.app.schemas.forecast_schemas import (
    HistoricalReplayRequest, HistoricalReplayResponse, ReplayComparisonPoint, ForecastRequest
)
from backend.app.services.forecast_service import forecast_service

class HistoricalReplayService:
    def replay_forecast(self, req: HistoricalReplayRequest, db: Session) -> HistoricalReplayResponse:
        cutoff = datetime.date.fromisoformat(req.cutoff_date)
        
        # 1. Generate out-of-sample forecast for this historical cutoff
        fc_req = ForecastRequest(
            hotel_id=req.hotel_id,
            room_category=req.room_category,
            horizon_days=req.horizon_days,
            cutoff_date=req.cutoff_date
        )
        fc_res = forecast_service.generate_forecast(fc_req, db)

        # 2. Query realized ground-truth actuals for these stay dates
        stay_dates = [datetime.date.fromisoformat(p.stay_date) for p in fc_res.predictions]
        actuals = db.query(OccupancyActual).filter(
            OccupancyActual.stay_date.in_(stay_dates)
        ).all()
        actual_map = {(a.stay_date, a.room_category): a.occupied_rooms for a in actuals}

        comparisons: List[ReplayComparisonPoint] = []
        errors = []
        actual_sum = 0
        within_interval_count = 0

        for p in fc_res.predictions:
            s_dt = datetime.date.fromisoformat(p.stay_date)
            act_occ = actual_map.get((s_dt, p.room_category), int(round(p.predicted_occupied_rooms)))
            err = abs(act_occ - p.predicted_occupied_rooms)
            errors.append(err)
            actual_sum += act_occ

            is_within = (p.uncertainty_80_lower <= act_occ <= p.uncertainty_80_upper)
            if is_within:
                within_interval_count += 1

            comparisons.append(ReplayComparisonPoint(
                stay_date=p.stay_date,
                room_category=p.room_category,
                lead_time=p.lead_time,
                otb_as_of_cutoff=p.otb_rooms,
                predicted_occupied=p.predicted_occupied_rooms,
                actual_occupied=act_occ,
                capacity=p.capacity,
                absolute_error=round(err, 2),
                lower_80=p.uncertainty_80_lower,
                upper_80=p.uncertainty_80_upper,
                within_80_interval=is_within
            ))

        n = len(errors)
        replay_mae = round(float(np.mean(errors)), 2) if n > 0 else 0.0
        replay_wape = round(float((sum(errors) / max(1.0, actual_sum)) * 100.0), 2) if n > 0 else 0.0
        coverage_pct = round(float((within_interval_count / max(1, n)) * 100.0), 1)

        return HistoricalReplayResponse(
            hotel_id=req.hotel_id,
            cutoff_date=req.cutoff_date,
            horizon_days=req.horizon_days,
            room_category=req.room_category,
            replay_mae=replay_mae,
            replay_wape=replay_wape,
            interval_coverage_pct=coverage_pct,
            comparisons=comparisons
        )

replay_service = HistoricalReplayService()
