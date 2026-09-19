import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { normaliseRoles, primaryRole, ROLE_DEFINITIONS } from "@/lib/roles";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const db = await getDb();
  const users = await db.collection("users").find({}, { projection: { userId: 1, username: 1, name: 1, avatarUrl: 1, image: 1, roles: 1, role: 1, lastSeenAt: 1 } }).sort({ username: 1 }).limit(500).toArray();
  return NextResponse.json({ users: users.map((user) => {
    const roles = normaliseRoles(user.roles ?? user.role);
    const role = primaryRole(roles);
    return { id: String(user.userId ?? user._id), name: String(user.username ?? user.name ?? "Tiger Player"), avatarUrl: String(user.avatarUrl ?? user.image ?? ""), roles, role, roleLabel: ROLE_DEFINITIONS[role].label, roleColor: ROLE_DEFINITIONS[role].color, online: user.lastSeenAt instanceof Date && Date.now() - user.lastSeenAt.getTime() < 90_000 };
  }) });
}