"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  BarChart3,
  Bell,
  Bot,
  Briefcase,
  CheckSquare,
  Clock,
  FileText,
  LayoutDashboard,
  Package,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

// ---------------------------------------------------------------------------
// Nav definition
// ---------------------------------------------------------------------------

const ALL_NAV = [
  { label: "Dashboard",    href: "/dashboard",    icon: LayoutDashboard },
  { label: "Products",     href: "/products",     icon: Package          },
  { label: "Employees",    href: "/employees",    icon: Users            },
  { label: "Attendance",   href: "/attendance",   icon: Clock            },
  { label: "Clients",      href: "/clients",      icon: Briefcase        },
  { label: "Projects",     href: "/projects",     icon: BarChart3        },
  { label: "Tasks",        href: "/tasks",        icon: CheckSquare      },
  { label: "Finance",      href: "/finance",      icon: Wallet           },
  { label: "Documents",    href: "/documents",    icon: FileText         },
  { label: "Notifications",href: "/notifications",icon: Bell             },
  { label: "AI Assistant", href: "/ai-assistant", icon: Bot, badge: "NEW" },
];

// Routes each role may access. "all" means unrestricted.
const ROLE_ROUTES: Record<string, string[] | "all"> = {
  super_admin:     "all",
  admin:           "all",
  ceo:             "all",
  cto:             ["/dashboard", "/products", "/employees", "/attendance", "/clients", "/projects", "/tasks", "/documents", "/notifications", "/ai-assistant"],
  cfo:             ["/dashboard", "/products", "/finance", "/clients", "/documents", "/notifications", "/ai-assistant"],
  manager:         ["/dashboard", "/products", "/employees", "/attendance", "/clients", "/projects", "/tasks", "/documents", "/notifications", "/ai-assistant"],
  hr_manager:      ["/dashboard", "/products", "/employees", "/attendance", "/notifications"],
  project_manager: ["/dashboard", "/products", "/clients", "/projects", "/tasks", "/documents", "/notifications", "/ai-assistant"],
  finance_manager: ["/dashboard", "/products", "/finance", "/clients", "/documents", "/notifications", "/ai-assistant"],
  employee:        ["/dashboard", "/products", "/attendance", "/tasks", "/notifications"],
  viewer:          ["/dashboard", "/products", "/employees", "/clients", "/projects", "/finance"],
};

function allowedRoutes(roles: string[]): Set<string> | "all" {
  for (const role of roles) {
    const access = ROLE_ROUTES[role];
    if (access === "all") return "all";
  }
  const merged = new Set<string>();
  for (const role of roles) {
    const access = ROLE_ROUTES[role];
    if (Array.isArray(access)) {
      access.forEach((r) => merged.add(r));
    }
  }
  // Always include dashboard
  merged.add("/dashboard");
  return merged;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const roles: string[] = user?.roles ?? [];
  const allowed = allowedRoutes(roles);

  const visibleNav = ALL_NAV.filter(({ href }) => {
    if (allowed === "all") return true;
    return allowed.has(href);
  });

  return (
    <aside
      className="w-[228px] flex-shrink-0 flex flex-col"
      style={{
        background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
        borderRight: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Logo */}
      <div
        className="h-16 flex items-center gap-3 px-5"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
            boxShadow: "0 2px 8px rgba(59,130,246,0.45)",
          }}
        >
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight tracking-tight">Nevark</p>
          <p className="text-slate-500 text-[10px] leading-tight tracking-wide uppercase">Enterprise Suite</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {visibleNav.map(({ label, href, icon: Icon, badge }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href}>
              <motion.div
                whileHover={{ x: 2 }}
                transition={{ duration: 0.12 }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 cursor-pointer",
                  active
                    ? "text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
                style={
                  active
                    ? {
                        background:
                          "linear-gradient(135deg, rgba(59,130,246,0.25) 0%, rgba(29,78,216,0.15) 100%)",
                        boxShadow: "inset 0 0 0 1px rgba(59,130,246,0.25)",
                      }
                    : undefined
                }
              >
                <Icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-blue-400" : "")} />
                <span className="flex-1">{label}</span>
                {badge && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)", color: "#fff" }}
                  >
                    {badge}
                  </span>
                )}
                {active && <span className="w-1 h-4 rounded-full bg-blue-400 flex-shrink-0" />}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="mx-3 mb-3 px-3 py-2.5 rounded-xl"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p className="text-slate-400 text-xs font-medium">Nevark MSS</p>
        <p className="text-slate-600 text-[10px]">v1.0.0 · Enterprise</p>
      </div>
    </aside>
  );
}
