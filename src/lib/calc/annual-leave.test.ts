import { describe, expect, it } from "vitest";
import { formatYMD, parseYMD, type YMD } from "@/lib/date";
import {
  annualLeaveDays,
  anniversary,
  bonusLeaveDays,
  calculateLeave,
  completedMonths,
  cumulativeFiscalBasis,
  cumulativeHireBasis,
  fiscalProrataDays,
  hireYearWorkedDays,
  leaveAllowance,
  leaveTable,
  monthlyAccrualDates,
  monthlyLeaveAccrued,
  periodNextDay,
  tenure,
} from "./annual-leave";

const d = (s: string): YMD => parseYMD(s)!;

describe("annualLeaveDays (근로기준법 제60조①④)", () => {
  it("15 days for years 1-2, +1 every 2 years after the first, capped at 25", () => {
    expect(annualLeaveDays(0)).toBe(0);
    expect(annualLeaveDays(0.9)).toBe(0);
    expect([1, 2, 3, 4, 5, 6, 7].map(annualLeaveDays)).toEqual([15, 15, 16, 16, 17, 17, 18]);
    expect(annualLeaveDays(10)).toBe(19);
    expect(annualLeaveDays(19)).toBe(24);
    expect(annualLeaveDays(20)).toBe(24);
    // 21년차에 처음 25일, 이후 한도
    expect(annualLeaveDays(21)).toBe(25);
    expect(annualLeaveDays(30)).toBe(25);
    expect(bonusLeaveDays(3)).toBe(1);
    expect(bonusLeaveDays(21)).toBe(10);
  });

  it("table lists 1~21 years with cumulative totals including 11 monthly days", () => {
    const t = leaveTable();
    expect(t).toHaveLength(21);
    expect(t.map((r) => r.days).slice(0, 6)).toEqual([15, 15, 16, 16, 17, 17]);
    expect(t[0].cumulative).toBe(26); // 11 + 15 (대법원 2022다245419: 1년 초과 근무 시 최대 26일)
    expect(t[1].cumulative).toBe(41); // 11 + 15 + 15
    expect(t[20].days).toBe(25);
  });
});

describe("period boundaries (민법 제160조)", () => {
  it("monthly leave arises on the same day next month", () => {
    const dates = monthlyAccrualDates(d("2024-03-04")).map(formatYMD);
    expect(dates[0]).toBe("2024-04-04");
    expect(dates[10]).toBe("2025-02-04");
    expect(dates).toHaveLength(11);
  });

  it("when the corresponding day is missing the period ends at month end", () => {
    expect(formatYMD(periodNextDay(d("2024-01-31"), 1))).toBe("2024-03-01");
    expect(formatYMD(periodNextDay(d("2024-01-31"), 2))).toBe("2024-03-31");
    expect(formatYMD(anniversary(d("2024-02-29"), 1))).toBe("2025-03-01");
    expect(formatYMD(anniversary(d("2024-03-04"), 3))).toBe("2027-03-04");
  });

  it("counts completed months and tenure", () => {
    expect(completedMonths(d("2024-03-04"), d("2024-03-04"))).toBe(0);
    expect(completedMonths(d("2024-03-04"), d("2024-04-03"))).toBe(0);
    expect(completedMonths(d("2024-03-04"), d("2024-04-04"))).toBe(1);
    // 근속기간은 기준일까지 근무한 것으로 센다 (재직 N일째와 같은 방식)
    const t = tenure(d("2024-03-04"), d("2026-10-09"));
    expect([t.years, t.months, t.days]).toEqual([2, 7, 6]);
    expect(t.dayCount).toBe(950);
  });

  it("tenure includes the 기준일: exactly one year of work is 1년 0개월 0일", () => {
    const oneYear = tenure(d("2024-03-04"), d("2025-03-03"));
    expect([oneYear.years, oneYear.months, oneYear.days]).toEqual([1, 0, 0]);
    expect(oneYear.dayCount).toBe(365);
    const firstDay = tenure(d("2024-03-04"), d("2024-03-04"));
    expect([firstDay.years, firstDay.months, firstDay.days, firstDay.dayCount]).toEqual([0, 0, 1, 1]);
    // 1월 31일 입사 → 2월 말일까지 근무하면 1개월 (민법 제160조③)
    const monthEnd = tenure(d("2024-01-31"), d("2024-02-29"));
    expect([monthEnd.years, monthEnd.months, monthEnd.days]).toEqual([0, 1, 0]);
  });
});

