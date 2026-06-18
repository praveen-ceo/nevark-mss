"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import type { AxiosError } from "axios";
import {
  AlertCircle, BarChart3, CheckCircle2, Clock,
  Loader2, Pencil, Plus, Search, Trash2, X,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ClientBrief { id: string; name: string; }

interface TaskBrief {
  id: string; title: string; status: string; priority: string; due_date: string | null;
}

interface MilestoneBrief {
  id: string; title: string; due_date: string; status: string;
}

interface Project {
  id: string; name: string; code: string;
  description: string | null; status: string; priority: string;
  start_date: string | null; end_date: string | null;
  actual_end_date: string | null; budget: number | null; currency: string;
  is_active: boolean; client: ClientBrief | null;
  tasks: TaskBrief[]; milestones: MilestoneBrief[];
}

interface ProjectCreate {
  name: string; description: string; client_id: string;
  status: string; priority: string;
  start_date: string; end_date: string;
  budget: string; currency: string;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

const api = {
  list:    (search: string, status: string) =>
    apiClient.get<Project[]>("/projects", {
      params: {
        ...(search ? { search } : {}),
        ...(status && status !== "All" ? { status } : {}),
      },
    }).then(r => r.data),
  clients: () => apiClient.get<ClientBrief[]>("/clients").then(r => r.data),
  create:  (d: ProjectCreate) => apiClient.post<Project>("/projects", {
    ...d,
    client_id:  d.client_id  || null,
    start_date: d.start_date || null,
    end_date:   d.end_date   || null,
    budget:     d.budget ? parseFloat(d.budget) : null,
  }).then(r => r.data),
  update:  (id: string, d: Omit<Partial<ProjectCreate>, "budget"> & { is_active?: boolean; budget?: number | string }) =>
    apiClient.put<Project>(`/projects/${id}`, d).then(r => r.data),
  remove:  (id: string) => apiClient.delete(`/projects/${id}`),
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUSES = ["planning", "active", "on_hold", "completed", "cancelled"] as const;
const PRIORITIES = ["low", "medium", "high", "critical"] as const;

const STATUS_CONFIG: Record<string, { label: string; style: string; dot: string }> = {
  planning:  { label: "Planning",   style: "bg-slate-100 text-slate-700",   dot: "bg-slate-400"    },
  active:    { label: "Active",     style: "bg-blue-100 text-blue-700",     dot: "bg-blue-500"     },
  on_hold:   { label: "On Hold",    style: "bg-amber-100 text-amber-700",   dot: "bg-amber-500"    },
  completed: { label: "Completed",  style: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  cancelled: { label: "Cancelled",  style: "bg-red-100 text-red-700",       dot: "bg-red-500"      },
};

const PRIORITY_STYLE: Record<string, string> = {
  low:      "text-gray-600 bg-gray-100",
  medium:   "text-amber-600 bg-amber-50",
  high:     "text-orange-600 bg-orange-50",
  critical: "text-red-600 bg-red-50",
};

const EMPTY: ProjectCreate = {
  name: "", description: "", client_id: "",
  status: "planning", priority: "medium",
  start_date: "", end_date: "", budget: "", currency: "INR",
};

const inputCls = "w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900 placeholder-gray-400";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function progress(tasks: TaskBrief[]) {
  if (!tasks.length) return 0;
  return Math.round((tasks.filter(t => t.status === "done").length / tasks.length) * 100);
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

function Toast({ msg, type, onClose }: { msg: string; type: "success"|"error"; onClose: ()=>void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <motion.div initial={{ opacity:0,y:20 }} animate={{ opacity:1,y:0 }} exit={{ opacity:0,y:20 }}
      className={cn("fixed bottom-6 right-6 z-100 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
        type==="success"?"bg-emerald-600":"bg-red-600")}>
      {type==="success"?<CheckCircle2 className="w-4 h-4 shrink-0"/>:<AlertCircle className="w-4 h-4 shrink-0"/>}
      {msg}
      <button onClick={onClose} className="ml-1 opacity-75 hover:opacity-100"><X className="w-3.5 h-3.5"/></button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

function Modal({ title, onClose, children }: { title:string; onClose:()=>void; children:React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <motion.div initial={{ opacity:0,scale:0.96 }} animate={{ opacity:1,scale:1 }}
        exit={{ opacity:0,scale:0.96 }} transition={{ duration:0.18 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
            <X className="w-4 h-4"/>
          </button>
        </div>
        <div className="p-6">{children}</div>
      </motion.div>
    </div>
  );
}

function Field({ label, required, children }: { label:string; required?:boolean; children:React.ReactNode }) {
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
// Project Form
// ---------------------------------------------------------------------------

function ProjectForm({ form, setForm, clients, err, isPending, onSubmit, onClose, submitLabel }: {
  form: ProjectCreate;
  setForm: React.Dispatch<React.SetStateAction<ProjectCreate>>;
  clients: ClientBrief[]; err: string|null; isPending: boolean;
  onSubmit: ()=>void; onClose: ()=>void; submitLabel: string;
}) {
  const set = (k: keyof ProjectCreate) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Field label="Project Name" required>
            <input value={form.name} onChange={set("name")} placeholder="e.g. ERP Integration" className={inputCls}/>
          </Field>
        </div>
        <Field label="Client">
          <select value={form.client_id} onChange={set("client_id")} className={inputCls}>
            <option value="">No client</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Currency">
          <select value={form.currency} onChange={set("currency")} className={inputCls}>
            {["INR","USD","EUR","GBP"].map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Status" required>
          <select value={form.status} onChange={set("status")} className={inputCls}>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
          </select>
        </Field>
        <Field label="Priority" required>
          <select value={form.priority} onChange={set("priority")} className={inputCls}>
            {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
          </select>
        </Field>
        <Field label="Start Date">
          <input type="date" value={form.start_date} onChange={set("start_date")} className={inputCls}/>
        </Field>
        <Field label="End Date">
          <input type="date" value={form.end_date} onChange={set("end_date")} className={inputCls}/>
        </Field>
        <div className="col-span-2">
          <Field label="Budget">
            <input type="number" value={form.budget} onChange={set("budget")} placeholder="e.g. 500000" className={inputCls}/>
          </Field>
        </div>
        <div className="col-span-2">
          <Field label="Description">
            <textarea value={form.description} onChange={set("description")} rows={2}
              placeholder="Brief project description..." className={inputCls+" resize-none"}/>
          </Field>
        </div>
      </div>
      {err && <p className="mt-4 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{err}</p>}
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition">Cancel</button>
        <button onClick={onSubmit} disabled={isPending || !form.name.trim()}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">
          {isPending && <Loader2 className="w-4 h-4 animate-spin"/>}
          {submitLabel}
        </button>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Add Modal
// ---------------------------------------------------------------------------

function AddModal({ onClose, onSuccess, clients }: { onClose:()=>void; onSuccess:(m:string)=>void; clients:ClientBrief[] }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<ProjectCreate>(EMPTY);
  const [err, setErr] = useState<string|null>(null);
  const mut = useMutation({
    mutationFn: () => api.create(form),
    onSuccess: () => { qc.invalidateQueries({ queryKey:["projects"] }); onSuccess("Project created"); onClose(); },
    onError: (e: AxiosError<{ detail:string }>) => setErr(e.response?.data?.detail ?? "Failed to create project"),
  });
  return (
    <Modal title="New Project" onClose={onClose}>
      <ProjectForm form={form} setForm={setForm} clients={clients} err={err}
        isPending={mut.isPending} onSubmit={() => mut.mutate()} onClose={onClose} submitLabel="Create Project"/>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Edit Modal
// ---------------------------------------------------------------------------

function EditModal({ project, onClose, onSuccess, clients }: {
  project: Project; onClose:()=>void; onSuccess:(m:string)=>void; clients:ClientBrief[];
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<ProjectCreate>({
    name: project.name, description: project.description ?? "",
    client_id: project.client?.id ?? "", status: project.status,
    priority: project.priority, start_date: project.start_date ?? "",
    end_date: project.end_date ?? "", budget: project.budget ? String(project.budget) : "",
    currency: project.currency,
  });
  const [err, setErr] = useState<string|null>(null);
  const mut = useMutation({
    mutationFn: () => api.update(project.id, {
      ...form, client_id: form.client_id || undefined,
      start_date: form.start_date || undefined, end_date: form.end_date || undefined,
      budget: form.budget ? parseFloat(form.budget) : undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey:["projects"] }); onSuccess("Project updated"); onClose(); },
    onError: (e: AxiosError<{ detail:string }>) => setErr(e.response?.data?.detail ?? "Failed to update"),
  });
  return (
    <Modal title={`Edit — ${project.name}`} onClose={onClose}>
      <ProjectForm form={form} setForm={setForm} clients={clients} err={err}
        isPending={mut.isPending} onSubmit={() => mut.mutate()} onClose={onClose} submitLabel="Save Changes"/>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Deactivate Modal
// ---------------------------------------------------------------------------

function DeactivateModal({ project, onClose, onSuccess }: {
  project: Project; onClose:()=>void; onSuccess:(m:string)=>void;
}) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: () => api.remove(project.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey:["projects"] }); onSuccess("Project deactivated"); onClose(); },
  });
  return (
    <Modal title="Deactivate Project" onClose={onClose}>
      <div className="flex flex-col items-center text-center gap-4 py-2">
        <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
          <Trash2 className="w-6 h-6 text-red-500"/>
        </div>
        <div>
          <p className="font-semibold text-gray-900">Deactivate {project.name}?</p>
          <p className="text-sm text-gray-500 mt-1">Marks project as inactive. Reversible via Edit.</p>
        </div>
        <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-4 py-2">{project.code}</p>
      </div>
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition">Cancel</button>
        <button onClick={() => mut.mutate()} disabled={mut.isPending}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 disabled:opacity-50 transition">
          {mut.isPending && <Loader2 className="w-4 h-4 animate-spin"/>}
          Deactivate
        </button>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function ProjectsPage() {
  const [search, setSearch]       = useState("");
  const [dSearch, setDSearch]     = useState("");
  const [statusF, setStatusF]     = useState("All");
  const [showAdd, setShowAdd]     = useState(false);
  const [editP, setEditP]         = useState<Project|null>(null);
  const [delP, setDelP]           = useState<Project|null>(null);
  const [toast, setToast]         = useState<{ msg:string; type:"success"|"error" }|null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
  if (debounce.current) {
    clearTimeout(debounce.current);
  }

  debounce.current = setTimeout(() => {
    setDSearch(search);
  }, 400);

  return () => {
    if (debounce.current) {
      clearTimeout(debounce.current);
    }
  };
}, [search]);

  const { data: projects=[], isLoading, isError } = useQuery({
    queryKey: ["projects", dSearch, statusF],
    queryFn: () => api.list(dSearch, statusF),
  });

  const { data: clients=[] } = useQuery({
    queryKey: ["clients"],
    queryFn: () => api.clients(),
    staleTime: 5 * 60 * 1000,
  });

  const active    = projects.filter(p => p.status === "active").length;
  const completed = projects.filter(p => p.status === "completed").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-sm text-gray-500">Track progress, budgets and timelines across all projects</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition shadow-sm">
          <Plus className="w-4 h-4"/>New Project
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Total Projects" value={String(projects.length)} icon={BarChart3}    color="blue"    index={0}/>
        <KpiCard label="Active"         value={String(active)}          icon={Clock}        color="purple"  index={1}/>
        <KpiCard label="Completed"      value={String(completed)}       icon={CheckCircle2} color="emerald" index={2}/>
        <KpiCard label="Clients"        value={String(new Set(projects.map(p => p.client?.id).filter(Boolean)).size)} icon={BarChart3} color="teal" index={3}/>
      </div>

      {/* Status filter tabs */}
      <div className="grid grid-cols-6 gap-3">
        {(["All", ...STATUSES] as const).map(key => {
          const count = key === "All" ? projects.length : projects.filter(p => p.status === key).length;
          const cfg   = key === "All" ? null : STATUS_CONFIG[key];
          return (
            <button key={key} onClick={() => setStatusF(key)}
              className={cn("flex flex-col items-center p-3 rounded-xl border transition",
                statusF === key ? "border-blue-300 bg-blue-50" : "border-gray-100 bg-white hover:bg-gray-50")}>
              <span className={cn("text-xl font-bold", statusF === key ? "text-blue-700" : "text-gray-800")}>{count}</span>
              <span className="text-xs text-gray-500 mt-0.5 text-center leading-tight">{cfg?.label ?? "All"}</span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-sm bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
          <Search className="w-4 h-4 text-gray-400"/>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects..."
            className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none flex-1"/>
          {isLoading && <Loader2 className="w-3.5 h-3.5 text-gray-400 animate-spin shrink-0"/>}
        </div>
        <span className="text-xs text-gray-400">{projects.length} projects</span>
      </div>

      {/* Error */}
      {isError && (
        <div className="p-6 flex items-center gap-3 text-red-600 bg-red-50 rounded-2xl border border-red-100">
          <AlertCircle className="w-5 h-5 shrink-0"/>
          <p className="text-sm">Failed to load projects. Check that the backend is running.</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && !isError && (
        <div className="py-20 flex flex-col items-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin"/>
          <p className="text-sm">Loading projects...</p>
        </div>
      )}

      {/* Project cards */}
      {!isLoading && !isError && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-4">
            {projects.map((p, i) => {
              const cfg     = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.planning;
              const prog    = progress(p.tasks);
              return (
                <motion.div key={p.id} initial={{ opacity:0,y:12 }} animate={{ opacity:1,y:0 }} transition={{ delay:i*0.05 }}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow flex flex-col gap-4">

                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 leading-tight">{p.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{p.client?.name ?? "No client"} &bull; {p.code}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1", cfg.style)}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)}/>{cfg.label}
                      </span>
                      <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize", PRIORITY_STYLE[p.priority] ?? PRIORITY_STYLE.medium)}>
                        {p.priority}
                      </span>
                    </div>
                  </div>

                  {p.description && (
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{p.description}</p>
                  )}

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-gray-500 font-medium">
                        Tasks {p.tasks.filter(t => t.status === "done").length}/{p.tasks.length}
                      </span>
                      <span className="font-semibold text-gray-900">{prog}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all",
                          prog === 100 ? "bg-emerald-500" : prog > 70 ? "bg-blue-500" : "bg-blue-400")}
                        style={{ width: `${prog}%` }}/>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-gray-50 rounded-xl p-2.5">
                      <p className="text-gray-400 mb-0.5">Budget</p>
                      <p className="font-semibold text-gray-800">
                        {p.budget ? `${p.currency} ${Number(p.budget).toLocaleString()}` : "—"}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-2.5">
                      <p className="text-gray-400 mb-0.5">Due Date</p>
                      <p className="font-semibold text-gray-800">{p.end_date ?? "—"}</p>
                      <p className="text-gray-400 mt-1">Milestones</p>
                      <p className="font-medium text-gray-700">
                        {p.milestones.filter(m => m.status === "completed").length}/{p.milestones.length}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-gray-50">
                    <button onClick={() => setEditP(p)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition" title="Edit">
                      <Pencil className="w-3.5 h-3.5"/>
                    </button>
                    <button onClick={() => setDelP(p)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition" title="Deactivate">
                      <Trash2 className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {projects.length === 0 && (
            <div className="py-16 text-center text-gray-400 text-sm bg-white rounded-2xl border border-gray-100">
              {dSearch || statusF !== "All" ? "No projects match your filters." : "No projects yet. Create your first project."}
            </div>
          )}
        </>
      )}

      <AnimatePresence>
        {showAdd && (
          <AddModal
            key="add-project-modal"
            onClose={() => setShowAdd(false)}
            clients={clients}
            onSuccess={(m) => setToast({ msg: m, type: "success" })}
          />
        )}

        {editP && (
          <EditModal
            key={`edit-project-${editP.id}`}
            project={editP}
            onClose={() => setEditP(null)}
            clients={clients}
            onSuccess={(m) => setToast({ msg: m, type: "success" })}
          />
        )}

        {delP && (
          <DeactivateModal
            key={`deactivate-project-${delP.id}`}
            project={delP}
            onClose={() => setDelP(null)}
            onSuccess={(m) => setToast({ msg: m, type: "success" })}
          />
        )}

        {toast && (
          <Toast key="toast" msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
