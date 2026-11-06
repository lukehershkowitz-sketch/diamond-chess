export function EvalBar({ whitePct, label, flipped }: { whitePct: number; label: string; flipped: boolean }) {
  const pct = Math.max(2, Math.min(98, whitePct));
  const whiteAhead = whitePct >= 50;
  return (
    <div
      className={`relative w-6 shrink-0 overflow-hidden rounded bg-neutral-700 sm:w-7 ${flipped ? "" : "rotate-180"}`}
      aria-label={`Evaluation ${label}`}
      title={`Evaluation ${label}`}
    >
      <div className="absolute inset-x-0 top-0 bg-neutral-100 transition-[height] duration-300" style={{ height: `${pct}%` }} />
      <span
        className={`absolute inset-x-0 text-center text-[9px] font-semibold ${flipped ? "" : "rotate-180"} ${
          whiteAhead ? "top-1 text-neutral-900" : "bottom-1 text-neutral-100"
        }`}
      >
        {label.replace("+", "")}
      </span>
    </div>
  );
}
