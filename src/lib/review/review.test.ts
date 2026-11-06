import { describe, expect, it } from "vitest";
import { whiteWinPct, winPct, scoreToCp } from "./winpct";
import { classifyMove } from "./classify";
import { gameAccuracy, moveAccuracy } from "./accuracy";

describe("win probability", () => {
  it("is 50% at equality", () => {
    expect(whiteWinPct({ cp: 0 })).toBeCloseTo(50, 5);
  });
  it("is symmetric between sides", () => {
    expect(winPct({ cp: 150 }, "w") + winPct({ cp: 150 }, "b")).toBeCloseTo(100, 5);
  });
  it("matches the Lichess curve (+100cp ~ 59%)", () => {
    expect(whiteWinPct({ cp: 100 })).toBeGreaterThan(58);
    expect(whiteWinPct({ cp: 100 })).toBeLessThan(60);
  });
  it("saturates for mate", () => {
    expect(whiteWinPct({ mate: 3 })).toBeGreaterThan(99.9);
    expect(whiteWinPct({ mate: -3 })).toBeLessThan(0.1);
    expect(scoreToCp({ mate: -1 })).toBeLessThan(0);
  });
});

describe("classification", () => {
  const base = { winBefore: 60, isBest: false };
  it("flags blunders", () => {
    expect(classifyMove({ ...base, winAfter: 30 })).toBe("blunder");
  });
  it("flags mistakes and inaccuracies", () => {
    expect(classifyMove({ ...base, winAfter: 48 })).toBe("mistake");
    expect(classifyMove({ ...base, winAfter: 53 })).toBe("inaccuracy");
  });
  it("rates the engine move best", () => {
    expect(classifyMove({ ...base, winAfter: 60, isBest: true })).toBe("best");
  });
  it("rates only-moves great and sacrifices brilliant", () => {
    expect(classifyMove({ ...base, winAfter: 60, isBest: true, isOnlyMove: true })).toBe("great");
    expect(
      classifyMove({ ...base, winAfter: 60, isBest: true, isOnlyMove: true, isSacrifice: true }),
    ).toBe("brilliant");
  });
  it("prefers book over everything", () => {
    expect(classifyMove({ ...base, winAfter: 10, isBook: true })).toBe("book");
  });
});

describe("accuracy", () => {
  it("is ~100 for no loss", () => {
    expect(moveAccuracy(60, 60)).toBe(100);
  });
  it("drops sharply for a blunder", () => {
    expect(moveAccuracy(60, 20)).toBeLessThan(25);
  });
  it("averages per-move values", () => {
    expect(gameAccuracy([100, 50])).toBe(75);
    expect(gameAccuracy([])).toBe(100);
  });
});

import { describeMove, formatScore } from "./labels";

describe("labels", () => {
  it("formats scores", () => {
    expect(formatScore({ cp: 125 })).toBe("+1.25");
    expect(formatScore({ cp: -40 })).toBe("-0.40");
    expect(formatScore({ mate: -2 })).toBe("-M2");
    expect(formatScore(null)).toBe("–");
  });
  it("names the better move for mistakes", () => {
    const text = describeMove({
      ply: 5, san: "Qxe5+", uci: "h5e5", color: "w", fenBefore: "", fenAfter: "", cls: "blunder",
      accuracy: 10, winBefore: 55, winAfter: 8, bestUci: "f1c4", bestSan: "Bc4", scoreAfter: null, opening: null,
    });
    expect(text).toBe("Qxe5+ is a blunder. The best move was Bc4. Winning chances went from 55% to 8%.");
  });
});
