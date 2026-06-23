"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle, Calendar, Check, CheckCircle2, ChevronDown, Clock, Download,
  Loader2, LogIn, LogOut, Plus, RefreshCw, X, XCircle,
} from "lucide-react";
import { exportCSV, exportXLSX, exportPDF } from "@/lib/export";
import { V } from "@/lib/validation";
import { apiClient } from "@/lib/api/client";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface EmployeeBrief { id: string; first_name: string; last_name: string; employee_code: string; job_title: string | null }
interface AttendanceRecord {
  id: string; employee_id: string; employee: EmployeeBrief | null;
  date: string; check_in: string | null; check_out: string | null;
  status: string; work_hours: string | null; notes: string | null; created_at: string;
}
interface LeaveRequest {
  id: string; employee_id: string; employee: EmployeeBrief | null;
  approved_by: string | null; approver: EmployeeBrief | null;
  leave_type: string; start_date: string; end_date: string; days: string;
  reason: string | null; status: string; rejection_reason: string | null; created_at: string;
}
interface MonthlyReportRow {
  employee_id: string; employee_name: string; employee_code: string;
  present: number; absent: number; late: number; half_day: number; on_leave: number; total_hours: string;
}
interface MonthlyReport { year: number; month: number; rows: MonthlyReportRow[]; total_employees: number }

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const TABS = ["My Attendance", "Team Attendance", "Leave Requests", "Monthly Report"] as const;
type Tab = typeof TABS[number];

