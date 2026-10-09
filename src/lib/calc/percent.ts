/**
 * 퍼센트(백분율) 계산.
 *
 * - A의 B%            = A × B ÷ 100
 * - A는 B의 몇 %      = A ÷ B × 100
 * - A → B 변화율      = (B − A) ÷ |A| × 100   (퍼센트포인트 차이 = B − A)
 * - A에서 B% 증가/감소 = A × (100 ± B) ÷ 100
 * - 할인가            = 정가 × (100 − 할인율) ÷ 100, 연속 할인은 곱해서 적용
 *
 * Pure functions only. Anything that would divide by zero returns null.
 */
import { formatNumber } from "@/lib/format";

export type Direction = "up" | "down";

/** Drop binary floating-point noise (0.1 + 0.2 → 0.3) by keeping 14 significant digits. */
export function tidy(n: number): number {
  if (n === 0) return 0; // also turns -0 into 0
  if (!Number.isFinite(n)) return n;
  return Number(n.toPrecision(14));
}

/** A의 B% : 50,000의 15% = 7,500 */
export function percentOf(base: number, pct: number): number {
  return tidy((base * pct) / 100);
}

/** A는 B의 몇 % : 45는 60의 75% */
export function ratioPercent(part: number, whole: number): number | null {
  if (whole === 0) return null;
  return tidy((part / whole) * 100);
}

/**
 * A → B 변화율(%). 분모는 이전 값(A)의 절댓값이라, 음수에서 출발해도 증가는 +, 감소는 −가 된다.
 * 25,000 → 30,000 = +20, 30,000 → 25,000 = −16.67
 */
export function changeRate(from: number, to: number): number | null {
  if (from === 0) return null;
  return tidy(((to - from) / Math.abs(from)) * 100);
}

/** 두 퍼센트 값의 단순 차이(%p). 3% → 3.5% = +0.5%p */
export function percentPointDiff(fromPct: number, toPct: number): number {
  return tidy(toPct - fromPct);
}

/** A에서 B% 증가(up) 또는 감소(down)한 값. 50,000에서 10% 증가 = 55,000 */
export function applyPercentChange(base: number, pct: number, dir: Direction): number {
  const factor = dir === "up" ? 100 + pct : 100 - pct;
  return tidy((base * factor) / 100);
}

/**
 * B% 증가(감소) 전의 원래 값. 결과 ÷ (1 ± B%).
 * 부가세 10% 포함가 11,000원 → 공급가 10,000원 (11,000 × 0.9 = 9,900이 아님)
 */
export function valueBeforeChange(result: number, pct: number, dir: Direction): number | null {
  const factor = dir === "up" ? 100 + pct : 100 - pct;
  if (factor === 0) return null;
  return tidy((result * 100) / factor);
}

/**
 * B% 바뀐 결과에서 원래 값으로 돌아가려면 반대 방향으로 몇 % 바뀌어야 하는지.
 * 25% 오른 값은 20% 내려야 원래대로, 50% 내린 값은 100% 올라야 원래대로.
 * 100% 이상 감소한 경우(0 이하가 된 경우)는 되돌릴 수 없으므로 null.
 */
export function recoveryRate(pct: number, dir: Direction): number | null {
  if (dir === "up") {
    if (100 + pct === 0) return null;
    return tidy((pct / (100 + pct)) * 100);
  }
  if (pct >= 100) return null;
  return tidy((pct / (100 - pct)) * 100);
}

/** 정률 할인을 차례로 적용했을 때의 실제 총 할인율(%). [20, 10] → 28 */
export function combinedDiscountRate(rates: number[]): number {
  const remain = tidy(rates.reduce((acc, r) => acc * (100 - r), 1) / 100 ** rates.length);
  return tidy((1 - remain) * 100);
}

/** 증감률을 차례로 적용했을 때의 누적 변화율(%). [10, 20] → 32 */
export function compoundChange(rates: number[]): number {
  const factor = tidy(rates.reduce((acc, r) => acc * (100 + r), 1) / 100 ** rates.length);
  return tidy((factor - 1) * 100);
}

/** 기간별 증감률의 기하평균(연평균 성장률 방식). [10, 20] → 14.89 */
export function averageRate(rates: number[]): number | null {
  if (rates.length === 0) return null;
  const factor = tidy(rates.reduce((acc, r) => acc * (100 + r), 1) / 100 ** rates.length);
  if (factor < 0) return null;
  return tidy((Math.pow(factor, 1 / rates.length) - 1) * 100);
}

export type DiscountBreakdown = {
  /** 1차 할인 금액 */
  firstDiscount: number;
  /** 1차 할인 후 가격 */
  afterFirst: number;
  /** 추가 할인 금액 (1차 할인가 기준) */
  extraDiscount: number;
  /** 최종 판매가 */
  final: number;
  /** 총 할인 금액 */
  totalDiscount: number;
  /** 정가 대비 실제 총 할인율(%) */
  effectiveRate: number;
};

/** 정가와 할인율(+ 선택 추가 할인율)로 판매가를 계산. 추가 할인은 1차 할인가에 적용한다. */
export function discountBreakdown(listPrice: number, rate: number, extraRate = 0): DiscountBreakdown {
  const firstDiscount = percentOf(listPrice, rate);
  const afterFirst = tidy(listPrice - firstDiscount);
  const extraDiscount = percentOf(afterFirst, extraRate);
  const final = tidy(afterFirst - extraDiscount);
  return {
    firstDiscount,
    afterFirst,
    extraDiscount,
    final,
    totalDiscount: tidy(listPrice - final),
    effectiveRate: combinedDiscountRate([rate, extraRate]),
  };
}

