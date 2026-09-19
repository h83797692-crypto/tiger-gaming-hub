import { getDb } from "@/lib/mongodb";

export type EngagementSettings = {
  watch_xp_per_minute: number;
  daily_login_xp: number;
  share_link_xp: number;
  chat_message_xp: number;
  clip_upload_xp: number;
};

export const DEFAULT_ENGAGEMENT_SETTINGS: EngagementSettings = {
  watch_xp_per_minute: 60,
  daily_login_xp: 15,
  share_link_xp: 20,
  chat_message_xp: 10,
  clip_upload_xp: 30,
};

const SETTINGS_ID = "engagement-settings";

function boundedInteger(value: unknown, fallback: number, maximum: number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) ? Math.min(Math.max(parsed, 0), maximum) : fallback;
}

export async function getEngagementSettings(): Promise<EngagementSettings> {
  try {
    const db = await getDb();
    const document = await db.collection("settings").findOne({ _id: SETTINGS_ID as any });
    if (!document) return DEFAULT_ENGAGEMENT_SETTINGS;
    return {
      ...DEFAULT_ENGAGEMENT_SETTINGS,
      watch_xp_per_minute: boundedInteger(
        document.watch_xp_per_minute ?? (document.youtubeWatchXpPerSecond != null ? Number(document.youtubeWatchXpPerSecond) * 60 : undefined),
        DEFAULT_ENGAGEMENT_SETTINGS.watch_xp_per_minute,
        600
      ),
      daily_login_xp: boundedInteger(document.daily_login_xp ?? document.dailyLogin, DEFAULT_ENGAGEMENT_SETTINGS.daily_login_xp, 10000),
      share_link_xp: boundedInteger(document.share_link_xp ?? document.shareStream, DEFAULT_ENGAGEMENT_SETTINGS.share_link_xp, 10000),
      chat_message_xp: boundedInteger(document.chat_message_xp ?? document.chatDrop, DEFAULT_ENGAGEMENT_SETTINGS.chat_message_xp, 10000),
      clip_upload_xp: boundedInteger(document.clip_upload_xp ?? document.weeklyClip, DEFAULT_ENGAGEMENT_SETTINGS.clip_upload_xp, 10000),
    };
  } catch (error) {
    console.error("Could not load engagement settings", error);
    return DEFAULT_ENGAGEMENT_SETTINGS;
  }
}

export async function updateEngagementSettings(settings: EngagementSettings) {
  const db = await getDb();
  await db.collection("settings").updateOne(
    { _id: SETTINGS_ID as any },
    { $set: { ...settings, updatedAt: new Date() } },
    { upsert: true }
  );
  return getEngagementSettings();
}