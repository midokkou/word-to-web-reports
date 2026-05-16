import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export type Row = Record<string, string | number>;

// Professional palette
const COLOR = {
  titleBg: "FF1E3A8A", // deep indigo
  titleText: "FFFFFFFF",
  subtitleBg: "FFEEF2FF",
  headerBg: "FF3B82F6", // blue
  headerText: "FFFFFFFF",
  zebra: "FFF8FAFC",
  border: "FFCBD5E1",
  totalBg: "FFFEF3C7",
  totalText: "FF92400E",
  statCardBg: "FFF1F5F9",
  statCardAccent: "FF0F766E",
};

function setBorders(cell: ExcelJS.Cell, color = COLOR.border) {
  cell.border = {
    top: { style: "thin", color: { argb: color } },
    left: { style: "thin", color: { argb: color } },
    bottom: { style: "thin", color: { argb: color } },
    right: { style: "thin", color: { argb: color } },
  };
}

function autoWidth(ws: ExcelJS.Worksheet) {
  ws.columns.forEach((col) => {
    let max = 10;
    col.eachCell?.({ includeEmpty: false }, (cell) => {
      const v = cell.value;
      const len =
        v == null
          ? 0
          : typeof v === "object" && "richText" in (v as object)
            ? String((v as { richText: { text: string }[] }).richText.map((r) => r.text).join("")).length
            : String(v).length;
      if (len > max) max = len;
    });
    col.width = Math.min(Math.max(max + 4, 14), 50);
  });
}

function isNumericKey(rows: Row[], key: string) {
  return rows.length > 0 && rows.every((r) => r[key] === "" || r[key] == null || typeof r[key] === "number" || (!isNaN(Number(r[key])) && String(r[key]).trim() !== ""));
}

function buildSheet(ws: ExcelJS.Worksheet, title: string, rows: Row[]) {
  ws.views = [{ rightToLeft: true, showGridLines: false }];

  const headers = rows.length ? Object.keys(rows[0]) : ["لا توجد بيانات"];
  const colCount = headers.length;
  const lastCol = String.fromCharCode(64 + colCount);

  // Title row
  ws.mergeCells(`A1:${lastCol}1`);
  const titleCell = ws.getCell("A1");
  titleCell.value = title;
  titleCell.font = { name: "Cairo", size: 18, bold: true, color: { argb: COLOR.titleText } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.titleBg } };
  ws.getRow(1).height = 36;

  // Subtitle row (date + count)
  ws.mergeCells(`A2:${lastCol}2`);
  const sub = ws.getCell("A2");
  const today = new Date().toLocaleDateString("ar-EG");
  sub.value = `تاريخ التصدير: ${today}    •    عدد السجلات: ${rows.length}`;
  sub.font = { name: "Cairo", size: 11, italic: true, color: { argb: "FF334155" } };
  sub.alignment = { horizontal: "center", vertical: "middle" };
  sub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.subtitleBg } };
  ws.getRow(2).height = 22;

  // Spacer
  ws.getRow(3).height = 8;

  if (!rows.length) {
    ws.mergeCells(`A4:${lastCol}4`);
    const empty = ws.getCell("A4");
    empty.value = "لا توجد بيانات للعرض";
    empty.alignment = { horizontal: "center", vertical: "middle" };
    empty.font = { name: "Cairo", size: 12, color: { argb: "FF64748B" } };
    autoWidth(ws);
    return;
  }

  // Header row
  const headerRowIdx = 4;
  const headerRow = ws.getRow(headerRowIdx);
  headers.forEach((h, i) => {
    const c = headerRow.getCell(i + 1);
    c.value = h;
    c.font = { name: "Cairo", size: 12, bold: true, color: { argb: COLOR.headerText } };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.headerBg } };
    setBorders(c, COLOR.headerBg);
  });
  headerRow.height = 28;

  // Data rows
  rows.forEach((r, ri) => {
    const row = ws.getRow(headerRowIdx + 1 + ri);
    headers.forEach((h, ci) => {
      const c = row.getCell(ci + 1);
      const v = r[h];
      c.value = v as ExcelJS.CellValue;
      c.font = { name: "Cairo", size: 11, color: { argb: "FF0F172A" } };
      c.alignment = { horizontal: typeof v === "number" ? "center" : "right", vertical: "middle", wrapText: true };
      if (typeof v === "number") c.numFmt = "#,##0";
      if (ri % 2 === 1) c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.zebra } };
      setBorders(c);
    });
    row.height = 22;
  });

  // Totals row for numeric columns
  const numericCols = headers.filter((h) => isNumericKey(rows, h));
  if (numericCols.length) {
    const totalsRowIdx = headerRowIdx + rows.length + 1;
    const totalsRow = ws.getRow(totalsRowIdx);
    headers.forEach((h, ci) => {
      const c = totalsRow.getCell(ci + 1);
      if (ci === 0) c.value = "الإجمالي";
      else if (numericCols.includes(h)) {
        const colLetter = String.fromCharCode(65 + ci);
        c.value = { formula: `SUM(${colLetter}${headerRowIdx + 1}:${colLetter}${headerRowIdx + rows.length})` };
        c.numFmt = "#,##0";
      }
      c.font = { name: "Cairo", size: 12, bold: true, color: { argb: COLOR.totalText } };
      c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COLOR.totalBg } };
      c.alignment = { horizontal: "center", vertical: "middle" };
      setBorders(c, COLOR.totalText);
    });
    totalsRow.height = 26;
  }

  // Freeze header
  ws.views = [{ rightToLeft: true, showGridLines: false, state: "frozen", ySplit: headerRowIdx }];

  // Auto filter
  ws.autoFilter = {
    from: { row: headerRowIdx, column: 1 },
    to: { row: headerRowIdx, column: colCount },
  };

  autoWidth(ws);
}

export async function exportToExcel(filename: string, sheets: { name: string; rows: Row[] }[]) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Reports";
  wb.created = new Date();
  wb.views = [{ rightToLeft: true, x: 0, y: 0, width: 10000, height: 20000, firstSheet: 0, activeTab: 0, visibility: "visible" }];

  for (const s of sheets) {
    const safeName = (s.name || "Sheet").replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Sheet1";
    const ws = wb.addWorksheet(safeName, {
      views: [{ rightToLeft: true, showGridLines: false }],
      properties: { defaultRowHeight: 20 },
      pageSetup: { paperSize: 9, orientation: "landscape", horizontalCentered: true },
    });
    buildSheet(ws, s.name, s.rows);
  }

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportElementToPDF(el: HTMLElement, filename: string) {
  const canvas = await html2canvas(el, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
  });
  const img = canvas.toDataURL("image/png");
  const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW - 16;
  const imgH = (canvas.height * imgW) / canvas.width;
  let pos = 8;
  let remaining = imgH;
  if (imgH <= pageH - 16) {
    pdf.addImage(img, "PNG", 8, pos, imgW, imgH);
  } else {
    // simple multi-page split
    let y = 0;
    while (remaining > 0) {
      const sliceH = Math.min(pageH - 16, remaining);
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = (sliceH * canvas.width) / imgW;
      const ctx = sliceCanvas.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(canvas, 0, y, canvas.width, sliceCanvas.height, 0, 0, sliceCanvas.width, sliceCanvas.height);
      pdf.addImage(sliceCanvas.toDataURL("image/png"), "PNG", 8, 8, imgW, sliceH);
      y += sliceCanvas.height;
      remaining -= sliceH;
      if (remaining > 0) pdf.addPage();
    }
  }
  pdf.save(`${filename}.pdf`);
}
