"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Chessboard } from "react-chessboard";
import { Chess, type Square } from "chess.js";
import { updateRating } from "@/lib/puzzles/glicko2";
import { loadIndex, pickPuzzle, type PuzzleIndex } from "@/lib/puzzles/loader";
import { PuzzleRun } from "@/lib/puzzles/run";
import type { Puzzle } from "@/lib/puzzles/types";
import { emptyProfile, loadProfile, recordAttempt, saveProfile, type PuzzleProfile } from "@/lib/puzzles/storage";
import { THEME_LABELS, themeLabel } from "@/lib/puzzles/themes";
import { ArrowRight, Eye, Lightbulb, SkipForward } from "lucide-react";
import { CoachExplain } from "@/components/coach/CoachExplain";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Card";
import { fieldClass } from "@/components/ui/Field";
import { useCoach } from "@/components/coach/useCoach";
import { explainPuzzleRequest } from "@/lib/coach/contexts";

type Status = "loading" | "opponent" | "solving" | "solved" | "error";

const REPLY_DELAY = 350;
const SETUP_DELAY = 500;
const LIGHT = "#eeeed2";
const DARK = "#769656";

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

export default function PuzzlesPage() {
  const [profile, setProfile] = useState<PuzzleProfile>(emptyProfile);
  const [index, setIndex] = useState<PuzzleIndex | null>(null);
  const [theme, setTheme] = useState<string>("");
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  /** True once this puzzle has been counted as a miss (wrong move, hint, solution or skip). */
  const [missed, setMissed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fen, setFen] = useState("8/8/8/8/8/8/8/8 w - - 0 1");
  const [orientation, setOrientation] = useState<"white" | "black">("white");
  const [lastMove, setLastMove] = useState<[string, string] | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ square: string; ok: boolean } | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [delta, setDelta] = useState<number | null>(null);
  /** Position after the opponent's setup move: where the solver starts (used by the coach). */
  const [startFen, setStartFen] = useState<string | null>(null);
  const coach = useCoach();
  const { reset: resetCoach, run: runCoach } = coach;

  const runRef = useRef<PuzzleRun | null>(null);
  const ratedRef = useRef(false); // result already counted for this puzzle
  const timers = useRef<number[]>([]);
  const profileRef = useRef(profile); // latest profile for event handlers; written only via commitProfile
  const reducedMotion = useReducedMotion();

  const later = useCallback(
    (fn: () => void, ms: number) => {
      timers.current.push(window.setTimeout(fn, reducedMotion ? 0 : ms));
    },
    [reducedMotion],
  );
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clearTimers, []);

  const commitProfile = (p: PuzzleProfile) => {
    profileRef.current = p;
    setProfile(p);
  };

  /** Count the result once per puzzle: a clean solve is a win, anything else a loss. Returns whether it counted now. */
  const rate = useCallback((solved: boolean): boolean => {
    const run = runRef.current;
    if (!run || ratedRef.current) return false;
    ratedRef.current = true;
    const p = profileRef.current;
    const nextRating = updateRating(p.rating, run.puzzle.rating, solved ? 1 : 0);
    const d = Math.round(nextRating.rating) - Math.round(p.rating.rating);
    const updated = recordAttempt(
      p,
      { id: run.puzzle.id, puzzleRating: run.puzzle.rating, solved, delta: d, at: Date.now() },
      nextRating,
    );
    commitProfile(updated);
    saveProfile(updated);
    setDelta(d);
    if (!solved) setMissed(true);
    return true;
  }, []);

  /** Fetches a puzzle and plays the opponent's setup move. All state updates happen after the fetch. */
  const loadPuzzle = useCallback(async () => {
    try {
      const p = profileRef.current;
      const pz = await pickPuzzle({ rating: p.rating.rating, theme: theme || null, seen: p.seen });
      const run = new PuzzleRun(pz);
      runRef.current = run;
      ratedRef.current = false;
      setPuzzle(pz);
      setMissed(false);
      setDelta(null);
      setStartFen(null);
      resetCoach();
      setHint(null);
      setSelected(null);
      setFlash(null);
      setLastMove(null);
      setFen(pz.fen);
      // The solver plays the side that is NOT to move in the stored position.
      setOrientation(new Chess(pz.fen).turn() === "w" ? "black" : "white");
      setStatus("opponent");
      setMessage("Watch your opponent's move…");
      later(() => {
        const m = run.playSetup();
        setStartFen(run.fen);
        setFen(run.fen);
        setLastMove([m.from, m.to]);
        setStatus("solving");
        setMessage(`Your turn. Find the best move for ${run.solverColor === "w" ? "White" : "Black"}.`);
      }, SETUP_DELAY);
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Couldn't load a puzzle.");
    }
  }, [theme, later, resetCoach]);

  const next = useCallback(() => {
    clearTimers();
    setStatus("loading");
    setError(null);
    void loadPuzzle();
  }, [loadPuzzle]);

  // Restore saved progress and fetch the theme list once (state is set in async callbacks).
  useEffect(() => {
    void Promise.resolve().then(() => commitProfile(loadProfile()));
    loadIndex().then(setIndex, () => {});
  }, []);

  // First puzzle, and a fresh one whenever the theme changes.
  useEffect(() => {
    clearTimers();
    void Promise.resolve().then(loadPuzzle);
  }, [loadPuzzle]);

  const attempt = useCallback(
    (from: string, to: string): boolean => {
      const run = runRef.current;
      if (!run || status !== "solving" || run.done) return false;
      const uci = from + to + (isPromotion(run.fen, from, to) ? run.promotionFor(from, to) : "");
      const r = run.tryMove(uci);
      setSelected(null);
      if (r.result === "illegal") return false;
      if (r.result === "wrong") {
        setFlash({ square: to, ok: false });
        later(() => setFlash(null), 600);
        rate(false);
        setMessage("That's not it. Try again, or view the solution.");
        return false;
      }
      setHint(null);
      setFlash({ square: to, ok: true });
      setFen(r.move.after);
      setLastMove([r.move.from, r.move.to]);
      if (r.result === "solved") {
        const counted = rate(true);
        setStatus("solved");
        setMessage(counted ? "Puzzle solved!" : "Solved, but it didn't count this time.");
        return true;
      }
      setMessage("Best move! Keep going…");
      setStatus("opponent");
      const reply = r.reply;
      later(() => {
        setFlash(null);
        setFen(reply.after);
        setLastMove([reply.from, reply.to]);
        setStatus("solving");
      }, REPLY_DELAY);
      return true;
    },
    [status, rate, later],
  );

  const showHint = () => {
    const run = runRef.current;
    if (!run) return;
    rate(false);
    setHint(run.hintSquare());
    setMessage("Hint: move the highlighted piece. (Hints count as a miss.)");
  };

  const showSolution = () => {
    const run = runRef.current;
    if (!run || run.done) return;
    rate(false);
    setStatus("opponent");
    setHint(null);
    setSelected(null);
    const moves = run.playOut();
    moves.forEach((m, i) =>
      later(() => {
        setFen(m.after);
        setLastMove([m.from, m.to]);
        if (i === moves.length - 1) {
          setStatus("solved");
          setMessage("Here's the solution.");
        }
      }, 500 * (i + 1)),
    );
  };

  // Keyboard: Enter or N for the next puzzle once this one is over.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "SELECT") return;
      if (status === "solved" && (e.key === "Enter" || e.key.toLowerCase() === "n")) next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status, next]);

  const solverColor = orientation === "white" ? "w" : "b";
  const legalTargets = useMemo(() => {
    if (!selected) return [];
    try {
      return new Chess(fen).moves({ square: selected as Square, verbose: true }).map((m) => m.to);
    } catch {
      return [];
    }
  }, [selected, fen]);

  const squareStyles = useMemo(() => {
    const s: Record<string, CSSProperties> = {};
    if (lastMove) for (const sq of lastMove) s[sq] = { background: "rgba(250, 204, 21, 0.38)" };
    if (selected) s[selected] = { background: "rgba(201, 164, 90, 0.55)" };
    for (const t of legalTargets)
      s[t] = { ...s[t], backgroundImage: "radial-gradient(circle, rgba(0,0,0,.22) 24%, transparent 26%)" };
    if (hint) s[hint] = { ...s[hint], boxShadow: "inset 0 0 0 4px rgba(201, 164, 90, 0.95)" };
    if (flash) s[flash.square] = { ...s[flash.square], background: flash.ok ? "rgba(34,197,94,.6)" : "rgba(239,68,68,.65)" };
    return s;
  }, [lastMove, selected, legalTargets, hint, flash]);

  const canMove = status === "solving";
  const onSquareClick = ({ piece, square }: { piece: { pieceType: string } | null; square: string }) => {
    if (!canMove) return;
    const own = piece && piece.pieceType[0] === solverColor;
    if (selected && legalTargets.includes(square as Square)) {
      attempt(selected, square);
    } else if (own) {
      setSelected(square === selected ? null : square);
    } else {
      setSelected(null);
    }
  };

  const themeOptions = useMemo(
    () => Object.keys(THEME_LABELS).filter((t) => (index?.themes[t] ?? 0) >= 20),
    [index],
  );
  const current = puzzle;
  const recent = profile.history.slice(0, 12);
  const solvedCount = profile.history.filter((h) => h.solved).length;

  return (
    <div className="mx-auto grid w-full max-w-6xl items-start gap-6 px-4 py-6 lg:grid-cols-[minmax(0,600px)_1fr]">
      <section className="min-w-0">
        <Chessboard
          options={{
            position: fen,
            boardOrientation: orientation,
            allowDragging: canMove,
            canDragPiece: ({ piece }) => canMove && piece.pieceType[0] === solverColor,
            onPieceDrop: ({ sourceSquare, targetSquare }) => (targetSquare ? attempt(sourceSquare, targetSquare) : false),
            onPieceDrag: ({ square }) => setSelected(square),
            onSquareClick,
            squareStyles,
            darkSquareStyle: { backgroundColor: DARK },
            lightSquareStyle: { backgroundColor: LIGHT },
            showAnimations: !reducedMotion,
            animationDurationInMs: 200,
            allowDrawingArrows: true,
          }}
        />
      </section>

      {/* On phones the prompt and actions come straight after the board; on desktop the heading leads. */}
      <section className="flex min-w-0 flex-col gap-4">
        <div className="order-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 lg:order-1">
          <h1 className="text-3xl tracking-[-0.03em]">Puzzles</h1>
          <label className="flex items-center gap-2 text-sm text-muted">
            Theme{" "}
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className={`${fieldClass} h-9 max-w-[11rem] bg-surface pr-2`}
            >
              <option value="">All themes</option>
              {themeOptions.map((t) => (
                <option key={t} value={t}>{themeLabel(t)}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="order-4 rounded-md border border-line bg-surface p-4 lg:order-2">
          <div className="flex items-end justify-between">
            <div>
              <Eyebrow>Your puzzle rating</Eyebrow>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-4xl font-medium tracking-tight tabular-nums">{Math.round(profile.rating.rating)}</span>
                {profile.rating.rd > 110 && <span className="text-sm text-muted" title="Your rating is still provisional">?</span>}
                {delta !== null && (
                  <span className={`text-lg font-semibold tabular-nums ${delta >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {delta >= 0 ? `+${delta}` : delta}
                  </span>
                )}
              </div>
            </div>
            <div className="text-right text-sm text-muted tabular-nums">
              {solvedCount} / {profile.history.length} solved
            </div>
          </div>
          {recent.length > 0 && (
            <ol className="mt-3 flex gap-1" aria-label="Recent results">
              {recent.map((h) => (
                <li
                  key={h.at}
                  title={`${h.solved ? "Solved" : "Missed"} · puzzle ${h.puzzleRating}`}
                  className={`h-2 flex-1 rounded-full ${h.solved ? "bg-green-500" : "bg-red-500"}`}
                />
              ))}
            </ol>
          )}
        </div>

        <div
          aria-live="polite"
          className={`order-1 rounded-md border p-4 lg:order-3 ${
            status === "solved" && !missed
              ? "border-green-900/70 bg-green-950/30"
              : missed
                ? "border-red-900/70 bg-red-950/30"
                : "border-line bg-surface"
          }`}
        >
          {status === "error" ? (
            <p role="alert" className="text-sm text-red-300">{error}</p>
          ) : (
            <>
              <p className="font-medium">{status === "loading" ? "Loading puzzle…" : message}</p>
              {current && status !== "loading" && (
                <p className="mt-1 text-sm text-muted">
                  Puzzle rated <span className="tabular-nums">{current.rating}</span>
                  {status === "solved" || missed ? (
                    <> · {current.themes.filter((t) => THEME_LABELS[t]).slice(0, 3).map(themeLabel).join(", ")}</>
                  ) : null}
                </p>
              )}
            </>
          )}
          {status === "solved" && current && startFen && (
            <CoachExplain
              state={coach}
              label="Explain this puzzle"
              onExplain={() => void runCoach(explainPuzzleRequest(current, startFen))}
            />
          )}
        </div>

        <div className="order-2 flex flex-wrap gap-2 lg:order-4">
          {status === "solved" || status === "error" ? (
            <Button variant="primary" onClick={next}>
              Next puzzle <ArrowRight size={16} aria-hidden />
            </Button>
          ) : (
            <>
              <Button onClick={showHint} disabled={!canMove || !!hint}>
                <Lightbulb size={16} aria-hidden /> Hint
              </Button>
              <Button onClick={showSolution} disabled={!canMove}>
                <Eye size={16} aria-hidden /> View solution
              </Button>
              <Button variant="quiet" onClick={() => { rate(false); next(); }} disabled={status === "loading"}>
                <SkipForward size={16} aria-hidden /> Skip
              </Button>
            </>
          )}
          {current && (
            <a href={`https://lichess.org/training/${current.id}`} target="_blank" rel="noreferrer"
              className="ml-auto self-center text-sm text-muted underline decoration-line-strong underline-offset-2 hover:text-soft hover:decoration-accent">
              View on Lichess
            </a>
          )}
        </div>
        <p className="order-5 text-xs text-muted">
          Drag a piece or tap it and then its destination. Your rating is saved in this browser.
        </p>
      </section>
    </div>
  );
}

function isPromotion(fen: string, from: string, to: string) {
  const piece = new Chess(fen).get(from as Square);
  return piece?.type === "p" && (to[1] === "8" || to[1] === "1");
}
