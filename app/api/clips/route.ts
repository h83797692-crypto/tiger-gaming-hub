import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { completeQuest, getBadge, awardXp } from "@/lib/engagement";
import { getUserProfile } from "@/lib/user-profile";

export const dynamic = "force-dynamic";

let clipIndexReady: Promise<string[]> | null = null;

async function ensureClipIndexes() {
  clipIndexReady ??= getDb().then(async (db) => Promise.all([
    db.collection("clip-votes").createIndex({ clipId: 1, userId: 1 }, { unique: true, name: "unique_clip_vote" }),
    db.collection("clips").createIndex({ mediaId: 1 }, { unique: true, sparse: true, name: "unique_clip_media" }),
  ]));
  await clipIndexReady;
}

const clipSchema = z.object({
  title: z.string().trim().min(3, "اكتب عنوانًا للمقطع").max(120),
  mediaId: z.string().trim().min(1).max(80),
  url: z.string().trim().url("أدخل رابط فيديو صالحًا").max(1000),
  mediaType: z.enum(["image", "video"]).default("video"),
  description: z.string().trim().max(300).optional().default(""),
});

function serialiseClip(clip: Record<string, unknown>) {
  return {
    id: String(clip._id ?? ""),
    title: String(clip.title ?? ""),
    url: String(clip.url ?? ""),
    mediaType: clip.mediaType === "image" ? "image" : "video",
    description: String(clip.description ?? ""),
    votes: Number(clip.votes ?? 0),
    createdAt: clip.createdAt instanceof Date ? clip.createdAt.toISOString() : String(clip.createdAt ?? ""),
    creator: {
      id: String(clip.userId ?? ""),
      name: String(clip.username ?? "Tiger Player"),
      avatarUrl: String(clip.avatarUrl ?? ""),
      frame: clip.frame === "champion" ? "champion" : null,
      frameEnabled: clip.frameEnabled !== false,
    },
  };
}

export async function GET() {
  try {
    const db = await getDb();
    const clips = await db.collection("clips").find({ status: "published" }).sort({ votes: -1, createdAt: -1 }).limit(50).toArray();
    return NextResponse.json({ clips: clips.map((clip) => serialiseClip(clip as unknown as Record<string, unknown>)) });
  } catch (error) {
    console.error("Could not load clips", error);
    return NextResponse.json({ error: "تعذر تحميل المقاطع" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "سجّل الدخول بحساب Google لرفع مقطع" }, { status: 401 });
  const parsed = clipSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "بيانات المقطع غير صالحة" }, { status: 400 });

  try {
    const profile = await getUserProfile(session.user.id);
    const db = await getDb();
    await ensureClipIndexes();
    if (!ObjectId.isValid(parsed.data.mediaId)) return NextResponse.json({ error: "ملف الرفع غير صالح" }, { status: 400 });
    const media = await db.collection("media").findOne({ _id: new ObjectId(parsed.data.mediaId), uploadedByUserId: session.user.id, url: parsed.data.url });
    if (!media) return NextResponse.json({ error: "يجب رفع اللقطة عبر Cloudinary قبل نشرها" }, { status: 400 });
    const clip = {
      ...parsed.data,
      userId: session.user.id,
      username: profile?.username || session.user.name || "Tiger Player",
      avatarUrl: profile?.avatarUrl || session.user.image || "",
      frame: profile?.frame ?? null,
      frameEnabled: profile?.frameEnabled !== false,
      votes: 0,
      status: "published",
      createdAt: new Date(),
    };
    const result = await db.collection("clips").insertOne(clip);
    await completeQuest(session.user.id, "weekly-clip");
    return NextResponse.json({ success: true, clip: serialiseClip({ ...clip, _id: result.insertedId }) });
  } catch (error) {
    console.error("Could not create clip", error);
    return NextResponse.json({ error: "تعذر رفع المقطع" }, { status: 503 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "سجّل الدخول للتصويت" }, { status: 401 });
  const payload = await request.json().catch(() => null) as { clipId?: string } | null;
  if (!payload?.clipId || payload.clipId.length > 100) return NextResponse.json({ error: "المقطع غير صالح" }, { status: 400 });

  try {
    const db = await getDb();
    await ensureClipIndexes();
    const clip = await db.collection("clips").findOne({ _id: new (await import("mongodb")).ObjectId(payload.clipId), status: "published" });
    if (!clip) return NextResponse.json({ error: "لم يتم العثور على المقطع" }, { status: 404 });
    const existingVote = await db.collection("clip-votes").findOne({ clipId: payload.clipId, userId: session.user.id });
    if (existingVote) return NextResponse.json({ error: "صوّت لهذا المقطع مسبقًا" }, { status: 409 });
    await db.collection("clip-votes").insertOne({ clipId: payload.clipId, userId: session.user.id, createdAt: new Date() });
    const updated = await db.collection("clips").findOneAndUpdate({ _id: clip._id }, { $inc: { votes: 1 } }, { returnDocument: "after" });
    if (updated) {
      const total = Number(updated.votes ?? 0);
      const creator = await getUserProfile(String(updated.userId));
      const weekStart = new Date(Date.now() - 7 * 86400000);
      const weeklyWinner = await db.collection("clips").find({ status: "published", createdAt: { $gte: weekStart } }).sort({ votes: -1, createdAt: -1 }).limit(1).next();
      if (weeklyWinner?._id.equals(updated._id) && total >= 10 && creator && !(creator.badges ?? []).some((badge) => badge.id === "comedian")) {
        await awardXp(String(updated.userId), 50, "comedian");
      }
    }
    return NextResponse.json({ success: true, votes: Number(updated?.votes ?? clip.votes ?? 0) });
  } catch (error) {
    console.error("Could not vote for clip", error);
    return NextResponse.json({ error: "تعذر تسجيل التصويت" }, { status: 503 });
  }
}
