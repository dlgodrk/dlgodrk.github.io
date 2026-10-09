import { describe, expect, it } from "vitest";
import {
  approxWon,
  axisLabel,
  calcCompound,
  COMPOUNDING_ORDER,
  doublingYears,
  effectiveAnnualRate,
  findScenario,
  futureValue,
  gainTax,
  isValidCompoundInput,
  MAX_BALANCE,
  MAX_MONTHLY,
  MAX_PRINCIPAL,
  MAX_RATE,
  MAX_YEARS,
  niceStep,
  realValue,
  rule72Years,
  scenarioSlug,
  SCENARIOS,
  scenariosForLump,
  scenariosForMonthly,
  simpleValue,
  TABLE_RATES,
  TABLE_YEARS,
  type Timing,
} from "./compound-interest";
import { SAVINGS_PAGE_MONTHLY } from "./savings";
import { DEPOSIT_PAGE_MANWON } from "./deposit";

describe("compound-interest: lump sum (거치식)", () => {
  // Textbook compound-interest factors: (1.05)^10 = 1.628894627, (1 + 0.05/12)^120 = 1.647009498,
  // (1 + 0.05/4)^40 = 1.643619463 (e.g. any FV factor table / 금융감독원 파인 금융계산기 거치식 결과와 같은 값).
  it("1,000만원 · 연 5% · 10년", () => {
    const base = { principal: 10_000_000, monthly: 0, ratePct: 5, years: 10 };
    expect(calcCompound({ ...base, compounding: "yearly" }).balance).toBe(16_288_946);
    expect(calcCompound({ ...base, compounding: "quarterly" }).balance).toBe(16_436_195);
    expect(calcCompound({ ...base, compounding: "monthly" }).balance).toBe(16_470_095);
    expect(Math.round(simpleValue(10_000_000, 0, 5, 10))).toBe(15_000_000);
  });

  it("timing does not matter without monthly contributions", () => {
    const a = calcCompound({ principal: 50_000_000, monthly: 0, ratePct: 4, years: 10, timing: "begin" });
    const b = calcCompound({ principal: 50_000_000, monthly: 0, ratePct: 4, years: 10, timing: "end" });
    expect(a.balance).toBe(b.balance);
  });

  it("1억 · 연 5% · 20년 월복리 = 1억 × (1 + 0.05/12)^240", () => {
    const r = calcCompound({ principal: 100_000_000, monthly: 0, ratePct: 5, years: 20 });
    expect(r.balance).toBe(Math.round(100_000_000 * Math.pow(1 + 0.05 / 12, 240)));
    expect(r.balance).toBe(271_264_029);
  });
});

describe("compound-interest: monthly contributions (적립식)", () => {
  // Future value of an annuity, 1,000,000 × ((1 + 0.05/12)^120 − 1) / (0.05/12) = 155,282,279.45 (월말),
  // annuity due (월초) = × (1 + 0.05/12) = 155,929,288.94.
  it("월 100만원 · 연 5% · 10년 월복리", () => {
    const base = { principal: 0, monthly: 1_000_000, ratePct: 5, years: 10 };
    expect(calcCompound({ ...base, timing: "end" }).balance).toBe(155_282_279);
    const begin = calcCompound({ ...base, timing: "begin" });
    expect(begin.balance).toBe(155_929_289);
    expect(begin.contributed).toBe(120_000_000);
    expect(begin.gain).toBe(35_929_289);
    expect(begin.gainRatio).toBeCloseTo(0.29941, 5);
  });

  // 연복리 1년 · 월초 적립 = 은행 정기적금 단리 공식: 월납입 × 연이율/12 × 78
  // 월 50만원, 연 4% → 500,000 × 0.04/12 × 78 = 130,000원 (savings.test.ts와 같은 벡터)
  it("연복리 1년은 적금 단리와 같다", () => {
    const r = calcCompound({ principal: 0, monthly: 500_000, ratePct: 4, years: 1, compounding: "yearly", timing: "begin" });
    expect(r.gain).toBe(130_000);
    const end = calcCompound({ principal: 0, monthly: 500_000, ratePct: 4, years: 1, compounding: "yearly", timing: "end" });
    expect(end.gain).toBe(110_000); // × 66
  });

  it("월초 적립은 월말보다 항상 많다", () => {
    for (const compounding of COMPOUNDING_ORDER) {
      const begin = calcCompound({ principal: 0, monthly: 300_000, ratePct: 5, years: 20, compounding, timing: "begin" });
      const end = calcCompound({ principal: 0, monthly: 300_000, ratePct: 5, years: 20, compounding, timing: "end" });
      expect(begin.balance).toBeGreaterThan(end.balance);
    }
  });

  it("복리 주기가 짧을수록 만기 금액이 크다 (단리 < 연 < 분기 < 월)", () => {
    const args = { principal: 10_000_000, monthly: 500_000, ratePct: 5, years: 10 } as const;
    const simple = simpleValue(args.principal, args.monthly, args.ratePct, args.years);
    const y = calcCompound({ ...args, compounding: "yearly" }).balance;
    const q = calcCompound({ ...args, compounding: "quarterly" }).balance;
    const m = calcCompound({ ...args, compounding: "monthly" }).balance;
    expect(simple).toBeLessThan(y);
    expect(y).toBeLessThan(q);
    expect(q).toBeLessThan(m);
  });

  it("calculator default: 1,000만원 + 월 50만원 · 연 5% · 10년 월복리 월초", () => {
    const r = calcCompound({ principal: 10_000_000, monthly: 500_000, ratePct: 5, years: 10 });
    expect(r.balance).toBe(94_434_739);
    expect(r.contributed).toBe(70_000_000);
  });
});

