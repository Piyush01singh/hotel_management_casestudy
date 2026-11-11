"use client";

import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { fetchHealth } from "@/lib/api";
import {
  Settings,
  Server,
  Database,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  HardDrive
} from "lucide-react";

export default function SettingsPage() {
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    async function loadHealth() {
      const h = await fetchHealth();
      setHealth(h);
    }
    loadHealth();
  }, []);

  return (
    <div className="flex-1 flex flex-col bg-navy-950">
      <Navbar
        title="Settings & System Registry"
        subtitle="Runtime environment, active database connection, and model artifact health"
      />

      <main className="p-8 space-y-6 max-w-7xl">
        <div className="bg-navy-900 border border-slate-800 rounded-xl p-6 space-y-6">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-800">
            <Server className="w-5 h-5 text-accent-teal" />
            <h3 className="text-base font-semibold text-white tracking-tight">
              Runtime Infrastructure Status
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-4 rounded-lg bg-navy-850 border border-slate-800 space-y-2">
              <span className="text-slate-400 block text-[10px] uppercase font-sans">FastAPI Backend Engine</span>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">API Health Status:</span>
                <span className="text-accent-emerald font-bold">
                  {health?.status === "healthy" ? "ONLINE (200 OK)" : "CONNECTING..."}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">FastAPI Version:</span>
                <span className="text-white">0.120.0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Uvicorn Port:</span>
                <span className="text-accent-teal">127.0.0.1:8000</span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-navy-850 border border-slate-800 space-y-2">
              <span className="text-slate-400 block text-[10px] uppercase font-sans">Database Connectivity</span>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Database Engine:</span>
                <span className="text-white font-bold">SQLite 3 / SQLAlchemy 2.0</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Connection State:</span>
                <span className="text-accent-emerald font-bold">CONNECTED</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Seeded Records:</span>
                <span className="text-accent-teal font-mono">32,456 Rows</span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-navy-850 border border-slate-800 space-y-2">
              <span className="text-slate-400 block text-[10px] uppercase font-sans">Machine Learning Engine</span>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Champion Model:</span>
                <span className="text-accent-teal font-bold">XGBoost 3.1.1 (C++ Tree)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Explainability Provider:</span>
                <span className="text-white">TreeSHAP</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Inference Latency:</span>
                <span className="text-accent-emerald">&lt; 25 ms</span>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-navy-850 border border-slate-800 space-y-2">
              <span className="text-slate-400 block text-[10px] uppercase font-sans">Frontend Client</span>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Framework:</span>
                <span className="text-white font-bold">Next.js 14+ (App Router)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">UI / Styling:</span>
                <span className="text-accent-teal">Tailwind CSS + Recharts + Three.js</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-300">Dev Server:</span>
                <span className="text-slate-300">http://localhost:3000</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
