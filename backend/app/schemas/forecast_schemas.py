from typing import List, Dict, Optional, Any
from pydantic import BaseModel, Field

class ForecastRequest(BaseModel):
    hotel_id: str = "HOTEL_01"
    room_category: str = "ALL"  # "ALL", "STD", "DLX", "SUI", "EXE"
    horizon_days: int = Field(default=7, ge=1, le=14)
    cutoff_date: Optional[str] = None  # YYYY-MM-DD; if None, uses latest cutoff
    model_name: Optional[str] = "xgboost"  # "xgboost", "ridge", "seasonal_naive"

class PredictionPoint(BaseModel):
    stay_date: str
    day_of_week: str
    is_weekend: bool
    room_category: str
    lead_time: int
    otb_rooms: int
    otb_cancellations: int
    predicted_occupied_rooms: float
    capacity: int
    predicted_occupancy_rate: float
    uncertainty_80_lower: float
    uncertainty_80_upper: float
    uncertainty_95_lower: float
    uncertainty_95_upper: float
    risk_level: str  # "Normal", "Capacity Pressure", "Low Demand"
    event_impact_score: float

class ForecastResponse(BaseModel):
    hotel_id: str
    cutoff_date: str
    horizon_days: int
    room_category: str
    model_used: str = "staywise_xgboost"
    total_capacity: int
    average_forecast_occupancy_pct: float
    total_forecast_room_nights: float
    capacity_pressure_alerts: int
    predictions: List[PredictionPoint]

class ForecastComparisonItem(BaseModel):
    stay_date: str
    day_of_week: str
    room_category: str
    lead_time: int
    capacity: int
    otb_rooms: int
    predicted_xgboost: float
    predicted_ridge: float
    predicted_naive: float
    diff_xgb_vs_naive: float
    diff_xgb_vs_ridge: float

class ForecastComparisonResponse(BaseModel):
    hotel_id: str
    cutoff_date: str
    horizon_days: int
    room_category: str
    models_compared: List[str]
    total_capacity: int
    summary_by_model: Dict[str, Dict[str, float]]
    comparisons: List[ForecastComparisonItem]

class HistoricalReplayRequest(BaseModel):
    hotel_id: str = "HOTEL_01"
    cutoff_date: str  # e.g., "2024-04-15"
    horizon_days: int = Field(default=7, ge=1, le=14)
    room_category: str = "ALL"

class ReplayComparisonPoint(BaseModel):
    stay_date: str
    room_category: str
    lead_time: int
    otb_as_of_cutoff: int
    predicted_occupied: float
    actual_occupied: int
    capacity: int
    absolute_error: float
    lower_80: float
    upper_80: float
    within_80_interval: bool

class HistoricalReplayResponse(BaseModel):
    hotel_id: str
    cutoff_date: str
    horizon_days: int
    room_category: str
    replay_mae: float
    replay_wape: float
    interval_coverage_pct: float
    comparisons: List[ReplayComparisonPoint]

class ScenarioSimulateRequest(BaseModel):
    hotel_id: str = "HOTEL_01"
    horizon_days: int = Field(default=7, ge=1, le=14)
    demand_factor: float = Field(default=1.0, ge=0.5, le=1.6)  # multiplier, e.g. 1.15
    cancellation_shift: float = Field(default=0.0, ge=-0.3, le=0.3)  # +/- change
    capacity_delta_std: int = 0
    capacity_delta_dlx: int = 0
    capacity_delta_sui: int = 0
    capacity_delta_exe: int = 0
    event_uplift_override: Optional[float] = None

class ScenarioDateResult(BaseModel):
    stay_date: str
    day_of_week: str
    baseline_predicted_rooms: float
    scenario_predicted_rooms: float
    capacity: int
    baseline_occupancy_pct: float
    scenario_occupancy_pct: float
    occupancy_delta_pct: float
    capacity_breached: bool

class ScenarioSimulateResponse(BaseModel):
    parameters: Dict[str, Any]
    baseline_total_room_nights: float
    scenario_total_room_nights: float
    room_night_delta: float
    room_night_delta_pct: float
    capacity_pressure_days: int
    daily_results: List[ScenarioDateResult]

class OperationsWorkloadRequest(BaseModel):
    horizon_days: int = Field(default=7, ge=1, le=14)
    departure_turnover_rate: float = Field(default=0.35, ge=0.1, le=0.9)
    staff_shift_hours: float = Field(default=7.5, ge=4.0, le=10.0)

class DailyOperationsPlan(BaseModel):
    stay_date: str
    day_of_week: str
    expected_occupied_rooms: float
    expected_turnovers: int
    expected_stayovers: int
    cleaning_minutes_total: int
    housekeeping_hours_needed: float
    suggested_housekeepers_fte: int
    linen_sets_needed: int
    front_desk_agents_needed: int
    workload_risk_flag: str

class OperationsWorkloadResponse(BaseModel):
    horizon_days: int
    total_clean_hours: float
    average_daily_housekeepers: float
    peak_cleaning_date: str
    peak_cleaning_hours: float
    assumptions_applied: Dict[str, Any]
    daily_plans: List[DailyOperationsPlan]
