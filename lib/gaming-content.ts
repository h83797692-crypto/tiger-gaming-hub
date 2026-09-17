import { getDb } from "@/lib/mongodb";
import { getYoutubeId } from "@/lib/youtube";
import { unstable_noStore as noStore } from "next/cache";

/** Rarity drives the ContentCard glow border. */
export type Rarity = "common" | "rare" | "legendary";

export interface Game {
  id: string;
  title: string;
  category: string;
  gameplayType: string;
  matchFormat: string;
  gameVariant: string;
  teamMode: string;
  gameplayGuide: string;
  platform: string;
  imageUrl: string;
  iconUrl: string;
  accentColor?: string;
  description: string;
  rules: string;
  rarity: Rarity;
}

export interface Match {
  playerA: string;
  playerB: string;
  avatarA?: string;
  avatarB?: string;
  scoreA: number;
  scoreB: number;
  status: "upcoming" | "live" | "done";
  startTime: string;
  liveUrl?: string;
  winner?: string;
  resultA?: "winner" | "loser";
  resultB?: "winner" | "loser";
}

export interface Round {
  name: string;
  matches: Match[];
}

export interface Tournament {
  id: string;
  title: string;
  game: string;
  mode: "solo" | "duo" | "squad";
  status: "open" | "live" | "completed";
  date: string;
  prize: string;
  maxPlayers: number;
  rules: string;
  rounds: Round[];
}

export interface VideoItem {
  id: string;
  title: string;
  /** Uploaded file path (/uploads/...) OR a pasted URL. */
  url: string;
  /** Raw pasted YouTube/Shorts URL. */
  youtubeUrl: string;
  /** Derived from youtubeUrl on write — never entered by hand. */
  youtubeId?: string;
  thumbnailUrl: string;
  rarity: Rarity;
}

export interface GamingContent {
  brand: string;
  heroTitle: string;
  heroSubtitle: string;
  heroCta: string;
  announcement: string;
  aboutTitle: string;
  aboutBody: string;
  games: Game[];
  tournaments: Tournament[];
  videos: VideoItem[];
}

