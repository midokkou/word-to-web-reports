import { useEffect, useRef, useState } from "react";
import { createFileRoute, useParams, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Printer, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { ExportButtons } from "@/components/ExportButtons";

export const Route = createFileRoute("/tasks/$period")({
  component: TasksPage,
  beforeLoad: ({ params }) => {
    if (!["daily", "weekly", "monthly"].includes(params.period)) throw notFound();
  },
});

const TITLES: Record<string, string> = {
  daily: "المهام اليومية",
  weekly: "المهام الأسبوعية",
  monthly: "المهام الشهرية",
};

type TaskStatus = "done" | "notDone";
type TaskData = { status: TaskStatus; newWork: string };
type Task = {
  id: string;
  name: string;
  data: TaskData;
  date: string;
};

const todayStr = () => new Date().toISOString().slice(0, 10);

function emptyForm() {
  return { name: "", date: todayStr(), status: "done" as TaskStatus, newWork: "" };
}

function TasksPage() {
  const { period } = useParams({ from: "/tasks/$period" });
  const formId = `tasks-${period}`;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const pdfRef = useRef<HTMLDivElement>(null);

  const buildSheets = () => [
    {
      name: TITLES[period] ?? "المهام",
      rows: tasks.map((t, i) => ({
        "#": i + 1,
        "اسم المهمة": t.name,
        "التاريخ": t.date,
        "الحالة": t.data.status === "done" ? "منجز" : "غير منجز",
        "ما يستجد": t.data.newWork,
      })),
    },
  ];

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("form_records")
      .select("*")
      .eq("form_id", formId)
      .order("created_at", { ascending: true });
    if (error) {
      toast.error("تعذر تحميل المهام");
    } else {
      setTasks(
        (data ?? []).map((r) => {
          const d = (r.data ?? {}) as Partial<TaskData> & { done?: string; notDone?: string };
          const status: TaskStatus =
            d.status ?? (d.notDone && !d.done ? "notDone" : "done");
          return {
            id: r.id,
            name: r.employee_name ?? "",
            date: r.date ?? "",
            data: { status, newWork: d.newWork ?? "" },
          };
        }),
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    setForm(emptyForm());
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  async function addTask() {
    if (!form.name.trim()) {
      toast.error("يرجى إدخال اسم المهمة");
      return;
    }
    setSaving(true);
    const payload: TaskData = { status: form.status, newWork: form.newWork };
    const { data, error } = await supabase
      .from("form_records")
      .insert({
        form_id: formId,
        employee_name: form.name,
        date: form.date,
        data: payload as never,
      })
      .select("*")
      .single();
    setSaving(false);
    if (error || !data) {
      toast.error("تعذر إضافة المهمة");
      return;
    }
    setTasks((prev) => [
      ...prev,
      { id: data.id, name: data.employee_name ?? "", date: data.date ?? "", data: payload },
    ]);
    setForm(emptyForm());
    toast.success("تمت إضافة المهمة إلى السجلات");
  }

  async function removeTask(id: string) {
    if (!confirm("حذف هذه المهمة؟")) return;
    const { error } = await supabase.from("form_records").delete().eq("id", id);
    if (error) {
      toast.error("تعذر الحذف");
      return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto" ref={pdfRef}>
      <div className="flex items-center justify-between gap-2 flex-wrap mb-4 print:hidden">
        <h1 className="text-2xl font-bold">{TITLES[period]}</h1>
        <div className="flex gap-2 items-center flex-wrap">
          <Button onClick={handlePrint} variant="outline" className="gap-2">
            <Printer className="size-4" /> طباعة
          </Button>
          <ExportButtons filename={TITLES[period] ?? "tasks"} getSheets={buildSheets} pdfTargetRef={pdfRef} />
        </div>
      </div>

      <div className="hidden print:block mb-4">
        <h1 className="text-2xl font-bold text-center">{TITLES[period]}</h1>
      </div>

      {/* Entry form */}
      <Card className="mb-6 print:hidden">
        <CardHeader>
          <CardTitle className="text-base">إضافة مهمة جديدة</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">اسم المهمة</label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="اكتب اسم المهمة"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">التاريخ</label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">الحالة</label>
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setForm({ ...form, status: "done" })}
                className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                  form.status === "done"
                    ? "bg-success text-success-foreground border-success"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                منجز
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, status: "notDone" })}
                className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
                  form.status === "notDone"
                    ? "bg-destructive text-destructive-foreground border-destructive"
                    : "bg-background text-muted-foreground hover:bg-muted"
                }`}
              >
                غير منجز
              </button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">ما يستجد من أعمال</label>
            <Textarea
              rows={3}
              value={form.newWork}
              onChange={(e) => setForm({ ...form, newWork: e.target.value })}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={addTask} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              إضافة المهمة
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Saved tasks */}
      <h2 className="text-lg font-bold mb-3">سجل المهام</h2>
      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin ml-2" /> جارٍ التحميل...
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            لا توجد مهام بعد. أضف مهمة من النموذج أعلاه.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((t, idx) => {
            const isDone = t.data.status === "done";
            return (
              <Card
                key={t.id}
                className={`print:break-inside-avoid border-r-4 ${
                  isDone
                    ? "border-r-success bg-success/5"
                    : "border-r-destructive bg-destructive/5"
                }`}
              >
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                  <CardTitle className="text-base flex items-center gap-2 flex-wrap">
                    <span>
                      #{idx + 1} — {t.name || "بدون اسم"}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-md font-semibold ${
                        isDone
                          ? "bg-success text-success-foreground"
                          : "bg-destructive text-destructive-foreground"
                      }`}
                    >
                      {isDone ? "منجز" : "غير منجز"}
                    </span>
                    {t.date && (
                      <span className="text-xs text-muted-foreground">({t.date})</span>
                    )}
                  </CardTitle>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeTask(t.id)}
                    className="gap-1 print:hidden"
                  >
                    <Trash2 className="size-4" /> حذف
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {t.data.newWork && (
                    <div>
                      <div className="font-medium">ما يستجد من أعمال:</div>
                      <div className="whitespace-pre-wrap text-muted-foreground">
                        {t.data.newWork}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
