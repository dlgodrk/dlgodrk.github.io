import { describe, expect, it } from "vitest";
import {
  BASE_RATE_HISTORY,
  BOK_BASE_RATE_DATE,
  BOK_BASE_RATE_PCT,
  computeImpliedRate,
  computeToJeonse,
  computeToWolse,
  EOK,
  LEGAL_CAP_RATE,
  legalCapRate,
  MAN,
  manToWon,
  MARKET_RATE,
  monthlyRentFor,
  rateDisplayDigits,
  TABLE_CONVERTED_AMOUNTS,
  tableRates,
} from "./rent-conversion";

describe("rent-conversion: 법정 전환율 상한", () => {
  // 주택임대차보호법 제7조의2 + 시행령 제9조(① 연 1할, ② 기준금리 + 연 2%).
  // 한국은행 기준금리 추이: 2026-08-27 3.00% (bok.or.kr, 2026-10-09 확인).
  it("uses the current BOK base rate", () => {
    expect(BOK_BASE_RATE_PCT).toBe(3);
    expect(BOK_BASE_RATE_DATE).toBe("2026-08-27");
    expect(LEGAL_CAP_RATE).toBe(5);
  });
  it("is min(10%, 기준금리 + 2%)", () => {
    expect(legalCapRate(3)).toBe(5);
    expect(legalCapRate(2.75)).toBe(4.75);
    expect(legalCapRate(2.5)).toBe(4.5);
    expect(legalCapRate(0.5)).toBe(2.5); // 2020. 9. 29. 개정 직후 (기준금리 0.5%) 법무부 안내 2.5%
    expect(legalCapRate(8)).toBe(10);
    expect(legalCapRate(9.5)).toBe(10);
  });
  it("history starts with the current base rate and is newest-first", () => {
    expect(BASE_RATE_HISTORY[0]).toEqual({ date: BOK_BASE_RATE_DATE, rate: BOK_BASE_RATE_PCT });
    const dates = BASE_RATE_HISTORY.map((h) => h.date);
    expect([...dates].sort().reverse()).toEqual(dates);
    expect(new Set(dates).size).toBe(dates.length);
  });
});

describe("rent-conversion: 전세 → 월세", () => {
  it("converts at the current cap", () => {
    // 전세 3억 → 보증금 1억: 2억 × 5% ÷ 12 = 833,333.33 → 833,333원 (원 미만 버림)
    const r = computeToWolse({ jeonse: 3 * EOK, deposit: 1 * EOK, ratePct: 5 })!;
    expect(r.converted).toBe(2 * EOK);
    expect(r.monthlyRent).toBe(833_333);
    expect(r.capMonthlyRent).toBe(833_333);
    expect(r.overCap).toBe(false);
    expect(r.excessPerMonth).toBe(0);
  });
  it("matches the 국토교통부·법무부 해설집(2020. 8.) example at the then-cap 4%", () => {
    // 전세 5억 → 보증금 3억이면 월세 67만원, 보증금 2억이면 월세 100만원을 넘을 수 없음
    // (당시 기준금리 0.5% + 3.5% = 4%).
    const a = computeToWolse({ jeonse: 5 * EOK, deposit: 3 * EOK, ratePct: 4, capRatePct: 4 })!;
    expect(a.monthlyRent).toBe(666_666);
    expect(Math.round(a.monthlyRent / MAN)).toBe(67);
    const b = computeToWolse({ jeonse: 5 * EOK, deposit: 2 * EOK, ratePct: 4, capRatePct: 4 })!;
    expect(b.monthlyRent).toBe(1_000_000);
  });
  it("flags a rate above the cap", () => {
    const r = computeToWolse({ jeonse: 3 * EOK, deposit: 1 * EOK, ratePct: 6 })!;
    expect(r.monthlyRent).toBe(1_000_000);
    expect(r.overCap).toBe(true);
    expect(r.excessPerMonth).toBe(1_000_000 - 833_333);
  });
  it("allows converting the whole deposit (보증금 0)", () => {
    const r = computeToWolse({ jeonse: 1 * EOK, deposit: 0, ratePct: 5 })!;
    expect(r.monthlyRent).toBe(416_666);
  });
  it("rejects invalid input", () => {
    expect(computeToWolse({ jeonse: 1 * EOK, deposit: 1 * EOK, ratePct: 5 })).toBeNull();
    expect(computeToWolse({ jeonse: 1 * EOK, deposit: 2 * EOK, ratePct: 5 })).toBeNull();
    expect(computeToWolse({ jeonse: 1 * EOK, deposit: 0, ratePct: 0 })).toBeNull();
    expect(computeToWolse({ jeonse: NaN, deposit: 0, ratePct: 5 })).toBeNull();
    expect(computeToWolse({ jeonse: 1 * EOK, deposit: -1, ratePct: 5 })).toBeNull();
  });
});

