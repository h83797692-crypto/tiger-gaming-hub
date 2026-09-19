import { getDb } from "@/lib/mongodb";
import type { PlayerBadge } from "@/lib/engagement";
import { normaliseRoles, type CommunityRole } from "@/lib/roles";

export type AvatarFrame = "champion" | null;

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  username: string;
  avatarUrl: string;
  frame: AvatarFrame;
  frameEnabled: boolean;
  xp: number;
  badges: PlayerBadge[];
  roles: CommunityRole[];
  lastSeenAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

function toIso(value: unknown) {
  return value instanceof Date ? value.toISOString() : typeof value === "string" ? value : undefined;
}

export function serialiseUserProfile(document: Record<string, unknown>): UserProfile {
  return {
    id: String(document.userId ?? document._id ?? ""),
    email: String(document.email ?? ""),
    name: String(document.name ?? "Tiger Player"),
    username: String(document.username ?? document.name ?? "Tiger Player"),
    avatarUrl: String(document.avatarUrl ?? document.image ?? ""),
    frame: document.frame === "champion" ? "champion" : null,
    frameEnabled: document.frameEnabled !== false,
    xp: Number(document.xp ?? 0),
    badges: Array.isArray(document.badges) ? document.badges as PlayerBadge[] : [],
    roles: normaliseRoles(document.roles ?? document.role),
    lastSeenAt: toIso(document.lastSeenAt),
    createdAt: toIso(document.createdAt),
    updatedAt: toIso(document.updatedAt),
  };
}

export async function getUserProfile(userId: string) {
  const db = await getDb();
  const document = await db.collection("users").findOne({ userId });
  return document ? serialiseUserProfile(document as unknown as Record<string, unknown>) : null;
}

export async function upsertGoogleUser(input: {
  userId: string;
  email: string;
  name?: string | null;
  image?: string | null;
}) {
  const db = await getDb();
  const now = new Date();
  await db.collection("users").updateOne(
    { userId: input.userId },
    {
      $set: {
        email: input.email,
        name: input.name?.trim() || "Tiger Player",
        image: input.image ?? "",
        lastLoginAt: now,
        lastSeenAt: now,
        updatedAt: now,
      },
      $setOnInsert: {
        userId: input.userId,
        username: input.name?.trim() || "Tiger Player",
        avatarUrl: input.image ?? "",
        frame: null,
        frameEnabled: true,
        roles: ["member"],
        createdAt: now,
      },
    },
    { upsert: true }
  );
  return getUserProfile(input.userId);
}

export async function updateUserProfile(userId: string, patch: Pick<UserProfile, "username" | "avatarUrl" | "frameEnabled">) {
  const db = await getDb();
  await db.collection("users").updateOne(
    { userId },
    { $set: { username: patch.username, avatarUrl: patch.avatarUrl, frameEnabled: patch.frameEnabled, updatedAt: new Date() } }
  );
  return getUserProfile(userId);
}

export async function grantChampionFrame(userId: string) {
  if (!userId) return;
  const db = await getDb();
  await db.collection("users").updateOne(
    { userId },
    {
      $set: { frame: "champion", frameEnabled: true, updatedAt: new Date() },
      $addToSet: { badges: { id: "champion", label: "بطل الساحة", description: "فاز بالمركز الأول في بطولة.", icon: "🏆", earnedAt: new Date().toISOString() } },
    } as any
  );
}
