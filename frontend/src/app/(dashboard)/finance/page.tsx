/* eslint-disable @typescript-eslint/no-explicit-any */
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


import { useEffect, useRef, useState, useMemo, useCallback, memo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import type { AxiosError } from "axios";
import {
  AlertCircle, BadgeDollarSign, BarChart3, CheckCircle2,
  CreditCard, Download, FileText, Loader2, Plus, Search,
  SendHorizonal, Settings, TrendingDown, TrendingUp, Wallet, X,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { apiClient } from "@/lib/api/client";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { cn } from "@/lib/utils";
import { exportCSV, exportXLSX, exportPDF } from "@/lib/export";
import { OrgFilterBar } from "@/components/dashboard/OrgFilterBar";
import { IncomeView, ExpensesView, ProfitLossView, CashFlowView, AccountsReceivableView, EmployeePayablesView } from "@/components/finance/FinanceModules";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClientBrief { id: string; name: string; }
interface ProjectBrief { id: string; name: string; code: string; }

interface InvoiceItem {
  id: string; description: string; quantity: number;
  unit_price: number; amount: number; sort_order: number;
}

interface Payment {
  id: string; amount: number; payment_date: string;
  payment_method: string; reference: string | null; status: string;
}

interface Invoice {
  id: string; invoice_number: string; status: string;
  issue_date: string; due_date: string;
  subtotal: number; tax_rate: number; tax_amount: number;
  discount_amount: number; total_amount: number; paid_amount: number;
  outstanding_amount: number | null; currency: string;
  notes: string | null;
  cgst_rate: number | null; sgst_rate: number | null; igst_rate: number | null;
  cgst_amount: number | null; sgst_amount: number | null; igst_amount: number | null;
  place_of_supply: string | null; gstin: string | null;
  supply_type: "intrastate" | "interstate" | null;
  client: ClientBrief | null; project: ProjectBrief | null;
  items: InvoiceItem[]; payments: Payment[];
}

interface Project {
  id: string; name: string; code: string;
  status: string; client: ClientBrief | null; budget: number | null; currency: string;
}

interface FinanceDashboard {
  revenue_collected: number; pending_amount: number;
  overdue_amount: number; total_expenses: number;
  net_profit: number; draft_count: number; sent_count: number;
  paid_count: number; overdue_count: number;
}

interface FinanceSettings {
  id: string; company_name: string | null; company_gstin: string | null;
  company_address: string | null; company_email: string | null; company_phone: string | null;
  pan: string | null; state_code: string | null;
  cgst_rate: number; sgst_rate: number; igst_rate: number;
  bank_name: string | null; bank_account: string | null; bank_ifsc: string | null;
  bank_branch: string | null;
  invoice_prefix: string; default_sac: string; payment_terms: number; default_currency: string;
}

interface ProjectFinanceSummary {
  project_id: string;
  project_name: string;
  project_code: string;
  client_name: string | null;
  project_value: number | null;
  total_invoiced: number;
  total_received: number;
  pending_amount: number;
  gst_amount: number;
  expenses: number;
  estimated_profit: number;
  invoice_count: number;
  payment_count: number;
}

interface Expense {
  id: string; category: string; amount: number; currency: string; date: string; description: string | null; status: string;
  employee: { first_name: string; last_name: string } | null;
  project: ProjectBrief | null;
}
interface MonthlyRevenue { month: string; revenue: number; expenses: number; profit: number; }
interface CashFlowPoint { month: string; inflow: number; outflow: number; net_cash: number; is_forecast: boolean; }
interface FinanceTrends { monthly_revenue: MonthlyRevenue[]; cash_flow: CashFlowPoint[]; forecast_available: boolean; }


// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

type InvoiceStatus = "draft" | "sent" | "partial" | "paid" | "overdue" | "cancelled";
type FinanceTab = "income" | "expenses" | "profit_loss" | "cash_flow" | "invoices" | "project_finance" | "accounts_receivable" | "accounts_payable";

// Accounts Receivable Interfaces
interface ClientARSummary { client_id: string; client_name: string; total_outstanding: number; overdue_amount: number; }
interface AccountsReceivableReport { total_outstanding: number; total_overdue: number; aging_not_due: number; aging_1_30_days: number; aging_31_60_days: number; aging_60_plus_days: number; by_client: ClientARSummary[]; }

// Accounts Payable Interfaces
interface EmployeeAPSummary { employee_id: string; employee_name: string; total_owed: number; }
interface AccountsPayableReport { total_owed: number; by_employee: EmployeeAPSummary[]; }

const api = {
  trends:          (p: any) => apiClient.get<FinanceTrends>("/finance/trends", { params: { group_id: p.groupId, business_unit_id: p.businessUnitId, start_date: p.startDate, end_date: p.endDate } }).then(r => r.data),
  accountsReceivable: (p: any) => apiClient.get<AccountsReceivableReport>("/finance/accounts-receivable", { params: { group_id: p.groupId, business_unit_id: p.businessUnitId, start_date: p.startDate, end_date: p.endDate } }).then(r => r.data),
  employeePayables:   (p: any) => apiClient.get<AccountsPayableReport>("/finance/employee-payables", { params: { group_id: p.groupId, business_unit_id: p.businessUnitId, start_date: p.startDate, end_date: p.endDate } }).then(r => r.data),
  expenses:        (p: any) => apiClient.get<Expense[]>("/finance/expenses", { params: p }).then(r => r.data),
  dashboard:       () => apiClient.get<FinanceDashboard>("/finance/dashboard").then(r => r.data),
  invoices:        (status: InvoiceStatus | "all", search: string) =>
    apiClient.get<Invoice[]>("/finance/invoices", {
      params: { ...(status && status !== "all" ? { status } : {}), ...(search ? { search } : {}) },
    }).then(r => r.data),
  projects:        () => apiClient.get<Project[]>("/projects").then(r => r.data),
  settings:        () => apiClient.get<FinanceSettings>("/finance/settings").then(r => r.data),
  upsertSettings:  (d: Partial<FinanceSettings>) =>
    apiClient.put<FinanceSettings>("/finance/settings", d).then(r => r.data),
  autoInvoice:     (projectId: string) =>
    apiClient.post<Invoice>(`/finance/invoices/from-project/${projectId}`).then(r => r.data),
  sendInvoice:     (id: string) =>
    apiClient.post<Invoice>(`/finance/invoices/${id}/send`).then(r => r.data),
  addPayment:      (id: string, d: { amount: string; payment_date: string; payment_method: string; reference: string }) =>
    apiClient.post<Invoice>(`/finance/invoices/${id}/payments`, {
      ...d, amount: parseFloat(d.amount),
    }).then(r => r.data),
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; style: string; dot: string }> = {
  draft:     { label: "Draft",     style: "bg-gray-800/60 text-gray-300",       dot: "bg-gray-500"     },
  sent:      { label: "Sent",      style: "bg-blue-900/40 text-blue-300",       dot: "bg-blue-400"     },
  partial:   { label: "Partial",   style: "bg-amber-900/40 text-amber-300",     dot: "bg-amber-400"    },
  paid:      { label: "Paid",      style: "bg-emerald-900/40 text-emerald-300", dot: "bg-emerald-400"  },
  overdue:   { label: "Overdue",   style: "bg-red-900/40 text-red-300",         dot: "bg-red-400"      },
  cancelled: { label: "Cancelled", style: "bg-slate-800/60 text-slate-400",     dot: "bg-slate-500"    },
};

const TABS: Array<{ id: FinanceTab; label: string; icon: any }> = [
  { id: "income", label: "Income", icon: TrendingUp },
  { id: "expenses", label: "Expenses", icon: TrendingDown },
  { id: "profit_loss", label: "Profit & Loss", icon: BarChart3 },
  { id: "cash_flow", label: "Cash Flow", icon: Wallet },
  { id: "accounts_receivable", label: "Accounts Receivable", icon: FileText },
  { id: "accounts_payable", label: "Employee Payables", icon: CreditCard },
  { id: "invoices", label: "Invoices", icon: FileText },
  { id: "project_finance", label: "Project Finance", icon: BarChart3 },
];

const inputCls = "premium-input w-full text-sm px-3 py-2.5 outline-none transition";
const PAGE_SIZE = 25;

const PF_HEADERS = [
  "Project", "Code", "Client", "Value (Rs.)", "Invoiced (Rs.)",
  "Received (Rs.)", "Pending (Rs.)", "GST (Rs.)", "Expenses (Rs.)",
  "Est. Profit (Rs.)", "Invoices", "Payments",
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
// useDebounce hook
// ---------------------------------------------------------------------------

function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

const Toast = memo(function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      className={cn("fixed bottom-6 right-6 z-100 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
        type === "success" ? "bg-emerald-600" : "bg-red-600")}>
      {type === "success" ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
      {msg}
      <button onClick={onClose} className="ml-1 opacity-75 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
    </motion.div>
  );
});

// ---------------------------------------------------------------------------
// Modal shell
// ---------------------------------------------------------------------------

const Modal = memo(function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.18 }}
        className={cn("relative rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto",
          wide ? "max-w-2xl" : "max-w-lg")}
        style={{ background: "#1a2234", border: "1px solid rgba(192,192,192,0.12)", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}>
        <div
          className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
          style={{ background: "#1a2234", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <h2 style={{ fontWeight: 600, color: "#E5E7EB" }}>{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg transition"
            style={{ color: "#6B7280" }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </div>
  );
});

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: "#9CA3AF" }}>
        {label}{required && <span className="ml-0.5" style={{ color: "#f87171" }}>*</span>}
      </label>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Auto-Invoice Modal
// ---------------------------------------------------------------------------

const AutoInvoiceModal = memo(function AutoInvoiceModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (m: string) => void }) {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-completed"],
    queryFn: () => api.projects(),
    staleTime: 30_000,
  });

  const completed = useMemo(
    () => projects.filter(p => p.status === "completed" && p.client && p.budget),
    [projects]
  );

  const mut = useMutation({
    mutationFn: () => api.autoInvoice(selectedId),
    onSuccess: (inv) => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["finance-dashboard"] });
      onSuccess(`Invoice ${inv.invoice_number} created`);
      onClose();
    },
    onError: (e: AxiosError<{ detail: string }>) => setErr(e.response?.data?.detail ?? "Failed to generate invoice"),
  });

  return (
    <Modal title="Auto-Generate Invoice from Project" onClose={onClose}>
      <p className="text-sm text-gray-500 mb-4">Generates a draft invoice from the project&apos;s budget. Only completed projects with a client and budget are shown.</p>
      <Field label="Completed Project" required>
        <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className={inputCls}>
          <option value="">Select project...</option>
          {completed.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.code}) — {fmt(p.budget, p.currency)} — {p.client?.name}
            </option>
          ))}
        </select>
      </Field>
      {completed.length === 0 && (
        <p className="mt-3 text-xs rounded-lg px-3 py-2" style={{ background: "rgba(251,146,60,0.1)", color: "#fb923c" }}>
          No eligible projects found. A project must be Completed with a client and budget assigned.
        </p>
      )}
      {err && <p className="mt-3 text-sm rounded-lg px-3 py-2" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}>{err}</p>}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl transition" style={{ color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.1)" }} onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.05)")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>Cancel</button>
        <button onClick={() => mut.mutate()} disabled={mut.isPending || !selectedId}
          className="flex items-center gap-2 px-4 py-2 text-sm premium-button-violet disabled:opacity-50">
          {mut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Generate Invoice
        </button>
      </div>
    </Modal>
  );
});

