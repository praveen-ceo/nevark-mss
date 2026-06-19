/**
 * Shared export utilities for XLSX, CSV, and PDF.
 * Requires: xlsx, jspdf, jspdf-autotable
 */

// ---------------------------------------------------------------------------
// CSV — no library needed
// ---------------------------------------------------------------------------
export function exportCSV(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const escape = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${filename}.csv`);
}

// ---------------------------------------------------------------------------
// XLSX — requires xlsx package
// ---------------------------------------------------------------------------
export async function exportXLSX(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  // Bold header row
  headers.forEach((_, c) => {
    const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
    if (cell) cell.s = { font: { bold: true } };
  });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ---------------------------------------------------------------------------
// PDF — requires jspdf + jspdf-autotable
// ---------------------------------------------------------------------------
export async function exportPDF(
  filename: string,
  title: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(14);
  doc.setTextColor(15, 23, 42);
  doc.text(title, 14, 16);
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Exported: ${new Date().toLocaleString("en-IN")}`, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [headers],
    body: rows.map((r) => r.map((v) => (v == null ? "" : String(v)))),
    headStyles: { fillColor: [30, 58, 138], textColor: 255, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: [15, 23, 42] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${filename}.pdf`);
}

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
