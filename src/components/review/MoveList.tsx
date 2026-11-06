import type { ReviewedMove } from "@/lib/review/analyzeGame";
import { CLASS_META } from "@/lib/review/labels";
import { useEffect, useRef } from "react";

export function MoveList({ moves, ply, onSelect }: { moves: ReviewedMove[]; ply: number; onSelect: (p: number) => void }) {
  const active = useRef<HTMLButtonElement>(null);
  // Braces matter: newer browsers return a Promise from scrollIntoView, which React would treat as a cleanup.
  useEffect(() => {
    active.current?.scrollIntoView({ block: "nearest" });
  }, [ply]);
  return (
    <ol className="grid max-h-72 grid-cols-[2rem_1fr_1fr] gap-x-1 gap-y-0.5 overflow-auto rounded border border-neutral-800 p-2 text-sm">
      {Array.from({ length: Math.ceil(moves.length / 2) }, (_, n) => (
        <li key={n} className="contents">
          <span className="py-0.5 text-neutral-500">{n + 1}.</span>
          {[moves[2 * n], moves[2 * n + 1]].map((m, j) =>
            m ? (
              <button
                key={j}
                ref={ply === m.ply ? active : undefined}
                onClick={() => onSelect(m.ply)}
                aria-label={`${m.san}, ${CLASS_META[m.cls].label}`}
                className={`flex items-center gap-1.5 rounded px-1 py-0.5 text-left hover:bg-neutral-800 ${ply === m.ply ? "bg-neutral-700" : ""}`}
              >
                <span className={`inline-block min-w-5 rounded px-1 text-center text-[10px] font-bold text-white ${CLASS_META[m.cls].color}`}>
                  {CLASS_META[m.cls].symbol}
                </span>
                {m.san}
              </button>
            ) : (
              <span key={j} />
            ),
          )}
        </li>
      ))}
    </ol>
  );
}
