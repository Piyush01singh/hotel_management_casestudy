"use client";

import React from "react";
import { ShieldCheck, Activity, Bell, Calendar } from "lucide-react";

interface NavbarProps {
  title: string;
  subtitle?: string;
  cutoffDate?: string;
}

export default function Navbar({ title, subtitle, cutoffDate }: NavbarProps) {
  return (
    <header className="h-16 bg-navy-900/90 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-8 sticky top-0 z-30">
      <div>
        <h1 className="text-lg font-bold text-white tracking-tight">{title}</h1>
        {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-4">
        {cutoffDate && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-navy-850 border border-slate-800 text-xs text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-accent-teal" />
            <span className="text-slate-400">Snapshot EOD:</span>
            <span className="font-mono font-medium text-white">{cutoffDate}</span>
          </div>
        )}

        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/40 text-[11px] font-medium text-accent-emerald">
          <Activity className="w-3.5 h-3.5 text-accent-emerald animate-pulse" />
          <span>Inference API Ready</span>
        </div>

        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-800/60 border border-slate-700/50 text-[11px] font-medium text-slate-300">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span>Zero Leakage Proof</span>
        </div>
      </div>
    </header>
  );
}
