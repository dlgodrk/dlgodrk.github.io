import { describe, expect, it } from "vitest";
import {
  AGRI_TAX_TYPES,
  calcSavings,
  depositInterest,
  interestTax,
  isAgriTax,
  isTaxType,
  isValidSavingsInput,
  MAX_MONTHLY,
  periodLabel,
  rateLabel,
  SAVINGS_PAGE_MONTHLY,
  savingsInterest,
  savingsInterestOfFirst,
  TABLE_PERIODS,
  TABLE_RATES,
  TAX_TYPE_ORDER,
  TAX_TYPES,
} from "./savings";

describe("savingsInterest (단리)", () => {
  it("matches the bank formula 월납입액 × 연이율/12 × n(n+1)/2", () => {
    // 월 50만원, 12개월, 연 4%: 500,000 × 0.04/12 × 78 = 130,000원
    // (은행·포털 적금 계산기의 대표 예시와 같은 값)
    expect(savingsInterest(500_000, 12, 4)).toBe(130_000);
    // 월 50만원, 12개월, 연 3.5%: 500,000 × 0.035/12 × 78 = 113,750원
    expect(savingsInterest(500_000, 12, 3.5)).toBe(113_750);
    // 월 50만원, 24개월, 연 4%: 500,000 × 0.04/12 × 300 = 500,000원
    expect(savingsInterest(500_000, 24, 4)).toBe(500_000);
    // 월 50만원, 36개월, 연 4%: × 666 = 1,110,000원
    expect(savingsInterest(500_000, 36, 4)).toBe(1_110_000);
  });
  it("one month = one month of interest on one installment", () => {
    expect(savingsInterest(1_200_000, 1, 3)).toBe(3_000);
  });
  it("truncates below 1원", () => {
    // 100,000 × 3.3% / 12 × 21 (6개월) = 5,775원
    expect(savingsInterest(100_000, 6, 3.3)).toBe(5_775);
    // 333,333 × 2.7% / 12 × 78 = 58,499.94… → 58,499원
    expect(savingsInterest(333_333, 12, 2.7)).toBe(58_499);
  });
  it("returns 0 for zero rate or invalid inputs", () => {
    expect(savingsInterest(500_000, 12, 0)).toBe(0);
    expect(savingsInterest(0, 12, 4)).toBe(0);
    expect(savingsInterest(500_000, 0, 4)).toBe(0);
    expect(savingsInterest(NaN, 12, 4)).toBe(0);
  });
});

describe("savingsInterest (월복리)", () => {
  it("sums each installment's monthly compounding", () => {
    // Σ_{k=1..12} 500,000 × ((1 + 0.04/12)^k − 1) = 131,602.2… → 131,602원
    expect(savingsInterest(500_000, 12, 4, "monthly")).toBe(131_602);
    // 24개월 513,015.35… / 36개월 1,154,417.11…
    expect(savingsInterest(500_000, 24, 4, "monthly")).toBe(513_015);
    expect(savingsInterest(500_000, 36, 4, "monthly")).toBe(1_154_417);
  });
  it("is always ≥ simple interest and equal for one month", () => {
    expect(savingsInterest(500_000, 1, 4, "monthly")).toBe(savingsInterest(500_000, 1, 4, "simple"));
    for (const n of [6, 12, 24, 36, 60]) {
      expect(savingsInterest(300_000, n, 3.5, "monthly")).toBeGreaterThanOrEqual(savingsInterest(300_000, n, 3.5, "simple"));
    }
  });
});

