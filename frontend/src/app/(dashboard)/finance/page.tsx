"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  BadgeDollarSign,
  CreditCard,
  Download,
  FileText,
  Plus,
  Search,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { cn } from "@/lib/utils";

interface Invoice {
  id: string;
  number: string;
  client: string;
  amount: number;
  status: "paid" | "pending" | "overdue" | "draft";
  issued: string;
  due: string;
  items: number;
}

const INVOICES: Invoice[] = [
  { id:"1", number:"INV-024", client:"TechCorp Solutions",    amount:45000, status:"pending",  issued:"10 Jan", due:"25 Jan", items:3 },
  { id:"2", number:"INV-023", client:"Zenith Industries",     amount:82000, status:"paid",     issued:"05 Jan", due:"20 Jan", items:5 },
  { id:"3", number:"INV-022", client:"Apex Retail Group",     amount:31500, status:"overdue",  issued:"28 Dec", due:"12 Jan", items:2 },
  { id:"4", number:"INV-021", client:"GlobalTech Partners",   amount:24000, status:"paid",     issued:"20 Dec", due:"04 Jan", items:4 },
  { id:"5", number:"INV-020", client:"Innovate Ltd",          amount:56000, status:"paid",     issued:"15 Dec", due:"30 Dec", items:6 },
  { id:"6", number:"INV-019", client:"UrbanEdge Real Estate", amount:18500, status:"overdue",  issued:"10 Dec", due:"25 Dec", items:2 },
  { id:"7", number:"INV-018", client:"NovaBuild Corp",        amount:12000, status:"draft",    issued:"08 Jan", due:"23 Jan", items:1 },
  { id:"8", number:"INV-017", client:"BlueSky Ventures",      amount:9500,  status:"pending",  issued:"07 Jan", due:"22 Jan", items:2 },
];

const MONTHLY = [
  { month:"Aug", revenue:422000, expenses:268000 },
  { month:"Sep", revenue:455000, expenses:285000 },
  { month:"Oct", revenue:512000, expenses:308000 },
  { month:"Nov", revenue:490000, expenses:296000 },
  { month:"Dec", revenue:581000, expenses:332000 },
  { month:"Jan", revenue:624000, expenses:348000 },
];

const STATUS_STYLE: Record<string, string> = {
  paid:    "bg-emerald-100 text-emerald-700",
  pending: "bg-blue-100 text-blue-700",
  overdue: "bg-red-100 text-red-700",
  draft:   "bg-gray-100 text-gray-600",
};

const TABS = ["All","Paid","Pending","Overdue","Draft"];

function fmtK(v: number | string): string {
  const n = Number(v);
  return n >= 1000 ? `$${(n/1000).toFixed(0)}k` : `$${n}`;
}

