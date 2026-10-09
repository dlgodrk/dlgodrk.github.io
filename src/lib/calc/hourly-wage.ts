/**
 * 시급 → 주급·월급 (주휴수당 포함) and take-home pay for part-time and hourly workers.
 *
 * Rules (checked 2026-10-09; details and sources in docs/research/labor-2026.md):
 * - 주휴수당: 근로기준법 제55조①, 시행령 제30조① (1주 소정근로일 개근), 제18조③ (4주 평균 1주
 *   소정근로시간 15시간 미만이면 제55조 미적용). 주휴시간 = min(주 소정근로시간, 40) / 40 × 8.
 * - 월 환산 시간 = (주 소정근로시간 + 주휴시간) × 365/7/12 (평균 4.345주) — 최저임금법 시행령
 *   제5조①3, which sets no rounding rule. Only 주 소정 40시간 + 주휴 8시간 uses the whole number
 *   209시간 (48 × 365/84 = 208.57; the 최저임금 고시 월 환산액 is 시급 × 209). Every other schedule
 *   uses the exact decimal value (fact-check 2026-10-09, docs/research/verifier-corrections.md item 5):
 *   월급 = 시급 × exact hours, rounded once to the won; the hours are only DISPLAYED rounded to 0.01h
 *   (주 15시간 → 78.21, 주 20시간 → 104.29, 주 35시간 → 182.5, 주 10시간 → 43.45).
 *   2026 주 15시간 = 10,320 × 78.2142857… = 807,171.43 → 807,171원 (10,320 × 78.21 would be 807,127).
 *   Do not ceil (105) or round (104) part-time hours, and do not pro-rate 209 (20h → 104.5). With
 *   연장근로 on top of 40h, the extra hours are added to 209 at × 365/84 (10h → 209 + 43.452…).
 *   All of this is integer math in 1/8400-hour units (hours × 100 × 365 is whole), so pay has no float noise.
 * - 연장근로: 1일 8시간·1주 40시간 초과분 (근로기준법 제50조). 상시 5인 이상 사업장만 50% 가산
 *   (제56조). Shown as a note only; pay here counts every hour at 1배.
 * - 3.3% 원천징수 (사업소득): 소득세 3% (소득세법 제129조①3) + 지방소득세 = 소득세 × 10%
 *   (지방세법 제103조의13), each 10원 미만 절사 (국고금관리법 제47조). Since 2024-07-01 지급분
 *   인적용역 사업소득 is excluded from the 1,000원 소액부징수 (소득세법 제86조 제1호, 법률 제19933호).
 * - 4대보험+소득세: shared engine (employeeInsurance, monthlyWithholding; 공제대상가족 1명).
 *   2027 figures (rateYear 2027) apply the legislated 국민연금 rise to 10% (근로자 5.0%; 국민연금법
 *   개정 법률 제20903호, 2026년부터 매년 0.5%p 인상) and keep every other 2026 rate and the
 *   2026 간이세액표, because those 2027 values are not fixed yet.
 *   주 15시간(월 60시간) 미만 초단시간 근로자는 국민연금·건강보험 직장가입 제외. 고용보험은
 *   3개월 이상 계속 근로하면 적용 (고용보험법 시행령 제3조, 2026년 현행) — assumed here.
 *
 * Pure functions only. No React, no Date.
 */
import { employeeInsurance } from "@/lib/rates/insurance";
import { MINIMUM_WAGE } from "@/lib/rates/labor";
import { monthlyWithholding } from "@/lib/rates/withholding";

export const MIN_WAGE_2026 = MINIMUM_WAGE[2026]; // 10,320원
export const MIN_WAGE_2027 = MINIMUM_WAGE[2027]; // 10,700원

/** 주휴수당 요건: 1주 소정근로시간 15시간 이상 (근로기준법 제18조③). */
export const JUHYU_MIN_WEEKLY_HOURS = 15;
/** 법정근로시간 (근로기준법 제50조). */
export const LEGAL_DAILY_HOURS = 8;
export const LEGAL_WEEKLY_HOURS = 40;
/** 평균 주 수 per month = 365 / 7 / 12 ≈ 4.345. */
export const WEEKS_PER_MONTH = 365 / 84;
/**
 * 월 환산 시간 is kept as an integer count of 1/8400 hour: weekly hours come in 0.01h steps
 * (0.1h work + 0.02h 주휴), and 0.01h × 365/84 = 365/8400 h.
 */
