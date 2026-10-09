"use client";

import { useId, useState, type ReactNode } from "react";
import type { Preset } from "@/components/fields";
import { formatNumber, parseNumber } from "@/lib/format";
import { sanitizeDecimalInput } from "@/lib/calc/percent";

/** Fraction digits a box accepts when `decimals` is not given. */
export const DEFAULT_DECIMALS = 4;

function sameNumber(a: number, b: number): boolean {
  return a === b || (Number.isNaN(a) && Number.isNaN(b));
}

function toText(n: number, decimals: number): string {
  return Number.isFinite(n) ? formatNumber(n, decimals) : "";
}

/**
 * Number box for the percent calculator. Same markup and classes as the shared NumberField,
 * but it keeps what the user is typing ("3.", "0.0", "-") in local state, so decimals such
 * as 3.05 can be typed character by character, and it groups thousands while typing.
 * When `value` changes from outside (presets, URL, mode switch) the box shows that value.
 * The parent should pass `value` already rounded to `decimals` (see roundToDigits), so the
 * number shown in the box is the number used in the calculation.
 */
export function DecimalField({
  label,
  value,
  onChange,
  unit,
  hint,
  presets,
  reading,
  decimals = DEFAULT_DECIMALS,
  max,
  allowNegative = false,
  placeholder,
}: {
  label: ReactNode;
  value: number;
  onChange: (n: number) => void;
  unit?: string;
  hint?: ReactNode;
  presets?: Preset[];
  reading?: (n: number) => ReactNode;
  /** Allowed fraction digits (0 = integers only). */
  decimals?: number;
  max?: number;
  allowNegative?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  const [draft, setDraft] = useState(() => ({ text: toText(value, decimals), value }));
  const text = sameNumber(draft.value, value) ? draft.text : toText(value, decimals);

  return (
    <div className="field">
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="field-control">
        <input
          id={id}
          className="field-input tabular"
          inputMode={decimals > 0 ? "decimal" : "numeric"}
          autoComplete="off"
          placeholder={placeholder}
          value={text}
          onChange={(e) => {
            let next = sanitizeDecimalInput(e.target.value, decimals, allowNegative);
            let n = parseNumber(next);
            if (Number.isFinite(n) && max !== undefined && n > max) {
              n = max;
              next = toText(max, decimals);
            }
            setDraft({ text: next, value: n });
            onChange(n);
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
              aria-pressed={value === p.value}
              onClick={() => onChange(p.value)}
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
