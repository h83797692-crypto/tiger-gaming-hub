import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { grantChampionFrame } from "@/lib/user-profile";
import type { BracketRound } from "@/lib/tournament-bracket";
import { buildPubgResults, isPubgTournament, type PubgTeamResult } from "@/lib/pubg-scrims";

export const dynamic = "force-dynamic";

const matchSchema = z.object({
  playerA: z.string().max(120),
  playerB: z.string().max(120),
  avatarA: z.string().max(500).optional(),
  avatarB: z.string().max(500).optional(),
  userIdA: z.string().max(200).optional(),
  userIdB: z.string().max(200).optional(),
  frameA: z.enum(["champion"]).nullable().optional(),
  frameB: z.enum(["champion"]).nullable().optional(),
  frameEnabledA: z.boolean().optional(),
  frameEnabledB: z.boolean().optional(),
  xpA: z.number().min(0).optional(),
  xpB: z.number().min(0).optional(),
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
  maxPlayers: z.union([z.literal(4), z.literal(8), z.literal(16), z.literal(32), z.literal(64)]).optional(),
});

const createTournamentSchema = z.object({
  game: z.string().trim().min(1).max(120),
  title: z.string().trim().min(1).max(160),
  mode: z.enum(["solo", "duo", "squad"]).default("solo"),
  maxPlayers: z.number().int().min(1).max(100),
  registrationType: z.enum(["custom", "random"]).default("random"),
  customTeams: z.array(z.string().trim().min(1).max(80)).max(100).default([]),
});

