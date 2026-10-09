/**
 * 자동차세(소유분) 계산 — 승용자동차.
 *
 * 근거 (2026년 10월 9일 확인):
 * - 지방세법 제127조 제1항 제1호: 승용자동차 cc당 세액
 *     비영업용 1,000cc 이하 80원 · 1,600cc 이하 140원 · 1,600cc 초과 200원
 *     영업용   1,600cc 이하 18원 · 2,500cc 이하 19원 · 2,500cc 초과 24원
 * - 같은 항 제2호: 비영업용 승용자동차 중 차령 3년 이상은
 *     각 기분세액 = A/2 − (A/2 × 5/100)(n − 2)   (A: 제1호 연세액, n: 차령, 12년 초과는 12년)
 *   → 영업용과 '그 밖의 승용자동차'(전기·수소차, 제3호)는 차령 경감이 없다.
 * - 같은 항 제3호: 그 밖의 승용자동차(전기·수소 등) 비영업용 연 100,000원, 영업용 20,000원.
 * - 지방세법 시행령 제122조 제2항: 차령 = 과세연도 − 기산일 연도 + 1 (기산일 1~6월),
 *   기산일 7~12월이면 제1기분은 +0, 제2기분은 +1. 기산일은 자동차관리법 시행령 제3조
 *   (제작연도에 등록한 차는 최초 신규등록일, 아니면 제작연도 말일).
 * - 지방세법 제128조 제1항: 연세액의 1/2씩 6월(16~30일)·12월(16~31일) 징수.
 *   제3항: 연세액을 한꺼번에 신고납부하면 공제 (2026. 1. 1. 시행 조문)
 *     1월 16~31일, 3월 16~31일: 연세액 × (납부기한 다음 날~12/31 일수 / 365·366) × 이자율
 *     6월 16~30일: 제2기분 세액 × 이자율
 *     9월 16~30일: 제2기분 세액 × (10/1~12/31 일수 / 184) × 이자율
 *   제4항: 연세액 10만원 이하는 제1기분 부과 때 전액 부과·징수할 수 있고, 제2기분 세액 × 이자율을 공제.
 * - 지방세법 시행령 제125조 제6항: 이자율 100분의 5 (2025·2026년 5% 유지, 행정안전부).
 * - 지방세법 제151조: 비영업용 승용자동차 자동차세액의 30%를 지방교육세로 부과.
 * - 신규등록(과세연도 중 처음 등록): 기분 과세기준일(6/1·12/1)에 없던 차라 정기분이 아니라 수시분으로,
 *   등록일부터 그 기분 말일까지 일할 계산한다 (제128조 제2항 단서). 일할 금액은 시행령 제126조 본문
 *   '연세액 × 과세대상기간 일수 ÷ 그 해 총일수' (신규등록 차는 차령 1년이라 단서의 기분세액 방식은 해당 없음).
 *   → 7~12월에 등록한 차는 제1기분이 없다(차령 0).
 *
 * 금액은 기분(6월분·12월분)마다 10원 미만을 버린다. 지자체 고지서와 10원 단위 차이가 날 수 있다.
 */
import { daysInMonth, diffDays, isLeapYear } from "@/lib/date";

/** electric = 비영업용 전기·수소, electricBusiness = 영업용 전기·수소 (그 밖의 승용자동차) */
export type CarKind = "private" | "electric" | "business" | "electricBusiness";
export type PrepayMonth = 1 | 3 | 6 | 9;

/** Basis line shown under the lead on every car-tax page. */
export const CAR_TAX_BASIS =
  "지방세법 제127조·제128조·제151조, 시행령 제122조·제125조(연납 이자율 5%)·제126조(일할) 기준 · 2026년 10월 9일 확인";

export const CAR_KIND_LABEL: Record<CarKind, string> = {
  private: "비영업용 승용",
  electric: "비영업용 전기·수소",
  business: "영업용 승용",
  electricBusiness: "영업용 전기·수소",
};