export const MONTHLY_HOUR_UNITS = 8_400;
/** 주 소정 40시간 + 주휴 8시간의 월 환산 시간 (최저임금 고시 월 환산액 기준, 208.57 → 209). */
export const OFFICIAL_MONTHLY_HOURS_40H = 209;
/** 수습 감액 한도 (최저임금법 제5조②, 시행령 제3조): 최저임금의 90%. */
export const PROBATION_RATIO = 0.9;
/** Pay month whose 4대보험·간이세액 rules are applied (2026 요율). */
export const HOURLY_PAY_MONTH = "2026-10";

export type DeductionMode = "none" | "freelance" | "insured";

export const DEDUCTION_LABELS: Record<DeductionMode, string> = {
  none: "공제 없음",
  freelance: "3.3%",
  insured: "4대보험+소득세",
};

const EPS = 1e-9;

/** Round to 0.1 (hours are entered with one decimal). */
export function round1(n: number): number {
  return Math.round(n * 10 + EPS) / 10;
}

/** Round to 0.01 (주휴시간 can be a multiple of 0.02h). */
export function round2(n: number): number {
  return Math.round(n * 100 + EPS) / 100;
}

/** 원 단위 반올림 for pay amounts. */
function won(n: number): number {
  return Math.round(n + EPS);
}

/** Total weekly working hours = 1일 근무시간 × 주 근무일수 (0.1시간 단위). */
export function weeklyWorkHours(dailyHours: number, days: number): number {
  return round1(dailyHours * days);
}

/**
 * Weekly 연장근로 hours: hours over 8 a day, plus hours over 40 a week among the rest
 * (no double counting). 10h × 3일 → 6h, 9h × 6일 → 14h, 8h × 6일 → 8h.
 */
export function overtimeHours(dailyHours: number, days: number): number {
  const daily = round1(Math.max(0, dailyHours - LEGAL_DAILY_HOURS) * days);
  const rest = weeklyWorkHours(dailyHours, days) - daily;
  return round1(daily + Math.max(0, rest - LEGAL_WEEKLY_HOURS));
}

/** 주휴시간: min(소정, 40) / 40 × 8, or 0 when under 15h or not 개근. */
export function juhyuHours(contractualWeekly: number, perfectAttendance = true): number {
  if (!perfectAttendance || contractualWeekly < JUHYU_MIN_WEEKLY_HOURS - EPS) return 0;
  return (Math.min(contractualWeekly, LEGAL_WEEKLY_HOURS) / LEGAL_WEEKLY_HOURS) * 8;
}

/** 주휴수당 (원) for a weekly 소정근로시간 and 시급. */
export function juhyuPay(contractualWeekly: number, wage: number, perfectAttendance = true): number {
  return won(juhyuHours(contractualWeekly, perfectAttendance) * wage);
}

/** Exact monthly hours = weekly paid hours × 365/7/12. */
export function monthlyHoursExact(weeklyPaidHours: number): number {
  // Work in hundredths of an hour so 25.2 × 365 / 84 lands exactly on 109.5.
  return (Math.round(weeklyPaidHours * 100) * 365) / 8400;
}

/**
 * True when the week has the full 8 주휴시간, i.e. 주 소정근로시간 40시간 (the cap) with 개근 —
 * the schedule the 최저임금 고시 converts at 209시간 a month.
 */
export function uses209(juhyu: number): boolean {
  return juhyu >= 8 - EPS;
}

/**
 * Exact 월 환산 시간 in 1/8400-hour units (an integer; 0 for no hours) for a week of `weeklyWork`
 * hours worked plus `juhyu` 주휴시간.
 * - 주 소정 40시간 + 주휴 8시간: 209 × 8400 (고시 기준), plus hours worked over 40 × 365/84.
 * - Every other schedule: (근무 + 주휴) × 365/7/12 = (hours × 100) × 365 units, never rounded.
 */
export function monthlyHourUnits(weeklyWork: number, juhyu: number): number {
  if (uses209(juhyu)) {
    const extra = Math.round(Math.max(0, weeklyWork - LEGAL_WEEKLY_HOURS) * 100);
    return OFFICIAL_MONTHLY_HOURS_40H * MONTHLY_HOUR_UNITS + (extra > 0 ? extra * 365 : 0);
  }
  const hundredths = Math.round((weeklyWork + juhyu) * 100);
  return hundredths > 0 ? hundredths * 365 : 0;
}

