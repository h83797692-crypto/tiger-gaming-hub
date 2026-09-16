import { getDb } from "@/lib/mongodb";

export interface SocialSettings {
  tiktokUrl: string;
  discordUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  paypalEmailOrLink: string;
  ibanOrBankInfo: string;
  customDonationMessage: string;
}

export const DEFAULT_SOCIAL_SETTINGS: SocialSettings = {
  tiktokUrl: "https://www.tiktok.com/@tiger.ggaming",
  discordUrl: "https://discord.com/",
  instagramUrl: "https://www.instagram.com/tiger.ggaming/",
  youtubeUrl: "https://www.youtube.com/@tiger.ggaming",
  paypalEmailOrLink: "",
  ibanOrBankInfo: "",
  customDonationMessage: "شكرًا لدعمك مجتمع Tiger Gaming.",
};

const SETTINGS_ID = "site-settings";

export async function getSocialSettings(): Promise<SocialSettings> {
  try {
    const db = await getDb();
    const document = await db.collection("settings").findOne({ _id: SETTINGS_ID as any });
    if (!document) return DEFAULT_SOCIAL_SETTINGS;
    const { _id, ...stored } = document as Partial<SocialSettings> & { _id?: unknown };
    return { ...DEFAULT_SOCIAL_SETTINGS, ...stored, paypalEmailOrLink: stored.paypalEmailOrLink || (document as { paypalLink?: string }).paypalLink || "" };
  } catch (error) {
    console.error("MongoDB unavailable; serving default social settings.", error);
    return DEFAULT_SOCIAL_SETTINGS;
  }
}

export async function updateSocialSettings(settings: SocialSettings): Promise<SocialSettings> {
  const db = await getDb();
  await db.collection("settings").updateOne(
    { _id: SETTINGS_ID as any },
    { $set: { ...settings, updatedAt: new Date() } },
    { upsert: true }
  );
  return getSocialSettings();
}