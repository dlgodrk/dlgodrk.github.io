/**
 * 전월세 전환율 계산 (주택).
 *
 * 근거
 * - 주택임대차보호법 제7조의2 (월차임 전환 시 산정률의 제한, 2016. 5. 29. 개정 · 2016. 11. 30. 시행)
 *   "보증금의 전부 또는 일부를 월 단위의 차임으로 전환하는 경우에는 그 전환되는 금액에 다음 각 호 중
 *   낮은 비율을 곱한 월차임의 범위를 초과할 수 없다."
 *   1. 은행 대출금리와 지역 경제 여건을 고려해 대통령령으로 정하는 비율 → 시행령 제9조① 연 1할(10%)
 *   2. 한국은행 기준금리 + 대통령령으로 정하는 이율 → 시행령 제9조② 연 2퍼센트
 *      (2020. 9. 29. 개정, 대통령령 제31080호. 그 전에는 연 3.5퍼센트)
 *   시행령 현행본: 대통령령 제36423호(2026. 6. 23. 타법개정, 2026. 7. 1. 시행). 제9조는 2020년 개정 그대로.
 *   https://www.law.go.kr/LSW/lsLinkCommonInfo.do?lspttninfSeq=130112&chrClsCd=010202 (2026-10-09 확인)
 * - 같은 법 제10조의2: 제7조의2의 산정률을 초과해 지급한 차임은 반환을 청구할 수 있다.
 * - 한국은행 기준금리: 2026. 8. 27. 금융통화위원회 결정 연 3.00% (2026-10-09 현재 현행).
 *   https://www.bok.or.kr/portal/singl/baseRate/list.do?dataSeCd=01&menuNo=200643 (2026-10-09 확인)
 *
 * 적용 범위
 * - 계약 기간 중 보증금을 월세로 바꾸는 경우, 계약갱신(계약갱신요구권 행사 포함) 때 임차인 동의로 바꾸는 경우.
 *   국토교통부·법무부 「개정 주택임대차보호법 해설집」(2020. 8.) 전월세 전환 Q1.
 * - 법제처 법령해석 20-0683(2021. 3. 3.): 대통령령 제31080호 부칙 제2조(가산 이율 연 2% 개정규정의 적용례)의
 *   "월 단위 차임으로 전환하는 경우"인지는 월 단위 차임으로 전환하는 갱신계약의 체결일을 기준으로 판단.
 *   어느 날의 기준금리를 쓰는지는 다루지 않는다.
 * - 새 임차인과 처음 맺는 계약은 보증금을 '전환'하는 것이 아니어서 일반적으로 적용되지 않는다고 본다.
 * - 법은 보증금 → 월세 방향만 제한한다. 월세 → 전세 환산은 상한이 없고 보통 지역 시세 전환율을 쓴다.
 * - 상가건물은 상가건물 임대차보호법 제12조·시행령 제5조(연 12%와 기준금리 × 4.5 중 낮은 비율)를 따르며,
 *   제2조③이 제12조를 넓혀 적용하지 않으므로 환산보증금이 지역별 기준 이하인 임대차에만 적용된다.
 *
 * 금액은 원, 비율은 퍼센트(5 = 연 5%)로 다룬다. 월세는 상한을 넘지 않도록 원 미만을 버린다.
 */

import { formatNumber } from "@/lib/format";

export const MAN = 10_000;
export const EOK = 100_000_000;

/** 시행령 제9조①: 연 1할 */
export const STATUTORY_CEILING_PCT = 10;
/** 시행령 제9조②: 기준금리에 더하는 이율 (2020. 9. 29.부터) */
export const STATUTORY_SPREAD_PCT = 2;

/** 현행 한국은행 기준금리 (%) */
export const BOK_BASE_RATE_PCT = 3.0;
/** 위 기준금리가 정해진 날 (금융통화위원회 결정일, YYYY-MM-DD) */
export const BOK_BASE_RATE_DATE = "2026-08-27";
/** 기준금리를 확인한 날 */
export const BOK_BASE_RATE_CHECKED = "2026-10-09";
export const BOK_BASE_RATE_SOURCE = {
  name: "한국은행 기준금리 추이",
  url: "https://www.bok.or.kr/portal/singl/baseRate/list.do?dataSeCd=01&menuNo=200643",
};

/**
 * 최근 기준금리 변경 이력 (최신순). 가산 이율이 연 2%가 된 2020. 9. 29. 이후 바뀐 값 중 일부.
 * 출처: 한국은행 기준금리 추이 (2026-10-09 확인).
 */
