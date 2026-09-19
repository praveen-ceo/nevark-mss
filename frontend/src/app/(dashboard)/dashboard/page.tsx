"use client";
// ============================================================
// Nevark Technologies Pvt. Ltd.
// All rights reserved © 2026 Nevark Technologies.
// Unauthorized use, reproduction, or distribution of this
// code is strictly prohibited.
// Module  : page.tsx
// Author  : Development Team
// Created : 2026-09-05 15:08:00
// ============================================================


import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { RevenueChart, ProjectStatusChart } from "@/components/dashboard/DashboardChart";
import { ExpenseAnomalyList, type ExpenseAnomaly } from "@/components/dashboard/ExpenseAnomalyList";
import { ProjectRiskList, type ProjectRisk } from "@/components/dashboard/ProjectRiskList";
import { EmployeeProductivityList, type EmployeeProductivity } from "@/components/dashboard/EmployeeProductivityList";
import { CashFlowChart, type CashFlowPoint } from "@/components/dashboard/CashFlowChart";
import { ExecutiveSummaryPanel } from "@/components/dashboard/ExecutiveSummaryPanel";
import { AIAssistantPanel } from "@/components/dashboard/AIAssistantPanel";
import { AlertToast } from "@/components/dashboard/AlertToast";
import { useRealtimeAlerts } from "@/hooks/useRealtimeAlerts";
import { OrgFilterBar } from "@/components/dashboard/OrgFilterBar";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeDollarSign,
  Briefcase,
  CheckCircle2,
  Clock,
  CreditCard,
  FileText,
  Loader2,
  Plus,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface StatusCount { status: string; count: number }
export interface EmploymentTypeCount { employment_type: string; count: number }
export interface MonthlyRevenue { month: string; revenue: number; expenses: number; profit: number }
export interface NotifItem { id: string; entity_type: string; title: string; is_read: boolean; created_at: string }
export interface DeadlineItem { project_id: string; name: string; client_name: string | null; end_date: string; days_left: number; status: string }

export interface InvoiceStatusCount { status: string; count: number; total: number }
export interface FinanceDashboard {
  revenue_collected: number;
  pending_amount: number;
  overdue_amount: number;
  total_expenses: number;
  net_profit: number;
  invoice_counts: InvoiceStatusCount[];
  draft_count: number; sent_count: number; paid_count: number; overdue_count: number;
}
export interface TaskDashboard { total: number; completed: number; in_progress: number; overdue: number; todo: number; blocked: number }

export interface DashboardAnalytics {
  finance: FinanceDashboard;
  monthly_revenue: MonthlyRevenue[];
  cash_flow: CashFlowPoint[];
  forecast_available: boolean;
  expense_anomalies: ExpenseAnomaly[];
  project_risks: ProjectRisk[];
  employee_productivity: EmployeeProductivity[];
  total_projects: number;
  active_projects: number;
  overdue_projects: number;
  project_by_status: StatusCount[];
  tasks: TaskDashboard;
  total_employees: number;
  new_hires_this_month: number;
  employees_by_type: EmploymentTypeCount[];
  recent_activity: NotifItem[];
  upcoming_deadlines: DeadlineItem[];
}

