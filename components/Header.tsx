"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { ChevronLeft, CircleUserRound, Globe2, Gamepad2, Home, Menu, Moon, Settings, ShoppingBag, Sun, Trophy, Video, X, Zap, CircleHelp, Youtube } from "lucide-react";
import { PublicAuthButton } from "@/components/PublicAuthButton";

const NAV = [
  { href: "/", label: "الرئيسية", icon: Home, tone: "cyan" },
  { href: "/#games", label: "الألعاب", icon: Gamepad2, tone: "orange" },
  { href: "/#tournaments", label: "البطولات", icon: Trophy, tone: "amber", badge: "NEW" },
  { href: "/#battle-pass", label: "باتل باس", icon: Zap, tone: "pink" },
  { href: "/#media", label: "الفيديو", icon: Video, tone: "violet" },
  { href: "/rewards", label: "متجر XP", icon: ShoppingBag, tone: "amber" },
];

const XP_GUIDE = { href: "/xp", label: "نظام XP", icon: CircleHelp, tone: "cyan" };

export function Header({ siteName, socialLinks }: { siteName: string; socialLinks?: { instagram?: string; tiktok?: string } }) {
  const { data: session } = useSession();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const storedMode = window.localStorage.getItem("tiger-color-mode");
    const lightMode = storedMode === "light";
    setIsLightMode(lightMode);
    document.documentElement.classList.toggle("dark", !lightMode);
  }, []);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflow = isDrawerOpen ? "hidden" : "";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDrawer();
    };

    if (isDrawerOpen) window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDrawerOpen]);

  const closeDrawer = () => setIsDrawerOpen(false);
  const toggleColorMode = () => {
    setIsLightMode((current) => {
      const next = !current;
      document.documentElement.classList.toggle("dark", !next);
      window.localStorage.setItem("tiger-color-mode", next ? "light" : "dark");
      return next;
    });
  };

  return (
    <header className="site-header sticky top-0 z-50">
      <div className="site-header__bar mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3 sm:px-4 md:px-6 md:py-4">
        <Link href="/" className="tiger-logo text-xl font-black uppercase tracking-widest sm:text-2xl md:text-3xl">
          {siteName}
        </Link>

        <nav className="site-header__nav" aria-label="التنقل الرئيسي">
          {NAV.map((item) => <Link key={item.href} href={item.href} className="site-header__link">{item.label}</Link>)}
        </nav>

        <button type="button" className="site-header__menu inline-grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-cyan-400/40 bg-cyan-400/10 text-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.12)]" onClick={() => setIsDrawerOpen(true)} aria-label="فتح القائمة" aria-expanded={isDrawerOpen} aria-controls="site-navigation-drawer">
          <Menu size={20} aria-hidden="true" />
        </button>
      </div>

      {mounted && createPortal(<div className={`site-drawer fixed inset-0 z-[10000] ${isDrawerOpen ? "is-open visible pointer-events-auto" : "invisible pointer-events-none"}`} aria-hidden={!isDrawerOpen}>
        <button type="button" className="site-drawer__backdrop fixed inset-0 z-[998] bg-black/80 backdrop-blur-sm" onClick={closeDrawer} tabIndex={isDrawerOpen ? 0 : -1} aria-label="إغلاق القائمة" />
        <aside id="site-navigation-drawer" className={`site-drawer__panel fixed top-0 left-0 z-[9999] h-full w-80 max-w-[88vw] border-r border-slate-800 bg-slate-900 p-6 shadow-2xl transition-transform duration-300 ${isDrawerOpen ? "translate-x-0" : "-translate-x-full"}`} aria-label="القائمة الرئيسية" aria-modal="true" role="dialog" dir="ltr">
          <div className="site-drawer__topbar">
            <div className="site-drawer__tools">
              <button type="button" className="site-drawer__circle" onClick={toggleColorMode} aria-label="تبديل المظهر" aria-pressed={isLightMode}>
                {isLightMode ? <Moon size={17} aria-hidden="true" /> : <Sun size={17} aria-hidden="true" />}
              </button>
              <button type="button" className="site-drawer__circle" aria-label="تغيير اللغة">
                <Globe2 size={17} aria-hidden="true" />
              </button>
            </div>
            <Link href="/" className="site-drawer__brand" onClick={closeDrawer}>{siteName}</Link>
            <button type="button" className="site-drawer__circle site-drawer__close" onClick={closeDrawer} aria-label="إغلاق القائمة">
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          <nav className="site-drawer__nav">
            {NAV.map((item) => {
              const Icon = item.icon;
              return <Link key={item.href} href={item.href} className={`site-drawer__link site-drawer__link--${item.tone}`} onClick={closeDrawer}>
                <span className="site-drawer__link-icon"><Icon size={18} aria-hidden="true" /></span>
                <span>{item.label}</span>
                <ChevronLeft className="site-drawer__link-arrow" size={16} aria-hidden="true" />
              </Link>;
            })}
            <Link href={XP_GUIDE.href} className={`site-drawer__link site-drawer__link--${XP_GUIDE.tone}`} onClick={closeDrawer}>
              <span className="site-drawer__link-icon"><XP_GUIDE.icon size={18} aria-hidden="true" /></span>
              <span>{XP_GUIDE.label}</span>
              <ChevronLeft className="site-drawer__link-arrow" size={16} aria-hidden="true" />
            </Link>
            {session?.user?.role === "admin" && <Link href="/admin" className="site-drawer__link site-drawer__link--cyan" onClick={closeDrawer}>
              <span className="site-drawer__link-icon"><Settings size={18} aria-hidden="true" /></span>
              <span>لوحة التحكم</span>
              <ChevronLeft className="site-drawer__link-arrow" size={16} aria-hidden="true" />
            </Link>}
          </nav>

          <div className="site-drawer__quick-actions">
            <PublicAuthButton />
            <a
              href="https://www.youtube.com/@tiger.ggaming"
              target="_blank"
              rel="noopener noreferrer"
              className="site-drawer__youtube-link"
            >
              <Youtube size={17} aria-hidden="true" />
              <span>اشتراك في قناتنا على يوتيوب</span>
            </a>
          </div>

          <div className="site-drawer__footer">
            <div className="site-drawer__profile">
              <span className="site-drawer__avatar">{session?.user?.image ? <img src={session.user.image} alt="" className="h-full w-full rounded-full object-cover" /> : <CircleUserRound size={22} aria-hidden="true" />}</span>
              <span className="site-drawer__profile-copy"><strong>{session?.user?.name || "زائر Tiger"}</strong><small>{session?.user ? "PLAYER PROFILE" : "FREE PLAN"}</small></span>
              <ChevronLeft size={16} aria-hidden="true" />
            </div>
            <div className="site-drawer__auth">
              <strong>{session?.user ? "حساب اللاعب" : "انضم إلى المجتمع"}</strong>
              <p>{session?.user ? "افتح ملفك وتابع تقدمك في XP." : "سجّل الدخول واحفظ تقدمك ومكافآتك."}</p>
              <div className="site-drawer__auth-actions [&>button]:w-full">
                {!session?.user && <Link href="/profile" onClick={closeDrawer} className="site-drawer__create-account"><CircleUserRound size={16} /> إنشاء حساب</Link>}
              </div>
            </div>
          </div>
        </aside>
      </div>, document.body)}
    </header>
  );
}
