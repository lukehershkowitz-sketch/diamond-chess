import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PuzzleRun } from "./run";
import { fromRow, type PuzzleRow } from "./types";

const DIR = join(process.cwd(), "public/puzzles");

describe("bundled puzzle data", () => {
  it("every puzzle replays to a solve and sits in the right rating band", () => {
    const index = JSON.parse(readFileSync(join(DIR, "index.json"), "utf8")) as { count: number; bands: number[] };
    let n = 0;
    const bad: string[] = [];
    const ids = new Set<string>();
    for (const f of readdirSync(DIR).filter((f) => /^r\d{4}\.json$/.test(f))) {
      const band = Number(f.slice(1, 5));
      for (const row of JSON.parse(readFileSync(join(DIR, f), "utf8")) as PuzzleRow[]) {
        n++;
        const p = fromRow(row);
        try {
          if (ids.has(p.id)) throw new Error("duplicate id");
          ids.add(p.id);
          if (Math.floor(p.rating / 100) * 100 !== band) throw new Error(`rating ${p.rating} in band ${band}`);
          if (p.moves.length % 2 !== 0) throw new Error("line doesn't end on the solver's move");
          const run = new PuzzleRun(p);
          run.playSetup();
          let last = "";
          while (!run.done) {
            last = run.tryMove(run.expectedMove()!).result;
            if (last === "wrong" || last === "illegal") throw new Error(`solution move ${last}`);
          }
          if (last !== "solved") throw new Error(`ended as ${last}`);
        } catch (e) {
          bad.push(`${p.id}: ${(e as Error).message}`);
        }
      }
    }
    expect(bad.slice(0, 10)).toEqual([]);
    expect(n).toBe(index.count);
    expect(n).toBeGreaterThan(3000);
  }, 60_000); // replays every bundled puzzle
});