describe("compound-interest: simulation matches the closed form", () => {
  const timings: Timing[] = ["begin", "end"];
  const cases = [
    { principal: 0, monthly: 100_000, ratePct: 7, years: 30 },
    { principal: 10_000_000, monthly: 500_000, ratePct: 5, years: 10 },
    { principal: 123_456, monthly: 78_900, ratePct: 3.75, years: 7 },
    { principal: 100_000_000, monthly: 0, ratePct: 12.5, years: 50 },
  ];
  it("every year-end row equals the closed-form FV for that many years", () => {
    for (const c of cases)
      for (const compounding of COMPOUNDING_ORDER)
        for (const timing of timings) {
          const r = calcCompound({ ...c, compounding, timing });
          expect(r.rows).toHaveLength(c.years);
          for (const row of r.rows) {
            const fv = futureValue({ ...c, years: row.year, compounding, timing });
            expect(Math.abs(row.balance - fv)).toBeLessThanOrEqual(1);
            expect(row.contributed).toBe(c.principal + c.monthly * 12 * row.year);
            expect(row.gain).toBe(row.balance - row.contributed);
          }
          expect(r.balance).toBe(r.rows[r.rows.length - 1].balance);
        }
  });

  it("0% means no growth", () => {
    const r = calcCompound({ principal: 1_000_000, monthly: 100_000, ratePct: 0, years: 3 });
    expect(r.balance).toBe(4_600_000);
    expect(r.gain).toBe(0);
    expect(futureValue({ principal: 1_000_000, monthly: 100_000, ratePct: 0, years: 3 })).toBe(4_600_000);
  });
});

describe("compound-interest: rates, tax, inflation", () => {
  it("effective annual rate", () => {
    expect(effectiveAnnualRate(5, "yearly")).toBeCloseTo(0.05, 12);
    expect(effectiveAnnualRate(5, "quarterly")).toBeCloseTo(0.0509453, 6);
    expect(effectiveAnnualRate(5, "monthly")).toBeCloseTo(0.0511619, 6);
  });

  it("72의 법칙 vs exact doubling time", () => {
    expect(rule72Years(6)).toBe(12);
    expect(doublingYears(6, "yearly")).toBeCloseTo(11.8957, 4); // ln 2 / ln 1.06
    expect(doublingYears(5, "monthly")).toBeCloseTo(13.8918, 3); // ln 2 / (12 ln(1 + 0.05/12))
    expect(rule72Years(0)).toBe(Infinity);
    expect(doublingYears(0)).toBe(Infinity);
  });

  // 15.4% = 소득세 14% (소득세법 제129조①) + 지방소득세 1.4% (소득세의 10%, 지방세법 제103조의13)
  it("gain tax, each item truncated below 10원", () => {
    expect(gainTax(10_000_000)).toEqual({ incomeTax: 1_400_000, localTax: 140_000, total: 1_540_000 });
    // 35,929,289 × 14% = 5,030,100.46 → 5,030,100; × 10% = 503,010
    expect(gainTax(35_929_289)).toEqual({ incomeTax: 5_030_100, localTax: 503_010, total: 5_533_110 });
    expect(gainTax(1_234)).toEqual({ incomeTax: 170, localTax: 10, total: 180 }); // 172.76 → 170, 17 → 10
    expect(gainTax(0).total).toBe(0);
    expect(gainTax(-5_000).total).toBe(0);
  });

  it("real value discounts by inflation", () => {
    expect(Math.round(realValue(100_000_000, 2, 10))).toBe(82_034_830); // 1억 ÷ 1.02^10
    expect(realValue(100_000_000, 0, 10)).toBe(100_000_000);
  });
});

