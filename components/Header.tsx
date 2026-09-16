import Link from "next/link";
import { Settings } from "lucide-react";
import { SocialHubModal } from "@/components/SocialHubModal";

const NAV = [
  { href: "/", label: "الرئيسية" },
  { href: "/#games", label: "الألعاب" },
  { href: "/#tournaments", label: "البطولات" },
  { href: "/#battle-pass", label: "باتل باس" },
  { href: "/#media", label: "الفيديو" },
];

export function Header({ siteName, socialLinks }: { siteName: string; socialLinks?: { instagram?: string; tiktok?: string } }) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-tiger-void/85 backdrop-blur-xl">
      <div className="header-shell mx-auto flex max-w-6xl items-center justify-between gap-3 px-3 py-3 sm:px-4 md:px-6 md:py-4">
        <Link href="/" className="tiger-logo text-xl font-black uppercase tracking-widest sm:text-2xl md:text-3xl">
          {siteName}
        </Link>

        <div className="header-actions flex items-center gap-2 sm:gap-3">
          <nav className="header-nav flex flex-wrap items-center justify-center gap-2 text-xs text-[#00F0FF] md:gap-4 md:text-sm">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="header-link whitespace-nowrap text-[#00F0FF] drop-shadow-[0_0_8px_rgba(0,240,255,0.6)] transition-colors duration-300 hover:text-[#FF2E54]"
              >
                {item.label}
              </Link>
            ))}
            <Link href="/admin" className="admin-gear-link inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#00F0FF]/40 bg-[#0b1220] text-[#00F0FF] shadow-[0_0_18px_rgba(0,240,255,0.2)] transition-colors duration-300 hover:text-[#FF2E54]" aria-label="لوحة التحكم" title="لوحة التحكم">
              <Settings size={16} strokeWidth={2.2} aria-hidden="true" />
            </Link>
          </nav>

          <div className="header-social-group flex items-center gap-2">
            <SocialHubModal links={socialLinks} />
          </div>
        </div>
      </div>
    </header>
  );
}
