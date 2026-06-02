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
  // Per-page overrides
  perPageEnabled: "print-per-page-enabled",
  firstTop: "print-first-top-mm",
  firstBottom: "print-first-bottom-mm",
  firstLeft: "print-first-left-mm",
  firstRight: "print-first-right-mm",
  oddTop: "print-odd-top-mm",
  oddBottom: "print-odd-bottom-mm",
  oddLeft: "print-odd-left-mm",
  oddRight: "print-odd-right-mm",
  evenTop: "print-even-top-mm",
  evenBottom: "print-even-bottom-mm",
  evenLeft: "print-even-left-mm",
  evenRight: "print-even-right-mm",
} as const;

// Defaults
const D = {
  topPad: 0,
  bottomPad: 0,
  pageTop: 48,
  pageBottom: 22,
  pageLeft: 14,
  pageRight: 14,
  fontScale: 100,
  lineHeight: 1.55,
  showHeader: true,
  showFooter: true,
  orientation: "portrait" as "portrait" | "landscape",
  perPageEnabled: false,
  firstTop: 48, firstBottom: 22, firstLeft: 14, firstRight: 14,
  oddTop: 48, oddBottom: 22, oddLeft: 14, oddRight: 14,
  evenTop: 48, evenBottom: 22, evenLeft: 14, evenRight: 14,
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

type PageMargins = { top: number; bottom: number; left: number; right: number };

export function applyPageStyle(opts: {
  base: PageMargins;
  perPage: { enabled: boolean; first: PageMargins; odd: PageMargins; even: PageMargins };
  showHeader: boolean;
  showFooter: boolean;
  orientation: "portrait" | "landscape";
}) {
  if (typeof document === "undefined") return;
  const { base, perPage, showHeader, showFooter, orientation } = opts;
  document.documentElement.style.setProperty("--print-page-top", `${base.top}mm`);
  document.documentElement.style.setProperty("--print-page-bottom", `${base.bottom}mm`);
  document.documentElement.style.setProperty("--print-page-left", `${base.left}mm`);
  document.documentElement.style.setProperty("--print-page-right", `${base.right}mm`);

  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  const headerCSS = showHeader ? "" : ".print-letterhead-header{display:none !important;}";
  const footerCSS = showFooter ? "" : ".print-letterhead-footer{display:none !important;}";
  const mk = (m: PageMargins) => `size: A4 ${orientation}; margin: ${m.top}mm ${m.right}mm ${m.bottom}mm ${m.left}mm;`;
  const first = perPage.enabled ? perPage.first : base;
  const odd = perPage.enabled ? perPage.odd : base;
  const even = perPage.enabled ? perPage.even : base;
  // When per-page is enabled, set the BASE @page to the "odd" values so all
  // pages (except :first and :left) inherit them reliably across browsers —
  // some print engines silently ignore margin overrides inside @page :right.
  const baseRule = perPage.enabled ? odd : base;
  const perPageBlock = perPage.enabled
    ? `@page :first { ${mk(first)} } @page :left { ${mk(even)} } @page :right { ${mk(odd)} }`
    : `@page :first { ${mk(base)} }`;
  style.textContent = `@media print {
    @page { ${mk(baseRule)} }
    ${perPageBlock}
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
  const [pagePreview, setPagePreview] = useState<"first" | "odd" | "even">("first");
  const previewContentRef = useRef<HTMLDivElement | null>(null);

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
      perPageEnabled: loadBool(KEYS.perPageEnabled, D.perPageEnabled),
      firstTop: loadNum(KEYS.firstTop, D.firstTop),
      firstBottom: loadNum(KEYS.firstBottom, D.firstBottom),
      firstLeft: loadNum(KEYS.firstLeft, D.firstLeft),
      firstRight: loadNum(KEYS.firstRight, D.firstRight),
      oddTop: loadNum(KEYS.oddTop, D.oddTop),
      oddBottom: loadNum(KEYS.oddBottom, D.oddBottom),
      oddLeft: loadNum(KEYS.oddLeft, D.oddLeft),
      oddRight: loadNum(KEYS.oddRight, D.oddRight),
      evenTop: loadNum(KEYS.evenTop, D.evenTop),
      evenBottom: loadNum(KEYS.evenBottom, D.evenBottom),
      evenLeft: loadNum(KEYS.evenLeft, D.evenLeft),
      evenRight: loadNum(KEYS.evenRight, D.evenRight),
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
      base: { top: next.pageTop, bottom: next.pageBottom, left: next.pageLeft, right: next.pageRight },
      perPage: {
        enabled: next.perPageEnabled,
        first: { top: next.firstTop, bottom: next.firstBottom, left: next.firstLeft, right: next.firstRight },
        odd: { top: next.oddTop, bottom: next.oddBottom, left: next.oddLeft, right: next.oddRight },
        even: { top: next.evenTop, bottom: next.evenBottom, left: next.evenLeft, right: next.evenRight },
      },
      showHeader: next.showHeader,
      showFooter: next.showFooter,
      orientation: next.orientation,
    });
  }

  function update<K extends keyof State>(key: K, value: State[K]) {
    const next = { ...s, [key]: value };
    setS(next);
    applyAll(next);
    const raw = typeof value === "boolean" ? (value ? "1" : "0") : String(value);
    window.localStorage.setItem((KEYS as Record<string, string>)[key], raw);
  }

  function syncPerPageFromBase(next: State): State {
    // When per-page is first enabled, seed the overrides with the base values.
    return {
      ...next,
      firstTop: next.pageTop, firstBottom: next.pageBottom, firstLeft: next.pageLeft, firstRight: next.pageRight,
      oddTop: next.pageTop, oddBottom: next.pageBottom, oddLeft: next.pageLeft, oddRight: next.pageRight,
      evenTop: next.pageTop, evenBottom: next.pageBottom, evenLeft: next.pageLeft, evenRight: next.pageRight,
    };
  }

  function togglePerPage(v: boolean) {
    let next = { ...s, perPageEnabled: v };
    if (v) next = syncPerPageFromBase(next);
    setS(next);
    applyAll(next);
    (Object.keys(KEYS) as (keyof typeof KEYS)[]).forEach((k) => {
      const val = (next as State)[k];
      const raw = typeof val === "boolean" ? (val ? "1" : "0") : String(val);
      window.localStorage.setItem(KEYS[k], raw);
    });
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

  const isLandscape = s.orientation === "landscape";
  const pageW = isLandscape ? 297 : 210;
  const pageH = isLandscape ? 210 : 297;

  // Preview reflects the selected page type when per-page is enabled
  const previewMargins: PageMargins = s.perPageEnabled
    ? pagePreview === "first"
      ? { top: s.firstTop, bottom: s.firstBottom, left: s.firstLeft, right: s.firstRight }
      : pagePreview === "odd"
      ? { top: s.oddTop, bottom: s.oddBottom, left: s.oddLeft, right: s.oddRight }
      : { top: s.evenTop, bottom: s.evenBottom, left: s.evenLeft, right: s.evenRight }
    : { top: s.pageTop, bottom: s.pageBottom, left: s.pageLeft, right: s.pageRight };

  const topPct = (previewMargins.top / pageH) * 100;
  const bottomPct = (previewMargins.bottom / pageH) * 100;
  const leftPct = (previewMargins.left / pageW) * 100;
  const rightPct = (previewMargins.right / pageW) * 100;
  const contentTopOffset = (s.topPad / pageH) * 100;
  const previewWidth = isLandscape ? 280 : 220;
  const contentAreaWidthPx = previewWidth * (1 - (previewMargins.left + previewMargins.right) / pageW);

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
      .querySelectorAll("script, [data-radix-popper-content-wrapper], [role='dialog']")
      .forEach((n) => n.remove());
    setMainHTML(clone.innerHTML);
  }, [open, contentAreaWidthPx]);

  // Per-page sliders bound to the currently previewed page type
  const prefix = pagePreview === "first" ? "first" : pagePreview === "odd" ? "odd" : "even";
  const k = (suffix: "Top" | "Bottom" | "Left" | "Right") => `${prefix}${suffix}` as keyof State;

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
          <div className="flex justify-center">
            <div
              className="relative bg-white border border-border shadow-sm overflow-hidden"
              style={{ width: previewWidth, aspectRatio: `${pageW} / ${pageH}` }}
              aria-label="معاينة الصفحة"
            >
              {s.showHeader && (
                <div className="absolute inset-x-0 top-0 overflow-hidden bg-primary/10 z-10" style={{ height: `${topPct}%` }}>
                  <img src="/print-header.jpg" alt="" className="w-full h-full object-cover object-top" onError={(e) => ((e.currentTarget.style.display = "none"))} />
                </div>
              )}
              {s.showFooter && (
                <div className="absolute inset-x-0 bottom-0 overflow-hidden bg-primary/10 z-10" style={{ height: `${bottomPct}%` }}>
                  <img src="/print-footer.jpg" alt="" className="w-full h-full object-cover object-bottom" onError={(e) => ((e.currentTarget.style.display = "none"))} />
                </div>
              )}
              <div className="absolute overflow-hidden" style={{ top: `calc(${topPct}% + ${contentTopOffset}%)`, bottom: `${bottomPct}%`, left: `${leftPct}%`, right: `${rightPct}%` }}>
                <div
                  ref={previewContentRef}
                  dir="rtl"
                  style={{ transform: `scale(${scale})`, transformOrigin: "top right", width: `${100 / scale}%`, pointerEvents: "none", fontSize: `${s.fontScale}%`, lineHeight: s.lineHeight }}
                  dangerouslySetInnerHTML={{ __html: mainHTML }}
                />
              </div>
            </div>
          </div>

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
              <div className="flex items-center justify-between rounded-md bg-muted/40 p-2">
                <div className="flex flex-col">
                  <span className="text-sm font-medium">هوامش مختلفة لكل صفحة</span>
                  <span className="text-[10px] text-muted-foreground">للطباعة متعددة الصفحات (أولى / فردية / زوجية)</span>
                </div>
                <Switch checked={s.perPageEnabled} onCheckedChange={togglePerPage} />
              </div>

              {!s.perPageEnabled ? (
                <>
                  <SliderRow label="هامش الرأس (أعلى)" value={s.pageTop} unit="مم" min={5} max={90} onChange={(v) => update("pageTop", v)} />
                  <SliderRow label="هامش التذييل (أسفل)" value={s.pageBottom} unit="مم" min={5} max={70} onChange={(v) => update("pageBottom", v)} />
                  <SliderRow label="الهامش الأيمن" value={s.pageRight} unit="مم" min={5} max={50} onChange={(v) => update("pageRight", v)} />
                  <SliderRow label="الهامش الأيسر" value={s.pageLeft} unit="مم" min={5} max={50} onChange={(v) => update("pageLeft", v)} />
                </>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-1">
                    <Button size="sm" variant={pagePreview === "first" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setPagePreview("first")}>الصفحة الأولى</Button>
                    <Button size="sm" variant={pagePreview === "odd" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setPagePreview("odd")}>الصفحات الفردية</Button>
                    <Button size="sm" variant={pagePreview === "even" ? "default" : "outline"} className="h-7 text-xs" onClick={() => setPagePreview("even")}>الصفحات الزوجية</Button>
                  </div>
                  <SliderRow label="هامش الرأس (أعلى)" value={s[k("Top")] as number} unit="مم" min={5} max={90} onChange={(v) => update(k("Top"), v as never)} />
                  <SliderRow label="هامش التذييل (أسفل)" value={s[k("Bottom")] as number} unit="مم" min={5} max={70} onChange={(v) => update(k("Bottom"), v as never)} />
                  <SliderRow label="الهامش الأيمن" value={s[k("Right")] as number} unit="مم" min={5} max={50} onChange={(v) => update(k("Right"), v as never)} />
                  <SliderRow label="الهامش الأيسر" value={s[k("Left")] as number} unit="مم" min={5} max={50} onChange={(v) => update(k("Left"), v as never)} />
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    ملاحظة: متصفح الطباعة يعتمد على ترقيم الصفحات — الصفحة الأولى تأخذ "الأولى"، ثم تتناوب "الفردية/الزوجية" للبقية.
                  </p>
                </>
              )}
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
            <Button size="sm" className="flex-1 gap-1" onClick={() => { setOpen(false); setTimeout(() => window.print(), 150); }}>
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
  label, value, unit, min, max, step = 1, onChange, format,
}: {
  label: string; value: number; unit: string; min: number; max: number; step?: number;
  onChange: (v: number) => void; format?: (n: number) => string;
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
