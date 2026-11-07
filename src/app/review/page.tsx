"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Chessboard } from "react-chessboard";
import { ArrowUpDown, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight } from "lucide-react";
import { EvalGraph } from "@/components/EvalGraph";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { fieldClass } from "@/components/ui/Field";
import { CoachChat } from "@/components/coach/CoachChat";
import { CoachExplain } from "@/components/coach/CoachExplain";
import { useCoach, type CoachState } from "@/components/coach/useCoach";
import { explainMoveRequest, positionContext } from "@/lib/coach/contexts";
import { EvalBar } from "@/components/review/EvalBar";
import { ImportPanel, type GameChoice } from "@/components/review/ImportPanel";
import { KeyMoments } from "@/components/review/KeyMoments";
import { MoveFeedback } from "@/components/review/MoveFeedback";
import { MoveList } from "@/components/review/MoveList";
import { Summary } from "@/components/review/Summary";
import { UciEngine } from "@/lib/engine/uci";
import { loadOpenings } from "@/lib/openings";
import { analyzeGame, type GameReview } from "@/lib/review/analyzeGame";
import { formatScore } from "@/lib/review/labels";
import type { MoveClass } from "@/lib/review/types";
import { Chess } from "chess.js";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const DEPTHS = [
  { label: "Fast", depth: 12 },
  { label: "Standard", depth: 16 },
  { label: "Deep", depth: 20 },
];
const TINT: Partial<Record<MoveClass, string>> = {
  brilliant: "rgba(6,182,212,.45)",
  great: "rgba(59,130,246,.45)",
  inaccuracy: "rgba(234,179,8,.45)",
  mistake: "rgba(249,115,22,.5)",
  blunder: "rgba(220,38,38,.5)",
};

/** True when the visitor asked the OS for reduced motion. */
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

/** Player name from a PGN header; "?" and blank mean unknown in PGN, so they count as missing. */
function headerName(pgn: string, tag: "White" | "Black") {
  const name = pgn.match(new RegExp(`\\[${tag} "([^"]*)"\\]`))?.[1]?.trim();
  return name && name !== "?" ? name : undefined;
}

