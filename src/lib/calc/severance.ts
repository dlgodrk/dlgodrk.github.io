/**
 * 퇴직금 + 퇴직소득세 (2026년 기준, 2026-10-09 확인). Sources and test vectors: docs/research/labor-2026.md
 *
 * 퇴직금 — 근로자퇴직급여 보장법 제4조·제8조, 근로기준법 제2조. Follows the MOEL calculator
 * (https://www.moel.go.kr/retirementpayCal.do, assets/calc/js/retire_cal.js):
 * - 퇴직일 = 마지막 근무일의 다음 날. 재직일수(termDays) = 퇴직일 − 입사일.
 * - 지급 대상: 입사일 ≤ (퇴직일 − 1년) AND 4주 평균 주 15시간 이상. One deliberate deviation: MOEL's
 *   JS setFullYear turns 퇴직일 2/29 − 1년 into 3/1, which would count 365 days (2027-03-01 ~ 2028-02-28) as one
 *   year. 민법 제160조 says that year ends on 2028-02-29, so we map 2/29 − 1년 to 2/28 instead.
 * - 3개월 기간 = [퇴직일 − 3개월, 퇴직일 − 1일] (89~92일). MOEL quirk: when 퇴직일 − 3개월 falls on a
 *   day February does not have (5/29 in common years, 5/30, 5/31), the window starts on 3월 1일.
 * - 1일 평균임금 = (3개월 임금 + 연간 상여 × 3/12 + 연차수당 × 3/12) ÷ 기간 일수, 0.01원 단위 올림.
 * - 평균임금 < 통상임금이면 통상임금 사용 (근로기준법 제2조②).
 * - 퇴직금 = round(1일 평균임금 × 30 × 재직일수 ÷ 365) (원 단위 반올림).
 *
 * 퇴직소득세 — 소득세법 제14조⑥, 제48조, 제55조② (2023-01-01 이후 개정 없음, 2026 귀속 동일):
 * - 근속연수 = 근속월수(1개월 미만은 1개월)를 12로 나눠 올림 (1년 미만은 1년).
 * - 근속연수공제 → 환산급여 → 환산급여공제 → 과세표준 → 기본세율 → × 근속연수/12.
 * - 원 미만 절사, 원천징수세액 10원 미만 절사, 1,000원 미만 소액부징수, 지방소득세 10%.
 *
 * Pure functions only: no React, no Date.now().
 */
import { addDays, addMonths, compareYMD, diffDays, type YMD } from "@/lib/date";

/** 계속근로 1년에 대해 지급하는 평균임금 일수 (근퇴법 제8조①). */
export const SEVERANCE_DAYS_PER_YEAR = 30;

// ───────────────────────────── 날짜 ─────────────────────────────

/**
 * 퇴직일 − 1년 (민법 제160조): 2/29 of a leap year maps to 2/28 of the previous year.
 * MOEL's calculator (JS setFullYear) maps it to 3/1 instead; see the header note for why we don't.
 * Equivalent rule: 입사일 h passes the one-year test from the 퇴직일 h + 1년 (h = 2/29 → 다음 해 3/1).
 */
export function oneYearBefore(d: YMD): YMD {
  return addMonths(d, -12);
}

/** 계속근로기간 1년 이상인가 (입사일 > 퇴직일 − 1년 이면 미지급). */
export function hasOneYearService(hire: YMD, retire: YMD): boolean {
  return compareYMD(hire, oneYearBefore(retire)) <= 0;
}

/**
 * 1년 요건을 처음 채우는 퇴직일 (= 이 날 이후로 퇴직하면 퇴직금 대상). oneYearBefore is
 * non-decreasing, so the eligible 퇴직일s form one run starting here; the search begins a day
 * early so it can never skip an eligible date.
 */
export function firstEligibleRetireDate(hire: YMD): YMD {
  let d = addDays(addMonths(hire, 12), -1);
  for (let i = 0; i < 5 && !hasOneYearService(hire, d); i++) d = addDays(d, 1);
  return d;
}

/** 재직일수 = 퇴직일 − 입사일 (입사일부터 마지막 근무일까지 일수). */
export function serviceDays(hire: YMD, retire: YMD): number {
  return diffDays(hire, retire);
}

