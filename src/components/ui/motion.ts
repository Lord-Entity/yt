import type { Transition } from "motion/react";

export const ease = [0.22, 1, 0.36, 1] as const;

export const t = {
  fast: { duration: 0.12, ease },
  base: { duration: 0.18, ease },
  slow: { duration: 0.28, ease },
  spring: { type: "spring", stiffness: 380, damping: 32, mass: 0.8 },
  progress: { type: "spring", stiffness: 120, damping: 24, mass: 0.6 },
  sheet: { type: "spring", stiffness: 380, damping: 36 },
} satisfies Record<string, Transition>;

/** List item enter/exit; pass reduced=true to keep only an opacity fade. */
export function listItem(reduced: boolean | null, index = 0) {
  const delay = Math.min(index, 8) * 0.03;
  if (reduced) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1, transition: { ...t.fast, delay } },
      exit: { opacity: 0, transition: t.fast },
    };
  }
  return {
    initial: { opacity: 0, y: 8, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { ...t.base, delay } },
    exit: { opacity: 0, scale: 0.96, transition: t.fast },
  };
}
