import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { getForm } from "@/data/forms";
import {
  computeFillStatus,
  deleteRecord,
  fetchAllRecords,
  type CloudRecord,
  type ItemStatus,
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
  ArrowRight,
  User,
  Calendar,
  Printer,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  MinusCircle,
  XCircle,
  Circle,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/records/form/$formId")({
  component: RecordFormDetailPage,
  loader: ({ params }) => {
    const f = getForm(params.formId);
    if (!f) throw notFound();
    return { form: f };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `سجل: ${loaderData?.form?.title ?? ""}` }],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-3">الاستمارة غير موجودة</h1>
        <Link to="/records" className="text-primary underline">العودة للسجلات</Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center p-6">
      <p className="text-destructive">{error.message}</p>
    </div>
  ),
});

const STATUS_META: Record<ItemStatus, { label: string; color: string; Icon: typeof CheckCircle2 }> = {
  done: { label: "منجز", color: "var(--success)", Icon: CheckCircle2 },
  partial: { label: "جزئي", color: "var(--warning)", Icon: MinusCircle },
  not_done: { label: "غير منجز", color: "var(--destructive)", Icon: XCircle },
  pending: { label: "لاحقاً", color: "var(--muted-foreground)", Icon: Circle },
};

function RecordFormDetailPage() {
  const { form } = Route.useLoaderData() as { form: import("@/data/forms").SchoolForm };
  const [records, setRecords] = useState<CloudRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const refresh = async () => {
    setLoading(true);
    const all = await fetchAllRecords();
    setRecords(all.filter((r) => r.formId === form.id));
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.id]);

  const rows = useMemo(() => {
    return records
      .map((r) => {
        const totalBase = form.items.length;
        const items = Object.values(r.data.items ?? {});
        const done = items.filter((i) => i.status === "done").length;
        const partial = items.filter((i) => i.status === "partial").length;
        const notDone = items.filter((i) => i.status === "not_done").length;
        const pending = items.filter((i) => i.status === "pending").length;
        const totalAll = totalBase + (r.data.customItems?.length ?? 0);
        const status = computeFillStatus(r.data, totalBase);
        const pct = totalAll ? Math.round((done / totalAll) * 100) : 0;
        return { r, done, partial, notDone, pending, totalAll, status, pct };
      })
      .filter((x) => x.status !== "empty")
      .filter((x) => !q || x.r.employeeName.includes(q) || x.r.date.includes(q))
      .sort((a, b) => (a.r.updatedAt < b.r.updatedAt ? 1 : -1));
  }, [records, form.items.length, q]);

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`حذف سجل "${label}"؟`)) return;
    try {
      await deleteRecord(id);
      setRecords((prev) => prev.filter((x) => x.id !== id));
      toast.success("تم الحذف");
    } catch {
      toast.error("فشل الحذف");
    }
  };

  const toggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // overall stats
  const totals = useMemo(() => {
    const t = { records: rows.length, done: 0, partial: 0, notDone: 0, pending: 0, items: 0 };
    rows.forEach((row) => {
      t.done += row.done;
      t.partial += row.partial;
      t.notDone += row.notDone;
      t.pending += row.pending;
      t.items += row.totalAll;
    });
    return t;
  }, [rows]);
  const overallPct = totals.items ? Math.round((totals.done / totals.items) * 100) : 0;

  return (
    <div className="min-h-screen pb-12">
      <Toaster richColors position="top-center" />
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-10 print:hidden">
        <div className="container mx-auto px-4 py-4 flex items-center gap-3 flex-wrap">
          <Button asChild variant="ghost" size="sm">
            <Link to="/records">
              <ArrowRight className="size-4 ml-1" /> السجلات
            </Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base sm:text-lg font-bold leading-tight truncate">
              السجل المفصّل: {form.title}
            </h1>
            <p className="text-[11px] text-muted-foreground">
              {totals.records} إدخال • {totals.items} بند مُسجّل
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={refresh}>
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="size-4 ml-1" /> طباعة
          </Button>
        </div>
      </header>

      <section className="container mx-auto px-4 pt-6 space-y-6">
        {/* Overview banner */}
        <div
          className="rounded-2xl p-5 text-primary-foreground shadow-[var(--shadow-elegant)]"
          style={{ background: "var(--gradient-primary)" }}
        >
          <h2 className="text-lg font-extrabold mb-3">{form.title}</h2>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-sm">
            <div className="bg-white/15 rounded-lg px-3 py-2 text-center">
              <div className="text-xs opacity-80">الإدخالات</div>
              <div className="text-xl font-extrabold">{totals.records}</div>
            </div>
            <div className="bg-white/15 rounded-lg px-3 py-2 text-center">
              <div className="text-xs opacity-80">منجز</div>
              <div className="text-xl font-extrabold">{totals.done}</div>
            </div>
            <div className="bg-white/15 rounded-lg px-3 py-2 text-center">
              <div className="text-xs opacity-80">جزئي</div>
              <div className="text-xl font-extrabold">{totals.partial}</div>
            </div>
            <div className="bg-white/15 rounded-lg px-3 py-2 text-center">
              <div className="text-xs opacity-80">غير منجز</div>
              <div className="text-xl font-extrabold">{totals.notDone}</div>
            </div>
            <div className="bg-white/15 rounded-lg px-3 py-2 text-center">
              <div className="text-xs opacity-80">نسبة الإنجاز</div>
              <div className="text-xl font-extrabold">{overallPct}%</div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md print:hidden">
          <Input
            placeholder="ابحث باسم الموظفة أو التاريخ..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="bg-card"
          />
        </div>

        {loading ? (
          <Card className="p-10 text-center text-muted-foreground">جاري التحميل...</Card>
        ) : rows.length === 0 ? (
          <Card className="p-10 text-center">
            <FileText className="size-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground mb-3">لا توجد إدخالات معبّأة لهذه الاستمارة بعد.</p>
            <Button asChild>
              <Link to="/forms/$formId" params={{ formId: form.id }}>
                فتح الاستمارة
              </Link>
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {/* Summary table */}
            <Card className="overflow-hidden border-border/60">
              <div className="bg-primary text-primary-foreground px-4 py-2 font-bold text-sm">
                ملخّص الإدخالات
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="w-10 text-center">#</TableHead>
                    <TableHead className="text-right">الموظفة</TableHead>
                    <TableHead className="text-right">التاريخ</TableHead>
                    <TableHead className="text-center">منجز</TableHead>
                    <TableHead className="text-center">جزئي</TableHead>
                    <TableHead className="text-center">غير منجز</TableHead>
                    <TableHead className="text-center">الإجمالي</TableHead>
                    <TableHead className="text-center">النسبة</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, i) => (
                    <TableRow key={row.r.id}>
                      <TableCell className="text-center text-muted-foreground">{i + 1}</TableCell>
                      <TableCell className="text-right font-medium">
                        {row.r.employeeName || "—"}
                      </TableCell>
                      <TableCell className="text-right">{row.r.date || "—"}</TableCell>
                      <TableCell className="text-center text-success font-bold">{row.done}</TableCell>
                      <TableCell className="text-center text-warning font-bold">{row.partial}</TableCell>
                      <TableCell className="text-center text-destructive font-bold">
                        {row.notDone}
                      </TableCell>
                      <TableCell className="text-center">{row.totalAll}</TableCell>
                      <TableCell className="text-center font-bold">{row.pct}%</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>

            {/* Detailed cards */}
            {rows.map((row) => {
              const isOpen = openIds.has(row.r.id);
              const allItemTexts = [
                ...form.items.map((t, idx) => row.r.data.itemOverrides?.[idx] ?? t),
                ...(row.r.data.customItems ?? []),
              ];
              const hiddenIds = new Set(row.r.data.hiddenItems ?? []);
              const displayed: { text: string; displayIdx: number }[] = [];
              let displayIdx = 0;
              form.items.forEach((t, idx) => {
                if (hiddenIds.has(idx)) return;
                displayed.push({
                  text: row.r.data.itemOverrides?.[idx] ?? t,
                  displayIdx: displayIdx++,
                });
              });
              (row.r.data.customItems ?? []).forEach((t) => {
                displayed.push({ text: t, displayIdx: displayIdx++ });
              });
              void allItemTexts;

              return (
                <Card key={row.r.id} className="border-border/60 overflow-hidden">
                  <div className="flex items-center gap-3 p-4 bg-card">
                    <button
                      onClick={() => toggle(row.r.id)}
                      className="size-8 rounded-md border bg-background hover:bg-secondary flex items-center justify-center shrink-0"
                      aria-label="فتح/إغلاق"
                    >
                      {isOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                    </button>
                    <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span className="inline-flex items-center gap-1 text-sm font-bold">
                        <User className="size-4 text-primary" />
                        {row.r.employeeName || "—"}
                      </span>
                      {row.r.date && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="size-3.5" /> {row.r.date}
                        </span>
                      )}
                      <Badge
                        className={
                          row.status === "complete"
                            ? "bg-success/15 text-success border-0"
                            : "bg-warning/20 text-warning-foreground border-0"
                        }
                      >
                        {row.status === "complete" ? "مكتمل" : "قيد التعبئة"}
                      </Badge>
                      <span className="text-xs font-bold">
                        {row.pct}% ({row.done}/{row.totalAll})
                      </span>
                    </div>
                    <Button asChild size="sm" variant="outline" className="print:hidden">
                      <Link to="/forms/$formId" params={{ formId: form.id }}>
                        فتح
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive print:hidden"
                      onClick={() => handleDelete(row.r.id, row.r.employeeName || "السجل")}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>

                  {isOpen && (
                    <div className="border-t bg-muted/20 p-4 space-y-4">
                      {/* Items table */}
                      <div className="rounded-lg border bg-card overflow-hidden">
                        <div className="bg-secondary px-3 py-1.5 text-xs font-bold">
                          بنود الاستمارة
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-10 text-center">#</TableHead>
                              <TableHead className="text-right">البند</TableHead>
                              <TableHead className="w-28 text-center">الحالة</TableHead>
                              <TableHead className="text-right">ملاحظات</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {displayed.map(({ text, displayIdx }) => {
                              const ev = row.r.data.items?.[displayIdx];
                              const status = (ev?.status ?? "pending") as ItemStatus;
                              const meta = STATUS_META[status];
                              const Icon = meta.Icon;
                              return (
                                <TableRow key={displayIdx}>
                                  <TableCell className="text-center text-muted-foreground text-xs">
                                    {displayIdx + 1}
                                  </TableCell>
                                  <TableCell className="text-right text-sm">{text}</TableCell>
                                  <TableCell className="text-center">
                                    <span
                                      className="inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full text-white"
                                      style={{ background: meta.color }}
                                    >
                                      <Icon className="size-3" />
                                      {meta.label}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right text-xs text-muted-foreground">
                                    {ev?.notes || "—"}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Followups */}
                      {([
                        { fu: row.r.data.followup1, title: "المتابعة الأولى" },
                        { fu: row.r.data.followup2, title: "المتابعة الثانية" },
                      ] as const).map(({ fu, title }, idx) => {
                        if (!fu) return null;
                        const has =
                          fu.day || fu.date || fu.recommendations || fu.reviewerName || fu.signature;
                        if (!has) return null;
                        return (
                          <div key={idx} className="rounded-lg border bg-card overflow-hidden">
                            <div className="bg-secondary px-3 py-1.5 text-xs font-bold">{title}</div>
                            <Table>
                              <TableBody>
                                <TableRow>
                                  <TableHead className="w-28 text-right bg-muted/30">اليوم</TableHead>
                                  <TableCell>{fu.day || "—"}</TableCell>
                                  <TableHead className="w-28 text-right bg-muted/30">التاريخ</TableHead>
                                  <TableCell>{fu.date || "—"}</TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableHead className="text-right bg-muted/30">التوصيات</TableHead>
                                  <TableCell colSpan={3} className="whitespace-pre-wrap text-sm">
                                    {fu.recommendations || "—"}
                                  </TableCell>
                                </TableRow>
                                <TableRow>
                                  <TableHead className="text-right bg-muted/30">المتابع</TableHead>
                                  <TableCell>{fu.reviewerName || "—"}</TableCell>
                                  <TableHead className="text-right bg-muted/30">التوقيع</TableHead>
                                  <TableCell>{fu.signature || "—"}</TableCell>
                                </TableRow>
                              </TableBody>
                            </Table>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
