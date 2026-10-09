import { describe, expect, it } from "vitest";
import { addDays, formatYMD, parseYMD, type YMD } from "@/lib/date";
import {
  averageDailyWage,
  averageWagePeriod,
  basicIncomeTax,
  calcSeverance,
  convertedSalaryDeduction,
  firstEligibleRetireDate,
  hasOneYearService,
  oneYearBefore,
  retirementIncomeTax,
  serviceDays,
  serviceMonths,
  serviceYearsDeduction,
  severanceAmount,
  severanceEstimate,
  TABLE_MONTHLY,
  TABLE_YEARS,
  taxServiceYears,
} from "./severance";

const d = (s: string): YMD => parseYMD(s)!;

describe("dates", () => {
  it("counts 재직일수 as 퇴직일 − 입사일", () => {
    // MOEL 예제: 2014-10-02 입사, 퇴직일 2017-09-16 → 1,080일 (https://www.moel.go.kr/retirementpayCal.do)
    expect(serviceDays(d("2014-10-02"), d("2017-09-16"))).toBe(1080);
    // Default inputs: 2022-03-02 → 2026-10-01
    expect(serviceDays(d("2022-03-02"), d("2026-10-01"))).toBe(1674);
  });

  it("applies the MOEL one-year rule (입사일 > 퇴직일 − 1년 → 미지급)", () => {
    expect(hasOneYearService(d("2025-10-01"), d("2026-10-01"))).toBe(true); // exactly 1 year
    expect(hasOneYearService(d("2025-10-02"), d("2026-10-01"))).toBe(false); // 364 days
    // 365 days across a leap day is still short of one calendar year
    expect(serviceDays(d("2023-03-02"), d("2024-03-01"))).toBe(365);
    expect(hasOneYearService(d("2023-03-02"), d("2024-03-01"))).toBe(false);
    // 민법 제160조: 2028-02-29 − 1년 → 2027-02-28 (MOEL's JS setFullYear would give 2027-03-01)
    expect(formatYMD(oneYearBefore(d("2028-02-29")))).toBe("2027-02-28");
  });

  it("does not count 365 days ending on a leap day as one year", () => {
    // 2027-03-01 입사: 1년은 2028-02-29에 끝나므로 퇴직일은 2028-03-01 이후여야 함
    expect(serviceDays(d("2027-03-01"), d("2028-02-29"))).toBe(365);
    expect(hasOneYearService(d("2027-03-01"), d("2028-02-29"))).toBe(false);
    expect(hasOneYearService(d("2027-03-01"), d("2028-03-01"))).toBe(true);
    // 2027-02-28 입사: 1년은 2028-02-27에 끝나므로 퇴직일 2028-02-28부터 대상
    expect(hasOneYearService(d("2027-02-28"), d("2028-02-27"))).toBe(false);
    expect(hasOneYearService(d("2027-02-28"), d("2028-02-28"))).toBe(true);
    expect(hasOneYearService(d("2027-02-28"), d("2028-02-29"))).toBe(true);
    // 2024-02-29 입사: 2025년에 2/29가 없어 2/28에 1년이 끝나므로 퇴직일 2025-03-01부터
    expect(hasOneYearService(d("2024-02-29"), d("2025-02-28"))).toBe(false);
    expect(hasOneYearService(d("2024-02-29"), d("2025-03-01"))).toBe(true);
  });

  it("finds the first eligible 퇴직일", () => {
    expect(formatYMD(firstEligibleRetireDate(d("2026-03-02")))).toBe("2027-03-02");
    expect(formatYMD(firstEligibleRetireDate(d("2024-02-29")))).toBe("2025-03-01");
    expect(formatYMD(firstEligibleRetireDate(d("2027-03-01")))).toBe("2028-03-01");
    expect(formatYMD(firstEligibleRetireDate(d("2027-02-28")))).toBe("2028-02-28");
    expect(formatYMD(firstEligibleRetireDate(d("2003-03-01")))).toBe("2004-03-01");
  });

  it("agrees with hasOneYearService for every 입사일 (2000~2032)", () => {
    let hire = d("2000-01-01");
    while (hire.y <= 2032) {
      const first = firstEligibleRetireDate(hire);
      expect(hasOneYearService(hire, first)).toBe(true);
      expect(hasOneYearService(hire, addDays(first, -1))).toBe(false);
      expect(hasOneYearService(hire, addDays(first, 1))).toBe(true);
      hire = addDays(hire, 1);
    }
  });

  it("builds the 3-month window like the MOEL calculator", () => {
    const p = (s: string) => {
      const r = averageWagePeriod(d(s));
      return `${formatYMD(r.start)}~${formatYMD(r.end)} ${r.days}`;
    };
    // MOEL 예제: 퇴직일 2017-09-16 → 2017-06-16 ~ 2017-09-15 (92일)
    expect(p("2017-09-16")).toBe("2017-06-16~2017-09-15 92");
    // retire_cal.js setDate(): 10/1 → 7/1~9/30, 5/31 → 3/1~5/30, 3/31 → 12/31~3/30, 3/15 → 12/15~3/14
    expect(p("2026-10-01")).toBe("2026-07-01~2026-09-30 92");
    expect(p("2026-05-31")).toBe("2026-03-01~2026-05-30 91");
    expect(p("2026-03-31")).toBe("2025-12-31~2026-03-30 90");
    expect(p("2026-03-15")).toBe("2025-12-15~2026-03-14 90");
    // February edge cases: 5/29 of a common year → 3/1 (89일, the minimum); leap year keeps 2/29
    expect(p("2026-05-29")).toBe("2026-03-01~2026-05-28 89");
    expect(p("2028-05-29")).toBe("2028-02-29~2028-05-28 90");
    expect(p("2028-05-30")).toBe("2028-03-01~2028-05-29 90");
    // Other month-end clamps follow the calendar (MOEL idx 4 branch): 12/31 → 9/30
    expect(p("2026-12-31")).toBe("2026-09-30~2026-12-30 92");
    expect(p("2026-07-31")).toBe("2026-04-30~2026-07-30 92");
  });

  it("window length is always 89~92 days", () => {
    let day = d("2026-01-01");
    for (let i = 0; i < 366 * 3; i++) {
      const { days } = averageWagePeriod(day);
      expect(days).toBeGreaterThanOrEqual(89);
      expect(days).toBeLessThanOrEqual(92);
      day = addDays(day, 1);
    }
  });
});

