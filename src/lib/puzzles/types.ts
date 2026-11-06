export interface Puzzle {
  id: string;
  /** Position before the opponent's setup move. */
  fen: string;
  /** UCI moves: [opponent setup move, your move, reply, your move, ...]. */
  moves: string[];
  rating: number;
  themes: string[];
}

/** Row format in public/puzzles/r*.json (see scripts/build-puzzles.py). */
export type PuzzleRow = [id: string, fen: string, moves: string, rating: number, themes: string];

export function fromRow([id, fen, moves, rating, themes]: PuzzleRow): Puzzle {
  return { id, fen, moves: moves.split(" "), rating, themes: themes.split(" ").filter(Boolean) };
}
