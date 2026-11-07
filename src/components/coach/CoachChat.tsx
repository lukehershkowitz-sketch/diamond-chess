"use client";
import { useEffect, useRef, useState } from "react";
import type { ChatTurn, CoachContext } from "@/lib/coach/request";
import { useCoach } from "./useCoach";

const SUGGESTIONS = ["What's the plan here?", "What's the main threat?", "Why is the engine's move best?"];

/**
 * Chat with the coach about one position. Changing `positionKey` starts a fresh chat,
 * because the coach's context (board + engine lines) belongs to a single position.
 */
export function CoachChat({ context, positionKey, label }: { context: CoachContext | null; positionKey: string; label: string }) {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState("");
  const coach = useCoach();
  const { reset } = coach;
  const log = useRef<HTMLDivElement>(null);

  // A new position means a new conversation.
  const [shownKey, setShownKey] = useState(positionKey);
  if (shownKey !== positionKey) {
    setShownKey(positionKey);
    setTurns([]);
    setInput("");
  }
  useEffect(() => reset(), [positionKey, reset]);

  // Follow the conversation inside the chat box only; never scroll the page.
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight;
  }, [turns.length, coach.text]);

  async function send(question: string) {
    const q = question.trim();
    if (!q || !context || coach.loading) return;
    const history: ChatTurn[] = [...turns, { role: "user" as const, content: q }].slice(-11);
    setTurns(history);
    setInput("");
    const answer = await coach.run({ kind: "chat", context, messages: history });
    if (answer) setTurns((t) => [...t, { role: "assistant", content: answer }]);
    else setTurns((t) => t.slice(0, -1)); // failed: give the question back so it can be retried
    if (!answer) setInput(q);
  }

  const pending = coach.loading ? coach.text : null;

  return (
    <div className="rounded-lg border border-neutral-800">
      <div className="flex items-baseline justify-between border-b border-neutral-800 px-4 py-2.5">
        <h2 className="font-semibold">Ask the coach</h2>
        <span className="truncate pl-3 text-xs text-neutral-500">{label}</span>
      </div>
      <div ref={log} className="max-h-80 space-y-3 overflow-auto px-4 py-3 text-sm" aria-live="polite">
        {turns.length === 0 && !coach.loading && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => void send(s)} disabled={!context}
                className="rounded-full border border-neutral-700 px-3 py-1.5 text-neutral-300 hover:bg-neutral-800 disabled:opacity-40">
                {s}
              </button>
            ))}
          </div>
        )}
        {turns.map((t, i) => (
          <p key={i} className={t.role === "user" ? "ml-8 rounded-lg bg-neutral-800 px-3 py-2" : "whitespace-pre-wrap leading-relaxed text-neutral-200"}>
            {t.content}
          </p>
        ))}
        {pending !== null && (
          <p className="whitespace-pre-wrap leading-relaxed text-neutral-200">
            {pending || <span className="text-neutral-500">Thinking…</span>}
          </p>
        )}
        {coach.error && <p role="alert" className="text-red-300">{coach.error}</p>}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex gap-2 border-t border-neutral-800 p-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={800}
          placeholder={context ? "Ask about this position…" : "Analyze a position first"}
          disabled={!context}
          aria-label="Question for the coach"
          className="min-w-0 flex-1 rounded-md bg-neutral-950 px-3 py-2 text-sm outline-none ring-1 ring-neutral-800 focus:ring-cyan-500 disabled:opacity-50"
        />
        <button type="submit" disabled={!context || !input.trim() || coach.loading}
          className="rounded-md bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500 disabled:opacity-40">
          Ask
        </button>
      </form>
    </div>
  );
}
