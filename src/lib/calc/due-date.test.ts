import { describe, expect, it } from "vitest";
import { addDays, formatYMD, parseYMD, type YMD } from "@/lib/date";
import {
  CHECK_SCHEDULE,
  checkRange,
  checkStatus,
  clampCycle,
  conceptionFromStart,
  daysToDue,
  ddayLabel,
  dueDate,
  formatWeeksDays,
  gestationalAge,
  monthWeekRange,
  normalizeEmbryoDay,
  POST_TERM_DAYS,
  pregnancyMonth,
  pregnancyStart,
  progressRatio,
  referenceDateFromStart,
  startStatus,
  TERM_START_DAYS,
  TERM_STAGE_LABEL,
  termStage,
  trimester,
  voucherExpiry,
} from "./due-date";

const d = (s: string): YMD => parseYMD(s)!;
const f = formatYMD;

describe("due-date: LMP (Naegele)", () => {
  it("adds 280 days to the LMP for a 28-day cycle", () => {
    // Naegele: 2026-01-01 + 9개월 7일 = 2026-10-08, and 280 days lands on the same date.
    expect(f(dueDate("lmp", d("2026-01-01")))).toBe("2026-10-08");
    expect(f(dueDate("lmp", d("2026-01-01"), { cycle: 28 }))).toBe("2026-10-08");
  });
  it("crosses a leap February correctly (280 days, not month arithmetic)", () => {
    // 2027-06-01 + 280일 = 2028-03-07 (Feb 2028 has 29 days).
    expect(f(dueDate("lmp", d("2027-06-01")))).toBe("2028-03-07");
  });
  it("shifts by (cycle − 28) days", () => {
    expect(f(dueDate("lmp", d("2026-01-01"), { cycle: 35 }))).toBe("2026-10-15");
    expect(f(dueDate("lmp", d("2026-01-01"), { cycle: 21 }))).toBe("2026-10-01");
    expect(f(dueDate("lmp", d("2026-01-01"), { cycle: 32 }))).toBe("2026-10-12");
  });
  it("clamps silly cycle values", () => {
    expect(clampCycle(10)).toBe(21);
    expect(clampCycle(60)).toBe(40);
    expect(clampCycle(Number.NaN)).toBe(28);
    expect(clampCycle(30.6)).toBe(31);
    expect(daysToDue("lmp", { cycle: 99 })).toBe(280 + 12);
  });
});

describe("due-date: conception and IVF", () => {
  it("adds 266 days to the conception date", () => {
    expect(f(dueDate("con", d("2026-01-15")))).toBe("2026-10-08");
    expect(daysToDue("con")).toBe(266);
  });
  it("matches ACOG CO 700: day-5 embryo +261, day-3 embryo +263 from transfer", () => {
    expect(daysToDue("ivf", { embryoDay: 5 })).toBe(261);
    expect(daysToDue("ivf", { embryoDay: 3 })).toBe(263);
    // Worked example (San Diego Fertility Center): transfer June 15 → day 3: March 5, day 5: March 3.
    expect(f(dueDate("ivf", d("2025-06-15"), { embryoDay: 3 }))).toBe("2026-03-05");
    expect(f(dueDate("ivf", d("2025-06-15"), { embryoDay: 5 }))).toBe("2026-03-03");
  });
  it("is consistent across methods for the same pregnancy", () => {
    const lmp = d("2026-03-02");
    const conception = addDays(lmp, 14);
    const day5Transfer = addDays(conception, 5);
    const day3Transfer = addDays(conception, 3);
    const due = f(dueDate("lmp", lmp));
    expect(f(dueDate("con", conception))).toBe(due);
    expect(f(dueDate("ivf", day5Transfer, { embryoDay: 5 }))).toBe(due);
    expect(f(dueDate("ivf", day3Transfer, { embryoDay: 3 }))).toBe(due);
  });
  it("normalizes embryo days to 3 or 5", () => {
    expect(normalizeEmbryoDay(3)).toBe(3);
    expect(normalizeEmbryoDay(5)).toBe(5);
    expect(normalizeEmbryoDay(4)).toBe(5);
    expect(normalizeEmbryoDay(Number.NaN)).toBe(5);
  });
});

