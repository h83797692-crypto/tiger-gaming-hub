import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getLeaderboard, updateLeaderboard, LADDER_LEVELS } from "@/lib/leaderboard-content";

const leaderboardSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(160),
  game: z.string().min(1).max(100),
  tiers: z
    .array(
      z.object({
        tier: z.number().int().min(1).max(LADDER_LEVELS),
        label: z.string().min(1).max(60),
        threshold: z.number().min(0).max(1_000_000),
        iconUrl: z.string().max(1000),
      })
    )
    // The ladder renders exactly five levels; reject anything that would break it.
    .length(LADDER_LEVELS),
  entries: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        avatarUrl: z.string().max(1000),
        points: z.number().min(0).max(10_000_000),
      })
    )
    .max(200),
});

export async function GET() {
  return NextResponse.json(await getLeaderboard());
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = leaderboardSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid leaderboard", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  return NextResponse.json(await updateLeaderboard(parsed.data));
}
