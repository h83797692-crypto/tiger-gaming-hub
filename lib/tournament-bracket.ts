export type BracketMatch = {
  playerA: string;
  playerB: string;
  avatarA?: string;
  avatarB?: string;
  userIdA?: string;
  userIdB?: string;
  frameA?: "champion" | null;
  frameB?: "champion" | null;
  frameEnabledA?: boolean;
  frameEnabledB?: boolean;
  xpA?: number;
  xpB?: number;
  scoreA: number;
  scoreB: number;
  status: "upcoming" | "live" | "done";
  startTime: string;
  liveUrl?: string;
  winner?: string;
  resultA?: "winner" | "loser";
  resultB?: "winner" | "loser";
};

export type BracketRound = {
  name: string;
  matches: BracketMatch[];
};

const PLACEHOLDER_WINNER = /^الفائز\s+\d+$/;

function isKnownPlayer(player: string) {
  return Boolean(player) && player !== "BYE" && player !== "TBD" && !PLACEHOLDER_WINNER.test(player);
}

function roundLabel(index: number, total: number, requestedNames: string[]) {
  if (index === 0) return requestedNames[0] ?? "الدور الأول";
  if (index === total - 1) return requestedNames[requestedNames.length - 1] ?? "النهائي";
  if (index === total - 2) return requestedNames.length >= 3 ? requestedNames[requestedNames.length - 2] : "نصف النهائي";
  if (index === total - 3) return "ربع النهائي";
  return `الجولة ${index + 1}`;
}

export function buildSingleEliminationBracket(
  players: Array<string | undefined | null>,
  roundNames: string[] = ["الدور الأول", "نصف النهائي", "النهائي"],
  slotCount?: number
): BracketRound[] {
  const cleaned = players.map((player) => (player ?? "").trim()).filter(Boolean);

  const demoPlayers = [
    "AlphaViper", "BlazeCore", "CyberNova", "DeltaFox", "EchoRune", "FrostByte", "GhostPulse", "IonStorm",
    "JadeTitan", "KnightShift", "LunaDrift", "MeteorBite", "NightRanger", "ObsidianX", "PhoenixApex", "QuartzZero",
  ];

  const requestedSlots = slotCount && slotCount > 0 ? Math.floor(slotCount) : undefined;
  const usingDemoPlayers = cleaned.length === 0;
  const finalPlayers = (usingDemoPlayers ? demoPlayers : cleaned)
    .slice(0, cleaned.length > 0 ? undefined : requestedSlots);

  if (usingDemoPlayers && requestedSlots && finalPlayers.length < requestedSlots) {
    finalPlayers.push(...Array.from({ length: requestedSlots - finalPlayers.length }, () => "TBD"));
  }

  if (finalPlayers.length === 1) {
    return [{
      name: roundNames[0] ?? "الدور الأول",
      matches: [{ playerA: finalPlayers[0], playerB: "TBD", scoreA: 0, scoreB: 0, status: "upcoming", startTime: "" }],
    }];
  }

  const rounds: BracketRound[] = [];
  let current = [...finalPlayers];

  while (current.length > 1) {
    const matches: BracketMatch[] = [];
    for (let index = 0; index < current.length; index += 2) {
      const playerA = current[index] ?? "TBD";
      const playerB = current[index + 1] ?? "BYE";
      const byeWinner = playerB === "BYE" && isKnownPlayer(playerA) ? playerA : playerA === "BYE" && isKnownPlayer(playerB) ? playerB : undefined;
      matches.push({
        playerA,
        playerB,
        scoreA: 0,
        scoreB: 0,
        status: byeWinner ? "done" : "upcoming",
        startTime: "",
        winner: byeWinner,
      });
    }

    rounds.push({
      name: "",
      matches,
    });

    current = matches.map((match, index) => match.winner ?? `الفائز ${index + 1}`);
  }

  const totalRounds = rounds.length;
  rounds.forEach((round, index) => {
    round.name = roundLabel(index, totalRounds, roundNames);
  });

  return rounds;
}

export function advanceBracketWinner(rounds: BracketRound[], roundIndex: number, matchIndex: number, winner: string): BracketRound[] {
  const next = rounds.map((round) => ({
    ...round,
    matches: round.matches.map((match) => ({ ...match })),
  }));

  const currentMatch = next[roundIndex]?.matches[matchIndex];
  if (!currentMatch || !winner) return next;

  currentMatch.status = "done";
  currentMatch.winner = winner;
  currentMatch.resultA = currentMatch.playerA === winner ? "winner" : "loser";
  currentMatch.resultB = currentMatch.playerB === winner ? "winner" : "loser";
  currentMatch.scoreA = currentMatch.playerA === winner ? 1 : 0;
  currentMatch.scoreB = currentMatch.playerB === winner ? 1 : 0;

  propagateWinner(next, roundIndex, matchIndex, winner);
  resolveByes(next);

  return next;
}

function propagateWinner(rounds: BracketRound[], roundIndex: number, matchIndex: number, winner: string) {
  const targetMatch = rounds[roundIndex + 1]?.matches[Math.floor(matchIndex / 2)];
  if (!targetMatch) return;

  if (matchIndex % 2 === 0) targetMatch.playerA = winner;
  else targetMatch.playerB = winner;

  if (targetMatch.playerA !== "BYE" && targetMatch.playerB !== "BYE") {
    targetMatch.status = "upcoming";
  }
}

function resolveByes(rounds: BracketRound[]) {
  let changed = true;
  while (changed) {
    changed = false;
    rounds.forEach((round, roundIndex) => {
      round.matches.forEach((match, matchIndex) => {
        const byeWinner = match.playerB === "BYE" && isKnownPlayer(match.playerA)
          ? match.playerA
          : match.playerA === "BYE" && isKnownPlayer(match.playerB)
            ? match.playerB
            : undefined;
        if (!byeWinner || match.winner === byeWinner) return;

        match.winner = byeWinner;
        match.status = "done";
        match.scoreA = match.playerA === byeWinner ? 1 : 0;
        match.scoreB = match.playerB === byeWinner ? 1 : 0;
        propagateWinner(rounds, roundIndex, matchIndex, byeWinner);
        changed = true;
      });
    });
  }
}
