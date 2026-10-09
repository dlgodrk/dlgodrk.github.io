/**
 * 부동산 중개보수(복비) 상한 계산.
 *
 * 근거
 * - 공인중개사법 제32조, 시행령 제27조의2(지급시기)
 * - 공인중개사법 시행규칙 제20조 (현행: 국토교통부령 제1611호, 2026. 8. 11. 일부개정, 2026. 8. 28. 시행)
 *   요율은 2021-10-19 개정 [별표 1] 이후 그대로다. 2026 개정은 제4항제1호 문구만 바꿔 주거용 오피스텔도
 *   "별표 2의 상한요율 이내에서 중개의뢰인과 개업공인중개사가 서로 협의하여 결정"하도록 명시했다(제5항·별표 1 불변).
 *   ① 주택: 중개의뢰인 쌍방으로부터 각각 받되, 일방으로부터 받을 수 있는 한도는 [별표 1],
 *      실제 요율은 시·도 조례가 정하는 요율한도 이내에서 협의. 계산 금액은 한도액을 넘을 수 없음.
 *   ④ 주택 외: 1호 주거용 오피스텔(전용 85㎡ 이하 + 전용 입식 부엌·수세식 화장실·목욕시설) = [별표 2]
 *      상한요율 매매·교환 0.5%, 임대차 등 0.4% 이내 협의 / 2호 그 밖의 경우 0.9% 이내 협의.
 *   https://casenote.kr/법령/공인중개사법_시행규칙 (2026-10-09 확인)
 *   ⑤ 거래금액: 보증금 외 차임이 있으면 보증금 + 월 차임 × 100. 그 합이 5천만원 미만이면 보증금 + 월 차임 × 70.
 * - 서울특별시 주택 중개보수 등에 관한 조례 [별표 1] (2021-12-30 시행),
 *   경기도 주택 중개보수 등에 관한 조례 [별표 1] (2022-03-04 시행): 아래 표와 같은 요율·한도액.
 *   https://land.seoul.go.kr/land/broker/brokerageCommission.do
 *   https://gris.gg.go.kr/reb/selectRebRateView.do
 *
 * 금액은 모두 원 단위 정수, 요율은 퍼센트(0.4 = 0.4%)로 다룬다.
 * 원 미만은 버린다(상한을 넘지 않도록).
 */

import { koreanWon } from "@/lib/format";

export type Target = "house" | "officetel" | "other";
export type Deal = "sale" | "jeonse" | "wolse";

export type Bracket = {
  /** 이상 (원) */
  min: number;
  /** 미만 (원). null = 상한 없음 */
  max: number | null;
  /** 상한요율 (%) */
  rate: number;
  /** 한도액 (원). null = 없음 */
  cap: number | null;
};

const MAN = 10_000;
const EOK = 100_000_000;

/** 주택 매매·교환 (시행규칙 별표 1, 서울·경기 조례 별표 1) */
export const HOUSE_SALE_BRACKETS: Bracket[] = [
  { min: 0, max: 5_000 * MAN, rate: 0.6, cap: 25 * MAN },
  { min: 5_000 * MAN, max: 2 * EOK, rate: 0.5, cap: 80 * MAN },
  { min: 2 * EOK, max: 9 * EOK, rate: 0.4, cap: null },
  { min: 9 * EOK, max: 12 * EOK, rate: 0.5, cap: null },
  { min: 12 * EOK, max: 15 * EOK, rate: 0.6, cap: null },
  { min: 15 * EOK, max: null, rate: 0.7, cap: null },
];

/** 주택 임대차 등 (전세·월세) */
export const HOUSE_LEASE_BRACKETS: Bracket[] = [
  { min: 0, max: 5_000 * MAN, rate: 0.5, cap: 20 * MAN },
  { min: 5_000 * MAN, max: 1 * EOK, rate: 0.4, cap: 30 * MAN },
  { min: 1 * EOK, max: 6 * EOK, rate: 0.3, cap: null },
  { min: 6 * EOK, max: 12 * EOK, rate: 0.4, cap: null },
  { min: 12 * EOK, max: 15 * EOK, rate: 0.5, cap: null },
  { min: 15 * EOK, max: null, rate: 0.6, cap: null },
];

