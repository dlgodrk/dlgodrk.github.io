import { describe, expect, it } from "vitest";
import {
  CARD_CREDIT_ANNUAL_LIMIT,
  generalVatComparison,
  getSimplifiedIndustry,
  SIMPLIFIED_INDUSTRIES,
  simplifiedStatus,
  simplifiedThreshold,
  simplifiedVat,
  splitFromSupply,
  splitFromTotal,
  splitFromVat,
  supplyRangeForVat,
  totalSplitAlternative,
} from "./vat";

describe("splitFromSupply (공급가액 → 부가세)", () => {
  it("adds 10% (부가가치세법 제30조)", () => {
    expect(splitFromSupply(1_000_000)).toEqual({ supply: 1_000_000, vat: 100_000, total: 1_100_000 });
    expect(splitFromSupply(50_000)).toEqual({ supply: 50_000, vat: 5_000, total: 55_000 });
  });
  it("truncates 원 미만 by default and can round", () => {
    // 12,345 × 10% = 1,234.5
    expect(splitFromSupply(12_345).vat).toBe(1_234);
    expect(splitFromSupply(12_345, "round").vat).toBe(1_235);
    expect(splitFromSupply(12_344, "round").vat).toBe(1_234);
    expect(splitFromSupply(909).vat).toBe(90);
    expect(splitFromSupply(909, "round").vat).toBe(91);
  });
  it("has no floating-point drift on round numbers", () => {
    for (const s of [70, 1_230, 9_990, 123_456_780, 9_999_999_990]) {
      expect(splitFromSupply(s).vat).toBe(s / 10);
    }
  });
  it("ignores fractions in the input", () => {
    expect(splitFromSupply(1000.9)).toEqual({ supply: 1000, vat: 100, total: 1100 });
  });
});

describe("splitFromTotal (합계 → 공급가액)", () => {
  it("splits exact multiples of 11", () => {
    expect(splitFromTotal(55_000)).toEqual({ supply: 50_000, vat: 5_000, total: 55_000 });
    expect(splitFromTotal(1_100_000)).toEqual({ supply: 1_000_000, vat: 100_000, total: 1_100_000 });
  });
  it("matches the common receipt split: 1,000원 → 909원 + 91원", () => {
    // 편의점·카드 영수증 표기: 과세물품가액 909, 부가세 91
    expect(splitFromTotal(1_000)).toEqual({ supply: 909, vat: 91, total: 1_000 });
    expect(splitFromTotal(10_000)).toEqual({ supply: 9_091, vat: 909, total: 10_000 });
  });
  it("floor variant: 부가세 = 합계 ÷ 11 절사", () => {
    expect(splitFromTotal(1_000, "floor")).toEqual({ supply: 910, vat: 90, total: 1_000 });
    expect(splitFromTotal(10_000, "floor")).toEqual({ supply: 9_091, vat: 909, total: 10_000 });
  });
  it("the two methods differ by at most 1원, only when 합계 mod 11 ≥ 6", () => {
    const bad: number[] = [];
    for (let t = 1; t <= 20_000; t++) {
      const a = splitFromTotal(t);
      const b = splitFromTotal(t, "floor");
      const ok = a.supply + a.vat === t && b.supply + b.vat === t && a.vat - b.vat === (t % 11 >= 6 ? 1 : 0);
      if (!ok) bad.push(t);
    }
    expect(bad).toEqual([]);
  });
  it("supplyFloor variant: 공급가액(과세표준) 원 미만 절사 (국고금 관리법 제47조 제2항)", () => {
    // 10,000 × 100/110 = 9,090.909… → 9,090, 부가세 910
    expect(splitFromTotal(10_000, "supplyFloor")).toEqual({ supply: 9_090, vat: 910, total: 10_000 });
    // 1,000 × 100/110 = 909.09… → 909 (반올림과 같음)
    expect(splitFromTotal(1_000, "supplyFloor")).toEqual({ supply: 909, vat: 91, total: 1_000 });
  });
  it("of the three methods, round always equals one of the others; the odd one is off by 1원", () => {
    const bad: number[] = [];
    for (let t = 1; t <= 20_000; t++) {
      const r = t % 11;
      const a = splitFromTotal(t);
      const f = splitFromTotal(t, "floor");
      const sf = splitFromTotal(t, "supplyFloor");
      const sums = a.supply + a.vat === t && f.supply + f.vat === t && sf.supply + sf.vat === t;
      const pattern =
        r === 0
          ? a.vat === f.vat && a.vat === sf.vat
          : r <= 5
            ? a.vat === f.vat && sf.vat - a.vat === 1
            : a.vat === sf.vat && a.vat - f.vat === 1;
      const alt = totalSplitAlternative(t);
      const altOk =
        r === 0 ? alt === null : alt !== null && alt.method === (r <= 5 ? "supplyFloor" : "floor") && alt.split.vat !== a.vat;
      if (!sums || !pattern || !altOk) bad.push(t);
    }
    expect(bad).toEqual([]);
  });
  it("totalSplitAlternative picks the differing method", () => {
    expect(totalSplitAlternative(10_000)).toEqual({ method: "supplyFloor", split: { supply: 9_090, vat: 910, total: 10_000 } });
    expect(totalSplitAlternative(1_000)).toEqual({ method: "floor", split: { supply: 910, vat: 90, total: 1_000 } });
    expect(totalSplitAlternative(55_000)).toBeNull();
  });
  it("round-trips through 공급가액 when 합계 came from a whole 공급가액 with 10원 단위", () => {
    for (const s of [10, 1_230, 45_670, 1_000_000, 33_333_330]) {
      const fwd = splitFromSupply(s);
      expect(splitFromTotal(fwd.total)).toEqual(fwd);
      expect(splitFromTotal(fwd.total, "floor")).toEqual(fwd);
      expect(splitFromTotal(fwd.total, "supplyFloor")).toEqual(fwd);
    }
  });
});

