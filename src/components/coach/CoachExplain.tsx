"use client";
import type { CoachState } from "./useCoach";

/** "Explain with Coach" button that turns into the streamed explanation. */
export function CoachExplain({ state, onExplain, label = "Explain with Coach" }: { state: CoachState; onExplain: () => void; label?: string }) {
  if (state.error) {
    return (
      <p role="alert" className="mt-3 text-sm text-red-300">
        {state.error}{" "}
        {state.code !== "not_configured" && (
          <button onClick={onExplain} className="underline hover:text-red-200">Try again</button>
        )}
      </p>
    );
  }
  if (!state.loading && !state.text) {
    return (
      <button onClick={onExplain}
        className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-cyan-800 bg-cyan-950/40 px-3 py-1.5 text-sm font-medium text-cyan-200 hover:bg-cyan-900/50">
        <span aria-hidden>◆</span> {label}
      </button>
    );
  }
  return (
    <div className="mt-3 border-l-2 border-cyan-700 pl-3 text-sm leading-relaxed text-neutral-200" aria-live="polite">
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-cyan-400">Coach</div>
      <p className="whitespace-pre-wrap">{state.text || <span className="text-neutral-500">Thinking…</span>}</p>
    </div>
  );
}
