import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { getSiteContent, updateSiteContent } from "@/lib/site-content";

const contentSchema = z.object({
  siteName: z.string().min(1).max(80).optional(),
  slogan: z.string().max(200).optional(),
  heroHeadline: z.string().max(200).optional(),
  heroSubheading: z.string().max(500).optional(),
  aboutTitle: z.string().max(120).optional(),
  aboutBody: z.string().max(2000).optional(),
  heroImageUrl: z.string().max(500).optional(),
  contactEmail: z.string().email().max(120).optional().or(z.literal("")),
  contactPhone: z.string().max(40).optional(),
  socialLinks: z
    .object({
      facebook: z.string().url().max(300).optional().or(z.literal("")),
      instagram: z.string().url().max(300).optional().or(z.literal("")),
      whatsapp: z.string().max(300).optional().or(z.literal("")),
      linkedin: z.string().url().max(300).optional().or(z.literal("")),
      tiktok: z.string().url().max(300).optional().or(z.literal("")),
      github: z.string().url().max(300).optional().or(z.literal("")),
      x: z.string().url().max(300).optional().or(z.literal("")),
    })
    .partial()
    .optional(),
});

export async function GET() {
  const content = await getSiteContent();
  return NextResponse.json(content);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = contentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const updated = await updateSiteContent(parsed.data);
  return NextResponse.json(updated);
}
