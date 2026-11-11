"use client";

import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { fetchForecast } from "@/lib/api";
import {
  TrendingUp,
  Download,
  Filter,
  Calendar,
  AlertCircle,
  ShieldCheck,
  ChevronRight,
  Layers
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";

export default function DemandForecastPage() {
  const [horizonDays, setHorizonDays] = useState<number>(14);
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [selectedModel, setSelectedModel] = useState<string>("xgboost");
  const [forecastData, setForecastData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadForecast() {
      try {
        setLoading(true);
        const data = await fetchForecast({
          horizon_days: horizonDays,
          room_category: categoryFilter,
          model_name: selectedModel,
        });
        setForecastData(data);
      } catch (err: any) {
        setError(err.message || "Failed to load forecast data");
      } finally {
        setLoading(false);
      }
    }
    loadForecast();
  }, [horizonDays, categoryFilter, selectedModel]);

  // Transform data for charting with uncertainty bands
  const chartData = React.useMemo(() => {
    if (!forecastData || !forecastData.predictions) return [];

    if (categoryFilter === "ALL") {
      // Aggregate by stay_date
      const map = new Map<string, any>();
      forecastData.predictions.forEach((p: any) => {
        const d = p.stay_date;
        if (!map.has(d)) {
          map.set(d, {
            stay_date: p.stay_date.slice(5),
            full_date: p.stay_date,
            day_of_week: p.day_of_week.slice(0, 3),
            predicted_rooms: 0,
            otb_rooms: 0,
            u80_low: 0,
            u80_high: 0,
            u95_low: 0,
            u95_high: 0,
            capacity: 0,
          });
        }
        const item = map.get(d);
        item.predicted_rooms += p.predicted_occupied_rooms;
        item.otb_rooms += p.otb_rooms;
        item.u80_low += p.uncertainty_80_lower;
        item.u80_high += p.uncertainty_80_upper;
        item.u95_low += p.uncertainty_95_lower;
        item.u95_high += p.uncertainty_95_upper;
        item.capacity += p.capacity;
      });

      return Array.from(map.values()).map((item) => ({
        ...item,
        predicted_rooms: Math.round(item.predicted_rooms * 10) / 10,
        otb_rooms: Math.round(item.otb_rooms),
        u80_low: Math.round(item.u80_low * 10) / 10,
        u80_high: Math.round(item.u80_high * 10) / 10,
        u95_low: Math.round(item.u95_low * 10) / 10,
        u95_high: Math.round(item.u95_high * 10) / 10,
        // Band difference for stacked area: band80 = u80_high - u80_low
        band80: Math.max(0, Math.round((item.u80_high - item.u80_low) * 10) / 10),
      }));
    } else {
      // Single category view
      return forecastData.predictions.map((p: any) => ({
        stay_date: p.stay_date.slice(5),
        full_date: p.stay_date,
        day_of_week: p.day_of_week.slice(0, 3),
        predicted_rooms: p.predicted_occupied_rooms,
        otb_rooms: p.otb_rooms,
        u80_low: p.uncertainty_80_lower,
        u80_high: p.uncertainty_80_upper,
        u95_low: p.uncertainty_95_lower,
        u95_high: p.uncertainty_95_upper,
        capacity: p.capacity,
        band80: Math.max(0, Math.round((p.uncertainty_80_upper - p.uncertainty_80_lower) * 10) / 10),
      }));
    }
  }, [forecastData, categoryFilter]);

  const handleExportCSV = () => {
    window.open(
      `http://127.0.0.1:8000/api/reports/export/forecast?horizon_days=${horizonDays}&room_category=${categoryFilter}`,
      "_blank"
    );
  };

  const cutoff = forecastData?.cutoff_date || "2024-08-17";

  return (
    <div className="flex-1 flex flex-col bg-navy-950">
      <Navbar
        title="Demand Forecast Engine"
        subtitle="Statistical point predictions and calibrated quantile confidence bands"
        cutoffDate={cutoff}
      />

      <main className="p-8 space-y-6 max-w-7xl">
        {/* Controls Toolbar */}
        <div className="bg-navy-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Horizon Selector */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Horizon:</span>
              <div className="flex rounded-lg bg-navy-950 p-1 border border-slate-800">
                <button
                  onClick={() => setHorizonDays(7)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    horizonDays === 7
                      ? "bg-accent-teal text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  7-Day Outlook
                </button>
                <button
                  onClick={() => setHorizonDays(14)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    horizonDays === 14
                      ? "bg-accent-teal text-slate-950 shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  14-Day Horizon
                </button>
              </div>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Room Category:</span>
              <div className="flex rounded-lg bg-navy-950 p-1 border border-slate-800">
                {[
                  { id: "ALL", label: "All Keys (140)" },
                  { id: "STD", label: "Standard (70)" },
                  { id: "DLX", label: "Deluxe (40)" },
                  { id: "SUI", label: "Suites (20)" },
                  { id: "EXE", label: "Executive (10)" },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategoryFilter(cat.id)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                      categoryFilter === cat.id
                        ? "bg-navy-700 text-white font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Model Selector */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-medium">Forecaster:</span>
              <div className="flex rounded-lg bg-navy-950 p-1 border border-slate-800">
                {[
                  { id: "xgboost", label: "XGBoost (Champion)" },
                  { id: "ridge", label: "Ridge Regressor" },
                  { id: "seasonal_naive", label: "Seasonal Naive" },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedModel(m.id)}
                    className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                      selectedModel === m.id
                        ? "bg-teal-500/20 text-accent-teal border border-teal-500/40 font-semibold"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Export Action */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-navy-800 hover:bg-navy-700 border border-slate-700 text-xs font-medium text-slate-200 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-accent-teal" />
            <span>Download CSV Report</span>
          </button>
        </div>

        {/* Prediction Chart with Uncertainty Intervals */}
        <div className="bg-navy-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                <span>Stay Date Demand Trajectory & Statistical Confidence Bands</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal-950 text-accent-teal border border-teal-800/40">
                  Calibrated Quantiles
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Dual line plotting current On-The-Books against ML point prediction. Shaded envelope represents calibrated 80% empirical confidence interval.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="w-3 h-1 bg-accent-teal"></span> Point Forecast
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-3 h-1 bg-sky-400 border-dashed border-t"></span> OTB Active
              </span>
              <span className="flex items-center gap-1.5 text-slate-400">
                <span className="w-3 h-3 bg-teal-500/20 border border-teal-500/40 rounded-sm"></span> 80% Uncertainty Band
              </span>
            </div>
          </div>

          <div className="h-[340px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#14B8A6" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="stay_date" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0F1626", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                  labelStyle={{ color: "#F8FAFC", fontWeight: "bold" }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                
                {/* 80% Uncertainty Envelope Base & Band */}
                <Area
                  type="monotone"
                  dataKey="u80_low"
                  stackId="band"
                  stroke="none"
                  fill="transparent"
                  legendType="none"
                />
                <Area
                  type="monotone"
                  dataKey="band80"
                  stackId="band"
                  name="80% Uncertainty Interval"
                  stroke="#14B8A6"
                  strokeWidth={0.5}
                  strokeDasharray="2 2"
                  fill="url(#bandGrad)"
                />

                <Line
                  type="monotone"
                  dataKey="predicted_rooms"
                  name="Predicted Occupied Rooms"
                  stroke="#14B8A6"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#14B8A6" }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="otb_rooms"
                  name="On-The-Books Active"
                  stroke="#38BDF8"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={{ r: 2, fill: "#38BDF8" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Granular Prediction Data Table */}
        <div className="bg-navy-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight">
                Date-Wise Forecast Inventory Registry
              </h3>
              <p className="text-xs text-slate-400">
                Detailed prediction records with lead times, physical capacity limits, and operational risk status.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Showing {forecastData?.predictions?.length || 0} Records
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-navy-850 text-slate-400 font-medium uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3">Stay Date</th>
                  <th className="px-4 py-3">Day</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Lead Days</th>
                  <th className="px-4 py-3">OTB Rooms</th>
                  <th className="px-4 py-3">Predicted Rooms</th>
                  <th className="px-4 py-3">Capacity</th>
                  <th className="px-4 py-3">Occ Rate</th>
                  <th className="px-4 py-3">80% Interval</th>
                  <th className="px-4 py-3">Risk Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {forecastData?.predictions?.map((p: any, idx: number) => {
                  const isPressure = p.predicted_occupancy_rate >= 90;
                  const isLow = p.predicted_occupancy_rate < 45;
                  return (
                    <tr key={idx} className="hover:bg-navy-850/50 transition-colors">
                      <td className="px-5 py-2.5 font-medium text-white">{p.stay_date}</td>
                      <td className="px-4 py-2.5 text-slate-400">{p.day_of_week.slice(0, 3)}</td>
                      <td className="px-4 py-2.5">
                        <span className="px-1.5 py-0.5 rounded text-[10px] bg-navy-800 text-teal-300 border border-slate-700">
                          {p.room_category}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-400">{p.lead_time}d</td>
                      <td className="px-4 py-2.5 text-sky-400 font-semibold">{p.otb_rooms}</td>
                      <td className="px-4 py-2.5 text-accent-teal font-bold">{p.predicted_occupied_rooms}</td>
                      <td className="px-4 py-2.5 text-slate-400">{p.capacity}</td>
                      <td className="px-4 py-2.5 text-white font-semibold">{p.predicted_occupancy_rate}%</td>
                      <td className="px-4 py-2.5 text-slate-400 text-[11px]">
                        [{p.uncertainty_80_lower} – {p.uncertainty_80_upper}]
                      </td>
                      <td className="px-4 py-2.5">
                        {isPressure ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950 text-accent-rose border border-rose-800/40">
                            Capacity Pressure
                          </span>
                        ) : isLow ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950 text-accent-amber border border-amber-800/40">
                            Low Demand
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-accent-emerald border border-emerald-800/40">
                            Normal
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
