import { describe, expect, it } from "vitest";
import {
  averageAfterBuy,
  breakevenRise,
  cellText,
  combineLots,
  decodeLots,
  DEFAULT_FEE_PCT,
  encodeLots,
  formatAmount,
  formatPrice,
  formatQty,
  formatSignedAmount,
  formatSignedPercent,
  isBlankLot,
  isCompleteLot,
  MAX_BUY_ROWS,
  MAX_FEE_PCT,
  parseCell,
  recoveryRise,
  roundDigits,
  SELL_TAX_2025,
  SELL_TAX_2026,
  sellTaxRate,
  sharesForTarget,
  valuation,
  withCosts,
} from "./stock-average";

describe("combineLots (평균 단가 = 총 매수 금액 ÷ 총 수량)", () => {
  it("물타기: 72,000원 100주 + 60,000원 100주 = 평단 66,000원", () => {
    const pos = combineLots([
      { price: 72000, qty: 100 },
      { price: 60000, qty: 100 },
    ]);
    expect(pos.qty).toBe(200);
    expect(pos.cost).toBe(13_200_000);
    expect(pos.avg).toBe(66000);
  });
  it("여러 번 나눠 산 경우 금액 가중 평균", () => {
    // 50,000×10 + 45,000×20 + 40,000×30 = 2,600,000원 / 60주
    const pos = combineLots([
      { price: 50000, qty: 10 },
      { price: 45000, qty: 20 },
      { price: 40000, qty: 30 },
    ]);
    expect(pos.cost).toBe(2_600_000);
    expect(pos.avg).toBeCloseTo(43333.333, 3);
  });
  it("불타기는 평단을 올린다", () => {
    expect(combineLots([{ price: 50000, qty: 100 }, { price: 70000, qty: 100 }]).avg).toBe(60000);
  });
  it("소수점 거래(해외주식)도 그대로 가중 평균", () => {
    const pos = combineLots([
      { price: 180, qty: 10 },
      { price: 150, qty: 2.5 },
    ]);
    expect(pos.qty).toBe(12.5);
    expect(pos.avg).toBeCloseTo(174, 10);
  });
  it("비어 있거나 반만 채운 줄은 빠진다", () => {
    const pos = combineLots([
      { price: 72000, qty: 100 },
      { price: NaN, qty: 50 },
      { price: 60000, qty: 0 },
      { price: NaN, qty: NaN },
    ]);
    expect(pos.qty).toBe(100);
    expect(pos.avg).toBe(72000);
    expect(Number.isNaN(combineLots([]).avg)).toBe(true);
  });
  it("classifies rows", () => {
    expect(isCompleteLot({ price: 1, qty: 1 })).toBe(true);
    expect(isCompleteLot({ price: 1, qty: NaN })).toBe(false);
    expect(isBlankLot({ price: NaN, qty: 0 })).toBe(true);
    expect(isBlankLot({ price: 60000, qty: NaN })).toBe(false);
  });
  it("averageAfterBuy matches combineLots", () => {
    expect(averageAfterBuy(72000, 100, 60000, 300)).toBe(63000);
    expect(averageAfterBuy(72000, 100, 60000, 0)).toBe(72000);
  });
});

describe("손익과 본전 상승률", () => {
  const pos = combineLots([
    { price: 72000, qty: 100 },
    { price: 60000, qty: 100 },
  ]);
  it("현재가 63,000원 기준 평가손익", () => {
    const v = valuation(pos, 63000);
    expect(v.value).toBe(12_600_000);
    expect(v.pnl).toBe(-600_000);
    expect(v.rate).toBeCloseTo(-0.0454545, 6);
    // 63,000 → 66,000원: 4.76% 올라야 본전
    expect(v.rise).toBeCloseTo(0.047619, 6);
  });
  it("물타기 전 본전 상승률은 14.29%", () => {
    expect(breakevenRise(72000, 63000)).toBeCloseTo(0.142857, 6);
  });
  it("현재가가 평단보다 높으면 0 이하", () => {
    expect(breakevenRise(66000, 70000)).toBeLessThan(0);
    expect(Number.isNaN(breakevenRise(66000, NaN))).toBe(true);
  });
  it("하락률별 원금 회복 상승률: −50%는 +100%", () => {
    expect(recoveryRise(0.1)).toBeCloseTo(0.111111, 6);
    expect(recoveryRise(0.2)).toBeCloseTo(0.25, 10);
    expect(recoveryRise(0.3)).toBeCloseTo(0.428571, 6);
    expect(recoveryRise(0.5)).toBeCloseTo(1, 10);
    expect(recoveryRise(1)).toBe(Infinity);
  });
});

