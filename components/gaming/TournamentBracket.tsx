"use client";

import type { Match, Round } from "@/lib/gaming-content";
import { UserAvatar } from "@/components/UserAvatar";

function getInitial(name: string) {
  return (name ?? "").trim().slice(0, 1).toUpperCase() || "?";
}

function MatchCard({ match }: { match: Match }) {
  const isWinnerA = match.resultA === "winner" || (!match.resultA && match.status === "done" && match.scoreA > match.scoreB);
  const isWinnerB = match.resultB === "winner" || (!match.resultB && match.status === "done" && match.scoreB > match.scoreA);
  const isLoserA = match.resultA === "loser" || (!match.resultA && match.status === "done" && match.scoreA < match.scoreB);
  const isLoserB = match.resultB === "loser" || (!match.resultB && match.status === "done" && match.scoreB < match.scoreA);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0b0e14] p-2 shadow-[0_0_18px_rgba(0,240,255,0.08)]">
      <div className="mb-2 flex items-center justify-between text-[10px] text-white/55">
        <span>{match.status === "live" ? "LIVE" : match.status === "done" ? "FINAL" : "UP NEXT"}</span>
        <span>{match.scoreA}:{match.scoreB}</span>
      </div>

      {match.status === "live" && match.liveUrl && (
        <a
          className="mb-2 flex items-center justify-center gap-2 rounded-lg border border-red-500/70 bg-red-500/15 px-3 py-2 text-xs font-black text-red-200 transition hover:bg-red-500/25"
          href={match.liveUrl}
          target="_blank"
          rel="noreferrer"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" aria-hidden="true" />
          مشاهدة البث المباشر
        </a>
      )}

      <div className="space-y-2">
        <div className={`flex items-center justify-between rounded-xl border px-2 py-2 text-sm ${isWinnerA ? "border-emerald-400 bg-emerald-500/15 text-emerald-50" : isLoserA ? "border-red-400 bg-red-500/15 text-red-100" : "border-white/8 bg-white/3 text-white/80"}`}>
          <div className="flex min-w-0 items-center gap-2">
            <UserAvatar name={match.playerA || "TBD"} avatarUrl={match.avatarA} size="sm" profile={{ username: match.playerA || "TBD", avatarUrl: match.avatarA, frame: match.frameA ?? null, frameEnabled: match.frameEnabledA !== false, xp: match.xpA }} />
            <span className="truncate">{match.playerA || "TBD"}</span>
          </div>
          <span className="text-xs text-cyan-300">{match.scoreA}</span>
        </div>

        <div className="flex items-center justify-center text-[10px] font-bold text-white/40">VS</div>

        <div className={`flex items-center justify-between rounded-xl border px-2 py-2 text-sm ${isWinnerB ? "border-emerald-400 bg-emerald-500/15 text-emerald-50" : isLoserB ? "border-red-400 bg-red-500/15 text-red-100" : "border-white/8 bg-white/3 text-white/80"}`}>
          <div className="flex min-w-0 items-center gap-2">
            <UserAvatar name={match.playerB || "TBD"} avatarUrl={match.avatarB} size="sm" profile={{ username: match.playerB || "TBD", avatarUrl: match.avatarB, frame: match.frameB ?? null, frameEnabled: match.frameEnabledB !== false, xp: match.xpB }} />
            <span className="truncate">{match.playerB || "TBD"}</span>
          </div>
          <span className="text-xs text-cyan-300">{match.scoreB}</span>
        </div>
      </div>
    </div>
  );
}

export function TournamentBracket({ rounds }: { rounds: Round[] }) {
  if (!rounds || rounds.length === 0) {
    return <div className="rounded-2xl border border-dashed border-white/15 bg-[#0b0e14] p-6 text-center text-white/60">لا توجد شجرة محجوزة لهذه البطولة بعد.</div>;
  }

  return (
    <div className="tournament-bracket w-full overflow-x-visible pb-3 sm:overflow-x-auto">
      <div className="flex min-w-0 flex-col gap-4 sm:min-w-[760px] sm:flex-row">
        {rounds.map((round, index) => (
          <div key={`${round.name}-${index}`} className="flex min-w-0 flex-1 flex-col gap-3 rounded-2xl border border-cyan-400/20 bg-[#0b0e14] p-3 sm:min-w-[230px]">
            <div className="mb-1 flex items-center justify-between rounded-xl bg-cyan-500/10 px-2 py-1 text-[11px] font-bold tracking-[0.2em] text-cyan-300">
              <span>{round.name}</span>
              <span>{round.matches.length}</span>
            </div>

            <div className="space-y-4">
              {round.matches.map((match, matchIndex) => (
                <MatchCard key={`${round.name}-${matchIndex}`} match={match} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
