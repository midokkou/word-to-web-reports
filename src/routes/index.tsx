import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { forms } from "@/data/forms";
import { getProgress, getFillStatus } from "@/lib/storage";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ClipboardCheck, Search, ArrowLeft, FileText, Sparkles } from "lucide-react";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "نظام التقارير المدرسية" },
      { name: "description", content: "استمارات متابعة منسوبات المدرسة - نظام رقمي لإدارة وتعبئة التقارير" },
    ],
  }),
});

function Index() {
  const [q, setQ] = useState("");
  const [, setTick] = useState(0);

  useEffect(() => {
    setTick((t) => t + 1);
  }, []);

  const filtered = useMemo(
    () => forms.filter((f) => f.title.includes(q.trim())),
    [q]
  );

  const totals = useMemo(() => {
    const totalItems = forms.reduce((s, f) => s + f.items.length, 0);
    const totalDone = forms.reduce(
      (s, f) => s + getProgress(f.id, f.items.length).done,
      0
    );
    return { totalItems, totalDone, formsCount: forms.length };
  }, []);

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card/60 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="size-11 rounded-xl flex items-center justify-center text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
              <ClipboardCheck className="size-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold leading-tight">نظام التقارير المدرسية</h1>
              <p className="text-xs text-muted-foreground">متابعة ملف منسوبات المدرسة</p>
            </div>
          </div>
          <ThemeSwitcher />
        </div>
      </header>

      <section className="container mx-auto px-4 pt-10 pb-6">
        <div className="rounded-2xl p-6 sm:p-10 text-primary-foreground shadow-[var(--shadow-elegant)]" style={{ background: "var(--gradient-primary)" }}>
          
          <h2 className="text-2xl sm:text-3xl font-extrabold mb-3">استمارات متابعة المهام</h2>
          <p className="opacity-90 max-w-2xl">منصة موحّدة لتعبئة ومتابعة جميع استمارات منسوبات المدرسة بطريقة رقمية وسلسة.</p>

          <div className="grid grid-cols-3 gap-3 sm:gap-6 mt-6">
            <Stat label="استمارة" value={totals.formsCount} />
            <Stat label="عنصر تقويم" value={totals.totalItems} />
            <Stat label="منجز" value={totals.totalDone} />
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 pb-12">
        <div className="relative max-w-md mb-6">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="ابحث عن استمارة..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pr-9 bg-card"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((f, idx) => {
            const p = getProgress(f.id, f.items.length);
            const status = getFillStatus(f.id, f.items.length);
            const isComplete = status === "complete";
            const dot =
              status === "complete"
                ? { cls: "bg-success ring-success/30", label: "مكتمل" }
                : status === "partial"
                ? { cls: "bg-warning ring-warning/30", label: "قيد التعبئة" }
                : { cls: "bg-destructive ring-destructive/30", label: "غير معبّأ" };
            return (
              <Link
                key={f.id}
                to="/forms/$formId"
                params={{ formId: f.id }}
                className="group relative block"
              >
                {/* status dot — outside marker */}
                <span
                  title={dot.label}
                  className={`absolute -top-2 -left-2 z-20 size-4 rounded-full ring-4 ${dot.cls} shadow-md`}
                  aria-label={dot.label}
                />
                {/* gradient border wrapper */}
                <div
                  className="absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-sm"
                  style={{ background: "var(--gradient-primary)" }}
                  aria-hidden
                />
                <Card
                  className="relative p-5 h-full rounded-2xl border-border/60 overflow-hidden transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-glow)]"
                  style={{ background: "var(--gradient-card)" }}
                >
                  {/* decorative corner glow */}
                  <div
                    className="absolute -top-12 -left-12 size-32 rounded-full opacity-20 blur-2xl"
                    style={{ background: "var(--gradient-primary)" }}
                    aria-hidden
                  />

                  <div className="relative flex items-start justify-between gap-3 mb-4">
                    <div
                      className="size-11 rounded-xl flex items-center justify-center text-primary-foreground shadow-md shrink-0"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      <FileText className="size-5" />
                    </div>
                    <div className="flex items-center gap-2">
                      {isComplete && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full bg-success/15 text-success">
                          <Sparkles className="size-3" />
                          مكتمل
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-muted-foreground bg-background/60 backdrop-blur px-2 py-1 rounded-md border border-border/60">
                        #{String(idx + 1).padStart(2, "0")}
                      </span>
                    </div>
                  </div>

                  <h3 className="relative font-bold text-base leading-snug mb-4 line-clamp-2 min-h-[2.75rem] group-hover:text-primary transition-colors">
                    {f.title}
                  </h3>

                  <div className="relative flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span>{p.done} / {p.total} عنصر منجز</span>
                    <span className="font-bold text-base text-foreground">{p.pct}%</span>
                  </div>
                  <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full transition-all duration-500 rounded-full"
                      style={{ width: `${p.pct}%`, background: "var(--gradient-primary)" }}
                    />
                  </div>

                  <div className="relative flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                    <span className="text-xs font-medium text-muted-foreground">فتح الاستمارة</span>
                    <ArrowLeft className="size-4 text-primary group-hover:-translate-x-1 transition-transform" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-12">لا توجد استمارات مطابقة.</p>
        )}
      </section>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        © نظام التقارير المدرسية — إعداد مشرفات الإدارة
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur p-3 sm:p-4 text-center">
      <div className="text-2xl sm:text-3xl font-extrabold">{value}</div>
      <div className="text-xs sm:text-sm opacity-90 mt-1">{label}</div>
    </div>
  );
}
