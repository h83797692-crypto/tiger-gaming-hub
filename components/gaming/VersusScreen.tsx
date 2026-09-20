"use client";

import { useEffect, useMemo, useState } from "react";
import type { Game, Match, Round, Tournament } from "@/lib/gaming-content";
import { RegistrationModal } from "@/components/gaming/RegistrationModal";
import { TournamentBracket } from "@/components/gaming/TournamentBracket";
import { buildSingleEliminationBracket } from "@/lib/tournament-bracket";
import { UserAvatar } from "@/components/UserAvatar";
import type { PubgTeamResult } from "@/lib/pubg-scrims";
import { isPubgTournament } from "@/lib/pubg-scrims";

const ROUND_FALLBACKS = ["Round 1", "Quarters", "Semis", "Final"];

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
          <UserAvatar className="versus-avatar" name={match.playerA} avatarUrl={match.avatarA} size="md" profile={{ username: match.playerA, avatarUrl: match.avatarA, frame: match.frameA ?? null, frameEnabled: match.frameEnabledA !== false, xp: match.xpA }} />
          <span className="versus-side__name">{match.playerA || "TBD"}</span>
          <b className="versus-side__score">{match.scoreA}</b>
        </div>

        <span className="versus-mark" aria-hidden="true">
          VS
        </span>

        <div className={`versus-side versus-side--b${winnerB ? " versus-side--winner" : ""}`}>
          <UserAvatar className="versus-avatar" name={match.playerB} avatarUrl={match.avatarB} size="md" profile={{ username: match.playerB, avatarUrl: match.avatarB, frame: match.frameB ?? null, frameEnabled: match.frameEnabledB !== false, xp: match.xpB }} />
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
  const [liveRounds, setLiveRounds] = useState<Round[]>(tournament.rounds ?? []);
  const [registeredCount, setRegisteredCount] = useState(0);
  const [pubgResults, setPubgResults] = useState<PubgTeamResult[]>([]);
  const [isRegistrationOpen, setRegistrationOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const loadBracket = async () => {
      const response = await fetch(`/api/tournaments/bracket?tournamentId=${encodeURIComponent(tournament.id)}`, { cache: "no-store" });
      if (!response.ok) return;
      const payload = await response.json();
      if (!active) return;
      const registrations = Array.isArray(payload.registrations) ? payload.registrations : [];
      setRegisteredCount(registrations.length);
      const isCustomPubg = isPubgTournament(tournament.game) && tournament.registrationType === "custom";
      setPubgResults(isCustomPubg && Array.isArray(payload.pubgResults) ? payload.pubgResults : []);
      if (isCustomPubg) {
        setLiveRounds([]);
      } else if (Array.isArray(payload.rounds) && payload.rounds.length > 0) {
        setLiveRounds(payload.rounds);
      } else if (registrations.length > 0) {
        setLiveRounds(buildSingleEliminationBracket(
          registrations.map((registration: { playerName?: string; inGameId?: string }) => registration.playerName || registration.inGameId),
          ["الدور الأول", "نصف النهائي", "النهائي"],
          tournament.maxPlayers
        ));
      } else {
        setLiveRounds(tournament.rounds ?? []);
      }
    };
    loadBracket().catch(() => undefined);
    const interval = window.setInterval(() => loadBracket().catch(() => undefined), 3000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [tournament.id, tournament.maxPlayers, tournament.rounds]);

  const displayRounds = liveRounds;

  return (
    <div className="versus-screen">
      <button type="button" className="tournament-join-button" onClick={() => setRegistrationOpen(true)}>
        انضمام للبطولة <span aria-hidden="true">↗</span>
      </button>

      <p className="mt-2 text-xs text-white/55">المسجلون: {registeredCount}/{tournament.maxPlayers}</p>

      {isPubgTournament(tournament.game) && tournament.registrationType === "custom" ? (
        <ol className="tournament-stats" aria-label="ترتيب فرق PUBG حسب النقاط">
          {pubgResults.map((team, index) => (
            <li key={team.teamId}>
              <span>#{index + 1} {team.teamName}</span>
              <b>{team.points} نقطة</b>
            </li>
          ))}
        </ol>
      ) : <TournamentBracket rounds={displayRounds} />}

      {isRegistrationOpen && (
        <RegistrationModal tournament={tournament} games={games} onClose={() => setRegistrationOpen(false)} />
      )}
    </div>
  );
}
