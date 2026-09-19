"use client";

import { useState } from "react";
import { Trophy, Link2, Users, Image as ImageIcon, Sparkles, Layers, Clapperboard } from "lucide-react";
import type { GamingContent } from "@/lib/gaming-content";
import type { Leaderboard } from "@/lib/leaderboard-content";
import type { SocialSettings } from "@/lib/settings";
import { GamingDashboard } from "@/components/admin/GamingDashboard";
import { LeaderboardForm } from "@/components/admin/LeaderboardForm";
import { RosterViewer } from "@/components/admin/RosterViewer";
import { SocialSettingsForm } from "@/components/admin/SocialSettingsForm";
import { EngagementDashboard } from "@/components/admin/EngagementDashboard";
import { RewardsDashboard } from "@/components/admin/RewardsDashboard";
import { EngagementSettingsForm } from "@/components/admin/EngagementSettingsForm";
import { UserManagement } from "@/components/admin/UserManagement";
import { RoleManagement } from "@/components/admin/RoleManagement";

type Tab = "games" | "tournaments" | "social" | "roster" | "site" | "engagement" | "rewards" | "xp-settings" | "users";
type GamesTab = "catalog" | "ranks" | "engagement";

const TABS: { id: Tab; label: string; icon: typeof Trophy }[] = [
  { id: "games", label: "الألعاب", icon: ImageIcon },
  { id: "tournaments", label: "البطولات", icon: Trophy },
  { id: "social", label: "روابط التواصل الاجتماعي", icon: Link2 },
  { id: "roster", label: "الترتيب العام", icon: Users },
  { id: "site", label: "إعدادات الموقع والصور", icon: ImageIcon },
  { id: "engagement", label: "المهمات والمقاطع", icon: Sparkles },
  { id: "rewards", label: "متجر XP", icon: Sparkles },
  { id: "xp-settings", label: "قيم المهام", icon: Sparkles },
  { id: "users", label: "المستخدمون والرتب", icon: Users },
];

export function AdminDashboardTabs({ content, leaderboard, socialSettings }: { content: GamingContent; leaderboard: Leaderboard; socialSettings: SocialSettings }) {
  const [active, setActive] = useState<Tab>("games");
  const [gamesTab, setGamesTab] = useState<GamesTab>("catalog");

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
        {active === "games" && <div className="admin-stack">
          <nav className="admin-tabs-nav admin-tabs-nav--nested" aria-label="إدارة الألعاب">
            <button type="button" className={gamesTab === "catalog" ? "admin-tab is-active" : "admin-tab"} onClick={() => setGamesTab("catalog")} aria-selected={gamesTab === "catalog"} role="tab">
              <Layers size={16} aria-hidden="true" />
              <span>الألعاب</span>
            </button>
            <button type="button" className={gamesTab === "ranks" ? "admin-tab is-active" : "admin-tab"} onClick={() => setGamesTab("ranks")} aria-selected={gamesTab === "ranks"} role="tab">
              <Trophy size={16} aria-hidden="true" />
              <span>الرتب</span>
            </button>
            <button type="button" className={gamesTab === "engagement" ? "admin-tab is-active" : "admin-tab"} onClick={() => setGamesTab("engagement")} aria-selected={gamesTab === "engagement"} role="tab">
              <Clapperboard size={16} aria-hidden="true" />
              <span>المهمات والمقاطع</span>
            </button>
          </nav>
          {gamesTab === "catalog" && <GamingDashboard initial={content} section="games" />}
          {gamesTab === "ranks" && <RoleManagement />}
          {gamesTab === "engagement" && <EngagementDashboard />}
        </div>}
        {active === "tournaments" && (
          <div className="admin-stack">
            <GamingDashboard initial={content} section="tournaments" />
            <RosterViewer tournaments={content.tournaments} games={content.games} />
          </div>
        )}
        {active === "social" && <SocialSettingsForm initial={socialSettings} />}
        {active === "roster" && <LeaderboardForm initial={leaderboard} />}
        {active === "site" && <GamingDashboard initial={content} section="site" />}
        {active === "engagement" && <EngagementDashboard />}
        {active === "rewards" && <RewardsDashboard />}
        {active === "xp-settings" && <EngagementSettingsForm />}
        {active === "users" && <div className="admin-stack"><RoleManagement /><UserManagement /></div>}
      </main>
    </div>
  );
}