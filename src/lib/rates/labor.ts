/**
 * Labor-law numbers (checked 2026-10-09; details and sources in docs/research/labor-2026.md).
 */

/** 시간급 최저임금 by year (원). 2027 was decided 2026-07-14 and published 2026-08-05. */
export const MINIMUM_WAGE: Record<number, number> = {
  2025: 10_030,
  2026: 10_320,
  2027: 10_700,
};

/** Standard monthly paid hours for a 40h week incl. 주휴 (= 48 × 365/7/12 ≈ 208.57 → 209). */
export const MONTHLY_STANDARD_HOURS = 209;

export function minimumWage(year: number): number {
  return MINIMUM_WAGE[year] ?? MINIMUM_WAGE[2026];
}

/** 월 환산 최저임금 (209시간). 2026: 2,156,880원, 2027: 2,236,300원. */
export function minimumMonthly(year: number): number {
  return minimumWage(year) * MONTHLY_STANDARD_HOURS;
}

/** 구직급여 1일 상한액 by 이직 연도 (2027 not yet set as of 2026-10-09). */
export const UNEMPLOYMENT_DAILY_CAP: Record<number, number> = {
  2025: 66_000,
  2026: 68_100,
};

/** 구직급여 기초일액 상한 by 이직 연도. */
export const UNEMPLOYMENT_BASE_CAP: Record<number, number> = {
  2025: 110_000,
  2026: 113_500,
};

/** 소정급여일수 (고용보험법 별표1): [under 1y, 1–3y, 3–5y, 5–10y, 10y+] */
export const UNEMPLOYMENT_DAYS = {
  under50: [120, 150, 180, 210, 240],
  over50OrDisabled: [120, 180, 210, 240, 270],
} as const;
