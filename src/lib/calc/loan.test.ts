import { describe, expect, it } from "vitest";
import {
  calcLoan,
  compareMethods,
  dayCountGap,
  equalPaymentAmount,
  equalPaymentSummary,
  LOAN_PAGE_MANWON,
  LOAN_TABLE_RATES,
  loanAmountLabel,
  loanDefaultYears,
  loanPageHeadline,
  loanTableYears,
  monthlyRate,
  REPAY_METHODS,
  sanitizeDecimalDraft,
  validateLoan,
  type LoanInput,
} from "./loan";

/*
 * Reference vectors: the closed-form annuity formula, identical to Excel/Google Sheets
 * =PMT(rate/12, n, -P) and to the 월 상환액 calculators of Korean banks and 한국주택금융공사
 * (https://www.hf.go.kr/ko/sub01/sub01_06_03.do), which all use 연 이율 ÷ 12 as the monthly rate.
 *   PMT(4%/12, 360, -100,000,000) = 477,415.30
 *   PMT(5%/12,  36,  -10,000,000) = 299,708.97
 *   PMT(5%/12,  60,  -30,000,000) = 566,137.01
 *   PMT(4%/12, 348, -100,000,000) = 485,973.47   (30년 중 거치 1년 → 29년 분할상환)
 * 원금균등 total interest (closed form) = P · r · (n + 1) / 2.
 */

const sumOf = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("monthly rate and PMT", () => {
  it("uses annual rate / 12", () => {
    expect(monthlyRate(4)).toBeCloseTo(0.04 / 12, 15);
    expect(monthlyRate(0)).toBe(0);
  });
  it("matches spreadsheet PMT values", () => {
    expect(equalPaymentAmount(100_000_000, monthlyRate(4), 360)).toBeCloseTo(477_415.3, 0);
    expect(equalPaymentAmount(10_000_000, monthlyRate(5), 36)).toBeCloseTo(299_708.97, 1);
    expect(equalPaymentAmount(30_000_000, monthlyRate(5), 60)).toBeCloseTo(566_137.01, 1);
  });
  it("handles a zero rate", () => {
    expect(equalPaymentAmount(12_000_000, 0, 12)).toBe(1_000_000);
  });
});

describe("원리금균등 (equal payment)", () => {
  const res = calcLoan({ principal: 100_000_000, annualRatePct: 4, months: 360, method: "equal-payment" });
  it("rounds the monthly payment to the won", () => {
    expect(res.firstPayment).toBe(477_415);
    expect(res.rows[0].interest).toBe(333_333);
    expect(res.rows[0].principal).toBe(477_415 - 333_333);
    expect(res.rows.slice(0, 359).every((r) => r.payment === 477_415)).toBe(true);
  });
  it("settles the remainder in the last installment", () => {
    expect(res.rows).toHaveLength(360);
    expect(res.rows[359].balance).toBe(0);
    expect(Math.abs(res.lastPayment - 477_415)).toBeLessThan(500);
  });
  it("total interest is close to the closed form (PMT·n − P)", () => {
    const exact = equalPaymentAmount(100_000_000, monthlyRate(4), 360) * 360 - 100_000_000; // ≈ 71,869,506
    expect(Math.abs(res.totalInterest - exact)).toBeLessThan(500);
    expect(res.totalPayment).toBe(100_000_000 + res.totalInterest);
  });
  it("keeps the last-installment settlement small for realistic loans", () => {
    // Fixed rounded payment + interest on the actual balance (bank style): the rounding error of the
    // payment grows with rate × term, so check the worst realistic corners.
    const realistic: [number, number, number][] = [
      [100_000_000, 4, 360],
      [100_000_000, 10, 360],
      [300_000_000, 6, 480],
      [500_000_000, 6, 600],
      [10_000_000, 15, 120],
      [1_234_567, 7.77, 32],
    ];
    for (const [principal, annualRatePct, months] of realistic) {
      const r = calcLoan({ principal, annualRatePct, months, method: "equal-payment" });
      expect(Math.abs(r.lastPayment - r.firstPayment)).toBeLessThan(2_000);
      expect(r.rows.slice(0, -1).every((row) => row.payment === r.firstPayment)).toBe(true);
    }
  });
  it("0%: splits the principal without running out early", () => {
    // 100,000원 / 600개월 = 166.67: 400회차 167원 + 200회차 166원 (no 0원 installments)
    const r = calcLoan({ principal: 100_000, annualRatePct: 0, months: 600, method: "equal-payment" });
    expect(r.rows.every((row) => row.payment === 166 || row.payment === 167)).toBe(true);
    expect(r.firstPayment).toBe(167);
    expect(r.lastPayment).toBe(166);
    expect(sumOf(r.rows.map((row) => row.principal))).toBe(100_000);
  });
  it("small personal-loan vectors", () => {
    expect(calcLoan({ principal: 10_000_000, annualRatePct: 5, months: 36, method: "equal-payment" }).firstPayment).toBe(299_709);
    expect(calcLoan({ principal: 30_000_000, annualRatePct: 5, months: 60, method: "equal-payment" }).firstPayment).toBe(566_137);
  });
});

