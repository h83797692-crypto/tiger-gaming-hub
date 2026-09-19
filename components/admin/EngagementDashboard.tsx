"use client";

import { useEffect, useState } from "react";
import { Clapperboard, RefreshCw, Trophy } from "lucide-react";

type Clip = { id: string; title: string; votes: number; creator: { name: string }; url: string };
export function EngagementDashboard() {
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(false);
  async function refresh() {
    setLoading(true);
    try {
      const response = await fetch("/api/clips", { cache: "no-store" });
      if (response.ok) setClips((await response.json()).clips ?? []);
    } finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);

  return <div className="engagement-admin admin-stack" dir="rtl">
    <div className="admin-block"><p className="admin-hint">تتم إدارة قيم جميع المهمات من قسم «قيم المهام» لتجنب وجود قيم ثابتة متعارضة.</p></div>
    <div className="admin-block"><div className="admin-block__heading"><h4><Clapperboard size={17} /> مقاطع المجتمع</h4><button type="button" className="admin-refresh" onClick={refresh} disabled={loading}><RefreshCw size={15} /> تحديث</button></div>{clips.length === 0 ? <p className="admin-hint">لا توجد مقاطع منشورة بعد.</p> : <div className="clip-admin-list">{clips.map((clip) => <article key={clip.id}><a href={clip.url} target="_blank" rel="noreferrer">{clip.title}</a><span>{clip.creator.name}</span><b>{clip.votes} تصويت</b></article>)}</div>}</div>
    <div className="admin-block engagement-admin__note"><Trophy size={18} /><p>الفائز الأسبوعي هو الأعلى تصويتًا. عند بلوغ 10 أصوات يحصل صاحبه على +50 XP ووسام «مهرج الموسم» تلقائيًا.</p></div>
  </div>;
}
