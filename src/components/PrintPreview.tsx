import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, Printer } from "lucide-react";

export function PrintPreview() {
  const [open, setOpen] = useState(false);
  const [srcdoc, setSrcdoc] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!open) {
      setSrcdoc("");
      return;
    }

    const formPage = document.querySelector(".form-page");
    if (!formPage) return;

    // Collect all stylesheets & inline styles from current document so the
    // iframe matches the live print styles exactly.
    const styles = Array.from(
      document.head.querySelectorAll('link[rel="stylesheet"], style'),
    )
      .map((el) => el.outerHTML)
      .join("\n");

    // Also include the dynamic <style> tags injected by PrintSettings (which
    // live inside the form page tree, not in <head>).
    const inlineStyles = Array.from(document.querySelectorAll("body style"))
      .map((el) => el.outerHTML)
      .join("\n");

    const baseHref = window.location.origin + window.location.pathname;
    const clone = formPage.cloneNode(true) as HTMLElement;
    clone.querySelectorAll(".print\\:hidden").forEach((el) => el.remove());

    const DEFAULTS = { marginTop: 42, marginRight: 12, marginBottom: 28, marginLeft: 12, headerHeight: 42, footerHeight: 28, contentPaddingTop: 0, contentPaddingRight: 0, contentPaddingBottom: 0, contentPaddingLeft: 0 };
    let s = DEFAULTS;
    try {
      const raw = localStorage.getItem("print-settings-v1");
      if (raw) s = { ...DEFAULTS, ...JSON.parse(raw) };
    } catch { /* ignore */ }

    const effTop = Math.max(s.marginTop, s.headerHeight);
    const effBottom = Math.max(s.marginBottom, s.footerHeight);

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="utf-8">
<base href="${baseHref}">
${styles}
${inlineStyles}
<style>
  html, body { margin: 0; padding: 0; background: #525659; }
  :root { --print-page-top: ${s.headerHeight}mm; --print-page-bottom: ${s.footerHeight}mm; }
  .preview-stage { padding: 20px 0; display: flex; flex-direction: column; align-items: center; gap: 16px; }
  .pagedjs_pages { display: flex; flex-direction: column; align-items: center; gap: 16px; }
  .pagedjs_page { background: white; box-shadow: 0 6px 18px rgba(0,0,0,0.35); margin: 0 !important; }
  @page {
    size: A4;
    margin: ${effTop}mm ${s.marginRight}mm ${effBottom}mm ${s.marginLeft}mm;
  }
  .print-letterhead-header { height: ${s.headerHeight}mm !important; }
  .print-letterhead-footer { height: ${s.footerHeight}mm !important; }
  .pagedjs_page .form-page { padding: ${s.contentPaddingTop}mm ${s.contentPaddingRight}mm ${s.contentPaddingBottom}mm ${s.contentPaddingLeft}mm !important; }
  .pagedjs_page .print-letterhead-header,
  .pagedjs_page .print-letterhead-footer { display: block !important; position: absolute !important; left: 0 !important; right: 0 !important; }
  .pagedjs_page .print-letterhead-header { top: 0 !important; }
  .pagedjs_page .print-letterhead-footer { bottom: 0 !important; }
  /* Visualize margins and printable area */
  .pagedjs_pagebox { position: relative; }
  .pagedjs_margin-top, .pagedjs_margin-bottom,
  .pagedjs_margin-left, .pagedjs_margin-right {
    background: repeating-linear-gradient(45deg, rgba(59,130,246,0.08) 0 6px, transparent 6px 12px);
    outline: 1px dashed hsl(217 91% 60% / 0.4);
  }
  .pagedjs_area { outline: 2px dashed hsl(217 91% 55% / 0.85); outline-offset: 0; box-shadow: 0 0 0 9999px rgba(59,130,246,0.04) inset; }
  .pagedjs_area::before {
    content: "منطقة الطباعة";
    position: absolute; top: -20px; right: 0;
    font-size: 10px; color: white;
    background: hsl(217 91% 55%); padding: 2px 8px; border-radius: 3px;
  }
</style>
</head>
<body>
<div class="preview-stage">
${clone.outerHTML}
</div>
<script src="https://unpkg.com/pagedjs/dist/paged.polyfill.js"></script>
</body>
</html>`;

    setSrcdoc(html);
  }, [open]);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="print:hidden"
      >
        <Eye className="size-4 ml-1" /> معاينة
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] p-0 flex flex-col gap-0">
          <DialogHeader className="px-4 py-2 border-b flex-row items-center justify-between space-y-0">
            <DialogTitle>معاينة قبل الطباعة</DialogTitle>
            <Button
              size="sm"
              onClick={() => iframeRef.current?.contentWindow?.print()}
            >
              <Printer className="size-4 ml-1" /> طباعة
            </Button>
          </DialogHeader>
          {srcdoc ? (
            <iframe
              ref={iframeRef}
              srcDoc={srcdoc}
              className="flex-1 w-full border-0 bg-[#525659]"
              title="معاينة الطباعة"
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              جاري التحميل...
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
