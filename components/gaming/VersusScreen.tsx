"use client";

import { useEffect, useMemo, useState } from "react";
import type { Game, Match, Tournament } from "@/lib/gaming-content";
import { RegistrationModal } from "@/components/gaming/RegistrationModal";

const ROUND_FALLBACKS = ["Round 1", "Quarters", "Semis", "Final"];

function initial(name: string) {
  return (name ?? "").trim().slice(0, 1).toUpperCase() || "?";
}

/** Live-ticking countdown. Returns null once the start time has passed. */
function useCountdown(target: string, enabled: boolean) {
  const [label, setLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !target) {
      setLabel(null);
      return;
    }

    const start = new Date(target);
    if (Number.isNaN(start.valueOf())) {
      setLabel(null);
      return;
    }

    const tick = () => {
      const diff = start.getTime() - Date.now();
      if (diff <= 0) {
        setLabel(null);
        return;
      }
      const totalMinutes = Math.floor(diff / 60000);
      const days = Math.floor(totalMinutes / 1440);
      const hours = Math.floor((totalMinutes % 1440) / 60);
      const minutes = totalMinutes % 60;
      const seconds = Math.floor((diff % 60000) / 1000);

      setLabel(
        days > 0
          ? `${days}ي ${hours}س`
          : hours > 0
            ? `${hours}س ${minutes}د`
            : `${minutes}د ${String(seconds).padStart(2, "0")}ث`
      );
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [target, enabled]);

  return label;
}

function MatchCard({ match }: { match: Match }) {
  const isLive = match.status === "live";
  const isDone = match.status === "done";
  const countdown = useCountdown(match.startTime, match.status === "upcoming");

  const scheduled = useMemo(() => {
    if (!match.startTime) return "موعد يحدد لاحقًا";
    const date = new Date(match.startTime);
    if (Number.isNaN(date.valueOf())) return "موعد يحدد لاحقًا";
    return date.toLocaleString("ar", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }, [match.startTime]);

  const statusLabel = isLive ? "LIVE NOW" : isDone ? "FINAL" : "UP NEXT";
  const winnerA = isDone && match.scoreA > match.scoreB;
  const winnerB = isDone && match.scoreB > match.scoreA;

  return (
    <article className={`versus-match versus-match--${match.status}`}>
      <div className="versus-strip">
        <span>
          {isLive && <i className="live-dot" aria-hidden="true" />}
          {statusLabel}
        </span>
        <time dateTime={match.startTime || undefined}>
          {match.status === "upcoming" ? (countdown ?? scheduled) : scheduled}
        </time>
      </div>

      <div className="versus-body">
        <div className={`versus-side versus-side--a${winnerA ? " versus-side--winner" : ""}`}>
          <span className="versus-avatar" aria-hidden="true">
            <span>{initial(match.playerA)}</span>
          </span>
          <span className="versus-side__name">{match.playerA || "TBD"}</span>
          <b className="versus-side__score">{match.scoreA}</b>
        </div>

        <span className="versus-mark" aria-hidden="true">
          VS
        </span>

        <div className={`versus-side versus-side--b${winnerB ? " versus-side--winner" : ""}`}>
          <span className="versus-avatar" aria-hidden="true">
            <span>{initial(match.playerB)}</span>
          </span>
          <span className="versus-side__name">{match.playerB || "TBD"}</span>
          <b className="versus-side__score">{match.scoreB}</b>
        </div>
      </div>
    </article>
  );
}

/**
 * Replaces the old bracket tree. Rounds become a tab strip; the selected
 * round's matches render as broadcast-style head-to-head cards.
 */
export function VersusScreen({ tournament, games }: { tournament: Tournament; games: Game[] }) {
  const rounds = useMemo(() => tournament.rounds ?? [], [tournament.rounds]);

  // Open on the round that actually has a live match, else the first round.
  const initialRound = useMemo(() => {
    const liveIndex = rounds.findIndex((round) =>
      round.matches?.some((match) => match.status === "live")
    );
    return liveIndex >= 0 ? liveIndex : 0;
  }, [rounds]);

  const [activeRound, setActiveRound] = useState(initialRound);
  const [isRegistrationOpen, setRegistrationOpen] = useState(false);

  useEffect(() => {
    setActiveRound(initialRound);
  }, [initialRound]);

  const activeMatches = rounds[activeRound]?.matches ?? [];

  if (rounds.length === 0) {
    return <div className="versus-empty">لم تُضف جولات لهذه البطولة بعد.</div>;
  }

  return (
    <div className="versus-screen">
      <button type="button" className="tournament-join-button" onClick={() => setRegistrationOpen(true)}>
        انضمام للبطولة <span aria-hidden="true">↗</span>
      </button>
      <div className="round-tabs" role="tablist" aria-label="جولات البطولة">
        {rounds.map((round, index) => {
          const hasLive = round.matches?.some((match) => match.status === "live");
          return (
            <button
              type="button"
              key={`${round.name}-${index}`}
              role="tab"
              aria-selected={index === activeRound}
              className={index === activeRound ? "round-tab is-active" : "round-tab"}
              onClick={() => setActiveRound(index)}
            >
              {hasLive && <i className="live-dot" aria-hidden="true" />}
              {round.name || ROUND_FALLBACKS[index] || `Round ${index + 1}`}
            </button>
          );
        })}
      </div>

      <div className="versus-feed" role="tabpanel">
        {activeMatches.length > 0 ? (
          activeMatches.map((match, index) => (
            <MatchCard key={`${match.playerA}-${match.playerB}-${index}`} match={match} />
          ))
        ) : (
          <div className="versus-empty">لا توجد مواجهات في هذه الجولة.</div>
        )}
      </div>
      {isRegistrationOpen && (
        <RegistrationModal tournament={tournament} games={games} onClose={() => setRegistrationOpen(false)} />
      )}
    </div>
  );
}
