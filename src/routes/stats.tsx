import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { forms } from "@/data/forms";
import { loadEval } from "@/lib/storage";
import { Card } from "@/components/ui/card";
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
import { BarChart3, CheckCircle2, XCircle, ListChecks } from "lucide-react";

export const Route = createFileRoute("/stats")({
  component: StatsPage,
  head: () => ({
    meta: [{ title: "الإحصائيات والرسوم البيانية" }],
  }),
});

function StatsPage() {
  const [, setTick] = useState(0);
  useEffect(() => setTick((t) => t + 1), []);

  const data = useMemo(() => {
    return forms.map((f, i) => {
      const ev = loadEval(f.id);
      const total = f.items.length + (ev.customItems?.length ?? 0);
      const items = Object.values(ev.items);
      const done = items.filter((it) => it.status === "done").length;
      const partial = items.filter((it) => it.status === "partial").length;
      const notDone = items.filter((it) => it.status === "not_done").length;
      const pending = total - done - partial - notDone;
      return {
        idx: i + 1,
        name: `#${i + 1}`,
        title: f.title,
        total,
        done,
        partial,
        notDone,
        pending: Math.max(0, pending),
      };
    });
  }, []);

  const totals = useMemo(() => {
    const acc = data.reduce(
      (s, d) => ({
        total: s.total + d.total,
        done: s.done + d.done,
        partial: s.partial + d.partial,
        notDone: s.notDone + d.notDone,
        pending: s.pending + d.pending,
      }),
      { total: 0, done: 0, partial: 0, notDone: 0, pending: 0 }
    );
    return acc;
  }, [data]);

  const pieData = [
    { name: "منجز", value: totals.done, color: "hsl(var(--success, 142 70% 45%))" },
    { name: "جزئي", value: totals.partial, color: "hsl(var(--warning, 38 95% 55%))" },
    { name: "غير منجز", value: totals.notDone, color: "hsl(var(--destructive))" },
    { name: "لاحقاً", value: totals.pending, color: "hsl(var(--muted-foreground))" },
  ].filter((p) => p.value > 0);

  return (
    <div className="min-h-screen pb-12">
      <header className="border-b bg-card/60 backdrop-blur">
        <div className="container mx-auto px-4 py-5 flex items-center gap-3">
          <div
            className="size-11 rounded-xl flex items-center justify-center text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            <BarChart3 className="size-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold leading-tight">الإحصائيات والرسوم البيانية</h1>
            <p className="text-xs text-muted-foreground">مقارنة الإنجاز بين جميع الاستمارات</p>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 pt-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryCard label="عناصر التقويم" value={totals.total} icon={ListChecks} tone="primary" />
          <SummaryCard label="منجز" value={totals.done} icon={CheckCircle2} tone="success" />
          <SummaryCard label="غير منجز" value={totals.notDone} icon={XCircle} tone="destructive" />
          <SummaryCard label="عدد الاستمارات" value={forms.length} icon={BarChart3} tone="muted" />
        </div>
      </section>

      <section className="container mx-auto px-4 mt-8 grid lg:grid-cols-3 gap-5">
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-bold mb-1">الإنجاز لكل استمارة</h3>
          <p className="text-xs text-muted-foreground mb-4">منجز / جزئي / غير منجز / لاحقاً</p>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(label, p) => p?.[0]?.payload?.title ?? label}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="done" name="منجز" stackId="a" fill="hsl(142 70% 45%)" />
                <Bar dataKey="partial" name="جزئي" stackId="a" fill="hsl(38 95% 55%)" />
                <Bar dataKey="notDone" name="غير منجز" stackId="a" fill="hsl(0 75% 55%)" />
                <Bar dataKey="pending" name="لاحقاً" stackId="a" fill="hsl(var(--muted-foreground))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold mb-1">التوزيع الإجمالي</h3>
          <p className="text-xs text-muted-foreground mb-4">نسبة الحالات في كل الاستمارات</p>
          <div className="h-80">
            {pieData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                لا توجد بيانات بعد
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={100} label>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        <Card className="p-5 lg:col-span-3">
          <h3 className="font-bold mb-1">عدد العناصر في كل استمارة</h3>
          <p className="text-xs text-muted-foreground mb-4">إجمالي عناصر التقويم</p>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelFormatter={(label, p) => p?.[0]?.payload?.title ?? label}
                />
                <Bar dataKey="total" name="عدد العناصر" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 lg:col-span-3 overflow-x-auto">
          <h3 className="font-bold mb-3">جدول مفصل</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-right border-b">
                <th className="py-2 px-2">#</th>
                <th className="py-2 px-2">الاستمارة</th>
                <th className="py-2 px-2">العناصر</th>
                <th className="py-2 px-2 text-success">منجز</th>
                <th className="py-2 px-2">جزئي</th>
                <th className="py-2 px-2 text-destructive">غير منجز</th>
                <th className="py-2 px-2">النسبة</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.idx} className="border-b border-border/50 hover:bg-secondary/40">
                  <td className="py-2 px-2 font-mono text-muted-foreground">{d.idx}</td>
                  <td className="py-2 px-2">{d.title}</td>
                  <td className="py-2 px-2">{d.total}</td>
                  <td className="py-2 px-2 text-success font-semibold">{d.done}</td>
                  <td className="py-2 px-2">{d.partial}</td>
                  <td className="py-2 px-2 text-destructive">{d.notDone}</td>
                  <td className="py-2 px-2 font-bold">
                    {d.total ? Math.round((d.done / d.total) * 100) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
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
