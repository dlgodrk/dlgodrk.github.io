import { describe, expect, it } from "vitest";
import { MINIMUM_WAGE } from "@/lib/rates/labor";
import { calcHourly, payForWeeklyHours, scheduleForHours } from "./hourly-wage";
import {
  calcMinimumWage,
  hourlyMinimum,
  INCLUSION_SCHEDULE,
  isMonthly209,
  juhyuHours,
  MINIMUM_WAGE_HISTORY,
  monthlyHours,
  monthlyHoursExact,
  monthlyPayHours,
  nearestSalaryManwon,
  netMonthly2026,
  WEEKLY_HOURS_TABLE,
  yearOverYear,
} from "./minimum-wage";

const FULL = { weeklyHours: 40, dailyHours: 8 };

describe("minimum-wage: official figures", () => {
  // 최저임금위원회 연도별 결정현황 https://www.minimumwage.go.kr/minWage/policy/decisionMain.do (2026-10-09)
  it("2026: 10,320원, 일급 82,560원, 월 209시간 2,156,880원", () => {
    const r = calcMinimumWage({ year: 2026, ...FULL });
    expect(r.hourly).toBe(10_320);
    expect(r.daily).toBe(82_560);
    expect(r.monthlyHours).toBe(209);
    expect(r.monthly).toBe(2_156_880);
    expect(r.annual).toBe(25_882_560);
  });
  it("2027: 10,700원, 일급 85,600원, 월 2,236,300원", () => {
    const r = calcMinimumWage({ year: 2027, ...FULL });
    expect(r.hourly).toBe(10_700);
    expect(r.daily).toBe(85_600);
    expect(r.monthly).toBe(2_236_300);
    expect(r.annual).toBe(26_835_600);
  });
  it("주 40시간 주급은 근로 40시간 + 주휴 8시간", () => {
    // 주휴수당 2026 주 40h = 82,560원 (docs/research/labor-2026.md test vector)
    const r = calcMinimumWage({ year: 2026, ...FULL });
    expect(r.weeklyWork).toBe(412_800);
    expect(r.juhyuPay).toBe(82_560);
    expect(r.weekly).toBe(495_360);
    expect(calcMinimumWage({ year: 2027, ...FULL }).weekly).toBe(513_600);
  });
  it("history matches the shared rate table and is internally consistent", () => {
    for (const y of [2025, 2026, 2027]) {
      expect(MINIMUM_WAGE_HISTORY.find((h) => h.year === y)?.hourly).toBe(MINIMUM_WAGE[y]);
    }
    for (let i = 1; i < MINIMUM_WAGE_HISTORY.length; i++) {
      const prev = MINIMUM_WAGE_HISTORY[i - 1];
      const cur = MINIMUM_WAGE_HISTORY[i];
      expect(cur.year).toBe(prev.year + 1);
      expect(cur.increase).toBe(cur.hourly - prev.hourly);
      expect(cur.monthly).toBe(cur.hourly * 209);
      // Official rate is the increase rounded to 1–2 decimals.
      expect(Math.abs((cur.increase / prev.hourly) * 100 - Number(cur.rate))).toBeLessThan(0.06);
    }
  });
});

describe("minimum-wage: probation (최저임금법 시행령 제3조, 90%)", () => {
  it("2026 9,288원, 2027 9,630원", () => {
    expect(hourlyMinimum(2026, true)).toBe(9_288);
    expect(hourlyMinimum(2027, true)).toBe(9_630);
  });
  it("수습 월급과 첫해 연봉 (수습 3개월 + 9개월)", () => {
    const r = calcMinimumWage({ year: 2026, ...FULL, probation: true });
    expect(r.monthly).toBe(1_941_192); // 9,288 × 209
    expect(r.firstYearAnnual).toBe(1_941_192 * 3 + 2_156_880 * 9);
    expect(calcMinimumWage({ year: 2027, ...FULL, probation: true }).monthly).toBe(2_012_670);
  });
});

