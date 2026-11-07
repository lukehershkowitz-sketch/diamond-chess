import type { GameReview } from "@/lib/review/analyzeGame";
import { CLASS_META, CLASS_ORDER } from "@/lib/review/labels";
import { Card } from "@/components/ui/Card";
import { GradeBadge } from "./GradeBadge";

function accColor(a: number) {
  if (a >= 90) return "text-green-400";
  if (a >= 75) return "text-lime-400";
  if (a >= 60) return "text-yellow-400";
  return "text-orange-400";
}

export function Summary({ review, white, black }: { review: GameReview; white: string; black: string }) {
  return (
    <Card>
      {review.opening && (
        <p className="mb-3 text-sm text-muted">
          <span className="font-mono text-xs text-muted">{review.opening.eco}</span> {review.opening.name}
        </p>
      )}
      <table className="w-full text-sm tabular-nums">
        <thead>
          <tr className="text-muted">
            <th className="text-left font-normal" />
            <th className="w-1/4 truncate font-medium">{white}</th>
            <th className="w-1/4 truncate font-medium">{black}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="py-1 text-muted">Accuracy</td>
            {(["w", "b"] as const).map((c) => (
              <td key={c} className={`text-center font-mono text-2xl font-medium tracking-tight ${accColor(review.accuracy[c])}`}>
                {review.accuracy[c].toFixed(1)}
              </td>
            ))}
          </tr>
          {CLASS_ORDER.map((k) => (
            <tr key={k}>
              <td className="py-0.5">
                <span className="inline-flex items-center gap-2">
                  <GradeBadge cls={k} />
                  {CLASS_META[k].label}
                </span>
              </td>
              {(["w", "b"] as const).map((c) => (
                <td key={c} className={`text-center ${review.counts[c][k] ? CLASS_META[k].text : "text-muted"}`}>
                  {review.counts[c][k] ?? 0}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
