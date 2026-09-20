import { getGamingContent } from "@/lib/gaming-content";
import { getLeaderboard } from "@/lib/leaderboard-content";
import { DonationButton } from "@/components/DonationButton";
import { TournamentArena } from "@/components/gaming/TournamentArena";
import { BattlePassLadder } from "@/components/gaming/BattlePassLadder";
import { ContentCard, CardImage } from "@/components/gaming/ContentCard";
import { YoutubeVideoGrid } from "@/components/gaming/YoutubeVideoGrid";
import { HeroSection } from "@/components/gaming/HeroSection";
import { EngagementPanel } from "@/components/EngagementPanel";
import { ClipHall } from "@/components/ClipHall";
import { getLatestYoutubeVideos } from "@/lib/youtube-feed";

// Always read fresh content - an admin edit should be visible on the next page
// load, not stuck behind a stale cache.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  const content = await getGamingContent();
  const leaderboard = await getLeaderboard();
  const youtubeVideos = await getLatestYoutubeVideos(6);
  const videos = youtubeVideos.length > 0
    ? youtubeVideos
    : content.videos.filter((video) => !video.youtubeUrl.toLowerCase().includes("/shorts/"));

  return (
    <main>
      <DonationButton />
      <HeroSection title={content.heroTitle} subtitle={content.heroSubtitle} cta={content.heroCta} announcement={content.announcement} games={content.games} />

      <EngagementPanel />

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
              meta={`${game.category} · ${game.platform}${game.gameplayType ? ` · ${game.gameplayType}` : ""}${game.matchFormat ? ` · ${game.matchFormat}` : ""}${game.gameVariant ? ` · ${game.gameVariant}` : ""}${game.teamMode ? ` · ${game.teamMode}` : ""}`}
              title={game.title}
              description={[game.gameplayGuide, game.description, game.rules].filter(Boolean).join(" ")}
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
          <TournamentArena tournaments={content.tournaments} games={content.games} />
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

        <YoutubeVideoGrid initialVideos={videos} />
      </section>

      <ClipHall />
    </main>
  );
}
