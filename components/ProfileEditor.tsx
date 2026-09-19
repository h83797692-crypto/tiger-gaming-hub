"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { Check, ImagePlus, Link2, LogIn, Save, ShieldCheck, Sparkles, Upload } from "lucide-react";
import type { UserProfile } from "@/lib/user-profile";
import { UserAvatar } from "@/components/UserAvatar";
import { EngagementPanel } from "@/components/EngagementPanel";

export function ProfileEditor() {
  const { data: session, status, update } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [frameEnabled, setFrameEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/profile", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((data: UserProfile | null) => {
        if (!data) return;
        setProfile(data);
        setUsername(data.username);
        setAvatarUrl(data.avatarUrl);
        setFrameEnabled(data.frameEnabled);
      })
      .catch(() => setError("تعذر تحميل بيانات الملف الشخصي"));
  }, [status]);

  async function uploadAvatar(file: File) {
    setUploading(true);
    setError(null);
    setMessage(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/media/upload", { method: "POST", body });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "تعذر رفع الصورة");
      setAvatarUrl(payload.url);
      setMessage("تم رفع الصورة، اضغط حفظ لتثبيتها على ملفك.");
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "تعذر رفع الصورة");
    } finally {
      setUploading(false);
    }
  }

  async function saveProfile() {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, avatarUrl, frameEnabled }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "تعذر حفظ الملف الشخصي");
      setProfile(payload);
      await update({ name: payload.username, image: payload.avatarUrl });
      setMessage("تم حفظ ملفك الشخصي بنجاح.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "تعذر حفظ الملف الشخصي");
    } finally {
      setSaving(false);
    }
  }

  if (status === "loading") return <main className="profile-page"><p className="profile-state">جارٍ تحميل حسابك...</p></main>;

  if (status !== "authenticated") {
    return <main className="profile-page" dir="rtl"><div className="profile-login-state"><LogIn size={30} /><h1>ملف اللاعب</h1><p>سجّل الدخول بحساب Google لتخصيص لقبك وصورتك وإطارات إنجازاتك.</p><button type="button" className="gaming-button" onClick={() => signIn("google", { callbackUrl: "/profile" })}>المتابعة مع Google</button></div></main>;
  }

  const previewProfile = { ...(profile ?? {}), username, avatarUrl, frameEnabled } as UserProfile;

  return (
    <main className="profile-page" dir="rtl">
      <div className="profile-page__heading">
        <p className="eyebrow">PLAYER IDENTITY / PROFILE</p>
        <h1>ملفك الشخصي</h1>
        <p>اختر كيف يظهر اسمك وصورتك في مجتمع Tiger Gaming.</p>
      </div>

      <div className="profile-layout">
        <section className="profile-preview hud-panel">
          <span className="profile-preview__label">LIVE PREVIEW</span>
          <UserAvatar profile={previewProfile} size="lg" />
          <h2>{username || "Tiger Player"}</h2>
          <p>{session.user?.email}</p>
          <p className="profile-preview__xp">XP: {profile?.xp ?? 0}</p>
          <div className="profile-preview__status"><ShieldCheck size={15} /> {frameEnabled && profile?.frame === "champion" ? "CHAMPION FRAME ACTIVE" : "COMMUNITY PLAYER"}</div>
        </section>

        <section className="profile-form hud-panel">
          <div className="profile-form__section-heading"><Sparkles size={18} /><div><h2>هوية اللاعب</h2><p>هذه البيانات تظهر في المتصدرين وشجرة البطولات.</p></div></div>
          <label className="profile-field"><span>اللقب الظاهر</span><input value={username} minLength={2} maxLength={24} onChange={(event) => setUsername(event.target.value)} placeholder="Tiger Player" /></label>

          <div className="profile-form__section-heading"><ImagePlus size={18} /><div><h2>الصورة الشخصية</h2><p>استخدم رابط صورة أو ارفع ملفًا من جهازك.</p></div></div>
          <label className="profile-field"><span>رابط الصورة</span><span className="profile-input-with-icon"><Link2 size={16} /><input dir="ltr" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://..." /></span></label>
          <label className="profile-upload"><Upload size={17} /><span>{uploading ? "جارٍ الرفع..." : "رفع صورة مخصصة"}</span><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" disabled={uploading} onChange={(event) => event.target.files?.[0] && uploadAvatar(event.target.files[0])} /></label>

          <div className="profile-frame-setting"><div><div className="profile-form__section-heading"><Sparkles size={18} /><div><h2>إطار الإنجاز</h2><p>{profile?.frame === "champion" ? "إطار بطل البطولة متاح لحسابك." : "أكمل بطولة في المركز الأول لفتح الإطار."}</p></div></div></div><button type="button" className={`profile-switch${frameEnabled ? " is-on" : ""}`} aria-pressed={frameEnabled} onClick={() => setFrameEnabled((value) => !value)} disabled={profile?.frame !== "champion"}><span /></button></div>

          {error && <p className="profile-message profile-message--error">{error}</p>}
          {message && <p className="profile-message profile-message--success"><Check size={16} />{message}</p>}
          <button type="button" className="gaming-button profile-save" onClick={saveProfile} disabled={saving || uploading}><Save size={17} />{saving ? "جارٍ الحفظ..." : "حفظ التغييرات"}</button>
        </section>
      </div>

      <EngagementPanel compact />
      <section className="profile-badges hud-panel" aria-labelledby="profile-badges-title">
        <div className="profile-form__section-heading"><Sparkles size={18} /><div><h2 id="profile-badges-title">خزانة الأوسمة</h2><p>إنجازاتك التي تستحق أن تلمع أمام المجتمع.</p></div></div>
        <div className="profile-badges__grid">{profile?.badges?.length ? profile.badges.map((badge) => <article className="profile-badge" key={badge.id}><span>{badge.icon}</span><strong>{badge.label}</strong><small>{badge.description}</small></article>) : <p className="profile-badges__empty">ابدأ بالمهمات اليومية لفتح أول وسام.</p>}</div>
      </section>
    </main>
  );
}
