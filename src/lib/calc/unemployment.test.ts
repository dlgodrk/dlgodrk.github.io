import { describe, expect, it } from "vitest";
import { addDays, addMonths, ymd } from "@/lib/date";
import {
  benefitDays,
  calcUnemployment,
  claimWindow,
  dailyBenefit,
  dailyFloor,
  dailyScheduledHours,
  eligibility,
  floorHours,
  fourWeekPaidHolidayHours,
  INSURED_PERIOD_OPTIONS,
  isInsuredPeriod,
  monthlyAverageHours,
  proposalCap,
  proposalDaily,
  receivePeriod,
  sixDayMonthly,
  wagePeriod,
  weeklyPaidHolidayHours,
  yearRule,
  type InsuredPeriod,
} from "./unemployment";

// Vectors: docs/research/labor-2026.md (easylaw 구직급여일액·소정급여일수, MOEL 2025-12-16 보도자료,
// 고용보험법 별표1). 2026-03-31 이직이면 산정기간이 2026-01-01~03-31(90일)이라 월급 = 기초일액 × 30.
const MAR31 = ymd(2026, 3, 31);
const rule2026 = yearRule(2026)!;

function run(base: number, period: InsuredPeriod, over50OrDisabled: boolean, hours = 8) {
  return calcUnemployment({ separation: MAR31, monthlyWage: base * 30, hours, period, over50OrDisabled })!;
}

describe("yearRule", () => {
  it("2026 이직: 기초일액 상한 113,500원, 일액 상한 68,100원, 최저임금 10,320원", () => {
    expect(rule2026).toEqual({ year: 2026, minWage: 10_320, baseCap: 113_500, dailyCap: 68_100, capConfirmed: true });
  });
  it("2025 이직: 상한 66,000원 (기초일액 110,000원)", () => {
    expect(yearRule(2025)).toMatchObject({ minWage: 10_030, baseCap: 110_000, dailyCap: 66_000, capConfirmed: true });
  });
  it("2027 이직: 상한 미확정 → 현행 금액 유지, 예상치로 표시", () => {
    expect(yearRule(2027)).toMatchObject({ minWage: 10_700, baseCap: 113_500, dailyCap: 68_100, capConfirmed: false });
  });
  it("범위 밖 연도는 계산하지 않음", () => {
    expect(yearRule(2024)).toBeNull();
    expect(yearRule(2028)).toBeNull();
  });
});

describe("dailyFloor (최저구직급여일액)", () => {
  it("2026년 1일 소정근로시간 1~8시간 → 10,320 × h × 80%", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map((h) => dailyFloor(10_320, h))).toEqual([
      8_256, 16_512, 24_768, 33_024, 41_280, 49_536, 57_792, 66_048,
    ]);
  });
  it("8시간을 넘는 소정근로시간은 8시간으로 계산", () => {
    expect(dailyFloor(10_320, 10)).toBe(66_048);
  });
  it("2025년 8시간 64,192원, 2027년 8시간 68,480원", () => {
    expect(dailyFloor(10_030, 8)).toBe(64_192);
    expect(dailyFloor(10_700, 8)).toBe(68_480);
  });
  it("4시간 간주 폐지 후 실제 시간: 2023년 최저임금 9,620원, 하루 2시간 → 15,392원 (종전 4시간 30,784원)", () => {
    // 뉴시스 2023-12-10 '하루 1~3시간 단시간근로자 실업급여, 이달부터 확 줄어든다'
    expect(dailyFloor(9_620, 2)).toBe(15_392);
    expect(dailyFloor(9_620, 4)).toBe(30_784);
  });
  it("소수 시간은 올림해서 계산: 4.8시간 → 5시간분 41,280원", () => {
    expect(dailyFloor(10_320, 4.8)).toBe(41_280);
  });
});

