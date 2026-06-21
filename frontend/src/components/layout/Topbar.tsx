"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ChevronDown, LogOut, Search, Settings, User } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { logout } from "@/lib/api/auth";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/components/notifications/NotificationBell";

const BREADCRUMBS: Record<string, string> = {
  "/dashboard":     "Dashboard",
  "/employees":     "Employees",
  "/attendance":    "Attendance",
  "/clients":       "Clients",
  "/projects":      "Projects",
  "/tasks":         "Tasks",
  "/finance":       "Finance",
  "/documents":     "Documents",
  "/notifications": "Notifications",
  "/ai-assistant":  "AI Assistant",
  "/products":      "Products",
  "/profile":       "Profile",
  "/settings":      "Settings",
};

export function Topbar() {
  const { user, refreshToken, logout: clearAuth } = useAuthStore();
  const router   = useRouter();
  const pathname = usePathname();
  const [open,   setOpen]   = useState(false);
  const [search, setSearch] = useState("");

  async function handleLogout() {
    try { if (refreshToken) await logout(refreshToken); } finally {
      clearAuth();
      router.replace("/login");
    }
  }

  function navigate(path: string) {
    setOpen(false);
    router.push(path);
  }

  const initials = (user?.full_name ?? "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const roleLabel = (user?.roles?.[0] ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase()) || "Admin";

  const currentPage = BREADCRUMBS[pathname] ?? "Nevark";

  return (
    <header
      className="h-16 flex items-center justify-between px-6 flex-shrink-0 relative z-[60]"
      style={{
        background: "rgba(11,15,25,0.85)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        borderBottom: "1px solid rgba(212,175,55,0.2)",
        boxShadow: "0 1px 0 rgba(212,175,55,0.06)",
      }}
    >
      {/* Breadcrumb */}
      <div className="flex items-center gap-3">
        <div>
          <p style={{ fontSize: "0.75rem", color: "#D4AF37", letterSpacing: "0.03em" }}>Nevark MSS</p>
          <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#E5E7EB", lineHeight: 1.2 }}>
            {currentPage}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 flex-1 max-w-sm mx-8">
        <div
          className="flex items-center gap-2 w-full rounded-xl px-3 py-2"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(192,192,192,0.12)",
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.2)",
          }}
        >
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: "#6B7280" }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search anything..."
            className="flex-1 bg-transparent text-sm outline-none"
            style={{ color: "#E5E7EB" }}
          />
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-2">
        <NotificationBell />

        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl transition-colors"
            style={{ background: open ? "rgba(124,58,237,0.1)" : "transparent" }}
          >
            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #7C3AED 0%, #5b21b6 100%)",
                color: "#fff",
                border: "1.5px solid #D4AF37",
                boxShadow: "0 0 8px rgba(212,175,55,0.2)",
              }}
            >
              {initials}
            </div>
            <div className="text-left hidden sm:block">
              <p style={{ fontSize: "0.875rem", fontWeight: 500, color: "#E5E7EB", lineHeight: 1.2 }}>
                {user?.full_name}
              </p>
              <p style={{ fontSize: "0.6875rem", color: "#9CA3AF", lineHeight: 1.2 }}>{roleLabel}</p>
            </div>
            <ChevronDown
              className={cn("w-4 h-4 transition-transform", open && "rotate-180")}
              style={{ color: "#6B7280" }}
            />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-[70]" onClick={() => setOpen(false)} />
              <div
                className="absolute right-0 top-full mt-1 w-52 rounded-xl shadow-2xl z-[80] overflow-hidden"
                style={{
                  background: "#1a2234",
                  border: "1px solid rgba(192,192,192,0.12)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.08)",
                }}
              >
                {/* User info */}
                <div
                  className="px-4 py-3"
                  style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
                >
                  <p style={{ fontSize: "0.75rem", color: "#6B7280" }}>Signed in as</p>
                  <p style={{ fontSize: "0.875rem", fontWeight: 600, color: "#E5E7EB" }} className="truncate">
                    {user?.full_name}
                  </p>
                  <p style={{ fontSize: "0.75rem", color: "#9CA3AF" }} className="truncate">
                    {user?.email}
                  </p>
                  <span
                    className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-medium"
                    style={{ background: "rgba(124,58,237,0.2)", color: "#8B5CF6" }}
                  >
                    {roleLabel}
                  </span>
                </div>

                {/* Menu items */}
                <button
                  onClick={() => navigate("/profile")}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                  style={{ color: "#C0C0C0" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <User className="w-4 h-4" style={{ color: "#6B7280" }} />
                  Profile
                </button>
                <button
                  onClick={() => navigate("/settings")}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                  style={{ color: "#C0C0C0" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <Settings className="w-4 h-4" style={{ color: "#6B7280" }} />
                  Settings
                </button>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                  style={{ color: "#f87171" }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
