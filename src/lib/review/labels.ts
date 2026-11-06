import type { Score } from "./types";
import type { MoveClass } from "./types";
import type { ReviewedMove } from "./analyzeGame";

export const CLASS_META: Record<MoveClass, { label: string; symbol: string; color: string; text: string }> = {
  brilliant: { label: "Brilliant", symbol: "!!", color: "bg-cyan-500", text: "text-cyan-400" },
  great: { label: "Great", symbol: "!", color: "bg-blue-500", text: "text-blue-400" },
  best: { label: "Best", symbol: "★", color: "bg-green-600", text: "text-green-400" },
  excellent: { label: "Excellent", symbol: "✓", color: "bg-green-500", text: "text-green-400" },
  good: { label: "Good", symbol: "·", color: "bg-lime-600", text: "text-lime-400" },
  book: { label: "Book", symbol: "B", color: "bg-amber-700", text: "text-amber-500" },
  inaccuracy: { label: "Inaccuracy", symbol: "?!", color: "bg-yellow-500", text: "text-yellow-400" },
  mistake: { label: "Mistake", symbol: "?", color: "bg-orange-500", text: "text-orange-400" },
  blunder: { label: "Blunder", symbol: "??", color: "bg-red-600", text: "text-red-400" },
};

export const CLASS_ORDER: MoveClass[] = [
  "brilliant", "great", "best", "excellent", "good", "book", "inaccuracy", "mistake", "blunder",
];

/** "+1.25", "-0.40", "M3", "-M2". */
export function formatScore(score: Score | null | undefined): string {
  if (!score) return "–";
  if (score.mate !== undefined) return `${score.mate < 0 ? "-" : ""}M${Math.abs(score.mate)}`;
  const v = (score.cp ?? 0) / 100;
  return `${v > 0 ? "+" : ""}${v.toFixed(2)}`;
}

/** One-sentence explanation of a reviewed move (template coach until the AI coach lands). */
export function describeMove(m: ReviewedMove): string {
  const best = m.bestSan && m.bestUci !== m.uci ? ` The best move was ${m.bestSan}.` : "";
  const swing = ` Winning chances went from ${Math.round(m.winBefore)}% to ${Math.round(m.winAfter)}%.`;
  switch (m.cls) {
    case "brilliant": return `${m.san} is brilliant: a sacrifice that holds up.`;
    case "great": return `${m.san} is a great move, the only one that keeps the position.`;
    case "best": return `${m.san} is the best move.`;
    case "excellent": return `${m.san} is excellent, nearly as strong as the top choice.${best}`;
    case "good": return `${m.san} is a good move.${best}`;
    case "book": return `${m.san} is a book move${m.opening ? ` (${m.opening.name})` : ""}.`;
    case "inaccuracy": return `${m.san} is an inaccuracy.${best}${swing}`;
    case "mistake": return `${m.san} is a mistake.${best}${swing}`;
    case "blunder": return `${m.san} is a blunder.${best}${swing}`;
  }
}
