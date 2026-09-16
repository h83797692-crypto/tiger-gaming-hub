import type { Config } from "tailwindcss";

/**
 * Tiger Gaming — "Broadcast HUD" design tokens.
 *
 * Palette rules:
 *  - `tiger.void` / `tiger.panel` carry every surface. Nothing else is a background.
 *  - `tiger.cyan` is the PRIMARY accent (navigation, structure, idle states).
 *  - `tiger.orange` is the SECONDARY accent (energy, progression, battle pass).
 *  - `tiger.live` (neon red) is RESERVED for live/urgent states only, so it never
 *    competes with the primary accent.
 */
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        tiger: {
          void: "#07090E",
          panel: "#0F1420",
          "panel-strong": "#0D121F",
          line: "#1E293B",
          cyan: "#00F0FF",
          "cyan-dim": "#00A3FF",
          orange: "#FF8A00",
          amber: "#FFB800",
          live: "#FF2E54",
          muted: "#94A3B8",
        },
        // Rarity ramp used by ContentCard.
        rarity: {
          common: "#00E5FF",
          rare: "#FF7A18",
          legendary: "#FFB020",
        },
        ink: {
          DEFAULT: "#0A0D14",
          soft: "#0F141F",
        },
      },
      fontFamily: {
        sans: ["var(--font-cairo)", "sans-serif"],
        gaming: ["var(--font-chakra)", "sans-serif"],
      },
      backgroundImage: {
        "hud-cyan": "linear-gradient(135deg, #00E5FF 0%, #0B7C8C 100%)",
        "hud-flame": "linear-gradient(135deg, #FF2D55 0%, #FF7A18 55%, #FFB020 100%)",
      },
      boxShadow: {
        "hud-cyan": "0 0 28px rgba(0, 229, 255, 0.22)",
        "hud-orange": "0 0 28px rgba(255, 122, 24, 0.24)",
        "hud-live": "0 0 32px rgba(255, 45, 85, 0.30)",
        panel: "0 18px 50px rgba(0, 0, 0, 0.45)",
      },
      spacing: {
        hud: "clamp(1rem, 3vw, 2rem)",
      },
      keyframes: {
        "live-pulse": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.45", transform: "scale(0.82)" },
        },
        "scan-sweep": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
      },
      animation: {
        "live-pulse": "live-pulse 1.25s ease-in-out infinite",
        "scan-sweep": "scan-sweep 4s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
