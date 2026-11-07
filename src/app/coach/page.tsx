"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Chessboard } from "react-chessboard";
import { Chess } from "chess.js";
import { CoachChat } from "@/components/coach/CoachChat";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { fieldClass } from "@/components/ui/Field";
import { UciEngine } from "@/lib/engine/uci";
import type { CoachContext, EngineLine } from "@/lib/coach/request";
import { pvToSan } from "@/lib/review/analyzeGame";
import { formatScore } from "@/lib/review/labels";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const EXAMPLE = "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4";

/** Reads a FEN or a PGN. A PGN gives its final position plus the moves that led there. */
function parsePosition(input: string): { fen: string; history: string[] } | null {
  const text = input.trim();
  if (!text) return null;
  try {
    return { fen: new Chess(text).fen(), history: [] };
  } catch {
    /* not a FEN; try PGN */
  }
  try {
    const g = new Chess();
    g.loadPgn(text);
    return { fen: g.fen(), history: g.history() };
  } catch {
    return null;
  }
}

export default function CoachPage() {
  const [input, setInput] = useState(EXAMPLE);
  const [pos, setPos] = useState<{ fen: string; history: string[] }>({ fen: EXAMPLE, history: [] });
  const [lines, setLines] = useState<EngineLine[] | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const engineRef = useRef<UciEngine | null>(null);

  useEffect(() => () => engineRef.current?.terminate(), []);

  const analyze = useCallback(async (fen: string) => {
    engineRef.current?.terminate();
    setLines(null);
    const g = new Chess(fen);
    if (g.isGameOver()) {
      setLines([]);
      return;
    }
    setAnalyzing(true);
    const engine = new UciEngine();
    engineRef.current = engine;
    try {
      await engine.init(3);
      const r = await engine.analyze(fen, 16);
      setLines(r.lines.map((l) => ({ moves: pvToSan(fen, l.pv, 8), score: formatScore(l.score) })).filter((l) => l.moves.length));
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) setError("Stockfish couldn't analyze this position.");
    } finally {
      if (engineRef.current === engine) {
        engine.terminate();
        engineRef.current = null;
        setAnalyzing(false);
      }
    }
  }, []);

  // Analyze the example on first load (state updates happen after the engine answers).
  useEffect(() => {
    void Promise.resolve().then(() => analyze(EXAMPLE));
  }, [analyze]);

  function load(e?: React.FormEvent) {
    e?.preventDefault();
    const p = parsePosition(input);
    if (!p) {
      setError("That isn't a FEN or PGN I can read.");
      return;
    }
    setError(null);
    setPos(p);
    void analyze(p.fen);
  }

  const turn = new Chess(pos.fen).turn();
  const context: CoachContext | null = lines === null ? null : { fen: pos.fen, history: pos.history.slice(-300), engineLines: lines };

  return (
    <div className="mx-auto grid w-full max-w-6xl items-start gap-6 px-4 py-6 lg:grid-cols-[minmax(0,560px)_1fr]">
      <section className="min-w-0">
        <Chessboard
          options={{
            position: pos.fen,
            boardOrientation: turn === "w" ? "white" : "black",
            allowDragging: false,
            darkSquareStyle: { backgroundColor: "#769656" },
            lightSquareStyle: { backgroundColor: "#eeeed2" },
          }}
        />
        <p className="mt-2 text-sm text-muted">{turn === "w" ? "White" : "Black"} to move</p>
      </section>

      <section className="flex min-w-0 flex-col gap-4">
        <div>
          <h1 className="text-3xl tracking-[-0.03em]">Coach</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Paste any position and ask about it. Stockfish analyzes it in your browser and the coach explains what it finds.
          </p>
        </div>

        <form onSubmit={load} className="space-y-3 rounded-md border border-line bg-surface p-4">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            aria-label="FEN or PGN"
            placeholder="Paste a FEN or a PGN"
            className={`${fieldClass} block h-20 w-full py-2 font-mono text-xs leading-relaxed`}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary" disabled={analyzing}>
              Load position
            </Button>
            <Button onClick={() => setInput(START)}>Starting position</Button>
          </div>
          {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
        </form>

        <Card title="Stockfish" aside="Top 3 lines, depth 16">
          {analyzing && <p className="text-sm text-muted">Analyzing…</p>}
          {lines?.length === 0 && <p className="text-sm text-muted">The game is over in this position.</p>}
          {lines && lines.length > 0 && (
            <ol className="space-y-1 font-mono text-sm">
              {lines.map((l, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-14 shrink-0 tabular-nums text-ink">{l.score}</span>
                  <span className="truncate text-muted">{l.moves.join(" ")}</span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <CoachChat context={context} positionKey={pos.fen} label={`${turn === "w" ? "White" : "Black"} to move`} />
      </section>
    </div>
  );
}