// 고용보험법 시행규칙 제91조의2① (현행 고용노동부령 제479호, 2026-09-18 시행본) +
// 급여기초임금일액 산정규정(고용노동부예규 제221호, 2023-12-01) 제3조②③ (law.go.kr admRulSeq=2100000232090).
describe("floorHours (산정규정 제3조: 소수점 올림, 8시간 상한)", () => {
  it("소수는 올림, 정수는 그대로", () => {
    expect(floorHours(4.8)).toBe(5);
    expect(floorHours(96 / 28)).toBe(4);
    expect(floorHours(4)).toBe(4);
    expect(floorHours(0.2)).toBe(1);
  });
  it("부동소수 오차로 정수가 올라가지 않음", () => {
    expect(floorHours(4.000000000000001)).toBe(4);
    expect(floorHours((24 * 8) / 48)).toBe(4);
  });
  it("8시간 이상은 8시간", () => {
    expect(floorHours(8)).toBe(8);
    expect(floorHours(7.2)).toBe(8);
    expect(floorHours(10)).toBe(8);
  });
  it("0 이하나 숫자가 아니면 NaN", () => {
    expect(floorHours(0)).toBeNaN();
    expect(floorHours(-1)).toBeNaN();
    expect(floorHours(NaN)).toBeNaN();
  });
});

describe("주휴시간 (근로기준법 제18조③·제55조, 시행령 별표2)", () => {
  it("주 15시간 미만은 0, 이상이면 주 소정 ÷ 40 × 8, 40시간에서 멈춤", () => {
    expect([14, 15, 20, 24, 30, 40, 45].map(weeklyPaidHolidayHours)).toEqual([0, 3, 4, 4.8, 6, 8, 8]);
  });
  it("4주 합계는 4주 평균으로 판단", () => {
    expect(fourWeekPaidHolidayHours(80)).toBe(16);
    expect(fourWeekPaidHolidayHours(56)).toBe(0); // 평균 주 14시간
    expect(fourWeekPaidHolidayHours(160)).toBe(32);
  });
});

describe("dailyScheduledHours (시행규칙 제91조의2①)", () => {
  it("일 단위: 그 시간, 소수는 올림, 8시간 상한", () => {
    expect(dailyScheduledHours("day", 8)).toEqual({ basis: "day", scheduled: 8, paidHoliday: 0, average: 8, hours: 8 });
    expect(dailyScheduledHours("day", 4.5)!.hours).toBe(5);
    expect(dailyScheduledHours("day", 9)!.hours).toBe(8);
  });
  it("주 단위: 주 40시간 + 주휴 8 = 48 → 8시간, 주 35시간 + 주휴 7 = 42 → 7시간", () => {
    expect(dailyScheduledHours("week", 40)).toMatchObject({ paidHoliday: 8, average: 8, hours: 8 });
    expect(dailyScheduledHours("week", 35)).toMatchObject({ paidHoliday: 7, average: 7, hours: 7 });
  });
  it("주 3일 × 8시간(주 24시간): (24 + 4.8) ÷ 48 × 8 = 4.8 → 5시간, 8시간이 아님", () => {
    const d = dailyScheduledHours("week", 24)!;
    expect(d.paidHoliday).toBeCloseTo(4.8, 10);
    expect(d.average).toBeCloseTo(4.8, 10);
    expect(d.hours).toBe(5);
  });
  it("주 단위 여러 값: 20 → 4, 22.5 → 4.5 → 5, 17 → 3.4 → 4, 14 → 2.33 → 3, 12 → 2", () => {
    expect([20, 22.5, 17, 14, 12].map((w) => dailyScheduledHours("week", w)!.hours)).toEqual([4, 5, 4, 3, 2]);
  });
  it("주마다 다름: 4주 80시간 → (80 + 16) ÷ 28 = 3.43 → 4시간, 4주 48시간(평균 12) → 48 ÷ 28 → 2시간", () => {
    const d = dailyScheduledHours("fourWeek", 80)!;
    expect(d.paidHoliday).toBe(16);
    expect(d.average).toBeCloseTo(96 / 28, 10);
    expect(d.hours).toBe(4);
    expect(dailyScheduledHours("fourWeek", 48)).toMatchObject({ paidHoliday: 0, hours: 2 });
    expect(dailyScheduledHours("fourWeek", 160)!.hours).toBe(7); // 192 ÷ 28 = 6.86, 조문 그대로
  });
  it("0이나 빈 값은 null", () => {
    expect(dailyScheduledHours("week", 0)).toBeNull();
    expect(dailyScheduledHours("week", NaN)).toBeNull();
    expect(dailyScheduledHours("day", -3)).toBeNull();
  });
  it("월 단위: (월 소정 + 유급휴일) ÷ 209 × 8", () => {
    expect(monthlyAverageHours(174, 35)).toBe(8);
    expect(floorHours(monthlyAverageHours(100, 20))).toBe(5); // 120 × 8 ÷ 209 = 4.59
  });
});