/** 전기·수소 등 '그 밖의 승용자동차' (배기량 없이 정액) */
export function isElectric(kind: CarKind): boolean {
  return kind === "electric" || kind === "electricBusiness";
}

/** 영업용 (택시·렌터카 등): 차령 경감·지방교육세 없음 */
export function isBusiness(kind: CarKind): boolean {
  return kind === "business" || kind === "electricBusiness";
}

type Bracket = { upTo: number; perCc: number; label: string };

/** 지방세법 제127조 제1항 제1호 — 비영업용 승용자동차 */
export const PRIVATE_BRACKETS: Bracket[] = [
  { upTo: 1000, perCc: 80, label: "1,000cc 이하" },
  { upTo: 1600, perCc: 140, label: "1,600cc 이하" },
  { upTo: Infinity, perCc: 200, label: "1,600cc 초과" },
];

/** 지방세법 제127조 제1항 제1호 — 영업용 승용자동차 (1,000·1,600cc 이하 18원, 2,000·2,500cc 이하 19원) */
export const BUSINESS_BRACKETS: Bracket[] = [
  { upTo: 1600, perCc: 18, label: "1,600cc 이하" },
  { upTo: 2500, perCc: 19, label: "2,500cc 이하" },
  { upTo: Infinity, perCc: 24, label: "2,500cc 초과" },
];

/** 그 밖의 승용자동차(전기·수소 등) 연세액, 지방세법 제127조 제1항 제3호 */
export const ELECTRIC_PRIVATE_ANNUAL = 100_000;
export const ELECTRIC_BUSINESS_ANNUAL = 20_000;

/** 지방교육세: 비영업용 승용자동차 자동차세액의 30% (지방세법 제151조) */
export const EDU_TAX_PCT = 30;
/** 차령 경감: 3년차부터 1년에 5%씩, 차령 12년(50%)까지 */
export const AGE_REDUCTION_PCT_PER_YEAR = 5;
export const AGE_CAP = 12;
/** 연세액(자동차세) 10만원 이하 → 6월에 1년치 일괄 부과 (지방세법 제128조 제4항) */
export const LUMP_SUM_LIMIT = 100_000;
/** 연납 공제 이자율 (지방세법 시행령 제125조 제6항, 2026년 5%) */
export const PREPAY_RATE_PCT = 5;
/** 이자율이 확정된 마지막 과세연도. 이후 연도는 같은 이자율을 가정한다. */
export const PREPAY_RATE_CONFIRMED_YEAR = 2026;
/** 제2기분 기간(7/1~12/31) 일수 */
export const SECOND_HALF_DAYS = 184;
/** 9월 연납: 10/1~12/31 일수 */
export const SEPT_REMAINING_DAYS = 92;

export const PREPAY_MONTHS: PrepayMonth[] = [1, 3, 6, 9];

export const PREPAY_WINDOW: Record<PrepayMonth, string> = {
  1: "1월 16일~31일",
  3: "3월 16일~31일",
  6: "6월 16일~30일",
  9: "9월 16일~30일",
};

/** Last day of each prepayment window (month, day), used to tell whether it has passed. */
export const PREPAY_WINDOW_END: Record<PrepayMonth, { m: number; d: number }> = {
  1: { m: 1, d: 31 },
  3: { m: 3, d: 31 },
  6: { m: 6, d: 30 },
  9: { m: 9, d: 30 },
};

/** Which part of the tax each prepayment month discounts (for notes). */
export const PREPAY_BASE_LABEL: Record<PrepayMonth, string> = {
  1: "2~12월분 세액의 5%",
  3: "4~12월분 세액의 5%",
  6: "하반기(7~12월)분 세액의 5%",
  9: "10~12월분 세액의 5%",
};

/** 10원 미만 버림 for a non-negative ratio numer/denom (integers keep it exact). */
function floor10(numer: number, denom = 1): number {
  return Math.floor(numer / (denom * 10)) * 10;
}

