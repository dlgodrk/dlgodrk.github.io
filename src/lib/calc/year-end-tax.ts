import { basicIncomeTax, BASIC_TAX_BRACKETS } from "./severance";
import { employeeInsurance } from "@/lib/rates/insurance";
import { monthlyWithholding, type WithholdingRatio } from "@/lib/rates/withholding";
import type { YMD } from "@/lib/date";

/**
 * 연말정산 간이 예상 (2026년 귀속, 2027년 1~2월 정산). Integer arithmetic, 원 미만 절사.
 *
 * Pipeline (근로소득만 있는 거주자):
 *   총급여 → 근로소득공제 (소득세법 §47) → 근로소득금액
 *   − 인적공제 (§50 기본 150만, §51 추가) − 연금보험료공제 (§51의3)
 *   − 특별소득공제 중 건강·장기요양·고용보험료 (§52①)
 *   − 주택청약 (조특법 §87②) − 신용카드 등 (조특법 §126의2) → 과세표준
 *   → 산출세액 (§55 기본세율) − 세액공제 → 결정세액 (+ 지방소득세 10%)
 *   결정세액 − 기납부세액 → 추가 납부(+) / 환급(−), 10원 미만 절사 (국고금관리법 §47).
 *
 * Sources (checked 2026-10-09):
 * - 소득세법 §59 근로소득세액공제: 130만 이하 55%, 초과 71.5만 + 30%. 한도 74만 / 74만−(G−3,300만)×0.8% (최저 66만)
 *   / 66만−(G−7천만)×1/2 (최저 50만) / 50만−(G−1.2억)×1/2 (최저 20만). (법률 제19196호, 2023.1.1. 시행)
 * - 소득세법 §59의2 자녀세액공제: 1명 25만, 2명 55만, 3명 이상 55만 + 1명당 40만 (2025.1.1.~).
 *   대상 연령: 본칙 13세 이상 (법률 제21548호, 2026.4.21.), 부칙으로 2026 과세기간은 9세 이상,
 *   단 2017년생은 2026~2029년 아동수당 대상이라 제외 → 2026 귀속은 2006~2016년생 기본공제 자녀.
 *   출산·입양 첫째 30만, 둘째 50만, 셋째 이상 70만.
 * - 소득세법 §59의3 연금계좌: 연금저축 600만, 합산 900만 한도. 총급여 5,500만 이하 15%, 초과 12%.
 * - 소득세법 §59의4 특별세액공제 (법률 제21223호, 2026.1.1.): 보장성 보험 100만 한도 12%, 의료비 총급여 3% 초과분 15%
 *   (그 밖의 가족 700만 한도), 교육비 15%, 기부금 1천만 이하 15%·초과 30%. ⑨ 표준세액공제 13만은
 *   §52⑧(건강보험료 등 포함)·특별세액공제·월세세액공제를 신청하지 않은 경우만 → 두 방식 중 유리한 쪽을 고른다.
 * - 조특법 §126의2 (법률 제21467호 기준, 2028.12.31.까지 사용분): 최저사용금액 총급여 25%, 신용 15%,
 *   체크·현금 30%, 문화체육 30% (총급여 7천만 이하), 전통시장 40%, 대중교통 40%. 기본한도 300만(7천 이하)/250만,
 *   ⑩ 2026년 사용분부터 자녀 1명 +50만/+25만, 2명 이상 +100만/+50만. ⑪ 추가한도 300만(전통시장·대중교통·문화)/200만.
 *   ② 총급여 7천만 초과면 문화체육사용분을 따로 나누지 않고 결제 수단(신용 15% / 체크·현금 30%)대로 계산한다.
 * - 조특법 §87② 주택청약: 무주택 세대주(배우자 포함), 총급여 7천만 이하, 연 300만 한도 40%.
 * - 조특법 §95의2 월세: 무주택 세대의 세대주 (세대주가 주택청약·주택자금 공제를 받지 않으면 세대원도),
 *   총급여 8천만 이하, 1,000만 한도, 5,500만 이하 17% / 15%.
 * - 조특법 §92 혼인 세액공제: 2024.1.1.~2026.12.31. 혼인신고, 1회 50만.
 * - 조특법 §58 고향사랑기부금 (2026.1.1.~): 10만 이하 100/110, 10만 초과 20만 이하 40%, 20만 초과 15%.
 */