/**
 * discountBreakdown을 원 단위로 맞춘 버전(화면 표시용). 가격은 원 미만을 반올림하고,
 * 할인 금액은 가격끼리의 차이로 구해 "정가 − 할인 = 판매가"가 항상 맞아떨어진다.
 * 추가 할인은 실제 결제처럼 원 단위로 맞춘 1차 할인가에 적용한다.
 * 33,333원에서 33% 할인 → 판매가 22,333원(정확히는 22,333.11원), 할인 11,000원
 */
export function discountBreakdownWon(listPrice: number, rate: number, extraRate = 0): DiscountBreakdown {
  const list = roundToDigits(listPrice, 0);
  const afterFirst = roundToDigits(applyPercentChange(list, rate, "down"), 0);
  const final = roundToDigits(applyPercentChange(afterFirst, extraRate, "down"), 0);
  return {
    firstDiscount: list - afterFirst,
    afterFirst,
    extraDiscount: afterFirst - final,
    final,
    totalDiscount: list - final,
    effectiveRate: combinedDiscountRate([rate, extraRate]),
  };
}

/** 정가와 판매가로 할인율(%) 계산. 39,000원 → 29,900원 = 23.33% */
export function discountRateFrom(listPrice: number, salePrice: number): number | null {
  if (listPrice <= 0) return null;
  return tidy(((listPrice - salePrice) / listPrice) * 100);
}

/** 판매가와 할인율로 정가 역산. 20% 할인가 8,000원 → 정가 10,000원 */
export function listPriceFrom(salePrice: number, rate: number): number | null {
  if (rate >= 100) return null;
  return tidy((salePrice * 100) / (100 - rate));
}

// ---------- display helpers ----------

/**
 * Round to a fixed number of fraction digits (0 = whole numbers), the same way the input
 * boxes display them. 39000.5 → 39001, 0.123456 → 0.1235. Non-finite values pass through.
 */
export function roundToDigits(n: number, digits: number): number {
  if (!Number.isFinite(n)) return n;
  if (digits <= 0) {
    const r = Math.round(n);
    return r === 0 ? 0 : r; // no -0
  }
  return tidy(Number(n.toFixed(digits)));
}

/** Fraction digits that keep small values readable: 2 normally, more below 1. */
export function fractionDigitsFor(n: number): number {
  const a = Math.abs(n);
  if (a === 0 || a >= 1) return 2;
  if (a >= 0.01) return 4;
  return 6;
}

/** 1234.5678 → "1,234.57", 0.012345 → "0.0123" */
export function formatValue(n: number, digits = fractionDigitsFor(n)): string {
  const s = formatNumber(tidy(n), digits);
  return s === "-0" ? "0" : s;
}

/** Signed value: +5,000 / -16.67 / 0 */
export function formatSigned(n: number, digits?: number): string {
  const s = formatValue(n, digits);
  return n > 0 && s !== "0" ? `+${s}` : s;
}

/** "20%" */
export function formatPct(n: number, digits?: number): string {
  return `${formatValue(n, digits)}%`;
}

/** 증가/감소 wording for a signed change. */
export function changeWord(n: number, up = "증가", down = "감소"): string {
  if (n > 0) return up;
  if (n < 0) return down;
  return "변화 없음";
}

// Whether the Korean reading of each final digit ends with a consonant (받침):
// 영 일 이 삼 사 오 육 칠 팔 구
const DIGIT_HAS_BATCHIM = [true, true, false, true, false, false, true, true, true, false];

/**
 * 은/는 for a displayed number such as "45", "1,000", "3.5", "20%", "39,000원".
 * Numbers are read the Korean way (45 = 사십오 → 는, 30 = 삼십 → 은, 1조 = 일조 → 는).
 */
export function topicParticle(text: string): "은" | "는" {
  const t = text.trim();
  if (/%p?$/.test(t)) return "는"; // 퍼센트, 퍼센트포인트
  if (t.endsWith("원")) return "은";
  const num = t.replace(/[^\d.]/g, "");
  if (!num) return "는";
  if (num.includes(".")) {
    // 3.5 → 삼 점 오: decimals are read digit by digit.
    const last = num[num.length - 1];
    if (last === ".") return "는";
    return DIGIT_HAS_BATCHIM[Number(last)] ? "은" : "는";
  }
  const int = num.replace(/^0+(?=\d)/, "");
  if (int === "0") return "은"; // 영
  const trailingZeros = int.length - int.replace(/0+$/, "").length;
  if (trailingZeros === 0) return DIGIT_HAS_BATCHIM[Number(int[int.length - 1])] ? "은" : "는";
  // 십 백 천 만 … 억 … all end in a consonant; only 조 (10^12 ~ 10^15 place) does not.
  if (trailingZeros >= 12 && trailingZeros < 16) return "는";
  return "은";
}

// ---------- input helpers (used by the local decimal input) ----------

/**
 * Clean what the user typed into a decimal box: digits, one dot, optional leading minus,
 * integer part grouped with commas. Trailing dots and zeros are kept so typing "3.05" works.
 * "1234.5" → "1,234.5", "007" → "7", ".5" → "0.5", "3." → "3."
 */
export function sanitizeDecimalInput(raw: string, decimals: number, allowNegative = false): string {
  const negative = allowNegative && /^\s*[-−]/.test(raw);
  const body = raw.replace(/[^\d.]/g, "");
  const [intRaw, ...rest] = body.split(".");
  const hasDot = decimals > 0 && rest.length > 0;
  const frac = rest.join("").slice(0, decimals);
  let int = intRaw.replace(/^0+(?=\d)/, "");
  if (hasDot && int === "") int = "0";
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${negative ? "-" : ""}${grouped}${hasDot ? `.${frac}` : ""}`;
}
