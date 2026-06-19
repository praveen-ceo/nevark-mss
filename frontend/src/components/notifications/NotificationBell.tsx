"use client";

import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell, Briefcase, CheckCircle2, FileText, Loader2,
  Users, Wallet, X, Bell as BellIcon,
} from "lucide-react";
import Link from "next/link";
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

interface NotificationList {
  total: number;
  unread: number;
  items: Notification[];
}

// ---------------------------------------------------------------------------
// API helpers
// ---------------------------------------------------------------------------
const api = {
  unreadCount: () =>
    apiClient.get<{ count: number }>("/notifications/unread-count").then((r) => r.data),
  list: () =>
    apiClient.get<NotificationList>("/notifications?limit=20").then((r) => r.data),
  markRead: (id: string) =>
    apiClient.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () =>
    apiClient.post("/notifications/read-all").then((r) => r.data),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const ENTITY_STYLES: Record<string, { Icon: React.ElementType; color: string }> = {
  task:     { Icon: CheckCircle2, color: "text-emerald-600 bg-emerald-50" },
  project:  { Icon: Briefcase,   color: "text-blue-600 bg-blue-50"       },
  finance:  { Icon: Wallet,      color: "text-purple-600 bg-purple-50"   },
  document: { Icon: FileText,    color: "text-orange-600 bg-orange-50"   },
  employee: { Icon: Users,       color: "text-teal-600 bg-teal-50"       },
  system:   { Icon: BellIcon,    color: "text-gray-600 bg-gray-100"      },
};

function entityStyle(type: string) {
  return ENTITY_STYLES[type] ?? ENTITY_STYLES.system;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: countData } = useQuery({
    queryKey: ["notif-unread"],
    queryFn: api.unreadCount,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ["notif-list"],
    queryFn: api.list,
    enabled: open,
    staleTime: 10_000,
  });

  const markRead = useMutation({
    mutationFn: api.markRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notif-unread"] });
      qc.invalidateQueries({ queryKey: ["notif-list"] });
      qc.invalidateQueries({ queryKey: ["notif-feed"] });
    },
  });

  const markAll = useMutation({
    mutationFn: api.markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notif-unread"] });
      qc.invalidateQueries({ queryKey: ["notif-list"] });
      qc.invalidateQueries({ queryKey: ["notif-feed"] });
    },
  });

  const count = countData?.count ?? 0;
  const notifications = listData?.items ?? [];

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-xl hover:bg-gray-100 transition"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-500" />
        {count > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full ring-2 ring-white leading-none">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {/* Backdrop */}
      {open && <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />}

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-semibold text-gray-900">Notifications</span>
                {count > 0 && (
                  <span className="text-[11px] font-semibold px-1.5 py-0.5 bg-red-100 text-red-600 rounded-full">
                    {count} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {count > 0 && (
                  <button
                    onClick={() => markAll.mutate()}
                    disabled={markAll.isPending}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded-lg hover:bg-blue-50 transition"
                  >
                    Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-gray-100 transition">
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
            </div>

            {/* List */}
            <div className="max-h-96 overflow-y-auto">
              {listLoading ? (
                <div className="flex justify-center py-8 text-gray-300">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No notifications yet</p>
                </div>
              ) : (
                notifications.map((n) => {
                  const { Icon, color } = entityStyle(n.entity_type);
                  return (
                    <button
                      key={n.id}
                      onClick={() => { if (!n.is_read) markRead.mutate(n.id); }}
                      className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition text-left border-b border-gray-50 last:border-0 ${!n.is_read ? "bg-blue-50/40" : ""}`}
                    >
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${color}`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm leading-snug ${n.is_read ? "text-gray-600" : "text-gray-900 font-medium"}`}>
                          {n.title}
                        </p>
                        {n.body && <p className="text-xs text-gray-400 mt-0.5 truncate">{n.body}</p>}
                        <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                      {!n.is_read && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-100 px-4 py-2.5">
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center justify-center gap-1 py-1"
              >
                View all notifications →
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
