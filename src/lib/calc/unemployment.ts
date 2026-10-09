/**
 * 실업급여(구직급여) 계산 — 고용보험법 제40·45·46·48·49·50조, 같은 법 시행령 제68조, 별표1.
 * Numbers and sources: docs/research/labor-2026.md (checked 2026-10-09).
 *
 * 기초일액 = 이직일까지 3개월 임금총액 ÷ 그 기간의 총일수 (근로기준법상 평균임금)
 *   2028-01-01 이후 이직은 법률 제21473호(2026-03-17)로 이직 전 1년간 보수 기준으로 바뀌지만,
 *   그 전 이직은 부칙 제3조에 따라 종전 규정을 적용합니다. 이 계산기는 2027년 이직까지만 받습니다.
 * 구직급여일액 = min(기초일액, 상한 기초일액) × 60%
 * 하한 = 이직일 당시 시간급 최저임금 × 이직 전 1일 소정근로시간 × 80% — 하한이 상한보다 우선
 * 총액 = 구직급여일액 × 소정급여일수(120~270일)
 *
 * 이직 전 1일 소정근로시간 (고용보험법 제45조④ 후단 → 시행규칙 제91조의2①, 고용노동부령 제370호
 * 2022-12-09, 2023-01-01 이후 이직부터; 현행 제479호 2026-09-18까지 그대로):
 *   1. 일 단위로 정한 경우(주 5·6일 매일 같은 시간): 그 시간
 *   2. 주 단위: (주 소정근로시간 + 그 기간 유급휴일 시간) ÷ 48 × 8
 *   3. 월 단위: (월 소정근로시간 + 그 기간 유급휴일 시간) ÷ 209 × 8
 *   4. 주마다 다른 경우: (이직 전 4주 소정근로시간 + 그 기간 유급휴일 시간) ÷ 28
 *   then 급여기초임금일액 산정규정(고용노동부예규 제221호, 2023-12-01) 제3조: 소수점 이하는 올림해 정수로,
 *   8시간 이상은 8시간. ('3시간 이하는 4시간' 규정은 2023-12-01 이후 이직부터 삭제.)
 *   Text checked 2026-10-09 at law.go.kr (admRulSeq=2100000232090) and the 시행규칙 현행본.
 *
 * Rounding: 기초일액과 구직급여일액 모두 원 미만 절사. No official rounding rule was found;
 * every 하한 value with whole hours is an exact won amount, so this only matters between the limits.
 */
import { MINIMUM_WAGE, UNEMPLOYMENT_BASE_CAP, UNEMPLOYMENT_DAILY_CAP, UNEMPLOYMENT_DAYS } from "@/lib/rates/labor";
import { addDays, addMonths, compareYMD, diffDays, type YMD } from "@/lib/date";

/** 이직 연도 범위 (최저임금이 고시된 해까지만 계산). */
export const FIRST_YEAR = 2025;
export const LAST_YEAR = 2027;
/**
 * 이 해 1월 1일 이후 이직부터 기초일액이 '이직 전 1년간 월 보수 합계 ÷ 산정기간 총 일수'로 바뀝니다
 * (고용보험법 제45조① 개정, 법률 제21473호 2026-03-17 공포, 부칙 제1조 시행일·제3조 경과조치).
 * 최저기초일액을 정한 제45조④는 이 개정에서 바뀌지 않았습니다.
 */
export const ANNUAL_BASE_RULE_YEAR = 2028;
/** 법률 제21473호 (2026-03-17 공포). */
export const ANNUAL_BASE_LAW_NO = "제21473호";

export const BENEFIT_RATE_PCT = 60;
export const FLOOR_RATE_PCT = 80;
/**
 * 하한 계산에 쓰는 1일 소정근로시간 상한 (급여기초임금일액 산정규정 제3조③).
 * 2023-12-01 이후 이직부터 '3시간 이하는 4시간' 하한은 없어져 실제 시간을 씁니다.
 */