// ---------------------------------------------------------------------------
// Send Invoice Modal
// ---------------------------------------------------------------------------

const SendModal = memo(function SendModal({ invoice, onClose, onSuccess }: { invoice: Invoice; onClose: () => void; onSuccess: (m: string) => void }) {
  const qc = useQueryClient();
  const [err, setErr] = useState<string | null>(null);
  const mut = useMutation({
    mutationFn: () => api.sendInvoice(invoice.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      onSuccess(`Invoice ${invoice.invoice_number} marked as Sent`);
      onClose();
    },
    onError: (e: AxiosError<{ detail: string }>) => setErr(e.response?.data?.detail ?? "Failed to send"),
  });
  return (
    <Modal title="Send Invoice" onClose={onClose}>
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.12)" }}>
          <SendHorizonal className="w-6 h-6" style={{ color: "#60a5fa" }} />
        </div>
        <div>
          <p className="font-semibold" style={{ color: "#E5E7EB" }}>Mark {invoice.invoice_number} as Sent?</p>
          <p className="text-sm mt-1" style={{ color: "#9CA3AF" }}>Status will change from Draft → Sent. This cannot be undone.</p>
        </div>
        <div className="w-full rounded-xl px-4 py-3 text-left text-sm space-y-1" style={{ background: "rgba(255,255,255,0.04)" }}>
          <div className="flex justify-between"><span style={{ color: "#9CA3AF" }}>Client</span><span className="font-medium" style={{ color: "#E5E7EB" }}>{invoice.client?.name ?? "—"}</span></div>
          <div className="flex justify-between"><span style={{ color: "#9CA3AF" }}>Amount</span><span className="font-semibold" style={{ color: "#E5E7EB" }}>{fmt(invoice.total_amount, invoice.currency)}</span></div>
          <div className="flex justify-between"><span style={{ color: "#9CA3AF" }}>Due</span><span className="font-medium" style={{ color: "#E5E7EB" }}>{invoice.due_date}</span></div>
        </div>
      </div>
      {err && <p className="mt-3 text-sm rounded-lg px-3 py-2" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}>{err}</p>}
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition">Cancel</button>
        <button onClick={() => mut.mutate()} disabled={mut.isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">
          {mut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Confirm Send
        </button>
      </div>
    </Modal>
  );
});