export const DEFAULT_GAMING_CONTENT: GamingContent = {
  brand: "TIGER GAMING",
  heroTitle: "العب. نافس. اترك أثرك.",
  heroSubtitle: "منصة البطولات السريعة ومحتوى الألعاب من مجتمع Tiger Gaming.",
  heroCta: "انضم للبطولة",
  announcement: "البطولة القادمة مفتوحة الآن | المقاعد محدودة",
  aboutTitle: "ساحة اللعب",
  aboutBody: "اختر لعبتك، سجّل فريقك، وتابع طريقك إلى القمة في بطولات المجتمع.",
  games: [
    {
      id: "cs2",
      title: "Counter-Strike 2",
      category: "FPS",
      gameplayType: "فِرَق 5 ضد 5",
      matchFormat: "5v5",
      gameVariant: "",
      teamMode: "فرق",
      gameplayGuide: "اختيار فصيل، جمع الموارد، بناء قاعدة، ثم إنتاج الوحدات ومهاجمة قاعدة الخصم.",
      platform: "PC",
      imageUrl:
        "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=80",
      iconUrl:
        "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=300&q=80",
      accentColor: "#00f0ff",
      description: "لعبة تصويب تنافسية تعتمد على الجولات والتعاون بين أعضاء الفريق.",
      rules: "5v5 competitive",
      rarity: "legendary",
    },
    {
      id: "pubg",
      title: "PUBG Mobile",
      category: "Battle Royale",
      gameplayType: "Squad / Battle Royale",
      matchFormat: "Squad",
      gameVariant: "",
      teamMode: "فرق",
      gameplayGuide: "ينزل اللاعب أو الفريق إلى الخريطة، يجمع المعدات، ويتحرك داخل المنطقة الآمنة حتى يبقى آخر لاعب أو فريق.",
      platform: "Mobile",
      imageUrl:
        "https://images.unsplash.com/photo-1560253023-3ec5d502959f?auto=format&fit=crop&w=900&q=80",
      iconUrl:
        "https://images.unsplash.com/photo-1560253023-3ec5d502959f?auto=format&fit=crop&w=300&q=80",
      accentColor: "#ff4d9d",
      description: "يتنافس اللاعبون أو الفرق للبقاء حتى النهاية ضمن خريطة تتقلص تدريجياً.",
      rules: "Squad survival",
      rarity: "rare",
    },
    {
      id: "generals-zero-hour",
      title: "Generals: Zero Hour",
      category: "RTS",
      gameplayType: "استراتيجية لحظية",
      matchFormat: "1v1",
      gameVariant: "",
      teamMode: "فردي",
      gameplayGuide: "إدارة الاقتصاد وبناء القاعدة واختيار الوحدات المناسبة لمواجهة استراتيجية الخصم في الوقت الحقيقي.",
      platform: "PC",
      imageUrl:
        "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80",
      iconUrl:
        "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=300&q=80",
      accentColor: "#7c5cff",
      description: "لعبة استراتيجية لحظية تعتمد على بناء القاعدة وإدارة الموارد وقيادة الوحدات.",
      rules: "Competitive army tactics",
      rarity: "legendary",
    },
    {
      id: "rocket",
      title: "Rocket League",
      category: "Sports",
      gameplayType: "مباراة فرق",
      matchFormat: "3v3",
      gameVariant: "",
      teamMode: "فرق",
      gameplayGuide: "مباراة سريعة بين فرق، ويحاول اللاعبون تسجيل الأهداف باستخدام السيارات قبل انتهاء الوقت.",
      platform: "Console / PC",
      imageUrl:
        "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80",
      iconUrl:
        "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=300&q=80",
      accentColor: "#ffb800",
      description: "مباريات كرة قدم سريعة باستخدام السيارات وتسجيل أكبر عدد من الأهداف.",
      rules: "3v3 arena",
      rarity: "common",
    },
  ],
  tournaments: [
    {
      id: "neon-clash",
      title: "Neon Clash",
      game: "Counter-Strike 2",
      mode: "solo",
      status: "open",
      date: "2026-10-04",
      prize: "5,000 ريال",
      maxPlayers: 32,
      rules: "Single elimination · Best of 3",
      rounds: [
        {
          name: "الدور الأول",
          matches: [
            { playerA: "AlphaViper", playerB: "BlazeCore", scoreA: 2, scoreB: 1, status: "done", startTime: "2026-10-04T18:00:00" },
            { playerA: "CyberNova", playerB: "DeltaFox", scoreA: 2, scoreB: 0, status: "done", startTime: "2026-10-04T18:25:00" },
            { playerA: "EchoRune", playerB: "FrostByte", scoreA: 0, scoreB: 2, status: "done", startTime: "2026-10-04T18:50:00" },
            { playerA: "GhostPulse", playerB: "IonStorm", scoreA: 2, scoreB: 1, status: "done", startTime: "2026-10-04T19:15:00" },
            { playerA: "JadeTitan", playerB: "KnightShift", scoreA: 2, scoreB: 0, status: "done", startTime: "2026-10-04T19:40:00" },
            { playerA: "LunaDrift", playerB: "MeteorBite", scoreA: 1, scoreB: 2, status: "done", startTime: "2026-10-04T20:05:00" },
            { playerA: "NightRanger", playerB: "ObsidianX", scoreA: 2, scoreB: 1, status: "done", startTime: "2026-10-04T20:30:00" },
            { playerA: "PhoenixApex", playerB: "QuartzZero", scoreA: 2, scoreB: 0, status: "done", startTime: "2026-10-04T20:55:00" },
          ],
        },
        {
          name: "نصف النهائي",
          matches: [
            { playerA: "AlphaViper", playerB: "CyberNova", scoreA: 2, scoreB: 1, status: "done", startTime: "2026-10-05T18:00:00" },
            { playerA: "FrostByte", playerB: "GhostPulse", scoreA: 1, scoreB: 2, status: "done", startTime: "2026-10-05T18:20:00" },
            { playerA: "JadeTitan", playerB: "MeteorBite", scoreA: 2, scoreB: 0, status: "done", startTime: "2026-10-05T18:40:00" },
            { playerA: "NightRanger", playerB: "PhoenixApex", scoreA: 1, scoreB: 2, status: "done", startTime: "2026-10-05T19:00:00" },
          ],
        },
        {
          name: "النهائي",
          matches: [
            { playerA: "AlphaViper", playerB: "GhostPulse", scoreA: 3, scoreB: 2, status: "done", startTime: "2026-10-05T20:00:00" },
          ],
        },
      ],
    },
    {
      id: "drop-zone",
      title: "Drop Zone",
      game: "PUBG Mobile",
      mode: "squad",
      status: "live",
      date: "2026-09-28",
      prize: "2,500 ريال",
      maxPlayers: 64,
      rules: "Points leaderboard",
      rounds: [
        {
          name: "الدور الأول",
          matches: [
            { playerA: "Squad Alpha", playerB: "Squad Delta", scoreA: 8, scoreB: 6, status: "live", startTime: "2026-09-28T20:00:00" },
            { playerA: "Tiger Force", playerB: "Nova 7", scoreA: 0, scoreB: 0, status: "upcoming", startTime: "2026-09-28T21:00:00" },
            { playerA: "Storm Hunt", playerB: "Red Horizon", scoreA: 0, scoreB: 0, status: "upcoming", startTime: "2026-09-28T21:30:00" },
            { playerA: "Wolf Pack", playerB: "Apex Kings", scoreA: 0, scoreB: 0, status: "upcoming", startTime: "2026-09-28T22:00:00" },
          ],
        },
        {
          name: "نصف النهائي",
          matches: [
            { playerA: "الفائز 1", playerB: "الفائز 2", scoreA: 0, scoreB: 0, status: "upcoming", startTime: "2026-09-29T19:00:00" },
          ],
        },
        {
          name: "النهائي",
          matches: [
            { playerA: "TBD", playerB: "TBD", scoreA: 0, scoreB: 0, status: "upcoming", startTime: "2026-09-29T21:00:00" },
          ],
        },
      ],
    },
  ],
  videos: [
    {
      id: "intro",
      title: "أقوى لحظات الأسبوع",
      url: "",
      youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      youtubeId: "dQw4w9WgXcQ",
      thumbnailUrl: "",
      rarity: "legendary",
    },
    {
      id: "short",
      title: "Clutch في آخر ثانية",
      url: "",
      youtubeUrl: "https://youtube.com/shorts/dQw4w9WgXcQ",
      youtubeId: "dQw4w9WgXcQ",
      thumbnailUrl: "",
      rarity: "rare",
    },
  ],
};