export const MAX_FLOOR_HOURS = 8;
/** 시행규칙 제91조의2①2호: 주 단위면 (주 소정 + 유급휴일) ÷ 48 × 8. */
export const WEEK_BASIS_HOURS = 48;
/** 시행규칙 제91조의2①3호: 월 단위면 (월 소정 + 유급휴일) ÷ 209 × 8. */
export const MONTH_BASIS_HOURS = 209;
/** 시행규칙 제91조의2①4호: 주마다 다르면 (이직 전 4주 소정 + 유급휴일) ÷ 28. */
export const FOUR_WEEK_DIVISOR = 28;
/** 주휴일을 주는 최소 1주 소정근로시간 (근로기준법 제18조③). */
export const JUHYU_MIN_WEEKLY_HOURS = 15;
/** 주휴시간 비례 계산의 기준이 되는 주 40시간 (근로기준법 제50조①, 시행령 별표2). */
const FULL_WEEK_HOURS = 40;
/** 실업 신고일부터 7일은 대기기간이라 지급하지 않아요 (고용보험법 제49조). */
export const WAITING_DAYS = 7;
/** 수급기간: 이직일 다음 날부터 12개월 (고용보험법 제48조). */
export const RECEIVE_MONTHS = 12;
/** 피보험단위기간 요건: 이직일 이전 18개월 중 180일 (고용보험법 제40조). */
export const REQUIRED_INSURED_DAYS = 180;

/**
 * 2027 정부안(2026-09-01 고용보험위원회): 상한 = 하한 × 103%, 주 6일분 지급, 실업급여 보험료율 각 0.9% → 1.0%.
 * 2026-10-09 현재 법령 개정 전이라 미확정 (법률 제21473호와 달리 공포된 내용이 아님).
 */
export const PROPOSAL_CAP_RATIO_PCT = 103;

export type InsuredPeriod = "0" | "1" | "3" | "5" | "10";

export const INSURED_PERIOD_OPTIONS: { value: InsuredPeriod; label: string }[] = [
  { value: "0", label: "1년 미만" },
  { value: "1", label: "1년 이상 3년 미만" },
  { value: "3", label: "3년 이상 5년 미만" },
  { value: "5", label: "5년 이상 10년 미만" },
  { value: "10", label: "10년 이상" },
];

const PERIOD_INDEX: Record<InsuredPeriod, number> = { "0": 0, "1": 1, "3": 2, "5": 3, "10": 4 };

export function isInsuredPeriod(v: string): v is InsuredPeriod {
  return Object.prototype.hasOwnProperty.call(PERIOD_INDEX, v);
}

export function insuredPeriodLabel(p: InsuredPeriod): string {
  return INSURED_PERIOD_OPTIONS[PERIOD_INDEX[p]].label;
}

/** 소정급여일수 (고용보험법 별표1). 나이와 피보험기간은 이직일 기준. */
export function benefitDays(period: InsuredPeriod, over50OrDisabled: boolean): number {
  const row = over50OrDisabled ? UNEMPLOYMENT_DAYS.over50OrDisabled : UNEMPLOYMENT_DAYS.under50;
  return row[PERIOD_INDEX[period]];
}

export type YearRule = {
  year: number;
  /** 이직일이 속한 해의 시간급 최저임금 */
  minWage: number;
  /** 기초일액 상한 */
  baseCap: number;
  /** 구직급여일액 상한 */
  dailyCap: number;
  /** false = 그 해 상한액이 아직 정해지지 않아 현행 금액을 그대로 쓴 예상치 */
  capConfirmed: boolean;
};

const CONFIRMED_CAP_YEARS = Object.keys(UNEMPLOYMENT_DAILY_CAP)
  .map(Number)
  .sort((a, b) => a - b);

/** 이직 연도별 기준. 범위 밖이면 null. */
export function yearRule(year: number): YearRule | null {
  if (!Number.isInteger(year) || year < FIRST_YEAR || year > LAST_YEAR) return null;
  const minWage = MINIMUM_WAGE[year];
  if (!minWage) return null;
  const capConfirmed = UNEMPLOYMENT_DAILY_CAP[year] !== undefined;
  // Without a new amount, the 시행령 amount in force (latest confirmed year) keeps applying.
  const capYear = capConfirmed ? year : CONFIRMED_CAP_YEARS.filter((y) => y <= year).at(-1);
  if (capYear === undefined) return null;
  return {
    year,
    minWage,
    baseCap: UNEMPLOYMENT_BASE_CAP[capYear],
    dailyCap: UNEMPLOYMENT_DAILY_CAP[capYear],
    capConfirmed,
  };
}

/**
 * 하한 계산용 1일 소정근로시간 (급여기초임금일액 산정규정 제3조②③):
 * 시행규칙 제91조의2①로 구한 평균이 소수면 올림해 정수로, 8시간 이상은 8시간.
 * 4.8 → 5, 3.43 → 4, 10 → 8. 0 이하이거나 숫자가 아니면 NaN.
 */
