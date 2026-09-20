"use client";

import { useEffect, useMemo, useState } from "react";
import type { Game, Tournament } from "@/lib/gaming-content";
import { advanceBracketWinner, buildSingleEliminationBracket, type BracketRound } from "@/lib/tournament-bracket";

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

function BracketEditor({
  rounds,
  onRoundChange,
  onMatchChange,
  onWinnerSelect,
}: {
  rounds: BracketRound[];
  onRoundChange: (roundIndex: number, name: string) => void;
  onMatchChange: (roundIndex: number, matchIndex: number, patch: Partial<BracketRound["matches"][number]>) => void;
  onWinnerSelect: (roundIndex: number, matchIndex: number, winner: string) => void;
}) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {rounds.map((round, roundIndex) => (
        <div key={`${round.name}-${roundIndex}`} className="min-w-[220px] flex-1 rounded-2xl border border-white/10 bg-[#0a0d14] p-3">
          <input
            className="mb-3 w-full rounded-lg border border-white/10 bg-black/20 px-2 py-2 text-sm font-semibold text-cyan-300"
            value={round.name}
            aria-label={`اسم الجولة ${roundIndex + 1}`}
            onChange={(event) => onRoundChange(roundIndex, event.target.value)}
          />
          <div className="space-y-3">
            {round.matches.map((match, matchIndex) => {
              return (
                <div key={`${round.name}-${matchIndex}`} className="rounded-xl border border-white/10 bg-black/20 p-2.5">
                  {(["playerA", "playerB"] as const).map((playerKey, candidateIndex) => (
                    <button
                      key={`${round.name}-${matchIndex}-${playerKey}`}
                      type="button"
                      className={
                        match.winner === match[playerKey]
                          ? "mb-2 flex w-full items-center justify-between rounded-lg border border-cyan-400/60 bg-cyan-500/10 px-2 py-2 text-left text-sm text-white"
                          : "mb-2 flex w-full items-center justify-between rounded-lg border border-white/10 bg-transparent px-2 py-2 text-left text-sm text-white/80 hover:border-cyan-400/40"
                      }
                      onClick={() => onWinnerSelect(roundIndex, matchIndex, match[playerKey])}
                      disabled={!match[playerKey] || match[playerKey] === "TBD" || match[playerKey] === "BYE"}
                    >
                      <span className="min-w-0 flex-1 truncate text-sm text-inherit">{match[playerKey] || "TBD"}</span>
                      <select
                        className="w-20 bg-transparent text-center text-[10px] text-white/70 outline-none"
                        value={playerKey === "playerA" ? match.resultA ?? "" : match.resultB ?? ""}
                        aria-label={`حالة المتنافس ${candidateIndex + 1}`}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => onMatchChange(roundIndex, matchIndex, {
                          [playerKey === "playerA" ? "resultA" : "resultB"]: event.target.value || undefined,
                        })}
                      >
                        <option value="">الحالة</option>
                        <option value="winner">فائز</option>
                        <option value="loser">خاسر</option>
                      </select>
                      <input
                        className="w-10 bg-transparent text-center text-xs text-cyan-300 outline-none"
                        type="number"
                        min={0}
                        value={playerKey === "playerA" ? match.scoreA : match.scoreB}
                        aria-label={`نتيجة المتنافس ${candidateIndex + 1}`}
                        onClick={(event) => event.stopPropagation()}
                        onChange={(event) => onMatchChange(roundIndex, matchIndex, { [playerKey === "playerA" ? "scoreA" : "scoreB"]: Number(event.target.value) || 0 })}
                      />
                    </button>
                  ))}
                  <select
                    className="mt-1 w-full rounded-md border border-white/10 bg-black/30 px-2 py-1 text-xs text-white/70"
                    value={match.status}
                    aria-label="حالة المواجهة"
                    onChange={(event) => onMatchChange(roundIndex, matchIndex, { status: event.target.value as BracketRound["matches"][number]["status"] })}
                  >
                    <option value="upcoming">قادمة</option>
                    <option value="live">مباشرة</option>
                    <option value="done">منتهية</option>
                  </select>
                  {match.status === "live" && (
                    <input
                      className="mt-2 w-full rounded-md border border-red-400/40 bg-red-500/5 px-2 py-2 text-xs text-white caret-red-300 outline-none placeholder:text-white/40 focus:border-red-400"
                      type="url"
                      value={match.liveUrl ?? ""}
                      placeholder="رابط YouTube Live"
                      aria-label="رابط البث المباشر على يوتيوب"
                      onChange={(event) => onMatchChange(roundIndex, matchIndex, { liveUrl: event.target.value })}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export function RosterViewer({ tournaments, games }: { tournaments: Tournament[]; games: Game[] }) {
  const [tournamentList, setTournamentList] = useState(tournaments);
  const [selectedGame, setSelectedGame] = useState(tournaments[0]?.game ?? games[0]?.title ?? "");
  const [selectedTournament, setSelectedTournament] = useState(tournaments[0]?.id ?? "");
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [bracketRounds, setBracketRounds] = useState<BracketRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingBracket, setSavingBracket] = useState(false);
  const [bracketSize, setBracketSize] = useState(4);
  const [isCreateOpen, setCreateOpen] = useState(false);
  const [creatingTournament, setCreatingTournament] = useState(false);
  const [deletingTournament, setDeletingTournament] = useState(false);
  const [createError, setCreateError] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newGame, setNewGame] = useState(games[0]?.title ?? "");
  const [newSize, setNewSize] = useState("4");

  const gameTournaments = useMemo(
    () => tournamentList.filter((item) => item.game === selectedGame),
    [selectedGame, tournamentList]
  );
  const tournament = tournamentList.find((item) => item.id === selectedTournament);

  useEffect(() => {
    if (!gameTournaments.some((item) => item.id === selectedTournament)) {
      setSelectedTournament(gameTournaments[0]?.id ?? "");
    }
  }, [gameTournaments, selectedTournament]);

  useEffect(() => {
    setTournamentList(tournaments);
  }, [tournaments]);

  useEffect(() => {
    setLoading(true);
    fetch("/api/tournaments/register")
      .then((response) => (response.ok ? response.json() : []))
      .then((payload) => setRegistrations(Array.isArray(payload) ? payload : []))
      .catch(() => setRegistrations([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedTournament) return;

    setLoading(true);
    fetch(`/api/tournaments/bracket?tournamentId=${encodeURIComponent(selectedTournament)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (!payload) return;
        setRegistrations((current) => {
          if (Array.isArray(payload.registrations) && payload.registrations.length > 0) {
            const merged = current.length > 0 ? current : payload.registrations;
            return merged;
          }
          return current;
        });
        const loadedSize = payload.maxPlayers ?? tournament?.maxPlayers;
        setBracketSize([4, 8, 16, 32, 64].includes(loadedSize) ? loadedSize : 4);
        setBracketRounds(Array.isArray(payload.rounds) && payload.rounds.length > 0 ? payload.rounds : []);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [selectedTournament, tournament?.maxPlayers]);

  const visible = useMemo(
    () => registrations.filter((registration) => registration.tournamentId === selectedTournament),
    [registrations, selectedTournament]
  );

  const generateBracket = () => {
    const players = visible.map((registration) => registration.playerName || registration.inGameId);
    setBracketRounds(buildSingleEliminationBracket(players, ["الدور الأول", "نصف النهائي", "النهائي"], bracketSize));
  };

  const startTournament = async () => {
    if (!selectedTournament || visible.length < 4) {
      setCreateError("لا يمكن بدء البطولة قبل تسجيل 4 لاعبين على الأقل.");
      return;
    }
    const rounds = buildSingleEliminationBracket(
      visible.map((registration) => registration.playerName || registration.inGameId),
      ["الدور الأول", "نصف النهائي", "النهائي"],
      bracketSize
    );
    setBracketRounds(rounds);
    setSavingBracket(true);
    try {
      const response = await fetch("/api/tournaments/bracket", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId: selectedTournament, rounds, maxPlayers: bracketSize }),
      });
      if (!response.ok) throw new Error("تعذر بدء البطولة");
    } finally {
      setSavingBracket(false);
    }
  };

  const createTournament = async () => {
    const maxPlayers = Number(newSize);
    if (!newGame || !newTitle.trim() || !Number.isInteger(maxPlayers) || maxPlayers < 1) {
      setCreateError("اختر اللعبة واكتب اسم البطولة واختر سعة صحيحة.");
      return;
    }

    setCreatingTournament(true);
    setCreateError("");
    try {
      const response = await fetch("/api/tournaments/bracket", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game: newGame, title: newTitle.trim(), maxPlayers }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.tournament) throw new Error(payload.error ?? "تعذر إنشاء البطولة");

      const created = payload.tournament as Tournament;
      setTournamentList((current) => [...current, created]);
      setSelectedGame(created.game);
      setSelectedTournament(created.id);
      setBracketSize(created.maxPlayers);
      setBracketRounds(created.rounds);
      setCreateOpen(false);
      setNewTitle("");
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "تعذر إنشاء البطولة");
    } finally {
      setCreatingTournament(false);
    }
  };

  const deleteTournament = async () => {
    if (!selectedTournament || !window.confirm("هل تريد حذف البطولة وجميع تسجيلاتها؟")) return;

    setDeletingTournament(true);
    try {
      const response = await fetch(`/api/tournaments/bracket?tournamentId=${encodeURIComponent(selectedTournament)}`, {
        method: "DELETE",
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error ?? "تعذر حذف البطولة");

      const remaining = tournamentList.filter((item) => item.id !== selectedTournament);
      setTournamentList(remaining);
      setSelectedTournament(remaining.find((item) => item.game === selectedGame)?.id ?? "");
      setRegistrations((current) => current.filter((item) => item.tournamentId !== selectedTournament));
      setBracketRounds([]);
      setCreateError("");
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "تعذر حذف البطولة");
    } finally {
      setDeletingTournament(false);
    }
  };

  const updateWinner = (roundIndex: number, matchIndex: number, winner: string) => {
    setBracketRounds((current) => advanceBracketWinner(current, roundIndex, matchIndex, winner));
  };

  const updateRoundName = (roundIndex: number, name: string) => {
    setBracketRounds((current) => current.map((round, index) => index === roundIndex ? { ...round, name } : round));
  };

  const updateMatch = (roundIndex: number, matchIndex: number, patch: Partial<BracketRound["matches"][number]>) => {
    setBracketRounds((current) => current.map((round, currentRoundIndex) => currentRoundIndex === roundIndex
      ? {
          ...round,
          matches: round.matches.map((match, currentMatchIndex) => {
            if (currentMatchIndex !== matchIndex) return match;
            const updated = { ...match, ...patch };
            if ("playerA" in patch || "playerB" in patch) {
              const winnerStillExists = updated.winner === updated.playerA || updated.winner === updated.playerB;
              if (!winnerStillExists) {
                updated.winner = undefined;
                if (updated.status === "done") updated.status = "upcoming";
              }
            }
            return updated;
          }),
        }
      : round));
  };

  const saveBracket = async () => {
    if (!selectedTournament) return;
    setSavingBracket(true);
    try {
      const response = await fetch("/api/tournaments/bracket", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId: selectedTournament, rounds: bracketRounds, maxPlayers: bracketSize }),
      });
      if (!response.ok) throw new Error("تعذر حفظ شجرة البطولة");
      const payload = await response.json();
      if (payload.rounds) setBracketRounds(payload.rounds);
    } finally {
      setSavingBracket(false);
    }
  };

  return (
    <section className="admin-roster space-y-4">
      <div className="admin-roster__heading">
        <div>
          <p className="eyebrow">ROSTER / BRACKET</p>
          <h2>سجل المشاركين وشجرة البطولة</h2>
        </div>
        <div className="flex flex-wrap gap-2">
        <select className="admin-select" value={selectedGame} onChange={(event) => setSelectedGame(event.target.value)} aria-label="اختيار اللعبة">
          {games.map((game) => <option key={game.id} value={game.title}>{game.title}</option>)}
        </select>
        <select className="admin-select" value={selectedTournament} onChange={(event) => setSelectedTournament(event.target.value)} aria-label="اختيار البطولة">
          {gameTournaments.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
        </div>
      </div>

      <p className="admin-roster__summary">
        {tournament?.game ?? ""} · {visible.length} تسجيل · السعة المحفوظة {tournament?.maxPlayers ?? bracketSize}
      </p>

      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded-lg border border-amber-400/60 bg-amber-500/10 px-3 py-2 text-sm text-amber-200" onClick={() => setCreateOpen(true)}>
          توليد شجرة بطولة جديدة
        </button>
        <label className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70">
          سعة البطولة
          <select className="bg-transparent text-cyan-200 outline-none" value={bracketSize} onChange={(event) => setBracketSize(Number(event.target.value))}>
            {[4, 8, 16, 32, 64].map((size) => <option key={size} value={size}>{size} لاعب</option>)}
          </select>
        </label>
        <button type="button" className="rounded-lg border border-cyan-400/50 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-200" onClick={generateBracket}>
          توليد شجرة البطولة
        </button>
        <button type="button" className="rounded-lg border border-amber-400/50 bg-amber-500/10 px-3 py-2 text-sm text-amber-200" onClick={startTournament} disabled={savingBracket || visible.length === 0}>
          بدء البطولة من المسجلين
        </button>
        <button type="button" className="rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-white/80" onClick={deleteTournament} disabled={deletingTournament || !selectedTournament}>
          {deletingTournament ? "جارٍ الحذف..." : "حذف البطولة"}
        </button>
        <button type="button" className="rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-white/80" onClick={() => setBracketRounds(buildSingleEliminationBracket([]))}>
          إعادة تعيين
        </button>
        <button type="button" className="rounded-lg border border-emerald-400/50 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200" onClick={saveBracket} disabled={savingBracket}>
          {savingBracket ? "جارٍ الحفظ..." : "حفظ الشجرة"}
        </button>
      </div>

      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-labelledby="create-tournament-title">
          <div className="w-full max-w-xl rounded-2xl border border-cyan-400/30 bg-[#0b101a] p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="eyebrow">TOURNAMENT BUILDER</p>
                <h3 id="create-tournament-title" className="text-xl font-bold text-white">إنشاء شجرة بطولة جديدة</h3>
              </div>
              <button type="button" className="text-sm text-white/60" onClick={() => setCreateOpen(false)}>إغلاق</button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="admin-field">اسم البطولة<input className="admin-input" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="مثال: Generals Open" /></label>
              <label className="admin-field">اللعبة<select className="admin-select" value={newGame} onChange={(event) => setNewGame(event.target.value)}>{games.map((game) => <option key={game.id} value={game.title}>{game.title}</option>)}</select></label>
              <label className="admin-field">عدد اللاعبين / السعة<select className="admin-select" value={newSize} onChange={(event) => setNewSize(event.target.value)}>{[4, 8, 16, 32, 64].map((size) => <option key={size} value={size}>{size} لاعب</option>)}</select></label>
            </div>
              <p className="mt-4 rounded-lg border border-cyan-400/20 bg-cyan-400/5 p-3 text-sm text-cyan-100">سيتم إدخال المشاركين تلقائياً من نموذج التسجيل في الموقع عند اكتمال السعة.</p>
            {createError && <p className="mt-3 text-sm text-red-300">{createError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="rounded-lg border border-white/10 px-4 py-2 text-sm text-white/70" onClick={() => setCreateOpen(false)}>إلغاء</button>
              <button type="button" className="rounded-lg border border-cyan-400/60 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200" onClick={createTournament} disabled={creatingTournament}>{creatingTournament ? "جارٍ الحفظ..." : "حفظ وتوليد الشجرة"}</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="admin-empty">جارٍ تحميل السجل...</p>
      ) : (
        <div className="space-y-6">
          {visible.length > 0 ? <div className="admin-roster__table-wrap">
            <table className="admin-roster__table">
              <thead>
                <tr>
                  <th>المقعد</th>
                  <th>اللاعب</th>
                  <th>Game ID</th>
                  <th>YouTube</th>
                  <th>التحقق</th>
                  <th>النمط</th>
                  <th>الفصيل</th>
                  <th>اللعبة</th>
                  <th>الدفعة</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((registration) => (
                  <tr key={registration.id}>
                    <td><b>#{registration.slot}</b></td>
                    <td>{registration.playerName}</td>
                    <td>{registration.inGameId}</td>
                    <td>{registration.youtubeHandle || "-"}</td>
                    <td>{registration.youtubeVerified ? "تم التحقق" : "غير مؤكد"}</td>
                    <td>{registration.mode}</td>
                    <td>{registration.faction || "-"}</td>
                    <td>{registration.game}</td>
                    <td>{registration.batch}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div> : <p className="admin-empty">لا توجد تسجيلات لهذه البطولة بعد. يمكنك توليد شجرة بالسعة المختارة.</p>}

          {bracketRounds.length > 0 && <BracketEditor rounds={bracketRounds} onRoundChange={updateRoundName} onMatchChange={updateMatch} onWinnerSelect={updateWinner} />}
        </div>
      )}
    </section>
  );
}