/** 주거용 오피스텔 (시행규칙 제20조④1호, 별표 2) */
export const OFFICETEL_SALE_RATE = 0.5;
export const OFFICETEL_LEASE_RATE = 0.4;
/** 그 밖의 중개대상물(토지·상가·주거용 요건을 못 갖춘 오피스텔 등): 0.9% 이내 협의 (제20조④2호) */
export const OTHER_MAX_RATE = 0.9;

/** 월세 환산 (시행규칙 제20조⑤1호) */
export const WOLSE_MULTIPLIER = 100;
export const WOLSE_MULTIPLIER_SMALL = 70;
export const WOLSE_SMALL_THRESHOLD = 5_000 * MAN;

/** 일반과세자 부가가치세율 */
export const VAT_RATE = 0.1;

export const TARGET_LABEL: Record<Target, string> = {
  house: "주택",
  officetel: "주거용 오피스텔",
  other: "토지·상가 등",
};

export const DEAL_LABEL: Record<Deal, string> = {
  sale: "매매·교환",
  jeonse: "전세",
  wolse: "월세",
};

/** Human label for a bracket: "2억원 이상 9억원 미만" */
export function bracketLabel(b: Bracket): string {
  if (b.min === 0 && b.max !== null) return `${koreanWon(b.max)} 미만`;
  if (b.max === null) return `${koreanWon(b.min)} 이상`;
  return `${koreanWon(b.min)} 이상 ${koreanWon(b.max)} 미만`;
}

export function findBracket(brackets: Bracket[], amount: number): Bracket {
  for (const b of brackets) {
    if (amount >= b.min && (b.max === null || amount < b.max)) return b;
  }
  return brackets[brackets.length - 1];
}

/**
 * 거래금액 × 요율(%)을 원 미만 버림으로 계산. 부동소수점 오차를 피하려고
 * 요율을 10만분의 1 단위 정수로 바꿔 정수 곱셈 후 나눈다 (요율은 소수 셋째 자리까지 의미 있음).
 */
export function applyRate(amount: number, ratePct: number): number {
  const units = Math.round(ratePct * 1000); // 1% = 1000 units of 1/100,000
  return Math.floor((Math.round(amount) * units) / 100_000);
}

export type LeaseConversion = {
  /** 보증금 + 월세 × 100 */
  base100: number;
  /** 실제로 쓴 배수 (100 또는 70) */
  multiplier: 100 | 70;
  /** 환산 거래금액 */
  amount: number;
};

/** 월세 거래금액 환산: 보증금 + 월세×100, 그 결과가 5천만원 미만이면 보증금 + 월세×70. */
export function convertWolse(deposit: number, monthlyRent: number): LeaseConversion {
  const d = Number.isFinite(deposit) ? Math.max(0, Math.round(deposit)) : 0;
  const r = Number.isFinite(monthlyRent) ? Math.max(0, Math.round(monthlyRent)) : 0;
  const base100 = d + r * WOLSE_MULTIPLIER;
  if (base100 < WOLSE_SMALL_THRESHOLD) {
    return { base100, multiplier: WOLSE_MULTIPLIER_SMALL, amount: d + r * WOLSE_MULTIPLIER_SMALL };
  }
  return { base100, multiplier: WOLSE_MULTIPLIER, amount: base100 };
}

export type FeeRule = {
  /** 상한요율 (%) */
  rate: number;
  /** 한도액 (원), 없으면 null */
  cap: number | null;
  /** 적용 구간 설명 */
  label: string;
  /** 주택이면 해당 구간 */
  bracket: Bracket | null;
};