function bracketFor(kind: "private" | "business", cc: number): Bracket {
  const list = kind === "private" ? PRIVATE_BRACKETS : BUSINESS_BRACKETS;
  return list.find((b) => cc <= b.upTo) ?? list[list.length - 1];
}

/** cc당 세액 (원). */
export function perCcRate(kind: "private" | "business", cc: number): number {
  return bracketFor(kind, cc).perCc;
}

/** Bracket label such as "1,600cc 초과". */
export function bracketLabel(kind: "private" | "business", cc: number): string {
  return bracketFor(kind, cc).label;
}

/** 차령 for 제1기분 and 제2기분 (지방세법 시행령 제122조 제2항). */
export function carAge(taxYear: number, regYear: number, regMonth: number): { first: number; second: number } {
  const diff = taxYear - regYear;
  if (regMonth <= 6) return { first: diff + 1, second: diff + 1 };
  return { first: diff, second: diff + 1 };
}

/** 차령 경감률 (%): 차령 3년부터 5%씩, 12년 이상 50%. */
export function ageReductionPct(age: number): number {
  if (!Number.isFinite(age) || age < 3) return 0;
  return AGE_REDUCTION_PCT_PER_YEAR * (Math.min(age, AGE_CAP) - 2);
}

export type CarTaxInput = {
  kind: CarKind;
  /** 배기량 (cc). Ignored for electric kinds. */
  cc: number;
  /** 차령 기산일 연·월 (보통 최초 등록 연월). Only used for 비영업용 승용. */
  regYear: number;
  regMonth: number;
  /** 등록일 (1~31, default 1). Only matters when regYear === taxYear (일할 계산 시작일). */
  regDay?: number;
  taxYear: number;
};

export type HalfTax = {
  /** 차령 (0 when the car did not exist in that half; 0 for kinds without 차령 경감) */
  age: number;
  reductionPct: number;
  /** 이 기분에 세금을 매기는 일수 (등록일 포함) */
  days: number;
  /** 기분 전체 일수 (제1기분 181·182일, 제2기분 184일) */
  periodDays: number;
  carTax: number;
  eduTax: number;
  total: number;
};

export type CarTaxResult = {
  kind: CarKind;
  cc: number;
  taxYear: number;
  /** cc당 세액 (0 for electric kinds) */
  perCc: number;
  /** 기본 세액 = 배기량 × cc당 세액 (전기·수소는 정액) */
  baseAnnual: number;
  /** 실제 기분별 세액 (올해 등록한 차는 등록일부터 일할, 등록 전 기분은 0) */
  halves: [HalfTax, HalfTax];
  /** 1년 내내 보유했다면의 기분별 세액 (= 연세액 기준). Same as halves unless registered in the tax year. */
  fullHalves: [HalfTax, HalfTax];
  /** 연 자동차세 (차령 경감·끝수 처리·일할 후) */
  carTax: number;
  /** 1년 내내 보유했을 때 자동차세 (연세액) */
  fullCarTax: number;
  /** 차령 경감 (+끝수) = baseAnnual − fullCarTax */
  reduction: number;
  /** 등록 전 기간이라 빠진 자동차세 = fullCarTax − carTax */
  prorationCut: number;
  eduTax: number;
  /** 합계 = 자동차세 + 지방교육세 */
  total: number;
  /** 1년 내내 보유했을 때 합계 */
  fullTotal: number;
  /** 연 자동차세 10만원 이하 → 6월에 1년치 일괄 고지 */
  lumpSum: boolean;
  /** 일괄 고지 때 빼 주는 하반기분 공제 (lumpSum only) */
  lumpSumDeduction: number;
  /** 기분별 고지액 */
  june: number;
  december: number;
  /** 과세연도에 처음 등록한 차 */
  registeredInTaxYear: boolean;
  /** 세금이 시작되는 날 (registeredInTaxYear only; otherwise null = 1년 내내) */
  ownedFrom: { m: number; d: number } | null;
  /** 세금을 매긴 일수 합계 */
  ownedDays: number;
  /** true when at least one 기분 is 일할 or missing */
  partialYear: boolean;
};

