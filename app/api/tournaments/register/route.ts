import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { getUserProfile } from "@/lib/user-profile";
import { buildSingleEliminationBracket } from "@/lib/tournament-bracket";

export const dynamic = "force-dynamic";

const registrationSchema = z.object({
  tournamentId: z.string().min(1).max(120),
  playerName: z.string().trim().min(2).max(80),
  inGameId: z.string().trim().min(1).max(80),
  mode: z.enum(["solo", "duo", "trio", "squad", "ffa", "partnership", "single-table", "tarneeb", "baloot"]),
  faction: z.enum(["usa", "china", "gla", "random"]).optional(),
  gameId: z.string().min(1).max(120),
  game: z.string().trim().min(1).max(120),
  customTeamName: z.string().trim().max(80).optional().default(""),
  teamName: z.string().trim().max(80).optional().default(""),
  teamMembers: z.array(z.string().trim().min(1).max(80)).max(3).optional().default([]),
  youtubeHandle: z.string().trim().max(100).default(""),
  youtubeVerified: z.boolean().optional().default(true),
});

export async function POST(request: NextRequest) {
  const parsed = registrationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات التسجيل غير صحيحة" }, { status: 400 });
  }

  try {
    const db = await getDb();
    await db.collection("tournament-registrations").createIndex(
      { tournamentId: 1, teamId: 1 },
      { name: "unique_tournament_team_lock", unique: true, partialFilterExpression: { teamId: { $type: "string" } } }
    );
    await db.collection("tournament-registrations").createIndex(
      { tournamentId: 1, teamLeaderId: 1 },
      { name: "unique_custom_team_leader_lock", unique: true, partialFilterExpression: { teamLeaderId: { $type: "string" } } }
    );
    const session = await getServerSession(authOptions).catch(() => null);
    const profile = session?.user?.id ? await getUserProfile(session.user.id) : null;
    const tournament = await db.collection("gaming").findOne({ _id: "gaming-content" as any });
    const configuredTournament = (tournament as any)?.tournaments?.find(
      (item: { id: string }) => item.id === parsed.data.tournamentId
    );
    const isGenerals = parsed.data.gameId === "generals-zero-hour";
    const isPubg = /pubg/i.test(parsed.data.game);
    const registrationType = configuredTournament?.registrationType === "custom" ? "custom" : "random";
    if (isPubg && registrationType === "custom" && !session?.user?.id) {
      return NextResponse.json({ error: "يجب تسجيل الدخول بحساب Google لحجز تيم PUBG." }, { status: 401 });
    }
    const customTeams = Array.isArray(configuredTournament?.customTeams)
      ? (configuredTournament.customTeams as string[]).slice(0, Math.max(0, Number(configuredTournament?.maxPlayers ?? 0)))
      : [];
    if (isPubg && registrationType === "custom" && !customTeams.includes(parsed.data.customTeamName)) {
      return NextResponse.json({ error: "اختر فريقاً من الفرق المخصصة لهذه البطولة." }, { status: 400 });
    }
    if (isPubg && parsed.data.mode === "squad" && registrationType === "random" && !parsed.data.teamName) {
      return NextResponse.json({ error: "أدخل اسم الفريق وأسماء ثلاثة أعضاء للـ Squad." }, { status: 400 });
    }
    if (isPubg && registrationType === "random" && parsed.data.mode === "squad" && parsed.data.teamMembers.length !== 3) {
      return NextResponse.json({ error: "أدخل أسماء ثلاثة أعضاء للـ Squad." }, { status: 400 });
    }
    if (isGenerals && !parsed.data.faction) {
      return NextResponse.json({ error: "اختر فصيل Generals قبل التسجيل." }, { status: 400 });
    }
    const isJawaker = parsed.data.gameId === "jawaker";
    const jawakerModes = new Set(["partnership", "single-table", "tarneeb", "baloot"]);
    if (isJawaker && !jawakerModes.has(parsed.data.mode)) {
      return NextResponse.json({ error: "اختر نمط لعب Jawaker الصحيح." }, { status: 400 });
    }
    if (!isGenerals && !isJawaker && (parsed.data.mode === "trio" || parsed.data.mode === "ffa" || parsed.data.faction)) {
      return NextResponse.json({ error: "خيارات Generals متاحة لهذه اللعبة فقط." }, { status: 400 });
    }
    if (isGenerals && jawakerModes.has(parsed.data.mode)) {
      return NextResponse.json({ error: "اختر نمط لعب Generals الصحيح." }, { status: 400 });
    }
    const maxPlayers = Math.max(1, Number(configuredTournament?.maxPlayers ?? 8));
    const teamSize = isPubg ? (parsed.data.mode === "squad" ? 4 : parsed.data.mode === "duo" ? 2 : 1) : 1;
    const maxEntries = registrationType === "custom" ? customTeams.length : Math.max(1, Math.floor(maxPlayers / teamSize));
    const registrations = await db.collection("tournament-registrations").find({ tournamentId: parsed.data.tournamentId }).toArray();
    const registrationCount = registrationType === "custom"
      ? new Set(registrations.map((registration) => String(registration.teamId ?? "")).filter(Boolean)).size
      : registrations.length;
    if (registrationCount >= maxEntries) {
      return NextResponse.json({ error: "اكتمل التسجيل في هذه البطولة." }, { status: 409 });
    }
    const teamName = registrationType === "custom" ? parsed.data.customTeamName : parsed.data.teamName;
    const teamId = isPubg && (parsed.data.mode === "squad" || registrationType === "custom")
      ? `${parsed.data.tournamentId}:${encodeURIComponent(teamName.toLowerCase())}`
      : undefined;
    if (teamId && await db.collection("tournament-registrations").findOne({ tournamentId: parsed.data.tournamentId, teamId })) {
      return NextResponse.json({ error: "اسم الفريق مسجل مسبقاً في هذه البطولة." }, { status: 409 });
    }
    const teamLeaderId = isPubg && registrationType === "custom" ? String(session?.user?.id ?? "") : undefined;
    if (teamLeaderId && await db.collection("tournament-registrations").findOne({ tournamentId: parsed.data.tournamentId, teamLeaderId })) {
      return NextResponse.json({ error: "يمكن لقائد الفريق حجز تيم واحد فقط في هذه البطولة." }, { status: 409 });
    }
    const batch = Math.floor(registrationCount / maxEntries) + 1;
    const slot = (registrationCount % maxEntries) + 1;

    await db.collection("tournament-registrations").insertOne({
      ...parsed.data,
      teamName,
      teamId,
      teamLeaderId,
      playerName: profile?.username || parsed.data.playerName,
      userId: session?.user?.id,
      profileUsername: profile?.username,
      profileAvatarUrl: profile?.avatarUrl,
      profileFrame: profile?.frame,
      profileFrameEnabled: profile?.frameEnabled,
      batch,
      slot,
      createdAt: new Date(),
    });

    if (slot === maxEntries && configuredTournament && registrationType !== "custom") {
      const completedRegistrations = await db
        .collection("tournament-registrations")
        .find({ tournamentId: parsed.data.tournamentId })
        .sort({ createdAt: 1 })
        .limit(maxPlayers)
        .toArray();
      const rounds = buildSingleEliminationBracket(
        completedRegistrations.map((registration) => registration.playerName || registration.inGameId),
        ["الدور الأول", "نصف النهائي", "النهائي"],
        maxPlayers
      );

      await db.collection("tournament-brackets").updateOne(
        { tournamentId: parsed.data.tournamentId },
        { $set: { tournamentId: parsed.data.tournamentId, rounds, maxPlayers, updatedAt: new Date() } },
        { upsert: true }
      );
      await db.collection("gaming").updateOne(
        { _id: "gaming-content" as any, "tournaments.id": parsed.data.tournamentId },
        { $set: { "tournaments.$.rounds": rounds, updatedAt: new Date() } }
      );
    }

    return NextResponse.json({
      success: true,
      slot,
      batch,
      maxPlayers,
      teamSize,
      isFull: slot === maxEntries,
      count: slot,
      registrationType,
      message: slot === maxEntries ? "اكتملت سعة التسجيل." : "تم حجز مقعدك بنجاح.",
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      if ("keyPattern" in error && error.keyPattern && typeof error.keyPattern === "object" && "teamLeaderId" in error.keyPattern) {
        return NextResponse.json({ error: "يمكن لقائد الفريق حجز تيم واحد فقط في هذه البطولة." }, { status: 409 });
      }
      return NextResponse.json({ error: "هذا التيم تم تسجيله مسبقاً ولا يمكن حجزه مجدداً." }, { status: 409 });
    }
    console.error("Tournament registration failed", error);
    return NextResponse.json({ error: "تعذر حفظ التسجيل حاليًا" }, { status: 503 });
  }
}

