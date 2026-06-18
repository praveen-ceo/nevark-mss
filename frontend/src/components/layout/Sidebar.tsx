"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  BarChart3,
  Bot,
  Briefcase,
  FileText,
  LayoutDashboard,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { label: "Dashboard",    href: "/dashboard",    icon: LayoutDashboard },
  { label: "Employees",    href: "/employees",    icon: Users            },
  { label: "Clients",      href: "/clients",      icon: Briefcase        },
  { label: "Projects",     href: "/projects",     icon: BarChart3        },
  { label: "Finance",      href: "/finance",      icon: Wallet           },
  { label: "Documents",    href: "/documents",    icon: FileText         },
  { label: "AI Assistant", href: "/ai-assistant", icon: Bot, badge: "NEW" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[220px] flex-shrink-0 bg-slate-900 flex flex-col border-r border-slate-800">
      <div className="h-16 flex items-center gap-2.5 px-5 border-b border-slate-800">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">Nevark</p>
          <p className="text-slate-500 text-[10px] leading-tight">Enterprise Suite</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {NAV.map(({ label, href, icon: Icon, badge }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href}>
              <motion.div
                whileHover={{ x: 2 }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                  active
                    ? "bg-blue-700 text-white shadow-sm"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1">{label}</span>
                {badge && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 bg-purple-600 text-white rounded-full">
                    {badge}
                  </span>
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 mx-3 mb-3 rounded-xl bg-slate-800">
        <p className="text-slate-400 text-xs font-medium">Nevark MSS</p>
        <p className="text-slate-600 text-[10px]">v1.0.0 - Enterprise</p>
      </div>
    </aside>
  );
}