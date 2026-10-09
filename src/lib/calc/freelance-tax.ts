/**
 * 3.3% (사업소득) · 8.8% (기타소득) · 일용근로소득 원천징수 — 세전 ↔ 실수령.
 *
 * Rules (checked 2026-10-09 against the current statute text; law.go.kr links are on the page):
 * - 사업소득 3.3%: 소득세 = 지급액 × 3% (소득세법 제129조①3), 지방소득세 = 소득세 × 10%
 *   (지방세법 제103조의13), each 10원 미만 절사 (국고금관리법 제47조①).
 *   소액부징수 does NOT apply: 제86조 제1호 (법률 제19933호, 2024-07-01 시행) excludes "제127조①3호의
 *   원천징수대상 사업소득 중 대통령령으로 정하는 사업소득" (시행령 제149조의3: 계속·반복 인적용역) from the
 *   1,000원 미만 rule, for amounts paid from 2024-07-01. So 30,000원 → 소득세 900원 + 지방소득세 90원 is withheld.
 * - 2026-08-03 세제개편안: 인적용역 사업소득 3% → 2% (3.3% → 2.2%) for amounts paid from 2027-01-01.
 *   NOT law yet (국회 심의 중, 2026-10). Only exposed as PROPOSED_BIZ_RATE_PERCENT_2027 for a comparison line.
 * - 기타소득 8.8%: 강연료·원고료 같은 제21조①15·19호 소득 등은 받은 금액의 60%를 필요경비로 본다
 *   (시행령 제87조 제1호의2) → 기타소득금액 40% × 20% (제129조①6라) = 지급액 × 8%, 지방소득세 0.8%.
 *   과세최저한 (제84조 제4호): 기타소득금액이 건별 5만원 이하면 과세하지 않는다 → 지급액 125,000원 이하는 0원.
 * - 일용근로소득: (일당 − 150,000원 (제47조②)) × 6% (제129조①4 단서) − 산출세액의 55% (제59조③)
 *   = 과세표준 × 2.7%. 여러 날 치를 한 번에 주면 날마다 계산한 세액을 합하고, 1,000원 미만 소액부징수
 *   (제86조 제1호, 근로소득은 예외 대상 아님) is judged on that one payment's total (국세청 해석 법인46013-343).
 *   Order (docs/research/verifier-corrections.md item 4): 소액부징수 first, then 지방소득세 = 10% of the
 *   소득세 actually withheld (0 when waived).
 *
 * All rounding is integer math (no float noise such as 3000000 × 0.009). Pure functions only.
 */

export type IncomeKind = "biz" | "other" | "daily";

/** 사업소득 원천징수세율 (%), 소득세법 제129조①3. */
export const BIZ_RATE_PERCENT = 3;
/** 2026 세제개편안의 인적용역 사업소득 세율 (%), 2027-01-01 지급분부터 예정. 국회 의결 전. */
export const PROPOSED_BIZ_RATE_PERCENT_2027 = 2;
/** 기타소득 의제 필요경비율 (시행령 제87조 제1호의2). */
export const OTHER_EXPENSE_RATIO = 0.6;
/** 기타소득 원천징수세율 (%), 제129조①6라. */
export const OTHER_RATE_PERCENT = 20;
/** 과세최저한: 건별 기타소득금액 5만원 이하 (제84조 제4호). */
export const OTHER_THRESHOLD_INCOME = 50_000;
/** 필요경비 60%일 때 과세최저한에 걸리는 지급액 상한: 50,000 ÷ 40%. */
export const OTHER_THRESHOLD_PAYMENT = 125_000;
/** 기타소득금액이 연 이 금액 이하면 분리과세를 고를 수 있다 (제14조③8). */
export const OTHER_SEPARATE_TAX_LIMIT = 3_000_000;
/** 일용근로자 근로소득공제, 1일 (제47조②). */
export const DAILY_DEDUCTION = 150_000;
/** 일용근로소득 세율 (%), 제129조①4 단서. */
export const DAILY_RATE_PERCENT = 6;
/** 일용근로자 근로소득세액공제율 (제59조③). */
export const DAILY_CREDIT_RATIO = 0.55;
/** 소액부징수 기준: 원천징수세액 1,000원 미만 (제86조 제1호). */
export const SMALL_AMOUNT_LIMIT = 1_000;
/**
 * 하루 치만 받을 때 소득세가 0원(소액부징수)인 가장 큰 일당, under this module's unrounded math:
 * 37,037 × 2.7% = 999.9 → 990원 < 1,000원. The statute does not fix how 산출세액 and the 55% 공제 are rounded;
 * cutting each to the won (2,222 − 1,222 = 1,000) moves the boundary down to 187,016원. So user-facing text must
 * NOT print this figure as exact: say "약 18만 7천원" with the NTS example below. Kept for tests only.
 */
