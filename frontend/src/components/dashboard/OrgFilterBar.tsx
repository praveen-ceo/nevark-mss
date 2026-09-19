"use client";
// ============================================================
// Nevark Technologies Pvt. Ltd.
// All rights reserved © 2026 Nevark Technologies.
// Unauthorized use, reproduction, or distribution of this
// code is strictly prohibited.
// Module  : OrgFilterBar.tsx
// Author  : Development Team
// Created : 2026-09-07 18:00:00
// ============================================================

/**
 * OrgFilterBar — Enhancement 1: Group-Level and Business-Unit Dashboard Filtering
 *
 * Renders two cascading selectors: Group → Business Unit.
 * Only departments explicitly classified with department_type = 'group' or
 * 'business_unit' appear in their respective selectors.
 * Untyped departments (department_type = null) are NEVER inferred as Groups.
 *
 * If no typed Groups exist, an informative unconfigured state is shown.
 *
 * Props:
 *   onFilterChange — called whenever group or BU selection changes.
 *   The callback receives { groupId: string|null, businessUnitId: string|null }.
 */

import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, ChevronDown, X, Info, Calendar } from "lucide-react";
import { useState, useMemo } from "react";
import { apiClient } from "@/lib/api/client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DepartmentNode {
  id: string;
  name: string;
  parent_id: string | null;
  department_type: "group" | "business_unit" | "department" | null;
  children: DepartmentNode[];
}

interface OrgFilter {
  groupId: string | null;
  businessUnitId: string | null;
  startDate: string | null;
  endDate: string | null;
}

interface OrgFilterBarProps {
  onFilterChange: (filter: OrgFilter) => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function flattenTree(nodes: DepartmentNode[]): DepartmentNode[] {
  const result: DepartmentNode[] = [];
  const walk = (n: DepartmentNode) => {
    result.push(n);
    n.children.forEach(walk);
  };
  nodes.forEach(walk);
  return result;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function OrgFilterBar({ onFilterChange }: OrgFilterBarProps) {
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedBuId, setSelectedBuId] = useState<string | null>(null);
  const [selectedStartDate, setSelectedStartDate] = useState<string | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);

  const { data: tree, isLoading } = useQuery<DepartmentNode[]>({
    queryKey: ["departments-tree"],
    queryFn: () =>
      apiClient
        .get<DepartmentNode[]>("/employees/departments/tree")
        .then((r) => r.data),
    staleTime: 5 * 60_000,
  });

  const flat = useMemo(() => (tree ? flattenTree(tree) : []), [tree]);

  // Only explicitly typed groups — never infer from root/depth
  const groups = useMemo(
    () => flat.filter((d) => d.department_type === "group"),
    [flat]
  );

  // BUs that are descendants of the selected group (or all BUs if no group)
  const availableBUs = useMemo(() => {
    const allBUs = flat.filter((d) => d.department_type === "business_unit");
    if (!selectedGroupId) return [];
    // Find the selected group node and collect its subtree
    const groupNode = flat.find((d) => d.id === selectedGroupId);
    if (!groupNode) return [];
    const subtreeIds = new Set<string>();
    const walk = (n: DepartmentNode) => {
      subtreeIds.add(n.id);
      n.children.forEach(walk);
    };
    walk(groupNode);
    return allBUs.filter((bu) => subtreeIds.has(bu.id));
  }, [flat, selectedGroupId]);

  const hasGroups = groups.length > 0;
  const isFiltered = selectedGroupId !== null || selectedBuId !== null;

  const selectedGroupName = groups.find((g) => g.id === selectedGroupId)?.name;
  const selectedBuName = availableBUs.find((b) => b.id === selectedBuId)?.name;

  function handleGroupChange(id: string | null) {
    setSelectedGroupId(id);
    setSelectedBuId(null); // cascade: clear BU when group changes
    onFilterChange({ groupId: id, businessUnitId: null, startDate: selectedStartDate, endDate: selectedEndDate });
  }