describe("1년 미만 / 1년 계약직 (대법원 2021다227100, 고용노동부 2021. 12. 16. 행정해석)", () => {
  const hire = d("2024-03-04");
  it("monthly leave accrues 1 day per completed month, max 11", () => {
    expect(monthlyLeaveAccrued(hire, d("2024-04-03"))).toBe(0);
    expect(monthlyLeaveAccrued(hire, d("2024-04-04"))).toBe(1);
    expect(monthlyLeaveAccrued(hire, d("2025-02-04"))).toBe(11);
    expect(monthlyLeaveAccrued(hire, d("2026-10-09"))).toBe(11);
  });

  it("working exactly one year (365 days) gives only 11 days; the 366th day adds 15", () => {
    // 2024-03-04 ~ 2025-03-03 = 365일 (윤년 포함 기간)
    expect(cumulativeHireBasis(hire, d("2025-03-03"))).toBe(11);
    expect(cumulativeHireBasis(hire, d("2025-03-04"))).toBe(26);
  });

  it("calculator shows the 1st anniversary as the next grant in the first year", () => {
    const r = calculateLeave({ hire, asOf: d("2025-02-10"), basis: "hire", attended80: true })!;
    expect(r.current.kind).toBe("monthly");
    expect(r.current.days).toBe(11);
    expect(formatYMD(r.next!.date)).toBe("2025-03-04");
    expect(r.next!.days).toBe(15);
    expect(r.attendanceInputs).toBe("none");
  });

  it("last working day = 1 year: tenure shows 1년 but the 15 days have not arisen", () => {
    const r = calculateLeave({ hire, asOf: d("2025-03-03"), basis: "hire", attended80: true })!;
    expect(r.tenure.years).toBe(1);
    expect(r.current.kind).toBe("monthly");
    expect(r.cumulative.hire).toBe(11);
    expect(formatYMD(r.next!.date)).toBe("2025-03-04");
  });
});

describe("입사일 기준 (hire basis)", () => {
  const hire = d("2024-03-04");
  it("default example: 2년 7개월 근속 → 15일, next 16일 on 2027-03-04", () => {
    const r = calculateLeave({ hire, asOf: d("2026-10-09"), basis: "hire", attended80: true })!;
    expect(r.current).toMatchObject({ days: 15, kind: "annual", serviceYears: 2 });
    expect(formatYMD(r.current.from)).toBe("2026-03-04");
    expect(formatYMD(r.current.to)).toBe("2027-03-03");
    expect(formatYMD(r.next!.date)).toBe("2027-03-04");
    expect(r.next!.days).toBe(16);
    expect(r.upcoming.map((e) => e.days)).toEqual([16, 16, 17, 17]);
    expect(r.cumulative.hire).toBe(41);
  });

  it("80% 미만 출근: 15일 대신 개근한 달 수만큼 (제60조②), 누계에도 같은 값", () => {
    const r = calculateLeave({ hire, asOf: d("2026-10-09"), basis: "hire", attended80: false, perfectMonths: 7 })!;
    expect(r.current).toMatchObject({ days: 7, kind: "annual-low" });
    expect(r.attendanceInputs).toBe("months");
    expect(r.lowApplied).toBe(true);
    // 11 (1년 미만) + 15 (근속 1년) + 7 (근속 2년, 80% 미만)
    expect(r.cumulative.hire).toBe(33);
    expect(cumulativeHireBasis(hire, d("2026-10-09"), { attended80: false, perfectMonths: 7 })).toBe(33);
    expect(cumulativeHireBasis(hire, d("2026-10-09"), { attended80: true, perfectMonths: 7 })).toBe(41);
  });

  it("최초 1년 80% 미만: 15일이 생기지 않고 1년 미만 월차만 남는다", () => {
    const r = calculateLeave({ hire, asOf: d("2025-06-01"), basis: "hire", attended80: false, perfectMonths: 7 })!;
    expect(r.current).toMatchObject({ days: 0, kind: "annual-low", serviceYears: 1 });
    expect(r.attendanceInputs).toBe("rate");
    expect(r.cumulative.hire).toBe(11);
  });

  it("next grant is a monthly day while still in the first year", () => {
    const r = calculateLeave({ hire, asOf: d("2024-05-10"), basis: "hire", attended80: true })!;
    expect(r.current.days).toBe(2);
    expect(formatYMD(r.next!.date)).toBe("2024-06-04");
    expect(r.next!.days).toBe(1);
  });

  it("rejects 기준일 before 입사일", () => {
    expect(calculateLeave({ hire, asOf: d("2024-03-03"), basis: "hire", attended80: true })).toBeNull();
  });
});