const DOC_ID = "gaming-content";

const VALID_RARITIES: Rarity[] = ["common", "rare", "legendary"];

function coerceRarity(value: unknown): Rarity {
  return VALID_RARITIES.includes(value as Rarity) ? (value as Rarity) : "common";
}

/**
 * Backfills fields added after the first release so documents written by an
 * older version of the admin panel still render.
 */
function normaliseContent(content: GamingContent): GamingContent {
  return {
    ...content,
    games: (content.games ?? []).map((game) => ({
      ...game,
      gameplayType: game.gameplayType ?? "",
      matchFormat: game.matchFormat ?? "",
      gameVariant: game.gameVariant ?? "",
      teamMode: game.teamMode ?? "",
      gameplayGuide: game.gameplayGuide ?? "",
      imageUrl: game.imageUrl ?? "",
      iconUrl: game.iconUrl ?? game.imageUrl ?? "",
      accentColor: game.accentColor || "",
      description: game.description ?? "",
      rarity: coerceRarity(game.rarity),
    })),
    tournaments: (content.tournaments ?? []).map((tournament) => ({
      ...tournament,
      mode: tournament.mode ?? "solo",
      rounds: (tournament.rounds ?? []).map((round) => ({
        ...round,
        matches: (round.matches ?? []).map((match) => ({
          ...match,
          scoreA: match.scoreA ?? 0,
          scoreB: match.scoreB ?? 0,
          status: match.status ?? "upcoming",
          startTime: match.startTime ?? "",
        })),
      })),
    })),
    videos: (content.videos ?? []).map((video) => {
      const youtubeUrl = video.youtubeUrl || video.url || "";
      return {
        ...video,
        youtubeUrl,
        // Always re-derive: the stored ID is a cache, the URL is the source of truth.
        youtubeId: getYoutubeId(youtubeUrl) ?? undefined,
        url: video.url ?? "",
        thumbnailUrl: video.thumbnailUrl ?? "",
        rarity: coerceRarity(video.rarity),
      };
    }),
  };
}

