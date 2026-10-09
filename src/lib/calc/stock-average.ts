/**
 * 주식 평균 단가(평단가) 계산 — 물타기·불타기.
 *
 * - 평균 단가 = 총 매수 금액 ÷ 총 수량. 국내 증권사는 이동평균법을 써서 살 때마다 평단을 다시 계산하고,
 *   일부를 팔아도 남은 주식의 평단은 그대로 둔다.
 * - 본전 상승률 = 평단 ÷ 현재가 − 1 (현재가에서 평단까지 올라야 하는 비율).
 * - 목표 평단 역산: (P·Q + B·x) ÷ (Q + x) = T  →  x = Q·(P − T) ÷ (T − B)
 *   목표 T는 지금 평단 P와 추가 매수가 B 사이에 있어야만 만들 수 있다.
 *
 * 매도 시 세금 (증권거래세법 제8조, 같은 법 시행령 제5조 탄력세율, 2026년 1월 1일 이후 양도분부터):
 *   코스피 증권거래세 0.05% + 농어촌특별세 0.15% = 0.20%, 코스닥·K-OTC 0.20%, 코넥스 0.10%.
 *   2025년에는 코스피 0%+0.15%, 코스닥 0.15%였다. 금융투자소득세 폐지로 2023년 수준으로 환원.
 *   근거: 증권거래세법 시행령 일부개정 대통령령 제36001호 (공포 2025.12.31, 시행 2026.1.1) —
 *   유가증권시장 영(零) → 1만분의 5, 코스닥·금융투자협회 장외 1만분의 15 → 1만분의 20, 코넥스 1만분의 10 유지
 *   (law.go.kr 제·개정이유 lsRvsRsnListP.do?lsId=005028). 농특세 0.15%는 농어촌특별세법 제5조 제1항 제5호(1만분의 15).
 *   국내 상장 ETF 매도와 해외주식에는 국내 증권거래세가 없다. 국내 주식형이 아닌 ETF의 매매차익에 붙는
 *   배당소득세 15.4%는 계산에 넣지 않는다 (UI가 안내).
 *
 * Pure functions only. Amounts are not rounded here; the UI rounds for display.
 */
import { formatNumber } from "@/lib/format";

export type Lot = { price: number; qty: number };
export type Position = { qty: number; cost: number; avg: number };
export type Currency = "won" | "usd";

/** At most this many 추가 매수 rows. */
export const MAX_BUY_ROWS = 5;
/** Largest price / quantity a box accepts. */
export const MAX_PRICE = 1_000_000_000;
export const MAX_QTY = 1_000_000_000;
/** Brokerage fee rate cap in percent (inputs above this are typos). */
export const MAX_FEE_PCT = 5;

const fin = Number.isFinite;

/** A lot that takes part in the average: price and quantity both above 0. */
export function isCompleteLot(l: Lot): boolean {
  return fin(l.price) && fin(l.qty) && l.price > 0 && l.qty > 0;
}

/** A row the user has not filled in at all (both boxes empty or 0). */
export function isBlankLot(l: Lot): boolean {
  const has = (n: number) => fin(n) && n !== 0;
  return !has(l.price) && !has(l.qty);
}

/** Combine every complete lot into one position. avg is NaN when nothing is held. */
export function combineLots(lots: Lot[]): Position {
  let qty = 0;
  let cost = 0;
  for (const l of lots) {
    if (!isCompleteLot(l)) continue;
    qty += l.qty;
    cost += l.price * l.qty;
  }
  return { qty, cost, avg: qty > 0 ? cost / qty : NaN };
}

/** Average after buying `n` more shares at `buyPrice`. */
export function averageAfterBuy(avg: number, qty: number, buyPrice: number, n: number): number {
  const total = qty + n;
  return total > 0 ? (avg * qty + buyPrice * n) / total : NaN;
}

/**
 * 현재가에서 평단까지 필요한 상승률 (ratio). 63,000원 → 66,000원 = 0.0476.
 * 0 이하이면 이미 평단 이상(수익 구간)이다.
 */