async function hydrateRounds(rounds: BracketRound[], registrations: Array<Record<string, unknown>>) {
  const db = await getDb();
  const userIds = registrations.map((registration) => String(registration.userId ?? "")).filter(Boolean);
  const profiles = userIds.length > 0 ? await db.collection("users").find({ userId: { $in: userIds } }).toArray() : [];
  const profileById = new Map(profiles.map((profile) => [String(profile.userId), profile]));
  const registrationByName = new Map(registrations.flatMap((registration) => {
    const profile = registration.userId ? profileById.get(String(registration.userId)) : undefined;
    const player = String(registration.playerName ?? registration.inGameId ?? "");
    return player ? [[player, { registration, profile }] as const] : [];
  }));

  return rounds.map((round) => ({
    ...round,
    matches: round.matches.map((match) => {
      const playerA = registrationByName.get(match.playerA);
      const playerB = registrationByName.get(match.playerB);
      return {
        ...match,
        ...(playerA && {
          avatarA: String(playerA.profile?.avatarUrl ?? playerA.registration.profileAvatarUrl ?? ""),
          userIdA: String(playerA.registration.userId ?? "") || undefined,
          frameA: playerA.profile?.frame === "champion" || playerA.registration.profileFrame === "champion" ? "champion" as const : null,
          frameEnabledA: playerA.profile?.frameEnabled !== false && playerA.registration.profileFrameEnabled !== false,
          xpA: Number(playerA.profile?.xp ?? 0),
        }),
        ...(playerB && {
          avatarB: String(playerB.profile?.avatarUrl ?? playerB.registration.profileAvatarUrl ?? ""),
          userIdB: String(playerB.registration.userId ?? "") || undefined,
          frameB: playerB.profile?.frame === "champion" || playerB.registration.profileFrame === "champion" ? "champion" as const : null,
          frameEnabledB: playerB.profile?.frameEnabled !== false && playerB.registration.profileFrameEnabled !== false,
          xpB: Number(playerB.profile?.xp ?? 0),
        }),
      };
    }),
  }));
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions).catch(() => null);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = createTournamentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات البطولة غير صحيحة", details: parsed.error.flatten() }, { status: 400 });
  }

  if (isPubgTournament(parsed.data.game) && parsed.data.registrationType === "custom" && parsed.data.customTeams.length === 0) {
    return NextResponse.json({ error: "أدخل أسماء فرق PUBG المخصصة قبل إنشاء البطولة" }, { status: 400 });
  }
  if (!isPubgTournament(parsed.data.game) && parsed.data.registrationType === "custom") {
    return NextResponse.json({ error: "التسجيل المخصص متاح لبطولات PUBG فقط" }, { status: 400 });
  }

  try {
    const db = await getDb();
    const tournamentId = `${parsed.data.game.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "tournament"}-${Date.now()}`;
    const rounds: never[] = [];
    const tournament = {
      id: tournamentId,
      title: parsed.data.title,
      game: parsed.data.game,
      mode: parsed.data.mode,
      status: "open" as const,
      date: new Date().toISOString().slice(0, 10),
      prize: "",
      maxPlayers: parsed.data.maxPlayers,
      registrationType: isPubgTournament(parsed.data.game) ? parsed.data.registrationType : "random",
      customTeams: isPubgTournament(parsed.data.game) && parsed.data.registrationType === "custom"
        ? Array.from(new Set(parsed.data.customTeams.map((team) => team.trim()).filter(Boolean)))
        : [],
      rules: isPubgTournament(parsed.data.game) ? "PUBG Custom Room · Placement + Kills" : "Single elimination · 1v1",
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
    const gamingContent = await db.collection("gaming").findOne({ _id: "gaming-content" as any });
    const configuredTournament = (gamingContent as any)?.tournaments?.find((item: { id: string }) => item.id === tournamentId);
    const registrations = await db
      .collection("tournament-registrations")
      .find({ tournamentId })
      .sort({ createdAt: 1 })
      .toArray();
    const hydratedRounds = await hydrateRounds((doc?.rounds ?? []) as BracketRound[], registrations as Array<Record<string, unknown>>);

    return NextResponse.json({
      tournamentId,
      rounds: hydratedRounds,
      maxPlayers: doc?.maxPlayers,
      registrations: registrations.map(({ _id, ...registration }) => ({ ...registration, id: _id.toString() })),
      pubgResults: isPubgTournament(String(configuredTournament?.game ?? ""))
        ? buildPubgResults(
            registrations as Array<Record<string, unknown>>,
            (doc?.pubgResults ?? []) as Array<Partial<PubgTeamResult>>,
            configuredTournament?.registrationType === "custom"
              ? (configuredTournament.customTeams ?? []).slice(0, Number(configuredTournament.maxPlayers ?? 0)).map((teamName: string) => ({
                  teamName,
                  teamId: `${tournamentId}:${encodeURIComponent(teamName.toLowerCase())}`,
                }))
              : []
          )
        : undefined,
    });
  } catch (error) {
    console.error("Could not load tournament bracket", error);
    return NextResponse.json({ error: "تعذر تحميل شجرة البطولة" }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions).catch(() => null);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tournamentId = request.nextUrl.searchParams.get("tournamentId");
  if (!tournamentId) {
    return NextResponse.json({ error: "Tournament ID is required" }, { status: 400 });
  }

  try {
    const db = await getDb();
    await Promise.all([
      db.collection("tournament-brackets").deleteOne({ tournamentId }),
      db.collection("tournament-registrations").deleteMany({ tournamentId }),
      db.collection("gaming").updateOne(
        { _id: "gaming-content" as any },
        { $pull: { tournaments: { id: tournamentId } } as any, $set: { updatedAt: new Date() } }
      ),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Could not delete tournament", error);
    return NextResponse.json({ error: "تعذر حذف البطولة" }, { status: 503 });
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

  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body" }, { status: 400 });
  }

  const pubgPayload = z.object({
    tournamentId: z.string().min(1),
    pubgResults: z.array(z.object({ teamId: z.string().min(1), placement: z.number().int().min(0).max(100), kills: z.number().int().min(0).max(999) })).max(100),
  }).safeParse(body);
  if (pubgPayload.success) {
    try {
      const db = await getDb();
      const tournamentDoc = await db.collection("gaming").findOne({ _id: "gaming-content" as any });
      const configuredTournament = (tournamentDoc as any)?.tournaments?.find((item: { id: string }) => item.id === pubgPayload.data.tournamentId);
      if (configuredTournament && isPubgTournament(configuredTournament.game)) {
        const registrations = await db.collection("tournament-registrations").find({ tournamentId: pubgPayload.data.tournamentId }).toArray();
        const results = buildPubgResults(
          registrations as Array<Record<string, unknown>>,
          pubgPayload.data.pubgResults,
          configuredTournament?.registrationType === "custom"
            ? (configuredTournament.customTeams ?? []).slice(0, Number(configuredTournament.maxPlayers ?? 0)).map((teamName: string) => ({
                teamName,
                teamId: `${pubgPayload.data.tournamentId}:${encodeURIComponent(teamName.toLowerCase())}`,
              }))
            : []
        );
        await db.collection("tournament-brackets").updateOne(
          { tournamentId: pubgPayload.data.tournamentId },
          { $set: { tournamentId: pubgPayload.data.tournamentId, pubgResults: results, updatedAt: new Date() } },
          { upsert: true }
        );
        return NextResponse.json({ success: true, pubgResults: results });
      }
    } catch (error) {
      console.error("Could not save PUBG results", error);
      return NextResponse.json({ error: "تعذر حفظ نتائج PUBG" }, { status: 503 });
    }
  }

  const parsed = bracketPayloadSchema.safeParse(body);
  if (!parsed.success) {
    console.warn("Invalid bracket payload", parsed.error.flatten());
    return NextResponse.json({ error: "Invalid bracket payload", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const db = await getDb();
    const registrations = await db.collection("tournament-registrations").find({ tournamentId: parsed.data.tournamentId }).toArray();
    if (registrations.length < 4) {
      return NextResponse.json({ error: "تحتاج البطولة إلى 4 لاعبين على الأقل قبل بدء الشجرة." }, { status: 400 });
    }
    const hydratedRounds = await hydrateRounds(parsed.data.rounds as BracketRound[], registrations as Array<Record<string, unknown>>);
    const result = await db.collection("tournament-brackets").updateOne(
      { tournamentId: parsed.data.tournamentId },
      { $set: { tournamentId: parsed.data.tournamentId, rounds: hydratedRounds, updatedAt: new Date() } },
      { upsert: true }
    );

    const tournamentUpdate: Record<string, unknown> = {
      "tournaments.$.rounds": hydratedRounds,
      updatedAt: new Date(),
    };
    if (parsed.data.maxPlayers !== undefined) tournamentUpdate["tournaments.$.maxPlayers"] = parsed.data.maxPlayers;

    await db.collection("gaming").updateOne(
      { _id: "gaming-content" as any, "tournaments.id": parsed.data.tournamentId },
      { $set: tournamentUpdate }
    );

    const finalMatch = hydratedRounds.at(-1)?.matches.at(-1);
    const championName = finalMatch?.status === "done"
      ? finalMatch.winner || (finalMatch.scoreA > finalMatch.scoreB ? finalMatch.playerA : finalMatch.scoreB > finalMatch.scoreA ? finalMatch.playerB : "")
      : "";
    if (championName && championName !== "TBD" && championName !== "BYE") {
      const championRegistration = await db.collection("tournament-registrations").findOne({
        tournamentId: parsed.data.tournamentId,
        $or: [{ playerName: championName }, { inGameId: championName }],
      });
      if (championRegistration?.userId) await grantChampionFrame(String(championRegistration.userId));
    }

    const finalRounds = championName ? await hydrateRounds(hydratedRounds, registrations as Array<Record<string, unknown>>) : hydratedRounds;
    if (championName) {
      await db.collection("tournament-brackets").updateOne(
        { tournamentId: parsed.data.tournamentId },
        { $set: { rounds: finalRounds, updatedAt: new Date() } }
      );
      await db.collection("gaming").updateOne(
        { _id: "gaming-content" as any, "tournaments.id": parsed.data.tournamentId },
        { $set: { "tournaments.$.rounds": finalRounds, updatedAt: new Date() } }
      );
    }

    return NextResponse.json({
      success: true,
      updated: result.modifiedCount > 0 || result.upsertedCount > 0,
      rounds: finalRounds,
    });
  } catch (error) {
    console.error("Could not save tournament bracket", error);
    return NextResponse.json({ error: "تعذر حفظ شجرة البطولة" }, { status: 503 });
  }
}
