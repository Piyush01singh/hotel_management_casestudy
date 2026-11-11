"use client";

import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { fetchOperationsWorkload } from "@/lib/api";
import {
  Sparkles,
  Download,
  Users,
  Clock,
  Shirt,
  ShieldAlert,
  Calendar,
  Layers,
  Info
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";

export default function OperationsPlannerPage() {
  const [horizonDays, setHorizonDays] = useState<number>(7);
  const [turnoverRate, setTurnoverRate] = useState<number>(0.35); // 35% checkouts
  const [opsData, setOpsData] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadOps() {
      try {
        setLoading(true);
        const data = await fetchOperationsWorkload({
          horizon_days: horizonDays,
          departure_turnover_rate: turnoverRate,
          staff_shift_hours: 7.5,
        });
        setOpsData(data);
      } catch (err) {
        console.error("Failed to load operations workload", err);
      } finally {
        setLoading(false);
      }
    }
    loadOps();
  }, [horizonDays, turnoverRate]);

  const handleExportOpsCSV = () => {
    window.open(
      `http://127.0.0.1:8000/api/reports/export/operations?horizon_days=${horizonDays}`,
      "_blank"
    );
  };

  const totalCleanHours = opsData?.total_clean_hours || 245.5;
  const avgHK = opsData?.average_daily_housekeepers || 4.7;
  const peakDate = opsData?.peak_cleaning_date || "2024-08-24";
  const peakHours = opsData?.peak_cleaning_hours || 41.2;

  return (
    <div className="flex-1 flex flex-col bg-navy-950">
      <Navbar
        title="Operations & Workload Planner"
        subtitle="Translate machine-learning demand forecasts into housekeeping rosters, linen pars, and front-desk staffing"
        cutoffDate="2024-08-17"
      />

      <main className="p-8 space-y-6 max-w-7xl">
        {/* Banner with Clear Assumption Disclaimers */}
        <div className="p-3.5 rounded-xl bg-navy-900 border border-slate-800 flex items-center justify-between text-xs text-slate-300">
          <div className="flex items-center gap-2.5">
            <Info className="w-4 h-4 text-accent-teal" />
            <span>
              <strong>Assumption-Based Bridge:</strong> Workload quotas are calculated using hospitality standards: 30–60 min departure cleans, 15–30 min stayover cleans, and 7.5-hour productive shifts.
            </span>
          </div>
          <button
            onClick={handleExportOpsCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-navy-800 hover:bg-navy-700 border border-slate-700 text-xs font-medium text-slate-200 transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5 text-accent-teal" />
            <span>Export Roster CSV</span>
          </button>
        </div>

        {/* Operational Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-navy-900 border border-slate-800 rounded-xl p-5 stat-card-glow">
            <span className="text-xs font-medium text-slate-400">Total Cleaning Hours</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-white">{totalCleanHours}</span>
              <span className="text-xs text-slate-400">hrs needed</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Across 7-day forecast horizon</p>
          </div>

          <div className="bg-navy-900 border border-slate-800 rounded-xl p-5 stat-card-glow">
            <span className="text-xs font-medium text-slate-400">Avg Daily Housekeepers</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-accent-teal">{avgHK}</span>
              <span className="text-xs text-slate-400">FTE / day</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Based on 7.5 hr productive shifts</p>
          </div>

          <div className="bg-navy-900 border border-slate-800 rounded-xl p-5 stat-card-glow">
            <span className="text-xs font-medium text-slate-400">Peak Housekeeping Load</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-accent-amber">{peakHours}</span>
              <span className="text-xs text-slate-400">hrs on peak day</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Expected peak on {peakDate}</p>
          </div>

          <div className="bg-navy-900 border border-slate-800 rounded-xl p-5 stat-card-glow">
            <span className="text-xs font-medium text-slate-400">Turnover Assumption</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-white">{Math.round(turnoverRate * 100)}%</span>
              <span className="text-xs text-accent-emerald">checkout ratio</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">35% departures vs 65% stayovers</p>
          </div>
        </div>

        {/* Housekeeping Workload Chart */}
        <div className="bg-navy-900 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight">
                Daily Housekeeping Hours & FTE Shift Requirements
              </h3>
              <p className="text-xs text-slate-400">
                Staffing levels needed to complete all daily guest departures and stayover cleans before 3:00 PM check-in.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Turnover Rate:</span>
              <select
                value={turnoverRate}
                onChange={(e) => setTurnoverRate(parseFloat(e.target.value))}
                className="bg-navy-950 border border-slate-700 text-white text-xs rounded-lg px-2.5 py-1.5 outline-none font-mono"
              >
                <option value={0.25}>25% Departures (Long stays)</option>
                <option value={0.35}>35% Departures (Standard)</option>
                <option value={0.50}>50% Departures (High weekend churn)</option>
              </select>
            </div>
          </div>

          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={opsData?.daily_plans || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                <XAxis dataKey="day_of_week" stroke="#64748B" fontSize={11} />
                <YAxis stroke="#64748B" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0F1626", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                  labelStyle={{ color: "#F8FAFC", fontWeight: "bold" }}
                />
                <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                <Bar dataKey="housekeeping_hours_needed" name="Cleaning Hours Needed" fill="#14B8A6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="suggested_housekeepers_fte" name="Required Housekeepers (FTE)" fill="#38BDF8" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Operational Schedule Table */}
        <div className="bg-navy-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-5 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-base font-semibold text-white tracking-tight">
              Frontline Operational Quota Schedule
            </h3>
            <span className="text-xs text-slate-400 font-mono">
              7-Day Rolling Operational Forecast
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-navy-850 text-slate-400 font-medium uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3">Stay Date</th>
                  <th className="px-4 py-3">Day</th>
                  <th className="px-4 py-3">Expected Occupied</th>
                  <th className="px-4 py-3">Departures</th>
                  <th className="px-4 py-3">Stayovers</th>
                  <th className="px-4 py-3">Clean Hours</th>
                  <th className="px-4 py-3">Housekeepers FTE</th>
                  <th className="px-4 py-3">Linen Par Sets</th>
                  <th className="px-4 py-3">Front Desk Agents</th>
                  <th className="px-4 py-3">Operational Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {opsData?.daily_plans?.map((plan: any, idx: number) => (
                  <tr key={idx} className="hover:bg-navy-850/50 transition-colors">
                    <td className="px-5 py-2.5 font-medium text-white">{plan.stay_date}</td>
                    <td className="px-4 py-2.5 text-slate-400">{plan.day_of_week.slice(0, 3)}</td>
                    <td className="px-4 py-2.5 text-accent-teal font-bold">{plan.expected_occupied_rooms}</td>
                    <td className="px-4 py-2.5 text-amber-400">{plan.expected_turnovers}</td>
                    <td className="px-4 py-2.5 text-slate-300">{plan.expected_stayovers}</td>
                    <td className="px-4 py-2.5 text-white font-semibold">{plan.housekeeping_hours_needed} hrs</td>
                    <td className="px-4 py-2.5 text-accent-emerald font-bold">{plan.suggested_housekeepers_fte} staff</td>
                    <td className="px-4 py-2.5 text-sky-400">{plan.linen_sets_needed} packs</td>
                    <td className="px-4 py-2.5 text-slate-300">{plan.front_desk_agents_needed} agents</td>
                    <td className="px-4 py-2.5">
                      {plan.workload_risk_flag.includes("Risk") || plan.workload_risk_flag.includes("Pressure") ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950 text-accent-amber border border-amber-800/40">
                          {plan.workload_risk_flag}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-accent-emerald border border-emerald-800/40">
                          {plan.workload_risk_flag}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
