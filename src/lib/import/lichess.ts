import { cleanUsername, type Fetcher, type ImportedGame } from "./types";

interface LiPlayer {
  user?: { name: string };
  aiLevel?: number;
  rating?: number;
}
interface LiGame {
  id: string;
  variant: string;
  speed: string;
  createdAt: number;
  winner?: "white" | "black";
  players: { white: LiPlayer; black: LiPlayer };
  pgn?: string;
}

const name = (p: LiPlayer) => p.user?.name ?? (p.aiLevel ? `Stockfish level ${p.aiLevel}` : "Anonymous");

/** Most recent standard games for a Lichess user, newest first. */
export async function fetchLichessGames(
  username: string,
  { max = 20, fetcher = fetch }: { max?: number; fetcher?: Fetcher } = {},
): Promise<ImportedGame[]> {
  const u = cleanUsername(username);
  const res = await fetcher(
    `https://lichess.org/api/games/user/${encodeURIComponent(u)}?max=${max}&pgnInJson=true&perfType=ultraBullet,bullet,blitz,rapid,classical,correspondence`,
    { headers: { Accept: "application/x-ndjson" } },
  );
  if (res.status === 404) throw new Error(`No Lichess player named "${username}".`);
  if (res.status === 429) throw new Error("Lichess is rate-limiting requests. Wait a minute and try again.");
  if (!res.ok) throw new Error(`Lichess returned ${res.status}. Try again shortly.`);

  const text = await res.text();
  return text
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as LiGame)
    .filter((g) => g.variant === "standard" && g.pgn)
    .map((g) => ({
      id: g.id,
      source: "lichess" as const,
      url: `https://lichess.org/${g.id}`,
      white: name(g.players.white),
      black: name(g.players.black),
      whiteRating: g.players.white.rating,
      blackRating: g.players.black.rating,
      result: g.winner === "white" ? "1-0" : g.winner === "black" ? "0-1" : "½-½",
      date: g.createdAt,
      timeClass: g.speed,
      pgn: g.pgn!,
    }));
}
