import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { getForm, forms } from "@/data/forms";
import { type FormEval, type ItemStatus, type Followup, loadEval, saveEval, clearEval, emptyFollowup } from "@/lib/storage";
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
} from "lucide-react";
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

const STATUS: { value: ItemStatus; label: string; icon: typeof CheckCircle2; cls: string }[] = [
  { value: "done", label: "منجز", icon: CheckCircle2, cls: "data-[on=true]:bg-success data-[on=true]:text-success-foreground" },
  { value: "partial", label: "جزئي", icon: MinusCircle, cls: "data-[on=true]:bg-warning data-[on=true]:text-warning-foreground" },
  { value: "not_done", label: "غير منجز", icon: XCircle, cls: "data-[on=true]:bg-destructive data-[on=true]:text-destructive-foreground" },
  { value: "pending", label: "لاحقاً", icon: Circle, cls: "data-[on=true]:bg-muted data-[on=true]:text-foreground" },
];

function FormPage() {
  const { form } = Route.useLoaderData() as { form: import("@/data/forms").SchoolForm };
  const navigate = useNavigate();
  const [state, setState] = useState<FormEval>({ employeeName: "", date: "", items: {}, customItems: [] });
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    setState(loadEval(form.id));
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

  const removeCustom = (text: string) => {
    const customItems = (state.customItems ?? []).filter((x) => x !== text);
    update({ ...state, customItems });
  };

  const allDisplayItems = [...form.items, ...(state.customItems ?? [])];
  const doneCount = Object.values(state.items).filter((i) => i.status === "done").length;
  const pct = allDisplayItems.length ? Math.round((doneCount / allDisplayItems.length) * 100) : 0;

  return (
    <div className="min-h-screen pb-16">
      <Toaster richColors position="top-center" />
      <header className="border-b bg-card/70 backdrop-blur sticky top-0 z-10 print:hidden">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/" })}>
            <ArrowRight className="size-4 ml-1" /> الرجوع
          </Button>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
              <Plus className="size-4 ml-1" /> إضافة عنصر
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="size-4 ml-1" /> طباعة
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm("هل أنت متأكد من تفريغ الاستمارة؟")) {
                  clearEval(form.id);
                  setState({ employeeName: "", date: "", items: {}, customItems: [] });
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
        <div
          className="rounded-2xl p-6 sm:p-8 text-primary-foreground shadow-[var(--shadow-elegant)]"
          style={{ background: "var(--gradient-primary)" }}
        >
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
            <span>{doneCount} منجز من {allDisplayItems.length}</span>
            <span className="font-bold">{pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-white/20 overflow-hidden">
            <div className="h-full bg-white transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-6 space-y-3">
        {allDisplayItems.map((text, i) => {
          const cur = state.items[i] ?? { status: "pending" as ItemStatus, notes: "" };
          const isCustom = i >= form.items.length;
          return (
            <Card key={i} className="p-4 sm:p-5 border-border/60">
              <div className="flex gap-3 items-start mb-3">
                <div className="size-8 shrink-0 rounded-lg bg-secondary text-secondary-foreground flex items-center justify-center font-bold text-sm">
                  {i + 1}
                </div>
                <p className="text-sm sm:text-base font-medium leading-relaxed flex-1">{text}</p>
                {isCustom && (
                  <>
                    <Badge variant="outline" className="text-[10px] print:hidden">مضاف</Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7 text-destructive print:hidden"
                      onClick={() => removeCustom(text)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-3 print:hidden">
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

              <div className="hidden print:block text-sm mb-2">
                الحالة: {STATUS.find((s) => s.value === cur.status)?.label ?? "—"}
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
      </div>

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
