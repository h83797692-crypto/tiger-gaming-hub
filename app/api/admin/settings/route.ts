import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getSocialSettings, updateSocialSettings } from "@/lib/settings";

const optionalText = z.preprocess(
  (value) => (typeof value === "string" ? value.trim() : value ?? ""),
  z.string().max(1000).default("")
);

const settingsSchema = z.object({
  tiktokUrl: optionalText,
  discordUrl: optionalText,
  instagramUrl: optionalText,
  youtubeUrl: optionalText,
  paypalEmailOrLink: optionalText,
  ibanOrBankInfo: optionalText,
  customDonationMessage: optionalText,
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(await getSocialSettings());
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "أدخل روابط صحيحة لكل منصة.", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    return NextResponse.json(await updateSocialSettings(parsed.data));
  } catch (error) {
    console.error("Could not update social settings", error);
    return NextResponse.json({ error: "تعذر حفظ إعدادات التواصل." }, { status: 503 });
  }
}