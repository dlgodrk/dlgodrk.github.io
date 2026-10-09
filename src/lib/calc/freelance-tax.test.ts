import { describe, expect, it } from "vitest";
import {
  bizWithholding,
  compareKinds,
  DAILY_EXEMPT_MAX_WAGE,
  DAILY_NTS_EXAMPLE_WAGE,
  dailyWithholding,
  FREELANCE_PAGE_MANWON,
  grossForNet,
  OTHER_THRESHOLD_PAYMENT,
  otherIncomeAmount,
  otherWithholding,
  PROPOSED_BIZ_RATE_PERCENT_2027,
  withholding,
} from "./freelance-tax";

const pick = (r: ReturnType<typeof bizWithholding>) => ({
  incomeTax: r.incomeTax,
  localTax: r.localTax,
  total: r.total,
  net: r.net,
});

describe("bizWithholding (사업소득 3.3%)", () => {
  it("withholds 3% + 10% of it, each 10원 미만 절사", () => {
    // 100만원 → 30,000 + 3,000 = 33,000, 실수령 967,000
    // (taxwatch.co.kr/article/tax/2026/08/03/0005: 배달라이더 100만원 → "세금 3만3000원을 빼고 96만7000원")
    expect(pick(bizWithholding(1_000_000))).toEqual({ incomeTax: 30_000, localTax: 3_000, total: 33_000, net: 967_000 });
    // 2026 최저임금 월 환산액 2,156,880 → 64,706.4 → 64,700; 6,470 (same vector as hourly-wage.test.ts)
    expect(pick(bizWithholding(2_156_880))).toEqual({ incomeTax: 64_700, localTax: 6_470, total: 71_170, net: 2_085_710 });
    // 3,333,333 × 3% = 99,999.99 → 99,990; 9,999 → 9,990
    expect(pick(bizWithholding(3_333_333))).toEqual({ incomeTax: 99_990, localTax: 9_990, total: 109_980, net: 3_223_353 });
  });
  it("does not waive tax under 1,000원 (소득세법 제86조1호, 2024-07-01 지급분부터 인적용역 사업소득 제외)", () => {
    const r = bizWithholding(30_000);
    expect(pick(r)).toEqual({ incomeTax: 900, localTax: 90, total: 990, net: 29_010 });
    expect(r.exempt).toBeNull();
    // Below 334원 the 3% rounds down to 0 by 10원 절사 alone.
    expect(bizWithholding(333).total).toBe(0);
    expect(pick(bizWithholding(334))).toEqual({ incomeTax: 10, localTax: 0, total: 10, net: 324 });
  });
  it("applies the 2027 proposal rate (2% + 0.2%) when asked", () => {
    // 100만원 → 20,000 + 2,000 → 978,000 under 2.2% (direct arithmetic; no source quotes this figure).
    // The proposal itself: taxwatch.co.kr/article/tax/2026/08/03/0005 (재정경제부 2026-08-03 세제개편안,
    // 3% → 2%, 2027-01-01 이후 지급분부터; 보험모집인·방문판매원·음료품배달원·외국인 프로선수는 3% 유지).
    expect(pick(bizWithholding(1_000_000, PROPOSED_BIZ_RATE_PERCENT_2027))).toEqual({
      incomeTax: 20_000,
      localTax: 2_000,
      total: 22_000,
      net: 978_000,
    });
  });
  it("reports the effective rate and handles empty input", () => {
    expect(bizWithholding(1_000_000).effectiveRate).toBeCloseTo(0.033, 10);
    expect(bizWithholding(NaN)).toMatchObject({ gross: 0, total: 0, net: 0, effectiveRate: 0 });
    expect(bizWithholding(-5).gross).toBe(0);
    expect(bizWithholding(1_000.9).gross).toBe(1_000);
  });
});

