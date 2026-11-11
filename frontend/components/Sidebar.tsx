"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  History,
  Compass,
  Cpu,
  Sliders,
  Sparkles,
  Database,
  FileSpreadsheet,
  Settings,
  Hotel
} from "lucide-react";

const NAVIGATION = [
  { name: "Command Center", href: "/", icon: LayoutDashboard },
  { name: "Demand Forecast", href: "/forecast", icon: TrendingUp },
  { name: "Historical Replay", href: "/replay", icon: History, badge: "Novel" },
  { name: "Booking Intelligence", href: "/intelligence", icon: Compass },
  { name: "Model Lab", href: "/models", icon: Cpu },
  { name: "Scenario Studio", href: "/scenarios", icon: Sliders },
  { name: "Operations Planner", href: "/operations", icon: Sparkles },
  { name: "Data Observatory", href: "/observatory", icon: Database },
  { name: "Reports", href: "/reports", icon: FileSpreadsheet },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-navy-900 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0 z-40">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-accent-teal to-accent-emerald flex items-center justify-center shadow-lg shadow-teal-900/30">
          <Hotel className="w-5 h-5 text-slate-950 font-bold" />
        </div>
        <div>
          <span className="font-bold text-base tracking-tight text-white block">
            StayWise<span className="text-accent-teal">.AI</span>
          </span>
          <span className="text-[10px] text-slate-400 font-medium tracking-wider uppercase block">
            Enterprise RMS
          </span>
        </div>
      </div>

      {/* Property Selector Card */}
      <div className="p-3 mx-3 my-3 rounded-lg bg-navy-850 border border-slate-800">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-medium">Active Property</span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-accent-emerald border border-emerald-800/40">
            Live
          </span>
        </div>
        <p className="text-sm font-semibold text-slate-200 mt-1 truncate">
          Grand Azure Resort
        </p>
        <p className="text-[11px] text-slate-400">140 Keys · Monterey Bay</p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto pt-1">
        {NAVIGATION.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? "bg-navy-700 text-white font-semibold border-l-2 border-accent-teal shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-navy-850"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? "text-accent-teal" : "text-slate-400"
                  }`}
                />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold tracking-wider uppercase bg-teal-950 text-accent-teal border border-teal-800/50">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-slate-400 text-[11px]">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Model Engine</span>
          <span className="font-mono text-xs text-accent-teal">XGBoost v1.0</span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-slate-400">Snapshot Cutoff</span>
          <span className="font-mono text-[10px] text-slate-300">2024-08-17</span>
        </div>
      </div>
    </aside>
  );
}
