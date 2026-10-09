/**
 * 정기예금 이자 계산 (거주자 개인 기준).
 *
 * 세전 이자
 *  - 단리:   원금 × 연이율 × 개월 / 12
 *  - 월복리: 원금 × ((1 + 연이율/12)^개월 − 1)
 *  은행은 이자를 원 단위로 지급하므로 원 미만은 버린다.
 *
 * 이자에 붙는 세금 (원천징수, 2026년 기준)
 *  - 일반과세 15.4%: 소득세 14% (소득세법 제129조①1호) + 지방소득세 = 소득세의 10% (지방세법 제103조의13)
 *  - 세금우대 9.5%: 소득세 9% + 농어촌특별세 0.5% (감면세액 5%의 10%, 농어촌특별세법 제5조①2호·④)
 *    옛 세금우대종합저축(조세특례제한법 제89조①, 2014.12.31까지 가입분만, 신규 가입 불가)의 세율이고,
 *    지금 새로 생기는 9.5%는 아래 상호금융 예탁금 2027년 이후 가입분(mutualHigh)이다.
 *    이 선택지는 3천만원 한도를 나누지 않으므로 상호금융 예탁금은 mutual* 유형으로 계산한다.
 *  - 상호금융 예탁금 (조세특례제한법 제89조의3, 2025.12.23 전문개정, 2026.1.1 시행), 1인당 3천만원까지.
 *    세율은 이자를 받는 해가 아니라 예탁금에 가입한 날로 정해진다 (제89조의3① "가입함으로써 발생하는 이자소득").
 *    지방소득세 없음, 분리과세(종합소득과세표준에 합산하지 않음).
 *    - mutual 1.4%: 소득세 비과세 + 농어촌특별세 1.4% (감면세액 14%의 10%).
 *      2025.12.31까지 가입분 전부, 그리고 제89조의3②의 비과세 대상자(제88조의5②1호: 시행령으로 정하는
 *      조합의 조합원 = 농·어·임업인 조합원, 또는 직전 과세기간 총급여 7천만원 이하·종합소득금액 6천만원 이하)의
 *      2026.1.1~2028.12.31 가입분.
 *    - mutualLow 5.9%: 비과세 대상자가 아닌 사람의 2026년 가입분 (제89조의3①1호 100분의 5)
 *      + 농어촌특별세 0.9% (감면세액 14% − 5% = 9%의 10%). 비과세 대상자도 2029년 가입분은 5%.
 *    - mutualHigh 9.5%: 비과세 대상자가 아닌 사람의 2027.1.1 이후 가입분 (제89조의3①2호 100분의 9)
 *      + 농어촌특별세 0.5%. 비과세 대상자는 2030년 이후 가입분부터.
 *  - 비과세 0%
 *  각 세목은 10원 미만을 버린다 (국고금 관리법 제47조①, 지방자치단체는 같은 조 ③ 준용).
 *  지방소득세는 "원천징수하는 소득세"(10원 미만을 버린 금액)의 10%다.
 *
 * Pure functions only. No React, no Date.
 */
import { formatNumber } from "@/lib/format";

export type InterestMethod = "simple" | "monthly";
export type TaxType = "general" | "preferential" | "mutual" | "mutualLow" | "mutualHigh" | "exempt";

/** 소득세 원천징수세율 (이자소득, 소득세법 제129조①1호 라목): 14% = 1,400bp */
export const INCOME_TAX_BP = 1400;

type TaxRule = {
  /** UI label, e.g. "일반과세" */
  name: string;
  /** Total effective rate in basis points (15.4% = 1540) */
  totalBp: number;
  /** 소득세율 (bp) */
  incomeBp: number;
  /** 지방소득세(소득세의 10%)를 붙이는지 */
  local: boolean;
  /** 농어촌특별세율 (bp) — 감면받은 소득세(14% − 적용 세율)의 10% */
  ruralBp: number;
  /** One-line description of what the rate consists of */
  detail: string;
};

export const TAX_RULES: Record<TaxType, TaxRule> = {
  general: { name: "일반과세", totalBp: 1540, incomeBp: 1400, local: true, ruralBp: 0, detail: "소득세 14% + 지방소득세 1.4%" },
  preferential: { name: "세금우대", totalBp: 950, incomeBp: 900, local: false, ruralBp: 50, detail: "소득세 9% + 농어촌특별세 0.5%" },
  mutual: { name: "상호금융 비과세", totalBp: 140, incomeBp: 0, local: false, ruralBp: 140, detail: "소득세 비과세, 농어촌특별세 1.4%" },
  mutualLow: {
    name: "상호금융 2026년 가입",
    totalBp: 590,
    incomeBp: 500,
    local: false,
    ruralBp: 90,
    detail: "소득세 5% + 농어촌특별세 0.9%",
  },
  mutualHigh: {
    name: "상호금융 2027년 이후 가입",
    totalBp: 950,
    incomeBp: 900,
    local: false,
    ruralBp: 50,
    detail: "소득세 9% + 농어촌특별세 0.5%",
  },
  exempt: { name: "비과세", totalBp: 0, incomeBp: 0, local: false, ruralBp: 0, detail: "세금 없음" },
};

