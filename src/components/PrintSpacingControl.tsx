import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, RotateCcw } from "lucide-react";

// Storage keys
const KEYS = {
  topPad: "print-top-padding-mm",
  bottomPad: "print-bottom-padding-mm",
  pageTop: "print-page-top-mm",
  pageBottom: "print-page-bottom-mm",
  pageLeft: "print-page-left-mm",
  pageRight: "print-page-right-mm",
  fontScale: "print-font-scale",
  lineHeight: "print-line-height",
  showHeader: "print-show-header",
  showFooter: "print-show-footer",
  orientation: "print-orientation",
} as const;

// Defaults
const D = {
  topPad: 0,
  bottomPad: 0,
  pageTop: 48,
  pageBottom: 22,
  pageLeft: 14,
  pageRight: 14,
  fontScale: 100, // %
  lineHeight: 1.55,
  showHeader: true,
  showFooter: true,
  orientation: "portrait" as "portrait" | "landscape",
};

const STYLE_ID = "print-page-margins";

function loadNum(key: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const v = window.localStorage.getItem(key);
  const n = v != null ? Number(v) : fallback;
  return Number.isFinite(n) ? n : fallback;
}
function loadBool(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback;
  const v = window.localStorage.getItem(key);
  return v == null ? fallback : v === "1" || v === "true";
}
function loadStr(key: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  return window.localStorage.getItem(key) ?? fallback;
}

export function applyPrintTopPadding(mm: number) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--print-top-padding", `${mm}mm`);
}
export function applyPrintBottomPadding(mm: number) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--print-bottom-padding", `${mm}mm`);
}
export function applyFontScale(pct: number) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--print-font-scale", String(pct / 100));
}
export function applyLineHeight(lh: number) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--print-line-height", String(lh));
}

export function applyPageStyle(opts: {
  top: number;
  bottom: number;
  left: number;
  right: number;
  showHeader: boolean;
  showFooter: boolean;
  orientation: "portrait" | "landscape";
}) {
  if (typeof document === "undefined") return;
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  const headerCSS = opts.showHeader ? "" : ".print-letterhead-header{display:none !important;}";
  const footerCSS = opts.showFooter ? "" : ".print-letterhead-footer{display:none !important;}";
  style.textContent = `@media print {
    @page { size: A4 ${opts.orientation}; margin: ${opts.top}mm ${opts.right}mm ${opts.bottom}mm ${opts.left}mm; }
    ${headerCSS}
    ${footerCSS}
    body { font-size: calc(10.5pt * var(--print-font-scale, 1)) !important; line-height: var(--print-line-height, 1.55) !important; }
    main, [data-view-frame] { padding-bottom: var(--print-bottom-padding, 0mm) !important; }
  }`;
}

export function loadPrintTopPadding(): number {
  return loadNum(KEYS.topPad, D.topPad);
}

type State = typeof D;

const PRESETS: Record<string, Partial<State>> = {
  compact: { pageTop: 30, pageBottom: 15, pageLeft: 10, pageRight: 10, topPad: 0, bottomPad: 0, fontScale: 90, lineHeight: 1.4 },
  standard: { pageTop: 48, pageBottom: 22, pageLeft: 14, pageRight: 14, topPad: 0, bottomPad: 0, fontScale: 100, lineHeight: 1.55 },
  spacious: { pageTop: 60, pageBottom: 35, pageLeft: 20, pageRight: 20, topPad: 5, bottomPad: 5, fontScale: 110, lineHeight: 1.7 },
};

