import { describe, expect, it } from "vitest";
import official from "@/lib/rates/__fixtures__/4insure-2026-10.json";
import {
  annualManwonFromMonthly,
  calcFourInsurance,
  estimate2027,
  FOUR_INSURANCE_PAGE_MANWON,
  industrialRateUnits,
  monthlyFromAnnualManwon,
  pageResult,
  periodLabel,
  resolvePayMonth,
} from "./four-insurance";

const base = { payMonth: "2026-10", size: "s" as const, industrialRate: 1.47 };

describe("calcFourInsurance: employee shares (official 4insure vectors, 2026-10)", () => {
  // Source: 4insure.or.kr 4대보험 모의계산 API (selectInscSmlCalcAjax.do), queried 2026-10-09.
  it("reproduces every official employee-share row", () => {
    for (const [pay, pension, health, ltc, employment] of official.rows as number[][]) {
      const r = calcFourInsurance({ monthlyGross: pay, ...base });
      // 4insure clamps 보수월액 above ~127.7M/month (4,591,730); we follow the 고시 premium cap 4,591,740.
      const expectedHealth = pay > 127_725_730 ? 4_591_740 : health;
      expect([pay, r.pension.employee, r.health.employee, r.longTermCare.employee, r.employment.employee]).toEqual([
        pay,
        pension,
        expectedHealth,
        ltc,
        employment,
      ]);
      expect(r.employeeTotal).toBe(pension + expectedHealth + ltc + employment);
    }
  });

  it("gives the employer the same 국민연금·건강·장기요양 amounts", () => {
    for (const [pay] of official.rows as number[][]) {
      const r = calcFourInsurance({ monthlyGross: pay, ...base });
      expect(r.pension.employer).toBe(r.pension.employee);
      expect(r.health.employer).toBe(r.health.employee);
      expect(r.longTermCare.employer).toBe(r.longTermCare.employee);
      // 실업급여 0.9% is also the same on both sides.
      expect(r.unemployment.employer).toBe(r.unemployment.employee);
    }
  });
});

describe("calcFourInsurance: employer 고용보험", () => {
  // 4insure employer outputs (<150인): 3,000,000 → 34,500; 4,321,987 → 38,890 + 10,800 = 49,690; 5,000,000 → 57,500.
  it("matches the 4insure employer 고용보험 vectors at <150인", () => {
    expect(calcFourInsurance({ monthlyGross: 3_000_000, ...base }).employment.employer).toBe(34_500);
    const r = calcFourInsurance({ monthlyGross: 4_321_987, ...base });
    expect(r.unemployment.employer).toBe(38_890);
    expect(r.jobStability.employer).toBe(10_800);
    expect(r.employment.employer).toBe(49_690); // a single 1.15% cut would give 49,700
    expect(calcFourInsurance({ monthlyGross: 5_000_000, ...base }).employment.employer).toBe(57_500);
  });

  it("applies the 고용안정·직능 rate by company size", () => {
    const at = (size: "s" | "p" | "m" | "l") => calcFourInsurance({ monthlyGross: 3_000_000, ...base, size }).employment.employer;
    expect(at("s")).toBe(27_000 + 7_500); // 0.25%
    expect(at("p")).toBe(27_000 + 13_500); // 0.45%
    expect(at("m")).toBe(27_000 + 19_500); // 0.65%
    expect(at("l")).toBe(27_000 + 25_500); // 0.85%
  });

  it("keeps the employer 고용안정·직능 share when 실업급여 is exempt (65세 이후 고용)", () => {
    const r = calcFourInsurance({ monthlyGross: 3_000_000, ...base, employmentExempt: true });
    expect(r.unemployment.employee).toBe(0);
    expect(r.unemployment.employer).toBe(0);
    expect(r.jobStability.employer).toBe(7_500);
    expect(r.employment.employer).toBe(7_500);
  });
});

