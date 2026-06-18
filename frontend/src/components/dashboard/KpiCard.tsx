"use client";

import { motion } from "framer-motion";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Color = "blue" | "emerald" | "purple" | "orange" | "red" | "teal" | "pink";

interface KpiCardProps {
  label: string;
  value: string;
  subtitle?: string;
  trend?: number;
  icon: LucideIcon;
  color?: Color;
  index?: number;
}

const COLOR_MAP: Record<Color, { icon: string; badge: string }> = {
  blue:    { icon: "bg-blue-50 text-blue-600",    badge: "text-blue-600" },
  emerald: { icon: "bg-emerald-50 text-emerald-600", badge: "text-emerald-600" },
  purple:  { icon: "bg-purple-50 text-purple-600",  badge: "text-purple-600" },
  orange:  { icon: "bg-orange-50 text-orange-600",  badge: "text-orange-600" },
  red:     { icon: "bg-red-50 text-red-600",       badge: "text-red-600" },
  teal:    { icon: "bg-teal-50 text-teal-600",     badge: "text-teal-600" },
  pink:    { icon: "bg-pink-50 text-pink-600",     badge: "text-pink-600" },
};

export function KpiCard({
  label,
  value,
  subtitle,
  trend,
  icon: Icon,
  color = "blue",
  index = 0,
}: KpiCardProps) {
  const c = COLOR_MAP[color];
  const up = trend !== undefined && trend >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-shadow"
    >
      <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0", c.icon)}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        {trend !== undefined && (
          <div className={cn("flex items-center gap-1 mt-1.5 text-xs font-semibold", up ? "text-emerald-600" : "text-red-500")}>
            {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}% vs last month
          </div>
        )}
      </div>
    </motion.div>
  );
}