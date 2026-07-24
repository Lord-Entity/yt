import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { t } from "./motion";

/** Bottom sheet for phones (UI_MOBILE.md): spring slide, fade under reduced motion. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end bg-black/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={t.fast}
          onMouseDown={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={reduced ? { opacity: 0 } : { y: "100%" }}
            animate={reduced ? { opacity: 1 } : { y: 0 }}
            exit={reduced ? { opacity: 0 } : { y: "100%" }}
            transition={reduced ? t.fast : t.sheet}
            className="safe-bottom flex max-h-[85vh] w-full flex-col rounded-t-[18px] border-t border-line bg-card shadow-pop"
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-line-strong" />
            {title && <h2 className="px-4 pt-3 text-[15px] font-semibold">{title}</h2>}
            <div className="flex min-h-0 flex-1 flex-col p-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export interface SheetAction {
  label: string;
  icon: IconName;
  onSelect: () => void;
  danger?: boolean;
  disabled?: boolean;
}

export function ActionSheet({
  open,
  onClose,
  title,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  actions: SheetAction[];
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="flex flex-col">
        {actions.map((a) => (
          <button
            key={a.label}
            type="button"
            disabled={a.disabled}
            onClick={() => {
              onClose();
              a.onSelect();
            }}
            className={`flex h-12 items-center gap-3 rounded-md px-2 text-[14px] disabled:opacity-45 ${a.danger ? "text-danger" : "text-fg"} active:bg-accent-soft`}
          >
            <Icon name={a.icon} size={20} />
            {a.label}
          </button>
        ))}
      </div>
    </Sheet>
  );
}
