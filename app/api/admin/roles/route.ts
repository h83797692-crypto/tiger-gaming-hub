import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ROLE_DEFINITIONS, type CommunityRole } from "@/lib/roles";

const roleSchema = z.object({ role: z.enum(["admin", "moderator", "vip", "member"]), label: z.string().trim().min(1).max(40), color: z.string().regex(/^#[0-9a-f]{6}$/i), emoji: z.string().trim().min(1).max(8) });

async function admin() { return (await getServerSession(authOptions))?.user?.role === "admin"; }

export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = await getDb();
  const stored = await db.collection("role-settings").find({}).toArray();
  const overrides = new Map(stored.map((item) => [String(item.role), item]));
  return NextResponse.json({ roles: Object.entries(ROLE_DEFINITIONS).map(([role, definition]) => ({ role, ...definition, ...(overrides.get(role) ?? {}) })) });
}

export async function PUT(request: NextRequest) {
  if (!(await admin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = roleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات الرتبة غير صالحة" }, { status: 400 });
  const db = await getDb();
  await db.collection("role-settings").updateOne({ role: parsed.data.role }, { $set: parsed.data, $setOnInsert: { permissions: ROLE_DEFINITIONS[parsed.data.role].permissions } }, { upsert: true });
  return NextResponse.json({ success: true, role: parsed.data });
}

export async function DELETE(request: NextRequest) {
  if (!(await admin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const role = request.nextUrl.searchParams.get("role") as CommunityRole | null;
  if (!role || !(role in ROLE_DEFINITIONS) || role === "member" || role === "admin") return NextResponse.json({ error: "لا يمكن حذف هذه الرتبة" }, { status: 400 });
  await getDb().then((db) => db.collection("role-settings").deleteOne({ role }));
  return NextResponse.json({ success: true });
}