import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

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
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ verified: false, error: "أدخل اسم مستخدم YouTube صالحًا." }, { status: 400 });

  const apiKey = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  if (!apiKey) return NextResponse.json({ verified: false, error: "تحقق YouTube غير مفعّل حاليًا." }, { status: 503 });

  const youtubeHandle = parsed.data.youtubeHandle.startsWith("@") ? parsed.data.youtubeHandle : `@${parsed.data.youtubeHandle}`;
  try {
    const channelUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
    channelUrl.searchParams.set("part", "id,snippet");
    channelUrl.searchParams.set("forHandle", TARGET_HANDLE);
    channelUrl.searchParams.set("key", apiKey);
    const target = await youtubeRequest<YouTubeResponse>(channelUrl);
    const targetChannelId = target.items?.[0]?.id;
    if (!targetChannelId) return NextResponse.json({ verified: false, error: "تعذر العثور على قناة Tiger Gaming.", channelUrl: TARGET_CHANNEL_URL }, { status: 502 });

    // The Data API intentionally requires OAuth consent to inspect a user's
    // subscriptions. An API key can validate the target channel, but cannot
    // truthfully verify a private subscriber identity.
    const subscriptionsUrl = new URL("https://www.googleapis.com/youtube/v3/subscriptions");
    subscriptionsUrl.searchParams.set("part", "snippet");
    subscriptionsUrl.searchParams.set("forChannelId", targetChannelId);
    subscriptionsUrl.searchParams.set("key", apiKey);
    await youtubeRequest<YouTubeResponse>(subscriptionsUrl);

    return NextResponse.json({ verified: false, youtubeHandle, targetHandle: TARGET_HANDLE, requiresOAuth: true, error: "يلزم ربط حساب YouTube للتحقق من الاشتراك.", channelUrl: TARGET_CHANNEL_URL }, { status: 403 });
  } catch (error) {
    console.error("YouTube subscription verification failed", error);
    return NextResponse.json({ verified: false, youtubeHandle, targetHandle: TARGET_HANDLE, error: "تعذر التحقق من الاشتراك الآن. حاول مرة أخرى." }, { status: 502 });
  }
}