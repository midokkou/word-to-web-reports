import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  ListTodo,
  BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { ExportButtons } from "@/components/ExportButtons";

export const Route = createFileRoute("/records")({
  component: RecordsPage,
  head: () => ({
    meta: [{ title: "السجلات" }],
  }),
});

type FormRow = {
  record: CloudRecord;
  form: ReturnType<typeof getForm>;
  status: FillStatus;
  done: number;
  total: number;
};

type TaskRow = {
  record: CloudRecord;
  period: "daily" | "weekly" | "monthly";
};

const TASK_LABELS: Record<TaskRow["period"], string> = {
  daily: "يومية",
  weekly: "أسبوعية",
  monthly: "شهرية",
};

function RecordsPage() {
  const [q, setQ] = useState("");
  const [records, setRecords] = useState<CloudRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const pdfRef = useRef<HTMLDivElement>(null);

  const refresh = async () => {
    setLoading(true);
    const all = await fetchAllRecords();
    setRecords(all);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const { formRows, taskRows } = useMemo(() => {
    const fRows: FormRow[] = [];
    const tRows: TaskRow[] = [];
    for (const r of records) {
      if (r.formId.startsWith("tasks-")) {
        const period = r.formId.slice("tasks-".length) as TaskRow["period"];
        if (!["daily", "weekly", "monthly"].includes(period)) continue;
        if (
          q &&
          !r.employeeName.includes(q) &&
          !TASK_LABELS[period].includes(q) &&
          !"المهام".includes(q)
        )
          continue;
        tRows.push({ record: r, period });
      } else {
        const form = getForm(r.formId);
        const totalBase = form?.items.length ?? 0;
        const status = computeFillStatus(r.data, totalBase);
        if (status === "empty") continue;
        const items = Object.values(r.data.items ?? {});
        const done = items.filter((i) => i.status === "done").length;
        const totalAll = totalBase + (r.data.customItems?.length ?? 0);
        if (
          q &&
          !(form?.title ?? "").includes(q) &&
          !r.employeeName.includes(q)
        )
          continue;
        fRows.push({ record: r, form, status, done, total: totalAll });
      }
    }
    return { formRows: fRows, taskRows: tRows };
  }, [records, q]);

  const styles: Record<FillStatus, { bg: string; text: string; label: string }> = {
    complete: { bg: "bg-success/15", text: "text-success", label: "مكتمل" },
    partial: { bg: "bg-warning/20", text: "text-warning-foreground", label: "قيد التعبئة" },
    empty: { bg: "", text: "", label: "" },
  };

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`حذف "${label}"؟`)) return;
    try {
      await deleteRecord(id);
      setRecords((prev) => prev.filter((x) => x.id !== id));
      toast.success("تم الحذف");
    } catch {
      toast.error("فشل الحذف");
    }
  };

  const buildSheets = () => {
    const formsRows = formRows.map((r) => ({
      "الاستمارة": r.form?.title ?? r.record.formId,
      "الموظفة": r.record.employeeName,
      "التاريخ": r.record.date,
      "منجز": r.done,
      "الإجمالي": r.total,
      "النسبة": r.total ? Math.round((r.done / r.total) * 100) + "%" : "0%",
      "الحالة": r.status === "complete" ? "مكتمل" : "قيد التعبئة",
    }));
    const tasksRows = taskRows.map((r) => ({
      "اسم المهمة": r.record.employeeName,
      "النوع": TASK_LABELS[r.period],
      "التاريخ": r.record.date,
      "ما تم": (r.record.data as { done?: string })?.done ?? "",
      "ما لم يتم": (r.record.data as { notDone?: string })?.notDone ?? "",
      "ما يستجد": (r.record.data as { newWork?: string })?.newWork ?? "",
    }));
    return [
      { name: "الاستمارات", rows: formsRows },
      { name: "المهام", rows: tasksRows },
    ];
  };

  return (
    <div className="min-h-screen pb-12" ref={pdfRef}>
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
              جميع الاستمارات والمهام المُدخلة من جميع المستخدمين
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={refresh} className="print:hidden">
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()} className="print:hidden">
            <Printer className="size-4 ml-1" /> طباعة
          </Button>
          <ExportButtons filename="السجلات" getSheets={buildSheets} pdfTargetRef={pdfRef} />
        </div>
      </header>

      <section className="container mx-auto px-4 pt-8">
        <div className="relative max-w-md mb-6 print:hidden">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="ابحث باسم الاستمارة أو المهمة..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pr-9 bg-card"
          />
        </div>

        {loading ? (
          <Card className="p-10 text-center text-muted-foreground">جاري التحميل...</Card>
        ) : formRows.length === 0 && taskRows.length === 0 ? (
          <Card className="p-10 text-center">
            <FileText className="size-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">لا توجد سجلات معبّأة بعد.</p>
            <Link to="/" className="inline-flex items-center gap-1 text-primary mt-3 text-sm font-medium">
              تصفّح الاستمارات <ArrowLeft className="size-4" />
            </Link>
          </Card>
        ) : (
          <div className="space-y-10">
            {/* Forms section */}
            {formRows.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <FileText className="size-4 text-primary" />
                    الاستمارات
                    <span className="text-xs font-normal text-muted-foreground">
                      ({formRows.length})
                    </span>
                  </h2>
                </div>
                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الاستمارة</TableHead>
                        <TableHead className="text-right">الموظفة</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">الإنجاز</TableHead>
                        <TableHead className="text-right">الحالة</TableHead>
                        <TableHead className="text-right w-24">إجراء</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formRows.map((r) => {
                        const s = styles[r.status];
                        const pct = r.total ? Math.round((r.done / r.total) * 100) : 0;
                        const title = r.form?.title ?? r.record.formId;
                        return (
                          <TableRow key={r.record.id}>
                            <TableCell className="font-medium">{title}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-1 text-muted-foreground">
                                <User className="size-3.5" /> {r.record.employeeName || "—"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-1 text-muted-foreground">
                                <Calendar className="size-3.5" /> {r.record.date || "—"}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">{r.done}/{r.total}</span>
                                <span className="text-sm font-bold">{pct}%</span>
                              </div>
                              <div className="h-1.5 rounded-full bg-secondary overflow-hidden mt-1 w-20">
                                <div
                                  className="h-full rounded-full"
                                  style={{ width: `${pct}%`, background: "var(--gradient-primary)" }}
                                />
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${s.bg} ${s.text} border-0`}>{s.label}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {r.form ? (
                                  <Button asChild size="sm" variant="ghost" className="text-primary">
                                    <Link to="/forms/$formId" params={{ formId: r.form.id }}>
                                      <ArrowLeft className="size-4" />
                                    </Link>
                                  </Button>
                                ) : null}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive"
                                  onClick={() => handleDelete(r.record.id, title)}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Tasks section */}
            {taskRows.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <h2 className="text-base font-bold flex items-center gap-2">
                    <ListTodo className="size-4 text-primary" />
                    المهام
                    <span className="text-xs font-normal text-muted-foreground">
                      ({taskRows.length})
                    </span>
                  </h2>
                </div>
                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-right">الموظفة</TableHead>
                        <TableHead className="text-right">النوع</TableHead>
                        <TableHead className="text-right">التاريخ</TableHead>
                        <TableHead className="text-right">ما تم</TableHead>
                        <TableHead className="text-right">ما لم يتم</TableHead>
                        <TableHead className="text-right w-24">إجراء</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {taskRows.map((r) => {
                        const name = r.record.employeeName || "(بدون اسم)";
                        const data = (r.record.data ?? {}) as { done?: string; notDone?: string };
                        return (
                          <TableRow key={r.record.id}>
                            <TableCell className="font-medium">{name}</TableCell>
                            <TableCell>
                              <Badge className="bg-primary/10 text-primary border-0">
                                {TASK_LABELS[r.period]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center gap-1 text-muted-foreground">
                                <Calendar className="size-3.5" /> {r.record.date || "—"}
                              </span>
                            </TableCell>
                            <TableCell className="max-w-[200px] truncate text-muted-foreground">{data.done || "—"}</TableCell>
                            <TableCell className="max-w-[200px] truncate text-muted-foreground">{data.notDone || "—"}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button asChild size="sm" variant="ghost" className="text-primary">
                                  <Link to="/tasks/$period" params={{ period: r.period }}>
                                    <ArrowLeft className="size-4" />
                                  </Link>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive"
                                  onClick={() => handleDelete(r.record.id, name)}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