/**
 * Exact (unrounded) 월 환산 시간 that pay is computed from: 209 for 주 40시간 + 주휴 8시간
 * (209 + 연장 × 365/84 with overtime), otherwise (근무 + 주휴) × 365/84 — 20 + 4 → 104.2857….
 */
export function monthlyPayHours(weeklyWork: number, juhyu: number): number {
  return monthlyHourUnits(weeklyWork, juhyu) / MONTHLY_HOUR_UNITS;
}

/**
 * 월 환산 시간 for DISPLAY, rounded half up to 0.01h (pay uses the exact value, see monthlyPay).
 * - 주 소정 40시간 + 주휴 8시간: 209 (고시 기준), plus hours worked over 40 × 365/84 (40h + 10h → 252.45).
 * - Every other schedule: (근무 + 주휴) × 365/7/12, not rounded to a whole hour:
 *   15 + 3 → 78.21, 20 + 4 → 104.29, 35 + 7 → 182.5, 14 + 0 → 60.83, 40 + 0 (결근) → 173.81.
 */
export function monthlyHours(weeklyWork: number, juhyu: number): number {
  const units = monthlyHourUnits(weeklyWork, juhyu);
  return Math.floor((units * 100 + MONTHLY_HOUR_UNITS / 2) / MONTHLY_HOUR_UNITS) / 100;
}

/**
 * 월급 = 시급 × exact 월 환산 시간 (not the 0.01h display value), 원 단위 반올림, in integers:
 * round(시급 × units / 8400). 2026: 주 15시간 807,171원, 주 20시간 1,076,229원, 주 40시간 2,156,880원.
 */
export function monthlyPay(wage: number, weeklyWork: number, juhyu: number): number {
  const units = monthlyHourUnits(weeklyWork, juhyu);
  if (!(wage > 0) || units === 0) return 0;
  return Math.floor((wage * units + MONTHLY_HOUR_UNITS / 2) / MONTHLY_HOUR_UNITS);
}

export type FreelanceTax = { incomeTax: number; localTax: number; total: number };

/** 3.3% 원천징수: 소득세 3% (10원 미만 절사) + 지방소득세 = 소득세 × 10% (10원 미만 절사). */
export function freelanceTax(gross: number): FreelanceTax {
  const pay = Math.max(0, Math.floor(gross));
  const incomeTax = Math.floor((pay * 3) / 1000) * 10;
  const localTax = Math.floor(incomeTax / 100) * 10;
  return { incomeTax, localTax, total: incomeTax + localTax };
}

export type InsuredDeductions = {
  pension: number;
  health: number;
  longTermCare: number;
  employment: number;
  incomeTax: number;
  localTax: number;
  total: number;
  /** true when 주 소정 15시간 미만: 국민연금·건강보험 제외 */
  shortTime: boolean;
};

/** Year whose 4대보험 rates a net-pay figure uses. */
export type RateYear = 2026 | 2027;

/**
 * 국민연금 근로자 기여율 in basis points (0.01%): 2026 4.75%, 2027 5.0%
 * (국민연금법 개정 법률 제20903호: 9% → 13%, 2026년부터 매년 0.5%p).
 */
export const PENSION_EMPLOYEE_BP: Record<RateYear, number> = { 2026: 475, 2027: 500 };

/**
 * Pay month handed to the shared 2026 engine for each rate year. 2027 uses the latest known rules
 * (2026-12: 국민연금 기준소득월액 410,000~6,590,000원 until 2027-06, 장기요양 0.1314).
 */
export const RATE_PAY_MONTH: Record<RateYear, string> = { 2026: HOURLY_PAY_MONTH, 2027: "2026-12" };

/**
 * 4대보험 근로자분 + 간이세액 (공제대상가족 본인 1명, 100%) on the monthly pay.
 * rateYear 2027 swaps in the legislated 5.0% 국민연금 rate; other rates stay at 2026 values.
 */
export function insuredDeductions(
  gross: number,
  contractualWeekly: number,
  payMonth?: string,
  rateYear: RateYear = 2026,
): InsuredDeductions {
  const month = payMonth ?? RATE_PAY_MONTH[rateYear];
  const shortTime = contractualWeekly < JUHYU_MIN_WEEKLY_HOURS - EPS;
  const ins = employeeInsurance(gross, month, { pensionExempt: shortTime });
  // 2026: the verified engine's figure. 2027: same 기준소득월액, floor10(base × 5.0%) =
  // floor(base × 500 / 100,000) × 10, exact in integers (the engine uses 475 for 4.75%).
  const pension = shortTime
    ? 0
    : rateYear === 2026
      ? ins.pension
      : Math.floor((ins.pensionBase * PENSION_EMPLOYEE_BP[rateYear]) / 100_000) * 10;
  const health = shortTime ? 0 : ins.health;
  const longTermCare = shortTime ? 0 : ins.longTermCare;
  const tax = monthlyWithholding(gross, 1, 0, 100, month);
  const total = pension + health + longTermCare + ins.employment + tax.total;
  return {
    pension,
    health,
    longTermCare,
    employment: ins.employment,
    incomeTax: tax.incomeTax,
    localTax: tax.localTax,
    total,
    shortTime,
  };
}

