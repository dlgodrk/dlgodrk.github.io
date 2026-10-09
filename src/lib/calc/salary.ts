import { employeeInsurance, type InsuranceBreakdown } from "@/lib/rates/insurance";
import { monthlyWithholding, type Withholding, type WithholdingRatio } from "@/lib/rates/withholding";

/**
 * 연봉 → 월 실수령액 (2026).
 * Monthly take-home = 월 지급액 − (4대보험 근로자분 + 소득세 + 지방소득세).
 * 4대보험 and 간이세액 are computed on 월 과세급여 = 월 지급액 − 비과세.
 */
export type SalaryInput = {
  /** 연봉 (원) */
  annual: number;
  /** true when the 연봉 includes 퇴직금 (divide by 13 instead of 12) */
  severanceIncluded?: boolean;
  /** 월 비과세 금액 (원), e.g. 식대 200,000 */
  nonTaxable?: number;
  /** 공제대상가족 수 (본인 포함) */
  family?: number;
  /** 그중 8세 이상 20세 이하 자녀 수 */
  children?: number;
  ratio?: WithholdingRatio;
  /** "YYYY-MM" pay month for rule selection */
  payMonth?: string;
};

export type SalaryResult = {
  monthlyGross: number;
  monthlyTaxable: number;
  nonTaxable: number;
  insurance: InsuranceBreakdown;
  tax: Withholding;
  /** 공제액 합계 */
  deductions: number;
  monthlyNet: number;
  /** 월 실수령액 × 12 (연말정산 환급·추징 제외) */
  annualNet: number;
  /** 공제액 / 월 지급액 */
  deductionRate: number;
};

export const DEFAULT_NON_TAXABLE = 200_000;
export const DEFAULT_PAY_MONTH = "2026-10";

export function calcSalary(input: SalaryInput): SalaryResult {
  const annual = Math.max(0, Math.floor(input.annual || 0));
  const months = input.severanceIncluded ? 13 : 12;
  const monthlyGross = Math.floor(annual / months);
  const nonTaxable = Math.min(Math.max(0, Math.floor(input.nonTaxable ?? DEFAULT_NON_TAXABLE)), monthlyGross);
  const monthlyTaxable = monthlyGross - nonTaxable;
  const payMonth = input.payMonth ?? DEFAULT_PAY_MONTH;
  const insurance = employeeInsurance(monthlyTaxable, payMonth);
  const tax = monthlyWithholding(monthlyTaxable, input.family ?? 1, input.children ?? 0, input.ratio ?? 100, payMonth);
  const deductions = insurance.total + tax.total;
  const monthlyNet = monthlyGross - deductions;
  return {
    monthlyGross,
    monthlyTaxable,
    nonTaxable,
    insurance,
    tax,
    deductions,
    monthlyNet,
    annualNet: monthlyNet * 12,
    deductionRate: monthlyGross > 0 ? deductions / monthlyGross : 0,
  };
}

/**
 * 연봉 (만원) values that get their own page at /salary/<만원>/.
 * 1,500만~1억: 100만원 간격 / 1억~2억: 500만원 간격 / 2억 이상 일부.
 */
export const SALARY_PAGE_MANWON: number[] = [
  ...Array.from({ length: (10_000 - 1_500) / 100 + 1 }, (_, i) => 1_500 + i * 100),
  ...Array.from({ length: (20_000 - 10_500) / 500 + 1 }, (_, i) => 10_500 + i * 500),
  25_000,
  30_000,
];
