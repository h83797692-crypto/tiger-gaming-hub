import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
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

function configureCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      "Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET."
    );
  }

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
}

async function uploadToCloudinary(buffer: Buffer, resourceType: "image" | "video") {
  configureCloudinary();

  return new Promise<UploadApiResponse>((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: "tiger-gaming",
        resource_type: resourceType,
        use_filename: false,
        unique_filename: true,
        overwrite: false,
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed"));
          return;
        }
        resolve(result);
      }
    );

    upload.end(buffer);
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid multipart upload" }, { status: 400 });
  }

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

  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const resourceType = file.type === "video/mp4" ? "video" : "image";
    const uploaded = await uploadToCloudinary(buffer, resourceType);
    const url = uploaded.secure_url;

    const db = await getDb();
    await db.collection("media").insertOne({
      url,
      publicId: uploaded.public_id,
      provider: "cloudinary",
      originalName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      uploadedBy: session.user?.email,
      createdAt: new Date(),
    });

    return NextResponse.json({ url, publicId: uploaded.public_id, provider: "cloudinary" });
  } catch (error) {
    console.error("Cloudinary media upload failed", error);
    const message = error instanceof Error ? error.message : "Cloudinary upload failed";
    const status = message.startsWith("Cloudinary is not configured") ? 503 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
