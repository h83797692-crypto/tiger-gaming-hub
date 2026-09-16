import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getSocialSettings, updateSocialSettings } from "@/lib/settings";

const settingsSchema = z.object({
  tiktokUrl: z.string().url().max(300).or(z.literal("")),
  discordUrl: z.string().url().max(300).or(z.literal("")),
  instagramUrl: z.string().url().max(300).or(z.literal("")),
  youtubeUrl: z.string().url().max(300).or(z.literal("")),
  paypalEmailOrLink: z.union([z.string().url().max(300), z.string().email().max(160), z.literal("")]),
  ibanOrBankInfo: z.string().max(1000),
  customDonationMessage: z.string().max(500),
});

export async function GET() {
  return NextResponse.json(await getSocialSettings());
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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