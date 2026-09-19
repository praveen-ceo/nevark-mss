"use client";
// ============================================================
// Nevark Technologies Pvt. Ltd.
// All rights reserved © 2026 Nevark Technologies.
// Unauthorized use, reproduction, or distribution of this
// code is strictly prohibited.
// Module  : ExpenseAnomalyList.tsx
// Author  : Development Team
// Created : 2026-09-07
// ============================================================

import { motion } from "framer-motion";
import { AlertTriangle, TrendingUp, Info } from "lucide-react";

export interface ExpenseAnomaly {
  expense_id: string;
  category: string;
  amount: number;
  date: string;
  employee_name: string;
  description?: string | null;
}

interface ExpenseAnomalyListProps {
  data?: ExpenseAnomaly[];
  loading?: boolean;
}

export function ExpenseAnomalyList({ data, loading }: ExpenseAnomalyListProps) {
  const anomalies = data ?? [];

  return (
    <div className="premium-card p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 style={{ fontWeight: 600, color: "#E5E7EB" }} className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-400" />
          Unusual Expenses
        </h3>
        <span className="text-xs px-2 py-1 rounded-md" style={{ background: "rgba(255,255,255,0.05)", color: "#9CA3AF" }}>
          IQR Method
        </span>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-6" style={{ color: "#6B7280" }}>
          <div className="w-5 h-5 border-2 border-gray-600 border-t-purple-500 rounded-full animate-spin mb-2" />
          <p className="text-sm">Analyzing expenses...</p>
        </div>
      ) : anomalies.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
          <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: "rgba(16,185,129,0.1)", color: "#34D399" }}>
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium" style={{ color: "#E5E7EB" }}>No Anomalies Detected</p>
          <p className="text-xs mt-1 px-4" style={{ color: "#9CA3AF" }}>
            All categorical expenses fall within expected statistical boundaries, or categories have insufficient data.
          </p>
        </div>
      ) : (
        <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
          {anomalies.map((anomaly, idx) => (
            <motion.div
              key={anomaly.expense_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="p-3 rounded-xl border"
              style={{ background: "rgba(255,165,0,0.05)", borderColor: "rgba(255,165,0,0.2)" }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold" style={{ color: "#E5E7EB" }}>
                    {anomaly.category.replace("_", " ").toUpperCase()}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#9CA3AF" }}>
                    {anomaly.employee_name} • {anomaly.date}
                  </p>
                  {anomaly.description && (
                    <p className="text-xs mt-1.5 italic flex items-start gap-1" style={{ color: "#9CA3AF" }}>
                      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      {anomaly.description}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-orange-400">
                    ₹{Number(anomaly.amount).toLocaleString()}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
