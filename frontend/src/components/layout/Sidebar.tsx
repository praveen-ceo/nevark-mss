"use client";

import { memo, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3, Bell, Bot, Briefcase, CheckSquare, Clock,
  FileText, LayoutDashboard, Package, Users, Wallet, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

// ---------------------------------------------------------------------------
// Nav definition (module-level constants — never recreated)
// ---------------------------------------------------------------------------
const ALL_NAV = [
  { label: "Dashboard",     href: "/dashboard",     icon: LayoutDashboard },
  { label: "Products",      href: "/products",      icon: Package          },
  { label: "Employees",     href: "/employees",     icon: Users            },
  { label: "Attendance",    href: "/attendance",    icon: Clock            },
  { label: "Clients",       href: "/clients",       icon: Briefcase        },
  { label: "Projects",      href: "/projects",      icon: BarChart3        },
  { label: "Tasks",         href: "/tasks",         icon: CheckSquare      },
  { label: "Finance",       href: "/finance",       icon: Wallet           },
  { label: "Documents",     href: "/documents",     icon: FileText         },
  { label: "Notifications", href: "/notifications", icon: Bell             },
  { label: "AI Assistant",  href: "/ai-assistant",  icon: Bot, badge: "NEW" },
];

const ROLE_ROUTES: Record<string, string[] | "all"> = {
  super_admin:     "all",
  admin:           "all",
  ceo:             "all",
  cto:             ["/dashboard","/products","/employees","/attendance","/clients","/projects","/tasks","/documents","/notifications","/ai-assistant"],
  cfo:             ["/dashboard","/products","/finance","/clients","/documents","/notifications","/ai-assistant"],
  manager:         ["/dashboard","/products","/employees","/attendance","/clients","/projects","/tasks","/documents","/notifications","/ai-assistant"],
  hr_manager:      ["/dashboard","/products","/employees","/attendance","/notifications"],
  project_manager: ["/dashboard","/products","/clients","/projects","/tasks","/documents","/notifications","/ai-assistant"],
  finance_manager: ["/dashboard","/products","/finance","/clients","/documents","/notifications","/ai-assistant"],
  employee:        ["/dashboard","/products","/attendance","/tasks","/notifications"],
  viewer:          ["/dashboard","/products","/employees","/clients","/projects","/finance"],
};

function allowedRoutes(roles: string[]): Set<string> | "all" {
  for (const role of roles) {
    if (ROLE_ROUTES[role] === "all") return "all";
  }
  const merged = new Set<string>();
  for (const role of roles) {
    const access = ROLE_ROUTES[role];
    if (Array.isArray(access)) access.forEach((r) => merged.add(r));
  }
  merged.add("/dashboard");
  return merged;
}

// ---------------------------------------------------------------------------
// Component — memoized to prevent re-render on unrelated parent state changes
// ---------------------------------------------------------------------------
export const Sidebar = memo(function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();

  const roles: string[] = user?.roles ?? [];

  // Memoize expensive role filtering — only recomputes when roles change
  const visibleNav = useMemo(() => {
    const allowed = allowedRoutes(roles);
    return ALL_NAV.filter(({ href }) =>
      allowed === "all" ? true : (allowed as Set<string>).has(href)
    );
  }, [roles]);

  return (
    <aside className="w-[228px] flex-shrink-0 flex flex-col premium-sidebar">
      {/* Logo */}
      <div
        className="h-16 flex items-center gap-3 px-5 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{
            background: "linear-gradient(135deg, #D4AF37 0%, #b8962e 100%)",
            boxShadow: "0 2px 10px rgba(212,175,55,0.35)",
          }}
        >
          <Zap className="w-4 h-4" style={{ color: "#0B0F19" }} />
        </div>
        <div>
          <p style={{ color: "#D4AF37", fontWeight: 700, fontSize: "0.875rem", lineHeight: 1.2, letterSpacing: "-0.01em" }}>
            Nevark
          </p>
          <p style={{ color: "#6B7280", fontSize: "0.625rem", lineHeight: 1.2, letterSpacing: "0.1em", textTransform: "uppercase" }}>
            Enterprise Suite
          </p>
        </div>
      </div>

      {/* Nav — plain divs with CSS transitions only (no Framer Motion per-item) */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {visibleNav.map(({ label, href, icon: Icon, badge }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href}>
              <div className={cn("nav-item", active && "nav-item-active")}>
                <Icon
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: active ? "#8B5CF6" : "#9CA3AF" }}
                />
                <span className="flex-1">{label}</span>
                {badge && (
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #9333ea)", color: "#fff" }}
                  >
                    {badge}
                  </span>
                )}
                {active && (
                  <span
                    className="w-1 h-4 rounded-full flex-shrink-0"
                    style={{ background: "#8B5CF6", boxShadow: "0 0 6px rgba(139,92,246,0.6)" }}
                  />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="mx-3 mb-3 px-3 py-2.5 rounded-xl"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <p style={{ color: "#C0C0C0", fontSize: "0.75rem", fontWeight: 500 }}>Nevark MSS</p>
        <p style={{ color: "#4B5563", fontSize: "0.625rem" }}>v1.0.0 · Enterprise</p>
      </div>
    </aside>
  );
});
