import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

export const dynamic = "force-dynamic";

const matchSchema = z.object({
  playerA: z.string().max(120),
  playerB: z.string().max(120),
  avatarA: z.string().max(500).optional(),
  avatarB: z.string().max(500).optional(),
  scoreA: z.number().int().min(0).max(999),
  scoreB: z.number().int().min(0).max(999),
  status: z.enum(["upcoming", "live", "done"]),
  startTime: z.string().max(40),
  liveUrl: z.preprocess(
    (value) => (value == null ? "" : typeof value === "string" ? value.trim() : value),
    z.string().max(500).refine((value) => value === "" || /^https?:\/\//i.test(value), "رابط البث يجب أن يبدأ بـ http أو https")
  ).optional(),
  winner: z.string().max(120).optional(),
  resultA: z.enum(["winner", "loser"]).optional(),
  resultB: z.enum(["winner", "loser"]).optional(),
});

const roundSchema = z.object({
  name: z.string().max(80),
  matches: z.array(matchSchema).max(64),
});

const bracketPayloadSchema = z.object({
  tournamentId: z.string().min(1).max(120),
  rounds: z.array(roundSchema).max(12),
  maxPlayers: z.number().int().min(1).max(100000).optional(),
});

const createTournamentSchema = z.object({
  game: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(160),
  maxPlayers: z.union([z.literal(8), z.literal(16), z.literal(32), z.literal(64)]),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions).catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createTournamentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات البطولة غير صحيحة", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const db = await getDb();
    const tournamentId = `${parsed.data.game.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tournament"}-${Date.now()}`;
    const rounds: never[] = [];
    const tournament = {
      id: tournamentId,
      title: parsed.data.title,
      game: parsed.data.game,
      mode: "solo" as const,
      status: "open" as const,
      date: new Date().toISOString().slice(0, 10),
      prize: "",
      maxPlayers: parsed.data.maxPlayers,
      rules: "Single elimination · 1v1",
      rounds,
    };

    await db.collection("gaming").updateOne(
      { _id: "gaming-content" as any },
      { $push: { tournaments: tournament } as any, $set: { updatedAt: new Date() } },
      { upsert: true }
    );
    await db.collection("tournament-brackets").insertOne({
      tournamentId,
      rounds,
      maxPlayers: parsed.data.maxPlayers,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, tournament });
  } catch (error) {
    console.error("Could not create tournament", error);
    return NextResponse.json({ error: "تعذر إنشاء البطولة" }, { status: 503 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const tournamentId = request.nextUrl.searchParams.get("tournamentId");
    if (!tournamentId) {
      return NextResponse.json({ error: "Tournament ID is required" }, { status: 400 });
    }

    const db = await getDb();
    const doc = await db.collection("tournament-brackets").findOne({ tournamentId });
    const registrations = await db
      .collection("tournament-registrations")
      .find({ tournamentId })
      .sort({ createdAt: 1 })
      .toArray();

    return NextResponse.json({
      tournamentId,
      rounds: doc?.rounds ?? [],
      maxPlayers: doc?.maxPlayers,
      registrations: registrations.map(({ _id, ...registration }) => ({ ...registration, id: _id.toString() })),
    });
  } catch (error) {
    console.error("Could not load tournament bracket", error);
    return NextResponse.json({ error: "تعذر تحميل شجرة البطولة" }, { status: 503 });
  }
}

export async function PUT(request: NextRequest) {
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch (error) {
    console.error("Failed to read admin session", error);
    return NextResponse.json({ error: "Unable to verify admin session" }, { status: 500 });
  }

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  const parsed = bracketPayloadSchema.safeParse(body);
  if (!parsed.success) {
    console.warn("Invalid bracket payload", parsed.error.flatten());
    return NextResponse.json({ error: "Invalid bracket payload", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const db = await getDb();
    const result = await db.collection("tournament-brackets").updateOne(
      { tournamentId: parsed.data.tournamentId },
      { $set: { tournamentId: parsed.data.tournamentId, rounds: parsed.data.rounds, updatedAt: new Date() } },
      { upsert: true }
    );

    const tournamentUpdate: Record<string, unknown> = {
      "tournaments.$.rounds": parsed.data.rounds,
      updatedAt: new Date(),
    };
    if (parsed.data.maxPlayers !== undefined) tournamentUpdate["tournaments.$.maxPlayers"] = parsed.data.maxPlayers;

    await db.collection("gaming").updateOne(
      { _id: "gaming-content" as any, "tournaments.id": parsed.data.tournamentId },
      { $set: tournamentUpdate }
    );

    return NextResponse.json({
      success: true,
      updated: result.modifiedCount > 0 || result.upsertedCount > 0,
      rounds: parsed.data.rounds,
    });
  } catch (error) {
    console.error("Could not save tournament bracket", error);
    return NextResponse.json({ error: "تعذر حفظ شجرة البطولة" }, { status: 503 });
  }
}
