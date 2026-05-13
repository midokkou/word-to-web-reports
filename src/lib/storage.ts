import { supabase } from "@/integrations/supabase/client";

export type ItemStatus = "pending" | "done" | "partial" | "not_done";

export type ItemEval = {
  status: ItemStatus;
  notes: string;
};

export type Followup = {
  day: string;
  date: string;
  recommendations: string;
  reviewerName: string;
  signature: string;
};

export type FormEval = {
  employeeName: string;
  date: string;
  items: Record<number, ItemEval>;
  customItems?: string[];
  itemOverrides?: Record<number, string>;
  hiddenItems?: number[];
  followup1?: Followup;
  followup2?: Followup;
};

export const emptyFollowup = (): Followup => ({
  day: "",
  date: "",
  recommendations: "",
  reviewerName: "",
  signature: "",
});

const emptyEval = (): FormEval => ({
  employeeName: "",
  date: "",
  items: {},
  customItems: [],
  itemOverrides: {},
  hiddenItems: [],
  followup1: emptyFollowup(),
  followup2: emptyFollowup(),
});

const KEY = (formId: string) => `school-report:${formId}`;
const REC_ID_KEY = (formId: string) => `school-report:rec:${formId}`;

export function loadEval(formId: string): FormEval {
  if (typeof window === "undefined") return emptyEval();
  try {
    const raw = localStorage.getItem(KEY(formId));
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...emptyEval(), ...parsed };
    }
  } catch {}
  return emptyEval();
}

// Debounce cloud sync per formId
const syncTimers: Record<string, ReturnType<typeof setTimeout>> = {};

async function pushToCloud(formId: string, value: FormEval) {
  try {
    const recId = localStorage.getItem(REC_ID_KEY(formId));
    const payload = {
      form_id: formId,
      employee_name: value.employeeName || "",
      date: value.date || "",
      data: value as never,
    };
    if (recId) {
      const { error } = await supabase
        .from("form_records")
        .update(payload)
        .eq("id", recId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase
        .from("form_records")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      if (data?.id) localStorage.setItem(REC_ID_KEY(formId), data.id);
    }
  } catch (e) {
    console.error("Cloud sync failed:", e);
  }
}

export function saveEval(formId: string, value: FormEval) {
  localStorage.setItem(KEY(formId), JSON.stringify(value));
  // Debounced cloud sync
  if (syncTimers[formId]) clearTimeout(syncTimers[formId]);
  syncTimers[formId] = setTimeout(() => pushToCloud(formId, value), 600);
}

export function clearEval(formId: string) {
  localStorage.removeItem(KEY(formId));
  const recId = localStorage.getItem(REC_ID_KEY(formId));
  localStorage.removeItem(REC_ID_KEY(formId));
  if (recId) {
    supabase.from("form_records").delete().eq("id", recId).then(({ error }) => {
      if (error) console.error("Cloud delete failed:", error);
    });
  }
}

export type CloudRecord = {
  id: string;
  formId: string;
  employeeName: string;
  date: string;
  data: FormEval;
  updatedAt: string;
};

export async function fetchAllRecords(): Promise<CloudRecord[]> {
  const { data, error } = await supabase
    .from("form_records")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("Failed to fetch records:", error);
    return [];
  }
  return (data ?? []).map((r) => ({
    id: r.id,
    formId: r.form_id,
    employeeName: r.employee_name ?? "",
    date: r.date ?? "",
    data: { ...emptyEval(), ...((r.data ?? {}) as Partial<FormEval>) },
    updatedAt: r.updated_at,
  }));
}

export async function deleteRecord(id: string) {
  const { error } = await supabase.from("form_records").delete().eq("id", id);
  if (error) {
    console.error("Failed to delete record:", error);
    throw error;
  }
}

export function getProgress(formId: string, total: number) {
  const ev = loadEval(formId);
  const done = Object.values(ev.items).filter((i) => i.status === "done").length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

export type FillStatus = "empty" | "partial" | "complete";

export function getFillStatus(formId: string, total: number): FillStatus {
  const ev = loadEval(formId);
  return computeFillStatus(ev, total);
}

export function computeFillStatus(ev: FormEval, total: number): FillStatus {
  const items = Object.values(ev.items);
  const touched =
    items.length > 0 ||
    !!ev.employeeName ||
    !!ev.date ||
    (ev.customItems?.length ?? 0) > 0 ||
    !!ev.followup1?.recommendations ||
    !!ev.followup2?.recommendations;
  if (!touched) return "empty";
  const done = items.filter((i) => i.status === "done").length;
  const totalAll = total + (ev.customItems?.length ?? 0);
  if (totalAll > 0 && done >= totalAll) return "complete";
  return "partial";
}
