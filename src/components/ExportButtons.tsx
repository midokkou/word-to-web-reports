import { Button } from "@/components/ui/button";
import { FileSpreadsheet, FileDown } from "lucide-react";
import { exportToExcel, type Row } from "@/lib/exporters";
import { toast } from "sonner";

type Props = {
  filename: string;
  getSheets: () => { name: string; rows: Row[] }[];
  pdfTargetRef?: React.RefObject<HTMLElement | null>;
  size?: "sm" | "default";
};

export function ExportButtons({ filename, getSheets, size = "sm" }: Props) {
  const onExcel = async () => {
    try {
      await exportToExcel(filename, getSheets());
      toast.success("تم التصدير إلى Excel");
    } catch (e) {
      console.error(e);
      toast.error("تعذر التصدير إلى Excel");
    }
  };

  const onPdf = () => {
    const prevTitle = document.title;
    document.title = filename;
    toast.info("اختر \"حفظ كـ PDF\" من وجهة الطباعة");
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.title = prevTitle;
      }, 500);
    }, 100);
  };

  return (
    <div className="flex gap-2 print:hidden">
      <Button size={size} variant="outline" onClick={onExcel}>
        <FileSpreadsheet className="size-4 ml-1" /> Excel
      </Button>
      <Button size={size} variant="outline" onClick={onPdf}>
        <FileDown className="size-4 ml-1" /> PDF
      </Button>
    </div>
  );
}