describe("minimum-wage: part-time hours", () => {
  it("주휴시간 = 주 15시간 이상일 때 주 소정/5", () => {
    expect(juhyuHours(14)).toBe(0);
    expect(juhyuHours(15)).toBe(3);
    expect(juhyuHours(20)).toBe(4);
    expect(juhyuHours(40)).toBe(8);
    expect(juhyuHours(NaN)).toBe(0);
  });
  // 월 환산 시간: 최저임금법 시행령 제5조①3 = (1주 소정 + 유급 주휴) × 1년 평균 주 수 ÷ 12, no rounding rule
  // (https://www.law.go.kr/법령/최저임금법시행령/제5조). Only 40h + 8h uses the 고시 209시간
  // (minimumwage.go.kr: 10,320 × 209 = 2,156,880원). Fact-check docs/research/verifier-corrections.md item 5:
  // part-time hours must not be ceiled — this replaces labor-2026.md's "rounded UP to an integer".
  it("월 환산 시간: 주 40시간만 고시 기준 209시간", () => {
    expect(monthlyHoursExact(40)).toBeCloseTo(208.571, 3);
    expect(monthlyHours(40)).toBe(209);
    expect(isMonthly209(40)).toBe(true);
    expect(isMonthly209(39.9)).toBe(false);
    expect(isMonthly209(0)).toBe(false);
    expect(calcMinimumWage({ year: 2026, ...FULL }).monthly209).toBe(true);
  });
  it("단시간 월 환산 시간은 소수 둘째 자리 (올림·정수 반올림 안 함)", () => {
    expect(monthlyHoursExact(20)).toBeCloseTo(104.286, 3);
    expect(monthlyHours(20)).toBe(104.29); // (20 + 4) × 365/84, not 105 (올림) / 104 / 104.5 (209 ÷ 2)
    expect(monthlyHours(15)).toBe(78.21); // (15 + 3) × 365/84, not 79
    expect(monthlyHours(25)).toBe(130.36);
    expect(monthlyHours(30)).toBe(156.43);
    expect(monthlyHours(35)).toBe(182.5);
    expect(monthlyHours(10)).toBe(43.45); // 주휴 없음: 10 × 365/84
    expect(monthlyHours(14)).toBe(60.83);
    expect(monthlyHours(28)).toBe(146); // 33.6 × 365/84 = 146 exactly
    expect(monthlyHours(0)).toBe(0);
    expect(monthlyHours(NaN)).toBe(0);
    expect(calcMinimumWage({ year: 2026, weeklyHours: 20, dailyHours: 4 }).monthly209).toBe(false);
  });
  it("월급 = 시급 × 정확한 월 환산 시간 (표시는 0.01h), 원 단위 반올림", () => {
    for (const year of [2026, 2027] as const) {
      for (const probation of [false, true]) {
        for (let tenths = 1; tenths <= 400; tenths++) {
          const w = tenths / 10;
          const r = calcMinimumWage({ year, weeklyHours: w, dailyHours: 8, probation });
          expect(r.monthly209).toBe(w === 40);
          if (w !== 40) {
            expect(r.monthlyHours).toBe(Math.round(monthlyHoursExact(w) * 100) / 100);
            expect(r.monthlyPayHours).toBe(monthlyHoursExact(w));
          }
          // Integer arithmetic: 시급 × (주 소정 + 주휴, 0.01h 단위) × 365 / 8400, 원 단위 반올림 (209시간은 × 209).
          const hundredths = Math.round((w + juhyuHours(w)) * 100);
          const expected =
            w === 40 ? r.hourly * 209 : Math.floor((r.hourly * hundredths * 365 + 4_200) / 8_400);
          expect(r.monthly).toBe(expected);
          expect(Math.abs(r.monthly - r.hourly * r.monthlyPayHours)).toBeLessThanOrEqual(0.5 + 1e-6);
        }
      }
    }
  });
  it("주 10·15·20·30·40시간 회귀 (2026·2027): 정확한 시간으로 계산", () => {
    const at = (year: 2026 | 2027, w: number) => calcMinimumWage({ year, weeklyHours: w, dailyHours: Math.min(8, w / 5) });
    // 주 10시간 (주휴 없음): 10 × 365/84 = 43.4523…h → 448,428.57 / 464,940.48 (× 43.45 표시값이면 448,404)
    expect(at(2026, 10).monthly).toBe(448_429);
    expect(at(2027, 10).monthly).toBe(464_940);
    // 주 15시간: 18 × 365/84 = 78.2142…h → 807,171.43 / 836,892.86 (× 78.21이면 807,127, 79시간 올림이면 815,280)
    expect(at(2026, 15).monthly).toBe(807_171);
    expect(at(2027, 15).monthly).toBe(836_893);
    // 주 20시간: 24 × 365/84 = 104.2857…h → 1,076,228.57 / 1,115,857.14 (× 104.29이면 1,076,273, 105시간 올림이면 1,083,600)
    expect(at(2026, 20).monthly).toBe(1_076_229);
    expect(at(2027, 20).monthly).toBe(1_115_857);
    // 주 30시간: 36 × 365/84 = 156.4285…h → 1,614,342.86 / 1,673,785.71 (× 156.43이면 1,614,358)
    expect(at(2026, 30).monthly).toBe(1_614_343);
    expect(at(2027, 30).monthly).toBe(1_673_786);
    // 주 40시간: 고시 209시간
    expect(at(2026, 40).monthly).toBe(2_156_880);
    expect(at(2027, 40).monthly).toBe(2_236_300);
  });
  it("주 20시간 2026: 주급 247,680원 (주휴 41,280원), 월 104.29시간 표시, 1,076,229원", () => {
    const r = calcMinimumWage({ year: 2026, weeklyHours: 20, dailyHours: 4 });
    expect(r.juhyuPay).toBe(41_280); // labor-2026.md: 주 20h → 41,280원
    expect(r.weekly).toBe(247_680);
    expect(r.daily).toBe(41_280);
    expect(r.monthlyHours).toBe(104.29);
    expect(r.monthlyPayHours).toBeCloseTo(104.285714, 6);
    expect(monthlyPayHours(20)).toBe(r.monthlyPayHours);
    expect(r.monthly).toBe(1_076_229);
    expect(r.annual).toBe(1_076_229 * 12);
  });
  it("주 14·25·28·35시간 2026 월급", () => {
    expect(calcMinimumWage({ year: 2026, weeklyHours: 14, dailyHours: 7 }).monthly).toBe(627_800); // 14 × 365/84 × 10,320 = 627,800
    expect(calcMinimumWage({ year: 2026, weeklyHours: 25, dailyHours: 5 }).monthly).toBe(1_345_286); // 1,345,285.71
    expect(calcMinimumWage({ year: 2026, weeklyHours: 28, dailyHours: 7 }).monthly).toBe(1_506_720); // 146h exactly
    expect(calcMinimumWage({ year: 2026, weeklyHours: 35, dailyHours: 7 }).monthly).toBe(1_883_400); // 182.5h exactly
    expect(monthlyPayHours(40)).toBe(209);
    expect(monthlyPayHours(0)).toBe(0);
    expect(monthlyPayHours(NaN)).toBe(0);
  });
  it("수습 단시간도 같은 시간 기준: 2026 주 20시간 9,288 × 104.2857…", () => {
    const r = calcMinimumWage({ year: 2026, weeklyHours: 20, dailyHours: 4, probation: true });
    expect(r.monthly).toBe(968_606); // 968,605.71
    expect(r.firstYearAnnual).toBe(968_606 * 3 + 1_076_229 * 9);
    // 2027 수습 9,630 × 104.2857… = 1,004,271.43
    expect(calcMinimumWage({ year: 2027, weeklyHours: 20, dailyHours: 4, probation: true }).monthly).toBe(1_004_271);
  });
  it("주 15시간 2026 주휴 30,960원, 주 14시간은 주휴 없음", () => {
    expect(calcMinimumWage({ year: 2026, weeklyHours: 15, dailyHours: 3 }).juhyuPay).toBe(30_960);
    const r = calcMinimumWage({ year: 2026, weeklyHours: 14, dailyHours: 7 });
    expect(r.juhyuPay).toBe(0);
    expect(r.weekly).toBe(144_480);
  });
  it("2027 주 15·20시간 주휴수당 32,100 / 42,800원", () => {
    expect(calcMinimumWage({ year: 2027, weeklyHours: 15, dailyHours: 3 }).juhyuPay).toBe(32_100);
    expect(calcMinimumWage({ year: 2027, weeklyHours: 20, dailyHours: 4 }).juhyuPay).toBe(42_800);
  });
  it("원 미만은 반올림 (시급·주휴 계산기 hourly-wage와 같은 방식)", () => {
    // 수습 9,288 × 3.3시간 = 30,650.4 → 30,650
    expect(calcMinimumWage({ year: 2026, weeklyHours: 16.5, dailyHours: 3.3, probation: true }).daily).toBe(30_650);
    // 주 15.1시간 주휴 3.02시간 × 10,320 = 31,166.4 → 31,166 (hourly-wage juhyuPay와 같음)
    expect(calcMinimumWage({ year: 2026, weeklyHours: 15.1, dailyHours: 3 }).juhyuPay).toBe(31_166);
  });
  it("1일 8시간 초과분은 연장근로: 5인 이상은 50% 가산 (근로기준법 제50조②·제56조①)", () => {
    const r = calcMinimumWage({ year: 2026, weeklyHours: 40, dailyHours: 10 });
    expect(r.daily).toBe(103_200); // 10,320 × 10 (5인 미만, 가산 없음)
    expect(r.dailyOvertimeHours).toBe(2);
    expect(r.dailyWithPremium).toBe(113_520); // 10,320 × 8 + 10,320 × 1.5 × 2
    const eight = calcMinimumWage({ year: 2026, ...FULL });
    expect(eight.dailyOvertimeHours).toBe(0);
    expect(eight.dailyWithPremium).toBe(eight.daily);
    // 수습 9,288 × (8 + 1.5 × 0.5) = 81,270
    expect(calcMinimumWage({ year: 2026, weeklyHours: 40, dailyHours: 8.5, probation: true }).dailyWithPremium).toBe(81_270);
  });
  it("monthly grows with hours", () => {
    const m = WEEKLY_HOURS_TABLE.map((w) => calcMinimumWage({ year: 2026, weeklyHours: w, dailyHours: 8 }).monthly);
    expect([...m].sort((a, b) => a - b)).toEqual(m);
  });
});