describe("splitFromVat (부가세 → 공급가액)", () => {
  it("multiplies by 10 and 11", () => {
    expect(splitFromVat(100_000)).toEqual({ supply: 1_000_000, vat: 100_000, total: 1_100_000 });
    expect(splitFromVat(1_234)).toEqual({ supply: 12_340, vat: 1_234, total: 13_574 });
  });
  it("gives the 공급가액 range consistent with 절사", () => {
    expect(supplyRangeForVat(1_234)).toEqual({ min: 12_340, max: 12_349 });
    const r = supplyRangeForVat(1_234);
    expect(splitFromSupply(r.min).vat).toBe(1_234);
    expect(splitFromSupply(r.max).vat).toBe(1_234);
    expect(splitFromSupply(r.max + 1).vat).toBe(1_235);
  });
});

describe("간이과세자 업종별 부가가치율 (시행령 제111조 제2항)", () => {
  it("lists the groups with current rates", () => {
    expect(SIMPLIFIED_INDUSTRIES.map((i) => i.ratePct)).toEqual([15, 20, 25, 30, 30, 40, 40]);
    expect(getSimplifiedIndustry("retail").full).toContain("음식점업");
    expect(getSimplifiedIndustry("lodging").ratePct).toBe(25);
    expect(getSimplifiedIndustry("unknown").id).toBe("retail");
    expect(new Set(SIMPLIFIED_INDUSTRIES.map((i) => i.id)).size).toBe(SIMPLIFIED_INDUSTRIES.length);
  });
  it("keeps 부동산임대업 separate because its 간이과세 기준 is 4,800만원 (법 제61조 제1항 제3호)", () => {
    const rent = getSimplifiedIndustry("rent");
    expect(rent.ratePct).toBe(40);
    expect(rent.rentalThreshold).toBe(true);
    expect(getSimplifiedIndustry("pro").full).not.toContain("부동산임대업");
    expect(SIMPLIFIED_INDUSTRIES.filter((i) => i.rentalThreshold).map((i) => i.id)).toEqual(["rent"]);
  });
});

