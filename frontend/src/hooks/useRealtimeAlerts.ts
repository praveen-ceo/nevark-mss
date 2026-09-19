// ============================================================
// Nevark Technologies Pvt. Ltd.
// All rights reserved © 2026 Nevark Technologies.
// Unauthorized use, reproduction, or distribution of this
// code is strictly prohibited.
// Module  : useRealtimeAlerts.ts
// Author  : Development Team
// Created : 2026-09-09
// ============================================================

import { useEffect, useRef, useState, useCallback } from "react";
import type { DashboardAnalytics, OrgFilter } from "@/app/(dashboard)/dashboard/page";

export type AlertSeverity = "CRITICAL" | "HIGH" | "ANOMALY" | "CASH FLOW";

export interface DashboardAlert {
  id: string;
  type: string;
  message: string;
  severity: AlertSeverity;
  timestamp: number;
}

interface AlertBaseline {
  projects: Record<string, string>; // projectId -> riskLevel
  anomalies: Set<string>; // expense_id
  cashFlowNegative: boolean;
}

export function useRealtimeAlerts(
  data: DashboardAnalytics | undefined,
  filter: OrgFilter
) {
  const [alerts, setAlerts] = useState<DashboardAlert[]>([]);
  const baselineRef = useRef<AlertBaseline | null>(null);
  const filterRef = useRef<string>(JSON.stringify(filter));

  const addAlert = useCallback((alert: Omit<DashboardAlert, "id" | "timestamp">) => {
    setAlerts((prev) => {
      const newAlert = {
        ...alert,
        id: Math.random().toString(36).substring(2, 9),
        timestamp: Date.now(),
      };
      // Keep only last 5 alerts to prevent flood
      return [newAlert, ...prev].slice(0, 5);
    });
  }, []);

  const dismissAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  useEffect(() => {
    const currentFilterStr = JSON.stringify(filter);

    // 1. Handle Scope Change
    if (currentFilterStr !== filterRef.current) {
      filterRef.current = currentFilterStr;
      baselineRef.current = null; // Rebaseline silently
      // We don't clear existing toasts, as they might still be useful, 
      // but we could if we wanted to. Let's keep them.
    }

    if (!data) return;

    // Helper to evaluate current state
    const currentProjects: Record<string, string> = {};
    (data.project_risks || []).forEach((r) => {
      currentProjects[r.project_id] = r.risk_level;
    });

    const currentAnomalies = new Set<string>();
    (data.expense_anomalies || []).forEach((a) => {
      currentAnomalies.add(a.expense_id);
    });

    let currentCashFlowNegative = false;
    let firstNegativeMonth = "";
    if (data.forecast_available) {
      const forecasts = data.cash_flow?.filter((c) => c.is_forecast) || [];
      for (const fc of forecasts) {
        if (fc.net_cash < 0) {
          currentCashFlowNegative = true;
          firstNegativeMonth = fc.month;
          break;
        }
      }
    }

    // 2. Silent Init
    if (!baselineRef.current) {
      baselineRef.current = {
        projects: currentProjects,
        anomalies: currentAnomalies,
        cashFlowNegative: currentCashFlowNegative,
      };
      return;
    }

    // 3. Diffing (Subsequent polls)
    const b = baselineRef.current;

    // Check Projects
    Object.entries(currentProjects).forEach(([pId, currentRisk]) => {
      const prevRisk = b.projects[pId];
      if (currentRisk === "CRITICAL" && prevRisk !== "CRITICAL") {
        const pName = data.project_risks?.find(r => r.project_id === pId)?.name || "A project";
        addAlert({
          type: "Project Risk",
          message: `Project ${pName} escalated to CRITICAL risk.`,
          severity: "CRITICAL",
        });
      } else if (currentRisk === "HIGH" && prevRisk !== "HIGH" && prevRisk !== "CRITICAL") {
        const pName = data.project_risks?.find(r => r.project_id === pId)?.name || "A project";
        addAlert({
          type: "Project Risk",
          message: `Project ${pName} escalated to HIGH risk.`,
          severity: "HIGH",
        });
      }
    });
    b.projects = currentProjects;

    // Check Anomalies
    currentAnomalies.forEach((aId) => {
      if (!b.anomalies.has(aId)) {
        const amt = data.expense_anomalies?.find(a => a.expense_id === aId)?.amount || 0;
        addAlert({
          type: "Expense Anomaly",
          message: `New expense anomaly detected: $${amt.toLocaleString()}.`,
          severity: "ANOMALY",
        });
        b.anomalies.add(aId);
      }
    });

    // Check Cash Flow
    if (currentCashFlowNegative && !b.cashFlowNegative) {
      addAlert({
        type: "Cash Flow",
        message: `Projected cash flow turns negative in ${firstNegativeMonth}.`,
        severity: "CASH FLOW",
      });
    }
    b.cashFlowNegative = currentCashFlowNegative;

  }, [data, filter, addAlert]);

  return { alerts, dismissAlert };
}
