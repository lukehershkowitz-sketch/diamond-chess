import type { MoveClass } from "./types";

export interface ClassifyInput {
  /** Mover's win% before the move (engine best line). */
  winBefore: number;
  /** Mover's win% after the move actually played. */
  winAfter: number;
  /** True if the played move equals the engine's top choice. */
  isBest: boolean;
  /** True if the position/move is in the opening book. */
  isBook?: boolean;
  /** True if the played move was the only one that kept the eval (gap to 2nd best is large). */
  isOnlyMove?: boolean;
  /** True if the move gives up material but the evaluation holds. */
  isSacrifice?: boolean;
}

export function classifyMove(i: ClassifyInput): MoveClass {
  if (i.isBook) return "book";
  const loss = Math.max(0, i.winBefore - i.winAfter);

  if (loss >= 20) return "blunder";
  if (loss >= 10) return "mistake";
  if (loss >= 5) return "inaccuracy";

  if (i.isBest || loss < 0.5) {
    if (i.isSacrifice && i.isOnlyMove && i.winAfter > 40) return "brilliant";
    if (i.isOnlyMove) return "great";
    return "best";
  }
  if (loss < 2) return "excellent";
  return "good";
}
