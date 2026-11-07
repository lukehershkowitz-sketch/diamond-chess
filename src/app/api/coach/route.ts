import Anthropic from "@anthropic-ai/sdk";
import { RateLimiter } from "@/lib/coach/rateLimit";
import { parseCoachRequest } from "@/lib/coach/request";
import { streamCoachAnswer, type CoachStream } from "@/lib/coach/server";

export const runtime = "nodejs";

const limiter = new RateLimiter(20, 10 * 60_000); // 20 coach requests per visitor per 10 minutes
let client: Anthropic | null = null;

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      { error: "The coach isn't switched on for this site yet.", code: "not_configured" },
      { status: 503 },
    );
  }
  const wait = limiter.take(clientIp(req));
  if (wait > 0) {
    return Response.json(
      { error: `You've asked the coach a lot recently. Try again in ${Math.ceil(wait / 60)} min.`, code: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(wait) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Request body must be JSON.", code: "bad_request" }, { status: 400 });
  }
  const parsed = parseCoachRequest(body);
  if (!parsed.ok) return Response.json({ error: parsed.error, code: "bad_request" }, { status: 400 });

  client ??= new Anthropic();
  const anthropic = client;
  const stream = streamCoachAnswer(
    parsed.value,
    (params): CoachStream => anthropic.beta.messages.stream(params, { signal: req.signal }),
    process.env.COACH_MODEL || undefined,
  );
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}
