import type { ReactNode } from "react";
import type { Rarity } from "@/lib/gaming-content";

const RARITY_LABEL: Record<Rarity, string> = {
  common: "common",
  rare: "rare",
  legendary: "legendary",
};

/**
 * Character-card treatment shared by the games grid and the video grid.
 * `rarity` controls the glow-border colour and intensity via a CSS custom
 * property, so the visual ramp lives in one place (globals.css).
 */
export function ContentCard({
  rarity = "common",
  media,
  meta,
  title,
  description,
  footer,
  showRarityBadge = true,
}: {
  rarity?: Rarity;
  media: ReactNode;
  meta?: string;
  title: string;
  description?: string;
  footer?: ReactNode;
  showRarityBadge?: boolean;
}) {
  return (
    <article className={`content-card content-card--${rarity}`}>
      <div className="content-card__media">
        {media}
        {showRarityBadge && <span className="content-card__rarity">{RARITY_LABEL[rarity]}</span>}
      </div>

      <div className="content-card__body">
        {meta && <span className="content-card__meta">{meta}</span>}
        <h3>{title}</h3>
        {description && <p>{description}</p>}
        {footer}
      </div>
    </article>
  );
}

/** Image slot that degrades to a placeholder instead of a broken <img>. */
export function CardImage({ src, alt }: { src: string; alt: string }) {
  if (!src) {
    return <div className="content-card__media--empty">لا توجد صورة</div>;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" />;
}
