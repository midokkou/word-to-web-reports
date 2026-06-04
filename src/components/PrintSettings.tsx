import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Settings2, RotateCcw } from "lucide-react";

export type PrintSettingsValue = {
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  headerHeight: number;
  footerHeight: number;
};

const DEFAULTS: PrintSettingsValue = {
  marginTop: 42,
  marginRight: 12,
  marginBottom: 28,
  marginLeft: 12,
  headerHeight: 42,
  footerHeight: 28,
};

const STORAGE_KEY = "print-settings-v1";

function load(): PrintSettingsValue {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function PrintSettings() {
  const [v, setV] = useState<PrintSettingsValue>(DEFAULTS);

  useEffect(() => {
    setV(load());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
    } catch {
      /* ignore */
    }
  }, [v]);

  const css = `@media print {
    @page {
      size: A4;
      margin: ${v.marginTop}mm ${v.marginRight}mm ${v.marginBottom}mm ${v.marginLeft}mm !important;
    }
    .print-letterhead-header { height: ${v.headerHeight}mm !important; }
    .print-letterhead-footer { height: ${v.footerHeight}mm !important; }
  }`;

  const set = (k: keyof PrintSettingsValue, val: number) =>
    setV((p) => ({ ...p, [k]: val }));

  const row = (
    label: string,
    key: keyof PrintSettingsValue,
    max: number,
  ) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{label}</Label>
        <Input
          type="number"
          value={v[key]}
          onChange={(e) => set(key, Number(e.target.value) || 0)}
          className="h-6 w-16 text-xs text-center"
          min={0}
          max={max}
        />
      </div>
      <Slider
        value={[v[key]]}
        min={0}
        max={max}
        step={1}
        onValueChange={([n]) => set(key, n)}
      />
    </div>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="print:hidden">
            <Settings2 className="size-4 ml-1" /> هوامش الطباعة
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold">إعدادات الطباعة (مم)</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setV(DEFAULTS)}
              className="h-7 px-2 text-xs"
            >
              <RotateCcw className="size-3 ml-1" /> الافتراضي
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-bold text-muted-foreground">الهوامش</p>
            {row("أعلى", "marginTop", 80)}
            {row("أسفل", "marginBottom", 80)}
            {row("يمين", "marginRight", 40)}
            {row("يسار", "marginLeft", 40)}
          </div>

          <div className="space-y-2 border-t pt-2">
            <p className="text-[11px] font-bold text-muted-foreground">
              ارتفاع الترويسة والتذييل
            </p>
            {row("ارتفاع الترويسة", "headerHeight", 80)}
            {row("ارتفاع التذييل", "footerHeight", 80)}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
