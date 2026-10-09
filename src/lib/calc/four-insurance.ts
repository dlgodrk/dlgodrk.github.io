/**
 * 4대보험 계산기: 근로자 부담분 + 사업주 부담분 (2026).
 *
 * The employee share comes from the verified engine `employeeInsurance()` in src/lib/rates/insurance.ts
 * (reproduces the official 4insure.or.kr simulator, see insurance.test.ts). This file adds the employer side.
 * Integer arithmetic only (floating 3,000,000 × 0.009 = 26,999.999… would truncate to 26,990).
 *
 * Employer rules (checked 2026-10-09; docs/research/insurance-2026.md):
 * - 국민연금 부담금 = 기여금 (4.75% each, each share 10원 미만 절사 separately; NPS 사업장 실무안내).
 * - 건강보험·장기요양 사업주분 = 근로자분 (7.19% / 장기요양 split 50:50, 같은 상·하한).
 * - 고용보험 사업주 = 실업급여 0.9% + 고용안정·직업능력개발 0.25% / 0.45% / 0.65% / 0.85% by company size.
 *   The two premiums are separate items and are each cut below 10원, then summed. This matches 4insure:
 *   4,321,987원 → 38,890 + 10,800 = 49,690원 (a single 1.15% cut would give 49,700).
 *   65세 이후 새로 고용된 근로자는 실업급여 보험료(근로자·사업주)를 내지 않지만 사업주의 고용안정·직능 몫은 그대로 냅니다.
 * - 산재보험: 사업주만 부담. 2026년 평균 1.47% (사업종류별 요율 + 출퇴근재해 0.06% 포함,
 *   고용노동부 「2026년도 산재보험료율」 고시, 2025-12-31). 업종마다 다르므로 사용자가 바꿀 수 있습니다. 10원 미만 절사.
 *
 * 2027 status (as of 2026-10-09): 국민연금 근로자 5.0% (법정 인상), 건강보험료율 7.19% 동결 (2026-09-08 건정심 의결,
 * 고시 전). 장기요양·고용보험 요율과 간이세액표는 미정이라 2026년 값으로 가정한 '예상'으로만 다룹니다.
 */
import { employeeInsurance, pensionBounds } from "@/lib/rates/insurance";

/** Static pages use this fixed pay month; the client calculator follows the visitor's month. */
export const PAGE_PAY_MONTH = "2026-10";

/** First pay month whose 장기요양보험료 is 건강보험료 × 0.1314 (노인장기요양보험법 법률 제21690호). Mirrors insurance.ts. */
export const LTC_ROUNDED_FROM = "2026-11";

/** First pay month of the 2026.7~2027.6 국민연금 기준소득월액 상·하한. Mirrors insurance.ts. */
export const PENSION_BOUNDS_SWITCH = "2026-07";

/** 사업장 규모 (URL values). */
export type CompanySize = "s" | "p" | "m" | "l";

/** 고용안정·직업능력개발사업 보험료율 in units of 0.01% (25 = 0.25%). */
export const COMPANY_SIZES: { value: CompanySize; label: string; short: string; rate: number }[] = [
  { value: "s", label: "150명 미만", short: "150명 미만", rate: 25 },
  { value: "p", label: "150명 이상 우선지원대상기업", short: "우선지원대상", rate: 45 },
  { value: "m", label: "150명 이상 1,000명 미만", short: "1,000명 미만", rate: 65 },
  { value: "l", label: "1,000명 이상·국가·지방자치단체", short: "1,000명 이상", rate: 85 },
];

export function normalizeSize(v: string): CompanySize {
  return COMPANY_SIZES.some((s) => s.value === v) ? (v as CompanySize) : "s";
}

export function sizeInfo(size: CompanySize) {
  return COMPANY_SIZES.find((s) => s.value === size) ?? COMPANY_SIZES[0];
}

/** 2026년 평균 산재보험료율 (%), 출퇴근재해 요율 포함. */
export const INDUSTRIAL_AVG_RATE = 1.47;
/** 출퇴근재해 요율 (%), 전 업종 공통 (1천분의 0.6). */
export const COMMUTE_ACCIDENT_RATE = 0.06;
/** Input cap for the 산재 rate (%). The highest 2026 사업종류 (석탄광업 및 채석업) is 18.5% + 0.06%. */
export const MAX_INDUSTRIAL_RATE = 30;

/** Input caps: 월급 10억원, 연봉 100억원 (만원). */
export const MAX_MONTHLY_WON = 1_000_000_000;
export const MAX_ANNUAL_MANWON = 1_000_000;
export const MAX_NON_TAXABLE = 100_000_000;