describe("compound-interest: validation and display helpers", () => {
  it("validates inputs", () => {
    expect(isValidCompoundInput(10_000_000, 500_000, 5, 10)).toBe(true);
    expect(isValidCompoundInput(0, 500_000, 0, 1)).toBe(true);
    expect(isValidCompoundInput(0, 0, 5, 10)).toBe(false);
    expect(isValidCompoundInput(NaN, 500_000, 5, 10)).toBe(false);
    expect(isValidCompoundInput(1, 1, 5, 0)).toBe(false);
    expect(isValidCompoundInput(1, 1, 5, 51)).toBe(false);
    expect(isValidCompoundInput(1, 1, 5, 10.5)).toBe(false);
    expect(isValidCompoundInput(1, 1, 31, 10)).toBe(false);
    expect(isValidCompoundInput(1, 1, -1, 10)).toBe(false);
  });

  it("approxWon rounds to 만원", () => {
    expect(approxWon(155_929_289)).toBe("1억 5,593만원");
    expect(approxWon(100_000_000)).toBe("1억원");
    expect(approxWon(35_929_289)).toBe("3,593만원");
    expect(approxWon(9_999)).toBe("9,999원");
    expect(approxWon(9_999.6)).toBe("1만원");
    expect(approxWon(-0.4)).toBe("0원");
    expect(approxWon(-24_434_739)).toBe("-2,443만원");
    // 조 단위: 1조 이상은 "12,345억"이 아니라 "1조 2,345억"으로 읽는다.
    expect(approxWon(1_234_567_890_123)).toBe("1조 2,345억 6,789만원");
    expect(approxWon(1_000_000_000_000)).toBe("1조원");
    expect(approxWon(NaN)).toBe("-");
  });

  // 100억을 연 10% 월복리로 50년: 1e10 × (1 + 0.1/12)^600 ≈ 1조 4,537억 (입력 상한 안의 값)
  it("100억 · 연 10% · 50년 reads with 조", () => {
    const r = calcCompound({ principal: 10_000_000_000, monthly: 0, ratePct: 10, years: 50 });
    expect(Math.abs(r.balance - 10_000_000_000 * Math.pow(1 + 0.1 / 12, 600))).toBeLessThan(10);
    expect(approxWon(r.balance)).toBe("1조 4,536억 9,923만원");
    expect(r.balance).toBeLessThanOrEqual(MAX_BALANCE);
  });

  it("the input limits can exceed the exactly-displayable range, so the UI must check MAX_BALANCE", () => {
    const r = calcCompound({ principal: MAX_PRINCIPAL, monthly: MAX_MONTHLY, ratePct: MAX_RATE, years: MAX_YEARS });
    expect(r.balance).toBeGreaterThan(MAX_BALANCE);
    expect(MAX_BALANCE).toBeLessThan(Number.MAX_SAFE_INTEGER);
    // 1,000조원 이하라면 세금 계산(수익 × 14)도 정확한 정수 범위 안이다.
    expect(gainTax(MAX_BALANCE)).toEqual({
      incomeTax: 140_000_000_000_000,
      localTax: 14_000_000_000_000,
      total: 154_000_000_000_000,
    });
  });

  it("axis labels and nice steps", () => {
    expect(axisLabel(0)).toBe("0");
    expect(axisLabel(50_000_000)).toBe("5,000만");
    expect(axisLabel(150_000_000)).toBe("1.5억");
    expect(axisLabel(200_000_000)).toBe("2억");
    expect(axisLabel(125_000_000)).toBe("1.25억");
    expect(axisLabel(25_000)).toBe("2.5만");
    expect(axisLabel(2_500)).toBe("2,500");
    expect(axisLabel(500_000_000_000)).toBe("5,000억");
    expect(axisLabel(1_000_000_000_000)).toBe("1조");
    expect(axisLabel(1_500_000_000_000)).toBe("1.5조");
    expect(axisLabel(1_000_000_000_000_000)).toBe("1,000조");
    expect(niceStep(155_929_289, 4)).toBe(50_000_000);
    expect(niceStep(94_434_739, 4)).toBe(25_000_000);
    expect(niceStep(16_470_095, 4)).toBe(5_000_000);
  });
});

