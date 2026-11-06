import type { Score, Side } from "./types";

const MATE_CP = 10000;

/** Centipawns from White's view; mate scores become very large values. */
export function scoreToCp(score: Score): number {
  if (score.mate !== undefined && score.mate !== 0) {
    return Math.sign(score.mate) * (MATE_CP - Math.min(Math.abs(score.mate), 100));
  }
  return score.cp ?? 0;
}

/** Win probability (0-100) for White, using the Lichess logistic fit. */
export function whiteWinPct(score: Score): number {
  const cp = scoreToCp(score);
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

/** Win probability (0-100) for the given side. */
export function winPct(score: Score, side: Side): number {
  const w = whiteWinPct(score);
  return side === "w" ? w : 100 - w;
}
