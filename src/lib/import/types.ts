export type Source = "chesscom" | "lichess";

export interface ImportedGame {
  id: string;
  source: Source;
  url: string;
  white: string;
  black: string;
  whiteRating?: number;
  blackRating?: number;
  /** "1-0", "0-1" or "½-½". */
  result: string;
  /** Unix ms. */
  date: number;
  timeClass: string;
  pgn: string;
}

export type Fetcher = (url: string, init?: RequestInit) => Promise<Response>;

const USERNAME = /^[A-Za-z0-9_-]{2,30}$/;

export function cleanUsername(u: string): string {
  const t = u.trim();
  if (!USERNAME.test(t)) throw new Error("Enter a valid username (letters, numbers, - and _).");
  return t;
}
