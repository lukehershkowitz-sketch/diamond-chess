import type { ReactNode } from "react";
import type { ReviewedMove } from "@/lib/review/analyzeGame";
import { CLASS_META, describeMove } from "@/lib/review/labels";

/** Verdict for the current move. Static on purpose: it changes on every arrow-key press. */
export function MoveFeedback({
  move,
  scoreLabel,
  className = "",
  coach,
}: {
  move: ReviewedMove | null;
  scoreLabel: string;
  className?: string;
  /** Optional coach explanation slot shown under the verdict. */
  coach?: ReactNode;
}) {
  return (
    <div className={`min-h-[4.5rem] rounded-lg bg-neutral-900 p-4 ${className}`} aria-live="polite">
      {move ? (
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 inline-block min-w-7 rounded px-1.5 py-0.5 text-center text-xs font-bold text-white ${CLASS_META[move.cls].color}`}>
            {CLASS_META[move.cls].symbol}
          </span>
          <div className="min-w-0">
            <p className={`font-semibold ${CLASS_META[move.cls].text}`}>
              {CLASS_META[move.cls].label}
              <span className="ml-2 font-mono text-sm font-normal tabular-nums text-neutral-400">{scoreLabel}</span>
            </p>
            <p className="text-sm leading-relaxed text-neutral-300">{describeMove(move)}</p>
            {coach}
          </div>
        </div>
      ) : (
        <p className="text-sm text-neutral-300">Review ready. Use the arrow keys or tap a move to step through the game.</p>
      )}
    </div>
  );
}