describe("interestTax", () => {
  it("일반과세: 소득세 14%, 지방소득세 = 소득세의 10%, 각각 10원 미만 절사", () => {
    // 130,000원 → 18,200 + 1,820 = 20,020원
    const t = interestTax(130_000, "general");
    expect(t.lines.map((l) => l.amount)).toEqual([18_200, 1_820]);
    expect(t.total).toBe(20_020);
    // 113,750원 → 15,925 → 15,920 / 1,592 → 1,590 → 17,510원 (단순 15.4%면 17,517.5원)
    const u = interestTax(113_750, "general");
    expect(u.lines.map((l) => l.amount)).toEqual([15_920, 1_590]);
    expect(u.total).toBe(17_510);
  });
  it("세금우대 9.5%: 소득세 9% + 농특세 0.5%", () => {
    const t = interestTax(130_000, "preferential");
    expect(t.lines.map((l) => l.amount)).toEqual([11_700, 650]);
    expect(t.total).toBe(12_350);
    // 113,750 → 10,237.5 → 10,230 / 568.75 → 560
    expect(interestTax(113_750, "preferential").total).toBe(10_790);
  });
  it("조합 예탁금: 농특세 1.4%만", () => {
    expect(interestTax(130_000, "agri").total).toBe(1_820);
    expect(interestTax(113_750, "agri").total).toBe(1_590);
  });
  it("비과세: 0원", () => {
    const t = interestTax(130_000, "exempt");
    expect(t.lines).toEqual([]);
    expect(t.total).toBe(0);
  });
  it("small interest is still taxed (이자소득은 소액부징수 대상이 아님)", () => {
    expect(interestTax(1_000, "general").total).toBe(140 + 10);
    expect(interestTax(50, "general").total).toBe(0);
  });
  it("nominal rates", () => {
    expect(TAX_TYPES.general.rate).toBeCloseTo(0.154, 10);
    expect(TAX_TYPES.preferential.rate).toBeCloseTo(0.095, 10);
    expect(TAX_TYPES.agri.rate).toBeCloseTo(0.014, 10);
    expect(TAX_TYPES.agri2026.rate).toBeCloseTo(0.059, 10);
    expect(TAX_TYPES.agri2027.rate).toBeCloseTo(0.095, 10);
  });
  it("each non-general rate equals the sum of its lines (no 지방소득세 on 감면·분리과세 types)", () => {
    for (const t of TAX_TYPE_ORDER) {
      if (t === "general") continue;
      const lines = TAX_TYPES[t].lines;
      expect(lines.every((l) => l.ofPrevious === undefined && l.label !== "지방소득세")).toBe(true);
      expect(lines.reduce((s, l) => s + l.bp, 0) / 10_000).toBeCloseTo(TAX_TYPES[t].rate, 10);
    }
  });
});

