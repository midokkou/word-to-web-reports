export type ItemStatus = "pending" | "done" | "partial" | "not_done";

export type ItemEval = {
  status: ItemStatus;
  notes: string;
};

export type FormEval = {
  employeeName: string;
  date: string;
  items: Record<number, ItemEval>;
};

const KEY = (formId: string) => `school-report:${formId}`;

export function loadEval(formId: string): FormEval {
  if (typeof window === "undefined") return { employeeName: "", date: "", items: {} };
  try {
    const raw = localStorage.getItem(KEY(formId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return { employeeName: "", date: "", items: {} };
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
