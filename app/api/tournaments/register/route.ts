import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
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
  youtubeHandle: z.string().trim().min(2).max(100),
  youtubeVerified: z.literal(true),
});

export async function POST(request: NextRequest) {
  const parsed = registrationSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "بيانات التسجيل غير صحيحة" }, { status: 400 });
  }

  try {
    if (!parsed.data.youtubeVerified) {
      return NextResponse.json({ error: "يجب التحقق من اشتراك قناة Tiger Gaming قبل التسجيل." }, { status: 403 });
    }
    const db = await getDb();
    const tournament = await db.collection("gaming-content").findOne({ _id: "gaming-content" as any });
    const configuredTournament = (tournament as any)?.tournaments?.find(
      (item: { id: string }) => item.id === parsed.data.tournamentId
    );
    const isGenerals = parsed.data.gameId === "generals-zero-hour";
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
    const registrationCount = await db.collection("tournament-registrations").countDocuments({
      tournamentId: parsed.data.tournamentId,
    });
    const batch = Math.floor(registrationCount / maxPlayers) + 1;
    const slot = (registrationCount % maxPlayers) + 1;

    await db.collection("tournament-registrations").insertOne({
      ...parsed.data,
      batch,
      slot,
      createdAt: new Date(),
    });

    if (slot === maxPlayers && configuredTournament) {
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
      isFull: slot === maxPlayers,
      message: slot === maxPlayers ? "اكتملت هذه الدفعة، وتم فتح قائمة الانتظار التالية." : "تم حجز مقعدك بنجاح.",
    });
  } catch (error) {
    console.error("Tournament registration failed", error);
    return NextResponse.json({ error: "تعذر حفظ التسجيل حاليًا" }, { status: 503 });
  }
}

export async function GET(request: NextRequest) {
  const tournamentId = request.nextUrl.searchParams.get("tournamentId");
  try {
    const db = await getDb();
    if (tournamentId) {
      const tournament = await db.collection("gaming-content").findOne({ _id: "gaming-content" as any });
      const configuredTournament = (tournament as any)?.tournaments?.find(
        (item: { id: string }) => item.id === tournamentId
      );
      const maxPlayers = Math.max(1, Number(configuredTournament?.maxPlayers ?? 8));
      const count = await db.collection("tournament-registrations").countDocuments({ tournamentId });
      return NextResponse.json({ count: count % maxPlayers, batch: Math.floor(count / maxPlayers) + 1, maxPlayers });
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