// ---------------------------------------------------------------------------
// Record Payment Modal
// ---------------------------------------------------------------------------

const PAYMENT_METHODS = ["bank_transfer", "credit_card", "cash", "cheque", "online"] as const;

const PaymentModal = memo(function PaymentModal({ invoice, onClose, onSuccess }: { invoice: Invoice; onClose: () => void; onSuccess: (m: string) => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ amount: "", payment_date: new Date().toISOString().slice(0, 10), payment_method: "bank_transfer", reference: "" });
  const [err, setErr] = useState<string | null>(null);
  const set = useCallback((k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value })), []);
  const outstanding = invoice.outstanding_amount ?? (invoice.total_amount - invoice.paid_amount);

  const mut = useMutation({
    mutationFn: () => api.addPayment(invoice.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["finance-dashboard"] });
      onSuccess("Payment recorded");
      onClose();
    },
    onError: (e: AxiosError<{ detail: string }>) => setErr(e.response?.data?.detail ?? "Failed to record payment"),
  });

  return (
    <Modal title={`Record Payment — ${invoice.invoice_number}`} onClose={onClose}>
      <div className="rounded-xl px-4 py-3 mb-5 flex justify-between text-sm" style={{ background: "rgba(59,130,246,0.1)" }}>
        <span style={{ color: "#9CA3AF" }}>Outstanding</span>
        <span className="font-bold" style={{ color: "#60a5fa" }}>{fmt(outstanding, invoice.currency)}</span>
      </div>
      <div className="space-y-4">
        <Field label="Amount" required>
          <input type="number" value={form.amount} onChange={set("amount")} placeholder={String(outstanding)} className={inputCls} />
        </Field>
        <Field label="Payment Date" required>
          <input type="date" value={form.payment_date} onChange={set("payment_date")} className={inputCls} />
        </Field>
        <Field label="Payment Method" required>
          <select value={form.payment_method} onChange={set("payment_method")} className={inputCls}>
            {PAYMENT_METHODS.map(m => (
              <option key={m} value={m}>{m.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</option>
            ))}
          </select>
        </Field>
        <Field label="Reference / UTR">
          <input value={form.reference} onChange={set("reference")} placeholder="UTR / Transaction ID" className={inputCls} />
        </Field>
      </div>
      {err && <p className="mt-4 text-sm rounded-lg px-3 py-2" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}>{err}</p>}
      <div className="flex justify-end gap-3 mt-6 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl transition" style={{ color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.1)" }} onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.05)")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>Cancel</button>
        <button onClick={() => mut.mutate()} disabled={mut.isPending || !form.amount || parseFloat(form.amount) <= 0}
          className="flex items-center gap-2 px-4 py-2 text-sm premium-button-violet disabled:opacity-50">
          {mut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Record Payment
        </button>
      </div>
    </Modal>
  );
});

// ---------------------------------------------------------------------------
// Invoice Detail Modal
// ---------------------------------------------------------------------------

