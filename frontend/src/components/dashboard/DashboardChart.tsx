"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const MONTHLY = [
  { month: "Jul", revenue: 380000, expenses: 240000, profit: 140000 },
  { month: "Aug", revenue: 422000, expenses: 268000, profit: 154000 },
  { month: "Sep", revenue: 455000, expenses: 285000, profit: 170000 },
  { month: "Oct", revenue: 512000, expenses: 308000, profit: 204000 },
  { month: "Nov", revenue: 490000, expenses: 296000, profit: 194000 },
  { month: "Dec", revenue: 581000, expenses: 332000, profit: 249000 },
  { month: "Jan", revenue: 624000, expenses: 348000, profit: 276000 },
];

const STATUS = [
  { name: "Planning",    count: 8,  color: "#94a3b8" },
  { name: "In Progress", count: 18, color: "#3b82f6" },
  { name: "Review",      count: 7,  color: "#f59e0b" },
  { name: "Completed",   count: 23, color: "#10b981" },
  { name: "On Hold",     count: 4,  color: "#ef4444" },
];

function fmtK(v: number | string): string {
  const n = Number(v);
  if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000)    return `$${(n / 1000).toFixed(0)}k`;
  return `$${n}`;
}

export function RevenueChart() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Revenue Overview</h3>
          <p className="text-sm text-gray-500">7-month performance</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full bg-blue-500 inline-block" />Revenue
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full bg-red-400 inline-block" />Expenses
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1.5 rounded-full bg-emerald-500 inline-block" />Profit
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <AreaChart data={MONTHLY} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}    />
            </linearGradient>
            <linearGradient id="gE" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#f87171" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#f87171" stopOpacity={0}    />
            </linearGradient>
            <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}    />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={fmtK} tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={54} />
          <Tooltip
            formatter={(v: number | string | readonly (string | number)[]) => [fmtK(Number(v)), ""]}
            contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 13 }}
          />
          <Area type="monotone" dataKey="revenue"  stroke="#3b82f6" strokeWidth={2} fill="url(#gR)" />
          <Area type="monotone" dataKey="expenses" stroke="#f87171" strokeWidth={2} fill="url(#gE)" />
          <Area type="monotone" dataKey="profit"   stroke="#10b981" strokeWidth={2} fill="url(#gP)" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ProjectStatusChart() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full">
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900">Projects by Status</h3>
        <p className="text-sm text-gray-500">60 total projects</p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={STATUS} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
          <XAxis type="number" tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
          <YAxis
            dataKey="name"
            type="category"
            tick={{ fontSize: 12, fill: "#64748b" }}
            axisLine={false}
            tickLine={false}
            width={86}
          />
          <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13 }} />
          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
            {STATUS.map((entry, i) => (
              <Cell key={`c-${i}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}