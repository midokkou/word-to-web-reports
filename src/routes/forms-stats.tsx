import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { forms } from "@/data/forms";
import { Card } from "@/components/ui/card";
import { BarChart3, CheckCircle2, XCircle, Clock, ListChecks, FileText } from "lucide-react";

export const Route = createFileRoute("/forms-stats")({
  component: FormsStatsPage,
  head: () => ({ meta: [{ title: "احصائيات الاستمارات" }] }),
});

type FormStat = {
  id: string;
  title: string;
  records: number;
  totalItems: number;
  done: number;
  partial: number;
  notDone: number;
  pending: number;
};

type ItemEntry = { status?: string };
type RecordData = {
  items?: Record<string, ItemEntry>;
  customItems?: unknown[];
  hiddenItems?: (string | number)[];
};

function FormsStatsPage() {
  const [rows, setRows] = useState<FormStat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const out: FormStat[] = [];
      for (const f of forms) {
        const { data } = await supabase
          .from("form_records")
          .select("data")
          .eq("form_id", f.id);

        let done = 0, partial = 0, notDone = 0, pending = 0, totalItems = 0;
        const records = (data ?? []) as { data: RecordData }[];
        for (const r of records) {
          const d = r.data ?? {};
          const hidden = new Set((d.hiddenItems ?? []).map(String));
          const baseCount = f.items.filter((_, i) => !hidden.has(String(i))).length;
          const customCount = (d.customItems?.length ?? 0);
          const total = baseCount + customCount;
          totalItems += total;
          const items = Object.values(d.items ?? {});
          let dn = 0, pa = 0, nd = 0;
          for (const it of items) {
            if (it?.status === "done") dn++;
            else if (it?.status === "partial") pa++;
            else if (it?.status === "not_done" || it?.status === "notDone") nd++;
          }
          done += dn; partial += pa; notDone += nd;
          pending += Math.max(0, total - dn - pa - nd);
        }
        out.push({
          id: f.id,
          title: f.title,
          records: records.length,
          totalItems,
          done, partial, notDone, pending,
        });
      }
      setRows(out);
      setLoading(false);
    })();
  }, []);

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
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-xl font-bold leading-tight">احصائيات الاستمارات</h1>
            <p className="text-xs text-muted-foreground">إحصائية كل استمارة على حدة بالأرقام</p>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 pt-6">
        {loading ? (
          <div className="text-center text-muted-foreground py-12">جاري التحميل…</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {rows.map((r, i) => {
              const pct = r.totalItems ? Math.round((r.done / r.totalItems) * 100) : 0;
              return (
                <Card key={r.id} className="p-4">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-sm leading-tight">{r.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        نسبة الإنجاز: <span className="font-bold text-foreground">{pct}%</span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <StatCell icon={FileText} label="عدد السجلات" value={r.records} tone="primary" />
                    <StatCell icon={ListChecks} label="إجمالي العناصر" value={r.totalItems} tone="muted" />
                    <StatCell icon={CheckCircle2} label="منجز" value={r.done} tone="success" />
                    <StatCell icon={Clock} label="جزئي" value={r.partial} tone="warning" />
                    <StatCell icon={XCircle} label="غير منجز" value={r.notDone} tone="destructive" />
                    <StatCell icon={Clock} label="لاحقاً" value={r.pending} tone="muted" />
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

function StatCell({
  icon: Icon, label, value, tone,
}: {
  icon: typeof BarChart3;
  label: string;
  value: number;
  tone: "primary" | "success" | "destructive" | "warning" | "muted";
}) {
  const toneCls = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-warning/15 text-warning",
    muted: "bg-secondary text-foreground",
  }[tone];
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card p-2">
      <div className={`size-8 rounded-md flex items-center justify-center ${toneCls}`}>
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <div className="text-base font-extrabold leading-none">{value}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5 truncate">{label}</div>
      </div>
    </div>
  );
}
