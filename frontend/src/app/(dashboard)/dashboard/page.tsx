"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { RevenueChart, ProjectStatusChart } from "@/components/dashboard/DashboardChart";
import { AIAssistantPanel } from "@/components/dashboard/AIAssistantPanel";
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
interface StatusCount { status: string; count: number }
interface EmploymentTypeCount { employment_type: string; count: number }
interface MonthlyRevenue { month: string; revenue: number; expenses: number; profit: number }
interface ActivityItem { entity_type: string; entity_id: string; description: string; occurred_at: string }
interface DeadlineItem { project_id: string; name: string; client_name: string | null; end_date: string; days_left: number; status: string }

interface InvoiceStatusCount { status: string; count: number; total: number }
interface FinanceDashboard {
  revenue_collected: number;
  pending_amount: number;
  overdue_amount: number;
  total_expenses: number;
  net_profit: number;
  invoice_counts: InvoiceStatusCount[];
  draft_count: number; sent_count: number; paid_count: number; overdue_count: number;
}
interface TaskDashboard { total: number; completed: number; in_progress: number; overdue: number; todo: number; blocked: number }

interface DashboardAnalytics {
  finance: FinanceDashboard;
  monthly_revenue: MonthlyRevenue[];
  total_projects: number;
  active_projects: number;
  overdue_projects: number;
  project_by_status: StatusCount[];
  tasks: TaskDashboard;
  total_employees: number;
  new_hires_this_month: number;
  employees_by_type: EmploymentTypeCount[];
  recent_activity: ActivityItem[];
  upcoming_deadlines: DeadlineItem[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtINR(n: number): string {
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(1)}L`;
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

function urgencyClass(days: number): string {
  if (days <= 3)  return "bg-red-100 text-red-700";
  if (days <= 7)  return "bg-amber-100 text-amber-700";
  return "bg-blue-100 text-blue-700";
}

function entityIcon(type: string) {
  switch (type) {
    case "invoice": return { Icon: FileText,        color: "text-purple-500 bg-purple-50" };
    case "project": return { Icon: Briefcase,       color: "text-blue-500 bg-blue-50"    };
    case "task":    return { Icon: CheckCircle2,    color: "text-emerald-500 bg-emerald-50" };
    default:        return { Icon: Wallet,          color: "text-teal-500 bg-teal-50"    };
  }
}

const QUICK_ACTIONS = [
  { label: "New Invoice",   href: "/finance",      Icon: FileText,   color: "bg-blue-50 text-blue-700 hover:bg-blue-100"       },
  { label: "Add Employee",  href: "/employees",    Icon: Users,      color: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" },
  { label: "New Project",   href: "/projects",     Icon: Briefcase,  color: "bg-purple-50 text-purple-700 hover:bg-purple-100"  },
  { label: "Upload Doc",    href: "/documents",    Icon: Plus,       color: "bg-orange-50 text-orange-700 hover:bg-orange-100"  },
  { label: "View Tasks",    href: "/tasks",        Icon: TrendingUp, color: "bg-pink-50 text-pink-700 hover:bg-pink-100"        },
  { label: "Finance",       href: "/finance",      Icon: CreditCard, color: "bg-teal-50 text-teal-700 hover:bg-teal-100"        },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function DashboardPage() {
  const { user } = useAuthStore();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const { data, isLoading } = useQuery<DashboardAnalytics>({
    queryKey: ["analytics-dashboard"],
    queryFn: () => apiClient.get<DashboardAnalytics>("/analytics/dashboard").then((r) => r.data),
    staleTime: 60_000, // 1 min cache
  });

  // KPI card data — show skeleton values while loading
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
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting}, {user?.full_name?.split(" ")[0] ?? "there"}
          </h1>
          <p className="text-gray-500 mt-0.5 text-sm">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isLoading ? (
            <span className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gray-100 text-gray-500 rounded-full">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading
            </span>
          ) : (
            <span className="text-xs px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full font-semibold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />All systems operational
            </span>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        {KPIS.map((k, i) => <KpiCard key={k.label} {...k} index={i} />)}
      </div>

      {/* Charts + Quick Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2">
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2.5">
            {QUICK_ACTIONS.map(({ label, href, Icon, color }) => (
              <Link key={label} href={href}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex flex-col items-center gap-2 p-3.5 rounded-xl cursor-pointer transition font-medium text-xs ${color}`}
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
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
            <Link href="/projects" className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium">
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-gray-300">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : !data?.recent_activity?.length ? (
            <p className="text-sm text-gray-400 text-center py-6">No recent activity yet</p>
          ) : (
            <div className="space-y-3">
              {data.recent_activity.map((a, idx) => {
                const { Icon, color } = entityIcon(a.entity_type);
                return (
                  <div key={idx} className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800">{a.description}</p>
                      <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" />{timeAgo(a.occurred_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Upcoming Deadlines</h3>
            {isLoading ? (
              <div className="flex items-center justify-center py-6 text-gray-300">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : !data?.upcoming_deadlines?.length ? (
              <p className="text-sm text-gray-400 text-center py-4">No deadlines in next 30 days</p>
            ) : (
              <div className="space-y-2.5">
                {data.upcoming_deadlines.map((d) => (
                  <div key={d.project_id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{d.name}</p>
                      <p className="text-xs text-gray-500">{d.client_name ?? "Internal"}</p>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${urgencyClass(d.days_left)}`}>
                      {d.days_left === 0 ? "Today" : `${d.days_left}d`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Task summary mini-card */}
          {data?.tasks && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Task Summary</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Total",       value: data.tasks.total,       color: "text-gray-700" },
                  { label: "In Progress", value: data.tasks.in_progress, color: "text-blue-600" },
                  { label: "Completed",   value: data.tasks.completed,   color: "text-emerald-600" },
                  { label: "Overdue",     value: data.tasks.overdue,     color: "text-red-600" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{label}</p>
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