describe("otherWithholding (기타소득 8.8%)", () => {
  it("taxes 40% (필요경비 60%) at 20% + 지방소득세", () => {
    // 강연료 100만원: 필요경비 60만, 기타소득금액 40만, 소득세 8만, 지방 8천 → 912,000
    const r = otherWithholding(1_000_000);
    expect(r.taxBase).toBe(400_000);
    expect(pick(r)).toEqual({ incomeTax: 80_000, localTax: 8_000, total: 88_000, net: 912_000 });
    expect(pick(otherWithholding(300_000))).toEqual({ incomeTax: 24_000, localTax: 2_400, total: 26_400, net: 273_600 });
    expect(pick(otherWithholding(500_000))).toEqual({ incomeTax: 40_000, localTax: 4_000, total: 44_000, net: 456_000 });
  });
  it("applies 과세최저한: 기타소득금액 건별 5만원 이하 (지급액 125,000원 이하) → 0원 (제84조)", () => {
    const at = otherWithholding(OTHER_THRESHOLD_PAYMENT);
    expect(at.taxBase).toBe(50_000);
    expect(at.computedIncomeTax).toBe(10_000);
    expect(at).toMatchObject({ incomeTax: 0, localTax: 0, total: 0, net: 125_000, exempt: "threshold" });
    expect(otherWithholding(100_000)).toMatchObject({ total: 0, exempt: "threshold" });
    // 125,001: 기타소득금액 50,000.4 > 5만 → taxed; 10,000.08 → 10,000
    expect(otherWithholding(125_001)).toMatchObject({ incomeTax: 10_000, localTax: 1_000, net: 114_001, exempt: null });
    expect(otherWithholding(0).exempt).toBeNull();
  });
  it("floors the 기타소득금액 to the won", () => {
    expect(otherIncomeAmount(333_333)).toBe(133_333);
    // 333,333 × 8% = 26,666.64 → 26,660; 2,666 → 2,660
    expect(pick(otherWithholding(333_333))).toEqual({ incomeTax: 26_660, localTax: 2_660, total: 29_320, net: 304_013 });
  });
});

describe("dailyWithholding (일용근로소득)", () => {
  it("deducts 15만원/일, then 6% less the 55% credit (= 2.7%)", () => {
    // 일당 200,000: 50,000 × 6% = 3,000 − 1,650 = 1,350; 지방 135 → 130 (10원 절사)
    expect(pick(dailyWithholding(200_000))).toEqual({ incomeTax: 1_350, localTax: 130, total: 1_480, net: 198_520 });
    // 일당 250,000 → 2,700 + 270 (glasswallet 일용직 세금 가이드)
    expect(pick(dailyWithholding(250_000))).toEqual({ incomeTax: 2_700, localTax: 270, total: 2_970, net: 247_030 });
    expect(pick(dailyWithholding(300_000))).toEqual({ incomeTax: 4_050, localTax: 400, total: 4_450, net: 295_550 });
  });
  it("is 0원 up to the 15만원 deduction", () => {
    expect(dailyWithholding(150_000)).toMatchObject({ taxBase: 0, total: 0, net: 150_000, exempt: null });
    expect(dailyWithholding(100_000).total).toBe(0);
  });
  it("waives 소득세 under 1,000원 (소액부징수) and then the 지방소득세 too", () => {
    // NTS example "일 급여액 187,000원: 999원" (원천징수세액 1천원 미만): 37,000 × 2.7% = 999 → 990 < 1,000 → 0
    expect(DAILY_NTS_EXAMPLE_WAGE).toBe(187_000);
    expect(dailyWithholding(DAILY_NTS_EXAMPLE_WAGE)).toMatchObject({ computedIncomeTax: 990, incomeTax: 0, localTax: 0, exempt: "small" });
    // Unrounded-math boundary only (pages say "약 18만 7천원"; per-won rounding of 산출세액·공제 gives 187,016).
    expect(dailyWithholding(DAILY_EXEMPT_MAX_WAGE)).toMatchObject({ incomeTax: 0, exempt: "small" });
    expect(dailyWithholding(DAILY_EXEMPT_MAX_WAGE + 1)).toMatchObject({ incomeTax: 1_000, localTax: 100, exempt: null });
  });
  it("judges 소액부징수 on the whole payment when several days are paid at once", () => {
    // 16만원 × 4일: 270원 × 4 = 1,080원 ≥ 1,000 → 징수 (one day alone would be waived)
    expect(dailyWithholding(160_000).incomeTax).toBe(0);
    expect(dailyWithholding(160_000, 4)).toMatchObject({ gross: 640_000, taxBase: 40_000, incomeTax: 1_080, localTax: 100 });
    // 187,000 × 2일: 999 × 2 = 1,998 → 1,990
    expect(dailyWithholding(187_000, 2)).toMatchObject({ incomeTax: 1_990, localTax: 190, net: 371_820 });
    expect(dailyWithholding(200_000, 0).gross).toBe(200_000); // days < 1 → 1
  });
});

