"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function AdminNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (pathname === "/admin/login") return null;

  return (
    <header className="border-b border-white/5 bg-tiger-panel/50">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4">
        <Link href="/admin" className="text-sm font-black tracking-[0.14em] text-[#00F0FF] drop-shadow-[0_0_8px_rgba(0,240,255,0.6)] transition-colors duration-300 hover:text-[#FF2E54]">
          TIGER CONTROL ROOM
        </Link>

        <div className="flex items-center gap-3 text-xs text-[#00F0FF]">
          {session?.user?.email && <span className="hidden sm:inline">{session.user.email}</span>}
          <Link href="/" className="text-[#00F0FF] drop-shadow-[0_0_8px_rgba(0,240,255,0.6)] transition-colors duration-300 hover:text-[#FF2E54]">
            عرض الموقع
          </Link>
          <Link href="/admin/settings" className="text-[#00F0FF] drop-shadow-[0_0_8px_rgba(0,240,255,0.6)] transition-colors duration-300 hover:text-[#FF2E54]">
            إعدادات التواصل
          </Link>
          <Button className="text-[#00F0FF] drop-shadow-[0_0_8px_rgba(0,240,255,0.6)] transition-colors duration-300 hover:text-[#FF2E54]" variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/admin/login" })}>
            خروج
          </Button>
        </div>
      </div>
    </header>
  );
}
