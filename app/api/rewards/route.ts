import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getRewards, getUserRedemptions, redeemReward } from "@/lib/rewards";

export const dynamic = "force-dynamic";

const rewardSchema = z.object({
  id: z.string().trim().min(2).max(80),
  title: z.string().trim().min(2).max(120),
  description: z.string().trim().max(500),
  cost: z.number().int().min(1).max(1_000_000),
  kind: z.enum(["code", "ticket", "perk"]),
  icon: z.string().max(8),
  active: z.boolean(),
  stock: z.number().int().min(0).max(1_000_000),
  delivery: z.string().max(500).optional(),
});

function isAdmin(session: Session | null) {
  return session?.user?.role === "admin";
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const includeInactive = request.nextUrl.searchParams.get("admin") === "1" && isAdmin(session);
    return NextResponse.json({ rewards: await getRewards(includeInactive) });
  } catch (error) {
    console.error("Could not load rewards", error);
    return NextResponse.json({ error: "تعذر تحميل متجر XP" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "سجّل الدخول لاستبدال XP" }, { status: 401 });
  const payload = await request.json().catch(() => null) as { rewardId?: string } | null;
  if (!payload?.rewardId) return NextResponse.json({ error: "المكافأة غير صالحة" }, { status: 400 });
  try {
    const result = await redeemReward(session.user.id, payload.rewardId);
    if (result.error) return NextResponse.json(result, { status: 400 });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("Could not redeem reward", error);
    return NextResponse.json({ error: "تعذر تنفيذ الاستبدال" }, { status: 503 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = rewardSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات المكافأة غير صحيحة" }, { status: 400 });
  try {
    const db = await (await import("@/lib/mongodb")).getDb();
    const duplicate = await db.collection("rewards").findOne({ id: parsed.data.id });
    if (duplicate && String(duplicate._id) !== parsed.data.id && parsed.data.id !== String(duplicate.id)) {
      return NextResponse.json({ error: "معرّف المكافأة مستخدم مسبقًا" }, { status: 409 });
    }
    await db.collection("rewards").updateOne({ id: parsed.data.id }, { $set: parsed.data }, { upsert: true });
    return NextResponse.json({ success: true, rewards: await getRewards(true) });
  } catch (error) {
    console.error("Could not save reward", error);
    return NextResponse.json({ error: "تعذر حفظ المكافأة" }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isAdmin(session)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rewardId = request.nextUrl.searchParams.get("id");
  if (!rewardId) return NextResponse.json({ error: "المكافأة غير صالحة" }, { status: 400 });
  const db = await (await import("@/lib/mongodb")).getDb();
  const result = await db.collection("rewards").deleteOne({ id: rewardId });
  if (result.deletedCount === 0) return NextResponse.json({ error: "المكافأة غير موجودة" }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function PATCH() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
  return NextResponse.json({ redemptions: await getUserRedemptions(session.user.id) });
}
