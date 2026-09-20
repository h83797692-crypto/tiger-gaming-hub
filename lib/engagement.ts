import { getDb } from "@/lib/mongodb";
import { getUserProfile } from "@/lib/user-profile";
import { getEngagementSettings } from "@/lib/engagement-settings";

let completionIndexReady: Promise<string> | null = null;

async function ensureCompletionIndex() {
  completionIndexReady ??= getDb().then((db) => db.collection("quest-completions").createIndex(
    { userId: 1, questId: 1, period: 1 },
    { unique: true, name: "unique_user_quest_period" }
  ));
  await completionIndexReady;
}

export type BadgeId = "champion" | "legend" | "clutch" | "comedian";

export interface PlayerBadge {
  id: BadgeId;
  label: string;
  description: string;
  icon: string;
  earnedAt?: string;
}

export interface QuestDefinition {
  id: string;
  title: string;
  description: string;
  reward: number;
  cadence: "daily" | "weekly";
  action: "visit" | "share" | "chat" | "clip";
}

export const QUESTS: QuestDefinition[] = [
  { id: "daily-login", title: "دخول النمر", description: "افتح Tiger Gaming مرة كل يوم.", reward: 25, cadence: "daily", action: "visit" },
  { id: "share-stream", title: "صيحة المدرجات", description: "شارك رابط بث أو بطولة مع أصحابك.", reward: 40, cadence: "daily", action: "share" },
  { id: "chat-drop", title: "رسالة في الشات", description: "أرسل رسالة محترمة في الشات المباشر.", reward: 20, cadence: "daily", action: "chat" },
  { id: "weekly-clip", title: "لقطة لا ترحم", description: "ارفع مقطعًا مضحكًا هذا الأسبوع.", reward: 100, cadence: "weekly", action: "clip" },
];

const BADGE_CATALOG: Record<BadgeId, Omit<PlayerBadge, "earnedAt">> = {
  champion: { id: "champion", label: "بطل الساحة", description: "فاز بالمركز الأول في بطولة.", icon: "🏆" },
  legend: { id: "legend", label: "المتوقع الأسطوري", description: "جمع 3,000 XP وأصبح من نخبة المجتمع.", icon: "⚡" },
  clutch: { id: "clutch", label: "قاهر الصعاب", description: "وصل إلى 1,200 XP من التحديات والمواجهات.", icon: "🛡" },
  comedian: { id: "comedian", label: "مهرج الموسم", description: "فاز مقطعه بلقب مقطع الأسبوع.", icon: "🎭" },
};

export function getBadge(id: BadgeId, earnedAt = new Date().toISOString()): PlayerBadge {
  return { ...BADGE_CATALOG[id], earnedAt };
}

export function getQuestPeriod(quest: QuestDefinition, now = new Date()) {
  if (quest.cadence === "daily") return now.toISOString().slice(0, 10);
  const firstDay = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((now.getTime() - firstDay.getTime()) / 86400000) + firstDay.getUTCDay() + 1) / 7);
  return `${now.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export async function getEngagement(userId: string) {
  const db = await getDb();
  await ensureCompletionIndex();
  const profile = await getUserProfile(userId);
  const settings = await getEngagementSettings();
  const dailyQuest = QUESTS.find((quest) => quest.id === "daily-login");
  if (dailyQuest) {
    const period = getQuestPeriod(dailyQuest);
    const result = await db.collection("quest-completions").updateOne(
      { userId, questId: dailyQuest.id, period },
      { $setOnInsert: { userId, questId: dailyQuest.id, period, reward: settings.daily_login_xp, source: "verified-visit", createdAt: new Date() } },
      { upsert: true }
    );
    if (result.upsertedCount > 0) {
      await db.collection("users").updateOne({ userId }, { $inc: { xp: settings.daily_login_xp }, $set: { lastLoginAt: new Date(), updatedAt: new Date() } });
    }
  }
  const completions = await db.collection("quest-completions").find({ userId }).toArray();
  const completionKeys = new Set(completions.map((item) => `${item.questId}:${item.period}`));
  const now = new Date();
  return {
    xp: (await getUserProfile(userId))?.xp ?? profile?.xp ?? 0,
    badges: profile?.badges ?? [],
    quests: QUESTS.map((quest) => ({
      ...quest,
      reward: quest.id === "daily-login" ? settings.daily_login_xp : quest.id === "share-stream" ? settings.share_link_xp : quest.id === "chat-drop" ? settings.chat_message_xp : settings.clip_upload_xp,
      completed: completionKeys.has(`${quest.id}:${getQuestPeriod(quest, now)}`),
    })),
  };
}

export async function awardXp(userId: string, amount: number, badge?: BadgeId) {
  if (!userId || !Number.isInteger(amount) || amount <= 0) throw new Error("Invalid XP award");
  const db = await getDb();
  const badgeUpdate = badge ? { $addToSet: { badges: getBadge(badge) } } : {};
  const result = await db.collection("users").updateOne(
    { userId },
    { $inc: { xp: amount }, ...badgeUpdate, $set: { updatedAt: new Date() } } as any
  );
  if (result.matchedCount === 0) throw new Error(`User profile not found for XP award: ${userId}`);
  const profile = await getUserProfile(userId);
  if (profile && profile.xp >= 1200 && !(profile.badges ?? []).some((item) => item.id === "clutch")) {
    await db.collection("users").updateOne({ userId }, { $addToSet: { badges: getBadge("clutch") } } as any);
  }
  if (profile && profile.xp >= 3000 && !(profile.badges ?? []).some((item) => item.id === "legend")) {
    await db.collection("users").updateOne({ userId }, { $addToSet: { badges: getBadge("legend") } } as any);
  }
  return getUserProfile(userId);
}

export async function completeQuest(userId: string, questId: string) {
  const quest = QUESTS.find((item) => item.id === questId);
  if (!quest) return { completed: false, error: "المهمة غير موجودة" };
  const settings = await getEngagementSettings();
  const reward = questId === "daily-login" ? settings.daily_login_xp : questId === "share-stream" ? settings.share_link_xp : questId === "chat-drop" ? settings.chat_message_xp : settings.clip_upload_xp;
  const period = getQuestPeriod(quest);
  const db = await getDb();
  await ensureCompletionIndex();
  const result = await db.collection("quest-completions").updateOne(
    { userId, questId, period },
    { $setOnInsert: { userId, questId, period, reward, source: "verified-event", createdAt: new Date() } },
    { upsert: true }
  );
  if (result.upsertedCount === 0) return { completed: false, alreadyClaimed: true, profile: await getUserProfile(userId) };
  return { completed: true, profile: await awardXp(userId, reward) };
}