export function hasEduTax(kind: CarKind): boolean {
  return !isBusiness(kind);
}

/** Validates inputs; returns a Korean message or null when OK. */
export function validateInput(input: CarTaxInput): string | null {
  if (!isElectric(input.kind)) {
    if (!Number.isFinite(input.cc) || input.cc <= 0) return "배기량을 cc 단위로 입력하면 바로 계산해 드려요.";
    if (!Number.isInteger(input.cc)) return "배기량은 정수(cc)로 입력해 주세요.";
  }
  if (input.kind === "private") {
    if (!Number.isInteger(input.regYear) || !Number.isInteger(input.regMonth) || input.regMonth < 1 || input.regMonth > 12)
      return "최초 등록 연월을 골라 주세요.";
    if (input.regYear > input.taxYear) return "최초 등록 연도가 과세연도보다 늦어요. 등록 연도를 다시 골라 주세요.";
    if (
      input.regYear === input.taxYear &&
      input.regDay !== undefined &&
      (!Number.isInteger(input.regDay) || input.regDay < 1 || input.regDay > daysInMonth(input.regYear, input.regMonth))
    )
      return "등록일을 다시 골라 주세요.";
  }
  return null;
}

/** 제1기분(1/1~6/30) 일수 */
export function firstHalfDays(year: number): number {
  return isLeapYear(year) ? 182 : 181;
}

/** 연간 자동차세 (6월분·12월분 각각 계산해 합산). Call validateInput first. */
export function computeCarTax(input: CarTaxInput): CarTaxResult {
  const { kind, taxYear } = input;
  const electric = isElectric(kind);
  const cc = electric ? 0 : input.cc;
  const perCc = electric ? 0 : perCcRate(isBusiness(kind) ? "business" : "private", cc);
  const baseAnnual = electric
    ? kind === "electric"
      ? ELECTRIC_PRIVATE_ANNUAL
      : ELECTRIC_BUSINESS_ANNUAL
    : cc * perCc;

  const yearDays = daysInYear(taxYear);
  const periodDays: [number, number] = [firstHalfDays(taxYear), yearDays - firstHalfDays(taxYear)];
  const ages =
    kind === "private" ? carAge(taxYear, input.regYear, input.regMonth) : { first: 0, second: 0 };

  // 1년 내내 보유했을 때의 기분 세액: A/2 − A/2 × 5/100 × (n−2) = A × (100 − 경감률) / 200
  const fullHalf = (i: 0 | 1, age: number): HalfTax => {
    const reductionPct = kind === "private" ? ageReductionPct(age) : 0;
    const carTax = floor10(baseAnnual * (100 - reductionPct), 200);
    const eduTax = hasEduTax(kind) ? floor10(carTax * EDU_TAX_PCT, 100) : 0;
    return { age, reductionPct, days: periodDays[i], periodDays: periodDays[i], carTax, eduTax, total: carTax + eduTax };
  };
  const fullHalves: [HalfTax, HalfTax] = [fullHalf(0, ages.first), fullHalf(1, ages.second)];

  // 과세연도에 처음 등록한 비영업용 승용차: 등록일(포함)부터 기분 말일까지 일할.
  const registeredInTaxYear = kind === "private" && input.regYear === taxYear;
  const regDay = registeredInTaxYear
    ? Math.min(Math.max(1, Math.floor(input.regDay ?? 1)), daysInMonth(taxYear, input.regMonth))
    : 1;
  const startIdx = registeredInTaxYear
    ? diffDays({ y: taxYear, m: 1, d: 1 }, { y: taxYear, m: input.regMonth, d: regDay })
    : 0;
  const owned: [number, number] = [
    Math.max(0, periodDays[0] - startIdx),
    Math.min(periodDays[1], yearDays - startIdx),
  ];
  const actualHalf = (i: 0 | 1): HalfTax => {
    const full = fullHalves[i];
    const days = owned[i];
    if (days >= full.periodDays) return full;
    if (days <= 0 || (kind === "private" && full.age < 1))
      return { ...full, days: 0, carTax: 0, eduTax: 0, total: 0 };
    // 시행령 제126조 본문: 연세액 × 과세대상기간 일수 ÷ 그 해 총일수 (신규등록 차는 차령 1년, 경감 0%)
    const carTax = floor10(baseAnnual * (100 - full.reductionPct) * days, 100 * yearDays);
    const eduTax = hasEduTax(kind) ? floor10(carTax * EDU_TAX_PCT, 100) : 0;
    return { ...full, days, carTax, eduTax, total: carTax + eduTax };
  };
  const halves: [HalfTax, HalfTax] = [actualHalf(0), actualHalf(1)];

  const fullCarTax = fullHalves[0].carTax + fullHalves[1].carTax;
  const carTax = halves[0].carTax + halves[1].carTax;
  const eduTax = halves[0].eduTax + halves[1].eduTax;
  const total = carTax + eduTax;
  // 제128조 제4항은 연세액 기준. 제1기분이 없는 차(7월 이후 등록)는 6월 일괄 고지 대상이 아니다.
  const lumpSum = fullCarTax <= LUMP_SUM_LIMIT && halves[0].days > 0;
  const lumpSumDeduction = lumpSum ? floor10(halves[1].total * prepayRatePct(taxYear), 100) : 0;

  return {
    kind,
    cc,
    taxYear,
    perCc,
    baseAnnual,
    halves,
    fullHalves,
    carTax,
    fullCarTax,
    reduction: baseAnnual - fullCarTax,
    prorationCut: fullCarTax - carTax,
    eduTax,
    total,
    fullTotal: fullHalves[0].total + fullHalves[1].total,
    lumpSum,
    lumpSumDeduction,
    june: lumpSum ? total - lumpSumDeduction : halves[0].total,
    december: lumpSum ? 0 : halves[1].total,
    registeredInTaxYear,
    ownedFrom: registeredInTaxYear ? { m: input.regMonth, d: regDay } : null,
    ownedDays: halves[0].days + halves[1].days,
    partialYear: halves.some((h) => h.days < h.periodDays),
  };
}

