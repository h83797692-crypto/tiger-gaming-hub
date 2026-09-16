export function Footer({ siteName, slogan, socialLinks }: { siteName: string; slogan: string; socialLinks?: { instagram?: string; tiktok?: string } }) {
  return (
    <footer id="contact" className="mt-24 border-t border-white/5 bg-tiger-panel/40">
      <div className="mx-auto max-w-6xl px-4 py-12 md:px-6 md:py-14">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-lg font-black tracking-[0.14em] text-tiger-orange">{siteName}</p>
            <p className="mt-2 max-w-sm text-sm text-white/50">{slogan}</p>
          </div>

          <p className="text-xs font-bold uppercase tracking-[0.16em] text-tiger-cyan">
            Broadcast HUD · Live Arena
          </p>
        </div>

        <p className="mt-10 text-xs text-white/30">
          © {new Date().getFullYear()} {siteName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
