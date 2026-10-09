/**
 * 근로소득 간이세액표 (소득세법 시행령 [별표 2], 개정 2026.2.27, 2026-03-01 지급분부터).
 *
 * The table is generated from the construction method the government uses. This generator
 * reproduces all 7,117 official cells (647 salary rows × 11 family columns) exactly — see
 * withholding.test.ts, which checks every cell against the table parsed from the law.go.kr PDF.
 *
 * NOTE: the table intentionally embeds frozen parameters (국민연금 4.5% with a 4,490,000원 cap,
 * an older 근로소득세액공제 schedule). They are NOT 2026 law for 연말정산 and must not be "updated".
 *
 * All arithmetic is exact: amounts are scaled to integers so cells that land exactly on
 * a 10원 multiple never drift because of floating point.
 */

/** Monthly salary bracket (천원, 이상~미만) used by the table for a monthly taxable pay in 원. */
export function bracketOf(monthlyPay: number): { lo: number; hi: number; mid: number } | null {
  const k = Math.floor(monthlyPay / 1000);
  if (k < 770 || k >= 10_000) return null;
  const [start, width] = k < 1500 ? [770, 5] : k < 3000 ? [1500, 10] : [3000, 20];
  const lo = start + Math.floor((k - start) / width) * width;
  return { lo, hi: lo + width, mid: (lo * 1000 + (lo + width) * 1000) / 2 };
}

// Scale: 1 unit = 1/10,000,000 원 (1e-7). Max magnitude ≈ 1.2e8 원 × 1e7 = 1.2e15 < 2^53.
const U = 10_000_000;

/** 근로소득공제 in units. */
function earnedDeductionU(G: number): number {
  let d: number;
  if (G <= 5_000_000) d = G * 0.7 * U;
  else if (G <= 15_000_000) d = (3_500_000 + (G - 5_000_000) * 0.4) * U;
  else if (G <= 45_000_000) d = (7_500_000 + (G - 15_000_000) * 0.15) * U;
  else if (G <= 100_000_000) d = (12_000_000 + (G - 45_000_000) * 0.05) * U;
  else d = (14_750_000 + (G - 100_000_000) * 0.02) * U;
  return Math.min(Math.round(d), 20_000_000 * U);
}

/** 특별소득공제 등 (별표2 주1) in units. */
function specialDeductionU(G: number, n: number): number {
  const [a, r0, r1, r2, r3] = n === 1 ? [3_100_000, 4, 4, 1.5, 0.5] : n === 2 ? [3_600_000, 4, 4, 2, 1] : [5_000_000, 7, 7, 5, 3];
  let s: number; // in 원 × 1000 to keep integer (rates have at most 1 decimal of percent)
  if (G <= 30_000_000) s = a * 1000 + G * r0 * 10;
  else if (G <= 45_000_000) s = a * 1000 + G * r1 * 10 - (G - 30_000_000) * 50;
  else if (G <= 70_000_000) s = a * 1000 + G * r2 * 10;
  else s = a * 1000 + G * r3 * 10;
  if (n >= 3 && G > 40_000_000) s += (G - 40_000_000) * 40;
  return Math.round(s) * (U / 1000);
}

/** 기본세율 (2023~) applied to taxable base in units → tax in units. */
function basicTaxU(TU: number): number {
  const B = [
    [14_000_000, 0, 6],
    [50_000_000, 840_000, 15],
    [88_000_000, 6_240_000, 24],
    [150_000_000, 15_360_000, 35],
    [300_000_000, 37_060_000, 38],
    [500_000_000, 94_060_000, 40],
    [1_000_000_000, 174_060_000, 42],
    [Infinity, 384_060_000, 45],
  ] as const;
  let prev = 0;
  for (const [upper, base, rate] of B) {
    if (TU <= upper * U) return base * U + ((TU - prev * U) * rate) / 100;
    prev = upper;
  }
  return 0;
}

/** One table cell: 해당란 세액 (before 자녀 공제) for bracket midpoint M (원) and family n (1–11). */
export function tableCell(M: number, n: number): number {
  const G = 12 * M;
  const pensionBase = Math.min(Math.max(Math.floor(M / 1000) * 1000, 290_000), 4_490_000);
  const pensionYear = Math.floor((pensionBase * 45) / 10_000) * 10 * 12; // floor10(base × 4.5%) × 12
  const TU = Math.max(
    G * U - earnedDeductionU(G) - 1_500_000 * n * U - pensionYear * U - specialDeductionU(G, n),
    0,
  );
  const CU = basicTaxU(TU);
  const creditU = CU <= 500_000 * U ? (CU * 55) / 100 : 275_000 * U + ((CU - 500_000 * U) * 30) / 100;
  const limitWon =
    G <= 55_000_000
      ? 660_000
      : G <= 70_000_000
        ? Math.max(630_000, 660_000 - (G - 55_000_000) / 2)
        : Math.max(500_000, 630_000 - (G - 70_000_000) / 2);
  const DU = Math.max(CU - Math.min(creditU, limitWon * U), 0);
  // floor10(D / 12) with a tiny tolerance for the (already exact) scaled arithmetic
  const monthly = Math.floor(DU / (12 * U * 10) + 1e-6) * 10;
  return monthly < 1000 ? 0 : monthly;
}

