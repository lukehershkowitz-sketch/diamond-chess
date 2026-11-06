import { describe, expect, it } from "vitest";
import { parseInfo } from "./uci";

describe("parseInfo", () => {
  it("flips the score for Black to move", () => {
    const l = "info depth 12 seldepth 15 multipv 1 score cp 80 nodes 1 pv e7e5 g1f3";
    expect(parseInfo(l, "b")?.score).toEqual({ cp: -80 });
    expect(parseInfo(l, "w")?.score).toEqual({ cp: 80 });
  });
  it("parses mate scores and pv", () => {
    const r = parseInfo("info depth 5 multipv 2 score mate 3 pv a1a8 b8a8", "w");
    expect(r).toMatchObject({ multipv: 2, depth: 5, score: { mate: 3 }, pv: ["a1a8", "b8a8"] });
  });
  it("ignores unrelated lines", () => {
    expect(parseInfo("info string NNUE enabled", "w")).toBeNull();
  });
});
