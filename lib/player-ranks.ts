export type PlayerRankId = "rookie" | "challenger" | "elite" | "legend" | "tiger";

export interface PlayerRank {
  id: PlayerRankId;
  label: string;
  threshold: number;
  color: string;
  icon: string;
}

export const PLAYER_RANKS: PlayerRank[] = [
  { id: "rookie", label: "Rookie", threshold: 0, color: "#94a3b8", icon: "R" },
  { id: "challenger", label: "Challenger", threshold: 500, color: "#22d3ee", icon: "C" },
  { id: "elite", label: "Elite", threshold: 1200, color: "#a78bfa", icon: "E" },
  { id: "legend", label: "Legend", threshold: 2000, color: "#f59e0b", icon: "L" },
  { id: "tiger", label: "Tiger", threshold: 3000, color: "#fb7185", icon: "T" },
];

export function getPlayerRank(xp: number, ranks = PLAYER_RANKS) {
  return [...ranks].reverse().find((rank) => xp >= rank.threshold) ?? ranks[0];
}