export const TAX_YEAR = 2026;

/** 총급여 input cap (원): 100억. */
export const MAX_TOTAL_PAY = 10_000_000_000;

const toInt = (n: number | undefined, max = MAX_TOTAL_PAY * 10): number =>
  typeof n === "number" && Number.isFinite(n) ? Math.min(Math.max(Math.floor(n), 0), max) : 0;

/** floor(amount × num / den) — exact for the magnitudes used here (< 2^53). */
const part = (amount: number, num: number, den = 100) => Math.floor((amount * num) / den);

/** 10원 미만 절사 toward zero (refunds stay negative). */
export const trunc10 = (x: number) => Math.trunc(x / 10) * 10 + 0;

// ---------------------------------------------------------------- 소득공제

/** 근로소득공제 (소득세법 제47조①, 한도 2,000만원). */
export function earnedIncomeDeduction(totalPay: number): number {
  const g = toInt(totalPay);
  let d: number;
  if (g <= 5_000_000) d = part(g, 70);
  else if (g <= 15_000_000) d = 3_500_000 + part(g - 5_000_000, 40);
  else if (g <= 45_000_000) d = 7_500_000 + part(g - 15_000_000, 15);
  else if (g <= 100_000_000) d = 12_000_000 + part(g - 45_000_000, 5);
  else d = 14_750_000 + part(g - 100_000_000, 2);
  return Math.min(d, 20_000_000);
}

/** 부녀자 / 한부모 추가공제 선택 (n = 해당 없음). */
export type ExtraPersonal = "n" | "w" | "s";

export type PersonalDeduction = { basic: number; senior: number; disabled: number; extra: number; total: number };

/** 인적공제 (소득세법 제50조·제51조). 부녀자공제는 종합소득금액 3천만원 이하만, 한부모와 겹치면 한부모. */
export function personalDeduction(
  family: number,
  seniors: number,
  disabled: number,
  extra: ExtraPersonal,
  earnedIncome: number,
): PersonalDeduction {
  const n = Math.max(1, toInt(family, 100));
  const basic = 1_500_000 * n;
  const senior = 1_000_000 * Math.min(toInt(seniors, 100), n);
  const dis = 2_000_000 * Math.min(toInt(disabled, 100), n);
  const ex = extra === "s" ? 1_000_000 : extra === "w" && earnedIncome <= 30_000_000 ? 500_000 : 0;
  return { basic, senior, disabled: dis, extra: ex, total: basic + senior + dis + ex };
}

export type CardSpending = {
  /** 신용카드 (전통시장·대중교통·문화체육 제외) */
  credit: number;
  /** 체크·직불·선불카드, 현금영수증 */
  debit: number;
  /** 도서·신문·공연·박물관·미술관·영화·수영장·체력단련장 */
  culture: number;
  /** 전통시장 */
  market: number;
  /** 대중교통 */
  transit: number;
};

export type CardDeduction = {
  spending: number;
  /** 최저사용금액 = 총급여 × 25% */
  threshold: number;
  /** 사용분별 공제율을 곱한 합계에서 최저사용금액분을 뺀 금액 (한도 적용 전) */
  deductible: number;
  /** 기본한도 (자녀 가산 포함) */
  baseLimit: number;
  basic: number;
  /** 추가공제 한도 (전통시장·대중교통·문화체육) */
  extraLimit: number;
  extra: number;
  total: number;
  /**
   * false when 총급여 > 7천만: 문화체육 사용분을 따로 나누지 않는다 (§126의2②). 그때 `culture` 칸 금액은
   * 신용카드 15%로 계산하므로, 체크카드·현금영수증으로 낸 문화체육 사용액은 `debit`에 넣어야 한다.
   */
  cultureSeparate: boolean;
};

export const CARD_THRESHOLD_RATE = 25;

