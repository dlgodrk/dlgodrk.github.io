/**
 * 육아휴직 급여 · 출산전후휴가 급여 · 배우자 출산휴가 급여 (checked 2026-10-09).
 *
 * 육아휴직 급여 — 고용보험법 시행령 제95조 (2024-12-24 개정, 2025-01-01 시행분부터):
 *   1~3개월 통상임금 100% (월 상한 250만원), 4~6개월 100% (상한 200만원),
 *   7개월~종료 80% (상한 160만원), 하한 월 70만원. 사후지급금(25%)은 폐지되어 전액을 매달 지급.
 * 한부모 특례 — 시행령 제95조의3③: 1~3개월 100% (상한 300만원), 4~6개월 100% (200만원), 7개월~ 80% (160만원).
 * 6+6 부모육아휴직제 — 시행령 제95조의3①: 자녀 생후 18개월 안에 부모가 모두 육아휴직을 하면
 *   부모 각각 첫 6개월 통상임금 100%, 월 상한 250·250·300·350·400·450만원. 상향 상한은 부모가 "공통으로"
 *   사용한 기간(짧은 쪽, 최대 6개월)만큼만 적용되고, 먼저 쉰 부모는 두 번째 부모가 휴직하면 차액을 추가로 받습니다
 *   (고용노동부 안내, 연합뉴스 2026-05-06 "복잡해진 육아휴직 제도 A to Z").
 * 육아휴직 기간 — 남녀고용평등법 제19조 (2025-02-23 시행): 1년, 부모가 각각 3개월 이상 쓰거나 한부모·
 *   장애아동 부모이면 6개월 더해 최대 1년 6개월. 늘어난 기간도 7개월 이후 기준(80%, 160만원)을 따릅니다.
 *
 * 출산전후휴가 급여 — 근로기준법 제74조, 고용보험법 제75조·제76조, 「출산전후휴가 급여 등 상한액 고시」:
 *   90일 (미숙아 100일, 다태아 120일). 최초 60일(다태아 75일)은 사업주 유급 의무.
 *   우선지원대상기업은 고용보험이 전 기간을 지급하고 회사는 최초 60일(75일)의 상한 초과분만 보전,
 *   대규모기업은 최초 60일(75일)을 회사가 통상임금으로 주고 나머지(30·40·45일)를 고용보험이 지급.
 *   상한 30일 220만원 (2026-01-01 이후 시작, 2025년까지 210만원). 하한은 최저임금 (주 40시간 월 환산).
 *   2027년 상한은 고시 전이라, 2027년 최저임금 월 환산액(2,236,300원)이 220만원보다 높은 점을 반영해
 *   max(220만원, 최저임금 월 환산액)으로 "예상" 계산합니다.
 * 배우자 출산휴가 — 남녀고용평등법 제18조의2 (2025-02-23부터 20일, 3회 분할; 2026-09-18부터 출산예정일 50일 전~출산 후 120일):
 *   20일 모두 유급. 우선지원대상기업 근로자는 고용보험이 20일분을 통상임금으로 지원하며 상한 20일 1,684,210원
 *   (2026, = 220만원 ÷ 209시간 × 8시간 × 20일, 10원 미만 절사; 2025년 1,607,650원).
 */
import { addDays, daysInMonth, type YMD } from "@/lib/date";
import { minimumMonthly } from "@/lib/rates/labor";

// ───────────────────────────── 육아휴직 급여 ─────────────────────────────

/** 육아휴직 급여 하한 (월). */
export const PARENTAL_FLOOR = 700_000;
/** 기본 육아휴직 기간 (개월). */
export const BASE_MONTHS = 12;
/** 요건을 채우면 쓸 수 있는 최대 기간 (개월). */
export const MAX_MONTHS = 18;
/** 6+6 특례 상향 상한 (1~6개월째). */
export const SIX_SIX_CAPS = [2_500_000, 2_500_000, 3_000_000, 3_500_000, 4_000_000, 4_500_000] as const;
export const SIX_SIX_MONTHS = SIX_SIX_CAPS.length;
/** 통상임금 입력 상한 (오입력 방지용). */
export const MAX_WAGE = 100_000_000;

export type LeaveRule = "general" | "single" | "sixsix";
export type Household = "alone" | "both" | "single";
export type Order = "first" | "second";

export type MonthRule = { rule: LeaveRule; ratePct: 100 | 80; cap: number };

/** 일반 육아휴직 급여 기준 (시행령 제95조). k = 1부터 세는 회차. */
export function generalRule(k: number): MonthRule {
  if (k <= 3) return { rule: "general", ratePct: 100, cap: 2_500_000 };
  if (k <= 6) return { rule: "general", ratePct: 100, cap: 2_000_000 };
  return { rule: "general", ratePct: 80, cap: 1_600_000 };
}

