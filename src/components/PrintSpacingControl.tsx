import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Printer, RotateCcw, Plus, Trash2 } from "lucide-react";

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
  perPageEnabled: "print-per-page-enabled",
  pagesJSON: "print-pages-json",
} as const;

type PageMargins = {
  top: number;
  bottom: number;
  left: number;
  right: number;
  topPad: number;
  bottomPad: number;
};

const DEFAULT_MARGINS: PageMargins = { top: 48, bottom: 22, left: 14, right: 14, topPad: 0, bottomPad: 0 };

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
  perPageEnabled: true,
  pages: [
    { ...DEFAULT_MARGINS },
    { ...DEFAULT_MARGINS },
    { ...DEFAULT_MARGINS },
  ] as PageMargins[],
};

const STYLE_ID = "print-page-margins";

function hasPrintHiddenClass(el: HTMLElement): boolean {
  const cls = el.className || "";
  return typeof cls === "string" && /(^|\s)print:hidden(\s|$)/.test(cls);
}

function isPrintablePageElement(el: HTMLElement, mode: string | null = null): boolean {
  const isFollowup = el.getAttribute("data-print-section") === "followup";
  if (mode === "followup" && !isFollowup) return false;
  if (mode === "normal" && isFollowup) return false;
  if (hasPrintHiddenClass(el)) return false;
  if (el.tagName === "HEADER") return false;
  if (el.getAttribute("aria-hidden") === "true" && el.tagName !== "DIV") return false;
  if (el.matches?.("[data-sonner-toaster], [data-radix-popper-content-wrapper], [role='region'][aria-label*='toast' i]")) return false;
  if (el.offsetWidth === 0 && el.offsetHeight === 0) return false;
  return true;
}

function getPrintablePageElements(root: Element, mode: string | null = null): HTMLElement[] {
  const children = Array.from(root.children) as HTMLElement[];
  const marked = children.filter((el) => el.hasAttribute("data-print-page-section"));
  return (marked.length ? marked : children).filter((el) => isPrintablePageElement(el, mode));
}

function serializePreviewElement(el: HTMLElement): string {
  const clone = el.cloneNode(true) as HTMLElement;
  clone
    .querySelectorAll("script, .print\\:hidden, [data-radix-popper-content-wrapper], [role='dialog'], [data-sonner-toaster]")
    .forEach((n) => n.remove());
  return clone.outerHTML;
}

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
function loadPages(fallback: PageMargins[]): PageMargins[] {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(KEYS.pagesJSON);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return fallback;
    return parsed.map((m) => ({
      top: Number(m?.top) || 0,
      bottom: Number(m?.bottom) || 0,
      left: Number(m?.left) || 0,
      right: Number(m?.right) || 0,
      topPad: Number(m?.topPad) || 0,
      bottomPad: Number(m?.bottomPad) || 0,
    }));
  } catch {
    return fallback;
  }
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
  base: PageMargins;
  perPage: { enabled: boolean; pages: PageMargins[] };
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

  let perPageCSS = "";
  if (perPage.enabled && perPage.pages.length > 0) {
    // Named @page rules for each configured page
    const namedPages = perPage.pages
      .map((m, i) => `@page p${i + 1} { ${mk(m)} }`)
      .join(" ");
    // Target only printable sections tagged with data-print-page="N".
    // Using :nth-child here would incorrectly count Toaster, print:hidden
    // headers, and other non-printable siblings and produce blank pages.
    const childRules = perPage.pages
      .map((m, i) => {
        const n = i + 1;
        const padRule = `padding-top: ${m.topPad}mm !important; padding-bottom: ${m.bottomPad}mm !important;`;
        return `.form-page > [data-print-page="${n}"] { page: p${n} !important; ${padRule} }`;
      })
      .join(" ");
    // Any printable section beyond the configured count inherits the last
    // page's margins while still starting on its own printed page.
    const last = perPage.pages.length;
    const lastMargins = perPage.pages[last - 1];
    const fallback = `.form-page > [data-print-page-overflow] { page: p${last} !important; padding-top: ${lastMargins.topPad}mm !important; padding-bottom: ${lastMargins.bottomPad}mm !important; }`;
    const breakCSS = `.form-page > [data-print-page-break="1"] { break-before: page !important; page-break-before: always !important; }`;
    perPageCSS = `${namedPages} ${childRules} ${fallback} ${breakCSS}`;
  }

  // Use the first configured page as @page base when per-page is enabled, so
  // any uncategorised content still gets sensible margins.
  const baseRule = perPage.enabled && perPage.pages[0] ? perPage.pages[0] : base;

  style.textContent = `@media print {
    @page { ${mk(baseRule)} }
    ${perPageCSS}
    ${headerCSS}
    ${footerCSS}
    body { font-size: calc(10.5pt * var(--print-font-scale, 1)) !important; line-height: var(--print-line-height, 1.55) !important; }
    main, [data-view-frame] { padding-bottom: var(--print-bottom-padding, 0mm) !important; }
    /* منع اقتصاص العناصر بين الصفحات */
    table, .form-items-table { border-collapse: collapse !important; }
    thead { display: table-header-group !important; }
    tfoot { display: table-footer-group !important; }
    tr, td, th { break-inside: avoid !important; page-break-inside: avoid !important; }
    img, svg, figure, picture { break-inside: avoid !important; page-break-inside: avoid !important; max-width: 100% !important; }
    h1, h2, h3, h4, h5, h6 { break-after: avoid !important; page-break-after: avoid !important; break-inside: avoid !important; }
    p, li, blockquote { orphans: 3; widows: 3; break-inside: avoid !important; page-break-inside: avoid !important; }
    .card, [data-card], .form-item, [data-print-keep], .avoid-break { break-inside: avoid !important; page-break-inside: avoid !important; }
    [data-print-page-section] > * { break-inside: avoid-page; }
  }`;
}

