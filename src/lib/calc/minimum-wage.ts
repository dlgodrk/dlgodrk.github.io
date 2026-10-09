import { MINIMUM_WAGE } from "@/lib/rates/labor";
import { employeeInsurance, type InsuranceBreakdown } from "@/lib/rates/insurance";
import { monthlyWithholding, type Withholding } from "@/lib/rates/withholding";
import { DEFAULT_PAY_MONTH } from "@/lib/calc/salary";
import {
  monthlyHours as monthlyHoursForWeek,
  monthlyHoursExact as monthlyHoursExactForPaid,
  monthlyPay,
  monthlyPayHours as monthlyPayHoursForWeek,
  uses209,
} from "@/lib/calc/hourly-wage";

/** Display helpers shared with the 시급·주휴수당 계산기 ("104.2857…", whether 0.01h display is exact). */
export { exactHoursLabel, shownHoursAreExact } from "@/lib/calc/hourly-wage";

/**
 * 최저임금 환산 (2026·2027).
 *
 * Sources (checked 2026-10-09):
 * - 최저임금위원회 연도별 결정현황 https://www.minimumwage.go.kr/minWage/policy/decisionMain.do
 *   2026: 10,320원 (월 209시간 2,156,880원), 2027: 10,700원 (월 2,236,300원, 2026-07-14 의결, 2026-08-05 고시)
 * - 최저임금법 제5조② + 시행령 제3조: 수습 3개월 이내 90% (1년 이상 기간을 정했거나 기간의 정함이 없는 계약,
 *   단순노무 제외 — 고용노동부 해석상 정규직 수습도 포함, 1년 미만 계약은 감액 불가)
 * - 근로기준법 제18조③·제55조: 주휴 = 주 15시간 이상, min(주 소정, 40)/40 × 8시간
 * - 월 환산 시간 = (주 소정 + 주휴) × 365/7/12 — 최저임금법 시행령 제5조①3, which sets no rounding rule.
 *   Same convention as the 시급·주휴수당 계산기 (shared code in src/lib/calc/hourly-wage.ts; fact-check
 *   docs/research/verifier-corrections.md item 5): only 주 40시간 + 주휴 8시간 uses the 고시 figure
 *   209시간 (208.57 → 209). Every other schedule uses the exact decimal value; it is only DISPLAYED
 *   rounded to 0.01h: 주 15시간 → 78.21, 주 20시간 → 104.29, 주 30시간 → 156.43, 주 35시간 → 182.5,
 *   주 10시간(주휴 없음) → 43.45. Never ceil (105) or round (104) part-time hours.
 *   월급 = 시급 × exact 월 환산 시간, rounded once to the won (hourly-wage monthlyPay, integer math):
 *   2026 주 15시간 10,320 × 78.2142857… = 807,171.43 → 807,171원, 주 20시간 1,076,228.57 → 1,076,229원.
 * - 금액은 원 단위 반올림 (hourly-wage와 같은 방식이라 두 계산기가 같은 근무조건에서 같은 금액을 보여 줍니다).
 * - 근로기준법 제50조②·제56조①: 1일 8시간 초과는 연장근로, 5인 이상 사업장은 통상임금의 50% 가산.
 */

export type MinWageYear = 2026 | 2027;
export const MIN_WAGE_YEARS: readonly MinWageYear[] = [2026, 2027];

/** 수습 근로자 감액 비율 (최저임금법 시행령 제3조: 100분의 10을 뺀 금액). */
export const PROBATION_RATIO = 0.9;
/** 법정 1주 소정근로시간 한도 (근로기준법 제50조). */
export const MAX_WEEKLY_HOURS = 40;
/** 주휴수당이 생기는 1주 소정근로시간 하한 (근로기준법 제18조③). */
export const JUHYU_MIN_WEEKLY_HOURS = 15;
/** 법정 1일 근로시간 한도 (근로기준법 제50조②). 넘는 시간은 연장근로. */
export const MAX_DAILY_HOURS = 8;
/** 연장근로 가산율 (근로기준법 제56조①, 상시 5명 이상 사업장): 통상임금의 100분의 50. */
export const OVERTIME_PREMIUM = 0.5;

