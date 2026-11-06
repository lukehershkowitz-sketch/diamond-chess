import Link from "next/link";

const NAV = [
  { href: "/review", label: "Review" },
  { href: "/puzzles", label: "Puzzles", soon: true },
  { href: "/coach", label: "Coach", soon: true },
];

export function SiteHeader() {
  return (
    <header className="border-b border-neutral-800 bg-neutral-950/80">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-bold">
          <span aria-hidden className="text-xl text-cyan-400">◆</span> Diamond Chess
        </Link>
        <nav className="flex gap-4 text-sm">
          {NAV.map((n) =>
            n.soon ? (
              <span key={n.href} className="cursor-default text-neutral-600" title="Coming soon">
                {n.label}
              </span>
            ) : (
              <Link key={n.href} href={n.href} className="text-neutral-300 hover:text-white">
                {n.label}
              </Link>
            ),
          )}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-neutral-800 px-4 py-6 text-center text-xs text-neutral-500">
      Analysis by{" "}
      <a className="underline hover:text-neutral-300" href="https://github.com/official-stockfish/Stockfish">Stockfish</a>{" "}
      (GPL-3.0, <a className="underline hover:text-neutral-300" href="https://github.com/nmrugg/stockfish.js">WASM build source</a>).
      Opening names from{" "}
      <a className="underline hover:text-neutral-300" href="https://github.com/lichess-org/chess-openings">lichess-org/chess-openings</a> (CC0).
      Not affiliated with Chess.com or Lichess.
    </footer>
  );
}