describe("rent-conversion: 월세 → 전세", () => {
  it("converts 보증금 1억 + 월세 80만원 at 5%", () => {
    // 80만원 × 12 = 960만원, ÷ 5% = 1억 9,200만원, + 1억 = 2억 9,200만원
    const r = computeToJeonse({ deposit: 1 * EOK, monthlyRent: 80 * MAN, ratePct: 5 })!;
    expect(r.annualRent).toBe(9_600_000);
    expect(r.convertedDeposit).toBe(192_000_000);
    expect(r.jeonse).toBe(292_000_000);
    expect(r.jeonseAtCap).toBe(292_000_000);
  });
  it("a higher market rate gives a lower 전세 equivalent", () => {
    const r = computeToJeonse({ deposit: 5_000 * MAN, monthlyRent: 100 * MAN, ratePct: 6 })!;
    expect(r.jeonse).toBe(5_000 * MAN + 200_000_000);
    expect(r.jeonseAtCap).toBe(5_000 * MAN + 240_000_000);
  });
  it("rounds to the won", () => {
    const r = computeToJeonse({ deposit: 0, monthlyRent: 80 * MAN, ratePct: 4.75 })!;
    expect(r.convertedDeposit).toBe(202_105_263);
  });
  it("uses HF's 2026년 하반기 market rate 6.5% as the 월세 → 전세 reference", () => {
    // 한국주택금융공사 「2026년 하반기 전월세전환율 안내」(2026-06-22 공지): 6.5%, 2026. 7. 1. 보증신청 건부터.
    expect(MARKET_RATE.pct).toBe(6.5);
    expect(MARKET_RATE.effective).toBe("2026-07-01");
    expect(MARKET_RATE.pct).toBeGreaterThan(LEGAL_CAP_RATE);
    // 보증금 1억 + 월세 80만원: 960만원 ÷ 6.5% = 147,692,307.69 → 147,692,308원, 합계 2억 4,769만 2,308원
    const r = computeToJeonse({ deposit: 1 * EOK, monthlyRent: 80 * MAN, ratePct: MARKET_RATE.pct })!;
    expect(r.convertedDeposit).toBe(147_692_308);
    expect(r.jeonse).toBe(247_692_308);
    expect(r.jeonseAtCap - r.jeonse).toBe(44_307_692);
  });
  it("rejects invalid input", () => {
    expect(computeToJeonse({ deposit: 0, monthlyRent: 0, ratePct: 5 })).toBeNull();
    expect(computeToJeonse({ deposit: 0, monthlyRent: 50 * MAN, ratePct: 0 })).toBeNull();
    expect(computeToJeonse({ deposit: NaN, monthlyRent: 50 * MAN, ratePct: 5 })).toBeNull();
  });
});