export function PrintSpacingControl() {
  const [s, setS] = useState<State>(D);
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(0.2);
  const [mainHTML, setMainHTML] = useState<string>("");
  const previewContentRef = useRef<HTMLDivElement | null>(null);

  // Load all settings on mount
  useEffect(() => {
    const next: State = {
      topPad: loadNum(KEYS.topPad, D.topPad),
      bottomPad: loadNum(KEYS.bottomPad, D.bottomPad),
      pageTop: loadNum(KEYS.pageTop, D.pageTop),
      pageBottom: loadNum(KEYS.pageBottom, D.pageBottom),
      pageLeft: loadNum(KEYS.pageLeft, D.pageLeft),
      pageRight: loadNum(KEYS.pageRight, D.pageRight),
      fontScale: loadNum(KEYS.fontScale, D.fontScale),
      lineHeight: loadNum(KEYS.lineHeight, D.lineHeight),
      showHeader: loadBool(KEYS.showHeader, D.showHeader),
      showFooter: loadBool(KEYS.showFooter, D.showFooter),
      orientation: (loadStr(KEYS.orientation, D.orientation) as State["orientation"]),
    };
    setS(next);
    applyAll(next);
  }, []);

  function applyAll(next: State) {
    applyPrintTopPadding(next.topPad);
    applyPrintBottomPadding(next.bottomPad);
    applyFontScale(next.fontScale);
    applyLineHeight(next.lineHeight);
    applyPageStyle({
      top: next.pageTop,
      bottom: next.pageBottom,
      left: next.pageLeft,
      right: next.pageRight,
      showHeader: next.showHeader,
      showFooter: next.showFooter,
      orientation: next.orientation,
    });
  }

  function update<K extends keyof State>(key: K, value: State[K]) {
    const next = { ...s, [key]: value };
    setS(next);
    applyAll(next);
    const raw =
      typeof value === "boolean" ? (value ? "1" : "0") : String(value);
    window.localStorage.setItem((KEYS as Record<string, string>)[key], raw);
  }

  function applyPreset(name: keyof typeof PRESETS) {
    const next = { ...s, ...PRESETS[name] } as State;
    setS(next);
    applyAll(next);
    (Object.keys(PRESETS[name]) as (keyof State)[]).forEach((k) => {
      const v = (next as State)[k];
      const raw = typeof v === "boolean" ? (v ? "1" : "0") : String(v);
      window.localStorage.setItem((KEYS as Record<string, string>)[k], raw);
    });
  }

  function resetAll() {
    setS(D);
    applyAll(D);
    Object.values(KEYS).forEach((k) => window.localStorage.removeItem(k));
  }

  // A4 preview dimensions (swap for landscape)
  const isLandscape = s.orientation === "landscape";
  const pageW = isLandscape ? 297 : 210;
  const pageH = isLandscape ? 210 : 297;
  const topPct = (s.pageTop / pageH) * 100;
  const bottomPct = (s.pageBottom / pageH) * 100;
  const leftPct = (s.pageLeft / pageW) * 100;
  const rightPct = (s.pageRight / pageW) * 100;
  const contentTopOffset = (s.topPad / pageH) * 100;
  const previewWidth = isLandscape ? 280 : 220;
  const contentAreaWidthPx = previewWidth * (1 - (s.pageLeft + s.pageRight) / pageW);

  useEffect(() => {
    if (!open) return;
    const main = document.querySelector(
      "main[data-view-frame], [data-view-frame]"
    ) as HTMLElement | null;
    if (!main) return;
    const mainW = main.offsetWidth || 800;
    setScale(contentAreaWidthPx / mainW);
    const clone = main.cloneNode(true) as HTMLElement;
    clone
      .querySelectorAll(
        "script, [data-radix-popper-content-wrapper], [role='dialog']"
      )
      .forEach((n) => n.remove());
    setMainHTML(clone.innerHTML);
  }, [open, contentAreaWidthPx]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="h-8 gap-1" title="ضبط هوامش الطباعة">
          <Printer className="size-4" />
          <span className="text-xs hidden sm:inline">هوامش الطباعة</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[28rem] max-h-[85vh] overflow-y-auto" align="end">
        <div className="space-y-4">
          {/* Live A4 preview */}
          <div className="flex justify-center">
            <div
              className="relative bg-white border border-border shadow-sm overflow-hidden"
              style={{ width: previewWidth, aspectRatio: `${pageW} / ${pageH}` }}
              aria-label="معاينة الصفحة"
            >
              {s.showHeader && (
                <div
                  className="absolute inset-x-0 top-0 overflow-hidden bg-primary/10 z-10"
                  style={{ height: `${topPct}%` }}
                >
                  <img
                    src="/print-header.jpg"
                    alt=""
                    className="w-full h-full object-cover object-top"
                    onError={(e) => ((e.currentTarget.style.display = "none"))}
                  />
                </div>
              )}
              {s.showFooter && (
                <div
                  className="absolute inset-x-0 bottom-0 overflow-hidden bg-primary/10 z-10"
                  style={{ height: `${bottomPct}%` }}
                >
                  <img
                    src="/print-footer.jpg"
                    alt=""
                    className="w-full h-full object-cover object-bottom"
                    onError={(e) => ((e.currentTarget.style.display = "none"))}
                  />
                </div>
              )}
              <div
                className="absolute overflow-hidden"
                style={{
                  top: `calc(${topPct}% + ${contentTopOffset}%)`,
                  bottom: `${bottomPct}%`,
                  left: `${leftPct}%`,
                  right: `${rightPct}%`,
                }}
              >
                <div
                  ref={previewContentRef}
                  dir="rtl"
                  style={{
                    transform: `scale(${scale})`,
                    transformOrigin: "top right",
                    width: `${100 / scale}%`,
                    pointerEvents: "none",
                    fontSize: `${s.fontScale}%`,
                    lineHeight: s.lineHeight,
                  }}
                  dangerouslySetInnerHTML={{ __html: mainHTML }}
                />
              </div>
            </div>
          </div>

          {/* Presets */}
          <div className="flex gap-1.5">
            <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={() => applyPreset("compact")}>مضغوط</Button>
            <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={() => applyPreset("standard")}>قياسي</Button>
            <Button size="sm" variant="outline" className="flex-1 text-xs h-7" onClick={() => applyPreset("spacious")}>واسع</Button>
          </div>

          <Tabs defaultValue="margins" className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-8">
              <TabsTrigger value="margins" className="text-xs">الهوامش</TabsTrigger>
              <TabsTrigger value="content" className="text-xs">المحتوى</TabsTrigger>
              <TabsTrigger value="page" className="text-xs">الصفحة</TabsTrigger>
            </TabsList>

            <TabsContent value="margins" className="space-y-3 mt-3">
              <SliderRow label="هامش الرأس (أعلى)" value={s.pageTop} unit="مم" min={5} max={90} onChange={(v) => update("pageTop", v)} />
              <SliderRow label="هامش التذييل (أسفل)" value={s.pageBottom} unit="مم" min={5} max={70} onChange={(v) => update("pageBottom", v)} />
              <SliderRow label="الهامش الأيمن" value={s.pageRight} unit="مم" min={5} max={50} onChange={(v) => update("pageRight", v)} />
              <SliderRow label="الهامش الأيسر" value={s.pageLeft} unit="مم" min={5} max={50} onChange={(v) => update("pageLeft", v)} />
            </TabsContent>

            <TabsContent value="content" className="space-y-3 mt-3">
              <SliderRow label="مسافة بداية المحتوى" value={s.topPad} unit="مم" min={0} max={60} onChange={(v) => update("topPad", v)} />
              <SliderRow label="مسافة نهاية المحتوى" value={s.bottomPad} unit="مم" min={0} max={60} onChange={(v) => update("bottomPad", v)} />
              <SliderRow label="حجم الخط" value={s.fontScale} unit="٪" min={70} max={140} onChange={(v) => update("fontScale", v)} />
              <SliderRow label="تباعد الأسطر" value={s.lineHeight} unit="" min={1.1} max={2.2} step={0.05} onChange={(v) => update("lineHeight", v)} format={(n) => n.toFixed(2)} />
            </TabsContent>

            <TabsContent value="page" className="space-y-3 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">اتجاه الصفحة</span>
                <div className="flex gap-1">
                  <Button size="sm" variant={s.orientation === "portrait" ? "default" : "outline"} className="h-7 text-xs" onClick={() => update("orientation", "portrait")}>عمودي</Button>
                  <Button size="sm" variant={s.orientation === "landscape" ? "default" : "outline"} className="h-7 text-xs" onClick={() => update("orientation", "landscape")}>أفقي</Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">إظهار رأس الصفحة</span>
                <Switch checked={s.showHeader} onCheckedChange={(v) => update("showHeader", v)} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">إظهار تذييل الصفحة</span>
                <Switch checked={s.showFooter} onCheckedChange={(v) => update("showFooter", v)} />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-2 pt-2 border-t">
            <Button
              size="sm"
              className="flex-1 gap-1"
              onClick={() => {
                setOpen(false);
                setTimeout(() => window.print(), 150);
              }}
            >
              <Printer className="size-4" /> طباعة الآن
            </Button>
            <Button size="sm" variant="outline" className="gap-1" onClick={resetAll}>
              <RotateCcw className="size-3.5" /> إعادة الضبط
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SliderRow({
  label,
  value,
  unit,
  min,
  max,
  step = 1,
  onChange,
  format,
}: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (n: number) => string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground tabular-nums">
          {format ? format(value) : value} {unit}
        </span>
      </div>
      <Slider value={[value]} min={min} max={max} step={step} onValueChange={(v) => onChange(v[0] ?? value)} />
    </div>
  );
}
