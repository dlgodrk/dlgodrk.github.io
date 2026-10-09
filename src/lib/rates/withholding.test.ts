import { describe, expect, it } from "vitest";
import { bracketOf, childDeduction, monthlyWithholding, tableAmount } from "./withholding";
import official from "./__fixtures__/withholding-2026.json";

type Row = [number | string, number | null, number[]];

describe("간이세액표 generator", () => {
  it("reproduces all 7,117 cells of the official 2026 table", () => {
    const rows = official.rows as Row[];
    expect(rows.length).toBe(647);
    const mismatches: string[] = [];
    for (const [loRaw, hi, values] of rows) {
      const lo = Number(loRaw);
      // Probe the lower bound, the midpoint and the last won of each bracket.
      const probes = hi === null ? [lo * 1000] : [lo * 1000, ((lo + hi) / 2) * 1000, hi * 1000 - 1];
      for (const W of probes) {
        for (let n = 1; n <= 11; n++) {
          const got = tableAmount(W, n);
          if (got !== values[n - 1]) mismatches.push(`W=${W} n=${n} got=${got} want=${values[n - 1]}`);
        }
      }
    }
    expect(mismatches.slice(0, 10)).toEqual([]);
  });

  it("finds brackets", () => {
    expect(bracketOf(3_000_000)).toEqual({ lo: 3000, hi: 3020, mid: 3_010_000 });
    expect(bracketOf(1_062_000)).toEqual({ lo: 1060, hi: 1065, mid: 1_062_500 });
    expect(bracketOf(769_999)).toBeNull();
  });

  it("applies the >10M formulas", () => {
    expect(tableAmount(12_000_000, 1)).toBe(2_218_400);
    expect(tableAmount(15_000_000, 1)).toBe(3_276_800);
    expect(tableAmount(15_000_000, 4)).toBe(2_940_240);
    expect(tableAmount(20_000_000, 2)).toBe(5_062_970);
    expect(tableAmount(29_000_000, 1)).toBe(8_510_000);
    expect(tableAmount(40_000_000, 3)).toBe(12_595_440);
    expect(tableAmount(50_000_000, 1)).toBe(17_002_000);
    expect(tableAmount(100_000_000, 1)).toBe(38_392_000);
    expect(tableAmount(10_123_456, 1)).toBe(1_574_740);
  });

  it("extends beyond 11 family members", () => {
    expect(tableAmount(5_000_000, 12)).toBe(69_100);
    expect(tableAmount(5_000_000, 13)).toBe(50_350);
  });

  it("uses the 2026-03 child deduction amounts", () => {
    expect(childDeduction(1)).toBe(20_830);
    expect(childDeduction(2)).toBe(45_830);
    expect(childDeduction(3)).toBe(79_160);
    expect(childDeduction(4)).toBe(112_490);
    expect(childDeduction(1, "2026-02")).toBe(12_500);
  });

  it("computes monthly withholding incl. local tax and ratios", () => {
    expect(monthlyWithholding(3_000_000, 1)).toEqual({ incomeTax: 74_350, localTax: 7_430, total: 81_780, tableAmount: 74_350 });
    expect(monthlyWithholding(3_500_000, 4, 2).incomeTax).toBe(3_510);
    expect(monthlyWithholding(3_500_000, 4, 2).localTax).toBe(350);
    expect(monthlyWithholding(2_500_000, 3, 1).incomeTax).toBe(0);
    expect(monthlyWithholding(5_000_000, 4, 3).incomeTax).toBe(139_940);
    expect(monthlyWithholding(5_000_000, 4, 3).localTax).toBe(13_990);
    expect(monthlyWithholding(3_000_000, 1, 0, 80).incomeTax).toBe(59_480);
    expect(monthlyWithholding(3_000_000, 1, 0, 120).incomeTax).toBe(89_220);
    expect(monthlyWithholding(2_000_000, 1, 0, 80).incomeTax).toBe(15_610);
  });
});
