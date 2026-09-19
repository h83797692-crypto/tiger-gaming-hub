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

/** The ladder is designed around exactly five levels. */
export const LADDER_LEVELS = 5;

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
 * Guarantees exactly five tiers, numbered 1..5 and ordered by threshold, so the
 * ladder never renders a broken rail if a document is short or over-filled.
 */
export function normaliseTiers(tiers: LeaderboardTier[]): LeaderboardTier[] {
  const sorted = [...(tiers ?? [])].sort((a, b) => a.threshold - b.threshold).slice(0, LADDER_LEVELS);

  while (sorted.length < LADDER_LEVELS) {
    const previous = sorted[sorted.length - 1];
    sorted.push({
      tier: sorted.length + 1,
      label: DEFAULT_LEADERBOARD.tiers[sorted.length]?.label ?? `Tier ${sorted.length + 1}`,
      threshold: previous ? previous.threshold + 500 : 0,
      iconUrl: "",
    });
  }

  return sorted.map((tier, index) => ({ ...tier, tier: index + 1 }));
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
  return getLeaderboard();
}
