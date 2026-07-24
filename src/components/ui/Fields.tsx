import type { ReactNode } from "react";
import { Icon } from "./Icon";

export function Select<T extends string>({
  value,
  options,
  onChange,
  label,
  className = "",
  disabled,
  title,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
  className?: string;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <select
        aria-label={label}
        title={title}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-9 w-full appearance-none rounded-md border border-line bg-inset pr-8 pl-3 text-[12px] font-medium text-fg transition-colors duration-150 hover:border-line-strong disabled:opacity-45"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon
        name="chevronDown"
        size={16}
        className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-fg-2"
      />
    </div>
  );
}

export function Stepper({
  value,
  min,
  max,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const btn =
    "flex size-9 items-center justify-center text-fg-2 hover:text-fg disabled:opacity-45 disabled:pointer-events-none";
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex h-9 items-center rounded-md border border-line bg-inset"
    >
      <button type="button" className={btn} aria-label="Decrease" disabled={value <= min} onClick={() => onChange(value - 1)}>
        <Icon name="minus" size={16} />
      </button>
      <span className="tabular w-8 text-center text-[13px] font-semibold" aria-live="polite">
        {value}
      </span>
      <button type="button" className={btn} aria-label="Increase" disabled={value >= max} onClick={() => onChange(value + 1)}>
        <Icon name="plus" size={16} />
      </button>
    </div>
  );
}

/** Settings row: 48px, label left, control right. */
export function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-12 items-center justify-between gap-4 border-b border-line py-2 last:border-b-0">
      <div className="min-w-0">
        <div className="text-[13px] font-medium">{label}</div>
        {hint && <div className="text-[11px] leading-[14px] text-fg-2">{hint}</div>}
      </div>
      <div className="flex shrink-0 items-center gap-2">{children}</div>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}
