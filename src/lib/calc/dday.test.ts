import { describe, expect, it } from "vitest";
import { addDays, formatYMD, parseYMD, weekdayKo, ymd } from "@/lib/date";
import { birthdayOfAge, completedMonths } from "./age";
import {
  calendarSpan,
  countdownDates,
  countWeekdays,
  dayMilestoneDate,
  dayNumberOn,
  daysBetween,
  ddayLabel,
  DDAY_EVENTS,
  defaultTarget,
  elapsedSpan,
  eventOn,
  eventStatus,
  eventYMD,
  formatSpan,
  formatWeeks,
  getEvent,
  inclusiveSpan,
  milestones,
  milestoneWindow,
  monthMark,
  nextChristmas,
  orderDates,
  parseInputDate,
  pastEvents,
  shiftCountError,
  shiftDate,
  spanMonths,
  upcomingEvents,
  yearMilestoneDate,
} from "./dday";

const d = (s: string) => parseYMD(s)!;

describe("D-day label", () => {
  it("counts days from today, excluding today", () => {
    // 2026-10-09 → 2027학년도 수능 2026-11-19: 22 days left in October + 19 in November = 41.
    expect(ddayLabel(41)).toBe("D-41");
    expect(ddayLabel(0)).toBe("D-day");
    expect(ddayLabel(-8)).toBe("D+8");
    expect(ddayLabel(1000)).toBe("D-1,000");
  });
});

describe("days between", () => {
  it("excludes the first day by default (민법 제157조) and adds one when included", () => {
    expect(daysBetween(d("2026-01-01"), d("2026-12-31"))).toBe(364);
    expect(daysBetween(d("2026-01-01"), d("2026-12-31"), true)).toBe(365);
    expect(daysBetween(d("2026-10-09"), d("2026-11-19"))).toBe(41);
  });
  it("orders dates", () => {
    const o = orderDates(d("2026-12-31"), d("2026-01-01"));
    expect(o.swapped).toBe(true);
    expect(formatYMD(o.from)).toBe("2026-01-01");
  });
  it("breaks a span into 년·개월·일 with month-end clamping (민법 제160조)", () => {
    expect(calendarSpan(d("2026-01-31"), d("2026-02-28"))).toEqual({ years: 0, months: 1, days: 0 });
    expect(calendarSpan(d("2026-01-31"), d("2026-03-01"))).toEqual({ years: 0, months: 1, days: 1 });
    expect(calendarSpan(d("2024-02-29"), d("2025-02-28"))).toEqual({ years: 1, months: 0, days: 0 });
    expect(calendarSpan(d("2026-10-09"), d("2026-11-19"))).toEqual({ years: 0, months: 1, days: 10 });
    expect(calendarSpan(d("2026-10-09"), d("2026-10-09"))).toEqual({ years: 0, months: 0, days: 0 });
    expect(formatSpan({ years: 1, months: 0, days: 3 })).toBe("1년 3일");
    expect(formatSpan({ years: 0, months: 0, days: 0 })).toBe("0일");
  });
  it("counts months with the first day included (민법 제160조 제2항·제3항)", () => {
    // 1월 31일부터 센 1개월은 2월 말일에 찬다 → 다음 달은 3월 1일부터.
    expect(formatYMD(monthMark(d("2026-01-31"), 1))).toBe("2026-03-01");
    expect(formatYMD(monthMark(d("2026-01-31"), 2))).toBe("2026-03-31");
    expect(formatYMD(monthMark(d("2026-12-31"), 2))).toBe("2027-03-01");
    expect(formatYMD(monthMark(d("2026-10-09"), 1))).toBe("2026-11-09");
    expect(inclusiveSpan(d("2026-01-31"), d("2026-02-27"))).toEqual({ years: 0, months: 0, days: 28 });
    expect(inclusiveSpan(d("2026-01-31"), d("2026-02-28"))).toEqual({ years: 0, months: 1, days: 0 });
    expect(inclusiveSpan(d("2026-01-31"), d("2026-03-01"))).toEqual({ years: 0, months: 1, days: 1 });
    expect(inclusiveSpan(d("2026-03-01"), d("2026-03-31"))).toEqual({ years: 0, months: 1, days: 0 });
    expect(inclusiveSpan(d("2026-01-01"), d("2026-12-31"))).toEqual({ years: 1, months: 0, days: 0 });
    expect(inclusiveSpan(d("2024-02-29"), d("2025-02-28"))).toEqual({ years: 1, months: 0, days: 0 });
    expect(inclusiveSpan(d("2026-10-09"), d("2026-10-09"))).toEqual({ years: 0, months: 0, days: 1 });
  });
  it("counts 생후 개월 like the 만 나이 calculator", () => {
    expect(elapsedSpan(d("2026-01-31"), d("2026-02-28"))).toEqual({ years: 0, months: 0, days: 28 });
    expect(elapsedSpan(d("2026-01-31"), d("2026-03-01"))).toEqual({ years: 0, months: 1, days: 0 });
    expect(elapsedSpan(d("2024-02-29"), d("2025-02-28"))).toEqual({ years: 0, months: 11, days: 30 });
    expect(elapsedSpan(d("2024-02-29"), d("2025-03-01"))).toEqual({ years: 1, months: 0, days: 0 });
    expect(elapsedSpan(d("2026-10-09"), d("2026-10-09"))).toEqual({ years: 0, months: 0, days: 0 });
    // Same completed months as age.ts for every day over two years, for month-end and leap-day births.
    for (const birth of ["2024-02-29", "2026-01-31", "2026-01-29", "2025-08-31", "2026-10-09"].map(d)) {
      for (let i = 0; i < 800; i++) {
        const ref = addDays(birth, i);
        expect(spanMonths(elapsedSpan(birth, ref))).toBe(completedMonths(birth, ref));
      }
    }
  });
  it("formats weeks", () => {
    expect(formatWeeks(41)).toBe("5주 6일");
    expect(formatWeeks(14)).toBe("2주");
    expect(formatWeeks(3)).toBe("3일");
  });
  it("counts Mon–Fri days in an inclusive range", () => {
    // 2026-10-05 is a Monday, 2026-10-11 a Sunday.
    expect(countWeekdays(d("2026-10-05"), d("2026-10-11"))).toBe(5);
    expect(countWeekdays(d("2026-10-10"), d("2026-10-11"))).toBe(0);
    expect(countWeekdays(d("2026-01-01"), d("2026-12-31"))).toBe(261);
    expect(countWeekdays(d("2026-10-11"), d("2026-10-10"))).toBe(0);
  });
});