/** Round away float noise (e.g. 3.0199999999999996 → 3.02). */
function clean(x: number): number {
  return Math.round(x * 1e6) / 1e6;
}

/** 원 단위 반올림 — hourly-wage.ts의 금액 반올림(Math.round(n + 1e-9))과 같습니다. */
function won(x: number): number {
  return Math.round(x + 1e-9);
}

/** 시간급 최저임금 (원). 수습이면 90% (2026: 9,288원, 2027: 9,630원). */
export function hourlyMinimum(year: MinWageYear, probation = false): number {
  const base = MINIMUM_WAGE[year];
  return probation ? Math.ceil((base * 9) / 10) : base;
}

/** 1주 유급 주휴시간: 주 15시간 이상이면 min(주 소정, 40) / 5 (= /40 × 8), 아니면 0. */
export function juhyuHours(weeklyHours: number): number {
  if (!(weeklyHours >= JUHYU_MIN_WEEKLY_HOURS)) return 0;
  return clean(Math.min(weeklyHours, MAX_WEEKLY_HOURS) / 5);
}

/** 정확한 월 환산 시간 = (주 소정 + 주휴) × 365 ÷ 7 ÷ 12 (끝수 처리 전). 주 40시간 → 208.57시간. */
export function monthlyHoursExact(weeklyHours: number): number {
  if (!(weeklyHours > 0)) return 0;
  // hourly-wage works in hundredths of an hour so e.g. 25.2 × 365 / 84 lands exactly on 109.5.
  return monthlyHoursExactForPaid(weeklyHours + juhyuHours(weeklyHours));
}

/** True only for 주 40시간 + 주휴 8시간, the schedule the 최저임금 고시 converts at 209시간. */
export function isMonthly209(weeklyHours: number): boolean {
  return weeklyHours > 0 && uses209(juhyuHours(weeklyHours));
}

/**
 * 월 환산 기준시간, 표시용 0.01시간 단위 — hourly-wage.ts monthlyHours()와 같은 규칙.
 * 주 40시간 = 208.57 → 고시 기준 209시간. 다른 근무시간은 시간 단위로 올리거나 반올림하지 않습니다:
 * 주 20시간 → 104.29, 주 15시간 → 78.21, 주 10시간(주휴 없음) → 43.45. 월급은 이 표시값이 아니라
 * monthlyPayHours()의 정확한 값으로 계산합니다.
 */
export function monthlyHours(weeklyHours: number): number {
  if (!(weeklyHours > 0)) return 0;
  return monthlyHoursForWeek(weeklyHours, juhyuHours(weeklyHours));
}

/** 월급 계산에 쓰는 정확한 월 환산 시간 (끝수 처리 없음): 주 40시간 → 209, 주 20시간 → 104.2857…. */
export function monthlyPayHours(weeklyHours: number): number {
  if (!(weeklyHours > 0)) return 0;
  return monthlyPayHoursForWeek(weeklyHours, juhyuHours(weeklyHours));
}

/** 월급 = 시급 × 정확한 월 환산 시간, 원 단위 반올림 (hourly-wage monthlyPay와 같은 정수 계산). */
function monthlyWage(hourly: number, weeklyHours: number): number {
  if (!(weeklyHours > 0)) return 0;
  return monthlyPay(hourly, weeklyHours, juhyuHours(weeklyHours));
}

export type MinWageInput = {
  year: MinWageYear;
  /** 1주 소정근로시간 (0 초과 40 이하) */
  weeklyHours: number;
  /** 일급 계산용 1일 근로시간 */
  dailyHours: number;
  /** 수습 90% 적용 */
  probation?: boolean;
};