/** 신용카드 등 사용금액 소득공제 (조세특례제한법 제126조의2, 2026년 사용분). `children` = 기본공제 대상 자녀 수. */
export function cardDeduction(totalPay: number, s: Partial<CardSpending>, children = 0): CardDeduction {
  const g = toInt(totalPay);
  const low = g <= 70_000_000;
  const culture = toInt(s.culture);
  const credit = toInt(s.credit) + (low ? 0 : culture);
  const debit = toInt(s.debit);
  const cult = low ? culture : 0;
  const market = toInt(s.market);
  const transit = toInt(s.transit);
  const spending = credit + debit + cult + market + transit;
  const threshold = part(g, CARD_THRESHOLD_RATE);

  const kids = Math.min(toInt(children, 100), 2);
  const baseLimit = (low ? 3_000_000 : 2_500_000) + kids * (low ? 500_000 : 250_000);
  const extraLimit = low ? 3_000_000 : 2_000_000;
  const empty = { spending, threshold, baseLimit, extraLimit, cultureSeparate: low };
  if (spending <= threshold) return { ...empty, deductible: 0, basic: 0, extra: 0, total: 0 };

  const gross = part(credit, 15) + part(debit + cult, 30) + part(market + transit, 40);
  // ⑥ 최저사용금액은 신용카드 → 체크·현금·문화체육 → 전통시장·대중교통 순서로 채운 것으로 본다.
  let minus: number;
  if (threshold <= credit) minus = part(threshold, 15);
  else if (threshold <= credit + debit + cult) minus = part(credit, 15) + part(threshold - credit, 30);
  else minus = part(credit, 15) + part(debit + cult, 30) + part(threshold - credit - debit - cult, 40);
  const deductible = Math.max(0, gross - minus);

  const basic = Math.min(deductible, baseLimit);
  const extraItems = part(market + transit, 40) + part(cult, 30);
  const extra = Math.min(deductible - basic, extraItems, extraLimit);
  return { ...empty, deductible, basic, extra, total: basic + extra };
}

/** 주택청약종합저축 소득공제 (조특법 제87조②): 무주택 세대주(배우자 포함), 총급여 7천만원 이하, 연 300만원 × 40%. */
export function housingSubscriptionDeduction(totalPay: number, paid: number, homelessHead: boolean): number {
  if (!homelessHead || toInt(totalPay) > 70_000_000) return 0;
  return part(Math.min(toInt(paid), 3_000_000), 40);
}

// ---------------------------------------------------------------- 세액

/** 산출세액 (소득세법 제55조① 기본세율). */
export function calculatedTax(taxBase: number): number {
  return basicIncomeTax(taxBase);
}

/** 과세표준이 속한 구간의 세율 (%). */
export function marginalRate(taxBase: number): number {
  const t = toInt(taxBase);
  return (BASIC_TAX_BRACKETS.find(([cap]) => t <= cap) ?? BASIC_TAX_BRACKETS[BASIC_TAX_BRACKETS.length - 1])[1];
}

/** 근로소득세액공제 한도 (소득세법 제59조②). */
export function earnedTaxCreditLimit(totalPay: number): number {
  const g = toInt(totalPay);
  if (g <= 33_000_000) return 740_000;
  if (g <= 70_000_000) return Math.max(660_000, 740_000 - part(g - 33_000_000, 8, 1000));
  if (g <= 120_000_000) return Math.max(500_000, 660_000 - part(g - 70_000_000, 1, 2));
  return Math.max(200_000, 500_000 - part(g - 120_000_000, 1, 2));
}

/** 근로소득세액공제 (소득세법 제59조). */
export function earnedTaxCredit(tax: number, totalPay: number): { raw: number; limit: number; credit: number } {
  const t = toInt(tax);
  const raw = t <= 1_300_000 ? part(t, 55) : 715_000 + part(t - 1_300_000, 30);
  const limit = earnedTaxCreditLimit(totalPay);
  return { raw, limit, credit: Math.min(raw, limit) };
}

/** 자녀세액공제 중 자녀수 공제 (소득세법 제59조의2①, 2025.1.1.~). */
export function childTaxCredit(children: number): number {
  const k = toInt(children, 100);
  if (k === 0) return 0;
  if (k === 1) return 250_000;
  return 550_000 + (k - 2) * 400_000;
}