describe("rent-conversion: 전환율 역산", () => {
  it("finds 4.8% for 전세 3억 → 보증금 1억 + 월세 80만원", () => {
    const r = computeImpliedRate({ jeonse: 3 * EOK, deposit: 1 * EOK, monthlyRent: 80 * MAN })!;
    expect(r.ratePct).toBeCloseTo(4.8, 10);
    expect(r.overCap).toBe(false);
    expect(r.excessPerMonth).toBe(0);
    expect(r.diffPctPoint).toBeCloseTo(-0.2, 10);
  });
  it("flags 월세 90만원 as over the 5% cap", () => {
    const r = computeImpliedRate({ jeonse: 3 * EOK, deposit: 1 * EOK, monthlyRent: 90 * MAN })!;
    expect(r.ratePct).toBeCloseTo(5.4, 10);
    expect(r.overCap).toBe(true);
    expect(r.diffPctPoint).toBeCloseTo(0.4, 10);
    expect(r.capMonthlyRent).toBe(833_333);
    expect(r.excessPerMonth).toBe(66_667);
  });
  it("treats exactly the capped (floored) rent as within the cap, one won more as over", () => {
    const at = computeImpliedRate({ jeonse: 3 * EOK, deposit: 1 * EOK, monthlyRent: 833_333 })!;
    expect(at.overCap).toBe(false);
    const over = computeImpliedRate({ jeonse: 3 * EOK, deposit: 1 * EOK, monthlyRent: 833_334 })!;
    expect(over.overCap).toBe(true);
    expect(over.excessPerMonth).toBe(1);
  });
  it("round-trips with 전세 → 월세", () => {
    const w = computeToWolse({ jeonse: 4 * EOK, deposit: 1.5 * EOK, ratePct: 5 })!;
    const r = computeImpliedRate({ jeonse: 4 * EOK, deposit: 1.5 * EOK, monthlyRent: w.monthlyRent })!;
    expect(r.ratePct).toBeCloseTo(5, 4);
    expect(r.overCap).toBe(false);
  });
  it("rejects invalid input", () => {
    expect(computeImpliedRate({ jeonse: 1 * EOK, deposit: 1 * EOK, monthlyRent: 50 * MAN })).toBeNull();
    expect(computeImpliedRate({ jeonse: 1 * EOK, deposit: 0, monthlyRent: 0 })).toBeNull();
  });
});

describe("rent-conversion: helpers", () => {
  it("converts 만원 input to won without float noise", () => {
    expect(manToWon(83.3)).toBe(833_000);
    expect(manToWon(0.1)).toBe(1_000);
    expect(manToWon(30_000)).toBe(3 * EOK);
    // 4 decimals in 만원 = won-exact rents (the field allows 4 digits)
    expect(manToWon(83.3333)).toBe(833_333);
    expect(manToWon(83.335)).toBe(833_350);
    expect(manToWon(0.0001)).toBe(1);
  });
  it("won-exact rent near the cap gets the right verdict", () => {
    // 전세 3억 → 보증금 1억: 상한 월세 833,333원. 집주인 제안 833,500원은 167원 초과.
    const r = computeImpliedRate({ jeonse: 3 * EOK, deposit: 1 * EOK, monthlyRent: manToWon(83.35) })!;
    expect(r.overCap).toBe(true);
    expect(r.excessPerMonth).toBe(167);
  });
  it("shows enough rate digits that an over-cap rate never reads as the cap", () => {
    expect(rateDisplayDigits(4.8)).toBe(2);
    expect(rateDisplayDigits(5)).toBe(2);
    expect(rateDisplayDigits(5.4)).toBe(2);
    // 월세 83.4만원 on 2억: 834,000 × 12 ÷ 2억 = 5.004% ("5%" at 2 digits)
    const a = computeImpliedRate({ jeonse: 3 * EOK, deposit: 1 * EOK, monthlyRent: 834_000 })!;
    expect(rateDisplayDigits(a.ratePct)).toBe(3);
    // 833,334원 on 2억 = 5.000004%
    const b = computeImpliedRate({ jeonse: 3 * EOK, deposit: 1 * EOK, monthlyRent: 833_334 })!;
    expect(rateDisplayDigits(b.ratePct)).toBe(6);
    // exactly the floored cap rent (4.999998%) stays at 2 digits and reads as 5%
    const c = computeImpliedRate({ jeonse: 3 * EOK, deposit: 1 * EOK, monthlyRent: 833_333 })!;
    expect(rateDisplayDigits(c.ratePct)).toBe(2);
    expect(rateDisplayDigits(4.75 + 0.001, 4.75)).toBe(3);
  });
  it("floors monthly rent", () => {
    expect(monthlyRentFor(1 * EOK, 5)).toBe(416_666);
    expect(monthlyRentFor(3 * EOK, 5)).toBe(1_250_000);
  });
  it("table inputs are sorted and include the cap", () => {
    expect([...TABLE_CONVERTED_AMOUNTS].sort((a, b) => a - b)).toEqual(TABLE_CONVERTED_AMOUNTS);
    expect(tableRates()).toEqual([4.5, 5, 6, 7]);
    expect(tableRates(4.75)).toEqual([4.25, 4.75, 5.75, 6.75]);
  });
});