describe("calcFourInsurance: 산재보험, totals and options", () => {
  it("charges 산재 to the employer only, floor10(pay × rate)", () => {
    const r = calcFourInsurance({ monthlyGross: 3_000_000, ...base });
    expect(r.industrial).toEqual({ employee: 0, employer: 44_100, total: 44_100 });
    expect(calcFourInsurance({ monthlyGross: 3_456_789, ...base }).industrial.employer).toBe(50_810); // 50,814.79
    expect(calcFourInsurance({ monthlyGross: 3_000_000, ...base, industrialRate: 0.66 }).industrial.employer).toBe(19_800);
    expect(calcFourInsurance({ monthlyGross: 3_000_000, ...base, industrialRate: Number.NaN }).industrial.employer).toBe(0);
  });

  it("converts the 산재 rate to integer units without float drift", () => {
    expect(industrialRateUnits(1.47)).toBe(1470);
    expect(industrialRateUnits(0.06)).toBe(60);
    expect(industrialRateUnits(18.56)).toBe(18_560);
    expect(industrialRateUnits(99)).toBe(30_000);
    expect(industrialRateUnits(-1)).toBe(0);
  });

  it("totals 월급 300만원 (2026년 10월분, 150명 미만, 산재 1.47%)", () => {
    const r = pageResult(3_000_000);
    expect(r.employeeTotal).toBe(291_520);
    // 142,500 + 107,850 + 14,170 + 34,500 + 44,100
    expect(r.employerTotal).toBe(343_120);
    expect(r.total).toBe(634_640);
    expect(r.laborCost).toBe(3_343_120);
  });

  it("subtracts 비과세 from the premium base but not from the labor cost", () => {
    const r = calcFourInsurance({ monthlyGross: 3_200_000, nonTaxable: 200_000, ...base });
    expect(r.pay).toBe(3_000_000);
    expect(r.employeeTotal).toBe(291_520);
    expect(r.laborCost).toBe(3_200_000 + 343_120);
    const over = calcFourInsurance({ monthlyGross: 100_000, nonTaxable: 500_000, ...base });
    expect(over.nonTaxable).toBe(100_000);
    expect(over.total).toBe(0);
  });

  it("drops both 국민연금 shares when exempt", () => {
    const r = calcFourInsurance({ monthlyGross: 3_000_000, ...base, pensionExempt: true });
    expect(r.pension).toEqual({ employee: 0, employer: 0, total: 0 });
    expect(r.pensionLimit).toBeNull();
    expect(r.employeeTotal).toBe(291_520 - 142_500);
  });

  it("uses the January–June 2026 pension cap and the November 장기요양 rounding", () => {
    const jan = calcFourInsurance({ monthlyGross: 7_000_000, ...base, payMonth: "2026-03" });
    expect(jan.pension.employer).toBe(302_570);
    expect(jan.pensionLimit).toBe("cap");
    const jul = calcFourInsurance({ monthlyGross: 7_000_000, ...base, payMonth: "2026-07" });
    expect(jul.pension.employer).toBe(313_020);
    expect(calcFourInsurance({ monthlyGross: 5_000_000, ...base }).longTermCare.employer).toBe(23_620);
    expect(calcFourInsurance({ monthlyGross: 5_000_000, ...base, payMonth: "2026-11" }).longTermCare.employer).toBe(23_610);
    expect(calcFourInsurance({ monthlyGross: 350_000, ...base }).pensionLimit).toBe("floor");
  });

  it("returns zeros for empty pay", () => {
    const r = calcFourInsurance({ monthlyGross: Number.NaN, ...base });
    expect(r.total).toBe(0);
    expect(r.laborCost).toBe(0);
  });
});

describe("helpers", () => {
  it("converts 연봉 ↔ 월급", () => {
    expect(monthlyFromAnnualManwon(3_600)).toBe(3_000_000);
    expect(monthlyFromAnnualManwon(4_000)).toBe(3_333_333);
    expect(annualManwonFromMonthly(3_000_000)).toBe(3_600);
    expect(annualManwonFromMonthly(3_333_333)).toBe(4_000);
  });

  it("resolves the rule month", () => {
    expect(resolvePayMonth("", "2026-10")).toBe("2026-10");
    expect(resolvePayMonth("2026-01", "2026-10")).toBe("2026-01");
    expect(resolvePayMonth("2025-05", "2026-10")).toBe("2026-10");
    expect(periodLabel("", "2026-10")).toBe("2026년 10월분");
    expect(periodLabel("2026-11", "2026-11")).toBe("2026년 11~12월분");
  });

  it("lists 17 pages from 200만 to 1,000만원", () => {
    expect(FOUR_INSURANCE_PAGE_MANWON).toHaveLength(17);
    expect(FOUR_INSURANCE_PAGE_MANWON[0]).toBe(200);
    expect(FOUR_INSURANCE_PAGE_MANWON.at(-1)).toBe(1_000);
  });

  it("estimates 2027 with 국민연금 5.0% and the rest at 2026 values", () => {
    const r = estimate2027(3_000_000);
    expect(r.pension.employee).toBe(150_000);
    expect(r.pension.employer).toBe(150_000);
    expect(r.employeeTotal).toBe(150_000 + 107_850 + 14_170 + 27_000);
    // Capped base 6,590,000 × 5% = 329,500
    expect(estimate2027(10_000_000).pension.employee).toBe(329_500);
  });
});
