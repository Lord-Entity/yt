import { motion } from "motion/react";
import { useId } from "react";
import { t } from "./motion";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
  title?: string;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  className = "",
  disabled,
}: {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (v: T) => void;
  label: string;
  className?: string;
  disabled?: boolean;
}) {
  // Unique layoutId per instance so two segmented controls never share a thumb.
  const id = useId();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={`inline-flex h-8 items-stretch rounded-md border border-line bg-inset p-[3px] ${disabled ? "pointer-events-none opacity-45" : ""} ${className}`}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={o.disabled}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={`relative flex-1 rounded-[9px] px-3 text-[12px] font-medium whitespace-nowrap transition-colors duration-150 disabled:opacity-45 ${
              selected ? "text-fg" : "text-fg-2 hover:text-fg"
            }`}
          >
            {selected && (
              <motion.span
                layoutId={`seg-thumb-${id}`}
                transition={t.spring}
                className="absolute inset-0 rounded-[9px] bg-card shadow-card dark:bg-line-strong"
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
