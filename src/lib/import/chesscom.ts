import { cleanUsername, type Fetcher, type ImportedGame } from "./types";

interface CcPlayer {
  username: string;
  rating?: number;
  result: string;
}
interface CcGame {
  url: string;
  pgn?: string;
  end_time: number;
  time_class: string;
  rules: string;
  white: CcPlayer;
  black: CcPlayer;
}

function result(g: CcGame) {
  if (g.white.result === "win") return "1-0";
  if (g.black.result === "win") return "0-1";
  return "½-½";
}

/** Most recent standard-chess games for a Chess.com user, newest first. */
export async function fetchChessComGames(
  username: string,
  { max = 20, fetcher = fetch }: { max?: number; fetcher?: Fetcher } = {},
): Promise<ImportedGame[]> {
  const u = cleanUsername(username).toLowerCase();
  const res = await fetcher(`https://api.chess.com/pub/player/${encodeURIComponent(u)}/games/archives`);
  if (res.status === 404) throw new Error(`No Chess.com player named "${username}".`);
  if (!res.ok) throw new Error(`Chess.com returned ${res.status}. Try again shortly.`);
  const { archives } = (await res.json()) as { archives: string[] };

  const games: ImportedGame[] = [];
  // Archives are monthly and oldest-first; walk back from the newest month.
  for (const url of [...archives].reverse().slice(0, 3)) {
    const r = await fetcher(url);
    if (!r.ok) break;
    const { games: month } = (await r.json()) as { games: CcGame[] };
    for (const g of [...month].reverse()) {
      if (g.rules !== "chess" || !g.pgn) continue;
      games.push({
        id: g.url,
        source: "chesscom",
        url: g.url,
        white: g.white.username,
        black: g.black.username,
        whiteRating: g.white.rating,
        blackRating: g.black.rating,
        result: result(g),
        date: g.end_time * 1000,
        timeClass: g.time_class,
        pgn: g.pgn,
      });
      if (games.length >= max) return games;
    }
  }
  return games;
}