const LEAVE_TYPES = ["annual", "sick", "casual", "maternity", "paternity", "unpaid"] as const;
const STATUS_COLORS: Record<string, string> = {
  present: "bg-emerald-100 text-emerald-700",
  absent:  "bg-red-100 text-red-700",
  late:    "bg-amber-100 text-amber-700",
  half_day:"bg-blue-100 text-blue-700",
  on_leave:"bg-purple-100 text-purple-700",
  pending: "bg-amber-100 text-amber-700",
  approved:"bg-emerald-100 text-emerald-700",
  rejected:"bg-red-100 text-red-700",
  cancelled:"bg-gray-100 text-gray-500",
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmt(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function badge(status: string) {
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize", STATUS_COLORS[status] ?? "bg-gray-100 text-gray-600")}>
      {status.replace("_", " ")}
    </span>
  );
}

// ---------------------------------------------------------------------------
// API layer
// ---------------------------------------------------------------------------
const api = {
  today:       () => apiClient.get<AttendanceRecord | null>("/attendance/today").then(r => r.data),
  checkIn:     (notes?: string) => apiClient.post<AttendanceRecord>("/attendance/check-in", { notes }).then(r => r.data),
  checkOut:    (notes?: string) => apiClient.post<AttendanceRecord>("/attendance/check-out", { notes }).then(r => r.data),
  list:        (p: Record<string, string | undefined>) => apiClient.get<AttendanceRecord[]>("/attendance", { params: p }).then(r => r.data),
  leave:       (p: Record<string, string | undefined>) => apiClient.get<LeaveRequest[]>("/attendance/leave", { params: p }).then(r => r.data),
  submitLeave: (d: object) => apiClient.post<LeaveRequest>("/attendance/leave", d).then(r => r.data),
  approveLeave:(id: string) => apiClient.put<LeaveRequest>(`/attendance/leave/${id}/approve`).then(r => r.data),
  rejectLeave: (id: string, rejection_reason: string) => apiClient.put<LeaveRequest>(`/attendance/leave/${id}/reject`, { rejection_reason }).then(r => r.data),
  cancelLeave: (id: string) => apiClient.put<LeaveRequest>(`/attendance/leave/${id}/cancel`).then(r => r.data),
  monthly:     (year: number, month: number) => apiClient.get<MonthlyReport>("/attendance/monthly-report", { params: { year, month } }).then(r => r.data),
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function AttendancePage() {
  const [tab, setTab] = useState<Tab>("My Attendance");
  const qc = useQueryClient();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance & Leave</h1>
        <p className="text-sm text-gray-500 mt-0.5">Track daily attendance and manage leave requests</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
              tab === t ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
            {t}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
          {tab === "My Attendance"   && <MyAttendanceTab qc={qc} />}
          {tab === "Team Attendance" && <TeamAttendanceTab />}
          {tab === "Leave Requests"  && <LeaveRequestsTab qc={qc} />}
          {tab === "Monthly Report"  && <MonthlyReportTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 1 — My Attendance
// ---------------------------------------------------------------------------
function MyAttendanceTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const { data: today, isLoading } = useQuery({
    queryKey: ["attendance-today"],
    queryFn: api.today,
    refetchInterval: 60_000,
  });

  const { data: myHistory } = useQuery({
    queryKey: ["attendance-my"],
    queryFn: () => api.list({ limit: "30" }),
  });

  const muCheckIn  = useMutation({ mutationFn: () => api.checkIn(), onSuccess: () => { qc.invalidateQueries({ queryKey: ["attendance-today"] }); qc.invalidateQueries({ queryKey: ["attendance-my"] }); } });
  const muCheckOut = useMutation({ mutationFn: () => api.checkOut(), onSuccess: () => { qc.invalidateQueries({ queryKey: ["attendance-today"] }); qc.invalidateQueries({ queryKey: ["attendance-my"] }); } });

  const [ciErr, setCiErr] = useState("");
  const [coErr, setCoErr] = useState("");

  const handleCheckIn = async () => {
    setCiErr("");
    try { await muCheckIn.mutateAsync(); } catch (e: unknown) { setCiErr((e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? "Check-in failed"); }
  };
  const handleCheckOut = async () => {
    setCoErr("");
    try { await muCheckOut.mutateAsync(); } catch (e: unknown) { setCoErr((e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? "Check-out failed"); }
  };

  const checkedIn  = !!today?.check_in;
  const checkedOut = !!today?.check_out;

  return (
    <div className="space-y-5">
      {/* Today widget */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-gray-900">Today</h2>
            <p className="text-sm text-gray-500">{new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
          {today && badge(today.status)}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-5">
          {[
            { label: "Check In",  value: fmt(today?.check_in  ?? null), icon: LogIn  },
            { label: "Check Out", value: fmt(today?.check_out ?? null), icon: LogOut },
            { label: "Hours",     value: today?.work_hours ? `${today.work_hours}h` : "—", icon: Clock },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
              <Icon className="w-4 h-4 mx-auto text-gray-400 mb-1" />
              <p className="text-lg font-bold text-gray-800">{isLoading ? "—" : value}</p>
              <p className="text-xs text-gray-400">{label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={handleCheckIn}
            disabled={checkedIn || muCheckIn.isPending}
            className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all",
              checkedIn ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700")}>
            {muCheckIn.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            {checkedIn ? "Checked In" : "Check In"}
          </button>
          <button onClick={handleCheckOut}
            disabled={!checkedIn || checkedOut || muCheckOut.isPending}
            className={cn("flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all",
              !checkedIn || checkedOut ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700")}>
            {muCheckOut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            {checkedOut ? "Checked Out" : "Check Out"}
          </button>
        </div>
        {ciErr && <p className="text-xs text-red-500 mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{ciErr}</p>}
        {coErr && <p className="text-xs text-red-500 mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{coErr}</p>}
      </div>

      {/* Recent history */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50">
          <h3 className="font-semibold text-gray-900 text-sm">Recent Attendance</h3>
        </div>
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 text-left text-xs text-gray-500">
            {["Date","Check In","Check Out","Hours","Status"].map(h => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}
          </tr></thead>
          <tbody>
            {(myHistory ?? []).slice(0, 15).map(r => (
              <tr key={r.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-2.5 text-gray-700">{fmtDate(r.date)}</td>
                <td className="px-4 py-2.5 text-gray-600">{fmt(r.check_in)}</td>
                <td className="px-4 py-2.5 text-gray-600">{fmt(r.check_out)}</td>
                <td className="px-4 py-2.5 text-gray-600">{r.work_hours ? `${r.work_hours}h` : "—"}</td>
                <td className="px-4 py-2.5">{badge(r.status)}</td>
              </tr>
            ))}
            {!myHistory?.length && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">No attendance records yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 2 — Team Attendance
// ---------------------------------------------------------------------------
function TeamAttendanceTab() {
  const today = new Date().toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo,   setDateTo]   = useState(today);
  const [statusFilter, setStatusFilter] = useState("");

  const { data: records, isLoading } = useQuery({
    queryKey: ["attendance-team", dateFrom, dateTo, statusFilter],
    queryFn: () => api.list({ date_from: dateFrom, date_to: dateTo, status: statusFilter || undefined, limit: "500" }),
  });

  const rows = records ?? [];
  const exportRows = rows.map(r => [
    r.employee?.employee_code ?? "", `${r.employee?.first_name ?? ""} ${r.employee?.last_name ?? ""}`.trim(),
    r.date, fmt(r.check_in), fmt(r.check_out), r.work_hours ?? "", r.status, r.notes ?? "",
  ]);
  const headers = ["Code","Employee","Date","Check In","Check Out","Hours","Status","Notes"];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-end gap-3">
        <div><label className="text-xs text-gray-500 mb-1 block">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
        </div>
        <div><label className="text-xs text-gray-500 mb-1 block">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm" />
        </div>
        <div><label className="text-xs text-gray-500 mb-1 block">Status</label>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
            <option value="">All</option>
            {["present","absent","late","half_day","on_leave"].map(s => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
          </select>
        </div>
        <div className="ml-auto flex gap-2">
          <button onClick={() => exportCSV("attendance", headers, exportRows)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 border border-gray-200">
            <Download className="w-3.5 h-3.5" />CSV
          </button>
          <button onClick={() => exportXLSX("attendance", headers, exportRows)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 border border-emerald-200">
            <Download className="w-3.5 h-3.5" />XLSX
          </button>
          <button onClick={() => exportPDF("attendance", "Team Attendance Report", headers, exportRows)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 border border-red-200">
            <Download className="w-3.5 h-3.5" />PDF
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm">{rows.length} records</h3>
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-left text-xs text-gray-500">
              {headers.map(h => <th key={h} className="px-4 py-2.5 font-medium whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-gray-500 font-mono text-xs">{r.employee?.employee_code ?? "—"}</td>
                  <td className="px-4 py-2.5 text-gray-800 font-medium">{r.employee ? `${r.employee.first_name} ${r.employee.last_name}` : "—"}</td>
                  <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{fmtDate(r.date)}</td>
                  <td className="px-4 py-2.5 text-gray-600">{fmt(r.check_in)}</td>
                  <td className="px-4 py-2.5 text-gray-600">{fmt(r.check_out)}</td>
                  <td className="px-4 py-2.5 text-gray-600">{r.work_hours ? `${r.work_hours}h` : "—"}</td>
                  <td className="px-4 py-2.5">{badge(r.status)}</td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs max-w-[160px] truncate">{r.notes ?? "—"}</td>
                </tr>
              ))}
              {!rows.length && !isLoading && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No records for selected range</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 3 — Leave Requests
// ---------------------------------------------------------------------------
function LeaveRequestsTab({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const [showModal, setShowModal] = useState(false);
  const [rejectId, setRejectId]   = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [err, setErr] = useState("");

  const { data: leaves, isLoading } = useQuery({
    queryKey: ["leave-list", statusFilter],
    queryFn: () => api.leave({ status: statusFilter || undefined, limit: "200" }),
  });

  const inv = () => qc.invalidateQueries({ queryKey: ["leave-list"] });

  const muApprove = useMutation({ mutationFn: (id: string) => api.approveLeave(id), onSuccess: inv });
  const muReject  = useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => api.rejectLeave(id, reason), onSuccess: () => { inv(); setRejectId(null); setRejectReason(""); } });
  const muCancel  = useMutation({ mutationFn: (id: string) => api.cancelLeave(id), onSuccess: inv });

  const EMPTY = { leave_type: "annual", start_date: "", end_date: "", reason: "" };
  const [form, setForm] = useState({ ...EMPTY });
  const [leaveErr, setLeaveErr] = useState("");
  const muSubmit = useMutation({
    mutationFn: () => api.submitLeave(form),
    onSuccess: () => { inv(); setShowModal(false); setForm({ ...EMPTY }); setErr(""); setLeaveErr(""); },
    onError: (e: unknown) => setErr((e as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? "Submit failed"),
  });

  function validateLeave(): boolean {
    const dateErr = V.dateOrder(form.start_date, form.end_date);
    if (dateErr) { setLeaveErr(dateErr); return false; }
    setLeaveErr("");
    return true;
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {["", "pending", "approved", "rejected", "cancelled"].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all",
                statusFilter === s ? "bg-blue-600 text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50")}>
              {s || "All"}
            </button>
          ))}
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Request Leave
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-left text-xs text-gray-500">
              {["Employee","Type","From","To","Days","Status","Approver","Actions"].map(h => <th key={h} className="px-4 py-2.5 font-medium whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {(leaves ?? []).map(l => (
                <tr key={l.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-800">{l.employee ? `${l.employee.first_name} ${l.employee.last_name}` : "—"}</td>
                  <td className="px-4 py-3 capitalize text-gray-600">{l.leave_type.replace("_"," ")}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(l.start_date)}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(l.end_date)}</td>
                  <td className="px-4 py-3 text-gray-600">{l.days}</td>
                  <td className="px-4 py-3">{badge(l.status)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{l.approver ? `${l.approver.first_name} ${l.approver.last_name}` : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      {l.status === "pending" && (
                        <>
                          <button onClick={() => muApprove.mutate(l.id)} disabled={muApprove.isPending}
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors" title="Approve">
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => { setRejectId(l.id); setRejectReason(""); }}
                            className="p-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors" title="Reject">
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => muCancel.mutate(l.id)} disabled={muCancel.isPending}
                            className="p-1.5 rounded-lg bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors" title="Cancel (own)">
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && !leaves?.length && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No leave requests</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Submit Leave Modal */}
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Request Leave</h3>
                <button onClick={() => { setShowModal(false); setErr(""); }} className="p-1 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Leave Type</label>
                  <select value={form.leave_type} onChange={e => setForm(f => ({ ...f, leave_type: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    {LEAVE_TYPES.map(t => <option key={t} value={t}>{t.replace("_"," ")}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Start Date</label>
                    <input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">End Date</label>
                    <input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Reason (optional)</label>
                  <textarea value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none" placeholder="Reason for leave..." />
                </div>
                {(err || leaveErr) && <p className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{err || leaveErr}</p>}
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => { setShowModal(false); setErr(""); setLeaveErr(""); }} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={() => { if (validateLeave()) muSubmit.mutate(); }} disabled={muSubmit.isPending || !form.start_date || !form.end_date}
                  className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {muSubmit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Submit
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {rejectId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
              <h3 className="font-semibold text-gray-900 mb-3">Reject Leave Request</h3>
              <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
                placeholder="Reason for rejection (required)" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none mb-3" />
              <div className="flex gap-2">
                <button onClick={() => { setRejectId(null); setRejectReason(""); }} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
                <button onClick={() => rejectId && muReject.mutate({ id: rejectId, reason: rejectReason })}
                  disabled={!rejectReason.trim() || muReject.isPending}
                  className="flex-1 py-2 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {muReject.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Reject
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab 4 — Monthly Report
// ---------------------------------------------------------------------------
function MonthlyReportTab() {
  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const { data: report, isLoading, refetch } = useQuery({
    queryKey: ["monthly-report", year, month],
    queryFn: () => api.monthly(year, month),
    enabled: true,
  });

  const rows = report?.rows ?? [];
  const totals = rows.reduce((acc, r) => ({
    present:    acc.present    + r.present,
    absent:     acc.absent     + r.absent,
    late:       acc.late       + r.late,
    half_day:   acc.half_day   + r.half_day,
    on_leave:   acc.on_leave   + r.on_leave,
    total_hours:acc.total_hours + parseFloat(r.total_hours),
  }), { present: 0, absent: 0, late: 0, half_day: 0, on_leave: 0, total_hours: 0 });

  const exportHeaders = ["Code","Employee","Present","Absent","Late","Half Day","On Leave","Total Hours"];
  const exportRows = rows.map(r => [r.employee_code, r.employee_name, r.present, r.absent, r.late, r.half_day, r.on_leave, r.total_hours]);

  const [exportOpen, setExportOpen] = useState(false);
  async function handleExport(fmt: "csv" | "xlsx" | "pdf") {
    setExportOpen(false);
    const fname = `nevark-attendance-${year}-${String(month).padStart(2,"0")}`;
    if (fmt === "csv")  exportCSV(fname, exportHeaders, exportRows);
    if (fmt === "xlsx") await exportXLSX(fname, exportHeaders, exportRows);
    if (fmt === "pdf")  await exportPDF(fname, "Nevark MSS — Monthly Attendance", exportHeaders, exportRows);
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-end gap-3">
        <div><label className="text-xs text-gray-500 mb-1 block">Year</label>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
            {[now.getFullYear()-1, now.getFullYear()].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div><label className="text-xs text-gray-500 mb-1 block">Month</label>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm">
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <button onClick={() => refetch()} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
        <div className="ml-auto flex gap-2">
          <button onClick={() => exportCSV(`attendance-${year}-${month}`, exportHeaders, exportRows)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 border border-gray-200">
            <Download className="w-3.5 h-3.5" />CSV
          </button>
          <button onClick={() => exportXLSX(`attendance-${year}-${month}`, exportHeaders, exportRows)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 border border-emerald-200">
            <Download className="w-3.5 h-3.5" />XLSX
          </button>
          <button onClick={() => exportPDF(`attendance-${year}-${month}`, `Attendance Report — ${MONTHS[month-1]} ${year}`, exportHeaders, exportRows)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-lg hover:bg-red-100 border border-red-200">
            <Download className="w-3.5 h-3.5" />PDF
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {[
            { label: "Present",    value: totals.present,    color: "text-emerald-600 bg-emerald-50" },
            { label: "Absent",     value: totals.absent,     color: "text-red-600 bg-red-50"         },
            { label: "Late",       value: totals.late,       color: "text-amber-600 bg-amber-50"     },
            { label: "Half Day",   value: totals.half_day,   color: "text-blue-600 bg-blue-50"       },
            { label: "On Leave",   value: totals.on_leave,   color: "text-purple-600 bg-purple-50"   },
            { label: "Total Hours",value: totals.total_hours.toFixed(1) + "h", color: "text-gray-700 bg-gray-50" },
          ].map(({ label, value, color }) => (
            <div key={label} className={cn("rounded-xl p-3 text-center", color.split(" ")[1])}>
              <p className={cn("text-xl font-bold", color.split(" ")[0])}>{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm">{MONTHS[month-1]} {year} — {rows.length} employees</h3>
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 text-left text-xs text-gray-500">
              {exportHeaders.map(h => <th key={h} className="px-4 py-2.5 font-medium whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.employee_id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{r.employee_code}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-800">{r.employee_name}</td>
                  <td className="px-4 py-2.5 text-emerald-600 font-semibold">{r.present}</td>
                  <td className="px-4 py-2.5 text-red-600">{r.absent}</td>
                  <td className="px-4 py-2.5 text-amber-600">{r.late}</td>
                  <td className="px-4 py-2.5 text-blue-600">{r.half_day}</td>
                  <td className="px-4 py-2.5 text-purple-600">{r.on_leave}</td>
                  <td className="px-4 py-2.5 text-gray-500 font-mono">{parseFloat(r.total_hours || "0").toFixed(1)}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && !isLoading && (
          <div className="py-12 text-center text-gray-400 text-sm">
            No attendance data for {MONTHS[month - 1]} {year}.
          </div>
        )}
        {isLoading && (
          <div className="py-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}
      </div>

      {/* Export */}
      <div className="flex justify-end">
        <div className="relative">
          <button
            onClick={() => setExportOpen(v => !v)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
          >
            <Download className="w-4 h-4" />Export Report
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>
          {exportOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setExportOpen(false)} />
              <div className="absolute right-0 bottom-full mb-1 w-36 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                {(["xlsx", "csv", "pdf"] as const).map(fmt => (
                  <button key={fmt} onClick={() => handleExport(fmt)}
                    className="w-full px-4 py-2.5 text-sm text-left text-gray-700 hover:bg-gray-50 transition uppercase font-medium tracking-wide">
                    {fmt}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
