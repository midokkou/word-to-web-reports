import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Printer } from "lucide-react";

const STORAGE_KEY = "print-top-padding-mm";
const DEFAULT_MM = 0;

export function applyPrintTopPadding(mm: number) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--print-top-padding", `${mm}mm`);
}

export function loadPrintTopPadding(): number {
  if (typeof window === "undefined") return DEFAULT_MM;
  const v = window.localStorage.getItem(STORAGE_KEY);
  const n = v ? Number(v) : DEFAULT_MM;
  return Number.isFinite(n) ? n : DEFAULT_MM;
}

export function PrintSpacingControl() {
  const [mm, setMm] = useState<number>(DEFAULT_MM);

  useEffect(() => {
    const v = loadPrintTopPadding();
    setMm(v);
    applyPrintTopPadding(v);
  }, []);

  const update = (v: number) => {
    setMm(v);
    applyPrintTopPadding(v);
    window.localStorage.setItem(STORAGE_KEY, String(v));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="h-8 gap-1" title="ضبط مسافة الطباعة">
          <Printer className="size-4" />
          <span className="text-xs hidden sm:inline">مسافة الطباعة</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">مسافة بداية المحتوى</span>
            <span className="text-xs text-muted-foreground">{mm} مم</span>
          </div>
          <Slider
            value={[mm]}
            min={0}
            max={60}
            step={1}
            onValueChange={(v) => update(v[0] ?? 0)}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0</span>
            <span>30</span>
            <span>60</span>
          </div>
          <Button size="sm" variant="outline" className="w-full" onClick={() => update(DEFAULT_MM)}>
            إعادة الضبط
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
