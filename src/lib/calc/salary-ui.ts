import { calcSalary, DEFAULT_NON_TAXABLE, DEFAULT_PAY_MONTH, SALARY_PAGE_MANWON, type SalaryInput, type SalaryResult } from "./salary";
import { pensionBounds } from "@/lib/rates/insurance";
import { bracketOf, type WithholdingRatio } from "@/lib/rates/withholding";
import { MINIMUM_WAGE, MONTHLY_STANDARD_HOURS, minimumMonthly } from "@/lib/rates/labor";
import { formatNumber, manwonLabel } from "@/lib/format";

/**
 * UI-side helpers for the 연봉 실수령액 calculator (form → engine input, 연봉↔월급 conversion,
 * nearby-salary tables, page copy numbers). Pure functions only; the money math lives in salary.ts.
 */

/** 입력 기준: y = 연봉, m = 월급 */
export type SalaryMode = "y" | "m";

/** Input caps (만원): 연봉 100억, 월급 10억. */
export const MAX_ANNUAL_MANWON = 1_000_000;
export const MAX_MONTHLY_MANWON = 100_000;
/** 비과세 input cap (원). */
export const MAX_NON_TAXABLE = 100_000_000;

export const ANNUAL_PRESETS_MANWON = [2_400, 3_000, 3_600, 4_000, 5_000, 6_000, 8_000, 10_000];
export const MONTHLY_PRESETS_MANWON = [200, 250, 300, 350, 400, 500];

/** 공제대상가족 수 range used by the stepper (본인 포함). */
export const MIN_FAMILY = 1;
export const MAX_FAMILY = 11;

/** 만원 (may carry up to 4 decimals for 원 precision) → 원 */
export function manwonToWon(manwon: number): number {
  return Math.round(manwon * 10_000);
}

/** Integer 만원 below the amount, the way Koreans read money (3,079,800원 → 307). */
export function floorManwon(won: number): number {
  return Math.floor(won / 10_000);
}

/** 원 → whole-만원 reading with 억: 35,223,756 → "3,522만원", 190,033,440 → "1억 9,003만원". */
export function manwonFloorLabel(won: number): string {
  return manwonLabel(floorManwon(won));
}

export function monthsPerYear(severanceIncluded: boolean): 12 | 13 {
  return severanceIncluded ? 13 : 12;
}

/** 연봉(만원) → 세전 월급(만원, 원 단위까지 정확하도록 소수 4자리). Same floor as calcSalary. */
export function annualToMonthlyManwon(annualManwon: number, severanceIncluded = false): number {
  const monthlyWon = Math.floor(manwonToWon(annualManwon) / monthsPerYear(severanceIncluded));
  return monthlyWon / 10_000;
}

/** 월급(만원) → 연봉(만원, 만원 단위 반올림). */
export function monthlyToAnnualManwon(monthlyManwon: number, severanceIncluded = false): number {
  return Math.round((manwonToWon(monthlyManwon) * monthsPerYear(severanceIncluded)) / 10_000);
}

/** Convert the amount field when the user flips 연봉 ↔ 월급 so the result stays the same. */
export function convertAmount(value: number, from: SalaryMode, to: SalaryMode, severanceIncluded = false): number {
  if (from === to || !Number.isFinite(value)) return value;
  return to === "m" ? annualToMonthlyManwon(value, severanceIncluded) : monthlyToAnnualManwon(value, severanceIncluded);
}

export function normalizeRatio(r: number): WithholdingRatio {
  return r === 80 || r === 120 ? r : 100;
}

export function clampFamily(n: number): number {
  if (!Number.isFinite(n)) return MIN_FAMILY;
  return Math.min(Math.max(Math.floor(n), MIN_FAMILY), MAX_FAMILY);
}

/** 8~20세 자녀 수 must be counted inside 공제대상가족, so at most family − 1. */
export function clampChildren(children: number, family: number): number {
  if (!Number.isFinite(children)) return 0;
  return Math.min(Math.max(Math.floor(children), 0), Math.max(clampFamily(family) - 1, 0));
}

