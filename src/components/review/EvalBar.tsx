/** Vertical evaluation bar. White's share animates via transform (compositor-only), retargeting from its current value. */
export function EvalBar({ whitePct, label, flipped }: { whitePct: number; label: string; flipped: boolean }) {
  const pct = Math.max(2, Math.min(98, whitePct));
  const whiteAhead = whitePct >= 50;
  // White sits at the bottom when the board is not flipped.
  return (
    <div
      className="relative w-6 shrink-0 overflow-hidden rounded-sm bg-raised-2 sm:w-7"
      role="img"
      aria-label={`Evaluation ${label}`}
      title={`Evaluation ${label}`}
    >
      <div
        className={`absolute inset-0 bg-[#f3efe8] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${flipped ? "origin-top" : "origin-bottom"}`}
        style={{ transform: `scaleY(${pct / 100})` }}
      />
      <span
        className={`absolute inset-x-0 text-center text-[9px] font-semibold tabular-nums ${
          // Sit inside the leading side's fill: position follows orientation, color follows who's ahead.
          whiteAhead !== flipped ? "bottom-1" : "top-1"
        } ${whiteAhead ? "text-bg" : "text-ink"}`}
      >
        {label.replace("+", "")}
      </span>
    </div>
  );
}