export function floorHours(hours: number): number {
  if (!Number.isFinite(hours) || hours <= 0) return NaN;
  // Strip float noise (e.g. 4.000000000000001) before rounding up.
  const clean = Math.round(hours * 1e6) / 1e6;
  return Math.min(MAX_FLOOR_HOURS, Math.ceil(clean));
}

/**
 * 1주 주휴시간: 1주 소정근로시간이 15시간 이상이면 min(주 소정, 40) ÷ 40 × 8 (근로기준법 제18조③·제55조,
 * 시행령 별표2). 주 24시간 → 4.8시간, 주 40시간 → 8시간, 주 14시간 → 0.
 */
export function weeklyPaidHolidayHours(weeklyHours: number): number {
  if (!(weeklyHours >= JUHYU_MIN_WEEKLY_HOURS)) return 0;
  return (Math.min(weeklyHours, FULL_WEEK_HOURS) * 8) / FULL_WEEK_HOURS;
}

/** 이직 전 4주의 주휴시간 합계: 4주 평균 1주 소정근로시간으로 판단해 4주분 (4주 80시간 → 16시간). */
export function fourWeekPaidHolidayHours(totalHours: number): number {
  return 4 * weeklyPaidHolidayHours(totalHours / 4);
}

/** 근로계약에서 소정근로시간을 정한 단위 (시행규칙 제91조의2①1·2·4호). */
export type HoursBasis = "day" | "week" | "fourWeek";

export type DailyHours = {
  basis: HoursBasis;
  /** 입력한 소정근로시간: 하루 / 1주 / 이직 전 4주 합계 */
  scheduled: number;
  /** 더한 유급휴일(주휴) 시간 */
  paidHoliday: number;
  /** 이직 전 1일 평균 소정근로시간 (올림 전) */
  average: number;
  /** 하한 계산에 쓰는 시간 (올림, 최대 8) */
  hours: number;
};

/**
 * 이직 전 1일 소정근로시간 (시행규칙 제91조의2① + 산정규정 제3조).
 * 유급휴일은 주휴일만 넣습니다(주 15시간 이상일 때).
 * - day: 그 시간 (주 5·6일 매일 같은 시간으로 정한 경우)
 * - week: (주 소정 + 주휴) ÷ 48 × 8. 주 3일 × 8시간 = 24 → (24 + 4.8) ÷ 48 × 8 = 4.8 → 5시간
 * - fourWeek: (4주 소정 + 4주 주휴) ÷ 28. 4주 80시간 → (80 + 16) ÷ 28 = 3.43 → 4시간
 */
export function dailyScheduledHours(basis: HoursBasis, scheduled: number): DailyHours | null {
  if (!Number.isFinite(scheduled) || scheduled <= 0) return null;
  let paidHoliday = 0;
  let average = scheduled;
  if (basis === "week") {
    paidHoliday = weeklyPaidHolidayHours(scheduled);
    average = ((scheduled + paidHoliday) * 8) / WEEK_BASIS_HOURS;
  } else if (basis === "fourWeek") {
    paidHoliday = fourWeekPaidHolidayHours(scheduled);
    average = (scheduled + paidHoliday) / FOUR_WEEK_DIVISOR;
  }
  return { basis, scheduled, paidHoliday, average, hours: floorHours(average) };
}

/**
 * 월 단위로 정한 경우 (시행규칙 제91조의2①3호): (월 소정 + 그 달 유급휴일 시간) ÷ 209 × 8 (올림 전).
 * 유급휴일 시간은 계약마다 달라 직접 넣습니다. 월 174 + 주휴 35 = 209 → 8시간.
 */
export function monthlyAverageHours(monthlyHours: number, paidHolidayHours: number): number {
  return ((monthlyHours + paidHolidayHours) * 8) / MONTH_BASIS_HOURS;
}

/** 최저기초일액 = 시간급 최저임금 × 이직 전 1일 소정근로시간(올림, 최대 8). */
export function minimumBase(minWage: number, hours: number): number {
  return minWage * floorHours(hours);
}

/** 구직급여 하한(최저구직급여일액) = 최저기초일액 × 80%. 2026년 8시간: 66,048원. */
export function dailyFloor(minWage: number, hours: number): number {
  return Math.floor((minimumBase(minWage, hours) * FLOOR_RATE_PCT) / 100);
}

