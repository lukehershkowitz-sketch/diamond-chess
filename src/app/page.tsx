import Link from "next/link";

const FEATURES = [
  {
    title: "Game Review",
    body: "Import your Chess.com or Lichess games and get every move graded, from brilliant to blunder, with accuracy scores and the moment the game turned.",
    href: "/review",
    cta: "Review a game",
  },
  {
    title: "Puzzles",
    body: "Rated tactics puzzles that adapt to your level, plus puzzles built from the mistakes in your own games.",
    soon: true,
  },
  {
    title: "Coach",
    body: "Plain-English explanations of why a move was good or bad, and answers to your questions about any position.",
    soon: true,
  },
];

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:py-20">
      <section className="max-w-2xl">
        <h1 className="text-4xl font-bold leading-[1.05] tracking-[-0.025em] sm:text-5xl">
          Find out where your games were <span className="text-cyan-400">won and lost</span>.
        </h1>
        <p className="mt-4 text-lg text-neutral-400">
          Full engine game review, free, right in your browser. Your games are analyzed on your own device by Stockfish; nothing is uploaded.
        </p>
        <Link href="/review" className="press mt-8 inline-block rounded-md transition-transform duration-100 bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-500">
          Review your last game
        </Link>
      </section>

      <section className="mt-16 grid gap-4 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <div key={f.title} className="flex flex-col rounded-lg border border-neutral-800 bg-neutral-900/60 p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              {f.title}
              {f.soon && <span className="rounded bg-neutral-800 px-1.5 py-0.5 text-[10px] uppercase text-neutral-400">Soon</span>}
            </h2>
            <p className="mt-2 flex-1 text-sm text-neutral-400">{f.body}</p>
            {f.href && (
              <Link href={f.href} className="mt-4 text-sm font-medium text-green-400 hover:text-green-300">
                {f.cta} →
              </Link>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
