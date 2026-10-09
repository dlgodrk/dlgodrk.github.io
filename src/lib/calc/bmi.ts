/**
 * BMI (체질량지수) and Korean adult obesity classes.
 *
 * Classes: 대한비만학회 비만 진료지침 2022 (8판) — Kim KK et al., "Evaluation and Treatment of Obesity and
 * Its Comorbidities: 2022 Update of Clinical Practice Guidelines for Obesity by the Korean Society for the
 * Study of Obesity", J Obes Metab Syndr 2023;32(1):1-24, doi:10.7570/jomes23016, Table 2 (adults ≥ 18 years).
 * The society reaffirmed the BMI 25 obesity cut-off at its March 2025 spring congress; still current in 2026.
 *   저체중 < 18.5 · 정상 18.5–22.9 · 비만 전단계 23–24.9 · 1단계 비만 25–29.9 · 2단계 비만 30–34.9 · 3단계 비만 ≥ 35
 *   복부비만: 허리둘레 남 ≥ 90 cm, 여 ≥ 85 cm
 * WHO (international, https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight):
 *   overweight ≥ 25, obesity ≥ 30 (class I 30–34.9, II 35–39.9, III ≥ 40).
 *
 * Rounding policy: a class is decided on the raw BMI against the lower bounds (BMI < 23 is 정상), and the
 * one-decimal BMI we display never crosses a class boundary (raw 22.97 shows as 22.9, not 23.0), so the
 * number and the class always agree. Where a held value is written as arithmetic, `bmiEquation` gives "≈ 22.97"
 * instead of a wrong "= 22.9". Weight ranges are given on a 0.1 kg grid, matching the input field.
 */

export type Sex = "m" | "f";

export type BmiClassId = "under" | "normal" | "pre" | "ob1" | "ob2" | "ob3";

export type BmiClass = {
  id: BmiClassId;
  /** Full label, e.g. "1단계 비만" */
  label: string;
  /** Short label for the scale bar, e.g. "1단계" */
  short: string;
  /** Inclusive lower bound (BMI). 0 for 저체중. */
  min: number;
  /** Exclusive upper bound (BMI). null for the top class. */
  max: number | null;
  /** Range as written in the guideline, e.g. "18.5~22.9" */
  range: string;
};

export const BMI_CLASSES: readonly BmiClass[] = [
  { id: "under", label: "저체중", short: "저체중", min: 0, max: 18.5, range: "18.5 미만" },
  { id: "normal", label: "정상", short: "정상", min: 18.5, max: 23, range: "18.5~22.9" },
  { id: "pre", label: "비만 전단계", short: "전단계", min: 23, max: 25, range: "23~24.9" },
  { id: "ob1", label: "1단계 비만", short: "1단계", min: 25, max: 30, range: "25~29.9" },
  { id: "ob2", label: "2단계 비만", short: "2단계", min: 30, max: 35, range: "30~34.9" },
  { id: "ob3", label: "3단계 비만", short: "3단계", min: 35, max: null, range: "35 이상" },
];

export function getBmiClass(id: BmiClassId): BmiClass {
  return BMI_CLASSES.find((c) => c.id === id)!;
}

/** 복부비만 허리둘레 기준 (cm 이상). */
export const WAIST_CUTOFF_CM: Record<Sex, number> = { m: 90, f: 85 };

/** 표준체중 계수: 키(m)² × 22 (남), × 21 (여). A common Korean rule of thumb, not a diagnostic standard. */
export const STANDARD_WEIGHT_FACTOR: Record<Sex, number> = { m: 22, f: 21 };

const EPS = 1e-9;

/** Round to 1 decimal (half up, tolerant of binary noise such as 22.949999…). */
export function round1(n: number): number {
  return Math.round(n * 10 + 1e-6) / 10;
}

/** Height squared in m². */
export function heightM2(heightCm: number): number {
  return (heightCm * heightCm) / 10000;
}

/** BMI = 몸무게(kg) ÷ 키(m)². Written with cm² so whole-number inputs hit class boundaries exactly. */
export function calcBmi(heightCm: number, weightKg: number): number {
  return (weightKg * 10000) / (heightCm * heightCm);
}

/** 대한비만학회 class for a raw BMI. */
export function classifyBmi(bmi: number): BmiClass {
  for (let i = BMI_CLASSES.length - 1; i > 0; i--) {
    if (bmi + EPS >= BMI_CLASSES[i].min) return BMI_CLASSES[i];
  }
  return BMI_CLASSES[0];
}

