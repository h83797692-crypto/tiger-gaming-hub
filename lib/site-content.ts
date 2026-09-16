import { getDb } from "@/lib/mongodb";

export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  whatsapp?: string;
  linkedin?: string;
  tiktok?: string;
  github?: string;
  x?: string;
}

export interface SiteContent {
  siteName: string;
  slogan: string;
  heroHeadline: string;
  heroSubheading: string;
  aboutTitle: string;
  aboutBody: string;
  heroImageUrl: string;
  contactEmail: string;
  contactPhone: string;
  socialLinks: SocialLinks;
  updatedAt?: Date;
}

export const DEFAULT_CONTENT: SiteContent = {
  siteName: "ReemWeb",
  slogan: "Building Premium Digital Experiences.",
  heroHeadline: "We design and build premium digital experiences.",
  heroSubheading:
    "ReemWeb is a web design and software development agency crafting high-end websites, e-commerce, and custom web applications.",
  aboutTitle: "About ReemWeb",
  aboutBody:
    "ReemWeb specializes in high-end websites, e-commerce solutions, custom web applications, UI/UX design, branding, SEO, hosting, and AI-powered solutions.",
  heroImageUrl: "",
  contactEmail: "hello@reemweb.com",
  contactPhone: "",
  socialLinks: {},
};

const CONTENT_DOC_ID = "site-content";

export async function getSiteContent(): Promise<SiteContent> {
  try {
    const db = await getDb();
    const doc = await db.collection("content").findOne({ _id: CONTENT_DOC_ID as any });
    if (!doc) {
      return DEFAULT_CONTENT;
    }
    const { _id, ...rest } = doc as any;
    return { ...DEFAULT_CONTENT, ...rest };
  } catch (error) {
    console.error("MongoDB unavailable; serving default site content.", error);
    return DEFAULT_CONTENT;
  }
}

export async function updateSiteContent(patch: Partial<SiteContent>): Promise<SiteContent> {
  const db = await getDb();
  await db.collection("content").updateOne(
    { _id: CONTENT_DOC_ID as any },
    { $set: { ...patch, updatedAt: new Date() } },
    { upsert: true }
  );
  return getSiteContent();
}