describe("compound-interest: scenarios", () => {
  it("slugs are unique and match the generator", () => {
    expect(new Set(SCENARIOS.map((s) => s.slug)).size).toBe(SCENARIOS.length);
    for (const s of SCENARIOS) {
      expect(scenarioSlug(s)).toBe(s.slug);
      expect(findScenario(s.slug)).toBe(s);
      expect(isValidCompoundInput(s.principal, s.monthly, s.ratePct, s.years)).toBe(true);
      // Each page's tables highlight its own rate/period.
      expect(TABLE_RATES).toContain(s.ratePct);
      expect(TABLE_YEARS).toContain(s.years);
    }
    expect(findScenario("monthly-1-1y-1")).toBeNull();
  });

  it("no two scenarios are scaled copies of each other (same kind, period and rate)", () => {
    const shapes = SCENARIOS.map((s) => `${s.monthly > 0 ? "m" : "l"}-${s.years}-${s.ratePct}`);
    expect(new Set(shapes).size).toBe(SCENARIOS.length);
  });

  it("scenario headline numbers", () => {
    const get = (slug: string) => {
      const s = findScenario(slug)!;
      return calcCompound({ principal: s.principal, monthly: s.monthly, ratePct: s.ratePct, years: s.years });
    };
    expect(get("monthly-100-10y-5").balance).toBe(155_929_289);
    expect(get("lump-1000-10y-5").balance).toBe(16_470_095);
    expect(get("lump-10000-20y-5").balance).toBe(271_264_029);
    expect(get("monthly-50-30y-7").contributed).toBe(180_000_000);
    expect(get("monthly-100-20y-7").contributed).toBe(240_000_000);
  });

  it("cross-links: savings/deposit pages and scenarios with the same amount find each other", () => {
    expect(scenariosForMonthly(100_000).map((s) => s.slug)).toEqual(["monthly-10-30y-10"]);
    expect(scenariosForMonthly(1_000_000).map((s) => s.slug)).toEqual(["monthly-100-10y-5", "monthly-100-20y-7"]);
    expect(scenariosForMonthly(200_000)).toEqual([]);
    expect(scenariosForLump(50_000_000).map((s) => s.slug)).toEqual(["lump-5000-10y-4"]);
    expect(scenariosForLump(30_000_000)).toEqual([]);
    // Every scenario has a matching /savings/<만원>/ or /deposit/<만원>/ page to link back to.
    for (const s of SCENARIOS) {
      const manwon = (s.monthly > 0 ? s.monthly : s.principal) / 10_000;
      expect(s.monthly > 0 ? SAVINGS_PAGE_MONTHLY : DEPOSIT_PAGE_MANWON).toContain(manwon);
    }
  });

  it("market-return assumptions cite a source", () => {
    // 연 10% = 1928~2025년 S&P 500(배당 포함) 연도별 수익률 98개의 기하평균 10.02%를 반올림 (NYU Stern, Damodaran)
    const sp = findScenario("monthly-10-30y-10")!;
    expect(sp.context).toContain("1928~2025년");
    expect(sp.source?.href).toMatch(/^https:\/\/pages\.stern\.nyu\.edu\//);
  });
});
