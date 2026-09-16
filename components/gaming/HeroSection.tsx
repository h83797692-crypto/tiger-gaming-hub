"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Game } from "@/lib/gaming-content";

export function HeroSection({ title, subtitle, cta, announcement, games }: { title: string; subtitle: string; cta: string; announcement: string; games: Game[] }) {
  const [activeGame, setActiveGame] = useState(games[0]);

  return (
    <section className="hero" style={{ backgroundImage: activeGame ? `linear-gradient(90deg, rgba(10,13,20,.98) 8%, rgba(10,13,20,.72) 48%, rgba(10,13,20,.35)), url(${activeGame.imageUrl})` : undefined }}>
      <div className="hero-glow" aria-hidden="true" />
      <div className="hero-content space-y-6">
        <p className="eyebrow">{announcement}</p>
        <h1 key={activeGame?.id}>{title}</h1>
        <p className="hero-sub">{subtitle}</p>
        <motion.a href="#tournaments" className="gaming-button hero-cta" whileHover={{ scale: 1.04, boxShadow: "0 0 28px rgba(255, 46, 84, 0.4)" }} whileTap={{ scale: 0.98 }}>{cta}</motion.a>
      </div>
      <div className="hero-game-tabs" role="tablist" aria-label="اختيار اللعبة">
        {games.map((game) => <motion.button type="button" role="tab" aria-selected={activeGame?.id === game.id} key={game.id} className={activeGame?.id === game.id ? "hero-game-tab is-active" : "hero-game-tab"} onMouseEnter={() => setActiveGame(game)} onFocus={() => setActiveGame(game)} onClick={() => setActiveGame(game)} whileHover={{ y: -4, scale: 1.02 }}><span>{game.title}</span><small>{game.category}</small></motion.button>)}
      </div>
    </section>
  );
}