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

// ---------------------------------------------------------------------------
// Types (matches backend MonthlyRevenue / StatusCount)
// ---------------------------------------------------------------------------
export interface MonthlyRevenuePoint {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export interface ProjectStatusPoint {
  status: string;
  count: number;
}

// ---------------------------------------------------------------------------
// Fallback static data (shown while loading / empty DB)
// ---------------------------------------------------------------------------
const FALLBACK_MONTHLY: MonthlyRevenuePoint[] = [
  { month: "Jan", revenue: 0, expenses: 0, profit: 0 },
  { month: "Feb", revenue: 0, expenses: 0, profit: 0 },
  { month: "Mar", revenue: 0, expenses: 0, profit: 0 },
  { month: "Apr", revenue: 0, expenses: 0, profit: 0 },
  { month: "May", revenue: 0, expenses: 0, profit: 0 },
  { month: "Jun", revenue: 0, expenses: 0, profit: 0 },
];

const FALLBACK_STATUS: ProjectStatusPoint[] = [
  { status: "Planning",  count: 0 },
  { status: "Active",    count: 0 },
  { status: "On Hold",   count: 0 },
  { status: "Completed", count: 0 },
  { status: "Cancelled", count: 0 },
];

const STATUS_COLORS: Record<string, string> = {
  Planning:  "#94a3b8",
  Active:    "#3b82f6",
  "On Hold": "#f59e0b",
  Completed: "#10b981",
  Cancelled: "#ef4444",
};

function fmtK(v: number | string): string {
  const n = Number(v);
  if (n >= 10_00_000) return `₹${(n / 10_00_000).toFixed(1)}L`;
  if (n >= 1000)      return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

// ---------------------------------------------------------------------------
// RevenueChart — accepts live data prop, falls back to zeros while loading
// ---------------------------------------------------------------------------
interface RevenueChartProps {
  data?: MonthlyRevenuePoint[];
  loading?: boolean;
}

export function RevenueChart({ data, loading }: RevenueChartProps) {
  // Backend returns "Jan 2025" — trim to just month label for axis
  const chartData = (data ?? FALLBACK_MONTHLY).map((d) => ({
    ...d,
    month: d.month.split(" ")[0],
    revenue: Number(d.revenue),
    expenses: Number(d.expenses),
    profit: Number(d.profit),
  }));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-gray-900">Revenue Overview</h3>
          <p className="text-sm text-gray-500">
            {loading ? "Loading..." : `${chartData.length}-month performance`}
          </p>
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
        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
          <YAxis tickFormatter={fmtK} tick={{ fontSize: 12, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={60} />
          <Tooltip
            formatter={(v) => [fmtK(Number(v ?? 0)), ""]}
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

// ---------------------------------------------------------------------------
// ProjectStatusChart — accepts live data prop
// ---------------------------------------------------------------------------
interface ProjectStatusChartProps {
  data?: ProjectStatusPoint[];
  total?: number;
  loading?: boolean;
}

export function ProjectStatusChart({ data, total, loading }: ProjectStatusChartProps) {
  const chartData = (data ?? FALLBACK_STATUS).map((d) => ({
    name: d.status,
    count: d.count,
    color: STATUS_COLORS[d.status] ?? "#94a3b8",
  }));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full">
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900">Projects by Status</h3>
        <p className="text-sm text-gray-500">
          {loading ? "Loading..." : `${total ?? 0} total projects`}
        </p>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
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
            {chartData.map((entry, i) => (
              <Cell key={`c-${i}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