// 조세특례제한법 제89조의3 (2025.12.23 전문개정, 2026.1.1 시행): 세율은 예탁금에 가입한 해로 정해진다.
//  ② 대상자(제88조의5②1호: 농협·수협·산림조합 조합원, 직전 과세기간 총급여 7천만원·종합소득금액 6천만원 이하)는
//     2026~2028년 가입분 비과세 → 농어촌특별세 1.4% (agri)
//  그 밖의 사람: 2026년 가입분 소득세 5%, 2027.1.1 이후 가입분 9%. 지방소득세 없음.
//  농어촌특별세 = 감면받은 이자소득세의 10% (농어촌특별세법 제5조①): (14% − 5%) × 10% = 0.9%, (14% − 9%) × 10% = 0.5%
describe("조합 예탁금 가입 시기별 세율", () => {
  it("2026년 가입 5.9%: 소득세 5% + 농특세 0.9%, 각각 10원 미만 절사", () => {
    const t = interestTax(130_000, "agri2026");
    expect(t.lines.map((l) => [l.label, l.amount])).toEqual([
      ["이자소득세", 6_500],
      ["농어촌특별세", 1_170],
    ]);
    expect(t.total).toBe(7_670);
    // 113,750 → 5,687.5 → 5,680 / 1,023.75 → 1,020
    expect(interestTax(113_750, "agri2026").total).toBe(6_700);
  });
  it("2027년 이후 가입 9.5%는 옛 세금우대와 같은 세율", () => {
    for (const interest of [130_000, 113_750, 58_499, 1_000]) {
      expect(interestTax(interest, "agri2027")).toEqual(interestTax(interest, "preferential"));
    }
  });
  it("월 50만원 · 12개월 · 연 4% · 2026년 가입 조합 예탁금", () => {
    const r = calcSavings({ monthly: 500_000, months: 12, ratePct: 4, taxType: "agri2026" });
    expect(r.interest).toBe(130_000);
    expect(r.tax).toBe(7_670);
    expect(r.afterTaxInterest).toBe(122_330);
    expect(r.maturity).toBe(6_122_330);
    expect(r.agriSplit).toBeNull();
    // 같은 조건 비과세 대상(1.4%)은 1,820원, 일반과세는 20,020원
    expect(calcSavings({ monthly: 500_000, months: 12, ratePct: 4, taxType: "agri" }).tax).toBe(1_820);
    expect(calcSavings({ monthly: 500_000, months: 12, ratePct: 4 }).tax).toBe(20_020);
  });
  it("2026년 가입분도 3천만원까지만: 월 200만원 · 36개월 · 연 4%", () => {
    const r = calcSavings({ monthly: 2_000_000, months: 36, ratePct: 4, taxType: "agri2026" });
    // 1~15회차 이자 2,900,000 → 소득세 145,000 + 농특세 26,100
    // 16~36회차 이자 1,540,000 → 소득세 215,600 + 지방소득세 21,560
    expect(r.agriSplit).toEqual({ cappedInterest: 2_900_000, excessInterest: 1_540_000, excessPrincipal: 42_000_000 });
    expect(r.taxLines.map((l) => [l.label, l.note, l.amount])).toEqual([
      ["이자소득세", "3천만원까지 이자의 5%", 145_000],
      ["농어촌특별세", "3천만원까지 이자의 0.9%", 26_100],
      ["이자소득세", "초과분 이자의 14%", 215_600],
      ["지방소득세", "초과분 소득세의 10%", 21_560],
    ]);
    expect(r.tax).toBe(408_260);
    expect(r.afterTaxInterest).toBe(4_440_000 - 408_260);
  });
  it("2027년 이후 가입분도 3천만원 한도로 나눈다", () => {
    const r = calcSavings({ monthly: 2_000_000, months: 36, ratePct: 4, taxType: "agri2027" });
    // 2,900,000 → 261,000 + 14,500 / 1,540,000 → 215,600 + 21,560
    expect(r.taxLines.map((l) => l.amount)).toEqual([261_000, 14_500, 215_600, 21_560]);
    expect(r.tax).toBe(512_660);
  });
  it("옛 세금우대(preferential)는 조합 한도를 적용하지 않는다", () => {
    const r = calcSavings({ monthly: 2_000_000, months: 36, ratePct: 4, taxType: "preferential" });
    expect(r.agriSplit).toBeNull();
    expect(r.tax).toBe(interestTax(4_440_000, "preferential").total);
  });
  it("orders and guards the tax types (URL ?x= values)", () => {
    expect(AGRI_TAX_TYPES).toEqual(["agri", "agri2026", "agri2027"]);
    for (const t of AGRI_TAX_TYPES) {
      expect(isTaxType(t)).toBe(true);
      expect(isAgriTax(t)).toBe(true);
    }
    for (const t of ["general", "preferential", "exempt"] as const) {
      expect(isTaxType(t)).toBe(true);
      expect(isAgriTax(t)).toBe(false);
    }
    expect(isTaxType("agri2028")).toBe(false);
    expect(isTaxType("")).toBe(false);
    expect(isTaxType("toString")).toBe(false);
  });
});