export function loadPrintTopPadding(): number {
  return loadNum(KEYS.topPad, D.topPad);
}

type State = {
  topPad: number;
  bottomPad: number;
  pageTop: number;
  pageBottom: number;
  pageLeft: number;
  pageRight: number;
  fontScale: number;
  lineHeight: number;
  showHeader: boolean;
  showFooter: boolean;
  orientation: "portrait" | "landscape";
  perPageEnabled: boolean;
  pages: PageMargins[];
};

const PRESETS: Record<string, Partial<State>> = {
  compact: { pageTop: 30, pageBottom: 15, pageLeft: 10, pageRight: 10, topPad: 0, bottomPad: 0, fontScale: 90, lineHeight: 1.4 },
  standard: { pageTop: 48, pageBottom: 22, pageLeft: 14, pageRight: 14, topPad: 0, bottomPad: 0, fontScale: 100, lineHeight: 1.55 },
  spacious: { pageTop: 60, pageBottom: 35, pageLeft: 20, pageRight: 20, topPad: 5, bottomPad: 5, fontScale: 110, lineHeight: 1.7 },
};

export function PrintSpacingControl() {
  const [s, setS] = useState<State>(D);
  const [open, setOpen] = useState(false);
  const [scale, setScale] = useState(0.2);
  const [previewHTML, setPreviewHTML] = useState<string>("");
  const [activePageIdx, setActivePageIdx] = useState(0);

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
      orientation: loadStr(KEYS.orientation, D.orientation) as State["orientation"],
      perPageEnabled: true,
      pages: loadPages(D.pages),
    };
    setS(next);
    applyAll(next);
  }, []);

  // Tag printable direct children of .form-page with data-print-page="N"
  // before every print so per-page CSS targets only visible sections (skipping
  // Toaster, print:hidden header, etc.). This prevents blank printed pages.
  useEffect(() => {
    function tagPrintablePages() {
      const root = document.querySelector(".form-page");
      if (!root) return;
      // Clean previous tags first
      root.querySelectorAll("[data-print-page], [data-print-page-overflow], [data-print-page-break]").forEach((el) => {
        el.removeAttribute("data-print-page");
        el.removeAttribute("data-print-page-overflow");
        el.removeAttribute("data-print-page-break");
      });
      const printMode = document.body.getAttribute("data-print-mode") === "followup" ? "followup" : "normal";
      const allPages = getPrintablePageElements(root);
      const pages = getPrintablePageElements(root, printMode);
      const lastPageNum = s.perPageEnabled ? s.pages.length : Infinity;
      for (const el of pages) {
        const idx = allPages.indexOf(el) + 1;
        if (idx <= lastPageNum) {
          el.setAttribute("data-print-page", String(idx));
        } else {
          el.setAttribute("data-print-page-overflow", "");
        }
        if (printMode !== "followup" && idx > 1) el.setAttribute("data-print-page-break", "1");
      }
    }
    window.addEventListener("beforeprint", tagPrintablePages);
    // Also tag on mount/changes so the preview reflects pagination immediately
    tagPrintablePages();
    return () => window.removeEventListener("beforeprint", tagPrintablePages);
  }, [s.perPageEnabled, s.pages.length]);

  useEffect(() => {
    const root = document.querySelector(".form-page");
    if (!root || !s.perPageEnabled) return;
    const printableCount = getPrintablePageElements(root).length;
    if (printableCount <= s.pages.length) return;
    const seed = s.pages[s.pages.length - 1] ?? { top: s.pageTop, bottom: s.pageBottom, left: s.pageLeft, right: s.pageRight, topPad: s.topPad, bottomPad: s.bottomPad };
    const pages = [...s.pages];
    while (pages.length < printableCount) pages.push({ ...seed });
    commit({ ...s, pages });
  }, [open, s.perPageEnabled, s.pages.length]);


  function persistSimple(next: State) {
    window.localStorage.setItem(KEYS.topPad, String(next.topPad));
    window.localStorage.setItem(KEYS.bottomPad, String(next.bottomPad));
    window.localStorage.setItem(KEYS.pageTop, String(next.pageTop));
    window.localStorage.setItem(KEYS.pageBottom, String(next.pageBottom));
    window.localStorage.setItem(KEYS.pageLeft, String(next.pageLeft));
    window.localStorage.setItem(KEYS.pageRight, String(next.pageRight));
    window.localStorage.setItem(KEYS.fontScale, String(next.fontScale));
    window.localStorage.setItem(KEYS.lineHeight, String(next.lineHeight));
    window.localStorage.setItem(KEYS.showHeader, next.showHeader ? "1" : "0");
    window.localStorage.setItem(KEYS.showFooter, next.showFooter ? "1" : "0");
    window.localStorage.setItem(KEYS.orientation, next.orientation);
    window.localStorage.setItem(KEYS.perPageEnabled, next.perPageEnabled ? "1" : "0");
    window.localStorage.setItem(KEYS.pagesJSON, JSON.stringify(next.pages));
  }

  function applyAll(next: State) {
    applyPrintTopPadding(next.topPad);
    applyPrintBottomPadding(next.bottomPad);
    applyFontScale(next.fontScale);
    applyLineHeight(next.lineHeight);
    applyPageStyle({
      base: { top: next.pageTop, bottom: next.pageBottom, left: next.pageLeft, right: next.pageRight, topPad: next.topPad, bottomPad: next.bottomPad },
      perPage: { enabled: next.perPageEnabled, pages: next.pages },
      showHeader: next.showHeader,
      showFooter: next.showFooter,
      orientation: next.orientation,
    });
  }

  function commit(next: State) {
    setS(next);
    applyAll(next);
    persistSimple(next);
  }

  function update<K extends keyof State>(key: K, value: State[K]) {
    commit({ ...s, [key]: value });
  }

  function togglePerPage(v: boolean) {
    let next: State = { ...s, perPageEnabled: v };
    if (v && (!next.pages || next.pages.length === 0)) {
      // Seed pages from current base margins
      const base: PageMargins = { top: s.pageTop, bottom: s.pageBottom, left: s.pageLeft, right: s.pageRight, topPad: s.topPad, bottomPad: s.bottomPad };
      next = { ...next, pages: [{ ...base }, { ...base }] };
    }
    commit(next);
  }

  function updatePageMargin(idx: number, key: keyof PageMargins, value: number) {
    const pages = s.pages.map((p, i) => (i === idx ? { ...p, [key]: value } : p));
    commit({ ...s, pages });
  }

  function addPage() {
    const seed = s.pages[s.pages.length - 1] ?? { top: s.pageTop, bottom: s.pageBottom, left: s.pageLeft, right: s.pageRight, topPad: s.topPad, bottomPad: s.bottomPad };
    const pages = [...s.pages, { ...seed }];
    const next = { ...s, pages };
    commit(next);
    setActivePageIdx(pages.length - 1);
  }

  function removePage(idx: number) {
    if (s.pages.length <= 1) return;
    const pages = s.pages.filter((_, i) => i !== idx);
    commit({ ...s, pages });
    setActivePageIdx((cur) => Math.min(cur, pages.length - 1));
  }

  function applyPreset(name: keyof typeof PRESETS) {
    const preset = PRESETS[name];
    const next = {
      ...s,
      ...preset,
      pages: s.pages.map((page) => ({
        ...page,
        top: preset.pageTop ?? page.top,
        bottom: preset.pageBottom ?? page.bottom,
        left: preset.pageLeft ?? page.left,
        right: preset.pageRight ?? page.right,
        topPad: preset.topPad ?? page.topPad,
        bottomPad: preset.bottomPad ?? page.bottomPad,
      })),
    } as State;
    commit(next);
  }

  function resetAll() {
    commit(D);
    setActivePageIdx(0);
  }

  const isLandscape = s.orientation === "landscape";
  const pageW = isLandscape ? 297 : 210;
  const pageH = isLandscape ? 210 : 297;

  const activeMargins: PageMargins = s.perPageEnabled && s.pages[activePageIdx]
    ? s.pages[activePageIdx]
    : { top: s.pageTop, bottom: s.pageBottom, left: s.pageLeft, right: s.pageRight, topPad: s.topPad, bottomPad: s.bottomPad };

  const topPct = (activeMargins.top / pageH) * 100;
  const bottomPct = (activeMargins.bottom / pageH) * 100;
  const leftPct = (activeMargins.left / pageW) * 100;
  const rightPct = (activeMargins.right / pageW) * 100;
  const contentTopOffset = (activeMargins.topPad / pageH) * 100;
  const contentBottomOffset = (activeMargins.bottomPad / pageH) * 100;
  const previewWidth = isLandscape ? 280 : 220;
  const contentAreaWidthPx = previewWidth * (1 - (activeMargins.left + activeMargins.right) / pageW);

  useEffect(() => {
    if (!open) return;
    const root = document.querySelector(".form-page") as HTMLElement | null;
    if (!root) return;
    const pages = getPrintablePageElements(root);
    const activePage = pages[activePageIdx] ?? pages[0];
    if (!activePage) return;
    const mainW = activePage.offsetWidth || root.offsetWidth || 800;
    setScale(contentAreaWidthPx / mainW);
    setPreviewHTML(serializePreviewElement(activePage));
  }, [open, activePageIdx, contentAreaWidthPx, s.fontScale, s.lineHeight, s.pages, s.perPageEnabled, s.orientation]);

  const current = s.pages[activePageIdx] ?? activeMargins;

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
              <div className="absolute overflow-hidden" style={{ top: `calc(${topPct}% + ${contentTopOffset}%)`, bottom: `calc(${bottomPct}% + ${contentBottomOffset}%)`, left: `${leftPct}%`, right: `${rightPct}%` }}>
                <div
                  dir="rtl"
                  style={{ transform: `scale(${scale})`, transformOrigin: "top right", width: `${100 / scale}%`, pointerEvents: "none", fontSize: `${s.fontScale}%`, lineHeight: s.lineHeight }}
                  dangerouslySetInnerHTML={{ __html: previewHTML }}
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
                  <span className="text-sm font-medium">هوامش مستقلة لكل صفحة</span>
                  <span className="text-[10px] text-muted-foreground">كل صفحة لها إعدادات منفصلة بالكامل</span>
                </div>
                <span className="text-[10px] font-bold text-primary bg-primary/10 rounded px-2 py-1">مفعّل</span>
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
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 flex flex-wrap gap-1">
                      {s.pages.map((_, i) => (
                        <Button
                          key={i}
                          size="sm"
                          variant={activePageIdx === i ? "default" : "outline"}
                          className="h-7 text-xs px-2"
                          onClick={() => setActivePageIdx(i)}
                        >
                          صفحة {i + 1}
                        </Button>
                      ))}
                      <Button size="sm" variant="ghost" className="h-7 text-xs px-2 gap-1" onClick={addPage} title="إضافة صفحة">
                        <Plus className="size-3.5" />
                      </Button>
                    </div>
                    {s.pages.length > 1 && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-destructive hover:text-destructive"
                        onClick={() => removePage(activePageIdx)}
                        title="حذف هذه الصفحة"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>

                  <div className="rounded-md border bg-muted/20 p-2 space-y-3">
                    <div className="text-xs font-medium text-muted-foreground">إعدادات الصفحة {activePageIdx + 1}</div>
                    <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">هوامش الصفحة</div>
                    <SliderRow label="هامش الرأس (أعلى)" value={current.top} unit="مم" min={5} max={90} onChange={(v) => updatePageMargin(activePageIdx, "top", v)} />
                    <SliderRow label="هامش التذييل (أسفل)" value={current.bottom} unit="مم" min={5} max={70} onChange={(v) => updatePageMargin(activePageIdx, "bottom", v)} />
                    <SliderRow label="الهامش الأيمن" value={current.right} unit="مم" min={5} max={50} onChange={(v) => updatePageMargin(activePageIdx, "right", v)} />
                    <SliderRow label="الهامش الأيسر" value={current.left} unit="مم" min={5} max={50} onChange={(v) => updatePageMargin(activePageIdx, "left", v)} />
                    <div className="pt-2 border-t border-border/60 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">المحتوى والتذييل</div>
                    <SliderRow label="مسافة بداية المحتوى" value={current.topPad} unit="مم" min={0} max={60} onChange={(v) => updatePageMargin(activePageIdx, "topPad", v)} />
                    <SliderRow label="مسافة نهاية المحتوى" value={current.bottomPad} unit="مم" min={0} max={60} onChange={(v) => updatePageMargin(activePageIdx, "bottomPad", v)} />
                  </div>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    ملاحظة: كل قسم رئيسي من الاستمارة يُطبع كصفحة مستقلة بإعداداتها الخاصة (هوامش + بداية محتوى + نهاية تذييل). الصفحات الإضافية بعد آخر إعداد ترث إعدادات آخر صفحة معرّفة.
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
