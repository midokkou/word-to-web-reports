import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export type Row = Record<string, string | number>;

export function exportToExcel(filename: string, sheets: { name: string; rows: Row[] }[]) {
  const wb = XLSX.utils.book_new();
  for (const s of sheets) {
    const ws = XLSX.utils.json_to_sheet(s.rows.length ? s.rows : [{ "": "" }]);
    // RTL view
    if (!ws["!cols"]) ws["!cols"] = [];
    XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31) || "Sheet1");
  }
  // mark workbook RTL
  (wb as { Workbook?: { Views?: { RTL: boolean }[] } }).Workbook = {
    Views: [{ RTL: true }],
  };
  XLSX.writeFile(wb, `${filename}.xlsx`);
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