export const DAILY_EXEMPT_MAX_WAGE = 187_037;
/** 국세청 안내의 소액부징수 경계 예시: 일 급여액 187,000원 → 소득세 999원 (1,000원 미만이라 0원). */
export const DAILY_NTS_EXAMPLE_WAGE = 187_000;

export const KIND_LABELS: Record<IncomeKind, string> = {
  biz: "사업소득 3.3%",
  other: "기타소득 8.8%",
  daily: "일용근로소득",
};

export type ExemptReason = "threshold" | "small";

export type Withholding = {
  kind: IncomeKind;
  /** 세전 지급액 합계 (일용: 일당 × 일수) */
  gross: number;
  /** 세율을 곱하는 금액: 사업소득 = 지급액, 기타소득 = 기타소득금액(40%), 일용 = 과세표준 합계 */
  taxBase: number;
  /** 과세최저한·소액부징수를 적용하기 전 소득세 (10원 미만 절사) */
  computedIncomeTax: number;
  incomeTax: number;
  localTax: number;
  total: number;
  net: number;
  /** total ÷ gross (0 when gross is 0) */
  effectiveRate: number;
  /** "threshold" = 기타소득 과세최저한, "small" = 소액부징수 */
  exempt: ExemptReason | null;
};

/** Whole won, never negative. NaN and negatives become 0. */
function toWon(n: number): number {
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function finish(kind: IncomeKind, gross: number, taxBase: number, computed: number, exempt: ExemptReason | null): Withholding {
  const incomeTax = exempt ? 0 : computed;
  // floor10(소득세 × 10%) = floor(소득세 / 100) × 10
  const localTax = Math.floor(incomeTax / 100) * 10;
  const total = incomeTax + localTax;
  return {
    kind,
    gross,
    taxBase,
    computedIncomeTax: computed,
    incomeTax,
    localTax,
    total,
    net: gross - total,
    effectiveRate: gross > 0 ? total / gross : 0,
    exempt,
  };
}

/**
 * 사업소득 원천징수 (기본 3% + 지방소득세 0.3%). `ratePercent` must be a whole percent (3, or 2 for the
 * 2027 proposal). 소액부징수 is not applied (2024-07-01 지급분부터 인적용역 사업소득 제외).
 */
export function bizWithholding(gross: number, ratePercent: number = BIZ_RATE_PERCENT): Withholding {
  const pay = toWon(gross);
  // floor10(pay × rate%) = floor(pay × rate / 1000) × 10
  const computed = Math.floor((pay * ratePercent) / 1000) * 10;
  return finish("biz", pay, pay, computed, null);
}

/** 기타소득금액 (필요경비 60% 공제 후, 원 미만 절사). */
export function otherIncomeAmount(gross: number): number {
  return Math.floor((toWon(gross) * 2) / 5);
}

/** 기타소득 원천징수 (필요경비 60% → 40% × 20% = 8% + 지방소득세 0.8%), 과세최저한 포함. */
export function otherWithholding(gross: number): Withholding {
  const pay = toWon(gross);
  const income = otherIncomeAmount(pay);
  // floor10(기타소득금액 × 20%) = floor10(pay × 8%) = floor(pay × 8 / 1000) × 10 (same result with the floored 금액)
  const computed = Math.floor((pay * 8) / 1000) * 10;
  let exempt: ExemptReason | null = null;
  // 기타소득금액 (pay × 2/5, exact) ≤ 50,000 ⇔ pay ≤ 125,000
  if (pay > 0 && pay * 2 <= OTHER_THRESHOLD_INCOME * 5) exempt = "threshold";
  else if (computed > 0 && computed < SMALL_AMOUNT_LIMIT) exempt = "small";
  return finish("other", pay, income, computed, exempt);
}

/** 일용근로소득 원천징수. `days` = 한 번에 받는 일수 (같은 일당). */
export function dailyWithholding(dailyWage: number, days = 1): Withholding {
  const wage = toWon(dailyWage);
  const d = Number.isFinite(days) && days >= 1 ? Math.floor(days) : 1;
  const taxBase = Math.max(0, wage - DAILY_DEDUCTION) * d;
  // 과세표준 × 6% × (1 − 55%) = × 2.7%, then floor10: floor(taxBase × 27 / 10000) × 10
  const computed = Math.floor((taxBase * 27) / 10_000) * 10;
  const exempt: ExemptReason | null = computed > 0 && computed < SMALL_AMOUNT_LIMIT ? "small" : null;
  return finish("daily", wage * d, taxBase, computed, exempt);
}

export function withholding(kind: IncomeKind, gross: number, days = 1): Withholding {
  if (kind === "other") return otherWithholding(gross);
  if (kind === "daily") return dailyWithholding(gross, days);
  return bizWithholding(gross);
}

export type GrossSolution = {
  /** 세전 지급액 */
  gross: number;
  result: Withholding;
  /** false only if no 지급액 gives exactly the requested 실수령액 (the next amount above is returned). */
  exact: boolean;
};

/**
 * 실수령액 → 세전 지급액 (사업소득·기타소득).
 *
 * 10원 절사 때문에 실수령액은 지급액에 대해 계단식으로 움직여, 같은 실수령액이 나오는 지급액이 둘 이상일
 * 수 있다 (3.3%: 999,980원과 1,000,000원 모두 실수령 967,000원). We return the LARGEST such amount, which
 * is the one closest to 실수령 ÷ (1 − 세율) and gives back the round number people expect
 * (967,000 → 1,000,000). 기타소득 실수령액이 125,000원 이하면 과세최저한이라 지급액 = 실수령액.
 */
export function grossForNet(kind: "biz" | "other", net: number, bizRatePercent: number = BIZ_RATE_PERCENT): GrossSolution {
  const target = toWon(net);
  const calc = kind === "biz" ? (g: number) => bizWithholding(g, bizRatePercent) : otherWithholding;
  if (kind === "other" && target <= OTHER_THRESHOLD_PAYMENT) {
    return { gross: target, result: calc(target), exact: true };
  }
  // Share kept after withholding, in 1/1000: 3% → 967, 2% → 978, 기타소득 → 912.
  const keep = kind === "biz" ? 1000 - bizRatePercent * 11 : 912;
  // Each 10원 절사 drops less than 10원, so keep·g ≤ net(g) < keep·g + 21 (in 원, keep as a ratio).
  // Every solution therefore lies in ((target − 21) / keep, target / keep].
  const hi = Math.ceil((target * 1000) / keep) + 1;
  let lo = Math.max(0, Math.floor(((target - 25) * 1000) / keep));
  if (kind === "other") lo = Math.max(lo, OTHER_THRESHOLD_PAYMENT + 1);
  for (let g = hi; g >= lo; g--) {
    const r = calc(g);
    if (r.net === target) return { gross: g, result: r, exact: true };
  }
  // Not expected (the steps overlap, so every whole-won 실수령액 is reachable); fall back to the smallest
  // 지급액 whose 실수령액 is at least the target.
  for (let g = lo; g <= hi; g++) {
    const r = calc(g);
    if (r.net >= target) return { gross: g, result: r, exact: false };
  }
  const r = calc(hi);
  return { gross: hi, result: r, exact: false };
}

/** 금액별 랜딩 페이지 (/freelance-tax/<만원>/). */
export const FREELANCE_PAGE_MANWON = [10, 30, 50, 100, 150, 200, 250, 300, 500];

/** Comparison of one 지급액 under every withholding type used on the pages. */
export function compareKinds(gross: number) {
  return {
    biz: bizWithholding(gross),
    biz2027: bizWithholding(gross, PROPOSED_BIZ_RATE_PERCENT_2027),
    other: otherWithholding(gross),
  };
}
