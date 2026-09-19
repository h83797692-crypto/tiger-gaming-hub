import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEngagement } from "@/lib/engagement";

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

