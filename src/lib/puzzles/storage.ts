import { NEW_PLAYER, type Rating } from "./glicko2";

export interface Attempt {
  id: string;
  puzzleRating: number;
  solved: boolean;
  delta: number;
  at: number;
}

export interface PuzzleProfile {
  rating: Rating;
  history: Attempt[]; // newest first, capped
  seen: string[]; // recent puzzle ids, newest first, capped
}

const KEY = "dc.puzzles.v1";
const MAX_HISTORY = 100;
const MAX_SEEN = 1000;

export function emptyProfile(): PuzzleProfile {
  return { rating: { ...NEW_PLAYER }, history: [], seen: [] };
}

/** Reads the saved profile; falls back to a fresh one if storage is unavailable or corrupt. */
export function loadProfile(): PuzzleProfile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyProfile();
    const p = JSON.parse(raw) as PuzzleProfile;
    if (typeof p?.rating?.rating !== "number") return emptyProfile();
    return { rating: p.rating, history: p.history ?? [], seen: p.seen ?? [] };
  } catch {
    return emptyProfile();
  }
}

export function saveProfile(p: PuzzleProfile) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* storage blocked: progress lasts for this visit only */
  }
}

export function recordAttempt(p: PuzzleProfile, a: Attempt, newRating: Rating): PuzzleProfile {
  return {
    rating: newRating,
    history: [a, ...p.history].slice(0, MAX_HISTORY),
    seen: [a.id, ...p.seen.filter((id) => id !== a.id)].slice(0, MAX_SEEN),
  };
}
