import { motion, useReducedMotion } from "motion/react";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Logo } from "../ui/Icon";
import { Progress } from "../ui/Progress";
import { t } from "../ui/motion";

/** Startup loader (UI_THEME_MOTION.md section 3). App controls timing and exit. */
export function Splash({
  step,
  versions,
  error,
  onRetry,
}: {
  step: string;
  versions: string | null;
  error: { title: string; body: string } | null;
  onRetry: () => void;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      key="splash"
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-5 bg-app"
      initial={{ opacity: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.24 }}
      role="status"
      aria-live="polite"
    >
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={t.slow}
      >
        <Logo size={56} />
      </motion.div>
      {error ? (
        <div className="flex max-w-sm flex-col items-center gap-3 px-6 text-center">
          <Badge tone="danger">{error.title}</Badge>
          <p className="text-fg-2">{error.body}</p>
          <Button variant="primary" icon="retry" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          <div className="w-40">
            <Progress pct={null} label="Starting Keepsake" />
          </div>
          <p className="text-[11px] leading-[14px] text-fg-2">{step}</p>
        </>
      )}
      <p className="h-4 font-mono text-[11px] text-fg-3">{versions ?? ""}</p>
    </motion.div>
  );
}