/** 한부모 특례 (시행령 제95조의3③). */
export function singleParentRule(k: number): MonthRule {
  if (k <= 3) return { rule: "single", ratePct: 100, cap: 3_000_000 };
  if (k <= 6) return { rule: "single", ratePct: 100, cap: 2_000_000 };
  return { rule: "single", ratePct: 80, cap: 1_600_000 };
}

/** 6+6 특례 (시행령 제95조의3①). commonMonths = 부모가 공통으로 쓴 개월 수 (최대 6). */
export function sixSixRule(k: number, commonMonths: number): MonthRule {
  if (k <= Math.min(commonMonths, SIX_SIX_MONTHS)) return { rule: "sixsix", ratePct: 100, cap: SIX_SIX_CAPS[k - 1] };
  return generalRule(k);
}

export type MonthlyAmount = {
  /** 통상임금 × 지급률 (원 미만 절사) */
  raw: number;
  amount: number;
  capped: boolean;
  floored: boolean;
};

/** One month's benefit: 통상임금 × 지급률, then the cap and the 70만원 floor. */
export function monthlyBenefit(wage: number, r: MonthRule): MonthlyAmount {
  const w = Math.max(0, Math.floor(wage));
  const raw = Math.floor((w * r.ratePct) / 100);
  if (raw > r.cap) return { raw, amount: r.cap, capped: true, floored: false };
  if (raw < PARENTAL_FLOOR) return { raw, amount: PARENTAL_FLOOR, capped: false, floored: true };
  return { raw, amount: raw, capped: false, floored: false };
}

/**
 * Last day of the k-th month counted from `start` (민법 제160조: 기간은 기산일의 해당일 전날에 끝나고,
 * 마지막 달에 해당일이 없으면 그 달 말일에 끝남). 2026-01-31 시작 → 1개월째는 2026-02-28에 끝남.
 */
export function monthEnd(start: YMD, k: number): YMD {
  const total = start.y * 12 + (start.m - 1) + k;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  const dim = daysInMonth(y, m);
  if (start.d > dim) return { y, m, d: dim };
  return addDays({ y, m, d: start.d }, -1);
}

/** [from, to] of each 회차 for `months` months starting on `start`. */
export function monthPeriods(start: YMD, months: number): { from: YMD; to: YMD }[] {
  const out: { from: YMD; to: YMD }[] = [];
  let from = start;
  for (let k = 1; k <= months; k++) {
    const to = monthEnd(start, k);
    out.push({ from, to });
    from = addDays(to, 1);
  }
  return out;
}

export type ParentalInput = {
  /** 휴직 시작일 기준 월 통상임금 (원) */
  wage: number;
  /** 본인 육아휴직 기간 (개월, 1~18) */
  months: number;
  household: Household;
  /** household === "both": 배우자 육아휴직 기간 (개월) */
  spouseMonths?: number;
  /** household === "both": 두 사람 모두 자녀 생후 18개월 안에 휴직 (6+6 요건) */
  withinEighteen?: boolean;
  /** household === "both": 내가 먼저 쉬면 "first" (6+6 차액을 나중에 받음) */
  order?: Order;
  start?: YMD;
};

export type ParentalRow = MonthRule &
  MonthlyAmount & {
    n: number;
    from?: YMD;
    to?: YMD;
    /** 일반 기준(또는 한부모 기준)으로 받았을 금액 */
    baseline: number;
    /** 휴직 중에 받는 돈 */
    during: number;
    /** 배우자가 휴직을 시작한 뒤 추가로 받는 6+6 차액 (내가 먼저 쉰 경우) */
    later: number;
  };

export type ParentalResult = {
  rows: ParentalRow[];
  total: number;
  /** 같은 기간을 일반 기준(한부모는 한부모 기준)으로 받았을 때 */
  baselineTotal: number;
  /** 6+6이 적용된 개월 수 (0 = 미적용) */
  sixSixMonths: number;
  sixSixGain: number;
  paidDuring: number;
  paidLater: number;
  average: number;
  /** 12개월을 넘기는지 */
  extended: boolean;
  /** 12개월을 넘겨 쓸 수 있는 요건(부모 각각 3개월 이상 또는 한부모)을 입력상 채우는지 */
  extensionOk: boolean;
};

export function isValidWage(w: number): boolean {
  return Number.isFinite(w) && w > 0 && w <= MAX_WAGE;
}

export function clampMonths(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(MAX_MONTHS, Math.max(1, Math.round(n)));
}