export type MinWageResult = {
  year: MinWageYear;
  /** 그 해 법정 시간급 (수습 감액 전) */
  baseHourly: number;
  /** 적용 시급 (수습이면 90%) */
  hourly: number;
  /** 일급 = 시급 × 1일 근로시간 (가산 없음: 5인 미만 사업장, 또는 8시간 이하) */
  daily: number;
  /** 1일 8시간을 넘는 연장근로 시간 */
  dailyOvertimeHours: number;
  /** 5인 이상 사업장 일급: 8시간 초과분에 50% 가산 (8시간 이하면 daily와 같음) */
  dailyWithPremium: number;
  /** 주 소정근로시간분 임금 (주휴 제외) */
  weeklyWork: number;
  juhyuHours: number;
  /** 주휴수당 (주 15시간 미만이면 0) */
  juhyuPay: number;
  /** 주급 = 근로분 + 주휴수당 */
  weekly: number;
  /** 표시용 월 환산 시간 (0.01h): 주 40시간이면 고시 기준 209, 아니면 (주 소정 + 주휴) × 365/84 */
  monthlyHours: number;
  /** 월급 계산에 쓴 정확한 월 환산 시간 (209 또는 (주 소정 + 주휴) × 365/84, 끝수 처리 없음) */
  monthlyPayHours: number;
  /** true when monthlyHours is the 고시 209시간 (주 40시간 + 주휴 8시간) */
  monthly209: boolean;
  /** 월급 = 시급 × 정확한 월 환산 시간 (monthlyPayHours), 원 단위 반올림 */
  monthly: number;
  /** 월급 × 12 */
  annual: number;
  /** 수습이면 수습 3개월 + 정상 9개월로 본 첫해 연봉, 아니면 annual과 같음 */
  firstYearAnnual: number;
};

export function calcMinimumWage({ year, weeklyHours, dailyHours, probation = false }: MinWageInput): MinWageResult {
  const baseHourly = hourlyMinimum(year);
  const hourly = hourlyMinimum(year, probation);
  const jh = juhyuHours(weeklyHours);
  const mh = monthlyHours(weeklyHours);
  const weeklyWork = won(hourly * weeklyHours);
  const juhyuPay = won(hourly * jh);
  const monthly = monthlyWage(hourly, weeklyHours);
  const fullMonthly = monthlyWage(baseHourly, weeklyHours);
  const overtime = dailyHours > MAX_DAILY_HOURS ? clean(dailyHours - MAX_DAILY_HOURS) : 0;
  return {
    year,
    baseHourly,
    hourly,
    daily: won(hourly * dailyHours),
    dailyOvertimeHours: overtime,
    dailyWithPremium: won(hourly * (dailyHours + overtime * OVERTIME_PREMIUM)),
    weeklyWork,
    juhyuHours: jh,
    juhyuPay,
    weekly: weeklyWork + juhyuPay,
    monthlyHours: mh,
    monthlyPayHours: monthlyPayHours(weeklyHours),
    monthly209: isMonthly209(weeklyHours),
    monthly,
    annual: monthly * 12,
    firstYearAnnual: probation ? monthly * 3 + fullMonthly * 9 : monthly * 12,
  };
}

/** 2026 → 2027 차이 (같은 근무 조건). */
export function yearOverYear(input: Omit<MinWageInput, "year">) {
  const from = calcMinimumWage({ ...input, year: 2026 });
  const to = calcMinimumWage({ ...input, year: 2027 });
  return {
    from,
    to,
    hourly: to.hourly - from.hourly,
    daily: to.daily - from.daily,
    weekly: to.weekly - from.weekly,
    monthly: to.monthly - from.monthly,
    annual: to.annual - from.annual,
    /** 시급 인상률 (0.0368… for 2027) */
    rate: (to.baseHourly - from.baseHourly) / from.baseHourly,
  };
}

export type NetPay = { insurance: InsuranceBreakdown; tax: Withholding; deductions: number; net: number };

/**
 * 세후 예상 월 실수령액 (2026년 4대보험 요율·간이세액표, 비과세 0원, 본인 1인 가구).
 * 2027년 요율은 아직 확정 전이라 2026년 금액에만 씁니다.
 */
export function netMonthly2026(monthly: number): NetPay {
  const insurance = employeeInsurance(monthly, DEFAULT_PAY_MONTH);
  const tax = monthlyWithholding(monthly, 1, 0, 100, DEFAULT_PAY_MONTH);
  const deductions = insurance.total + tax.total;
  return { insurance, tax, deductions, net: monthly - deductions };
}

