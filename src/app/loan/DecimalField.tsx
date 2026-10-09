"use client";

import { useId, useState, type ReactNode } from "react";
import type { Preset } from "@/components/fields";
import { formatNumber, parseNumber } from "@/lib/format";
import { sanitizeDecimalDraft } from "@/lib/calc/loan";

/**
 * Number box for 연 이자율 and 대출기간. Same markup and classes as the shared NumberField
 * (label row with an optional `aside`), but it keeps the text being typed ("4.", "3.0") in
 * local state and parses it only for the calculation, so 4.5% or 1.5년 can be typed key by key.
 * The shared field turns "4." back into "4" on every render, so 4 → . → 5 became 45.
 * When `value` changes from outside (presets, URL, unit switch) the box shows that value.
 * Pass `value` already rounded to `decimals` so the number shown is the number calculated.
 */

function sameNumber(a: number, b: number): boolean {
  return a === b || (Number.isNaN(a) && Number.isNaN(b));
}

function toText(n: number, decimals: number): string {
  return Number.isFinite(n) ? formatNumber(n, decimals) : "";
}

export function DecimalField({
  label,
  value,
  onChange,
  unit,
  hint,
  presets,
  decimals = 2,
  max,
  placeholder,
  aside,
}: {
  label: ReactNode;
  value: number;
  onChange: (n: number) => void;
  unit?: string;
  hint?: ReactNode;
  presets?: Preset[];
  /** Allowed fraction digits (0 = whole numbers only). */
  decimals?: number;
  max?: number;
  placeholder?: string;
  aside?: ReactNode;
}) {
  const id = useId();
  const [draft, setDraft] = useState(() => ({ text: toText(value, decimals), value }));
  const text = sameNumber(draft.value, value) ? draft.text : toText(value, decimals);

  const commit = (nextText: string, n: number) => {
    setDraft({ text: nextText, value: n });
    onChange(n);
  };

  return (
    <div className="field">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="field-label">
          {label}
        </label>
        {aside ? <span className="text-sm text-muted tabular">{aside}</span> : null}
      </div>
      <div className="field-control">
        <input
          id={id}
          className="field-input tabular"
          inputMode={decimals > 0 ? "decimal" : "numeric"}
          autoComplete="off"
          placeholder={placeholder}
          value={text}
          onChange={(e) => {
            let next = sanitizeDecimalDraft(e.target.value, decimals);
            let n = parseNumber(next);
            // Clamp only the upper bound while typing; the calculator validates the lower bound.
            if (Number.isFinite(n) && max !== undefined && n > max) {
              n = max;
              next = toText(max, decimals);
            }
            commit(next, n);
          }}
        />
        {unit ? <span className="field-unit">{unit}</span> : null}
      </div>
      {presets?.length ? (
        <div className="chips" role="group" aria-label="빠른 입력">
          {presets.map((p) => (
            <button
              key={p.label}
              type="button"
              className="chip"
              aria-pressed={sameNumber(value, p.value)}
              onClick={() => commit(toText(p.value, decimals), p.value)}
            >
              {p.label}
            </button>
          ))}
        </div>
      ) : null}
      {hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}
