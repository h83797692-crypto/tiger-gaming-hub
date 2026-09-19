"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, LogIn, Share2, Sparkles, Trophy } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import type { PlayerBadge, QuestDefinition } from "@/lib/engagement";

 type Quest = QuestDefinition & { completed: boolean };

export function EngagementPanel({ compact = false }: { compact?: boolean }) {
  const { data: session, status } = useSession();
  const [quests, setQuests] = useState<Quest[]>([]);
  const [xp, setXp] = useState(0);
  const [badges, setBadges] = useState<PlayerBadge[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/engagement", { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    setQuests(payload.quests ?? []);
    setXp(payload.xp ?? 0);
    setBadges(payload.badges ?? []);
  }

  useEffect(() => {
    if (status !== "authenticated") return;
    void load();
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const refreshAfterAward = () => { void load(); };
    window.addEventListener("tiger:xp-awarded", refreshAfterAward);
    return () => window.removeEventListener("tiger:xp-awarded", refreshAfterAward);
  }, [status]);

  async function share() {
    if (navigator.share) await navigator.share({ title: "Tiger Gaming Hub", text: "تعال تابع المعركة معنا", url: window.location.href });
    else await navigator.clipboard.writeText(window.location.href);
    setMessage("تم نسخ الرابط. مكافأة المشاركة تحتاج حدثًا موثقًا.");
  }

  if (status === "loading") return null;
  if (status !== "authenticated") {
    return <section className={`engagement-panel${compact ? " engagement-panel--compact" : ""}`} dir="rtl"><div><p className="eyebrow">TIGER QUEST BOARD</p><h2>مهماتك تنتظر XP</h2><p>ادخل بحساب Google واجمع نقاطًا وأوسمة من نشاطك اليومي.</p></div><button type="button" className="gaming-button" onClick={() => signIn("google", { callbackUrl: window.location.href })}><LogIn size={16} /> دخول اللاعب</button></section>;
  }

  return (
    <section className={`engagement-panel${compact ? " engagement-panel--compact" : ""}`} dir="rtl">
      <header className="engagement-panel__header"><div><p className="eyebrow">TIGER QUEST BOARD</p><h2>مهماتك اليومية</h2></div><strong><Sparkles size={16} /> {xp.toLocaleString("en")} XP</strong></header>
      <div className="engagement-panel__quests">
        {quests.map((quest) => <article className={`quest-card${quest.completed ? " is-complete" : ""}`} key={quest.id}><div><strong>{quest.title}</strong><p>{quest.description}</p><small>{quest.cadence === "weekly" ? "أسبوعية" : "يومية"} · +{quest.reward} XP</small></div>{quest.action === "share" && !quest.completed ? <button type="button" onClick={share} aria-label="مشاركة البث"><Share2 size={16} /></button> : <span className="quest-status" aria-label={quest.completed ? "مكتملة" : "تنتظر التحقق"}>{quest.completed ? <><CheckCircle2 size={16} /> تمت</> : "تنتظر النشاط"}</span>}</article>)}
      </div>
      {badges.length > 0 && <div className="engagement-badges"><span><Trophy size={15} /> أوسمتك</span>{badges.map((badge) => <span className="engagement-badge" key={badge.id}>{badge.icon} {badge.label}</span>)}</div>}
      {message && <p className="engagement-panel__message">{message}</p>}
    </section>
  );
}