describe("benefitDays (소정급여일수, 별표1)", () => {
  it("50세 미만", () => {
    expect(INSURED_PERIOD_OPTIONS.map((o) => benefitDays(o.value, false))).toEqual([120, 150, 180, 210, 240]);
  });
  it("50세 이상·장애인", () => {
    expect(INSURED_PERIOD_OPTIONS.map((o) => benefitDays(o.value, true))).toEqual([120, 180, 210, 240, 270]);
  });
  it("가입기간 키 검증", () => {
    expect(isInsuredPeriod("3")).toBe(true);
    expect(isInsuredPeriod("2")).toBe(false);
    expect(isInsuredPeriod("toString")).toBe(false);
  });
});

// 산정기간 = [퇴직일(이직일 다음 날) − 3개월, 이직일]. docs/research/labor-2026.md 퇴직금 period 규칙,
// MOEL 퇴직금 계산기(retire_cal.js: 퇴직일에서 setMonth(-3), 끝은 퇴직일 − 1일)와 같은 방식.
describe("wagePeriod (퇴직일부터 거꾸로 3개월 = 이직일까지 3개월)", () => {
  it("2026-10-31 → 08-01부터 92일", () => {
    expect(wagePeriod(ymd(2026, 10, 31))).toEqual({ start: ymd(2026, 8, 1), end: ymd(2026, 10, 31), days: 92 });
  });
  it("2026-03-31 → 01-01부터 90일 (2월 28일)", () => {
    expect(wagePeriod(MAR31)).toEqual({ start: ymd(2026, 1, 1), end: MAR31, days: 90 });
  });
  it("3개월 전 같은 날이 없는 경우: 2026-05-30 → 03-01부터 91일, 05-29도 03-01부터", () => {
    expect(wagePeriod(ymd(2026, 5, 30))).toEqual({ start: ymd(2026, 3, 1), end: ymd(2026, 5, 30), days: 91 });
    expect(wagePeriod(ymd(2026, 5, 29))).toEqual({ start: ymd(2026, 3, 1), end: ymd(2026, 5, 29), days: 90 });
  });
  it("31일 퇴직일의 3개월 전이 30일까지인 달: 2026-07-30 → 05-01부터 91일", () => {
    expect(wagePeriod(ymd(2026, 7, 30))).toEqual({ start: ymd(2026, 5, 1), end: ymd(2026, 7, 30), days: 91 });
  });
  it("월 중간 이직: 2026-07-15 → 04-16부터 91일", () => {
    expect(wagePeriod(ymd(2026, 7, 15))).toEqual({ start: ymd(2026, 4, 16), end: ymd(2026, 7, 15), days: 91 });
  });
  it("짧은 달 말일 이직은 그 달까지 꽉 찬 3개월", () => {
    expect(wagePeriod(ymd(2026, 4, 30))).toEqual({ start: ymd(2026, 2, 1), end: ymd(2026, 4, 30), days: 89 });
    expect(wagePeriod(ymd(2026, 6, 30))).toEqual({ start: ymd(2026, 4, 1), end: ymd(2026, 6, 30), days: 91 });
    expect(wagePeriod(ymd(2026, 11, 30))).toEqual({ start: ymd(2026, 9, 1), end: ymd(2026, 11, 30), days: 91 });
    expect(wagePeriod(ymd(2026, 2, 28))).toEqual({ start: ymd(2025, 12, 1), end: ymd(2026, 2, 28), days: 90 });
  });
  it("윤년 2월 포함: 2028-04-30 → 2028-02-01부터 90일, 2028-02-29 → 2027-12-01부터 91일", () => {
    expect(wagePeriod(ymd(2028, 4, 30))).toEqual({ start: ymd(2028, 2, 1), end: ymd(2028, 4, 30), days: 90 });
    expect(wagePeriod(ymd(2028, 2, 29))).toEqual({ start: ymd(2027, 12, 1), end: ymd(2028, 2, 29), days: 91 });
  });
  it("2025~2027 모든 이직일: 산정기간은 89~92일이고 이직일 다음 날 기준 3개월 전 같은 날(없으면 다음 달 1일)부터", () => {
    for (let d = ymd(2025, 1, 1); d.y <= 2027; d = addDays(d, 1)) {
      const p = wagePeriod(d);
      expect(p.days).toBeGreaterThanOrEqual(89);
      expect(p.days).toBeLessThanOrEqual(92);
      const retire = addDays(d, 1);
      // 시작일의 3개월 뒤는 퇴직일이거나(같은 날 존재), 시작일이 1일이고 퇴직일이 그 달 말일 이후로 밀린 경우
      if (p.start.d !== 1) expect(addMonths(p.start, 3)).toEqual(retire);
    }
  });
});