/**
 * 평균임금 산정기간: 산정 사유 발생일인 퇴직일(이직일 다음 날)부터 거꾸로 3개월, 즉 이직일까지의 3개월.
 * period = [퇴직일 − 3개월, 퇴직일 − 1일] (근로기준법 제2조①6호, MOEL 퇴직금 계산기와 같은 방식).
 * 예) 이직일 2026-10-31 → 2026-08-01 ~ 2026-10-31, 92일. 이직일 2026-04-30 → 02-01 ~ 04-30, 89일.
 * 3개월 전에 같은 날이 없으면 그다음 달 1일부터 셉니다 (이직일 2026-05-30 → 퇴직일 05-31 → 03-01부터 91일).
 */
export function wagePeriod(separation: YMD): { start: YMD; end: YMD; days: number } {
  const retire = addDays(separation, 1);
  const back = addMonths(retire, -3);
  // addMonths clamps to the month's last day; a clamped result means the same day does not exist.
  const start = back.d === retire.d ? back : addDays(back, 1);
  return { start, end: separation, days: diffDays(start, retire) };
}

/** 수급기간: 이직일 다음 날부터 12개월이 되는 날까지. */
export function receivePeriod(separation: YMD): { start: YMD; end: YMD } {
  const start = addDays(separation, 1);
  return { start, end: addDays(addMonths(start, RECEIVE_MONTHS), -1) };
}

export type ClaimWindow = {
  /** 오늘이 수급기간 마지막 날을 지났는지 */
  ended: boolean;
  /** 오늘(또는 이직 다음 날) 바로 신청하면 수급기간 안에 받을 수 있는 최대 일수 */
  payableDays: number;
  /** 수급기간이 모자라 받지 못하는 일수 */
  lostDays: number;
};

/**
 * 수급기간 안에 다 받을 수 있는지 (고용보험법 제48·49조).
 * 신고일부터 7일 대기기간을 빼고, 수급기간 마지막 날까지 남은 달력 일수만큼만 받을 수 있습니다.
 * 이직 전이면 이직 다음 날 신청한다고 봅니다. 수급기간 연기(질병·출산 등)는 반영하지 않습니다.
 */
export function claimWindow(
  r: { receiveStart: YMD; receiveEnd: YMD; days: number },
  today: YMD,
): ClaimWindow {
  const ended = compareYMD(today, r.receiveEnd) > 0;
  const applyFrom = compareYMD(today, r.receiveStart) > 0 ? today : r.receiveStart;
  const remaining = diffDays(applyFrom, r.receiveEnd) + 1;
  const payableDays = Math.min(r.days, Math.max(0, remaining - WAITING_DAYS));
  return { ended, payableDays, lostDays: r.days - payableDays };
}

export type UnemploymentInput = {
  /** 이직일 (마지막 근무일) */
  separation: YMD;
  /** 퇴직 전 3개월의 월 평균 세전 급여 (원) */
  monthlyWage: number;
  /** 이직 전 1일 (평균) 소정근로시간. 소수면 올림, 8시간 넘으면 8시간 (dailyScheduledHours().average) */
  hours: number;
  period: InsuredPeriod;
  /** 이직일 기준 만 50세 이상 또는 장애인 */
  over50OrDisabled: boolean;
};

export type UnemploymentResult = {
  rule: YearRule;
  wageStart: YMD;
  wageEnd: YMD;
  wageDays: number;
  /** 3개월 임금총액 (월 평균 × 3) */
  totalWage: number;
  /** 기초일액 (평균임금, 원 미만 절사) */
  baseDaily: number;
  /** 기초일액이 상한을 넘었는지 */
  capApplied: boolean;
  /** 상한을 적용한 기초일액 */
  appliedBase: number;
  /** 기초일액 × 60% (원 미만 절사) */
  computedDaily: number;
  /** 하한 계산에 쓴 1일 소정근로시간 (올림, 최대 8) */
  hours: number;
  /** 하한(최저구직급여일액) */
  floor: number;
  /** 하한이 적용됐는지 (60% 금액이 하한보다 낮을 때) */
  floorApplied: boolean;
  /** 최종 구직급여일액 */
  daily: number;
  days: number;
  total: number;
  /** 30일 기준 월 환산액 */
  monthly: number;
  receiveStart: YMD;
  receiveEnd: YMD;
  /** 상한이 확정되지 않은 해(2027) — 예상치 */
  projected: boolean;
};

/** Input cap for the wage field (1억원/월). */
export const MAX_MONTHLY_WAGE = 100_000_000;

export function isValidWage(monthlyWage: number): boolean {
  return Number.isFinite(monthlyWage) && monthlyWage > 0 && monthlyWage <= MAX_MONTHLY_WAGE;
}

