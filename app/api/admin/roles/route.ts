import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ROLE_DEFINITIONS } from "@/lib/roles";

const roleSchema = z.object({ role: z.string().trim().min(1).max(80), label: z.string().trim().min(1).max(40), color: z.string().regex(/^#[0-9a-f]{6}$/i), emoji: z.string().trim().min(1).max(8) });
const customRoleSchema = roleSchema.omit({ role: true });

async function admin() { return (await getServerSession(authOptions))?.user?.role === "admin"; }

export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const db = await getDb();
  const stored = await db.collection("role-settings").find({}).toArray();
  const overrides = new Map(stored.map((item) => [String(item.role), item]));
  const builtInRoles = Object.entries(ROLE_DEFINITIONS).map(([role, definition]) => ({ role, ...definition, ...(overrides.get(role) ?? {}) }));
  const customRoles = stored
    .filter((item) => !(String(item.role) in ROLE_DEFINITIONS))
    .map((item) => ({ role: String(item.role), label: String(item.label ?? ""), color: String(item.color ?? "#94a3b8"), emoji: String(item.emoji ?? "🎮"), permissions: [] }));
  return NextResponse.json({ roles: [...builtInRoles, ...customRoles] });
}

export async function POST(request: NextRequest) {
  if (!(await admin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = customRoleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات الرتبة غير صالحة", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  const db = await getDb();
  const role = `custom-${Date.now().toString(36)}`;
  const rank = { role, ...parsed.data, permissions: [] as string[], createdAt: new Date(), updatedAt: new Date() };
  await db.collection("role-settings").insertOne(rank);
  return NextResponse.json({ success: true, role: rank }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  if (!(await admin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = roleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات الرتبة غير صالحة" }, { status: 400 });
  if (parsed.data.role.startsWith("custom-") === false && !(parsed.data.role in ROLE_DEFINITIONS)) return NextResponse.json({ error: "الرتبة غير موجودة" }, { status: 404 });
  const db = await getDb();
  const permissions = parsed.data.role in ROLE_DEFINITIONS ? ROLE_DEFINITIONS[parsed.data.role as keyof typeof ROLE_DEFINITIONS].permissions : [];
  await db.collection("role-settings").updateOne({ role: parsed.data.role }, { $set: parsed.data, $setOnInsert: { permissions } }, { upsert: true });
  return NextResponse.json({ success: true, role: parsed.data });
}

export async function DELETE(request: NextRequest) {
  if (!(await admin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const role = request.nextUrl.searchParams.get("role");
  if (!role || role === "member" || role === "admin") return NextResponse.json({ error: "لا يمكن حذف هذه الرتبة" }, { status: 400 });
  await getDb().then((db) => db.collection("role-settings").deleteOne({ role }));
  return NextResponse.json({ success: true });
}