export const BASE_RATE_HISTORY: { date: string; rate: number }[] = [
  { date: "2026-08-27", rate: 3.0 },
  { date: "2026-07-16", rate: 2.75 },
  { date: "2025-05-29", rate: 2.5 },
  { date: "2025-02-25", rate: 2.75 },
  { date: "2024-11-28", rate: 3.0 },
  { date: "2024-10-11", rate: 3.25 },
  { date: "2023-01-13", rate: 3.5 },
];

/**
 * 시장 전환율 참고값: 한국주택금융공사(HF)가 전세자금보증 심사에서 월세를 보증금으로 환산할 때 쓰는 전월세전환율.
 * 2026년 하반기 6.5% = 통계청 국가통계포털 '지역별 전월세전환율' 최근 6개월 산술평균,
 * 2026. 7. 1. 보증신청 건부터 적용 (2026. 6. 22. 공지). HF는 반기마다 새로 공지한다.
 * https://www.hf.go.kr/ko/sub04/sub04_08.do?mode=view&articleNo=600176 (2026-10-09 확인)
 */
export const MARKET_RATE = {
  pct: 6.5,
  /** 적용 기간 이름 */
  period: "2026년 하반기",
  /** 적용 시작일 (YYYY-MM-DD) */
  effective: "2026-07-01",
  name: "한국주택금융공사 「2026년 하반기 전월세전환율 안내」",
  url: "https://www.hf.go.kr/ko/sub04/sub04_08.do?mode=view&articleNo=600176",
} as const;

/** Float noise guard for percent arithmetic. */
const EPS = 1e-9;

