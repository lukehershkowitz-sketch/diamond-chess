import type { CoachRequest } from "./request";

export class CoachError extends Error {
  constructor(message: string, readonly code: string) {
    super(message);
  }
}

/** Calls /api/coach and reports the answer as it streams in. Resolves with the full text. */
export async function askCoach(req: CoachRequest, onText: (soFar: string) => void, signal?: AbortSignal): Promise<string> {
  const res = await fetch("/api/coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
    signal,
  });
  if (!res.ok || !res.body) {
    let msg = "The coach couldn't answer. Try again.";
    let code = "error";
    try {
      const j = (await res.json()) as { error?: string; code?: string };
      msg = j.error ?? msg;
      code = j.code ?? code;
    } catch {
      /* non-JSON error body */
    }
    throw new CoachError(msg, code);
  }
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    text += dec.decode(value, { stream: true });
    onText(text);
  }
  text += dec.decode();
  onText(text);
  return text;
}