describe("average wage and severance (MOEL rounding: ceil 0.01원, round 1원)", () => {
  it("MOEL 예제 → 88,641.31원, 7,868,434원", () => {
    // https://www.moel.go.kr/retirementpayCal.do (88,641원 31전) + retire_cal.js
    const w = averageDailyWage({ wage3m: 7_080_000, annualBonus: 4_000_000, annualLeavePay: 300_000, days: 92 });
    expect(w.bonusAdd).toBe(1_000_000);
    expect(w.leaveAdd).toBe(75_000);
    expect(w.total).toBe(8_155_000);
    expect(w.daily).toBe(88_641.31);
    expect(severanceAmount(w.daily, 1080)).toBe(7_868_434);
  });

  it("research vectors (docs/research/labor-2026.md)", () => {
    const a = averageDailyWage({ wage3m: 9_000_000, annualBonus: 0, annualLeavePay: 0, days: 92 });
    expect(a.daily).toBe(97_826.09);
    expect(severanceAmount(a.daily, 1095)).toBe(8_804_348);

    const b = averageDailyWage({ wage3m: 6_000_000, annualBonus: 0, annualLeavePay: 0, days: 92 });
    expect(b.daily).toBe(65_217.4);
    expect(severanceAmount(b.daily, 365)).toBe(1_956_522);

    const c = averageDailyWage({ wage3m: 10_500_000, annualBonus: 6_000_000, annualLeavePay: 0, days: 92 });
    expect(c.daily).toBe(130_434.79);
    expect(severanceAmount(c.daily, 1826)).toBe(19_575_939);
  });

  it("keeps fractional 가산액 exact (상여 not divisible by 4)", () => {
    const w = averageDailyWage({ wage3m: 0, annualBonus: 1_000_001, annualLeavePay: 0, days: 92 });
    expect(w.bonusAdd).toBe(250_000.25);
    // 250,000.25 / 92 = 2,717.3940… → 2,717.40
    expect(w.daily).toBe(2_717.4);
  });

  it("does not over-ceil exact quotients", () => {
    expect(averageDailyWage({ wage3m: 5_400_000, annualBonus: 0, annualLeavePay: 0, days: 90 }).daily).toBe(60_000);
    expect(averageDailyWage({ wage3m: 9_200_000, annualBonus: 0, annualLeavePay: 0, days: 92 }).daily).toBe(100_000);
  });
});

