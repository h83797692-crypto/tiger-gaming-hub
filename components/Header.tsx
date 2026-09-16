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
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
        <Link href="/" className="tiger-logo text-3xl font-black uppercase tracking-widest">
          {siteName}
        </Link>

        {/* Logical scroll + logical spacing so the nav mirrors under RTL. */}
        <nav className="-mx-1 flex max-w-full items-center gap-4 overflow-x-auto px-1 text-xs text-[#00F0FF] md:gap-7 md:text-sm">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap text-[#00F0FF] drop-shadow-[0_0_8px_rgba(0,240,255,0.6)] transition-colors duration-300 hover:text-[#FF2E54]"
            >
              {item.label}
            </Link>
          ))}
          <Link href="/admin" className="admin-gear-link text-[#00F0FF] drop-shadow-[0_0_8px_rgba(0,240,255,0.6)] transition-colors duration-300 hover:text-[#FF2E54]" aria-label="لوحة التحكم" title="لوحة التحكم">
            <Settings size={16} strokeWidth={2.2} aria-hidden="true" />
          </Link>
          <SocialHubModal links={socialLinks} />
        </nav>
      </div>
    </header>
  );
}
