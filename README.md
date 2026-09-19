# Tiger Gaming — Esports Broadcast HUD Platform

Next.js 15 (App Router) + MongoDB + NextAuth + Tailwind. A public gaming hub
whose every piece of content is stored in MongoDB and edited from a secured,
phone-first `/admin` dashboard. Fully RTL (Arabic) by default.

## What this build contains

### Visual system — "Broadcast HUD"
- **Palette** (`tailwind.config.ts` + `app/globals.css`):
  near-black `#0A0D14` void, `#0F141F` panels, **cyan `#00E5FF`** as the primary
  accent, **orange `#FF7A18` / amber `#FFB020`** as the energy accent, and
  **neon red `#FF2D55` reserved exclusively for LIVE states** so it never
  competes with the primary accent.
- Angled/diagonal panels via `clip-path`, skewed tier and avatar plates,
  live-indicator strips, and a pulsing `LIVE` dot.

### The bracket is gone — two systems replaced it
1. **Versus Screen** (`components/gaming/VersusScreen.tsx`) — head-to-head
   match cards fed by a round-tabs strip. Shows a live score when
   `status === "live"`, a **live-ticking countdown** when `"upcoming"`, and
   highlights the winner when `"done"`. Opens automatically on whichever round
   currently has a live match.
2. **5-Level Battle Pass Ladder** (`components/gaming/BattlePassLadder.tsx`) —
   a separate `leaderboards` collection, not bracket-shaped data. Five tier
   markers on a horizontal rail (desktop) that stack vertically on phones, a
   progress fill driven by the leading player's points, and a glowing
   `YOU ARE HERE` marker on the tier actually reached.

### Character cards
`components/gaming/ContentCard.tsx` takes a `rarity` prop
(`common` | `rare` | `legendary`) that drives the glow-border colour and
intensity through a single CSS custom property. Used by **both** the games grid
and the video grid.

### YouTube auto-embed
`lib/youtube.ts` — `getYoutubeId()` handles `youtube.com/watch?v=`, `youtu.be/`,
`/shorts/`, `/embed/`, `/live/`, `m.youtube.com`, `youtube-nocookie.com`,
protocol-less pastes, and bare 11-character IDs, while ignoring extra query
params. `?t=90` / `?t=1m30s` start offsets are carried into the embed.
The admin pastes a URL; the ID is derived on save — no manual thumbnail entry.

### Automatic YouTube feed
`lib/youtube-feed.ts` loads the latest six videos on the server. The homepage
uses YouTube Data API v3 when `YOUTUBE_API_KEY` is configured and falls back to
YouTube's public RSS feed when only `YOUTUBE_CHANNEL_ID` is configured. Results
are cached for five minutes and the existing manually managed videos remain a
fallback if the feed is unavailable.

Setup:

1. Open [Google Cloud Console](https://console.cloud.google.com/), create or
   select a project, enable **YouTube Data API v3**, then open **APIs & Services
   > Credentials > Create credentials > API key**.
2. Restrict the key to **YouTube Data API v3** and keep it server-side. Do not
   prefix it with `NEXT_PUBLIC_` and never commit `.env.local`.
3. Find the channel ID in YouTube Studio under **Settings > Channel > Advanced
   settings**, or open the channel's About page and use the channel URL/ID.
4. Add these values to `.env.local`:

   ```env
   YOUTUBE_CHANNEL_ID=UCxxxxxxxxxxxxxxxxxxxxxx
   YOUTUBE_API_KEY=AIza...
   ```

   The API key is optional. With only `YOUTUBE_CHANNEL_ID`, the app uses RSS;
   Data API is preferred because it returns structured metadata and stable
   thumbnails. Restart `npm run dev` after changing environment variables.

### YouTube watch XP
The embedded player uses the YouTube Iframe Player API in
`components/gaming/YouTubeEmbed.tsx`. Authenticated users send short server
heartbeats to `/api/youtube/watch`; the server credits only visible, playing,
forward-contiguous time. Large seeks, hidden tabs, expired sessions, duplicate
heartbeats, and concurrent watch sessions do not earn XP. The rate is controlled
by the protected **قيم المهام** section in the admin dashboard as
`watch_xp_per_minute`; the server distributes it proportionally across validated
watched seconds and preserves fractional progress between heartbeats.

### Cloud media uploads
`components/admin/ImageField.tsx` is a tab switch between **رفع ملف** and
**لصق رابط**. File uploads are sent to Cloudinary through
`/api/media/upload`, then the returned permanent `secure_url` is stored in
MongoDB. No uploaded media is written to the local `public` directory, so the
flow is compatible with Vercel's read-only filesystem. Configure
`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in
`.env.local` and in the Vercel project environment settings.

### RTL
`dir="rtl"` is set at the root layout, and **every rule in `globals.css` uses
logical properties** (`margin-inline`, `padding-inline`, `inset-inline-start`,
`border-block`, `inline-size`, `text-align: start`). Tailwind classes use
`ms-`/`me-`/`ps-`/`pe-` only. Clip-paths, skews and gradient angles can't mirror
themselves, so each has an explicit counterpart in the `RTL MIRRORING` block at
the bottom of `globals.css`.

### Mobile-first admin
Every admin form is single-column at 375px and scales up at the 640px and
1024px breakpoints — the single column is the base case, not an override.
All inputs and buttons are 44px tall for touch.

## Data model

| Collection | Shape |
|---|---|
| `gaming` | `brand`, hero/about copy, `games[]` (+`rarity`), `tournaments[].rounds[].matches[]` (+`scoreA`, `scoreB`, `status`, `startTime`), `videos[]` (+`youtubeUrl`, derived `youtubeId`, `rarity`) |
| `leaderboards` | `{ id, title, game, tiers: [{ tier, label, threshold, iconUrl }] ×5, entries: [{ name, avatarUrl, points }] }` |
| `admins` | email + bcrypt hash |
| `media` | upload records |

Every module follows the same three-piece pattern: a typed collection helper in
`lib/`, a `GET` (public) / `PUT` (admin-only, `getServerSession` + Zod) route
under `app/api/`, and a server component page plus an admin form.

## Getting started

```bash
npm install
cp .env.example .env.local     # fill in MongoDB, NextAuth, Google OAuth, and Cloudinary values
npm run seed                   # creates the first admin user
npm run dev                    # http://localhost:3001
```

For public Google sign-in, add `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to
`.env.local` and register `http://localhost:3001/api/auth/callback/google` as an
authorized redirect URI in Google Cloud Console. Production deployments must use
the matching HTTPS callback URL and `NEXTAUTH_URL`.

Build for production:

```bash
npm run build && npm start
```

## Security note

`.env.local` is gitignored but **was present in the uploaded archive** with a
live MongoDB URI, a NextAuth secret, and an admin password. Those credentials
should be rotated before this is deployed anywhere public. `.env.example` now
ships with empty placeholders rather than real values.

## Backwards compatibility

`lib/gaming-content.ts` backfills `rarity`, match scores/status/startTime, and
re-derives `youtubeId` on read, so documents written by the previous version of
the admin panel still render without a migration.
