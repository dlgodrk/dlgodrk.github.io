import { describe, expect, it } from "vitest";
import { employeeInsurance } from "./insurance";
import official from "./__fixtures__/4insure-2026-10.json";

describe("employeeInsurance (2026)", () => {
  it("matches every official 4insure simulator output for 2026-10", () => {
    for (const [pay, pension, health, ltc, employment] of official.rows as number[][]) {
      const r = employeeInsurance(pay, "2026-10");
      // 4insure clamps 보수월액 instead of the premium above ~127.7M/month, giving 4,591,730;
      // we follow the 고시 premium cap (4,591,740). Same 장기요양 result either way.
      const expectedHealth = pay > 127_725_730 ? 4_591_740 : health;
      expect([pay, r.pension, r.health, r.longTermCare, r.employment]).toEqual([pay, pension, expectedHealth, ltc, employment]);
    }
  });

  it("uses the 2025.7~2026.6 pension cap for January–June 2026", () => {
    const r = employeeInsurance(7_000_000, "2026-03");
    expect(r.pension).toBe(302_570);
    expect(r.total).toBe(650_280);
  });

  it("uses the rounded 0.1314 long-term-care ratio from November 2026", () => {
    expect(employeeInsurance(5_000_000, "2026-10").longTermCare).toBe(23_620);
    expect(employeeInsurance(5_000_000, "2026-11").longTermCare).toBe(23_610);
    expect(employeeInsurance(10_000_000, "2026-11").longTermCare).toBe(47_230);
    expect(employeeInsurance(2_345_678, "2026-11").longTermCare).toBe(11_070);
  });

  it("totals the research vectors", () => {
    expect(employeeInsurance(3_000_000, "2026-10").total).toBe(291_520);
    expect(employeeInsurance(4_000_000, "2026-10").total).toBe(388_690);
    expect(employeeInsurance(2_156_880, "2026-10").total).toBe(209_530);
  });

  it("handles zero and exemptions", () => {
    expect(employeeInsurance(0, "2026-10").total).toBe(0);
    const r = employeeInsurance(3_000_000, "2026-10", { pensionExempt: true, employmentExempt: true });
    expect(r.pension).toBe(0);
    expect(r.employment).toBe(0);
    expect(r.health).toBe(107_850);
  });
});
