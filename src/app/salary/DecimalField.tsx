"use client";

import { useId, useState, type ReactNode } from "react";
import type { Preset } from "@/components/fields";
import { formatNumber, parseNumber } from "@/lib/format";
import { sanitizeDecimalDraft } from "@/lib/calc/salary-ui";

/**
 * Decimal number box for the 월급 (만원) input. Same markup and classes as the shared NumberField,
 * but it keeps the text being typed ("312.", "312.50") in local state and parses it only for the
 * calculation. The shared field passes "312." up as 312 and renders "312" again, so the dot was lost
 * and 312.5 typed key by key became 3125 (10x the pay).
 * When `value` changes from outside (URL, 연봉↔월급 switch, table row click) the box shows that value.
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
  reading,
  decimals,
  max,
}: {
  label: ReactNode;
  value: number;
  onChange: (n: number) => void;
  unit?: string;
  hint?: ReactNode;
  presets?: Preset[];
  reading?: (n: number) => ReactNode;
  /** Allowed fraction digits. */
  decimals: number;
  max?: number;
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
      </div>
      <div className="field-control">
        <input
          id={id}
          className="field-input tabular"
          inputMode="decimal"
          autoComplete="off"
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
