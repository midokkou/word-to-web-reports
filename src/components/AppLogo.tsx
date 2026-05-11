import { useEffect, useRef, useState } from "react";
import defaultLogo from "@/assets/moe-logo.png";
import { toast } from "sonner";

const KEY = "app:logo";

export function useLogo() {
  const [logo, setLogo] = useState<string>(defaultLogo);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setLogo(saved);
    } catch {}
    const handler = (e: Event) => {
      const v = (e as CustomEvent<string>).detail;
      setLogo(v || defaultLogo);
    };
    window.addEventListener("app:logo-change", handler);
    return () => window.removeEventListener("app:logo-change", handler);
  }, []);
  return logo;
}

export function AppLogo({ className = "" }: { className?: string }) {
  const logo = useLogo();
  const inputRef = useRef<HTMLInputElement>(null);

  const onPick = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("الرجاء اختيار ملف صورة");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      try {
        localStorage.setItem(KEY, dataUrl);
        window.dispatchEvent(new CustomEvent("app:logo-change", { detail: dataUrl }));
        toast.success("تم تحديث الشعار");
      } catch {
        toast.error("الصورة كبيرة جداً");
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        title="اضغط لاستبدال الشعار"
        className={`group relative shrink-0 bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg ${className}`}
      >
        <img
          src={logo}
          alt="شعار"
          className="h-12 w-auto sm:h-14 block bg-transparent mix-blend-multiply"
        />
        <span className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/40 transition-colors flex items-center justify-center text-[10px] font-bold text-transparent group-hover:text-background">
          استبدال
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
    </>
  );
}
