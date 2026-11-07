import type { ReviewedMove } from "@/lib/review/analyzeGame";
import { CLASS_META } from "@/lib/review/labels";
import { GradeBadge } from "./GradeBadge";
import { useEffect, useRef } from "react";
import { revealWithin } from "@/lib/dom";

export function MoveList({ moves, ply, onSelect }: { moves: ReviewedMove[]; ply: number; onSelect: (p: number) => void }) {
  const list = useRef<HTMLOListElement>(null);
  const active = useRef<HTMLButtonElement>(null);
  // Keep the current move visible inside the list only; the page itself must not move.
  useEffect(() => {
    if (list.current && active.current) revealWithin(list.current, active.current);
  }, [ply]);
  return (
    <ol ref={list} className="grid max-h-72 grid-cols-[2rem_1fr_1fr] gap-x-1 gap-y-0.5 overflow-auto rounded-md border border-line bg-surface p-2 text-sm">
      {Array.from({ length: Math.ceil(moves.length / 2) }, (_, n) => (
        <li key={n} className="contents">
          <span className="py-1.5 font-mono text-xs text-muted lg:py-1">{n + 1}.</span>
          {[moves[2 * n], moves[2 * n + 1]].map((m, j) =>
            m ? (
              <button
                key={j}
                ref={ply === m.ply ? active : undefined}
                onClick={() => onSelect(m.ply)}
                aria-label={`${m.san}, ${CLASS_META[m.cls].label}`}
                className={`flex items-center gap-2 rounded-[6px] px-1.5 py-1.5 text-left hover:bg-raised lg:py-1 ${ply === m.ply ? "bg-raised-2 text-ink" : "text-soft"}`}
              >
                <GradeBadge cls={m.cls} />
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
