"use client";

import { FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { createPortal } from "react-dom";
import type { Game, Tournament } from "@/lib/gaming-content";

type Mode = "solo" | "duo" | "trio" | "squad" | "ffa" | "partnership" | "single-table" | "tarneeb" | "baloot";
type Faction = "usa" | "china" | "gla" | "random";

const CATEGORY_ACCENTS: Record<string, string> = {
  FPS: "#00f0ff",
  "Battle Royale": "#ff4d9d",
  RTS: "#7c5cff",
  Sports: "#ffb800",
  default: "#00f0ff",
};

const MODES: { value: Mode; label: string; detail: string }[] = [
  { value: "solo", label: "Solo 1v1", detail: "لاعب واحد" },
  { value: "duo", label: "Duo 2v2", detail: "فريق ثنائي" },
  { value: "squad", label: "Squad 4v4", detail: "فريق رباعي" },
];

const GENERALS_MODES: { value: Mode; label: string; detail: string }[] = [
  { value: "solo", label: "Solo 1v1", detail: "لاعب واحد" },
  { value: "duo", label: "Duo 2v2", detail: "فريق ثنائي" },
  { value: "trio", label: "Trio 3v3", detail: "فريق ثلاثي" },
  { value: "squad", label: "Squad 4v4", detail: "فريق رباعي" },
  { value: "ffa", label: "8-Player FFA", detail: "قتال حر" },
];

const JAWAKER_MODES: { value: Mode; label: string; detail: string }[] = [
  { value: "partnership", label: "شراكة", detail: "فريقان من لاعبين" },
  { value: "single-table", label: "طاولة فردية", detail: "لعب فردي" },
  { value: "tarneeb", label: "طرنيب", detail: "نظام طرنيب" },
  { value: "baloot", label: "بلّوت", detail: "نظام بلّوت" },
];

const GENERALS_FACTIONS: { value: Faction; label: string; detail: string }[] = [
  { value: "usa", label: "USA", detail: "Superweapon / Laser / Air Force" },
  { value: "china", label: "China", detail: "Tank / Infantry / Nuke" },
  { value: "gla", label: "GLA", detail: "Stealth / Toxin / Demo" },
  { value: "random", label: "Random", detail: "اختيار عشوائي" },
];

type CustomTeamOption = { name: string; occupied: boolean; canCancel?: boolean };

export function RegistrationModal({ tournament, games, onClose }: { tournament: Tournament; games: Game[]; onClose: () => void }) {
  const [playerName, setPlayerName] = useState("");
  const [inGameId, setInGameId] = useState("");
  const [teamName, setTeamName] = useState("");
  const [customTeamName, setCustomTeamName] = useState("");
  const [customTeams, setCustomTeams] = useState<CustomTeamOption[]>([]);
  const [teamMembers, setTeamMembers] = useState(["", "", ""]);
  const [youtubeHandle, setYoutubeHandle] = useState("");
  const [youtubeVerified, setYoutubeVerified] = useState(false);
  const [mode, setMode] = useState<Mode>(tournament.mode ?? "solo");
  const [faction, setFaction] = useState<Faction>("random");
  const [game, setGame] = useState(tournament.game);
  const [reserved, setReserved] = useState(0);
  const [batch, setBatch] = useState(1);
  const [maxPlayers, setMaxPlayers] = useState(tournament.maxPlayers || 8);
  const [status, setStatus] = useState<{ kind: "error" | "success"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  useEffect(() => {
    fetch(`/api/tournaments/register?tournamentId=${encodeURIComponent(tournament.id)}`)
      .then((response) => response.ok ? response.json() : null)
      .then((payload) => {
        if (!payload) return;
        setReserved(payload.count);
        setBatch(payload.batch);
        setMaxPlayers(payload.maxPlayers);
        setCustomTeams(Array.isArray(payload.customTeams) ? payload.customTeams : []);
        if (Array.isArray(payload.customTeams)) {
          setCustomTeamName(payload.customTeams.find((team: CustomTeamOption) => !team.occupied)?.name ?? "");
        }
      })
      .catch(() => undefined);
  }, [tournament.id]);

  const isFull = reserved >= maxPlayers;
  const selectedGame = games.find((item) => item.title === game);
  const isGenerals = selectedGame?.id === "generals-zero-hour";
  const isJawaker = selectedGame?.id === "jawaker";
  const isPubg = selectedGame?.id === "pubg";
  const isCustomPubg = isPubg && tournament.registrationType === "custom";
  const availableModes = isJawaker ? JAWAKER_MODES : isGenerals ? GENERALS_MODES : MODES;
  const getAccent = (item: Game) => item.accentColor || CATEGORY_ACCENTS[item.category] || CATEGORY_ACCENTS.default;

  useEffect(() => {
    setMode(isJawaker ? "partnership" : "solo");
  }, [isGenerals, isJawaker]);

  function verifySubscription() {
    setStatus(null);
    setYoutubeVerified(true);
    setStatus({ kind: "success", text: "تم تفعيل التسجيل بنجاح! يمكنك الآن إكمال بيانات البطولة." });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch("/api/tournaments/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId: tournament.id, playerName, inGameId, mode, customTeamName: isCustomPubg ? customTeamName : undefined, teamName: isPubg && mode === "squad" && !isCustomPubg ? teamName : undefined, teamMembers: isPubg && mode === "squad" ? teamMembers : undefined, faction: isGenerals ? faction : undefined, game, gameId: selectedGame?.id, youtubeHandle, youtubeVerified }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "تعذر التسجيل");
      setReserved(payload.count ?? payload.slot);
      setBatch(payload.slot === payload.maxPlayers ? payload.batch + 1 : payload.batch);
      if (isCustomPubg) {
        setCustomTeams((current) => current.map((team) => team.name === customTeamName ? { ...team, occupied: true, canCancel: true } : team));
      }
      setStatus({ kind: "success", text: `تم الحجز في المقعد ${payload.slot} من الدفعة ${payload.batch}. ${payload.message}` });
      setPlayerName("");
      setInGameId("");
    } catch (error) {
      setStatus({ kind: "error", text: error instanceof Error ? error.message : "تعذر التسجيل" });
    } finally {
      setSaving(false);
    }
  }

  async function cancelBooking() {
    const team = customTeams.find((item) => item.name === customTeamName);
    if (!team?.canCancel) return;
    setSaving(true);
    setStatus(null);
    try {
      const teamId = `${tournament.id}:${encodeURIComponent(customTeamName.toLowerCase())}`;
      const response = await fetch(`/api/tournaments/register?tournamentId=${encodeURIComponent(tournament.id)}&teamId=${encodeURIComponent(teamId)}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "تعذر إلغاء الحجز");
      setCustomTeams((current) => current.map((item) => item.name === customTeamName ? { ...item, occupied: false, canCancel: false } : item));
      setReserved((current) => Math.max(0, current - 1));
      setStatus({ kind: "success", text: "تم إلغاء حجز التيم وإتاحته للتسجيل من جديد." });
    } catch (error) {
      setStatus({ kind: "error", text: error instanceof Error ? error.message : "تعذر إلغاء الحجز" });
    } finally {
      setSaving(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <motion.div className="registration-backdrop fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/80 p-4 backdrop-blur-md" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <motion.section className="registration-modal relative w-full max-w-xl overflow-hidden rounded-2xl border border-[#00F0FF]/40 bg-[#0B0E14] p-6 shadow-[0_0_50px_rgba(0,240,255,0.2)]" role="dialog" aria-modal="true" aria-labelledby="registration-title" dir="rtl" initial={{ opacity: 0, y: 18, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.22 }}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="إغلاق">×</button>
        <header className="registration-heading ps-4 pe-14 text-start">
          <span className="eyebrow">TOURNAMENT ACCESS / BATCH {batch}</span>
          <h2 id="registration-title">انضمام للبطولة</h2>
          <p>{tournament.title} <span aria-hidden="true">·</span> المقاعد المحجوزة: <b>{reserved}/{maxPlayers}</b></p>
        </header>

        <div className="youtube-verification-card">
          {!youtubeVerified ? (
            <>
              <strong>عفواً! هذه البطولة مخصصة لمشتركي قناة Tiger Gaming فقط! 🛑</strong>
              <a href="https://www.youtube.com/@tiger.ggaming?sub_confirmation=1" target="_blank" rel="noreferrer" className="youtube-subscribe-button" onClick={() => verifySubscription()}>اشترك في القناة لتفعيل الحجز</a>
              <div className="youtube-check-row">
                <input value={youtubeHandle} onChange={(event) => setYoutubeHandle(event.target.value)} placeholder="@your_handle" aria-label="معرّف YouTube" />
                <button type="button" onClick={verifySubscription}>تحقق من الاشتراك</button>
              </div>
            </>
          ) : <strong className="youtube-verified-badge">تم التحقق من اشتراكك في القناة بنجاح! 🟢</strong>}
        </div>

        <form onSubmit={submit} className="registration-form flex flex-col gap-4 p-6 text-start">
          <div className="registration-field flex flex-col gap-2">
            {isCustomPubg && <>
              <label htmlFor="custom-team-name">الفريق المخصص</label>
              <select id="custom-team-name" required disabled={!youtubeVerified || isFull} value={customTeamName} onChange={(event) => setCustomTeamName(event.target.value)}>
                <option value="">اختر فريقك</option>
                {customTeams.map((team) => <option key={team.name} value={team.name} disabled={team.occupied}>{team.name}{team.occupied ? " (محجوز)" : ""}</option>)}
              </select>
              {customTeams.find((team) => team.name === customTeamName)?.canCancel && <button type="button" className="gaming-button" onClick={() => void cancelBooking()} disabled={saving}>تراجع عن التسجيل</button>}
            </>}
            {isPubg && mode === "squad" && !isCustomPubg && <>
              <label htmlFor="team-name">اسم الفريق</label>
              <input id="team-name" required disabled={!youtubeVerified} value={teamName} onChange={(event) => setTeamName(event.target.value)} placeholder="Tiger Squad" />
              {teamMembers.map((member, index) => <input key={index} required disabled={!youtubeVerified} value={member} onChange={(event) => setTeamMembers((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))} placeholder={`اسم العضو ${index + 2}`} aria-label={`اسم العضو ${index + 2}`} />)}
            </>}
            <label htmlFor="player-name">اسم اللاعب</label>
            <input id="player-name" required disabled={!youtubeVerified} minLength={2} maxLength={80} value={playerName} onChange={(event) => setPlayerName(event.target.value)} placeholder="Tiger Player" />
          </div>
          <div className="registration-field flex flex-col gap-2">
            <label htmlFor="game-id">معرّف اللعبة</label>
            <input id="game-id" required disabled={!youtubeVerified} maxLength={80} value={inGameId} onChange={(event) => setInGameId(event.target.value)} placeholder="ID-88421" />
          </div>
          <fieldset className="registration-field flex flex-col gap-2">
            <legend className="registration-label">اختيار اللعبة</legend>
            <div className="game-selector grid grid-cols-1 gap-3 sm:grid-cols-2">
              {games.map((item) => (
                <button
                  disabled={!youtubeVerified}
                  type="button"
                  key={item.id}
                  className={item.title === game ? "game-option is-selected" : "game-option"}
                  style={{ ["--accent" as string]: getAccent(item) }}
                  aria-pressed={item.title === game}
                  onClick={() => {
                    setGame(item.title);
                    setMode(item.id === "jawaker" ? "partnership" : "solo");
                    if (item.id !== "generals-zero-hour") setFaction("random");
                  }}
                >
                  <span className="game-option__icon-wrap">
                    {item.iconUrl || item.imageUrl ? (
                      <img src={item.iconUrl || item.imageUrl} alt={item.title} className="game-option__icon" />
                    ) : (
                      <span className="game-option__glyph">{item.title.slice(0, 2).toUpperCase()}</span>
                    )}
                  </span>
                  <span className="game-option__text">
                    <span>{item.title}</span>
                    <small>{item.category} <span aria-hidden="true">·</span> {item.platform}</small>
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="registration-field flex flex-col gap-2">
            <legend className="registration-label">نمط اللعب</legend>
            <div className="mode-selector grid grid-cols-1 gap-3 sm:grid-cols-3">
              {availableModes.map((item) => <button disabled={!youtubeVerified} type="button" key={item.value} className={item.value === mode ? "mode-option is-selected" : "mode-option"} aria-pressed={item.value === mode} onClick={() => setMode(item.value)}><b>{item.label}</b><small>{item.detail}</small></button>)}
            </div>
          </fieldset>
          {isGenerals && <>
            <fieldset className="registration-field flex flex-col gap-2">
              <legend className="registration-label">فصيل Generals</legend>
              <div className="faction-selector grid grid-cols-1 gap-3 sm:grid-cols-2">
                {GENERALS_FACTIONS.map((item) => <button disabled={!youtubeVerified} type="button" key={item.value} className={item.value === faction ? "mode-option is-selected" : "mode-option"} aria-pressed={item.value === faction} onClick={() => setFaction(item.value)}><b>{item.label}</b><small>{item.detail}</small></button>)}
              </div>
            </fieldset>
            <div className="generals-rules" aria-label="قواعد Generals Zero Hour">
              <span>GenTool Required</span><span>No SW / 10 Min Peace</span><span>Map: Twilight Flame / Desert</span>
            </div>
          </>}
          {status && <p className={`registration-status registration-status--${status.kind}`}>{status.text}</p>}
          <button type="submit" className="gaming-button registration-submit hover:shadow-[0_0_20px_rgba(255,46,84,0.4)]" disabled={saving || !youtubeVerified}>{saving ? "جارٍ الحجز..." : isFull ? "احجز في الدفعة التالية" : "تأكيد التسجيل"}</button>
        </form>
      </motion.section>
    </motion.div>,
    document.body
  );
}
