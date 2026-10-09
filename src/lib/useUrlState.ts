"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Keeps calculator inputs in the URL query string so results can be shared
 * (e.g. /salary/?s=4200&d=2). Works with static export: the first render uses
 * `defaults` (so prerendered HTML matches), then the URL is read after mount.
 *
 * Only primitive values are supported. Keys should be short (1–3 chars).
 *
 * const [state, set] = useUrlState({ s: 4000, d: 1, ns: 200000 });
 * set({ s: 5000 });
 */
/** Widen literal defaults (true, 84) to their primitive types; string unions are kept as written. */
export type UrlState<T> = { [K in keyof T]: T[K] extends boolean ? boolean : T[K] extends number ? number : T[K] };

export function useUrlState<T extends Record<string, string | number | boolean>>(defaults: T) {
  type S = UrlState<T>;
  const [state, setState] = useState<S>(defaults as S);
  const defaultsRef = useRef(defaults);
  const hydrated = useRef(false);

  // Read the query string once after mount.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const next = { ...defaultsRef.current } as S;
    let changed = false;
    for (const key of Object.keys(next) as (keyof S)[]) {
      const raw = params.get(key as string);
      if (raw === null) continue;
      const def = next[key];
      let parsed: string | number | boolean | undefined;
      if (typeof def === "number") {
        // An empty param ("k=") means the user cleared the box: keep it empty, not the default.
        const n = raw === "" ? NaN : Number(raw);
        parsed = raw === "" || Number.isFinite(n) ? n : undefined;
      } else if (typeof def === "boolean") {
        parsed = raw === "1" || raw === "true";
      } else {
        parsed = raw;
      }
      const same = parsed === def || (Number.isNaN(parsed) && Number.isNaN(def));
      if (parsed !== undefined && !same) {
        (next as Record<string, unknown>)[key as string] = parsed;
        changed = true;
      }
    }
    hydrated.current = true;
    if (changed) setState(next);
  }, []);

  // Write non-default values back to the URL (replaceState: no history spam).
  useEffect(() => {
    if (!hydrated.current) return;
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(state)) {
      const def = defaultsRef.current[key];
      const bothEmpty = typeof value === "number" && Number.isNaN(value) && typeof def === "number" && Number.isNaN(def);
      if (value === def || bothEmpty) params.delete(key);
      else if (typeof value === "number" && !Number.isFinite(value)) params.set(key, "");
      else params.set(key, typeof value === "boolean" ? (value ? "1" : "0") : String(value));
    }
    const qs = params.toString();
    const url = `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`;
    if (url !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      window.history.replaceState(window.history.state, "", url);
    }
  }, [state]);

  const update = useCallback((patch: Partial<S>) => setState((s) => ({ ...s, ...patch })), []);
  return [state, update] as const;
}
