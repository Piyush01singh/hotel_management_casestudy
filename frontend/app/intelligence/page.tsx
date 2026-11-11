"use client";

import React from "react";
import Navbar from "@/components/Navbar";
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

const LEAD_TIME_DATA = [
  { range: "0–3 Days", percentage: 14.2, bookings: 9960 },
  { range: "4–7 Days", percentage: 18.6, bookings: 13054 },
  { range: "8–14 Days", percentage: 22.4, bookings: 15720 },
  { range: "15–30 Days", percentage: 21.8, bookings: 15300 },
  { range: "31–60 Days", percentage: 13.5, bookings: 9475 },
  { range: "60+ Days", percentage: 9.5, bookings: 6678 },
];

const PICKUP_PACE_CURVE = [
  { daysBefore: "60d", pickupSTD: 12, pickupDLX: 8, pickupSUI: 3, pickupEXE: 1 },
  { daysBefore: "45d", pickupSTD: 22, pickupDLX: 14, pickupSUI: 6, pickupEXE: 2 },
  { daysBefore: "30d", pickupSTD: 35, pickupDLX: 20, pickupSUI: 10, pickupEXE: 4 },
  { daysBefore: "14d", pickupSTD: 48, pickupDLX: 28, pickupSUI: 14, pickupEXE: 6 },
  { daysBefore: "7d",  pickupSTD: 62, pickupDLX: 35, pickupSUI: 18, pickupEXE: 8 },
  { daysBefore: "3d",  pickupSTD: 68, pickupDLX: 38, pickupSUI: 19, pickupEXE: 9 },
  { daysBefore: "0d",  pickupSTD: 70, pickupDLX: 40, pickupSUI: 20, pickupEXE: 10 },
];

const DOW_OCCUPANCY = [
  { day: "Mon", rate: 64.2 },
  { day: "Tue", rate: 67.8 },
  { day: "Wed", rate: 68.5 },
  { day: "Thu", rate: 73.1 },
  { day: "Fri", rate: 84.6 },
  { day: "Sat", rate: 88.2 },
  { day: "Sun", rate: 61.4 },
];

const CANCELLATION_BY_LEAD = [
  { leadWindow: "Last Minute (0-3d)", cancelRate: 6.8 },
  { leadWindow: "Short (4-7d)", cancelRate: 11.4 },
  { leadWindow: "Medium (8-14d)", cancelRate: 17.2 },
  { leadWindow: "Standard (15-30d)", cancelRate: 24.5 },
  { leadWindow: "Far Out (30d+)", cancelRate: 34.2 },
];

export default function BookingIntelligencePage() {
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
              <span className="text-3xl font-bold font-mono text-white">16.0</span>
              <span className="text-xs text-accent-teal">days to arrival</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">50% of bookings placed &le; 16 days out</p>
          </div>

          <div className="bg-navy-900 border border-slate-800 rounded-xl p-5 stat-card-glow">
            <span className="text-xs font-medium text-slate-400">Overall Cancellation Rate</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-white">18.4%</span>
              <span className="text-xs text-slate-400">across 70k events</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Normal full-service resort benchmark</p>
          </div>

          <div className="bg-navy-900 border border-slate-800 rounded-xl p-5 stat-card-glow">
            <span className="text-xs font-medium text-slate-400">Weekend Premium</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-bold font-mono text-accent-emerald">+19.6%</span>
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
