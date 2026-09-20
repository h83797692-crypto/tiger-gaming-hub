import type { VideoItem } from "@/lib/gaming-content";

type YouTubeSearchResponse = {
  items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string; publishedAt?: string; thumbnails?: { high?: { url?: string }; medium?: { url?: string } } } }>;
};
type YouTubeChannelResponse = { items?: Array<{ contentDetails?: { relatedPlaylists?: { uploads?: string } } }> };
type YouTubePlaylistResponse = {
  items?: Array<{
    contentDetails?: { videoId?: string };
    snippet?: {
      title?: string;
      publishedAt?: string;
      thumbnails?: { high?: { url?: string }; medium?: { url?: string } };
    };
  }>;
};
type YouTubeVideoDetailsResponse = {
  items?: Array<{ id?: string; contentDetails?: { duration?: string } }>;
};

const DEFAULT_LIMIT = 6;

export type YoutubeFeedResult = { videos: VideoItem[]; source: "youtube" | "rss" | "manual-fallback"; diagnostic?: string };

function normaliseChannelReference(value: string) {
  const trimmed = value.trim();
  if (/^UC[A-Za-z0-9_-]{22}$/.test(trimmed)) return { id: trimmed };
  if (trimmed.startsWith("@")) return { handle: trimmed };
  try {
    const url = new URL(trimmed);
    const channel = url.pathname.match(/\/channel\/(UC[A-Za-z0-9_-]{22})/i)?.[1];
    const handle = url.pathname.match(/\/@([A-Za-z0-9._-]+)/)?.[1];
    if (channel) return { id: channel };
    if (handle) return { handle: `@${handle}` };
  } catch { /* use the raw value so the API can return a useful error */ }
  return { id: trimmed };
}

function decodeXml(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function buildVideo(id: string, title: string, publishedAt: string, thumbnailUrl?: string): VideoItem {
  return {
    id: `youtube-${id}`,
    title,
    url: "",
    youtubeUrl: `https://www.youtube.com/watch?v=${id}`,
    youtubeId: id,
    thumbnailUrl: thumbnailUrl || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    rarity: "common",
    publishedAt,
  };
}

function durationInSeconds(value: string) {
  const match = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
  if (!match) return 0;
  return Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
}

async function fetchFromApi(channelId: string, apiKey: string, limit: number) {
  const reference = normaliseChannelReference(channelId);
  const channelUrl = new URL("https://www.googleapis.com/youtube/v3/channels");
  channelUrl.searchParams.set("part", "contentDetails");
  if (reference.handle) channelUrl.searchParams.set("forHandle", reference.handle);
  else channelUrl.searchParams.set("id", reference.id ?? channelId);
  channelUrl.searchParams.set("key", apiKey);
  const channelResponse = await fetch(channelUrl, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!channelResponse.ok) {
    const error = await channelResponse.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(`YouTube channels.list returned ${channelResponse.status}: ${error.error?.message ?? "unknown API error"}`);
  }
  const channelData = await channelResponse.json() as YouTubeChannelResponse;
  const uploadsId = channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploadsId) throw new Error("YouTube channel has no uploads playlist");

  const playlistUrl = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
  playlistUrl.searchParams.set("part", "snippet,contentDetails");
  playlistUrl.searchParams.set("playlistId", uploadsId);
  playlistUrl.searchParams.set("maxResults", String(Math.min(limit * 4, 50)));
  playlistUrl.searchParams.set("key", apiKey);
  const response = await fetch(playlistUrl, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!response.ok) {
    const error = await response.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(`YouTube playlistItems.list returned ${response.status}: ${error.error?.message ?? "unknown API error"}`);
  }
  const data = await response.json() as YouTubePlaylistResponse;
  const candidates = (data.items ?? []).flatMap((item) => {
    const id = item.contentDetails?.videoId;
    return id ? [buildVideo(id, item.snippet?.title ? decodeXml(item.snippet.title) : "Latest video", item.snippet?.publishedAt ?? "", item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.medium?.url)] : [];
  });
  if (candidates.length === 0) return [];

  const detailsUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
  detailsUrl.searchParams.set("part", "contentDetails");
  detailsUrl.searchParams.set("id", candidates.map((video) => video.youtubeId).join(","));
  detailsUrl.searchParams.set("key", apiKey);
  const detailsResponse = await fetch(detailsUrl, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!detailsResponse.ok) {
    const error = await detailsResponse.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(`YouTube videos.list returned ${detailsResponse.status}: ${error.error?.message ?? "unknown API error"}`);
  }
  const details = await detailsResponse.json() as YouTubeVideoDetailsResponse;
  const durations = new Map((details.items ?? []).map((item) => [item.id, durationInSeconds(item.contentDetails?.duration ?? "")]));
  return candidates
    .filter((video) => !video.youtubeUrl.includes("/shorts/") && (durations.get(video.youtubeId) ?? 0) >= 60)
    .slice(0, limit);
}

