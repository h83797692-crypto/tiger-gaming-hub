"use client";

import { useState } from "react";
import type { Game, Tournament } from "@/lib/gaming-content";
import { VersusScreen } from "@/components/gaming/VersusScreen";
import { LiveChatRoom } from "@/components/gaming/LiveChatRoom";

const STATUS_LABEL: Record<string, string> = {
  open: "التسجيل مفتوح",
  live: "مباشرة",
  completed: "مكتملة",
};

export function TournamentArena({ tournaments, games }: { tournaments: Tournament[]; games: Game[] }) {
  const [selectedId, setSelectedId] = useState(tournaments[0]?.id ?? "");
  const tournament = tournaments.find((item) => item.id === selectedId) ?? tournaments[0];

  if (!tournament) return null;

  return (
    <>
      <div className="tournament-meta">
        <label htmlFor="tournament-view-select">البطولة</label>
        <select id="tournament-view-select" className="admin-select" value={tournament.id} onChange={(event) => setSelectedId(event.target.value)}>
          {tournaments.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}
        </select>
      </div>
      <article className="hud-panel tournament-card">
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
        <div className="live-arena-layout">
          <VersusScreen tournament={tournament} games={games} />
          <LiveChatRoom roomId={tournament.id} />
        </div>
      </article>
    </>
  );
}
