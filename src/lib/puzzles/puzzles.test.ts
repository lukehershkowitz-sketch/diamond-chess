import { describe, expect, it } from "vitest";
import { NEW_PLAYER, updateRating } from "./glicko2";
import { PuzzleRun } from "./run";
import { fromRow, type Puzzle } from "./types";

// Back-rank mate. Black's setup move ...Rd2 leaves the 8th rank; White mates with Re8#.
// The queen on a4 gives a second mate (Qe8#) to test that any checkmate is accepted.
const backRank: Puzzle = {
  id: "test1",
  fen: "3r2k1/5ppp/8/8/Q7/8/5PPP/4R1K1 b - - 0 1",
  moves: ["d8d2", "e1e8"],
  rating: 900,
  themes: ["mateIn1", "backRankMate"],
};

// Multi-move line. White's setup 1.Qb5; Black ...Re1+ forces 2.Qf1 (only block), then ...Rxf1+ wins the queen.
const queenWin: Puzzle = {
  id: "test2",
  fen: "4r1k1/5ppp/8/8/8/3Q4/5PPP/6K1 w - - 0 1",
  moves: ["d3b5", "e8e1", "b5f1", "e1f1"],
  rating: 1200,
  themes: ["short", "backRank"],
};

describe("PuzzleRun", () => {
  it("plays the setup move and asks the other side to solve", () => {
    const run = new PuzzleRun(backRank);
    expect(run.playSetup().san).toBe("Rd2");
    expect(run.solverColor).toBe("w");
    expect(run.hintSquare()).toBe("e1");
  });

  it("rejects illegal moves without penalty and wrong moves without changing the position", () => {
    const run = new PuzzleRun(backRank);
    run.playSetup();
    const before = run.fen;
    expect(run.tryMove("e1e9").result).toBe("illegal");
    expect(run.tryMove("e1d1").result).toBe("wrong");
    expect(run.fen).toBe(before);
  });

  it("solves with the stored move", () => {
    const run = new PuzzleRun(backRank);
    run.playSetup();
    expect(run.tryMove("e1e8").result).toBe("solved");
    expect(run.chess.isCheckmate()).toBe(true);
    expect(run.done).toBe(true);
  });

  it("accepts a different checkmate than the stored one", () => {
    const run = new PuzzleRun(backRank);
    run.playSetup();
    expect(run.tryMove("a4e8").result).toBe("solved");
    expect(run.chess.isCheckmate()).toBe(true);
  });

  it("plays the opponent's reply after each correct move", () => {
    const run = new PuzzleRun(queenWin);
    expect(run.playSetup().san).toBe("Qb5");
    expect(run.solverColor).toBe("b");
    const r = run.tryMove("e8e1");
    expect(r.result).toBe("correct");
    if (r.result === "correct") expect(r.reply.san).toBe("Qf1");
    expect(run.tryMove("e1f1").result).toBe("solved");
  });

  it("shows the rest of the solution", () => {
    const run = new PuzzleRun(queenWin);
    run.playSetup();
    expect(run.playOut().map((m) => m.san)).toEqual(["Re1+", "Qf1", "Rxf1+"]);
    expect(run.done).toBe(true);
  });

  it("uses the solution's promotion piece", () => {
    const run = new PuzzleRun({ ...queenWin, moves: ["d3b5", "a7a8n"] });
    run.playSetup();
    expect(run.promotionFor("a7", "a8")).toBe("n");
    expect(run.promotionFor("b7", "b8")).toBe("q");
  });

  it("parses bundled rows", () => {
    expect(fromRow(["abc", "8/8/8/8/8/8/8/8 w - - 0 1", "e2e4 e7e5", 1500, "fork short"])).toMatchObject({
      moves: ["e2e4", "e7e5"],
      themes: ["fork", "short"],
    });
  });
});

describe("Glicko-2", () => {
  it("raises rating on a win and lowers it on a loss", () => {
    expect(updateRating(NEW_PLAYER, 1500, 1).rating).toBeGreaterThan(1500);
    expect(updateRating(NEW_PLAYER, 1500, 0).rating).toBeLessThan(1500);
  });
  it("is symmetric for an even matchup", () => {
    const win = updateRating(NEW_PLAYER, 1500, 1).rating - 1500;
    const loss = 1500 - updateRating(NEW_PLAYER, 1500, 0).rating;
    expect(win).toBeCloseTo(loss, 5);
  });
  it("rewards beating stronger puzzles more", () => {
    const easy = updateRating(NEW_PLAYER, 1000, 1).rating;
    const hard = updateRating(NEW_PLAYER, 2000, 1).rating;
    expect(hard).toBeGreaterThan(easy);
  });
  it("moves new players fast and settled players slowly", () => {
    const settled = { rating: 1500, rd: 60, vol: 0.06 };
    const newGain = updateRating(NEW_PLAYER, 1500, 1).rating - 1500;
    const settledGain = updateRating(settled, 1500, 1).rating - 1500;
    expect(newGain).toBeGreaterThan(100);
    expect(settledGain).toBeLessThan(15);
    expect(settledGain).toBeGreaterThan(3);
  });
  it("shrinks uncertainty after each result but keeps a floor", () => {
    let r = NEW_PLAYER;
    for (let i = 0; i < 200; i++) r = updateRating(r, 1500, (i % 2) as 0 | 1);
    expect(r.rd).toBeGreaterThanOrEqual(60);
    expect(r.rd).toBeLessThan(100);
    expect(Math.abs(r.rating - 1500)).toBeLessThan(60);
  });
});

import { emptyProfile, recordAttempt } from "./storage";
import { themeLabel } from "./themes";

describe("profile + themes", () => {
  it("records attempts newest first and de-duplicates seen ids", () => {
    let p = emptyProfile();
    const r = { rating: 1510, rd: 300, vol: 0.06 };
    p = recordAttempt(p, { id: "a", puzzleRating: 1500, solved: true, delta: 10, at: 1 }, r);
    p = recordAttempt(p, { id: "b", puzzleRating: 1500, solved: false, delta: -8, at: 2 }, r);
    p = recordAttempt(p, { id: "a", puzzleRating: 1500, solved: true, delta: 5, at: 3 }, r);
    expect(p.history.map((h) => h.at)).toEqual([3, 2, 1]);
    expect(p.seen).toEqual(["a", "b"]);
    expect(p.rating.rating).toBe(1510);
  });
  it("labels known and unknown themes", () => {
    expect(themeLabel("mateIn2")).toBe("Mate in 2");
    expect(themeLabel("exposedKing")).toBe("Exposed King");
  });
});
