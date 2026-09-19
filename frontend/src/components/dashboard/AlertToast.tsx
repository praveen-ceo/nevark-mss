// ============================================================
// Nevark Technologies Pvt. Ltd.
// All rights reserved © 2026 Nevark Technologies.
// Unauthorized use, reproduction, or distribution of this
// code is strictly prohibited.
// Module  : AlertToast.tsx
// Author  : Development Team
// Created : 2026-09-09
// ============================================================

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, TrendingDown, X } from "lucide-react";
import type { DashboardAlert } from "@/hooks/useRealtimeAlerts";

interface AlertToastProps {
  alerts: DashboardAlert[];
  onDismiss: (id: string) => void;
}

export function AlertToast({ alerts, onDismiss }: AlertToastProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 pointer-events-none">
      <AnimatePresence>
        {alerts.map((alert) => (
          <ToastItem key={alert.id} alert={alert} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ alert, onDismiss }: { alert: DashboardAlert; onDismiss: (id: string) => void }) {
  // Auto dismiss after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(alert.id);
    }, 10000);
    return () => clearTimeout(timer);
  }, [alert.id, onDismiss]);

  let icon = <AlertTriangle className="w-5 h-5" />;
  let colorClass = "text-amber-500 bg-amber-500/10 border-amber-500/20";
  
  if (alert.severity === "CRITICAL") {
    colorClass = "text-red-500 bg-red-500/10 border-red-500/20";
  } else if (alert.severity === "CASH FLOW") {
    colorClass = "text-orange-500 bg-orange-500/10 border-orange-500/20";
    icon = <TrendingDown className="w-5 h-5" />;
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 50, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className={`pointer-events-auto premium-card flex items-start gap-3 p-4 pr-10 rounded-xl border backdrop-blur-md shadow-2xl relative w-80 overflow-hidden ${colorClass}`}
    >
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div className="flex flex-col gap-1">
        <span className="text-sm font-semibold tracking-wide uppercase text-white/90">
          {alert.type}
        </span>
        <span className="text-sm text-white/80 leading-snug">
          {alert.message}
        </span>
      </div>
      <button
        onClick={() => onDismiss(alert.id)}
        className="absolute top-3 right-3 text-white/50 hover:text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  );
}
