"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { SocialSettings } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const FIELDS: { key: keyof SocialSettings; label: string; placeholder: string }[] = [
  { key: "tiktokUrl", label: "TikTok Profile URL", placeholder: "https://www.tiktok.com/@tiger.ggaming" },
  { key: "discordUrl", label: "Discord Server Invite Link", placeholder: "https://discord.gg/your-server" },
  { key: "instagramUrl", label: "Instagram Profile URL", placeholder: "https://www.instagram.com/tiger.ggaming/" },
  { key: "youtubeUrl", label: "YouTube Channel URL", placeholder: "https://www.youtube.com/@tiger.ggaming" },
  { key: "paypalEmailOrLink", label: "رابط PayPal / PayPal Link", placeholder: "https://paypal.me/tigergaming أو بريد PayPal" },
  { key: "ibanOrBankInfo", label: "معلومات الحساب البنكي / IBAN (اختياري)", placeholder: "IBAN أو تعليمات التحويل البنكي" },
  { key: "customDonationMessage", label: "رسالة شكر الداعمين", placeholder: "شكرًا لدعمك مجتمع Tiger Gaming." },
];

export function SocialSettingsForm({ initial }: { initial: SocialSettings }) {
  const [settings, setSettings] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => payload && setSettings(payload))
      .finally(() => setLoaded(true));
  }, []);

  async function save() {
    setSaving(true);
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const payload = response.headers.get("content-type")?.includes("application/json")
        ? await response.json().catch(() => ({}))
        : {};

      if (!response.ok) {
        throw new Error(payload.error ?? "تعذر الحفظ");
      }

      setSettings(payload ?? settings);
      toast.success("تم حفظ التغييرات بنجاح ✅");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر الحفظ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card dir="rtl">
      <CardHeader>
        <p className="eyebrow">CONTROL ROOM / SOCIAL CONFIG</p>
        <CardTitle>إعدادات التواصل الاجتماعي / Social Links</CardTitle>
      </CardHeader>
      <div className="admin-stack">
        {FIELDS.map(({ key, label, placeholder }) => {
          const value = settings[key];
          return (
            <div className="admin-field" key={key}>
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor={key}>{label}</Label>
                <span className={value ? "settings-status is-active" : "settings-status"}>{value ? "مفعّل" : "استخدم الرابط الافتراضي"}</span>
              </div>
              {key === "ibanOrBankInfo" || key === "customDonationMessage" ? (
                <textarea id={key} dir={key === "ibanOrBankInfo" ? "ltr" : "rtl"} className="admin-textarea" value={value} placeholder={placeholder} onChange={(event) => setSettings((current) => ({ ...current, [key]: event.target.value }))} />
              ) : (
                <Input id={key} dir="ltr" value={value} placeholder={placeholder} onChange={(event) => setSettings((current) => ({ ...current, [key]: event.target.value }))} />
              )}
            </div>
          );
        })}
      </div>
      <Button className="mt-6" onClick={save} disabled={saving || !loaded}>
        {saving ? "جارٍ الحفظ..." : "حفظ التغييرات / Save Settings"}
      </Button>
    </Card>
  );
}