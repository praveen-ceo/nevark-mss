/**
 * Indian GST Tax Invoice PDF Generator
 * Uses jspdf + jspdf-autotable (already installed)
 * No backend dependency — pure client-side generation.
 */

// ---------------------------------------------------------------------------
// Types
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
  return "Rs. " + n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function pct(v: number | null): string {
  return v != null ? `${v}%` : "0%";
}

/** Fetch /public/nevark-logo.png and return base64 data URL; null on failure. */
async function fetchLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch("/nevark-logo.png");
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

type LastAutoTable = { lastAutoTable: { finalY: number } };

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function downloadInvoicePdf(
  invoice: PdfInvoice,
  settings: PdfSettings,
): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }, logoBase64] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
    fetchLogoBase64(),
  ]);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const M = 14;
  const BLUE: [number, number, number] = [30, 58, 138];
  const LIGHT_BLUE: [number, number, number] = [186, 207, 255];
  const SLATE: [number, number, number] = [100, 116, 139];
  const DARK: [number, number, number] = [15, 23, 42];
  const MID: [number, number, number] = [71, 85, 105];

  const isIntrastate = invoice.supply_type === "intrastate";
  const outstanding = invoice.outstanding_amount ?? (invoice.total_amount - invoice.paid_amount);
  const sac = settings.default_sac || "998314";
  const companyName = settings.company_name || "Nevark Technologies LLP";

  // ─── Header bar ───────────────────────────────────────────────────────────
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, W, 32, "F");

  // Logo — white pill on right side of header
  if (logoBase64) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(W - M - 32, 3, 32, 13, 1.5, 1.5, "F");
    doc.addImage(logoBase64, "PNG", W - M - 31, 4, 30, 11);
  }

  // Company name (left)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(companyName, M, 10);

  // Address + contact line
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...LIGHT_BLUE);
  const addrLine = [settings.company_address, settings.company_phone, settings.company_email]
    .filter(Boolean).join("   |   ");
  if (addrLine) doc.text(addrLine, M, 16);

  // GSTIN / PAN / State
  const gstLine = [
    settings.company_gstin ? `GSTIN: ${settings.company_gstin}` : null,
    settings.pan           ? `PAN: ${settings.pan}`             : null,
    settings.state_code    ? `State Code: ${settings.state_code}` : null,
  ].filter(Boolean).join("   |   ");
  if (gstLine) doc.text(gstLine, M, 21);

  // TAX INVOICE label (below logo)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(logoBase64 ? 9 : 13);
  doc.setTextColor(255, 255, 255);
  doc.text("TAX INVOICE", W - M, logoBase64 ? 22 : 11, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...LIGHT_BLUE);
  doc.text("Original for Recipient", W - M, logoBase64 ? 27 : 17, { align: "right" });

  // ─── Bill To + Invoice Meta ───────────────────────────────────────────────
  let y = 38;

  // Left: Bill To
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE);
  doc.text("BILL TO", M, y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text(invoice.client?.name || "—", M, y + 5.5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MID);
  let billY = y + 5.5;
  if (invoice.gstin)   { billY += 5; doc.text(`GSTIN: ${invoice.gstin}`, M, billY); }
  if (invoice.project) { billY += 5; doc.text(`Project: ${invoice.project.name} (${invoice.project.code})`, M, billY); }

  // Right: Invoice detail grid
  const detailsX = 118;
  const details: [string, string][] = [
    ["Invoice No.",      invoice.invoice_number],
    ["Issue Date",       invoice.issue_date],
    ["Due Date",         invoice.due_date],
    ["Place of Supply",  invoice.place_of_supply || "—"],
    ["SAC Code",         sac],
    ["Currency",         invoice.currency || "INR"],
  ];

  details.forEach(([label, val], i) => {
    const dy = y + i * 5.4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE);
    doc.text(label, detailsX, dy);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK);
    doc.text(val, W - M, dy, { align: "right" });
  });

  y += 36;

  // Divider
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.line(M, y, W - M, y);
  y += 5;

  // ─── Line Items ───────────────────────────────────────────────────────────
  autoTable(doc, {
    startY: y,
    head: [["#", "SAC", "Description", "Qty", "Unit Rate", "Amount"]],
    body: invoice.items.map((item, i) => [
      String(i + 1),
      sac,
      item.description,
      Number(item.quantity).toLocaleString("en-IN"),
      fmtINR(item.unit_price),
      fmtINR(item.amount),
    ]),
    headStyles: {
      fillColor: BLUE,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: DARK,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 7,  halign: "center", textColor: SLATE },
      1: { cellWidth: 18, halign: "center" },
      2: { cellWidth: "auto" },
      3: { cellWidth: 14, halign: "center" },
      4: { cellWidth: 33, halign: "right" },
      5: { cellWidth: 33, halign: "right", fontStyle: "bold" },
    },
    margin: { left: M, right: M },
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.2,
  });

  y = (doc as unknown as LastAutoTable).lastAutoTable.finalY + 5;

  // ─── GST Summary (right-aligned autoTable) ────────────────────────────────
  type TotalRow = { label: string; value: string; tag: "normal" | "total" | "paid" | "balance" };

  const gstRows: TotalRow[] = [{ label: "Subtotal", value: fmtINR(invoice.subtotal), tag: "normal" }];

  if (invoice.discount_amount > 0)
    gstRows.push({ label: "Discount", value: `-${fmtINR(invoice.discount_amount)}`, tag: "normal" });

  if (isIntrastate) {
    gstRows.push({ label: `CGST @ ${pct(invoice.cgst_rate)}`, value: fmtINR(invoice.cgst_amount), tag: "normal" });
    gstRows.push({ label: `SGST @ ${pct(invoice.sgst_rate)}`, value: fmtINR(invoice.sgst_amount), tag: "normal" });
  } else {
    gstRows.push({ label: `IGST @ ${pct(invoice.igst_rate)}`, value: fmtINR(invoice.igst_amount), tag: "normal" });
  }

  gstRows.push({ label: "Grand Total",   value: fmtINR(invoice.total_amount), tag: "total" });
  gstRows.push({ label: "Amount Paid",   value: fmtINR(invoice.paid_amount),  tag: "paid" });
  gstRows.push({ label: "Balance Due",   value: fmtINR(outstanding),          tag: "balance" });

  const TABLE_W = 82;
  const COL0_W = 46;
  const COL1_W = TABLE_W - COL0_W;

  autoTable(doc, {
    startY: y,
    body: gstRows.map(r => [r.label, r.value]),
    tableWidth: TABLE_W,
    margin: { left: W - M - TABLE_W },
    theme: "plain",
    styles: {
      fontSize: 8.5,
      cellPadding: { top: 2.2, bottom: 2.2, left: 4, right: 4 },
    },
    columnStyles: {
      0: { cellWidth: COL0_W, halign: "left",  textColor: MID },
      1: { cellWidth: COL1_W, halign: "right", textColor: DARK, fontStyle: "bold" },
    },
    didParseCell: (data) => {
      const tag = gstRows[data.row.index]?.tag;
      if (tag === "total") {
        data.cell.styles.fillColor = BLUE;
        data.cell.styles.textColor = [255, 255, 255];
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fontSize = 9;
        data.cell.styles.cellPadding = { top: 3, bottom: 3, left: 4, right: 4 };
      } else if (tag === "balance") {
        data.cell.styles.textColor = BLUE;
        data.cell.styles.fontStyle = "bold";
      } else if (tag === "paid") {
        data.cell.styles.textColor = [4, 120, 87]; // emerald-700
      }
    },
    willDrawCell: (data) => {
      // Draw bottom border for each row
      if (gstRows[data.row.index]?.tag !== "total") {
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
      }
    },
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.2,
  });

  y = (doc as unknown as LastAutoTable).lastAutoTable.finalY + 6;

  // ─── Amount in Words ──────────────────────────────────────────────────────
  doc.setFillColor(239, 246, 255);
  doc.roundedRect(M, y, W - M * 2, 10, 2, 2, "F");
  doc.setDrawColor(196, 213, 255);
  doc.setLineWidth(0.3);
  doc.roundedRect(M, y, W - M * 2, 10, 2, 2, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...BLUE);
  doc.text("Amount in Words:", M + 3, y + 6.5);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK);
  const wordsStr = amountToWords(invoice.total_amount);
  const wordsLines = doc.splitTextToSize(wordsStr, W - M * 2 - 46);
  doc.text(wordsLines, M + 40, y + 6.5);

  y += 15;

  // ─── Bank Details + Authorised Signatory ─────────────────────────────────
  const bankStartY = y;
  const halfW = (W - M * 2 - 5) / 2;
  const sigX = M + halfW + 5;

  // Bank details — left half — autoTable grid
  autoTable(doc, {
    startY: bankStartY,
    head: [["BANK DETAILS FOR PAYMENT", ""]],
    body: [
      ["Bank Name",    settings.bank_name    || "—"],
      ["Account No.",  settings.bank_account || "—"],
      ["IFSC Code",    settings.bank_ifsc    || "—"],
      ["Branch",       settings.bank_branch  || "—"],
      ["Payment Terms", `Within ${settings.payment_terms} days of invoice date`],
    ],
    tableWidth: halfW,
    margin: { left: M },
    theme: "grid",
    headStyles: {
      fillColor: BLUE,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
    },
    bodyStyles: {
      fontSize: 8,
      cellPadding: { top: 2.2, bottom: 2.2, left: 3, right: 3 },
    },
    columnStyles: {
      0: { cellWidth: 32, textColor: SLATE, fontStyle: "normal" },
      1: { cellWidth: "auto", textColor: DARK, fontStyle: "bold" },
    },
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.3,
  });

  const bankFinalY = (doc as unknown as LastAutoTable).lastAutoTable.finalY;
  const sigBoxH = bankFinalY - bankStartY;

  // Authorised signatory — right half — manual bordered box
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.roundedRect(sigX, bankStartY, halfW, sigBoxH, 2, 2, "S");

  // Blue header strip in sig box
  doc.setFillColor(...BLUE);
  doc.roundedRect(sigX, bankStartY, halfW, 7.5, 2, 2, "F");
  // Overwrite bottom-left and bottom-right curves of header so it looks like a flat bottom
  doc.setFillColor(...BLUE);
  doc.rect(sigX, bankStartY + 4, halfW, 3.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(
    "FOR " + companyName.toUpperCase(),
    sigX + halfW / 2,
    bankStartY + 5,
    { align: "center" },
  );

  // Signature line
  const sigLineY = bankStartY + sigBoxH - 10;
  doc.setDrawColor(180, 200, 230);
  doc.setLineWidth(0.5);
  doc.line(sigX + 8, sigLineY, sigX + halfW - 8, sigLineY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE);
  doc.text("Authorised Signatory", sigX + halfW / 2, sigLineY + 5, { align: "center" });

  // E & O.E.
  doc.setFont("helvetica", "italic");
  doc.setFontSize(6.5);
  doc.setTextColor(180, 190, 210);
  doc.text("E. & O.E.", sigX + 4, bankStartY + sigBoxH - 2);

  y = bankFinalY + 6;

  // ─── Notes ────────────────────────────────────────────────────────────────
  if (invoice.notes) {
    doc.setFillColor(255, 251, 235); // amber-50
    doc.roundedRect(M, y, W - M * 2, 8, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(146, 64, 14); // amber-800
    doc.text("Notes:", M + 3, y + 5.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MID);
    const lines = doc.splitTextToSize(invoice.notes, W - M * 2 - 22) as string[];
    doc.text(lines, M + 18, y + 5.5);
    y += Math.max(8, lines.length * 4.5) + 5;
  }

  // ─── Footer ───────────────────────────────────────────────────────────────
  const pageH = 297;
  doc.setFillColor(...BLUE);
  doc.rect(0, pageH - 10, W, 10, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...LIGHT_BLUE);
  doc.text(
    "This is a computer-generated invoice and does not require a physical signature.",
    W / 2,
    pageH - 4,
    { align: "center" },
  );

  // ─── Save ─────────────────────────────────────────────────────────────────
  doc.save(`${invoice.invoice_number}.pdf`);
}
