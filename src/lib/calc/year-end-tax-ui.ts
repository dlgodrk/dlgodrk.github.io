import { formatNumber } from "@/lib/format";
import type { WithholdingRatio } from "@/lib/rates/withholding";
import {
  calcYearEndTax,
  estimateAnnualInsurance,
  estimatePrepaidTax,
  MAX_TOTAL_PAY,
  type ExtraPersonal,
  type YearEndTaxInput,
  type YearEndTaxResult,
} from "./year-end-tax";

/**
 * Form → engine glue for the 연말정산 calculator. Pure functions only.
 * 총급여 is entered in 만원 (like the salary tool); every other amount in 원.
 */

/** a = 급여로 추정, m = 직접 입력 */
export type AmountMode = "a" | "m";

/**
 * 2026년 말 주택 상황. h = 무주택 세대의 세대주 또는 그 배우자 (주택청약·월세),
 * m = 무주택 세대의 세대원 (세대주가 주택 관련 공제를 받지 않으면 월세만), n = 해당 없음.
 */
export type HomeStatus = "n" | "h" | "m";

export const MAX_TOTAL_PAY_MANWON = MAX_TOTAL_PAY / 10_000;
/** Cap for any single 원 amount field: 100억. */
export const MAX_AMOUNT = 10_000_000_000;
export const MAX_FAMILY = 11;

export const TOTAL_PAY_PRESETS_MANWON = [3_000, 4_000, 5_000, 6_000, 7_000, 8_000, 10_000];

export type YearEndForm = {
  totalPayManwon: number;
  family: number;
  children: number;
  /** 자녀세액공제 대상 (2006~2016년생) */
  creditChildren: number;
  /** 2017·2018년생: 간이세액표(8세 이상)로는 매달 공제받았지만 2026 귀속 자녀세액공제에서는 빠지는 자녀 */
  tableChildren: number;
  seniors: number;
  disabled: number;
  extra: ExtraPersonal;
  birthOrder: number;
  married: boolean;
  credit: number;
  debit: number;
  culture: number;
  market: number;
  transit: number;
  home: HomeStatus;
  housingSubscription: number;
  rent: number;
  pensionSavings: number;
  irp: number;
  insurancePremium: number;
  medicalSelf: number;
  medicalOther: number;
  education: number;
  donation: number;
  religiousDonation: number;
  hometownDonation: number;
  insuranceMode: AmountMode;
  pensionManual: number;
  healthManual: number;
  prepaidMode: AmountMode;
  ratio: number;
  prepaidManual: number;
};

/** Default form: the example rendered in the static HTML (총급여 5,000만원, 1인, 카드 2,000만원). */
export const DEFAULT_FORM: YearEndForm = {
  totalPayManwon: 5_000,
  family: 1,
  children: 0,
  creditChildren: 0,
  tableChildren: 0,
  seniors: 0,
  disabled: 0,
  extra: "n",
  birthOrder: 0,
  married: false,
  credit: 15_000_000,
  debit: 5_000_000,
  culture: 0,
  market: 0,
  transit: 0,
  home: "n",
  housingSubscription: 0,
  rent: 0,
  pensionSavings: 0,
  irp: 0,
  insurancePremium: 0,
  medicalSelf: 0,
  medicalOther: 0,
  education: 0,
  donation: 0,
  religiousDonation: 0,
  hometownDonation: 0,
  insuranceMode: "a",
  pensionManual: Number.NaN,
  healthManual: Number.NaN,
  prepaidMode: "a",
  ratio: 100,
  prepaidManual: Number.NaN,
};

const int = (n: number, max = MAX_AMOUNT) => (Number.isFinite(n) ? Math.min(Math.max(Math.floor(n), 0), max) : 0);

export function clampFamily(n: number): number {
  return Math.min(Math.max(Number.isFinite(n) ? Math.floor(n) : 1, 1), MAX_FAMILY);
}

/** 기본공제 받는 자녀는 본인을 뺀 인원을 넘을 수 없다. */
export function clampChildren(n: number, family: number): number {
  return Math.min(int(n, 100), clampFamily(family) - 1);
}

/** 자녀세액공제 대상(2006~2016년생)은 기본공제 자녀 수를 넘을 수 없다. */
export function clampCreditChildren(n: number, children: number): number {
  return Math.min(int(n, 100), Math.max(0, children));
}

/** 2017·2018년생 자녀는 기본공제 자녀 중 자녀세액공제 대상을 뺀 인원을 넘을 수 없다. */
export function clampTableChildren(n: number, children: number, creditChildren: number): number {
  return Math.min(int(n, 100), Math.max(0, children - creditChildren));
}

