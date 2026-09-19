"use client";

import { useEffect, useState } from "react";
import { Coins, Gift, LogIn, ShoppingBag } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import type { Reward, Redemption } from "@/lib/rewards";

export function RewardStore() {
  const { data: session, status } = useSession();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [xp, setXp] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    const [rewardResponse, engagementResponse] = await Promise.all([fetch("/api/rewards", { cache: "no-store" }), fetch("/api/engagement", { cache: "no-store" })]);
    if (rewardResponse.ok) setRewards((await rewardResponse.json()).rewards ?? []);
    if (engagementResponse.ok) setXp((await engagementResponse.json()).xp ?? 0);
    if (status === "authenticated") {
      const redemptionResponse = await fetch("/api/rewards", { method: "PATCH", cache: "no-store" });
      if (redemptionResponse.ok) setRedemptions((await redemptionResponse.json()).redemptions ?? []);
    }
  }
  useEffect(() => { void load(); }, [status]);

  async function redeem(rewardId: string) {
    setBusy(rewardId); setNotice(null);
    try {
      const response = await fetch("/api/rewards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rewardId }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "تعذر الاستبدال");
      setNotice(`تم الاستبدال: ${payload.redemption.delivery}`);
      await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "تعذر الاستبدال"); }
    finally { setBusy(null); }
  }

  if (status === "loading") return null;
  return <main className="reward-store" dir="rtl">
    <header className="reward-store__hero"><div><p className="eyebrow">TIGER GAMING / XP REDEEM</p><h1>متجر الغنائم</h1><p>حوّل نقاطك إلى تذاكر، أكواد، ومزايا تستحق الطحن.</p></div>{status === "authenticated" ? <strong className="reward-store__balance"><Coins size={20} /> {xp.toLocaleString("en")} XP</strong> : <button type="button" className="gaming-button" onClick={() => signIn("google", { callbackUrl: "/rewards" })}><LogIn size={16} /> دخول اللاعب</button>}</header>
    {notice && <p className="reward-store__notice">{notice}</p>}
    <div className="reward-grid">{rewards.map((reward) => <article className="reward-card hud-panel" key={reward.id}><span className="reward-card__icon">{reward.icon}</span><div><span className="reward-card__kind">{reward.kind === "code" ? "DIGITAL CODE" : reward.kind === "ticket" ? "TOURNAMENT PASS" : "VIP PERK"}</span><h2>{reward.title}</h2><p>{reward.description}</p></div><footer><strong><Coins size={15} /> {reward.cost.toLocaleString("en")} XP</strong><small>{reward.stock > 0 ? `${reward.stock} متاح` : "نفد المخزون"}</small><button type="button" className="gaming-button" disabled={status !== "authenticated" || reward.stock <= 0 || xp < reward.cost || busy === reward.id} onClick={() => redeem(reward.id)}>{busy === reward.id ? "جارٍ التنفيذ..." : "استبدال"}</button></footer></article>)}</div>
    {status === "authenticated" && <section className="redemption-history hud-panel"><h2><ShoppingBag size={18} /> طلباتك الأخيرة</h2>{redemptions.length === 0 ? <p>لا توجد عمليات استبدال بعد.</p> : <div>{redemptions.map((item) => <article key={item.id}><span>{item.rewardTitle}</span><code>{item.delivery}</code><small>{new Date(item.createdAt).toLocaleDateString("ar")}</small></article>)}</div>}</section>}
  </main>;
}
