"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { Instagram, MessageCircle, Music2, Share2, X, Youtube } from "lucide-react";

const DEFAULT_YOUTUBE_URL = "https://www.youtube.com/@tiger.ggaming";

type SocialLinks = { instagram?: string; tiktok?: string; discord?: string; youtubeUrl?: string };

function withSubscriptionPrompt(url: string) {
  try {
    const target = new URL(url);
    target.searchParams.set("sub_confirmation", "1");
    return target.toString();
  } catch {
    return `${DEFAULT_YOUTUBE_URL}?sub_confirmation=1`;
  }
}

export function SocialHubModal({ links = {} }: { links?: SocialLinks }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [dynamicLinks, setDynamicLinks] = useState(links);
  useEffect(() => {
    setMounted(true);
    fetch("/api/admin/settings")
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => payload && setDynamicLinks(payload))
      .catch(() => undefined);
  }, []);

  const socials = [
    { label: "TikTok", href: dynamicLinks.tiktok || "https://www.tiktok.com/@tiger.ggaming", icon: Music2, className: "social-link--tiktok" },
    { label: "Discord", href: dynamicLinks.discord || "https://discord.com/", icon: MessageCircle, className: "social-link--discord" },
    { label: "Instagram", href: dynamicLinks.instagram || "https://www.instagram.com/tiger.ggaming/", icon: Instagram, className: "social-link--instagram" },
  ];

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <>
      <motion.button type="button" className="social-hub-button" onClick={() => setOpen(true)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Share2 size={16} aria-hidden="true" />
        <span>التواصل Social</span>
      </motion.button>
      <motion.a href={withSubscriptionPrompt(dynamicLinks.youtubeUrl || DEFAULT_YOUTUBE_URL)} target="_blank" rel="noreferrer" className="youtube-cta-button" whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Youtube size={17} aria-hidden="true" />
        <span>اشترك YouTube</span>
      </motion.a>

      {mounted && createPortal(
        <AnimatePresence>
          {open && (
            <motion.div className="social-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.section className="social-modal relative w-full max-w-xl overflow-hidden rounded-2xl border border-[#00F0FF]/40 bg-[#07090E]/90 p-6 shadow-[0_0_30px_rgba(0,240,255,0.2)] backdrop-blur-xl" role="dialog" aria-modal="true" aria-labelledby="social-modal-title" dir="rtl" initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }}>
                <button type="button" className="social-modal__close" onClick={() => setOpen(false)} aria-label="إغلاق">✕</button>
                <p className="eyebrow">TIGER NETWORK / SOCIAL HUB</p>
                <h2 id="social-modal-title">التواصل مع المجتمع</h2>
                <p className="social-modal__copy">تابع أخبار البطولات، اللقطات الحية، ومجتمع Tiger Gaming.</p>
                <div className="social-links-grid">
                  {socials.map(({ label, href, icon: Icon, className }) => <motion.a key={label} href={href} target="_blank" rel="noreferrer" className={`social-link ${className}`} whileHover={{ y: -4, scale: 1.1 }} whileTap={{ scale: 0.97 }}><Icon size={28} aria-hidden="true" /><span>{label}</span><small>OPEN CHANNEL ↗</small></motion.a>)}
                </div>
              </motion.section>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}