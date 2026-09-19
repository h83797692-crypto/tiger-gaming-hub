import { getDb } from "@/lib/mongodb";

export interface LeaderboardTier {
  tier: number;
  label: string;
  threshold: number;
  iconUrl: string;
}

export interface LeaderboardEntry {
  name: string;
  avatarUrl: string;
  points: number;
  userId?: string;
  frame?: "champion" | null;
  frameEnabled?: boolean;
}

export interface Leaderboard {
  id: string;
  title: string;
  game: string;
  tiers: LeaderboardTier[];
  entries: LeaderboardEntry[];
}

/** Five levels are provided by default; admins can add up to twenty. */
export const LADDER_LEVELS = 5;
export const MAX_LADDER_LEVELS = 20;

export const DEFAULT_LEADERBOARD: Leaderboard = {
  id: "community-pass",
  title: "Community Battle Pass",
  game: "All Games",
  tiers: [
    { tier: 1, label: "Rookie", threshold: 0, iconUrl: "" },
    { tier: 2, label: "Challenger", threshold: 500, iconUrl: "" },
    { tier: 3, label: "Elite", threshold: 1200, iconUrl: "" },
    { tier: 4, label: "Legend", threshold: 2000, iconUrl: "" },
    { tier: 5, label: "Tiger", threshold: 3000, iconUrl: "" },
  ],
  entries: [
    { name: "Tiger Force", avatarUrl: "", points: 3120 },
    { name: "Nova 7", avatarUrl: "", points: 2180 },
    { name: "Falcon Squad", avatarUrl: "", points: 1340 },
    { name: "Zero Ping", avatarUrl: "", points: 640 },
  ],
};

const DOC_ID = "community-pass";

/**
 * Keeps tiers ordered and numbered so the ladder renders consistently after an
 * admin adds or removes a rank.
 */
export function normaliseTiers(tiers: LeaderboardTier[]): LeaderboardTier[] {
  return [...(tiers ?? [])]
    .sort((a, b) => a.threshold - b.threshold)
    .slice(0, MAX_LADDER_LEVELS)
    .map((tier, index) => ({ ...tier, tier: index + 1 }));
}

export async function getLeaderboard(): Promise<Leaderboard> {
  try {
    const db = await getDb();
    const doc = await db.collection("leaderboards").findOne({ _id: DOC_ID as any });
    if (!doc) return DEFAULT_LEADERBOARD;
    const { _id, ...rest } = doc as any;
    const merged = { ...DEFAULT_LEADERBOARD, ...rest } as Leaderboard;
    const entries = merged.entries ?? [];
    const userIds = entries.map((entry) => entry.userId).filter((userId): userId is string => Boolean(userId));
    if (userIds.length === 0) return { ...merged, tiers: normaliseTiers(merged.tiers), entries: [...entries].sort((a, b) => b.points - a.points) };

    const profiles = await db.collection("users").find({ userId: { $in: userIds } }).toArray();
    const profileById = new Map(profiles.map((profile) => [String(profile.userId), profile]));
    return {
      ...merged,
      tiers: normaliseTiers(merged.tiers),
      entries: entries.map((entry) => {
        const profile = entry.userId ? profileById.get(entry.userId) : undefined;
        return profile ? { ...entry, name: profile.username, avatarUrl: profile.avatarUrl, frame: profile.frame, frameEnabled: profile.frameEnabled } : entry;
      }).sort((a, b) => b.points - a.points),
    };
  } catch (error) {
    console.error("MongoDB unavailable; serving default leaderboard.", error);
    return DEFAULT_LEADERBOARD;
  }
}

export async function updateLeaderboard(content: Leaderboard) {
  const db = await getDb();
  const payload = { ...content, tiers: normaliseTiers(content.tiers), entries: [...content.entries].sort((a, b) => b.points - a.points) };
  await db
    .collection("leaderboards")
    .updateOne(
      { _id: DOC_ID as any },
      { $set: { ...payload, updatedAt: new Date() } },
      { upsert: true }
    );
  return payload;
}