export type WagePeriod = { start: YMD; end: YMD; days: number };

/**
 * 평균임금 산정 기간: 퇴직일 이전 3개월 [start, end], end = 퇴직일 − 1일.
 * start = 퇴직일 − 3개월 (말일 보정). 2월에 없는 날이 되면 3월 1일부터 (MOEL calculator behaviour).
 * 예) 퇴직일 10/1 → 7/1~9/30 (92일), 5/31 → 3/1~5/30 (91일), 3/15 → 12/15~3/14 (90일).
 */
export function averageWagePeriod(retire: YMD): WagePeriod {
  const back = addMonths(retire, -3);
  const start = back.m === 2 && back.d < retire.d ? { y: back.y, m: 3, d: 1 } : back;
  return { start, end: addDays(retire, -1), days: diffDays(start, retire) };
}

// ─────────────────────────── 평균임금 ───────────────────────────

export type AverageWageInput = {
  /** 퇴직 전 3개월 임금 총액 (세전, 원) */
  wage3m: number;
  /** 퇴직 전 12개월 상여금 총액 (원) */
  annualBonus: number;
  /** 연차수당 (전년도 미사용분, 원) */
  annualLeavePay: number;
  /** 3개월 기간 일수 (89~92) */
  days: number;
};

export type AverageWage = {
  /** 상여 가산액 = 연간 상여 × 3/12 */
  bonusAdd: number;
  /** 연차수당 가산액 = 연차수당 × 3/12 */
  leaveAdd: number;
  /** 평균임금 산정 임금 총액 = 3개월 임금 + 가산액 */
  total: number;
  /** 1일 평균임금 (0.01원 단위 올림) */
  daily: number;
};

