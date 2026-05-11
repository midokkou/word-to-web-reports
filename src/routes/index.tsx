import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { forms } from "@/data/forms";
import { getProgress } from "@/lib/storage";
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

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((f) => {
            const p = getProgress(f.id, f.items.length);
            return (
              <Link
                key={f.id}
                to="/forms/$formId"
                params={{ formId: f.id }}
                className="group"
              >
                <Card className="p-5 h-full transition-all hover:shadow-[var(--shadow-elegant)] hover:-translate-y-0.5 border-border/60">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="size-10 rounded-lg bg-accent text-accent-foreground flex items-center justify-center shrink-0">
                      <FileText className="size-5" />
                    </div>
                    <ArrowLeft className="size-4 text-muted-foreground group-hover:text-primary group-hover:-translate-x-1 transition-all" />
                  </div>
                  <h3 className="font-bold text-base leading-snug mb-3 line-clamp-2">{f.title}</h3>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span>{p.done} / {p.total} منجز</span>
                    <span className="font-semibold text-foreground">{p.pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{ width: `${p.pct}%`, background: "var(--gradient-primary)" }}
                    />
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
