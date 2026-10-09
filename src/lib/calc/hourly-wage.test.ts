import { describe, expect, it } from "vitest";
import {
  calcHourly,
  exactHoursLabel,
  freelanceTax,
  HOURLY_PAGE_HOURS,
  insuredDeductions,
  juhyuHours,
  juhyuPay,
  MIN_WAGE_2026,
  MIN_WAGE_2027,
  monthlyHourUnits,
  monthlyHours,
  monthlyHoursExact,
  monthlyPay,
  monthlyPayHours,
  OFFICIAL_MONTHLY_HOURS_40H,
  overtimeHours,
  payForWeeklyHours,
  probationWage,
  scheduleForHours,
  shownHoursAreExact,
  uses209,
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
  // 최저임금법 시행령 제5조①3: 1개월 기준시간 = (1주 소정 + 유급 주휴) × 1년 평균 주 수 ÷ 12, no rounding
  // rule (https://www.law.go.kr/법령/최저임금법시행령/제5조). Only 40h + 8h uses the 고시 209시간
  // (minimumwage.go.kr: 10,320 × 209 = 2,156,880원); fact-check docs/research/verifier-corrections.md item 5.
  it("40h week = 209h (최저임금 월 환산 기준)", () => {
    expect(monthlyHoursExact(48)).toBeCloseTo(208.571, 3);
    expect(monthlyHours(40, 8)).toBe(209);
    expect(uses209(8)).toBe(true);
    expect(uses209(7)).toBe(false);
    expect(OFFICIAL_MONTHLY_HOURS_40H).toBe(209);
  });
  it("part-time schedules keep the decimal formula (not ceiled, not rounded to a whole hour)", () => {
    expect(monthlyHours(15, 3)).toBe(78.21); // (15 + 3) × 365/84 = 78.214 (올림 79, 반올림 78 were wrong)
    expect(monthlyHours(20, 4)).toBe(104.29); // (20 + 4) × 365/84 = 104.286 (not 104, 105 or 209/2 = 104.5)
    expect(monthlyHours(35, 7)).toBe(182.5);
    expect(monthlyHours(21, 4.2)).toBe(109.5);
    expect(monthlyHours(30, 6)).toBe(156.43);
    expect(monthlyHours(14, 0)).toBe(60.83); // 주 14h, 주휴 없음
    expect(monthlyHours(10, 0)).toBe(43.45);
    expect(monthlyHours(1, 0)).toBe(4.35);
    expect(monthlyHours(0.1, 0)).toBe(0.43);
  });
  it("40h without 주휴 (결근) is not the 209h case", () => {
    expect(monthlyHours(40, 0)).toBe(173.81); // 40 × 365/84 = 173.81
  });
  it("hours worked over 40 are added to 209 at × 365/84", () => {
    expect(monthlyHours(50, 8)).toBe(252.45); // 209 + 10 × 365/84 (43.45)
    expect(monthlyHours(45, 8)).toBe(230.73); // 209 + 21.73
  });
  it("exact values behind the half-hour cases are exactly .5 (365/84, not 4.345)", () => {
    expect(monthlyHoursExact(42)).toBe(182.5); // 42 × 4.345 would be 182.49
    expect(monthlyHoursExact(25.2)).toBe(109.5);
    expect(monthlyHoursExact(33.6)).toBe(146); // 주 28h + 5.6h
  });
  it("pay hours are the exact value; only the display is rounded to 0.01h", () => {
    expect(monthlyHourUnits(20, 4)).toBe(2_400 * 365); // 1/8400-hour units
    expect(monthlyHourUnits(40, 8)).toBe(209 * 8_400);
    expect(monthlyHourUnits(50, 8)).toBe(209 * 8_400 + 1_000 * 365);
    expect(monthlyHourUnits(0, 0)).toBe(0);
    expect(monthlyHourUnits(NaN, 0)).toBe(0);
    expect(monthlyPayHours(20, 4)).toBeCloseTo(104.285714, 6);
    expect(monthlyPayHours(15, 3)).toBeCloseTo(78.214286, 6);
    expect(monthlyPayHours(40, 8)).toBe(209);
    expect(monthlyPayHours(50, 8)).toBeCloseTo(252.452381, 6);
    expect(monthlyPayHours(35, 7)).toBe(182.5);
  });
  it("monthlyPay = 시급 × exact hours, rounded once to the won (not 시급 × 0.01h display value)", () => {
    // 최저임금법 시행령 제5조①3 has no rounding rule, so the exact (주 + 주휴) × 365/84 is used.
    expect(monthlyPay(10_320, 40, 8)).toBe(2_156_880); // 10,320 × 209 (minimumwage.go.kr)
    expect(monthlyPay(10_700, 40, 8)).toBe(2_236_300); // 10,700 × 209
    expect(monthlyPay(10_320, 20, 4)).toBe(1_076_229); // 10,320 × 104.2857… = 1,076,228.57 (× 104.29 was 1,076,273)
    expect(monthlyPay(10_320, 15, 3)).toBe(807_171); // 10,320 × 78.2142… = 807,171.43 (× 78.21 was 807,127)
    expect(monthlyPay(10_320, 10, 0)).toBe(448_429); // 10,320 × 43.4523… = 448,428.57 (× 43.45 was 448,404)
    expect(monthlyPay(10_320, 30, 6)).toBe(1_614_343); // 10,320 × 156.4285… = 1,614,342.86
    expect(monthlyPay(10_320, 14, 0)).toBe(627_800); // 10,320 × 60.8333… = 627,800 exactly
    expect(monthlyPay(10_320, 0.1, 0)).toBe(4_484); // 4,484.29 (× 0.43 was 4,438)
    expect(monthlyPay(10_320, 0, 0)).toBe(0);
    expect(monthlyPay(0, 20, 4)).toBe(0);
  });
  it("labels exact hours with 4 cut decimals and flags exact display values", () => {
    expect(exactHoursLabel(monthlyPayHours(20, 4))).toBe("104.2857…");
    expect(exactHoursLabel(monthlyPayHours(10, 0))).toBe("43.4523…"); // cut, not rounded (43.452380…)
    expect(exactHoursLabel(monthlyPayHours(15, 3))).toBe("78.2142…");
    expect(exactHoursLabel(monthlyPayHours(35, 7))).toBe("182.5");
    expect(exactHoursLabel(monthlyPayHours(40, 8))).toBe("209");
    expect(exactHoursLabel(monthlyPayHours(2.1, 0))).toBe("9.125");
    expect(shownHoursAreExact(monthlyPayHours(35, 7), monthlyHours(35, 7))).toBe(true);
    expect(shownHoursAreExact(monthlyPayHours(40, 8), monthlyHours(40, 8))).toBe(true);
    expect(shownHoursAreExact(monthlyPayHours(20, 4), monthlyHours(20, 4))).toBe(false);
    expect(shownHoursAreExact(monthlyPayHours(50, 8), monthlyHours(50, 8))).toBe(false);
  });
  it("monthlyPay is exact integer math: whole results stay whole, half-won values round up", () => {
    // 시급 120 × (21 + 4.2)h × 365/84 = 13,140 exactly; 시급 7 × 2.1h × 365/84 = 63.875 → 64.
    expect(monthlyPay(120, 21, 4.2)).toBe(13_140);
    expect(monthlyPay(7, 2.1, 0)).toBe(64);
    expect(monthlyPay(4, 2.1, 0)).toBe(37); // 36.5 → 37 (round half up)
    // Every 0.1h step equals round(시급 × units / 8400) computed in BigInt.
    const big = (n: number) => BigInt(n);
    for (const wage of [MIN_WAGE_2026, MIN_WAGE_2027, probationWage(MIN_WAGE_2026), probationWage(MIN_WAGE_2027), 12_345]) {
      for (let tenths = 1; tenths <= 400; tenths++) {
        const w = tenths / 10;
        const jh = juhyuHours(w);
        const units = big(monthlyHourUnits(w, jh));
        const expected = Number((big(wage) * units * big(2) + big(8_400)) / big(16_800));
        expect(monthlyPay(wage, w, jh)).toBe(expected);
      }
    }
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
    expect(r.monthlyPayHours).toBe(209);
    expect(r.monthly209).toBe(true);
    expect(r.monthlyGross).toBe(2_156_880);
    expect(r.monthlyNet).toBe(2_156_880);
    expect(r.monthlyByWeeks).toBe(2_152_457); // 495,360 × 365/84 = 2,152,457.14
  });
  it("40h at the 2027 minimum wage = 2,236,300원 (minimumwage.go.kr)", () => {
    expect(calcHourly({ wage: 10_700, dailyHours: 8, days: 5 }).monthlyGross).toBe(2_236_300);
  });
  it("2025 reference: 10,030 × 209 = 2,096,270원", () => {
    expect(calcHourly({ wage: 10_030, dailyHours: 8, days: 5 }).monthlyGross).toBe(2_096_270);
  });
  it("20h part-time week: shows 104.29h, pays on the exact 104.2857…h", () => {
    const r = calcHourly({ wage: 10_320, dailyHours: 4, days: 5 });
    expect(r.juhyuHours).toBe(4);
    expect(r.weeklyTotal).toBe(247_680);
    expect(r.monthlyHours).toBe(104.29);
    expect(r.monthlyPayHours).toBeCloseTo(104.285714, 6);
    expect(r.monthly209).toBe(false);
    // 10,320 × 24 × 365/84 = 1,076,228.57 (× 104.29 display value: 1,076,273; 104h: 1,073,280)
    expect(r.monthlyGross).toBe(1_076_229);
  });
  it("15h part-time week: shows 78.21h, pays on the exact 78.2142…h", () => {
    const r = calcHourly({ wage: 10_320, dailyHours: 5, days: 3 });
    expect(r.juhyuHours).toBe(3);
    expect(r.monthlyHours).toBe(78.21);
    // 10,320 × 18 × 365/84 = 807,171.43 (× 78.21: 807,127 / 78h: 804,960 / 79h: 815,280)
    expect(r.monthlyGross).toBe(807_171);
    expect(calcHourly({ wage: 10_700, dailyHours: 5, days: 3 }).monthlyGross).toBe(836_893); // 2027: 836,892.86
  });
  it("under 15h: no 주휴", () => {
    const r = calcHourly({ wage: 10_320, dailyHours: 7, days: 2 });
    expect(r.contractualWeekly).toBe(14);
    expect(r.juhyuEligible).toBe(false);
    expect(r.juhyuPay).toBe(0);
    expect(r.monthlyHours).toBe(60.83);
    expect(r.monthlyGross).toBe(627_800); // 10,320 × 14 × 365/84 = 627,800 exactly (× 60.83: 627,766)
  });
  it("absence removes 주휴 but keeps base pay", () => {
    const r = calcHourly({ wage: 10_320, dailyHours: 8, days: 5, perfectAttendance: false });
    expect(r.juhyuPay).toBe(0);
    expect(r.monthlyHours).toBe(173.81); // 40 × 365/84
    expect(r.monthly209).toBe(false);
    expect(r.monthlyGross).toBe(1_793_714); // 10,320 × 40 × 365/84 = 1,793,714.29
  });
  it("handles one-decimal hours without float drift", () => {
    expect(weeklyWorkHours(3.3, 3)).toBe(9.9);
    const r = calcHourly({ wage: 10_320, dailyHours: 4.5, days: 5 });
    expect(r.weeklyWork).toBe(22.5);
    expect(r.juhyuHours).toBe(4.5);
    expect(r.juhyuPay).toBe(46_440);
    expect(r.monthlyHours).toBe(117.32); // 27 × 365/84 = 117.32
    expect(r.monthlyGross).toBe(1_210_757); // 10,320 × 27 × 365/84 = 1,210,757.14
  });
  it("tiny schedules never round the month down to 0", () => {
    const r = calcHourly({ wage: 10_320, dailyHours: 0.1, days: 1 });
    expect(r.weeklyTotal).toBe(1_032);
    expect(r.monthlyHours).toBe(0.43);
    expect(r.monthlyGross).toBe(4_484); // 10,320 × 0.1 × 365/84 = 4,484.29
    // 1h a week: 10,320 × 365/84 = 44,842.86 → 44,843 (whole-hour rounding gave 41,280)
    expect(calcHourly({ wage: 10_320, dailyHours: 1, days: 1 }).monthlyGross).toBe(44_843);
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
    expect(r.overtimePremiumMonthly).toBe(217_262); // 50,000 × 365/84 = 217,261.9
    expect(r.monthly209).toBe(true);
    expect(r.monthlyHours).toBe(252.45); // 209 (40 + 8) + 10 × 365/84, shown to 0.01h
    expect(r.monthlyPayHours).toBeCloseTo(252.452381, 6);
    // 10,000 × (209 + 10 × 365/84) = 2,090,000 + 434,523.81 = 2,524,523.81 (× 252.45 was 2,524,500)
    expect(r.monthlyGross).toBe(2_524_524);
    // 2026 minimum wage, 9h × 5일 (45h): 10,320 × (209 + 5 × 365/84) = 2,381,094.29
    expect(calcHourly({ wage: 10_320, dailyHours: 9, days: 5 }).monthlyGross).toBe(2_381_094);
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
      expect(a.monthlyHours).toBe(b.monthlyHours);
    }
  });
  it("only the 40h page uses 209h; every other page shows the decimal (주 + 주휴) × 365/84", () => {
    expect(payForWeeklyHours(15, 10_320).monthlyHours).toBe(78.21);
    expect(payForWeeklyHours(15, 10_320).monthlyGross).toBe(807_171);
    expect(payForWeeklyHours(20, 10_320).monthlyHours).toBe(104.29);
    expect(payForWeeklyHours(20, 10_320).monthlyGross).toBe(1_076_229);
    expect(payForWeeklyHours(40, 10_320).monthlyHours).toBe(209);
    for (const h of HOURLY_PAGE_HOURS) {
      const p = payForWeeklyHours(h, 10_320);
      expect(p.monthly209).toBe(h === 40);
      if (h !== 40) {
        expect(p.monthlyHours).toBe(Math.round(p.monthlyHoursExact * 100) / 100);
        expect(p.monthlyPayHours).toBe(p.monthlyHoursExact);
      }
      // Pay comes from the exact hours, so it is within half a won of 시급 × exact hours.
      expect(Math.abs(p.monthlyGross - 10_320 * p.monthlyPayHours)).toBeLessThanOrEqual(0.5 + 1e-6);
    }
  });
});