/** 연납 공제 이자율 (%) for a tax year. Years after the confirmed one assume the same rate. */
export function prepayRatePct(taxYear: number): number {
  void taxYear;
  return PREPAY_RATE_PCT;
}

function daysInYear(y: number): number {
  return isLeapYear(y) ? 366 : 365;
}

/** Days from the day after the window's deadline to 12/31 (1월: 2/1~, 3월: 4/1~). */
export function remainingDays(year: number, month: 1 | 3): number {
  const feb = isLeapYear(year) ? 29 : 28;
  return month === 1 ? daysInYear(year) - 31 : daysInYear(year) - (31 + feb + 31);
}

export type PrepayResult = {
  month: PrepayMonth;
  /** false when the tax was already billed in full in June (10만원 이하, 9월) or the car was not registered yet */
  available: boolean;
  /** Why it is unavailable: 6월 일괄 고지 (lumpSum) or 신청 기간 뒤에 등록 (notRegistered). null when available. */
  unavailableReason: "lumpSum" | "notRegistered" | null;
  /** true when this month equals the June lump-sum billing (10만원 이하 + 6월) */
  sameAsLumpSum: boolean;
  window: string;
  /** 공제액 = 절감액 (연간 합계 대비) */
  deduction: number;
  /** 연납 시 1년 동안 내는 돈 */
  annualPay: number;
  /** 그 달에 내는 돈 (9월은 하반기분만, 6월분은 이미 정기 고지로 냄) */
  payInMonth: number;
  /** deduction / total */
  effectiveRate: number;
};

