import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { BarChart3, ListChecks, Printer, Loader2, CalendarDays, CalendarRange, CalendarCheck } from "lucide-react";

export const Route = createFileRoute("/stats/tasks")({
  component: TaskStatsPage,
  head: () => ({ meta: [{ title: "إحصاءات المهام" }] }),
});

const PERIODS = [
  { key: "daily", label: "يومية", icon: CalendarDays },
  { key: "weekly", label: "أسبوعية", icon: CalendarRange },
  { key: "monthly", label: "شهرية", icon: CalendarCheck },
] as const;

type Row = { period: string; total: number; done: number; notDone: number; pending: number };

function TaskStatsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const out: Row[] = [];
      for (const p of PERIODS) {
        const { data } = await supabase
          .from("form_records")
          .select("data")
          .eq("form_id", `tasks-${p.key}`);
        let done = 0, notDone = 0, pending = 0;
        const list = data ?? [];
        for (const r of list) {
          const d = (r.data ?? {}) as { done?: string; notDone?: string };
          const hasDone = !!(d.done && d.done.trim());
          const hasNot = !!(d.notDone && d.notDone.trim());
          if (hasDone && !hasNot) done++;
          else if (hasNot && !hasDone) notDone++;
          else if (hasDone && hasNot) done++;
          else pending++;
        }
        out.push({ period: p.label, total: list.length, done, notDone, pending });
      }
      setRows(out);
      setLoading(false);
    })();
  }, []);

  const totals = useMemo(
    () =>
      rows.reduce(
        (s, r) => ({
          total: s.total + r.total,
          done: s.done + r.done,
          notDone: s.notDone + r.notDone,
          pending: s.pending + r.pending,
        }),
        { total: 0, done: 0, notDone: 0, pending: 0 },
      ),
    [rows],
  );

  const pieData = [
    { name: "منجز", value: totals.done, color: "hsl(142 70% 45%)" },
    { name: "غير منجز", value: totals.notDone, color: "hsl(0 75% 55%)" },
    { name: "قيد الإنجاز", value: totals.pending, color: "hsl(var(--muted-foreground))" },
  ].filter((p) => p.value > 0);

  return (
    <div className="min-h-screen pb-12">
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="container mx-auto px-4 py-5 flex items-center gap-3">
          <div
            className="size-11 rounded-xl flex items-center justify-center text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            <ListChecks className="size-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold leading-tight">إحصاءات المهام</h1>
            <p className="text-xs text-muted-foreground">المهام اليومية والأسبوعية والشهرية</p>
          </div>
          <Button size="sm" variant="outline" onClick={() => window.print()} className="print:hidden">
            <Printer className="size-4 ml-1" /> طباعة
          </Button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin ml-2" /> جارٍ التحميل...
        </div>
      ) : (
        <section className="container mx-auto px-4 pt-8 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard label="إجمالي المهام" value={totals.total} icon={BarChart3} tone="primary" />
            <SummaryCard label="منجز" value={totals.done} icon={ListChecks} tone="success" />
            <SummaryCard label="غير منجز" value={totals.notDone} icon={ListChecks} tone="destructive" />
            <SummaryCard label="قيد الإنجاز" value={totals.pending} icon={ListChecks} tone="muted" />
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            <Card className="p-5 lg:col-span-2">
              <h3 className="font-bold mb-1">المهام حسب الفترة</h3>
              <p className="text-xs text-muted-foreground mb-4">منجز / غير منجز / قيد الإنجاز</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rows}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="done" name="منجز" stackId="a" fill="hsl(142 70% 45%)" />
                    <Bar dataKey="notDone" name="غير منجز" stackId="a" fill="hsl(0 75% 55%)" />
                    <Bar dataKey="pending" name="قيد الإنجاز" stackId="a" fill="hsl(var(--muted-foreground))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="font-bold mb-1">التوزيع الإجمالي</h3>
              <p className="text-xs text-muted-foreground mb-4">نسبة الحالات</p>
              <div className="h-72">
                {pieData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    لا توجد بيانات بعد
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={90} label>
                        {pieData.map((e, i) => (
                          <Cell key={i} fill={e.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>
        </section>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof BarChart3;
  tone: "primary" | "success" | "destructive" | "muted";
}) {
  const toneCls = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    destructive: "bg-destructive/10 text-destructive",
    muted: "bg-secondary text-foreground",
  }[tone];
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className={`size-11 rounded-xl flex items-center justify-center ${toneCls}`}>
        <Icon className="size-5" />
      </div>
      <div>
        <div className="text-2xl font-extrabold leading-none">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </div>
    </Card>
  );
}
