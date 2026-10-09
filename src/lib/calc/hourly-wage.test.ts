import { describe, expect, it } from "vitest";
import {
  calcHourly,
  freelanceTax,
  HOURLY_PAGE_HOURS,
  insuredDeductions,
  juhyuHours,
  juhyuPay,
  MIN_WAGE_2026,
  MIN_WAGE_2027,
  monthlyHours,
  monthlyHoursExact,
  monthlyPay,
  overtimeHours,
  payForWeeklyHours,
  probationWage,
  scheduleForHours,
  weeklyWorkHours,
} from "./hourly-wage";

describe("minimum wage constants", () => {
  it("uses the published 2026 and 2027 rates", () => {
    // https://www.minimumwage.go.kr/minWage/policy/decisionMain.do
    expect(MIN_WAGE_2026).toBe(10_320);
    expect(MIN_WAGE_2027).toBe(10_700);
  });
  it("probation floor is 90%", () => {
    // 최저임금법 제5조②, 시행령 제3조: 2026 9,288원, 2027 9,630원
    expect(probationWage(10_320)).toBe(9_288);
    expect(probationWage(10_700)).toBe(9_630);
  });
});

describe("주휴수당", () => {
  // Formula: min(주 소정, 40)/40 × 8 × 시급 (근로기준법 제55조, 시행령 제30조, 제18조③;
  // bokjiro MOEL card news https://www.bokjiro.go.kr/ssis-tbu/cms/pc/news/promotion/1307833_1118.html)
  it("matches the research test vectors for 2026", () => {
    expect(juhyuPay(40, 10_320)).toBe(82_560);
    expect(juhyuPay(20, 10_320)).toBe(41_280);
    expect(juhyuPay(15, 10_320)).toBe(30_960); // exactly 15h is eligible (5일 × 3시간)
    expect(juhyuPay(30, 10_320)).toBe(61_920);
  });
  it("matches the research test vectors for 2027", () => {
    expect(juhyuPay(40, 10_700)).toBe(85_600);
    expect(juhyuPay(15, 10_700)).toBe(32_100);
    expect(juhyuPay(20, 10_700)).toBe(42_800);
  });
  it("is zero under 15h or without perfect attendance", () => {
    expect(juhyuPay(14, 10_320)).toBe(0);
    expect(juhyuPay(14.9, 10_320)).toBe(0);
    expect(juhyuPay(40, 10_320, false)).toBe(0);
  });
  it("caps at 8 hours", () => {
    expect(juhyuHours(40)).toBe(8);
    expect(juhyuHours(52)).toBe(8);
    expect(juhyuHours(22.5)).toBe(4.5);
  });
  it("bokjiro example: 4주 60h → 주 15h, 시급 10,000 → 30,000원", () => {
    expect(juhyuPay(60 / 4, 10_000)).toBe(30_000);
  });
});

describe("월 환산 시간", () => {
  it("40h week = 209h (최저임금 월 환산 기준)", () => {
    expect(monthlyHoursExact(48)).toBeCloseTo(208.571, 3);
    expect(monthlyHours(48)).toBe(209);
  });
  it("rounds other schedules to a whole hour", () => {
    expect(monthlyHours(24)).toBe(104); // 주 20h + 주휴 4h → 104.29
    expect(monthlyHours(42)).toBe(183); // 주 35h + 주휴 7h → 182.5 → 183
    expect(monthlyHours(25.2)).toBe(110); // 주 21h + 4.2h → 109.5 → 110
    expect(monthlyHours(18)).toBe(78); // 주 15h + 3h
    expect(monthlyHours(14)).toBe(61); // 주 14h, 주휴 없음 → 60.83
  });
  it("exact values behind the half-hour cases are exactly .5 (365/84, not 4.345)", () => {
    expect(monthlyHoursExact(42)).toBe(182.5); // 42 × 4.345 would be 182.49
    expect(monthlyHoursExact(25.2)).toBe(109.5);
  });
  it("keeps 0.01h under 50 monthly hours so tiny schedules are not distorted", () => {
    expect(monthlyHours(10)).toBe(43.45); // 주 10h → 43.452 (whole hour: 43, −1%)
    expect(monthlyHours(1)).toBe(4.35); // whole hour would be 4 (−8%)
    expect(monthlyHours(0.1)).toBe(0.43); // whole hour would be 0
    expect(monthlyHours(11.5)).toBe(49.97);
    expect(monthlyHours(11.6)).toBe(50); // 50.40 → 50
  });
  it("monthlyPay rounds 시급 × hours to the won", () => {
    expect(monthlyPay(10_320, 209)).toBe(2_156_880);
    expect(monthlyPay(10_320, 43.45)).toBe(448_404);
    expect(monthlyPay(10_320, 0.43)).toBe(4_438); // 4,437.6
  });
});

