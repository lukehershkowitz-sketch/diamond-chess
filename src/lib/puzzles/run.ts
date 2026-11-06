import { Chess, type Move } from "chess.js";
import type { Puzzle } from "./types";

export type TryResult =
  | { result: "illegal" }
  | { result: "wrong" }
  | { result: "correct"; move: Move; reply: Move }
  | { result: "solved"; move: Move };

const toUci = (m: Move) => m.from + m.to + (m.promotion ?? "");

/**
 * One attempt at a puzzle. The first solution move is the opponent's setup move;
 * after that the solver and the "opponent" alternate. Any checkmating move is accepted,
 * as on Lichess, even if it differs from the stored line.
 */
export class PuzzleRun {
  readonly chess: Chess;
  private idx = 0;

  constructor(readonly puzzle: Puzzle) {
    this.chess = new Chess(puzzle.fen);
  }

  /** Plays the opponent's setup move. Call once before the solver moves. */
  playSetup(): Move {
    if (this.idx !== 0) throw new Error("Setup move already played");
    return this.apply(this.puzzle.moves[0]); // advances idx to 1
  }

  get fen() {
    return this.chess.fen();
  }

  /** Side the solver plays. Valid after playSetup(). */
  get solverColor(): "w" | "b" {
    return this.chess.turn();
  }

  get done() {
    return this.idx >= this.puzzle.moves.length;
  }

  /** The stored solution move the solver should play next, in UCI. */
  expectedMove(): string | null {
    return this.done || this.idx === 0 ? null : this.puzzle.moves[this.idx];
  }

  /** Square of the piece the solver should move next (for hints). */
  hintSquare(): string | null {
    return this.expectedMove()?.slice(0, 2) ?? null;
  }

  /** Promotion piece the solution uses for this from/to, else queen. */
  promotionFor(from: string, to: string): string {
    const expected = this.puzzle.moves[this.idx];
    return expected?.startsWith(from + to) && expected.length === 5 ? expected[4] : "q";
  }

  tryMove(uci: string): TryResult {
    if (this.done || this.idx === 0) return { result: "illegal" };
    const trial = new Chess(this.chess.fen());
    let move: Move;
    try {
      move = trial.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    } catch {
      return { result: "illegal" };
    }
    const expected = this.puzzle.moves[this.idx];
    if (toUci(move) !== expected && !trial.isCheckmate()) return { result: "wrong" };

    this.chess.move(move);
    this.idx++;
    if (this.done || this.chess.isCheckmate()) {
      this.idx = this.puzzle.moves.length;
      return { result: "solved", move };
    }
    const reply = this.apply(this.puzzle.moves[this.idx]);
    return { result: "correct", move, reply };
  }

  /** Plays the rest of the solution, returning each move (for "show solution"). */
  playOut(): Move[] {
    const out: Move[] = [];
    while (!this.done) out.push(this.apply(this.puzzle.moves[this.idx]));
    return out;
  }

  private apply(uci: string): Move {
    const m = this.chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    this.idx++;
    return m;
  }
}