export function breakevenRise(avg: number, price: number): number {
  if (!(price > 0) || !fin(avg)) return NaN;
  return avg / price - 1;
}

/** 하락률(ratio)만큼 빠진 뒤 원금을 되찾는 데 필요한 상승률. 0.5 → 1 (100%). */
export function recoveryRise(drop: number): number {
  if (!(drop < 1)) return Infinity;
  return 1 / (1 - drop) - 1;
}

export type Valuation = {
  /** 평가금액 = 수량 × 현재가 */
  value: number;
  /** 평가손익 = 평가금액 − 총 매수 금액 */
  pnl: number;
  /** 수익률 = 평가손익 ÷ 총 매수 금액 */
  rate: number;
  /** 본전 상승률 (현재가 → 평단) */
  rise: number;
};

export function valuation(pos: Position, price: number): Valuation {
  const value = pos.qty * price;
  const pnl = value - pos.cost;
  return { value, pnl, rate: pos.cost > 0 ? pnl / pos.cost : NaN, rise: breakevenRise(pos.avg, price) };
}

// ---------- 수수료·세금 ----------

export type Market = "kospi" | "kosdaq" | "konex" | "etf";

/** 2026년 1월 1일 이후 매도분 세율 (ratio). */
export const SELL_TAX_2026: Record<Market, { label: string; short: string; tradeTax: number; ruralTax: number }> = {
  kospi: { label: "코스피 (유가증권시장)", short: "코스피", tradeTax: 0.0005, ruralTax: 0.0015 },
  kosdaq: { label: "코스닥", short: "코스닥", tradeTax: 0.002, ruralTax: 0 },
  konex: { label: "코넥스", short: "코넥스", tradeTax: 0.001, ruralTax: 0 },
  etf: { label: "국내 상장 ETF (거래세 없음)", short: "ETF", tradeTax: 0, ruralTax: 0 },
};

/** 2025년까지(2025.12.31 양도분) 세율, 비교표용. */
export const SELL_TAX_2025: Record<Market, { tradeTax: number; ruralTax: number }> = {
  kospi: { tradeTax: 0, ruralTax: 0.0015 },
  kosdaq: { tradeTax: 0.0015, ruralTax: 0 },
  konex: { tradeTax: 0.001, ruralTax: 0 },
  etf: { tradeTax: 0, ruralTax: 0 },
};

export const MARKETS: Market[] = ["kospi", "kosdaq", "konex", "etf"];

export function isMarket(v: string): v is Market {
  return (MARKETS as string[]).includes(v);
}

export function sellTaxRate(m: Market): number {
  const t = SELL_TAX_2026[m];
  return t.tradeTax + t.ruralTax;
}

/** 비대면 계좌에서 흔한 매매 수수료율(%) — 입력 기본값. */
export const DEFAULT_FEE_PCT = 0.015;

export type CostBreakdown = {
  /** 매수 수수료 = 총 매수 금액 × 수수료율 (보유분까지 같은 요율로 추정) */
  buyFee: number;
  /** 수수료 포함 평단 = (총 매수 금액 + 매수 수수료) ÷ 수량 */
  effectiveAvg: number;
  /** 매수·매도 수수료와 세금을 모두 회수하는 매도가 */
  breakevenPrice: number;
  /** 아래는 현재가가 있을 때만 (없으면 NaN) */
  sellFee: number;
  tradeTax: number;
  ruralTax: number;
  /** 지금 다 팔면 손에 남는 손익 = 평가금액 − 매도 비용 − 총 매수 금액 − 매수 수수료 */
  netPnl: number;
  netRate: number;
  /** 현재가 → 실질 본전 가격 상승률 */
  netRise: number;
};

/**
 * @param feeRate 매수·매도 각각에 붙는 증권사 수수료율 (ratio, 0.015% → 0.00015)
 * @param taxRates 매도 시 증권거래세·농특세 (ratio). 해외주식은 0.
 */
