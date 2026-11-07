"use client";
import { useEffect, useRef, useState } from "react";
import type { ChatTurn, CoachContext } from "@/lib/coach/request";
import { SendHorizontal } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { fieldClass } from "@/components/ui/Field";
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
    <Card title="Ask the coach" aside={label} flush>
      <div ref={log} className="max-h-80 space-y-3 overflow-auto px-4 py-3 text-sm" aria-live="polite">
        {turns.length === 0 && !coach.loading && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => void send(s)} disabled={!context}
                className="h-9 rounded-full border border-line-strong px-3 text-soft hover:border-accent/60 hover:text-ink disabled:opacity-40">
                {s}
              </button>
            ))}
          </div>
        )}
        {turns.map((t, i) => (
          <p key={i} className={t.role === "user" ? "ml-8 rounded-md bg-raised px-3 py-2 text-ink" : "whitespace-pre-wrap leading-relaxed text-soft"}>
            {t.content}
          </p>
        ))}
        {pending !== null && (
          <p className="whitespace-pre-wrap leading-relaxed text-soft">
            {pending || <span className="text-muted">Thinking…</span>}
          </p>
        )}
        {coach.error && <p role="alert" className="text-red-300">{coach.error}</p>}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
        className="flex gap-2 border-t border-line p-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          maxLength={800}
          placeholder={context ? "Ask about this position…" : "Analyze a position first"}
          disabled={!context}
          aria-label="Question for the coach"
          className={`${fieldClass} h-11 min-w-0 flex-1`}
        />
        <Button type="submit" variant="primary" disabled={!context || !input.trim() || coach.loading}>
          <SendHorizontal size={16} aria-hidden /> Ask
        </Button>
      </form>
    </Card>
  );
}
