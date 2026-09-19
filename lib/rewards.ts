import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/mongodb";

export type RewardKind = "code" | "ticket" | "perk";

export interface Reward {
  id: string;
  title: string;
  description: string;
  cost: number;
  kind: RewardKind;
  icon: string;
  active: boolean;
  stock: number;
  delivery?: string;
}

export interface Redemption {
  id: string;
  rewardId: string;
  rewardTitle: string;
  cost: number;
  delivery: string;
  createdAt: string;
}

export const DEFAULT_REWARDS: Reward[] = [
  { id: "airtime-10", title: "كود شحن Tiger", description: "كود رقمي بقيمة 10 ريال من مخزون المتجر.", cost: 500, kind: "code", icon: "⚡", active: true, stock: 20, delivery: "يُسلّمك الأدمن الكود عبر طلب الاستبدال." },
  { id: "tournament-pass", title: "تذكرة البطولة الخاصة", description: "تذكرة دخول لبطولة Premium قادمة.", cost: 1200, kind: "ticket", icon: "🎟", active: true, stock: 50, delivery: "تمت إضافة تذكرة Premium إلى حسابك." },
  { id: "vip-drop", title: "VIP Drop", description: "شارة VIP مرئية لمدة موسم المجتمع.", cost: 2500, kind: "perk", icon: "👑", active: true, stock: 10, delivery: "تم تفعيل VIP Drop على ملفك." },
];

function serialiseReward(document: Record<string, unknown>): Reward {
  return {
    id: String(document.id ?? document._id ?? ""),
    title: String(document.title ?? "Reward"),
    description: String(document.description ?? ""),
    cost: Number(document.cost ?? 0),
    kind: (document.kind as RewardKind) ?? "perk",
    icon: String(document.icon ?? "🎁"),
    active: document.active !== false,
    stock: Number(document.stock ?? 0),
    delivery: typeof document.delivery === "string" ? document.delivery : undefined,
  };
}

export async function getRewards(includeInactive = false) {
  const db = await getDb();
  const filter = includeInactive ? {} : { active: true };
  const stored = await db.collection("rewards").find(filter).sort({ cost: 1 }).toArray();
  return stored.length ? stored.map((reward) => serialiseReward(reward as unknown as Record<string, unknown>)) : DEFAULT_REWARDS;
}

export async function redeemReward(userId: string, rewardId: string) {
  const db = await getDb();
  let reward = (await db.collection("rewards").findOne({ id: rewardId, active: true })) as Record<string, unknown> | null;
  const selected = reward ? serialiseReward(reward) : DEFAULT_REWARDS.find((item) => item.id === rewardId);
  if (!selected || selected.stock <= 0) return { error: "هذه المكافأة غير متاحة حاليًا" };

  if (!reward) {
    await db.collection("rewards").updateOne({ id: selected.id }, { $setOnInsert: selected }, { upsert: true });
    reward = selected as unknown as Record<string, unknown>;
  }

  const stockUpdate = await db.collection("rewards").updateOne({ id: selected.id, active: true, stock: { $gt: 0 } }, { $inc: { stock: -1 } });
  if (stockUpdate.modifiedCount === 0) return { error: "هذه المكافأة نفدت للتو" };

  const userUpdate = await db.collection("users").updateOne(
    { userId, xp: { $gte: selected.cost } },
    { $inc: { xp: -selected.cost }, $set: { updatedAt: new Date() } }
  );
  if (userUpdate.modifiedCount === 0) {
    await db.collection("rewards").updateOne({ id: selected.id }, { $inc: { stock: 1 } });
    return { error: "رصيد XP غير كافٍ" };
  }

  const redemption: Redemption = {
    id: randomUUID(),
    rewardId: selected.id,
    rewardTitle: selected.title,
    cost: selected.cost,
    delivery: selected.delivery || `TIGER-${randomUUID().slice(0, 8).toUpperCase()}`,
    createdAt: new Date().toISOString(),
  };
  await db.collection("redemptions").insertOne({ ...redemption, userId });
  return { redemption };
}

export async function getUserRedemptions(userId: string) {
  const db = await getDb();
  const records = await db.collection("redemptions").find({ userId }).sort({ createdAt: -1 }).limit(30).toArray();
  return records.map(({ _id, userId: _userId, ...record }) => record as Redemption);
}