describe("calcSeverance", () => {
  it("MOEL 예제 end to end (퇴직소득세 75,720원)", () => {
    const r = calcSeverance({
      hire: d("2014-10-02"),
      retire: d("2017-09-16"),
      wage3m: 7_080_000,
      annualBonus: 4_000_000,
      annualLeavePay: 300_000,
      weekly15h: true,
    })!;
    expect(r.eligible).toBe(true);
    expect(r.termDays).toBe(1080);
    expect(r.period.days).toBe(92);
    expect(r.wage.daily).toBe(88_641.31);
    expect(r.basis).toBe("average");
    expect(r.severance).toBe(7_868_434);
    // 35개월 14일 → 36개월 → 3년
    expect(r.months).toBe(36);
    expect(r.tax!.years).toBe(3);
    expect(r.tax!.converted).toBe(19_473_736);
    expect(r.tax!.convertedDeduction).toBe(14_884_241);
    expect(r.tax!.taxBase).toBe(4_589_495);
    expect(r.tax!.convertedTax).toBe(275_369);
    expect(r.tax!.computedTax).toBe(68_842);
    expect(r.tax!.incomeTax).toBe(68_840);
    expect(r.tax!.localTax).toBe(6_880);
    expect(r.tax!.total).toBe(75_720);
    expect(r.net).toBe(7_868_434 - 75_720);
  });

  it("uses the 통상임금 floor (근로기준법 제2조②)", () => {
    // 3개월 5,400,000 / 90일 = 60,000 < 통상일급 82,560 (10,320 × 8); 재직 730일 → 4,953,600원
    const r = calcSeverance({
      hire: d("2024-03-01"),
      retire: d("2026-03-01"), // 730 days, window 2025-12-01~2026-02-28 = 90 days
      wage3m: 5_400_000,
      annualBonus: 0,
      annualLeavePay: 0,
      ordinaryDaily: 82_560,
      weekly15h: true,
    })!;
    expect(r.termDays).toBe(730);
    expect(r.period.days).toBe(90);
    expect(r.wage.daily).toBe(60_000);
    expect(r.basis).toBe("ordinary");
    expect(r.baseDaily).toBe(82_560);
    expect(r.severance).toBe(4_953_600);
  });

  it("ignores a 통상임금 lower than the average wage", () => {
    const r = calcSeverance({
      hire: d("2024-03-01"),
      retire: d("2026-03-01"),
      wage3m: 9_000_000,
      annualBonus: 0,
      annualLeavePay: 0,
      ordinaryDaily: 50_000,
      weekly15h: true,
    })!;
    expect(r.basis).toBe("average");
    expect(r.baseDaily).toBe(100_000);
  });

  it("pays nothing under 1 year or under 15h/week (근퇴법 제4조①)", () => {
    const base = { wage3m: 9_000_000, annualBonus: 0, annualLeavePay: 0, weekly15h: true };
    const short = calcSeverance({ ...base, hire: d("2025-10-02"), retire: d("2026-10-01") })!;
    expect(short.termDays).toBe(364);
    expect(short.eligible).toBe(false);
    expect(short.reasons).toEqual(["under1y"]);
    expect(short.severance).toBe(0);
    expect(short.tax).toBeNull();
    expect(formatYMD(short.firstEligible)).toBe("2026-10-02");

    // Leap-day 퇴직일: 365 days is short of one year, and the stated first eligible 퇴직일 is the real one
    const leap = calcSeverance({ ...base, hire: d("2027-03-01"), retire: d("2028-02-29") })!;
    expect(leap.termDays).toBe(365);
    expect(leap.eligible).toBe(false);
    expect(leap.severance).toBe(0);
    expect(formatYMD(leap.firstEligible)).toBe("2028-03-01");
    const leapOk = calcSeverance({ ...base, hire: d("2027-03-01"), retire: leap.firstEligible })!;
    expect(leapOk.eligible).toBe(true);
    expect(leapOk.termDays).toBe(366);

    const part = calcSeverance({ ...base, weekly15h: false, hire: d("2022-03-02"), retire: d("2026-10-01") })!;
    expect(part.eligible).toBe(false);
    expect(part.reasons).toEqual(["under15h"]);
    expect(part.severance).toBe(0);
  });

  it("default inputs (2022-03-02 → 2026-10-01, 월 300만원)", () => {
    const r = calcSeverance({
      hire: d("2022-03-02"),
      retire: d("2026-10-01"),
      wage3m: 9_000_000,
      annualBonus: 0,
      annualLeavePay: 0,
      ordinaryDaily: NaN,
      weekly15h: true,
    })!;
    expect(r.termDays).toBe(1674);
    expect(r.period.days).toBe(92);
    expect(r.wage.daily).toBe(97_826.09);
    // 97,826.09 × 30 × 1,674 ÷ 365 = 13,459,797.9…
    expect(r.severance).toBe(13_459_798);
    expect(r.months).toBe(55);
    expect(r.tax!.years).toBe(5);
    expect(r.tax!.serviceDeduction).toBe(5_000_000);
    expect(r.tax!.converted).toBe(20_303_515);
    expect(r.tax!.convertedDeduction).toBe(15_382_109);
    expect(r.tax!.taxBase).toBe(4_921_406);
    expect(r.tax!.convertedTax).toBe(295_284);
    expect(r.tax!.computedTax).toBe(123_035);
    expect(r.tax!.incomeTax).toBe(123_030);
    expect(r.tax!.localTax).toBe(12_300);
    expect(r.net).toBe(13_459_798 - 135_330);
  });

  it("rejects 퇴직일 on or before 입사일", () => {
    const base = { wage3m: 1, annualBonus: 0, annualLeavePay: 0, weekly15h: true };
    expect(calcSeverance({ ...base, hire: d("2026-10-01"), retire: d("2026-10-01") })).toBeNull();
    expect(calcSeverance({ ...base, hire: d("2026-10-02"), retire: d("2026-10-01") })).toBeNull();
  });
});