/** 출산·입양 순서 (0 = 없음, 3 = 셋째 이상). */
export type BirthOrder = 0 | 1 | 2 | 3;

/** 출산·입양 세액공제 (소득세법 제59조의2③). */
export function birthTaxCredit(order: number): number {
  return order >= 3 ? 700_000 : order === 2 ? 500_000 : order === 1 ? 300_000 : 0;
}

export const MARRIAGE_CREDIT = 500_000;
export const STANDARD_CREDIT = 130_000;

/** 연금계좌세액공제 (소득세법 제59조의3). */
export function pensionAccountCredit(
  totalPay: number,
  savings: number,
  irp: number,
): { eligible: number; rate: number; credit: number } {
  const eligible = Math.min(Math.min(toInt(savings), 6_000_000) + toInt(irp), 9_000_000);
  const rate = toInt(totalPay) <= 55_000_000 ? 15 : 12;
  return { eligible, rate, credit: part(eligible, rate) };
}

/** 보장성 보험료 세액공제 (§59의4①1): 연 100만원 한도 12%. */
export function insuranceCredit(premium: number): number {
  return part(Math.min(toInt(premium), 1_000_000), 12);
}

/**
 * 의료비 세액공제 (§59의4②). `self` = 본인·65세 이상·장애인·6세 이하 등 한도 없는 의료비,
 * `other` = 그 밖의 기본공제대상자 의료비 (총급여 3% 초과분 700만원 한도). 미달분은 `self`에서 뺀다.
 */
export function medicalCredit(
  totalPay: number,
  self: number,
  other: number,
): { threshold: number; eligible: number; credit: number } {
  const threshold = part(toInt(totalPay), 3);
  const s = toInt(self);
  const o = toInt(other);
  const eligible = o >= threshold ? Math.min(o - threshold, 7_000_000) + s : Math.max(0, s - (threshold - o));
  return { threshold, eligible, credit: part(eligible, 15) };
}

/** 교육비 세액공제 (§59의4③): 15%. 1명당 한도(취학 전·초중고 300만, 대학 900만)는 입력 단계에서 반영. */
export function educationCredit(amount: number): number {
  return part(toInt(amount), 15);
}

/**
 * 기부금 세액공제 (§59의4④, §34 한도). `general` = 종교단체 외 일반기부금, `religious` = 종교단체 기부금.
 * 한도: 종교단체 기부금이 있으면 소득금액×10% + min(소득금액×20%, 종교 외), 없으면 소득금액×30%.
 */
export function donationCredit(
  earnedIncome: number,
  general: number,
  religious: number,
): { eligible: number; limit: number; credit: number } {
  const inc = toInt(earnedIncome);
  const g = toInt(general);
  const r = toInt(religious);
  const limit = r > 0 ? part(inc, 10) + Math.min(part(inc, 20), g) : part(inc, 30);
  const eligible = Math.min(g + r, limit);
  const credit = part(Math.min(eligible, 10_000_000), 15) + part(Math.max(eligible - 10_000_000, 0), 30);
  return { eligible, limit, credit };
}

/** 고향사랑기부금 세액공제 (조특법 제58조①, 2026.1.1. 이후 기부분). 연 2,000만원까지. */
export function hometownCredit(amount: number): number {
  const h = Math.min(toInt(amount), 20_000_000);
  return part(Math.min(h, 100_000), 100, 110) + part(Math.min(Math.max(h - 100_000, 0), 100_000), 40) + part(Math.max(h - 200_000, 0), 15);
}

/**
 * 월세 세액공제 (조특법 제95조의2): 무주택 세대의 세대주 (세대주가 주택청약·주택자금 공제를 받지 않으면
 * 세대원도), 총급여 8천만원 이하, 연 1,000만원 한도. `eligible` = 이 세대 요건을 갖췄는지.
 */
