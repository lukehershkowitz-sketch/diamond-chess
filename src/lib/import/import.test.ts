import { describe, expect, it } from "vitest";
import { fetchChessComGames } from "./chesscom";
import { fetchLichessGames } from "./lichess";
import type { Fetcher } from "./types";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

const ccGame = (n: number, rules = "chess") => ({
  url: `https://www.chess.com/game/live/${n}`,
  pgn: `[Event "Live"]\n\n1. e4 e5 *`,
  end_time: 1700000000 + n,
  time_class: "blitz",
  rules,
  white: { username: "Alice", rating: 1500, result: n % 2 ? "win" : "resigned" },
  black: { username: "Bob", rating: 1450, result: n % 2 ? "checkmated" : "win" },
});

describe("Chess.com import", () => {
  it("returns newest standard games first, across archives", async () => {
    const calls: string[] = [];
    const fetcher: Fetcher = async (url) => {
      calls.push(url);
      if (url.endsWith("/archives"))
        return json({ archives: ["https://api.chess.com/m/2024/01", "https://api.chess.com/m/2024/02"] });
      if (url.endsWith("2024/02")) return json({ games: [ccGame(3), ccGame(4, "chess960")] });
      return json({ games: [ccGame(1), ccGame(2)] });
    };
    const games = await fetchChessComGames(" Alice ", { fetcher, max: 2 });
    expect(calls[0]).toBe("https://api.chess.com/pub/player/alice/games/archives");
    expect(games.map((g) => g.url.split("/").pop())).toEqual(["3", "2"]);
    expect(games[0]).toMatchObject({ white: "Alice", result: "1-0", source: "chesscom", timeClass: "blitz" });
    expect(games[1].result).toBe("0-1");
  });
  it("explains unknown players", async () => {
    await expect(fetchChessComGames("nobody", { fetcher: async () => json({}, 404) })).rejects.toThrow(/No Chess.com player/);
  });
  it("rejects malformed usernames without fetching", async () => {
    let called = false;
    await expect(
      fetchChessComGames("../etc", { fetcher: async () => ((called = true), json({})) }),
    ).rejects.toThrow(/valid username/);
    expect(called).toBe(false);
  });
});

describe("Lichess import", () => {
  it("parses ndjson and skips variants", async () => {
    const lines = [
      { id: "abc", variant: "standard", speed: "rapid", createdAt: 1, winner: "black", players: { white: { user: { name: "A" }, rating: 1800 }, black: { aiLevel: 3 } }, pgn: "1. d4 d5 *" },
      { id: "x960", variant: "chess960", speed: "blitz", createdAt: 2, players: { white: {}, black: {} }, pgn: "1. e4 *" },
      { id: "draw", variant: "standard", speed: "blitz", createdAt: 3, players: { white: { user: { name: "A" } }, black: { user: { name: "B" } } }, pgn: "1. e4 *" },
    ];
    let accept = "";
    const fetcher: Fetcher = async (_u, init) => {
      accept = new Headers(init?.headers).get("Accept") ?? "";
      return new Response(lines.map((l) => JSON.stringify(l)).join("\n") + "\n");
    };
    const games = await fetchLichessGames("Al", { fetcher });
    expect(accept).toBe("application/x-ndjson");
    expect(games.map((g) => g.id)).toEqual(["abc", "draw"]);
    expect(games[0]).toMatchObject({ black: "Stockfish level 3", result: "0-1", url: "https://lichess.org/abc" });
    expect(games[1].result).toBe("½-½");
  });
  it("reports rate limiting", async () => {
    await expect(fetchLichessGames("Al", { fetcher: async () => new Response("", { status: 429 }) })).rejects.toThrow(/rate-limiting/);
  });
});
