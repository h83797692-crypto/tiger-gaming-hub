import { getYouTubeEmbedUrl } from "@/lib/youtube";

/**
 * Responsive 16:9 embed driven by the parsed video ID.
 * Falls back to a locally uploaded file, then to a prompt for the admin.
 */
export function YouTubeEmbed({
  youtubeUrl,
  fallbackUrl,
  title,
}: {
  youtubeUrl: string;
  fallbackUrl?: string;
  title: string;
}) {
  const embed = getYouTubeEmbedUrl(youtubeUrl);

  if (embed) {
    return (
      <div className="video-frame">
        <iframe
          src={embed}
          title={title}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      </div>
    );
  }

  if (fallbackUrl && fallbackUrl.startsWith("/uploads/")) {
    return (
      <div className="video-frame">
        <video src={fallbackUrl} controls preload="metadata" />
      </div>
    );
  }

  return <div className="video-frame video-frame--empty">أضف رابط YouTube من لوحة التحكم</div>;
}