describe("withholding dispatcher", () => {
  it("routes by kind", () => {
    expect(withholding("biz", 1_000_000).net).toBe(967_000);
    expect(withholding("other", 1_000_000).net).toBe(912_000);
    expect(withholding("daily", 200_000, 5).gross).toBe(1_000_000);
  });
});

describe("grossForNet (실수령 → 세전 역산)", () => {
  it("finds the 지급액 for a 3.3% 실수령액", () => {
    expect(grossForNet("biz", 1_000_000)).toMatchObject({ gross: 1_034_120, exact: true });
    expect(bizWithholding(1_034_120).net).toBe(1_000_000);
  });
  it("returns the round amount when two 지급액 give the same 실수령액", () => {
    // 999,980 and 1,000,000 both net 967,000 (10원 절사 steps); the larger one is returned.
    expect(bizWithholding(999_980).net).toBe(967_000);
    expect(grossForNet("biz", 967_000).gross).toBe(1_000_000);
    expect(grossForNet("other", 912_000).gross).toBe(1_000_000);
    expect(grossForNet("biz", 978_000, PROPOSED_BIZ_RATE_PERCENT_2027).gross).toBe(1_000_000);
  });
  it("round-trips every landing-page amount", () => {
    for (const m of FREELANCE_PAGE_MANWON) {
      const g = m * 10_000;
      expect(grossForNet("biz", bizWithholding(g).net).gross).toBe(g);
      expect(grossForNet("other", otherWithholding(g).net).gross).toBe(g);
    }
  });
  it("keeps 기타소득 at or under 125,000원 untaxed", () => {
    expect(grossForNet("other", 120_000)).toMatchObject({ gross: 120_000, exact: true });
    expect(grossForNet("other", 125_000).gross).toBe(125_000);
    const above = grossForNet("other", 125_001);
    expect(above.exact).toBe(true);
    expect(above.gross).toBeGreaterThan(125_000);
    expect(above.result.net).toBe(125_001);
  });
  it("finds an exact 지급액 for every whole-won 실수령액 (sampled)", () => {
    for (let i = 0; i < 3_000; i++) {
      // deterministic spread from 1원 to ~10억원
      const target = Math.floor(((i * 7_919) % 3_000) ** 2 * 111.1) + i;
      for (const kind of ["biz", "other"] as const) {
        const s = grossForNet(kind, target);
        expect(s.exact).toBe(true);
        expect(s.result.net).toBe(target);
        // no larger 지급액 within the step range gives the same 실수령액
        for (let g = s.gross + 1; g <= s.gross + 30; g++) {
          if (kind === "other" && target <= OTHER_THRESHOLD_PAYMENT) break;
          expect(withholding(kind, g).net === target).toBe(false);
        }
      }
    }
  });
  it("handles 0 and junk", () => {
    expect(grossForNet("biz", 0)).toMatchObject({ gross: 0, exact: true });
    expect(grossForNet("biz", NaN).gross).toBe(0);
  });
});

describe("pages", () => {
  it("page list is sorted and unique", () => {
    expect([...FREELANCE_PAGE_MANWON].sort((a, b) => a - b)).toEqual(FREELANCE_PAGE_MANWON);
    expect(new Set(FREELANCE_PAGE_MANWON).size).toBe(FREELANCE_PAGE_MANWON.length);
  });
  it("compareKinds gives the three columns", () => {
    const c = compareKinds(100_000);
    expect(c.biz.net).toBe(96_700);
    expect(c.biz2027.net).toBe(97_800);
    expect(c.other).toMatchObject({ net: 100_000, exempt: "threshold" });
  });
});
