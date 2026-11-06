import { Chess, type Move, type PieceSymbol } from "chess.js";
import type { AnalysisResult } from "../engine/uci";
import { gameAccuracy, moveAccuracy } from "./accuracy";
import { classifyMove } from "./classify";
import type { MoveClass, Side } from "./types";
import { whiteWinPct, winPct } from "./winpct";

export interface Analyzer {
  analyze(fen: string, depth?: number): Promise<AnalysisResult>;
}

export interface ReviewedMove {
  ply: number; // 1-based
  san: string;
  uci: string;
  color: Side;
  fenBefore: string;
  fenAfter: string;
  cls: MoveClass;
  accuracy: number;
  winBefore: number;
  winAfter: number;
  bestUci: string | null;
  bestSan: string | null;
}

export interface GameReview {
  moves: ReviewedMove[];
  /** White's win% at every position (length = moves + 1), for the eval graph. */
  whiteWinPcts: number[];
  accuracy: { w: number; b: number };
  counts: Record<Side, Partial<Record<MoveClass, number>>>;
}

const VALUE: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** Heuristic: the moved piece lands where it can be captured for a net material loss. */
function looksLikeSacrifice(fenAfter: string, move: Move): boolean {
  const gained = move.captured ? VALUE[move.captured] : 0;
  const risked = VALUE[move.piece];
  if (risked - gained < 2) return false;
  const g = new Chess(fenAfter);
  return g.moves({ verbose: true }).some((m) => m.to === move.to && m.captured);
}

function uciOf(m: Move) {
  return m.from + m.to + (m.promotion ?? "");
}

export async function analyzeGame(
  pgn: string,
  engine: Analyzer,
  opts: { depth?: number; onProgress?: (done: number, total: number) => void } = {},
): Promise<GameReview> {
  const game = new Chess();
  game.loadPgn(pgn);
  const history = game.history({ verbose: true });
  if (history.length === 0) throw new Error("No moves found in PGN");

  const fens = [history[0].before, ...history.map((m) => m.after)];
  const results: AnalysisResult[] = [];
  for (let i = 0; i < fens.length; i++) {
    const over = new Chess(fens[i]).isGameOver();
    results.push(over ? { fen: fens[i], bestMove: null, lines: [] } : await engine.analyze(fens[i], opts.depth ?? 14));
    opts.onProgress?.(i + 1, fens.length);
  }

  const whiteWinPcts = results.map((r, i) => {
    if (r.lines.length) return whiteWinPct(r.lines[0].score);
    const c = new Chess(fens[i]);
    if (c.isCheckmate()) return c.turn() === "w" ? 0 : 100;
    return 50; // draw
  });

  const moves: ReviewedMove[] = history.map((m, i) => {
    const color = m.color as Side;
    const before = results[i];
    const winBefore = color === "w" ? whiteWinPcts[i] : 100 - whiteWinPcts[i];
    const winAfter = color === "w" ? whiteWinPcts[i + 1] : 100 - whiteWinPcts[i + 1];
    const uci = uciOf(m);
    const isBest = before.bestMove === uci;
    const second = before.lines[1];
    const isOnlyMove =
      isBest && !!second && winPct(before.lines[0].score, color) - winPct(second.score, color) >= 15;
    const cls = classifyMove({
      winBefore,
      winAfter,
      isBest,
      isOnlyMove,
      isSacrifice: looksLikeSacrifice(m.after, m),
    });

    let bestSan: string | null = null;
    if (before.bestMove) {
      const tmp = new Chess(fens[i]);
      try {
        bestSan = tmp.move({
          from: before.bestMove.slice(0, 2),
          to: before.bestMove.slice(2, 4),
          promotion: before.bestMove[4],
        }).san;
      } catch {
        bestSan = null;
      }
    }
    return {
      ply: i + 1,
      san: m.san,
      uci,
      color,
      fenBefore: fens[i],
      fenAfter: fens[i + 1],
      cls,
      accuracy: moveAccuracy(winBefore, winAfter),
      winBefore,
      winAfter,
      bestUci: before.bestMove,
      bestSan,
    };
  });

  const side = (c: Side) => moves.filter((m) => m.color === c);
  const counts: GameReview["counts"] = { w: {}, b: {} };
  for (const m of moves) counts[m.color][m.cls] = (counts[m.color][m.cls] ?? 0) + 1;

  return {
    moves,
    whiteWinPcts,
    accuracy: {
      w: gameAccuracy(side("w").map((m) => m.accuracy)),
      b: gameAccuracy(side("b").map((m) => m.accuracy)),
    },
    counts,
  };
}
