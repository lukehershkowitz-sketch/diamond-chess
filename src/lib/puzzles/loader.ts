import { fromRow, type Puzzle, type PuzzleRow } from "./types";

export interface PuzzleIndex {
  bands: number[];
  themes: Record<string, number>;
  count: number;
}

let index: Promise<PuzzleIndex> | null = null;
const bands = new Map<number, Promise<Puzzle[]>>();

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Couldn't load puzzles (${res.status}).`);
  return res.json() as Promise<T>;
}

export function loadIndex(): Promise<PuzzleIndex> {
  index ??= getJson<PuzzleIndex>("/puzzles/index.json").catch((e) => {
    index = null; // allow a retry after a network error
    throw e;
  });
  return index;
}

function loadBand(band: number): Promise<Puzzle[]> {
  let p = bands.get(band);
  if (!p) {
    p = getJson<PuzzleRow[]>(`/puzzles/r${String(band).padStart(4, "0")}.json`)
      .then((rows) => rows.map(fromRow))
      .catch((e) => {
        bands.delete(band);
        throw e;
      });
    bands.set(band, p);
  }
  return p;
}

/**
 * Picks a puzzle near the target rating, widening the search band by band until
 * one matches the theme and hasn't been seen recently.
 */
export async function pickPuzzle(opts: {
  rating: number;
  theme?: string | null;
  seen?: Iterable<string>;
  random?: () => number;
}): Promise<Puzzle> {
  const { bands: available } = await loadIndex();
  const seen = new Set(opts.seen ?? []);
  const rand = opts.random ?? Math.random;
  const order = [...available].sort((a, b) => Math.abs(a + 50 - opts.rating) - Math.abs(b + 50 - opts.rating));
  const matches = (p: Puzzle) => !opts.theme || p.themes.includes(opts.theme);

  // Prefer unseen puzzles; if a theme is exhausted, allow repeats rather than failing.
  for (const allowSeen of [false, true]) {
    for (const band of order) {
      const pool = (await loadBand(band)).filter((p) => matches(p) && (allowSeen || !seen.has(p.id)));
      if (pool.length) return pool[Math.floor(rand() * pool.length)];
    }
  }
  throw new Error("No puzzles match that theme.");
}
