export type ViewMode = "auto" | "mobile" | "desktop";

const KEY = "app:view-mode";

export function applyViewMode(m: ViewMode) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-view-mode", m);
  try { localStorage.setItem(KEY, m); } catch {}
}

export function loadViewMode(): ViewMode {
  if (typeof window === "undefined") return "auto";
  try {
    const v = localStorage.getItem(KEY) as ViewMode | null;
    if (v === "mobile" || v === "desktop" || v === "auto") return v;
  } catch {}
  return "auto";
}