describe("N days after/before", () => {
  it("adds days", () => {
    expect(formatYMD(shiftDate(d("2026-10-09"), 100))).toBe("2027-01-17");
    expect(formatYMD(shiftDate(d("2026-10-09"), 100, { before: true }))).toBe("2026-07-01");
  });
  it("counts the base day as day 1 when asked (100일째 = +99일)", () => {
    expect(formatYMD(shiftDate(d("2026-10-09"), 100, { includeBase: true }))).toBe("2027-01-16");
    expect(formatYMD(shiftDate(d("2026-10-09"), 1, { includeBase: true }))).toBe("2026-10-09");
  });
  it("accepts only whole day counts 0–99,999 (and no 0일째)", () => {
    expect(shiftCountError(100, false)).toBeNull();
    expect(shiftCountError(0, false)).toBeNull();
    expect(shiftCountError(99_999, true)).toBeNull();
    expect(shiftCountError(1.5, false)).toBe("range");
    expect(shiftCountError(-1, false)).toBe("range");
    expect(shiftCountError(100_000, false)).toBe("range");
    expect(shiftCountError(2e8, false)).toBe("range");
    expect(shiftCountError(Number.NaN, false)).toBe("range");
    expect(shiftCountError(0, true)).toBe("zero");
  });
});

describe("date input", () => {
  it("rejects years below 1000 (Date.UTC maps 0–99 to 19xx; the native input sends them while typing)", () => {
    expect(parseInputDate("0050-01-01")).toBeNull();
    expect(parseInputDate("0202-10-09")).toBeNull();
    expect(parseInputDate("2026-02-30")).toBeNull();
    expect(parseInputDate("")).toBeNull();
    expect(parseInputDate("1000-01-01")).toEqual({ y: 1000, m: 1, d: 1 });
    expect(parseInputDate("2026-10-09")).toEqual({ y: 2026, m: 10, d: 9 });
  });
});