describe("2026년 매도 세율 (증권거래세법 시행령 제5조, 2026.1.1 이후 양도분)", () => {
  // 증권거래세법 시행령 대통령령 제36001호(공포 2025.12.31, 시행 2026.1.1, law.go.kr 제·개정이유 lsId=005028):
  // 코스피 0%→0.05%(+농특세 0.15%, 농어촌특별세법 제5조), 코스닥·K-OTC 0.15%→0.20%, 코넥스 0.10% 유지.
  it("코스피 0.05% + 농특세 0.15% = 0.20%", () => {
    expect(SELL_TAX_2026.kospi.tradeTax).toBe(0.0005);
    expect(SELL_TAX_2026.kospi.ruralTax).toBe(0.0015);
    expect(sellTaxRate("kospi")).toBeCloseTo(0.002, 12);
  });
  it("코스닥 0.20%, 코넥스 0.10%, ETF 0", () => {
    expect(sellTaxRate("kosdaq")).toBe(0.002);
    expect(sellTaxRate("konex")).toBe(0.001);
    expect(sellTaxRate("etf")).toBe(0);
  });
  it("2025년 세율은 코스피·코스닥 0.15%", () => {
    expect(SELL_TAX_2025.kospi.tradeTax + SELL_TAX_2025.kospi.ruralTax).toBe(0.0015);
    expect(SELL_TAX_2025.kosdaq.tradeTax).toBe(0.0015);
  });
  it("코스피 1,000만원 매도 시 거래세 5,000원 + 농특세 15,000원", () => {
    const c = withCosts({ qty: 100, cost: 10_000_000, avg: 100_000 }, 0, SELL_TAX_2026.kospi, 100_000);
    expect(c.tradeTax).toBeCloseTo(5000, 6);
    expect(c.ruralTax).toBeCloseTo(15000, 6);
  });
});

describe("withCosts (수수료·세금 반영)", () => {
  const pos = combineLots([
    { price: 72000, qty: 100 },
    { price: 60000, qty: 100 },
  ]);
  const c = withCosts(pos, 0.00015, SELL_TAX_2026.kospi, 66000);
  it("매수 수수료 0.015%와 수수료 포함 평단", () => {
    expect(c.buyFee).toBeCloseTo(1980, 6);
    expect(c.effectiveAvg).toBeCloseTo(66009.9, 6);
  });
  it("평단에 팔면 수수료와 세금만큼 손해", () => {
    expect(c.sellFee).toBeCloseTo(1980, 6);
    expect(c.tradeTax).toBeCloseTo(6600, 6);
    expect(c.ruralTax).toBeCloseTo(19800, 6);
    expect(c.netPnl).toBeCloseTo(-30360, 6);
  });
  it("실질 본전 가격 = (매수 금액 + 매수 수수료) ÷ (수량 × (1 − 수수료율 − 세율))", () => {
    expect(c.breakevenPrice).toBeCloseTo(13_201_980 / (200 * (1 - 0.00015 - 0.002)), 6);
    expect(Math.round(c.breakevenPrice)).toBe(66152);
    // 그 가격에 팔면 손익 0
    const at = withCosts(pos, 0.00015, SELL_TAX_2026.kospi, c.breakevenPrice);
    expect(at.netPnl).toBeCloseTo(0, 4);
    expect(at.netRise).toBeCloseTo(0, 10);
  });
  it("수수료율 상한(MAX_FEE_PCT)에서도 실질 본전 가격이 계산된다", () => {
    const top = withCosts(pos, MAX_FEE_PCT / 100, SELL_TAX_2026.kospi, 66000);
    expect(Number.isFinite(top.breakevenPrice)).toBe(true);
    expect(top.netRise).toBeGreaterThan(0);
    // 상한을 넘는 요율(링크 조작)은 본전 가격이 없다 — UI가 MAX_FEE_PCT로 자른다.
    expect(Number.isNaN(withCosts(pos, 1, SELL_TAX_2026.kospi, 66000).breakevenPrice)).toBe(true);
  });
  it("수수료율은 URL에 글자로 저장돼 빈 칸도 유지된다", () => {
    expect(parseCell(cellText(DEFAULT_FEE_PCT))).toBe(DEFAULT_FEE_PCT);
    expect(Number.isNaN(parseCell(cellText(NaN)))).toBe(true);
  });
  it("현재가가 없으면 매도 쪽 값은 NaN", () => {
    const n = withCosts(pos, 0.00015, SELL_TAX_2026.kospi, NaN);
    expect(Number.isNaN(n.netPnl)).toBe(true);
    expect(n.buyFee).toBeCloseTo(1980, 6);
  });
});

