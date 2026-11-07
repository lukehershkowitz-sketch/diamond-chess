"use client";
import { useEffect, useState } from "react";
import { fetchChessComGames } from "@/lib/import/chesscom";
import { fetchLichessGames } from "@/lib/import/lichess";
import type { ImportedGame, Source } from "@/lib/import/types";
import { LoaderCircle, Search, Upload } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { fieldClass, segItem, segTrack } from "@/components/ui/Field";

type Tab = Source | "pgn";

export interface GameChoice {
  pgn: string;
  white?: string;
  black?: string;
  whiteRating?: number;
  blackRating?: number;
  /** Side to show at the bottom (the imported user's color). */
  orientation?: "white" | "black";
}

const SAMPLE =
  "1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxe5 Qg5 5. Nxf7 Qxg2 6. Rf1 Qxe4+ 7. Be2 Nf3#";

const TABS: { id: Tab; label: string }[] = [
  { id: "chesscom", label: "Chess.com" },
  { id: "lichess", label: "Lichess" },
  { id: "pgn", label: "Paste PGN" },
];

function load(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function save(key: string, v: string) {
  try {
    localStorage.setItem(key, v);
  } catch {
    /* storage unavailable: not essential */
  }
}

export function ImportPanel({ onChoose, busy }: { onChoose: (g: GameChoice) => void; busy: boolean }) {
  const [tab, setTab] = useState<Tab>("chesscom");
  const [username, setUsername] = useState("");
  const [games, setGames] = useState<ImportedGame[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pgn, setPgn] = useState(SAMPLE);

  // Restore saved choices after hydration (reading storage during render would mismatch the prerendered HTML).
  useEffect(() => {
    const t = load("dc.tab") as Tab | null;
    /* eslint-disable react-hooks/set-state-in-effect */
    if (t && TABS.some((x) => x.id === t)) setTab(t);
    setUsername(load("dc.username") ?? "");
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const switchTab = (t: Tab) => {
    setTab(t);
    setGames(null);
    setError(null);
    save("dc.tab", t);
  };

  async function fetchGames(e: React.FormEvent) {
    e.preventDefault();
    if (tab === "pgn") return;
    setLoading(true);
    setError(null);
    setGames(null);
    try {
      const list = tab === "chesscom" ? await fetchChessComGames(username) : await fetchLichessGames(username);
      save("dc.username", username.trim());
      setGames(list);
      if (list.length === 0) setError("No recent standard games found.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load games.");
    } finally {
      setLoading(false);
    }
  }

  function chooseImported(g: ImportedGame) {
    const me = username.trim().toLowerCase();
    onChoose({
      pgn: g.pgn,
      white: g.white,
      black: g.black,
      whiteRating: g.whiteRating,
      blackRating: g.blackRating,
      orientation: g.black.toLowerCase() === me ? "black" : "white",
    });
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) setPgn(await f.text());
  }

  return (
    <Card>
      <div role="tablist" className={`mb-3 ${segTrack}`}>
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => switchTab(t.id)} className={segItem(tab === t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "pgn" ? (
        <div className="space-y-3">
          <textarea
            className={`${fieldClass} block h-28 w-full py-2 font-mono text-xs leading-relaxed`}
            value={pgn}
            onChange={(e) => setPgn(e.target.value)}
            aria-label="PGN"
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" disabled={busy || !pgn.trim()} onClick={() => onChoose({ pgn })}>
              Analyze game
            </Button>
            <label className={buttonClass({ variant: "secondary", className: "cursor-pointer" })}>
              <Upload size={16} aria-hidden /> Upload .pgn
              <input type="file" accept=".pgn,text/plain" className="sr-only" onChange={onFile} />
            </label>
          </div>
        </div>
      ) : (
        <>
          <form onSubmit={fetchGames} className="flex gap-2">
            <input
              className={`${fieldClass} h-11 min-w-0 flex-1`}
              placeholder={`${tab === "chesscom" ? "Chess.com" : "Lichess"} username`}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              aria-label="Username"
              autoComplete="off"
            />
            <Button type="submit" variant="primary" disabled={loading || !username.trim()}>
              {loading ? <LoaderCircle size={16} className="animate-spin" aria-hidden /> : <Search size={16} aria-hidden />}
              {loading ? "Loading…" : "Find games"}
            </Button>
          </form>
          {games && games.length > 0 && (
            <ul className="mt-3 max-h-72 divide-y divide-line overflow-auto rounded-sm border border-line">
              {games.map((g) => (
                <li key={g.id}>
                  <button
                    disabled={busy}
                    onClick={() => chooseImported(g)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm hover:bg-raised disabled:opacity-50"
                  >
                    <span className="w-14 shrink-0 text-xs capitalize text-muted">{g.timeClass}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {g.white} {g.whiteRating ? <span className="text-muted">({g.whiteRating})</span> : null}
                      <span className="text-muted"> vs </span>
                      {g.black} {g.blackRating ? <span className="text-muted">({g.blackRating})</span> : null}
                    </span>
                    <span className="w-10 shrink-0 text-center font-mono text-xs">{g.result}</span>
                    <span className="hidden w-20 shrink-0 text-right text-xs text-muted sm:block">
                      {new Date(g.date).toLocaleDateString()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-red-400">{error}</p>}
    </Card>
  );
}
