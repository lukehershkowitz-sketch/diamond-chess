import type { ReactNode } from "react";
import type { ReviewedMove } from "@/lib/review/analyzeGame";
import { CLASS_META, describeMove } from "@/lib/review/labels";
import { GradeBadge } from "./GradeBadge";

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
    <div className={`min-h-[4.5rem] rounded-md border border-line bg-surface p-4 ${className}`} aria-live="polite">
      {move ? (
        <div className="flex items-start gap-3">
          <GradeBadge cls={move.cls} size="md" />
          <div className="min-w-0">
            <p className={`font-semibold ${CLASS_META[move.cls].text}`}>
              {CLASS_META[move.cls].label}
              <span className="ml-2 font-mono text-sm font-normal tabular-nums text-muted">{scoreLabel}</span>
            </p>
            <p className="mt-0.5 text-sm leading-relaxed text-soft">{describeMove(move)}</p>
            {coach}
          </div>
        </div>
      ) : (
        <p className="text-sm text-soft">Review ready. Use the arrow keys or tap a move to step through the game.</p>
      )}
    </div>
  );
}