describe("원금균등 (equal principal)", () => {
  const res = calcLoan({ principal: 100_000_000, annualRatePct: 4, months: 360, method: "equal-principal" });
  it("first month = P/n + one month of interest", () => {
    // 100,000,000 / 360 = 277,777.78 → floor 277,777, remainder 280원 → 회차 1~280 pay 277,778
    expect(res.rows[0].principal).toBe(277_778);
    expect(res.firstPayment).toBe(611_111);
    expect(res.rows.filter((r) => r.principal === 277_778)).toHaveLength(280);
    expect(res.rows.filter((r) => r.principal === 277_777)).toHaveLength(80);
  });
  it("payments fall every month and end near P/n", () => {
    for (let i = 1; i < 360; i++) expect(res.rows[i].payment).toBeLessThanOrEqual(res.rows[i - 1].payment);
    // last principal = 277,777; interest = round(277,777 × 0.04/12 = 925.92) = 926
    expect(res.rows[359].principal).toBe(277_777);
    expect(res.lastPayment).toBe(277_777 + 926);
    expect(res.monthlyDecrease).toBe(926);
  });
  it("small principal over a long term: every installment carries principal", () => {
    // 100,000원 / 600개월 = 166.67. The old round(P/m) = 167 ran out at 회차 599 and left 0원 rows.
    const r = calcLoan({ principal: 100_000, annualRatePct: 4, months: 600, method: "equal-principal" });
    expect(r.rows.every((row) => row.principal === 166 || row.principal === 167)).toBe(true);
    expect(r.rows[599].principal).toBe(166);
    expect(r.lastPayment).toBeGreaterThan(0);
    for (let i = 1; i < 600; i++) expect(r.rows[i].payment).toBeLessThanOrEqual(r.rows[i - 1].payment);
  });
  it("total interest is close to P·r·(n+1)/2", () => {
    const exact = (100_000_000 * monthlyRate(4) * 361) / 2; // 60,166,666.67
    expect(Math.abs(res.totalInterest - exact)).toBeLessThan(360);
  });
});

describe("만기일시 (bullet)", () => {
  const res = calcLoan({ principal: 100_000_000, annualRatePct: 4, months: 360, graceMonths: 24, method: "bullet" });
  it("pays interest only, then the principal at maturity", () => {
    expect(res.graceMonths).toBe(0); // grace does not apply
    expect(res.firstPayment).toBe(333_333);
    expect(res.rows[358].balance).toBe(100_000_000);
    expect(res.lastPayment).toBe(100_333_333);
  });
  it("total interest equals P × rate × years exactly (no per-month rounding drift)", () => {
    // 1억 × 4% × 30년 = 120,000,000 (summing 333,333 × 360 would give 119,999,880)
    expect(res.totalInterest).toBe(120_000_000);
    expect(res.rows.every((r) => r.interest === 333_333 || r.interest === 333_334)).toBe(true);
  });
  it("2-year 전세대출 style: 2억 3.5% 24개월", () => {
    const r = calcLoan({ principal: 200_000_000, annualRatePct: 3.5, months: 24, method: "bullet" });
    // 200,000,000 × 0.035 / 12 = 583,333.33 → first month 583,333; 2억 × 3.5% × 2년 = 14,000,000
    expect(r.firstPayment).toBe(583_333);
    expect(r.totalInterest).toBe(14_000_000);
  });
  it("one-month term: principal + one month of interest", () => {
    // 1억 × 3.5% ÷ 12 = 291,666.67 → 291,667
    const r = calcLoan({ principal: 100_000_000, annualRatePct: 3.5, months: 1, method: "bullet" });
    expect(r.rows).toHaveLength(1);
    expect(r.lastPayment).toBe(100_291_667);
  });
});