export function withCosts(
  pos: Position,
  feeRate: number,
  taxRates: { tradeTax: number; ruralTax: number },
  price: number,
): CostBreakdown {
  const buyFee = pos.cost * feeRate;
  const totalPaid = pos.cost + buyFee;
  const keep = 1 - feeRate - taxRates.tradeTax - taxRates.ruralTax;
  const breakevenPrice = pos.qty > 0 && keep > 0 ? totalPaid / (pos.qty * keep) : NaN;
  const hasPrice = fin(price) && price > 0;
  const value = hasPrice ? pos.qty * price : NaN;
  const sellFee = value * feeRate;
  const tradeTax = value * taxRates.tradeTax;
  const ruralTax = value * taxRates.ruralTax;
  const netPnl = value - sellFee - tradeTax - ruralTax - totalPaid;
  return {
    buyFee,
    effectiveAvg: pos.qty > 0 ? totalPaid / pos.qty : NaN,
    breakevenPrice,
    sellFee,
    tradeTax,
    ruralTax,
    netPnl,
    netRate: totalPaid > 0 ? netPnl / totalPaid : NaN,
    netRise: hasPrice ? breakevenPrice / price - 1 : NaN,
  };
}

// ---------- 목표 평단 역산 ----------

export type TargetInput = { avg: number; qty: number; buyPrice: number; target: number };

export type TargetResult =
  /** 입력이 비었거나 0 이하 */
  | { kind: "invalid" }
  /** 지금 평단이 이미 목표와 같다 */
  | { kind: "already" }
  /** 추가 매수가가 지금 평단과 같아 평단이 움직이지 않는다 */
  | { kind: "same-price" }
  /** 목표가 평단이 움직이는 방향의 반대편에 있다 (싸게 사면서 평단을 올리려는 경우 등) */
  | { kind: "wrong-side"; direction: "down" | "up" }
  /** 물타기: 목표가 추가 매수가 이하라 아무리 사도 닿지 않는다 */
  | { kind: "unreachable" }
  /** 불타기: 목표가 추가 매수가 이상이라 몇 주를 사도 평단이 목표를 넘지 않는다 */
  | { kind: "unbounded" }
  /** 불타기: 1주만 사도 목표를 넘는다 */
  | { kind: "none-fits"; exact: number; oneShareAvg: number }
  | {
      kind: "ok";
      /** down = 물타기(최소 수량, 올림), up = 불타기(최대 수량, 내림) */
      direction: "down" | "up";
      /** 정확한 계산값 (소수) */
      exact: number;
      /** 정수 주식 수 */
      shares: number;
      /** 그 수량을 샀을 때 실제 평단 */
      resultAvg: number;
      /** 필요 매수 금액 */
      cost: number;
      totalQty: number;
    };

/** Tolerance so 99.99999999997 becomes 100 before rounding to whole shares. */
function snap(n: number): number {
  const r = Math.round(n);
  return Math.abs(n - r) < 1e-9 * Math.max(1, Math.abs(n)) ? r : n;
}

/**
 * 목표 평단을 만들려면 추가 매수가에 몇 주를 더 사야 하는지.
 * 72,000원 × 100주, 60,000원에 사서 66,000원을 만들려면 100주.
 */
export function sharesForTarget({ avg, qty, buyPrice, target }: TargetInput): TargetResult {
  if (![avg, qty, buyPrice, target].every((n) => fin(n) && n > 0)) return { kind: "invalid" };
  if (target === avg) return { kind: "already" };
  if (buyPrice === avg) return { kind: "same-price" };
  const direction = buyPrice < avg ? "down" : "up";
  if (direction === "down") {
    if (target > avg) return { kind: "wrong-side", direction };
    if (target <= buyPrice) return { kind: "unreachable" };
  } else {
    if (target < avg) return { kind: "wrong-side", direction };
    if (target >= buyPrice) return { kind: "unbounded" };
  }
  const exact = snap((qty * (avg - target)) / (target - buyPrice));
  const shares = direction === "down" ? Math.ceil(exact) : Math.floor(exact);
  if (shares < 1) return { kind: "none-fits", exact, oneShareAvg: averageAfterBuy(avg, qty, buyPrice, 1) };
  return {
    kind: "ok",
    direction,
    exact,
    shares,
    resultAvg: averageAfterBuy(avg, qty, buyPrice, shares),
    cost: buyPrice * shares,
    totalQty: qty + shares,
  };
}

