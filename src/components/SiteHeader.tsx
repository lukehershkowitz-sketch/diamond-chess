"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/review", label: "Review" },
  { href: "/puzzles", label: "Puzzles" },
  { href: "/coach", label: "Coach" },
];

export function SiteHeader() {
  const path = usePathname();
  return (
    <header className="chrome sticky top-0 z-20 border-b border-white/5">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:gap-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 whitespace-nowrap font-bold tracking-tight">
          <span aria-hidden className="text-xl text-cyan-400">◆</span> Diamond Chess
        </Link>
        <nav className="flex gap-0.5 text-sm sm:gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={path.startsWith(n.href) ? "page" : undefined}
              className="rounded-md px-3 py-2 text-neutral-400 hover:text-white aria-[current=page]:bg-white/10 aria-[current=page]:text-white"
            >
              {n.label}
            </Link>
          ))}
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
      <a className="underline hover:text-neutral-300" href="https://github.com/lichess-org/chess-openings">lichess-org/chess-openings</a> and puzzles from the{" "}
      <a className="underline hover:text-neutral-300" href="https://database.lichess.org/#puzzles">Lichess puzzle database</a> (both CC0).
      Not affiliated with Chess.com or Lichess.
    </footer>
  );
}