export type SalaryForm = {
  mode: SalaryMode;
  /** 연봉 or 월급 in 만원 */
  amountManwon: number;
  severanceIncluded: boolean;
  /** 월 비과세 (원); NaN/empty counts as 0 */
  nonTaxable: number;
  family: number;
  children: number;
  ratio: number;
  payMonth: string;
};

/** Form state → engine input. Returns null when the amount is empty or not positive. */
export function salaryInputFromForm(f: SalaryForm): SalaryInput | null {
  if (!Number.isFinite(f.amountManwon) || f.amountManwon <= 0) return null;
  const won = manwonToWon(f.amountManwon);
  if (won <= 0) return null;
  const family = clampFamily(f.family);
  return {
    // 월급 mode: 월급 × 12 divided by 12 again in calcSalary gives back the exact monthly pay.
    annual: f.mode === "m" ? won * 12 : won,
    severanceIncluded: f.mode === "y" && f.severanceIncluded,
    nonTaxable: Number.isFinite(f.nonTaxable) ? Math.max(0, Math.floor(f.nonTaxable)) : 0,
    family,
    children: clampChildren(f.children, family),
    ratio: normalizeRatio(f.ratio),
    payMonth: f.payMonth,
  };
}

/** Default assumptions used by the static pages: 비과세 20만원, 본인 1명, 100%, 2026년 10월분. */
export const PAGE_ASSUMPTIONS = {
  nonTaxable: DEFAULT_NON_TAXABLE,
  family: 1,
  children: 0,
  ratio: 100 as WithholdingRatio,
  payMonth: DEFAULT_PAY_MONTH,
};

/** calcSalary for 연봉 in 만원 under the page assumptions (overridable). */
export function salaryForManwon(annualManwon: number, overrides: Partial<SalaryInput> = {}): SalaryResult {
  return calcSalary({ annual: manwonToWon(annualManwon), ...PAGE_ASSUMPTIONS, ...overrides });
}

/** Whether the 국민연금 기준소득월액 상·하한 changed the base for this pay. */
export function pensionLimit(monthlyTaxable: number, payMonth: string): "cap" | "floor" | null {
  if (!(monthlyTaxable > 0)) return null;
  const { low, high } = pensionBounds(payMonth);
  const base = Math.floor(monthlyTaxable / 1000) * 1000;
  if (base > high) return "cap";
  if (base < low) return "floor";
  return null;
}

/**
 * First pay month whose 장기요양보험료 is 건강보험료 × 0.1314 (ratio rounded at the 5th decimal,
 * 노인장기요양보험법 법률 제21690호). Earlier months use the exact 0.9448 / 7.19. Mirrors insurance.ts.
 */
export const LTC_ROUNDED_FROM = "2026-11";

/** Multiplier on 건강보험료 that gives 장기요양보험료 in a pay month, as page text. */
export function longTermCareMultiplier(payMonth: string): string {
  return payMonth < LTC_ROUNDED_FROM ? "0.9448 ÷ 7.19 (약 13.14%)" : "13.14%";
}

/**
 * Text being typed into a decimal box: digits and one dot, at most `decimals` fraction digits,
 * integer part grouped with commas, leading zeros dropped ("0312.50" → "312.50", "." → "0.").
 * The trailing dot is kept so 312 → 312. → 312.5 can be typed key by key.
 */
export function sanitizeDecimalDraft(raw: string, decimals: number): string {
  const body = raw.replace(/[^\d.]/g, "");
  const [intRaw, ...rest] = body.split(".");
  const hasDot = decimals > 0 && rest.length > 0;
  let int = intRaw.replace(/^0+(?=\d)/, "");
  if (hasDot && int === "") int = "0";
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return hasDot ? `${grouped}.${rest.join("").slice(0, decimals)}` : grouped;
}

/** "2026-10" → "2026년 10월" */
export function payMonthLabel(payMonth: string): string {
  const [y, m] = payMonth.split("-");
  return `${Number(y)}년 ${Number(m)}월`;
}

/** 간이세액표 row the monthly taxable pay falls into, as text. */
export function taxBracketLabel(monthlyTaxable: number): string {
  if (monthlyTaxable < 770_000) return "월 77만원 미만 (세액 없음)";
  if (monthlyTaxable > 10_000_000) return "월 1,000만원 초과 (표 끝의 산식 적용)";
  if (monthlyTaxable === 10_000_000) return "월 1,000만원 행";
  const b = bracketOf(monthlyTaxable)!;
  return `${formatNumber(b.lo)}천원 이상 ${formatNumber(b.hi)}천원 미만`;
}

