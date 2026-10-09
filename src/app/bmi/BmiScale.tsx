import { BMI_CLASSES, classifyBmi, formatBmi, scalePosition, type BmiClassId } from "@/lib/calc/bmi";

/**
 * Horizontal BMI scale: six equal segments (저체중 → 3단계 비만) with a marker at the user's BMI.
 * Colours are a diverging ramp built from the site tokens (blue for under, neutral for normal,
 * deepening 인주 red for the obesity classes), so they adapt to dark mode automatically.
 */
const SEGMENT_BG: Record<BmiClassId, string> = {
  under: "color-mix(in srgb, var(--link) 40%, var(--sheet))",
  normal: "color-mix(in srgb, var(--ink) 10%, var(--sheet))",
  pre: "color-mix(in srgb, var(--seal) 24%, var(--sheet))",
  ob1: "color-mix(in srgb, var(--seal) 44%, var(--sheet))",
  ob2: "color-mix(in srgb, var(--seal) 66%, var(--sheet))",
  ob3: "color-mix(in srgb, var(--seal) 88%, var(--sheet))",
};

const BOUNDARIES = BMI_CLASSES.slice(1).map((c) => c.min);

export function BmiScale({ bmi }: { bmi: number }) {
  const cls = classifyBmi(bmi);
  const pos = scalePosition(bmi) * 100;
  const n = BMI_CLASSES.length;
  return (
    <div
      className="px-5 pt-1 pb-5"
      role="img"
      aria-label={`BMI ${formatBmi(bmi)}: 대한비만학회 기준 ${cls.label} 구간 (BMI ${cls.range})`}
    >
      <div aria-hidden className="relative h-[2.875rem]">
        <span
          className="absolute top-0 -translate-x-1/2 rounded bg-ink px-1.5 py-px text-xs leading-5 font-bold whitespace-nowrap text-sheet tabular"
          style={{ left: `clamp(1.25rem, ${pos}%, calc(100% - 1.25rem))` }}
        >
          {formatBmi(bmi)}
        </span>
        <div className="absolute inset-x-0 top-7 flex h-3 overflow-hidden rounded-full">
          {BMI_CLASSES.map((c) => (
            <span key={c.id} className="h-full flex-1" style={{ background: SEGMENT_BG[c.id] }} />
          ))}
        </div>
        <span
          className="absolute top-[1.375rem] h-6 w-1 -translate-x-1/2 rounded-full bg-ink ring-2 ring-sheet"
          style={{ left: `${pos}%` }}
        />
      </div>
      <div aria-hidden className="relative mt-1 h-4 text-[0.6875rem] leading-4 text-muted tabular">
        {BOUNDARIES.map((b, i) => (
          <span key={b} className="absolute -translate-x-1/2" style={{ left: `${((i + 1) / n) * 100}%` }}>
            {b}
          </span>
        ))}
      </div>
      <div aria-hidden className="mt-1 grid grid-cols-6 text-center text-[0.6875rem] leading-tight sm:text-xs">
        {BMI_CLASSES.map((c) => (
          <span key={c.id} className={c.id === cls.id ? "font-bold text-ink" : "text-muted"}>
            {c.short}
          </span>
        ))}
      </div>
    </div>
  );
}