/** 대상·거래 종류·거래금액으로 상한요율과 한도액을 찾는다. */
export function feeRule(target: Target, deal: Deal, amount: number): FeeRule {
  const isSale = deal === "sale";
  if (target === "house") {
    const b = findBracket(isSale ? HOUSE_SALE_BRACKETS : HOUSE_LEASE_BRACKETS, amount);
    return { rate: b.rate, cap: b.cap, label: `주택 ${isSale ? "매매" : "임대차"} ${bracketLabel(b)}`, bracket: b };
  }
  if (target === "officetel") {
    return isSale
      ? { rate: OFFICETEL_SALE_RATE, cap: null, label: "주거용 오피스텔 매매·교환", bracket: null }
      : { rate: OFFICETEL_LEASE_RATE, cap: null, label: "주거용 오피스텔 임대차", bracket: null };
  }
  return { rate: OTHER_MAX_RATE, cap: null, label: "주택 외 중개대상물 (0.9% 이내 협의)", bracket: null };
}

export type FeeInput = {
  target: Target;
  deal: Deal;
  /** 매매가, 전세보증금, 또는 월세 보증금 (원) */
  amount: number;
  /** 월세 (원). deal === "wolse"일 때만 사용 */
  monthlyRent?: number;
  /** 협의 요율 (%). 없거나 0 이하면 상한요율 적용 */
  agreedRate?: number;
  /** 부가세 10% 더하기 */
  includeVat?: boolean;
};

export type FeeResult = {
  /** 거래금액 (월세는 환산액) */
  dealAmount: number;
  conversion: LeaseConversion | null;
  rule: FeeRule;
  /** 거래금액 × 상한요율 (한도액 적용 전) */
  rawMaxFee: number;
  /** 중개보수 상한액 = min(거래금액 × 상한요율, 한도액) */
  maxFee: number;
  /** 한도액 때문에 줄었는지 */
  capApplied: boolean;
  /** 실제 계산에 쓴 요율 (%) */
  appliedRate: number;
  /** 협의 요율을 썼는지 */
  agreedUsed: boolean;
  /** 협의 요율이 상한을 넘어 상한요율로 바꿨는지 */
  agreedClamped: boolean;
  /** 계산된 보수 (협의 요율 또는 상한요율, 한도액 적용) */
  fee: number;
  /** 부가세 (includeVat가 아니면 0) */
  vat: number;
  /** 보수 + 부가세 */
  total: number;
};

export function computeBrokerageFee(input: FeeInput): FeeResult | null {
  const { target, deal, includeVat = false } = input;
  const amount = Number.isFinite(input.amount) ? Math.max(0, input.amount) : 0;
  const rent = deal === "wolse" && Number.isFinite(input.monthlyRent) ? Math.max(0, input.monthlyRent ?? 0) : 0;

  let conversion: LeaseConversion | null = null;
  let dealAmount = Math.round(amount);
  if (deal === "wolse" && rent > 0) {
    conversion = convertWolse(amount, rent);
    dealAmount = conversion.amount;
  }
  if (!(dealAmount > 0)) return null;

  const rule = feeRule(target, deal, dealAmount);
  const rawMaxFee = applyRate(dealAmount, rule.rate);
  const maxFee = rule.cap !== null ? Math.min(rawMaxFee, rule.cap) : rawMaxFee;

  const agreed = input.agreedRate;
  const agreedUsed = agreed !== undefined && Number.isFinite(agreed) && agreed > 0;
  const agreedClamped = agreedUsed && (agreed as number) > rule.rate;
  const appliedRate = agreedUsed && !agreedClamped ? (agreed as number) : rule.rate;
  const rawFee = applyRate(dealAmount, appliedRate);
  const fee = rule.cap !== null ? Math.min(rawFee, rule.cap) : rawFee;

  const vat = includeVat ? Math.floor(fee * VAT_RATE) : 0;
  return {
    dealAmount,
    conversion,
    rule,
    rawMaxFee,
    maxFee,
    capApplied: rule.cap !== null && rawMaxFee > rule.cap,
    appliedRate,
    agreedUsed,
    agreedClamped,
    fee,
    vat,
    total: fee + vat,
  };
}

/** 상한액만 빠르게 (표·프로그래매틱 페이지용). */
export function maxFeeFor(target: Target, deal: Deal, amount: number): number {
  return computeBrokerageFee({ target, deal, amount })?.maxFee ?? 0;
}