describe("simplifiedVat (간이과세자 납부세액)", () => {
  it("공급대가 × 부가가치율 × 10%", () => {
    // 음식점 연 매출 6,000만원: 6,000만 × 15% × 10% = 90만원
    const r = simplifiedVat({ sales: 60_000_000, ratePct: 15 });
    expect(r.grossTax).toBe(900_000);
    expect(r.payable).toBe(900_000);
    expect(r.effectiveRate).toBeCloseTo(0.015, 10);
    // 3억 음식점 예시(블로그 계산 예시와 동일): 450만원 — 간이 기준을 넘지만 산식 검증용
    expect(simplifiedVat({ sales: 300_000_000, ratePct: 15 }).grossTax).toBe(4_500_000);
    // 서비스업 1억원: 1억 × 30% × 10% = 300만원
    expect(simplifiedVat({ sales: 100_000_000, ratePct: 30 }).grossTax).toBe(3_000_000);
  });
  it("deducts 0.5% of purchases and 1.3% of card sales", () => {
    const r = simplifiedVat({ sales: 80_000_000, ratePct: 15, purchases: 30_000_000, cardSales: 50_000_000 });
    expect(r.grossTax).toBe(1_200_000);
    expect(r.purchaseCredit).toBe(150_000);
    expect(r.cardCredit).toBe(650_000);
    expect(r.appliedCredit).toBe(800_000);
    expect(r.payable).toBe(400_000);
  });
  it("caps credits at the tax (no refund for 간이과세자, 법 제63조 제6항)", () => {
    const r = simplifiedVat({ sales: 60_000_000, ratePct: 15, purchases: 50_000_000, cardSales: 60_000_000 });
    // 90만 − (25만 + 78만) → 0원, 초과분 소멸
    expect(r.appliedCredit).toBe(900_000);
    expect(r.payable).toBe(0);
  });
  it("caps the card credit at 1,000만원 a year", () => {
    const r = simplifiedVat({ sales: 2_000_000_000, ratePct: 40, cardSales: 1_000_000_000 });
    expect(r.cardCredit).toBe(CARD_CREDIT_ANNUAL_LIMIT);
  });
  it("never counts more card sales than total sales", () => {
    const r = simplifiedVat({ sales: 50_000_000, ratePct: 15, cardSales: 90_000_000 });
    expect(r.cardCredit).toBe(650_000);
  });
  it("exempts payment under 4,800만원 (법 제69조)", () => {
    const below = simplifiedVat({ sales: 47_999_999, ratePct: 30 });
    expect(below.exempt).toBe(true);
    expect(below.grossTax).toBe(1_439_999);
    expect(below.payable).toBe(0);
    const at = simplifiedVat({ sales: 48_000_000, ratePct: 30 });
    expect(at.exempt).toBe(false);
    expect(at.payable).toBe(1_440_000);
  });
});

describe("simplifiedStatus", () => {
  it("uses 1억 400만원 and 4,800만원", () => {
    expect(simplifiedStatus(30_000_000)).toBe("exempt");
    expect(simplifiedStatus(48_000_000)).toBe("simplified");
    expect(simplifiedStatus(103_999_999)).toBe("simplified");
    expect(simplifiedStatus(104_000_000)).toBe("general");
    // 부동산임대업·과세유흥장소는 4,800만원 기준
    expect(simplifiedStatus(50_000_000, true)).toBe("general");
  });
  it("applies 4,800만원 to 부동산임대업 (i=rent, s=6,000만원 → 일반과세)", () => {
    const rental = Boolean(getSimplifiedIndustry("rent").rentalThreshold);
    expect(simplifiedThreshold(rental)).toBe(48_000_000);
    expect(simplifiedStatus(60_000_000, rental)).toBe("general");
    expect(simplifiedStatus(48_000_000, rental)).toBe("general");
    expect(simplifiedStatus(47_999_999, rental)).toBe("exempt");
    // 같은 매출이라도 다른 40% 업종은 간이과세 유지
    expect(simplifiedStatus(60_000_000, Boolean(getSimplifiedIndustry("pro").rentalThreshold))).toBe("simplified");
    expect(simplifiedThreshold()).toBe(104_000_000);
  });
});

describe("generalVatComparison", () => {
  it("output tax − input tax − card credit", () => {
    const r = generalVatComparison({ sales: 80_000_000, purchases: 30_000_000, cardSales: 50_000_000 });
    expect(r.outputTax).toBe(7_272_727);
    expect(r.inputTax).toBe(2_727_273);
    expect(r.cardCredit).toBe(650_000);
    expect(r.payable).toBe(7_272_727 - 2_727_273 - 650_000);
  });
  it("allows a refund but never lets the card credit create one", () => {
    const r = generalVatComparison({ sales: 11_000_000, purchases: 22_000_000, cardSales: 11_000_000 });
    expect(r.cardCredit).toBe(0);
    expect(r.payable).toBe(-1_000_000);
  });
  it("gives no card credit when 공급가액 is over 10억원 (시행령 제88조 제3항)", () => {
    // 합계 11억 → 공급가액 10억: 공제 가능
    expect(generalVatComparison({ sales: 1_100_000_000, cardSales: 100_000_000 }).cardCredit).toBe(1_300_000);
    // 합계 11억 11원 → 공급가액 1,000,000,010원: 공제 없음
    const over = generalVatComparison({ sales: 1_100_000_011, cardSales: 100_000_000 });
    expect(over.cardCredit).toBe(0);
    expect(over.payable).toBe(over.outputTax);
  });
});
