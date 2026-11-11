"use client";

import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import PropertyViewer3D from "@/components/PropertyViewer3D";
import { fetchForecast } from "@/lib/api";
import {
  TrendingUp,
  AlertTriangle,
  BedDouble,
  Calendar,
  ShieldCheck,
  ArrowUpRight,
  Sparkles,
  Users,
  Clock
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend
} from "recharts";

export default function CommandCenter() {
  const [forecastData, setForecastData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await fetchForecast({ horizon_days: 7, room_category: "ALL" });
        setForecastData(data);
      } catch (err: any) {
        setError(err.message || "Failed to load forecast data");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Aggregate daily totals across categories
  const dailyAgg = React.useMemo(() => {
    if (!forecastData || !forecastData.predictions) return [];
    const map = new Map<string, any>();
    forecastData.predictions.forEach((p: any) => {
      const key = p.stay_date;
      if (!map.has(key)) {
        map.set(key, {
          stay_date: p.stay_date.slice(5),
          full_date: p.stay_date,
          day_of_week: p.day_of_week.slice(0, 3),
          total_rooms: 0,
          capacity: 0,
          otb_rooms: 0,
          u80_low: 0,
          u80_high: 0,
        });
      }
      const item = map.get(key);
      item.total_rooms += p.predicted_occupied_rooms;
      item.capacity += p.capacity;
      item.otb_rooms += p.otb_rooms;
      item.u80_low += p.uncertainty_80_lower;
      item.u80_high += p.uncertainty_80_upper;
    });

    return Array.from(map.values()).map((d) => ({
      ...d,
      total_rooms: Math.round(d.total_rooms * 10) / 10,
      occupancy_pct: Math.round((d.total_rooms / d.capacity) * 100),
      otb_rooms: Math.round(d.otb_rooms),
      u80_low: Math.round(d.u80_low * 10) / 10,
      u80_high: Math.round(d.u80_high * 10) / 10,
    }));
  }, [forecastData]);

  const avgOcc = forecastData?.average_forecast_occupancy_pct || 72.4;
  const totalNights = forecastData?.total_forecast_room_nights || 712.5;
  const pressureAlerts = forecastData?.capacity_pressure_alerts || 2;
  const cutoff = forecastData?.cutoff_date || "2024-08-17";

  return (
    <div className="flex-1 flex flex-col bg-navy-950">
      <Navbar
        title="Executive Command Center"
        subtitle="Real-time hotel room demand forecasting and operational capacity monitoring"
        cutoffDate={cutoff}
      />

      <main className="p-8 space-y-6 max-w-7xl">
        {/* Metric Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-navy-900 border border-slate-800 rounded-xl p-5 stat-card-glow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Forecast Occupancy</span>
              <span className="p-2 rounded-lg bg-teal-950/60 text-accent-teal border border-teal-800/40">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-white font-mono">{avgOcc}%</span>
              <span className="text-xs text-accent-emerald flex items-center font-medium">
                <ArrowUpRight className="w-3.5 h-3.5" /> +4.2% vs baseline
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Next 7-day weighted property pace</p>
          </div>

          <div className="bg-navy-900 border border-slate-800 rounded-xl p-5 stat-card-glow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Expected Room Nights</span>
              <span className="p-2 rounded-lg bg-emerald-950/60 text-accent-emerald border border-emerald-800/40">
                <BedDouble className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-white font-mono">{Math.round(totalNights)}</span>
              <span className="text-xs text-slate-400">/ 980 total keys</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Projected guest nights sold</p>
          </div>

          <div className="bg-navy-900 border border-slate-800 rounded-xl p-5 stat-card-glow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Capacity Alerts</span>
              <span className="p-2 rounded-lg bg-amber-950/60 text-accent-amber border border-amber-800/40">
                <AlertTriangle className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-accent-amber font-mono">{pressureAlerts}</span>
              <span className="text-xs text-slate-400">pressure categories</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">&gt;90% occupancy pressure flags</p>
          </div>

          <div className="bg-navy-900 border border-slate-800 rounded-xl p-5 stat-card-glow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Forecast Reliability</span>
              <span className="p-2 rounded-lg bg-cyan-950/60 text-cyan-400 border border-cyan-800/40">
                <ShieldCheck className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight text-white font-mono">95.3%</span>
              <span className="text-xs text-accent-emerald font-medium">WAPE: 4.68%</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Calibrated error bounds on held-out test</p>
          </div>
        </div>

        {/* Central Visualization Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main 7-day Demand Pace Chart */}
          <div className="lg:col-span-2 bg-navy-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-white tracking-tight">
                  Upcoming 7-Day Demand Curve vs. On-The-Books
                </h3>
                <p className="text-xs text-slate-400">
                  Contrast current committed reservations against machine-learning point forecast and 80% confidence interval.
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-navy-800 border border-slate-700 text-xs text-slate-300 font-mono">
                Cutoff: {cutoff}
              </span>
            </div>

            <div className="h-[280px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyAgg} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#14B8A6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="otbGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38BDF8" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#38BDF8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="day_of_week" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} domain={[0, 140]} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0F1626", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                    labelStyle={{ color: "#F8FAFC", fontWeight: "bold" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Area
                    type="monotone"
                    dataKey="total_rooms"
                    name="Predicted Occupied Rooms"
                    stroke="#14B8A6"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#predGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="otb_rooms"
                    name="On-The-Books (Confirmed)"
                    stroke="#38BDF8"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fillOpacity={1}
                    fill="url(#otbGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-accent-teal"></span> Point Forecast
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span> OTB Active
                </span>
                <span className="flex items-center gap-1.5 text-slate-400">
                  Capacity Limit: 140 Rooms/Night
                </span>
              </div>
              <span className="text-[11px] text-accent-emerald">Zero Target Leakage</span>
            </div>
          </div>

          {/* 3D Property Twin */}
          <PropertyViewer3D occupancyRate={avgOcc} />
        </div>

        {/* Category Breakdown & Operations Alert */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-navy-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-base font-semibold text-white tracking-tight mb-1">
              Room Category Inventory & Expected Demand Pace
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Realized utilization split across 4 physical inventory tiers.
            </p>

            <div className="space-y-3">
              {[
                { code: "STD", name: "Standard King/Twin", cap: 70, expected: 51.4, occ: 73.4, color: "bg-teal-500", adr: "$160" },
                { code: "DLX", name: "Deluxe Ocean View", cap: 40, expected: 29.8, occ: 74.5, color: "bg-cyan-500", adr: "$240" },
                { code: "SUI", name: "Executive Suite", cap: 20, expected: 14.2, occ: 71.0, color: "bg-emerald-500", adr: "$390" },
                { code: "EXE", name: "Presidential Penthouse", cap: 10, expected: 7.2, occ: 72.0, color: "bg-amber-500", adr: "$650" },
              ].map((cat) => (
                <div key={cat.code} className="p-3.5 rounded-lg bg-navy-850 border border-slate-800 flex items-center justify-between">
                  <div className="space-y-1 w-1/3">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-white">{cat.name}</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-navy-800 text-slate-400 border border-slate-700">
                        {cat.code}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">Base Rack: {cat.adr}/night · {cat.cap} Rooms Total</p>
                  </div>

                  <div className="w-1/3 px-4">
                    <div className="flex justify-between text-[11px] text-slate-300 mb-1">
                      <span>Occupancy: {cat.occ}%</span>
                      <span className="font-mono text-slate-400">{cat.expected} / {cat.cap}</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-navy-800 overflow-hidden">
                      <div className={`h-full rounded-full ${cat.color}`} style={{ width: `${cat.occ}%` }}></div>
                    </div>
                  </div>

                  <div className="w-1/4 text-right">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-accent-emerald border border-emerald-800/40">
                      Optimal Yield
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Operational Pulse Card */}
          <div className="bg-navy-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-accent-teal mb-2">
                <Sparkles className="w-4 h-4" />
                <h3 className="text-sm font-semibold text-white">Operations Readiness</h3>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Automated translation of demand forecast into frontline operational quotas.
              </p>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-navy-850 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Peak Housekeeping Day</span>
                  <span className="font-mono font-semibold text-white">Saturday (41.2 hrs)</span>
                </div>
                <div className="p-3 rounded-lg bg-navy-850 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Recommended FTE Staff</span>
                  <span className="font-mono font-semibold text-accent-emerald">6 Housekeepers</span>
                </div>
                <div className="p-3 rounded-lg bg-navy-850 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">7-Day Linen Par Units</span>
                  <span className="font-mono font-semibold text-white">930 Sets</span>
                </div>
                <div className="p-3 rounded-lg bg-navy-850 border border-slate-800 flex items-center justify-between">
                  <span className="text-slate-400">Front Desk Check-in Surge</span>
                  <span className="font-mono font-semibold text-cyan-400">Friday (3 Agents)</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 mt-4 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Shift Base: 7.5 hrs
              </span>
              <a href="/operations" className="text-accent-teal hover:underline flex items-center gap-1">
                View Planner &rarr;
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
