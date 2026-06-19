"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Bell, Briefcase, CheckCircle2, FileText, Loader2, Users, Wallet,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Notification {
  id: string;
  entity_type: string;
  entity_id: string | null;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationList { total: number; unread: number; items: Notification[] }

const FILTERS = ["all", "task", "project", "finance", "document", "employee", "system"] as const;
type Filter = typeof FILTERS[number];

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
const api = {
  list: (skip: number, filter: Filter) => {
    const params = new URLSearchParams({ skip: String(skip), limit: "30" });
    if (filter !== "all") params.set("entity_type", filter);
    return apiClient.get<NotificationList>(`/notifications?${params}`).then((r) => r.data);
  },
  markRead: (id: string) => apiClient.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => apiClient.post("/notifications/read-all").then((r) => r.data),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ENTITY_STYLES: Record<string, { Icon: React.ElementType; color: string; label: string }> = {
  task:     { Icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50 border-emerald-100", label: "Task"     },
  project:  { Icon: Briefcase,   color: "text-blue-600 bg-blue-50 border-blue-100",           label: "Project"  },
  finance:  { Icon: Wallet,      color: "text-purple-600 bg-purple-50 border-purple-100",     label: "Finance"  },
  document: { Icon: FileText,    color: "text-orange-600 bg-orange-50 border-orange-100",     label: "Document" },
  employee: { Icon: Users,       color: "text-teal-600 bg-teal-50 border-teal-100",           label: "Employee" },
  system:   { Icon: Bell,        color: "text-gray-600 bg-gray-100 border-gray-200",          label: "System"   },
};

function entityStyle(type: string) {
  return ENTITY_STYLES[type] ?? ENTITY_STYLES.system;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function NotificationsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(0);
  const qc = useQueryClient();
  const PAGE_SIZE = 30;

  const { data, isLoading } = useQuery({
    queryKey: ["notifications-page", filter, page],
    queryFn: () => api.list(page * PAGE_SIZE, filter),
    staleTime: 15_000,
  });

  const markRead = useMutation({
    mutationFn: api.markRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notif-unread"] });
      qc.invalidateQueries({ queryKey: ["notifications-page"] });
      qc.invalidateQueries({ queryKey: ["notif-feed"] });
    },
  });

  const markAll = useMutation({
    mutationFn: api.markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notif-unread"] });
      qc.invalidateQueries({ queryKey: ["notifications-page"] });
      qc.invalidateQueries({ queryKey: ["notif-feed"] });
    },
  });

  const notifications = data?.items ?? [];
  const totalPages = Math.ceil((data?.total ?? 0) / PAGE_SIZE);

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data?.unread ? `${data.unread} unread` : "All caught up"} · {data?.total ?? 0} total
          </p>
        </div>
        {(data?.unread ?? 0) > 0 && (
          <button
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 border border-blue-200 rounded-xl hover:bg-blue-50 transition disabled:opacity-50"
          >
            {markAll.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Mark all read
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => { setFilter(f); setPage(0); }}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition capitalize ${
              filter === f
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {f === "all" ? "All" : entityStyle(f).label}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-16 text-gray-300">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-gray-300">
            <Bell className="w-10 h-10 mb-3" />
            <p className="text-sm text-gray-400">No notifications{filter !== "all" ? ` for ${filter}` : ""}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {notifications.map((n, i) => {
              const { Icon, color } = entityStyle(n.entity_type);
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={`flex items-start gap-4 px-5 py-4 transition group ${!n.is_read ? "bg-blue-50/30" : "hover:bg-gray-50"}`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${n.is_read ? "text-gray-600" : "text-gray-900 font-semibold"}`}>
                      {n.title}
                    </p>
                    {n.body && <p className="text-xs text-gray-500 mt-0.5">{n.body}</p>}
                    <p className="text-xs text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!n.is_read && (
                      <>
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <button
                          onClick={() => markRead.mutate(n.id)}
                          className="text-xs text-blue-600 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition"
                        >
                          Mark read
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition"
          >
            Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