describe("minimum-wage agrees with hourly-wage (같은 근무조건 → 같은 금액)", () => {
  // Monthly pay on the exact (unrounded) hours, 원 단위 반올림; hours shown to 0.01h.
  // Values cross-checked with BigInt: round(시급 × (주 소정 + 주휴) × 365 / 84), 40h = 시급 × 209.
  const EXPECTED: Record<2026 | 2027, Record<number, { hours: number; monthly: number }>> = {
    2026: {
      10: { hours: 43.45, monthly: 448_429 },
      15: { hours: 78.21, monthly: 807_171 },
      20: { hours: 104.29, monthly: 1_076_229 },
      30: { hours: 156.43, monthly: 1_614_343 },
      40: { hours: 209, monthly: 2_156_880 },
    },
    2027: {
      10: { hours: 43.45, monthly: 464_940 },
      15: { hours: 78.21, monthly: 836_893 },
      20: { hours: 104.29, monthly: 1_115_857 },
      30: { hours: 156.43, monthly: 1_673_786 },
      40: { hours: 209, monthly: 2_236_300 },
    },
  };
  for (const year of [2026, 2027] as const) {
    for (const h of [10, 15, 20, 30, 40]) {
      it(`${year}년 주 ${h}시간`, () => {
        const wage = MINIMUM_WAGE[year];
        const m = calcMinimumWage({ year, weeklyHours: h, dailyHours: 8 });
        const p = payForWeeklyHours(h, wage);
        const s = scheduleForHours(h);
        const c = calcHourly({ wage, dailyHours: s.daily, days: s.days });
        expect(m.monthlyHours).toBe(p.monthlyHours);
        expect(m.monthlyHours).toBe(c.monthlyHours);
        expect(m.monthlyPayHours).toBe(p.monthlyPayHours);
        expect(m.monthlyPayHours).toBe(c.monthlyPayHours);
        expect(m.monthly209).toBe(p.monthly209);
        expect(m.monthly).toBe(p.monthlyGross);
        expect(m.monthly).toBe(c.monthlyGross);
        expect(m.juhyuPay).toBe(p.juhyuPay);
        expect(m.weekly).toBe(p.weeklyTotal);
        expect(m.monthlyHours).toBe(EXPECTED[year][h].hours);
        expect(m.monthly).toBe(EXPECTED[year][h].monthly);
      });
    }
  }
  it("every 0.1h from 0.1 to 40h, both years, with and without 수습", () => {
    for (const year of [2026, 2027] as const) {
      for (const probation of [false, true]) {
        for (let tenths = 1; tenths <= 400; tenths++) {
          const w = tenths / 10;
          const m = calcMinimumWage({ year, weeklyHours: w, dailyHours: 8, probation });
          const p = payForWeeklyHours(w, m.hourly);
          expect(m.monthlyHours).toBe(p.monthlyHours);
          expect(m.monthlyPayHours).toBe(p.monthlyPayHours);
          expect(m.monthly).toBe(p.monthlyGross);
          expect(m.weekly).toBe(p.weeklyTotal);
        }
      }
    }
  });
});

