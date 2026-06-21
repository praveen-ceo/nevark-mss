"use client";

import { useEffect, useRef, useState } from "react";
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

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

const STATUSES = ["draft","sent","partial","paid","overdue","cancelled"] as const;
type InvoiceStatus = typeof STATUSES[number];

const api = {
  dashboard:       () => apiClient.get<FinanceDashboard>("/finance/dashboard").then(r => r.data),
  invoices:        (status: string, search: string) =>
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
  draft:     { label: "Draft",     style: "bg-gray-100 text-gray-600",       dot: "bg-gray-400"    },
  sent:      { label: "Sent",      style: "bg-blue-100 text-blue-700",       dot: "bg-blue-500"    },
  partial:   { label: "Partial",   style: "bg-amber-100 text-amber-700",     dot: "bg-amber-500"   },
  paid:      { label: "Paid",      style: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  overdue:   { label: "Overdue",   style: "bg-red-100 text-red-700",         dot: "bg-red-500"     },
  cancelled: { label: "Cancelled", style: "bg-slate-100 text-slate-500",     dot: "bg-slate-400"   },
};

const TAB_LIST = [
  { key: "all",      label: "All"       },
  { key: "draft",    label: "Draft"     },
  { key: "sent",     label: "Sent"      },
  { key: "partial",  label: "Partial"   },
  { key: "paid",     label: "Paid"      },
  { key: "overdue",  label: "Overdue"   },
  { key: "cancelled",       label: "Cancelled"       },
  { key: "project_finance", label: "Project Finance" },
];

const inputCls = "w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900 placeholder-gray-400";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number | null | undefined, currency = "INR"): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(n);
}

function fmtShort(n: number | null | undefined): string {
  if (n == null) return "—";
  if (n >= 1_00_00_000) return `₹${(n / 1_00_00_000).toFixed(1)}Cr`;
  if (n >= 1_00_000)    return `₹${(n / 1_00_000).toFixed(1)}L`;
  if (n >= 1000)        return `₹${(n / 1000).toFixed(0)}K`;
  return `₹${n}`;
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      className={cn("fixed bottom-6 right-6 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
        type === "success" ? "bg-emerald-600" : "bg-red-600")}>
      {type === "success" ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
      {msg}
      <button onClick={onClose} className="ml-1 opacity-75 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Modal shell
// ---------------------------------------------------------------------------

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.18 }}
        className={cn("relative bg-white rounded-2xl shadow-2xl w-full max-h-[90vh] overflow-y-auto",
          wide ? "max-w-2xl" : "max-w-lg")}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Auto-Invoice Modal
// ---------------------------------------------------------------------------

function AutoInvoiceModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (m: string) => void }) {
  const qc = useQueryClient();
  const [selectedId, setSelectedId] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ["projects-completed"],
    queryFn: () => api.projects(),
    staleTime: 30_000,
  });

  const completed = projects.filter(p => p.status === "completed" && p.client && p.budget);

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
        <p className="mt-3 text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
          No eligible projects found. A project must be Completed with a client and budget assigned.
        </p>
      )}
      {err && <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition">Cancel</button>
        <button onClick={() => mut.mutate()} disabled={mut.isPending || !selectedId}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">
          {mut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Generate Invoice
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Send Invoice Modal
// ---------------------------------------------------------------------------

function SendModal({ invoice, onClose, onSuccess }: { invoice: Invoice; onClose: () => void; onSuccess: (m: string) => void }) {
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
        <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
          <SendHorizonal className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">Mark {invoice.invoice_number} as Sent?</p>
          <p className="text-sm text-gray-500 mt-1">Status will change from Draft → Sent. This cannot be undone.</p>
        </div>
        <div className="w-full bg-gray-50 rounded-xl px-4 py-3 text-left text-sm space-y-1">
          <div className="flex justify-between"><span className="text-gray-500">Client</span><span className="font-medium">{invoice.client?.name ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Amount</span><span className="font-semibold text-gray-900">{fmt(invoice.total_amount, invoice.currency)}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Due</span><span className="font-medium">{invoice.due_date}</span></div>
        </div>
      </div>
      {err && <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
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
}

// ---------------------------------------------------------------------------
// Record Payment Modal
// ---------------------------------------------------------------------------

const PAYMENT_METHODS = ["bank_transfer", "credit_card", "cash", "cheque", "online"] as const;

function PaymentModal({ invoice, onClose, onSuccess }: { invoice: Invoice; onClose: () => void; onSuccess: (m: string) => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ amount: "", payment_date: new Date().toISOString().slice(0, 10), payment_method: "bank_transfer", reference: "" });
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));
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
      <div className="bg-blue-50 rounded-xl px-4 py-3 mb-5 flex justify-between text-sm">
        <span className="text-gray-600">Outstanding</span>
        <span className="font-bold text-blue-700">{fmt(outstanding, invoice.currency)}</span>
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
      {err && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition">Cancel</button>
        <button onClick={() => mut.mutate()} disabled={mut.isPending || !form.amount || parseFloat(form.amount) <= 0}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition">
          {mut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Record Payment
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Invoice Detail Modal
// ---------------------------------------------------------------------------

function InvoiceDetailModal({ invoice, onClose, onSend, onPay }: {
  invoice: Invoice; onClose: () => void; onSend: () => void; onPay: () => void;
}) {
  const { data: settings } = useQuery({ queryKey: ["finance-settings"], queryFn: api.settings, staleTime: 300_000 });
  const [pdfLoading, setPdfLoading] = useState(false);

  async function handleDownloadPdf() {
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
  }

  const cfg = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG.draft;
  const outstanding = invoice.outstanding_amount ?? (invoice.total_amount - invoice.paid_amount);
  const isIntrastate = invoice.supply_type === "intrastate";

  return (
    <Modal title={`Invoice — ${invoice.invoice_number}`} onClose={onClose} wide>
      <div className="space-y-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-lg font-bold text-gray-900">{invoice.client?.name ?? "—"}</p>
            {invoice.project && <p className="text-sm text-gray-500 mt-0.5">{invoice.project.name} ({invoice.project.code})</p>}
            {invoice.gstin && <p className="text-xs text-gray-400 mt-0.5">GSTIN: {invoice.gstin}</p>}
          </div>
          <span className={cn("text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5", cfg.style)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />{cfg.label}
          </span>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-3 gap-3">
          {[["Issued", invoice.issue_date], ["Due", invoice.due_date], ["Place of Supply", invoice.place_of_supply ?? "—"]].map(([l, v]) => (
            <div key={l} className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-0.5">{l}</p>
              <p className="text-sm font-semibold text-gray-800">{v}</p>
            </div>
          ))}
        </div>

        {/* Items */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Line Items</p>
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>{["Description", "Qty", "Unit Price", "Amount"].map(h => (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {invoice.items.map(item => (
                  <tr key={item.id} className="border-t border-gray-100">
                    <td className="px-3 py-2.5 text-gray-700">{item.description}</td>
                    <td className="px-3 py-2.5 text-gray-500">{item.quantity}</td>
                    <td className="px-3 py-2.5 text-gray-500">{fmt(item.unit_price, invoice.currency)}</td>
                    <td className="px-3 py-2.5 font-semibold text-gray-900">{fmt(item.amount, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-medium">{fmt(invoice.subtotal, invoice.currency)}</span></div>
          {invoice.discount_amount > 0 && <div className="flex justify-between text-red-600"><span>Discount</span><span>-{fmt(invoice.discount_amount, invoice.currency)}</span></div>}
          {isIntrastate ? (
            <>
              <div className="flex justify-between text-gray-500"><span>CGST ({invoice.cgst_rate}%)</span><span>{fmt(invoice.cgst_amount, invoice.currency)}</span></div>
              <div className="flex justify-between text-gray-500"><span>SGST ({invoice.sgst_rate}%)</span><span>{fmt(invoice.sgst_amount, invoice.currency)}</span></div>
            </>
          ) : (
            <div className="flex justify-between text-gray-500"><span>IGST ({invoice.igst_rate}%)</span><span>{fmt(invoice.igst_amount, invoice.currency)}</span></div>
          )}
          <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-2">
            <span>Total</span><span>{fmt(invoice.total_amount, invoice.currency)}</span>
          </div>
          <div className="flex justify-between text-emerald-600"><span>Paid</span><span>{fmt(invoice.paid_amount, invoice.currency)}</span></div>
          <div className="flex justify-between font-semibold text-blue-700"><span>Outstanding</span><span>{fmt(outstanding, invoice.currency)}</span></div>
        </div>

        {/* Payments history */}
        {invoice.payments.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Payments Received</p>
            <div className="space-y-1.5">
              {invoice.payments.map(p => (
                <div key={p.id} className="flex justify-between items-center bg-emerald-50 rounded-lg px-3 py-2 text-sm">
                  <span className="text-gray-600">{p.payment_date} · {p.payment_method.replace(/_/g, " ")}</span>
                  <span className="font-semibold text-emerald-700">{fmt(p.amount, invoice.currency)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          {invoice.status === "draft" && (
            <button onClick={onSend}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition">
              <SendHorizonal className="w-4 h-4" />Send Invoice
            </button>
          )}
          {["sent", "partial", "overdue"].includes(invoice.status) && (
            <button onClick={onPay}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition">
              <CreditCard className="w-4 h-4" />Record Payment
            </button>
          )}
          <button
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {pdfLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {pdfLoading ? "Generating…" : "Download PDF"}
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition ml-auto">Close</button>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Settings Panel
// ---------------------------------------------------------------------------

function SettingsModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (m: string) => void }) {
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

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));

  const sections: Array<{ title: string; fields: Array<{ key: string; label: string; placeholder?: string }> }> = [
    {
      title: "Company", fields: [
        { key: "company_name", label: "Company Name", placeholder: "Nevark Solutions Pvt Ltd" },
        { key: "company_gstin", label: "Company GSTIN", placeholder: "33XXXXX0000X1Z5" },
        { key: "state_code", label: "State Code (for GST)", placeholder: "33" },
      ],
    },
    {
      title: "GST Rates", fields: [
        { key: "cgst_rate", label: "CGST Rate (%)", placeholder: "9" },
        { key: "sgst_rate", label: "SGST Rate (%)", placeholder: "9" },
        { key: "igst_rate", label: "IGST Rate (%)", placeholder: "18" },
      ],
    },
    {
      title: "Bank Details", fields: [
        { key: "bank_name", label: "Bank Name" },
        { key: "bank_account", label: "Account Number" },
        { key: "bank_ifsc", label: "IFSC Code" },
      ],
    },
    {
      title: "Invoice Settings", fields: [
        { key: "invoice_prefix", label: "Invoice Prefix", placeholder: "NVK" },
        { key: "default_sac", label: "Default SAC Code", placeholder: "998314" },
        { key: "payment_terms", label: "Payment Terms (days)", placeholder: "30" },
      ],
    },
  ];

  return (
    <Modal title="Finance Settings" onClose={onClose} wide>
      <div className="space-y-6">
        {sections.map(sec => (
          <div key={sec.title}>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">{sec.title}</p>
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
      {err && <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition">Cancel</button>
        <button onClick={() => mut.mutate()} disabled={mut.isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">
          {mut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Settings
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Project Finance Section (skeuo-styled, lazy-loaded when tab === "project_finance")
// ---------------------------------------------------------------------------

function ProjectFinanceSection({ data, isLoading }: { data: ProjectFinanceSummary[]; isLoading: boolean }) {
  const [pfSearch, setPfSearch] = useState("");
  const [exportOpen, setExportOpen] = useState(false);

  const filtered = pfSearch
    ? data.filter(p =>
        p.project_name.toLowerCase().includes(pfSearch.toLowerCase()) ||
        p.project_code.toLowerCase().includes(pfSearch.toLowerCase()) ||
        (p.client_name ?? "").toLowerCase().includes(pfSearch.toLowerCase())
      )
    : data;

  const totalValue    = data.reduce((s, p) => s + (p.project_value ?? 0), 0);
  const totalInvoiced = data.reduce((s, p) => s + p.total_invoiced, 0);
  const totalReceived = data.reduce((s, p) => s + p.total_received, 0);
  const totalPending  = data.reduce((s, p) => s + p.pending_amount, 0);
  const totalExpenses = data.reduce((s, p) => s + p.expenses, 0);
  const totalProfit   = data.reduce((s, p) => s + p.estimated_profit, 0);

  const PF_HEADERS = [
    "Project", "Code", "Client", "Value (Rs.)", "Invoiced (Rs.)",
    "Received (Rs.)", "Pending (Rs.)", "GST (Rs.)", "Expenses (Rs.)",
    "Est. Profit (Rs.)", "Invoices", "Payments",
  ];
  const pfRows = () => filtered.map(p => [
    p.project_name, p.project_code, p.client_name ?? "—",
    p.project_value ?? 0, p.total_invoiced, p.total_received,
    p.pending_amount, p.gst_amount, p.expenses, p.estimated_profit,
    p.invoice_count, p.payment_count,
  ]);

  const KPI_ITEMS = [
    { label: "Project Value",  value: totalValue,    color: "text-blue-700",    bg: "bg-gradient-to-br from-blue-50 to-blue-100/60"     },
    { label: "Total Invoiced", value: totalInvoiced, color: "text-indigo-700",  bg: "bg-gradient-to-br from-indigo-50 to-indigo-100/60"  },
    { label: "Received",       value: totalReceived, color: "text-emerald-700", bg: "bg-gradient-to-br from-emerald-50 to-emerald-100/60" },
    { label: "Pending",        value: totalPending,  color: "text-amber-700",   bg: "bg-gradient-to-br from-amber-50 to-amber-100/60"    },
    { label: "Expenses",       value: totalExpenses, color: "text-red-700",     bg: "bg-gradient-to-br from-red-50 to-red-100/60"        },
    {
      label: "Est. Profit", value: totalProfit,
      color: totalProfit >= 0 ? "text-emerald-700" : "text-red-700",
      bg: totalProfit >= 0 ? "bg-gradient-to-br from-emerald-50 to-emerald-100/60" : "bg-gradient-to-br from-red-50 to-red-100/60",
    },
  ];

  return (
    <div className="p-4 space-y-4">
      {/* KPI strip — skeuo-card applied to each */}
      <div className="grid grid-cols-2 xl:grid-cols-6 gap-3">
        {KPI_ITEMS.map(kpi => (
          <div key={kpi.label} className={cn("skeuo-card p-4", kpi.bg)}>
            <p className="text-xs text-gray-500 font-medium mb-1">{kpi.label}</p>
            <p className={cn("text-lg font-bold", kpi.color)}>{fmtShort(kpi.value)}</p>
          </div>
        ))}
      </div>

      {/* Table — skeuo-surface wrapper */}
      <div className="skeuo-surface">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200/60 flex items-center gap-3 bg-white/60">
          <div className="flex items-center gap-2 flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              value={pfSearch}
              onChange={e => setPfSearch(e.target.value)}
              placeholder="Search project or client..."
              className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none flex-1"
            />
          </div>
          <span className="text-xs text-gray-400 whitespace-nowrap">{filtered.length} projects</span>
          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportOpen(x => !x)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition bg-white"
            >
              <Download className="w-3.5 h-3.5" />Export
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 min-w-[120px]">
                {([
                  ["CSV",   () => { exportCSV("project-finance", PF_HEADERS, pfRows()); setExportOpen(false); }],
                  ["Excel", () => { exportXLSX("project-finance", PF_HEADERS, pfRows()); setExportOpen(false); }],
                  ["PDF",   () => { exportPDF("project-finance", PF_HEADERS, pfRows()); setExportOpen(false); }],
                ] as [string, () => void][]).map(([label, fn]) => (
                  <button key={label} onClick={fn}
                    className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition">
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="py-14 flex justify-center">
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200/70">
                  {["Project", "Client", "Value", "Invoiced", "Received", "Pending", "GST", "Expenses", "Est. Profit", "Inv.", "Pay."].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <motion.tr
                    key={p.project_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-gray-100/80 hover:bg-white/80 transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <p className="font-semibold text-gray-900 leading-tight">{p.project_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{p.project_code}</p>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600 whitespace-nowrap">{p.client_name ?? "—"}</td>
                    <td className="px-4 py-3.5 text-gray-700 whitespace-nowrap">{p.project_value != null ? fmtShort(p.project_value) : "—"}</td>
                    <td className="px-4 py-3.5 text-gray-700 whitespace-nowrap">{fmtShort(p.total_invoiced)}</td>
                    <td className="px-4 py-3.5 text-emerald-700 font-medium whitespace-nowrap">{fmtShort(p.total_received)}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={p.pending_amount > 0 ? "text-amber-600 font-semibold" : "text-gray-400"}>
                        {fmtShort(p.pending_amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500 whitespace-nowrap">{fmtShort(p.gst_amount)}</td>
                    <td className="px-4 py-3.5 text-red-600 whitespace-nowrap">{fmtShort(p.expenses)}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={p.estimated_profit >= 0 ? "text-emerald-700 font-bold" : "text-red-600 font-bold"}>
                        {fmtShort(p.estimated_profit)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center text-gray-500">{p.invoice_count}</td>
                    <td className="px-4 py-3.5 text-center text-gray-500">{p.payment_count}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-16 text-center text-gray-400 text-sm">
                {pfSearch ? "No projects match your search." : "No projects found."}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

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
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [dSearch, setDSearch] = useState("");
  const [modal, setModal] = useState<ActiveModal | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setDSearch(search), 400);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [search]);

  const { data: dashboard } = useQuery({
    queryKey: ["finance-dashboard"],
    queryFn: api.dashboard,
    staleTime: 60_000,
  });

  const { data: invoices = [], isLoading, isError } = useQuery({
    queryKey: ["invoices", tab, dSearch],
    queryFn: () => api.invoices(tab, dSearch),
    enabled: tab !== "project_finance",
  });

  const { data: projectSummaries = [], isLoading: pfLoading } = useQuery({
    queryKey: ["project-finance-summary"],
    queryFn: () => apiClient.get<ProjectFinanceSummary[]>("/finance/projects/summary").then(r => r.data),
    enabled: tab === "project_finance",
    staleTime: 60_000,
  });

  const showToast = (msg: string, type: "success" | "error" = "success") => setToast({ msg, type });

  // Derive active invoice safely for sub-modals
  const activeInvoice = modal && (modal.type === "send" || modal.type === "pay" || modal.type === "detail")
    ? modal.invoice : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Finance</h1>
          <p className="text-sm text-gray-500">Invoices, GST, payments and financial performance</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setModal({ type: "settings" })}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition">
            <Settings className="w-4 h-4" />Settings
          </button>
          <button onClick={() => setModal({ type: "auto-invoice" })}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition shadow-sm">
            <Plus className="w-4 h-4" />New Invoice
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        <KpiCard label="Revenue Collected" value={fmtShort(dashboard?.revenue_collected)} icon={BadgeDollarSign} color="emerald" index={0} />
        <KpiCard label="Expenses"          value={fmtShort(dashboard?.total_expenses)}    icon={TrendingDown}    color="red"     index={1} />
        <KpiCard label="Net Profit"        value={fmtShort(dashboard?.net_profit)}        icon={TrendingUp}      color="blue"    index={2} />
        <KpiCard label="Pending"           value={fmtShort(dashboard?.pending_amount)}    icon={CreditCard}      color="orange"  index={3}
          subtitle={dashboard ? `${dashboard.sent_count} invoices` : undefined} />
        <KpiCard label="Overdue"           value={fmtShort(dashboard?.overdue_amount)}    icon={Wallet}          color="red"     index={4}
          subtitle={dashboard ? `${dashboard.overdue_count} invoices` : undefined} />
      </div>

      {/* Summary cards + chart */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Invoice summary grid */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Invoice Summary</h3>
          <div className="grid grid-cols-2 gap-3">
            {(["draft","sent","paid","overdue"] as const).map(s => {
              const cfg = STATUS_CONFIG[s];
              const count = s === "draft" ? dashboard?.draft_count
                : s === "sent" ? dashboard?.sent_count
                : s === "paid" ? dashboard?.paid_count
                : dashboard?.overdue_count;
              return (
                <button key={s} onClick={() => setTab(s)}
                  className={cn("rounded-xl p-3.5 text-left transition hover:opacity-90", cfg.style)}>
                  <p className="text-xs font-bold uppercase tracking-wide">{cfg.label}</p>
                  <p className="text-2xl font-bold mt-1">{count ?? "—"}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Recharts bar — static placeholder since API has no monthly data endpoint */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-gray-900">Revenue vs Expenses</h3>
            <p className="text-xs text-gray-400">Live aggregates (monthly breakdown in V2)</p>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-2">
            {[
              { label: "Collected", value: dashboard?.revenue_collected, color: "text-emerald-600" },
              { label: "Expenses",  value: dashboard?.total_expenses,    color: "text-red-600"     },
              { label: "Net",       value: dashboard?.net_profit,        color: "text-blue-600"    },
            ].map(item => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-400 mb-1">{item.label}</p>
                <p className={cn("text-lg font-bold", item.color)}>{fmtShort(item.value)}</p>
              </div>
            ))}
          </div>
          {/* Mini bar for visual: draft / sent / paid / overdue counts */}
          {dashboard && (
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={[
                  { name: "Draft",   count: dashboard.draft_count },
                  { name: "Sent",    count: dashboard.sent_count  },
                  { name: "Paid",    count: dashboard.paid_count  },
                  { name: "Overdue", count: dashboard.overdue_count },
                ]} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}
                    fill="#3b82f6"
                    label={false}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Invoice table / Project Finance */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100">
          {tab !== "project_finance" && (
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by invoice number..."
                className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none flex-1" />
              {isLoading && <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin flex-shrink-0" />}
            </div>
            <span className="text-xs text-gray-400">{invoices.length} invoices</span>
          </div>
          )}
          <div className="flex gap-1.5 overflow-x-auto">
            {TAB_LIST.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap flex items-center gap-1",
                  tab === t.key ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100",
                  t.key === "project_finance" && tab !== t.key ? "border border-blue-200 text-blue-700 hover:bg-blue-50" : ""
                )}>
                {t.key === "project_finance" && <BarChart3 className="w-3 h-3" />}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {tab !== "project_finance" && isError && (
          <div className="p-6 flex items-center gap-3 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">Failed to load invoices. Check backend is running.</p>
          </div>
        )}

        {tab !== "project_finance" && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Invoice", "Client", "Project", "Items", "Subtotal", "GST", "Total", "Outstanding", "Status", "Due", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => {
                const cfg = STATUS_CONFIG[inv.status] ?? STATUS_CONFIG.draft;
                const outstanding = inv.outstanding_amount ?? (inv.total_amount - inv.paid_amount);
                return (
                  <motion.tr key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setModal({ type: "detail", invoice: inv })}>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-mono text-sm font-semibold text-gray-800">{inv.invoice_number}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-700 font-medium whitespace-nowrap">{inv.client?.name ?? "—"}</td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs whitespace-nowrap">{inv.project?.code ?? "—"}</td>
                    <td className="px-4 py-3.5 text-gray-500">{inv.items.length}</td>
                    <td className="px-4 py-3.5 text-gray-700 whitespace-nowrap">{fmt(inv.subtotal, inv.currency)}</td>
                    <td className="px-4 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                      {inv.supply_type === "intrastate"
                        ? `C+S ${inv.cgst_rate}%+${inv.sgst_rate}%`
                        : inv.igst_rate ? `IGST ${inv.igst_rate}%` : "—"}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-gray-900 whitespace-nowrap">{fmt(inv.total_amount, inv.currency)}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={cn("font-semibold", outstanding > 0 ? "text-amber-600" : "text-gray-400")}>
                        {fmt(outstanding, inv.currency)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={cn("text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1 w-fit", cfg.style)}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />{cfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs whitespace-nowrap">
                      <span className={cn(inv.status === "overdue" ? "text-red-600 font-semibold" : "text-gray-500")}>{inv.due_date}</span>
                    </td>
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        {inv.status === "draft" && (
                          <button onClick={() => setModal({ type: "send", invoice: inv })}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap flex items-center gap-1">
                            <SendHorizonal className="w-3 h-3" />Send
                          </button>
                        )}
                        {["sent", "partial", "overdue"].includes(inv.status) && (
                          <button onClick={() => setModal({ type: "pay", invoice: inv })}
                            className="text-xs text-emerald-600 hover:text-emerald-700 font-medium whitespace-nowrap flex items-center gap-1">
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
            <div className="py-16 text-center text-gray-400 text-sm">
              {dSearch || tab !== "all" ? "No invoices match your filters." : "No invoices yet. Generate one from a completed project."}
            </div>
          )}
        </div>
        )}

        {tab === "project_finance" && (
          <ProjectFinanceSection data={projectSummaries} isLoading={pfLoading} />
        )}
      </div>

      {/* Modals */}
      <AnimatePresence mode="wait">
        {modal?.type === "auto-invoice" && (
          <AutoInvoiceModal key="auto-invoice" onClose={() => setModal(null)} onSuccess={showToast} />
        )}
        {modal?.type === "settings" && (
          <SettingsModal key="settings" onClose={() => setModal(null)} onSuccess={showToast} />
        )}
        {modal?.type === "detail" && activeInvoice && (
          <InvoiceDetailModal key={`detail-${activeInvoice.id}`} invoice={activeInvoice}
            onClose={() => setModal(null)}
            onSend={() => setModal({ type: "send", invoice: activeInvoice })}
            onPay={() => setModal({ type: "pay", invoice: activeInvoice })} />
        )}
        {modal?.type === "send" && activeInvoice && (
          <SendModal key={`send-${activeInvoice.id}`} invoice={activeInvoice} onClose={() => setModal(null)} onSuccess={showToast} />
        )}
        {modal?.type === "pay" && activeInvoice && (
          <PaymentModal key={`pay-${activeInvoice.id}`} invoice={activeInvoice} onClose={() => setModal(null)} onSuccess={showToast} />
        )}
        {toast && (
          <Toast key="toast" msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
