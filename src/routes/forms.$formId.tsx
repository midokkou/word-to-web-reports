import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getForm } from "@/data/forms";
import { type FormEval, type ItemStatus, loadEval, saveEval, clearEval } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Save, Printer, RotateCcw, CheckCircle2, Circle, MinusCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/forms/$formId")({
  component: FormPage,
  loader: ({ params }) => {
    const f = getForm(params.formId);
    if (!f) throw notFound();
    return { form: f };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData?.form?.title ?? "استمارة" },
    ],
  }),
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-3">الاستمارة غير موجودة</h1>
        <Link to="/" className="text-primary underline">العودة للرئيسية</Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center p-6">
      <p className="text-destructive">{error.message}</p>
    </div>
  ),
});

const STATUS: { value: ItemStatus; label: string; icon: typeof CheckCircle2; cls: string }[] = [
  { value: "done", label: "منجز", icon: CheckCircle2, cls: "data-[on=true]:bg-success data-[on=true]:text-success-foreground" },
  { value: "partial", label: "جزئي", icon: MinusCircle, cls: "data-[on=true]:bg-warning data-[on=true]:text-warning-foreground" },
  { value: "not_done", label: "غير منجز", icon: XCircle, cls: "data-[on=true]:bg-destructive data-[on=true]:text-destructive-foreground" },
  { value: "pending", label: "لاحقاً", icon: Circle, cls: "data-[on=true]:bg-muted data-[on=true]:text-foreground" },
];

function FormPage() {
  const { form } = Route.useLoaderData() as { form: import("@/data/forms").SchoolForm };
  const navigate = useNavigate();
  const [state, setState] = useState<FormEval>({ employeeName: "", date: "", items: {} });

  useEffect(() => {
    setState(loadEval(form.id));
  }, [form.id]);

  const update = (next: FormEval) => {
    setState(next);
    saveEval(form.id, next);
  };

  const setStatus = (idx: number, status: ItemStatus) => {
    const cur = state.items[idx] ?? { status: "pending", notes: "" };
    update({ ...state, items: { ...state.items, [idx]: { ...cur, status } } });
  };

  const setNotes = (idx: number, notes: string) => {
    const cur = state.items[idx] ?? { status: "pending", notes: "" };
    update({ ...state, items: { ...state.items, [idx]: { ...cur, notes } } });
  };

  const doneCount = Object.values(state.items).filter((i) => i.status === "done").length;
  const pct = form.items.length ? Math.round((doneCount / form.items.length) * 100) : 0;

  return (
    <div className="min-h-screen pb-16">
      <Toaster richColors position="top-center" />
      <header className="border-b bg-card/70 backdrop-blur sticky top-0 z-10 print:hidden">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/" })}>
            <ArrowRight className="size-4 ml-1" /> الرجوع
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="size-4 ml-1" /> طباعة
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm("هل أنت متأكد من تفريغ الاستمارة؟")) {
                  clearEval(form.id);
                  setState({ employeeName: "", date: "", items: {} });
                  toast.success("تم تفريغ الاستمارة");
                }
              }}
            >
              <RotateCcw className="size-4 ml-1" /> تفريغ
            </Button>
            <Button size="sm" onClick={() => toast.success("تم الحفظ تلقائياً")}>
              <Save className="size-4 ml-1" /> محفوظ
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 pt-8">
        <div className="rounded-2xl p-6 sm:p-8 text-primary-foreground shadow-[var(--shadow-elegant)]" style={{ background: "var(--gradient-primary)" }}>
          <Badge className="bg-white/15 text-primary-foreground border-0 mb-3">استمارة متابعة</Badge>
          <h1 className="text-xl sm:text-2xl font-extrabold mb-4">{form.title}</h1>

          <div className="grid sm:grid-cols-2 gap-3 mb-5">
            <div>
              <label className="text-xs opacity-90 mb-1 block">اسم الموظفة</label>
              <Input
                value={state.employeeName}
                onChange={(e) => update({ ...state, employeeName: e.target.value })}
                placeholder="..."
                className="bg-white/15 border-white/20 text-primary-foreground placeholder:text-white/60"
              />
            </div>
            <div>
              <label className="text-xs opacity-90 mb-1 block">التاريخ</label>
              <Input
                type="date"
                value={state.date}
                onChange={(e) => update({ ...state, date: e.target.value })}
                className="bg-white/15 border-white/20 text-primary-foreground"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm mb-2">
            <span>{doneCount} منجز من {form.items.length}</span>
            <span className="font-bold">{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full bg-white transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-6 space-y-3">
        {form.items.map((text, i) => {
          const cur = state.items[i] ?? { status: "pending" as ItemStatus, notes: "" };
          return (
            <Card key={i} className="p-4 sm:p-5 border-border/60">
              <div className="flex gap-3 items-start mb-3">
                <div className="size-8 shrink-0 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-sm">
                  {i + 1}
                </div>
                <p className="text-sm sm:text-base font-medium leading-relaxed flex-1">{text}</p>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {STATUS.map((s) => {
                  const on = cur.status === s.value;
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.value}
                      data-on={on}
                      onClick={() => setStatus(i, s.value)}
                      className={`inline-flex items-center gap-1.5 text-xs sm:text-sm px-3 py-1.5 rounded-full border border-border bg-card hover:bg-secondary transition-all ${s.cls}`}
                    >
                      <Icon className="size-3.5" />
                      {s.label}
                    </button>
                  );
                })}
              </div>

              <Textarea
                value={cur.notes}
                onChange={(e) => setNotes(i, e.target.value)}
                placeholder="ملاحظات..."
                rows={2}
                className="text-sm bg-background"
              />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