export type HourlyInput = {
  /** 시급 (원) */
  wage: number;
  /** 1일 근무시간 */
  dailyHours: number;
  /** 주 근무일수 (1–7) */
  days: number;
  /** 소정근로일 개근 여부 (default true) */
  perfectAttendance?: boolean;
  deduction?: DeductionMode;
  payMonth?: string;
};

export type HourlyResult = {
  wage: number;
  /** 실제 주 근무시간 (1일 × 일수) */
  weeklyWork: number;
  /** 연장근로시간 (8h/day, 40h/week 초과) */
  overtime: number;
  /** 주 소정근로시간 (= 주 근무시간 − 연장, 최대 40) */
  contractualWeekly: number;
  juhyuEligible: boolean;
  juhyuHours: number;
  /** 주급(기본) = 시급 × 주 근무시간 */
  weeklyBase: number;
  juhyuPay: number;
  weeklyTotal: number;
  /** 주 근무시간 + 주휴시간 */
  weeklyPaidHours: number;
  /** weeklyPaidHours × 365/84, unrounded (48h → 208.57 even when 209 is used) */
  monthlyHoursExact: number;
  /** exact 월 환산 시간 behind monthlyGross: 209 (+ 연장 × 365/84) or (근무 + 주휴) × 365/84, unrounded */
  monthlyPayHours: number;
  /** 월 환산 시간 shown to 0.01h: 209 for 주 소정 40시간 + 주휴 8시간, otherwise the decimal formula */
  monthlyHours: number;
  /** true when monthlyHours is built on the 고시 209시간 (주 소정 40시간, 개근) */
  monthly209: boolean;
  /** 월급(세전) = 시급 × exact 월 환산 시간 (monthlyPayHours), 원 단위 반올림 */
  monthlyGross: number;
  /** 참고: 주급 합계 × 365/7/12 (평균 4.345주) */
  monthlyByWeeks: number;
  deduction: DeductionMode;
  freelance: FreelanceTax | null;
  insured: InsuredDeductions | null;
  deductionTotal: number;
  monthlyNet: number;
  /** 5인 이상 사업장이면 더 받아야 하는 연장근로 가산분 (주, 월 4.345주 환산) */
  overtimePremiumWeekly: number;
  overtimePremiumMonthly: number;
};

export function calcHourly(input: HourlyInput): HourlyResult {
  const wage = Math.max(0, Math.floor(input.wage));
  const days = Math.min(7, Math.max(1, Math.floor(input.days)));
  const dailyHours = Math.min(24, Math.max(0, round1(input.dailyHours)));
  const perfect = input.perfectAttendance ?? true;
  const deduction = input.deduction ?? "none";

  const weeklyWork = weeklyWorkHours(dailyHours, days);
  const overtime = overtimeHours(dailyHours, days);
  const contractualWeekly = round1(weeklyWork - overtime);
  const jh = juhyuHours(contractualWeekly, perfect);
  const weeklyBase = won(wage * weeklyWork);
  const jp = won(jh * wage);
  const weeklyTotal = weeklyBase + jp;
  const weeklyPaidHours = round2(weeklyWork + jh);
  const mhExact = monthlyHoursExact(weeklyPaidHours);
  const mh = monthlyHours(weeklyWork, jh);
  const monthlyGross = monthlyPay(wage, weeklyWork, jh);

  const freelance = deduction === "freelance" ? freelanceTax(monthlyGross) : null;
  const insured = deduction === "insured" ? insuredDeductions(monthlyGross, contractualWeekly, input.payMonth) : null;
  const deductionTotal = freelance?.total ?? insured?.total ?? 0;

  const otWeekly = won(overtime * wage * 0.5);
  const otTenths = Math.round(overtime * 10);
  return {
    wage,
    weeklyWork,
    overtime,
    contractualWeekly,
    juhyuEligible: jh > 0,
    juhyuHours: jh,
    weeklyBase,
    juhyuPay: jp,
    weeklyTotal,
    weeklyPaidHours,
    monthlyHoursExact: mhExact,
    monthlyPayHours: monthlyPayHours(weeklyWork, jh),
    monthlyHours: mh,
    monthly209: uses209(jh),
    monthlyGross,
    // 주급 합계 × 365/84 and 연장 × 시급 × 0.5 × 365/84, 원 단위 반올림 in integers (no float noise).
    monthlyByWeeks: Math.floor((weeklyTotal * 365 + 42) / 84),
    deduction,
    freelance,
    insured,
    deductionTotal,
    monthlyNet: monthlyGross - deductionTotal,
    overtimePremiumWeekly: otWeekly,
    overtimePremiumMonthly: Math.floor((otTenths * wage * 365 + 840) / 1_680),
  };
}

