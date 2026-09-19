import type { UserProfile } from "@/lib/user-profile";
import { getPlayerRank } from "@/lib/player-ranks";

export function UserAvatar({
  profile,
  name,
  avatarUrl,
  size = "md",
  className = "",
}: {
  profile?: Partial<UserProfile> | null;
  name?: string;
  avatarUrl?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const displayName = profile?.username || name || "Tiger Player";
  const image = profile?.avatarUrl || avatarUrl;
  const showChampionFrame = profile?.frame === "champion" && profile.frameEnabled !== false;
  const rank = profile?.xp !== undefined ? getPlayerRank(profile.xp) : null;
  const initial = displayName.trim().slice(0, 1).toUpperCase() || "?";

  return (
    <span className={`user-avatar user-avatar--${size}${showChampionFrame ? " user-avatar--champion" : ""} ${className}`} title={displayName}>
      <span className="user-avatar__ring">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={displayName} className="user-avatar__image" />
        ) : (
          <span className="user-avatar__fallback">{initial}</span>
        )}
      </span>
      {rank && <span className="user-avatar__rank" style={{ "--rank-color": rank.color } as React.CSSProperties} title={`${rank.label} · ${profile?.xp ?? 0} XP`}>{rank.icon}</span>}
    </span>
  );
}
