import { useEffect, useState } from "react";
import defaultLogo from "@/assets/moe-logo.png";

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
  return (
    <div className={`shrink-0 bg-transparent rounded-lg ${className}`}>
      <img
        src={logo}
        alt="شعار"
        className="h-12 w-auto sm:h-14 block bg-transparent mix-blend-multiply"
      />
    </div>
  );
}
