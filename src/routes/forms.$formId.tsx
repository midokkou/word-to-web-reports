import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { getForm, forms } from "@/data/forms";
import { type FormEval, type ItemStatus, type ItemEval, type Followup, loadEval, saveEval, clearEval, emptyFollowup } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowRight,
  Save,
  Printer,
  RotateCcw,
  CheckCircle2,
  Circle,
  MinusCircle,
  XCircle,
  Plus,
  Trash2,
  Search,
  Pencil,
  Check,
  X,
  FileText,
} from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { ExportButtons } from "@/components/ExportButtons";

export const Route = createFileRoute("/forms/$formId")({
  component: FormPage,
  loader: ({ params }) => {
    const f = getForm(params.formId);
    if (!f) throw notFound();
    return { form: f };
  },
  head: ({ loaderData }) => ({
    meta: [{ title: loaderData?.form?.title ?? "استمارة" }],
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

const STATUS: {
  value: ItemStatus;
  label: string;
  icon: typeof CheckCircle2;
  cls: string;
  ring: string;
  accent: string;
}[] = [
  {
    value: "done",
    label: "منجز",
    icon: CheckCircle2,
    cls: "data-[on=true]:bg-success data-[on=true]:text-success-foreground data-[on=true]:border-success data-[on=true]:shadow-[0_4px_14px_-4px_var(--success)]",
    ring: "ring-success/40",
    accent: "var(--success)",
  },
  {
    value: "partial",
    label: "جزئي",
    icon: MinusCircle,
    cls: "data-[on=true]:bg-warning data-[on=true]:text-warning-foreground data-[on=true]:border-warning data-[on=true]:shadow-[0_4px_14px_-4px_var(--warning)]",
    ring: "ring-warning/40",
    accent: "var(--warning)",
  },
  {
    value: "not_done",
    label: "غير منجز",
    icon: XCircle,
    cls: "data-[on=true]:bg-destructive data-[on=true]:text-destructive-foreground data-[on=true]:border-destructive data-[on=true]:shadow-[0_4px_14px_-4px_var(--destructive)]",
    ring: "ring-destructive/40",
    accent: "var(--destructive)",
  },
  {
    value: "pending",
    label: "لاحقاً",
    icon: Circle,
    cls: "data-[on=true]:bg-muted data-[on=true]:text-foreground data-[on=true]:border-muted-foreground/30",
    ring: "ring-muted-foreground/30",
    accent: "var(--muted-foreground)",
  },
];

function FormPage() {
  const { form } = Route.useLoaderData() as { form: import("@/data/forms").SchoolForm };
  const navigate = useNavigate();
  const [state, setState] = useState<FormEval>({ employeeName: "", date: "", items: {}, customItems: [] });
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [summaryOpen, setSummaryOpen] = useState(false);
  const pdfRef = useRef<HTMLDivElement>(null);

  const buildSheets = () => {
    const items = displayItemsRef.current.map((text, i) => {
      const ev = state.items[i];
      const status = ev?.status ?? "pending";
      const label = status === "done" ? "منجز" : status === "partial" ? "جزئي" : status === "not_done" ? "غير منجز" : "لاحقاً";
      return { "#": i + 1, "العنصر": text, "الحالة": label, "ملاحظات": ev?.notes ?? "" };
    });
    return [{ name: "الاستمارة", rows: items }];
  };
  const displayItemsRef = useRef<string[]>([]);

  useEffect(() => {
    // Load local cache immediately, then sync from cloud
    setState(loadEval(form.id));
    (async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const recId = localStorage.getItem(`school-report:rec:${form.id}`);
        if (!recId) return;
        const { data } = await supabase
          .from("form_records")
          .select("data")
          .eq("id", recId)
          .maybeSingle();
        if (data?.data) {
          const cloud = data.data as unknown as FormEval;
          setState((prev) => ({ ...prev, ...cloud }));
          localStorage.setItem(`school-report:${form.id}`, JSON.stringify(cloud));
        }
      } catch (e) {
        console.error("Failed to fetch from cloud:", e);
      }
    })();
  }, [form.id]);

  const update = (next: FormEval) => {
    setState(next);
    saveEval(form.id, next);
  };

  const allItems = useMemo(() => {
    const cur = new Set([...(form.items ?? []), ...(state.customItems ?? [])]);
    const list: { text: string; from: string }[] = [];
    forms.forEach((f) => {
      f.items.forEach((t) => {
        if (!cur.has(t) && !list.find((x) => x.text === t)) {
          list.push({ text: t, from: f.title });
        }
      });
    });
    return list;
  }, [form.items, state.customItems]);

  const filtered = useMemo(
    () => (search ? allItems.filter((x) => x.text.includes(search)) : allItems),
    [allItems, search]
  );

  const setStatus = (idx: number, status: ItemStatus) => {
    const cur = state.items[idx] ?? { status: "pending", notes: "" };
    update({ ...state, items: { ...state.items, [idx]: { ...cur, status } } });
  };

  const setNotes = (idx: number, notes: string) => {
    const cur = state.items[idx] ?? { status: "pending", notes: "" };
    update({ ...state, items: { ...state.items, [idx]: { ...cur, notes } } });
  };

  const addSelected = () => {
    const toAdd = Array.from(selected);
    if (!toAdd.length) {
      setAddOpen(false);
      return;
    }
    update({ ...state, customItems: [...(state.customItems ?? []), ...toAdd] });
    toast.success(`تمت إضافة ${toAdd.length} عنصر`);
    setSelected(new Set());
    setSearch("");
    setAddOpen(false);
  };

  const displayItems = useMemo(() => {
    const builtIns = form.items
      .map((text, origIdx) => ({
        text: state.itemOverrides?.[origIdx] ?? text,
        origIdx,
        isCustom: false,
      }))
      .filter((x) => !(state.hiddenItems ?? []).includes(x.origIdx));
    const customs = (state.customItems ?? []).map((text, origIdx) => ({
      text,
      origIdx,
      isCustom: true,
    }));
    return [...builtIns, ...customs];
  }, [form.items, state.customItems, state.itemOverrides, state.hiddenItems]);

  const compactItems = (deletedDisplayIdx: number) => {
    const next: Record<number, ItemEval> = {};
    Object.entries(state.items).forEach(([k, v]) => {
      const idx = Number(k);
      if (idx === deletedDisplayIdx) return;
      next[idx > deletedDisplayIdx ? idx - 1 : idx] = v;
    });
    return next;
  };

  const editItem = (displayIdx: number, newText: string) => {
    const item = displayItems[displayIdx];
    if (!item) return;
    const trimmed = newText.trim();
    if (!trimmed) return;
    if (item.isCustom) {
      const customItems = [...(state.customItems ?? [])];
      customItems[item.origIdx] = trimmed;
      update({ ...state, customItems });
    } else {
      update({
        ...state,
        itemOverrides: { ...(state.itemOverrides ?? {}), [item.origIdx]: trimmed },
      });
    }
    toast.success("تم تعديل العنصر");
  };

  const deleteItem = (displayIdx: number) => {
    const item = displayItems[displayIdx];
    if (!item) return;
    const newItems = compactItems(displayIdx);
    if (item.isCustom) {
      const customItems = (state.customItems ?? []).filter((_, i) => i !== item.origIdx);
      update({ ...state, customItems, items: newItems });
    } else {
      update({
        ...state,
        hiddenItems: [...(state.hiddenItems ?? []), item.origIdx],
        items: newItems,
      });
    }
    toast.success("تم حذف العنصر");
  };

  const allDisplayItems = displayItems.map((x) => x.text);
  displayItemsRef.current = allDisplayItems;
  const doneCount = Object.values(state.items).filter((i) => i.status === "done").length;
  const pct = allDisplayItems.length ? Math.round((doneCount / allDisplayItems.length) * 100) : 0;

  return (
    <div className="min-h-screen pb-16" ref={pdfRef}>
      <Toaster richColors position="top-center" />
      <header className="border-b bg-card/70 backdrop-blur sticky top-0 z-10 print:hidden">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/" })}>
            <ArrowRight className="size-4 ml-1" /> الرجوع
          </Button>
          <div className="flex gap-2 flex-wrap items-center">
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="size-4 ml-1" /> إضافة عنصر
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="size-4 ml-1" /> طباعة
            </Button>
            <ExportButtons
              filename={form.title}
              getSheets={buildSheets}
              pdfTargetRef={pdfRef}
            />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 pt-8">
        <div
          className="form-banner relative rounded-2xl p-6 sm:p-8 text-primary-foreground shadow-[var(--shadow-elegant)]"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Button
            size="sm"
            onClick={() => {
              saveEval(form.id, state);
              toast.success("تم حفظ الاستمارة");
            }}
            className="absolute top-4 left-4 bg-white text-primary hover:bg-white/90 font-bold shadow-md print:hidden"
          >
            <Save className="size-4 ml-1" /> حفظ
          </Button>
          <Badge className="form-banner-badge bg-white/15 text-primary-foreground border-0 mb-3">استمارة متابعة</Badge>
          <h1 className="text-xl sm:text-2xl font-extrabold mb-4">{form.title}</h1>

          <div className="grid sm:grid-cols-2 gap-3 mb-5">
            <div>
              <label className="text-xs opacity-90 mb-1 block">اسم الموظفة</label>
              <Input
                value={state.employeeName}
                onChange={(e) => update({ ...state, employeeName: e.target.value })}
                placeholder="..."
                className="form-banner-input bg-white/15 border-white/20 text-primary-foreground placeholder:text-white/60"
              />
            </div>
            <div>
              <label className="text-xs opacity-90 mb-1 block">التاريخ</label>
              <Input
                type="date"
                value={state.date}
                onChange={(e) => update({ ...state, date: e.target.value })}
                className="form-banner-input bg-white/15 border-white/20 text-primary-foreground"
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-sm mb-2">
            <span>{doneCount} منجز من {allDisplayItems.length}</span>
            <span className="font-bold">{pct}%</span>
          </div>
          <div className="form-progress-track h-2 rounded-full bg-white/20 overflow-hidden">
            <div className="form-progress-bar h-full bg-white transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-6 space-y-3">
        {allDisplayItems.map((text, i) => {
          const cur = state.items[i] ?? { status: "pending" as ItemStatus, notes: "" };
          const isCustom = i >= form.items.length;
          const meta = STATUS.find((s) => s.value === cur.status) ?? STATUS[3];
          return (
            <Card
              key={i}
              className="relative p-4 sm:p-5 rounded-2xl border-border/60 overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5"
              style={{
                background:
                  "linear-gradient(180deg, color-mix(in oklab, var(--card) 92%, transparent), var(--card))",
              }}
            >
              {/* status accent bar (right side because RTL) */}
              <span
                className="absolute top-0 right-0 h-full w-1.5 transition-colors"
                style={{ background: meta.accent }}
                aria-hidden
              />
              {/* soft glow */}
              <span
                className="pointer-events-none absolute -top-12 -left-12 size-32 rounded-full opacity-15 blur-2xl"
                style={{ background: meta.accent }}
                aria-hidden
              />

              <div className="relative flex gap-3 items-start mb-4">
                <div
                  className={`size-9 shrink-0 rounded-xl flex items-center justify-center font-bold text-sm text-primary-foreground shadow-md ring-2 ${meta.ring}`}
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {i + 1}
                </div>
                {editIdx === i ? (
                  <div className="flex-1 flex gap-2 items-start">
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={2}
                      className="text-sm flex-1"
                      autoFocus
                    />
                    <div className="flex flex-col gap-1">
                      <Button
                        size="icon"
                        className="size-7"
                        onClick={() => {
                          editItem(i, editText);
                          setEditIdx(null);
                        }}
                      >
                        <Check className="size-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-7"
                        onClick={() => setEditIdx(null)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm sm:text-base font-medium leading-relaxed flex-1 pt-1">
                    {text}
                  </p>
                )}
                {isCustom && editIdx !== i && (
                  <Badge variant="outline" className="text-[10px] print:hidden border-primary/40 text-primary">
                    مضاف
                  </Badge>
                )}
                {editIdx !== i && (
                  <div className="flex gap-1 print:hidden">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-primary hover:bg-primary/10"
                      onClick={() => {
                        setEditIdx(i);
                        setEditText(text);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive hover:bg-destructive/10"
                      onClick={() => deleteItem(i)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="relative flex flex-wrap gap-2 mb-3 print:hidden">
                {STATUS.map((s) => {
                  const on = cur.status === s.value;
                  const Icon = s.icon;
                  return (
                    <button
                      key={s.value}
                      data-on={on}
                      onClick={() => setStatus(i, s.value)}
                      className={`inline-flex items-center gap-1.5 text-xs sm:text-sm px-3 py-1.5 rounded-full border-2 border-border bg-card hover:border-primary/40 hover:bg-secondary/60 transition-all ${s.cls}`}
                    >
                      <Icon className="size-3.5" />
                      {s.label}
                    </button>
                  );
                })}
              </div>

              <div className="hidden print:block text-sm mb-2">
                الحالة: {meta.label}
              </div>

              <Textarea
                value={cur.notes}
                onChange={(e) => setNotes(i, e.target.value)}
                placeholder="ملاحظات..."
                rows={2}
                className="text-sm bg-background/70 border-border/70 focus-visible:ring-primary/40 rounded-xl"
              />
            </Card>
          );
        })}
      </div>

      <div className="container mx-auto px-4 mt-8 space-y-4">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <CheckCircle2 className="size-5 text-primary" />
          متابعة المسؤول
        </h2>
        {([
          { key: "followup1" as const, title: "المتابعة الأولى" },
          { key: "followup2" as const, title: "المتابعة الثانية" },
        ]).map(({ key, title }) => {
          const fu = state[key] ?? emptyFollowup();
          const setFu = (patch: Partial<Followup>) =>
            update({ ...state, [key]: { ...fu, ...patch } });
          return (
            <Card key={key} className="p-4 sm:p-5 border-border/60">
              <div className="flex items-center gap-2 mb-4">
                <Badge className="bg-primary/10 text-primary border-0">{title}</Badge>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">اليوم</label>
                  <Input value={fu.day} onChange={(e) => setFu({ day: e.target.value })} placeholder="مثال: الأحد" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">التاريخ</label>
                  <Input type="date" value={fu.date} onChange={(e) => setFu({ date: e.target.value })} />
                </div>
              </div>
              <div className="mb-3">
                <label className="text-xs text-muted-foreground mb-1 block">التوصيات</label>
                <Textarea value={fu.recommendations} onChange={(e) => setFu({ recommendations: e.target.value })} rows={3} placeholder="اكتب التوصيات..." />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">اسم المتابع</label>
                  <Input value={fu.reviewerName} onChange={(e) => setFu({ reviewerName: e.target.value })} placeholder="..." />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">التوقيع</label>
                  <Input value={fu.signature} onChange={(e) => setFu({ signature: e.target.value })} placeholder="..." />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="container mx-auto px-4 mt-8 flex flex-wrap justify-center gap-3 print:hidden">
        <Button
          size="lg"
          className="min-w-40"
          onClick={() => {
            saveEval(form.id, state);
            toast.success("تم حفظ الاستمارة بنجاح");
          }}
        >
          <Save className="size-4 ml-1" /> حفظ الاستمارة
        </Button>
        <Button size="lg" variant="outline" onClick={() => window.print()}>
          <Printer className="size-4 ml-1" /> طباعة
        </Button>
        <Button
          size="lg"
          variant="secondary"
          onClick={() => {
            document.body.classList.add("print-summary");
            const cleanup = () => {
              document.body.classList.remove("print-summary");
              window.removeEventListener("afterprint", cleanup);
            };
            window.addEventListener("afterprint", cleanup);
            setTimeout(() => window.print(), 50);
          }}
        >
          <Printer className="size-4 ml-1" /> طباعة ملخّصة (صفحة واحدة)
        </Button>
        <Button
          size="lg"
          variant="default"
          className="bg-gradient-to-l from-primary to-primary/80"
          onClick={() => setSummaryOpen(true)}
        >
          <FileText className="size-4 ml-1" /> ملخص
        </Button>
      </div>

      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center gap-2">
              <FileText className="size-5 text-primary" />
              ملخص الاستمارة
            </DialogTitle>
            <DialogDescription>{form.title}</DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div id="summary-print-area" className="space-y-5 py-2">
              {/* Header info */}
              <div
                className="rounded-2xl p-5 text-primary-foreground shadow-md"
                style={{ background: "var(--gradient-primary)" }}
              >
                <h2 className="text-lg font-extrabold mb-3">{form.title}</h2>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="bg-white/15 rounded-lg px-3 py-2">
                    <span className="opacity-80 text-xs block mb-0.5">اسم الموظفة</span>
                    <span className="font-bold">{state.employeeName || "—"}</span>
                  </div>
                  <div className="bg-white/15 rounded-lg px-3 py-2">
                    <span className="opacity-80 text-xs block mb-0.5">التاريخ</span>
                    <span className="font-bold">{state.date || "—"}</span>
                  </div>
                </div>
              </div>

              {/* Stats cards */}
              {(() => {
                const counts = { done: 0, partial: 0, not_done: 0, pending: 0 };
                allDisplayItems.forEach((_, i) => {
                  const s = state.items[i]?.status ?? "pending";
                  counts[s]++;
                });
                const cards = [
                  { label: "منجز", value: counts.done, color: "var(--success)" },
                  { label: "جزئي", value: counts.partial, color: "var(--warning)" },
                  { label: "غير منجز", value: counts.not_done, color: "var(--destructive)" },
                  { label: "لاحقاً", value: counts.pending, color: "var(--muted-foreground)" },
                ];
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {cards.map((c) => (
                      <div
                        key={c.label}
                        className="rounded-xl border p-3 text-center bg-card"
                        style={{ borderColor: c.color }}
                      >
                        <div className="text-2xl font-extrabold" style={{ color: c.color }}>
                          {c.value}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">{c.label}</div>
                      </div>
                    ))}
                    <div className="rounded-xl border-2 border-primary p-3 text-center bg-primary/5 col-span-2 sm:col-span-4">
                      <div className="text-sm text-muted-foreground">نسبة الإنجاز</div>
                      <div className="text-3xl font-extrabold text-primary">{pct}%</div>
                      <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Items table */}
              <div className="rounded-xl border overflow-hidden">
                <div className="bg-primary text-primary-foreground px-4 py-2 font-bold text-sm">
                  بنود الاستمارة
                </div>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead className="text-right">البند</TableHead>
                      <TableHead className="w-28 text-center">الحالة</TableHead>
                      <TableHead className="text-right">ملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allDisplayItems.map((text, i) => {
                      const ev = state.items[i] ?? { status: "pending" as ItemStatus, notes: "" };
                      const meta = STATUS.find((s) => s.value === ev.status) ?? STATUS[3];
                      return (
                        <TableRow key={i}>
                          <TableCell className="text-center font-bold text-muted-foreground">
                            {i + 1}
                          </TableCell>
                          <TableCell className="text-right text-sm">{text}</TableCell>
                          <TableCell className="text-center">
                            <span
                              className="inline-block text-xs font-bold px-2 py-1 rounded-full text-white"
                              style={{ background: meta.accent }}
                            >
                              {meta.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-xs text-muted-foreground">
                            {ev.notes || "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Followups */}
              {([
                { fu: state.followup1, title: "المتابعة الأولى" },
                { fu: state.followup2, title: "المتابعة الثانية" },
              ] as const).map(({ fu, title }, idx) => {
                const f = fu ?? emptyFollowup();
                const hasContent = f.day || f.date || f.recommendations || f.reviewerName || f.signature;
                if (!hasContent) return null;
                return (
                  <div key={idx} className="rounded-xl border overflow-hidden">
                    <div className="bg-secondary text-secondary-foreground px-4 py-2 font-bold text-sm">
                      {title}
                    </div>
                    <Table>
                      <TableBody>
                        <TableRow>
                          <TableHead className="w-32 text-right bg-muted/30">اليوم</TableHead>
                          <TableCell>{f.day || "—"}</TableCell>
                          <TableHead className="w-32 text-right bg-muted/30">التاريخ</TableHead>
                          <TableCell>{f.date || "—"}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableHead className="text-right bg-muted/30">التوصيات</TableHead>
                          <TableCell colSpan={3} className="whitespace-pre-wrap">{f.recommendations || "—"}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableHead className="text-right bg-muted/30">اسم المتابع</TableHead>
                          <TableCell>{f.reviewerName || "—"}</TableCell>
                          <TableHead className="text-right bg-muted/30">التوقيع</TableHead>
                          <TableCell>{f.signature || "—"}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSummaryOpen(false)}>إغلاق</Button>
            <Button
              onClick={() => {
                const area = document.getElementById("summary-print-area");
                // A4 portrait minus 8mm margins, at 96dpi ≈ 1093px usable height, 714px width
                const MAX_H = 1080;
                const MAX_W = 714;
                let scale = 1;
                if (area) {
                  // Reset any previous scale
                  document.body.style.setProperty("--summary-fit-scale", "1");
                  const naturalH = area.scrollHeight;
                  const naturalW = area.scrollWidth;
                  const sH = MAX_H / naturalH;
                  const sW = MAX_W / naturalW;
                  scale = Math.min(1, sH, sW);
                  if (scale < 0.4) scale = 0.4;
                  document.body.style.setProperty("--summary-fit-scale", String(scale));
                }
                document.body.classList.add("print-summary-only", "print-summary-fit");
                const cleanup = () => {
                  document.body.classList.remove("print-summary-only", "print-summary-fit");
                  document.body.style.removeProperty("--summary-fit-scale");
                  window.removeEventListener("afterprint", cleanup);
                };
                window.addEventListener("afterprint", cleanup);
                setTimeout(() => window.print(), 80);
              }}
            >
              <Printer className="size-4 ml-1" /> طباعة الملخص
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>إضافة عناصر للاستمارة</DialogTitle>
            <DialogDescription>
              اختر من جميع عناصر التقويم في الاستمارات الأخرى لإضافتها لهذه الاستمارة.
            </DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث عن عنصر..."
              className="pr-9"
            />
          </div>

          <ScrollArea className="h-[50vh] border rounded-md p-2">
            {filtered.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-10">لا توجد عناصر متاحة</p>
            ) : (
              <div className="space-y-1">
                {filtered.map((it) => {
                  const checked = selected.has(it.text);
                  return (
                    <label
                      key={it.text}
                      className="flex items-start gap-3 p-2 rounded-md hover:bg-secondary cursor-pointer"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          const next = new Set(selected);
                          if (v) next.add(it.text);
                          else next.delete(it.text);
                          setSelected(next);
                        }}
                      />
                      <div className="flex-1">
                        <p className="text-sm leading-relaxed">{it.text}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">من: {it.from}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>إلغاء</Button>
            <Button onClick={addSelected} disabled={selected.size === 0}>
              <Plus className="size-4 ml-1" /> إضافة ({selected.size})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
