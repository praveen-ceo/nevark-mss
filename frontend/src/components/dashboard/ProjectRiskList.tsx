"use client";
// ============================================================
// Nevark Technologies Pvt. Ltd.
// All rights reserved © 2026 Nevark Technologies.
// Unauthorized use, reproduction, or distribution of this
// code is strictly prohibited.
// Module  : ProjectRiskList.tsx
// Author  : Development Team
// Created : 2026-09-07
// ============================================================

import { motion } from "framer-motion";
import { AlertOctagon, CheckCircle2 } from "lucide-react";

export interface ProjectRisk {
  project_id: string;
  name: string;
  risk_level: "CRITICAL" | "HIGH" | "MEDIUM";
  reasons: string[];
}

interface ProjectRiskListProps {
  data?: ProjectRisk[];
  loading?: boolean;
}

const RISK_COLORS = {
  CRITICAL: { bg: "rgba(239, 68, 68, 0.1)", border: "rgba(239, 68, 68, 0.3)", text: "#EF4444" },
  HIGH: { bg: "rgba(249, 115, 22, 0.1)", border: "rgba(249, 115, 22, 0.3)", text: "#F97316" },
  MEDIUM: { bg: "rgba(234, 179, 8, 0.1)", border: "rgba(234, 179, 8, 0.3)", text: "#EAB308" },
};

export function ProjectRiskList({ data, loading }: ProjectRiskListProps) {
  const risks = data ?? [];

  return (
    <div className="premium-card p-5 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 style={{ fontWeight: 600, color: "#E5E7EB" }} className="flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 text-red-500" />
          Project Risks
        </h3>
        <span className="text-xs px-2 py-1 rounded-md" style={{ background: "rgba(255,255,255,0.05)", color: "#9CA3AF" }}>
          Current Health
        </span>
      </div>

      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-6" style={{ color: "#6B7280" }}>
          <div className="w-5 h-5 border-2 border-gray-600 border-t-purple-500 rounded-full animate-spin mb-2" />
          <p className="text-sm">Evaluating health...</p>
        </div>
      ) : risks.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
          <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3" style={{ background: "rgba(16,185,129,0.1)", color: "#34D399" }}>
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <p className="text-sm font-medium" style={{ color: "#E5E7EB" }}>All projects are on track</p>
          <p className="text-xs mt-1 px-4" style={{ color: "#9CA3AF" }}>
            No CRITICAL, HIGH, or MEDIUM risk indicators were detected across your active portfolio.
          </p>
        </div>
      ) : (
        <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
          {risks.map((risk, idx) => {
            const style = RISK_COLORS[risk.risk_level];
            return (
              <motion.div
                key={risk.project_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="p-3 rounded-xl border"
                style={{ background: style.bg, borderColor: style.border }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "#E5E7EB" }}>
                      {risk.name}
                    </p>
                    <div className="mt-1.5 space-y-1">
                      {risk.reasons.map((reason, i) => (
                        <p key={i} className="text-xs flex items-start gap-1" style={{ color: "#D1D5DB" }}>
                          <span className="shrink-0 mt-0.5">•</span>
                          <span>{reason}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                  <div className="text-right ml-2 shrink-0">
                    <span 
                      className="text-[10px] font-bold px-2 py-0.5 rounded uppercase"
                      style={{ color: style.text, background: "rgba(0,0,0,0.2)" }}
                    >
                      {risk.risk_level}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