function cleanPct(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/** 법정 전환율 상한 (%) = min(연 10%, 기준금리 + 연 2%) */
export function legalCapRate(baseRatePct: number = BOK_BASE_RATE_PCT): number {
  return Math.min(STATUTORY_CEILING_PCT, cleanPct(baseRatePct + STATUTORY_SPREAD_PCT));
}

/** 현행 법정 전환율 상한 (%) */
export const LEGAL_CAP_RATE = legalCapRate();

/** 만원 단위 입력 → 원 (83.3만원 → 833,000원, 부동소수 오차 없이) */
export function manToWon(manwon: number): number {
  return Math.round(manwon * MAN);
}

/** 원 미만 버림 (소수 오차로 833,332.9999…가 되는 것 방지) */
function floorWon(n: number): number {
  return Math.floor(n + 1e-6);
}

/** 연 전환율로 바뀌는 월세 (원 미만 버림): 전환 금액 × 전환율 ÷ 12 */
export function monthlyRentFor(convertedWon: number, ratePct: number): number {
  return floorWon((convertedWon * ratePct) / 1200);
}

function isMoney(n: number): boolean {
  return Number.isFinite(n) && n >= 0;
}

export type ToWolseResult = {
  /** 월세로 바뀌는 보증금 = 전세보증금 − 월세보증금 */
  converted: number;
  /** 적용 전환율 (%) */
  ratePct: number;
  /** 월세 (원 미만 버림) */
  monthlyRent: number;
  /** 법정 상한 (%) */
  capRate: number;
  /** 법정 상한으로 계산한 최대 월세 */
  capMonthlyRent: number;
  /** 적용 전환율이 법정 상한을 넘는지 */
  overCap: boolean;
  /** 상한 기준 월세보다 많은 금액 (월) */
  excessPerMonth: number;
};

/**
 * (1) 전세 → 월세: 월세 = (전세보증금 − 월세보증금) × 전환율 ÷ 12
 * 보증금이 전세금 이상이거나 전환율이 0 이하이면 null.
 */
export function computeToWolse({
  jeonse,
  deposit,
  ratePct,
  capRatePct = LEGAL_CAP_RATE,
}: {
  jeonse: number;
  deposit: number;
  ratePct: number;
  capRatePct?: number;
}): ToWolseResult | null {
  if (!isMoney(jeonse) || !isMoney(deposit) || !(Number.isFinite(ratePct) && ratePct > 0)) return null;
  if (jeonse <= 0 || deposit >= jeonse) return null;
  const converted = jeonse - deposit;
  const monthlyRent = monthlyRentFor(converted, ratePct);
  const capMonthlyRent = monthlyRentFor(converted, capRatePct);
  return {
    converted,
    ratePct,
    monthlyRent,
    capRate: capRatePct,
    capMonthlyRent,
    overCap: ratePct > capRatePct + EPS,
    excessPerMonth: Math.max(0, monthlyRent - capMonthlyRent),
  };
}

export type ToJeonseResult = {
  /** 연 월세 합계 = 월세 × 12 */
  annualRent: number;
  /** 월세를 보증금으로 환산한 금액 = 연 월세 ÷ 전환율 (원 단위 반올림) */
  convertedDeposit: number;
  /** 전세 환산 보증금 = 보증금 + 환산 금액 */
  jeonse: number;
  ratePct: number;
  capRate: number;
  /** 법정 상한 전환율로 환산했을 때의 전세 보증금 */
  jeonseAtCap: number;
};

/** (2) 월세 → 전세: 전세 환산 보증금 = 보증금 + 월세 × 12 ÷ 전환율 */
export function computeToJeonse({
  deposit,
  monthlyRent,
  ratePct,
  capRatePct = LEGAL_CAP_RATE,
}: {
  deposit: number;
  monthlyRent: number;
  ratePct: number;
  capRatePct?: number;
}): ToJeonseResult | null {
  if (!isMoney(deposit) || !isMoney(monthlyRent) || monthlyRent <= 0) return null;
  if (!(Number.isFinite(ratePct) && ratePct > 0)) return null;
  const annualRent = monthlyRent * 12;
  const convertedDeposit = Math.round((annualRent * 100) / ratePct);
  const atCap = Math.round((annualRent * 100) / capRatePct);
  return {
    annualRent,
    convertedDeposit,
    jeonse: deposit + convertedDeposit,
    ratePct,
    capRate: capRatePct,
    jeonseAtCap: deposit + atCap,
  };
}

export type ImpliedRateResult = {
  /** 월세로 바뀐 보증금 = 전세보증금 − 월세보증금 */
  converted: number;
  /** 연 월세 합계 */
  annualRent: number;
  /** 실제 전환율 (%) = 월세 × 12 ÷ (전세보증금 − 월세보증금) */
  ratePct: number;
  capRate: number;
  overCap: boolean;
  /** 실제 전환율 − 법정 상한 (%p) */
  diffPctPoint: number;
  /** 법정 상한으로 계산한 최대 월세 */
  capMonthlyRent: number;
  /** 상한보다 더 내는 월세 (월) */
  excessPerMonth: number;
};

/** (3) 전환율 역산: 전환율 = 월세 × 12 ÷ (전세보증금 − 월세보증금) */
export function computeImpliedRate({
  jeonse,
  deposit,
  monthlyRent,
  capRatePct = LEGAL_CAP_RATE,
}: {
  jeonse: number;
  deposit: number;
  monthlyRent: number;
  capRatePct?: number;
}): ImpliedRateResult | null {
  if (!isMoney(jeonse) || !isMoney(deposit) || !isMoney(monthlyRent)) return null;
  if (jeonse <= 0 || deposit >= jeonse || monthlyRent <= 0) return null;
  const converted = jeonse - deposit;
  const annualRent = monthlyRent * 12;
  const ratePct = (annualRent * 100) / converted;
  const capMonthlyRent = monthlyRentFor(converted, capRatePct);
  const overCap = ratePct > capRatePct + EPS;
  return {
    converted,
    annualRent,
    ratePct,
    capRate: capRatePct,
    overCap,
    diffPctPoint: ratePct - capRatePct,
    capMonthlyRent,
    excessPerMonth: overCap ? Math.max(0, monthlyRent - capMonthlyRent) : 0,
  };
}

/**
 * Fraction digits for showing a rate next to the cap. Normally 2, but an over-cap rate must never
 * read as equal to the cap: 834,000원 on 2억 is 5.004%, which 2 digits would print as "5%" next to
 * a 상한 초과 verdict. Adds digits until both the rate and its %p difference are visibly non-zero.
 */
export function rateDisplayDigits(ratePct: number, capRatePct: number = LEGAL_CAP_RATE): number {
  if (!(ratePct > capRatePct + EPS)) return 2;
  let d = 2;
  while (
    d < 10 &&
    (formatNumber(ratePct, d) === formatNumber(capRatePct, d) || formatNumber(ratePct - capRatePct, d) === "0")
  ) {
    d++;
  }
  return d;
}

/** Example 전환 금액(원) for the prose table: 1천만원 ~ 3억원 */
export const TABLE_CONVERTED_AMOUNTS = [1_000, 3_000, 5_000, 10_000, 15_000, 20_000, 30_000].map((m) => m * MAN);

/**
 * Rates (%) compared in the prose table: a little below the cap, the cap, and two
 * market-like rates above it (시장 전환율은 대체로 법정 상한보다 높다). Follows the cap when the base rate changes.
 */
export function tableRates(cap: number = LEGAL_CAP_RATE): number[] {
  return [cleanPct(cap - 0.5), cap, cleanPct(cap + 1), cleanPct(cap + 2)];
}
