"use client";

import { useId, useState, type ReactNode } from "react";
import { parseNumber } from "@/lib/format";
import type { Preset } from "@/components/fields";

/**
 * Hours input that accepts one decimal typed key by key ("4" → "4." → "4.5").
 *
 * Local stand-in for the shared NumberField with decimals > 0: that field renders String(value),
 * so the trailing "." of "4." is dropped on re-render and the next key gives "45" (clamped to 24).
 * This field keeps the typed text while it still parses to the current value, so "4." and "0."
 * survive, and falls back to the value whenever it changes from elsewhere (presets, URL, clamp).
 * Same markup and classes as NumberField.
 */
export function HoursField({
  label,
  value,
  onChange,
  unit,
  hint,
  presets,
  max,
}: {
  label: ReactNode;
  value: number;
  onChange: (n: number) => void;
  unit?: string;
  hint?: ReactNode;
  presets?: Preset[];
  max?: number;
}) {
  const id = useId();
  const [text, setText] = useState<string | null>(null);
  const formatted = Number.isFinite(value) ? String(value) : "";
  const display = text !== null && sameNumber(parseNumber(text), value) ? text : formatted;

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
          value={display}
          onChange={(e) => {
            const raw = sanitize(e.target.value);
            let n = parseNumber(raw);
            if (Number.isFinite(n) && max !== undefined && n > max) n = max;
            setText(raw);
            onChange(n);
          }}
          onBlur={() => setText(null)}
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
              aria-pressed={value === p.value}
              onClick={() => {
                setText(null);
                onChange(p.value);
              }}
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

/** Digits and one dot with at most one fraction digit; "." alone becomes "0.". */
function sanitize(input: string): string {
  const cleaned = input.replace(/[^\d.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  if (!rest.length) return whole;
  return `${whole || "0"}.${rest.join("").slice(0, 1)}`;
}

function sameNumber(a: number, b: number): boolean {
  return Number.isNaN(a) ? Number.isNaN(b) : a === b;
}
