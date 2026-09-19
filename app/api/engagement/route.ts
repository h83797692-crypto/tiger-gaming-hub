import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { completeQuest, getEngagement } from "@/lib/engagement";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });
  try {
    return NextResponse.json(await getEngagement(session.user.id));
  } catch (error) {
    console.error("Could not load engagement", error);
    return NextResponse.json({ error: "تعذر تحميل المهمات" }, { status: 503 });
  }
}

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "يجب تسجيل الدخول" }, { status: 401 });

  try {
    const result = await completeQuest(session.user.id, "share-stream");
    return NextResponse.json(result);
  } catch (error) {
    console.error("Could not complete share quest", error);
    return NextResponse.json({ error: "تعذر تسجيل المشاركة" }, { status: 503 });
  }
}

