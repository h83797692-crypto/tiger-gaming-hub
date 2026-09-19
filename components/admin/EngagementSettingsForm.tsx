"use client";

import { useEffect, useState } from "react";
import { Save, SlidersHorizontal } from "lucide-react";
import type { EngagementSettings } from "@/lib/engagement-settings";

const fields: Array<[keyof EngagementSettings, string, string]> = [
  ["watch_xp_per_minute", "مشاهدة YouTube / دقيقة", "تُحتسب نسبيًا لكل ثانية أثناء التشغيل الفعلي"],
  ["daily_login_xp", "الدخول اليومي", "تُحتسب تلقائيًا عند أول فتح للموقع يوميًا"],
  ["share_link_xp", "مشاركة الرابط", "محجوزة لحدث مشاركة موثق"],
  ["chat_message_xp", "رسالة الشات", "تُحتسب بعد إرسال رسالة حقيقية"],
  ["clip_upload_xp", "رفع لقطة", "تُحتسب بعد حفظ مقطع ناجح"],
];

export function EngagementSettingsForm() {
  const [settings, setSettings] = useState<EngagementSettings | null>(null);
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/engagement", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((value) => value && setSettings(value));
  }, []);

  if (!settings) return <p className="admin-empty">جارٍ تحميل إعدادات XP...</p>;

  async function save() {
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch("/api/admin/engagement", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "تعذر الحفظ");
      setSettings(payload);
      setNotice("تم حفظ قيم XP");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "تعذر الحفظ");
    } finally {
      setSaving(false);
    }
  }

  return <section className="admin-block" dir="rtl">
    <div className="admin-block__heading"><h4><SlidersHorizontal size={17} /> قيم مكافآت المهام</h4><button type="button" className="gaming-button" onClick={save} disabled={saving}><Save size={15} /> {saving ? "جارٍ الحفظ..." : "حفظ القيم"}</button></div>
    <p className="admin-hint">المكافآت لا تُمنح من هذه الصفحة؛ القيم هنا تُستخدم فقط عند تحقق الحدث الفعلي.</p>
    <div className="admin-grid">{fields.map(([key, label, description]) => <label className="admin-field" key={key}>{label}<input className="admin-input" type="number" min={0} max={10000} value={settings[key]} onChange={(event) => setSettings({ ...settings, [key]: Number(event.target.value) || 0 })} /><small>{description}</small></label>)}</div>
    {notice && <p className="admin-hint">{notice}</p>}
  </section>;
}