export type ThemeName = "teal" | "blue" | "purple" | "rose" | "green" | "amber";

export const THEMES: { id: ThemeName; label: string; swatch: string }[] = [
  { id: "teal", label: "تركواز", swatch: "oklch(0.55 0.14 195)" },
  { id: "blue", label: "أزرق", swatch: "oklch(0.55 0.18 255)" },
  { id: "purple", label: "بنفسجي", swatch: "oklch(0.55 0.20 295)" },
  { id: "rose", label: "وردي", swatch: "oklch(0.62 0.20 10)" },
  { id: "green", label: "أخضر", swatch: "oklch(0.60 0.16 150)" },
  { id: "amber", label: "ذهبي", swatch: "oklch(0.70 0.16 65)" },
];

const KEY = "app:theme";

export function applyTheme(t: ThemeName) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", t);
  try { localStorage.setItem(KEY, t); } catch {}
}

export function loadTheme(): ThemeName {
  if (typeof window === "undefined") return "teal";
  try {
    const v = localStorage.getItem(KEY) as ThemeName | null;
    if (v) return v;
  } catch {}
  return "teal";
}
