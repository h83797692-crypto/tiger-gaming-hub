"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";
import { Copy, Heart, X } from "lucide-react";
import type { SocialSettings } from "@/lib/settings";

function paypalHref(value: string) {
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `mailto:${value}`;
}

export function DonationModal({ initial }: { initial?: Partial<SocialSettings> }) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<Partial<SocialSettings>>(initial ?? {});
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const paypalValue = (settings.paypalEmailOrLink ?? "").trim();
  const ibanValue = (settings.ibanOrBankInfo ?? "").trim();
  const hasDonationMethod = Boolean(paypalValue || ibanValue);

  useEffect(() => {
    setMounted(true);
    fetch("/api/admin/settings")
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => payload && setSettings(payload))
      .catch(() => undefined);
  }, []);

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

  async function copyBankInfo() {
    if (!ibanValue) return;
    await navigator.clipboard.writeText(ibanValue);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <>
      <motion.button type="button" className="donation-trigger" onClick={() => setOpen(true)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
        <Heart size={16} aria-hidden="true" /> دعم المشروع
      </motion.button>
      {mounted && createPortal(<AnimatePresence>
        {open && <motion.div className="donation-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.section className="donation-modal" role="dialog" aria-modal="true" aria-labelledby="donation-title" dir="rtl" initial={{ opacity: 0, y: 16, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.98 }}>
            <button type="button" className="donation-modal__close" onClick={() => setOpen(false)} aria-label="إغلاق"><X size={18} /></button>
            <p className="eyebrow">TIGER GAMING / SUPPORT</p>
            <h2 id="donation-title">طرق الدفع والدعم</h2>
            <p className="donation-message">{settings.customDonationMessage || "شكرًا لدعمك مجتمع Tiger Gaming."}</p>
            {paypalValue && <a className="paypal-button" href={paypalHref(paypalValue)} target="_blank" rel="noreferrer">دعم عبر PayPal 💳</a>}
            {ibanValue && <div className="bank-info-box"><div><strong>التحويل البنكي</strong><p>{ibanValue}</p></div><button type="button" onClick={copyBankInfo} aria-label="نسخ معلومات الحساب"><Copy size={17} />{copied ? "تم النسخ" : "نسخ"}</button></div>}
            {!hasDonationMethod && <p className="donation-empty">لم تتم إضافة طرق الدعم بعد. يمكن للمشرف تفعيلها من <a href="/admin/settings">إعدادات التواصل والدعم</a>.</p>}
          </motion.section>
        </motion.div>}
      </AnimatePresence>, document.body)}
    </>
  );
}