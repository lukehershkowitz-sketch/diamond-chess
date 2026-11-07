"use client";
import { RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LogoMark } from "@/components/ui/Logo";
import type { CoachState } from "./useCoach";

/** "Explain with Coach" button that turns into the streamed explanation. */
export function CoachExplain({ state, onExplain, label = "Explain with Coach" }: { state: CoachState; onExplain: () => void; label?: string }) {
  if (state.error) {
    return (
      <div role="alert" className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-red-300">
        <span>{state.error}</span>
        {state.code !== "not_configured" && (
          <Button size="sm" variant="quiet" onClick={onExplain}>
            <RotateCcw size={14} aria-hidden /> Try again
          </Button>
        )}
      </div>
    );
  }
  if (!state.loading && !state.text) {
    return (
      <Button size="sm" onClick={onExplain} className="mt-3">
        <Sparkles size={16} className="text-accent" aria-hidden /> {label}
      </Button>
    );
  }
  return (
    <div className="mt-3 border-l-2 border-accent pl-3 text-sm leading-relaxed text-soft" aria-live="polite">
      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
        <LogoMark size={14} /> Coach
      </div>
      <p className="whitespace-pre-wrap">{state.text || <span className="text-muted">Thinking…</span>}</p>
    </div>
  );
}
