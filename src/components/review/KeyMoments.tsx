import type { ReviewedMove } from "@/lib/review/analyzeGame";
import { CLASS_META } from "@/lib/review/labels";

const KEY = new Set(["brilliant", "great", "mistake", "blunder"]);

export function KeyMoments({ moves, onSelect }: { moves: ReviewedMove[]; onSelect: (p: number) => void }) {
  const key = moves.filter((m) => KEY.has(m.cls));
  if (key.length === 0) return null;
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">Key moments</h2>
      <ul className="flex flex-wrap gap-2">
        {key.map((m) => (
          <li key={m.ply}>
            <button
              onClick={() => onSelect(m.ply)}
              className="flex items-center gap-1.5 rounded-full border border-neutral-700 px-3 py-1 text-sm hover:bg-neutral-800"
            >
              <span className={`inline-block min-w-5 rounded px-1 text-center text-[10px] font-bold text-white ${CLASS_META[m.cls].color}`}>
                {CLASS_META[m.cls].symbol}
              </span>
              {Math.ceil(m.ply / 2)}
              {m.color === "w" ? "." : "…"} {m.san}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
