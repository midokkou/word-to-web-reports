import { useEffect, useState } from "react";
import { Smartphone, Monitor, Maximize2 } from "lucide-react";
import { applyViewMode, loadViewMode, type ViewMode } from "@/lib/viewMode";
import { cn } from "@/lib/utils";

const OPTIONS: { id: ViewMode; label: string; icon: typeof Monitor }[] = [
  { id: "auto", label: "تلقائي", icon: Maximize2 },
  { id: "mobile", label: "جوال", icon: Smartphone },
  { id: "desktop", label: "كمبيوتر", icon: Monitor },
];

export function ViewModeSwitcher() {
  const [mode, setMode] = useState<ViewMode>("auto");

  useEffect(() => {
    const m = loadViewMode();
    setMode(m);
    applyViewMode(m);
  }, []);

  const choose = (m: ViewMode) => {
    setMode(m);
    applyViewMode(m);
  };

  return (
    <div className="inline-flex items-center gap-0.5 rounded-full border bg-card p-0.5">
      {OPTIONS.map((o) => {
        const Icon = o.icon;
        const on = mode === o.id;
        return (
          <button
            key={o.id}
            onClick={() => choose(o.id)}
            title={o.label}
            aria-label={o.label}
            className={cn(
              "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-colors",
              on
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="size-3.5" />
            <span className="hidden sm:inline">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
