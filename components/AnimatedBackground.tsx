"use client";

import { motion } from "framer-motion";

const PARTICLES = [
  { left: "8%", top: "18%", size: 7, color: "rgba(0, 240, 255, 0.7)", delay: 0 },
  { left: "82%", top: "24%", size: 5, color: "rgba(255, 46, 84, 0.7)", delay: 1.1 },
  { left: "68%", top: "72%", size: 8, color: "rgba(0, 240, 255, 0.45)", delay: 2.2 },
  { left: "22%", top: "84%", size: 4, color: "rgba(255, 184, 0, 0.5)", delay: 0.6 },
];

export function AnimatedBackground() {
  return (
    <div className="animated-background fixed inset-0 -z-10 pointer-events-none overflow-hidden" aria-hidden="true">
      <div className="animated-background__grid" />
      <motion.div className="animated-background__orb animated-background__orb--cyan" animate={{ x: [0, 35, -20, 0], y: [0, -20, 25, 0], scale: [1, 1.12, 0.94, 1] }} transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }} />
      <motion.div className="animated-background__orb animated-background__orb--crimson" animate={{ x: [0, -30, 20, 0], y: [0, 25, -15, 0], scale: [1, 0.92, 1.08, 1] }} transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }} />
      {PARTICLES.map((particle) => (
        <motion.span key={`${particle.left}-${particle.top}`} className="animated-background__particle" style={{ left: particle.left, top: particle.top, width: particle.size, height: particle.size, background: particle.color, boxShadow: `0 0 18px ${particle.color}` }} animate={{ opacity: [0.15, 0.9, 0.15], y: [0, -18, 0] }} transition={{ duration: 4.5, delay: particle.delay, repeat: Infinity, ease: "easeInOut" }} />
      ))}
    </div>
  );
}