describe("minimum-wage: 2026 → 2027", () => {
  it("시급 +380원 (3.7%), 월 +79,420원", () => {
    const d = yearOverYear(FULL);
    expect(d.hourly).toBe(380);
    expect(d.daily).toBe(3_040);
    expect(d.weekly).toBe(18_240);
    expect(d.monthly).toBe(79_420);
    expect(d.annual).toBe(953_040);
    expect(Math.round(d.rate * 1000) / 10).toBe(3.7);
  });
});

describe("minimum-wage: helpers", () => {
  it("net pay uses the verified 2026 engines", () => {
    const n = netMonthly2026(2_156_880);
    // 국민연금 102,410 / 건강 77,530 / 장기요양 10,180 / 고용 19,410 (2026 요율, src/lib/rates/insurance.ts)
    expect(n.insurance.total).toBe(209_530);
    expect(n.net).toBe(2_156_880 - n.insurance.total - n.tax.total);
    expect(n.net).toBeGreaterThan(1_800_000);
  });
  it("산입범위 schedule ends at 0% from 2024", () => {
    const last = INCLUSION_SCHEDULE[INCLUSION_SCHEDULE.length - 1];
    expect(last.bonusExcludedPct).toBe(0);
    expect(last.welfareExcludedPct).toBe(0);
  });
  it("nearest salary page", () => {
    expect(nearestSalaryManwon(25_882_560)).toBe(2_600);
    expect(nearestSalaryManwon(26_835_600)).toBe(2_700);
  });
});
