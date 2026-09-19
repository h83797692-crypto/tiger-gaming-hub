"use client";

import { Palette } from "lucide-react";
import { useEffect, useState } from "react";

const THEMES = [
  { id: "neon", label: "الأزرق الأسطوري" },
  { id: "inferno", label: "البرتقالي الناري" },
  { id: "cyber", label: "الأخضر السايبر" },
] as const;

type ThemeId = (typeof THEMES)[number]["id"];

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeId>("neon");
  useEffect(() => {
    const stored = window.localStorage.getItem("tiger-theme") as ThemeId | null;
    const next = THEMES.some((item) => item.id === stored) ? stored! : "neon";
    setTheme(next);
    document.documentElement.dataset.theme = next;
  }, []);

  function selectTheme(next: ThemeId) {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("tiger-theme", next);
  }

  return <div className="theme-switcher" dir="rtl"><Palette size={16} aria-hidden="true" /><select value={theme} onChange={(event) => selectTheme(event.target.value as ThemeId)} aria-label="اختيار ثيم المنصة" title="اختيار الثيم"><option value="neon">أزرق أسطوري</option><option value="inferno">برتقالي ناري</option><option value="cyber">أخضر سايبر</option></select></div>;
}
