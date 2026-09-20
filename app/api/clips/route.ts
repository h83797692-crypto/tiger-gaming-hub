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

function serialiseClip(clip: Record<string, unknown>, userVote: "upvote" | "downvote" | null = null) {
  const upvotes = Number(clip.upvotes ?? clip.votes ?? 0);
  const downvotes = Number(clip.downvotes ?? 0);
  return {
    id: String(clip._id ?? ""),
    title: String(clip.title ?? ""),
    url: String(clip.url ?? ""),
    mediaType: clip.mediaType === "image" ? "image" : "video",
    description: String(clip.description ?? ""),
    votes: upvotes - downvotes,
    upvotes,
    downvotes,
    userVote,
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
    const session = await getServerSession(authOptions).catch(() => null);
    const clips = await db.collection("clips").find({ status: "published" }).sort({ votes: -1, createdAt: -1 }).limit(50).toArray();
    const clipIds = clips.map((clip) => String(clip._id));
    const userVotes = session?.user?.id
      ? await db.collection("clip-votes").find({ userId: session.user.id, clipId: { $in: clipIds } }).toArray()
      : [];
    const votesByClipId = new Map(userVotes.map((vote) => [String(vote.clipId), vote.vote === "upvote" || vote.vote === "downvote" ? vote.vote : null]));
    return NextResponse.json({ clips: clips.map((clip) => serialiseClip(clip as unknown as Record<string, unknown>, votesByClipId.get(String(clip._id)) ?? null)) });
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
  const payload = await request.json().catch(() => null) as { clipId?: string; vote?: "upvote" | "downvote" } | null;
  if (!payload?.clipId || payload.clipId.length > 100) return NextResponse.json({ error: "المقطع غير صالح" }, { status: 400 });
  if (payload.vote !== "upvote" && payload.vote !== "downvote") return NextResponse.json({ error: "نوع التصويت غير صالح" }, { status: 400 });

  try {
    const db = await getDb();
    await ensureClipIndexes();
    const clip = await db.collection("clips").findOne({ _id: new (await import("mongodb")).ObjectId(payload.clipId), status: "published" });
    if (!clip) return NextResponse.json({ error: "لم يتم العثور على المقطع" }, { status: 404 });
    const existingVote = await db.collection("clip-votes").findOne({ clipId: payload.clipId, userId: session.user.id });
    const previousVote = existingVote?.vote === "downvote" ? -1 : existingVote ? 1 : 0;
    const removingVote = existingVote?.vote === payload.vote;
    const nextUserVote = removingVote ? null : payload.vote;
    const nextVote = nextUserVote === "upvote" ? 1 : nextUserVote === "downvote" ? -1 : 0;
    const voteDelta = nextVote - previousVote;
    if (removingVote) {
      await db.collection("clip-votes").deleteOne({ _id: existingVote?._id });
    } else {
      await db.collection("clip-votes").updateOne(
        { clipId: payload.clipId, userId: session.user.id },
        { $set: { vote: nextUserVote, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
        { upsert: true }
      );
    }
    const updated = await db.collection("clips").findOneAndUpdate(
      { _id: clip._id },
      { $inc: { votes: voteDelta, upvotes: nextUserVote === "upvote" ? 1 : previousVote === 1 ? -1 : 0, downvotes: nextUserVote === "downvote" ? 1 : previousVote === -1 ? -1 : 0 } },
      { returnDocument: "after" }
    );
    if (updated) {
      const total = Number(updated.votes ?? 0);
      const creator = await getUserProfile(String(updated.userId));
      const weekStart = new Date(Date.now() - 7 * 86400000);
      const weeklyWinner = await db.collection("clips").find({ status: "published", createdAt: { $gte: weekStart } }).sort({ votes: -1, createdAt: -1 }).limit(1).next();
      if (weeklyWinner?._id.equals(updated._id) && total >= 10 && creator && !(creator.badges ?? []).some((badge) => badge.id === "comedian")) {
        await awardXp(String(updated.userId), 50, "comedian");
      }
    }
    return NextResponse.json({ success: true, votes: Number(updated?.votes ?? clip.votes ?? 0), upvotes: Number(updated?.upvotes ?? 0), downvotes: Number(updated?.downvotes ?? 0), vote: nextUserVote });
  } catch (error) {
    console.error("Could not vote for clip", error);
    return NextResponse.json({ error: "تعذر تسجيل التصويت" }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions).catch(() => null);
  if (session?.user?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const clipId = request.nextUrl.searchParams.get("clipId");
  if (!clipId || !ObjectId.isValid(clipId)) return NextResponse.json({ error: "المقطع غير صالح" }, { status: 400 });

  try {
    const db = await getDb();
    const clip = await db.collection("clips").findOne({ _id: new ObjectId(clipId) });
    if (!clip) return NextResponse.json({ error: "لم يتم العثور على المقطع" }, { status: 404 });
    await db.collection("clips").deleteOne({ _id: clip._id });
    await db.collection("clip-votes").deleteMany({ clipId });
    if (clip.mediaId && ObjectId.isValid(String(clip.mediaId))) {
      await db.collection("media").deleteOne({ _id: new ObjectId(String(clip.mediaId)) });
    }
    return NextResponse.json({ success: true, clipId });
  } catch (error) {
    console.error("Could not delete clip", error);
    return NextResponse.json({ error: "تعذر حذف المقطع" }, { status: 503 });
  }
}