export default function FinancePage() {
  const [search, setSearch]   = useState("");
  const [tab, setTab]         = useState("All");

  const filtered = useMemo(() => INVOICES.filter((inv) => {
    const matchQ = inv.client.toLowerCase().includes(search.toLowerCase()) || inv.number.toLowerCase().includes(search.toLowerCase());
    const matchT = tab === "All" || inv.status === tab.toLowerCase();
    return matchQ && matchT;
  }), [search, tab]);

  const totalRevenue  = INVOICES.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const totalPending  = INVOICES.filter((i) => i.status === "pending").reduce((s, i) => s + i.amount, 0);
  const totalOverdue  = INVOICES.filter((i) => i.status === "overdue").reduce((s, i) => s + i.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
          <p className="text-sm text-gray-500">Invoices, payments and financial performance</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
            <Download className="w-4 h-4" />Export
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition shadow-sm">
            <Plus className="w-4 h-4" />New Invoice
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        <KpiCard label="Revenue Collected" value={`$${(totalRevenue/1000).toFixed(0)}K`}  icon={BadgeDollarSign} color="emerald" index={0} trend={14.2} />
        <KpiCard label="Expenses"          value="$348K"                                    icon={TrendingDown}    color="red"     index={1} trend={-5.1} />
        <KpiCard label="Net Profit"        value="$276K"                                    icon={TrendingUp}      color="blue"    index={2} trend={21.3} />
        <KpiCard label="Pending"           value={`$${(totalPending/1000).toFixed(0)}K`}   icon={CreditCard}      color="orange"  index={3} subtitle={`${INVOICES.filter(i=>i.status==="pending").length} invoices`} />
        <KpiCard label="Overdue"           value={`$${(totalOverdue/1000).toFixed(0)}K`}   icon={Wallet}          color="red"     index={4} subtitle={`${INVOICES.filter(i=>i.status==="overdue").length} invoices`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900">Monthly Revenue vs Expenses</h3>
            <p className="text-sm text-gray-500">Last 6 months</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={MONTHLY} margin={{ top:4, right:4, left:0, bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize:12, fill:"#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtK} tick={{ fontSize:12, fill:"#94a3b8" }} axisLine={false} tickLine={false} width={50} />
              <Tooltip formatter={(v: number | string | readonly (string | number)[]) => [fmtK(Number(v)), ""]}
                contentStyle={{ borderRadius:12, border:"1px solid #e2e8f0", fontSize:13 }} />
              <Bar dataKey="revenue"  fill="#3b82f6" radius={[4,4,0,0]} name="Revenue"  />
              <Bar dataKey="expenses" fill="#f87171" radius={[4,4,0,0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Invoice Summary</h3>
          <div className="grid grid-cols-2 gap-3">
            {(["paid","pending","overdue","draft"] as const).map((s) => {
              const count = INVOICES.filter((i) => i.status === s).length;
              const total = INVOICES.filter((i) => i.status === s).reduce((acc, i) => acc + i.amount, 0);
              return (
                <div key={s} className={cn("rounded-xl p-3.5 border", STATUS_STYLE[s].replace("text-", "border-").replace("bg-", "").split(" ")[0], STATUS_STYLE[s])}>
                  <p className="text-xs font-semibold uppercase tracking-wide capitalize">{s}</p>
                  <p className="text-xl font-bold mt-1">{count}</p>
                  <p className="text-xs opacity-75">${(total/1000).toFixed(1)}K total</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="p-4 border-b border-gray-100">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search invoices..."
                className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none flex-1" />
            </div>
            <span className="text-xs text-gray-400">{filtered.length} invoices</span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto">
            {TABS.map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={cn("text-xs px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap", tab === t ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100")}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Invoice","Client","Items","Amount","Status","Issued","Due",""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv, i) => (
                <motion.tr key={inv.id} initial={{ opacity:0 }} animate={{ opacity:1 }} transition={{ delay: i*0.04 }}
                  className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                        <FileText className="w-4 h-4 text-blue-600" />
                      </div>
                      <span className="font-mono text-sm font-semibold text-gray-800">{inv.number}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-gray-700 font-medium">{inv.client}</td>
                  <td className="px-4 py-3.5 text-gray-500">{inv.items} items</td>
                  <td className="px-4 py-3.5 font-bold text-gray-900">${inv.amount.toLocaleString()}</td>
                  <td className="px-4 py-3.5">
                    <span className={cn("text-xs px-2.5 py-1 rounded-full font-semibold capitalize", STATUS_STYLE[inv.status])}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-gray-500 text-xs">{inv.issued}</td>
                  <td className="px-4 py-3.5 text-xs">
                    <span className={cn(inv.status === "overdue" ? "text-red-600 font-semibold" : "text-gray-500")}>{inv.due}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <button className="text-xs text-blue-600 hover:text-blue-700 font-medium">View</button>
                      {inv.status === "draft" && (
                        <button className="text-xs text-emerald-600 hover:text-emerald-700 font-medium">Send</button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center text-gray-400 text-sm">No invoices match your filters.</div>
          )}
        </div>
      </div>
    </div>
  );
}