describe("sharesForTarget (목표 평단 역산)", () => {
  it("72,000원×100주, 60,000원에 사서 66,000원을 만들려면 100주", () => {
    const r = sharesForTarget({ avg: 72000, qty: 100, buyPrice: 60000, target: 66000 });
    expect(r).toMatchObject({ kind: "ok", direction: "down", exact: 100, shares: 100, resultAvg: 66000, cost: 6_000_000, totalQty: 200 });
  });
  it("평단을 추가 매수가에 가깝게 할수록 필요한 수량이 급증", () => {
    const r65 = sharesForTarget({ avg: 72000, qty: 100, buyPrice: 60000, target: 65000 });
    const r61 = sharesForTarget({ avg: 72000, qty: 100, buyPrice: 60000, target: 61000 });
    expect(r65.kind === "ok" && r65.shares).toBe(140);
    expect(r61.kind === "ok" && r61.shares).toBe(1100);
  });
  it("물타기는 올림: 목표 이하가 되는 최소 수량", () => {
    // x = 100 × 5,000 ÷ 7,000 = 71.43 → 72주, 평단 66,976.74원
    const r = sharesForTarget({ avg: 72000, qty: 100, buyPrice: 60000, target: 67000 });
    expect(r.kind).toBe("ok");
    if (r.kind !== "ok") return;
    expect(r.exact).toBeCloseTo(71.428571, 5);
    expect(r.shares).toBe(72);
    expect(r.resultAvg).toBeLessThanOrEqual(67000);
    expect(r.resultAvg).toBeCloseTo(66976.744, 3);
  });
  it("불타기는 내림: 목표를 넘지 않는 최대 수량", () => {
    const r = sharesForTarget({ avg: 50000, qty: 100, buyPrice: 70000, target: 55000 });
    expect(r.kind).toBe("ok");
    if (r.kind !== "ok") return;
    expect(r.direction).toBe("up");
    expect(r.shares).toBe(33);
    expect(r.resultAvg).toBeLessThanOrEqual(55000);
    const exact = sharesForTarget({ avg: 50000, qty: 100, buyPrice: 70000, target: 60000 });
    expect(exact.kind === "ok" && exact.shares).toBe(100);
  });
  it("불타기에서 1주만 사도 목표를 넘으면 none-fits", () => {
    const r = sharesForTarget({ avg: 50000, qty: 10, buyPrice: 70000, target: 50100 });
    expect(r.kind).toBe("none-fits");
  });
  it("만들 수 없는 목표", () => {
    const base = { avg: 72000, qty: 100, buyPrice: 60000 };
    expect(sharesForTarget({ ...base, target: 60000 }).kind).toBe("unreachable");
    expect(sharesForTarget({ ...base, target: 59000 }).kind).toBe("unreachable");
    expect(sharesForTarget({ ...base, target: 75000 })).toEqual({ kind: "wrong-side", direction: "down" });
    expect(sharesForTarget({ avg: 50000, qty: 100, buyPrice: 70000, target: 45000 })).toEqual({ kind: "wrong-side", direction: "up" });
    expect(sharesForTarget({ avg: 50000, qty: 100, buyPrice: 70000, target: 70000 }).kind).toBe("unbounded");
    expect(sharesForTarget({ avg: 72000, qty: 100, buyPrice: 72000, target: 70000 }).kind).toBe("same-price");
    expect(sharesForTarget({ ...base, target: 72000 }).kind).toBe("already");
    expect(sharesForTarget({ ...base, target: NaN }).kind).toBe("invalid");
    expect(sharesForTarget({ ...base, qty: 0, target: 66000 }).kind).toBe("invalid");
  });
});