/** 6+6 공통 사용 개월 수 (0이면 특례 없음). */
export function sixSixCommonMonths(input: ParentalInput): number {
  if (input.household !== "both" || !input.withinEighteen) return 0;
  const spouse = clampMonths(input.spouseMonths ?? 0);
  return Math.min(clampMonths(input.months), spouse, SIX_SIX_MONTHS);
}

export function calcParentalLeave(input: ParentalInput): ParentalResult | null {
  if (!isValidWage(input.wage)) return null;
  const months = clampMonths(input.months);
  const common = sixSixCommonMonths(input);
  const first = input.order === "first";
  const periods = input.start ? monthPeriods(input.start, months) : null;

  const rows: ParentalRow[] = [];
  for (let k = 1; k <= months; k++) {
    const baseRule = input.household === "single" ? singleParentRule(k) : generalRule(k);
    const rule = common > 0 ? sixSixRule(k, common) : baseRule;
    const amt = monthlyBenefit(input.wage, rule);
    const baseline = monthlyBenefit(input.wage, baseRule).amount;
    const extra = amt.amount - baseline;
    const later = first && rule.rule === "sixsix" ? extra : 0;
    rows.push({
      n: k,
      ...rule,
      ...amt,
      from: periods?.[k - 1].from,
      to: periods?.[k - 1].to,
      baseline,
      during: amt.amount - later,
      later,
    });
  }

  const sum = (f: (r: ParentalRow) => number) => rows.reduce((s, r) => s + f(r), 0);
  const total = sum((r) => r.amount);
  const baselineTotal = sum((r) => r.baseline);
  const spouse = clampMonths(input.spouseMonths ?? 0);
  return {
    rows,
    total,
    baselineTotal,
    sixSixMonths: common,
    sixSixGain: total - baselineTotal,
    paidDuring: sum((r) => r.during),
    paidLater: sum((r) => r.later),
    average: Math.round(total / months),
    extended: months > BASE_MONTHS,
    extensionOk: input.household === "single" || (input.household === "both" && spouse >= 3 && months >= 3),
  };
}

/** 6+6 첫 6개월 최대 합계 (부모 1인): 2,000만원. 일반 기준 첫 6개월 최대는 1,350만원. */
export const SIX_SIX_MAX_SIX_MONTHS = SIX_SIX_CAPS.reduce((s, c) => s + c, 0);
export const GENERAL_MAX_SIX_MONTHS = [1, 2, 3, 4, 5, 6].reduce((s, k) => s + generalRule(k).cap, 0);
/** 일반 기준 12개월 최대 합계: 2,310만원. */
export const GENERAL_MAX_YEAR = Array.from({ length: 12 }, (_, i) => generalRule(i + 1).cap).reduce((s, c) => s + c, 0);

// ───────────────────────────── 출산전후휴가 급여 ─────────────────────────────

export type BirthType = "single" | "premature" | "multiple";
export type CompanySize = "priority" | "large";

/** 휴가 일수: 한 명 90일, 미숙아 100일 (2025-02-23~), 다태아 120일. */
export const MATERNITY_DAYS: Record<BirthType, number> = { single: 90, premature: 100, multiple: 120 };
/** 사업주 유급 의무 일수 (근로기준법 제74조④): 최초 60일, 다태아 75일. */
export const EMPLOYER_PAID_DAYS: Record<BirthType, number> = { single: 60, premature: 60, multiple: 75 };

/** 30일 기준 상한액 by 휴가 시작 연도. 2027년은 고시 전. */
export const MATERNITY_CAP: Record<number, number> = { 2025: 2_100_000, 2026: 2_200_000 };
/** The last year whose cap is actually published. */
export const MATERNITY_CAP_YEAR = 2026;

/** Minimum-wage year for a start date: published values exist for 2025–2027. */
function wageYear(y: number): number {
  return Math.min(2027, Math.max(2025, y));
}

/** 최저임금 월 환산액 (주 40시간, 209시간) for the start year: 2026 → 2,156,880원. */
export function maternityFloor(start: YMD): number {
  return minimumMonthly(wageYear(start.y));
}

export type CapInfo = { cap: number; year: number; estimated: boolean };

/** 30일 기준 상한액. 2027년 이후 시작은 max(220만원, 그해 최저임금 월 환산액)으로 예상. */
export function maternityCap(start: YMD): CapInfo {
  if (start.y <= 2025) return { cap: MATERNITY_CAP[2025], year: start.y, estimated: false };
  if (start.y === 2026) return { cap: MATERNITY_CAP[2026], year: 2026, estimated: false };
  return { cap: Math.max(MATERNITY_CAP[MATERNITY_CAP_YEAR], maternityFloor(start)), year: start.y, estimated: true };
}

