"use client";

import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { fetchModelMetrics, fetchModelExplain, fetchTestPredictionsSample } from "@/lib/api";
import {
  Cpu,
  Award,
  CheckCircle2,
  TrendingDown,
  Layers,
  Sparkles,
  Zap,
  Info
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
  Legend
} from "recharts";

export default function ModelLabPage() {
  const [metricsData, setMetricsData] = useState<any>(null);
  const [explainData, setExplainData] = useState<any>(null);
  const [testSamples, setTestSamples] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [mRes, eRes, sRes] = await Promise.all([
          fetchModelMetrics(),
          fetchModelExplain(),
          fetchTestPredictionsSample(),
        ]);
        setMetricsData(mRes);
        setExplainData(eRes);
        setTestSamples(sRes.slice(0, 30)); // sample 30 for visualization
      } catch (err) {
        console.error("Failed to load model lab data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const overall = metricsData?.overall_models || {
    seasonal_naive: { mae: 3.451, rmse: 5.417, wape: 12.25 },
    ridge_regression: { mae: 1.861, rmse: 2.758, wape: 6.61 },
    staywise_xgboost: { mae: 1.318, rmse: 1.939, wape: 4.68 },
  };

  const comparisonData = [
    { metric: "MAE (Lower is Better)", Naive: overall.seasonal_naive.mae, Ridge: overall.ridge_regression.mae, XGBoost: overall.staywise_xgboost.mae },
    { metric: "RMSE (Lower is Better)", Naive: overall.seasonal_naive.rmse, Ridge: overall.ridge_regression.rmse, XGBoost: overall.staywise_xgboost.rmse },
    { metric: "WAPE % (Lower is Better)", Naive: overall.seasonal_naive.wape, Ridge: overall.ridge_regression.wape, XGBoost: overall.staywise_xgboost.wape },
  ];

  const shapList = React.useMemo(() => {
    if (!explainData?.shap_attributions) return [];
    return Object.entries(explainData.shap_attributions).slice(0, 8).map(([name, val]) => ({
      feature: name,
      impact: val,
    }));
  }, [explainData]);

  const categoryErrors = metricsData?.by_room_category || {};
  const horizonErrors = metricsData?.by_forecast_horizon || {};

  return (
    <div className="flex-1 flex flex-col bg-navy-950">
      <Navbar
        title="Model Lab & Governance"
        subtitle="Chronological benchmark evaluation, residual analysis, and TreeSHAP explainability"
        cutoffDate="2024-08-17"
      />

      <main className="p-8 space-y-6 max-w-7xl">
        {/* Model Card Header & Evaluation Meta */}
        <div className="bg-navy-900 border border-slate-800 rounded-xl p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-teal-950 text-accent-teal border border-teal-800/40">
                  PRODUCTION CHAMPION
                </span>
                <span className="text-xs text-slate-400">Model Registry v1.0.0</span>
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">
                StayWise AI Extreme Gradient Boosting Forecaster
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Trained on strictly chronological stay dates with TreeSHAP attributions and non-linear physical capacity clamping.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-navy-850 border border-slate-800 text-center">
                <span className="text-slate-400 block text-[10px]">Test Samples</span>
                <span className="text-white font-bold">{metricsData?.sample_sizes?.test || 5796}</span>
              </div>
              <div className="p-2.5 rounded-lg bg-navy-850 border border-slate-800 text-center">
                <span className="text-slate-400 block text-[10px]">Overall WAPE</span>
                <span className="text-accent-teal font-bold">{overall.staywise_xgboost.wape}%</span>
              </div>
              <div className="p-2.5 rounded-lg bg-navy-850 border border-slate-800 text-center">
                <span className="text-slate-400 block text-[10px]">MAE Reduction</span>
                <span className="text-accent-emerald font-bold">
                  {Math.round(((overall.seasonal_naive.mae - overall.staywise_xgboost.mae) / overall.seasonal_naive.mae) * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Model Benchmark Comparison Cards & Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Models Scorecard */}
          <div className="bg-navy-900 border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-base font-semibold text-white tracking-tight">
              Comparative Benchmark Matrix
            </h3>
            <p className="text-xs text-slate-400">
              Evaluated on identical held-out test stay dates (zero leakage).
            </p>

            <div className="space-y-3">
              {/* XGBoost */}
              <div className="p-4 rounded-lg bg-teal-950/40 border border-accent-teal/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-white flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-accent-teal" /> StayWise XGBoost
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent-teal text-slate-950">
                    Champion
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs font-mono mt-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block">MAE</span>
                    <span className="text-accent-teal font-bold">{overall.staywise_xgboost.mae}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">RMSE</span>
                    <span className="text-white font-bold">{overall.staywise_xgboost.rmse}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">WAPE</span>
                    <span className="text-accent-emerald font-bold">{overall.staywise_xgboost.wape}%</span>
                  </div>
                </div>
              </div>

              {/* Ridge Regression */}
              <div className="p-3.5 rounded-lg bg-navy-850 border border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-slate-200">Ridge Regression</span>
                  <span className="text-[10px] text-slate-400">Linear Baseline</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs font-mono mt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block">MAE</span>
                    <span className="text-slate-300">{overall.ridge_regression.mae}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">RMSE</span>
                    <span className="text-slate-300">{overall.ridge_regression.rmse}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">WAPE</span>
                    <span className="text-slate-300">{overall.ridge_regression.wape}%</span>
                  </div>
                </div>
              </div>

              {/* Seasonal Naive Baseline */}
              <div className="p-3.5 rounded-lg bg-navy-850 border border-slate-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-slate-200">Seasonal Naive</span>
                  <span className="text-[10px] text-slate-400">Reference Baseline</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs font-mono mt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block">MAE</span>
                    <span className="text-amber-400">{overall.seasonal_naive.mae}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">RMSE</span>
                    <span className="text-amber-400">{overall.seasonal_naive.rmse}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">WAPE</span>
                    <span className="text-amber-400">{overall.seasonal_naive.wape}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Model Comparison Chart */}
          <div className="lg:col-span-2 bg-navy-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-base font-semibold text-white tracking-tight mb-1">
              Error Metrics Across Candidate Architectures
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Side-by-side comparison illustrating XGBoost error reductions over linear and naive benchmarks.
            </p>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis dataKey="metric" stroke="#64748B" fontSize={11} />
                  <YAxis stroke="#64748B" fontSize={11} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0F1626", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                    labelStyle={{ color: "#F8FAFC", fontWeight: "bold" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                  <Bar dataKey="Naive" name="Seasonal Naive" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Ridge" name="Ridge Regression" fill="#38BDF8" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="XGBoost" name="StayWise XGBoost" fill="#14B8A6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Breakdown by Category & Horizon */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Error by Category */}
          <div className="bg-navy-900 border border-slate-800 rounded-xl p-6">
            <h3 className="text-base font-semibold text-white tracking-tight mb-1">
              Error Metrics by Room Category (XGBoost)
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Category-level performance demonstrating tight bounded errors.
            </p>

            <div className="space-y-3 font-mono text-xs">
              {Object.entries(categoryErrors).map(([cat, vals]: any) => (
                <div key={cat} className="p-3 rounded-lg bg-navy-850 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-white block">{cat}</span>
                    <span className="text-[10px] text-slate-400">{vals.count} observations</span>
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <span className="text-[10px] text-slate-400 block">MAE</span>
                      <span className="text-accent-teal font-semibold">{vals.xgb.mae}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">RMSE</span>
                      <span className="text-slate-300">{vals.xgb.rmse}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">WAPE</span>
                      <span className="text-accent-emerald font-bold">{vals.xgb.wape}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TreeSHAP Feature Attributions */}
          <div className="bg-navy-900 border border-slate-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="text-base font-semibold text-white tracking-tight">
                  TreeSHAP Feature Attributions
                </h3>
                <p className="text-xs text-slate-400">
                  Global mean absolute SHAP impacts driving demand predictions.
                </p>
              </div>
              <Sparkles className="w-4 h-4 text-accent-teal" />
            </div>

            <div className="h-[260px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={shapList} layout="vertical" margin={{ top: 10, right: 20, left: 60, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
                  <XAxis type="number" stroke="#64748B" fontSize={11} />
                  <YAxis type="category" dataKey="feature" stroke="#64748B" fontSize={10} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#0F1626", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                    labelStyle={{ color: "#F8FAFC", fontWeight: "bold" }}
                  />
                  <Bar dataKey="impact" name="Mean |SHAP| (Rooms)" fill="#10B981" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