describe("regression: monthly pay on exact hours (2026 10,320원 / 2027 10,700원)", () => {
  // 최저임금법 시행령 제5조①3: (1주 소정 + 유급 주휴) × 365/7/12, no rounding rule → pay on the exact hours,
  // 원 단위 반올림 once. 40h + 8h keeps the 고시 209시간 (minimumwage.go.kr: 2,156,880 / 2,236,300원).
  const CASES: { h: number; hours: number; y2026: number; y2027: number }[] = [
    { h: 10, hours: 43.45, y2026: 448_429, y2027: 464_940 }, // 10 × 365/84: 448,428.57 / 464,940.48
    { h: 15, hours: 78.21, y2026: 807_171, y2027: 836_893 }, // 18 × 365/84: 807,171.43 / 836,892.86
    { h: 20, hours: 104.29, y2026: 1_076_229, y2027: 1_115_857 }, // 24 × 365/84: 1,076,228.57 / 1,115,857.14
    { h: 30, hours: 156.43, y2026: 1_614_343, y2027: 1_673_786 }, // 36 × 365/84: 1,614,342.86 / 1,673,785.71
    { h: 40, hours: 209, y2026: 2_156_880, y2027: 2_236_300 }, // 209시간 고시 기준
  ];
  for (const c of CASES) {
    it(`주 ${c.h}시간: 2026 ${c.y2026}원, 2027 ${c.y2027}원`, () => {
      const a = payForWeeklyHours(c.h, MIN_WAGE_2026);
      const b = payForWeeklyHours(c.h, MIN_WAGE_2027);
      expect(a.monthlyHours).toBe(c.hours);
      expect(b.monthlyHours).toBe(c.hours);
      expect(a.monthlyGross).toBe(c.y2026);
      expect(b.monthlyGross).toBe(c.y2027);
      const s = scheduleForHours(c.h);
      expect(calcHourly({ wage: MIN_WAGE_2026, dailyHours: s.daily, days: s.days }).monthlyGross).toBe(c.y2026);
      expect(calcHourly({ wage: MIN_WAGE_2027, dailyHours: s.daily, days: s.days }).monthlyGross).toBe(c.y2027);
    });
  }
});
