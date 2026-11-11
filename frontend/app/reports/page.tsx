"use client";

import React, { useState } from "react";
import Navbar from "@/components/Navbar";
import {
  FileSpreadsheet,
  Download,
  FileText,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles
} from "lucide-react";

export default function ReportsPage() {
  const [horizon, setHorizon] = useState<number>(14);
  const [category, setCategory] = useState<string>("ALL");

  const downloadForecastCSV = () => {
    window.open(
      `http://127.0.0.1:8000/api/reports/export/forecast?horizon_days=${horizon}&room_category=${category}`,
      "_blank"
    );
  };

  const downloadOperationsCSV = () => {
    window.open(
      `http://127.0.0.1:8000/api/reports/export/operations?horizon_days=${horizon}`,
      "_blank"
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-navy-950">
      <Navbar
        title="Reports & Data Export Center"
        subtitle="Export high-resolution demand forecasts, operations rosters, and model audit records"
        cutoffDate="2024-08-17"
      />

      <main className="p-8 space-y-6 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Forecast CSV Report */}
          <div className="bg-navy-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between stat-card-glow">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="p-2.5 rounded-lg bg-teal-950 text-accent-teal border border-teal-800/40">
                  <FileSpreadsheet className="w-5 h-5" />
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-navy-850 text-slate-400 border border-slate-700">
                  CSV Export
                </span>
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Demand Forecast & Uncertainty Export
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Includes date-wise predicted room nights, OTB confirmed counts, 80% and 95% uncertainty intervals, physical capacity constraints, and operational risk status.
              </p>

              <div className="grid grid-cols-2 gap-3 mt-4 text-xs">
                <div>
                  <label className="text-slate-400 block mb-1">Horizon:</label>
                  <select
                    value={horizon}
                    onChange={(e) => setHorizon(parseInt(e.target.value))}
                    className="w-full bg-navy-950 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs outline-none"
                  >
                    <option value={7}>7-Day Outlook</option>
                    <option value={14}>14-Day Horizon</option>
                  </select>
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">Category:</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-navy-950 border border-slate-700 rounded-lg p-2 text-white font-mono text-xs outline-none"
                  >
                    <option value="ALL">All Categories (140 Keys)</option>
                    <option value="STD">Standard (70 Keys)</option>
                    <option value="DLX">Deluxe (40 Keys)</option>
                    <option value="SUI">Suites (20 Keys)</option>
                    <option value="EXE">Executive (10 Keys)</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={downloadForecastCSV}
              className="mt-6 w-full py-2.5 rounded-lg bg-accent-teal hover:bg-teal-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-teal-900/30"
            >
              <Download className="w-4 h-4" /> Download Forecast CSV
            </button>
          </div>

          {/* Card 2: Operations Roster CSV */}
          <div className="bg-navy-900 border border-slate-800 rounded-xl p-6 flex flex-col justify-between stat-card-glow">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="p-2.5 rounded-lg bg-emerald-950 text-accent-emerald border border-emerald-800/40">
                  <Sparkles className="w-5 h-5" />
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-navy-850 text-slate-400 border border-slate-700">
                  CSV Export
                </span>
              </div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Operations & Frontline Staffing Plan
              </h3>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                Translates forecast occupied room nights into clean minutes, turnover cleans, stayover cleans, recommended housekeepers FTE, and front desk check-in staffing.
              </p>

              <div className="mt-4 p-3 rounded-lg bg-navy-850 border border-slate-800 text-xs text-slate-400">
                <p><strong>Standards:</strong> 30m STD departure, 45m Suite departure, 15m stayover, 7.5 hr productive shift.</p>
              </div>
            </div>

            <button
              onClick={downloadOperationsCSV}
              className="mt-6 w-full py-2.5 rounded-lg bg-navy-800 hover:bg-navy-700 border border-slate-700 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Download className="w-4 h-4 text-accent-emerald" /> Download Operations Roster CSV
            </button>
          </div>
        </div>

        {/* Technical Documentation Downloads */}
        <div className="bg-navy-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-base font-semibold text-white tracking-tight mb-2">
            Assessment & Technical Artifact Downloads
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Direct access to generated technical specifications and model performance documentation.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="http://127.0.0.1:8000/api/models/metrics"
              target="_blank"
              rel="noreferrer"
              className="p-4 rounded-lg bg-navy-850 border border-slate-800 hover:border-slate-700 transition-colors block text-xs"
            >
              <span className="font-semibold text-white block">Model Benchmark Metrics (JSON)</span>
              <span className="text-[11px] text-slate-400 mt-1 block">Full evaluation results for Naive, Ridge, and XGBoost</span>
            </a>

            <a
              href="http://127.0.0.1:8000/api/models/explain"
              target="_blank"
              rel="noreferrer"
              className="p-4 rounded-lg bg-navy-850 border border-slate-800 hover:border-slate-700 transition-colors block text-xs"
            >
              <span className="font-semibold text-white block">TreeSHAP Explainability (JSON)</span>
              <span className="text-[11px] text-slate-400 mt-1 block">Feature importances and mean absolute SHAP impacts</span>
            </a>

            <a
              href="http://127.0.0.1:8000/api/datasets/summary"
              target="_blank"
              rel="noreferrer"
              className="p-4 rounded-lg bg-navy-850 border border-slate-800 hover:border-slate-700 transition-colors block text-xs"
            >
              <span className="font-semibold text-white block">Data Observatory Audits (JSON)</span>
              <span className="text-[11px] text-slate-400 mt-1 block">Integrity checks, date coverage, and missing value scorecard</span>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