describe("anniversaries (start day = day 1)", () => {
  it("100일 = start + 99 days", () => {
    // Widely published example: 사귄 날 2024-01-01 → 100일 2024-04-09 (윤년).
    expect(formatYMD(dayMilestoneDate(d("2024-01-01"), 100))).toBe("2024-04-09");
    // 평년: 2026-01-01 → 2026-04-10. 아기 백일도 태어난 날을 1일로 셉니다.
    expect(formatYMD(dayMilestoneDate(d("2026-01-01"), 100))).toBe("2026-04-10");
    expect(formatYMD(dayMilestoneDate(d("2026-10-09"), 100))).toBe("2027-01-16");
    expect(weekdayKo(dayMilestoneDate(d("2026-10-09"), 100))).toBe("토");
    expect(formatYMD(dayMilestoneDate(d("2026-10-09"), 1000))).toBe("2029-07-04");
  });
  it("1주년 = same date next year (366th day in a common year)", () => {
    expect(formatYMD(yearMilestoneDate(d("2026-10-09"), 1))).toBe("2027-10-09");
    expect(dayNumberOn(d("2026-10-09"), d("2027-10-09"))).toBe(366);
    expect(dayNumberOn(d("2026-10-09"), d("2026-10-09"))).toBe(1);
  });
  it("2월 29일 시작: 평년에는 2월 28일로 1년이 차고 3월 1일이 1주년·돌 (민법 제160조 제3항)", () => {
    const leap = d("2024-02-29");
    expect(formatYMD(yearMilestoneDate(leap, 1))).toBe("2025-03-01");
    expect(formatYMD(yearMilestoneDate(leap, 3))).toBe("2027-03-01");
    expect(formatYMD(yearMilestoneDate(leap, 4))).toBe("2028-02-29");
    // The baby's 돌 is the day the 만 나이 calculator says the child turns 1.
    for (const n of [1, 2, 3, 4, 5]) {
      expect(formatYMD(yearMilestoneDate(leap, n))).toBe(formatYMD(birthdayOfAge(leap, n)));
    }
    const dol = milestones(leap, "baby").find((m) => m.type === "years" && m.n === 1)!;
    expect(formatYMD(dol.date)).toBe("2025-03-01");
    expect(dol.dayNumber).toBe(367);
  });
  it("lists milestones sorted by date with baby labels", () => {
    const list = milestones(d("2026-10-09"), "couple");
    for (let i = 1; i < list.length; i++) {
      expect(list[i].date.y * 10000 + list[i].date.m * 100 + list[i].date.d).toBeGreaterThanOrEqual(
        list[i - 1].date.y * 10000 + list[i - 1].date.m * 100 + list[i - 1].date.d,
      );
    }
    expect(list[0].label).toBe("100일");
    expect(list.find((m) => m.type === "years" && m.n === 1)?.label).toBe("1주년");
    const baby = milestones(d("2026-01-01"), "baby");
    expect(baby[0].label).toBe("백일 (100일)");
    expect(baby.find((m) => m.type === "years" && m.n === 1)?.label).toBe("돌 (첫 생일)");
  });
  it("windows the list around today", () => {
    const list = milestones(d("2026-10-09"), "couple");
    const w = milestoneWindow(list, d("2026-10-09"));
    expect(w.nextIndex).toBe(0);
    expect(w.items[0].label).toBe("100일");
    const later = milestoneWindow(list, d("2027-02-01"));
    expect(later.items[later.nextIndex].label).toBe("200일");
    expect(later.items[0].label).toBe("100일");
    const done = milestoneWindow(list, d("2100-01-01"));
    expect(done.nextIndex).toBe(-1);
    expect(done.items.length).toBe(20);
  });
});

