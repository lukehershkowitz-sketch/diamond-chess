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