export function rentCredit(totalPay: number, rent: number, eligible: boolean): { rate: number; credit: number } {
  const g = toInt(totalPay);
  if (!eligible || g > 80_000_000) return { rate: 0, credit: 0 };
  const rate = g <= 55_000_000 ? 17 : 15;
  return { rate, credit: part(Math.min(toInt(rent), 10_000_000), rate) };
}

// ---------------------------------------------------------------- 전체 계산

export type YearEndTaxInput = {
  /** 총급여 (비과세 제외, 원) */
  totalPay: number;
  /** 기본공제 인원 (본인 포함) */
  family: number;
  /** 그중 70세 이상 (경로우대) */
  seniors?: number;
  /** 그중 장애인 */
  disabled?: number;
  extraPersonal?: ExtraPersonal;
  /** 기본공제 받는 20세 이하 자녀 수 (신용카드 한도 가산) */
  children?: number;
  /** 자녀세액공제 대상 (2026 귀속: 2006~2016년생 기본공제 자녀) */
  creditChildren?: number;
  birthOrder?: number;
  /** 2026년 혼인신고 (결혼세액공제 처음) */
  married?: boolean;
  /** 국민연금 근로자 부담 (연) */
  pension: number;
  /** 건강·장기요양·고용보험료 근로자 부담 (연) */
  healthEmployment: number;
  cards?: Partial<CardSpending>;
  /** 무주택 세대의 세대주 또는 그 배우자 (주택청약·월세 요건) */
  homelessHead?: boolean;
  /** 무주택 세대의 세대원 (세대주가 주택 관련 공제를 받지 않음): 월세 세액공제만 */
  homelessMember?: boolean;
  housingSubscription?: number;
  rent?: number;
  pensionSavings?: number;
  irp?: number;
  insurancePremium?: number;
  medicalSelf?: number;
  medicalOther?: number;
  education?: number;
  donation?: number;
  religiousDonation?: number;
  hometownDonation?: number;
  /** 기납부 소득세 (지방소득세 제외) */
  prepaidIncomeTax: number;
  /** 기납부 지방소득세. 없으면 소득세의 10% (10원 미만 절사). */
  prepaidLocalTax?: number;
};

export type Credits = {
  earned: number;
  child: number;
  birth: number;
  marriage: number;
  pension: number;
  insurance: number;
  medical: number;
  education: number;
  donation: number;
  hometown: number;
  rent: number;
  standard: number;
};

export type Pipeline = {
  /** true = 표준세액공제 13만원 방식 (건강·고용보험료 소득공제와 특별세액공제·월세 제외) */
  standard: boolean;
  insuranceDeduction: number;
  incomeDeductions: number;
  taxBase: number;
  calculatedTax: number;
  marginalRate: number;
  earned: { raw: number; limit: number; credit: number };
  credits: Credits;
  creditsTotal: number;
  /** 세액공제 합계 중 산출세액을 넘어 적용되지 않은 금액 */
  creditsUnused: number;
  determinedTax: number;
};

/** Parts of the calculation that do not depend on 표준세액공제 vs 항목별 공제. */
type Base = {
  totalPay: number;
  earnedDeduction: number;
  earnedIncome: number;
  personal: PersonalDeduction;
  pensionDeduction: number;
  card: CardDeduction;
  housing: number;
  pensionAccount: { eligible: number; rate: number; credit: number };
  medical: { threshold: number; eligible: number; credit: number };
  donation: { eligible: number; limit: number; credit: number };
  /** 월세 세액공제 세대 요건 (무주택 세대주 또는 세대원) */
  rentEligible: boolean;
  /** 월세 공제율 (%), 0 = 대상 아님 */
  rentRate: number;
};

export type YearEndTaxResult = Base & {
  /** 고른 방식 */
  chosen: Pipeline;
  /** 고르지 않은 방식 (비교용) */
  alternative: Pipeline;
  determinedLocalTax: number;
  prepaidIncomeTax: number;
  prepaidLocalTax: number;
  /** 차감징수세액 (+ 추가 납부, − 환급), 10원 미만 절사 */
  settleIncomeTax: number;
  settleLocalTax: number;
  settleTotal: number;
};