const InvoiceDetailModal = memo(function InvoiceDetailModal({ invoice, onClose, onSend, onPay }: {
  invoice: Invoice; onClose: () => void; onSend: () => void; onPay: () => void;
}) {
  const { data: settings } = useQuery({ queryKey: ["finance-settings"], queryFn: api.settings, staleTime: 300_000 });
  const [pdfLoading, setPdfLoading] = useState(false);

  const handleDownloadPdf = useCallback(async () => {
    setPdfLoading(true);
    try {
      const { downloadInvoicePdf } = await import("@/lib/invoicePdf");
      await downloadInvoicePdf(invoice, {
        company_name:    settings?.company_name    ?? "Nevark Technologies LLP",
        company_gstin:   settings?.company_gstin   ?? null,
        company_address: settings?.company_address ?? null,
        company_email:   settings?.company_email   ?? null,
        company_phone:   settings?.company_phone   ?? null,
        pan:             settings?.pan             ?? null,
        state_code:      settings?.state_code      ?? null,
        bank_name:       settings?.bank_name       ?? null,
        bank_account:    settings?.bank_account    ?? null,
        bank_ifsc:       settings?.bank_ifsc       ?? null,
        bank_branch:     settings?.bank_branch     ?? null,
        default_sac:     settings?.default_sac     ?? "998314",
        payment_terms:   settings?.payment_terms   ?? 30,
      });
    } finally {
      setPdfLoading(false);
    }
  }, [invoice, settings]);

  const cfg = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.draft;
  const outstanding = invoice.outstanding_amount ?? (invoice.total_amount - invoice.paid_amount);
  const isIntrastate = invoice.supply_type === "intrastate";

  return (
    <Modal title={`Invoice — ${invoice.invoice_number}`} onClose={onClose} wide>
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-bold" style={{ color: "#E5E7EB" }}>{invoice.client?.name ?? "—"}</p>
            {invoice.project && <p className="text-sm mt-0.5" style={{ color: "#9CA3AF" }}>{invoice.project.name} ({invoice.project.code})</p>}
            {invoice.gstin && <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>GSTIN: {invoice.gstin}</p>}
          </div>
          <span className={cn("text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5", cfg.style)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />{cfg.label}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[["Issued", invoice.issue_date], ["Due", invoice.due_date], ["Place of Supply", invoice.place_of_supply ?? "—"]].map(([l, v]) => (
            <div key={l} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
              <p className="text-xs mb-0.5" style={{ color: "#6B7280" }}>{l}</p>
              <p className="text-sm font-semibold" style={{ color: "#E5E7EB" }}>{v}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#6B7280" }}>Line Items</p>
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
            <table className="w-full text-sm">
              <thead style={{ background: "rgba(255,255,255,0.04)" }}>
                <tr>{["Description", "Qty", "Unit Price", "Amount"].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold" style={{ color: "#9CA3AF" }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {invoice.items.map(item => (
                  <tr key={item.id} style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                    <td className="px-3 py-2.5" style={{ color: "#E5E7EB" }}>{item.description}</td>
                    <td className="px-3 py-2.5" style={{ color: "#9CA3AF" }}>{item.quantity}</td>
                    <td className="px-3 py-2.5" style={{ color: "#9CA3AF" }}>{fmt(item.unit_price, invoice.currency)}</td>
                    <td className="px-3 py-2.5 font-semibold" style={{ color: "#E5E7EB" }}>{fmt(item.amount, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl p-4 space-y-2 text-sm" style={{ background: "rgba(255,255,255,0.04)" }}>
          <div className="flex justify-between"><span style={{ color: "#9CA3AF" }}>Subtotal</span><span className="font-medium" style={{ color: "#E5E7EB" }}>{fmt(invoice.subtotal, invoice.currency)}</span></div>
          {invoice.discount_amount > 0 && <div className="flex justify-between" style={{ color: "#f87171" }}><span>Discount</span><span>-{fmt(invoice.discount_amount, invoice.currency)}</span></div>}
          {isIntrastate ? (
            <>
              <div className="flex justify-between" style={{ color: "#9CA3AF" }}><span>CGST ({invoice.cgst_rate}%)</span><span>{fmt(invoice.cgst_amount, invoice.currency)}</span></div>
              <div className="flex justify-between" style={{ color: "#9CA3AF" }}><span>SGST ({invoice.sgst_rate}%)</span><span>{fmt(invoice.sgst_amount, invoice.currency)}</span></div>
            </>
          ) : (
            <div className="flex justify-between" style={{ color: "#9CA3AF" }}><span>IGST ({invoice.igst_rate}%)</span><span>{fmt(invoice.igst_amount, invoice.currency)}</span></div>
          )}
          <div className="flex justify-between font-bold pt-2" style={{ color: "#E5E7EB", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
            <span>Total</span><span>{fmt(invoice.total_amount, invoice.currency)}</span>
          </div>
          <div className="flex justify-between" style={{ color: "#34d399" }}><span>Paid</span><span>{fmt(invoice.paid_amount, invoice.currency)}</span></div>
          <div className="flex justify-between font-semibold" style={{ color: "#60a5fa" }}><span>Outstanding</span><span>{fmt(outstanding, invoice.currency)}</span></div>
        </div>

        {invoice.payments.length > 0 && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: "#6B7280" }}>Payments Received</p>
            <div className="space-y-1.5">
              {invoice.payments.map(p => (
                <div key={p.id} className="flex justify-between items-center rounded-lg px-3 py-2 text-sm" style={{ background: "rgba(16,185,129,0.1)" }}>
                  <span style={{ color: "#9CA3AF" }}>{p.payment_date} · {p.payment_method.replace(/_/g, " ")}</span>
                  <span className="font-semibold" style={{ color: "#34d399" }}>{fmt(p.amount, invoice.currency)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {invoice.status === "draft" && (
            <button onClick={onSend} className="flex items-center gap-2 px-4 py-2 text-sm premium-button-violet">
              <SendHorizonal className="w-4 h-4" />Send Invoice
            </button>
          )}
          {["sent", "partial", "overdue"].includes(invoice.status) && (
            <button onClick={onPay}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl transition"
              style={{ background: "rgba(16,185,129,0.15)", color: "#34d399", border: "1px solid rgba(16,185,129,0.25)" }}>
              <CreditCard className="w-4 h-4" />Record Payment
            </button>
          )}
          <button onClick={handleDownloadPdf} disabled={pdfLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed" style={{ color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.1)" }}>
            {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {pdfLoading ? "Generating…" : "Download PDF"}
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl transition ml-auto" style={{ color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.1)" }}>Close</button>
        </div>
      </div>
    </Modal>
  );
});

// ---------------------------------------------------------------------------
// Settings Modal
// ---------------------------------------------------------------------------

const SettingsModal = memo(function SettingsModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (m: string) => void }) {
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["finance-settings"], queryFn: api.settings });
  const [form, setForm] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setForm({
        company_name: settings.company_name ?? "",
        company_gstin: settings.company_gstin ?? "",
        state_code: settings.state_code ?? "",
        bank_name: settings.bank_name ?? "",
        bank_account: settings.bank_account ?? "",
        bank_ifsc: settings.bank_ifsc ?? "",
        invoice_prefix: settings.invoice_prefix,
        default_sac: settings.default_sac,
        payment_terms: String(settings.payment_terms),
        cgst_rate: String(settings.cgst_rate),
        sgst_rate: String(settings.sgst_rate),
        igst_rate: String(settings.igst_rate),
      });
    }
  }, [settings]);

  const mut = useMutation({
    mutationFn: () => api.upsertSettings({
      ...form,
      payment_terms: parseInt(form.payment_terms || "30"),
      cgst_rate: parseFloat(form.cgst_rate || "9") as unknown as number,
      sgst_rate: parseFloat(form.sgst_rate || "9") as unknown as number,
      igst_rate: parseFloat(form.igst_rate || "18") as unknown as number,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["finance-settings"] });
      onSuccess("Settings saved");
      onClose();
    },
    onError: (e: AxiosError<{ detail: string }>) => setErr(e.response?.data?.detail ?? "Failed to save"),
  });

  const set = useCallback((k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value })), []);

  const sections: Array<{ title: string; fields: Array<{ key: string; label: string; placeholder?: string }> }> = [
    { title: "Company", fields: [
        { key: "company_name", label: "Company Name", placeholder: "Nevark Solutions Pvt Ltd" },
        { key: "company_gstin", label: "Company GSTIN", placeholder: "33XXXXX0000X1Z5" },
        { key: "state_code", label: "State Code (for GST)", placeholder: "33" },
    ]},
    { title: "GST Rates", fields: [
        { key: "cgst_rate", label: "CGST Rate (%)", placeholder: "9" },
        { key: "sgst_rate", label: "SGST Rate (%)", placeholder: "9" },
        { key: "igst_rate", label: "IGST Rate (%)", placeholder: "18" },
    ]},
    { title: "Bank Details", fields: [
        { key: "bank_name", label: "Bank Name" },
        { key: "bank_account", label: "Account Number" },
        { key: "bank_ifsc", label: "IFSC Code" },
    ]},
    { title: "Invoice Settings", fields: [
        { key: "invoice_prefix", label: "Invoice Prefix", placeholder: "NVK" },
        { key: "default_sac", label: "Default SAC Code", placeholder: "998314" },
        { key: "payment_terms", label: "Payment Terms (days)", placeholder: "30" },
    ]},
  ];

  return (
    <Modal title="Finance Settings" onClose={onClose} wide>
      <div className="space-y-6">
        {sections.map(sec => (
          <div key={sec.title}>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "#6B7280" }}>{sec.title}</p>
            <div className="grid grid-cols-2 gap-4">
              {sec.fields.map(f => (
                <Field key={f.key} label={f.label}>
                  <input value={form[f.key] ?? ""} onChange={set(f.key)} placeholder={f.placeholder} className={inputCls} />
                </Field>
              ))}
            </div>
          </div>
        ))}
      </div>
      {err && <p className="mt-4 text-sm rounded-lg px-3 py-2" style={{ background: "rgba(239,68,68,0.1)", color: "#f87171" }}>{err}</p>}
      <div className="flex justify-end gap-3 mt-6 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={onClose} className="px-4 py-2 text-sm rounded-xl transition" style={{ color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.1)" }} onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.05)")} onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>Cancel</button>
        <button onClick={() => mut.mutate()} disabled={mut.isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm premium-button-violet disabled:opacity-50">
          {mut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Settings
        </button>
      </div>
    </Modal>
  );
});

