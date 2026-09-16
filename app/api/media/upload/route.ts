import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
  "video/mp4",
]);
const MAX_SIZE_BYTES = 15 * 1024 * 1024; // 15MB

// NOTE: this stores files on local disk under /public/uploads, which works
// for a single-server deployment. For a scalable production setup, swap this
// for an object store (S3, Cloudinary, Vercel Blob) - the API contract
// (POST multipart/form-data "file" -> { url }) stays the same either way.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File exceeds 15MB limit" }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const ext = path.extname(file.name) || `.${file.type.split("/")[1]}`;
  const filename = `${crypto.randomUUID()}${ext}`;

  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(path.join(uploadsDir, filename), buffer);

  const url = `/uploads/${filename}`;

  const db = await getDb();
  await db.collection("media").insertOne({
    url,
    originalName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    uploadedBy: session.user?.email,
    createdAt: new Date(),
  });

  return NextResponse.json({ url });
}
