import { Chess } from "chess.js";

/** What the browser sends to /api/coach. Everything is untrusted and validated by parseCoachRequest. */
export type CoachKind = "explain-move" | "explain-puzzle" | "chat";

export interface EngineLine {
  /** Moves in SAN from the position. */
  moves: string[];
  /** Score in the engine's display form, e.g. "+1.25" or "-M3", from White's point of view. */
  score: string;
}

export interface CoachContext {
  /** The position under discussion (FEN). */
  fen: string;
  /** Game moves so far in SAN, oldest first (optional). */
  history?: string[];
  /** Opening name, if known. */
  opening?: string;
  /** Stockfish's top lines from this position. */
  engineLines?: EngineLine[];
  /** For explain-move: the move that was played from `fen` and how it was graded. */
  move?: {
    san: string;
    grade: string;
    bestSan?: string;
    winBefore: number;
    winAfter: number;
    bestLine: string[];
    replyLine: string[];
  };
  /** For explain-puzzle: the solution from `fen` and the puzzle's themes. */
  puzzle?: { solution: string[]; themes: string[]; rating: number };
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface CoachRequest {
  kind: CoachKind;
  context: CoachContext;
  /** Chat history; the last turn must be the user's question. Required for "chat". */
  messages?: ChatTurn[];
}

export const LIMITS = {
  messages: 12,
  messageChars: 800,
  history: 300,
  lines: 3,
  lineMoves: 12,
  themes: 12,
  sanChars: 10,
  textChars: 120,
};

const GRADES = new Set([
  "brilliant", "great", "best", "excellent", "good", "book", "inaccuracy", "mistake", "blunder",
]);
const SAN = /^[KQRBNa-h1-8xO=+#\-]{2,10}$/;
const SCORE = /^[+-]?(M\d{1,3}|\d{1,3}(\.\d{1,2})?)$/;

type Result<T> = { ok: true; value: T } | { ok: false; error: string };
const fail = (error: string): Result<never> => ({ ok: false, error });

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number) => (typeof v === "string" && v.length > 0 && v.length <= max ? v : null);
const num = (v: unknown, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi ? v : null);

function sanList(v: unknown, max: number): string[] | null {
  if (!Array.isArray(v) || v.length > max) return null;
  return v.every((m) => typeof m === "string" && SAN.test(m)) ? (v as string[]) : null;
}

export function parseCoachRequest(body: unknown): Result<CoachRequest> {
  if (!isObj(body)) return fail("Request must be a JSON object.");
  const kind = body.kind;
  if (kind !== "explain-move" && kind !== "explain-puzzle" && kind !== "chat") return fail("Unknown request kind.");
  if (!isObj(body.context)) return fail("Missing context.");
  const c = body.context;

  const fen = str(c.fen, 100);
  if (!fen) return fail("Missing position.");
  try {
    new Chess(fen);
  } catch {
    return fail("That position isn't a legal FEN.");
  }
  const context: CoachContext = { fen };

  if (c.history !== undefined) {
    const h = sanList(c.history, LIMITS.history);
    if (!h) return fail("Invalid move history.");
    context.history = h;
  }
  if (c.opening !== undefined) {
    const o = str(c.opening, LIMITS.textChars);
    if (!o) return fail("Invalid opening name.");
    context.opening = o;
  }
  if (c.engineLines !== undefined) {
    if (!Array.isArray(c.engineLines) || c.engineLines.length > LIMITS.lines) return fail("Invalid engine lines.");
    const lines: EngineLine[] = [];
    for (const l of c.engineLines) {
      if (!isObj(l)) return fail("Invalid engine line.");
      const moves = sanList(l.moves, LIMITS.lineMoves);
      const score = typeof l.score === "string" && SCORE.test(l.score) ? l.score : null;
      if (!moves || !score) return fail("Invalid engine line.");
      lines.push({ moves, score });
    }
    context.engineLines = lines;
  }

  if (kind === "explain-move") {
    const m = c.move;
    if (!isObj(m)) return fail("Missing the move to explain.");
    const san = typeof m.san === "string" && SAN.test(m.san) ? m.san : null;
    const grade = typeof m.grade === "string" && GRADES.has(m.grade) ? m.grade : null;
    const winBefore = num(m.winBefore, 0, 100);
    const winAfter = num(m.winAfter, 0, 100);
    const bestLine = sanList(m.bestLine ?? [], LIMITS.lineMoves);
    const replyLine = sanList(m.replyLine ?? [], LIMITS.lineMoves);
    const bestSan = m.bestSan === undefined || m.bestSan === null ? undefined : typeof m.bestSan === "string" && SAN.test(m.bestSan) ? m.bestSan : null;
    if (!san || !grade || winBefore === null || winAfter === null || !bestLine || !replyLine || bestSan === null)
      return fail("Invalid move details.");
    context.move = { san, grade, winBefore, winAfter, bestLine, replyLine, ...(bestSan ? { bestSan } : {}) };
  }

  if (kind === "explain-puzzle") {
    const p = c.puzzle;
    if (!isObj(p)) return fail("Missing the puzzle.");
    const solution = sanList(p.solution, LIMITS.lineMoves);
    const rating = num(p.rating, 0, 4000);
    const themes =
      Array.isArray(p.themes) && p.themes.length <= LIMITS.themes && p.themes.every((t) => typeof t === "string" && /^[A-Za-z0-9]{1,30}$/.test(t))
        ? (p.themes as string[])
        : null;
    if (!solution || solution.length === 0 || rating === null || !themes) return fail("Invalid puzzle details.");
    context.puzzle = { solution, themes, rating };
  }

  let messages: ChatTurn[] | undefined;
  if (kind === "chat") {
    if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > LIMITS.messages)
      return fail("Chat needs between 1 and 12 messages.");
    messages = [];
    for (const t of body.messages) {
      if (!isObj(t) || (t.role !== "user" && t.role !== "assistant")) return fail("Invalid chat message.");
      const content = typeof t.content === "string" ? t.content.trim() : "";
      const max = t.role === "user" ? LIMITS.messageChars : 4000;
      if (!content || content.length > max) return fail(`Messages must be 1-${LIMITS.messageChars} characters.`);
      messages.push({ role: t.role, content });
    }
    if (messages[0].role !== "user" || messages.at(-1)!.role !== "user") return fail("Chat must start and end with your question.");
  }

  return { ok: true, value: { kind, context, ...(messages ? { messages } : {}) } };
}