// ---------------------------------------------------------------------------
// KPI Section — memoized, only re-renders when dashboard data changes
// ---------------------------------------------------------------------------

const KPISection = memo(function KPISection({ dashboard }: { dashboard: FinanceDashboard | undefined }) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
      <KpiCard label="Revenue Collected" value={fmtShort(dashboard?.revenue_collected)} icon={BadgeDollarSign} color="emerald" index={0} />
      <KpiCard label="Expenses"          value={fmtShort(dashboard?.total_expenses)}    icon={TrendingDown}    color="red"     index={1} />
      <KpiCard label="Net Profit"        value={fmtShort(dashboard?.net_profit)}        icon={TrendingUp}      color="blue"    index={2} />
      <KpiCard label="Pending"           value={fmtShort(dashboard?.pending_amount)}    icon={CreditCard}      color="orange"  index={3}
        subtitle={dashboard ? `${dashboard.sent_count} invoices` : undefined} />
      <KpiCard label="Overdue"           value={fmtShort(dashboard?.overdue_amount)}    icon={Wallet}          color="red"     index={4}
        subtitle={dashboard ? `${dashboard.overdue_count} invoices` : undefined} />
    </div>
  );
});

// ---------------------------------------------------------------------------
// Finance Charts — memoized, only re-renders when dashboard changes
// ---------------------------------------------------------------------------

