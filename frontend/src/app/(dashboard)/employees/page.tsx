"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import type { AxiosError } from "axios";
import {
  AlertCircle, Building2, CheckCircle2, ChevronDown, Download,
  Loader2, Pencil, Plus, Search, Trash2, Users, X,
} from "lucide-react";
import { exportCSV, exportXLSX, exportPDF } from "@/lib/export";
import { apiClient } from "@/lib/api/client";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Department { id: string; name: string; }

interface EmployeeUser {
  id: string; email: string; full_name: string | null; is_active: boolean;
}

interface Employee {
  id: string; employee_code: string;
  first_name: string; last_name: string;
  job_title: string | null; employment_type: string;
  hire_date: string; termination_date: string | null;
  phone: string | null; salary: number | null;
  department: Department | null;
  user: EmployeeUser;
  is_active: boolean;
}

interface EmployeeCreate {
  email: string; full_name: string; password: string;
  first_name: string; last_name: string; job_title: string;
  department_id: string; employment_type: string;
  hire_date: string; phone: string; salary: string;
}

interface EmployeeUpdate {
  full_name?: string; first_name?: string; last_name?: string;
  job_title?: string; department_id?: string | null;
  employment_type?: string; hire_date?: string;
  phone?: string; salary?: number | null; is_active?: boolean;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

const api = {
  list:   (search: string) =>
    apiClient.get<Employee[]>("/employees", { params: search ? { search } : {} }).then(r => r.data),
  depts:  () =>
    apiClient.get<Department[]>("/employees/departments").then(r => r.data),
  create: (d: EmployeeCreate) =>
    apiClient.post<Employee>("/employees", {
      ...d,
      salary: d.salary ? parseFloat(d.salary) : null,
      department_id: d.department_id || null,
    }).then(r => r.data),
  update: (id: string, d: EmployeeUpdate) =>
    apiClient.put<Employee>(`/employees/${id}`, d).then(r => r.data),
  remove: (id: string) => apiClient.delete(`/employees/${id}`),
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const EMP_TYPES = ["full_time", "part_time", "contract", "intern"] as const;
const AVATAR_COLORS = [
  "bg-blue-500","bg-purple-500","bg-emerald-500","bg-orange-500",
  "bg-rose-500","bg-teal-500","bg-indigo-500","bg-cyan-500",
];
const EMPTY_CREATE: EmployeeCreate = {
  email: "", full_name: "", password: "Nevark@2025",
  first_name: "", last_name: "", job_title: "",
  department_id: "", employment_type: "full_time",
  hire_date: new Date().toISOString().split("T")[0],
  phone: "", salary: "",
};

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

interface ToastState { msg: string; type: "success" | "error"; }

/* eslint-disable @typescript-eslint/no-unused-vars */
function Toast({ msg, type, onClose }: ToastState & { onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      className={cn(
        "fixed bottom-6 right-6 z-100 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
        type === "success" ? "bg-emerald-600" : "bg-red-600"
      )}
    >
      {type === "success"
        ? <CheckCircle2 className="w-4 h-4 shrink-0" />
        : <AlertCircle className="w-4 h-4 shrink-0" />}
      {msg}
      <button onClick={onClose} className="ml-1 opacity-75 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Modal wrapper
// ---------------------------------------------------------------------------

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.18 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
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

const inputCls = "w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900 placeholder-gray-400";

// ---------------------------------------------------------------------------
// Add Modal
// ---------------------------------------------------------------------------

function AddModal({ onClose, departments, onSuccess }: {
  onClose: () => void; departments: Department[]; onSuccess: (m: string) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<EmployeeCreate>(EMPTY_CREATE);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof EmployeeCreate) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const mut = useMutation({
    mutationFn: () => api.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); onSuccess("Employee created"); onClose(); },
    onError: (e: AxiosError<{ detail: string }>) => setErr(e.response?.data?.detail ?? "Failed to create employee"),
  });

  return (
    <Modal title="Add New Employee" onClose={onClose}>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 border-b border-gray-100">Account</p></div>
        <Field label="Email" required><input type="email" value={form.email} onChange={set("email")} placeholder="name@company.com" className={inputCls} /></Field>
        <Field label="Display Name" required><input value={form.full_name} onChange={set("full_name")} placeholder="Full name" className={inputCls} /></Field>
        <Field label="Password"><input type="password" value={form.password} onChange={set("password")} className={inputCls} /></Field>
        <div />
        <div className="col-span-2"><p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pb-2 border-b border-gray-100 pt-2">Details</p></div>
        <Field label="First Name" required><input value={form.first_name} onChange={set("first_name")} placeholder="First name" className={inputCls} /></Field>
        <Field label="Last Name" required><input value={form.last_name} onChange={set("last_name")} placeholder="Last name" className={inputCls} /></Field>
        <Field label="Job Title"><input value={form.job_title} onChange={set("job_title")} placeholder="e.g. Senior Engineer" className={inputCls} /></Field>
        <Field label="Department">
          <select value={form.department_id} onChange={set("department_id")} className={inputCls}>
            <option value="">Select department</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Employment Type" required>
          <select value={form.employment_type} onChange={set("employment_type")} className={inputCls}>
            {EMP_TYPES.map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
          </select>
        </Field>
        <Field label="Hire Date" required><input type="date" value={form.hire_date} onChange={set("hire_date")} className={inputCls} /></Field>
        <Field label="Phone"><input value={form.phone} onChange={set("phone")} placeholder="+91 98765 43210" className={inputCls} /></Field>
        <Field label="Salary (annual)"><input type="number" value={form.salary} onChange={set("salary")} placeholder="850000" className={inputCls} /></Field>
      </div>
      {err && <p className="mt-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition">Cancel</button>
        <button
          onClick={() => mut.mutate()}
          disabled={mut.isPending || !form.email || !form.first_name || !form.last_name}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition"
        >
          {mut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Create Employee
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Edit Modal
// ---------------------------------------------------------------------------

function EditModal({ emp, onClose, departments, onSuccess }: {
  emp: Employee; onClose: () => void; departments: Department[]; onSuccess: (m: string) => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<EmployeeUpdate>({
    full_name: emp.user.full_name ?? "",
    first_name: emp.first_name, last_name: emp.last_name,
    job_title: emp.job_title ?? "", department_id: emp.department?.id ?? "",
    employment_type: emp.employment_type, hire_date: emp.hire_date,
    phone: emp.phone ?? "", salary: emp.salary ?? null, is_active: emp.is_active,
  });
  const [err, setErr] = useState<string | null>(null);
  const setF = (k: keyof EmployeeUpdate) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const mut = useMutation({
    mutationFn: () => api.update(emp.id, {
      ...form,
      department_id: form.department_id || null,
      salary: form.salary !== null && String(form.salary) !== "" ? Number(form.salary) : null,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); onSuccess("Employee updated"); onClose(); },
    onError: (e: AxiosError<{ detail: string }>) => setErr(e.response?.data?.detail ?? "Failed to update"),
  });

  return (
    <Modal title={`Edit — ${emp.first_name} ${emp.last_name}`} onClose={onClose}>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Display Name"><input value={String(form.full_name ?? "")} onChange={setF("full_name")} className={inputCls} /></Field>
        <Field label="Job Title"><input value={String(form.job_title ?? "")} onChange={setF("job_title")} className={inputCls} /></Field>
        <Field label="First Name"><input value={String(form.first_name ?? "")} onChange={setF("first_name")} className={inputCls} /></Field>
        <Field label="Last Name"><input value={String(form.last_name ?? "")} onChange={setF("last_name")} className={inputCls} /></Field>
        <Field label="Department">
          <select value={String(form.department_id ?? "")} onChange={setF("department_id")} className={inputCls}>
            <option value="">No department</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </Field>
        <Field label="Employment Type">
          <select value={String(form.employment_type ?? "full_time")} onChange={setF("employment_type")} className={inputCls}>
            {EMP_TYPES.map(t => <option key={t} value={t}>{t.replace("_", " ")}</option>)}
          </select>
        </Field>
        <Field label="Hire Date"><input type="date" value={String(form.hire_date ?? "")} onChange={setF("hire_date")} className={inputCls} /></Field>
        <Field label="Phone"><input value={String(form.phone ?? "")} onChange={setF("phone")} className={inputCls} /></Field>
        <Field label="Salary">
          <input type="number"
            value={form.salary !== null && form.salary !== undefined ? String(form.salary) : ""}
            onChange={setF("salary")} className={inputCls} />
        </Field>
        <Field label="Status">
          <select
            value={form.is_active ? "active" : "inactive"}
            onChange={e => setForm(f => ({ ...f, is_active: e.target.value === "active" }))}
            className={inputCls}
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </Field>
      </div>
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

function DeleteModal({ emp, onClose, onSuccess }: {
  emp: Employee; onClose: () => void; onSuccess: (m: string) => void;
}) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => api.remove(emp.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["employees"] }); onSuccess("Employee deactivated"); onClose(); },
  });
  return (
    <Modal title="Deactivate Employee" onClose={onClose}>
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
          <Trash2 className="w-6 h-6 text-red-500" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">Deactivate {emp.first_name} {emp.last_name}?</p>
          <p className="text-sm text-gray-500 mt-1">Marks the employee and their account as inactive. Reversible via Edit.</p>
        </div>
        <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-4 py-2">{emp.user.email} &bull; {emp.employee_code}</p>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition">Cancel</button>
        <button
          onClick={() => mut.mutate()} disabled={mut.isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 transition"
        >
          {mut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Deactivate
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

const STATUS_STYLE: Record<string, string> = {
  active:   "bg-emerald-100 text-emerald-700",
  inactive: "bg-red-100 text-red-700",
};

export default function EmployeesPage() {
  const [search, setSearch]   = useState("");
  const [dSearch, setDSearch] = useState("");
  const [deptF, setDeptF]     = useState("All");
  const [statusF, setStatusF] = useState("All");
  const [showAdd, setShowAdd] = useState(false);
  const [editEmp, setEditEmp] = useState<Employee | null>(null);
  const [delEmp, setDelEmp]   = useState<Employee | null>(null);
  const [toast, setToast]     = useState<ToastState | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) {
      clearTimeout(debounce.current);
    }
    debounce.current = setTimeout(() => setDSearch(search), 400);
    return () => {
      if (debounce.current) {
        clearTimeout(debounce.current);
      }
    };
  }, [search]);

  const { data: employees = [], isLoading, isError } = useQuery({
    queryKey: ["employees", dSearch],
    queryFn: () => api.list(dSearch),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: api.depts,
    staleTime: 5 * 60 * 1000,
  });

  const filtered = employees.filter(e => {
    const matchD = deptF === "All" || e.department?.name === deptF;
    const matchS = statusF === "All"
      || (statusF === "active" && e.is_active)
      || (statusF === "inactive" && !e.is_active);
    return matchD && matchS;
  });

  const active   = employees.filter(e => e.is_active).length;
  const inactive = employees.filter(e => !e.is_active).length;
  const deptSet  = new Set(employees.map(e => e.department?.name).filter(Boolean)).size;

  const deptOptions = ["All", ...departments.map(d => d.name)];

  function showToast(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type });
  }

  const [exportOpen, setExportOpen] = useState(false);

  const EXP_HEADERS = ["Code", "Name", "Job Title", "Department", "Type", "Hire Date", "Phone", "Salary", "Status"];
  function empRows() {
    return filtered.map(e => [
      e.employee_code,
      `${e.first_name} ${e.last_name}`,
      e.job_title ?? "",
      e.department?.name ?? "",
      e.employment_type.replace("_", " "),
      e.hire_date,
      e.phone ?? "",
      e.salary ?? "",
      e.is_active ? "Active" : "Inactive",
    ]);
  }

  async function handleExport(fmt: "csv" | "xlsx" | "pdf") {
    setExportOpen(false);
    try {
      const fname = `nevark-employees-${new Date().toISOString().slice(0, 10)}`;
      if (fmt === "csv")  exportCSV(fname, EXP_HEADERS, empRows());
      if (fmt === "xlsx") await exportXLSX(fname, EXP_HEADERS, empRows());
      if (fmt === "pdf")  await exportPDF(fname, "Nevark MSS — Employee Report", EXP_HEADERS, empRows());
      showToast(`Exported as ${fmt.toUpperCase()}`, "success");
    } catch {
      showToast("Export failed", "error");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-sm text-gray-500">Manage your workforce across all departments</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setExportOpen((v) => !v)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
            >
              <Download className="w-4 h-4" />Export
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            </button>
            {exportOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                  {(["xlsx", "csv", "pdf"] as const).map((fmt) => (
                    <button key={fmt} onClick={() => handleExport(fmt)}
                      className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 transition uppercase font-medium tracking-wide">
                      {fmt}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />Add Employee
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Total Employees" value={String(employees.length)} icon={Users}     color="blue"    index={0} />
        <KpiCard label="Active"          value={String(active)}           icon={Users}     color="emerald" index={1} />
        <KpiCard label="Inactive"        value={String(inactive)}         icon={Users}     color="red"     index={2} />
        <KpiCard label="Departments"     value={String(deptSet)}          icon={Building2} color="purple"  index={3} />
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        {/* Filters */}
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-50 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search employees..."
              className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none flex-1"
            />
            {isLoading && <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin shrink-0" />}
          </div>
          <select
            value={deptF} onChange={e => setDeptF(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-700 outline-none cursor-pointer"
          >
            {deptOptions.map(d => <option key={d}>{d}</option>)}
          </select>
          <select
            value={statusF} onChange={e => setStatusF(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-700 outline-none cursor-pointer"
          >
            {["All", "active", "inactive"].map(s => <option key={s}>{s}</option>)}
          </select>
          <span className="text-xs text-gray-400 ml-auto">{filtered.length} results</span>
        </div>

        {/* Error */}
        {isError && (
          <div className="p-6 flex items-center gap-3 text-red-600 bg-red-50">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <p className="text-sm">Failed to load employees. Check that the backend is running.</p>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && !isError && (
          <div className="py-20 flex flex-col items-center gap-3 text-gray-400">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">Loading employees...</p>
          </div>
        )}

        {/* Table */}
        {!isLoading && !isError && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Employee", "Code", "Role", "Department", "Type", "Status", "Hire Date", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp, i) => {
                  const initials = `${emp.first_name[0] ?? ""}${emp.last_name[0] ?? ""}`.toUpperCase();
                  const statusKey = emp.is_active ? "active" : "inactive";
                  return (
                    <motion.tr
                      key={emp.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0", AVATAR_COLORS[i % AVATAR_COLORS.length])}>
                            {initials}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{emp.first_name} {emp.last_name}</p>
                            <p className="text-xs text-gray-400">{emp.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="font-mono text-xs text-gray-500">{emp.employee_code}</span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-600">{emp.job_title ?? "-"}</td>
                      <td className="px-4 py-3.5">
                        {emp.department
                          ? <span className="text-xs px-2.5 py-1 bg-gray-100 text-gray-700 rounded-full font-medium">{emp.department.name}</span>
                          : <span className="text-gray-300 text-xs">-</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-medium capitalize">
                          {emp.employment_type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn("text-xs px-2.5 py-1 rounded-full font-semibold", STATUS_STYLE[statusKey])}>
                          {statusKey.charAt(0).toUpperCase() + statusKey.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-gray-500 text-xs">{emp.hire_date}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setEditEmp(emp)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDelEmp(emp)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition"
                            title="Deactivate"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-16 text-center text-gray-400 text-sm">
                {dSearch || deptF !== "All" || statusF !== "All"
                  ? "No employees match your filters."
                  : "No employees yet. Add your first employee."}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals + Toast */}
      <AnimatePresence>
  {showAdd && (
    <AddModal
      key="add-employee-modal"
      onClose={() => setShowAdd(false)}
      departments={departments}
      onSuccess={(msg) => showToast(msg)}
    />
  )}

  {editEmp && (
    <EditModal
      key={`edit-employee-${editEmp.id}`}
      emp={editEmp}
      onClose={() => setEditEmp(null)}
      departments={departments}
      onSuccess={(msg) => showToast(msg)}
    />
  )}

  {delEmp && (
    <DeleteModal
      key={`delete-employee-${delEmp.id}`}
      emp={delEmp}
      onClose={() => setDelEmp(null)}
      onSuccess={(msg) => showToast(msg)}
    />
  )}
</AnimatePresence>
    </div>
  );
}
