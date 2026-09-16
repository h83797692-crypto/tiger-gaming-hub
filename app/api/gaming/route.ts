import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getGamingContent, updateGamingContent } from "@/lib/gaming-content";

const raritySchema = z.enum(["common", "rare", "legendary"]).default("common");

const matchSchema = z.object({
  playerA: z.string().max(120),
  playerB: z.string().max(120),
  avatarA: z.string().max(500).optional(),
  avatarB: z.string().max(500).optional(),
  scoreA: z.number().int().min(0).max(999),
  scoreB: z.number().int().min(0).max(999),
  status: z.enum(["upcoming", "live", "done"]),
  startTime: z.string().max(40),
  winner: z.string().max(120).optional(),
});

const roundSchema = z.object({
  name: z.string().max(80),
  matches: z.array(matchSchema).max(64),
});

const gamingSchema = z.object({
  brand: z.string().min(1).max(80),
  heroTitle: z.string().max(200),
  heroSubtitle: z.string().max(500),
  heroCta: z.string().max(80),
  announcement: z.string().max(240),
  aboutTitle: z.string().max(120),
  aboutBody: z.string().max(2000),
  games: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().max(120),
        category: z.string().max(80),
        platform: z.string().max(80),
        imageUrl: z.string().max(1000),
        iconUrl: z.string().max(1000).default(""),
        accentColor: z.string().max(20).optional(),
        rules: z.string().max(500),
        rarity: raritySchema,
      })
    )
    .max(60),
  tournaments: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().max(160),
        game: z.string().max(120),
        mode: z.enum(["solo", "duo", "squad"]).default("solo"),
        status: z.enum(["open", "live", "completed"]),
        date: z.string().max(40),
        prize: z.string().max(120),
        maxPlayers: z.number().int().min(0).max(100000),
        rules: z.string().max(500),
        rounds: z.array(roundSchema).max(12),
      })
    )
    .max(60),
  videos: z
    .array(
      z.object({
        id: z.string().min(1),
        title: z.string().max(200),
        url: z.string().max(1000),
        youtubeUrl: z.string().max(1000),
        youtubeId: z.string().max(40).optional(),
        thumbnailUrl: z.string().max(1000),
        rarity: raritySchema,
      })
    )
    .max(120),
});

export async function GET() {
  return NextResponse.json(await getGamingContent());
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = gamingSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid gaming content", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  // youtubeId is re-derived from youtubeUrl inside updateGamingContent.
  return NextResponse.json(await updateGamingContent(parsed.data));
}