describe("due-date: pregnancy start", () => {
  it("maps each method to 임신 0주 0일", () => {
    expect(f(pregnancyStart("lmp", d("2026-01-01")))).toBe("2026-01-01");
    expect(f(pregnancyStart("lmp", d("2026-01-01"), { cycle: 35 }))).toBe("2026-01-08");
    expect(f(pregnancyStart("con", d("2026-01-15")))).toBe("2026-01-01");
    expect(f(pregnancyStart("ivf", d("2026-01-20"), { embryoDay: 5 }))).toBe("2026-01-01");
    expect(f(pregnancyStart("ivf", d("2026-01-18"), { embryoDay: 3 }))).toBe("2026-01-01");
  });
  it("round-trips through referenceDateFromStart", () => {
    const start = d("2026-05-10");
    for (const mode of ["lmp", "con", "ivf"] as const) {
      for (const opts of [{ cycle: 24 }, { cycle: 33, embryoDay: 3 as const }, { embryoDay: 5 as const }]) {
        const ref = referenceDateFromStart(mode, start, opts);
        expect(f(pregnancyStart(mode, ref, opts))).toBe(f(start));
      }
    }
  });
  it("estimates the conception date two weeks after the start", () => {
    expect(f(conceptionFromStart(d("2026-01-01")))).toBe("2026-01-15");
  });
});

describe("due-date: gestational age", () => {
  it("counts weeks and days from the start", () => {
    // 2026-01-01 → 2026-03-26 = 84 days = 12주 0일
    const ga = gestationalAge(d("2026-01-01"), d("2026-03-26"));
    expect(ga).toEqual({ totalDays: 84, weeks: 12, days: 0 });
    expect(formatWeeksDays(gestationalAge(d("2026-01-01"), d("2026-03-29")))).toBe("12주 3일");
    expect(gestationalAge(d("2026-01-01"), d("2026-01-01")).totalDays).toBe(0);
    expect(gestationalAge(d("2026-01-10"), d("2026-01-01")).totalDays).toBe(-9);
  });
  it("tells whether 0주 0일 has started, separating a future LMP from a cycle-corrected start", () => {
    const today = d("2026-10-09");
    // LMP 3 days ago, 35-day cycle: corrected 0주 0일 = 10-13, still 4 days ahead.
    expect(f(pregnancyStart("lmp", d("2026-10-06"), { cycle: 35 }))).toBe("2026-10-13");
    expect(gestationalAge(pregnancyStart("lmp", d("2026-10-06"), { cycle: 35 }), today).totalDays).toBe(-4);
    expect(startStatus("lmp", d("2026-10-06"), today, { cycle: 35 })).toBe("before-start");
    // LMP after today is an input problem even if a 21-day cycle pulls the start into the past.
    expect(startStatus("lmp", d("2026-10-12"), today, { cycle: 21 })).toBe("lmp-future");
    expect(startStatus("lmp", d("2026-10-10"), today)).toBe("lmp-future");
    expect(startStatus("lmp", d("2026-10-09"), today)).toBe("started");
    expect(startStatus("lmp", d("2026-08-14"), today, { cycle: 35 })).toBe("started");
    // Conception 10 days ahead → 0주 0일 was 4 days ago.
    expect(startStatus("con", d("2026-10-19"), today)).toBe("started");
    expect(startStatus("con", d("2026-10-24"), today)).toBe("before-start");
    expect(startStatus("ivf", d("2026-10-29"), today, { embryoDay: 5 })).toBe("before-start");
  });
  it("counts weeks from the cycle-corrected start (LMP 8/14, 35-day cycle → 7주 0일 on 10/9)", () => {
    const start = pregnancyStart("lmp", d("2026-08-14"), { cycle: 35 });
    expect(f(start)).toBe("2026-08-21");
    expect(formatWeeksDays(gestationalAge(start, d("2026-10-09")))).toBe("7주 0일");
    expect(formatWeeksDays(gestationalAge(start, dueDate("lmp", d("2026-08-14"), { cycle: 35 })))).toBe("40주 0일");
  });
  it("is 40주 0일 on the due date", () => {
    const start = d("2026-01-01");
    const ga = gestationalAge(start, dueDate("lmp", start));
    expect(formatWeeksDays(ga)).toBe("40주 0일");
  });
  it("splits trimesters at 14w0d and 28w0d", () => {
    expect(trimester(0)).toBe(1);
    expect(trimester(13 * 7 + 6)).toBe(1);
    expect(trimester(14 * 7)).toBe(2);
    expect(trimester(27 * 7 + 6)).toBe(2);
    expect(trimester(28 * 7)).toBe(3);
    expect(trimester(300)).toBe(3);
  });
  it("counts pregnancy months in 4-week units (10개월 = 36–39주)", () => {
    expect(pregnancyMonth(0)).toBe(1);
    expect(pregnancyMonth(27)).toBe(1);
    expect(pregnancyMonth(28)).toBe(2);
    expect(pregnancyMonth(16 * 7)).toBe(5);
    expect(pregnancyMonth(36 * 7)).toBe(10);
    expect(pregnancyMonth(279)).toBe(10);
    expect(pregnancyMonth(300)).toBe(10);
    expect(pregnancyMonth(-1)).toBe(0);
    expect(monthWeekRange(1)).toEqual([0, 3]);
    expect(monthWeekRange(5)).toEqual([16, 19]);
    expect(monthWeekRange(10)).toEqual([36, 39]);
  });
  it("classifies term stages (ACOG CO 579; KSOG 조산 <37주, 지연임신 ≥42주=294일)", () => {
    expect(TERM_START_DAYS).toBe(259);
    expect(POST_TERM_DAYS).toBe(294);
    expect(termStage(-1)).toBe("before");
    expect(termStage(258)).toBe("preterm");
    expect(termStage(259)).toBe("early-term");
    expect(termStage(272)).toBe("early-term");
    expect(termStage(273)).toBe("full-term");
    expect(termStage(280)).toBe("full-term");
    expect(termStage(287)).toBe("late-term");
    expect(termStage(293)).toBe("late-term");
    expect(termStage(294)).toBe("post-term");
    // '만삭' alone means 37w0d–41w6d on the page, so ACOG's 39–40주 category is named distinctly.
    expect(TERM_STAGE_LABEL["full-term"].startsWith("만삭")).toBe(false);
  });
  it("formats D-day labels and progress", () => {
    expect(ddayLabel(23)).toBe("D-23");
    expect(ddayLabel(0)).toBe("D-day");
    expect(ddayLabel(-5)).toBe("D+5");
    expect(progressRatio(-3)).toBe(0);
    expect(progressRatio(140)).toBe(0.5);
    expect(progressRatio(400)).toBe(1);
  });
});