/** One-decimal BMI for display that always stays inside its own class (22.97 → 22.9). */
export function displayBmi(bmi: number): number {
  const cls = classifyBmi(bmi);
  const r = round1(bmi);
  if (cls.max !== null && r >= cls.max) return round1(cls.max - 0.1);
  if (r < cls.min) return cls.min;
  return r;
}

/** "22.5" */
export function formatBmi(bmi: number): string {
  return displayBmi(bmi).toFixed(1);
}

export type BmiEquation = {
  /** "=" when the one-decimal value is ordinary rounding, "≈" when more decimals are shown. */
  op: "=" | "≈";
  /** Value to write after `op`, e.g. "22.5" or "22.96". */
  value: string;
  /** Class boundary the display was held under (e.g. 23), or null when the display is ordinary rounding. */
  heldBelow: number | null;
};

/**
 * BMI to write at the end of a worked division ("65 ÷ 2.89 = 22.5").
 * When the display was held under the next class (raw 22.96 shown as 22.9), ordinary rounding would read 23.0,
 * so "45 ÷ 1.96 = 22.9" would be wrong arithmetic. Then this returns "≈" with the fewest extra decimals that still
 * stay under the boundary ("45 ÷ 1.96 ≈ 22.96") and the boundary itself, so copy can say why 22.9 is shown.
 */
export function bmiEquation(bmi: number): BmiEquation {
  const shown = formatBmi(bmi);
  const max = classifyBmi(bmi).max;
  if (max === null || shown === round1(bmi).toFixed(1)) return { op: "=", value: shown, heldBelow: null };
  for (let d = 2; d <= 6; d++) {
    const v = bmi.toFixed(d);
    if (Number(v) < max) return { op: "≈", value: v, heldBelow: max };
  }
  return { op: "≈", value: shown, heldBelow: max };
}

/** "63.6" — weights always with one decimal. */
export function formatKg(kg: number): string {
  return round1(kg).toFixed(1);
}

/** Exact weight (kg) at which the BMI equals `bmi` for this height. */
export function weightAtBmi(heightCm: number, bmi: number): number {
  return (bmi * heightCm * heightCm) / 10000;
}

/** Smallest weight on the 0.1 kg grid whose BMI is ≥ `bmi`. */
export function minWeightAtOrAbove(heightCm: number, bmi: number): number {
  return Math.ceil((bmi * heightCm * heightCm) / 1000 - 1e-7) / 10;
}

/** Weight range (0.1 kg grid, both ends inclusive) that falls into a class. null = open end. */
export function classWeightRange(heightCm: number, cls: BmiClass): { min: number | null; max: number | null } {
  const min = cls.min > 0 ? minWeightAtOrAbove(heightCm, cls.min) : null;
  const max = cls.max !== null ? round1(minWeightAtOrAbove(heightCm, cls.max) - 0.1) : null;
  return { min, max };
}

/** 정상 체중 범위 (BMI 18.5 이상 23 미만) on the 0.1 kg grid. 170cm → 53.5~66.4kg. */
export function normalWeightRange(heightCm: number): { min: number; max: number } {
  const r = classWeightRange(heightCm, getBmiClass("normal"));
  return { min: r.min!, max: r.max! };
}

/** Human-readable weight range for a class, e.g. "53.5~66.4kg", "53.4kg 이하", "101.2kg 이상". */
export function classWeightLabel(heightCm: number, cls: BmiClass): string {
  const { min, max } = classWeightRange(heightCm, cls);
  if (min === null) return `${formatKg(max!)}kg 이하`;
  if (max === null) return `${formatKg(min)}kg 이상`;
  return `${formatKg(min)}~${formatKg(max)}kg`;
}

/** 표준체중 (참고): 키(m)² × 22 (남) / × 21 (여). */
export function standardWeight(heightCm: number, sex: Sex): number {
  return heightM2(heightCm) * STANDARD_WEIGHT_FACTOR[sex];
}

/** Where a weight sits relative to the normal range: kg below the lower end, above the upper end, or inside. */
export function normalRangeGap(heightCm: number, weightKg: number): { side: "below" | "inside" | "above"; kg: number } {
  const { min, max } = normalWeightRange(heightCm);
  const w = round1(weightKg);
  if (w < min) return { side: "below", kg: round1(min - w) };
  if (w > max) return { side: "above", kg: round1(w - max) };
  return { side: "inside", kg: 0 };
}

export type WhoClass = { label: string; range: string };

