const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function fetchHealth() {
  try {
    const res = await fetch(`${BASE_URL}/api/health`, { cache: "no-store" });
    return await res.json();
  } catch (err) {
    return { status: "offline", model_loaded: false };
  }
}

export async function fetchForecast(params: {
  hotel_id?: string;
  room_category?: string;
  horizon_days?: number;
  cutoff_date?: string;
  model_name?: string;
}) {
  const query = new URLSearchParams();
  if (params.hotel_id) query.append("hotel_id", params.hotel_id);
  if (params.room_category) query.append("room_category", params.room_category);
  if (params.horizon_days) query.append("horizon_days", params.horizon_days.toString());
  if (params.cutoff_date) query.append("cutoff_date", params.cutoff_date);
  if (params.model_name) query.append("model_name", params.model_name);

  const res = await fetch(`${BASE_URL}/api/forecasts?${query.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load demand forecast");
  return await res.json();
}

export async function fetchForecastCompare(params: {
  hotel_id?: string;
  room_category?: string;
  horizon_days?: number;
  cutoff_date?: string;
}) {
  const query = new URLSearchParams();
  if (params.hotel_id) query.append("hotel_id", params.hotel_id);
  if (params.room_category) query.append("room_category", params.room_category);
  if (params.horizon_days) query.append("horizon_days", params.horizon_days.toString());
  if (params.cutoff_date) query.append("cutoff_date", params.cutoff_date);

  const res = await fetch(`${BASE_URL}/api/forecasts/compare?${query.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load forecast model comparison");
  return await res.json();
}

export async function fetchHistoricalReplay(params: {
  hotel_id?: string;
  cutoff_date: string;
  horizon_days?: number;
  room_category?: string;
}) {
  const query = new URLSearchParams();
  if (params.hotel_id) query.append("hotel_id", params.hotel_id);
  query.append("cutoff_date", params.cutoff_date);
  if (params.horizon_days) query.append("horizon_days", params.horizon_days.toString());
  if (params.room_category) query.append("room_category", params.room_category);

  const res = await fetch(`${BASE_URL}/api/forecasts/history?${query.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load historical replay");
  return await res.json();
}

export async function fetchAvailableSnapshots() {
  const res = await fetch(`${BASE_URL}/api/forecasts/snapshots`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load snapshot dates");
  return await res.json();
}

export async function fetchModelMetrics() {
  const res = await fetch(`${BASE_URL}/api/models/metrics`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load model metrics");
  return await res.json();
}

export async function fetchModelExplain() {
  const res = await fetch(`${BASE_URL}/api/models/explain`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load model explanations");
  return await res.json();
}

export async function fetchTestPredictionsSample() {
  const res = await fetch(`${BASE_URL}/api/models/test-predictions`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load test predictions sample");
  return await res.json();
}

export async function simulateScenario(body: {
  hotel_id?: string;
  horizon_days?: number;
  demand_factor?: number;
  cancellation_shift?: number;
  capacity_delta_std?: number;
  capacity_delta_dlx?: number;
  capacity_delta_sui?: number;
  capacity_delta_exe?: number;
  event_uplift_override?: number;
}) {
  const res = await fetch(`${BASE_URL}/api/scenarios/simulate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store"
  });
  if (!res.ok) throw new Error("Scenario simulation failed");
  return await res.json();
}

export async function fetchOperationsWorkload(params: {
  horizon_days?: number;
  departure_turnover_rate?: number;
  staff_shift_hours?: number;
}) {
  const query = new URLSearchParams();
  if (params.horizon_days) query.append("horizon_days", params.horizon_days.toString());
  if (params.departure_turnover_rate) query.append("departure_turnover_rate", params.departure_turnover_rate.toString());
  if (params.staff_shift_hours) query.append("staff_shift_hours", params.staff_shift_hours.toString());

  const res = await fetch(`${BASE_URL}/api/operations/calculate?${query.toString()}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to calculate operations workload");
  return await res.json();
}

export async function fetchDatasetSummary() {
  const res = await fetch(`${BASE_URL}/api/datasets/summary`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load dataset summary");
  return await res.json();
}

export async function fetchBookingIntelligence() {
  const res = await fetch(`${BASE_URL}/api/datasets/intelligence`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load booking intelligence");
  return await res.json();
}