/**
 * 연세액 일시 신고납부(연납) 공제 — 지방세법 제128조 제3항.
 * Deduction is computed on the total bill (자동차세 + 지방교육세): 지방교육세는 '납부하여야 할 자동차세액'의 30%라
 * 자동차세가 줄어든 만큼 함께 줄어든다.
 *
 * 올해 등록한 차: 신청 기간이 끝난 뒤(등록 월 > 신청 월)에 등록했다면 그 달 연납은 할 수 없다. 할 수 있는 달은
 * 공제 대상 기간(납부기한 다음 날~12/31) 전체를 보유하므로 1년 보유 차와 같은 공제액으로 추정한다.
 */
export function prepay(r: CarTaxResult, month: PrepayMonth, ratePct = prepayRatePct(r.taxYear)): PrepayResult {
  const window = PREPAY_WINDOW[month];
  const unavailable = (unavailableReason: "lumpSum" | "notRegistered"): PrepayResult => ({
    month,
    available: false,
    unavailableReason,
    sameAsLumpSum: false,
    window,
    deduction: 0,
    annualPay: r.total,
    payInMonth: 0,
    effectiveRate: 0,
  });
  if (r.ownedFrom && r.ownedFrom.m > month) return unavailable("notRegistered");
  if (r.lumpSum && month === 9) return unavailable("lumpSum");
  const fullSecond = r.fullHalves[1].total;
  let deduction: number;
  if (month === 1 || month === 3) {
    deduction = floor10(r.fullTotal * remainingDays(r.taxYear, month) * ratePct, daysInYear(r.taxYear) * 100);
  } else if (month === 6) {
    deduction = floor10(fullSecond * ratePct, 100);
  } else {
    deduction = floor10(fullSecond * SEPT_REMAINING_DAYS * ratePct, SECOND_HALF_DAYS * 100);
  }
  deduction = Math.min(deduction, r.total);
  const annualPay = r.total - deduction;
  return {
    month,
    available: true,
    unavailableReason: null,
    sameAsLumpSum: r.lumpSum && month === 6,
    window,
    deduction,
    annualPay,
    payInMonth: month === 9 ? r.halves[1].total - deduction : annualPay,
    effectiveRate: r.total > 0 ? deduction / r.total : 0,
  };
}

/**
 * 차령표 첫 줄. 차령 1년(과세연도에 처음 등록한 차)은 등록일부터 일할 계산해 1년치 금액이 없으므로 표에서 뺀다.
 * 차령 2년(전년도 1~6월 등록)부터 1년 내내 보유한 금액이다.
 */
export const AGE_TABLE_FROM = 2;

/** One row per 차령 (2 … 12, the last meaning "12년 이상") for a car registered in January–June and owned all year. */
export function ageTable(kind: CarKind, cc: number, taxYear: number) {
  return Array.from({ length: AGE_CAP - AGE_TABLE_FROM + 1 }, (_, i) => {
    const age = i + AGE_TABLE_FROM;
    const regYear = taxYear - age + 1;
    const r = computeCarTax({ kind, cc, regYear, regMonth: 1, taxYear });
    return { age, regYear, reductionPct: ageReductionPct(age), result: r, january: prepay(r, 1) };
  });
}

/** Displacements that get their own page: /car-tax/<cc>/ */
export const CAR_TAX_PAGE_CC = [998, 1353, 1497, 1598, 1999, 2151, 2497, 2999, 3342, 3778];

/** Plain size-class descriptions (no brand names). */
export const CC_CLASS: Record<number, string> = {
  998: "경차 (1.0L급)",
  1353: "1.4L 터보급 소형·준중형",
  1497: "1.5L급 소형·준중형",
  1598: "1.6L급 준중형·소형 SUV",
  1999: "2.0L급 중형",
  2151: "2.2L 디젤급 SUV",
  2497: "2.5L급 중형·준대형",
  2999: "3.0L급 대형",
  3342: "3.3L급 준대형·대형",
  3778: "3.8L급 대형",
};

export function ccClass(cc: number): string {
  return CC_CLASS[cc] ?? (cc < 1000 ? "경차급" : cc <= 1600 ? "소형·준중형급" : cc <= 2000 ? "중형급" : "대형급");
}
