"use client";

import { useId, useState, type ReactNode } from "react";
import { formatNumber, parseNumber } from "@/lib/format";

/**
 * Form controls shared by every calculator. All are controlled components.
 * Layout: label on top, control, then an optional hint line.
 */

function FieldFrame({
  id,
  label,
  hint,
  children,
  aside,
}: {
  id: string;
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="field">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="field-label">
          {label}
        </label>
        {aside ? <span className="text-sm text-muted tabular">{aside}</span> : null}
      </div>
      {children}
      {hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

export type Preset = { label: string; value: number };

/**
 * Numeric input with thousands separators and an optional unit suffix.
 * `value` may be NaN when the box is empty.
 * `reading` renders a helper under the input, e.g. n => koreanWon(n).
 */
export function NumberField({
  label,
  value,
  onChange,
  unit,
  hint,
  presets,
  reading,
  decimals = 0,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept in the API; see prop docs
  min,
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
  reading?: (n: number) => ReactNode;
  /** Allowed fraction digits (0 = integers only). */
  decimals?: number;
  /** Documented lower bound. Not enforced while typing; calculators validate it themselves. */
  min?: number;
  max?: number;
  placeholder?: string;
  aside?: ReactNode;
}) {
  const id = useId();
  // While the user is typing we keep their exact text (e.g. "3.", "3.50", "0.0") so the
  // controlled input never swallows a decimal point. The draft is used only while it still
  // parses to the current value; any outside change (preset, mode switch) shows the value.
  const [draft, setDraft] = useState<string | null>(null);
  const formatted = Number.isFinite(value) ? formatNumber(value, decimals) : "";
  const draftValue = draft === null ? NaN : parseNumber(draft);
  const draftMatches =
    draft !== null && (draft === "" ? !Number.isFinite(value) : Number.isFinite(draftValue) && draftValue === value);
  const display = draftMatches ? (draft as string) : formatted;
  return (
    <FieldFrame id={id} label={label} hint={hint} aside={aside}>
      <div className="field-control">
        <input
          id={id}
          className="field-input tabular"
          inputMode={decimals > 0 ? "decimal" : "numeric"}
          autoComplete="off"
          placeholder={placeholder}
          value={display}
          onBlur={() => setDraft(null)}
          onChange={(e) => {
            let raw = e.target.value.replace(/[^\d.,]/g, "");
            if (decimals > 0) {
              const [i, ...rest] = raw.replace(/,/g, "").split(".");
              raw = rest.length ? `${i}.${rest.join("").slice(0, decimals)}` : i;
            } else {
              raw = raw.replace(/\./g, "");
            }
            let n = parseNumber(raw);
            // Clamp only the upper bound while typing; a lower bound would fight
            // the user mid-entry (typing "15" passes through "1"). Calculators
            // validate the lower bound themselves.
            if (Number.isFinite(n) && max !== undefined && n > max) {
              n = max;
              raw = String(max);
            }
            // Integers get live thousands separators; decimals keep the raw text.
            setDraft(decimals > 0 ? raw : Number.isFinite(n) ? formatNumber(n) : "");
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
              onClick={() => {
                setDraft(null);
                onChange(p.value);
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      ) : null}
    </FieldFrame>
  );
}

/** Segmented single choice (radio group styled as buttons). */
export function SegmentedField<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: ReactNode;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="field" role="radiogroup" aria-labelledby={id}>
      <span id={id} className="field-label">
        {label}
      </span>
      <div className="segmented">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            className="segment"
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
      {hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: ReactNode;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <FieldFrame id={id} label={label} hint={hint}>
      <div className="field-control">
        <select id={id} className="field-input field-select" value={value} onChange={(e) => onChange(e.target.value as T)}>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </FieldFrame>
  );
}

/** Native date picker. Value is "YYYY-MM-DD" or "". */
export function DateField({
  label,
  value,
  onChange,
  hint,
  min,
  max,
  aside,
}: {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  hint?: ReactNode;
  min?: string;
  max?: string;
  aside?: ReactNode;
}) {
  const id = useId();
  return (
    <FieldFrame id={id} label={label} hint={hint} aside={aside}>
      <div className="field-control">
        <input
          id={id}
          type="date"
          className="field-input tabular"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </FieldFrame>
  );
}

/** Integer stepper with − / + buttons, e.g. number of dependents. */
export function StepperField({
  label,
  value,
  onChange,
  min = 0,
  max = 20,
  unit,
  hint,
}: {
  label: ReactNode;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  unit?: string;
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <FieldFrame id={id} label={label} hint={hint}>
      <div className="stepper">
        <button type="button" aria-label="하나 줄이기" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}>
          −
        </button>
        <output id={id} className="tabular" aria-live="polite">
          {value}
          {unit ? <span className="ml-0.5 text-muted">{unit}</span> : null}
        </output>
        <button type="button" aria-label="하나 늘리기" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max}>
          +
        </button>
      </div>
    </FieldFrame>
  );
}

export function CheckboxField({
  label,
  checked,
  onChange,
  hint,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: ReactNode;
}) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id} className="flex cursor-pointer items-center gap-2.5">
        <input id={id} type="checkbox" className="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="text-ink">{label}</span>
      </label>
      {hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}

/** Multi-line text input (used by the character counter). */
export function TextAreaField({
  label,
  value,
  onChange,
  rows = 10,
  placeholder,
  aside,
}: {
  label: ReactNode;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  aside?: ReactNode;
}) {
  const id = useId();
  return (
    <FieldFrame id={id} label={label} aside={aside}>
      <textarea
        id={id}
        className="field-input field-textarea"
        rows={rows}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </FieldFrame>
  );
}
