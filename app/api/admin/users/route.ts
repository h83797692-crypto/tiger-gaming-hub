import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ROLE_DEFINITIONS, normaliseRoles, type CommunityRole } from "@/lib/roles";

const rolesSchema = z.object({
  userId: z.string().min(1).max(120),
  roles: z.array(z.enum(["admin", "moderator", "vip", "member"])).min(1).max(4),
});

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === "admin";
}

function serialiseUser(document: Record<string, unknown>) {
  const roles = normaliseRoles(document.roles ?? document.role);
  return {
    id: String(document.userId ?? document._id ?? ""),
    name: String(document.username ?? document.name ?? "Tiger Player"),
    email: String(document.email ?? ""),
    avatarUrl: String(document.avatarUrl ?? document.image ?? ""),
    roles,
    permissions: Array.from(new Set(roles.flatMap((role) => ROLE_DEFINITIONS[role].permissions))),
    xp: Number(document.xp ?? 0),
    online: document.lastSeenAt instanceof Date && Date.now() - document.lastSeenAt.getTime() < 90_000,
    lastSeenAt: document.lastSeenAt instanceof Date ? document.lastSeenAt.toISOString() : null,
  };
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const db = await getDb();
  const filter = query ? { $or: [{ email: { $regex: escapeRegex(query), $options: "i" } }, { name: { $regex: escapeRegex(query), $options: "i" } }, { username: { $regex: escapeRegex(query), $options: "i" } }] } : {};
  const users = await db.collection("users").find(filter).sort({ lastLoginAt: -1 }).limit(50).toArray();
  return NextResponse.json({ users: users.map((user) => serialiseUser(user as unknown as Record<string, unknown>)) });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = rolesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات الرتب غير صالحة" }, { status: 400 });
  const roles = normaliseRoles(parsed.data.roles) as CommunityRole[];
  const db = await getDb();
  const filter = ObjectId.isValid(parsed.data.userId) ? { $or: [{ userId: parsed.data.userId }, { _id: new ObjectId(parsed.data.userId) }] } : { userId: parsed.data.userId };
  const result = await db.collection("users").updateOne(filter, { $set: { roles, updatedAt: new Date() } });
  if (result.matchedCount === 0) return NextResponse.json({ error: "المستخدم غير موجود" }, { status: 404 });
  return NextResponse.json({ success: true, roles });
}