"use client";

import Link from "next/link";
import { useState } from "react";
import { Chrome, ChevronDown, LogOut, UserRound } from "lucide-react";
import { signIn, signOut, useSession } from "next-auth/react";

export function PublicAuthButton() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  async function startGoogleLogin() {
    await signIn("google", { callbackUrl: "/profile" }, { prompt: "select_account", access_type: "offline" });
  }
  if (status === "loading") return null;

  if (session?.user) {
    const displayName = session.user.name || "ملف اللاعب";
    const initials = displayName.trim().charAt(0).toUpperCase() || "T";
    return (
      <div className="relative" dir="rtl">
        <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/80 p-1 pe-2 text-white transition hover:border-[#00F0FF]/60" aria-expanded={open} aria-haspopup="menu" aria-label="قائمة حساب اللاعب">
          <span className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-[#00F0FF]/50 bg-[#132438] text-xs font-black text-[#00F0FF]">
            {session.user.image ? <img src={session.user.image} alt="" className="h-full w-full object-cover" /> : initials}
          </span>
          <span className="hidden max-w-24 truncate text-xs font-bold sm:inline">{displayName}</span>
          <ChevronDown size={14} className={open ? "rotate-180 transition-transform" : "transition-transform"} aria-hidden="true" />
        </button>
        {open && <div className="absolute end-0 top-[calc(100%+0.5rem)] z-50 min-w-48 rounded-xl border border-white/10 bg-[#0d121f] p-1 shadow-2xl" role="menu">
          <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 hover:bg-white/5 hover:text-[#00F0FF]" role="menuitem"><UserRound size={15} /> ملف اللاعب</Link>
          <button type="button" onClick={() => void signOut({ callbackUrl: window.location.href })} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-[#FF2E54]/10 hover:text-[#FF2E54]" role="menuitem"><LogOut size={15} /> تسجيل الخروج</button>
        </div>}
      </div>
    );
  }

  return (
    <button
      type="button"
      dir="rtl"
      className="group inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-sm font-bold text-white transition active:scale-[0.98] hover:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0D14]"
      onClick={() => void startGoogleLogin()}
      aria-label="تسجيل الدخول بجوجل"
    >
      <span className="inline-grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 shadow-sm transition-transform duration-200 group-hover:scale-110" aria-hidden="true">
        <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M21.35 12.27c0-.79-.07-1.55-.22-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.14c1.84-1.69 2.91-4.18 2.91-7.42Z" />
          <path fill="#34A853" d="M12 21.5c2.63 0 4.84-.87 6.45-2.36l-3.14-2.45c-.87.58-1.98.92-3.31.92-2.54 0-4.69-1.72-5.46-4.03H3.3v2.53A9.74 9.74 0 0 0 12 21.5Z" />
          <path fill="#FBBC05" d="M6.54 13.58A5.85 5.85 0 0 1 6.24 12c0-.55.1-1.08.3-1.58V7.9H3.3A9.5 9.5 0 0 0 2.5 12c0 1.47.35 2.86.8 4.1l3.24-2.52Z" />
          <path fill="#EA4335" d="M12 6.39c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.84 3.47 14.63 2.5 12 2.5a9.74 9.74 0 0 0-8.7 5.4l3.24 2.52C7.31 8.11 9.46 6.39 12 6.39Z" />
        </svg>
      </span>
      <span className="whitespace-nowrap">تسجيل الدخول بجوجل</span>
    </button>
  );
}
