import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  await getDb().then((db) => db.collection("users").updateOne({ userId: session.user!.id }, { $set: { lastSeenAt: new Date() } }));
  return NextResponse.json({ success: true });
}