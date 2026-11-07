"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { askCoach, CoachError } from "@/lib/coach/client";
import type { CoachRequest } from "@/lib/coach/request";

export interface CoachState {
  text: string;
  loading: boolean;
  error: string | null;
  /** "not_configured" | "rate_limited" | "bad_request" | "error" */
  code: string | null;
}

const IDLE: CoachState = { text: "", loading: false, error: null, code: null };

/** One streaming coach request at a time; starting a new one or unmounting cancels the old one. */
export function useCoach() {
  const [state, setState] = useState<CoachState>(IDLE);
  const ctrl = useRef<AbortController | null>(null);

  const run = useCallback(async (req: CoachRequest): Promise<string | null> => {
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setState({ ...IDLE, loading: true });
    try {
      const text = await askCoach(req, (t) => setState((s) => ({ ...s, text: t })), c.signal);
      setState((s) => ({ ...s, loading: false }));
      return text;
    } catch (e) {
      if (c.signal.aborted) return null;
      const code = e instanceof CoachError ? e.code : "error";
      setState({ text: "", loading: false, error: e instanceof Error ? e.message : "The coach couldn't answer.", code });
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    ctrl.current?.abort();
    setState(IDLE);
  }, []);

  useEffect(() => () => ctrl.current?.abort(), []);
  return { ...state, run, reset };
}