describe("근속월수·근속연수", () => {
  it("counts a partial month as a whole month", () => {
    expect(serviceMonths(d("2014-10-02"), d("2017-09-16"))).toBe(36);
    expect(serviceMonths(d("2025-10-01"), d("2026-10-01"))).toBe(12);
    expect(serviceMonths(d("2025-10-01"), d("2026-10-02"))).toBe(13);
    expect(serviceMonths(d("2026-01-31"), d("2026-03-01"))).toBe(1); // 1/31~2/28 = 1개월
    expect(serviceMonths(d("2026-01-31"), d("2026-03-02"))).toBe(2);
    expect(serviceMonths(d("2026-10-01"), d("2026-10-02"))).toBe(1);
  });
  it("rounds years up", () => {
    expect(taxServiceYears(12)).toBe(1);
    expect(taxServiceYears(13)).toBe(2);
    expect(taxServiceYears(55)).toBe(5);
    expect(taxServiceYears(120)).toBe(10);
    expect(taxServiceYears(121)).toBe(11);
    expect(taxServiceYears(1)).toBe(1);
  });
});

describe("퇴직소득세 (소득세법 제48·55조, 2026 귀속)", () => {
  it("근속연수공제", () => {
    expect(serviceYearsDeduction(3)).toBe(3_000_000);
    expect(serviceYearsDeduction(5)).toBe(5_000_000);
    expect(serviceYearsDeduction(10)).toBe(15_000_000);
    expect(serviceYearsDeduction(20)).toBe(40_000_000);
    expect(serviceYearsDeduction(30)).toBe(70_000_000);
  });

  it("환산급여공제", () => {
    expect(convertedSalaryDeduction(8_000_000)).toBe(8_000_000);
    expect(convertedSalaryDeduction(42_000_000)).toBe(28_400_000);
    expect(convertedSalaryDeduction(70_000_000)).toBe(45_200_000);
    expect(convertedSalaryDeduction(102_000_000)).toBe(62_600_000);
    expect(convertedSalaryDeduction(300_000_000)).toBe(151_700_000);
  });

  it("기본세율", () => {
    expect(basicIncomeTax(13_600_000)).toBe(816_000);
    expect(basicIncomeTax(39_400_000)).toBe(4_650_000);
    expect(basicIncomeTax(14_000_000)).toBe(840_000);
    expect(basicIncomeTax(50_000_000)).toBe(6_240_000);
    expect(basicIncomeTax(0)).toBe(0);
  });

  it("5,000만원 · 10년 → 748,000원 (glasswallet example)", () => {
    const t = retirementIncomeTax(50_000_000, 10);
    expect(t.serviceDeduction).toBe(15_000_000);
    expect(t.converted).toBe(42_000_000);
    expect(t.convertedDeduction).toBe(28_400_000);
    expect(t.taxBase).toBe(13_600_000);
    expect(t.convertedTax).toBe(816_000);
    expect(t.incomeTax).toBe(680_000);
    expect(t.localTax).toBe(68_000);
    expect(t.total).toBe(748_000);
  });

  it("1억 · 10년 → 4,262,500원 (moneynestlab example)", () => {
    const t = retirementIncomeTax(100_000_000, 10);
    expect(t.converted).toBe(102_000_000);
    expect(t.convertedDeduction).toBe(62_600_000);
    expect(t.taxBase).toBe(39_400_000);
    expect(t.convertedTax).toBe(4_650_000);
    expect(t.incomeTax).toBe(3_875_000);
    expect(t.localTax).toBe(387_500);
    expect(t.total).toBe(4_262_500);
  });

  it("summary-table vectors (research digest)", () => {
    const total = (amount: number, years: number) => retirementIncomeTax(amount, years).total;
    expect(total(100_000_000, 20)).toBe(1_232_000);
    expect(total(100_000_000, 30)).toBe(264_000);
    expect(total(200_000_000, 10)).toBe(19_662_500);
    expect(total(200_000_000, 20)).toBe(7_727_500);
    expect(total(200_000_000, 30)).toBe(3_795_000);
    expect(total(300_000_000, 10)).toBe(42_889_000);
    expect(total(300_000_000, 20)).toBe(19_844_000);
    expect(total(300_000_000, 30)).toBe(10_848_750);
    expect(total(30_000_000, 10)).toBe(220_000);
    expect(total(50_000_000, 20)).toBe(0);
  });

  it("5억 · 10년 → 10원 절사 (97,808,320원)", () => {
    const t = retirementIncomeTax(500_000_000, 10);
    expect(t.convertedTax).toBe(106_700_000);
    expect(t.computedTax).toBe(88_916_666);
    expect(t.incomeTax).toBe(88_916_660);
    expect(t.localTax).toBe(8_891_660);
    expect(t.total).toBe(97_808_320);
  });

  it("small amounts", () => {
    // 근속연수공제는 퇴직소득금액이 한도 (제48조②)
    const tiny = retirementIncomeTax(800_000, 1);
    expect(tiny.serviceDeduction).toBe(800_000);
    expect(tiny.total).toBe(0);
    // 2,000,000 · 1년: 환산 12,000,000 → 공제 10,400,000 → 과표 1,600,000 → 96,000 × 1/12 = 8,000
    const small = retirementIncomeTax(2_000_000, 1);
    expect(small.incomeTax).toBe(8_000);
    expect(small.localTax).toBe(800);
    // 1,150,000 · 1년: 환산 1,800,000 → 전액 공제 → 0
    expect(retirementIncomeTax(1_150_000, 1).total).toBe(0);
  });

  it("applies 소액부징수 when 산출세액 < 1,000원", () => {
    // 1,750,000 · 1년: 근속공제 1,000,000 → 환산 9,000,000 → 공제 8,600,000 → 과표 400,000 → 24,000 × 1/12 = 2,000
    expect(retirementIncomeTax(1_750_000, 1).incomeTax).toBe(2_000);
    // 1,700,000 · 1년: 환산 8,400,000 → 공제 8,240,000 → 과표 160,000 → 9,600 × 1/12 = 800 → 0
    const t = retirementIncomeTax(1_700_000, 1);
    expect(t.computedTax).toBe(800);
    expect(t.incomeTax).toBe(0);
    expect(t.localTax).toBe(0);
  });
});

describe("tables", () => {
  it("월급·근속연수 표 (92일, 상여 없음)", () => {
    // 300만원: 9,000,000 / 92 = 97,826.09 → × 30 = 2,934,782.7 per year
    expect(severanceEstimate(3_000_000, 1)).toBe(2_934_783);
    expect(severanceEstimate(3_000_000, 3)).toBe(8_804_348);
    expect(severanceEstimate(2_500_000, 1)).toBe(2_445_652);
    // page description example: 월 300만원 · 5년 → 97,826.09 × 150 = 14,673,913.5 → 14,673,914원, 세금 167,380원
    expect(severanceEstimate(3_000_000, 5)).toBe(14_673_914);
    expect(retirementIncomeTax(14_673_914, 5).total).toBe(167_380);
    for (const m of TABLE_MONTHLY) {
      for (const y of TABLE_YEARS) {
        const v = severanceEstimate(m, y);
        // 30일분 평균임금 ≈ 월급 × 90/92
        expect(v / y).toBeGreaterThan(m * 0.97);
        expect(v / y).toBeLessThan(m);
      }
    }
  });
});
