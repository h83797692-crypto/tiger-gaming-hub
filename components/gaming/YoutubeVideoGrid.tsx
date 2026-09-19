"use client";

import { useEffect, useState } from "react";
import type { VideoItem } from "@/lib/gaming-content";
import { ContentCard } from "@/components/gaming/ContentCard";
import { YouTubeEmbed } from "@/components/gaming/YouTubeEmbed";
import { getYoutubeThumbnail } from "@/lib/youtube";

export function YoutubeVideoGrid({ initialVideos }: { initialVideos: VideoItem[] }) {
  const [videos, setVideos] = useState(initialVideos);

  useEffect(() => {
    console.log("[YouTube] Fetching latest videos from /api/youtube/feed?limit=6");
    fetch("/api/youtube/feed?limit=6", { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => ({}));
        console.log("[YouTube] Feed response", {
          status: response.status,
          ok: response.ok,
          source: payload.source,
          count: payload.videos?.length ?? 0,
          payload,
        });
        if (payload.diagnostic) console.error("[YouTube] Server diagnostic:", payload.diagnostic);
        if (!response.ok) throw new Error(payload.error ?? `HTTP ${response.status}`);
        return payload as { videos?: VideoItem[] };
      })
      .then((payload) => {
        if (Array.isArray(payload.videos) && payload.videos.length > 0) {
          console.log("[YouTube] Replacing old video cards with latest videos");
          setVideos(payload.videos);
        } else {
          console.warn("[YouTube] No videos returned; keeping manual fallback cards");
        }
      })
      .catch((error) => console.error("[YouTube] Browser fetch failed", error));
  }, []);

  return (
    <div className="video-grid">
      {videos.map((video) => (
        <ContentCard
          key={video.id}
          rarity={video.rarity}
          showRarityBadge={false}
          media={<YouTubeEmbed youtubeUrl={video.youtubeUrl} fallbackUrl={video.url} title={video.title} />}
          meta={getYoutubeThumbnail(video.youtubeUrl) ? "YOUTUBE" : video.url.startsWith("/uploads/") ? "UPLOAD" : undefined}
          title={video.title}
        />
      ))}
    </div>
  );
}