/** 월 보수 (만원) that get their own page: /four-insurance/<만원>/ — 200만~1,000만원, 50만원 간격. */
export const FOUR_INSURANCE_PAGE_MANWON: number[] = Array.from({ length: (1_000 - 200) / 50 + 1 }, (_, i) => 200 + i * 50);

export type Share = { employee: number; employer: number; total: number };

const share = (employee: number, employer: number): Share => ({ employee, employer, total: employee + employer });

export type FourInsuranceInput = {
  /** 세전 월 급여 (비과세 포함), 원 */
  monthlyGross: number;
  /** 월 비과세 (식대 등), 원. Clamped to [0, monthlyGross]. */
  nonTaxable?: number;
  /** "YYYY-MM" pay month (pension caps, 장기요양 rounding) */
  payMonth: string;
  size?: CompanySize;
  /** 산재보험료율 (%), e.g. 1.47. Empty/invalid counts as 0. */
  industrialRate?: number;
  /** 국민연금 제외 (예: 만 60세 이상으로 사업장가입자가 아닌 경우) */
  pensionExempt?: boolean;
  /** 65세 이후 새로 고용: 실업급여 보험료 제외 (사업주의 고용안정·직능 보험료는 그대로) */
  employmentExempt?: boolean;
};

export type FourInsuranceResult = {
  monthlyGross: number;
  nonTaxable: number;
  /** 보수월액 = 세전 월 급여 − 비과세 */
  pay: number;
  payMonth: string;
  size: CompanySize;
  /** 산재보험료율 actually applied (%) */
  industrialRate: number;
  /** 국민연금 기준소득월액 (천원 미만 절사, 상·하한 적용) */
  pensionBase: number;
  pensionLimit: "cap" | "floor" | null;
  pension: Share;
  health: Share;
  longTermCare: Share;
  /** 고용보험 실업급여 (근로자 0.9% + 사업주 0.9%) */
  unemployment: Share;
  /** 고용보험 고용안정·직업능력개발 (사업주만) */
  jobStability: Share;
  /** 고용보험 합계 */
  employment: Share;
  /** 산재보험 (사업주만) */
  industrial: Share;
  employeeTotal: number;
  employerTotal: number;
  total: number;
  /** 회사 월 인건비 = 세전 월 급여 + 사업주 부담 합계. 퇴직금 적립분·임금채권부담금은 포함하지 않음 (UI must say so). */
  laborCost: number;
};

/** 산재 rate (%) → integer units of 0.001%, clamped to [0, MAX]. */
export function industrialRateUnits(ratePct: number | undefined): number {
  if (ratePct === undefined || !Number.isFinite(ratePct) || ratePct <= 0) return 0;
  return Math.round(Math.min(ratePct, MAX_INDUSTRIAL_RATE) * 1000);
}

/** Whether the 국민연금 기준소득월액 상·하한 changed the base for this pay. */
export function pensionLimitOf(pay: number, payMonth: string): "cap" | "floor" | null {
  if (!(pay > 0)) return null;
  const { low, high } = pensionBounds(payMonth);
  const base = Math.floor(pay / 1000) * 1000;
  if (base > high) return "cap";
  if (base < low) return "floor";
  return null;
}

export function calcFourInsurance(input: FourInsuranceInput): FourInsuranceResult {
  const monthlyGross = Number.isFinite(input.monthlyGross) ? Math.max(0, Math.floor(input.monthlyGross)) : 0;
  const nonTaxableRaw = Number.isFinite(input.nonTaxable) ? Math.max(0, Math.floor(input.nonTaxable ?? 0)) : 0;
  const nonTaxable = Math.min(nonTaxableRaw, monthlyGross);
  const pay = monthlyGross - nonTaxable;
  const size = normalizeSize(input.size ?? "s");
  const rateUnits = industrialRateUnits(input.industrialRate);

  const emp = employeeInsurance(pay, input.payMonth, {
    pensionExempt: input.pensionExempt,
    employmentExempt: input.employmentExempt,
  });

  // 국민연금·건강·장기요양: the employer pays the same truncated amount as the employee.
  const pension = share(emp.pension, emp.pension);
  const health = share(emp.health, emp.health);
  const longTermCare = share(emp.longTermCare, emp.longTermCare);

  // 고용보험: 실업급여 0.9% each (floor10), plus the employer-only 고용안정·직능 X% (floor10), cut separately.
  const unemploymentEmployer = input.employmentExempt ? 0 : Math.floor((pay * 9) / 10_000) * 10;
  const unemployment = share(emp.employment, unemploymentEmployer);
  const jobStability = share(0, Math.floor((pay * sizeInfo(size).rate) / 100_000) * 10);
  const employment = share(unemployment.employee, unemployment.employer + jobStability.employer);

  // 산재보험: employer only, floor10(pay × rate%) = floor(pay × units / 1,000,000) × 10 with units of 0.001%.
  const industrial = share(0, Math.floor((pay * rateUnits) / 1_000_000) * 10);

  const employeeTotal = pension.employee + health.employee + longTermCare.employee + employment.employee;
  const employerTotal =
    pension.employer + health.employer + longTermCare.employer + employment.employer + industrial.employer;

  return {
    monthlyGross,
    nonTaxable,
    pay,
    payMonth: input.payMonth,
    size,
    industrialRate: rateUnits / 1000,
    pensionBase: input.pensionExempt ? 0 : emp.pensionBase,
    pensionLimit: input.pensionExempt ? null : pensionLimitOf(pay, input.payMonth),
    pension,
    health,
    longTermCare,
    unemployment,
    jobStability,
    employment,
    industrial,
    employeeTotal,
    employerTotal,
    total: employeeTotal + employerTotal,
    laborCost: monthlyGross + employerTotal,
  };
}