/** 부가세 10%를 더한 금액 (원 미만 버림). */
export function withVat(fee: number): number {
  return fee + Math.floor(fee * VAT_RATE);
}

/* ------------------------------------------------------------------ */
/* Input helpers (협의 요율·월세 입력칸)                                  */
/* ------------------------------------------------------------------ */

/**
 * 입력 중인 소수 텍스트를 정리한다. 끝의 점("0.", "45.")을 지워 버리지 않으므로 0.35나 45.5를
 * 한 글자씩 칠 수 있다. 정수 부분은 천 단위 쉼표를 넣고, 맨 앞의 "."은 "0."으로, "03"은 "3"으로 바꾼다.
 * 소수 자릿수는 `decimals`까지만 남긴다(0이면 정수만).
 */
export function sanitizeDecimalDraft(raw: string, decimals: number): string {
  const body = raw.replace(/[^\d.]/g, "");
  const [intRaw, ...rest] = body.split(".");
  const hasDot = decimals > 0 && rest.length > 0;
  const frac = rest.join("").slice(0, decimals);
  let int = intRaw.replace(/^0+(?=\d)/, "");
  if (hasDot && int === "") int = "0";
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${grouped}${hasDot ? `.${frac}` : ""}`;
}

/** 협의 요율 빠른 입력 후보 (%) */
const AGREED_RATE_CANDIDATES = [0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.5, 0.6, 0.7, 0.8];

/**
 * 협의 요율 칩: 상한요율보다 낮은 후보 중 상한에 가까운 것 최대 `count`개 (오름차순).
 * 주택 매매 0.4% 구간이면 0.2·0.25·0.3·0.35%.
 */
export function agreedRatePresets(ruleRate: number, count = 4): number[] {
  const below = AGREED_RATE_CANDIDATES.filter((r) => r < ruleRate);
  return below.slice(Math.max(0, below.length - count));
}

/* ------------------------------------------------------------------ */
/* Programmatic landing pages: /brokerage-fee/<slug>/                  */
/* ------------------------------------------------------------------ */

export type FeePage = {
  slug: string;
  deal: "sale" | "jeonse";
  /** 거래금액 (원) */
  amount: number;
};

/** 검색량이 많은 금액만: 아파트 매매 3억~15억, 전세 2억·3억·5억. */
export const BROKERAGE_FEE_PAGES: FeePage[] = [
  { slug: "sale-3eok", deal: "sale", amount: 3 * EOK },
  { slug: "sale-5eok", deal: "sale", amount: 5 * EOK },
  { slug: "sale-6eok", deal: "sale", amount: 6 * EOK },
  { slug: "sale-9eok", deal: "sale", amount: 9 * EOK },
  { slug: "sale-10eok", deal: "sale", amount: 10 * EOK },
  { slug: "sale-12eok", deal: "sale", amount: 12 * EOK },
  { slug: "sale-15eok", deal: "sale", amount: 15 * EOK },
  { slug: "jeonse-2eok", deal: "jeonse", amount: 2 * EOK },
  { slug: "jeonse-3eok", deal: "jeonse", amount: 3 * EOK },
  { slug: "jeonse-5eok", deal: "jeonse", amount: 5 * EOK },
];

export function findFeePage(slug: string): FeePage | null {
  return BROKERAGE_FEE_PAGES.find((p) => p.slug === slug) ?? null;
}

/** 금액별 빠른 표에 쓰는 매매 금액 (원) */
export const SALE_TABLE_AMOUNTS: number[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20, 25, 30,
].map((n) => n * EOK);

/** 금액별 빠른 표에 쓰는 전세 보증금 (원) */
export const LEASE_TABLE_AMOUNTS: number[] = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 10, 12, 15].map((n) =>
  Math.round(n * EOK),
);

/** Window of `size` amounts centred on `amount` from a sorted list. */
export function neighborsOf(list: number[], amount: number, size = 9): number[] {
  const idx = Math.max(0, list.indexOf(amount));
  const half = Math.floor(size / 2);
  const start = Math.max(0, Math.min(idx - half, list.length - size));
  return list.slice(start, start + size);
}
