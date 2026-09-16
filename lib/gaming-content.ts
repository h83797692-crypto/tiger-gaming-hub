import { getDb } from "@/lib/mongodb";
import { getYoutubeId } from "@/lib/youtube";

/** Rarity drives the ContentCard glow border. */
export type Rarity = "common" | "rare" | "legendary";

export interface Game {
  id: string;
  title: string;
  category: string;
  platform: string;
  imageUrl: string;
  iconUrl: string;
  accentColor?: string;
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
  winner?: string;
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
      platform: "PC",
      imageUrl:
        "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=900&q=80",
      iconUrl:
        "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=300&q=80",
      accentColor: "#00f0ff",
      rules: "5v5 competitive",
      rarity: "legendary",
    },
    {
      id: "pubg",
      title: "PUBG Mobile",
      category: "Battle Royale",
      platform: "Mobile",
      imageUrl:
        "https://images.unsplash.com/photo-1560253023-3ec5d502959f?auto=format&fit=crop&w=900&q=80",
      iconUrl:
        "https://images.unsplash.com/photo-1560253023-3ec5d502959f?auto=format&fit=crop&w=300&q=80",
      accentColor: "#ff4d9d",
      rules: "Squad survival",
      rarity: "rare",
    },
    {
      id: "generals-zero-hour",
      title: "Generals: Zero Hour",
      category: "RTS",
      platform: "PC",
      imageUrl:
        "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80",
      iconUrl:
        "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=300&q=80",
      accentColor: "#7c5cff",
      rules: "Competitive army tactics",
      rarity: "legendary",
    },
    {
      id: "rocket",
      title: "Rocket League",
      category: "Sports",
      platform: "Console / PC",
      imageUrl:
        "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=900&q=80",
      iconUrl:
        "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=300&q=80",
      accentColor: "#ffb800",
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
          name: "ربع النهائي",
          matches: [
            { playerA: "Falcon Squad", playerB: "Night Raid", scoreA: 0, scoreB: 0, status: "upcoming", startTime: "2026-10-04T18:00:00" },
            { playerA: "Zero Ping", playerB: "Cyber Lions", scoreA: 0, scoreB: 0, status: "upcoming", startTime: "2026-10-04T20:00:00" },
          ],
        },
        {
          name: "نصف النهائي",
          matches: [
            { playerA: "الفائز 1", playerB: "الفائز 2", scoreA: 0, scoreB: 0, status: "upcoming", startTime: "2026-10-05T18:00:00" },
          ],
        },
        {
          name: "النهائي",
          matches: [
            { playerA: "TBD", playerB: "TBD", scoreA: 0, scoreB: 0, status: "upcoming", startTime: "2026-10-05T20:00:00" },
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
          name: "الجولة الحية",
          matches: [
            { playerA: "Squad Alpha", playerB: "Squad Delta", scoreA: 8, scoreB: 6, status: "live", startTime: "2026-09-28T20:00:00" },
            { playerA: "Tiger Force", playerB: "Nova 7", scoreA: 0, scoreB: 0, status: "upcoming", startTime: "2026-09-28T21:00:00" },
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
      imageUrl: game.imageUrl ?? "",
      iconUrl: game.iconUrl ?? game.imageUrl ?? "",
      accentColor: game.accentColor || "",
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

export async function getGamingContent(): Promise<GamingContent> {
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
