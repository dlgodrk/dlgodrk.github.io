import { describe, expect, it } from "vitest";
import { MINIMUM_WAGE } from "@/lib/rates/labor";
import {
  calcMinimumWage,
  hourlyMinimum,
  INCLUSION_SCHEDULE,
  juhyuHours,
  MINIMUM_WAGE_HISTORY,
  monthlyHours,
  monthlyHoursExact,
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
  it("월 환산 시간 = (주 소정 + 주휴) × 365/7/12, 시간 단위 올림", () => {
    // labor-2026.md: "(weeklyHrs + weeklyHolidayHrs) * 365/7/12, rounded UP to an integer"
    expect(monthlyHoursExact(40)).toBeCloseTo(208.571, 3);
    expect(monthlyHours(40)).toBe(209);
    expect(monthlyHoursExact(20)).toBeCloseTo(104.286, 3);
    expect(monthlyHours(20)).toBe(105);
    expect(monthlyHours(15)).toBe(79); // 78.21 → 79
    expect(monthlyHours(25)).toBe(131); // 130.36 → 131
    expect(monthlyHours(30)).toBe(157); // 156.43 → 157
    expect(monthlyHours(35)).toBe(183); // 182.5 → 183
    expect(monthlyHours(10)).toBe(44); // 주휴 없음: 10 × 365/84 = 43.45 → 44
    expect(monthlyHours(28)).toBe(146); // 33.6 × 365/84 = 146 exactly (no float noise → no extra hour)
    expect(monthlyHours(0)).toBe(0);
  });
  it("표시하는 최저 월급은 법정 기준(시급 × 정확한 월 환산 시간) 이상 (최저임금법 시행령 제5조①3)", () => {
    for (const year of [2026, 2027] as const) {
      for (const probation of [false, true]) {
        for (let tenths = 1; tenths <= 400; tenths++) {
          const w = tenths / 10;
          const r = calcMinimumWage({ year, weeklyHours: w, dailyHours: 8, probation });
          const exact = r.hourly * monthlyHoursExact(w);
          expect(r.monthly).toBeGreaterThanOrEqual(exact - 1e-6);
          // 올림은 1시간 미만만 더합니다.
          expect(r.monthly).toBeLessThan(exact + r.hourly + 1);
        }
      }
    }
  });
  it("주 20시간 2026: 주급 247,680원 (주휴 41,280원), 월 1,083,600원", () => {
    const r = calcMinimumWage({ year: 2026, weeklyHours: 20, dailyHours: 4 });
    expect(r.juhyuPay).toBe(41_280); // labor-2026.md: 주 20h → 41,280원
    expect(r.weekly).toBe(247_680);
    expect(r.daily).toBe(41_280);
    expect(r.monthly).toBe(1_083_600); // 10,320 × 105 (정확한 기준 1,076,228.6원 이상)
    expect(calcMinimumWage({ year: 2027, weeklyHours: 20, dailyHours: 4 }).monthly).toBe(1_123_500); // 10,700 × 105
  });
  it("주 10·15·30시간 2026 월급", () => {
    expect(calcMinimumWage({ year: 2026, weeklyHours: 10, dailyHours: 2 }).monthly).toBe(454_080); // 10,320 × 44
    expect(calcMinimumWage({ year: 2026, weeklyHours: 15, dailyHours: 3 }).monthly).toBe(815_280); // 10,320 × 79
    expect(calcMinimumWage({ year: 2026, weeklyHours: 30, dailyHours: 6 }).monthly).toBe(1_620_240); // 10,320 × 157
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
  it("원 미만은 올림 (최저임금 이상 지급)", () => {
    // 수습 9,288 × 3.3시간 = 30,650.4 → 30,651
    expect(calcMinimumWage({ year: 2026, weeklyHours: 16.5, dailyHours: 3.3, probation: true }).daily).toBe(30_651);
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
