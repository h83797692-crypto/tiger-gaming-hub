import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getUserProfile, updateUserProfile } from "@/lib/user-profile";

export const dynamic = "force-dynamic";

const profileSchema = z.object({
  username: z.string().trim().min(2, "اللقب قصير جدًا").max(24, "اللقب طويل جدًا"),
  avatarUrl: z.string().trim().max(1000).refine((value) => value === "" || /^https?:\/\//i.test(value) || value.startsWith("/"), "أدخل رابط صورة صالحًا"),
  frameEnabled: z.boolean(),
});

function sessionUserId(session: Session | null) {
  return session?.user?.id;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = sessionUserId(session);
  if (!userId) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });

  try {
    const profile = await getUserProfile(userId);
    if (!profile) return NextResponse.json({ error: "لم يتم العثور على ملف المستخدم" }, { status: 404 });
    return NextResponse.json(profile);
  } catch (error) {
    console.error("Could not load user profile", error);
    return NextResponse.json({ error: "تعذر تحميل الملف الشخصي" }, { status: 503 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = sessionUserId(session);
  if (!userId) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });

  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة" }, { status: 400 });

  try {
    const profile = await updateUserProfile(userId, parsed.data);
    if (!profile) return NextResponse.json({ error: "لم يتم العثور على ملف المستخدم" }, { status: 404 });
    return NextResponse.json(profile);
  } catch (error) {
    console.error("Could not update user profile", error);
    return NextResponse.json({ error: "تعذر حفظ الملف الشخصي" }, { status: 503 });
  }
}
