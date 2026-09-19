"use client";
// ============================================================
// Nevark Technologies Pvt. Ltd.
// All rights reserved © 2026 Nevark Technologies.
// Unauthorized use, reproduction, or distribution of this
// code is strictly prohibited.
// Module  : CashFlowChart.tsx
// Author  : Development Team
// Created : 2026-09-09
// ============================================================

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface CashFlowPoint {
  month: string;
  inflow: number;
  outflow: number;
  net_cash: number;
  is_forecast: boolean;
}

interface CashFlowChartProps {
  data?: CashFlowPoint[];
  forecastAvailable?: boolean;
  loading?: boolean;
}

const FALLBACK_CASH: CashFlowPoint[] = [
  { month: "Jan", inflow: 0, outflow: 0, net_cash: 0, is_forecast: false },
  { month: "Feb", inflow: 0, outflow: 0, net_cash: 0, is_forecast: false },
  { month: "Mar", inflow: 0, outflow: 0, net_cash: 0, is_forecast: false },
  { month: "Apr", inflow: 0, outflow: 0, net_cash: 0, is_forecast: true },
  { month: "May", inflow: 0, outflow: 0, net_cash: 0, is_forecast: true },
  { month: "Jun", inflow: 0, outflow: 0, net_cash: 0, is_forecast: true },
];

function fmtK(v: number | string): string {
  const n = Number(v);
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}L`;
  if (n >= 1000)      return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

export function CashFlowChart({ data, forecastAvailable, loading }: CashFlowChartProps) {
  const chartData = (data ?? FALLBACK_CASH).map((d) => {
    const isF = d.is_forecast;
    return {
      ...d,
      month: d.month.split(" ")[0],
      inflow_actual: isF ? null : Number(d.inflow),
      outflow_actual: isF ? null : Number(d.outflow),
      net_cash_actual: isF ? null : Number(d.net_cash),
      inflow_forecast: isF ? Number(d.inflow) : null,
      outflow_forecast: isF ? Number(d.outflow) : null,
      net_cash_forecast: isF ? Number(d.net_cash) : null,
      // For tooltip totals if needed, though Recharts will pass the active payload
    };
  });

  // To connect the actual and forecast lines seamlessly, we can copy the last actual point to the first forecast point.
  // We'll find the last actual point.
  let lastActualIdx = -1;
  for (let i = 0; i < chartData.length; i++) {
    if (!chartData[i].is_forecast) {
      lastActualIdx = i;
    }
  }
  if (lastActualIdx >= 0 && lastActualIdx < chartData.length - 1) {
    const lastA = chartData[lastActualIdx];
    // Copy its actual values into its forecast values so the forecast line starts exactly where the actual line ends
    lastA.inflow_forecast = lastA.inflow_actual;
    lastA.outflow_forecast = lastA.outflow_actual;
    lastA.net_cash_forecast = lastA.net_cash_actual;
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full relative">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Cash Flow & Forecast</h3>
          <p className="text-sm text-gray-500">
            {loading ? "Loading..." : "3-month projection"}
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full bg-blue-500 inline-block" />Inflow
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full bg-red-400 inline-block" />Outflow
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full bg-emerald-500 inline-block" />Net Cash
          </span>
        </div>
      </div>
      
      {!loading && forecastAvailable === false && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[1px] rounded-2xl">
          <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-100 text-center max-w-sm">
            <p className="text-sm font-semibold text-gray-900">Insufficient Historical Data</p>
            <p className="text-xs text-gray-500 mt-1">Not enough completed months of activity to generate a reliable forecast.</p>
          </div>
        </div>
      )}

      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="cfIn" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}    />
            </linearGradient>
            <linearGradient id="cfOut" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#f87171" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#f87171" stopOpacity={0}    />
            </linearGradient>
            <linearGradient id="cfNet" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}    />
            </linearGradient>
          </defs>
          <XAxis 
            dataKey="month" 
            tick={{ fontSize: 12, fill: "#94a3b8" }}
            axisLine={false} 
            tickLine={false} 
          />
          <YAxis tickFormatter={fmtK} tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={60} />
          <Tooltip
            formatter={(v: unknown, name: unknown, props: { payload?: { is_forecast?: boolean } }) => {
              const isF = props.payload?.is_forecast;
              let label = String(name ?? "").replace('_actual', '').replace('_forecast', '').replace('_', ' ');
              label = label.replace(/\b\w/g, l => l.toUpperCase());
              return [fmtK(Number(v ?? 0)), isF ? `${label} (Proj)` : label];
            }}
            labelFormatter={(label, items) => {
                if (items && items.length > 0) {
                    const isF = items[0].payload.is_forecast;
                    return isF ? `${label} (Projected)` : label;
                }
                return label;
            }}
            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
          />
          {/* Actual lines */}
          <Area type="monotone" dataKey="inflow_actual"   stroke="#3b82f6" strokeWidth={2} fill="url(#cfIn)" connectNulls />
          <Area type="monotone" dataKey="outflow_actual"  stroke="#f87171" strokeWidth={2} fill="url(#cfOut)" connectNulls />
          <Area type="monotone" dataKey="net_cash_actual" stroke="#10b981" strokeWidth={2} fill="url(#cfNet)" connectNulls />
          
          {/* Forecast lines (dashed) */}
          <Area type="monotone" dataKey="inflow_forecast"   stroke="#3b82f6" strokeWidth={2} fill="url(#cfIn)" strokeDasharray="4 4" connectNulls />
          <Area type="monotone" dataKey="outflow_forecast"  stroke="#f87171" strokeWidth={2} fill="url(#cfOut)" strokeDasharray="4 4" connectNulls />
          <Area type="monotone" dataKey="net_cash_forecast" stroke="#10b981" strokeWidth={2} fill="url(#cfNet)" strokeDasharray="4 4" connectNulls />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