/**
 * Pay summary for a weekly 소정근로시간 (no overtime) — used by tables and landing pages.
 * `rateYear` picks the 4대보험 rates for netInsured (2027: 국민연금 5.0%, see insuredDeductions).
 */
export function payForWeeklyHours(weeklyHours: number, wage: number, rateYear: RateYear = 2026) {
  const jh = juhyuHours(weeklyHours);
  const paid = round2(weeklyHours + jh);
  const mh = monthlyHours(weeklyHours, jh);
  const weeklyBase = won(wage * weeklyHours);
  const jp = won(jh * wage);
  const monthlyGross = monthlyPay(wage, weeklyHours, jh);
  return {
    weeklyHours,
    juhyuHours: jh,
    weeklyBase,
    juhyuPay: jp,
    weeklyTotal: weeklyBase + jp,
    monthlyHoursExact: monthlyHoursExact(paid),
    /** exact hours behind monthlyGross (209 for 주 40시간) */
    monthlyPayHours: monthlyPayHours(weeklyHours, jh),
    monthlyHours: mh,
    monthly209: uses209(jh),
    monthlyGross,
    netFreelance: monthlyGross - freelanceTax(monthlyGross).total,
    netInsured: monthlyGross - insuredDeductions(monthlyGross, weeklyHours, undefined, rateYear).total,
  };
}

/** 수습 중 최저 시급 (90%). 2026: 9,288원, 2027: 9,630원. */
export function probationWage(wage: number): number {
  return Math.floor(wage * PROBATION_RATIO + EPS);
}

/** Weekly 소정근로시간 values with their own page at /hourly-wage/<hours>/. */
export const HOURLY_PAGE_HOURS = [10, 12, 14, 15, 16, 18, 20, 21, 24, 25, 28, 30, 32, 35, 36, 40];

/** A typical schedule (1일 시간 × 주 일수) used to prefill the calculator for a weekly total. */
export function scheduleForHours(weeklyHours: number): { daily: number; days: number } {
  const known: Record<number, [number, number]> = {
    10: [5, 2],
    12: [4, 3],
    14: [7, 2],
    15: [5, 3],
    16: [8, 2],
    18: [6, 3],
    20: [4, 5],
    21: [7, 3],
    24: [8, 3],
    25: [5, 5],
    28: [7, 4],
    30: [6, 5],
    32: [8, 4],
    35: [7, 5],
    36: [6, 6],
    40: [8, 5],
  };
  const hit = known[weeklyHours];
  if (hit) return { daily: hit[0], days: hit[1] };
  return { daily: round1(weeklyHours / 5), days: 5 };
}

/** 시급 rows shown on landing pages. */
export const WAGE_TABLE = [10_320, 10_700, 11_000, 12_000, 13_000, 15_000];

/** Format hours: 4 → "4", 3.2 → "3.2", 3.44 → "3.44". */
export function hoursLabel(h: number): string {
  return String(Math.round(h * 100) / 100);
}

/**
 * Exact hours cut (not rounded) to 4 decimals, with "…" when more digits follow:
 * 104.285714… → "104.2857…", 43.452380… → "43.4523…", 182.5 → "182.5", 209 → "209".
 */
export function exactHoursLabel(h: number): string {
  const cut = Math.floor(h * 10_000 + EPS) / 10_000;
  return Math.abs(cut - h) < 1e-9 ? String(cut) : `${cut}…`;
}

/** True when the 0.01h display value equals the exact 월 환산 시간 (209, 182.5, 146 …), so no "약" is needed. */
export function shownHoursAreExact(payHours: number, shownHours: number): boolean {
  return Math.abs(payHours - shownHours) < 1e-9;
}
