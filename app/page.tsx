import { getGamingContent } from "@/lib/gaming-content";
import { getLeaderboard } from "@/lib/leaderboard-content";
import { DonationButton } from "@/components/DonationButton";
import { VersusScreen } from "@/components/gaming/VersusScreen";
import { BattlePassLadder } from "@/components/gaming/BattlePassLadder";
import { ContentCard, CardImage } from "@/components/gaming/ContentCard";
import { YouTubeEmbed } from "@/components/gaming/YouTubeEmbed";
import { getYoutubeThumbnail } from "@/lib/youtube";
import { HeroSection } from "@/components/gaming/HeroSection";

// Always read fresh content - an admin edit should be visible on the next page
// load, not stuck behind a stale cache.
export const dynamic = "force-dynamic";
export const revalidate = 0;

const STATUS_LABEL: Record<string, string> = {
  open: "التسجيل مفتوح",
  live: "مباشرة",
  completed: "مكتملة",
};

export default async function HomePage() {
  const content = await getGamingContent();
  const leaderboard = await getLeaderboard();

  return (
    <main>
      <DonationButton />
      <HeroSection title={content.heroTitle} subtitle={content.heroSubtitle} cta={content.heroCta} announcement={content.announcement} games={content.games} />

      <section id="games" className="section-shell">
        <div className="section-heading">
          <p className="eyebrow">01 / GAME LIBRARY</p>
          <h2>{content.aboutTitle}</h2>
          <p>{content.aboutBody}</p>
        </div>

        <div className="game-grid">
          {content.games.map((game) => (
            <ContentCard
              key={game.id}
              rarity={game.rarity}
              accentColor={game.accentColor || undefined}
              media={<CardImage src={game.imageUrl} alt={game.title} />}
              meta={`${game.category} · ${game.platform}${game.gameplayType ? ` · ${game.gameplayType}` : ""}`}
              title={game.title}
              description={[game.description, game.rules].filter(Boolean).join(" ")}
            />
          ))}
        </div>
      </section>

      <section id="tournaments" className="section-shell">
        <div className="section-heading">
          <p className="eyebrow">02 / LIVE ARENA</p>
          <h2>البطولات الحالية</h2>
          <p>اختر لعبتك وتابع كل مواجهة مباشرةً على شاشة المواجهات.</p>
        </div>

        <div className="tournament-grid">
          {content.tournaments.map((tournament) => (
            <article className="hud-panel tournament-card" key={tournament.id}>
              <div className="tournament-meta">
                <span className={`status status--${tournament.status}`}>
                  {STATUS_LABEL[tournament.status] ?? tournament.status}
                </span>
                <span>{tournament.game}</span>
              </div>

              <h3>{tournament.title}</h3>
              <p>{tournament.rules}</p>

              <div className="tournament-stats">
                <span>
                  الجائزة <b>{tournament.prize}</b>
                </span>
                <span>
                  المقاعد <b>{tournament.maxPlayers}</b>
                </span>
                <span>
                  التاريخ <b>{tournament.date}</b>
                </span>
              </div>

              <VersusScreen tournament={tournament} games={content.games} />
            </article>
          ))}
        </div>
      </section>

      <section id="battle-pass" className="section-shell">
        <BattlePassLadder leaderboard={leaderboard} />
      </section>

      <section id="media" className="section-shell">
        <div className="section-heading">
          <p className="eyebrow">03 / TIGER FEED</p>
          <h2>أحدث المحتوى</h2>
        </div>

        <div className="video-grid">
          {content.videos.map((video) => (
            <ContentCard
              key={video.id}
              rarity={video.rarity}
              showRarityBadge={false}
              media={
                <YouTubeEmbed
                  youtubeUrl={video.youtubeUrl}
                  fallbackUrl={video.url}
                  title={video.title}
                />
              }
              meta={
                getYoutubeThumbnail(video.youtubeUrl)
                  ? "YOUTUBE"
                  : video.url.startsWith("/uploads/")
                    ? "UPLOAD"
                    : undefined
              }
              title={video.title}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