export interface OrgFilter {
  groupId: string | null;
  businessUnitId: string | null;
  startDate: string | null;
  endDate: string | null;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtINR(n: number): string {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(2)}Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(2)}L`;
  if (n >= 1_000)       return `₹${(n / 1_000).toFixed(0)}K`;
  return `₹${n.toFixed(0)}`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function urgencyStyle(days: number): { background: string; color: string } {
  if (days <= 3)  return { background: "rgba(239,68,68,0.12)",   color: "#f87171" };
  if (days <= 7)  return { background: "rgba(251,146,60,0.12)",  color: "#fb923c" };
  return                  { background: "rgba(124,58,237,0.12)", color: "#a78bfa" };
}

function entityIcon(type: string) {
  switch (type) {
    case "task":     return { Icon: CheckCircle2, bg: "rgba(16,185,129,0.15)",  color: "#34d399" };
    case "project":  return { Icon: Briefcase,    bg: "rgba(59,130,246,0.15)",  color: "#60a5fa" };
    case "finance":  return { Icon: Wallet,       bg: "rgba(139,92,246,0.15)", color: "#a78bfa" };
    case "document": return { Icon: FileText,     bg: "rgba(251,146,60,0.15)", color: "#fb923c" };
    case "employee": return { Icon: Users,        bg: "rgba(20,184,166,0.15)", color: "#2dd4bf" };
    default:         return { Icon: Wallet,       bg: "rgba(255,255,255,0.06)", color: "#6B7280" };
  }
}

const QUICK_ACTIONS = [
  { label: "New Invoice",  href: "/finance",   Icon: FileText,   bg: "rgba(59,130,246,0.1)",  color: "#93c5fd" },
  { label: "Add Employee", href: "/employees", Icon: Users,      bg: "rgba(16,185,129,0.1)",  color: "#6ee7b7" },
  { label: "New Project",  href: "/projects",  Icon: Briefcase,  bg: "rgba(139,92,246,0.1)", color: "#c4b5fd" },
  { label: "Upload Doc",   href: "/documents", Icon: Plus,       bg: "rgba(251,146,60,0.1)", color: "#fdba74" },
  { label: "View Tasks",   href: "/tasks",     Icon: TrendingUp, bg: "rgba(236,72,153,0.1)", color: "#f9a8d4" },
  { label: "Finance",      href: "/finance",   Icon: CreditCard, bg: "rgba(20,184,166,0.1)", color: "#5eead4" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const { user } = useAuthStore();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  // Enhancement 1 — organisational filter state
  const [orgFilter, setOrgFilter] = useState<OrgFilter>({ groupId: null, businessUnitId: null, startDate: null, endDate: null });

  const handleFilterChange = useCallback((f: OrgFilter) => {
    setOrgFilter(f);
  }, []);

  // Build query params for the analytics endpoint
  const analyticsParams = new URLSearchParams();
  if (orgFilter.groupId) analyticsParams.set("group_id", orgFilter.groupId);
  if (orgFilter.businessUnitId) analyticsParams.set("business_unit_id", orgFilter.businessUnitId);
  if (orgFilter.startDate) analyticsParams.set("start_date", orgFilter.startDate);
  if (orgFilter.endDate) analyticsParams.set("end_date", orgFilter.endDate);
  const analyticsQs = analyticsParams.toString();

  const { data, isLoading } = useQuery<DashboardAnalytics>({
    // queryKey includes filter values so React Query refetches on filter change
    queryKey: ["analytics-dashboard", orgFilter.groupId, orgFilter.businessUnitId, orgFilter.startDate, orgFilter.endDate],
    queryFn: () =>
      apiClient
        .get<DashboardAnalytics>(`/analytics/dashboard${analyticsQs ? `?${analyticsQs}` : ""}`)
        .then((r) => r.data),
    staleTime: 60_000,
    refetchInterval: 30_000, // E9: polling for real-time alerts
  });

  const { data: feedData, isLoading: feedLoading } = useQuery({
    queryKey: ["notif-feed"],
    queryFn: () =>
      apiClient.get<{ items: NotifItem[] }>("/notifications?limit=10").then((r) => r.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { alerts, dismissAlert } = useRealtimeAlerts(data, orgFilter);

  const f = data?.finance;
  const KPIS = [
    {
      label: "Revenue Collected",
      value: isLoading ? "—" : fmtINR(Number(f?.revenue_collected ?? 0)),
      trend: undefined,
      icon: BadgeDollarSign,
      color: "blue" as const,
      subtitle: `${f?.paid_count ?? 0} paid invoices`,
    },
    {
      label: "Total Expenses",
      value: isLoading ? "—" : fmtINR(Number(f?.total_expenses ?? 0)),
      trend: undefined,
      icon: TrendingDown,
      color: "red" as const,
      subtitle: "Approved + reimbursed",
    },
    {
      label: "Net Profit",
      value: isLoading ? "—" : fmtINR(Number(f?.net_profit ?? 0)),
      trend: undefined,
      icon: TrendingUp,
      color: "emerald" as const,
      subtitle: f && f.revenue_collected > 0
        ? `Margin: ${((Number(f.net_profit) / Number(f.revenue_collected)) * 100).toFixed(1)}%`
        : "No revenue yet",
    },
    {
      label: "Active Projects",
      value: isLoading ? "—" : String(data?.active_projects ?? 0),
      trend: undefined,
      icon: Briefcase,
      color: "purple" as const,
      subtitle: `${data?.overdue_projects ?? 0} overdue`,
    },
    {
      label: "Total Employees",
      value: isLoading ? "—" : String(data?.total_employees ?? 0),
      trend: undefined,
      icon: Users,
      color: "teal" as const,
      subtitle: `${data?.new_hires_this_month ?? 0} new this month`,
    },
    {
      label: "Pending Payments",
      value: isLoading ? "—" : fmtINR(Number(f?.pending_amount ?? 0)),
      trend: undefined,
      icon: CreditCard,
      color: "orange" as const,
      subtitle: `${f?.sent_count ?? 0} sent · ${f?.overdue_count ?? 0} overdue`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#E5E7EB" }}>
            {greeting}, {user?.full_name?.split(" ")[0] ?? "there"}
          </h1>
          <p style={{ color: "#9CA3AF", marginTop: "0.125rem", fontSize: "0.875rem" }}>
            {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isLoading ? (
            <span
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.05)", color: "#6B7280" }}
            >
              <Loader2 className="w-3 h-3 animate-spin" /> Loading
            </span>
          ) : (
            <span
              className="text-xs px-3 py-1.5 rounded-full font-semibold flex items-center gap-1.5"
              style={{ background: "rgba(16,185,129,0.12)", color: "#34d399" }}
            >
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#34d399" }} />
              All systems operational
            </span>
          )}
        </div>
      </div>

      {/* Enhancement 1 — Org Filter Bar */}
      <OrgFilterBar onFilterChange={handleFilterChange} />

      {/* Enhancement 8 — Executive Summary */}
      <ExecutiveSummaryPanel data={data} loading={isLoading} />

      {/* Enhancement 9 — Real-Time Alerts */}
      <AlertToast alerts={alerts} onDismiss={dismissAlert} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        {KPIS.map((k, i) => <KpiCard key={k.label} {...k} index={i} />)}
      </div>

      {/* Charts + Quick Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div>
          <RevenueChart
            data={data?.monthly_revenue?.map((m) => ({
              month: m.month,
              revenue: Number(m.revenue),
              expenses: Number(m.expenses),
              profit: Number(m.profit),
            }))}
            loading={isLoading}
          />
        </div>
        <div>
          <CashFlowChart
            data={data?.cash_flow}
            forecastAvailable={data?.forecast_available}
            loading={isLoading}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-5">
        {/* Quick Actions */}
        <div className="premium-card p-5">
          <h3 style={{ fontWeight: 600, color: "#E5E7EB", marginBottom: "1rem" }}>Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2.5">
            {QUICK_ACTIONS.map(({ label, href, Icon, bg, color }) => (
              <Link key={label} href={href}>
                <motion.div
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex flex-col items-center gap-2 p-3.5 rounded-xl cursor-pointer transition font-medium text-xs"
                  style={{ background: bg, color }}
                >
                  <Icon className="w-5 h-5" />
                  {label}
                </motion.div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Activity + Deadlines */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Recent Activity — always global; see Enhancement 1 limitations */}
        <div className="xl:col-span-2 premium-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ fontWeight: 600, color: "#E5E7EB" }}>Recent Activity</h3>
            <Link
              href="/notifications"
              className="flex items-center gap-1 font-medium text-xs"
              style={{ color: "#8B5CF6" }}
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {feedLoading ? (
            <div className="flex items-center justify-center py-8" style={{ color: "#6B7280" }}>
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : !feedData?.items?.length ? (
            <p className="text-sm text-center py-6" style={{ color: "#6B7280" }}>No recent activity yet</p>
          ) : (
            <div className="space-y-3">
              {feedData.items.map((n) => {
                const { Icon, bg, color } = entityIcon(n.entity_type);
                return (
                  <div
                    key={n.id}
                    className="flex items-start gap-3"
                    style={{ opacity: n.is_read ? 0.75 : 1 }}
                  >
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: bg }}
                    >
                      <Icon className="w-3.5 h-3.5" style={{ color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm"
                        style={{ color: n.is_read ? "#9CA3AF" : "#E5E7EB", fontWeight: n.is_read ? 400 : 500 }}
                      >
                        {n.title}
                      </p>
                      <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "#6B7280" }}>
                        <Clock className="w-3 h-3" />{timeAgo(n.created_at)}
                      </p>
                    </div>
                    {!n.is_read && (
                      <span className="w-2 h-2 rounded-full shrink-0 mt-2" style={{ background: "#8B5CF6" }} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-5">
          {/* Upcoming Deadlines */}
          <div className="premium-card p-5">
            <h3 style={{ fontWeight: 600, color: "#E5E7EB", marginBottom: "0.75rem" }}>Upcoming Deadlines</h3>
            {isLoading ? (
              <div className="flex items-center justify-center py-6" style={{ color: "#6B7280" }}>
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : !data?.upcoming_deadlines?.length ? (
              <p className="text-sm text-center py-4" style={{ color: "#6B7280" }}>
                No deadlines in next 30 days
              </p>
            ) : (
              <div className="space-y-2.5">
                {data.upcoming_deadlines.map((d) => {
                  const uStyle = urgencyStyle(d.days_left);
                  return (
                    <div
                      key={d.project_id}
                      className="flex items-center gap-3 p-2.5 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.04)" }}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "#E5E7EB" }}>{d.name}</p>
                        <p className="text-xs" style={{ color: "#9CA3AF" }}>{d.client_name ?? "Internal"}</p>
                      </div>
                      <span
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                        style={uStyle}
                      >
                        {d.days_left === 0 ? "Today" : d.days_left < 0 ? "Overdue" : `${d.days_left}d`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          
          {/* Enhancement 4: Expense Anomalies */}
          <div className="h-[300px]">
            <ExpenseAnomalyList data={data?.expense_anomalies} loading={isLoading} />
          </div>

          {/* Enhancement 5 & 6: Project Risks and Employee Productivity */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
            <div className="h-[300px] xl:col-span-2">
              <ProjectRiskList data={data?.project_risks} loading={isLoading} />
            </div>
            <div className="h-[300px] xl:col-span-1">
              <EmployeeProductivityList data={data?.employee_productivity} loading={isLoading} />
            </div>
          </div>

          {/* Task Summary */}
          {data?.tasks && (
            <div className="premium-card p-5">
              <h3 style={{ fontWeight: 600, color: "#E5E7EB", marginBottom: "0.75rem" }}>Task Summary</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Total",       value: data.tasks.total,       color: "#E5E7EB" },
                  { label: "In Progress", value: data.tasks.in_progress, color: "#60a5fa" },
                  { label: "Completed",   value: data.tasks.completed,   color: "#34d399" },
                  { label: "Overdue",     value: data.tasks.overdue,     color: "#f87171" },
                ].map(({ label, value, color }) => (
                  <div
                    key={label}
                    className="rounded-xl p-3 text-center"
                    style={{ background: "rgba(255,255,255,0.04)" }}
                  >
                    <p style={{ fontSize: "1.25rem", fontWeight: 700, color }}>{value}</p>
                    <p style={{ fontSize: "0.75rem", color: "#6B7280", marginTop: "0.125rem" }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Project Chart + AI Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2">
          <ProjectStatusChart
            data={data?.project_by_status?.map((p) => ({ status: p.status, count: p.count }))}
            total={data?.total_projects}
            loading={isLoading}
          />
        </div>
        <div className="h-full"><AIAssistantPanel /></div>
      </div>
    </div>
  );
}