  function handleBuChange(id: string | null) {
    setSelectedBuId(id);
    onFilterChange({ groupId: selectedGroupId, businessUnitId: id, startDate: selectedStartDate, endDate: selectedEndDate });
  }

  function handleDateChange(type: "start" | "end", val: string) {
    const newVal = val || null;
    let s = selectedStartDate;
    let e = selectedEndDate;
    if (type === "start") {
      s = newVal;
      setSelectedStartDate(newVal);
    } else {
      e = newVal;
      setSelectedEndDate(newVal);
    }
    onFilterChange({ groupId: selectedGroupId, businessUnitId: selectedBuId, startDate: s, endDate: e });
  }

  function handleClear() {
    setSelectedGroupId(null);
    setSelectedBuId(null);
    setSelectedStartDate(null);
    setSelectedEndDate(null);
    onFilterChange({ groupId: null, businessUnitId: null, startDate: null, endDate: null });
  }

  if (isLoading) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-3"
      style={{
        padding: "0.75rem 1rem",
        background: "rgba(255,255,255,0.03)",
        borderRadius: "0.875rem",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      <div
        className="flex items-center gap-2 shrink-0"
        style={{ color: "#9CA3AF", fontSize: "0.8rem", fontWeight: 600 }}
      >
        <Building2 className="w-3.5 h-3.5" style={{ color: "#8B5CF6" }} />
        <span className="uppercase tracking-wide">Filters</span>
      </div>

      {!hasGroups ? (
        /* Unconfigured state — no typed Groups exist */
        <div
          className="flex items-center gap-2"
          style={{
            color: "#6B7280",
            fontSize: "0.8rem",
            padding: "0.35rem 0.75rem",
            background: "rgba(255,255,255,0.04)",
            borderRadius: "0.5rem",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <Info className="w-3.5 h-3.5 shrink-0" style={{ color: "#F59E0B" }} />
          <span>
            No Groups configured. Classify departments as Groups or Business
            Units to enable filtering.
          </span>
        </div>
      ) : (
        <>
          {/* Group Selector */}
          <div className="relative">
            <select
              id="org-filter-group"
              value={selectedGroupId ?? ""}
              onChange={(e) =>
                handleGroupChange(e.target.value || null)
              }
              style={{
                appearance: "none",
                background: selectedGroupId
                  ? "rgba(139,92,246,0.15)"
                  : "rgba(255,255,255,0.05)",
                color: selectedGroupId ? "#c4b5fd" : "#9CA3AF",
                border: `1px solid ${selectedGroupId ? "rgba(139,92,246,0.4)" : "rgba(255,255,255,0.1)"}`,
                borderRadius: "0.625rem",
                padding: "0.375rem 2rem 0.375rem 0.75rem",
                fontSize: "0.8rem",
                fontWeight: 500,
                cursor: "pointer",
                outline: "none",
                minWidth: "150px",
              }}
            >
              <option value="">All Groups</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <ChevronDown
              className="w-3.5 h-3.5 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"
              style={{ color: "#6B7280" }}
            />
          </div>

          {/* BU Selector — enabled only when a Group is selected */}
          <div className="relative">
            <select
              id="org-filter-bu"
              value={selectedBuId ?? ""}
              disabled={!selectedGroupId || availableBUs.length === 0}
              onChange={(e) =>
                handleBuChange(e.target.value || null)
              }
              style={{
                appearance: "none",
                background:
                  !selectedGroupId || availableBUs.length === 0
                    ? "rgba(255,255,255,0.02)"
                    : selectedBuId
                    ? "rgba(16,185,129,0.12)"
                    : "rgba(255,255,255,0.05)",
                color:
                  !selectedGroupId || availableBUs.length === 0
                    ? "#4B5563"
                    : selectedBuId
                    ? "#6ee7b7"
                    : "#9CA3AF",
                border: `1px solid ${
                  selectedBuId
                    ? "rgba(16,185,129,0.3)"
                    : "rgba(255,255,255,0.08)"
                }`,
                borderRadius: "0.625rem",
                padding: "0.375rem 2rem 0.375rem 0.75rem",
                fontSize: "0.8rem",
                fontWeight: 500,
                cursor:
                  !selectedGroupId || availableBUs.length === 0
                    ? "not-allowed"
                    : "pointer",
                outline: "none",
                minWidth: "160px",
                opacity: !selectedGroupId ? 0.5 : 1,
              }}
            >
              <option value="">
                {!selectedGroupId
                  ? "Select a Group first"
                  : availableBUs.length === 0
                  ? "No Business Units"
                  : "All Business Units"}
              </option>
              {availableBUs.map((bu) => (
                <option key={bu.id} value={bu.id}>
                  {bu.name}
                </option>
              ))}
            </select>
            <ChevronDown
              className="w-3.5 h-3.5 pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"
              style={{ color: "#6B7280" }}
            />
          </div>
        </>
      )}

      <div className="h-6 w-px bg-white/10 mx-1 hidden sm:block" />

      {/* Date Range Selectors — always available */}
      <div className="flex items-center gap-2">
        <div className="relative flex items-center">
          <Calendar className="w-3.5 h-3.5 absolute left-2.5 pointer-events-none" style={{ color: "#9CA3AF" }} />
          <input
            id="date-filter-start"
            type="date"
            aria-label="Start date"
            value={selectedStartDate || ""}
            onChange={(e) => handleDateChange("start", e.target.value)}
            style={{
              background: selectedStartDate ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.05)",
              color: selectedStartDate ? "#93c5fd" : "#9CA3AF",
              border: `1px solid ${selectedStartDate ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: "0.625rem",
              padding: "0.375rem 0.75rem 0.375rem 2rem",
              fontSize: "0.8rem",
              fontWeight: 500,
              outline: "none",
            }}
          />
        </div>
        <span style={{ color: "#6B7280", fontSize: "0.8rem" }}>to</span>
        <div className="relative flex items-center">
          <Calendar className="w-3.5 h-3.5 absolute left-2.5 pointer-events-none" style={{ color: "#9CA3AF" }} />
          <input
            id="date-filter-end"
            type="date"
            aria-label="End date"
            value={selectedEndDate || ""}
            onChange={(e) => handleDateChange("end", e.target.value)}
            style={{
              background: selectedEndDate ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.05)",
              color: selectedEndDate ? "#93c5fd" : "#9CA3AF",
              border: `1px solid ${selectedEndDate ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.1)"}`,
              borderRadius: "0.625rem",
              padding: "0.375rem 0.75rem 0.375rem 2rem",
              fontSize: "0.8rem",
              fontWeight: 500,
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* Active filter pill */}
      <AnimatePresence>
        {(isFiltered || selectedStartDate || selectedEndDate) && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1.5"
            style={{
              background: "rgba(139,92,246,0.1)",
              border: "1px solid rgba(139,92,246,0.25)",
              borderRadius: "999px",
              padding: "0.25rem 0.625rem",
              fontSize: "0.75rem",
              color: "#c4b5fd",
              fontWeight: 500,
            }}
          >
            <span>
              {selectedGroupName || (isFiltered ? "All Orgs" : "")}
              {selectedBuName ? ` › ${selectedBuName}` : ""}
              {(selectedStartDate || selectedEndDate) && (
                <>
                  {isFiltered ? " | " : ""}
                  {selectedStartDate ? selectedStartDate : "Any"} → {selectedEndDate ? selectedEndDate : "Any"}
                </>
              )}
            </span>
            <button
              id="org-filter-clear"
              onClick={handleClear}
              aria-label="Clear all filters"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
              }}
            >
              <X className="w-3 h-3" style={{ color: "#a78bfa" }} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
