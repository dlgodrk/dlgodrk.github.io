import { describe, expect, it } from "vitest";
import { addDays, formatYMD, type YMD } from "@/lib/date";
import {
  addWorkdays,
  countWorkdays,
  holidayBlocks,
  HOLIDAYS,
  holidaysOf,
  isBridge,
  isWeekendOnly,
  leaveOptions,
  leaveRows,
  leaveTips,
  longestByLeave,
  monthlyWorkdays,
  nextHoliday,
  plainName,
  recommendedPlan,
  substituteDates,
  TIP_MAX_LEAVE,
  upcomingBlocks,
  yearSummary,
  type Holiday,
  type LeavePlan,
} from "./holidays";

const ymd = (s: string): YMD => {
  const [y, m, d] = s.split("-").map(Number);
  return { y, m, d };
};
const dates = (list: YMD[]) => list.map(formatYMD);
const SIX = { saturdayWork: true, smallBiz: false };
const SMALL = { saturdayWork: false, smallBiz: true };

// 한국천문연구원 2027년 달력자료 (https://astro.kasi.re.kr/kor/life/post/calendarData?year=2027), 2026-10-09 확인.
// 우주항공청 2027년도 월력요항(2026-06-29)과 같은 24일.
const KASI_2027 = [
  "2027-01-01",
  "2027-02-06",
  "2027-02-07",
  "2027-02-08",
  "2027-02-09",
  "2027-03-01",
  "2027-05-01",
  "2027-05-03",
  "2027-05-05",
  "2027-05-13",
  "2027-06-06",
  "2027-07-17",
  "2027-07-19",
  "2027-08-15",
  "2027-08-16",
  "2027-09-14",
  "2027-09-15",
  "2027-09-16",
  "2027-10-03",
  "2027-10-04",
  "2027-10-09",
  "2027-10-11",
  "2027-12-25",
  "2027-12-27",
];

// 한국천문연구원 2026년 달력자료 (21일, 제헌절·6월 3일 지방선거 포함) + 노동절 2026-05-01
// (관공서의 공휴일에 관한 규정 대통령령 제36290호, 2026-05-01 시행. 천문연 페이지는 아직 ‘근로자의 날’ 기념일로 표기).
const KASI_2026_PLUS_LABOR = [
  "2026-01-01",
  "2026-02-16",
  "2026-02-17",
  "2026-02-18",
  "2026-03-01",
  "2026-03-02",
  "2026-05-01",
  "2026-05-05",
  "2026-05-24",
  "2026-05-25",
  "2026-06-03",
  "2026-06-06",
  "2026-07-17",
  "2026-08-15",
  "2026-08-17",
  "2026-09-24",
  "2026-09-25",
  "2026-09-26",
  "2026-10-03",
  "2026-10-05",
  "2026-10-09",
  "2026-12-25",
];

describe("holiday data", () => {
  it("matches the official 2027 list (월력요항 / 천문연)", () => {
    expect(holidaysOf(2027).map((h) => h.date)).toEqual(KASI_2027);
  });
  it("matches the 2026 list with 노동절 added", () => {
    expect(holidaysOf(2026).map((h) => h.date)).toEqual(KASI_2026_PLUS_LABOR);
  });
  it("is sorted, unique, in its own year, and every 대체공휴일 points at a listed holiday", () => {
    for (const [year, list] of Object.entries(HOLIDAYS)) {
      const ds = list.map((h) => h.date);
      expect([...ds].sort()).toEqual(ds);
      expect(new Set(ds).size).toBe(ds.length);
      for (const h of list) {
        expect(h.date.startsWith(year)).toBe(true);
        if (h.substituteFor) expect(ds).toContain(h.substituteFor);
      }
    }
  });
  it("reconciles with the 월력요항 counts", () => {
    // 2027: 관공서 공휴일 = 일요일 52 + 공휴일 24 = 76, 일요일 겹침 4일을 한 번만 세면 실질 공휴일 72,
    // 주 5일제 휴일 119 (우주항공청 2026-06-29 발표; 경기일보 2026-06-29 "관공서 공휴일 … 총 76일 … 실질 공휴일은 72일").
    const s27 = yearSummary(2027);
    expect(s27.officialDays).toBe(76);
    expect(s27.realDays).toBe(72);
    expect(s27.designated).toBe(24);
    expect(s27.onSunday).toBe(4);
    expect(s27.onSaturday).toBe(5);
    expect(s27.restDays5).toBe(119);
    expect(s27.substitutes).toBe(7);
    // 2026: 실질 공휴일 월력요항 70일 + 노동절·제헌절 = 72일, 주 5일제 휴일 118 → 120 (노동절·제헌절 추가 후).
    const s26 = yearSummary(2026);
    expect(s26.realDays).toBe(72);
    expect(s26.officialDays).toBe(74);
    expect(s26.restDays5).toBe(120);
    expect(s26.onSaturday).toBe(4);
  });
});

