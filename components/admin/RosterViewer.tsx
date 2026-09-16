"use client";

import { useEffect, useMemo, useState } from "react";
import type { Tournament } from "@/lib/gaming-content";

type Registration = {
  id: string;
  tournamentId: string;
  playerName: string;
  inGameId: string;
  mode: string;
  game: string;
  batch: number;
  slot: number;
  createdAt: string;
  youtubeHandle: string;
  youtubeVerified: boolean;
  faction?: string;
};

export function RosterViewer({ tournaments }: { tournaments: Tournament[] }) {
  const [selectedTournament, setSelectedTournament] = useState(tournaments[0]?.id ?? "");
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/tournaments/register")
      .then((response) => response.ok ? response.json() : [])
      .then((payload) => setRegistrations(Array.isArray(payload) ? payload : []))
      .catch(() => setRegistrations([]))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(
    () => registrations.filter((registration) => registration.tournamentId === selectedTournament),
    [registrations, selectedTournament]
  );
  const tournament = tournaments.find((item) => item.id === selectedTournament);

  return (
    <section className="admin-roster">
      <div className="admin-roster__heading">
        <div>
          <p className="eyebrow">ROSTER / LIVE INTAKE</p>
          <h2>سجل المشاركين</h2>
        </div>
        <select className="admin-select" value={selectedTournament} onChange={(event) => setSelectedTournament(event.target.value)}>
          {tournaments.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      </div>
      <p className="admin-roster__summary">{tournament?.game ?? ""} · {visible.length} تسجيل · حد الدفعة {tournament?.maxPlayers ?? 8}</p>
      {loading ? <p className="admin-empty">جارٍ تحميل السجل...</p> : visible.length === 0 ? <p className="admin-empty">لا توجد تسجيلات لهذه البطولة بعد.</p> : (
        <div className="admin-roster__table-wrap">
          <table className="admin-roster__table">
            <thead><tr><th>المقعد</th><th>اللاعب</th><th>Game ID</th><th>YouTube</th><th>التحقق</th><th>النمط</th><th>الفصيل</th><th>اللعبة</th><th>الدفعة</th></tr></thead>
            <tbody>{visible.map((registration) => <tr key={registration.id}><td><b>#{registration.slot}</b></td><td>{registration.playerName}</td><td>{registration.inGameId}</td><td>{registration.youtubeHandle || "-"}</td><td>{registration.youtubeVerified ? "تم التحقق" : "غير مؤكد"}</td><td>{registration.mode}</td><td>{registration.faction || "-"}</td><td>{registration.game}</td><td>{registration.batch}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}