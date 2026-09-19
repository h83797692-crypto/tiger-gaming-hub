import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getEngagementSettings, updateEngagementSettings } from "@/lib/engagement-settings";

const settingsSchema = z.object({
  watch_xp_per_minute: z.number().int().min(0).max(600),
  daily_login_xp: z.number().int().min(0).max(10000),
  share_link_xp: z.number().int().min(0).max(10000),
  chat_message_xp: z.number().int().min(0).max(10000),
  clip_upload_xp: z.number().int().min(0).max(10000),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === "admin";
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await getEngagementSettings());
}

export async function PUT(request: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "قيم XP غير صالحة" }, { status: 400 });
  try {
    return NextResponse.json(await updateEngagementSettings(parsed.data));
  } catch (error) {
    console.error("Could not update engagement settings", error);
    return NextResponse.json({ error: "تعذر حفظ إعدادات XP" }, { status: 503 });
  }
}