describe("대체공휴일 rule (규정 제3조)", () => {
  const base = (year: number) => holidaysOf(year).filter((h) => !h.substituteFor);
  const subs = (year: number) =>
    holidaysOf(year)
      .filter((h) => h.substituteFor)
      .map((h) => h.date);
  it("reproduces every 대체공휴일 in the data", () => {
    expect(substituteDates(base(2026))).toEqual(subs(2026));
    expect(substituteDates(base(2027))).toEqual(subs(2027));
  });
  const H = (date: string, category: Holiday["category"]): Holiday => ({ date, name: date, category });
  it("handles overlaps on a weekday (2025 어린이날 = 부처님오신날 → 5월 6일)", () => {
    expect(substituteDates([H("2025-05-05", "children"), H("2025-05-05", "buddha")])).toEqual(["2025-05-06"]);
  });
  it("moves a Sunday 추석 to the first day after the whole run (2025 → 10월 8일)", () => {
    const list = [
      H("2025-10-03", "national"),
      H("2025-10-05", "chuseok"),
      H("2025-10-06", "chuseok"),
      H("2025-10-07", "chuseok"),
      H("2025-10-09", "national"),
    ];
    expect(substituteDates(list)).toEqual(["2025-10-08"]);
  });
  it("gives nothing for 현충일 or a Saturday 설 day, and skips Saturdays (제3조③)", () => {
    expect(substituteDates([H("2027-06-06", "memorial")])).toEqual([]);
    expect(substituteDates([H("2027-02-06", "seollal")])).toEqual([]);
    // Friday overlap → the next 비공휴일 would be Saturday → Monday.
    expect(substituteDates([H("2026-05-01", "labor"), H("2026-05-01", "children")])).toEqual(["2026-05-04"]);
  });
});

