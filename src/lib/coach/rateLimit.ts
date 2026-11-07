/**
 * Sliding-window rate limiter kept in memory. On serverless hosts each instance has its
 * own window, so this bounds abuse per instance rather than globally; it's a cost guard,
 * not a security boundary. Swap for a shared store (Redis/KV) if the coach gets popular.
 */
export class RateLimiter {
  private hits = new Map<string, number[]>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  /** Records a hit for `key`; returns how many seconds to wait if it's over the limit, else 0. */
  take(key: string): number {
    const t = this.now();
    const recent = (this.hits.get(key) ?? []).filter((h) => t - h < this.windowMs);
    if (recent.length >= this.limit) {
      this.hits.set(key, recent);
      return Math.ceil((recent[0] + this.windowMs - t) / 1000);
    }
    recent.push(t);
    this.hits.set(key, recent);
    if (this.hits.size > 10_000) this.prune(t);
    return 0;
  }

  private prune(t: number) {
    for (const [k, v] of this.hits) if (v.every((h) => t - h >= this.windowMs)) this.hits.delete(k);
  }
}
