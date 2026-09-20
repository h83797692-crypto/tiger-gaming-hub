import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { getUserProfile } from "@/lib/user-profile";
import { completeQuest } from "@/lib/engagement";
import { normaliseRoles, primaryRole, ROLE_DEFINITIONS } from "@/lib/roles";

export const dynamic = "force-dynamic";

let chatIndexReady: Promise<string> | null = null;

async function ensureChatIndexes() {
  chatIndexReady ??= getDb().then((db) => db.collection("chat-messages").createIndex(
    { roomId: 1, createdAt: -1 },
    { name: "room_created_at" }
  ).then(async () => db.collection("chat-messages").createIndex(
    { createdAt: 1 },
    { name: "chat_message_expiry", expireAfterSeconds: 300 }
  )));
  await chatIndexReady;
}

const messageSchema = z.object({
  roomId: z.string().trim().min(1).max(120),
  text: z.string().trim().min(1, "اكتب رسالة أولًا").max(500, "الرسالة طويلة جدًا"),
  replyTo: z.string().trim().max(80).optional().nullable(),
});

function serialiseMessage(document: Record<string, unknown>, userDocument?: Record<string, unknown>) {
  const roles = normaliseRoles(userDocument?.roles ?? userDocument?.role ?? document.roles);
  const role = primaryRole(roles);
  return {
    id: String(document._id ?? ""),
    roomId: String(document.roomId ?? ""),
    text: String(document.text ?? ""),
    replyTo: document.replyTo ? {
      id: String((document.replyTo as { id?: unknown }).id ?? ""),
      name: String((document.replyTo as { name?: unknown }).name ?? "Tiger Player"),
      text: String((document.replyTo as { text?: unknown }).text ?? ""),
    } : null,
    mentions: Array.isArray(document.mentions) ? document.mentions.map(String) : [],
    createdAt: document.createdAt instanceof Date ? document.createdAt.toISOString() : String(document.createdAt ?? ""),
    user: {
      id: String(document.userId ?? ""),
      name: String(document.username ?? "Tiger Player"),
      avatarUrl: String(document.avatarUrl ?? ""),
      frame: document.frame === "champion" ? "champion" : null,
      frameEnabled: document.frameEnabled !== false,
      badge: String(document.badge ?? "PLAYER"),
      xp: Number(document.xp ?? 0),
      roles,
      role,
      roleLabel: ROLE_DEFINITIONS[role].label,
      roleColor: ROLE_DEFINITIONS[role].color,
      online: userDocument?.lastSeenAt instanceof Date && Date.now() - userDocument.lastSeenAt.getTime() < 90_000,
    },
  };
}

async function loadMessages(roomId: string) {
  const db = await getDb();
  const messages = await db.collection("chat-messages").find({ roomId, createdAt: { $gt: new Date(Date.now() - 5 * 60 * 1000) } }).sort({ createdAt: -1 }).limit(80).toArray();
  const ordered = messages.reverse();
  const userIds = Array.from(new Set(ordered.map((message) => String(message.userId ?? "")).filter(Boolean)));
  const users = userIds.length ? await db.collection("users").find({ userId: { $in: userIds } }, { projection: { userId: 1, roles: 1, role: 1, lastSeenAt: 1 } }).toArray() : [];
  const usersById = new Map(users.map((user) => [String(user.userId), user as unknown as Record<string, unknown>]));
  return ordered.map((message) => serialiseMessage(message as unknown as Record<string, unknown>, usersById.get(String(message.userId))));
}

export async function GET(request: NextRequest) {
  const roomId = request.nextUrl.searchParams.get("roomId")?.trim();
  if (!roomId) return NextResponse.json({ error: "Room ID is required" }, { status: 400 });

  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | undefined;
  let closed = false;
  let previousPayload = "";

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const publish = async () => {
        if (closed) return;
        try {
          const payload = JSON.stringify(await loadMessages(roomId));
          if (payload === previousPayload) return;
          previousPayload = payload;
          controller.enqueue(encoder.encode(`event: chat\ndata: ${payload}\n\n`));
        } catch {
          if (!closed) controller.enqueue(encoder.encode(`event: error\ndata: {"error":"تعذر تحديث الشات"}\n\n`));
        }
      };

      void publish();
      timer = setInterval(() => void publish(), 1500);
    },
    cancel() {
      closed = true;
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions).catch(() => null);
  if (!session?.user?.id) return NextResponse.json({ error: "سجّل الدخول بحساب Google لإرسال الرسائل" }, { status: 401 });

  const parsed = messageSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "رسالة غير صالحة" }, { status: 400 });

  try {
    const db = await getDb();
    await ensureChatIndexes();
    const recentMessage = await db.collection("chat-messages").findOne({
      roomId: parsed.data.roomId,
      userId: session.user.id,
      createdAt: { $gt: new Date(Date.now() - 1500) },
    });
    if (recentMessage) return NextResponse.json({ error: "انتظر لحظة قبل إرسال رسالة أخرى" }, { status: 429 });

    const profile = await getUserProfile(session.user.id);
    const leaderboard = await db.collection("leaderboards").findOne({ _id: "community-pass" as any });
    const entry = (leaderboard?.entries ?? []).find((item: { userId?: string }) => item.userId === session.user?.id) as { points?: number } | undefined;
    const xp = Number(entry?.points ?? 0);
    const message = {
      roomId: parsed.data.roomId,
      text: parsed.data.text,
      replyTo: parsed.data.replyTo ? await findReply(db, parsed.data.replyTo, parsed.data.roomId) : null,
      mentions: Array.from(parsed.data.text.matchAll(/@([\p{L}\p{N}_-]{2,30})/gu)).map((match) => match[1]).slice(0, 10),
      userId: session.user.id,
      username: profile?.username || session.user.name || "Tiger Player",
      avatarUrl: profile?.avatarUrl || session.user.image || "",
      frame: profile?.frame ?? null,
      frameEnabled: profile?.frameEnabled !== false,
      badge: xp >= 3000 ? "TIGER" : xp >= 1200 ? "ELITE" : "PLAYER",
      xp,
      roles: profile?.roles ?? ["member"],
      createdAt: new Date(),
    };
    const result = await db.collection("chat-messages").insertOne(message);
    await completeQuest(session.user.id, "chat-drop");
    return NextResponse.json({ success: true, message: serialiseMessage({ ...message, _id: result.insertedId }) });
  } catch (error) {
    console.error("Could not send chat message", error);
    return NextResponse.json({ error: "تعذر إرسال الرسالة حاليًا" }, { status: 503 });
  }
}

async function findReply(db: Awaited<ReturnType<typeof getDb>>, messageId: string, roomId: string) {
  if (!ObjectId.isValid(messageId)) return null;
  const reply = await db.collection("chat-messages").findOne({ _id: new ObjectId(messageId), roomId });
  if (!reply) return null;
  return { id: messageId, name: String(reply.username ?? "Tiger Player"), text: String(reply.text ?? "") };
}
