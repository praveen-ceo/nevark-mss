/**
 * Indian GST Tax Invoice PDF Generator
 * Uses jspdf + jspdf-autotable (already installed)
 * No backend dependency — pure client-side generation.
 */

// ---------------------------------------------------------------------------
// Minimal types (mirrors finance/page.tsx interfaces)
// ---------------------------------------------------------------------------
export interface PdfInvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface PdfInvoice {
  invoice_number: string;
  status: string;
  issue_date: string;
  due_date: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number | null;
  currency: string;
  notes: string | null;
  cgst_rate: number | null;
  sgst_rate: number | null;
  igst_rate: number | null;
  cgst_amount: number | null;
  sgst_amount: number | null;
  igst_amount: number | null;
  place_of_supply: string | null;
  gstin: string | null;
  supply_type: "intrastate" | "interstate" | null;
  client: { name: string } | null;
  project: { name: string; code: string } | null;
  items: PdfInvoiceItem[];
}

export interface PdfSettings {
  company_name: string | null;
  company_gstin: string | null;
  company_address: string | null;
  company_email: string | null;
  company_phone: string | null;
  pan: string | null;
  state_code: string | null;
  bank_name: string | null;
  bank_account: string | null;
  bank_ifsc: string | null;
  bank_branch: string | null;
  default_sac: string;
  payment_terms: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function wordsBelow1000(n: number): string {
  if (n === 0) return "";
  if (n < 20) return ONES[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? " " + ONES[n % 10] : "");
  return ONES[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + wordsBelow1000(n % 100) : "");
}

/** Convert an INR amount (integer portion) to words using Indian numbering */
function amountToWords(amount: number): string {
  const n = Math.round(amount);
  if (n === 0) return "Zero Rupees Only";

  const crore = Math.floor(n / 10_000_000);
  const lakh  = Math.floor((n % 10_000_000) / 100_000);
  const thou  = Math.floor((n % 100_000) / 1_000);
  const rest  = n % 1_000;

  const parts: string[] = [];
  if (crore) parts.push(wordsBelow1000(crore) + " Crore");
  if (lakh)  parts.push(wordsBelow1000(lakh)  + " Lakh");
  if (thou)  parts.push(wordsBelow1000(thou)  + " Thousand");
  if (rest)  parts.push(wordsBelow1000(rest));

  return parts.join(" ") + " Rupees Only";
}

function fmtINR(v: number | null | undefined): string {
  const n = Number(v ?? 0);
  return "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(v: number | null): string {
  return v != null ? `${v}%` : "0%";
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function downloadInvoicePdf(
  invoice: PdfInvoice,
  settings: PdfSettings,
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const M = 14; // left/right margin

  const isIntrastate = invoice.supply_type === "intrastate";
  const outstanding = invoice.outstanding_amount ?? (invoice.total_amount - invoice.paid_amount);

  // ─── Header bar ───────────────────────────────────────────────────────────
  doc.setFillColor(30, 58, 138);
  doc.rect(0, 0, W, 30, "F");

  // Company name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text(settings.company_name || "Nevark Technologies LLP", M, 11);

  // Address / contact
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(186, 207, 255);
  const addrLine = [settings.company_address, settings.company_phone, settings.company_email]
    .filter(Boolean).join("  |  ");
  if (addrLine) doc.text(addrLine, M, 17);

  const gstLine = [
    settings.company_gstin ? `GSTIN: ${settings.company_gstin}` : null,
    settings.pan ? `PAN: ${settings.pan}` : null,
    settings.state_code ? `State Code: ${settings.state_code}` : null,
  ].filter(Boolean).join("  |  ");
  if (gstLine) doc.text(gstLine, M, 23);

  // "TAX INVOICE" label (right-aligned)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("TAX INVOICE", W - M, 11, { align: "right" });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(186, 207, 255);
  doc.text("Original for Recipient", W - M, 17, { align: "right" });

  // ─── Invoice meta + Bill To ───────────────────────────────────────────────
  let y = 36;

  // Left: Bill To
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("BILL TO", M, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(invoice.client?.name || "—", M, y + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  if (invoice.gstin) doc.text(`GSTIN: ${invoice.gstin}`, M, y + 10);
  if (invoice.project) {
    doc.text(
      `Project: ${invoice.project.name} (${invoice.project.code})`,
      M,
      y + (invoice.gstin ? 15 : 10),
    );
  }

  // Right: Invoice details table
  const detailsX = 120;
  const details: [string, string][] = [
    ["Invoice No.", invoice.invoice_number],
    ["Issue Date", invoice.issue_date],
    ["Due Date",   invoice.due_date],
    ["Place of Supply", invoice.place_of_supply || "—"],
    ["SAC Code",   settings.default_sac || "998314"],
  ];

  doc.setFontSize(8);
  details.forEach(([label, val], i) => {
    const dy = y + i * 5.5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 116, 139);
    doc.text(label, detailsX, dy);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(val, W - M, dy, { align: "right" });
  });

  y += 38;

  // ─── Divider ──────────────────────────────────────────────────────────────
  doc.setDrawColor(226, 232, 240);
  doc.line(M, y, W - M, y);
  y += 5;

  // ─── Line items table ─────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("LINE ITEMS", M, y);
  y += 3;

  autoTable(doc, {
    startY: y,
    head: [["#", "SAC", "Description", "Qty", "Rate", "Amount"]],
    body: invoice.items.map((item, i) => [
      String(i + 1),
      settings.default_sac || "998314",
      item.description,
      String(item.quantity),
      fmtINR(item.unit_price),
      fmtINR(item.amount),
    ]),
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: 255,
      fontStyle: "bold",
      fontSize: 8,
    },
    bodyStyles: { fontSize: 8, textColor: [15, 23, 42] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8 },
      1: { cellWidth: 18 },
      2: { cellWidth: "auto" },
      3: { cellWidth: 14, halign: "center" },
      4: { cellWidth: 28, halign: "right" },
      5: { cellWidth: 28, halign: "right" },
    },
    margin: { left: M, right: M },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

  // ─── Totals ───────────────────────────────────────────────────────────────
  const totalsX = 120;

  const totalsRows: [string, string, boolean?][] = [
    ["Subtotal", fmtINR(invoice.subtotal)],
  ];
  if (invoice.discount_amount > 0) {
    totalsRows.push([`Discount`, `-${fmtINR(invoice.discount_amount)}`]);
  }
  if (isIntrastate) {
    totalsRows.push([`CGST @ ${pct(invoice.cgst_rate)}`, fmtINR(invoice.cgst_amount)]);
    totalsRows.push([`SGST @ ${pct(invoice.sgst_rate)}`, fmtINR(invoice.sgst_amount)]);
  } else {
    totalsRows.push([`IGST @ ${pct(invoice.igst_rate)}`, fmtINR(invoice.igst_amount)]);
  }
  totalsRows.push(["Grand Total", fmtINR(invoice.total_amount), true]);
  totalsRows.push(["Amount Paid", fmtINR(invoice.paid_amount)]);
  totalsRows.push(["Balance Due", fmtINR(outstanding)]);

  doc.setFillColor(248, 250, 252);
  doc.roundedRect(totalsX - 4, y - 2, W - totalsX - M + 4, totalsRows.length * 6.5 + 4, 2, 2, "F");

  totalsRows.forEach(([label, val, bold], i) => {
    const dy = y + i * 6.5;
    if (bold) {
      doc.setFillColor(30, 58, 138);
      doc.rect(totalsX - 4, dy - 3.5, W - totalsX - M + 4, 7, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
    } else {
      doc.setFont("helvetica", i === totalsRows.length - 1 ? "bold" : "normal");
      doc.setFontSize(8);
      doc.setTextColor(i === totalsRows.length - 1 ? 29 : 71, i === totalsRows.length - 1 ? 78 : 85, i === totalsRows.length - 1 ? 216 : 105);
    }
    doc.text(label, totalsX + 2, dy);
    doc.text(val, W - M - 2, dy, { align: "right" });
  });

  y += totalsRows.length * 6.5 + 8;

  // ─── Amount in Words ──────────────────────────────────────────────────────
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(M, y - 2, W - M * 2, 9, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(30, 58, 138);
  doc.text("Amount in Words: ", M + 3, y + 3.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(15, 23, 42);
  doc.text(amountToWords(invoice.total_amount), M + 38, y + 3.5);
  y += 14;

  // ─── Bank Details + Signatory ─────────────────────────────────────────────
  const halfW = (W - M * 2 - 5) / 2;

  // Bank details (left box)
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(M, y, halfW, 36, 2, 2, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("BANK DETAILS", M + 3, y + 6);

  const bankFields: [string, string | null][] = [
    ["Bank",    settings.bank_name],
    ["Account", settings.bank_account],
    ["IFSC",    settings.bank_ifsc],
    ["Branch",  settings.bank_branch],
  ];
  bankFields.forEach(([label, val], i) => {
    const dy = y + 12 + i * 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`${label}:`, M + 3, dy);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(val || "—", M + 22, dy);
  });

  // Terms (left box bottom)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Payment due within ${settings.payment_terms} days of invoice date.`, M + 3, y + 33);

  // Signatory box (right)
  const sigX = M + halfW + 5;
  doc.roundedRect(sigX, y, halfW, 36, 2, 2, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("FOR " + (settings.company_name || "NEVARK TECHNOLOGIES LLP").toUpperCase(), sigX + 3, y + 6);
  doc.setDrawColor(200, 210, 230);
  doc.line(sigX + 5, y + 30, sigX + halfW - 5, y + 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Authorised Signatory", sigX + halfW / 2, y + 34, { align: "center" });

  y += 42;

  // ─── Notes ────────────────────────────────────────────────────────────────
  if (invoice.notes) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Notes:", M, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    const lines = doc.splitTextToSize(invoice.notes, W - M * 2 - 20);
    doc.text(lines, M + 14, y);
    y += lines.length * 4.5 + 4;
  }

  // ─── Footer ───────────────────────────────────────────────────────────────
  const pageH = 297;
  doc.setFillColor(30, 58, 138);
  doc.rect(0, pageH - 10, W, 10, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(186, 207, 255);
  doc.text(
    "This is a computer-generated invoice and does not require a physical signature.",
    W / 2, pageH - 4,
    { align: "center" },
  );

  // ─── Save ─────────────────────────────────────────────────────────────────
  doc.save(`${invoice.invoice_number}.pdf`);
}
