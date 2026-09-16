"use client";

import { motion } from "framer-motion";
import { DonationButton } from "@/components/DonationButton";

export function SidebarHud() {
  return (
    <aside className="sidebar-hud" dir="rtl" aria-label="روابط Tiger Gaming السريعة">
      <motion.div className="sidebar-hud__pulse" animate={{ opacity: [0.35, 0.8, 0.35], scale: [1, 1.03, 1] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }} />
      <div className="sidebar-hud__content">
        <span className="sidebar-hud__label">TIGER HUB</span>
        <DonationButton />
      </div>
    </aside>
  );
}