describe("calcSavings", () => {
  it("월 50만원 · 12개월 · 연 4% · 단리 · 일반과세", () => {
    const r = calcSavings({ monthly: 500_000, months: 12, ratePct: 4 });
    expect(r.principal).toBe(6_000_000);
    expect(r.interest).toBe(130_000);
    expect(r.tax).toBe(20_020);
    expect(r.afterTaxInterest).toBe(109_980);
    expect(r.maturity).toBe(6_109_980);
    // 세후 이자 ÷ 원금 = 1.833%, 1년이라 연환산도 같음
    expect(r.afterTaxReturn).toBeCloseTo(0.01833, 5);
    expect(r.afterTaxAnnualized).toBeCloseTo(0.01833, 5);
    // 원금 600만원을 1년 예금했다면 세전 연 2.1667%와 같은 이자
    expect(r.depositEquivalentRate).toBeCloseTo(0.021667, 5);
  });
  it("월 50만원 · 12개월 · 연 3.5% (기본값)", () => {
    const r = calcSavings({ monthly: 500_000, months: 12, ratePct: 3.5 });
    expect(r.afterTaxInterest).toBe(96_240);
    expect(r.maturity).toBe(6_096_240);
  });
  it("월복리 · 비과세", () => {
    const r = calcSavings({ monthly: 500_000, months: 12, ratePct: 4, interestType: "monthly", taxType: "exempt" });
    expect(r.tax).toBe(0);
    expect(r.maturity).toBe(6_131_602);
  });
  it("annualizes over multi-year terms", () => {
    const r = calcSavings({ monthly: 500_000, months: 36, ratePct: 4 });
    // 1,110,000 → 소득세 155,400 + 지방 15,540 = 170,940 → 세후 939,060
    expect(r.afterTaxInterest).toBe(939_060);
    expect(r.afterTaxAnnualized).toBeCloseTo(939_060 / 18_000_000 / 3, 10);
    expect(r.agriSplit).toBeNull();
  });
});

// 조세특례제한법 제89조의3①: "1명당 3천만원 이하의 예탁금만 해당" (2025.12.23 개정, 2026.1.1 시행)
describe("조합 예탁금 3천만원 한도", () => {
  it("월 200만원 · 36개월 · 연 4%: 1~15회차(3천만원) 이자만 1.4%, 16~36회차는 15.4%", () => {
    const r = calcSavings({ monthly: 2_000_000, months: 36, ratePct: 4, taxType: "agri" });
    expect(r.principal).toBe(72_000_000);
    expect(r.interest).toBe(4_440_000);
    // 1~15회차: 2,000,000 × 0.04/12 × (36 + 35 + … + 22 = 435) = 2,900,000 → 농특세 40,600
    // 16~36회차: 4,440,000 − 2,900,000 = 1,540,000 → 소득세 215,600 + 지방 21,560
    expect(r.agriSplit).toEqual({ cappedInterest: 2_900_000, excessInterest: 1_540_000, excessPrincipal: 42_000_000 });
    expect(r.taxLines.map((l) => [l.label, l.amount])).toEqual([
      ["농어촌특별세", 40_600],
      ["이자소득세", 215_600],
      ["지방소득세", 21_560],
    ]);
    expect(r.tax).toBe(277_760);
    expect(r.afterTaxInterest).toBe(4_440_000 - 277_760);
  });
  it("splits a partial installment at the cap (월 70만원 × 48개월: 42회차 + 43회차 중 60만원)", () => {
    // 한도 안 이자 = 0.04/12 × (700,000 × (48+…+7) + 600,000 × 6) = 0.04/12 × (700,000 × 1,155 + 3,600,000)
    //            = 0.04/12 × 812,100,000 = 2,707,000
    expect(savingsInterestOfFirst(700_000, 48, 4, "simple", 30_000_000)).toBe(2_707_000);
    const r = calcSavings({ monthly: 700_000, months: 48, ratePct: 4, taxType: "agri" });
    // 전체 이자 700,000 × 0.04/12 × 1,176 = 2,744,000 → 초과분 37,000
    expect(r.interest).toBe(2_744_000);
    expect(r.agriSplit?.excessInterest).toBe(37_000);
    // 농특세 37,898 → 37,890 / 소득세 5,180 / 지방 518 → 510
    expect(r.tax).toBe(37_890 + 5_180 + 510);
  });
  it("월복리도 앞 회차부터 나눈다", () => {
    const all = savingsInterest(2_000_000, 36, 4, "monthly");
    const first = savingsInterestOfFirst(2_000_000, 36, 4, "monthly", 30_000_000);
    // 1~15회차는 22~36개월 복리: Σ_{k=22..36} 2,000,000 × ((1 + 0.04/12)^k − 1)
    let expected = 0;
    for (let k = 22; k <= 36; k++) expected += 2_000_000 * (Math.pow(1 + 0.04 / 12, k) - 1);
    expect(first).toBe(Math.floor(expected + 1e-6));
    const r = calcSavings({ monthly: 2_000_000, months: 36, ratePct: 4, interestType: "monthly", taxType: "agri" });
    expect(r.agriSplit?.cappedInterest).toBe(first);
    expect(r.agriSplit?.excessInterest).toBe(all - first);
  });
  it("covers every installment when the whole principal fits", () => {
    expect(savingsInterestOfFirst(500_000, 12, 4, "simple", 30_000_000)).toBe(savingsInterest(500_000, 12, 4));
    expect(savingsInterestOfFirst(500_000, 36, 4, "monthly", 30_000_000)).toBe(savingsInterest(500_000, 36, 4, "monthly"));
  });
  it("3천만원 이하면 전부 1.4%", () => {
    // 월 100만원 × 30개월 = 3,000만원 (한도와 같음)
    const r = calcSavings({ monthly: 1_000_000, months: 30, ratePct: 4, taxType: "agri" });
    expect(r.agriSplit).toBeNull();
    expect(r.taxLines).toHaveLength(1);
    expect(r.tax).toBe(interestTax(r.interest, "agri").total);
  });
  it("other tax types ignore the cap", () => {
    const r = calcSavings({ monthly: 2_000_000, months: 36, ratePct: 4, taxType: "exempt" });
    expect(r.agriSplit).toBeNull();
    expect(r.tax).toBe(0);
  });
});