/**
 * 상호금융(지역 농·축협, 수협, 신협, 산림조합, 새마을금고) 예탁금 특례(비과세·저율과세) 한도:
 * 1인당 3,000만원 (전 조합 합산). NH농협은행·Sh수협은행 예금은 해당하지 않는다.
 */
export const MUTUAL_EXEMPT_CAP = 30_000_000;

/** 상호금융 예탁금 특례(3천만원 한도)가 붙는 과세 구분인지. */
export function isMutualTax(taxType: TaxType): boolean {
  return taxType === "mutual" || taxType === "mutualLow" || taxType === "mutualHigh";
}

/**
 * 상호금융 예탁금(3천만원 이내)의 과세 구분을 가입 연도로 정한다 (조세특례제한법 제89조의3, 2026.1.1 시행).
 * @param openYear 예탁금에 가입한 해
 * @param exemptGroup 제89조의3② 비과세 대상자인지 (농·어·임업인 조합원, 또는 직전 과세기간
 *   총급여 7천만원 이하·종합소득금액 6천만원 이하, 제88조의5②1호)
 *
 *  - 2025년까지 가입: 누구나 비과세(농어촌특별세 1.4%)
 *  - 그 밖의 사람: 2026년 가입 5.9%, 2027년 이후 가입 9.5%
 *  - 비과세 대상자: 2026~2028년 가입 비과세, 2029년 가입 5.9%, 2030년 이후 가입 9.5%
 */
export function mutualTaxTypeByOpenYear(openYear: number, exemptGroup: boolean): TaxType {
  if (openYear <= 2025) return "mutual";
  const lowYear = exemptGroup ? 2029 : 2026;
  if (openYear < lowYear) return "mutual";
  return openYear === lowYear ? "mutualLow" : "mutualHigh";
}

/** Rows of the 가입 시기별 상호금융 예탁금 세율 table on the main page. */
export const MUTUAL_OPEN_PERIODS: { label: string; year: number }[] = [
  { label: "2025년까지", year: 2025 },
  { label: "2026년", year: 2026 },
  { label: "2027~2028년", year: 2027 },
  { label: "2029년", year: 2029 },
  { label: "2030년 이후", year: 2030 },
];

/** 금융소득종합과세 기준: 연간 이자·배당소득 합계 2,000만원 초과 (소득세법 제14조③6호). */
export const COMPREHENSIVE_TAX_THRESHOLD = 20_000_000;

/** 예금자보호 한도: 금융회사별 1인당 원금+소정의 이자 1억원 (2025년 9월 1일부터). */
export const DEPOSIT_PROTECTION_LIMIT = 100_000_000;

/** Input limits used by the calculator UI and validation. */
export const MAX_PRINCIPAL = 10_000_000_000; // 100억원
export const MAX_MONTHS = 120; // 10년
export const MAX_RATE_PCT = 20;

/** 3.25 (%) -> 325 (bp). Rates are entered with at most 2 decimals. */
export function rateToBp(ratePct: number): number {
  return Math.round(ratePct * 100);
}

/** 원 미만 절사 with a tiny epsilon so 299999.99999999994 becomes 300000. */
function floorWon(n: number): number {
  return Math.floor(n + 1e-6);
}

/** 10원 미만 절사 for a non-negative integer amount × bp / 10000. Exact integer arithmetic. */
function taxAt(amount: number, bp: number): number {
  return Math.floor((amount * bp) / 100_000) * 10;
}

/** Pre-tax interest in 원 (원 미만 절사). */
export function grossInterest(principal: number, ratePct: number, months: number, method: InterestMethod): number {
  if (!(principal > 0) || !(months > 0) || !(ratePct > 0)) return 0;
  const bp = rateToBp(ratePct);
  if (method === "simple") {
    // principal × bp/10000 × months/12, kept as one integer product while it fits in 2^53.
    return floorWon((principal * bp * months) / 120_000);
  }
  const monthly = bp / 120_000;
  return floorWon(principal * (Math.pow(1 + monthly, months) - 1));
}

