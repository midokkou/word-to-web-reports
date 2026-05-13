import { useEffect, useState } from "react";
import { createFileRoute, useParams, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Printer, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

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

type TaskData = { done: string; notDone: string; newWork: string };
type Task = {
  id: string;
  name: string;
  data: TaskData;
  date: string;
};

function emptyData(): TaskData {
  return { done: "", notDone: "", newWork: "" };
}

function TasksPage() {
  const { period } = useParams({ from: "/tasks/$period" });
  const formId = `tasks-${period}`;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

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
        (data ?? []).map((r) => ({
          id: r.id,
          name: r.employee_name ?? "",
          date: r.date ?? "",
          data: { ...emptyData(), ...((r.data ?? {}) as Partial<TaskData>) },
        })),
      );
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  async function addTask() {
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("form_records")
      .insert({ form_id: formId, employee_name: "", date: today, data: emptyData() as never })
      .select("*")
      .single();
    if (error || !data) {
      toast.error("تعذر إضافة المهمة");
      return;
    }
    setTasks((prev) => [
      ...prev,
      { id: data.id, name: "", date: data.date, data: emptyData() },
    ]);
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

  function updateLocal(id: string, patch: Partial<Task>) {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  async function saveTask(t: Task) {
    setSavingId(t.id);
    const { error } = await supabase
      .from("form_records")
      .update({
        employee_name: t.name,
        date: t.date,
        data: t.data as never,
      })
      .eq("id", t.id);
    setSavingId(null);
    if (error) toast.error("تعذر الحفظ");
    else toast.success("تم الحفظ");
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-2 flex-wrap mb-4 print:hidden">
        <h1 className="text-2xl font-bold">{TITLES[period]}</h1>
        <div className="flex gap-2">
          <Button onClick={addTask} className="gap-2">
            <Plus className="size-4" /> إضافة مهمة
          </Button>
          <Button onClick={handlePrint} variant="outline" className="gap-2">
            <Printer className="size-4" /> طباعة
          </Button>
        </div>
      </div>

      <div className="hidden print:block mb-4">
        <h1 className="text-2xl font-bold text-center">{TITLES[period]}</h1>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin ml-2" /> جارٍ التحميل...
        </div>
      ) : tasks.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            لا توجد مهام بعد. اضغط "إضافة مهمة" للبدء.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {tasks.map((t, idx) => (
            <Card key={t.id} className="print:break-inside-avoid">
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
                <CardTitle className="text-base">مهمة #{idx + 1}</CardTitle>
                <div className="flex gap-2 print:hidden">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => saveTask(t)}
                    disabled={savingId === t.id}
                    className="gap-1"
                  >
                    {savingId === t.id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    حفظ
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeTask(t.id)}
                    className="gap-1"
                  >
                    <Trash2 className="size-4" /> حذف
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium mb-1 block">اسم المهمة</label>
                    <Input
                      value={t.name}
                      onChange={(e) => updateLocal(t.id, { name: e.target.value })}
                      placeholder="اكتب اسم المهمة"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">التاريخ</label>
                    <Input
                      type="date"
                      value={t.date}
                      onChange={(e) => updateLocal(t.id, { date: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">ما تم تنفيذه</label>
                  <Textarea
                    rows={3}
                    value={t.data.done}
                    onChange={(e) =>
                      updateLocal(t.id, { data: { ...t.data, done: e.target.value } })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">ما لم يتم تنفيذه</label>
                  <Textarea
                    rows={3}
                    value={t.data.notDone}
                    onChange={(e) =>
                      updateLocal(t.id, { data: { ...t.data, notDone: e.target.value } })
                    }
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">ما يستجد من أعمال</label>
                  <Textarea
                    rows={3}
                    value={t.data.newWork}
                    onChange={(e) =>
                      updateLocal(t.id, { data: { ...t.data, newWork: e.target.value } })
                    }
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
