"use client";

import { useState } from "react";
import { useEffect } from "react";
import type { Game, Tournament } from "@/lib/gaming-content";
import { RegistrationModal } from "@/components/gaming/RegistrationModal";
import { LiveChatRoom } from "@/components/gaming/LiveChatRoom";
import { isPubgTournament, type PubgTeamResult } from "@/lib/pubg-scrims";

const STATUS_LABEL: Record<string, string> = {
  open: "التسجيل مفتوح",
  live: "مباشرة",
  completed: "مكتملة",
};

export function TournamentArena({ tournaments, games }: { tournaments: Tournament[]; games: Game[] }) {
  const [selectedId, setSelectedId] = useState(tournaments[0]?.id ?? "");
  const [registeredCount, setRegisteredCount] = useState(0);
  const [pubgResults, setPubgResults] = useState<PubgTeamResult[]>([]);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const tournament = tournaments.find((item) => item.id === selectedId) ?? tournaments[0];

  useEffect(() => {
    if (!tournament) return;
    let active = true;
    fetch(`/api/tournaments/bracket?tournamentId=${encodeURIComponent(tournament.id)}`, { cache: "no-store" })
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!active || !payload) return;
        setRegisteredCount(Array.isArray(payload.registrations) ? payload.registrations.length : 0);
        setPubgResults(isPubgTournament(tournament.game) && Array.isArray(payload.pubgResults) ? payload.pubgResults : []);
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [tournament]);

  useEffect(() => {
    setChatOpen(false);
  }, [tournament.id]);

  if (!tournament) return null;

  return (
    <article className="hud-panel tournament-card">
        <div className="tournament-meta">
          <label htmlFor="tournament-view-select">البطولة</label>
          <select id="tournament-view-select" className="admin-select" value={tournament.id} onChange={(event) => setSelectedId(event.target.value)}>
            {tournaments.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
          </select>
        </div>
        <div className="tournament-meta">
          <span className={`status status--${tournament.status}`}>
            {STATUS_LABEL[tournament.status] ?? tournament.status}
          </span>
          <span>{tournament.game}</span>
        </div>
        <h3>{tournament.title}</h3>
        <p>{tournament.rules}</p>
        <div className="tournament-stats">
          <span>الجائزة <b>{tournament.prize}</b></span>
          <span>المقاعد <b>{tournament.maxPlayers}</b></span>
          <span>التاريخ <b>{tournament.date}</b></span>
        </div>
        <div className="tournament-stats">
          <span>المسجلون <b>{registeredCount}/{tournament.maxPlayers}</b></span>
          {pubgResults.length > 0 && <span>المتصدر <b>{pubgResults[0].teamName}</b></span>}
        </div>
        {pubgResults.length > 0 && <ol className="tournament-stats" aria-label="أفضل ثلاثة فرق">
          {pubgResults.slice(0, 3).map((team, index) => <li key={team.teamId}><span>#{index + 1} {team.teamName}</span><b>{team.points} نقطة</b></li>)}
        </ol>}
        <button type="button" className="tournament-join-button" onClick={() => setRegistrationOpen(true)}>
          تسجيل في البطولة <span aria-hidden="true">↗</span>
        </button>
        <button type="button" className="tournament-join-button" onClick={() => setChatOpen((current) => !current)} aria-expanded={chatOpen}>
          {chatOpen ? "إخفاء الشات" : "إظهار الشات"}
        </button>
        {chatOpen && <LiveChatRoom roomId={tournament.id} />}
        {registrationOpen && <RegistrationModal tournament={tournament} games={games} onClose={() => setRegistrationOpen(false)} />}
    </article>
  );
}
