"use client";

import { useState } from "react";
import { Trophy, Link2, Users, Image as ImageIcon } from "lucide-react";
import type { GamingContent } from "@/lib/gaming-content";
import type { Leaderboard } from "@/lib/leaderboard-content";
import type { SocialSettings } from "@/lib/settings";
import { GamingDashboard } from "@/components/admin/GamingDashboard";
import { LeaderboardForm } from "@/components/admin/LeaderboardForm";
import { RosterViewer } from "@/components/admin/RosterViewer";
import { SocialSettingsForm } from "@/components/admin/SocialSettingsForm";

type Tab = "tournaments" | "social" | "roster" | "site";

const TABS: { id: Tab; label: string; icon: typeof Trophy }[] = [
  { id: "tournaments", label: "البطولات", icon: Trophy },
  { id: "social", label: "روابط التواصل الاجتماعي", icon: Link2 },
  { id: "roster", label: "اللاعبين والنتائج", icon: Users },
  { id: "site", label: "إعدادات الموقع والصور", icon: ImageIcon },
];

export function AdminDashboardTabs({ content, leaderboard, socialSettings }: { content: GamingContent; leaderboard: Leaderboard; socialSettings: SocialSettings }) {
  const [active, setActive] = useState<Tab>("tournaments");

  return (
    <div className="admin-tabs-shell" dir="rtl">
      <nav className="admin-tabs-nav" aria-label="أقسام لوحة التحكم">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button type="button" key={id} className={active === id ? "admin-tab is-active" : "admin-tab"} onClick={() => setActive(id)} aria-selected={active === id} role="tab">
            <Icon size={17} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <main className="admin-tab-panel" role="tabpanel">
        {active === "tournaments" && <GamingDashboard initial={content} section="tournaments" />}
        {active === "social" && <SocialSettingsForm initial={socialSettings} />}
        {active === "roster" && <div className="admin-stack"><LeaderboardForm initial={leaderboard} /><RosterViewer tournaments={content.tournaments} /></div>}
        {active === "site" && <GamingDashboard initial={content} section="site" />}
      </main>
    </div>
  );
}