/** Monthly amounts of the 10,000천원 row (월급여 1,000만원) for families 1–11. */
export const ROW_10M = [1_507_400, 1_431_570, 1_200_840, 1_170_840, 1_140_840, 1_110_840, 1_080_840, 1_050_840, 1_020_840, 990_840, 960_840];

/** 해당란 세액 for any monthly taxable pay W (원) and family count n (≥1, includes self). */
export function tableAmount(W: number, n: number): number {
  const fam = Math.max(1, Math.floor(n));
  if (fam > 11) {
    const t11 = tableAmount(W, 11);
    const t10 = tableAmount(W, 10);
    return Math.max(0, t11 - (t10 - t11) * (fam - 11));
  }
  const pay = Math.floor(W);
  if (pay < 770_000) return 0;
  if (pay < 10_000_000) {
    const b = bracketOf(pay)!;
    return tableCell(b.mid, fam);
  }
  const T10 = ROW_10M[fam - 1];
  if (pay === 10_000_000) return T10;
  // Formulas for 월급여 1,000만원 초과 (별표2 끝부분). Scaled by 10,000 to stay integer.
  let add10k: number;
  if (pay <= 14_000_000) add10k = (pay - 10_000_000) * 98 * 35 + 25_000 * 10_000;
  else if (pay <= 28_000_000) add10k = 1_397_000 * 10_000 + (pay - 14_000_000) * 98 * 38;
  else if (pay <= 30_000_000) add10k = 6_610_600 * 10_000 + (pay - 28_000_000) * 98 * 40;
  else if (pay <= 45_000_000) add10k = 7_394_600 * 10_000 + (pay - 30_000_000) * 4000;
  else if (pay <= 87_000_000) add10k = 13_394_600 * 10_000 + (pay - 45_000_000) * 4200;
  else add10k = 31_034_600 * 10_000 + (pay - 87_000_000) * 4500;
  return Math.floor((T10 * 10_000 + add10k) / 100_000) * 10;
}

/**
 * 8세 이상 20세 이하 자녀 세액 공제 (월).
 * The new amounts apply to withholding performed on/after 2026-03-01 (부칙 대통령령 제36129호 제15조),
 * so `payMonth` here means the month the pay is actually paid (withheld).
 */
export function childDeduction(children: number, payMonth = "2026-03"): number {
  const k = Math.max(0, Math.floor(children));
  if (k === 0) return 0;
  const [one, two, extra] = payMonth < "2026-03" ? [12_500, 29_160, 25_000] : [20_830, 45_830, 33_330];
  if (k === 1) return one;
  return two + (k - 2) * extra;
}

export type WithholdingRatio = 80 | 100 | 120;

export type Withholding = { incomeTax: number; localTax: number; total: number; tableAmount: number };

/**
 * Monthly withholding (소득세 + 지방소득세) under the 간이세액표.
 * @param monthlyTaxable 월급여액 (비과세 제외), 원
 * @param family 공제대상가족 수 (본인 포함, 8~20세 자녀 포함)
 * @param children 공제대상가족 중 8세 이상 20세 이하 자녀 수
 * @param ratio 원천징수 비율 80/100/120 (%)
 */
export function monthlyWithholding(
  monthlyTaxable: number,
  family: number,
  children = 0,
  ratio: WithholdingRatio = 100,
  payMonth = "2026-10",
): Withholding {
  const fam = Math.max(1, Math.floor(family));
  const kids = Math.min(Math.max(0, Math.floor(children)), Math.max(0, fam - 1));
  const base = tableAmount(monthlyTaxable, fam);
  const afterChild = Math.max(base - childDeduction(kids, payMonth), 0);
  let incomeTax = Math.floor((afterChild * ratio) / 1000) * 10; // floor10(x × ratio%)
  if (incomeTax < 1000) incomeTax = 0; // 소득세법 §86 소액부징수
  const localTax = Math.floor(incomeTax / 100) * 10; // floor10(소득세 × 10%)
  return { incomeTax, localTax, total: incomeTax + localTax, tableAmount: base };
}