export function buildSingleEliminationBracket(
  players: Array<string | undefined | null>,
  roundNames: string[] = ["الدور الأول", "نصف النهائي", "النهائي"]
): Round[] {
  const cleaned = players.map((player) => (player ?? "").trim()).filter(Boolean);

  if (cleaned.length === 0) {
    return [{
      name: roundNames[0] ?? "الدور الأول",
      matches: [{ playerA: "TBD", playerB: "TBD", scoreA: 0, scoreB: 0, status: "upcoming", startTime: "" }],
    }];
  }

  const rounds: Round[] = [];
  let current = [...cleaned];
  let roundIndex = 0;

  while (current.length > 1) {
    const padded = [...current];
    while (padded.length % 2 !== 0) {
      padded.push("BYE");
    }

    const matches: Match[] = [];
    for (let index = 0; index < padded.length; index += 2) {
      matches.push({
        playerA: padded[index] ?? "TBD",
        playerB: padded[index + 1] ?? "TBD",
        scoreA: 0,
        scoreB: 0,
        status: "upcoming",
        startTime: "",
      });
    }

    rounds.push({
      name: roundNames[roundIndex] ?? `الجولة ${roundIndex + 1}`,
      matches,
    });

    current = Array.from({ length: matches.length }, (_, matchIndex) => `الفائز ${matchIndex + 1}`);
    roundIndex += 1;
  }

  if (rounds.length === 0) {
    return [{
      name: roundNames[0] ?? "الدور الأول",
      matches: [{ playerA: cleaned[0], playerB: "TBD", scoreA: 0, scoreB: 0, status: "upcoming", startTime: "" }],
    }];
  }

  return rounds;
}

export function advanceBracketWinner(rounds: Round[], roundIndex: number, matchIndex: number, winner: string): Round[] {
  const next = rounds.map((round) => ({
    ...round,
    matches: round.matches.map((match) => ({ ...match })),
  }));

  const currentMatch = next[roundIndex]?.matches[matchIndex];
  if (!currentMatch || !winner) return next;

  currentMatch.winner = winner;
  currentMatch.status = "done";
  currentMatch.scoreA = currentMatch.playerA === winner ? 1 : 0;
  currentMatch.scoreB = currentMatch.playerB === winner ? 1 : 0;

  const nextRound = next[roundIndex + 1];
  if (!nextRound) return next;

  const nextMatchIndex = Math.floor(matchIndex / 2);
  const nextMatch = nextRound.matches[nextMatchIndex];
  if (!nextMatch) return next;

  const placeholderA = !nextMatch.playerA || nextMatch.playerA === "TBD" || nextMatch.playerA === "BYE" || /^الفائز\s+\d+$/.test(nextMatch.playerA);
  const placeholderB = !nextMatch.playerB || nextMatch.playerB === "TBD" || nextMatch.playerB === "BYE" || /^الفائز\s+\d+$/.test(nextMatch.playerB);

  if (matchIndex % 2 === 0) {
    if (placeholderA) nextMatch.playerA = winner;
    else if (placeholderB) nextMatch.playerB = winner;
  } else if (placeholderB) {
    nextMatch.playerB = winner;
  } else if (placeholderA) {
    nextMatch.playerA = winner;
  }

  if (nextMatch.playerA && nextMatch.playerB && nextMatch.playerA !== "TBD" && nextMatch.playerB !== "TBD" && nextMatch.playerA !== "BYE" && nextMatch.playerB !== "BYE") {
    nextMatch.status = "upcoming";
  }

  return next;
}

export async function getGamingContent(): Promise<GamingContent> {
  noStore();

  try {
    const db = await getDb();
    const doc = await db.collection("gaming").findOne({ _id: DOC_ID as any });
    if (!doc) return DEFAULT_GAMING_CONTENT;
    const { _id, ...rest } = doc as any;
    return normaliseContent({ ...DEFAULT_GAMING_CONTENT, ...rest } as GamingContent);
  } catch (error) {
    console.error("MongoDB unavailable; serving default gaming content.", error);
    return DEFAULT_GAMING_CONTENT;
  }
}

export async function updateGamingContent(content: GamingContent) {
  const db = await getDb();
  const normalised = normaliseContent(content);
  await db
    .collection("gaming")
    .updateOne(
      { _id: DOC_ID as any },
      { $set: { ...normalised, updatedAt: new Date() } },
      { upsert: true }
    );
  return getGamingContent();
}