describe("calcHourly", () => {
  it("40h at the 2026 minimum wage = 2,156,880원 (minimumwage.go.kr)", () => {
    const r = calcHourly({ wage: 10_320, dailyHours: 8, days: 5 });
    expect(r.weeklyWork).toBe(40);
    expect(r.overtime).toBe(0);
    expect(r.weeklyBase).toBe(412_800);
    expect(r.juhyuPay).toBe(82_560);
    expect(r.weeklyTotal).toBe(495_360);
    expect(r.monthlyHours).toBe(209);
    expect(r.monthlyGross).toBe(2_156_880);
    expect(r.monthlyNet).toBe(2_156_880);
    expect(r.monthlyByWeeks).toBe(Math.round(495_360 * (365 / 84)));
  });
  it("40h at the 2027 minimum wage = 2,236,300원 (minimumwage.go.kr)", () => {
    expect(calcHourly({ wage: 10_700, dailyHours: 8, days: 5 }).monthlyGross).toBe(2_236_300);
  });
  it("2025 reference: 10,030 × 209 = 2,096,270원", () => {
    expect(calcHourly({ wage: 10_030, dailyHours: 8, days: 5 }).monthlyGross).toBe(2_096_270);
  });
  it("20h part-time week", () => {
    const r = calcHourly({ wage: 10_320, dailyHours: 4, days: 5 });
    expect(r.juhyuHours).toBe(4);
    expect(r.weeklyTotal).toBe(247_680);
    expect(r.monthlyHours).toBe(104);
    expect(r.monthlyGross).toBe(1_073_280);
  });
  it("under 15h: no 주휴", () => {
    const r = calcHourly({ wage: 10_320, dailyHours: 7, days: 2 });
    expect(r.contractualWeekly).toBe(14);
    expect(r.juhyuEligible).toBe(false);
    expect(r.juhyuPay).toBe(0);
    expect(r.monthlyGross).toBe(61 * 10_320);
  });
  it("absence removes 주휴 but keeps base pay", () => {
    const r = calcHourly({ wage: 10_320, dailyHours: 8, days: 5, perfectAttendance: false });
    expect(r.juhyuPay).toBe(0);
    expect(r.monthlyHours).toBe(174); // 40 × 4.345 = 173.81
  });
  it("handles one-decimal hours without float drift", () => {
    expect(weeklyWorkHours(3.3, 3)).toBe(9.9);
    const r = calcHourly({ wage: 10_320, dailyHours: 4.5, days: 5 });
    expect(r.weeklyWork).toBe(22.5);
    expect(r.juhyuHours).toBe(4.5);
    expect(r.juhyuPay).toBe(46_440);
    expect(r.monthlyHours).toBe(117); // 27 × 4.345 = 117.32
  });
  it("tiny schedules never round the month down to 0", () => {
    const r = calcHourly({ wage: 10_320, dailyHours: 0.1, days: 1 });
    expect(r.weeklyTotal).toBe(1_032);
    expect(r.monthlyHours).toBe(0.43);
    expect(r.monthlyGross).toBe(4_438);
    // 1h a week: 10,320 × 4.35 = 44,892 (exact 44,843; whole-hour rounding gave 41,280)
    expect(calcHourly({ wage: 10_320, dailyHours: 1, days: 1 }).monthlyGross).toBe(44_892);
  });
  it("splits overtime from 소정근로시간", () => {
    expect(overtimeHours(8, 5)).toBe(0);
    expect(overtimeHours(10, 3)).toBe(6); // 1일 8시간 초과 2h × 3일
    expect(overtimeHours(9, 6)).toBe(14); // 6h daily + 8h over 40 among the rest
    expect(overtimeHours(8, 6)).toBe(8);
    const r = calcHourly({ wage: 10_000, dailyHours: 10, days: 5 });
    expect(r.weeklyWork).toBe(50);
    expect(r.overtime).toBe(10);
    expect(r.contractualWeekly).toBe(40);
    expect(r.juhyuHours).toBe(8);
    expect(r.overtimePremiumWeekly).toBe(50_000);
  });
});

