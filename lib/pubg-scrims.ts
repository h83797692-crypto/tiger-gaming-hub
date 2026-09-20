export type PubgTeamResult = {
  teamId: string;
  teamName: string;
  members: string[];
  placement: number;
  kills: number;
  placementPoints: number;
  points: number;
};

const PLACEMENT_POINTS = [10, 6, 5, 4, 3, 2, 1, 1, 1, 1];

export function isPubgTournament(game: string) {
  return /pubg/i.test(game);
}

export function getPlacementPoints(placement: number) {
  return placement > 0 ? PLACEMENT_POINTS[placement - 1] ?? 0 : 0;
}

export function getPubgPoints(placement: number, kills: number) {
  return getPlacementPoints(placement) + Math.max(0, kills);
}

export function buildPubgResults(
  registrations: Array<{ teamId?: string; teamName?: string; playerName?: string; inGameId?: string; teamMembers?: string[] }>,
  saved: Array<Partial<PubgTeamResult>> = []
): PubgTeamResult[] {
  const teams = new Map<string, { teamId: string; teamName: string; members: string[] }>();
  registrations.forEach((registration, index) => {
    const teamId = registration.teamId || `solo-${index}`;
    const current = teams.get(teamId) ?? {
      teamId,
      teamName: registration.teamName || registration.playerName || `Team ${index + 1}`,
      members: registration.teamMembers?.length ? registration.teamMembers : [registration.playerName || registration.inGameId || ""],
    };
    current.members = Array.from(new Set([...current.members, ...(registration.teamMembers ?? [])])).filter(Boolean);
    teams.set(teamId, current);
  });

  return Array.from(teams.values()).map((team, index) => {
    const previous = saved.find((result) => result.teamId === team.teamId);
    const placement = Number(previous?.placement ?? 0) || 0;
    const kills = Math.max(0, Number(previous?.kills ?? 0) || 0);
    const placementPoints = getPlacementPoints(placement);
    return { ...team, placement, kills, placementPoints, points: getPubgPoints(placement, kills) };
  }).sort((a, b) => b.points - a.points || a.placement - b.placement || a.teamName.localeCompare(b.teamName));
}
