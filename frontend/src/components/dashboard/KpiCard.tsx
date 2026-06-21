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

// Dark tinted icon backgrounds + vivid icon colours
const COLOR_MAP: Record<Color, { iconBg: string; iconColor: string }> = {
  blue:    { iconBg: "rgba(59,130,246,0.15)",  iconColor: "#60a5fa" },
  emerald: { iconBg: "rgba(16,185,129,0.15)",  iconColor: "#34d399" },
  purple:  { iconBg: "rgba(139,92,246,0.15)",  iconColor: "#a78bfa" },
  orange:  { iconBg: "rgba(251,146,60,0.15)",  iconColor: "#fb923c" },
  red:     { iconBg: "rgba(239,68,68,0.15)",   iconColor: "#f87171" },
  teal:    { iconBg: "rgba(20,184,166,0.15)",  iconColor: "#2dd4bf" },
  pink:    { iconBg: "rgba(236,72,153,0.15)",  iconColor: "#f472b6" },
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
      className="premium-card p-5 flex items-start gap-4 cursor-default"
    >
      {/* Icon */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: c.iconBg }}
      >
        <Icon className="w-5 h-5" style={{ color: c.iconColor }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className="uppercase tracking-wide mb-0.5"
          style={{ fontSize: "0.7rem", fontWeight: 600, color: "#9CA3AF" }}
        >
          {label}
        </p>
        <p className="premium-kpi-value">{value}</p>
        {subtitle && (
          <p style={{ fontSize: "0.75rem", color: "#6B7280", marginTop: "0.25rem" }}>{subtitle}</p>
        )}
        {trend !== undefined && (
          <div
            className={cn("flex items-center gap-1 mt-1.5 text-xs font-semibold")}
            style={{ color: up ? "#34d399" : "#f87171" }}
          >
            {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(trend)}% vs last month
          </div>
        )}
      </div>
    </motion.div>
  );
}
