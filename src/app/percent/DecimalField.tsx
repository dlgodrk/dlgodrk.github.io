"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import type { Preset } from "@/components/fields";
import { formatNumber, parseNumber } from "@/lib/format";
import { sanitizeDecimalInput, toggleSignText } from "@/lib/calc/percent";

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
 *
 * With `allowNegative`, a +/− button sits left of the box: the iOS decimal keypad has no minus
 * key, so without it iPhone users could only paste a negative value. This is why the box stays
 * local: the shared NumberField strips the minus sign.
 * Like NumberField, the hint is linked to the box with aria-describedby.
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
  const hintId = `${id}-hint`;
  const inputRef = useRef<HTMLInputElement>(null);
  // Whether the box had focus when the ± button was pressed, so typing can continue after the flip.
  const keepFocus = useRef(false);
  const [draft, setDraft] = useState(() => ({ text: toText(value, decimals), value }));
  const text = sameNumber(draft.value, value) ? draft.text : toText(value, decimals);
  const negative = /^\s*[-−]/.test(text);

  const apply = (raw: string) => {
    let next = sanitizeDecimalInput(raw, decimals, allowNegative);
    let n = parseNumber(next);
    if (Number.isFinite(n) && max !== undefined && n > max) {
      n = max;
      next = toText(max, decimals);
    }
    setDraft({ text: next, value: n });
    onChange(n);
  };

  return (
    <div className="field">
      <label htmlFor={id} id={`${id}-label`} className="field-label">
        {label}
      </label>
      <div className={allowNegative ? "field-control gap-2" : "field-control"}>
        {allowNegative ? (
          <button
            type="button"
            className="min-h-12 min-w-12 shrink-0 rounded-lg border border-rule-strong bg-sheet px-2 text-lg font-semibold text-ink hover:border-muted"
            aria-labelledby={`${id}-sign ${id}-label`}
            aria-pressed={negative}
            aria-controls={id}
            onPointerDown={() => {
              keepFocus.current = typeof document !== "undefined" && document.activeElement === inputRef.current;
            }}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              apply(toggleSignText(text));
              if (keepFocus.current) inputRef.current?.focus();
            }}
          >
            <span aria-hidden="true">+/−</span>
            <span id={`${id}-sign`} className="sr-only">
              음수 부호
            </span>
          </button>
        ) : null}
        <input
          ref={inputRef}
          id={id}
          className="field-input tabular"
          inputMode={decimals > 0 ? "decimal" : "numeric"}
          autoComplete="off"
          placeholder={placeholder}
          aria-describedby={hint ? hintId : undefined}
          value={text}
          onChange={(e) => apply(e.target.value)}
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
      {hint ? (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