describe("거치기간 (grace period)", () => {
  it("interest-only months, then amortizes over the remaining term", () => {
    const res = calcLoan({ principal: 100_000_000, annualRatePct: 4, months: 360, graceMonths: 12, method: "equal-payment" });
    expect(res.graceMonths).toBe(12);
    expect(res.amortMonths).toBe(348);
    expect(res.gracePayment).toBe(333_333);
    expect(res.rows.slice(0, 12).every((r) => r.grace && r.principal === 0 && r.balance === 100_000_000)).toBe(true);
    expect(res.rows[12].grace).toBe(false);
    expect(res.firstPayment).toBe(485_973);
    expect(res.rows[359].balance).toBe(0);
  });
  it("grace interest sums to P × rate × grace months exactly", () => {
    const res = calcLoan({ principal: 100_000_000, annualRatePct: 4, months: 360, graceMonths: 12, method: "equal-principal" });
    // 1억 × 4% × 1년 = 4,000,000 (12 × 333,333 would be 3,999,996)
    expect(sumOf(res.rows.slice(0, 12).map((r) => r.interest))).toBe(4_000_000);
  });
  it("grace makes total interest larger", () => {
    const base = { principal: 50_000_000, annualRatePct: 4.5, months: 120 };
    for (const method of ["equal-payment", "equal-principal"] as const) {
      const noGrace = calcLoan({ ...base, method });
      const withGrace = calcLoan({ ...base, graceMonths: 24, method });
      expect(withGrace.totalInterest).toBeGreaterThan(noGrace.totalInterest);
      expect(withGrace.rows.slice(0, 24).every((r) => r.payment === 187_500)).toBe(true); // 5천만 × 4.5% / 12
    }
  });
});

describe("schedule invariants", () => {
  const cases: Omit<LoanInput, "method">[] = [
    { principal: 100_000_000, annualRatePct: 4, months: 360 },
    { principal: 1_234_567, annualRatePct: 7.77, months: 37, graceMonths: 5 },
    { principal: 500_000_000, annualRatePct: 6, months: 600, graceMonths: 36 },
    { principal: 10_000, annualRatePct: 19.99, months: 600 },
    { principal: 3_000_000, annualRatePct: 12, months: 1 },
    { principal: 12_000_000, annualRatePct: 0, months: 12, graceMonths: 2 },
  ];
  it.each(cases)("principal is fully repaid with consistent totals (%o)", (c) => {
    for (const method of REPAY_METHODS) {
      const res = calcLoan({ ...c, method });
      expect(res.rows).toHaveLength(c.months);
      expect(sumOf(res.rows.map((r) => r.principal))).toBe(c.principal);
      expect(res.rows[res.rows.length - 1].balance).toBe(0);
      expect(res.rows.every((r) => r.principal >= 0 && r.interest >= 0 && r.balance >= 0)).toBe(true);
      expect(res.rows.every((r) => r.payment === r.principal + r.interest)).toBe(true);
      expect(sumOf(res.rows.map((r) => r.interest))).toBe(res.totalInterest);
      expect(sumOf(res.rows.map((r) => r.payment))).toBe(res.totalPayment);
    }
  });
  it("zero rate means zero interest", () => {
    const all = compareMethods({ principal: 12_000_000, annualRatePct: 0, months: 12 });
    expect(all["equal-payment"].firstPayment).toBe(1_000_000);
    expect(all["equal-principal"].firstPayment).toBe(1_000_000);
    expect(all.bullet.firstPayment).toBe(0);
    for (const m of REPAY_METHODS) expect(all[m].totalInterest).toBe(0);
  });
  it("원금균등 < 원리금균등 < 만기일시 in total interest", () => {
    const all = compareMethods({ principal: 100_000_000, annualRatePct: 4, months: 360 });
    expect(all["equal-principal"].totalInterest).toBeLessThan(all["equal-payment"].totalInterest);
    expect(all["equal-payment"].totalInterest).toBeLessThan(all.bullet.totalInterest);
  });
});

describe("dayCountGap (actual-day interest vs rate ÷ 12)", () => {
  it("1억 4%: 31일 +6,393원, 2월(28일) −26,484원", () => {
    // 100,000,000 × 4% × 31/365 = 339,726.03; × 28/365 = 306,849.32; ÷ 12 = 333,333.33
    expect(dayCountGap(100_000_000, 4)).toEqual({ longMonth: 6_393, february: 26_484 });
  });
  it("zero rate means no gap", () => {
    expect(dayCountGap(100_000_000, 0)).toEqual({ longMonth: 0, february: 0 });
  });
});