async function fetchFromRss(channelId: string, limit: number) {
  const reference = normaliseChannelReference(channelId);
  if (!reference.id) throw new Error("YouTube RSS requires a channel ID");
  const response = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(reference.id)}`, { cache: "no-store", headers: { Accept: "application/atom+xml" } });
  if (!response.ok) throw new Error(`YouTube RSS returned ${response.status}`);
  const xml = await response.text();
  const entries = Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g))
    .map((match) => match[1] ?? "")
    .sort((a, b) => {
      const publishedA = a.match(/<published>([^<]+)<\/published>/)?.[1] ?? "";
      const publishedB = b.match(/<published>([^<]+)<\/published>/)?.[1] ?? "";
      return Date.parse(publishedB) - Date.parse(publishedA);
    })
    .slice(0, limit);
  return entries.flatMap((entry) => {
    const id = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1];
    if (!id) return [];
    const title = entry.match(/<media:title>([\s\S]*?)<\/media:title>/)?.[1] ?? "Latest video";
    const publishedAt = entry.match(/<published>([^<]+)<\/published>/)?.[1] ?? "";
    const thumbnailUrl = entry.match(/<media:thumbnail[^>]+url="([^"]+)"/)?.[1];
    return [buildVideo(id, decodeXml(title), publishedAt, thumbnailUrl)];
  });
}

export async function getLatestYoutubeVideosDetailed(limit = DEFAULT_LIMIT): Promise<YoutubeFeedResult> {
  const channelId = process.env.YOUTUBE_CHANNEL_ID?.trim();
  if (!channelId) {
    console.warn("YouTube feed skipped: YOUTUBE_CHANNEL_ID is missing");
    return { videos: [], source: "manual-fallback", diagnostic: "YOUTUBE_CHANNEL_ID is missing" };
  }
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 12);
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();
  try {
    if (apiKey) {
      try {
        const videos = await fetchFromApi(channelId, apiKey, safeLimit);
        if (videos.length > 0) {
          console.info(`YouTube feed loaded ${videos.length} videos via Data API`);
          return { videos, source: "youtube" };
        }
        console.warn("YouTube Data API returned no videos; trying RSS fallback");
      } catch (error) {
        console.error("YouTube Data API failed; trying RSS fallback", error);
      }
    }
    const videos = await fetchFromRss(channelId, safeLimit);
    if (videos.length > 0) {
      console.info(`YouTube feed loaded ${videos.length} videos via RSS`);
      return { videos, source: "rss", diagnostic: apiKey ? "RSS feed used after Data API fallback" : undefined };
    }
    else console.warn("YouTube RSS returned no videos; homepage will use manual videos");
    return { videos: [], source: "manual-fallback", diagnostic: "YouTube RSS returned no videos" };
  } catch (error) {
    console.error("Could not load YouTube feed; homepage will use manual videos", error);
    return { videos: [], source: "manual-fallback", diagnostic: error instanceof Error ? error.message : "Could not load YouTube feed" };
  }
}

export async function getLatestYoutubeVideos(limit = DEFAULT_LIMIT): Promise<VideoItem[]> {
  return (await getLatestYoutubeVideosDetailed(limit)).videos;
}