describe("회계연도 기준 (fiscal basis)", () => {
  it("prorata = 15 × 입사 연도 재직일수 ÷ 365", () => {
    expect(hireYearWorkedDays(d("2024-03-04"))).toBe(303);
    expect(fiscalProrataDays(d("2024-03-04"))).toBeCloseTo(12.452, 3);
    // 2025. 7. 1. 입사 → 184일 → 약 7.56일 (비즈폼 회계연도 예시: 15 × 184 ÷ 365)
    expect(fiscalProrataDays(d("2025-07-01"))).toBeCloseTo(7.56, 2);
    // 1월 1일 입사는 입사일 기준과 같아진다 (15일 한도)
    expect(fiscalProrataDays(d("2024-01-01"))).toBe(15);
  });

  it("hire-year, next year (prorata + monthly), then annual on Jan 1 counting the hire year as year 1", () => {
    const hire = d("2024-03-04");
    const y0 = calculateLeave({ hire, asOf: d("2024-10-09"), basis: "fiscal", attended80: true })!;
    expect(y0.current).toMatchObject({ kind: "monthly", days: 7 });
    expect(formatYMD(y0.next!.date)).toBe("2024-11-04");

    const y1a = calculateLeave({ hire, asOf: d("2025-02-10"), basis: "fiscal", attended80: true })!;
    expect(y1a.current.kind).toBe("prorata");
    expect(y1a.current.days).toBeCloseTo(12.452 + 11, 3);

    const y1b = calculateLeave({ hire, asOf: d("2025-06-01"), basis: "fiscal", attended80: true })!;
    expect(y1b.current.days).toBeCloseTo(12.452, 3); // 월차는 입사 1년이 되는 날 사용 기간 종료
    expect(formatYMD(y1b.next!.date)).toBe("2026-01-01");
    expect(y1b.next!.days).toBe(15);

    const y2 = calculateLeave({ hire, asOf: d("2026-10-09"), basis: "fiscal", attended80: true })!;
    expect(y2.current).toMatchObject({ kind: "annual", days: 15, serviceYears: 2 });
    expect(formatYMD(y2.next!.date)).toBe("2027-01-01");
    expect(y2.next!.days).toBe(16);
  });

  it("80% 미만 출근을 회계연도 누계와 입사일 기준 비교 모두에 반영", () => {
    const hire = d("2024-03-04");
    const low = { basis: "fiscal" as const, attended80: false, perfectMonths: 7 };
    // 2026년 1월 1일 연차 = 개근한 달 7일
    const r = calculateLeave({ hire, asOf: d("2026-10-09"), ...low })!;
    expect(r.current).toMatchObject({ kind: "annual-low", days: 7 });
    expect(r.cumulative.fiscal).toBeCloseTo(11 + 12.452 + 7, 3);
    expect(r.cumulative.hire).toBe(33);
    expect(r.attendanceInputs).toBe("months");

    // 입사 다음 해: 비례 연차 없음, 개근한 달 수는 쓰이지 않음
    const p = calculateLeave({ hire, asOf: d("2025-06-01"), ...low })!;
    expect(p.current).toMatchObject({ kind: "prorata", days: 0, prorata: 0 });
    expect(p.attendanceInputs).toBe("rate");
    expect(p.cumulative.fiscal).toBe(11);
    expect(p.cumulative.hire).toBe(11);

    // 입사 연도: 출근율 입력이 결과를 바꾸지 않음
    const y0 = calculateLeave({ hire, asOf: d("2024-10-09"), ...low })!;
    expect(y0.attendanceInputs).toBe("none");
    expect(y0.lowApplied).toBe(false);
  });

  it("가산휴가는 입사 연도를 1년으로 친다 (이 계산기의 가정)", () => {
    const r = calculateLeave({ hire: d("2021-07-01"), asOf: d("2024-02-01"), basis: "fiscal", attended80: true })!;
    expect(r.current).toMatchObject({ kind: "annual", days: 16, serviceYears: 3 });
  });

  it("merges a monthly day and the Jan 1 grant falling on the same date", () => {
    // 3월 1일 입사 → 10개월째 월차가 2025-01-01, 같은 날 비례 연차
    const r = calculateLeave({ hire: d("2024-03-01"), asOf: d("2024-12-15"), basis: "fiscal", attended80: true })!;
    expect(formatYMD(r.next!.date)).toBe("2025-01-01");
    expect(r.next!.events).toHaveLength(2);
    expect(r.next!.days).toBeCloseTo(1 + fiscalProrataDays(d("2024-03-01")), 6);
  });

  it("retirement settlement compares with the hire basis (데일리팜 2023. 10. 예시: 2021. 7. 1. 입사)", () => {
    const hire = d("2021-07-01");
    // 2023. 5. 31. 퇴직: 입사일 기준 26일 < 회계연도 기준 약 33.5일 → 회계연도 기준이 유리
    expect(cumulativeHireBasis(hire, d("2023-05-31"))).toBe(26);
    expect(cumulativeFiscalBasis(hire, d("2023-05-31"))).toBeCloseTo(11 + 7.56 + 15, 1);
    // 2023. 8. 1. 퇴직: 입사일 기준 41일 > 회계연도 기준 → 차이만큼 정산
    expect(cumulativeHireBasis(hire, d("2023-08-01"))).toBe(41);
    expect(cumulativeHireBasis(hire, d("2023-08-01")) - cumulativeFiscalBasis(hire, d("2023-08-01"))).toBeCloseTo(7.44, 2);
  });
});

describe("leaveAllowance (연차수당 = 1일 통상임금 × 미사용 일수)", () => {
  it("uses hourly ordinary wage × daily hours", () => {
    // 2026 최저시급 10,320원 × 8시간 = 82,560원, 15일 → 1,238,400원
    expect(leaveAllowance(10_320, 8, 15)).toBe(1_238_400);
    expect(leaveAllowance(NaN, 8, 1)).toBeNaN();
  });
});
