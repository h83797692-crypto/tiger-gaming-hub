import type { Metadata, Viewport } from "next";
import { Cairo, Chakra_Petch } from "next/font/google";
import "./globals.css";
import { getGamingContent } from "@/lib/gaming-content";
import { getSiteContent } from "@/lib/site-content";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Toaster } from "sonner";
import { AnimatedBackground } from "@/components/AnimatedBackground";
import { DonationButton } from "@/components/DonationButton";

const cairo = Cairo({ subsets: ["arabic", "latin"], variable: "--font-cairo", display: "swap" });
const chakra = Chakra_Petch({ subsets: ["latin"], variable: "--font-chakra", display: "swap", weight: ["500", "600", "700"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0A0D14",
};

export async function generateMetadata(): Promise<Metadata> {
  const content = await getGamingContent();
  return {
    title: `${content.brand} — Gaming Hub`,
    description: content.heroSubtitle,
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const content = await getGamingContent();
  const siteContent = await getSiteContent();

  // Arabic locale: dir="rtl" is set at the root, and every component below is
  // built on logical CSS properties so the whole HUD mirrors, not just text.
  return (
    <html lang="ar" dir="rtl" className={`dark ${cairo.variable} ${chakra.variable}`}>
      <body className="min-h-screen font-sans antialiased">
        <AnimatedBackground />
        <DonationButton />
        <Header siteName={content.brand} socialLinks={siteContent.socialLinks} />
        {children}
        <Footer siteName={content.brand} slogan={content.heroSubtitle} socialLinks={siteContent.socialLinks} />
        <Toaster theme="dark" richColors position="top-center" />
      </body>
    </html>
  );
}