describe("URL encoding of 추가 매수 rows", () => {
  it("round-trips, keeping empty boxes", () => {
    const lots = [
      { price: 60000, qty: 100 },
      { price: NaN, qty: 50 },
      { price: 182.35, qty: 0.5 },
    ];
    const s = encodeLots(lots);
    expect(s).toBe("60000x100_x50_182.35x0.5");
    expect(decodeLots(s)).toEqual(lots);
  });
  it("accepts p:q,p:q and ignores junk", () => {
    expect(decodeLots("60000:100,58000:50")).toEqual([
      { price: 60000, qty: 100 },
      { price: 58000, qty: 50 },
    ]);
    expect(decodeLots("abcx-5")).toEqual([{ price: NaN, qty: NaN }]);
    expect(decodeLots("")).toEqual([{ price: NaN, qty: NaN }]);
  });
  it("single cells keep an empty box as empty text", () => {
    expect(cellText(NaN)).toBe("");
    expect(cellText(63000)).toBe("63000");
    expect(Number.isNaN(parseCell(""))).toBe(true);
    expect(Number.isNaN(parseCell("-1"))).toBe(true);
    expect(parseCell(" 160.5 ")).toBe(160.5);
  });
  it(`keeps at most ${MAX_BUY_ROWS} rows`, () => {
    expect(decodeLots("1x1_2x2_3x3_4x4_5x5_6x6_7x7")).toHaveLength(MAX_BUY_ROWS);
  });
});

describe("formatting", () => {
  it("won", () => {
    expect(formatPrice(66000, "won")).toBe("66,000원");
    expect(formatPrice(43333.3333, "won")).toBe("43,333.33원");
    expect(formatAmount(13_200_000, "won")).toBe("13,200,000원");
    expect(formatSignedAmount(-600_000, "won")).toBe("−600,000원");
    expect(formatSignedAmount(0.4, "won")).toBe("0원");
    expect(formatQty(200, "won")).toBe("200주");
  });
  it("usd", () => {
    expect(formatPrice(165, "usd")).toBe("$165.00");
    expect(formatPrice(174.12345, "usd")).toBe("$174.1235");
    expect(formatAmount(1650, "usd")).toBe("$1,650.00");
    expect(formatSignedAmount(12.5, "usd")).toBe("+$12.50");
    expect(formatSignedAmount(-12.5, "usd")).toBe("−$12.50");
    expect(formatQty(2.5, "usd")).toBe("2.5주");
  });
  it("signed percent", () => {
    expect(formatSignedPercent(0.047619)).toBe("+4.76%");
    expect(formatSignedPercent(-0.0454545)).toBe("−4.55%");
    expect(formatSignedPercent(0.00001)).toBe("0%");
  });
  it("roundDigits keeps NaN", () => {
    expect(roundDigits(60000.5, 0)).toBe(60001);
    expect(roundDigits(0.0151, 3)).toBe(0.015);
    expect(Number.isNaN(roundDigits(NaN, 2))).toBe(true);
  });
});
