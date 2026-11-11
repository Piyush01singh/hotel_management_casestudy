"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { simulateScenario } from "@/lib/api";
import {
  Sliders,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Info
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";

export default function ScenarioStudioPage() {
  const [demandShiftPct, setDemandShiftPct] = useState<number>(15); // +15%
  const [cancelShiftPct, setCancelShiftPct] = useState<number>(-5); // -5%
  const [stdCapDelta, setStdCapDelta] = useState<number>(-5); // 5 rooms down for maintenance
  const [eventUplift, setEventUplift] = useState<boolean>(true);

  const [scenarioRes, setScenarioRes] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const runSimulation = async () => {
    try {
      setLoading(true);
      const res = await simulateScenario({
        horizon_days: 7,
        demand_factor: 1.0 + demandShiftPct / 100.0,
        cancellation_shift: cancelShiftPct / 100.0,
        capacity_delta_std: stdCapDelta,
        event_uplift_override: eventUplift ? 1.25 : 1.0,
      });
      setScenarioRes(res);
    } catch (err) {
      console.error("Simulation failed", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSimulation();
  }, [demandShiftPct, cancelShiftPct, stdCapDelta, eventUplift]);

  const resetDefaults = () => {
    setDemandShiftPct(0);
    setCancelShiftPct(0);
    setStdCapDelta(0);
    setEventUplift(false);
  };

  const deltaNights = scenarioRes?.room_night_delta || 0;
  const deltaPct = scenarioRes?.room_night_delta_pct || 0;
  const pressureDays = scenarioRes?.capacity_pressure_days || 0;

  return (
    <div className="flex-1 flex flex-col bg-navy-950">
      <Navbar
        title="Scenario Studio & What-If Sandbox"
        subtitle="Simulate market shocks, demand shifts, cancellation volatility, and maintenance closures"
        cutoffDate="2024-08-17"
      />

      <main className="p-8 space-y-6 max-w-7xl">
        {/* Assumption Notice Banner */}
        <div className="p-3.5 rounded-xl bg-navy-900 border border-amber-800/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5 text-slate-300">
            <Info className="w-4 h-4 text-accent-amber" />
            <span>
              <strong>Assumption-Based Sandbox:</strong> Scenario simulations apply hypothetical market multipliers on top of ML predictions without modifying the trained model weights.
            </span>
          </div>
          <button
            onClick={resetDefaults}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-navy-800 text-slate-300 hover:text-white border border-slate-700"
          >
            <RotateCcw className="w-3 h-3" /> Reset to Baseline
          </button>
        </div>

        {/* Interactive Controls & Scorecard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Controls Panel */}
          <div className="bg-navy-900 border border-slate-800 rounded-xl p-6 space-y-5">
            <h3 className="text-sm font-semibold text-white tracking-tight flex items-center gap-2">
              <Sliders className="w-4 h-4 text-accent-teal" /> Simulation Parameters
            </h3>

            {/* Slider 1: Demand Shift */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Demand Fluctuation</span>
                <span className="font-mono font-bold text-accent-teal">
                  {demandShiftPct > 0 ? `+${demandShiftPct}%` : `${demandShiftPct}%`}
                </span>
              </div>
              <input
                type="range"
                min="-30"
                max="30"
                step="5"
                value={demandShiftPct}
                onChange={(e) => setDemandShiftPct(parseInt(e.target.value))}
                className="w-full accent-accent-teal cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>-30% Slump</span>
                <span>Baseline (0%)</span>
                <span>+30% Surge</span>
              </div>
            </div>

            {/* Slider 2: Cancellation Rate Shift */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Cancellation Shift</span>
                <span className="font-mono font-bold text-amber-400">
                  {cancelShiftPct > 0 ? `+${cancelShiftPct}%` : `${cancelShiftPct}%`}
                </span>
              </div>
              <input
                type="range"
                min="-20"
                max="20"
                step="5"
                value={cancelShiftPct}
                onChange={(e) => setCancelShiftPct(parseInt(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>-20% Lower Wash</span>
                <span>0%</span>
                <span>+20% High Wash</span>
              </div>
            </div>

            {/* Slider 3: Capacity Adjustments */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Standard Rooms Maintenance</span>
                <span className="font-mono font-bold text-rose-400">
                  {stdCapDelta} Rooms
                </span>
              </div>
              <input
                type="range"
                min="-20"
                max="0"
                step="1"
                value={stdCapDelta}
                onChange={(e) => setStdCapDelta(parseInt(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>-20 Offline</span>
                <span>Full Inventory (70)</span>
              </div>
            </div>

            {/* Toggle: Event Uplift */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white block">Regional Event Uplift</span>
                <span className="text-[11px] text-slate-400">Car Week / Festival (+25%)</span>
              </div>
              <button
                onClick={() => setEventUplift(!eventUplift)}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  eventUplift ? "bg-accent-teal" : "bg-slate-700"
                }`}
              >
                <div
                  className={`bg-navy-950 w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    eventUplift ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Results Scorecard & Charts */}
          <div className="lg:col-span-2 bg-navy-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-semibold text-white tracking-tight">
                    Simulated Occupancy Impact vs. ML Baseline
                  </h3>
                  <p className="text-xs text-slate-400">
                    Comparing baseline model predictions against the simulated scenario parameters.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-300">Net Impact:</span>
                  <span
                    className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                      deltaNights >= 0
                        ? "bg-emerald-950 text-accent-emerald border border-emerald-800/40"
                        : "bg-rose-950 text-accent-rose border border-rose-800/40"
                    }`}
                  >
                    {deltaNights >= 0 ? `+${deltaNights}` : deltaNights} nights ({deltaPct}%)
                  </span>
                </div>
              </div>

              <div className="h-[280px] w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={scenarioRes?.daily_results || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                    <XAxis dataKey="day_of_week" stroke="#64748B" fontSize={11} />
                    <YAxis stroke="#64748B" fontSize={11} domain={[0, 140]} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#0F1626", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                      labelStyle={{ color: "#F8FAFC", fontWeight: "bold" }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    <Bar dataKey="baseline_predicted_rooms" name="Baseline Model Forecast" fill="#334155" radius={[4, 4, 0, 0]} />
                    <Line
                      type="monotone"
                      dataKey="scenario_predicted_rooms"
                      name="Simulated Scenario Demand"
                      stroke="#14B8A6"
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: "#14B8A6" }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-accent-amber" />
                <span>
                  High Pressure Alert Days: <strong className="text-white">{pressureDays} / 7 Days</strong>
                </span>
              </span>
              <span className="text-[11px] text-accent-teal">Dynamic Real-time Re-calculation</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