describe("countWorkdays", () => {
  it("2026년 10월: 31 − 토·일 9 − 평일 공휴일 2 = 20일", () => {
    const c = countWorkdays(ymd("2026-10-01"), ymd("2026-10-31"));
    expect(c.calendarDays).toBe(31);
    expect(c.saturdays).toBe(5);
    expect(c.sundays).toBe(4);
    expect(c.holidaysOnWorkdays).toBe(2); // 10/5 개천절 대체, 10/9 한글날
    expect(c.holidaysOnRestDays).toBe(1); // 10/3 개천절 (토)
    expect(c.workdays).toBe(20);
  });
  it("주 6일 counts Saturday holidays as days off", () => {
    const c = countWorkdays(ymd("2026-10-01"), ymd("2026-10-31"), SIX);
    expect(c.weeklyRest).toBe(4);
    expect(c.holidaysOnWorkdays).toBe(3);
    expect(c.workdays).toBe(24);
  });
  it("yearly totals", () => {
    expect(countWorkdays(ymd("2027-01-01"), ymd("2027-12-31")).workdays).toBe(246);
    expect(countWorkdays(ymd("2026-01-01"), ymd("2026-12-31")).workdays).toBe(245);
    expect(monthlyWorkdays(2027).reduce((a, r) => a + r.workdays5, 0)).toBe(246);
    expect(monthlyWorkdays(2027)[1].workdays5).toBe(18); // 2027년 2월: 설 연휴 평일 2일
  });
  it("5인 미만: only 노동절 (not its 대체공휴일) is a day off", () => {
    const may26 = countWorkdays(ymd("2026-05-01"), ymd("2026-05-31"), SMALL);
    expect(may26.holidays.map((h) => formatYMD(h.date))).toEqual(["2026-05-01"]);
    expect(may26.workdays).toBe(20);
    const may27 = countWorkdays(ymd("2027-05-01"), ymd("2027-05-31"), SMALL);
    expect(may27.holidaysOnWorkdays).toBe(0); // 5/1 is a Saturday; 5/3 not a legal holiday for 5인 미만
    expect(may27.workdays).toBe(21);
  });
  it("flags days outside the data years and handles empty ranges", () => {
    expect(countWorkdays(ymd("2027-12-30"), ymd("2028-01-02")).uncoveredDays).toBe(2);
    expect(countWorkdays(ymd("2026-10-02"), ymd("2026-10-01")).calendarDays).toBe(0);
  });
});

describe("addWorkdays", () => {
  it("skips weekends and holidays (2026-10-08 + 1영업일 → 10월 12일)", () => {
    expect(formatYMD(addWorkdays(ymd("2026-10-08"), 1).date)).toBe("2026-10-12");
  });
  it("2027 설 연휴: 2월 5일 + 3영업일 → 2월 12일", () => {
    const r = addWorkdays(ymd("2027-02-05"), 3);
    expect(formatYMD(r.date)).toBe("2027-02-12");
    expect(r.skipped.filter((h) => h.reducesWork).length).toBe(2);
  });
  it("주 6일 counts Saturdays", () => {
    expect(formatYMD(addWorkdays(ymd("2026-10-08"), 1, SIX).date)).toBe("2026-10-10");
  });
});

describe("연휴 블록과 연차 붙이기", () => {
  const block = (year: number, start: string) => holidayBlocks(year).find((b) => formatYMD(b.start) === start)!;
  it("2027년 3일 이상 연휴는 10번 (월력요항 보도)", () => {
    expect(holidayBlocks(2027).filter((b) => b.length >= 3).length).toBe(10);
  });
  it("2027 추석: 9월 13일·17일 연차 2일 → 9월 11일~19일 9일", () => {
    const b = block(2027, "2027-09-14");
    const [p] = leaveOptions(b, 2);
    expect(p.length).toBe(9);
    expect(formatYMD(p.start)).toBe("2027-09-11");
    expect(formatYMD(p.end)).toBe("2027-09-19");
    expect(dates(p.leaveDates)).toEqual(["2027-09-13", "2027-09-17"]);
    expect(recommendedPlan(b)?.leave).toBe(2);
  });
  it("2027 설: 연차 1일 → 5일 (2/5 또는 2/10), 2/5·2/10 → 6일, 연차 3일 → 9일", () => {
    const b = block(2027, "2027-02-06");
    expect(b.length).toBe(4);
    const one = leaveOptions(b, 1);
    expect(one.map((p) => p.length)).toEqual([5, 5]);
    expect(one.map((p) => dates(p.leaveDates))).toEqual([["2027-02-05"], ["2027-02-10"]]);
    const two = leaveOptions(b, 2);
    expect(two[0].length).toBe(6);
    expect(two.some((p) => dates(p.leaveDates).join() === "2027-02-05,2027-02-10")).toBe(true);
    const three = leaveOptions(b, 3)[0];
    expect(three.length).toBe(9);
    expect(dates(three.leaveDates)).toEqual(["2027-02-10", "2027-02-11", "2027-02-12"]);
  });
  it("2026 설: 연차 2일(2/19·2/20) → 2월 14일~22일 9일", () => {
    const p = recommendedPlan(block(2026, "2026-02-14"))!;
    expect(p.leave).toBe(2);
    expect(p.length).toBe(9);
    expect(formatYMD(p.end)).toBe("2026-02-22");
  });
  it("no recommendation when a leave day only adds itself (2027 신정)", () => {
    expect(recommendedPlan(block(2027, "2027-01-01"))).toBeNull();
  });
  it("merges neighbouring blocks that share the same best stretch", () => {
    const may = holidayBlocks(2027).filter((b) => b.start.m === 5 && b.start.d <= 5);
    const rows = leaveRows(may, 1);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("노동절·어린이날");
    expect(rows[0].plan.length).toBe(5);
  });
  it("detects holidays swallowed by a weekend", () => {
    expect(isWeekendOnly(block(2027, "2027-06-05"))).toBe(true);
    expect(isWeekendOnly(block(2027, "2027-05-01"))).toBe(false);
  });
  it("upcoming blocks and next holiday follow today", () => {
    expect(upcomingBlocks(ymd("2026-10-10"))[0].name).toBe("한글날");
    expect(nextHoliday(ymd("2026-10-09"))?.holiday.name).toBe("한글날");
    expect(formatYMD(nextHoliday(ymd("2026-10-10"))!.date)).toBe("2026-12-25");
    expect(nextHoliday(ymd("2028-01-01"))).toBeNull();
  });
  it("plain names for sentences", () => {
    expect(holidaysOf(2027).map(plainName)).toContain("성탄절");
    expect(plainName(holidaysOf(2027)[0])).toBe("신정");
  });
});

