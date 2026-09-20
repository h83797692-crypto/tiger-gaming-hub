"use client";

import { FormEvent, useEffect, useState } from "react";
import { Clapperboard, LogIn, ThumbsDown, ThumbsUp, Upload } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { UserAvatar } from "@/components/UserAvatar";

type Clip = {
  id: string;
  title: string;
  url: string;
  mediaType: "image" | "video";
  description: string;
  votes: number;
  upvotes: number;
  downvotes: number;
  creator: { name: string; avatarUrl: string; frame: "champion" | null; frameEnabled: boolean };
};

export function ClipHall() {
  const { data: session, status } = useSession();
  const [clips, setClips] = useState<Clip[]>([]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [mediaId, setMediaId] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video">("video");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    const response = await fetch("/api/clips", { cache: "no-store" });
    if (response.ok) setClips((await response.json()).clips ?? []);
  }
  useEffect(() => { void load(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !url.trim() || busy) return;
    setBusy(true); setNotice(null);
    try {
      const response = await fetch("/api/clips", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, url, mediaId, mediaType, description }) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "تعذر رفع المقطع");
      setTitle(""); setUrl(""); setMediaId(""); setDescription(""); setNotice("تم نشر المقطع. ابدأ حملة التصويت!"); await load();
    } catch (error) { setNotice(error instanceof Error ? error.message : "تعذر رفع المقطع"); }
    finally { setBusy(false); }
  }

  async function uploadFile(file: File) {
    setUploading(true); setNotice(null);
    try {
      const body = new FormData(); body.append("file", file);
      const response = await fetch("/api/media/upload", { method: "POST", body });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "تعذر رفع الفيديو");
      setUrl(payload.url); setMediaId(payload.id); setMediaType(payload.resourceType); setNotice("تم رفع الملف. أضف عنوانًا ثم انشره.");
    } catch (error) { setNotice(error instanceof Error ? error.message : "تعذر رفع الفيديو"); }
    finally { setUploading(false); }
  }

  async function vote(clipId: string, voteType: "upvote" | "downvote") {
    const response = await fetch("/api/clips", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clipId, vote: voteType }) });
    const payload = await response.json();
    if (!response.ok) { setNotice(payload.error ?? "تعذر تسجيل التصويت"); return; }
    setClips((current) => current.map((clip) => clip.id === clipId ? { ...clip, votes: payload.votes, upvotes: payload.upvotes, downvotes: payload.downvotes } : clip));
  }

  return <section className="clip-hall section-shell" id="clips" dir="rtl">
    <div className="section-heading"><p className="eyebrow">04 / TIGER CLIPS</p><h2>قاعة الفهاوة</h2><p>أغرب اللقطات، أذكى القلتشات، وأكثر هزائمنا أناقة. مقطع الأسبوع يأخذ XP ووسامًا.</p></div>
    {status === "authenticated" ? <form className="clip-upload-form hud-panel" onSubmit={submit}><div className="clip-upload-form__title"><Upload size={18} /><strong>ارفع لقطة لا ترحم</strong></div><input value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder="عنوان المقطع" aria-label="عنوان المقطع" /><label className="clip-file-upload"><Upload size={15} /> {uploading ? "جارٍ الرفع..." : "رفع صورة أو MP4"}<input type="file" accept="image/png,image/jpeg,image/webp,video/mp4" disabled={uploading} onChange={(event) => event.target.files?.[0] && uploadFile(event.target.files[0])} /></label><textarea value={description} maxLength={300} onChange={(event) => setDescription(event.target.value)} placeholder="ما الذي حدث؟" aria-label="وصف المقطع" /><button className="gaming-button" type="submit" disabled={busy || uploading || !title.trim() || !url.trim() || !mediaId}>{busy ? "جارٍ النشر..." : "نشر المقطع"}</button></form> : <button type="button" className="clip-login gaming-button" onClick={() => signIn("google", { callbackUrl: window.location.href })}><LogIn size={16} /> سجّل الدخول لرفع مقطع</button>}
    {notice && <p className="clip-notice">{notice}</p>}
    <div className="clip-grid">{clips.map((clip) => <article className="clip-card hud-panel" key={clip.id}><div className="clip-card__media">{clip.mediaType === "image" ? <img src={clip.url} alt={clip.title} /> : <video src={clip.url} controls preload="metadata" />}</div><div className="clip-card__body"><div className="clip-card__creator"><UserAvatar size="sm" name={clip.creator.name} avatarUrl={clip.creator.avatarUrl} profile={clip.creator} /><strong>{clip.creator.name}</strong></div><h3>{clip.title}</h3>{clip.description && <p>{clip.description}</p>}<div><button type="button" className="clip-vote clip-vote--up" onClick={() => vote(clip.id, "upvote")} disabled={status !== "authenticated"}><ThumbsUp size={15} /> {clip.upvotes} إعجاب</button><button type="button" className="clip-vote clip-vote--down" onClick={() => vote(clip.id, "downvote")} disabled={status !== "authenticated"}><ThumbsDown size={15} /> {clip.downvotes} لم يعجبني</button></div></div></article>)}</div>
    {clips.length === 0 && <div className="clip-empty"><Clapperboard size={24} /> لا توجد مقاطع بعد. المنصة تنتظر أول لقطة محرجة.</div>}
  </section>;
}
