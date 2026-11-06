"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { EvalGraph } from "@/components/EvalGraph";
import { UciEngine } from "@/lib/engine/uci";
import { analyzeGame, type GameReview } from "@/lib/review/analyzeGame";
import type { MoveClass } from "@/lib/review/types";

const SAMPLE =
  "1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6 8. c3 O-O 9. h3 Nb8 10. d4 Nbd7";
const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

const BADGE: Record<MoveClass, { label: string; color: string }> = {
  brilliant: { label: "!!", color: "bg-cyan-500" },
  great: { label: "!", color: "bg-blue-500" },
  best: { label: "★", color: "bg-green-600" },
  excellent: { label: "✓", color: "bg-green-500" },
  good: { label: "·", color: "bg-lime-600" },
  book: { label: "B", color: "bg-amber-700" },
  inaccuracy: { label: "?!", color: "bg-yellow-500" },
  mistake: { label: "?", color: "bg-orange-500" },
  blunder: { label: "??", color: "bg-red-600" },
};

export default function ReviewPage() {
  const [pgn, setPgn] = useState(SAMPLE);
  const [review, setReview] = useState<GameReview | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ply, setPly] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const engineRef = useRef<UciEngine | null>(null);

  useEffect(() => () => engineRef.current?.terminate(), []);

  const run = useCallback(async () => {
    setError(null);
    setReview(null);
    setPly(0);
    setProgress({ done: 0, total: 1 });
    try {
      engineRef.current?.terminate();
      const engine = new UciEngine();
      engineRef.current = engine;
      await engine.init(3);
      const r = await analyzeGame(pgn, engine, {
        depth: 14,
        onProgress: (done, total) => setProgress({ done, total }),
      });
      setReview(r);
      setPly(r.moves.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setProgress(null);
    }
  }, [pgn]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!review || (e.target as HTMLElement).tagName === "TEXTAREA") return;
      if (e.key === "ArrowRight") setPly((p) => Math.min(review.moves.length, p + 1));
      if (e.key === "ArrowLeft") setPly((p) => Math.max(0, p - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [review]);

  const current = review && ply > 0 ? review.moves[ply - 1] : null;
  const fen = current ? current.fenAfter : review ? review.moves[0].fenBefore : START;
  const arrows = useMemo(() => {
    const next = review?.moves[ply];
    return next?.bestUci
      ? [{ startSquare: next.bestUci.slice(0, 2), endSquare: next.bestUci.slice(2, 4), color: "#16a34a" }]
      : [];
  }, [review, ply]);

  return (
    <main className="mx-auto grid max-w-6xl items-start gap-6 p-4 md:grid-cols-[minmax(0,560px)_1fr]">
      <section>
        <Chessboard options={{ position: fen, boardOrientation: flipped ? "black" : "white", allowDragging: false, arrows }} />
        {review && <EvalGraph winPcts={review.whiteWinPcts} ply={ply} onSelect={setPly} />}
        <div className="mt-2 flex gap-2 text-sm">
          <button className="rounded border px-3 py-1" onClick={() => setPly(0)}>⏮</button>
          <button className="rounded border px-3 py-1" onClick={() => setPly((p) => Math.max(0, p - 1))}>◀</button>
          <button className="rounded border px-3 py-1" onClick={() => review && setPly((p) => Math.min(review.moves.length, p + 1))}>▶</button>
          <button className="rounded border px-3 py-1" onClick={() => setFlipped((f) => !f)}>Flip</button>
        </div>
      </section>

      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">Game Review</h1>
        <textarea
          className="h-28 w-full rounded border bg-transparent p-2 font-mono text-sm"
          value={pgn}
          onChange={(e) => setPgn(e.target.value)}
          aria-label="PGN"
        />
        <button
          className="rounded bg-green-600 px-4 py-2 font-medium text-white disabled:opacity-50"
          onClick={run}
          disabled={!!progress}
        >
          {progress ? "Analyzing…" : "Analyze game"}
        </button>

        {progress && (
          <div role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
            <div className="h-2 w-full overflow-hidden rounded bg-neutral-700">
              <div className="h-full bg-green-500 transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
            <p className="mt-1 text-xs text-neutral-400">Position {progress.done} of {progress.total}</p>
          </div>
        )}
        {error && <p className="text-red-500">{error}</p>}

        {review && (
          <>
            <div className="grid grid-cols-2 gap-3 text-center">
              {(["w", "b"] as const).map((c) => (
                <div key={c} className="rounded border p-3">
                  <div className="text-xs uppercase text-neutral-400">{c === "w" ? "White" : "Black"} accuracy</div>
                  <div className="text-3xl font-bold">{review.accuracy[c].toFixed(1)}</div>
                  <div className="mt-1 text-xs text-neutral-400">
                    {(
                      [
                        ["blunder", "blunders"],
                        ["mistake", "mistakes"],
                        ["inaccuracy", "inaccuracies"],
                      ] as const
                    )
                      .map(([k, plural]) => {
                        const n = review.counts[c][k] ?? 0;
                        return `${n} ${n === 1 ? k : plural}`;
                      })
                      .join(" · ")}
                  </div>
                </div>
              ))}
            </div>

            {current && (
              <p className="rounded bg-neutral-800 p-3 text-sm">
                <b>{current.san}</b> is {current.cls}.
                {current.bestSan && current.bestUci !== current.uci && <> Best was <b>{current.bestSan}</b>.</>}
              </p>
            )}

            <ol className="grid max-h-80 grid-cols-[auto_1fr_1fr] gap-x-2 gap-y-1 overflow-auto text-sm">
              {Array.from({ length: Math.ceil(review.moves.length / 2) }, (_, n) => (
                <li key={n} className="contents">
                  <span className="text-neutral-500">{n + 1}.</span>
                  {[review.moves[2 * n], review.moves[2 * n + 1]].map((m, j) =>
                    m ? (
                      <button
                        key={j}
                        onClick={() => setPly(m.ply)}
                        className={`flex items-center gap-1 rounded px-1 text-left ${ply === m.ply ? "bg-neutral-700" : ""}`}
                      >
                        <span className={`inline-block min-w-5 rounded px-1 text-center text-[10px] text-white ${BADGE[m.cls].color}`}>
                          {BADGE[m.cls].label}
                        </span>
                        {m.san}
                      </button>
                    ) : (
                      <span key={j} />
                    ),
                  )}
                </li>
              ))}
            </ol>
          </>
        )}
      </section>
    </main>
  );
}
