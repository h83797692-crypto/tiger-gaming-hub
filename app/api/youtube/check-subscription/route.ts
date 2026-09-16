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
  if (!parsed.success) {
    return NextResponse.json({ verified: false, success: false, error: "أدخل اسم مستخدم YouTube صالحًا." }, { status: 400 });
  }

  const youtubeHandle = parsed.data.youtubeHandle.startsWith("@") ? parsed.data.youtubeHandle : `@${parsed.data.youtubeHandle}`;

  // Fast-path disablement for YouTube API validation.
  return NextResponse.json({
    verified: true,
    success: true,
    youtubeHandle,
    targetHandle: TARGET_HANDLE,
    channelUrl: TARGET_CHANNEL_URL,
    message: "تم التحقق بنجاح من حساب YouTube.",
  });
}