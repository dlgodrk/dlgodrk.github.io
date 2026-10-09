import { describe, expect, it } from "vitest";
import { calcSalary, SALARY_PAGE_MANWON } from "./salary";

describe("calcSalary", () => {
  it("연봉 3,840만원 (월 320만원, 비과세 20만원, 1인) — 2026-10", () => {
    const r = calcSalary({ annual: 38_400_000, nonTaxable: 200_000, family: 1 });
    expect(r.monthlyGross).toBe(3_200_000);
    expect(r.monthlyTaxable).toBe(3_000_000);
    // 4대보험 on 3,000,000: 142,500 + 107,850 + 14,170 + 27,000
    expect(r.insurance.total).toBe(291_520);
    // 간이세액표 3,000~3,020천원, 1인: 74,350 / 지방세 7,430
    expect(r.tax.incomeTax).toBe(74_350);
    expect(r.tax.localTax).toBe(7_430);
    expect(r.deductions).toBe(373_300);
    expect(r.monthlyNet).toBe(2_826_700);
    expect(r.annualNet).toBe(33_920_400);
  });

  it("divides by 13 when 퇴직금 is included", () => {
    const r = calcSalary({ annual: 39_000_000, severanceIncluded: true, nonTaxable: 0 });
    expect(r.monthlyGross).toBe(3_000_000);
  });

  it("caps 비과세 at the monthly pay and handles zero", () => {
    expect(calcSalary({ annual: 0 }).monthlyNet).toBe(0);
    const r = calcSalary({ annual: 1_200_000, nonTaxable: 200_000 });
    expect(r.monthlyGross).toBe(100_000);
    expect(r.monthlyTaxable).toBe(0);
    expect(r.deductions).toBe(0);
  });

  it("applies 8~20세 자녀 공제", () => {
    const base = calcSalary({ annual: 62_400_000, nonTaxable: 200_000, family: 4, children: 0 });
    const kids = calcSalary({ annual: 62_400_000, nonTaxable: 200_000, family: 4, children: 2 });
    expect(base.monthlyTaxable).toBe(5_000_000);
    expect(base.tax.incomeTax).toBe(219_100);
    expect(kids.tax.incomeTax).toBe(219_100 - 45_830);
  });

  it("page list is sorted, unique and in range", () => {
    expect(SALARY_PAGE_MANWON[0]).toBe(1_500);
    expect(new Set(SALARY_PAGE_MANWON).size).toBe(SALARY_PAGE_MANWON.length);
    expect([...SALARY_PAGE_MANWON].sort((a, b) => a - b)).toEqual(SALARY_PAGE_MANWON);
    expect(SALARY_PAGE_MANWON).toContain(10_000);
    expect(SALARY_PAGE_MANWON).toContain(4_200);
  });
});
