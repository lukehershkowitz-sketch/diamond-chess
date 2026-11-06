import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl p-8 space-y-4">
      <h1 className="text-3xl font-bold">Chess Diamond</h1>
      <p className="text-neutral-400">Game review, coach and puzzles. Review is available first.</p>
      <Link className="inline-block rounded bg-green-600 px-4 py-2 text-white" href="/review">
        Open Game Review
      </Link>
    </main>
  );
}
