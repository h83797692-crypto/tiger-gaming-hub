"use client";

import { useEffect, useRef } from "react";
import { animate, motion, useInView, useMotionValue, useTransform } from "framer-motion";

export function AnimatedXP({ value, max, className = "", showValue = true }: { value: number; max?: number; className?: string; showValue?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: false, amount: 0.3 });
  const count = useMotionValue(0);
  const rounded = useTransform(count, (current) => Math.round(current).toLocaleString("en"));

  useEffect(() => {
    if (!isInView) {
      count.set(0);
      return;
    }
    const controls = animate(count, value, { duration: 1.25, ease: "easeOut" });
    return () => controls.stop();
  }, [count, isInView, value]);

  return (
    <span ref={ref} className={className} dir="ltr">
      {showValue && <><motion.span>{rounded}</motion.span> XP</>}
      {max !== undefined && <motion.i className="animated-xp__bar" initial={{ width: 0 }} animate={isInView ? { width: `${Math.min(100, Math.max(0, (value / max) * 100))}%` } : { width: 0 }} style={{ transformOrigin: "left" }} transition={{ duration: 1.35, delay: 0.1, ease: "easeOut" }} />}
    </span>
  );
}