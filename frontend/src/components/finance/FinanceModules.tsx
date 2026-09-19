// ============================================================
// Nevark Technologies Pvt. Ltd.
// All rights reserved © 2026 Nevark Technologies.
// Unauthorized use, reproduction, or distribution of this
// code is strictly prohibited.
// Module  : FinanceModules.tsx
// Author  : Development Team
// Created : 2026-09-19 09:41:12
// ============================================================

/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, AreaChart, Area, ComposedChart, Line, Cell
} from "recharts";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { Wallet, TrendingUp, TrendingDown, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api/client";

function fmt(n: number | null | undefined, currency = "INR"): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

function fmtShort(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(2)}L`;
  if (n >= 1000)        return `₹${(n / 1000).toFixed(2)}K`;
  return `₹${n}`;
}
// ---------------------------------------------------------------------------

function ModuleKpiCard({ title, value, icon, trend }: any) {
  return (
    <div className="premium-card p-5 flex items-start gap-4 cursor-default">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/5">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="uppercase tracking-wide mb-0.5 text-[0.7rem] font-semibold text-gray-400">{title}</p>
        <p className="premium-kpi-value">{value}</p>
        {trend && (
          <div className={cn("flex items-center gap-1 mt-1.5 text-xs font-semibold", trend.isPositive ? "text-emerald-400" : "text-red-400")}>
            {trend.label}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Income View
// ---------------------------------------------------------------------------
export function IncomeView({ trends, invoices }: { trends: any, invoices: any[] }) {
  const paidInvoices = invoices.filter((i: any) => i.status === "paid");
  const totalIncome = trends?.monthly_revenue.reduce((acc: number, curr: any) => acc + (Number(curr.revenue) || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <ModuleKpiCard title="Total Income" value={fmt(totalIncome)} icon={<TrendingUp className="w-5 h-5 text-emerald-400" />} />
      </div>
      
      <div className="rounded-2xl border border-gray-100 p-5 bg-white/5">
        <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Income Trend</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trends?.monthly_revenue || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={fmtShort} tick={{ fill: "#9CA3AF", fontSize: 12 }} />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} contentStyle={{ backgroundColor: "#1F2937", border: "none", borderRadius: "8px", color: "#F9FAFB" }} formatter={(val: any) => fmt(val)} />
              <Bar dataKey="revenue" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white/5">
        <div className="p-4 border-b border-gray-100"><h3 className="font-semibold text-white">Paid Invoices</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-semibold">Invoice #</th>
                <th className="px-4 py-3 font-semibold">Client</th>
                <th className="px-4 py-3 font-semibold">Issue Date</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/10">
              {paidInvoices.map((inv: any) => (
                <tr key={inv.id} className="hover:bg-white/5">
                  <td className="px-4 py-3 font-medium text-white">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-gray-300">{inv.client?.name || "—"}</td>
                  <td className="px-4 py-3 text-gray-300">{inv.issue_date}</td>
                  <td className="px-4 py-3 font-semibold text-white">{fmt(inv.total_amount, inv.currency)}</td>
                </tr>
              ))}
              {paidInvoices.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No paid invoices found in this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Expenses View
// ---------------------------------------------------------------------------
export function ExpensesView({ trends, expenses }: { trends: any, expenses: any[] }) {
  const activeExpenses = expenses.filter((e: any) => e.status === "approved" || e.status === "reimbursed");
  const totalExpenses = trends?.monthly_revenue.reduce((acc: number, curr: any) => acc + (Number(curr.expenses) || 0), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <ModuleKpiCard title="Total Expenses" value={fmt(totalExpenses)} icon={<TrendingDown className="w-5 h-5 text-red-400" />} />
      </div>
      
      <div className="rounded-2xl border border-gray-100 p-5 bg-white/5">
        <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Expenses Trend</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trends?.monthly_revenue || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={fmtShort} tick={{ fill: "#9CA3AF", fontSize: 12 }} />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} contentStyle={{ backgroundColor: "#1F2937", border: "none", borderRadius: "8px", color: "#F9FAFB" }} formatter={(val: any) => fmt(val)} />
              <Bar dataKey="expenses" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={50} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white/5">
        <div className="p-4 border-b border-gray-100"><h3 className="font-semibold text-white">Approved Expenses</h3></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Employee</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/10">
              {activeExpenses.map((exp: any) => (
                <tr key={exp.id} className="hover:bg-white/5">
                  <td className="px-4 py-3 text-gray-300">{exp.date}</td>
                  <td className="px-4 py-3 font-medium text-white capitalize">{exp.category.replace(/_/g, " ")}</td>
                  <td className="px-4 py-3 text-gray-300">{exp.employee ? `${exp.employee.first_name} ${exp.employee.last_name}` : "—"}</td>
                  <td className="px-4 py-3 font-semibold text-white">{fmt(exp.amount, exp.currency)}</td>
                </tr>
              ))}
              {activeExpenses.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No approved expenses found in this period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Profit & Loss View
// ---------------------------------------------------------------------------
export function ProfitLossView({ trends }: { trends: any }) {
  const totalIncome = trends?.monthly_revenue.reduce((acc: number, curr: any) => acc + (Number(curr.revenue) || 0), 0) || 0;
  const totalExpenses = trends?.monthly_revenue.reduce((acc: number, curr: any) => acc + (Number(curr.expenses) || 0), 0) || 0;
  const netProfit = totalIncome - totalExpenses;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <ModuleKpiCard title="Total Income" value={fmt(totalIncome)} icon={<TrendingUp className="w-5 h-5 text-emerald-400" />} />
        <ModuleKpiCard title="Total Expenses" value={fmt(totalExpenses)} icon={<TrendingDown className="w-5 h-5 text-red-400" />} />
        <ModuleKpiCard title="Net Profit" value={fmt(netProfit)} icon={<Wallet className="w-5 h-5 text-blue-400" />} trend={{ value: 0, label: netProfit >= 0 ? "Profitable" : "Loss", isPositive: netProfit >= 0 }} />
      </div>
      
      <div className="rounded-2xl border border-gray-100 p-5 bg-white/5">
        <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Profit & Loss Trend</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trends?.monthly_revenue || []}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={fmtShort} tick={{ fill: "#9CA3AF", fontSize: 12 }} />
              <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} contentStyle={{ backgroundColor: "#1F2937", border: "none", borderRadius: "8px", color: "#F9FAFB" }} formatter={(val: any) => fmt(val)} />
              <Bar dataKey="revenue" name="Income" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="expenses" name="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#60a5fa" strokeWidth={3} dot={{ r: 4, fill: "#60a5fa" }} activeDot={{ r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Cash Flow View
// ---------------------------------------------------------------------------
export function CashFlowView({ trends }: { trends: any }) {
  const actuals = (trends?.cash_flow || []).filter((p: any) => !p.is_forecast);
  const totalInflow = actuals.reduce((acc: number, curr: any) => acc + (Number(curr.inflow) || 0), 0) || 0;
  const totalOutflow = actuals.reduce((acc: number, curr: any) => acc + (Number(curr.outflow) || 0), 0) || 0;
  const netCash = totalInflow - totalOutflow;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <ModuleKpiCard title="Cash Inflow (Actuals)" value={fmt(totalInflow)} icon={<TrendingUp className="w-5 h-5 text-emerald-400" />} />
        <ModuleKpiCard title="Cash Outflow (Actuals)" value={fmt(totalOutflow)} icon={<TrendingDown className="w-5 h-5 text-red-400" />} />
        <ModuleKpiCard title="Net Cash Flow (Actuals)" value={fmt(netCash)} icon={<Wallet className="w-5 h-5 text-indigo-400" />} trend={{ value: 0, label: netCash >= 0 ? "Positive" : "Negative", isPositive: netCash >= 0 }} />
      </div>
      
      <div className="rounded-2xl border border-gray-100 p-5 bg-white/5">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Cash Flow & Forecast</h3>
          <div className="flex gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>Inflow</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400"></span>Outflow</div>
            <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-400"></span>Net</div>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={trends?.cash_flow || []}>
              <defs>
                <pattern id="diagonalHatch" patternUnits="userSpaceOnUse" width="4" height="4">
                  <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" style={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }} />
                </pattern>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={fmtShort} tick={{ fill: "#9CA3AF", fontSize: 12 }} />
              <Tooltip 
                cursor={{ fill: "rgba(255,255,255,0.05)" }} 
                contentStyle={{ backgroundColor: "#1F2937", border: "none", borderRadius: "8px", color: "#F9FAFB" }} 
                formatter={(val: any) => fmt(val)}
                labelFormatter={(label) => `${label} ${(trends?.cash_flow || []).find((x:any)=>x.month===label)?.is_forecast ? '(Forecast)' : ''}`}
              />
              <Bar dataKey="inflow" name="Cash Inflow" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="outflow" name="Cash Outflow" fill="#f87171" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Line type="monotone" dataKey="net_cash" name="Net Cash" stroke="#60a5fa" strokeWidth={3} dot={{ r: 4, fill: "#60a5fa" }} activeDot={{ r: 6 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Accounts Receivable View
// ---------------------------------------------------------------------------
export function AccountsReceivableView({ groupId, businessUnitId, startDate, endDate }: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (groupId) params.append("group_id", groupId);
    if (businessUnitId) params.append("business_unit_id", businessUnitId);
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);

    apiClient.get(`/finance/accounts-receivable?${params.toString()}`)
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [groupId, businessUnitId, startDate, endDate]);

  if (loading) return <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>;
  if (!data) return <div className="h-64 flex items-center justify-center text-gray-500">Failed to load AR data</div>;

  const agingData = [
    { name: "Not Yet Due", value: data.aging_not_due || 0, fill: "#34d399" },
    { name: "1-30 Days", value: data.aging_1_30_days || 0, fill: "#fbbf24" },
    { name: "31-60 Days", value: data.aging_31_60_days || 0, fill: "#f97316" },
    { name: "60+ Days", value: data.aging_60_plus_days || 0, fill: "#ef4444" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ModuleKpiCard title="Total Outstanding" value={fmt(data.total_outstanding)} icon={<Wallet className="w-5 h-5 text-indigo-400" />} />
        <ModuleKpiCard title="Total Overdue" value={fmt(data.total_overdue)} icon={<AlertCircle className="w-5 h-5 text-red-400" />} trend={data.total_overdue > 0 ? { value: 0, label: "Requires Attention", isPositive: false } : undefined} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 rounded-2xl border border-gray-100 p-5 bg-white/5">
          <h3 className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">Aging Summary</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agingData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.1)" />
                <XAxis type="number" axisLine={false} tickLine={false} tickFormatter={fmtShort} tick={{ fill: "#9CA3AF", fontSize: 12 }} />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: "#9CA3AF", fontSize: 12 }} width={80} />
                <Tooltip cursor={{ fill: "rgba(255,255,255,0.05)" }} contentStyle={{ backgroundColor: "#1F2937", border: "none", borderRadius: "8px", color: "#F9FAFB" }} formatter={(val: any) => fmt(val)} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={30}>
                  {agingData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-gray-100 overflow-hidden bg-white/5 flex flex-col">
          <div className="p-4 border-b border-gray-100"><h3 className="font-semibold text-white">Outstanding by Client</h3></div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold text-right">Total Outstanding</th>
                  <th className="px-4 py-3 font-semibold text-right">Overdue Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/10">
                {(data.by_client || []).map((c: any) => (
                  <tr key={c.client_id} className="hover:bg-white/5">
                    <td className="px-4 py-3 font-medium text-white">{c.client_name}</td>
                    <td className="px-4 py-3 font-semibold text-white text-right">{fmt(c.total_outstanding)}</td>
                    <td className="px-4 py-3 font-semibold text-red-400 text-right">{c.overdue_amount > 0 ? fmt(c.overdue_amount) : "-"}</td>
                  </tr>
                ))}
                {(!data.by_client || data.by_client.length === 0) && (
                  <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No accounts receivable found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Accounts Payable View (Employee Payables)
// ---------------------------------------------------------------------------
export function EmployeePayablesView({ groupId, businessUnitId, startDate, endDate }: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (groupId) params.append("group_id", groupId);
    if (businessUnitId) params.append("business_unit_id", businessUnitId);
    if (startDate) params.append("start_date", startDate);
    if (endDate) params.append("end_date", endDate);

    apiClient.get(`/finance/employee-payables?${params.toString()}`)
      .then(r => { setData(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [groupId, businessUnitId, startDate, endDate]);

  if (loading) return <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-violet-500" /></div>;
  if (!data) return <div className="h-64 flex items-center justify-center text-gray-500">Failed to load AP data</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ModuleKpiCard title="Total Employee Payables" value={fmt(data.total_owed)} icon={<Wallet className="w-5 h-5 text-indigo-400" />} />
      </div>

      <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white/5">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 className="font-semibold text-white">Pending Reimbursements by Employee</h3>
          <span className="text-xs text-gray-400 px-2 py-1 bg-white/5 rounded-md">APPROVED Expenses</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-white/5 text-gray-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-semibold">Employee</th>
                <th className="px-4 py-3 font-semibold text-right">Total Owed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100/10">
              {(data.by_employee || []).map((e: any) => (
                <tr key={e.employee_id} className="hover:bg-white/5">
                  <td className="px-4 py-3 font-medium text-white">{e.employee_name}</td>
                  <td className="px-4 py-3 font-semibold text-white text-right">{fmt(e.total_owed)}</td>
                </tr>
              ))}
              {(!data.by_employee || data.by_employee.length === 0) && (
                <tr><td colSpan={2} className="px-4 py-8 text-center text-gray-400">No pending employee reimbursements.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