export default function ReviewPage() {
  const [game, setGame] = useState<GameChoice | null>(null);
  const [review, setReview] = useState<GameReview | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ply, setPly] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [depth, setDepth] = useState(16);
  const engineRef = useRef<UciEngine | null>(null);
  const coach = useCoach();
  const { reset: resetCoach, run: runCoach } = coach;
  const [explainPly, setExplainPly] = useState<number | null>(null);
  /** Finished explanations by ply, so revisiting a move doesn't ask (and pay) again. */
  const [explained, setExplained] = useState<Record<number, string>>({});
  const reducedMotion = useReducedMotion();

  useEffect(() => () => engineRef.current?.terminate(), []);

  const analyze = useCallback(
    async (choice: GameChoice) => {
      engineRef.current?.terminate();
      setError(null);
      setReview(null);
      setPly(0);
      setGame(choice);
      resetCoach();
      setExplained({});
      setExplainPly(null);
      setFlipped(choice.orientation === "black");
      try {
        // Validate the PGN before starting the engine, so typos fail fast.
        new Chess().loadPgn(choice.pgn);
      } catch {
        setError("That PGN couldn't be read. Check the moves and try again.");
        return;
      }
      setProgress({ done: 0, total: 1 });
      const engine = new UciEngine();
      engineRef.current = engine;
      try {
        const [openings] = await Promise.all([loadOpenings(), engine.init(3)]);
        const r = await analyzeGame(choice.pgn, engine, {
          depth,
          openings,
          onProgress: (done, total) => setProgress({ done, total }),
        });
        setReview(r);
        setPly(0);
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Analysis failed.");
      } finally {
        if (engineRef.current === engine) {
          engine.terminate();
          engineRef.current = null;
          setProgress(null);
        }
      }
    },
    [depth, resetCoach],
  );

  const cancel = () => {
    engineRef.current?.terminate();
    engineRef.current = null;
    setProgress(null);
  };

  const total = review?.moves.length ?? 0;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (!review || tag === "TEXTAREA" || tag === "INPUT") return;
      const go: Record<string, (p: number) => number> = {
        ArrowRight: (p) => Math.min(total, p + 1),
        ArrowLeft: (p) => Math.max(0, p - 1),
        Home: () => 0,
        End: () => total,
      };
      if (go[e.key]) {
        e.preventDefault();
        setPly(go[e.key]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [review, total]);

  const current = review && ply > 0 ? review.moves[ply - 1] : null;
  const fen = current ? current.fenAfter : review ? review.moves[0].fenBefore : START;

  const { arrows, squareStyles } = useMemo(() => {
    const styles: Record<string, CSSProperties> = {};
    const arr: { startSquare: string; endSquare: string; color: string }[] = [];
    if (current) {
      const tint = TINT[current.cls] ?? "rgba(250,204,21,.35)";
      styles[current.uci.slice(0, 2)] = { background: tint };
      styles[current.uci.slice(2, 4)] = { background: tint };
      if (current.bestUci && current.bestUci !== current.uci && current.cls !== "book") {
        arr.push({ startSquare: current.bestUci.slice(0, 2), endSquare: current.bestUci.slice(2, 4), color: "rgba(22,163,74,.85)" });
      }
    }
    return { arrows: arr, squareStyles: styles };
  }, [current]);

  const explainCurrent = useCallback(async () => {
    if (!review || ply === 0) return;
    const p = ply;
    setExplainPly(p);
    const text = await runCoach(explainMoveRequest(review, p));
    if (text) setExplained((e) => ({ ...e, [p]: text }));
  }, [review, ply, runCoach]);

  const explainState: CoachState =
    explained[ply] !== undefined
      ? { text: explained[ply], loading: false, error: null, code: null }
      : explainPly === ply
        ? coach
        : { text: "", loading: false, error: null, code: null };
  const coachSlot = current ? <CoachExplain state={explainState} onExplain={() => void explainCurrent()} /> : null;
  const chatContext = useMemo(() => (review ? positionContext(review, ply) : null), [review, ply]);
  const chatLabel = current ? `After ${Math.ceil(current.ply / 2)}${current.color === "w" ? "." : "…"} ${current.san}` : "Starting position";

  const scoreLabel = useMemo(() => {
    if (!current) return formatScore(review?.initialScore);
    if (current.scoreAfter) return formatScore(current.scoreAfter);
    // No engine score means the game ended on this move.
    const end = new Chess(current.fenAfter);
    if (end.isCheckmate()) return current.color === "w" ? "1-0" : "0-1";
    return end.isGameOver() ? "½-½" : "–";
  }, [current, review]);
  const whitePct = review ? review.whiteWinPcts[ply] : 50;
  const whiteName = game?.white ?? (game && headerName(game.pgn, "White")) ?? "White";
  const blackName = game?.black ?? (game && headerName(game.pgn, "Black")) ?? "Black";
  const player = (c: "w" | "b") => (
    <div className="flex items-center gap-2 py-1.5 text-sm">
      <span className={`h-3.5 w-3.5 rounded-[4px] ${c === "w" ? "bg-[#f3efe8]" : "border border-line-strong bg-bg"}`} />
      <span className="font-medium">{c === "w" ? whiteName : blackName}</span>
      {(c === "w" ? game?.whiteRating : game?.blackRating) && (
        <span className="font-mono text-xs text-muted">{c === "w" ? game?.whiteRating : game?.blackRating}</span>
      )}
    </div>
  );

  return (
    <div className="mx-auto grid w-full max-w-6xl items-start gap-6 px-4 py-6 lg:grid-cols-[minmax(0,min(600px,calc(100svh-15rem)))_1fr]">
      <section className="min-w-0">
        {player(flipped ? "w" : "b")}
        <div className="flex gap-2">
          <EvalBar whitePct={whitePct} label={scoreLabel} flipped={flipped} />
          <div className="min-w-0 flex-1">
            <Chessboard
              options={{
                position: fen,
                boardOrientation: flipped ? "black" : "white",
                allowDragging: false,
                arrows,
                squareStyles,
                darkSquareStyle: { backgroundColor: "#769656" },
                lightSquareStyle: { backgroundColor: "#eeeed2" },
                // Short slides keep rapid stepping crisp; none at all for reduced motion.
                showAnimations: !reducedMotion,
                animationDurationInMs: 160,
              }}
            />
          </div>
        </div>
        {player(flipped ? "b" : "w")}
        {/* Step controls sit directly under the board so both stay on screen together. */}
        <div className="flex gap-2">
          {[
            { label: "First move", Icon: ChevronFirst, fn: () => setPly(0) },
            { label: "Previous move", Icon: ChevronLeft, fn: () => setPly((p) => Math.max(0, p - 1)) },
            { label: "Next move", Icon: ChevronRight, fn: () => setPly((p) => Math.min(total, p + 1)) },
            { label: "Last move", Icon: ChevronLast, fn: () => setPly(total) },
          ].map(({ label, Icon, fn }) => (
            <Button key={label} aria-label={label} title={label} onClick={fn} disabled={!review} stretch>
              <Icon size={20} aria-hidden />
            </Button>
          ))}
          <Button onClick={() => setFlipped((f) => !f)} title="Flip board">
            <ArrowUpDown size={16} aria-hidden /> Flip
          </Button>
        </div>
        {review && <MoveFeedback move={current} scoreLabel={scoreLabel} coach={coachSlot} className="mt-2 lg:hidden" />}
        {review && (
          <div className="mt-2 overflow-hidden rounded-md border border-line bg-surface">
            <EvalGraph winPcts={review.whiteWinPcts} ply={ply} onSelect={setPly} />
          </div>
        )}
      </section>

      <section className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h1 className="text-3xl tracking-[-0.03em]">Game Review</h1>
          <label className="flex items-center gap-2 text-sm text-muted">
            Depth
            <select value={depth} onChange={(e) => setDepth(Number(e.target.value))} disabled={!!progress}
              className={`${fieldClass} h-9 bg-surface pr-2`}>
              {DEPTHS.map((d) => (
                <option key={d.depth} value={d.depth}>{d.label} ({d.depth})</option>
              ))}
            </select>
          </label>
        </div>

        <ImportPanel onChoose={analyze} busy={!!progress} />

        {progress && (
          <Card>
            <div className="mb-3 flex items-center justify-between gap-3 text-sm">
              <span className="tabular-nums text-soft">Analyzing with Stockfish… position {progress.done} of {progress.total}</span>
              <Button size="sm" variant="quiet" onClick={cancel}>Cancel</Button>
            </div>
            <div role="progressbar" aria-label="Analysis progress" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}
              className="h-1.5 w-full overflow-hidden rounded-full bg-raised-2">
              <div className="h-full origin-left bg-accent transition-transform duration-300 ease-out" style={{ transform: `scaleX(${progress.done / progress.total})` }} />
            </div>
          </Card>
        )}
        {error && <p role="alert" className="rounded-md border border-red-900/70 bg-red-950/30 p-4 text-sm text-red-300">{error}</p>}

        {review && (
          <>
            <MoveFeedback move={current} scoreLabel={scoreLabel} coach={coachSlot} className="hidden lg:block" />
            <Summary review={review} white={whiteName} black={blackName} />
            <CoachChat context={chatContext} positionKey={`${review.moves[0].fenBefore}|${ply}|${review.moves.length}`} label={chatLabel} />
            <KeyMoments moves={review.moves} onSelect={setPly} />
            <MoveList moves={review.moves} ply={ply} onSelect={setPly} />
          </>
        )}
      </section>
    </div>
  );
}