/**
 * 기초일액 → 구직급여일액 (고용보험법 제45·46조).
 * 기초일액이 최저기초일액보다 낮으면 최저기초일액 × 80%, 그 결과는 곧 하한과 같아서
 * max(상한 적용 기초일액 × 60%, 하한)으로 정리됩니다. 하한이 상한보다 높으면 하한이 우선합니다.
 */
export function dailyBenefit(baseDaily: number, rule: YearRule, hours: number) {
  const capApplied = baseDaily > rule.baseCap;
  const appliedBase = Math.min(baseDaily, rule.baseCap);
  // Integer arithmetic so 112,000 × 60% is exactly 67,200.
  const computedDaily = Math.floor((appliedBase * BENEFIT_RATE_PCT) / 100);
  const floor = dailyFloor(rule.minWage, hours);
  const floorApplied = computedDaily < floor;
  return {
    capApplied,
    appliedBase,
    computedDaily,
    hours: floorHours(hours),
    floor,
    floorApplied,
    daily: Math.max(computedDaily, floor),
  };
}

export function calcUnemployment(input: UnemploymentInput): UnemploymentResult | null {
  const rule = yearRule(input.separation.y);
  if (!rule || !isValidWage(input.monthlyWage) || !Number.isFinite(floorHours(input.hours))) return null;

  const wp = wagePeriod(input.separation);
  const totalWage = Math.round(input.monthlyWage) * 3;
  const baseDaily = Math.floor(totalWage / wp.days);
  const b = dailyBenefit(baseDaily, rule, input.hours);
  const days = benefitDays(input.period, input.over50OrDisabled);
  const rp = receivePeriod(input.separation);

  return {
    rule,
    wageStart: wp.start,
    wageEnd: wp.end,
    wageDays: wp.days,
    totalWage,
    baseDaily,
    ...b,
    days,
    total: b.daily * days,
    monthly: b.daily * 30,
    receiveStart: rp.start,
    receiveEnd: rp.end,
    projected: !rule.capConfirmed,
  };
}

export type IneligibleReason = "insured-days" | "voluntary";

/**
 * 수급자격 판단 (단순화).
 * - 이직일 이전 18개월 중 피보험단위기간 180일 이상
 * - 비자발적 이직, 또는 자발적이라도 고용보험법 시행규칙 별표2의 정당한 사유가 있을 것
 */
export function eligibility(opts: { metInsuredDays: boolean; voluntary: boolean; justified: boolean }): {
  eligible: boolean;
  reasons: IneligibleReason[];
} {
  const reasons: IneligibleReason[] = [];
  if (!opts.metInsuredDays) reasons.push("insured-days");
  if (opts.voluntary && !opts.justified) reasons.push("voluntary");
  return { eligible: reasons.length === 0, reasons };
}

/**
 * 2027년 정부안 상한 추산 (미확정): 8시간 하한 × 103%, 원 미만 절사.
 * 2027 하한 68,480원 → 70,534원. This is our arithmetic, not an official figure.
 */
export function proposalCap(year: number): number | null {
  const mw = MINIMUM_WAGE[year];
  if (!mw) return null;
  return Math.floor((dailyFloor(mw, MAX_FLOOR_HOURS) * PROPOSAL_CAP_RATIO_PCT) / 100);
}

/**
 * 정부안이 통과될 때의 구직급여일액 (미확정, 셈도장 추산).
 * 정액 상한(기초일액 113,500원) 대신 정부안 상한을 쓰므로 상한 적용 전 기초일액에서 출발합니다:
 * min(max(기초일액 × 60%, 하한), 8시간 하한 × 103%).
 * 2027-03-31 이직, 월 400만원, 8시간 → 기초일액 133,333원 → min(79,999, 70,534) = 70,534원.
 */
export function proposalDaily(baseDaily: number, year: number, hours: number): number | null {
  const cap = proposalCap(year);
  const mw = MINIMUM_WAGE[year];
  if (cap === null || !mw) return null;
  const computed = Math.floor((baseDaily * BENEFIT_RATE_PCT) / 100);
  return Math.min(Math.max(computed, dailyFloor(mw, hours)), cap);
}

/** 정부안처럼 주 6일분만 지급할 때의 30일 환산액 (daily × 30 × 6/7, 원 미만 절사). */
export function sixDayMonthly(daily: number): number {
  return Math.floor((daily * 30 * 6) / 7);
}
