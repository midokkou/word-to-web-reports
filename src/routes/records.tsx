import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { getForm } from "@/data/forms";
import {
  computeFillStatus,
  deleteRecord,
  fetchAllRecords,
  type CloudRecord,
  type FillStatus,
} from "@/lib/storage";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  FolderOpen,
  Search,
  ArrowLeft,
  User,
  Calendar,
  Trash2,
  FileText,
  Printer,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/records")({
  component: RecordsPage,
  head: () => ({
    meta: [{ title: "السجلات" }],
  }),
});

type Row = {
  record: CloudRecord;
  form: ReturnType<typeof getForm>;
  status: FillStatus;
  done: number;
  total: number;
};

function RecordsPage() {
  const [q, setQ] = useState("");
  const [records, setRecords] = useState<CloudRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const all = await fetchAllRecords();
    setRecords(all);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const rows: Row[] = useMemo(() => {
    return records
      .map((r) => {
        const form = getForm(r.formId);
        const totalBase = form?.items.length ?? 0;
        const status = computeFillStatus(r.data, totalBase);
        const items = Object.values(r.data.items ?? {});
        const done = items.filter((i) => i.status === "done").length;
        const totalAll = totalBase + (r.data.customItems?.length ?? 0);
        return { record: r, form, status, done, total: totalAll };
      })
      .filter((r) => r.status !== "empty")
      .filter((r) => {
        if (!q) return true;
        return (
          (r.form?.title ?? "").includes(q) ||
          r.record.employeeName.includes(q)
        );
      });
  }, [records, q]);

  const styles: Record<FillStatus, { bg: string; text: string; label: string }> = {
    complete: { bg: "bg-success/15", text: "text-success", label: "مكتمل" },
    partial: { bg: "bg-warning/20", text: "text-warning-foreground", label: "قيد التعبئة" },
    empty: { bg: "", text: "", label: "" },
  };

  return (
    <div className="min-h-screen pb-12">
      <Toaster richColors position="top-center" />
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="container mx-auto px-4 py-5 flex items-center gap-3">
          <div
            className="size-11 rounded-xl flex items-center justify-center text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            <FolderOpen className="size-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold leading-tight">السجلات</h1>
            <p className="text-xs text-muted-foreground">
              جميع الاستمارات المعبّأة من جميع المستخدمين
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={refresh} className="print:hidden">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()} className="print:hidden">
            <Printer className="size-4 ml-1" /> طباعة
          </Button>
        </div>
      </header>

      <section className="container mx-auto px-4 pt-8">
        <div className="relative max-w-md mb-6">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="ابحث باسم الاستمارة أو الموظفة..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pr-9 bg-card"
          />
        </div>

        {loading ? (
          <Card className="p-10 text-center text-muted-foreground">جاري التحميل...</Card>
        ) : rows.length === 0 ? (
          <Card className="p-10 text-center">
            <FileText className="size-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">لا توجد سجلات معبّأة بعد.</p>
            <Link to="/" className="inline-flex items-center gap-1 text-primary mt-3 text-sm font-medium">
              تصفّح الاستمارات <ArrowLeft className="size-4" />
            </Link>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {rows.map((r) => {
              const s = styles[r.status];
              const pct = r.total ? Math.round((r.done / r.total) * 100) : 0;
              const title = r.form?.title ?? r.record.formId;
              return (
                <Card key={r.record.id} className="p-5 border-border/60 relative overflow-hidden">
                  <span
                    className={`absolute top-0 right-0 h-full w-1.5 ${
                      r.status === "complete" ? "bg-success" : "bg-warning"
                    }`}
                  />
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <h3 className="font-bold leading-snug flex-1">{title}</h3>
                    <Badge className={`${s.bg} ${s.text} border-0 shrink-0`}>{s.label}</Badge>
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mb-3">
                    {r.record.employeeName && (
                      <span className="inline-flex items-center gap-1">
                        <User className="size-3.5" /> {r.record.employeeName}
                      </span>
                    )}
                    {r.record.date && (
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="size-3.5" /> {r.record.date}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="text-muted-foreground">
                      {r.done} / {r.total} عنصر منجز
                    </span>
                    <span className="font-bold text-base text-foreground">{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden mb-4">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: "var(--gradient-primary)" }}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/50">
                    {r.form ? (
                      <Button asChild size="sm" variant="outline">
                        <Link to="/forms/$formId" params={{ formId: r.form.id }}>
                          فتح <ArrowLeft className="size-4 mr-1" />
                        </Link>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">استمارة محذوفة</span>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={async () => {
                        if (!confirm(`حذف سجل "${title}"؟`)) return;
                        try {
                          await deleteRecord(r.record.id);
                          setRecords((prev) => prev.filter((x) => x.id !== r.record.id));
                          toast.success("تم حذف السجل");
                        } catch {
                          toast.error("فشل حذف السجل");
                        }
                      }}
                    >
                      <Trash2 className="size-4 ml-1" /> حذف السجل
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