/** 통상시급 환산 (월급 ÷ 209시간, 원 단위 반올림). */
export function hourlyFromMonthly(monthlyGross: number): number {
  return Math.round(monthlyGross / MONTHLY_STANDARD_HOURS);
}

/** Monthly pay vs the 209-hour 최저임금 월 환산액 of a year. */
export function minimumWageGap(monthlyGross: number, year: number): { minMonthly: number; diff: number; hourlyMin: number } {
  const minMonthly = minimumMonthly(year);
  return { minMonthly, diff: monthlyGross - minMonthly, hourlyMin: MINIMUM_WAGE[year] ?? MINIMUM_WAGE[2026] };
}

/** Step between rows of the "주변 실수령액" table in the calculator. */
export function tableStep(mode: SalaryMode, valueManwon: number): number {
  if (mode === "m") return valueManwon >= 1_000 ? 100 : 10;
  return valueManwon >= 10_000 ? 500 : 100;
}

/**
 * Amounts (만원) for the in-calculator table: a ±radius grid around the input, rounded to the step,
 * plus the exact input if it is off the grid. Only positive values.
 */
export function nearbyAmounts(valueManwon: number, mode: SalaryMode, radius = 5): number[] {
  if (!Number.isFinite(valueManwon) || valueManwon <= 0) return [];
  const step = tableStep(mode, valueManwon);
  const center = Math.round(valueManwon / step) * step;
  const list: number[] = [];
  for (let k = -radius; k <= radius; k++) {
    const v = center + k * step;
    if (v > 0) list.push(v);
  }
  if (!list.some((v) => Math.abs(v - valueManwon) < 1e-9)) list.push(valueManwon);
  return list.sort((a, b) => a - b);
}

/** Up to 2×radius+1 neighbours of a page value inside SALARY_PAGE_MANWON (window shifted at the ends). */
export function pageNeighbors(manwon: number, radius = 5, list: number[] = SALARY_PAGE_MANWON): number[] {
  const idx = list.indexOf(manwon);
  if (idx < 0) return [];
  const size = Math.min(list.length, radius * 2 + 1);
  const start = Math.min(Math.max(0, idx - radius), list.length - size);
  return list.slice(start, start + size);
}

/** Effect of a raise on monthly take-home under the same assumptions. */
export function raiseEffect(
  annualManwon: number,
  raiseManwon = 100,
  overrides: Partial<SalaryInput> = {},
): { grossDiff: number; netDiff: number; keepRate: number } {
  const a = salaryForManwon(annualManwon, overrides);
  const b = salaryForManwon(annualManwon + raiseManwon, overrides);
  const grossDiff = b.monthlyGross - a.monthlyGross;
  const netDiff = b.monthlyNet - a.monthlyNet;
  return { grossDiff, netDiff, keepRate: grossDiff > 0 ? netDiff / grossDiff : 0 };
}

/** 부양가족 scenarios shown on every /salary/<만원>/ page. */
export const FAMILY_SCENARIOS = [
  { key: "1", label: "1인 (본인)", family: 1, children: 0 },
  { key: "2", label: "2인 (본인+배우자)", family: 2, children: 0 },
  { key: "3", label: "3인 (8~20세 자녀 1명)", family: 3, children: 1 },
  { key: "4", label: "4인 (8~20세 자녀 2명)", family: 4, children: 2 },
] as const;

/** Groups for the link grid of all salary pages. */
export function salaryPageGroups(list: number[] = SALARY_PAGE_MANWON): { title: string; items: number[] }[] {
  return [
    { title: "연봉 1,500만~5,000만원", items: list.filter((m) => m <= 5_000) },
    { title: "연봉 5,100만~1억원", items: list.filter((m) => m > 5_000 && m <= 10_000) },
    { title: "연봉 1억원 초과", items: list.filter((m) => m > 10_000) },
  ].filter((g) => g.items.length > 0);
}