/** Page assumptions: 비과세 없음, 150명 미만, 산재 평균 1.47%, 2026년 10월분. */
export function pageResult(monthlyWon: number, overrides: Partial<FourInsuranceInput> = {}): FourInsuranceResult {
  return calcFourInsurance({
    monthlyGross: monthlyWon,
    nonTaxable: 0,
    payMonth: PAGE_PAY_MONTH,
    size: "s",
    industrialRate: INDUSTRIAL_AVG_RATE,
    ...overrides,
  });
}

/** 연봉 (만원) → 세전 월 급여 (원, 원 미만 버림). */
export function monthlyFromAnnualManwon(annualManwon: number): number {
  if (!Number.isFinite(annualManwon) || annualManwon <= 0) return 0;
  return Math.floor(Math.round(annualManwon * 10_000) / 12);
}

/** 세전 월 급여 (원) → 연봉 (만원, 만원 단위 반올림). */
export function annualManwonFromMonthly(monthlyWon: number): number {
  if (!Number.isFinite(monthlyWon) || monthlyWon <= 0) return 0;
  return Math.round((monthlyWon * 12) / 10_000);
}

/** "2026-10" → "2026년 10월" */
export function payMonthLabel(payMonth: string): string {
  const [y, m] = payMonth.split("-");
  return `${Number(y)}년 ${Number(m)}월`;
}

/** Rule periods the user can pick instead of the automatic current month. */
export const RULE_PERIODS: { value: string; label: string }[] = [
  { value: "2026-01", label: "2026년 1~6월분" },
  { value: "2026-07", label: "2026년 7~10월분" },
  { value: "2026-11", label: "2026년 11~12월분" },
];

/** The pay month to apply: a picked period, or the automatic month (rulePayMonth of today). */
export function resolvePayMonth(picked: string, autoMonth: string): string {
  return RULE_PERIODS.some((p) => p.value === picked) ? picked : autoMonth;
}

/** "2026년 10월분" or, for a picked period, its range label. */
export function periodLabel(picked: string, payMonth: string): string {
  return RULE_PERIODS.find((p) => p.value === picked)?.label ?? `${payMonthLabel(payMonth)}분`;
}

/** Multiplier on 건강보험료 that gives 장기요양보험료 in a pay month, as text. */
export function longTermCareNote(payMonth: string): string {
  return payMonth < LTC_ROUNDED_FROM ? "건강보험료 × 0.9448/7.19" : "건강보험료 × 13.14%";
}

/**
 * 2027년 1월분 '예상' (as of 2026-10-09): 국민연금 5.0% each (법정), 기준소득월액 상·하한은 2026.7~2027.6 값.
 * 건강보험 7.19% 동결 (건정심 의결, 고시 전). 장기요양·고용보험 요율과 산재보험료율(2027년분은 12월 말 고시)은 미정이라
 * 2026년 값(11월분 규칙, 산재 평균 1.47%)으로 가정. Pages that show this must say all of these are assumed.
 */
export function estimate2027(monthlyWon: number, overrides: Partial<FourInsuranceInput> = {}): FourInsuranceResult {
  const r = pageResult(monthlyWon, { payMonth: "2026-12", ...overrides });
  if (overrides.pensionExempt) return r;
  // 기준소득월액 × 5.0%, 10원 미만 절사 = floor(base × 500 / 100,000) × 10
  const p = r.pensionBase > 0 ? Math.floor((r.pensionBase * 500) / 100_000) * 10 : 0;
  const diff = p - r.pension.employee;
  return {
    ...r,
    pension: share(p, p),
    employeeTotal: r.employeeTotal + diff,
    employerTotal: r.employerTotal + diff,
    total: r.total + 2 * diff,
    laborCost: r.laborCost + diff,
  };
}
