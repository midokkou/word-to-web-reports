import { useEffect, useState } from "react";
import { Palette, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { THEMES, applyTheme, loadTheme, type ThemeName } from "@/lib/theme";

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeName>("teal");

  useEffect(() => {
    const t = loadTheme();
    setTheme(t);
    applyTheme(t);
  }, []);

  const choose = (t: ThemeName) => {
    setTheme(t);
    applyTheme(t);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="rounded-full size-10 print:hidden"
          aria-label="تغيير لون الثيم"
        >
          <Palette className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-60">
        <div className="text-sm font-semibold mb-3">اختر لون الثيم</div>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => choose(t.id)}
              className="group flex flex-col items-center gap-1.5 p-2 rounded-lg hover:bg-accent transition"
            >
              <span
                className="size-9 rounded-full ring-2 ring-border flex items-center justify-center text-white shadow-sm"
                style={{ background: t.swatch }}
              >
                {theme === t.id && <Check className="size-4" />}
              </span>
              <span className="text-xs">{t.label}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