describe("claimWindow (수급기간 12개월 안에 받을 수 있는 일수)", () => {
  const w = (sep: ReturnType<typeof ymd>, days: number, today: ReturnType<typeof ymd>) => {
    const rp = receivePeriod(sep);
    return claimWindow({ receiveStart: rp.start, receiveEnd: rp.end, days }, today);
  };
  it("아직 이직 전이면 이직 다음 날 신청 기준으로 전부 받음", () => {
    expect(w(ymd(2026, 10, 31), 270, ymd(2026, 10, 9))).toEqual({ ended: false, payableDays: 270, lostDays: 0 });
  });
  it("수급기간이 끝났으면 0일", () => {
    expect(w(ymd(2025, 3, 31), 150, ymd(2026, 10, 9))).toEqual({ ended: true, payableDays: 0, lostDays: 150 });
  });
  it("마지막 날 당일은 아직 끝나지 않았지만 대기기간 7일 때문에 0일", () => {
    expect(w(ymd(2025, 10, 9), 150, ymd(2026, 10, 9))).toEqual({ ended: false, payableDays: 0, lostDays: 150 });
  });
  it("남은 기간이 일수 + 7일보다 짧으면 일부만: 2026-03-31 이직, 오늘 2026-10-09 → 남은 174일 − 7 = 167일", () => {
    // 수급기간 2026-04-01 ~ 2027-03-31, 10-09부터 03-31까지 174일
    expect(w(ymd(2026, 3, 31), 240, ymd(2026, 10, 9))).toEqual({ ended: false, payableDays: 167, lostDays: 73 });
    expect(w(ymd(2026, 3, 31), 150, ymd(2026, 10, 9))).toEqual({ ended: false, payableDays: 150, lostDays: 0 });
  });
});

describe("receivePeriod (이직일 다음 날부터 12개월)", () => {
  it("2026-10-31 이직 → 2026-11-01 ~ 2027-10-31", () => {
    expect(receivePeriod(ymd(2026, 10, 31))).toEqual({ start: ymd(2026, 11, 1), end: ymd(2027, 10, 31) });
  });
  it("2026-02-28 이직 → 2026-03-01 ~ 2027-02-28", () => {
    expect(receivePeriod(ymd(2026, 2, 28))).toEqual({ start: ymd(2026, 3, 1), end: ymd(2027, 2, 28) });
  });
});

describe("calcUnemployment — research vectors (2026 이직)", () => {
  it("기초일액 150,000원, 45세, 피보험 4년 → 상한 68,100원 × 180일 = 12,258,000원", () => {
    const r = run(150_000, "3", false);
    expect(r.baseDaily).toBe(150_000);
    expect(r.capApplied).toBe(true);
    expect(r.appliedBase).toBe(113_500);
    expect(r.daily).toBe(68_100);
    expect(r.days).toBe(180);
    expect(r.total).toBe(12_258_000);
  });
  it("기초일액 100,000원, 52세, 피보험 12년 → 하한 66,048원 × 270일 = 17,832,960원", () => {
    const r = run(100_000, "10", true);
    expect(r.computedDaily).toBe(60_000);
    expect(r.floorApplied).toBe(true);
    expect(r.daily).toBe(66_048);
    expect(r.total).toBe(17_832_960);
  });
  it("기초일액 112,000원, 30세, 피보험 2년 → 67,200원 × 150일 = 10,080,000원", () => {
    const r = run(112_000, "1", false);
    expect(r.capApplied).toBe(false);
    expect(r.floorApplied).toBe(false);
    expect(r.daily).toBe(67_200);
    expect(r.total).toBe(10_080_000);
  });
  it("1일 4시간, 기초일액 45,000원, 25세, 10개월 → 하한 33,024원 × 120일 = 3,962,880원", () => {
    const r = run(45_000, "0", false, 4);
    expect(r.computedDaily).toBe(27_000);
    expect(r.floor).toBe(33_024);
    expect(r.daily).toBe(33_024);
    expect(r.total).toBe(3_962_880);
  });
  it("장애인 35세, 피보험 6년, 기초일액 90,000원 → 66,048원 × 240일 = 15,851,520원", () => {
    const r = run(90_000, "5", true);
    expect(r.daily).toBe(66_048);
    expect(r.days).toBe(240);
    expect(r.total).toBe(15_851_520);
  });
  it("월 환산(30일): 하한 1,981,440원, 상한 2,043,000원", () => {
    expect(run(50_000, "1", false).monthly).toBe(1_981_440);
    expect(run(200_000, "1", false).monthly).toBe(2_043_000);
  });
});

