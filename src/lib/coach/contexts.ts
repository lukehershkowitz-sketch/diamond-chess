import type { GameReview } from "../review/analyzeGame";
import { pvToSan } from "../review/analyzeGame";
import { formatScore } from "../review/labels";
import type { Puzzle } from "../puzzles/types";
import type { CoachContext, CoachRequest, EngineLine } from "./request";

const SCORE = /^[+-]?(M\d{1,3}|\d{1,3}(\.\d{1,2})?)$/;

/** An engine line for the coach, or nothing if the score isn't a plain engine score (e.g. game over). */
export function engineLine(moves: string[], score: string): EngineLine[] {
  return moves.length && SCORE.test(score) ? [{ moves: moves.slice(0, 12), score }] : [];
}

/** Ask the coach why move `ply` (1-based) got its grade. */
export function explainMoveRequest(review: GameReview, ply: number): CoachRequest {
  const m = review.moves[ply - 1];
  return {
    kind: "explain-move",
    context: {
      fen: m.fenBefore,
      history: review.moves.slice(0, ply - 1).map((x) => x.san),
      ...(review.opening ? { opening: review.opening.name } : {}),
      move: {
        san: m.san,
        grade: m.cls,
        ...(m.bestSan ? { bestSan: m.bestSan } : {}),
        winBefore: m.winBefore,
        winAfter: m.winAfter,
        bestLine: m.bestLine,
        replyLine: m.replyLine,
      },
    },
  };
}

/** Context for chatting about the position after `ply` moves (0 = starting position). */
export function positionContext(review: GameReview, ply: number): CoachContext {
  const cur = ply > 0 ? review.moves[ply - 1] : null;
  const next = review.moves[ply];
  const score = cur ? cur.scoreAfter : review.initialScore;
  return {
    fen: cur ? cur.fenAfter : review.moves[0].fenBefore,
    history: review.moves.slice(0, ply).map((x) => x.san),
    ...(review.opening ? { opening: review.opening.name } : {}),
    // The engine's best line from here was computed as the "best line" of the next move.
    engineLines: next ? engineLine(next.bestLine, formatScore(score)) : [],
  };
}

/** Ask the coach to explain a puzzle; `startFen` is the position after the opponent's setup move. */
export function explainPuzzleRequest(p: Puzzle, startFen: string): CoachRequest {
  return {
    kind: "explain-puzzle",
    context: {
      fen: startFen,
      puzzle: { solution: pvToSan(startFen, p.moves.slice(1), 12), themes: p.themes.slice(0, 12), rating: p.rating },
    },
  };
}