function pipeline(input: YearEndTaxInput, base: Base, standard: boolean): Pipeline {
  const g = base.totalPay;
  const insuranceDeduction = standard ? 0 : toInt(input.healthEmployment);
  const sum = base.personal.total + base.pensionDeduction + insuranceDeduction + base.housing + base.card.total;
  const incomeDeductions = Math.min(sum, base.earnedIncome);
  const taxBase = base.earnedIncome - incomeDeductions;
  const tax = calculatedTax(taxBase);
  const earned = earnedTaxCredit(tax, g);
  const credits: Credits = {
    earned: earned.credit,
    child: childTaxCredit(input.creditChildren ?? 0),
    birth: birthTaxCredit(input.birthOrder ?? 0),
    marriage: input.married ? MARRIAGE_CREDIT : 0,
    pension: base.pensionAccount.credit,
    insurance: standard ? 0 : insuranceCredit(input.insurancePremium ?? 0),
    medical: standard ? 0 : base.medical.credit,
    education: standard ? 0 : educationCredit(input.education ?? 0),
    donation: standard ? 0 : base.donation.credit,
    hometown: hometownCredit(input.hometownDonation ?? 0),
    rent: standard ? 0 : rentCredit(g, input.rent ?? 0, base.rentEligible).credit,
    standard: standard ? STANDARD_CREDIT : 0,
  };
  const creditsTotal = Object.values(credits).reduce((a, b) => a + b, 0);
  const determinedTax = Math.max(0, tax - creditsTotal);
  return {
    standard,
    insuranceDeduction,
    incomeDeductions,
    taxBase,
    calculatedTax: tax,
    marginalRate: marginalRate(taxBase),
    earned,
    credits,
    creditsTotal,
    creditsUnused: Math.max(0, creditsTotal - tax),
    determinedTax,
  };
}

/** 2026년 귀속 연말정산 간이 예상. Returns null when 총급여 is not positive. */
export function calcYearEndTax(input: YearEndTaxInput): YearEndTaxResult | null {
  const totalPay = toInt(input.totalPay, MAX_TOTAL_PAY);
  if (totalPay <= 0) return null;
  const earnedDeduction = earnedIncomeDeduction(totalPay);
  const earnedIncome = totalPay - earnedDeduction;
  const homeless = !!input.homelessHead;
  const rentEligible = homeless || !!input.homelessMember;
  const base: Base = {
    totalPay,
    earnedDeduction,
    earnedIncome,
    personal: personalDeduction(input.family, input.seniors ?? 0, input.disabled ?? 0, input.extraPersonal ?? "n", earnedIncome),
    pensionDeduction: toInt(input.pension),
    card: cardDeduction(totalPay, input.cards ?? {}, input.children ?? 0),
    housing: housingSubscriptionDeduction(totalPay, input.housingSubscription ?? 0, homeless),
    pensionAccount: pensionAccountCredit(totalPay, input.pensionSavings ?? 0, input.irp ?? 0),
    medical: medicalCredit(totalPay, input.medicalSelf ?? 0, input.medicalOther ?? 0),
    donation: donationCredit(earnedIncome, input.donation ?? 0, input.religiousDonation ?? 0),
    rentEligible,
    rentRate: rentCredit(totalPay, 0, rentEligible).rate,
  };
  const itemized = pipeline(input, base, false);
  const standard = pipeline(input, base, true);
  // 표준세액공제는 결정세액이 더 적을 때만 고른다 (같으면 항목별 공제).
  const [chosen, alternative] = standard.determinedTax < itemized.determinedTax ? [standard, itemized] : [itemized, standard];

  const determinedLocalTax = part(chosen.determinedTax, 10);
  const prepaidIncomeTax = toInt(input.prepaidIncomeTax);
  const prepaidLocalTax =
    input.prepaidLocalTax !== undefined && Number.isFinite(input.prepaidLocalTax)
      ? toInt(input.prepaidLocalTax)
      : Math.floor(prepaidIncomeTax / 100) * 10;
  const settleIncomeTax = trunc10(chosen.determinedTax - prepaidIncomeTax);
  const settleLocalTax = trunc10(determinedLocalTax - prepaidLocalTax);
  return {
    ...base,
    chosen,
    alternative,
    determinedLocalTax,
    prepaidIncomeTax,
    prepaidLocalTax,
    settleIncomeTax,
    settleLocalTax,
    settleTotal: settleIncomeTax + settleLocalTax,
  };
}

