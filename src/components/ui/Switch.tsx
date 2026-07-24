import { motion } from "motion/react";
import { t } from "./motion";

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  title,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <motion.button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={title}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      whileTap={disabled ? undefined : { scale: 0.92 }}
      transition={t.fast}
      className={`relative h-5 w-9 shrink-0 rounded-full transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45 ${
        checked ? "bg-accent" : "bg-line-strong hover:bg-fg-3"
      }`}
    >
      <motion.span
        className="absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow-sm"
        initial={false}
        animate={{ x: checked ? 16 : 0 }}
        transition={t.spring}
      />
    </motion.button>
  );
}