/** Non-negative whole won (inputs come from integer fields or the URL). */
function won(n: number): number {
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

/**
 * 1일 평균임금. Computed in quarter-won integers so the 0.01원 ceiling is exact
 * (MOEL: myCeil(totalPay / sumday, 2)).
 */
export function averageDailyWage({ wage3m, annualBonus, annualLeavePay, days }: AverageWageInput): AverageWage {
  const w = won(wage3m);
  const b = won(annualBonus);
  const l = won(annualLeavePay);
  const quarters = 4 * w + b + l; // total × 4
  const daily = days > 0 ? Math.ceil((quarters * 100) / (4 * days)) / 100 : 0;
  return { bonusAdd: b / 4, leaveAdd: l / 4, total: quarters / 4, daily };
}

/** 퇴직금 = round(1일 기준임금 × 30 × 재직일수 ÷ 365). The daily wage carries at most 2 decimals. */
export function severanceAmount(dailyWage: number, termDays: number): number {
  if (!(dailyWage > 0) || !(termDays > 0)) return 0;
  const cents = Math.round(dailyWage * 100);
  return Math.round((cents * SEVERANCE_DAYS_PER_YEAR * termDays) / 36_500);
}

// ─────────────────────────── 퇴직소득세 ───────────────────────────

/**
 * 근속월수: 입사일부터 마지막 근무일(퇴직일 − 1일)까지, 1개월 미만은 1개월로 계산.
 * 한 달은 민법 제160조 방식(기산일에 해당하는 날의 전날 만료, 해당일이 없으면 그 달 말일 만료).
 * 예) 2014-10-02 입사, 퇴직일 2017-09-16 → 35개월 14일 → 36개월.
 */
export function serviceMonths(hire: YMD, retire: YMD): number {
  if (compareYMD(retire, hire) <= 0) return 0;
  // Day after `months` full months from hire.
  const next = (months: number): YMD => {
    const t = addMonths(hire, months);
    return t.d < hire.d ? addDays(t, 1) : t;
  };
  let m = (retire.y - hire.y) * 12 + (retire.m - hire.m) + 1;
  while (m > 0 && compareYMD(next(m), retire) > 0) m--;
  return compareYMD(next(m), retire) < 0 ? m + 1 : m;
}

/** 근속연수 (세법): 근속월수 ÷ 12 올림, 최소 1년. */
export function taxServiceYears(months: number): number {
  return Math.max(1, Math.ceil(months / 12));
}

/** 근속연수공제 (소득세법 제48조①1, 2023년 이후). */
export function serviceYearsDeduction(years: number): number {
  const n = Math.max(0, Math.floor(years));
  if (n <= 5) return 1_000_000 * n;
  if (n <= 10) return 5_000_000 + 2_000_000 * (n - 5);
  if (n <= 20) return 15_000_000 + 2_500_000 * (n - 10);
  return 40_000_000 + 3_000_000 * (n - 20);
}

/** 환산급여공제 (소득세법 제48조①2). 원 미만 절사. */
export function convertedSalaryDeduction(converted: number): number {
  const c = Math.max(0, Math.floor(converted));
  if (c <= 8_000_000) return c;
  if (c <= 70_000_000) return 8_000_000 + Math.floor(((c - 8_000_000) * 60) / 100);
  if (c <= 100_000_000) return 45_200_000 + Math.floor(((c - 70_000_000) * 55) / 100);
  if (c <= 300_000_000) return 61_700_000 + Math.floor(((c - 100_000_000) * 45) / 100);
  return 151_700_000 + Math.floor(((c - 300_000_000) * 35) / 100);
}

/** 종합소득 기본세율 (소득세법 제55조①, 2023년 이후 · 2026 귀속): [상한, 세율 %, 누진공제] */
export const BASIC_TAX_BRACKETS: readonly (readonly [number, number, number])[] = [
  [14_000_000, 6, 0],
  [50_000_000, 15, 1_260_000],
  [88_000_000, 24, 5_760_000],
  [150_000_000, 35, 15_440_000],
  [300_000_000, 38, 19_940_000],
  [500_000_000, 40, 25_940_000],
  [1_000_000_000, 42, 35_940_000],
  [Infinity, 45, 65_940_000],
];

/** 기본세율 산출세액 (원 미만 절사). */
export function basicIncomeTax(taxBase: number): number {
  const t = Math.max(0, Math.floor(taxBase));
  if (t === 0) return 0;
  const [, rate, progressive] = BASIC_TAX_BRACKETS.find(([cap]) => t <= cap)!;
  return Math.floor((t * rate) / 100) - progressive;
}

/** 원천징수세액 1,000원 미만은 징수하지 않음 (소득세법 제86조). */
export const SMALL_TAX_EXEMPTION = 1_000;

export type RetirementTax = {
  /** 퇴직소득금액 (= 퇴직금, 비과세 없음) */
  income: number;
  /** 근속연수 */
  years: number;
  serviceDeduction: number;
  /** 환산급여 = (퇴직소득금액 − 근속연수공제) × 12 ÷ 근속연수 */
  converted: number;
  convertedDeduction: number;
  /** 퇴직소득 과세표준 = 환산급여 − 환산급여공제 */
  taxBase: number;
  /** 환산산출세액 = 과세표준 × 기본세율 */
  convertedTax: number;
  /** 퇴직소득 산출세액 = 환산산출세액 × 근속연수 ÷ 12 (원 미만 절사) */
  computedTax: number;
  /** 원천징수 퇴직소득세 (10원 미만 절사, 1,000원 미만 소액부징수) */
  incomeTax: number;
  /** 지방소득세 = 퇴직소득세 × 10% (10원 미만 절사) */
  localTax: number;
  total: number;
};

/** 퇴직소득세 (일시금 수령, 2026년 귀속). */
export function retirementIncomeTax(income: number, years: number): RetirementTax {
  const i = won(income);
  const n = Math.max(1, Math.floor(years));
  const serviceDeduction = Math.min(serviceYearsDeduction(n), i);
  const converted = Math.floor(((i - serviceDeduction) * 12) / n);
  const convertedDeduction = convertedSalaryDeduction(converted);
  const taxBase = Math.max(0, converted - convertedDeduction);
  const convertedTax = basicIncomeTax(taxBase);
  const computedTax = Math.floor((convertedTax * n) / 12);
  let incomeTax = Math.floor(computedTax / 10) * 10;
  if (incomeTax < SMALL_TAX_EXEMPTION) incomeTax = 0;
  const localTax = Math.floor(incomeTax / 100) * 10;
  return {
    income: i,
    years: n,
    serviceDeduction,
    converted,
    convertedDeduction,
    taxBase,
    convertedTax,
    computedTax,
    incomeTax,
    localTax,
    total: incomeTax + localTax,
  };
}

// ─────────────────────────── 전체 계산 ───────────────────────────

export type SeveranceInput = {
  hire: YMD;
  /** 퇴직일 = 마지막 근무일의 다음 날 */
  retire: YMD;
  /** 퇴직 전 3개월 임금 총액 (세전) */
  wage3m: number;
  annualBonus: number;
  annualLeavePay: number;
  /** 1일 통상임금 (없으면 NaN 또는 0) */
  ordinaryDaily?: number;
  /** 4주 평균 1주 소정근로시간 15시간 이상 */
  weekly15h: boolean;
};

export type IneligibleReason = "under1y" | "under15h";

export type SeveranceResult = {
  termDays: number;
  eligible: boolean;
  reasons: IneligibleReason[];
  /** 1년 요건을 채우는 가장 이른 퇴직일 */
  firstEligible: YMD;
  period: WagePeriod;
  wage: AverageWage;
  /** 입력한 1일 통상임금 (없으면 0) */
  ordinaryDaily: number;
  /** 퇴직금 계산에 쓴 1일 임금 */
  baseDaily: number;
  basis: "average" | "ordinary";
  /** 퇴직금 (대상이 아니면 0) */
  severance: number;
  /** 근속월수 (세법) */
  months: number;
  /** 퇴직소득세 (대상이 아니면 null) */
  tax: RetirementTax | null;
  /** 세후 수령액 */
  net: number;
};

/** Full calculation. Returns null when 퇴직일 is not after 입사일. */
export function calcSeverance(input: SeveranceInput): SeveranceResult | null {
  const { hire, retire } = input;
  if (compareYMD(retire, hire) <= 0) return null;
  const termDays = serviceDays(hire, retire);
  const reasons: IneligibleReason[] = [];
  if (!hasOneYearService(hire, retire)) reasons.push("under1y");
  if (!input.weekly15h) reasons.push("under15h");
  const eligible = reasons.length === 0;

  const period = averageWagePeriod(retire);
  const wage = averageDailyWage({
    wage3m: input.wage3m,
    annualBonus: input.annualBonus,
    annualLeavePay: input.annualLeavePay,
    days: period.days,
  });
  const ordinaryDaily = won(input.ordinaryDaily ?? 0);
  const basis = ordinaryDaily > wage.daily ? "ordinary" : "average";
  const baseDaily = basis === "ordinary" ? ordinaryDaily : wage.daily;
  const severance = eligible ? severanceAmount(baseDaily, termDays) : 0;
  const months = serviceMonths(hire, retire);
  const tax = eligible && severance > 0 ? retirementIncomeTax(severance, taxServiceYears(months)) : null;

  return {
    termDays,
    eligible,
    reasons,
    firstEligible: firstEligibleRetireDate(hire),
    period,
    wage,
    ordinaryDaily,
    baseDaily,
    basis,
    severance,
    months,
    tax,
    net: severance - (tax?.total ?? 0),
  };
}

// ─────────────────────────── 표 (prose) ───────────────────────────

/** 표에 쓰는 월급 (원)과 근속연수. */
export const TABLE_MONTHLY = [2_500_000, 3_000_000, 4_000_000, 5_000_000];
export const TABLE_YEARS = [1, 3, 5, 10];
/** 표 가정: 3개월 기간 92일 (예: 10월 1일 퇴직), 재직일수 365일 × 근속연수, 상여·연차수당 없음. */
export const TABLE_PERIOD_DAYS = 92;

/** 월급 × 근속연수 표의 퇴직금. */
export function severanceEstimate(monthly: number, years: number, days = TABLE_PERIOD_DAYS): number {
  const { daily } = averageDailyWage({ wage3m: monthly * 3, annualBonus: 0, annualLeavePay: 0, days });
  return severanceAmount(daily, 365 * years);
}

/** 퇴직소득세 표: 퇴직금 (원) × 근속연수. */
export const TAX_TABLE_AMOUNTS = [30_000_000, 50_000_000, 100_000_000, 200_000_000, 300_000_000];
export const TAX_TABLE_YEARS = [5, 10, 20, 30];
