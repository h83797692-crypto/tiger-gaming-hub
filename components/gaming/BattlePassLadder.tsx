import type { Leaderboard, LeaderboardTier } from "@/lib/leaderboard-content";
import { normaliseTiers } from "@/lib/leaderboard-content";
import { AnimatedXP } from "@/components/gaming/AnimatedXP";
import { UserAvatar } from "@/components/UserAvatar";

function tierForPoints(points: number, tiers: LeaderboardTier[]): LeaderboardTier {
  // Tiers arrive sorted ascending; walk down to find the highest one reached.
  for (let i = tiers.length - 1; i >= 0; i -= 1) {
    if (points >= tiers[i].threshold) return tiers[i];
  }
  return tiers[0];
}

function percent(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

/**
 * 5-Level Battle Pass Progression Ladder.
 *
 * Desktop: a horizontal rail with five tier markers and a filled progress bar
 * driven by the top entry's points.
 * Mobile: the same five levels stack vertically (see the 640px breakpoint in
 * globals.css) — no horizontal scrolling required.
 */
export function BattlePassLadder({ leaderboard }: { leaderboard: Leaderboard }) {
  const tiers = normaliseTiers(leaderboard.tiers);
  const maxThreshold = Math.max(...tiers.map((tier) => tier.threshold), 1);

  const entries = [...(leaderboard.entries ?? [])].sort((a, b) => b.points - a.points);
  const leader = entries[0];
  const leaderPoints = leader?.points ?? 0;
  const leaderTier = leader ? tierForPoints(leaderPoints, tiers) : tiers[0];

  return (
    <section className="ladder-panel" aria-label={leaderboard.title}>
      <div className="ladder-heading">
        <div>
          <p className="eyebrow">04 / BATTLE PASS</p>
          <h2>{leaderboard.title}</h2>
        </div>
        <span className="ladder-heading__game">{leaderboard.game}</span>
      </div>

      <div className="ladder-rail">
        <div className="ladder-rail__track" aria-hidden="true">
          <AnimatedXP value={leaderPoints} max={maxThreshold} showValue={false} className="ladder-rail__fill" />
        </div>

        <ol className="ladder-levels">
          {tiers.map((tier) => {
            const reached = leaderPoints >= tier.threshold;
            const current = leaderTier?.tier === tier.tier;

            return (
              <li
                key={tier.tier}
                className={`ladder-level${reached ? " is-reached" : ""}${current ? " is-current" : ""}`}
              >
                <span className="tier-icon">
                  {tier.iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={tier.iconUrl} alt="" />
                  ) : (
                    <span>{tier.tier}</span>
                  )}
                </span>

                <span>
                  <strong className="ladder-level__label">{tier.label}</strong>
                  <small className="ladder-level__threshold">
                    {tier.threshold.toLocaleString("en")} XP
                  </small>
                </span>

                {current && <span className="ladder-level__badge">YOU ARE HERE</span>}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="ladder-entries">
        {entries.map((entry, index) => {
          const tier = tierForPoints(entry.points, tiers);
          return (
            <article
              key={`${entry.name}-${index}`}
              className={index === 0 ? "ladder-entry is-top" : "ladder-entry"}
            >
              <span className="entry-rank">#{index + 1}</span>

              <UserAvatar className="entry-avatar" name={entry.name} avatarUrl={entry.avatarUrl} size="sm" profile={entry.userId ? { id: entry.userId, username: entry.name, avatarUrl: entry.avatarUrl, frame: entry.frame ?? null, frameEnabled: entry.frameEnabled ?? true, xp: entry.points } : undefined} />

              <div className="entry-copy">
                <strong>{entry.name}</strong>
                <small>
                  {tier.label} · <AnimatedXP value={entry.points} />
                </small>
              </div>

              <div className="entry-progress" aria-hidden="true">
                <AnimatedXP value={entry.points} max={maxThreshold} showValue={false} />
              </div>

              {index === 0 && <span className="you-are-here">TOP PLAYER</span>}
            </article>
          );
        })}
      </div>
    </section>
  );
}