/** URL value → HomeStatus. Older links stored a boolean 무주택 세대주 flag ("1"/"true"). */
export function normalizeHome(v: string): HomeStatus {
  if (v === "h" || v === "m") return v;
  return v === "1" || v === "true" ? "h" : "n";
}

/** 경로우대·장애인 인원은 기본공제 인원을 넘을 수 없다. */
export function clampMembers(n: number, family: number): number {
  return Math.min(int(n, 100), clampFamily(family));
}

export function normalizeRatio(r: number): WithholdingRatio {
  return r === 80 || r === 120 ? r : 100;
}

export function normalizeBirthOrder(n: number): 0 | 1 | 2 | 3 {
  return n === 1 || n === 2 || n === 3 ? n : 0;
}

export type FormResult = {
  input: YearEndTaxInput;
  result: YearEndTaxResult;
  insuranceEstimate: ReturnType<typeof estimateAnnualInsurance>;
  prepaidEstimate: ReturnType<typeof estimatePrepaidTax>;
  /** 2017·2018년생 자녀 수 (간이세액표 자녀 공제만 받은 자녀) */
  tableChildren: number;
  /** 문화체육 칸 금액이 총급여 7천만원 초과라 신용카드 15%로 계산됐는지 */
  cultureAsCredit: boolean;
};

/** Builds the engine input (auto-estimating 4대보험 and 기납부세액 when asked) and runs it. */
export function yearEndFromForm(f: YearEndForm): FormResult | null {
  const totalPay = Number.isFinite(f.totalPayManwon) ? Math.round(f.totalPayManwon * 10_000) : 0;
  if (totalPay <= 0 || totalPay > MAX_TOTAL_PAY) return null;
  const family = clampFamily(f.family);
  const children = clampChildren(f.children, family);
  const creditChildren = clampCreditChildren(f.creditChildren, children);
  const tableChildren = clampTableChildren(f.tableChildren, children, creditChildren);
  const insuranceEstimate = estimateAnnualInsurance(totalPay);
  // 간이세액표는 8세 이상 20세 이하 자녀(2006~2018년생)를 공제하므로 2017·2018년생도 더한다.
  const prepaidEstimate = estimatePrepaidTax(totalPay, family, creditChildren + tableChildren, normalizeRatio(f.ratio));
  const manualIns = f.insuranceMode === "m";
  const manualPrepaid = f.prepaidMode === "m";
  const input: YearEndTaxInput = {
    totalPay,
    family,
    children,
    creditChildren,
    seniors: clampMembers(f.seniors, family),
    disabled: clampMembers(f.disabled, family),
    extraPersonal: f.extra === "w" || f.extra === "s" ? f.extra : "n",
    birthOrder: normalizeBirthOrder(f.birthOrder),
    married: f.married,
    pension: manualIns ? int(f.pensionManual) : insuranceEstimate.pension,
    healthEmployment: manualIns ? int(f.healthManual) : insuranceEstimate.healthEmployment,
    cards: { credit: int(f.credit), debit: int(f.debit), culture: int(f.culture), market: int(f.market), transit: int(f.transit) },
    homelessHead: f.home === "h",
    homelessMember: f.home === "m",
    housingSubscription: int(f.housingSubscription),
    rent: int(f.rent),
    pensionSavings: int(f.pensionSavings),
    irp: int(f.irp),
    insurancePremium: int(f.insurancePremium),
    medicalSelf: int(f.medicalSelf),
    medicalOther: int(f.medicalOther),
    education: int(f.education),
    donation: int(f.donation),
    religiousDonation: int(f.religiousDonation),
    hometownDonation: int(f.hometownDonation),
    prepaidIncomeTax: manualPrepaid ? int(f.prepaidManual) : prepaidEstimate.incomeTax,
    prepaidLocalTax: manualPrepaid ? undefined : prepaidEstimate.localTax,
  };
  const result = calcYearEndTax(input);
  if (!result) return null;
  const cultureAsCredit = !result.card.cultureSeparate && int(f.culture) > 0;
  return { input, result, insuranceEstimate, prepaidEstimate, tableChildren, cultureAsCredit };
}

/** Sum of the 원 amounts in a list, ignoring empty boxes. */
export function sumAmounts(...xs: number[]): number {
  return xs.reduce((a, x) => a + int(x), 0);
}

/** "1,500만원" style short label for group summaries (원 → 만원 floor, keeps 억). */
export function shortWon(won: number): string {
  const v = int(won);
  if (v === 0) return "0원";
  if (v < 10_000) return `${formatNumber(v)}원`;
  const man = Math.floor(v / 10_000);
  const eok = Math.floor(man / 10_000);
  const rest = man % 10_000;
  if (eok === 0) return `${formatNumber(man)}만원`;
  return rest ? `${formatNumber(eok)}억 ${formatNumber(rest)}만원` : `${formatNumber(eok)}억원`;
}
