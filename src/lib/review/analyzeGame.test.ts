import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { analyzeGame, type Analyzer } from "./analyzeGame";

/** Fake engine: material-count eval, best move = greedy capture-or-first. Deterministic and fast. */
const VAL: Record<string, number> = { p: 100, n: 300, b: 300, r: 500, q: 900, k: 0 };
function material(fen: string) {
  const c = new Chess(fen);
  let s = 0;
  for (const row of c.board())
    for (const p of row) if (p) s += (p.color === "w" ? 1 : -1) * VAL[p.type];
  return s;
}
const fake: Analyzer = {
  async analyze(fen) {
    const c = new Chess(fen);
    const ms = c.moves({ verbose: true });
    const scored = ms
      .map((m) => {
        const t = new Chess(fen);
        t.move(m);
        return { m, cp: material(t.fen()) * (c.turn() === "w" ? 1 : -1) };
      })
      .sort((a, b) => b.cp - a.cp);
    return {
      fen,
      bestMove: scored[0].m.from + scored[0].m.to + (scored[0].m.promotion ?? ""),
      lines: scored.slice(0, 2).map((s, i) => ({
        multipv: i + 1,
        depth: 1,
        score: { cp: s.cp * (c.turn() === "w" ? 1 : -1) },
        pv: [],
      })),
    };
  },
};

describe("analyzeGame", () => {
  it("flags a hung queen as a blunder and reports progress", async () => {
    // White's 3.Qxe5+ wins a pawn but hangs the queen to ...Nxe5.
    const pgn = "1. e4 e5 2. Qh5 Nc6 3. Qxe5+ Nxe5";
    const seen: number[] = [];
    const r = await analyzeGame(pgn, fake, { onProgress: (d) => seen.push(d) });
    expect(r.moves).toHaveLength(6);
    expect(r.whiteWinPcts).toHaveLength(7);
    expect(seen.at(-1)).toBe(7);
    expect(r.moves[4].san).toBe("Qxe5+");
    expect(r.moves[4].cls).toBe("blunder"); // loses the queen to Nxe5
    expect(r.accuracy.w).toBeLessThan(r.accuracy.b);
  });
  it("rejects PGNs without moves", async () => {
    await expect(analyzeGame("", fake)).rejects.toThrow();
  });
});
