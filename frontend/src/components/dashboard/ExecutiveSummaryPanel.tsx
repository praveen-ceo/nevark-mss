// ============================================================
// Nevark Technologies Pvt. Ltd.
// All rights reserved © 2026 Nevark Technologies.
// Unauthorized use, reproduction, or distribution of this
// code is strictly prohibited.
// Module  : ExecutiveSummaryPanel.tsx
// Author  : Development Team
// Created : 2026-09-09
// ============================================================

import React from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle,
  Activity,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { DashboardAnalytics } from "@/app/(dashboard)/dashboard/page";

// Extend the interface from page.tsx implicitly or declare what we need:
interface ExecutiveSummaryProps {
  data: DashboardAnalytics | undefined;
  loading: boolean;
}

export function ExecutiveSummaryPanel({ data, loading }: ExecutiveSummaryProps) {
  if (loading) {
    return (
      <div className="premium-card p-6 mb-6">
        <h2 style={{ fontWeight: 600, color: "#E5E7EB", marginBottom: "1rem", fontSize: "1.25rem" }}>
          Executive Summary
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  // ---------------------------------------------------------------------------
  // 1. CASH FLOW OUTLOOK
  // ---------------------------------------------------------------------------
  let cashFlowMessage = "";
  let cashFlowHealthy = true;

  if (!data.forecast_available) {
    cashFlowMessage = "Insufficient historical activity to produce a meaningful cash-flow forecast.";
    cashFlowHealthy = true; // Neutral
  } else {
    const forecasts = data.cash_flow?.filter((c) => c.is_forecast) || [];
    if (forecasts.length === 0) {
      cashFlowMessage = "Forecast data unavailable.";
    } else {
      let firstNegativeMonth = "";
      let allPositive = true;
      let allNegative = true;
      const lastMonth = forecasts[forecasts.length - 1].month;

      for (const fc of forecasts) {
        if (fc.net_cash < 0) {
          allPositive = false;
          if (!firstNegativeMonth) firstNegativeMonth = fc.month;
        } else {
          allNegative = false;
        }
      }

      if (allPositive) {
        cashFlowMessage = `Projected cash flow remains positive through ${lastMonth}.`;
        cashFlowHealthy = true;
      } else if (allNegative) {
        cashFlowMessage = `Projected cash flow is negative by ${firstNegativeMonth}; review upcoming outflows.`;
        cashFlowHealthy = false;
      } else {
        cashFlowMessage = `Projected cash flow turns negative in ${firstNegativeMonth}; review upcoming outflows.`;
        cashFlowHealthy = false;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 2. PROJECT RISK ALERT
  // ---------------------------------------------------------------------------
  let projectRiskMessage = "";
  let projectRiskHealthy = true;

  const risks = data.project_risks || [];
  const criticalCount = risks.filter((r) => r.risk_level === "CRITICAL").length;
  const highCount = risks.filter((r) => r.risk_level === "HIGH").length;

  if (criticalCount > 0) {
    projectRiskMessage = `${criticalCount} project(s) at CRITICAL risk requiring immediate attention.`;
    projectRiskHealthy = false;
  } else if (highCount > 0) {
    projectRiskMessage = `${highCount} project(s) at HIGH risk requiring attention.`;
    projectRiskHealthy = false;
  } else {
    projectRiskMessage = "No CRITICAL/HIGH project risks are currently detected within the selected dashboard scope.";
    projectRiskHealthy = true;
  }

  // ---------------------------------------------------------------------------
  // 3. EXPENSE ANOMALY WARNING
  // ---------------------------------------------------------------------------
  let expenseAnomalyMessage = "";
  let expenseAnomalyHealthy = true;

  const anomalyCount = data.expense_anomalies?.length || 0;
  if (anomalyCount > 0) {
    expenseAnomalyMessage = `${anomalyCount} unusual/anomalous expense(s) detected in the selected scope and period.`;
    expenseAnomalyHealthy = false;
  } else {
    expenseAnomalyMessage = "No expense anomalies were detected.";
    expenseAnomalyHealthy = true;
  }

  // ---------------------------------------------------------------------------
  // 4. WORKFORCE PRODUCTIVITY PULSE
  // ---------------------------------------------------------------------------
  let productivityMessage = "";
  let productivityHealthy = true;

  const prodData = data.employee_productivity || [];
  const validRates = prodData
    .map((e) => e.completion_rate)
    .filter((r): r is number => r !== null && r !== undefined);

  if (validRates.length === 0) {
    productivityMessage = "Productivity data unavailable for the selected scope.";
    productivityHealthy = true; // Neutral
  } else {
    const sum = validRates.reduce((a, b) => a + b, 0);
    const avg = sum / validRates.length;
    productivityMessage = `Average task completion rate is ${avg.toFixed(1)}% across active employees.`;
    productivityHealthy = avg >= 50; // Visual cue, though no strict business threshold was given
  }

  // ---------------------------------------------------------------------------
  // Render Helpers
  // ---------------------------------------------------------------------------
  const InsightCard = ({
    title,
    message,
    healthy,
    neutral,
    Icon,
  }: {
    title: string;
    message: string;
    healthy: boolean;
    neutral?: boolean;
    Icon: React.ElementType;
  }) => {
    let bg = "rgba(16, 185, 129, 0.1)";
    let color = "#34d399";

    if (neutral) {
      bg = "rgba(156, 163, 175, 0.1)";
      color = "#9CA3AF";
    } else if (!healthy) {
      bg = "rgba(239, 68, 68, 0.1)";
      color = "#f87171";
    }

    return (
      <div
        className="p-4 rounded-xl flex flex-col gap-2 relative overflow-hidden"
        style={{ background: "rgba(255, 255, 255, 0.03)" }}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: bg, color }}>
            <Icon className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-sm" style={{ color: "#E5E7EB" }}>{title}</h3>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "#9CA3AF" }}>
          {message}
        </p>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="premium-card p-6 mb-6"
    >
      <h2 style={{ fontWeight: 600, color: "#E5E7EB", marginBottom: "1rem", fontSize: "1.25rem" }}>
        Executive Summary
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <InsightCard
          title="Cash Flow Outlook"
          message={cashFlowMessage}
          healthy={cashFlowHealthy}
          neutral={!data.forecast_available || (data.cash_flow?.filter(c => c.is_forecast).length === 0)}
          Icon={cashFlowHealthy ? TrendingUp : TrendingDown}
        />
        <InsightCard
          title="Project Risk Alert"
          message={projectRiskMessage}
          healthy={projectRiskHealthy}
          Icon={projectRiskHealthy ? CheckCircle : AlertTriangle}
        />
        <InsightCard
          title="Expense Anomaly Warning"
          message={expenseAnomalyMessage}
          healthy={expenseAnomalyHealthy}
          Icon={expenseAnomalyHealthy ? CheckCircle : AlertTriangle}
        />
        <InsightCard
          title="Workforce Productivity"
          message={productivityMessage}
          healthy={productivityHealthy}
          neutral={validRates.length === 0}
          Icon={Activity}
        />
      </div>
    </motion.div>
  );
}