describe("calcUnemployment — 산정 과정", () => {
  it("기본값: 2026-10-31 이직, 월 300만원, 8시간, 1~3년 → 기초일액 97,826원, 하한 66,048원 × 150일", () => {
    const r = calcUnemployment({
      separation: ymd(2026, 10, 31),
      monthlyWage: 3_000_000,
      hours: 8,
      period: "1",
      over50OrDisabled: false,
    })!;
    expect(r.wageDays).toBe(92);
    expect(r.totalWage).toBe(9_000_000);
    expect(r.baseDaily).toBe(97_826); // 9,000,000 ÷ 92 = 97,826.08 → 원 미만 절사
    expect(r.computedDaily).toBe(58_695);
    expect(r.daily).toBe(66_048);
    expect(r.total).toBe(9_907_200);
    expect(r.receiveStart).toEqual(ymd(2026, 11, 1));
    expect(r.receiveEnd).toEqual(ymd(2027, 10, 31));
    expect(r.projected).toBe(false);
  });
  it("상·하한 사이: 월 340만원, 92일 → 기초일액 110,869원 × 60% = 66,521원", () => {
    const r = calcUnemployment({
      separation: ymd(2026, 10, 31),
      monthlyWage: 3_400_000,
      hours: 8,
      period: "3",
      over50OrDisabled: false,
    })!;
    expect(r.baseDaily).toBe(110_869);
    expect(r.daily).toBe(66_521);
    expect(r.capApplied).toBe(false);
    expect(r.floorApplied).toBe(false);
    expect(r.total).toBe(66_521 * 180);
  });
  it("짧은 달 말일 이직, 상·하한 사이: 2026-04-30, 4시간, 월 250만원 → 89일, 기초일액 84,269원 → 50,561원 × 150일", () => {
    const r = calcUnemployment({ separation: ymd(2026, 4, 30), monthlyWage: 2_500_000, hours: 4, period: "1", over50OrDisabled: false })!;
    expect(r.wageStart).toEqual(ymd(2026, 2, 1));
    expect(r.wageDays).toBe(89);
    expect(r.baseDaily).toBe(84_269); // 7,500,000 ÷ 89 = 84,269.66
    expect(r.daily).toBe(50_561);
    expect(r.total).toBe(7_584_150);
  });
  it("2025 이직: 하한 64,192원, 상한 66,000원", () => {
    const low = calcUnemployment({ separation: ymd(2025, 12, 31), monthlyWage: 2_000_000, hours: 8, period: "0", over50OrDisabled: false })!;
    const high = calcUnemployment({ separation: ymd(2025, 12, 31), monthlyWage: 9_000_000, hours: 8, period: "0", over50OrDisabled: false })!;
    expect(low.daily).toBe(64_192);
    expect(high.daily).toBe(66_000);
  });
  it("2027 이직(예상): 8시간 하한 68,480원이 현행 상한 68,100원보다 높아 하한 적용", () => {
    const r = calcUnemployment({ separation: ymd(2027, 3, 31), monthlyWage: 6_000_000, hours: 8, period: "5", over50OrDisabled: false })!;
    expect(r.projected).toBe(true);
    expect(r.capApplied).toBe(true);
    expect(r.computedDaily).toBe(68_100);
    expect(r.floorApplied).toBe(true);
    expect(r.daily).toBe(68_480);
    expect(r.total).toBe(68_480 * 210);
  });
  it("2027 이직, 4시간: 하한 34,240원, 상한은 현행 68,100원", () => {
    const b = dailyBenefit(100_000, yearRule(2027)!, 4);
    expect(b.floor).toBe(34_240);
    expect(b.daily).toBe(60_000);
  });
  it("회귀: 주 3일 × 8시간 단시간 근로자는 하한을 8시간이 아니라 5시간으로 계산 (41,280원, 66,048원 아님)", () => {
    const hours = dailyScheduledHours("week", 24)!;
    const r = calcUnemployment({
      separation: ymd(2026, 10, 31),
      monthlyWage: 1_500_000,
      hours: hours.average,
      period: "0",
      over50OrDisabled: false,
    })!;
    expect(r.baseDaily).toBe(48_913); // 4,500,000 ÷ 92
    expect(r.computedDaily).toBe(29_347);
    expect(r.hours).toBe(5);
    expect(r.floor).toBe(41_280);
    expect(r.daily).toBe(41_280);
    expect(r.total).toBe(41_280 * 120);
  });
  it("회귀: 일 단위 4.5시간은 올림해 5시간 하한", () => {
    const r = calcUnemployment({ separation: ymd(2026, 10, 31), monthlyWage: 1_000_000, hours: 4.5, period: "0", over50OrDisabled: false })!;
    expect(r.hours).toBe(5);
    expect(r.floor).toBe(41_280);
  });
  it("잘못된 입력은 null", () => {
    const base = { hours: 8, period: "1" as const, over50OrDisabled: false };
    expect(calcUnemployment({ ...base, hours: 0, separation: ymd(2026, 10, 31), monthlyWage: 3_000_000 })).toBeNull();
    expect(calcUnemployment({ ...base, hours: NaN, separation: ymd(2026, 10, 31), monthlyWage: 3_000_000 })).toBeNull();
    expect(calcUnemployment({ ...base, separation: ymd(2026, 10, 31), monthlyWage: NaN })).toBeNull();
    expect(calcUnemployment({ ...base, separation: ymd(2026, 10, 31), monthlyWage: 0 })).toBeNull();
    expect(calcUnemployment({ ...base, separation: ymd(2024, 12, 31), monthlyWage: 3_000_000 })).toBeNull();
    expect(calcUnemployment({ ...base, separation: ymd(2028, 1, 1), monthlyWage: 3_000_000 })).toBeNull();
  });
});

