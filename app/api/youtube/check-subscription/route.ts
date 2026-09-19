import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";

const TARGET_HANDLE = "@tiger.ggaming";
const TARGET_CHANNEL_URL = "https://www.youtube.com/@tiger.ggaming";
const requestSchema = z.object({
  youtubeHandle: z.string().trim().min(2).max(100),
});

type YouTubeResponse = { items?: Array<{ id?: string; snippet?: { title?: string } }>; error?: { message?: string } };

async function youtubeRequest<T>(url: URL): Promise<T> {
  const response = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: 300 } });
  const payload = (await response.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message ?? `YouTube API returned ${response.status}`);
  return payload;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ verified: false, success: false, error: "يجب تسجيل الدخول للتحقق من الاشتراك." }, { status: 401 });
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ verified: false, success: false, error: "أدخل اسم مستخدم YouTube صالحًا." }, { status: 400 });
  }

  const youtubeHandle = parsed.data.youtubeHandle.startsWith("@") ? parsed.data.youtubeHandle : `@${parsed.data.youtubeHandle}`;

  // Subscription verification needs the user's YouTube OAuth grant. A client-
  // supplied handle or boolean must never be treated as proof of subscription.
  if (!process.env.YOUTUBE_API_KEY) {
    return NextResponse.json({
      verified: false,
      success: false,
      youtubeHandle,
      targetHandle: TARGET_HANDLE,
      channelUrl: TARGET_CHANNEL_URL,
      error: "التحقق من اشتراك YouTube غير مفعّل على الخادم.",
    }, { status: 503 });
  }

  return NextResponse.json({
    verified: false,
    success: false,
    youtubeHandle,
    targetHandle: TARGET_HANDLE,
    channelUrl: TARGET_CHANNEL_URL,
    error: "يلزم ربط حساب YouTube عبر OAuth للتحقق من الاشتراك فعليًا.",
  }, { status: 501 });
}