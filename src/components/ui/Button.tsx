import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "quiet";
export type ButtonSize = "md" | "sm";

const BASE =
  "inline-flex items-center justify-center gap-2 rounded-sm font-medium whitespace-nowrap select-none disabled:pointer-events-none disabled:opacity-40";
const VARIANTS: Record<ButtonVariant, string> = {
  // The one gold action per view.
  primary: "bg-accent text-accent-ink hover:bg-accent-hover",
  // Everything else a person can press.
  secondary: "border border-line-strong bg-surface text-ink hover:border-faint hover:bg-raised",
  // Low-emphasis actions (skip, dismiss).
  quiet: "text-muted hover:bg-raised hover:text-ink",
};
const SIZES: Record<ButtonSize, string> = {
  md: "h-11 shrink-0 px-4 text-sm",
  sm: "h-9 shrink-0 px-3 text-sm",
};
const ICON_SIZES: Record<ButtonSize, string> = { md: "h-11 w-11 shrink-0", sm: "h-9 w-9 shrink-0" };
/** Icon buttons that share a row equally (e.g. move controls). */
const STRETCH_SIZES: Record<ButtonSize, string> = { md: "h-11 min-w-0 flex-1", sm: "h-9 min-w-0 flex-1" };

/**
 * Classes for the house button, for elements that can't be a <Button> (links, file labels).
 * `className` is for layout only (margins, position); don't pass padding, height or colour
 * there: Tailwind resolves conflicting utilities by stylesheet order, not class order.
 */
export function buttonClass({
  variant = "secondary",
  size = "md",
  iconOnly = false,
  stretch = false,
  className = "",
}: { variant?: ButtonVariant; size?: ButtonSize; iconOnly?: boolean; stretch?: boolean; className?: string } = {}) {
  const dims = stretch ? STRETCH_SIZES[size] : iconOnly ? ICON_SIZES[size] : SIZES[size];
  return [BASE, VARIANTS[variant], dims, className].filter(Boolean).join(" ");
}

export function Button({
  variant,
  size,
  iconOnly,
  stretch,
  className,
  type = "button",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Square button holding just an icon; give it an aria-label. */
  iconOnly?: boolean;
  /** Icon button that grows to share its row with siblings; give it an aria-label. */
  stretch?: boolean;
  children?: ReactNode;
}) {
  return (
    <button type={type} className={buttonClass({ variant, size, iconOnly, stretch, className })} {...rest}>
      {children}
    </button>
  );
}
