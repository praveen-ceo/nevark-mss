"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import type { AxiosError } from "axios";
import {
  AlertCircle, CheckCircle2, Clock, Flag, Loader2,
  Plus, Search, Target, X, CheckCheck, ListTodo,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { V, ERR_CLS } from "@/lib/validation";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ProjectBrief { id: string; name: string; code: string; }
interface EmployeeBrief { id: string; employee_code: string; first_name: string; last_name: string; }

interface Task {
  id: string; title: string; description: string | null;
  status: string; priority: string;
  due_date: string | null; estimated_hours: number | null; actual_hours: number | null;
  is_active: boolean; is_overdue: boolean;
  project: ProjectBrief | null; assignee: EmployeeBrief | null;
}

interface Milestone {
  id: string; title: string; description: string | null;
  due_date: string; completed_at: string | null;
  status: string; is_active: boolean;
  project: ProjectBrief | null;
}

interface TaskDashboard { total: number; completed: number; in_progress: number; overdue: number; todo: number; blocked: number; }
interface Project { id: string; name: string; code: string; }
interface Employee { id: string; first_name: string; last_name: string; employee_code: string; }

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

const TASK_STATUSES = ["todo","in_progress","in_review","done","blocked"] as const;
const PRIORITIES = ["low","medium","high","critical"] as const;
const MILESTONE_STATUSES = ["pending","completed","missed"] as const;

const api = {
  dashboard:  () => apiClient.get<TaskDashboard>("/tasks/dashboard").then(r => r.data),
  tasks:      (projectId: string, status: string, search: string) =>
    apiClient.get<Task[]>("/tasks", {
      params: {
        ...(projectId ? { project_id: projectId } : {}),
        ...(status && status !== "all" ? { status } : {}),
      },
    }).then(r => r.data),
  createTask: (d: Record<string, unknown>) => apiClient.post<Task>("/tasks", d).then(r => r.data),
  updateTask: (id: string, d: Record<string, unknown>) => apiClient.put<Task>(`/tasks/${id}`, d).then(r => r.data),
  deactivate: (id: string) => apiClient.delete(`/tasks/${id}`),
  milestones: (projectId: string) =>
    apiClient.get<Milestone[]>("/tasks/milestones/list", {
      params: projectId ? { project_id: projectId } : {},
    }).then(r => r.data),
  createMs:   (d: Record<string, unknown>) => apiClient.post<Milestone>("/tasks/milestones", d).then(r => r.data),
  updateMs:   (id: string, d: Record<string, unknown>) => apiClient.put<Milestone>(`/tasks/milestones/${id}`, d).then(r => r.data),
  completeMs: (id: string) => apiClient.post<Milestone>(`/tasks/milestones/${id}/complete`).then(r => r.data),
  projects:   () => apiClient.get<Project[]>("/projects").then(r => r.data),
  employees:  () => apiClient.get<Employee[]>("/employees").then(r => r.data),
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STATUS_CONFIG: Record<string, { label: string; style: string; dot: string }> = {
  todo:        { label: "To Do",       style: "bg-gray-100 text-gray-600",       dot: "bg-gray-400"    },
  in_progress: { label: "In Progress", style: "bg-blue-100 text-blue-700",       dot: "bg-blue-500"    },
  in_review:   { label: "In Review",   style: "bg-purple-100 text-purple-700",   dot: "bg-purple-500"  },
  done:        { label: "Done",        style: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  blocked:     { label: "Blocked",     style: "bg-red-100 text-red-700",         dot: "bg-red-500"     },
};

const PRIORITY_STYLE: Record<string, string> = {
  low:      "text-gray-500 bg-gray-50",
  medium:   "text-amber-600 bg-amber-50",
  high:     "text-orange-600 bg-orange-50",
  critical: "text-red-600 bg-red-50",
};

const MS_STATUS_CONFIG: Record<string, { label: string; style: string }> = {
  pending:   { label: "Pending",   style: "bg-amber-100 text-amber-700"     },
  completed: { label: "Completed", style: "bg-emerald-100 text-emerald-700" },
  missed:    { label: "Missed",    style: "bg-red-100 text-red-700"         },
};

const inputCls = "w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white text-gray-900 placeholder-gray-400";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function empName(e: EmployeeBrief) { return `${e.first_name} ${e.last_name}`; }

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
      <button onClick={onClose}><X className="w-3.5 h-3.5 ml-1 opacity-75 hover:opacity-100" /></button>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.18 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
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

function ModalFooter({ onClose, isPending, label }: { onClose: () => void; isPending: boolean; label: string }) {
  return (
    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
      <button type="button" onClick={onClose}
        className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition">Cancel</button>
      <button type="submit" disabled={isPending}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition">
        {isPending && <Loader2 className="w-4 h-4 animate-spin" />}{label}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Task Form Modal
// ---------------------------------------------------------------------------

const EMPTY_TASK = {
  title: "", description: "", project_id: "", assignee_id: "",
  status: "todo", priority: "medium", due_date: "", estimated_hours: "",
};

function TaskModal({ initial, onClose, onSuccess, projects, employees }: {
  initial?: Task; onClose: () => void; onSuccess: (m: string) => void;
  projects: Project[]; employees: Employee[];
}) {
  const qc = useQueryClient();
  const isEdit = !!initial;
  const [form, setForm] = useState(initial ? {
    title: initial.title,
    description: initial.description ?? "",
    project_id: initial.project?.id ?? "",
    assignee_id: initial.assignee?.id ?? "",
    status: initial.status,
    priority: initial.priority,
    due_date: initial.due_date ?? "",
    estimated_hours: String(initial.estimated_hours ?? ""),
  } : EMPTY_TASK);
  const [err, setErr] = useState<string | null>(null);
  const [fe, setFe] = useState<Record<string, string>>({});
  const set = (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm(f => ({ ...f, [k]: e.target.value }));
      if (fe[k]) setFe(p => ({ ...p, [k]: "" }));
    };

  function validate(): boolean {
    const errs: Record<string, string> = {};
    const titleErr = V.chain(V.required, V.minLen(2, "Title"))(form.title);
    if (titleErr) errs.title = titleErr;
    setFe(errs);
    return Object.keys(errs).length === 0;
  }

  const mut = useMutation({
    mutationFn: () => {
      const payload = {
        ...form,
        assignee_id: form.assignee_id || null,
        project_id: form.project_id || undefined,
        due_date: form.due_date || null,
        estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : null,
      };
      return isEdit ? api.updateTask(initial!.id, payload) : api.createTask(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["task-dashboard"] });
      onSuccess(isEdit ? "Task updated" : "Task created");
      onClose();
    },
    onError: (e: AxiosError<{ detail: string }>) =>
      setErr(e.response?.data?.detail ?? "Failed"),
  });

  return (
    <Modal title={isEdit ? "Edit Task" : "New Task"} onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); if (validate()) mut.mutate(); }} className="space-y-4">
        <Field label="Title" required>
          <input value={form.title} onChange={set("title")} placeholder="Task title" className={inputCls} />
          {fe.title && <span className={ERR_CLS}>{fe.title}</span>}
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Project" required>
            <select value={form.project_id} onChange={set("project_id")} className={inputCls}>
              <option value="">Select project</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </Field>
          <Field label="Assignee">
            <select value={form.assignee_id} onChange={set("assignee_id")} className={inputCls}>
              <option value="">Unassigned</option>
              {employees.map(e => <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>)}
            </select>
          </Field>
          <Field label="Status" required>
            <select value={form.status} onChange={set("status")} className={inputCls}>
              {TASK_STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
            </select>
          </Field>
          <Field label="Priority" required>
            <select value={form.priority} onChange={set("priority")} className={inputCls}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </Field>
          <Field label="Due Date">
            <input type="date" value={form.due_date} onChange={set("due_date")} className={inputCls} />
          </Field>
          <Field label="Estimated Hours">
            <input type="number" step="0.5" value={form.estimated_hours} onChange={set("estimated_hours")}
              placeholder="e.g. 8" className={inputCls} />
          </Field>
        </div>
        <Field label="Description">
          <textarea value={form.description} onChange={set("description")} rows={2} className={inputCls + " resize-none"} />
        </Field>
        {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
        <ModalFooter onClose={onClose} isPending={mut.isPending} label={isEdit ? "Save Changes" : "Create Task"} />
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Milestone Modal
// ---------------------------------------------------------------------------

function MilestoneModal({ initial, onClose, onSuccess, projects }: {
  initial?: Milestone; onClose: () => void; onSuccess: (m: string) => void; projects: Project[];
}) {
  const qc = useQueryClient();
  const isEdit = !!initial;
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    description: initial?.description ?? "",
    project_id: initial?.project?.id ?? "",
    due_date: initial?.due_date ?? "",
  });
  const [err, setErr] = useState<string | null>(null);
  const set = (k: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }));

  const mut = useMutation({
    mutationFn: () => isEdit
      ? api.updateMs(initial!.id, { title: form.title, description: form.description || null, due_date: form.due_date })
      : api.createMs({ ...form, description: form.description || null }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["milestones"] });
      onSuccess(isEdit ? "Milestone updated" : "Milestone created");
      onClose();
    },
    onError: (e: AxiosError<{ detail: string }>) =>
      setErr(e.response?.data?.detail ?? "Failed"),
  });

  return (
    <Modal title={isEdit ? "Edit Milestone" : "New Milestone"} onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); mut.mutate(); }} className="space-y-4">
        <Field label="Title" required>
          <input value={form.title} onChange={set("title")} placeholder="Milestone title" className={inputCls} />
        </Field>
        <Field label="Project" required>
          <select value={form.project_id} onChange={set("project_id")} className={inputCls} disabled={isEdit}>
            <option value="">Select project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Due Date" required>
          <input type="date" value={form.due_date} onChange={set("due_date")} className={inputCls} />
        </Field>
        <Field label="Description">
          <textarea value={form.description} onChange={set("description")} rows={2} className={inputCls + " resize-none"} />
        </Field>
        {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
        <ModalFooter onClose={onClose} isPending={mut.isPending} label={isEdit ? "Save Changes" : "Create Milestone"} />
      </form>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

type ActiveModal =
  | { type: "new-task" }
  | { type: "edit-task"; task: Task }
  | { type: "new-ms" }
  | { type: "edit-ms"; ms: Milestone };

export default function TasksPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"tasks" | "milestones">("tasks");
  const [modal, setModal] = useState<ActiveModal | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [dSearch, setDSearch] = useState("");
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => setDSearch(search), 400);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [search]);

  const { data: dashboard } = useQuery({
    queryKey: ["task-dashboard"],
    queryFn: api.dashboard,
    staleTime: 30_000,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ["projects"],
    queryFn: api.projects,
    staleTime: 5 * 60_000,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: api.employees,
    staleTime: 5 * 60_000,
  });

  const { data: tasks = [], isLoading: tasksLoading, isError: tasksError } = useQuery({
    queryKey: ["tasks", projectFilter, statusFilter, dSearch],
    queryFn: () => api.tasks(projectFilter, statusFilter, dSearch),
    enabled: activeTab === "tasks",
  });

  const { data: milestones = [], isLoading: msLoading } = useQuery({
    queryKey: ["milestones", projectFilter],
    queryFn: () => api.milestones(projectFilter),
    enabled: activeTab === "milestones",
  });

  const deactivateMut = useMutation({
    mutationFn: (id: string) => api.deactivate(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks"] });
      qc.invalidateQueries({ queryKey: ["task-dashboard"] });
      showToast("Task deactivated");
    },
  });

  const completeMsMut = useMutation({
    mutationFn: (id: string) => api.completeMs(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["milestones"] }); showToast("Milestone completed"); },
    onError: (e: AxiosError<{ detail: string }>) => showToast(e.response?.data?.detail ?? "Failed", "error"),
  });

  const showToast = (msg: string, type: "success" | "error" = "success") => setToast({ msg, type });

  const filteredTasks = dSearch
    ? tasks.filter(t => t.title.toLowerCase().includes(dSearch.toLowerCase()))
    : tasks;

  const msByProject = milestones.reduce<Record<string, { project: ProjectBrief | null; items: Milestone[] }>>((acc, m) => {
    const key = m.project?.id ?? "no-project";
    if (!acc[key]) acc[key] = { project: m.project, items: [] };
    acc[key].items.push(m);
    return acc;
  }, {});

  const activeTask = modal?.type === "edit-task" ? modal.task : null;
  const activeMs   = modal?.type === "edit-ms"   ? modal.ms   : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tasks & Milestones</h1>
          <p className="text-sm text-gray-500">Track work across all projects</p>
        </div>
        <button
          onClick={() => setModal(activeTab === "tasks" ? { type: "new-task" } : { type: "new-ms" })}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition shadow-sm">
          <Plus className="w-4 h-4" />
          {activeTab === "tasks" ? "New Task" : "New Milestone"}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-6 gap-4">
        <KpiCard label="Total Tasks"  value={String(dashboard?.total       ?? "—")} icon={ListTodo}    color="blue"    index={0} />
        <KpiCard label="Completed"    value={String(dashboard?.completed   ?? "—")} icon={CheckCheck}  color="emerald" index={1} />
        <KpiCard label="In Progress"  value={String(dashboard?.in_progress ?? "—")} icon={Clock}       color="purple"  index={2} />
        <KpiCard label="Overdue"      value={String(dashboard?.overdue     ?? "—")} icon={AlertCircle} color="red"     index={3} />
        <KpiCard label="To Do"        value={String(dashboard?.todo        ?? "—")} icon={Target}      color="orange"  index={4} />
        <KpiCard label="Blocked"      value={String(dashboard?.blocked     ?? "—")} icon={Flag}        color="red"     index={5} />
      </div>

      {/* Main panel */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
            {(["tasks", "milestones"] as const).map(t => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={cn("px-4 py-1.5 text-sm font-medium rounded-lg transition capitalize",
                  activeTab === t ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700")}>
                {t}
              </button>
            ))}
          </div>

          <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          {activeTab === "tasks" && (
            <>
              <div className="flex gap-1.5 flex-wrap">
                {[{ key: "all", label: "All" }, ...TASK_STATUSES.map(s => ({ key: s, label: STATUS_CONFIG[s].label }))].map(opt => (
                  <button key={opt.key} onClick={() => setStatusFilter(opt.key)}
                    className={cn("text-xs px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap",
                      statusFilter === opt.key ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100")}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 ml-auto bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..."
                  className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-36" />
              </div>
            </>
          )}
        </div>

        {/* Tasks table */}
        {activeTab === "tasks" && (
          <div className="overflow-x-auto">
            {tasksError && (
              <div className="p-6 flex items-center gap-3 text-red-600 text-sm">
                <AlertCircle className="w-5 h-5" />Failed to load tasks. Check backend is running.
              </div>
            )}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Task","Project","Assignee","Priority","Status","Due Date","Est. Hrs",""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTasks.map((task, i) => {
                  const scfg = STATUS_CONFIG[task.status] ?? STATUS_CONFIG.todo;
                  return (
                    <motion.tr key={task.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}
                      className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3.5 max-w-xs">
                        <p className={cn("font-medium text-gray-900 leading-tight", task.is_overdue && "text-red-700")}>{task.title}</p>
                        {task.is_overdue && <p className="text-xs text-red-500 mt-0.5">Overdue</p>}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-500 whitespace-nowrap">{task.project?.code ?? "—"}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {task.assignee
                          ? <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-lg font-medium">{empName(task.assignee)}</span>
                          : <span className="text-xs text-gray-400">Unassigned</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn("text-xs px-2 py-1 rounded-full font-semibold capitalize", PRIORITY_STYLE[task.priority])}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={cn("text-xs px-2 py-1 rounded-full font-semibold flex items-center gap-1 w-fit", scfg.style)}>
                          <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", scfg.dot)} />{scfg.label}
                        </span>
                      </td>
                      <td className={cn("px-4 py-3.5 text-xs whitespace-nowrap", task.is_overdue ? "text-red-600 font-semibold" : "text-gray-500")}>
                        {task.due_date ?? "—"}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-500">{task.estimated_hours ?? "—"}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setModal({ type: "edit-task", task })}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium">Edit</button>
                          <button onClick={() => { if (window.confirm("Deactivate this task?")) deactivateMut.mutate(task.id); }}
                            className="text-xs text-red-500 hover:text-red-600 font-medium">Remove</button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
            {!tasksLoading && filteredTasks.length === 0 && (
              <div className="py-16 text-center text-gray-400 text-sm">
                {search || statusFilter !== "all" || projectFilter
                  ? "No tasks match your filters."
                  : "No tasks yet. Create the first task."}
              </div>
            )}
            {tasksLoading && (
              <div className="py-16 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            )}
          </div>
        )}

        {/* Milestones panel */}
        {activeTab === "milestones" && (
          <div className="p-5 space-y-5">
            {msLoading && <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>}
            {!msLoading && Object.keys(msByProject).length === 0 && (
              <div className="py-16 text-center text-gray-400 text-sm">No milestones yet. Create the first milestone.</div>
            )}
            {Object.entries(msByProject).map(([key, { project, items }]) => (
              <div key={key}>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                  {project ? `${project.name} (${project.code})` : "No Project"}
                </p>
                <div className="space-y-2">
                  {items.map((ms, i) => {
                    const scfg = MS_STATUS_CONFIG[ms.status] ?? MS_STATUS_CONFIG.pending;
                    return (
                      <motion.div key={ms.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">
                        <div className={cn("w-2 h-2 rounded-full flex-shrink-0",
                          ms.status === "completed" ? "bg-emerald-500" : ms.status === "missed" ? "bg-red-500" : "bg-amber-400")} />
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-medium text-gray-900", ms.status === "completed" && "line-through text-gray-400")}>
                            {ms.title}
                          </p>
                          {ms.description && <p className="text-xs text-gray-500 truncate">{ms.description}</p>}
                        </div>
                        <span className={cn("text-xs px-2 py-1 rounded-full font-semibold whitespace-nowrap", scfg.style)}>{scfg.label}</span>
                        <span className="text-xs text-gray-400 whitespace-nowrap">{ms.due_date}</span>
                        <div className="flex items-center gap-2">
                          {ms.status === "pending" && (
                            <button onClick={() => completeMsMut.mutate(ms.id)} disabled={completeMsMut.isPending}
                              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium whitespace-nowrap">
                              Complete
                            </button>
                          )}
                          <button onClick={() => setModal({ type: "edit-ms", ms })}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium">Edit</button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence mode="wait">
        {modal?.type === "new-task" && (
          <TaskModal key="new-task" onClose={() => setModal(null)} onSuccess={showToast} projects={projects} employees={employees} />
        )}
        {modal?.type === "edit-task" && activeTask && (
          <TaskModal key={`edit-task-${activeTask.id}`} initial={activeTask} onClose={() => setModal(null)} onSuccess={showToast} projects={projects} employees={employees} />
        )}
        {modal?.type === "new-ms" && (
          <MilestoneModal key="new-ms" onClose={() => setModal(null)} onSuccess={showToast} projects={projects} />
        )}
        {modal?.type === "edit-ms" && activeMs && (
          <MilestoneModal key={`edit-ms-${activeMs.id}`} initial={activeMs} onClose={() => setModal(null)} onSuccess={showToast} projects={projects} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className={cn(
              "fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl text-sm font-medium",
              toast.type === "success"
                ? "bg-white border border-gray-100 text-gray-800"
                : "bg-red-50 border border-red-100 text-red-700"
            )}
          >
            {toast.type === "success"
              ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              : <AlertCircle  className="w-4 h-4 text-red-500 shrink-0" />}
            {toast.msg}
            <button onClick={() => setToast(null)} className="ml-1 opacity-60 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
