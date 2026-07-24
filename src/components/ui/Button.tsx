import { motion, type HTMLMotionProps } from "motion/react";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { t } from "./motion";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-outline";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-accent text-on-accent hover:bg-accent-hover active:bg-accent-active font-semibold",
  secondary:
    "bg-inset text-fg border border-line hover:border-line-strong active:bg-card-hover",
  ghost: "bg-transparent text-fg-2 hover:bg-accent-soft hover:text-fg",
  danger: "bg-danger text-white hover:brightness-110 font-semibold",
  "danger-outline": "bg-transparent text-danger border border-danger/50 hover:bg-danger/10",
};

export interface ButtonProps extends Omit<HTMLMotionProps<"button">, "children"> {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  icon?: IconName;
  loading?: boolean;
  children?: ReactNode;
}

export function Button({
  variant = "secondary",
  size = "md",
  icon,
  loading,
  disabled,
  className = "",
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  const off = disabled || loading;
  const h = size === "sm" ? "h-8 px-3" : size === "lg" ? "h-12 px-5 text-[14px]" : "h-9 px-4";
  return (
    <motion.button
      type={type}
      disabled={off}
      whileTap={off ? undefined : { scale: 0.97 }}
      transition={t.fast}
      className={`inline-flex items-center justify-center gap-2 rounded-md text-[12px] font-medium leading-4 whitespace-nowrap transition-colors duration-150 disabled:opacity-45 disabled:pointer-events-none ${h} ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {loading ? <span className="spinner" aria-hidden="true" /> : icon ? <Icon name={icon} size={16} /> : null}
      {children}
    </motion.button>
  );
}

export function IconButton({
  icon,
  label,
  size = 36,
  className = "",
  active,
  ...rest
}: Omit<HTMLMotionProps<"button">, "children"> & {
  icon: IconName;
  label: string;
  size?: number;
  active?: boolean;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      whileTap={rest.disabled ? undefined : { scale: 0.97 }}
      transition={t.fast}
      style={{ width: size, height: size }}
      className={`inline-flex shrink-0 items-center justify-center rounded-md transition-colors duration-150 disabled:opacity-45 disabled:pointer-events-none ${
        active ? "bg-accent-soft text-accent" : "text-fg-2 hover:bg-accent-soft hover:text-fg"
      } ${className}`}
      {...rest}
    >
      <Icon name={icon} size={size >= 36 ? 20 : 16} />
    </motion.button>
  );
}
