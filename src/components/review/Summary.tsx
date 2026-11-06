import type { GameReview } from "@/lib/review/analyzeGame";
import { CLASS_META, CLASS_ORDER } from "@/lib/review/labels";

function accColor(a: number) {
  if (a >= 90) return "text-green-400";
  if (a >= 75) return "text-lime-400";
  if (a >= 60) return "text-yellow-400";
  return "text-orange-400";
}

export function Summary({ review, white, black }: { review: GameReview; white: string; black: string }) {
  return (
    <div className="rounded-lg border border-neutral-800 p-4">
      {review.opening && (
        <p className="mb-3 text-sm text-neutral-400">
          <span className="font-mono text-neutral-500">{review.opening.eco}</span> {review.opening.name}
        </p>
      )}
      <table className="w-full text-sm">
        <thead>
          <tr className="text-neutral-400">
            <th className="text-left font-normal" />
            <th className="w-1/4 truncate font-medium">{white}</th>
            <th className="w-1/4 truncate font-medium">{black}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="py-1 text-neutral-400">Accuracy</td>
            {(["w", "b"] as const).map((c) => (
              <td key={c} className={`text-center text-2xl font-bold ${accColor(review.accuracy[c])}`}>
                {review.accuracy[c].toFixed(1)}
              </td>
            ))}
          </tr>
          {CLASS_ORDER.map((k) => (
            <tr key={k}>
              <td className="py-0.5">
                <span className={`mr-2 inline-block min-w-5 rounded px-1 text-center text-[10px] font-bold text-white ${CLASS_META[k].color}`}>
                  {CLASS_META[k].symbol}
                </span>
                {CLASS_META[k].label}
              </td>
              {(["w", "b"] as const).map((c) => (
                <td key={c} className={`text-center ${review.counts[c][k] ? CLASS_META[k].text : "text-neutral-600"}`}>
                  {review.counts[c][k] ?? 0}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
