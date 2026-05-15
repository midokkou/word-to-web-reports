import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileDown } from "lucide-react";
import { exportToExcel, exportElementToPDF, type Row } from "@/lib/exporters";
import { toast } from "sonner";
import { useState } from "react";

type Props = {
  filename: string;
  getSheets: () => { name: string; rows: Row[] }[];
  pdfTargetRef: React.RefObject<HTMLElement | null>;
  size?: "sm" | "default";
};

export function ExportButtons({ filename, getSheets, pdfTargetRef, size = "sm" }: Props) {
  const [busy, setBusy] = useState(false);

  const onExcel = () => {
    try {
      exportToExcel(filename, getSheets());
      toast.success("تم التصدير إلى Excel");
    } catch (e) {
      console.error(e);
      toast.error("تعذر التصدير إلى Excel");
    }
  };

  const onPdf = async () => {
    if (!pdfTargetRef.current) return;
    setBusy(true);
    try {
      await exportElementToPDF(pdfTargetRef.current, filename);
      toast.success("تم التصدير إلى PDF");
    } catch (e) {
      console.error(e);
      toast.error("تعذر التصدير إلى PDF");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex gap-2 print:hidden">
      <Button size={size} variant="outline" onClick={onExcel}>
        <FileSpreadsheet className="size-4 ml-1" /> Excel
      </Button>
      <Button size={size} variant="outline" onClick={onPdf} disabled={busy}>
        <FileDown className="size-4 ml-1" /> PDF
      </Button>
    </div>
  );
}
