"use client";

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
  Plus,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";

const KPIS = [
  { label: "Total Revenue",      value: "$2.4M",  trend: 14.2, icon: BadgeDollarSign, color: "blue"    as const, subtitle: "$624K this month"   },
  { label: "Total Expenses",     value: "$1.36M", trend: -5.1, icon: TrendingDown,    color: "red"     as const, subtitle: "$348K this month"   },
  { label: "Net Profit",         value: "$1.04M", trend: 21.3, icon: TrendingUp,      color: "emerald" as const, subtitle: "Margin: 43.3%"      },
  { label: "Active Projects",    value: "38",     trend: 8.2,  icon: Briefcase,       color: "purple"  as const, subtitle: "22 on schedule"     },
  { label: "Total Employees",    value: "214",    trend: 3.1,  icon: Users,           color: "teal"    as const, subtitle: "12 on leave"        },
  { label: "Pending Payments",   value: "$187K",  trend: -9.4, icon: CreditCard,      color: "orange"  as const, subtitle: "17 invoices"        },
];

const ACTIVITY = [
  { id: 1, user: "Arjun S.", action: "created project", subject: "Cloud Migration Phase 2", time: "2 min ago", icon: Plus, color: "text-blue-500 bg-blue-50" },
  { id: 2, user: "Priya N.", action: "approved leave for", subject: "Ravi Kumar (3 days)", time: "18 min ago", icon: CheckCircle2, color: "text-emerald-500 bg-emerald-50" },
  { id: 3, user: "Finance", action: "invoice sent to", subject: "TechCorp Solutions - INV-024", time: "1 hr ago", icon: FileText, color: "text-purple-500 bg-purple-50" },
  { id: 4, user: "Kiran M.", action: "closed deal with", subject: "Zenith Industries ($120K)", time: "3 hr ago", icon: BadgeDollarSign, color: "text-emerald-500 bg-emerald-50" },
  { id: 5, user: "System", action: "payment received from", subject: "GlobalTech - $45,000", time: "5 hr ago", icon: Wallet, color: "text-teal-500 bg-teal-50" },
];

const DEADLINES = [
  { id: 1, name: "ERP Integration",       due: "3 days", client: "TechCorp",      urgency: "high"   },
  { id: 2, name: "Cloud Migration Q1",    due: "5 days", client: "Innovate Ltd",  urgency: "medium" },
  { id: 3, name: "HR Audit Report",       due: "7 days", client: "Internal",      urgency: "medium" },
  { id: 4, name: "Q1 Financial Close",    due: "9 days", client: "Finance Dept",  urgency: "low"    },
];

const URGENCY: Record<string, string> = {
  high:   "bg-red-100 text-red-700",
  medium: "bg-amber-100 text-amber-700",
  low:    "bg-blue-100 text-blue-700",
};

const QUICK_ACTIONS = [
  { label: "New Invoice",   href: "/finance",      icon: FileText,        color: "bg-blue-50 text-blue-700 hover:bg-blue-100"    },
  { label: "Add Employee",  href: "/employees",    icon: Users,           color: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" },
  { label: "New Project",   href: "/projects",     icon: Briefcase,       color: "bg-purple-50 text-purple-700 hover:bg-purple-100"   },
  { label: "Upload Doc",    href: "/documents",    icon: Plus,            color: "bg-orange-50 text-orange-700 hover:bg-orange-100"   },
  { label: "AI Insights",   href: "/ai-assistant", icon: TrendingUp,      color: "bg-pink-50 text-pink-700 hover:bg-pink-100"        },
  { label: "View Reports",  href: "/finance",      icon: CreditCard,      color: "bg-teal-50 text-teal-700 hover:bg-teal-100"        },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
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
          <span className="text-xs px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />All systems operational
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        {KPIS.map((k, i) => <KpiCard key={k.label} {...k} index={i} />)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2"><RevenueChart /></div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2.5">
            {QUICK_ACTIONS.map(({ label, href, icon: Icon, color }) => (
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
            <button className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-medium">
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-3">
            {ACTIVITY.map((a) => (
              <div key={a.id} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${a.color}`}>
                  <a.icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800">
                    <span className="font-semibold">{a.user}</span>
                    {" "}{a.action}{" "}
                    <span className="text-blue-600">{a.subject}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />{a.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Upcoming Deadlines</h3>
            <div className="space-y-2.5">
              {DEADLINES.map((d) => (
                <div key={d.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{d.name}</p>
                    <p className="text-xs text-gray-500">{d.client}</p>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${URGENCY[d.urgency]}`}>
                    {d.due}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2"><ProjectStatusChart /></div>
        <div className="h-full"><AIAssistantPanel /></div>
      </div>
    </div>
  );
}