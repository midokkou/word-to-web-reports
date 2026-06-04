import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import letterheadHeader from "@/assets/letterhead-header.jpg";
import letterheadFooter from "@/assets/letterhead-footer.png";

export function PrintLetterhead() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(
    <>
      <div className="print-letterhead-header" aria-hidden>
        <img src={letterheadHeader} alt="" />
      </div>
      <div className="print-letterhead-footer" aria-hidden>
        <img src={letterheadFooter} alt="" />
      </div>
    </>,
    document.body,
  );
}
