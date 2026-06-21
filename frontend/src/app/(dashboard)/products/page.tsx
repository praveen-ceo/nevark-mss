"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import type { AxiosError } from "axios";

// ---------------------------------------------------------------------------
// API error normaliser
// ---------------------------------------------------------------------------
function getApiErrorMessage(err: AxiosError<{ detail: unknown }>): string {
  const detail = err.response?.data?.detail;
  if (!detail) return err.message || "An unexpected error occurred.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    // FastAPI validation errors: [{type, loc, msg, input, ctx}, ...]
    return detail
      .map((d: { msg?: string; loc?: string[] }) => {
        const loc  = Array.isArray(d.loc) ? d.loc.filter(l => l !== "body").join(".") : "";
        const msg  = d.msg ?? "invalid";
        return loc ? `${loc}: ${msg}` : msg;
      })
      .join(" | ");
  }
  if (typeof detail === "object") {
    try { return JSON.stringify(detail); } catch { return "Validation error."; }
  }
  return "An unexpected error occurred.";
}
import {
  AlertCircle, CheckCircle2, ChevronDown, Download,
  Loader2, Package, Pencil, Plus, Search, Trash2, X,
} from "lucide-react";
import { exportCSV, exportXLSX, exportPDF } from "@/lib/export";
import { apiClient } from "@/lib/api/client";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ProductCategory = "technologies" | "fashion_boutiques" | "logistics" | "foods" | "systems";
type ProductStream   = "b2b" | "b2c" | "saas" | "marketplace" | "services" | "other";
type ProductStatus   = "active" | "inactive" | "discontinued" | "upcoming" | "beta";

interface ProductOwner { id: string; first_name: string; last_name: string; job_title: string | null; }

interface Product {
  id: string;
  name: string;
  product_code: string;
  category: ProductCategory;
  stream: ProductStream;
  status: ProductStatus;
  description: string | null;
  launch_date: string | null;
  revenue_generated: number | null;
  units_sold: number | null;
  active_units: number | null;
  total_customers: number | null;
  product_owner_id: string | null;
  product_owner: ProductOwner | null;
  is_active: boolean;
}

interface CategoryStat { category: ProductCategory; label: string; total: number; active: number; revenue: number | null; }
interface ProductStats {
  total_products: number; active_products: number;
  total_customers: number; total_revenue: number | null;
  by_category: CategoryStat[];
}

type ProductCreate = Omit<Product, "id" | "is_active" | "product_owner"> & { product_owner_id: string };
type ProductUpdate = Partial<ProductCreate>;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES: { value: ProductCategory; label: string; color: string }[] = [
  { value: "technologies",      label: "NEVARK Technologies",        color: "bg-blue-500"    },
  { value: "fashion_boutiques", label: "NEVARK Fashion & Boutiques", color: "bg-pink-500"    },
  { value: "logistics",         label: "NEVARK Logistics",           color: "bg-orange-500"  },
  { value: "foods",             label: "NEVARK Foods",               color: "bg-emerald-500" },
  { value: "systems",           label: "NEVARK Systems",             color: "bg-purple-500"  },
];

const STREAMS: ProductStream[] = ["b2b","b2c","saas","marketplace","services","other"];

const STATUSES: { value: ProductStatus; label: string; cls: string }[] = [
  { value: "active",       label: "Active",       cls: "bg-emerald-100 text-emerald-700" },
  { value: "inactive",     label: "Inactive",     cls: "bg-gray-100 text-gray-600"       },
  { value: "discontinued", label: "Discontinued", cls: "bg-red-100 text-red-700"         },
  { value: "upcoming",     label: "Upcoming",     cls: "bg-yellow-100 text-yellow-700"   },
  { value: "beta",         label: "Beta",         cls: "bg-indigo-100 text-indigo-700"   },
];

const REVENUE_ROLES = new Set(["super_admin","admin","ceo","cto","cfo","manager","finance_manager"]);

