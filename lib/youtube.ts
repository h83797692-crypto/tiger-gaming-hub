/**
 * YouTube URL parsing.
 *
 * Handles every format an admin is realistically going to paste:
 *   https://www.youtube.com/watch?v=ID
 *   https://www.youtube.com/watch?v=ID&list=...&t=30s
 *   https://youtu.be/ID
 *   https://youtu.be/ID?t=42
 *   https://www.youtube.com/shorts/ID
 *   https://www.youtube.com/embed/ID
 *   https://www.youtube.com/live/ID
 *   https://m.youtube.com/... and youtube-nocookie.com
 *   a bare 11-character video ID
 */

const ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

const PATH_PREFIXES = ["shorts", "embed", "live", "v"];

function normalise(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return "";
  // Tolerate protocol-less pastes like "youtu.be/abc123".
  if (!/^https?:\/\//i.test(trimmed)) {
    if (/^(www\.|m\.)?(youtube\.com|youtu\.be|youtube-nocookie\.com)\//i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return trimmed;
  }
  return trimmed;
}

export function getYoutubeId(url: string): string | null {
  if (!url) return null;

  const candidate = normalise(url);

  // A bare ID pasted straight in.
  if (ID_PATTERN.test(candidate)) return candidate;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^(www|m)\./i, "").toLowerCase();
  const segments = parsed.pathname.split("/").filter(Boolean);

  // youtu.be/<id>
  if (host === "youtu.be") {
    const id = segments[0] ?? "";
    return ID_PATTERN.test(id) ? id : null;
  }

  if (host !== "youtube.com" && host !== "youtube-nocookie.com") {
    return null;
  }

  // /watch?v=<id>
  const queryId = parsed.searchParams.get("v");
  if (queryId && ID_PATTERN.test(queryId)) return queryId;

  // /shorts/<id>, /embed/<id>, /live/<id>, /v/<id>
  if (segments.length >= 2 && PATH_PREFIXES.includes(segments[0].toLowerCase())) {
    const id = segments[1];
    return ID_PATTERN.test(id) ? id : null;
  }

  return null;
}

/** Start offset in whole seconds, from ?t=90 / ?t=1m30s / ?start=90. */
export function getYoutubeStartSeconds(url: string): number | null {
  let parsed: URL;
  try {
    parsed = new URL(normalise(url));
  } catch {
    return null;
  }

  const raw = parsed.searchParams.get("t") ?? parsed.searchParams.get("start");
  if (!raw) return null;

  if (/^\d+$/.test(raw)) return Number(raw);

  const match = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (!match) return null;
  const [, h, m, s] = match;
  const total = Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0);
  return total > 0 ? total : null;
}

export function isYoutubeShort(url: string): boolean {
  return /\/shorts\//i.test(url ?? "");
}

export function getYouTubeEmbedUrl(url: string): string | null {
  const id = getYoutubeId(url);
  if (!id) return null;

  const start = getYoutubeStartSeconds(url);
  const params = new URLSearchParams({ rel: "0", modestbranding: "1" });
  if (start) params.set("start", String(start));

  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

/** Thumbnail fallback so a video tile never renders empty. */
export function getYoutubeThumbnail(url: string): string | null {
  const id = getYoutubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}