/**
 * 은행식 일할 계산 세전 이자 (단리): 원금 × 연이율 × 예치일수 / 365, 원 미만 절사.
 * 이 계산기는 개월 수로 계산하므로, 실제 일수로 계산했을 때 얼마나 달라지는지 보여 줄 때 쓴다.
 */
export function grossInterestByDays(principal: number, ratePct: number, days: number): number {
  if (!(principal > 0) || !(days > 0) || !(ratePct > 0)) return 0;
  return floorWon((principal * rateToBp(ratePct) * days) / 3_650_000);
}

export type TaxBreakdown = {
  incomeTax: number;
  localTax: number;
  ruralTax: number;
  total: number;
};

/** Withholding tax on one interest payment, each tax 10원 미만 절사. */
export function interestTax(interest: number, taxType: TaxType): TaxBreakdown {
  const rule = TAX_RULES[taxType];
  const base = Math.max(0, Math.floor(interest));
  const incomeTax = taxAt(base, rule.incomeBp);
  // 지방소득세 = 원천징수한 소득세의 10%, 10원 미만 절사
  const localTax = rule.local ? Math.floor(incomeTax / 100) * 10 : 0;
  const ruralTax = taxAt(base, rule.ruralBp);
  return { incomeTax, localTax, ruralTax, total: incomeTax + localTax + ruralTax };
}

export type DepositInput = {
  /** 예치 금액 (원) */
  principal: number;
  /** 기간 (개월) */
  months: number;
  /** 연 이자율 (%) */
  ratePct: number;
  method: InterestMethod;
  taxType: TaxType;
};

export type DepositResult = TaxBreakdown & {
  principal: number;
  months: number;
  ratePct: number;
  method: InterestMethod;
  taxType: TaxType;
  /** 세전 이자 */
  grossInterest: number;
  /** 세금 합계 (= total) */
  totalTax: number;
  /** 세후 이자 */
  netInterest: number;
  /** 만기 수령액 = 원금 + 세후 이자 */
  maturity: number;
  /** 세후 이자 ÷ 개월 */
  monthlyAvgNet: number;
  /** 세후 이자를 연 단리 수익률로 환산 (%) */
  netAnnualRatePct: number;
  /**
   * 상호금융 예탁금 특례 한도(3천만원)를 넘는 원금. 이 부분은 일반과세(15.4%)로
   * 따로 계산한다 (실제로도 별도 계좌로 일반과세된다). 0이면 해당 없음.
   */
  mutualExcess: number;
  /**
   * 금융소득종합과세(2천만원 기준)에 합산되는 세전 이자 = 일반과세되는 부분의 이자.
   * 비과세·세금우대(조특법 제89조①)·상호금융 예탁금(제89조의3)은 종합소득과세표준에 합산하지 않는다.
   */
  comprehensiveGross: number;
};

export function isValidInput({ principal, months, ratePct }: Pick<DepositInput, "principal" | "months" | "ratePct">): boolean {
  return (
    Number.isFinite(principal) &&
    principal > 0 &&
    principal <= MAX_PRINCIPAL &&
    Number.isInteger(months) &&
    months >= 1 &&
    months <= MAX_MONTHS &&
    Number.isFinite(ratePct) &&
    ratePct > 0 &&
    ratePct <= MAX_RATE_PCT
  );
}

export function calcDeposit(input: DepositInput): DepositResult {
  const { principal, months, ratePct, method, taxType } = input;
  const p = Math.floor(principal);

  // 상호금융 예탁금 특례는 1인당 3천만원까지만. 초과분은 별도 계좌(일반과세)로 계산.
  const mutualExcess = isMutualTax(taxType) && p > MUTUAL_EXEMPT_CAP ? p - MUTUAL_EXEMPT_CAP : 0;
  const parts: { principal: number; tax: TaxType }[] =
    mutualExcess > 0
      ? [
          { principal: MUTUAL_EXEMPT_CAP, tax: taxType },
          { principal: mutualExcess, tax: "general" },
        ]
      : [{ principal: p, tax: taxType }];

  let gross = 0;
  let comprehensiveGross = 0;
  let incomeTax = 0;
  let localTax = 0;
  let ruralTax = 0;
  for (const part of parts) {
    const g = grossInterest(part.principal, ratePct, months, method);
    const t = interestTax(g, part.tax);
    gross += g;
    if (part.tax === "general") comprehensiveGross += g;
    incomeTax += t.incomeTax;
    localTax += t.localTax;
    ruralTax += t.ruralTax;
  }
  const total = incomeTax + localTax + ruralTax;
  const net = gross - total;
  return {
    principal: p,
    months,
    ratePct,
    method,
    taxType,
    grossInterest: gross,
    incomeTax,
    localTax,
    ruralTax,
    total,
    totalTax: total,
    netInterest: net,
    maturity: p + net,
    monthlyAvgNet: months > 0 ? net / months : 0,
    netAnnualRatePct: p > 0 && months > 0 ? (net / p) * (12 / months) * 100 : 0,
    mutualExcess,
    comprehensiveGross,
  };
}