describe("앞으로 남은 연휴: no 연차 on past days", () => {
  const tomorrow = (s: string) => addDays(ymd(s), 1);
  it("2026-10-09 (한글날), 연차 2일 → 10/12·10/13, not 10/7·10/8", () => {
    const today = ymd("2026-10-09");
    const rows = leaveRows(upcomingBlocks(today), 2, undefined, tomorrow("2026-10-09"));
    expect(rows[0].name).toBe("한글날");
    expect(dates(rows[0].plan.leaveDates)).toEqual(["2026-10-12", "2026-10-13"]);
    expect(formatYMD(rows[0].plan.start)).toBe("2026-10-09");
    expect(formatYMD(rows[0].plan.end)).toBe("2026-10-13");
    for (const r of rows) {
      for (const p of [r.plan, ...r.alternatives]) expect(formatYMD(p.leaveDates[0]) > "2026-10-09").toBe(true);
    }
    // Without the bound the earliest tie would ask for 10/7·10/8, which have passed.
    expect(dates(leaveRows(upcomingBlocks(today), 2)[0].plan.leaveDates)).toEqual(["2026-10-07", "2026-10-08"]);
  });
  it("2026-12-24, 연차 2일 → 성탄절 after the 25th only", () => {
    const rows = leaveRows(upcomingBlocks(ymd("2026-12-24")), 2, undefined, tomorrow("2026-12-24"));
    expect(rows[0].name).toBe("성탄절");
    expect(dates(rows[0].plan.leaveDates)).toEqual(["2026-12-28", "2026-12-29"]);
  });
  it("returns nothing when every 연차 day would be before the bound", () => {
    const seol = holidayBlocks(2026).find((b) => b.name === "설 연휴")!;
    expect(leaveOptions(seol, 1, undefined, ymd("2026-03-01"))).toEqual([]);
  });
});

describe("plans outside the data years", () => {
  const newYear26 = holidayBlocks(2026)[0];
  it("flags a stretch that reaches 2025 (12월 25일 성탄절 is unknown there)", () => {
    const [p] = leaveOptions(newYear26, 5);
    expect(formatYMD(p.start)).toBe("2025-12-26");
    expect(p.uncovered).toBe(true);
  });
  it("prefers an equally long stretch inside the data years", () => {
    const [p] = leaveOptions(newYear26, 2);
    expect(p.uncovered).toBe(false);
    expect(formatYMD(p.start)).toBe("2026-01-01");
  });
});