describe("sanitizeDecimalDraft (rate/term box)", () => {
  it("keeps a trailing dot and zeros while typing", () => {
    expect(sanitizeDecimalDraft("4.", 2)).toBe("4.");
    expect(sanitizeDecimalDraft("4.0", 2)).toBe("4.0");
    expect(sanitizeDecimalDraft("4.05", 2)).toBe("4.05");
    expect(sanitizeDecimalDraft(".5", 2)).toBe("0.5");
  });
  it("limits fraction digits and drops junk", () => {
    expect(sanitizeDecimalDraft("3.857", 2)).toBe("3.85");
    expect(sanitizeDecimalDraft("4.5.1", 2)).toBe("4.51");
    expect(sanitizeDecimalDraft("4,5%", 2)).toBe("45");
    expect(sanitizeDecimalDraft("007", 2)).toBe("7");
    expect(sanitizeDecimalDraft("", 2)).toBe("");
  });
  it("whole numbers only when decimals = 0", () => {
    expect(sanitizeDecimalDraft("18.", 0)).toBe("18");
    expect(sanitizeDecimalDraft("1200", 0)).toBe("1,200");
  });
});

describe("validateLoan", () => {
  const ok: LoanInput = { principal: 100_000_000, annualRatePct: 4, months: 360, method: "equal-payment" };
  it("accepts normal input", () => {
    expect(validateLoan(ok)).toBeNull();
    expect(validateLoan({ ...ok, annualRatePct: 0 })).toBeNull();
    expect(validateLoan({ ...ok, method: "bullet", graceMonths: 999 })).toBeNull();
  });
  it("rejects bad input", () => {
    expect(validateLoan({ ...ok, principal: NaN })).not.toBeNull();
    expect(validateLoan({ ...ok, principal: 0 })).not.toBeNull();
    expect(validateLoan({ ...ok, principal: 20_000_000_000 })).not.toBeNull();
    expect(validateLoan({ ...ok, annualRatePct: -1 })).not.toBeNull();
    expect(validateLoan({ ...ok, annualRatePct: 31 })).not.toBeNull();
    expect(validateLoan({ ...ok, months: 0 })).not.toBeNull();
    expect(validateLoan({ ...ok, months: 601 })).not.toBeNull();
    expect(validateLoan({ ...ok, graceMonths: 360 })).toContain("거치기간");
    expect(validateLoan({ ...ok, graceMonths: -1 })).not.toBeNull();
  });
});

describe("programmatic pages", () => {
  it("amount list is sorted, unique, 11 pages", () => {
    expect(LOAN_PAGE_MANWON).toHaveLength(11);
    expect([...LOAN_PAGE_MANWON].sort((a, b) => a - b)).toEqual(LOAN_PAGE_MANWON);
    expect(new Set(LOAN_PAGE_MANWON).size).toBe(LOAN_PAGE_MANWON.length);
  });
  it("labels amounts the way people search", () => {
    expect(loanAmountLabel(10000)).toBe("1억");
    expect(loanAmountLabel(50000)).toBe("5억");
    expect(loanAmountLabel(15000)).toBe("1억 5,000만원");
    expect(loanAmountLabel(3000)).toBe("3,000만원");
  });
  it("table terms are a sensible subset and include the default term", () => {
    for (const m of LOAN_PAGE_MANWON) {
      const years = loanTableYears(m);
      expect(years.every((y) => [1, 3, 5, 10, 20, 30].includes(y))).toBe(true);
      expect(years).toContain(loanDefaultYears(m));
    }
    expect(LOAN_TABLE_RATES).toContain(4);
  });
  it("summary helper agrees with the schedule", () => {
    const s = equalPaymentSummary(100_000_000, 4, 30);
    expect(s.payment).toBe(477_415);
    expect(s.totalPayment).toBe(100_000_000 + s.totalInterest);
  });
});

describe("loanPageHeadline (title/H1 of /loan/<만원>/)", () => {
  it("puts the 연 4% · 대표 기간 monthly payment in both the title and the H1", () => {
    // PMT(4%/12, 360, -100,000,000) = 477,415.30 → 477,415원
    expect(loanPageHeadline(10000)).toEqual({
      title: "1억 대출 이자 - 연 4% 30년 월 상환액 477,415원",
      h1: "1억 대출 이자: 연 4% 30년이면 월 477,415원",
    });
    // PMT(4%/12, 60, -30,000,000) = 552,495.66 → 552,496원
    expect(loanPageHeadline(3000).h1).toBe("3,000만원 대출 이자: 연 4% 5년이면 월 552,496원");
  });
  it("keeps every title within 45 characters and unique", () => {
    const titles = LOAN_PAGE_MANWON.map((m) => loanPageHeadline(m).title);
    for (const t of titles) expect(t.length).toBeLessThanOrEqual(45);
    expect(new Set(titles).size).toBe(titles.length);
  });
});
