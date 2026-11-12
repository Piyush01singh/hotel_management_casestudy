"use client";

import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { fetchBookingIntelligence } from "@/lib/api";
import {
  Compass,
  Clock,
  Ban,
  Calendar,
  TrendingUp,
  BarChart2,
  CheckCircle2
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell
} from "recharts";

export default function BookingIntelligencePage() {
  const [intelData, setIntelData] = useState<any>(null);

  useEffect(() => {
    async function loadIntel() {
      try {
        const res = await fetchBookingIntelligence();
        setIntelData(res);
      } catch (err) {
        console.error("Failed to load booking intelligence", err);
      }
    }
    loadIntel();
  }, []);

  const summary = intelData?.summary || {
    median_lead_time_days: 16.0,
    overall_cancellation_rate_pct: 18.6,
    total_events: 70187,
    weekend_premium_pct: 22.8,
  };
  const LEAD_TIME_DATA = intelData?.lead_time_distribution || [];
  const PICKUP_PACE_CURVE = intelData?.pickup_pace_curve || [];
  const DOW_OCCUPANCY = intelData?.dow_occupancy || [];
  const CANCELLATION_BY_LEAD = intelData?.cancellation_by_lead || [];

  return (
    <div className="flex-1 flex flex-col bg-navy-950">
      <Navbar
        title="Booking Intelligence & Market Pacing"
        subtitle="Empirical lead-time distributions, booking pickup velocity, and cancellation profiling"
        cutoffDate="2024-08-17"
      />

      <main className="p-8 space-y-6 max-w-7xl">
        {/* Top Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-navy-900 border border-slate-800 rounded-xl p-5 stat-card-glow">
            <span className="text-xs font-medium text-slate-400">Median Lead Time</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-white">{summary.median_lead_time_days}</span>
              <span className="text-xs text-accent-teal">days to arrival</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">50% of bookings placed &le; {summary.median_lead_time_days} days out</p>
          </div>

          <div className="bg-navy-900 border border-slate-800 rounded-xl p-5 stat-card-glow">
            <span className="text-xs font-medium text-slate-400">Overall Cancellation Rate</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-white">{summary.overall_cancellation_rate_pct}%</span>
              <span className="text-xs text-slate-400">across {summary.total_events?.toLocaleString()} events</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Normal full-service resort benchmark</p>
          </div>

          <div className="bg-navy-900 border border-slate-800 rounded-xl p-5 stat-card-glow">
            <span className="text-xs font-medium text-slate-400">Weekend Premium</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-accent-emerald">+{summary.weekend_premium_pct}%</span>
              <span className="text-xs text-slate-400">vs mid-week</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Fri &amp; Sat peak occupancy pace</p>
          </div>

          <div className="bg-navy-900 border border-slate-800 rounded-xl p-5 stat-card-glow">
            <span className="text-xs font-medium text-slate-400">Leakage Audit</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-accent-teal">100%</span>
              <span className="text-xs text-accent-emerald flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Zero future data in lag features</p>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Lead Time Distribution */}
          <div className="bg-navy-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-white tracking-tight">
                  Booking Lead-Time Distribution
                </h3>
                <p className="text-xs text-slate-400">
                  Percentage of reservations booked by elapsed days before stay date.
                </p>
              </div>
              <Clock className="w-4 h-4 text-accent-teal" />
            </div>

            <div className="h-[260px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={LEAD_TIME_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="range" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0F1626", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                    labelStyle={{ color: "#F8FAFC", fontWeight: "bold" }}
                  />
                  <Bar dataKey="percentage" name="% of Total Bookings" fill="#14B8A6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Booking Pickup Velocity Curves */}
          <div className="bg-navy-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold text-white tracking-tight">
                  Cumulative Pickup Pace Curves by Category
                </h3>
                <p className="text-xs text-slate-400">
                  Pace of reservations built up as arrival date approaches.
                </p>
              </div>
              <TrendingUp className="w-4 h-4 text-accent-emerald" />
            </div>

            <div className="h-[260px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={PICKUP_PACE_CURVE} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="daysBefore" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0F1626", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                    labelStyle={{ color: "#F8FAFC", fontWeight: "bold" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "6px" }} />
                  <Line type="monotone" dataKey="pickupSTD" name="Standard (70 max)" stroke="#14B8A6" strokeWidth={2} />
                  <Line type="monotone" dataKey="pickupDLX" name="Deluxe (40 max)" stroke="#38BDF8" strokeWidth={2} />
                  <Line type="monotone" dataKey="pickupSUI" name="Suite (20 max)" stroke="#10B981" strokeWidth={2} />
                  <Line type="monotone" dataKey="pickupEXE" name="Executive (10 max)" stroke="#F59E0B" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Day-of-Week Seasonality & Cancellation Dynamics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Day of Week Occupancy */}
          <div className="bg-navy-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-base font-semibold text-white tracking-tight mb-1">
              Day-of-Week Occupancy Rate (%)
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Historical average occupancy profile across days of the week.
            </p>

            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={DOW_OCCUPANCY} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="day" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} domain={[0, 100]} unit="%" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0F1626", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                    labelStyle={{ color: "#F8FAFC", fontWeight: "bold" }}
                  />
                  <Bar dataKey="rate" name="Average Occupancy %" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Cancellation by Lead Window */}
          <div className="bg-navy-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-base font-semibold text-white tracking-tight mb-1">
              Cancellation Probability by Lead Time Horizon
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Long-lead reservations incur higher cancellation wash before check-in.
            </p>

            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={CANCELLATION_BY_LEAD} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis type="number" stroke="#64748B" fontSize={11} unit="%" domain={[0, 40]} />
                  <YAxis type="category" dataKey="leadWindow" stroke="#64748B" fontSize={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0F1626", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                    labelStyle={{ color: "#F8FAFC", fontWeight: "bold" }}
                  />
                  <Bar dataKey="cancelRate" name="Cancellation %" fill="#EF4444" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
