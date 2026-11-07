"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";

const NAV = [
  { href: "/review", label: "Review" },
  { href: "/puzzles", label: "Puzzles" },
  { href: "/coach", label: "Coach" },
];

export function SiteHeader() {
  const path = usePathname();
  return (
    <header className="chrome sticky top-0 z-20 border-b border-line">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:gap-8">
        <Link href="/" aria-label="Diamond Chess home" className="shrink-0 whitespace-nowrap">
          <Logo compact />
        </Link>
        <nav className="flex gap-0.5 text-sm sm:gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              aria-current={path.startsWith(n.href) ? "page" : undefined}
              className="rounded-sm px-3 py-2 font-medium text-muted transition-colors hover:text-ink aria-[current=page]:bg-raised aria-[current=page]:text-ink"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

const footLink = "underline decoration-line-strong underline-offset-2 hover:text-soft hover:decoration-accent";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-line px-4 py-6 text-center text-xs leading-relaxed text-muted">
      Analysis by{" "}
      <a className={footLink} href="https://github.com/official-stockfish/Stockfish">Stockfish</a>{" "}
      (GPL-3.0, <a className={footLink} href="https://github.com/nmrugg/stockfish.js">WASM build source</a>).
      Opening names from{" "}
      <a className={footLink} href="https://github.com/lichess-org/chess-openings">lichess-org/chess-openings</a> and puzzles from the{" "}
      <a className={footLink} href="https://database.lichess.org/#puzzles">Lichess puzzle database</a> (both CC0).
      Not affiliated with Chess.com or Lichess.
    </footer>
  );
}