describe("weekend-only blocks depend on the work rule", () => {
  it("2026 현충일 (토): weekend only for 주 5일, a real day off for 주 6일", () => {
    const five = holidayBlocks(2026).find((b) => formatYMD(b.start) === "2026-06-06")!;
    expect(isWeekendOnly(five)).toBe(true);
    const six = holidayBlocks(2026, SIX).find((b) => formatYMD(b.start) === "2026-06-06")!;
    expect(isWeekendOnly(six, SIX)).toBe(false);
  });
});

describe("연차 꿀팁 for the year pages", () => {
  const key = (p: LeavePlan) => `${formatYMD(p.start)}~${formatYMD(p.end)}`;
  it("merges 연휴 that share a stretch, so no stretch is listed twice", () => {
    for (const y of [2026, 2027]) {
      const tips = leaveTips(y);
      const stretches = tips.flatMap((t) => t.plans.map(key));
      expect(new Set(stretches).size).toBe(stretches.length);
    }
    expect(leaveTips(2026).map((t) => t.name)).toEqual(expect.arrayContaining(["노동절·어린이날", "개천절·한글날"]));
    // Sunday 현충일 2027 is not a tip.
    expect(leaveTips(2027).some((t) => t.name.includes("현충일"))).toBe(false);
  });
  it("2027 개천절·한글날: 10/5~10/8 연차 4일 → 10월 2일~11일 10일 (징검다리)", () => {
    const tip = leaveTips(2027).find((t) => t.name === "개천절·한글날")!;
    expect(tip.plans).toHaveLength(1);
    const [p] = tip.plans;
    expect(p.leave).toBe(4);
    expect(key(p)).toBe("2027-10-02~2027-10-11");
    expect(dates(p.leaveDates)).toEqual(["2027-10-05", "2027-10-06", "2027-10-07", "2027-10-08"]);
    expect(isBridge(p)).toBe(true);
    expect(tip.table.map((x) => x.length)).toEqual([4, 5, 6, 10]);
  });
  it("2027 신정: 2026년 12/28~12/31 연차 4일 → 12월 25일~1월 3일 10일", () => {
    const tip = leaveTips(2027)[0];
    expect(tip.label).toBe("성탄절·신정");
    expect(tip.plans.map(key)).toEqual(["2026-12-25~2027-01-03"]);
  });
  it("2027 노동절·어린이날 keeps both the 1일 and 3일 combinations", () => {
    const tip = leaveTips(2027).find((t) => t.name === "노동절·어린이날")!;
    expect(tip.plans.map((p) => [p.leave, p.length])).toEqual([
      [1, 5],
      [3, 9],
    ]);
  });
  it("does not recommend 연차 4일 that only add one weekend (2026 3·1절)", () => {
    const b = holidayBlocks(2026).find((x) => x.name === "3·1절")!;
    expect(recommendedPlan(b, TIP_MAX_LEAVE)).toBeNull();
    expect(leaveOptions(b, 4)[0].length).toBe(9);
  });
  it("exact longest stretch per 연차 count: 2027 추석 6/9/10/11일, 2026 설 6/9/10/11일", () => {
    const m27 = longestByLeave(leaveTips(2027));
    expect(m27.map((m) => m.plan.length)).toEqual([6, 9, 10, 11]);
    expect(m27.every((m) => m.tip.name === "추석 연휴")).toBe(true);
    const m26 = longestByLeave(leaveTips(2026));
    expect(m26.map((m) => m.plan.length)).toEqual([6, 9, 10, 11]);
    expect(m26.every((m) => m.tip.name === "설 연휴")).toBe(true);
  });
});
