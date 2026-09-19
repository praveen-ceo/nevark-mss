"use client";
// ============================================================
// Nevark Technologies Pvt. Ltd.
// All rights reserved © 2026 Nevark Technologies.
// Unauthorized use, reproduction, or distribution of this
// code is strictly prohibited.
// Module  : EmployeeProductivityList.tsx
// Author  : Development Team
// Created : 2026-09-09
// ============================================================

import { motion } from "framer-motion";
import { Users, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export interface EmployeeProductivity {
  employee_id: string;
  employee_name: string;
  assigned_tasks: number;
  completed_tasks: number;
  completion_rate: number | null;
  overdue_tasks: number;
  blocked_tasks: number;
}

interface EmployeeProductivityListProps {
  data?: EmployeeProductivity[];
  loading?: boolean;
}

export function EmployeeProductivityList({ data, loading }: EmployeeProductivityListProps) {
  const items = data ?? [];

  return (
    <div className="premium-card p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 style={{ fontWeight: 600, color: "#E5E7EB" }} className="flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-500" />
          Employee Productivity
        </h3>
        <span className="text-xs px-2 py-1 rounded-md" style={{ background: "rgba(255,255,255,0.05)", color: "#9CA3AF" }}>
          Task Metrics
        </span>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-6" style={{ color: "#6B7280" }}>
          <div className="w-5 h-5 border-2 border-gray-600 border-t-emerald-500 rounded-full animate-spin mb-2" />
          <p className="text-sm">Loading metrics...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
          <p className="text-sm font-medium" style={{ color: "#E5E7EB" }}>No data available</p>
          <p className="text-xs mt-1 px-4" style={{ color: "#9CA3AF" }}>
            No active employees matched the criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
          {items.map((emp, idx) => {
            const hasOverdue = emp.overdue_tasks > 0;
            const hasBlocked = emp.blocked_tasks > 0;
            
            return (
              <motion.div
                key={emp.employee_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="p-3 rounded-xl border"
                style={{ background: "rgba(255, 255, 255, 0.03)", borderColor: "rgba(255, 255, 255, 0.05)" }}
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="text-sm font-semibold truncate" style={{ color: "#E5E7EB" }}>
                    {emp.employee_name}
                  </p>
                  <div className="text-right">
                    <span className="text-xs font-bold" style={{ color: emp.completion_rate !== null ? "#34D399" : "#6B7280" }}>
                      {emp.completion_rate !== null ? `${Math.round(emp.completion_rate * 100)}%` : "N/A"}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5" style={{ color: "#9CA3AF" }}>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{emp.completed_tasks} / {emp.assigned_tasks} Done</span>
                  </div>
                  
                  {(hasOverdue || hasBlocked) ? (
                    <div className="flex items-center gap-2 justify-end">
                      {hasOverdue && (
                        <span className="flex items-center gap-1 text-red-400">
                          <Clock className="w-3 h-3" /> {emp.overdue_tasks}
                        </span>
                      )}
                      {hasBlocked && (
                        <span className="flex items-center gap-1 text-orange-400">
                          <AlertCircle className="w-3 h-3" /> {emp.blocked_tasks}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="text-right text-gray-500">No issues</div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
