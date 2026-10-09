import { calcSalary, SALARY_PAGE_MANWON, type SalaryInput, type SalaryResult } from "./salary";
import { manwonToWon, PAGE_ASSUMPTIONS } from "./salary-ui";

/**
 * Helpers for the 세전 월급 pages at /salary/monthly/<만원>/ ("월급 300만원 실수령액").
 * Pure functions only; the money math stays in salary.ts (calcSalary).
 */

/** 세전 월급 (만원) values with their own page: 150만~600만원은 10만원, 650만~1,000만원은 50만원 간격. */
export const MONTHLY_PAGE_MANWON: number[] = [
  ...Array.from({ length: (600 - 150) / 10 + 1 }, (_, i) => 150 + i * 10),
  ...Array.from({ length: (1_000 - 650) / 50 + 1 }, (_, i) => 650 + i * 50),
];

/** Path of a 월급 page. Lives under the static "monthly" folder, beside the numeric /salary/<연봉>/ pages. */
export function monthlyPagePath(monthlyManwon: number): string {
  return `/salary/monthly/${monthlyManwon}/`;
}

/**
 * calcSalary for a 세전 월급 in 만원 under the page assumptions (비과세 20만원, 본인 1명, 100%, 2026년 10월분).
 * 월급 × 12 goes in as 연봉 and calcSalary divides by 12 again, so monthlyGross is exactly the 월급.
 * 퇴직금 포함 does not apply to a monthly amount.
 */
export function salaryForMonthlyManwon(monthlyManwon: number, overrides: Partial<SalaryInput> = {}): SalaryResult {
  return calcSalary({ ...PAGE_ASSUMPTIONS, ...overrides, annual: manwonToWon(monthlyManwon) * 12, severanceIncluded: false });
}

/**
 * Entries of a sorted list that bracket a value: [v] on an exact hit, otherwise the nearest entry below
 * and above. Empty when the value is outside the list (no page would be relevant).
 */
export function bracketPages(value: number, list: number[]): number[] {
  if (!Number.isFinite(value) || list.length === 0) return [];
  if (list.includes(value)) return [value];
  if (value < list[0] || value > list[list.length - 1]) return [];
  const above = list.findIndex((v) => v > value);
  return [list[above - 1], list[above]];
}

/** 월급 pages nearest to a monthly gross pay in 원 (e.g. 3,333,333원 → [330, 340]; 3,000,000원 → [300]). */
export function monthlyPagesNear(monthlyGrossWon: number): number[] {
  return bracketPages(monthlyGrossWon / 10_000, MONTHLY_PAGE_MANWON);
}

/** 연봉 pages nearest to 월급 × 12 (e.g. 월급 310만원 → 연봉 3,720만원 → [3700, 3800]; 300만원 → [3600]). */
export function annualPagesNear(monthlyManwon: number): number[] {
  return bracketPages(monthlyManwon * 12, SALARY_PAGE_MANWON);
}

/** Up to 2×radius+1 neighbours of a 월급 page (window shifted at the ends). */
export function monthlyNeighbors(monthlyManwon: number, radius = 4): number[] {
  const idx = MONTHLY_PAGE_MANWON.indexOf(monthlyManwon);
  if (idx < 0) return [];
  const size = Math.min(MONTHLY_PAGE_MANWON.length, radius * 2 + 1);
  const start = Math.min(Math.max(0, idx - radius), MONTHLY_PAGE_MANWON.length - size);
  return MONTHLY_PAGE_MANWON.slice(start, start + size);
}

/** Step to the next 월급 page (10만원 up to 600만원, then 50만원). */
export function monthlyStep(monthlyManwon: number): number {
  return monthlyManwon >= 600 ? 50 : 10;
}

/** Groups for the link grid of all 월급 pages. */
export function monthlyPageGroups(list: number[] = MONTHLY_PAGE_MANWON): { title: string; items: number[] }[] {
  return [
    { title: "월급 150만~300만원", items: list.filter((m) => m <= 300) },
    { title: "월급 310만~450만원", items: list.filter((m) => m > 300 && m <= 450) },
    { title: "월급 460만~600만원", items: list.filter((m) => m > 450 && m <= 600) },
    { title: "월급 650만~1,000만원", items: list.filter((m) => m > 600) },
  ].filter((g) => g.items.length > 0);
}

/** 월 비과세 columns of the per-page table: 없음, 식대 20만원. */
export const MONTHLY_NON_TAXABLE_COLUMNS = [
  { key: "0", label: "비과세 없음", nonTaxable: 0 },
  { key: "20", label: "식대 20만원 비과세", nonTaxable: 200_000 },
] as const;

/**
 * Pay month whose rules stand in for 2027 in the estimate: 2026년 12월분 (국민연금 기준소득월액
 * 410,000~6,590,000원 until 2027년 6월, 장기요양 = 건강보험료 × 13.14%). Same choice as hourly-wage.
 */
export const ESTIMATE_2027_PAY_MONTH = "2026-12";

/**
 * 2027년 1~6월분 예상. Applies the legislated 국민연금 rise (근로자 4.75% → 5.0%, 국민연금법 개정 법률 제20903호)
 * and keeps the frozen 건강보험료율 7.19% (건정심 2026-09-08 의결, 고시 전). 장기요양·고용보험 요율과
 * 간이세액표 are not set yet, so they stay at 2026 values. Only the 국민연금 line changes.
 */
export function estimate2027(
  monthlyManwon: number,
  overrides: Partial<SalaryInput> = {},
): { base: SalaryResult; pension: number; pensionDiff: number; monthlyNet: number } {
  const base = salaryForMonthlyManwon(monthlyManwon, { ...overrides, payMonth: ESTIMATE_2027_PAY_MONTH });
  // floor10(기준소득월액 × 5.0%) in integers
  const pension = Math.floor((base.insurance.pensionBase * 500) / 100_000) * 10;
  const pensionDiff = pension - base.insurance.pension;
  return { base, pension, pensionDiff, monthlyNet: base.monthlyNet - pensionDiff };
}