export type MaternitySegment = {
  fromDay: number;
  toDay: number;
  days: number;
  insurance: number;
  employer: number;
  total: number;
};

export type MaternityResult = {
  days: number;
  employerPaidDays: number;
  /** 고용보험이 지급하는 일수 */
  insuredDays: number;
  /** 30일 기준 고용보험 지급액 (상·하한 적용 후) */
  insuredMonthly: number;
  cap: CapInfo;
  floor: number;
  capApplied: boolean;
  floorApplied: boolean;
  segments: MaternitySegment[];
  insurance: number;
  employer: number;
  total: number;
  end?: YMD;
};

export type MaternityInput = {
  wage: number;
  birth: BirthType;
  size: CompanySize;
  start: YMD;
  /** false면 최저임금 하한을 적용하지 않음 (단시간 근로자는 하한이 근로시간에 비례해 낮아짐) */
  fullTime?: boolean;
};

export function calcMaternity(input: MaternityInput): MaternityResult | null {
  if (!isValidWage(input.wage)) return null;
  const wage = Math.floor(input.wage);
  const days = MATERNITY_DAYS[input.birth];
  const paidDays = EMPLOYER_PAID_DAYS[input.birth];
  const cap = maternityCap(input.start);
  const floor = maternityFloor(input.start);
  const useFloor = input.fullTime !== false;
  const floored = useFloor && wage < floor;
  const base = floored ? floor : wage;
  const insuredMonthly = Math.min(base, cap.cap);

  // Split the leave at every 30 days and at the employer-paid boundary (60 or 75).
  const marks = new Set<number>([paidDays, days]);
  for (let d = 30; d < days; d += 30) marks.add(d);
  const bounds = [...marks].filter((d) => d <= days).sort((a, b) => a - b);

  const segments: MaternitySegment[] = [];
  let prev = 0;
  for (const b of bounds) {
    const n = b - prev;
    const employerSpan = b <= paidDays;
    const insurance = input.size === "priority" || !employerSpan ? Math.floor((insuredMonthly * n) / 30) : 0;
    const wagePart = Math.floor((wage * n) / 30);
    const employer = employerSpan ? Math.max(0, wagePart - insurance) : 0;
    segments.push({ fromDay: prev + 1, toDay: b, days: n, insurance, employer, total: insurance + employer });
    prev = b;
  }

  const insurance = segments.reduce((s, x) => s + x.insurance, 0);
  const employer = segments.reduce((s, x) => s + x.employer, 0);
  return {
    days,
    employerPaidDays: paidDays,
    insuredDays: input.size === "priority" ? days : days - paidDays,
    insuredMonthly,
    cap,
    floor,
    capApplied: base > cap.cap,
    floorApplied: floored,
    segments,
    insurance,
    employer,
    total: insurance + employer,
    end: addDays(input.start, days - 1),
  };
}

// ───────────────────────────── 배우자 출산휴가 급여 ─────────────────────────────

export const SPOUSE_LEAVE_DAYS = 20;

/** 일 통상임금 = 월 통상임금 ÷ 209시간 × 8시간 (주 40시간 근로자). */
export function dailyOrdinaryWage(monthly: number): number {
  return Math.floor((Math.floor(monthly) * 8) / 209);
}

/** 고용보험 지원 상한 for `days` days (10원 미만 절사). 2026년 20일 → 1,684,210원. */
export function spouseLeaveCap(start: YMD, days: number): CapInfo {
  const m = maternityCap(start);
  return { ...m, cap: Math.floor((m.cap * 8 * days) / 2090) * 10 };
}

export type SpouseLeaveResult = {
  days: number;
  daily: number;
  total: number;
  government: number;
  employer: number;
  cap: CapInfo;
  capApplied: boolean;
};

export function calcSpouseLeave(input: {
  wage: number;
  days: number;
  size: CompanySize;
  start: YMD;
}): SpouseLeaveResult | null {
  if (!isValidWage(input.wage)) return null;
  const days = Math.min(SPOUSE_LEAVE_DAYS, Math.max(1, Math.round(Number.isFinite(input.days) ? input.days : SPOUSE_LEAVE_DAYS)));
  const wage = Math.floor(input.wage);
  const total = Math.floor((wage * 8 * days) / 209);
  const cap = spouseLeaveCap(input.start, days);
  const government = input.size === "priority" ? Math.min(total, cap.cap) : 0;
  return {
    days,
    daily: dailyOrdinaryWage(wage),
    total,
    government,
    employer: total - government,
    cap,
    capApplied: input.size === "priority" && total > cap.cap,
  };
}