export async function GET(request: NextRequest) {
  const tournamentId = request.nextUrl.searchParams.get("tournamentId");
  try {
    const db = await getDb();
    if (tournamentId) {
      const session = await getServerSession(authOptions).catch(() => null);
      const tournament = await db.collection("gaming").findOne({ _id: "gaming-content" as any });
      const configuredTournament = (tournament as any)?.tournaments?.find(
        (item: { id: string }) => item.id === tournamentId
      );
      const maxPlayers = Math.max(1, Number(configuredTournament?.maxPlayers ?? 8));
      const game = String(configuredTournament?.game ?? "");
      const mode = String(configuredTournament?.mode ?? "solo");
      const teamSize = /pubg/i.test(game) ? (mode === "squad" ? 4 : mode === "duo" ? 2 : 1) : 1;
      const maxEntries = Math.max(1, Math.floor(maxPlayers / teamSize));
      const registrations = await db.collection("tournament-registrations").find({ tournamentId }).toArray();
      const isCustom = configuredTournament?.registrationType === "custom";
      const customTeams = Array.isArray(configuredTournament?.customTeams)
        ? (configuredTournament.customTeams as string[]).slice(0, Math.max(0, Number(configuredTournament?.maxPlayers ?? 0)))
        : [];
      const occupiedTeams = new Set(registrations.map((registration) => String(registration.teamId ?? "")).filter(Boolean));
      const registrationByTeam = new Map(registrations.map((registration) => [String(registration.teamId ?? ""), registration]));
      const count = isCustom ? occupiedTeams.size : registrations.length;
      return NextResponse.json({
        count: isCustom ? count : count % maxEntries,
        batch: Math.floor(count / maxEntries) + 1,
        maxPlayers: isCustom ? customTeams.length : maxPlayers,
        teamSize,
        registrationType: isCustom ? "custom" : "random",
        customTeams: customTeams.map((name) => {
          const teamId = `${tournamentId}:${encodeURIComponent(name.toLowerCase())}`;
          const registration = registrationByTeam.get(teamId);
          return {
            name,
            occupied: occupiedTeams.has(teamId),
            canCancel: Boolean(session?.user?.id && registration?.userId === session.user.id),
          };
        }),
      });
    }

    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const registrations = await db
      .collection("tournament-registrations")
      .find(tournamentId ? { tournamentId } : {})
      .sort({ createdAt: 1 })
      .toArray();
    return NextResponse.json(
      registrations.map(({ _id, ...registration }) => ({ ...registration, id: _id.toString() }))
    );
  } catch (error) {
    console.error("Could not load tournament registrations", error);
    return NextResponse.json({ error: "تعذر تحميل المشاركين" }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  const tournamentId = request.nextUrl.searchParams.get("tournamentId");
  const teamId = request.nextUrl.searchParams.get("teamId");
  if (!tournamentId || !teamId) {
    return NextResponse.json({ error: "بيانات إلغاء التسجيل غير مكتملة" }, { status: 400 });
  }

  try {
    const session = await getServerSession(authOptions).catch(() => null);
    const isAdmin = session?.user?.role === "admin";
    if (!session?.user?.id) return NextResponse.json({ error: "يجب تسجيل الدخول لإلغاء الحجز" }, { status: 401 });

    const db = await getDb();
    const registration = await db.collection("tournament-registrations").findOne({ tournamentId, teamId });
    if (!registration) return NextResponse.json({ error: "هذا التيم غير محجوز" }, { status: 404 });
    if (!isAdmin && registration.userId !== session.user.id) {
      return NextResponse.json({ error: "لا يمكنك إلغاء حجز تيم لا تملكه" }, { status: 403 });
    }

    await db.collection("tournament-registrations").deleteMany({ tournamentId, teamId });
    return NextResponse.json({ success: true, teamId });
  } catch (error) {
    console.error("Could not cancel tournament registration", error);
    return NextResponse.json({ error: "تعذر إلغاء الحجز حالياً" }, { status: 503 });
  }
}