const EMPTY_FORM: ProductCreate = {
  name: "", product_code: "", category: "technologies", stream: "b2b",
  status: "active", description: "", launch_date: "",
  revenue_generated: null, units_sold: null, active_units: null,
  total_customers: null, product_owner_id: "",
};

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------

const api = {
  list:   (params?: object) => apiClient.get<Product[]>("/products", { params }).then(r => r.data),
  stats:  () => apiClient.get<ProductStats>("/products/stats").then(r => r.data),
  create: (d: ProductCreate) => apiClient.post<Product>("/products", d).then(r => r.data),
  update: (id: string, d: ProductUpdate) => apiClient.put<Product>(`/products/${id}`, d).then(r => r.data),
  remove: (id: string) => apiClient.delete(`/products/${id}`),
};

// ---------------------------------------------------------------------------
// Tiny helpers
// ---------------------------------------------------------------------------

function fmt(n: number | null | undefined, prefix = ""): string {
  if (n == null) return "—";
  return prefix + new Intl.NumberFormat("en-IN").format(n);
}

function catMeta(v: ProductCategory) { return CATEGORIES.find(c => c.value === v)!; }
function statusMeta(v: ProductStatus) { return STATUSES.find(s => s.value === v)!; }

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

interface ToastState { msg: string; type: "success" | "error"; }
function Toast({ msg, type, onClose }: ToastState & { onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      className={cn(
        "fixed bottom-6 right-6 z-[200] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
        type === "success" ? "bg-emerald-600" : "bg-red-600"
      )}
    >
      {type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {msg}
      <button onClick={onClose}><X className="w-3.5 h-3.5 ml-1 opacity-75" /></button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Modal wrapper
// ---------------------------------------------------------------------------

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.15 }}
        className={cn(
          "relative bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto",
          wide ? "w-full max-w-2xl" : "w-full max-w-xl"
        )}
      >
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

const inputCls = "w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 placeholder-gray-400 transition";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Product Form (shared by Add + Edit)
// ---------------------------------------------------------------------------

function ProductForm({
  form, setForm, showRevenue,
}: {
  form: ProductCreate;
  setForm: React.Dispatch<React.SetStateAction<ProductCreate>>;
  showRevenue: boolean;
}) {
  const set = (k: keyof ProductCreate) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value || null }));

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Identity */}
      <div className="col-span-2">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Identity</p>
      </div>
      <Field label="Product Name" required>
        <input value={form.name ?? ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nevark Cloud" className={inputCls} />
      </Field>
      <Field label="Product Code" required>
        <input value={form.product_code ?? ""} onChange={e => setForm(f => ({ ...f, product_code: e.target.value }))} placeholder="NTK-001" className={inputCls} />
      </Field>
      <Field label="Category" required>
        <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value as ProductCategory }))} className={inputCls}>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </Field>
      <Field label="Stream" required>
        <select value={form.stream} onChange={e => setForm(f => ({ ...f, stream: e.target.value as ProductStream }))} className={inputCls}>
          {STREAMS.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
        </select>
      </Field>
      <Field label="Status" required>
        <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ProductStatus }))} className={inputCls}>
          {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </Field>
      <Field label="Launch Date">
        <input type="date" value={form.launch_date ?? ""} onChange={set("launch_date")} className={inputCls} />
      </Field>
      <div className="col-span-2">
        <Field label="Description">
          <textarea value={form.description ?? ""} onChange={e => setForm(f => ({ ...f, description: e.target.value || null }))} rows={2} className={inputCls + " resize-none"} placeholder="Brief product description..." />
        </Field>
      </div>

      {/* Metrics */}
      <div className="col-span-2 pt-2">
        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">Metrics</p>
      </div>
      <Field label="Units Sold">
        <input type="number" min="0" value={form.units_sold ?? ""} onChange={e => setForm(f => ({ ...f, units_sold: e.target.value ? parseInt(e.target.value) : null }))} className={inputCls} placeholder="0" />
      </Field>
      <Field label="Active Units">
        <input type="number" min="0" value={form.active_units ?? ""} onChange={e => setForm(f => ({ ...f, active_units: e.target.value ? parseInt(e.target.value) : null }))} className={inputCls} placeholder="0" />
      </Field>
      <Field label="Total Customers">
        <input type="number" min="0" value={form.total_customers ?? ""} onChange={e => setForm(f => ({ ...f, total_customers: e.target.value ? parseInt(e.target.value) : null }))} className={inputCls} placeholder="0" />
      </Field>
      {showRevenue && (
        <Field label="Revenue Generated (₹)">
          <input type="number" min="0" step="0.01" value={form.revenue_generated ?? ""} onChange={e => setForm(f => ({ ...f, revenue_generated: e.target.value ? parseFloat(e.target.value) : null }))} className={inputCls} placeholder="0.00" />
        </Field>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Modal
// ---------------------------------------------------------------------------

function AddModal({ onClose, showRevenue, onSuccess }: { onClose: () => void; showRevenue: boolean; onSuccess: (m: string) => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<ProductCreate>({ ...EMPTY_FORM });
  const [err, setErr] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () => api.create({
      ...form,
      product_owner_id: form.product_owner_id?.trim() ? form.product_owner_id : null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); qc.invalidateQueries({ queryKey: ["products-stats"] }); onSuccess("Product created"); onClose(); },
    onError: (e: AxiosError<{ detail: unknown }>) => setErr(getApiErrorMessage(e)),
  });

  return (
    <Modal title="Add Product" onClose={onClose} wide>
      <ProductForm form={form} setForm={setForm} showRevenue={showRevenue} />
      {err && <p className="mt-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition">Cancel</button>
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending || !form.name || !form.product_code}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {mut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Create Product
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Edit Modal
// ---------------------------------------------------------------------------

function EditModal({ product, onClose, showRevenue, onSuccess }: { product: Product; onClose: () => void; showRevenue: boolean; onSuccess: (m: string) => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<ProductCreate>({
    name: product.name, product_code: product.product_code,
    category: product.category, stream: product.stream, status: product.status,
    description: product.description, launch_date: product.launch_date,
    revenue_generated: product.revenue_generated, units_sold: product.units_sold,
    active_units: product.active_units, total_customers: product.total_customers,
    product_owner_id: product.product_owner_id ?? "",
  });
  const [err, setErr] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: () => api.update(product.id, {
      ...form,
      product_owner_id: form.product_owner_id?.trim() ? form.product_owner_id : null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); qc.invalidateQueries({ queryKey: ["products-stats"] }); onSuccess("Product updated"); onClose(); },
    onError: (e: AxiosError<{ detail: unknown }>) => setErr(getApiErrorMessage(e)),
  });

  return (
    <Modal title={`Edit — ${product.name}`} onClose={onClose} wide>
      <ProductForm form={form} setForm={setForm} showRevenue={showRevenue} />
      {err && <p className="mt-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition">Cancel</button>
        <button
          onClick={() => mut.mutate()} disabled={mut.isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {mut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Changes
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Delete Modal
// ---------------------------------------------------------------------------

function DeleteModal({ product, onClose, onSuccess }: { product: Product; onClose: () => void; onSuccess: (m: string) => void }) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => api.remove(product.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["products"] }); qc.invalidateQueries({ queryKey: ["products-stats"] }); onSuccess("Product deleted"); onClose(); },
  });
  return (
    <Modal title="Delete Product" onClose={onClose}>
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
          <Trash2 className="w-6 h-6 text-red-500" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">Delete {product.name}?</p>
          <p className="text-sm text-gray-500 mt-1">This will deactivate the product. Data is retained.</p>
        </div>
        <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-4 py-2 font-mono">{product.product_code}</p>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition">Cancel</button>
        <button
          onClick={() => mut.mutate()} disabled={mut.isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 transition"
        >
          {mut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Delete Product
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Category card strip
// ---------------------------------------------------------------------------

function CategoryStrip({ stats, activeFilter, onFilter }: {
  stats: ProductStats | undefined;
  activeFilter: ProductCategory | "all";
  onFilter: (c: ProductCategory | "all") => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3">
      {CATEGORIES.map(cat => {
        const s = stats?.by_category.find(b => b.category === cat.value);
        const active = activeFilter === cat.value;
        return (
          <button
            key={cat.value}
            onClick={() => onFilter(active ? "all" : cat.value)}
            className={cn(
              "text-left p-4 rounded-2xl border transition-all",
              active
                ? "border-blue-500 bg-blue-50 shadow-sm"
                : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"
            )}
          >
            <div className={cn("w-2 h-2 rounded-full mb-2", cat.color)} />
            <p className="text-xs font-semibold text-gray-900 leading-tight">{cat.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s?.total ?? 0}</p>
            <p className="text-[11px] text-gray-400">{s?.active ?? 0} active</p>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ProductsPage() {
  const { user } = useAuthStore();
  const userRoles = user?.roles ?? [];
  const canCreate = userRoles.some(r => ["super_admin","admin","ceo","cto","manager"].includes(r));
  const canDelete = userRoles.some(r => ["super_admin","admin","ceo"].includes(r));
  const showRevenue = userRoles.some(r => REVENUE_ROLES.has(r));

  const [search, setSearch]     = useState("");
  const [dSearch, setDSearch]   = useState("");
  const [catFilter, setCatFilter] = useState<ProductCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ProductStatus | "all">("all");
  const [showAdd, setShowAdd]   = useState(false);
  const [editProd, setEditProd] = useState<Product | null>(null);
  const [delProd, setDelProd]   = useState<Product | null>(null);
  const [toast, setToast]       = useState<ToastState | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setDSearch(search), 400);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [search]);

  const { data: products = [], isLoading, isError } = useQuery({
    queryKey: ["products", dSearch],
    queryFn: () => api.list(dSearch ? { search: dSearch } : {}),
  });

  const { data: stats } = useQuery({
    queryKey: ["products-stats"],
    queryFn: api.stats,
    staleTime: 30_000,
  });

  const filtered = products.filter(p => {
    const matchCat    = catFilter === "all" || p.category === catFilter;
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchCat && matchStatus;
  });

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
  }

  // Export
  const EXP_HEADERS_BASE = ["Code","Name","Category","Stream","Status","Customers","Units Sold","Active Units","Launch Date"];
  const EXP_HEADERS = showRevenue ? [...EXP_HEADERS_BASE, "Revenue (₹)"] : EXP_HEADERS_BASE;

  function expRows() {
    return filtered.map(p => {
      const base = [
        p.product_code,
        p.name,
        catMeta(p.category).label,
        p.stream.toUpperCase(),
        statusMeta(p.status).label,
        p.total_customers ?? "",
        p.units_sold ?? "",
        p.active_units ?? "",
        p.launch_date ?? "",
      ];
      if (showRevenue) base.push(p.revenue_generated ?? "");
      return base;
    });
  }

  async function handleExport(fmt: "csv" | "xlsx" | "pdf") {
    setExportOpen(false);
    try {
      const fname = `nevark-products-${new Date().toISOString().slice(0,10)}`;
      if (fmt === "csv")  exportCSV(fname, EXP_HEADERS, expRows());
      if (fmt === "xlsx") await exportXLSX(fname, EXP_HEADERS, expRows());
      if (fmt === "pdf")  await exportPDF(fname, "Nevark MSS — Products Report", EXP_HEADERS, expRows());
      showToast(`Exported as ${fmt.toUpperCase()}`);
    } catch { showToast("Export failed", "error"); }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500">Track all Nevark product lines</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setExportOpen(v => !v)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
            >
              <Download className="w-4 h-4" />Export<ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
            {exportOpen && (
              <>
                <div className="fixed inset-0 z-[90]" onClick={() => setExportOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-xl shadow-xl z-[100] overflow-hidden">
                  {(["xlsx","csv","pdf"] as const).map(fmt => (
                    <button key={fmt} onClick={() => handleExport(fmt)}
                      className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 uppercase font-medium tracking-wide">
                      {fmt}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {canCreate && (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition shadow-sm"
            >
              <Plus className="w-4 h-4" />Add Product
            </button>
          )}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Total Products"  value={String(stats?.total_products ?? 0)}  icon={Package} color="blue"    index={0} />
        <KpiCard label="Active Products" value={String(stats?.active_products ?? 0)} icon={Package} color="emerald" index={1} />
        <KpiCard label="Total Customers" value={fmt(stats?.total_customers ?? 0)}    icon={Package} color="purple"  index={2} />
        {showRevenue && (
          <KpiCard
            label="Total Revenue"
            value={stats?.total_revenue != null ? `₹${new Intl.NumberFormat("en-IN").format(Number(stats.total_revenue))}` : "—"}
            icon={Package} color="orange" index={3}
          />
        )}
      </div>

      {/* Category strip */}
      <CategoryStrip stats={stats} activeFilter={catFilter} onFilter={setCatFilter} />

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        {/* Filters */}
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-48 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search products..."
              className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none flex-1"
            />
            {isLoading && <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin" />}
          </div>
          <select
            value={catFilter}
            onChange={e => setCatFilter(e.target.value as ProductCategory | "all")}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-700 outline-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as ProductStatus | "all")}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-700 outline-none cursor-pointer"
          >
            <option value="all">All Statuses</option>
            {STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} results</span>
        </div>

        {isError && (
          <div className="p-6 flex items-center gap-3 text-red-600 bg-red-50">
            <AlertCircle className="w-5 h-5" />
            <p className="text-sm">Failed to load products. Check backend is running.</p>
          </div>
        )}

        {isLoading && !isError && (
          <div className="py-20 flex flex-col items-center gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">Loading products...</p>
          </div>
        )}

        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {[
                    "Product", "Code", "Category", "Stream", "Status",
                    "Customers", "Units",
                    ...(showRevenue ? ["Revenue"] : []),
                    "",
                  ].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => {
                  const cat = catMeta(p.category);
                  const st  = statusMeta(p.status);
                  return (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.025 }}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0", cat.color)}>
                            <Package className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{p.name}</p>
                            {p.launch_date && <p className="text-xs text-gray-400">Launched {p.launch_date}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs text-gray-500">{p.product_code}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("w-2 h-2 rounded-full flex-shrink-0", cat.color)} />
                          <span className="text-xs text-gray-600 whitespace-nowrap">{cat.label.replace("NEVARK ", "")}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-medium uppercase">{p.stream}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn("text-xs px-2.5 py-1 rounded-full font-semibold", st.cls)}>{st.label}</span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 text-sm">{fmt(p.total_customers)}</td>
                      <td className="px-4 py-3.5 text-gray-600 text-sm">{fmt(p.units_sold)}</td>
                      {showRevenue && (
                        <td className="px-4 py-3.5 text-gray-900 font-medium text-sm">
                          {p.revenue_generated != null ? `₹${new Intl.NumberFormat("en-IN").format(Number(p.revenue_generated))}` : "—"}
                        </td>
                      )}
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          {canCreate && (
                            <button onClick={() => setEditProd(p)} className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition" title="Edit">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => setDelProd(p)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition" title="Delete">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && !isLoading && (
              <div className="py-16 text-center text-gray-400 text-sm">
                {dSearch || catFilter !== "all" || statusFilter !== "all"
                  ? "No products match your filters."
                  : "No products yet. Add your first product."}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals + Toast */}
      <AnimatePresence>
        {showAdd && <AddModal key="add" onClose={() => setShowAdd(false)} showRevenue={showRevenue} onSuccess={m => showToast(m)} />}
        {editProd && <EditModal key={`edit-${editProd.id}`} product={editProd} onClose={() => setEditProd(null)} showRevenue={showRevenue} onSuccess={m => showToast(m)} />}
        {delProd  && <DeleteModal key={`del-${delProd.id}`} product={delProd} onClose={() => setDelProd(null)} onSuccess={m => showToast(m)} />}
        {toast    && <Toast key="toast" {...toast} onClose={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  );
}