describe("events", () => {
  it("has valid, unique, verified dates with the right weekdays", () => {
    expect(new Set(DDAY_EVENTS.map((e) => e.slug)).size).toBe(DDAY_EVENTS.length);
    // 평가원: 2027학년도 수능 2026-11-19(목). 우주항공청 2027 월력요항: 설날 2027-02-07(일), 추석 2027-09-15(수).
    const expected: Record<string, [string, string]> = {
      suneung: ["2026-11-19", "목"],
      christmas: ["2026-12-25", "금"],
      "new-year": ["2027-01-01", "금"],
      seollal: ["2027-02-07", "일"],
      chuseok: ["2027-09-15", "수"],
    };
    for (const e of DDAY_EVENTS) {
      expect(e.date).toBe(expected[e.slug][0]);
      expect(weekdayKo(eventYMD(e))).toBe(expected[e.slug][1]);
      for (const s of e.schedule) {
        expect(parseYMD(s.date)).not.toBeNull();
        if (s.end) expect(parseYMD(s.end)).not.toBeNull();
      }
    }
  });

  it("every 'M월 D일(요일)' written in event copy matches the calendar", () => {
    const re = /(?:(\d{4})년 )?(\d{1,2})월 (\d{1,2})일 ?\(([월화수목금토일])\)/g;
    let checked = 0;
    for (const e of DDAY_EVENTS) {
      const texts = [
        e.description,
        e.lead,
        e.pastDescription,
        e.pastLead,
        ...e.body,
        ...e.facts.map((f) => f.value),
        ...e.faq.map((f) => f.a),
      ];
      for (const text of texts) {
        const yearRe = /(\d{4})년/g;
        for (const m of text.matchAll(re)) {
          // Use the last explicit year mentioned before this date, else the event's year.
          const before = text.slice(0, m.index);
          const years = [...before.matchAll(yearRe)].map((x) => Number(x[1]));
          const year = m[1] ? Number(m[1]) : years.length ? years[years.length - 1] : eventYMD(e).y;
          const v = ymd(year, Number(m[2]), Number(m[3]));
          expect(`${e.slug} ${m[0]} → ${weekdayKo(v)}`).toBe(`${e.slug} ${m[0]} → ${m[4]}`);
          checked++;
        }
      }
    }
    expect(checked).toBeGreaterThan(25);
  });

  it("holiday facts from the 2027 월력요항", () => {
    expect(weekdayKo(d("2027-02-06"))).toBe("토");
    expect(weekdayKo(d("2027-02-09"))).toBe("화");
    expect(weekdayKo(d("2027-02-05"))).toBe("금");
    expect(weekdayKo(d("2027-09-11"))).toBe("토");
    expect(weekdayKo(d("2027-09-19"))).toBe("일");
    expect(weekdayKo(d("2027-12-25"))).toBe("토");
    expect(weekdayKo(d("2027-10-03"))).toBe("일");
    expect(weekdayKo(d("2027-10-09"))).toBe("토");
  });

  it("picks the next event as the default target", () => {
    expect(upcomingEvents(d("2026-10-09")).map((e) => e.slug)).toEqual(["suneung", "christmas", "new-year", "seollal", "chuseok"]);
    expect(formatYMD(defaultTarget(d("2026-10-09")))).toBe("2026-11-19");
    expect(formatYMD(defaultTarget(d("2026-11-20")))).toBe("2026-12-25");
    // After the last listed event, fall back to the next Christmas.
    expect(formatYMD(defaultTarget(d("2027-09-16")))).toBe("2027-12-25");
    expect(formatYMD(nextChristmas(d("2027-12-26")))).toBe("2028-12-25");
    expect(eventOn(d("2027-02-07"))?.slug).toBe("seollal");
    expect(eventOn(d("2027-02-08"))).toBeUndefined();
  });

  it("knows which events have passed on a build date", () => {
    const suneung = getEvent("suneung")!;
    expect(eventStatus(suneung, d("2026-11-18"))).toBe("upcoming");
    expect(eventStatus(suneung, d("2026-11-19"))).toBe("today");
    expect(eventStatus(suneung, d("2026-11-20"))).toBe("past");
    expect(pastEvents(d("2026-10-09"))).toEqual([]);
    expect(pastEvents(d("2026-12-26")).map((e) => e.slug)).toEqual(["christmas", "suneung"]);
    expect(upcomingEvents(d("2026-12-26")).map((e) => e.slug)).toEqual(["new-year", "seollal", "chuseok"]);
  });

  it("has past-tense copy for every event, within description length limits", () => {
    for (const e of DDAY_EVENTS) {
      for (const text of [e.description, e.pastDescription]) {
        expect(text.length, `${e.slug}: ${text}`).toBeGreaterThanOrEqual(80);
        expect(text.length, `${e.slug}: ${text}`).toBeLessThanOrEqual(150);
      }
      expect(e.pastLead).toMatch(/[었였졌]습니다/);
      expect(e.pastLead).not.toMatch(/남은 날/);
    }
  });

  it("countdown dates", () => {
    const c = countdownDates(d("2026-11-19"));
    expect(formatYMD(c[0].date)).toBe("2026-08-11"); // 수능 D-100
    expect(formatYMD(c.find((x) => x.n === 30)!.date)).toBe("2026-10-20");
    expect(formatYMD(c[c.length - 1].date)).toBe("2026-11-18");
  });
});
