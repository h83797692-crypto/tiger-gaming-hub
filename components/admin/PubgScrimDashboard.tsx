"use client";

import { useEffect, useState } from "react";
import type { Tournament } from "@/lib/gaming-content";
import { getPubgPoints } from "@/lib/pubg-scrims";

type PubgResult = {
  teamId: string;
  teamName: string;
  members: string[];
  placement: number;
  kills: number;
  placementPoints: number;
  points: number;
};

export function PubgScrimDashboard({ tournament }: { tournament: Tournament }) {
  const [results, setResults] = useState<PubgResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removingTeamId, setRemovingTeamId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    try {
      const response = await fetch(`/api/tournaments/bracket?tournamentId=${encodeURIComponent(tournament.id)}`);
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "تعذر تحميل نتائج PUBG");
      setResults(payload.pubgResults ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر تحميل نتائج PUBG");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [tournament.id]);

  async function save() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch("/api/tournaments/bracket", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tournamentId: tournament.id,
          pubgResults: results.map(({ teamId, placement, kills }) => ({ teamId, placement, kills })),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "تعذر حفظ نتائج PUBG");
      setResults(payload.pubgResults ?? results);
      setMessage("تم حفظ النتائج وحساب نقاط الروم بنجاح.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر حفظ نتائج PUBG");
    } finally {
      setSaving(false);
    }
  }

  async function removeTeam(teamId: string) {
    if (!window.confirm("هل تريد إلغاء حجز هذا التيم وإتاحته للتسجيل من جديد؟")) return;
    setRemovingTeamId(teamId);
    setMessage("");
    try {
      const response = await fetch(`/api/tournaments/register?tournamentId=${encodeURIComponent(tournament.id)}&teamId=${encodeURIComponent(teamId)}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "تعذر إلغاء حجز التيم");
      await load();
      setMessage("تم إلغاء حجز التيم وإعادته إلى قائمة الفرق المتاحة.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذر إلغاء حجز التيم");
    } finally {
      setRemovingTeamId(null);
    }
  }

  if (loading) return <p className="admin-empty">جارٍ تحميل فرق PUBG...</p>;

  return (
    <div className="admin-stack" dir="rtl">
      <div className="admin-block">
        <h3>{tournament.title} · PUBG Custom Room</h3>
        <p className="admin-hint">عدد الفرق: {results.length} · النقاط = نقاط المركز + مجموع الكيلات</p>
      </div>
      {results.length === 0 ? <p className="admin-empty">لا توجد فرق PUBG مسجلة بعد.</p> : results.map((team, index) => (
        <div className="admin-row" key={team.teamId}>
          <div className="admin-field"><strong>#{index + 1} {team.teamName}</strong><span className="admin-hint">{team.members.join(" · ")}</span></div>
          <label className="admin-field"><span>المركز</span><input className="admin-input" type="number" min={0} value={team.placement || ""} onChange={(event) => setResults((current) => current.map((item) => item.teamId === team.teamId ? { ...item, placement: Number(event.target.value) || 0, placementPoints: 0, points: 0 } : item))} /></label>
          <label className="admin-field"><span>Total Kills</span><input className="admin-input" type="number" min={0} value={team.kills} onChange={(event) => setResults((current) => current.map((item) => item.teamId === team.teamId ? { ...item, kills: Number(event.target.value) || 0 } : item))} /></label>
          <div className="admin-field"><span>النقاط</span><strong>{getPubgPoints(team.placement, team.kills)}</strong></div>
          {team.teamId.startsWith(`${tournament.id}:`) && <button type="button" className="admin-refresh" onClick={() => void removeTeam(team.teamId)} disabled={removingTeamId === team.teamId}>{removingTeamId === team.teamId ? "جارٍ الإلغاء..." : "إلغاء حجز التيم"}</button>}
        </div>
      ))}
      {message && <p className="admin-hint">{message}</p>}
      {results.length > 0 && <button type="button" className="admin-refresh" onClick={() => void save()} disabled={saving}>{saving ? "جارٍ الحفظ..." : "حفظ نتائج الروم وحساب النقاط"}</button>}
    </div>
  );
}
