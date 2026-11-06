/** Engine score from White's point of view. Exactly one of cp / mate is set. */
export interface Score {
  cp?: number;
  /** Moves to mate; positive = White mates, negative = Black mates. */
  mate?: number;
}

export type MoveClass =
  | "brilliant"
  | "great"
  | "best"
  | "excellent"
  | "good"
  | "book"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export type Side = "w" | "b";