/** WHO international adult classification. */
export function whoClass(bmi: number): WhoClass {
  const b = bmi + EPS;
  if (b < 18.5) return { label: "저체중", range: "18.5 미만" };
  if (b < 25) return { label: "정상", range: "18.5~24.9" };
  if (b < 30) return { label: "과체중", range: "25~29.9" };
  if (b < 35) return { label: "비만 1단계", range: "30~34.9" };
  if (b < 40) return { label: "비만 2단계", range: "35~39.9" };
  return { label: "비만 3단계", range: "40 이상" };
}

/** Ends of the scale bar for the two open classes. */
export const SCALE_MIN_BMI = 15;
export const SCALE_MAX_BMI = 40;

/**
 * Position (0–1) on a scale bar made of six equal-width class segments.
 * Within a segment the position is linear in BMI; values beyond 15/40 stick to the ends.
 */
export function scalePosition(bmi: number): number {
  const cls = classifyBmi(bmi);
  const idx = BMI_CLASSES.indexOf(cls);
  const lo = idx === 0 ? SCALE_MIN_BMI : cls.min;
  const hi = cls.max ?? SCALE_MAX_BMI;
  const t = Math.min(1, Math.max(0, (bmi - lo) / (hi - lo)));
  return (idx + t) / BMI_CLASSES.length;
}

/** Valid input range for the calculator (adults). */
export const HEIGHT_RANGE = { min: 100, max: 250 } as const;
export const WEIGHT_RANGE = { min: 20, max: 300 } as const;

export function isValidInput(heightCm: number, weightKg: number): boolean {
  return (
    Number.isFinite(heightCm) &&
    Number.isFinite(weightKg) &&
    heightCm >= HEIGHT_RANGE.min &&
    heightCm <= HEIGHT_RANGE.max &&
    weightKg >= WEIGHT_RANGE.min &&
    weightKg <= WEIGHT_RANGE.max
  );
}

/**
 * 한국 성인 평균 키 (cm): 국가기술표준원 「제8차 한국인 인체치수조사」(2020.5.~2021.12. 측정, 20~69세 6,839명,
 * 2022. 3. 30. 발표) 남성 172.5cm, 여성 159.6cm. The latest published round as of 2026-10.
 */
export const KOREAN_AVG_HEIGHT_CM: Record<Sex, number> = { m: 172.5, f: 159.6 };

/**
 * Height bands for the per-height page copy:
 *   short  < 150 — below both averages, BMI swings fast
 *   female 150–164 — around the female average
 *   male   165–179 — around the male average
 *   tall   ≥ 180 — above the male average
 */
export type HeightBand = "short" | "female" | "male" | "tall";

export function heightBand(heightCm: number): HeightBand {
  if (heightCm < 150) return "short";
  if (heightCm < 165) return "female";
  if (heightCm < 180) return "male";
  return "tall";
}

/** BMI change for a weight change of `kg` at this height (1 kg at 170 cm ≈ 0.35). */
export function bmiPerKg(heightCm: number, kg = 1): number {
  return kg / heightM2(heightCm);
}

/** Width of the normal range on the 0.1 kg grid (170 cm: 66.4 − 53.5 = 12.9 kg). */
export function normalRangeWidth(heightCm: number): number {
  const { min, max } = normalWeightRange(heightCm);
  return round1(max - min);
}

/** Heights (cm) that get their own landing page: /bmi/<height>/ — 140 to 200, every 1 cm. */
export const BMI_PAGE_HEIGHTS: number[] = Array.from({ length: 61 }, (_, i) => 140 + i);

/** Weights for the per-height BMI table: every 5 kg from about BMI 17 to just past BMI 35. */
export function weightTableFor(heightCm: number): number[] {
  const start = Math.floor(weightAtBmi(heightCm, 17) / 5) * 5;
  const end = Math.ceil(weightAtBmi(heightCm, 35) / 5) * 5;
  const out: number[] = [];
  for (let w = start; w <= end; w += 5) out.push(w);
  return out;
}

/** Neighbouring page heights around `heightCm` (inclusive), clipped to the page list. */
export function neighborHeights(heightCm: number, span = 4): number[] {
  return BMI_PAGE_HEIGHTS.filter((h) => Math.abs(h - heightCm) <= span);
}

/** Default weight for a height page: 남성 표준체중 rounded to a whole kg (BMI ≈ 22). */
export function defaultWeightFor(heightCm: number): number {
  return Math.round(standardWeight(heightCm, "m"));
}
