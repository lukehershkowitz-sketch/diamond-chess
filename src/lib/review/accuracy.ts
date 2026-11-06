/** Accuracy (0-100) of one move given the mover's win% before and after it. */
export function moveAccuracy(winBefore: number, winAfter: number): number {
  const loss = Math.max(0, winBefore - winAfter);
  const acc = 103.1668 * Math.exp(-0.04354 * loss) - 3.1669 + 1; // +1 uncertainty bonus
  return Math.min(100, Math.max(0, acc));
}

/** Overall accuracy: mean of the per-move accuracies. */
export function gameAccuracy(moveAccuracies: number[]): number {
  if (moveAccuracies.length === 0) return 100;
  return moveAccuracies.reduce((a, b) => a + b, 0) / moveAccuracies.length;
}
