import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { awardXp } from "@/lib/engagement";
import { getEngagementSettings } from "@/lib/engagement-settings";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  action: z.enum(["start", "heartbeat", "stop"]),
  videoId: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  sessionId: z.string().uuid().optional(),
  currentTime: z.number().finite().min(0).max(24 * 60 * 60).optional().default(0),
  playing: z.boolean().optional().default(false),
  visible: z.boolean().optional().default(false),
});

const HEARTBEAT_LIMIT_SECONDS = 12;
const SESSION_TTL_MS = 45 * 60 * 1000;

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions).catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: "يجب تسجيل الدخول لجمع XP" }, { status: 401 });
  if ((session.user as { provider?: string }).provider !== "google") {
    return NextResponse.json({ error: "يجب استخدام حساب Google لجمع XP" }, { status: 403 });
  }

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "بيانات المشاهدة غير صالحة" }, { status: 400 });

  const input = parsed.data;
  const db = await getDb();
  const now = new Date();

  if (input.action === "start") {
    console.info("[YouTube XP] Watch session started", { videoId: input.videoId, provider: session.user.provider });
    const activeSession = await db.collection("youtube-watch-sessions").findOne({
      userId: session.user.id,
      videoId: input.videoId,
      invalid: false,
      stoppedAt: { $exists: false },
      expiresAt: { $gt: now },
    });
    if (activeSession) {
      await db.collection("youtube-watch-sessions").updateOne(
        { _id: activeSession._id },
        { $set: { lastHeartbeatAt: now, expiresAt: new Date(now.getTime() + SESSION_TTL_MS) } }
      );
      console.info("[YouTube XP] Reusing active watch session", { videoId: input.videoId });
      return NextResponse.json({ sessionId: activeSession.sessionId, creditedSeconds: Number(activeSession.creditedSeconds ?? 0) });
    }
    const sessionId = randomUUID();
    await db.collection("youtube-watch-sessions").updateMany(
      { userId: session.user.id, invalid: false, stoppedAt: { $exists: false } },
      { $set: { invalid: true, invalidReason: "new_session" } }
    );
    await db.collection("youtube-watch-sessions").insertOne({
      sessionId,
      userId: session.user.id,
      videoId: input.videoId,
      lastCurrentTime: input.currentTime,
      creditedSeconds: 0,
      xpRemainder: 0,
      lastHeartbeatAt: now,
      expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
      invalid: false,
      createdAt: now,
    });
    return NextResponse.json({ sessionId, creditedSeconds: 0 });
  }

  if (!input.sessionId) return NextResponse.json({ error: "جلسة المشاهدة مفقودة" }, { status: 400 });
  const watch = await db.collection("youtube-watch-sessions").findOne({
    sessionId: input.sessionId,
    userId: session.user.id,
    videoId: input.videoId,
    stoppedAt: { $exists: false },
  });
  if (!watch || watch.invalid || !(watch.expiresAt instanceof Date) || watch.expiresAt <= now) {
    console.warn("[YouTube XP] Heartbeat rejected: invalid or expired session", { action: input.action, videoId: input.videoId });
    return NextResponse.json({ error: "جلسة المشاهدة غير صالحة" }, { status: 409 });
  }

  if (input.action === "stop") {
    const stopped = await db.collection("youtube-watch-sessions").updateOne(
      {
        _id: watch._id,
        sessionId: input.sessionId,
        userId: session.user.id,
        videoId: input.videoId,
        invalid: false,
        stoppedAt: { $exists: false },
        expiresAt: { $gt: now },
      },
      { $set: { stoppedAt: now, lastHeartbeatAt: now } }
    );
    if (stopped.matchedCount === 0) {
      return NextResponse.json({ error: "جلسة المشاهدة تغيرت بالتزامن" }, { status: 409 });
    }
    return NextResponse.json({ creditedSeconds: Number(watch.creditedSeconds ?? 0) });
  }

  const elapsed = Math.max(0, Math.min(HEARTBEAT_LIMIT_SECONDS, (now.getTime() - new Date(watch.lastHeartbeatAt).getTime()) / 1000));
  const positionDelta = input.currentTime - Number(watch.lastCurrentTime ?? 0);
  const isInitialHeartbeat = Number(watch.creditedSeconds ?? 0) === 0 && Number(watch.lastCurrentTime ?? 0) === 0;
  const isSuspiciousSeek = isInitialHeartbeat
    ? positionDelta > HEARTBEAT_LIMIT_SECONDS + 2 || positionDelta < -2
    : positionDelta > elapsed + 2 || positionDelta < -2;
  if (isSuspiciousSeek) {
    await db.collection("youtube-watch-sessions").updateOne({ _id: watch._id }, { $set: { invalid: true, invalidReason: "seek", lastHeartbeatAt: now } });
    console.warn("[YouTube XP] Heartbeat rejected: suspicious seek", { videoId: input.videoId, elapsed, positionDelta });
    return NextResponse.json({ error: "تم إيقاف مكافأة المشاهدة بسبب التخطي" }, { status: 409 });
  }

  const credit = input.playing && input.visible ? Math.floor(Math.min(Math.max(positionDelta, 0), elapsed + 1)) : 0;
  if (credit <= 0) {
    const updated = await db.collection("youtube-watch-sessions").findOneAndUpdate(
      {
        _id: watch._id,
        sessionId: input.sessionId,
        userId: session.user.id,
        videoId: input.videoId,
        invalid: false,
        stoppedAt: { $exists: false },
        expiresAt: { $gt: now },
        lastCurrentTime: watch.lastCurrentTime,
        lastHeartbeatAt: watch.lastHeartbeatAt,
      },
      { $set: { lastCurrentTime: input.currentTime, lastHeartbeatAt: now } },
      { returnDocument: "after" }
    );
    if (!updated) {
      console.warn("[YouTube XP] Zero-credit heartbeat rejected: concurrent duplicate", { videoId: input.videoId });
      return NextResponse.json({ error: "تم رفض heartbeat مكرر" }, { status: 409 });
    }
    const settings = await getEngagementSettings();
    return NextResponse.json({ creditedSeconds: Number(updated.creditedSeconds ?? 0), addedXp: 0, earnedXp: Number(updated.creditedSeconds ?? 0) * settings.watch_xp_per_minute / 60 });
  }

  const settings = await getEngagementSettings();
  const earnedForInterval = credit * settings.watch_xp_per_minute / 60;
  const availableXp = Number(watch.xpRemainder ?? 0) + earnedForInterval;
  const addedXp = Math.floor(availableXp);
  const nextRemainder = availableXp - addedXp;
  const updated = await db.collection("youtube-watch-sessions").findOneAndUpdate(
    {
      _id: watch._id,
      sessionId: input.sessionId,
      userId: session.user.id,
      videoId: input.videoId,
      invalid: false,
      stoppedAt: { $exists: false },
      expiresAt: { $gt: now },
      lastCurrentTime: watch.lastCurrentTime,
      lastHeartbeatAt: watch.lastHeartbeatAt,
    },
    { $inc: { creditedSeconds: credit }, $set: { lastCurrentTime: input.currentTime, lastHeartbeatAt: now, xpRemainder: nextRemainder } },
    { returnDocument: "after" }
  );
  if (!updated) {
    console.warn("[YouTube XP] Heartbeat rejected: concurrent duplicate", { videoId: input.videoId });
    return NextResponse.json({ error: "تم رفض heartbeat مكرر" }, { status: 409 });
  }

  if (addedXp > 0) {
    await awardXp(session.user.id, addedXp);
    console.info("[YouTube XP] XP awarded", { videoId: input.videoId, amount: addedXp });
  }
  return NextResponse.json({ creditedSeconds: Number(updated.creditedSeconds ?? 0), addedXp, earnedXp: Number(updated.creditedSeconds ?? 0) * settings.watch_xp_per_minute / 60 });
}