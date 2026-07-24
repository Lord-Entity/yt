import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import { IconButton } from "./Button";
import { t } from "./motion";

/**
 * Modal dialog. Esc and backdrop click close it. `fullScreenOnPhone` makes it
 * cover the viewport below 760px (UI_MOBILE.md), with the close button top-left.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  width = 440,
  fullScreen,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  width?: number;
  fullScreen?: boolean;
}) {
  const reduced = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    requestAnimationFrame(() => {
      const first = panel.current?.querySelector<HTMLElement>(
        "input, button:not([data-close]), select, [tabindex]",
      );
      (first ?? panel.current)?.focus();
    });
    return () => {
      window.removeEventListener("keydown", onKey, true);
      prev?.focus?.();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/55 ${fullScreen ? "" : "p-4"}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={t.fast}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
            transition={t.spring}
            style={fullScreen ? undefined : { width, maxWidth: "100%" }}
            className={`flex max-h-full flex-col bg-card text-fg shadow-pop outline-none ${
              fullScreen
                ? "safe-top safe-bottom h-full w-full"
                : "max-h-[85vh] rounded-lg border border-line"
            }`}
          >
            <header className={`flex items-start gap-3 px-5 pt-5 ${fullScreen ? "flex-row-reverse justify-end" : ""}`}>
              <div className="min-w-0 flex-1">
                <h2 className="text-[15px] leading-[22px] font-semibold">{title}</h2>
                {description && <p className="mt-1 text-fg-2">{description}</p>}
              </div>
              <IconButton icon="x" label="Close" size={fullScreen ? 48 : 32} data-close onClick={onClose} />
            </header>
            {children && <div className="scroll-y min-h-0 flex-1 px-5 py-4">{children}</div>}
            {footer && <footer className="flex justify-end gap-2 px-5 pt-1 pb-5">{footer}</footer>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  danger,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  children?: ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <ButtonLite onClick={onClose}>Cancel</ButtonLite>
          <ButtonLite
            danger={danger}
            primary
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </ButtonLite>
        </>
      }
    >
      {children}
    </Dialog>
  );
}

function ButtonLite({
  children,
  onClick,
  primary,
  danger,
}: {
  children: ReactNode;
  onClick: () => void;
  primary?: boolean;
  danger?: boolean;
}) {
  const cls = !primary
    ? "bg-inset border border-line text-fg hover:border-line-strong"
    : danger
      ? "bg-danger text-white font-semibold"
      : "bg-accent text-on-accent font-semibold hover:bg-accent-hover";
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-9 rounded-md px-4 text-[12px] font-medium transition-colors duration-150 ${cls}`}
    >
      {children}
    </button>
  );
}