/**
 * 연도별 최저임금 결정현황 (최저임금위원회, minimumwage.go.kr). 인상률은 공식 표기 그대로(소수 자릿수 포함).
 * monthly = 시급 × 209시간 (고시 기준). 2016년은 2017년 인상액 계산용.
 */
export const MINIMUM_WAGE_HISTORY: {
  year: number;
  hourly: number;
  /** 공식 인상률 표기 (%) */
  rate: string;
  increase: number;
  monthly: number;
  /** 최저임금위원회 의결일 */
  decided: string;
  /** 고용노동부 결정 고시일 */
  noticed: string;
}[] = [
  { year: 2016, hourly: 6_030, rate: "8.1", increase: 450, monthly: 1_260_270, decided: "2015-07-09", noticed: "2015-08-05" },
  { year: 2017, hourly: 6_470, rate: "7.3", increase: 440, monthly: 1_352_230, decided: "2016-07-16", noticed: "2016-08-05" },
  { year: 2018, hourly: 7_530, rate: "16.4", increase: 1_060, monthly: 1_573_770, decided: "2017-07-15", noticed: "2017-08-04" },
  { year: 2019, hourly: 8_350, rate: "10.9", increase: 820, monthly: 1_745_150, decided: "2018-07-14", noticed: "2018-08-03" },
  { year: 2020, hourly: 8_590, rate: "2.87", increase: 240, monthly: 1_795_310, decided: "2019-07-12", noticed: "2019-08-05" },
  { year: 2021, hourly: 8_720, rate: "1.5", increase: 130, monthly: 1_822_480, decided: "2020-07-14", noticed: "2020-08-05" },
  { year: 2022, hourly: 9_160, rate: "5.05", increase: 440, monthly: 1_914_440, decided: "2021-07-12", noticed: "2021-08-05" },
  { year: 2023, hourly: 9_620, rate: "5.0", increase: 460, monthly: 2_010_580, decided: "2022-06-29", noticed: "2022-08-05" },
  { year: 2024, hourly: 9_860, rate: "2.5", increase: 240, monthly: 2_060_740, decided: "2023-07-19", noticed: "2023-08-04" },
  { year: 2025, hourly: 10_030, rate: "1.7", increase: 170, monthly: 2_096_270, decided: "2024-07-12", noticed: "2024-08-05" },
  { year: 2026, hourly: 10_320, rate: "2.9", increase: 290, monthly: 2_156_880, decided: "2025-07-10", noticed: "2025-08-05" },
  { year: 2027, hourly: 10_700, rate: "3.7", increase: 380, monthly: 2_236_300, decided: "2026-07-14", noticed: "2026-08-05" },
];

/**
 * 최저임금 산입범위 단계적 확대 (최저임금법 제6조④, 부칙 법률 제15666호 제2조).
 * 매월 지급하는 상여금·현금성 복리후생비 중 '월 환산 최저임금의 몇 %를 넘는 부분'만 산입되는지.
 */
export const INCLUSION_SCHEDULE: { year: string; bonusExcludedPct: number; welfareExcludedPct: number }[] = [
  { year: "2019년", bonusExcludedPct: 25, welfareExcludedPct: 7 },
  { year: "2020년", bonusExcludedPct: 20, welfareExcludedPct: 5 },
  { year: "2021년", bonusExcludedPct: 15, welfareExcludedPct: 3 },
  { year: "2022년", bonusExcludedPct: 10, welfareExcludedPct: 2 },
  { year: "2023년", bonusExcludedPct: 5, welfareExcludedPct: 1 },
  { year: "2024년부터", bonusExcludedPct: 0, welfareExcludedPct: 0 },
];

/** 주 소정근로시간별 월 환산표에 쓰는 시간. */
export const WEEKLY_HOURS_TABLE = [10, 15, 20, 25, 30, 35, 40];

/** 연봉 환산액(만원)에 가장 가까운 /salary/<만원>/ 페이지 값 (100만원 단위 반올림). */
export function nearestSalaryManwon(annualWon: number): number {
  return Math.round(annualWon / 1_000_000) * 100;
}