// ---------------------------------------------------------------- 기본값 추정 (입력이 없을 때)

export const PAY_MONTHS_2026: string[] = Array.from({ length: 12 }, (_, i) => `2026-${String(i + 1).padStart(2, "0")}`);

/**
 * 2026년 1~12월 근로자 4대보험료 합계 추정: 총급여 ÷ 12를 매달 같은 과세 급여로 보고
 * 달마다 그 달의 요율·상하한(국민연금 7월 상한 변경, 장기요양 11월 반올림 비율)을 적용한다.
 */
export function estimateAnnualInsurance(totalPay: number): {
  pension: number;
  health: number;
  longTermCare: number;
  employment: number;
  healthEmployment: number;
} {
  const monthly = Math.floor(toInt(totalPay, MAX_TOTAL_PAY) / 12);
  let pension = 0;
  let health = 0;
  let longTermCare = 0;
  let employment = 0;
  for (const m of PAY_MONTHS_2026) {
    const r = employeeInsurance(monthly, m);
    pension += r.pension;
    health += r.health;
    longTermCare += r.longTermCare;
    employment += r.employment;
  }
  return { pension, health, longTermCare, employment, healthEmployment: health + longTermCare + employment };
}

/**
 * 기납부세액 추정: 매달 같은 급여를 받고 간이세액표대로 뗐다고 보고 12달을 더한다.
 * 자녀 세액 공제 금액은 지급일 기준으로 1~2월분은 종전, 3월분부터 개정 금액을 쓴다.
 * `tableChildren` = 간이세액표의 8세 이상 20세 이하 자녀 (2026년 지급분은 2006~2018년생). 연말정산
 * 자녀세액공제 대상(2006~2016년생)보다 2017·2018년생만큼 넓다 — 그 자녀는 매달 공제받고 정산 때 빠진다.
 */
export function estimatePrepaidTax(
  totalPay: number,
  family: number,
  tableChildren: number,
  ratio: WithholdingRatio = 100,
): { incomeTax: number; localTax: number } {
  const monthly = Math.floor(toInt(totalPay, MAX_TOTAL_PAY) / 12);
  let incomeTax = 0;
  let localTax = 0;
  for (const m of PAY_MONTHS_2026) {
    const w = monthlyWithholding(monthly, family, tableChildren, ratio, m);
    incomeTax += w.incomeTax;
    localTax += w.localTax;
  }
  return { incomeTax, localTax };
}

// ---------------------------------------------------------------- 정산 시기 안내

export type SettlementSeason = "early" | "preview" | "filing" | "may" | "late";

/** Where the visitor is in the 2026 귀속 연말정산 calendar. */
export function settlementSeason(today: YMD): SettlementSeason {
  const key = today.y * 10_000 + today.m * 100 + today.d;
  if (key < 20261101) return "early";
  if (key < 20270115) return "preview";
  if (key < 20270301) return "filing";
  if (key < 20270601) return "may";
  return "late";
}

export const SEASON_NOTE: Record<SettlementSeason, string> = {
  early: "아직 2026년이 남았어요. 연말까지 쓸 카드 금액과 낼 보험료·월세를 더해서 넣으면 실제 결과에 가까워져요.",
  preview: "홈택스 ‘연말정산 미리보기’에서 9월까지의 카드 사용액을 확인할 수 있어요. 남은 달 사용액을 더해 넣어 보세요.",
  filing: "1월 15일부터 홈택스 간소화 자료가 열려요. 간소화 자료의 금액을 그대로 넣으면 실제 정산액에 가까워요.",
  may: "회사 연말정산에서 빠뜨린 공제는 5월 종합소득세 신고 때 더 받을 수 있어요.",
  late: "지난 연말정산에서 빠뜨린 공제는 5년 안에 경정청구로 돌려받을 수 있어요.",
};
