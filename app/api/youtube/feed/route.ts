import { NextRequest, NextResponse } from "next/server";
import { getLatestYoutubeVideosDetailed } from "@/lib/youtube-feed";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const rawLimit = Number(request.nextUrl.searchParams.get("limit") ?? 6);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(Math.floor(rawLimit), 1), 12) : 6;
  const result = await getLatestYoutubeVideosDetailed(limit);
  return NextResponse.json(
    result,
    { headers: { "Cache-Control": "no-store" } }
  );
}
