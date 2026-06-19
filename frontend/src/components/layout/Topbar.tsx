"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Bell, ChevronDown, LogOut, Search, Settings, User } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { logout } from "@/lib/api/auth";
import { cn } from "@/lib/utils";

const BREADCRUMBS: Record<string, string> = {
  "/dashboard":    "Dashboard",
  "/employees":    "Employees",
  "/clients":      "Clients",
  "/projects":     "Projects",
  "/tasks":        "Tasks",
  "/finance":      "Finance",
  "/documents":    "Documents",
  "/ai-assistant": "AI Assistant",
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

  const initials = (user?.full_name ?? "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const currentPage = BREADCRUMBS[pathname] ?? "Nevark";

  return (
    <header className="h-16 flex items-center justify-between px-6 flex-shrink-0 bg-white/90 backdrop-blur-sm" style={{ borderBottom: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div className="flex items-center gap-3">
        <div>
          <p className="text-xs text-gray-400">Nevark MSS</p>
          <p className="text-sm font-semibold text-gray-900 leading-tight">{currentPage}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-1 max-w-sm mx-8">
        <div className="flex items-center gap-2 w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search anything..."
            className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="relative p-2 rounded-xl hover:bg-gray-100 transition">
          <Bell className="w-5 h-5 text-gray-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
        </button>

        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl hover:bg-gray-100 transition"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {initials}
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium text-gray-900 leading-tight">{user?.full_name}</p>
              <p className="text-[11px] text-gray-500 leading-tight">{user?.roles?.[0]?.name?.replace("_", " ") ?? "Admin"}</p>
            </div>
            <ChevronDown className={cn("w-4 h-4 text-gray-400 transition-transform", open && "rotate-180")} />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-xs text-gray-500">Signed in as</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">{user?.full_name}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
                <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                  <User className="w-4 h-4 text-gray-400" />Profile
                </button>
                <button className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                  <Settings className="w-4 h-4 text-gray-400" />Settings
                </button>
                <div className="border-t border-gray-100" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                >
                  <LogOut className="w-4 h-4" />Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}