// ---------- URL encoding of 추가 매수 rows ----------

/** URL text → number. "" or junk → NaN (an empty box). Negative numbers are not valid prices. */
export function parseCell(s: string): number {
  const t = s.trim();
  if (t === "") return NaN;
  const n = Number(t);
  return fin(n) && n >= 0 ? n : NaN;
}

/** Number → URL text; an empty box (NaN) stays "" so a cleared box survives a shared link. */
export function cellText(n: number): string {
  return fin(n) ? String(n) : "";
}

/**
 * Rows → compact URL text: "60000x100_58000x50". Empty boxes stay empty ("x100").
 * Only characters URLSearchParams leaves unescaped are used, so links stay readable.
 */
export function encodeLots(lots: Lot[]): string {
  return lots.map((l) => `${cellText(l.price)}x${cellText(l.qty)}`).join("_");
}

/** Inverse of encodeLots. Also accepts "p:q,p:q". Always returns 1..MAX_BUY_ROWS rows. */
export function decodeLots(s: string): Lot[] {
  const rows = s
    .split(/[_,;]/)
    .slice(0, MAX_BUY_ROWS)
    .map((row) => {
      const [p = "", q = ""] = row.split(/[x:*]/i);
      return { price: parseCell(p), qty: parseCell(q) };
    });
  return rows.length ? rows : [{ price: NaN, qty: NaN }];
}

// ---------- display helpers ----------

/** Round to `digits` fraction digits, keeping NaN. Keeps the number shown in a box equal to the number used. */
export function roundDigits(n: number, digits: number): number {
  if (!fin(n)) return n;
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

/** Fraction digits each box accepts. */
export const DIGITS: Record<Currency, { avg: number; price: number; qty: number }> = {
  won: { avg: 2, price: 0, qty: 0 },
  usd: { avg: 4, price: 4, qty: 6 },
};

const usd2 = new Intl.NumberFormat("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const usd4 = new Intl.NumberFormat("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 4 });

function fmtUsd(n: number, nf: Intl.NumberFormat): string {
  if (!fin(n)) return "-";
  const s = nf.format(Math.abs(n));
  // "-0.00" → "0.00"
  return n < 0 && /[1-9]/.test(s) ? `-$${s}` : `$${s}`;
}

/** Unit price (평단, 단가): 66,000원 / 66,666.67원 / $182.35 */
export function formatPrice(n: number, cur: Currency): string {
  return cur === "usd" ? fmtUsd(n, usd4) : `${formatNumber(n, 2)}원`;
}

/** Money amount: 13,200,000원 / $1,650.00 */
export function formatAmount(n: number, cur: Currency): string {
  return cur === "usd" ? fmtUsd(n, usd2) : `${formatNumber(n)}원`;
}

/** Amount with an explicit sign: +600,000원 / −600,000원 / 0원 */
export function formatSignedAmount(n: number, cur: Currency): string {
  if (!fin(n)) return "-";
  const shown = cur === "usd" ? Math.round(n * 100) / 100 : Math.round(n);
  if (shown === 0) return formatAmount(0, cur);
  return `${shown > 0 ? "+" : "−"}${formatAmount(Math.abs(n), cur)}`;
}

/** Ratio as a signed percent: 0.0476 → "+4.76%", −0.0455 → "−4.55%" */
export function formatSignedPercent(ratio: number, digits = 2): string {
  if (!fin(ratio)) return "-";
  const pct = Math.round(ratio * 100 * 10 ** digits) / 10 ** digits;
  if (pct === 0) return "0%";
  return `${pct > 0 ? "+" : "−"}${formatNumber(Math.abs(pct), digits)}%`;
}

/** 200주 / 1.5주 */
export function formatQty(n: number, cur: Currency): string {
  return `${formatNumber(n, DIGITS[cur].qty)}주`;
}
