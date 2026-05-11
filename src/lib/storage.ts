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

const KEY = (formId: string) => `school-report:${formId}`;

export function loadEval(formId: string): FormEval {
  if (typeof window === "undefined") return { employeeName: "", date: "", items: {}, customItems: [], followup1: emptyFollowup(), followup2: emptyFollowup() };
  try {
    const raw = localStorage.getItem(KEY(formId));
    if (raw) {
      const parsed = JSON.parse(raw);
      return { customItems: [], followup1: emptyFollowup(), followup2: emptyFollowup(), ...parsed };
    }
  } catch {}
  return { employeeName: "", date: "", items: {}, customItems: [], followup1: emptyFollowup(), followup2: emptyFollowup() };
}

export function saveEval(formId: string, value: FormEval) {
  localStorage.setItem(KEY(formId), JSON.stringify(value));
}

export function clearEval(formId: string) {
  localStorage.removeItem(KEY(formId));
}

export function getProgress(formId: string, total: number) {
  const ev = loadEval(formId);
  const done = Object.values(ev.items).filter((i) => i.status === "done").length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0 };
}

export type FillStatus = "empty" | "partial" | "complete";

export function getFillStatus(formId: string, total: number): FillStatus {
  const ev = loadEval(formId);
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
