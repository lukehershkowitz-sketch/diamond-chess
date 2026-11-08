import { CLASS_META } from "@/lib/review/labels";
import type { MoveClass } from "@/lib/review/types";

/** The one move-grade badge. Grade colours carry meaning, so they stay outside the gold accent. */
export function GradeBadge({ cls, size = "sm" }: { cls: MoveClass; size?: "sm" | "md" }) {
  const dims = size === "md" ? "h-6 min-w-7 px-1.5 text-xs" : "h-[18px] min-w-5 px-1 text-[10px]";
  return (
    <span className={`inline-flex shrink-0 items-center justify-center rounded-[6px] font-bold leading-none text-white ${dims} ${CLASS_META[cls].color}`}>
      {CLASS_META[cls].symbol}
    </span>
  );
}

/**
 * The grade badge drawn on the board, in the top-right corner of the square the piece moved to.
 * Sized from the square (container query units), so it scales with the board. Decorative: the
 * move list and feedback card already say the grade in text.
 */
export function BoardGradeBadge({ cls }: { cls: MoveClass }) {
  return (
    <span
      aria-hidden
      data-grade={cls}
      className={`pointer-events-none absolute right-[4%] top-[4%] z-10 flex aspect-square w-[40%] items-center justify-center rounded-full text-[19cqw] font-bold leading-none text-white shadow-[0_1px_4px_rgba(0,0,0,0.55)] ring-[1.5px] ring-white/85 ${CLASS_META[cls].color}`}
    >
      {CLASS_META[cls].symbol}
    </span>
  );
}
