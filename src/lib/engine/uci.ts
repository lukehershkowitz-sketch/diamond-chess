import type { Score } from "../review/types";

export interface EngineLine {
  multipv: number;
  depth: number;
  /** Score from White's point of view. */
  score: Score;
  /** Principal variation in UCI notation. */
  pv: string[];
}

export interface AnalysisResult {
  fen: string;
  bestMove: string | null;
  lines: EngineLine[];
}

/** Parse one UCI "info" line. Returns null for lines without a score/pv. */
export function parseInfo(line: string, sideToMove: "w" | "b"): EngineLine | null {
  if (!line.startsWith("info ") || !line.includes(" score ") || !line.includes(" pv ")) return null;
  const t = line.split(/\s+/);
  const val = (key: string) => {
    const i = t.indexOf(key);
    return i >= 0 ? t[i + 1] : undefined;
  };
  const depth = Number(val("depth") ?? 0);
  const multipv = Number(val("multipv") ?? 1);
  const si = t.indexOf("score");
  const kind = t[si + 1];
  const raw = Number(t[si + 2]);
  const sign = sideToMove === "w" ? 1 : -1; // UCI scores are from side-to-move's view
  const score: Score = kind === "mate" ? { mate: raw * sign } : { cp: raw * sign };
  const pv = t.slice(t.indexOf("pv") + 1);
  return { multipv, depth, score, pv };
}

export class UciEngine {
  private worker: Worker;
  private listeners = new Set<(line: string) => void>();
  private pending = new Set<(err: Error) => void>();

  constructor(url = "/stockfish/stockfish-19-lite-single.js") {
    this.worker = new Worker(url);
    this.worker.onmessage = (e: MessageEvent) => {
      const line = typeof e.data === "string" ? e.data : String(e.data);
      this.listeners.forEach((l) => l(line));
    };
  }

  private send(cmd: string) {
    this.worker.postMessage(cmd);
  }

  private waitFor(pred: (line: string) => boolean): Promise<void> {
    return new Promise((resolve) => {
      const l = (line: string) => {
        if (pred(line)) {
          this.listeners.delete(l);
          resolve();
        }
      };
      this.listeners.add(l);
    });
  }

  async init(multiPv = 3) {
    const ready = this.waitFor((l) => l === "uciok");
    this.send("uci");
    await ready;
    this.send(`setoption name MultiPV value ${multiPv}`);
    const r = this.waitFor((l) => l === "readyok");
    this.send("isready");
    await r;
  }

  /** Analyze a position to a fixed depth. */
  analyze(fen: string, depth = 16): Promise<AnalysisResult> {
    const side = (fen.split(" ")[1] as "w" | "b") ?? "w";
    const best = new Map<number, EngineLine>();
    return new Promise((resolve, reject) => {
      this.pending.add(reject);
      const l = (line: string) => {
        const info = parseInfo(line, side);
        if (info) best.set(info.multipv, info);
        if (line.startsWith("bestmove")) {
          this.listeners.delete(l);
          this.pending.delete(reject);
          const mv = line.split(/\s+/)[1];
          resolve({
            fen,
            bestMove: mv && mv !== "(none)" ? mv : null,
            lines: [...best.values()].sort((a, b) => a.multipv - b.multipv),
          });
        }
      };
      this.listeners.add(l);
      this.send(`position fen ${fen}`);
      this.send(`go depth ${depth}`);
    });
  }

  stop() {
    this.send("stop");
  }

  /** Stops the worker. Any analysis still running rejects with an AbortError. */
  terminate() {
    this.worker.terminate();
    this.listeners.clear();
    const err = new DOMException("Analysis cancelled", "AbortError");
    this.pending.forEach((reject) => reject(err));
    this.pending.clear();
  }
}
