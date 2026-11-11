import os
import json
import datetime
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd
import joblib
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.entities import BookingSnapshot, RoomCategory, OccupancyActual
from backend.app.schemas.forecast_schemas import (
    ForecastRequest, ForecastResponse, PredictionPoint,
    ForecastComparisonResponse, ForecastComparisonItem
)

class ForecastService:
    def __init__(self):
        self.model = None
        self.model_xgb = None
        self.model_ridge = None
        self.scaler = None
        self.uncertainty_params = {}
        self.feature_cols = []
        self._load_artifacts()

    def _load_artifacts(self):
        xgb_path = os.path.join(settings.ML_ARTIFACTS_DIR, "xgboost_model.joblib")
        ridge_path = os.path.join(settings.ML_ARTIFACTS_DIR, "ridge_model.joblib")
        scaler_path = os.path.join(settings.ML_ARTIFACTS_DIR, "preprocessor.joblib")
        uncertainty_path = os.path.join(settings.ML_ARTIFACTS_DIR, "uncertainty_intervals.json")
        metrics_path = os.path.join(settings.ML_ARTIFACTS_DIR, "model_metrics.json")

        if os.path.exists(xgb_path):
            self.model_xgb = joblib.load(xgb_path)
            self.model = self.model_xgb
        if os.path.exists(ridge_path):
            self.model_ridge = joblib.load(ridge_path)
        if os.path.exists(scaler_path):
            self.scaler = joblib.load(scaler_path)
        if os.path.exists(uncertainty_path):
            with open(uncertainty_path, "r", encoding="utf-8") as f:
                self.uncertainty_params = json.load(f)
        if os.path.exists(metrics_path):
            with open(metrics_path, "r", encoding="utf-8") as f:
                m_info = json.load(f)
                self.feature_cols = m_info.get("feature_columns", [])

    def get_latest_cutoff_date(self, db: Session) -> datetime.date:
        res = db.query(BookingSnapshot.snapshot_date).order_by(BookingSnapshot.snapshot_date.desc()).first()
        if res:
            return res[0]
        return datetime.date(2024, 8, 17)

    def generate_forecast(self, req: ForecastRequest, db: Session) -> ForecastResponse:
        if not self.model:
            self._load_artifacts()

        if req.cutoff_date:
            cutoff = datetime.date.fromisoformat(req.cutoff_date)
        else:
            cutoff = self.get_latest_cutoff_date(db)

        # Query room categories
        categories = db.query(RoomCategory).all()
        cat_dict = {c.category_id: c.capacity for c in categories}
        cat_names = {c.category_id: c.name for c in categories}

        selected_categories = [req.room_category] if req.room_category != "ALL" else list(cat_dict.keys())

        # Retrieve snapshots for cutoff
        snapshots = db.query(BookingSnapshot).filter(
            BookingSnapshot.snapshot_date == cutoff,
            BookingSnapshot.lead_time <= req.horizon_days,
            BookingSnapshot.room_category.in_(selected_categories)
        ).order_by(BookingSnapshot.stay_date, BookingSnapshot.room_category).all()

        if not snapshots:
            # Fallback query if specific cutoff not present
            cutoff = self.get_latest_cutoff_date(db)
            snapshots = db.query(BookingSnapshot).filter(
                BookingSnapshot.snapshot_date == cutoff,
                BookingSnapshot.lead_time <= req.horizon_days,
                BookingSnapshot.room_category.in_(selected_categories)
            ).order_by(BookingSnapshot.stay_date, BookingSnapshot.room_category).all()

        # Build feature rows
        feature_rows = []
        meta_rows = []
        dow_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

        # Cache actuals for lag retrieval
        recent_actuals = db.query(OccupancyActual).filter(
            OccupancyActual.stay_date <= cutoff
        ).order_by(OccupancyActual.stay_date.desc()).limit(120).all()

        actuals_by_date_cat = {(a.stay_date, a.room_category): a.occupied_rooms for a in recent_actuals}

        for s in snapshots:
            stay_dt = s.stay_date
            dow = stay_dt.weekday()
            is_wknd = 1 if dow in (4, 5) else 0
            m = stay_dt.month
            cap = s.room_capacity

            # Lag: same DOW
            days_back = (cutoff.weekday() - dow) % 7
            if days_back == 0:
                days_back = 7
            target_lag_date = cutoff - datetime.timedelta(days=days_back)
            same_dow_lag = float(actuals_by_date_cat.get((target_lag_date, s.room_category), cap * 0.72))

            # Approximate rolling means
            roll7 = float(cap * 0.73)
            roll28 = float(cap * 0.72)

            f_vector = [
                s.lead_time,
                dow,
                is_wknd,
                m,
                1.0,  # event_impact_score
                s.otb_rooms,
                s.otb_cancellations,
                s.pickup_1d,
                s.pickup_7d,
                min(1.0, s.otb_rooms / max(1, cap)),
                s.otb_cancellations / (s.otb_rooms + s.otb_cancellations + 1e-4),
                same_dow_lag,
                roll7,
                roll28,
                cap,
                1 if s.room_category == "STD" else 0,
                1 if s.room_category == "DLX" else 0,
                1 if s.room_category == "SUI" else 0,
                1 if s.room_category == "EXE" else 0,
            ]
            feature_rows.append(f_vector)
            meta_rows.append((s, dow_names[dow], bool(is_wknd)))

        if len(feature_rows) == 0:
            return ForecastResponse(
                hotel_id=req.hotel_id,
                cutoff_date=cutoff.isoformat(),
                horizon_days=req.horizon_days,
                room_category=req.room_category,
                total_capacity=sum(cat_dict.values()),
                average_forecast_occupancy_pct=0.0,
                total_forecast_room_nights=0.0,
                capacity_pressure_alerts=0,
                predictions=[]
            )

        X = np.array(feature_rows)
        model_req = (req.model_name or "xgboost").lower()
        if model_req in ("ridge", "ridge_regression") and self.model_ridge and self.scaler:
            X_scaled = self.scaler.transform(X)
            raw_preds = self.model_ridge.predict(X_scaled)
            model_used = "ridge_regression"
        elif model_req in ("naive", "seasonal_naive", "baseline"):
            raw_preds = np.array([f[11] for f in feature_rows])  # hist_same_dow_lag
            model_used = "seasonal_naive"
        else:
            raw_preds = self.model_xgb.predict(X) if self.model_xgb else self.model.predict(X)
            model_used = "staywise_xgboost"

        predictions: List[PredictionPoint] = []
        total_pred_nights = 0.0
        total_possible_nights = 0.0
        pressure_alerts = 0

        for i, (s, dow_str, is_wknd) in enumerate(meta_rows):
            cap = s.room_capacity
            # Double bound clipping
            pred_rooms = float(np.clip(raw_preds[i], 0.0, cap))
            occ_rate = round((pred_rooms / cap) * 100.0, 1)

            # Uncertainty interval lookup by lead time
            lead = s.lead_time
            if lead <= 3:
                u_info = self.uncertainty_params.get("short_1_3d", {})
            elif lead <= 7:
                u_info = self.uncertainty_params.get("medium_4_7d", {})
            else:
                u_info = self.uncertainty_params.get("long_8_14d", {})

            q80_low = u_info.get("q80", {}).get("lower_offset", -2.0)
            q80_high = u_info.get("q80", {}).get("upper_offset", 2.0)
            q95_low = u_info.get("q95", {}).get("lower_offset", -3.5)
            q95_high = u_info.get("q95", {}).get("upper_offset", 3.5)

            u80_l = float(np.clip(round(pred_rooms + q80_low, 1), 0.0, cap))
            u80_u = float(np.clip(round(pred_rooms + q80_high, 1), 0.0, cap))
            u95_l = float(np.clip(round(pred_rooms + q95_low, 1), 0.0, cap))
            u95_u = float(np.clip(round(pred_rooms + q95_high, 1), 0.0, cap))

            if occ_rate >= 90.0:
                risk = "Capacity Pressure"
                pressure_alerts += 1
            elif occ_rate < 45.0:
                risk = "Low Demand"
            else:
                risk = "Normal"

            predictions.append(PredictionPoint(
                stay_date=s.stay_date.isoformat(),
                day_of_week=dow_str,
                is_weekend=is_wknd,
                room_category=s.room_category,
                lead_time=lead,
                otb_rooms=s.otb_rooms,
                otb_cancellations=s.otb_cancellations,
                predicted_occupied_rooms=round(pred_rooms, 1),
                capacity=cap,
                predicted_occupancy_rate=occ_rate,
                uncertainty_80_lower=u80_l,
                uncertainty_80_upper=u80_u,
                uncertainty_95_lower=u95_l,
                uncertainty_95_upper=u95_u,
                risk_level=risk,
                event_impact_score=1.0
            ))

            total_pred_nights += pred_rooms
            total_possible_nights += cap

        avg_occ = round((total_pred_nights / max(1.0, total_possible_nights)) * 100.0, 1)

        return ForecastResponse(
            hotel_id=req.hotel_id,
            cutoff_date=cutoff.isoformat(),
            horizon_days=req.horizon_days,
            room_category=req.room_category,
            model_used=model_used,
            total_capacity=sum(cat_dict[c] for c in selected_categories),
            average_forecast_occupancy_pct=avg_occ,
            total_forecast_room_nights=round(total_pred_nights, 1),
            capacity_pressure_alerts=pressure_alerts,
            predictions=predictions
        )

    def compare_forecasts(self, req: ForecastRequest, db: Session) -> ForecastComparisonResponse:
        fc_xgb = self.generate_forecast(ForecastRequest(
            hotel_id=req.hotel_id,
            room_category=req.room_category,
            horizon_days=req.horizon_days,
            cutoff_date=req.cutoff_date,
            model_name="xgboost"
        ), db)
        fc_ridge = self.generate_forecast(ForecastRequest(
            hotel_id=req.hotel_id,
            room_category=req.room_category,
            horizon_days=req.horizon_days,
            cutoff_date=req.cutoff_date,
            model_name="ridge"
        ), db)
        fc_naive = self.generate_forecast(ForecastRequest(
            hotel_id=req.hotel_id,
            room_category=req.room_category,
            horizon_days=req.horizon_days,
            cutoff_date=req.cutoff_date,
            model_name="seasonal_naive"
        ), db)

        comparisons: List[ForecastComparisonItem] = []
        for p_xgb, p_ridge, p_naive in zip(fc_xgb.predictions, fc_ridge.predictions, fc_naive.predictions):
            comparisons.append(ForecastComparisonItem(
                stay_date=p_xgb.stay_date,
                day_of_week=p_xgb.day_of_week,
                room_category=p_xgb.room_category,
                lead_time=p_xgb.lead_time,
                capacity=p_xgb.capacity,
                otb_rooms=p_xgb.otb_rooms,
                predicted_xgboost=p_xgb.predicted_occupied_rooms,
                predicted_ridge=p_ridge.predicted_occupied_rooms,
                predicted_naive=p_naive.predicted_occupied_rooms,
                diff_xgb_vs_naive=round(p_xgb.predicted_occupied_rooms - p_naive.predicted_occupied_rooms, 1),
                diff_xgb_vs_ridge=round(p_xgb.predicted_occupied_rooms - p_ridge.predicted_occupied_rooms, 1)
            ))

        summary = {
            "staywise_xgboost": {
                "total_room_nights": fc_xgb.total_forecast_room_nights,
                "average_occupancy_pct": fc_xgb.average_forecast_occupancy_pct,
                "pressure_alerts": float(fc_xgb.capacity_pressure_alerts)
            },
            "ridge_regression": {
                "total_room_nights": fc_ridge.total_forecast_room_nights,
                "average_occupancy_pct": fc_ridge.average_forecast_occupancy_pct,
                "pressure_alerts": float(fc_ridge.capacity_pressure_alerts)
            },
            "seasonal_naive": {
                "total_room_nights": fc_naive.total_forecast_room_nights,
                "average_occupancy_pct": fc_naive.average_forecast_occupancy_pct,
                "pressure_alerts": float(fc_naive.capacity_pressure_alerts)
            }
        }

        return ForecastComparisonResponse(
            hotel_id=req.hotel_id,
            cutoff_date=fc_xgb.cutoff_date,
            horizon_days=req.horizon_days,
            room_category=req.room_category,
            models_compared=["staywise_xgboost", "ridge_regression", "seasonal_naive"],
            total_capacity=fc_xgb.total_capacity,
            summary_by_model=summary,
            comparisons=comparisons
        )

forecast_service = ForecastService()
