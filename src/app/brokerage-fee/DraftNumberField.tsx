"use client";

import { useId, useState, type ReactNode } from "react";
import type { Preset } from "@/components/fields";
import { formatNumber, parseNumber } from "@/lib/format";
import { sanitizeDecimalDraft } from "@/lib/calc/brokerage-fee";

/**
 * Decimal number box for the brokerage-fee calculator (협의 요율, 월세).
 * Same markup and classes as the shared NumberField, but it keeps the text being typed
 * ("0.", "45.") in local state and parses it only for the calculation, so 0.35% or 45.5만원
 * can be typed key by key. The shared field turns "0." back into "0", so 0 → . → 3 became 3.
 * When `value` changes from outside (URL, deal switch) the box shows that value.
 * A preset with value NaN clears the box (used for "상한").
 */

function sameNumber(a: number, b: number): boolean {
  return a === b || (Number.isNaN(a) && Number.isNaN(b));
}

function toText(n: number, decimals: number): string {
  return Number.isFinite(n) ? formatNumber(n, decimals) : "";
}

export function DraftNumberField({
  label,
  value,
  onChange,
  unit,
  hint,
  presets,
  reading,
  decimals = 1,
  max,
  placeholder,
}: {
  label: ReactNode;
  value: number;
  onChange: (n: number) => void;
  unit?: string;
  hint?: ReactNode;
  presets?: Preset[];
  reading?: (n: number) => ReactNode;
  /** Allowed fraction digits. */
  decimals?: number;
  max?: number;
  placeholder?: string;
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
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="field-control">
        <input
          id={id}
          className="field-input tabular"
          inputMode="decimal"
          autoComplete="off"
          placeholder={placeholder}
          value={text}
          onChange={(e) => {
            let next = sanitizeDecimalDraft(e.target.value, decimals);
            let n = parseNumber(next);
            if (Number.isFinite(n) && max !== undefined && n > max) {
              n = max;
              next = toText(max, decimals);
            }
            commit(next, n);
          }}
        />
        {unit ? <span className="field-unit">{unit}</span> : null}
      </div>
      {reading && Number.isFinite(value) ? <p className="field-reading tabular">{reading(value)}</p> : null}
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
