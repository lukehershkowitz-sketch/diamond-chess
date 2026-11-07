import Anthropic from "@anthropic-ai/sdk";
import type { MessageCreateParamsBase } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { buildMessages, COACH_SYSTEM } from "./prompt";
import type { CoachRequest } from "./request";

/** Overridable with the COACH_MODEL environment variable. */
export const DEFAULT_COACH_MODEL = "claude-opus-5-5";

/** The slice of the SDK the coach uses, so tests can pass a fake. */
export interface CoachStream extends AsyncIterable<Anthropic.Beta.Messages.BetaRawMessageStreamEvent> {
  finalMessage(): Promise<{ stop_reason: string | null }>;
  abort(): void;
}
export type StartStream = (params: MessageCreateParamsBase) => CoachStream;

export function coachParams(req: CoachRequest, model = DEFAULT_COACH_MODEL): MessageCreateParamsBase {
  return {
    model,
    // Answers are short by instruction; this leaves room for the model's thinking as well.
    max_tokens: 8000,
    // Thinking is always on for this model; effort sets how hard it thinks. The engine data
    // carries the hard calculation, so medium keeps answers quick and the cost low.
    output_config: { effort: "medium" },
    // If a safety classifier declines, re-run on Anthropic's recommended fallback model.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    // Caches the system prompt plus earlier chat turns, so follow-up questions are cheaper.
    cache_control: { type: "ephemeral" },
    system: COACH_SYSTEM,
    messages: buildMessages(req),
  };
}

const NOTICE = {
  refusal: "\n\nThe coach can't help with that one. Try asking about the position.",
  busy: "The coach is busy right now. Try again in a minute.",
  down: "The coach is temporarily unavailable. Try again shortly.",
  config: "The coach isn't set up correctly on this site (API key problem).",
  failed: "\n\nThe coach ran into a problem and stopped. Try again.",
};

/**
 * Streams the coach's answer as UTF-8 text. Errors become a short message in the stream,
 * because the HTTP status is already sent by the time the model starts answering.
 */
export function streamCoachAnswer(req: CoachRequest, start: StartStream, model?: string): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  let stream: CoachStream | null = null;
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let wroteText = false;
      try {
        stream = start(coachParams(req, model));
        for await (const event of stream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            wroteText = true;
            controller.enqueue(enc.encode(event.delta.text));
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") controller.enqueue(enc.encode(NOTICE.refusal.trimStart()));
      } catch (err) {
        if (err instanceof Anthropic.APIUserAbortError) return controller.close();
        console.error("coach error:", err instanceof Error ? err.message : err);
        let msg = NOTICE.failed;
        if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) msg = NOTICE.config;
        else if (err instanceof Anthropic.RateLimitError) msg = NOTICE.busy;
        else if (err instanceof Anthropic.InternalServerError || err instanceof Anthropic.APIConnectionError) msg = NOTICE.down;
        controller.enqueue(enc.encode(wroteText ? msg : msg.trimStart()));
      }
      controller.close();
    },
    cancel() {
      // The visitor navigated away: stop generating (and paying for) the rest.
      stream?.abort();
    },
  });
}
