import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getGamingContent, updateGamingContent } from "@/lib/gaming-content";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const methodHeaders = {
  Allow: "GET, PUT, OPTIONS",
  "Cache-Control": "no-store, max-age=0",
};

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

const optionalGameText = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value == null ? "" : value),
  z.string().max(1000).default("")
);

const gameSchema = z.object({
  id: z.string().min(1).max(160),
  title: z.string().max(120),
  category: z.string().max(80),
  gameplayType: z.string().max(120).default(""),
  platform: z.string().max(80),
  imageUrl: optionalGameText,
  iconUrl: optionalGameText,
  accentColor: z.string().max(20).optional().default(""),
  description: z.string().max(2000).default(""),
  rules: z.string().max(500),
  rarity: raritySchema,
});

const gamingSchema = z.object({
  brand: z.string().min(1).max(80),
  heroTitle: z.string().max(200),
  heroSubtitle: z.string().max(500),
  heroCta: z.string().max(80),
  announcement: z.string().max(240),
  aboutTitle: z.string().max(120),
  aboutBody: z.string().max(2000),
  games: z.array(gameSchema).max(60),
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
  try {
    return NextResponse.json(await getGamingContent(), { headers: methodHeaders });
  } catch (error) {
    console.error("Failed to load gaming content", error);
    return NextResponse.json(
      { error: "Failed to load gaming content" },
      { status: 500, headers: methodHeaders }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: methodHeaders });
}

export async function PUT(req: NextRequest) {
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch (error) {
    console.error("Failed to read admin session", error);
    return NextResponse.json(
      { error: "Unable to verify admin session" },
      { status: 500, headers: methodHeaders }
    );
  }

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: methodHeaders }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON request body" },
      { status: 400, headers: methodHeaders }
    );
  }

  const parsed = gamingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid gaming content", details: parsed.error.flatten() },
      { status: 400, headers: methodHeaders }
    );
  }

  try {
    // youtubeId is re-derived from youtubeUrl inside updateGamingContent.
    const savedContent = await updateGamingContent(parsed.data);
    return NextResponse.json(
      { success: true, content: savedContent },
      { headers: methodHeaders }
    );
  } catch (error) {
    console.error("Failed to save gaming content", error);
    return NextResponse.json(
      { error: "Failed to save gaming content" },
      { status: 500, headers: methodHeaders }
    );
  }
}
