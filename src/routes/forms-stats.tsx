import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { forms } from "@/data/forms";
import { Button } from "@/components/ui/button";
import { BarChart3, Printer } from "lucide-react";

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

  const openAndPrint = (id: string) => {
    window.open(`/forms/${id}`, "_blank", "noopener");
  };

  return (
    <div className="min-h-screen pb-12">
      <header className="border-b bg-card/60 backdrop-blur print:hidden">
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
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-4 ml-1" /> طباعة الكل
          </Button>
        </div>
      </header>

      <section className="container mx-auto px-4 pt-6">
        {loading ? (
          <div className="text-center text-muted-foreground py-12">جاري التحميل…</div>
        ) : (
          <div className="rounded-xl border overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-xs">
                <tr className="border-b">
                  <th className="p-2 text-right w-10">#</th>
                  <th className="p-2 text-right">الاستمارة</th>
                  <th className="p-2 text-center w-16">السجلات</th>
                  <th className="p-2 text-center w-16">العناصر</th>
                  <th className="p-2 text-center w-16 text-success">منجز</th>
                  <th className="p-2 text-center w-16 text-warning">جزئي</th>
                  <th className="p-2 text-center w-16 text-destructive">غير منجز</th>
                  <th className="p-2 text-center w-16">لاحقاً</th>
                  <th className="p-2 text-center w-16">%</th>
                  <th className="p-2 text-center w-20 print:hidden">طباعة</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const pct = r.totalItems ? Math.round((r.done / r.totalItems) * 100) : 0;
                  return (
                    <tr key={r.id} className="border-b last:border-0 hover:bg-secondary/30">
                      <td className="p-2 text-xs text-muted-foreground font-bold">{i + 1}</td>
                      <td className="p-2 font-medium leading-snug">{r.title}</td>
                      <td className="p-2 text-center font-bold">{r.records}</td>
                      <td className="p-2 text-center">{r.totalItems}</td>
                      <td className="p-2 text-center font-bold text-success">{r.done}</td>
                      <td className="p-2 text-center font-bold text-warning">{r.partial}</td>
                      <td className="p-2 text-center font-bold text-destructive">{r.notDone}</td>
                      <td className="p-2 text-center text-muted-foreground">{r.pending}</td>
                      <td className="p-2 text-center font-extrabold">{pct}%</td>
                      <td className="p-2 text-center print:hidden">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-primary hover:bg-primary/10"
                          onClick={() => openAndPrint(r.id)}
                          title="فتح الاستمارة للطباعة"
                        >
                          <Printer className="size-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