describe("deductions", () => {
  it("3.3%: 소득세 3% and 지방소득세 10% of it, each 10원 미만 절사", () => {
    // 2,156,880 × 3% = 64,706.4 → 64,700; 지방 6,470
    expect(freelanceTax(2_156_880)).toEqual({ incomeTax: 64_700, localTax: 6_470, total: 71_170 });
    // No 1,000원 소액부징수 for 인적용역 사업소득 since 2024-07-01 (소득세법 제86조 제1호)
    expect(freelanceTax(30_000)).toEqual({ incomeTax: 900, localTax: 90, total: 990 });
  });
  it("4대보험 + 간이세액 on 2,156,880원 (2026-10, 본인 1명)", () => {
    // 국민연금 floor10(2,156,000 × 4.75%) = 102,410; 건강 floor10(2,156,880 × 3.595%) = 77,530;
    // 장기요양 floor10(77,530 × 0.9448/7.19) = 10,180; 고용 floor10(2,156,880 × 0.9%) = 19,410.
    const d = insuredDeductions(2_156_880, 40);
    expect(d.pension).toBe(102_410);
    expect(d.health).toBe(77_530);
    expect(d.longTermCare).toBe(10_180);
    expect(d.employment).toBe(19_410);
    expect(d.localTax).toBe(Math.floor(d.incomeTax / 100) * 10);
    expect(d.total).toBe(209_530 + d.incomeTax + d.localTax);
  });
  it("초단시간 (주 15시간 미만): 국민연금·건강보험 제외, 고용보험만", () => {
    const d = insuredDeductions(443_760, 10);
    expect(d.shortTime).toBe(true);
    expect(d.pension).toBe(0);
    expect(d.health).toBe(0);
    expect(d.longTermCare).toBe(0);
    expect(d.employment).toBe(3_990);
    expect(d.incomeTax).toBe(0); // 77만원 미만은 간이세액 0원
    expect(d.total).toBe(3_990);
  });
  it("2027 rate year: 국민연금 근로자 5.0% (법률 제20903호, 매년 0.5%p), other rates unchanged", () => {
    const d26 = insuredDeductions(2_236_300, 40);
    const d27 = insuredDeductions(2_236_300, 40, undefined, 2027);
    // 기준소득월액 2,236,000원: 4.75% → 106,210 / 5.0% → 111,800
    expect(d26.pension).toBe(106_210);
    expect(d27.pension).toBe(111_800);
    expect(d27.health).toBe(d26.health);
    expect(d27.employment).toBe(d26.employment);
    expect(d27.incomeTax).toBe(d26.incomeTax);
    expect(payForWeeklyHours(40, 10_700, 2027).netInsured).toBe(2_236_300 - d27.total);
    expect(payForWeeklyHours(40, 10_700).netInsured).toBe(2_236_300 - d26.total);
    expect(insuredDeductions(443_760, 10, undefined, 2027).pension).toBe(0); // 초단시간
  });
  it("calcHourly wires the selected mode into 실수령", () => {
    const f = calcHourly({ wage: 10_320, dailyHours: 8, days: 5, deduction: "freelance" });
    expect(f.deductionTotal).toBe(71_170);
    expect(f.monthlyNet).toBe(2_085_710);
    const i = calcHourly({ wage: 10_320, dailyHours: 8, days: 5, deduction: "insured" });
    expect(i.monthlyNet).toBe(2_156_880 - i.insured!.total);
  });
});

describe("landing pages", () => {
  it("page list is sorted, unique and has a schedule for each value", () => {
    expect([...HOURLY_PAGE_HOURS].sort((a, b) => a - b)).toEqual(HOURLY_PAGE_HOURS);
    expect(new Set(HOURLY_PAGE_HOURS).size).toBe(HOURLY_PAGE_HOURS.length);
    for (const h of HOURLY_PAGE_HOURS) {
      const s = scheduleForHours(h);
      expect(s.daily * s.days).toBe(h);
      expect(s.daily).toBeLessThanOrEqual(8);
    }
  });
  it("payForWeeklyHours agrees with calcHourly", () => {
    for (const h of HOURLY_PAGE_HOURS) {
      const s = scheduleForHours(h);
      const a = payForWeeklyHours(h, 10_320);
      const b = calcHourly({ wage: 10_320, dailyHours: s.daily, days: s.days });
      expect(a.monthlyGross).toBe(b.monthlyGross);
      expect(a.weeklyTotal).toBe(b.weeklyTotal);
    }
  });
});