export type MonthlyPayout = {
  /** 매달 받는 세전 이자 */
  gross: number;
  /** 매달 떼는 세금 */
  tax: number;
  /** 매달 받는 세후 이자 */
  net: number;
};

/**
 * 월 이자 지급식(단리): 매달 원금 × 연이율 / 12 를 지급하고 그때마다 원천징수한다.
 * 상호금융 3천만원 한도 분할 등 과세 규칙은 calcDeposit(1개월)과 같다.
 * 실제 은행은 달마다 일수(28~31일)로 계산해 28일인 달은 약 8% 적고 31일인 달은 약 2% 많다.
 * 여기서는 매달 같게 단순화.
 */
export function monthlyPayout(principal: number, ratePct: number, taxType: TaxType): MonthlyPayout {
  const r = calcDeposit({ principal, months: 1, ratePct, method: "simple", taxType });
  return { gross: r.grossInterest, tax: r.totalTax, net: r.netInterest };
}

/** Shorthand used by tables: 세후 이자 for 일반과세 단리. */
export function netInterestSimple(principal: number, ratePct: number, months: number, taxType: TaxType = "general"): number {
  return calcDeposit({ principal, months, ratePct, method: "simple", taxType }).netInterest;
}

/**
 * Annual rate (%) above which the interest from this deposit alone exceeds
 * the 2,000만원 금융소득종합과세 threshold in the year it is paid (단리, 만기 일시 지급).
 */
export function comprehensiveTaxRatePct(principal: number, months: number): number {
  if (!(principal > 0) || !(months > 0)) return Infinity;
  return (COMPREHENSIVE_TAX_THRESHOLD / (principal * (months / 12))) * 100;
}

/** Minimum number of 금융회사 needed so that 원금+이자 stays within the 1억원 protection limit at each. */
export function institutionsNeeded(totalWithInterest: number): number {
  if (!(totalWithInterest > 0)) return 0;
  return Math.ceil(totalWithInterest / DEPOSIT_PROTECTION_LIMIT);
}

/* ---------- Programmatic pages: /deposit/<만원>/ ---------- */

/** 예치금 (만원) that get their own landing page. */
export const DEPOSIT_PAGE_MANWON = [1000, 3000, 5000, 10000, 20000, 30000, 50000];

/** Rates (%) shown in the 금리별 table: 2.0 ~ 5.0 step 0.25 */
export const TABLE_RATES = Array.from({ length: 13 }, (_, i) => 2 + i * 0.25);

/** Terms (개월) shown in the 기간별 columns. */
export const TABLE_MONTHS = [3, 6, 12, 24];

/** Example rate (%) used in copy on programmatic pages. */
export const EXAMPLE_RATE_PCT = 3;

/** 1000 -> "1천만원", 10000 -> "1억", 50000 -> "5억" (how people type it in search). */
export function depositAmountLabel(manwon: number): string {
  if (manwon >= 10_000 && manwon % 10_000 === 0) return `${manwon / 10_000}억`;
  if (manwon >= 1000 && manwon % 1000 === 0) return `${manwon / 1000}천만원`;
  return `${formatNumber(manwon)}만원`;
}

/**
 * Title and H1 of /deposit/<만원>/: 연 EXAMPLE_RATE_PCT% · 1년 · 단리 · 일반과세 세후 이자를 넣어 페이지마다 다르게 한다.
 * title은 사이트 이름을 뺀 45자 이하. 1억 → h1 "1억 예금 이자: 연 3% 1년이면 세후 2,538,000원"
 */
export function depositPageHeadline(manwon: number): { title: string; h1: string } {
  const label = depositAmountLabel(manwon);
  const net = formatNumber(netInterestSimple(manwon * 10_000, EXAMPLE_RATE_PCT, 12));
  const rate = formatNumber(EXAMPLE_RATE_PCT, 2);
  return {
    title: `${label} 예금 이자 - 연 ${rate}% 1년 세후 ${net}원`,
    h1: `${label} 예금 이자: 연 ${rate}% 1년이면 세후 ${net}원`,
  };
}
