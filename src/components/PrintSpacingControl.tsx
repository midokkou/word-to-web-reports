import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Printer } from "lucide-react";


const TOP_PAD_KEY = "print-top-padding-mm";
const PAGE_TOP_KEY = "print-page-top-mm";
const PAGE_BOTTOM_KEY = "print-page-bottom-mm";

const DEFAULT_TOP_PAD = 0;
const DEFAULT_PAGE_TOP = 48; // header margin (raised)
const DEFAULT_PAGE_BOTTOM = 22; // footer margin (lowered)

const STYLE_ID = "print-page-margins";

export function applyPrintTopPadding(mm: number) {
  if (typeof document === "undefined") return;
  document.documentElement.style.setProperty("--print-top-padding", `${mm}mm`);
}

export function applyPageMargins(topMm: number, bottomMm: number) {
  if (typeof document === "undefined") return;
  let style = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = `@media print { @page { size: A4 portrait; margin: ${topMm}mm 14mm ${bottomMm}mm 14mm; } }`;
}

function loadNum(key: string, fallback: number): number {
  if (typeof window === "undefined") return fallback;
  const v = window.localStorage.getItem(key);
  const n = v ? Number(v) : fallback;
  return Number.isFinite(n) ? n : fallback;
}

export function loadPrintTopPadding(): number {
  return loadNum(TOP_PAD_KEY, DEFAULT_TOP_PAD);
}

export function PrintSpacingControl() {
  const [topPad, setTopPad] = useState<number>(DEFAULT_TOP_PAD);
  const [pageTop, setPageTop] = useState<number>(DEFAULT_PAGE_TOP);
  const [pageBottom, setPageBottom] = useState<number>(DEFAULT_PAGE_BOTTOM);

  useEffect(() => {
    const tp = loadNum(TOP_PAD_KEY, DEFAULT_TOP_PAD);
    const pt = loadNum(PAGE_TOP_KEY, DEFAULT_PAGE_TOP);
    const pb = loadNum(PAGE_BOTTOM_KEY, DEFAULT_PAGE_BOTTOM);
    setTopPad(tp);
    setPageTop(pt);
    setPageBottom(pb);
    applyPrintTopPadding(tp);
    applyPageMargins(pt, pb);
  }, []);

  const updateTopPad = (v: number) => {
    setTopPad(v);
    applyPrintTopPadding(v);
    window.localStorage.setItem(TOP_PAD_KEY, String(v));
  };

  const updatePageTop = (v: number) => {
    setPageTop(v);
    applyPageMargins(v, pageBottom);
    window.localStorage.setItem(PAGE_TOP_KEY, String(v));
  };

  const updatePageBottom = (v: number) => {
    setPageBottom(v);
    applyPageMargins(pageTop, v);
    window.localStorage.setItem(PAGE_BOTTOM_KEY, String(v));
  };

  const resetAll = () => {
    updateTopPad(DEFAULT_TOP_PAD);
    updatePageTop(DEFAULT_PAGE_TOP);
    updatePageBottom(DEFAULT_PAGE_BOTTOM);
  };

  // A4 = 210 x 297 mm
  const pageW = 210;
  const pageH = 297;
  const topPct = (pageTop / pageH) * 100;
  const bottomPct = (pageBottom / pageH) * 100;
  const sideMm = 14;
  const sidePct = (sideMm / pageW) * 100;
  const contentTopOffset = (topPad / pageH) * 100;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost" className="h-8 gap-1" title="ضبط هوامش الطباعة">
          <Printer className="size-4" />
          <span className="text-xs hidden sm:inline">هوامش الطباعة</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[22rem]" align="end">
        <div className="space-y-4">
          {/* Live A4 preview */}
          <div className="flex justify-center">
            <div
              className="relative bg-white border border-border shadow-sm overflow-hidden"
              style={{ width: 160, aspectRatio: `${pageW} / ${pageH}` }}
              aria-label="معاينة الصفحة"
            >
              {/* Header band */}
              <div
                className="absolute inset-x-0 top-0 overflow-hidden bg-primary/10"
                style={{ height: `${topPct}%` }}
              >
                <img
                  src="/print-header.jpg"
                  alt=""
                  className="w-full h-full object-cover object-top"
                  onError={(e) => ((e.currentTarget.style.display = "none"))}
                />
              </div>
              {/* Footer band */}
              <div
                className="absolute inset-x-0 bottom-0 overflow-hidden bg-primary/10"
                style={{ height: `${bottomPct}%` }}
              >
                <img
                  src="/print-footer.jpg"
                  alt=""
                  className="w-full h-full object-cover object-bottom"
                  onError={(e) => ((e.currentTarget.style.display = "none"))}
                />
              </div>
              {/* Content area with side margins + top padding */}
              <div
                className="absolute"
                style={{
                  top: `calc(${topPct}% + ${contentTopOffset}%)`,
                  bottom: `${bottomPct}%`,
                  left: `${sidePct}%`,
                  right: `${sidePct}%`,
                }}
              >
                <div className="h-full border border-dashed border-primary/40 p-1 flex flex-col gap-[3px]">
                  <div className="h-[6px] w-3/4 bg-primary/60 rounded-sm" />
                  <div className="h-[3px] w-full bg-muted-foreground/40 rounded-sm" />
                  <div className="h-[3px] w-[92%] bg-muted-foreground/40 rounded-sm" />
                  <div className="h-[3px] w-[88%] bg-muted-foreground/40 rounded-sm" />
                  <div className="h-[3px] w-[80%] bg-muted-foreground/40 rounded-sm" />
                  <div className="mt-1 h-[3px] w-[70%] bg-muted-foreground/40 rounded-sm" />
                  <div className="h-[3px] w-[95%] bg-muted-foreground/40 rounded-sm" />
                  <div className="h-[3px] w-[85%] bg-muted-foreground/40 rounded-sm" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">هامش الرأس (أعلى الصفحة)</span>
              <span className="text-xs text-muted-foreground">{pageTop} مم</span>
            </div>
            <Slider
              value={[pageTop]}
              min={10}
              max={80}
              step={1}
              onValueChange={(v) => updatePageTop(v[0] ?? DEFAULT_PAGE_TOP)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">هامش التذييل (أسفل الصفحة)</span>
              <span className="text-xs text-muted-foreground">{pageBottom} مم</span>
            </div>
            <Slider
              value={[pageBottom]}
              min={5}
              max={60}
              step={1}
              onValueChange={(v) => updatePageBottom(v[0] ?? DEFAULT_PAGE_BOTTOM)}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">مسافة بداية المحتوى</span>
              <span className="text-xs text-muted-foreground">{topPad} مم</span>
            </div>
            <Slider
              value={[topPad]}
              min={0}
              max={60}
              step={1}
              onValueChange={(v) => updateTopPad(v[0] ?? 0)}
            />
          </div>

          <Button size="sm" variant="outline" className="w-full" onClick={resetAll}>
            إعادة الضبط الافتراضي
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
