/**
 * 2026 근로자 4대보험 (employee share) — integer arithmetic only.
 *
 * Sources (checked 2026-10-09):
 * - 국민연금 9.5% (근로자 4.75%): 국민연금법 개정 법률 제20903호 (2025-04-02). 기준소득월액 상·하한
 *   2025.7~2026.6: 400,000~6,370,000원 / 2026.7~2027.6: 410,000~6,590,000원 (4insure.or.kr).
 *   기준소득월액 천원 미만 절사, 기여금 10원 미만 절사.
 * - 건강보험 7.19% (근로자 3.595%), 10원 미만 절사, 월 보험료 상·하한(근로자분) 4,591,740 / 10,080원
 *   (보건복지부고시 제2025-222호).
 * - 장기요양 0.9448% of 보수월액 = 건강보험료 × 0.9448/7.19 (2026년 1~10월분).
 *   2026년 11월분부터 비율을 소수점 다섯째 자리에서 반올림한 0.1314 적용 (노인장기요양보험법 법률 제21690호).
 * - 고용보험 근로자 0.9%, 10원 미만 절사, 상·하한 없음.
 * Every formula reproduces the official 4insure.or.kr simulator outputs (see insurance.test.ts).
 */

export type PayMonth = `${number}-${string}`; // "YYYY-MM"

export const INSURANCE_YEAR = 2026;

export const RATES_2026 = {
  pensionEmployee: 0.0475,
  healthEmployee: 0.03595,
  longTermCareOfIncome: 0.009448,
  longTermCareRatio: 0.1314, // of 건강보험료 (published, rounded)
  employmentEmployee: 0.009,
} as const;

const floor10 = (x: number) => Math.floor(x / 10) * 10;

/** 국민연금 기준소득월액 상·하한 for a pay month. */
export function pensionBounds(payMonth: string): { low: number; high: number } {
  return payMonth < "2026-07" ? { low: 400_000, high: 6_370_000 } : { low: 410_000, high: 6_590_000 };
}

export type InsuranceBreakdown = {
  pension: number;
  health: number;
  longTermCare: number;
  employment: number;
  total: number;
  /** 국민연금 기준소득월액 actually used (after 천원 절사 and caps). */
  pensionBase: number;
};

/**
 * Employee-side monthly premiums.
 * @param monthlyTaxable 월 과세 급여 (총 지급액 − 비과세), 원
 * @param payMonth "YYYY-MM" of the pay period (affects pension caps and 장기요양 rounding)
 * @param opts.pensionExempt true for workers no longer enrolled (e.g. 만 60세 이상)
 * @param opts.employmentExempt true for workers excluded from 실업급여 premiums (e.g. 65세 이후 신규 취업)
 */
export function employeeInsurance(
  monthlyTaxable: number,
  payMonth: string,
  opts: { pensionExempt?: boolean; employmentExempt?: boolean } = {},
): InsuranceBreakdown {
  const pay = Math.max(0, Math.floor(monthlyTaxable));
  if (pay === 0) return { pension: 0, health: 0, longTermCare: 0, employment: 0, total: 0, pensionBase: 0 };

  const { low, high } = pensionBounds(payMonth);
  const pensionBase = Math.min(Math.max(Math.floor(pay / 1000) * 1000, low), high);
  // floor10(base × 4.75%) = floor(base × 475 / 100000) × 10, exact in integers
  const pension = opts.pensionExempt ? 0 : Math.floor((pensionBase * 475) / 100_000) * 10;

  // floor10(pay × 3.595%) = floor(pay × 3595 / 1,000,000) × 10
  let health = Math.floor((pay * 3595) / 1_000_000) * 10;
  health = Math.min(Math.max(health, 10_080), 4_591_740);

  const longTermCare =
    payMonth < "2026-11"
      ? Math.floor((health * 9448) / 719_000) * 10 // floor10(health × 0.9448 / 7.19)
      : Math.floor((health * 1314) / 100_000) * 10; // floor10(health × 0.1314)

  const employment = opts.employmentExempt ? 0 : Math.floor((pay * 9) / 10_000) * 10;

  return {
    pension,
    health,
    longTermCare,
    employment,
    total: pension + health + longTermCare + employment,
    pensionBase,
  };
}

/** Clamp any date's month into the 2026 rule window this site implements. */
export function rulePayMonth(y: number, m: number): string {
  if (y < 2026) return "2026-01";
  if (y > 2026) return "2026-12";
  return `2026-${String(m).padStart(2, "0")}`;
}

export { floor10 };
