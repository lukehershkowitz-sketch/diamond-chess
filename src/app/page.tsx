import Link from "next/link";
import { ArrowRight, ChartNoAxesCombined, MessagesSquare, Puzzle } from "lucide-react";
import { buttonClass } from "@/components/ui/Button";

const FEATURES = [
  {
    title: "Game Review",
    body: "Import your Chess.com or Lichess games and get every move graded, from brilliant to blunder, with accuracy scores and the moment the game turned.",
    href: "/review",
    cta: "Review a game",
    Icon: ChartNoAxesCombined,
  },
  {
    title: "Puzzles",
    body: "Rated tactics puzzles from real games that adapt to your level. Pick a theme like forks, pins or mate in 2.",
    href: "/puzzles",
    cta: "Solve puzzles",
    Icon: Puzzle,
  },
  {
    title: "Coach",
    body: "Plain-English explanations of why a move was good or bad, and answers to your questions about any position.",
    href: "/coach",
    cta: "Ask the coach",
    Icon: MessagesSquare,
  },
];

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:py-24">
      <section className="max-w-2xl">
        <h1 className="text-4xl leading-[1.05] tracking-[-0.04em] sm:text-6xl">
          Find out where your games were <span className="text-accent">won and lost</span>.
        </h1>
        <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
          Full engine game review, free, right in your browser. Your games are analyzed on your own device by Stockfish; nothing is uploaded.
        </p>
        <Link href="/review" className={buttonClass({ variant: "primary", className: "press mt-8" })}>
          Review your last game <ArrowRight size={18} aria-hidden />
        </Link>
      </section>

      <section className="mt-16 grid gap-4 sm:mt-24 sm:grid-cols-3">
        {FEATURES.map(({ title, body, href, cta, Icon }) => (
          <Link
            key={title}
            href={href}
            className="group flex flex-col rounded-md border border-line bg-surface p-5 transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-line-strong"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-sm bg-raised text-accent">
              <Icon size={20} aria-hidden />
            </span>
            <h2 className="mt-4 text-lg">{title}</h2>
            <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{body}</p>
            <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-accent">
              {cta}
              <ArrowRight size={16} aria-hidden className="transition-transform duration-200 group-hover:translate-x-0.5" />
            </span>
          </Link>
        ))}
      </section>
    </div>
  );
}