describe("depositInterest", () => {
  it("lump sum simple interest", () => {
    // 600만원 1년 연 4% = 240,000원
    expect(depositInterest(6_000_000, 12, 4)).toBe(240_000);
    expect(depositInterest(6_000_000, 6, 3.5)).toBe(105_000);
  });
});

describe("validation and labels", () => {
  it("validates inputs", () => {
    expect(isValidSavingsInput(500_000, 12, 3.5)).toBe(true);
    expect(isValidSavingsInput(500_000, 12, 0)).toBe(true);
    expect(isValidSavingsInput(0, 12, 3.5)).toBe(false);
    expect(isValidSavingsInput(500_000, 0, 3.5)).toBe(false);
    expect(isValidSavingsInput(500_000, 12.5, 3.5)).toBe(false);
    expect(isValidSavingsInput(500_000, 121, 3.5)).toBe(false);
    expect(isValidSavingsInput(500_000, 12, NaN)).toBe(false);
    // 월 납입액은 입력칸과 같은 10억원 상한 (?m=1e15 같은 URL 차단)
    expect(isValidSavingsInput(MAX_MONTHLY, 120, 30)).toBe(true);
    expect(isValidSavingsInput(MAX_MONTHLY + 1, 12, 3.5)).toBe(false);
    expect(isValidSavingsInput(1e15, 12, 3.5)).toBe(false);
  });
  it("labels", () => {
    expect(periodLabel(12)).toBe("1년");
    expect(periodLabel(36)).toBe("3년");
    expect(periodLabel(6)).toBe("6개월");
    expect(rateLabel(3)).toBe("3.0%");
    expect(rateLabel(3.5)).toBe("3.5%");
  });
  it("page and table lists are sorted and unique", () => {
    for (const list of [SAVINGS_PAGE_MONTHLY, TABLE_RATES, TABLE_PERIODS]) {
      expect([...list].sort((a, b) => a - b)).toEqual(list);
      expect(new Set(list).size).toBe(list.length);
    }
    expect(SAVINGS_PAGE_MONTHLY).toEqual([10, 20, 30, 50, 100, 200]);
  });
});