describe("eligibility", () => {
  it("비자발적 + 180일 충족 → 수급 가능", () => {
    expect(eligibility({ metInsuredDays: true, voluntary: false, justified: false })).toEqual({ eligible: true, reasons: [] });
  });
  it("자발적이라도 정당한 사유가 있으면 수급 가능", () => {
    expect(eligibility({ metInsuredDays: true, voluntary: true, justified: true }).eligible).toBe(true);
  });
  it("자발적 + 정당한 사유 없음 → 제한", () => {
    expect(eligibility({ metInsuredDays: true, voluntary: true, justified: false }).reasons).toEqual(["voluntary"]);
  });
  it("180일 미충족은 이직 사유와 무관하게 제한", () => {
    expect(eligibility({ metInsuredDays: false, voluntary: true, justified: false }).reasons).toEqual([
      "insured-days",
      "voluntary",
    ]);
  });
});

describe("2027 정부안 (미확정, 셈셈 추산)", () => {
  it("상한 = 8시간 하한 68,480원 × 103% = 70,534원", () => {
    expect(proposalCap(2027)).toBe(70_534);
    expect(proposalCap(2030)).toBeNull();
  });
  it("주 6일분 지급 시 30일 환산: 하한 약 176만원, 상한 약 181만원 (보도 수치와 일치)", () => {
    expect(sixDayMonthly(68_480)).toBe(1_760_914);
    expect(sixDayMonthly(70_534)).toBe(1_813_731);
  });
  it("정부안 일액은 현행 정액 상한이 아니라 정부안 상한으로 자름: 2027-03-31, 월 400만원, 8시간 → 70,534원", () => {
    const r = calcUnemployment({ separation: ymd(2027, 3, 31), monthlyWage: 4_000_000, hours: 8, period: "1", over50OrDisabled: false })!;
    expect(r.baseDaily).toBe(133_333);
    expect(r.daily).toBe(68_480); // 현행: 하한이 상한보다 우선
    expect(proposalDaily(r.baseDaily, 2027, 8)).toBe(70_534);
    expect(sixDayMonthly(proposalDaily(r.baseDaily, 2027, 8)!)).toBe(1_813_731);
  });
  it("정부안 일액: 하한 아래는 하한, 상·하한 사이는 60%", () => {
    expect(proposalDaily(66_666, 2027, 8)).toBe(68_480);
    expect(proposalDaily(115_000, 2027, 8)).toBe(69_000);
    expect(proposalDaily(100_000, 2027, 4)).toBe(60_000);
    expect(proposalDaily(100_000, 2030, 8)).toBeNull();
  });
});