describe("due-date: check schedule", () => {
  it("is ordered and well-formed", () => {
    const starts = CHECK_SCHEDULE.map((c) => c.fromWeek);
    expect([...starts].sort((a, b) => a - b)).toEqual(starts);
    for (const c of CHECK_SCHEDULE) expect(c.toWeek).toBeGreaterThanOrEqual(c.fromWeek);
    expect(new Set(CHECK_SCHEDULE.map((c) => c.id)).size).toBe(CHECK_SCHEDULE.length);
  });
  it("uses KSOG windows for the key screenings", () => {
    const byId = Object.fromEntries(CHECK_SCHEDULE.map((c) => [c.id, [c.fromWeek, c.toWeek]]));
    expect(byId.nt).toEqual([11, 13]);
    expect(byId.quad).toEqual([15, 20]);
    expect(byId.anatomy).toEqual([20, 24]);
    expect(byId.gdm).toEqual([24, 28]);
  });
  it("turns week windows into inclusive calendar ranges", () => {
    // 11주 0일 = start + 77, 13주 6일 = start + 97
    const r = checkRange(d("2026-01-01"), { fromWeek: 11, toWeek: 13 });
    expect(f(r.from)).toBe("2026-03-19");
    expect(f(r.to)).toBe("2026-04-08");
  });
  it("tells whether a window is past, now or upcoming", () => {
    const nt = { fromWeek: 11, toWeek: 13 };
    expect(checkStatus(76, nt)).toBe("upcoming");
    expect(checkStatus(77, nt)).toBe("now");
    expect(checkStatus(97, nt)).toBe("now");
    expect(checkStatus(98, nt)).toBe("past");
  });
});

describe("due-date: support helpers", () => {
  it("puts the voucher expiry two years after the due date", () => {
    expect(f(voucherExpiry(d("2027-05-20")))).toBe("2029-05-20");
    expect(f(voucherExpiry(d("2028-02-29")))).toBe("2030-02-28");
  });
});
