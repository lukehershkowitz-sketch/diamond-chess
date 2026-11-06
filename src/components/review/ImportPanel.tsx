"use client";
import { useEffect, useState } from "react";
import { fetchChessComGames } from "@/lib/import/chesscom";
import { fetchLichessGames } from "@/lib/import/lichess";
import type { ImportedGame, Source } from "@/lib/import/types";

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
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-4">
      <div role="tablist" className="mb-3 flex gap-1 rounded-md bg-neutral-800 p-1 text-sm">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => switchTab(t.id)}
            className={`flex-1 rounded px-3 py-1.5 ${tab === t.id ? "bg-neutral-950 font-medium" : "text-neutral-400 hover:text-neutral-200"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "pgn" ? (
        <div className="space-y-2">
          <textarea
            className="h-28 w-full rounded border border-neutral-700 bg-neutral-950 p-2 font-mono text-sm"
            value={pgn}
            onChange={(e) => setPgn(e.target.value)}
            aria-label="PGN"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="rounded bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-500 disabled:opacity-50"
              disabled={busy || !pgn.trim()}
              onClick={() => onChoose({ pgn })}
            >
              Analyze game
            </button>
            <label className="cursor-pointer rounded border border-neutral-700 px-3 py-2 text-sm hover:bg-neutral-800">
              Upload .pgn
              <input type="file" accept=".pgn,text/plain" className="hidden" onChange={onFile} />
            </label>
          </div>
        </div>
      ) : (
        <>
          <form onSubmit={fetchGames} className="flex gap-2">
            <input
              className="min-w-0 flex-1 rounded border border-neutral-700 bg-neutral-950 px-3 py-2"
              placeholder={`${tab === "chesscom" ? "Chess.com" : "Lichess"} username`}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              aria-label="Username"
              autoComplete="off"
            />
            <button
              className="rounded bg-green-600 px-4 py-2 font-medium text-white hover:bg-green-500 disabled:opacity-50"
              disabled={loading || !username.trim()}
            >
              {loading ? "Loading…" : "Find games"}
            </button>
          </form>
          {games && games.length > 0 && (
            <ul className="mt-3 max-h-72 divide-y divide-neutral-800 overflow-auto rounded border border-neutral-800">
              {games.map((g) => (
                <li key={g.id}>
                  <button
                    disabled={busy}
                    onClick={() => chooseImported(g)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-neutral-800 disabled:opacity-50"
                  >
                    <span className="w-14 shrink-0 text-xs capitalize text-neutral-400">{g.timeClass}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {g.white} {g.whiteRating ? <span className="text-neutral-500">({g.whiteRating})</span> : null}
                      <span className="text-neutral-500"> vs </span>
                      {g.black} {g.blackRating ? <span className="text-neutral-500">({g.blackRating})</span> : null}
                    </span>
                    <span className="w-10 shrink-0 text-center font-mono">{g.result}</span>
                    <span className="hidden w-20 shrink-0 text-right text-xs text-neutral-500 sm:block">
                      {new Date(g.date).toLocaleDateString()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
