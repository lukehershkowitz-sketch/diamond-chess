import type { ReviewedMove } from "@/lib/review/analyzeGame";
import { Eyebrow } from "@/components/ui/Card";
import { GradeBadge } from "./GradeBadge";

const KEY = new Set(["brilliant", "great", "mistake", "blunder"]);

export function KeyMoments({ moves, onSelect }: { moves: ReviewedMove[]; onSelect: (p: number) => void }) {
  const key = moves.filter((m) => KEY.has(m.cls));
  if (key.length === 0) return null;
  return (
    <div>
      <h2><Eyebrow className="mb-2">Key moments</Eyebrow></h2>
      <ul className="flex flex-wrap gap-2">
        {key.map((m) => (
          <li key={m.ply}>
            <button
              onClick={() => onSelect(m.ply)}
              className="flex h-9 items-center gap-2 rounded-full border border-line-strong bg-surface px-3 text-sm hover:bg-raised"
            >
              <GradeBadge cls={m.cls} />
              {Math.ceil(m.ply / 2)}
              {m.color === "w" ? "." : "…"} {m.san}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