const FinanceCharts = memo(function FinanceCharts({
  dashboard,
  setTab,
}: {
  dashboard: FinanceDashboard | undefined;
  setTab: (t: FinanceTab) => void;
}) {
  const chartData = useMemo(() => dashboard ? [
    { name: "Draft",   count: dashboard.draft_count   },
    { name: "Sent",    count: dashboard.sent_count    },
    { name: "Paid",    count: dashboard.paid_count    },
    { name: "Overdue", count: dashboard.overdue_count },
  ] : [], [dashboard]);

  const summaryItems = useMemo(() => [
    { label: "Collected", value: dashboard?.revenue_collected, color: "#34d399" },
    { label: "Expenses",  value: dashboard?.total_expenses,    color: "#f87171" },
    { label: "Net",       value: dashboard?.net_profit,        color: "#60a5fa" },
  ], [dashboard]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
      {/* Invoice summary grid */}
      <div className="premium-card p-5">
        <h3 className="font-semibold mb-4" style={{ color: "#E5E7EB" }}>Invoice Summary</h3>
        <div className="grid grid-cols-2 gap-3">
          {(["draft","sent","paid","overdue"] as const).map(s => {
            const cfg = STATUS_CONFIG[s];
            const count = s === "draft" ? dashboard?.draft_count
              : s === "sent" ? dashboard?.sent_count
              : s === "paid" ? dashboard?.paid_count
              : dashboard?.overdue_count;
            return (
              <button key={s} onClick={() => setTab("invoices")}
                className={cn("rounded-xl p-3.5 text-left transition hover:opacity-90", cfg.style)}>
                <p className="text-xs font-bold uppercase tracking-wide">{cfg.label}</p>
                <p className="text-2xl font-bold mt-1">{count ?? "—"}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recharts bar */}
      <div className="xl:col-span-2 premium-card p-5">
        <div className="mb-4">
          <h3 className="font-semibold" style={{ color: "#E5E7EB" }}>Revenue vs Expenses</h3>
          <p className="text-xs" style={{ color: "#6B7280" }}>Live aggregates (monthly breakdown in V2)</p>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-2">
          {summaryItems.map(item => (
            <div key={item.label} className="rounded-xl p-4 text-center" style={{ background: "rgba(255,255,255,0.04)" }}>
              <p className="text-xs mb-1" style={{ color: "#6B7280" }}>{item.label}</p>
              <p className="text-lg font-bold" style={{ color: item.color }}>{fmtShort(item.value)}</p>
            </div>
          ))}
        </div>
        {dashboard && (
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid rgba(192,192,192,0.15)", fontSize: 12, background: "#1a2234", color: "#E5E7EB" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} fill="#7C3AED" label={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Invoice Table — memoized with pagination
// ---------------------------------------------------------------------------

const InvoiceTable = memo(function InvoiceTable({
  invoices,
  isLoading,
  isError,
  dSearch,
  invoiceStatus,
  onDetail,
  onSend,
  onPay,
}: {
  invoices: Invoice[];
  isLoading: boolean;
  isError: boolean;
  dSearch: string;
  invoiceStatus: InvoiceStatus | "all";
  onDetail: (inv: Invoice) => void;
  onSend: (inv: Invoice) => void;
  onPay: (inv: Invoice) => void;
}) {
  const [page, setPage] = useState(0);

  // Reset to first page when invoices change (tab/search switched)
  useEffect(() => { setPage(0); }, [invoices]);

  const totalPages = Math.ceil(invoices.length / PAGE_SIZE);
  const pageSlice  = useMemo(
    () => invoices.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [invoices, page]
  );

  if (isError) {
    return (
      <div className="p-6 flex items-center gap-3" style={{ color: "#f87171" }}>
        <AlertCircle className="w-5 h-5" />
        <p className="text-sm">Failed to load invoices. Check backend is running.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {["Invoice", "Client", "Project", "Items", "Subtotal", "GST", "Total", "Outstanding", "Status", "Due", ""].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: "#C0C0C0" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pageSlice.map((inv, i) => {
            const cfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.draft;
            const outstanding = inv.outstanding_amount ?? (inv.total_amount - inv.paid_amount);
            return (
              <motion.tr key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }} className="transition-colors cursor-pointer hover:bg-[rgba(124,58,237,0.07)]"
                onClick={() => onDetail(inv)}>
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(124,58,237,0.15)" }}>
                      <FileText className="w-4 h-4" style={{ color: "#8B5CF6" }} />
                    </div>
                    <span className="font-mono text-sm font-semibold" style={{ color: "#E5E7EB" }}>{inv.invoice_number}</span>
                  </div>
                </td>
                <td className="px-4 py-3.5 font-medium whitespace-nowrap" style={{ color: "#C0C0C0" }}>{inv.client?.name ?? "—"}</td>
                <td className="px-4 py-3.5 text-xs whitespace-nowrap" style={{ color: "#9CA3AF" }}>{inv.project?.code ?? "—"}</td>
                <td className="px-4 py-3.5" style={{ color: "#9CA3AF" }}>{inv.items.length}</td>
                <td className="px-4 py-3.5 whitespace-nowrap" style={{ color: "#C0C0C0" }}>{fmt(inv.subtotal, inv.currency)}</td>
                <td className="px-4 py-3.5 text-xs whitespace-nowrap" style={{ color: "#9CA3AF" }}>
                  {inv.supply_type === "intrastate"
                    ? `C+S ${inv.cgst_rate}%+${inv.sgst_rate}%`
                    : inv.igst_rate ? `IGST ${inv.igst_rate}%` : "—"}
                </td>
                <td className="px-4 py-3.5 font-bold whitespace-nowrap" style={{ color: "#E5E7EB" }}>{fmt(inv.total_amount, inv.currency)}</td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  <span style={{ fontWeight: 600, color: outstanding > 0 ? "#fb923c" : "#6B7280" }}>
                    {fmt(outstanding, inv.currency)}
                  </span>
                </td>
                <td className="px-4 py-3.5">
                  <span className={cn("text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1 w-fit", cfg.style)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />{cfg.label}
                  </span>
                </td>
                <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                  <span style={{ color: inv.status === "overdue" ? "#f87171" : "#9CA3AF", fontWeight: inv.status === "overdue" ? 600 : 400 }}>{inv.due_date}</span>
                </td>
                <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    {inv.status === "draft" && (
                      <button onClick={() => onSend(inv)}
                        className="text-xs font-medium whitespace-nowrap flex items-center gap-1" style={{ color: "#8B5CF6" }}>
                        <SendHorizonal className="w-3 h-3" />Send
                      </button>
                    )}
                    {["sent", "partial", "overdue"].includes(inv.status) && (
                      <button onClick={() => onPay(inv)}
                        className="text-xs font-medium whitespace-nowrap flex items-center gap-1" style={{ color: "#34d399" }}>
                        <CreditCard className="w-3 h-3" />Pay
                      </button>
                    )}
                  </div>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>

      {!isLoading && invoices.length === 0 && (
        <div className="py-16 text-center text-sm" style={{ color: "#6B7280" }}>
          {dSearch || invoiceStatus !== "all" ? "No invoices match your filters." : "No invoices yet. Generate one from a completed project."}
        </div>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="text-xs" style={{ color: "#6B7280" }}>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, invoices.length)} of {invoices.length}
          </span>
          <div className="flex gap-1.5">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
              className="text-xs px-3 py-1.5 rounded-lg transition disabled:opacity-30"
              style={{ color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.1)" }}>
              ← Prev
            </button>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
              className="text-xs px-3 py-1.5 rounded-lg transition disabled:opacity-30"
              style={{ color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.1)" }}>
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

// ---------------------------------------------------------------------------
// Project Finance Section — memoized with debounced search + memoized calcs
// ---------------------------------------------------------------------------

const ProjectFinanceSection = memo(function ProjectFinanceSection({ data, isLoading }: { data: ProjectFinanceSummary[]; isLoading: boolean }) {
  const [pfSearch, setPfSearch] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const dPfSearch = useDebounce(pfSearch, 300);

  const filtered = useMemo(() => {
    if (!dPfSearch) return data;
    const q = dPfSearch.toLowerCase();
    return data.filter(p =>
      p.project_name.toLowerCase().includes(q) ||
      p.project_code.toLowerCase().includes(q) ||
      (p.client_name ?? "").toLowerCase().includes(q)
    );
  }, [data, dPfSearch]);

  const totals = useMemo(() => ({
    value:    data.reduce((s, p) => s + (p.project_value ?? 0), 0),
    invoiced: data.reduce((s, p) => s + p.total_invoiced, 0),
    received: data.reduce((s, p) => s + p.total_received, 0),
    pending:  data.reduce((s, p) => s + p.pending_amount, 0),
    expenses: data.reduce((s, p) => s + p.expenses, 0),
    profit:   data.reduce((s, p) => s + p.estimated_profit, 0),
  }), [data]);

  const kpiItems = useMemo(() => [
    { label: "Project Value",  value: totals.value,    styleColor: "#60a5fa",  styleBg: "rgba(59,130,246,0.1)"  },
    { label: "Total Invoiced", value: totals.invoiced, styleColor: "#a78bfa",  styleBg: "rgba(139,92,246,0.1)"  },
    { label: "Received",       value: totals.received, styleColor: "#34d399",  styleBg: "rgba(16,185,129,0.1)"  },
    { label: "Pending",        value: totals.pending,  styleColor: "#fb923c",  styleBg: "rgba(251,146,60,0.1)"  },
    { label: "Expenses",       value: totals.expenses, styleColor: "#f87171",  styleBg: "rgba(239,68,68,0.1)"   },
    {
      label: "Est. Profit", value: totals.profit,
      styleColor: totals.profit >= 0 ? "#34d399" : "#f87171",
      styleBg:    totals.profit >= 0 ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)",
    },
  ], [totals]);

  const pfRows = useMemo(() => filtered.map(p => [
    p.project_name, p.project_code, p.client_name ?? "—",
    p.project_value ?? 0, p.total_invoiced, p.total_received,
    p.pending_amount, p.gst_amount, p.expenses, p.estimated_profit,
    p.invoice_count, p.payment_count,
  ]), [filtered]);

  const handleExportCSV   = useCallback(() => { exportCSV("project-finance", PF_HEADERS, pfRows); setExportOpen(false); }, [pfRows]);
  const handleExportXLSX  = useCallback(() => { exportXLSX("project-finance", PF_HEADERS, pfRows); setExportOpen(false); }, [pfRows]);
  const handleExportPDF   = useCallback(() => { exportPDF("project-finance", "Project Finance", PF_HEADERS, pfRows); setExportOpen(false); }, [pfRows]);
  const toggleExport      = useCallback(() => setExportOpen(x => !x), []);
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setPfSearch(e.target.value), []);

  return (
    <div className="p-4 space-y-4">
      {/* KPI strip */}
      <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
        {kpiItems.map(kpi => (
          <div key={kpi.label} className="skeuo-card p-4" style={{ background: kpi.styleBg }}>
            <p className="text-xs font-medium mb-1" style={{ color: "#9CA3AF" }}>{kpi.label}</p>
            <p className="text-lg font-bold" style={{ color: kpi.styleColor }}>{fmtShort(kpi.value)}</p>
          </div>
        ))}
      </div>

      <div className="skeuo-surface">
        {/* Toolbar */}
        <div className="p-4 flex items-center gap-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
          <div className="flex items-center gap-2 flex-1 rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(192,192,192,0.12)" }}>
            <Search className="w-4 h-4 shrink-0" style={{ color: "#6B7280" }} />
            <input
              value={pfSearch}
              onChange={handleSearchChange}
              placeholder="Search project or client..."
              className="bg-transparent text-sm outline-none flex-1"
              style={{ color: "#E5E7EB" }}
            />
          </div>
          <span className="text-xs whitespace-nowrap" style={{ color: "#6B7280" }}>{filtered.length} projects</span>
          <div className="relative">
            <button onClick={toggleExport}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl transition"
              style={{ color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.04)" }}>
              <Download className="w-3.5 h-3.5" />Export
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-10 rounded-xl shadow-lg z-20 py-1 min-w-30" style={{ background: "#1a2234", border: "1px solid rgba(192,192,192,0.12)", boxShadow: "0 8px 24px rgba(0,0,0,0.4)" }}>
                {([["CSV", handleExportCSV], ["Excel", handleExportXLSX], ["PDF", handleExportPDF]] as [string, () => void][]).map(([label, fn]) => (
                  <button key={label} onClick={fn}
                    className="w-full text-left px-3 py-2 text-xs transition" style={{ color: "#C0C0C0" }}
                    onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.05)")}
                    onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="py-14 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#8B5CF6" }} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                  {["Project", "Client", "Value", "Invoiced", "Received", "Pending", "GST", "Expenses", "Est. Profit", "Inv.", "Pay."].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide whitespace-nowrap" style={{ color: "#C0C0C0" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <motion.tr key={p.project_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }} className="transition-colors hover:bg-[rgba(124,58,237,0.07)]">
                    <td className="px-4 py-3.5">
                      <p className="font-semibold leading-tight" style={{ color: "#E5E7EB" }}>{p.project_name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>{p.project_code}</p>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap" style={{ color: "#9CA3AF" }}>{p.client_name ?? "—"}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap" style={{ color: "#C0C0C0" }}>{p.project_value != null ? fmtShort(p.project_value) : "—"}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap" style={{ color: "#C0C0C0" }}>{fmtShort(p.total_invoiced)}</td>
                    <td className="px-4 py-3.5 font-medium whitespace-nowrap" style={{ color: "#34d399" }}>{fmtShort(p.total_received)}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span style={{ color: p.pending_amount > 0 ? "#fb923c" : "#6B7280", fontWeight: p.pending_amount > 0 ? 600 : 400 }}>
                        {fmtShort(p.pending_amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap" style={{ color: "#9CA3AF" }}>{fmtShort(p.gst_amount)}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap" style={{ color: "#f87171" }}>{fmtShort(p.expenses)}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span style={{ color: p.estimated_profit >= 0 ? "#34d399" : "#f87171", fontWeight: 700 }}>
                        {fmtShort(p.estimated_profit)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center" style={{ color: "#9CA3AF" }}>{p.invoice_count}</td>
                    <td className="px-4 py-3.5 text-center" style={{ color: "#9CA3AF" }}>{p.payment_count}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-16 text-center text-sm" style={{ color: "#6B7280" }}>
                {pfSearch ? "No projects match your search." : "No projects found."}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

type ActiveModal =
  | { type: "auto-invoice" }
  | { type: "send"; invoice: Invoice }
  | { type: "pay"; invoice: Invoice }
  | { type: "detail"; invoice: Invoice }
  | { type: "settings" };

export default function FinancePage() {
  const [tab, setTab] = useState<FinanceTab>("income");
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatus | "all">("all");
  const [orgFilter, setOrgFilter] = useState<{ groupId: string | null; businessUnitId: string | null; startDate: string | null; endDate: string | null; }>({ groupId: null, businessUnitId: null, startDate: null, endDate: null });
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<ActiveModal | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const dSearch = useDebounce(search, 300);

  const { data: dashboard } = useQuery({
    queryKey: ["finance-dashboard"],
    queryFn: api.dashboard,
    staleTime: 60_000,
  });

  const { data: trends } = useQuery({
    queryKey: ["finance-trends", orgFilter],
    queryFn: () => api.trends(orgFilter),
    enabled: ["income", "expenses", "profit_loss", "cash_flow"].includes(tab),
  });

  const { data: allExpenses = [] } = useQuery({
    queryKey: ["expenses-all"],
    queryFn: () => api.expenses({}),
    enabled: tab === "expenses",
  });

  const { data: invoices = [], isLoading, isError } = useQuery({
    queryKey: ["invoices", invoiceStatus, dSearch],
    queryFn: () => api.invoices(invoiceStatus, dSearch),
    enabled: tab === "invoices" || tab === "income",
  });

  const { data: projectSummaries = [], isLoading: pfLoading } = useQuery({
    queryKey: ["project-finance-summary"],
    queryFn: () => apiClient.get<ProjectFinanceSummary[]>("/finance/projects/summary").then(r => r.data),
    enabled: tab === "project_finance",
    staleTime: 60_000,
  });

  // Stable callbacks — prevent unnecessary re-renders in memoized children
  const showToast    = useCallback((msg: string, type: "success" | "error" = "success") => setToast({ msg, type }), []);
  const closeModal   = useCallback(() => setModal(null), []);
  const openSettings = useCallback(() => setModal({ type: "settings" }), []);
  const openAutoInv  = useCallback(() => setModal({ type: "auto-invoice" }), []);
  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value), []);
  const closeToast   = useCallback(() => setToast(null), []);

  const openDetail = useCallback((inv: Invoice) => setModal({ type: "detail", invoice: inv }), []);
  const openSend   = useCallback((inv: Invoice) => setModal({ type: "send",   invoice: inv }), []);
  const openPay    = useCallback((inv: Invoice) => setModal({ type: "pay",    invoice: inv }), []);

  // Derive active invoice for sub-modals — memoized to avoid object churn
  const activeInvoice = useMemo(
    () => modal && (modal.type === "send" || modal.type === "pay" || modal.type === "detail") ? modal.invoice : null,
    [modal]
  );

  const handleExport = useCallback((format: "csv" | "xlsx" | "pdf") => {
    if (!trends || !trends.monthly_revenue) {
      showToast("No trend data available to export.", "error");
      return;
    }
    
    const headers = [
      "Month", "Revenue (Rs.)", "Expenses (Rs.)", "Net Profit (Rs.)",
      "Cash Inflow (Rs.)", "Cash Outflow (Rs.)", "Net Cash (Rs.)"
    ];
    
    const rows = trends.monthly_revenue.map((mr) => {
      const cf = trends.cash_flow?.find(c => c.month === mr.month) || { inflow: 0, outflow: 0, net_cash: 0 };
      return [
        mr.month,
        mr.revenue,
        mr.expenses,
        mr.profit,
        cf.inflow,
        cf.outflow,
        cf.net_cash
      ];
    });

    const filename = `Finance_Report_${orgFilter.startDate || "All"}_to_${orgFilter.endDate || "All"}`;
    
    if (format === "csv") exportCSV(filename, headers, rows);
    if (format === "xlsx") exportXLSX(filename, headers, rows);
    if (format === "pdf") exportPDF(filename, "Finance Report", headers, rows);
    
    showToast(`${format.toUpperCase()} report generated successfully.`);
  }, [trends, orgFilter, showToast]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#E5E7EB" }}>Finance</h1>
          <p className="text-sm" style={{ color: "#9CA3AF" }}>Invoices, GST, payments and financial performance</p>
        </div>

        {/* Org Filter (only for modules) */}
        {["income", "expenses", "profit_loss", "cash_flow", "accounts_receivable", "accounts_payable"].includes(tab) && (
          <div className="flex items-center gap-3">
            <OrgFilterBar 
              onFilterChange={(f) => setOrgFilter({ groupId: f.groupId, businessUnitId: f.businessUnitId, startDate: f.startDate, endDate: f.endDate })} 
            />
            {/* Export Dropdown / Buttons */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-800/30" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="px-2 text-xs font-semibold text-gray-400 flex items-center gap-1 border-r border-gray-700/50">
                <Download className="w-3.5 h-3.5" /> Export
              </div>
              {(["csv", "xlsx", "pdf"] as const).map(fmt => (
                <button
                  key={fmt}
                  onClick={() => handleExport(fmt)}
                  className="px-2 py-1 text-xs font-medium rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition"
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button onClick={openSettings}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl transition"
            style={{ color: "#9CA3AF", border: "1px solid rgba(255,255,255,0.1)" }}
            onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,255,255,0.05)")}
            onMouseLeave={e=>(e.currentTarget.style.background="transparent")}>
            <Settings className="w-4 h-4" />Settings
          </button>
          <button onClick={openAutoInv} className="flex items-center gap-2 px-4 py-2 text-sm premium-button-violet">
            <Plus className="w-4 h-4" />New Invoice
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="premium-surface p-2 flex gap-1.5 overflow-x-auto">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn("text-xs px-4 py-2.5 rounded-xl font-medium transition whitespace-nowrap flex items-center gap-2",
                tab === t.id
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-600/30"
                  : "text-gray-400 hover:text-gray-200 hover:bg-white/5")}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Finance Modules Views */}
      {tab === "income" && <IncomeView trends={trends} invoices={invoices} />}
      {tab === "expenses" && <ExpensesView trends={trends} expenses={allExpenses} />}
      {tab === "profit_loss" && <ProfitLossView trends={trends} />}
      {tab === "cash_flow" && <CashFlowView trends={trends} />}

      {tab === "accounts_receivable" && (
        <AccountsReceivableView 
          groupId={orgFilter.groupId} 
          businessUnitId={orgFilter.businessUnitId} 
          startDate={orgFilter.startDate} 
          endDate={orgFilter.endDate} 
        />
      )}

      {tab === "accounts_payable" && (
        <EmployeePayablesView 
          groupId={orgFilter.groupId} 
          businessUnitId={orgFilter.businessUnitId} 
          startDate={orgFilter.startDate} 
          endDate={orgFilter.endDate} 
        />
      )}

      {tab === "invoices" && (
        <div className="flex gap-2 p-1 rounded-xl bg-gray-800/30 w-max mb-4">
          {(["all", "draft", "sent", "partial", "paid", "overdue", "cancelled"] as const).map(s => (
            <button key={s} onClick={() => setInvoiceStatus(s)}
              className={cn("px-4 py-1.5 text-sm font-medium rounded-lg transition-all",
                invoiceStatus === s ? "bg-white/10 text-white shadow-sm" : "text-gray-400 hover:text-gray-200 hover:bg-white/5")}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      )}

      {/* KPI Cards (Only for Invoices or Project Finance) */}
      {["invoices", "project_finance"].includes(tab) && <KPISection dashboard={dashboard} />}

      {/* Charts */}
      {["invoices", "project_finance"].includes(tab) && <FinanceCharts dashboard={dashboard} setTab={setTab} />}

      {/* Invoice table / Project Finance */}
      {["invoices", "project_finance"].includes(tab) && (
        <div className="premium-surface">
        {/* Toolbar */}
        <div className="p-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {tab !== "project_finance" && (
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <div className="flex items-center gap-2 flex-1 min-w-50 rounded-xl px-3 py-2" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(192,192,192,0.12)" }}>
                <Search className="w-4 h-4" style={{ color: "#6B7280" }} />
                <input value={search} onChange={handleSearch} placeholder="Search by invoice number..."
                  className="bg-transparent text-sm outline-none flex-1" style={{ color: "#E5E7EB" }} />
                {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" style={{ color: "#8B5CF6" }} />}
              </div>
              <span className="text-xs" style={{ color: "#6B7280" }}>{invoices.length} invoices</span>
            </div>
          )}

        </div>

        {tab !== "project_finance" && (
          <InvoiceTable
            invoices={invoices}
            isLoading={isLoading}
            isError={isError}
            dSearch={dSearch}
            invoiceStatus={invoiceStatus}
            onDetail={openDetail}
            onSend={openSend}
            onPay={openPay}
          />
        )}

        {tab === "project_finance" && (
          <ProjectFinanceSection data={projectSummaries} isLoading={pfLoading} />
        )}
      </div>
      )}

      {/* Modals */}
      <AnimatePresence mode="wait">
        {modal?.type === "auto-invoice" && (
          <AutoInvoiceModal key="auto-invoice" onClose={closeModal} onSuccess={showToast} />
        )}
        {modal?.type === "settings" && (
          <SettingsModal key="settings" onClose={closeModal} onSuccess={showToast} />
        )}
        {modal?.type === "detail" && activeInvoice && (
          <InvoiceDetailModal key={`detail-${activeInvoice.id}`} invoice={activeInvoice}
            onClose={closeModal}
            onSend={() => setModal({ type: "send", invoice: activeInvoice })}
            onPay={() => setModal({ type: "pay", invoice: activeInvoice })} />
        )}
        {modal?.type === "send" && activeInvoice && (
          <SendModal key={`send-${activeInvoice.id}`} invoice={activeInvoice} onClose={closeModal} onSuccess={showToast} />
        )}
        {modal?.type === "pay" && activeInvoice && (
          <PaymentModal key={`pay-${activeInvoice.id}`} invoice={activeInvoice} onClose={closeModal} onSuccess={showToast} />
        )}
        {toast && (
          <Toast key="toast" msg={toast.msg} type={toast.type} onClose={closeToast} />
        )}
      </AnimatePresence>
    </div>
  );
}
