/**
 * 디데이 · 날짜 계산.
 *
 * Conventions (Korean everyday usage + 민법):
 * - D-day: n = 목표일 − 오늘 (오늘 제외, 목표일 포함). 하루 전이 D-1, 당일이 D-day, 다음 날이 D+1.
 * - 기념일(100일·1000일): 시작일(사귄 날·태어난 날)을 1일째로 센다 → N일 = 시작일 + (N−1)일.
 *   아기 백일도 태어난 날을 1일로 센다. 주년·돌은 날수와 무관하게 N년 뒤 같은 날짜.
 * - 기간 계산(계약·법): 초일 불산입이 원칙 (민법 제157조). 주·월·연은 역(달력)으로 계산하고
 *   마지막 달에 해당일이 없으면 그 달 말일에 만료 (민법 제160조) → addMonths 의 말일 보정과 같다.
 * - 첫날을 세는 기간(기념일·나이, 민법 제158조 출생일 산입): 기간은 해당일의 전날에 차고,
 *   해당일이 없으면 그 달 말일에 찬다 (제160조 제2항·제3항). 그래서 새 기간은 다음 날 시작한다
 *   → 2월 29일 시작의 1주년·돌은 평년에 3월 1일, 1월 31일 시작의 1개월은 3월 1일 (monthMark).
 *   만 나이 계산기(src/lib/calc/age.ts)와 같은 규칙이다.
 *   https://www.law.go.kr/법령/민법
 *
 * Pure functions only: "today" is always passed in by the caller (useToday() on the client).
 */
import { addDays, addMonths, compareYMD, daysInMonth, diffDays, parseYMD, toUTC, type YMD } from "@/lib/date";
import { formatNumber } from "@/lib/format";
import {
  FIRST_YEAR,
  HOLIDAY_YEARS,
  HOLIDAYS_CHECKED_AT,
  holidaysOf,
  holidayYMD,
  isWeeklyRest,
  LAST_YEAR,
  offHoliday,
  shortHolidayName,
  type Holiday,
} from "./holidays";

export type DdayMode = "dday" | "between" | "add" | "anniv";
export const DDAY_MODES: DdayMode[] = ["dday", "between", "add", "anniv"];

/** "D-41" (41 days left), "D-day" (today), "D+8" (8 days ago). `diff` = target − today. */
export function ddayLabel(diff: number): string {
  if (diff === 0) return "D-day";
  return diff > 0 ? `D-${formatNumber(diff)}` : `D+${formatNumber(-diff)}`;
}

/** Returns [earlier, later] and whether the input order was reversed. */
export function orderDates(a: YMD, b: YMD): { from: YMD; to: YMD; swapped: boolean } {
  return compareYMD(a, b) <= 0 ? { from: a, to: b, swapped: false } : { from: b, to: a, swapped: true };
}

/**
 * Days between two dates (from ≤ to).
 * includeStart=false: 시작일 제외 (민법 초일 불산입, 일반 D-day와 같은 방식)
 * includeStart=true : 시작일도 1일로 셈 (기념일 방식) → +1
 */
export function daysBetween(from: YMD, to: YMD, includeStart = false): number {
  return diffDays(from, to) + (includeStart ? 1 : 0);
}

export type Span = { years: number; months: number; days: number };

/**
 * Calendar span from `from` to `to` (from ≤ to) as 년·개월·일.
 * Months follow the calendar; a missing day clamps to month end (민법 제160조),
 * e.g. 1월 31일 + 1개월 = 2월 28일.
 */
export function calendarSpan(from: YMD, to: YMD): Span {
  let months = (to.y - from.y) * 12 + (to.m - from.m);
  while (months > 0 && compareYMD(addMonths(from, months), to) > 0) months--;
  if (months < 0) months = 0;
  const days = diffDays(addMonths(from, months), to);
  return { years: Math.floor(months / 12), months: months % 12, days };
}

/**
 * The k-th month mark from `start` when `start` itself is day 1 (k ≥ 0): the day the (k+1)-th month begins.
 * Normally the same day-of-month k months later. If that month has no such day, the k-month period
 * ends on the month's last day (민법 제160조 제3항), so the mark is the 1st of the following month.
 * 1월 31일 + 1 → 3월 1일, 2024년 2월 29일 + 12 → 2025년 3월 1일. Same rule as age.ts monthAnniversary.
 */
export function monthMark(start: YMD, k: number): YMD {
  const total = start.y * 12 + (start.m - 1) + k;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  if (start.d <= daysInMonth(y, m)) return { y, m, d: start.d };
  return m === 12 ? { y: y + 1, m: 1, d: 1 } : { y, m: m + 1, d: 1 };
}

/**
 * Time elapsed from `start` (day 1) to `ref` as 년·개월·일, the way 만 나이 and 생후 N개월 are counted:
 * a month is complete on each month mark. ref < start → zero span.
 * 1월 31일생은 2월 28일에 0개월 28일, 3월 1일에 1개월.
 */
export function elapsedSpan(start: YMD, ref: YMD): Span {
  if (compareYMD(ref, start) <= 0) return { years: 0, months: 0, days: 0 };
  let k = Math.max(0, (ref.y - start.y) * 12 + (ref.m - start.m));
  while (k > 0 && compareYMD(monthMark(start, k), ref) > 0) k--;
  const days = diffDays(monthMark(start, k), ref);
  return { years: Math.floor(k / 12), months: k % 12, days };
}

/**
 * Calendar span of the inclusive range [from, to] when the first day counts (시작일 포함, from ≤ to).
 * k months are complete when the k-month period (ending the day before monthMark) fits in the range:
 * 1월 31일~2월 28일 = 1개월, 1월 31일~2월 27일 = 28일, 3월 1일~3월 31일 = 1개월.
 */
export function inclusiveSpan(from: YMD, to: YMD): Span {
  return elapsedSpan(from, addDays(to, 1));
}

/** "1년 2개월 3일" (zero parts omitted; "0일" when everything is zero). */
export function formatSpan(s: Span): string {
  const parts: string[] = [];
  if (s.years) parts.push(`${formatNumber(s.years)}년`);
  if (s.months) parts.push(`${s.months}개월`);
  if (s.days || parts.length === 0) parts.push(`${formatNumber(s.days)}일`);
  return parts.join(" ");
}

/** Total months of a span (for 생후 N개월). */
export function spanMonths(s: Span): number {
  return s.years * 12 + s.months;
}

/** "5주 6일" (or "6주" when it divides evenly). */
export function formatWeeks(days: number): string {
  const w = Math.floor(days / 7);
  const r = days % 7;
  if (w === 0) return `${r}일`;
  return r ? `${formatNumber(w)}주 ${r}일` : `${formatNumber(w)}주`;
}

/** Day of week, 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(v: YMD): number {
  return new Date(toUTC(v)).getUTCDay();
}

/** Number of Mon–Fri days in the inclusive range [from, to]. 0 if to < from. Public holidays are NOT removed (see betweenWorkdays). */
export function countWeekdays(from: YMD, to: YMD): number {
  const total = diffDays(from, to) + 1;
  if (total <= 0) return 0;
  const start = dayOfWeek(from);
  let count = Math.floor(total / 7) * 5;
  for (let i = 0; i < total % 7; i++) {
    const dow = (start + i) % 7;
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

// ---------------------------------------------------------------------------
// 근무일수 (공휴일 제외) for the 날짜 사이 mode.
// Holiday dates are not kept here: they come from the verified table in holidays.ts
// (관공서의 공휴일에 관한 규정 + 우주항공청 월력요항). A new year added there is picked up automatically.
// ---------------------------------------------------------------------------

/** Years with holiday data for the UI and prose: "2026~2027년". */
export const HOLIDAY_DATA_RANGE = FIRST_YEAR === LAST_YEAR ? `${FIRST_YEAR}년` : `${FIRST_YEAR}~${LAST_YEAR}년`;
const checkedAt = parseYMD(HOLIDAYS_CHECKED_AT);
/** "2026년 10월 9일": when the holiday table was last checked against official sources. */
export const HOLIDAY_DATA_CHECKED = checkedAt ? `${checkedAt.y}년 ${checkedAt.m}월 ${checkedAt.d}일` : HOLIDAYS_CHECKED_AT;

/** "full": every counted day has holiday data; "partial": some do; "none": none do (only weekends removed). */
export type HolidayCoverage = "full" | "partial" | "none";

/** `name` is the short label, e.g. "성탄절", "광복절 대체공휴일". */
export type WeekdayHoliday = { date: YMD; holiday: Holiday; name: string };

export type BetweenWorkdays = {
  /** First and last counted day: (from, to] when the start day is excluded, [from, to] when included. */
  start: YMD;
  end: YMD;
  /** Days counted (= the 날짜 사이 day count for the same includeStart). */
  calendarDays: number;
  /** Mon–Fri days in the counted range. */
  weekdays: number;
  /** Saturdays and Sundays in the counted range. */
  weekend: number;
  /** Public holidays (incl. 대체공휴일·선거일) on Mon–Fri inside the range and the data years, in date order. */
  holidays: WeekdayHoliday[];
  /** 근무일수 = weekdays − holidays.length (주 5일, 관공서 공휴일 기준). */
  workdays: number;
  /** Counted days outside the data years: only weekends are removed there. */
  uncoveredDays: number;
  coverage: HolidayCoverage;
};

/**
 * 근무일수 between two dates (from ≤ to) for a 주 5일 worker: Mon–Fri minus public holidays and
 * 대체공휴일 from holidays.ts. Counts the same days as daysBetween(from, to, includeStart).
 * Walks the holiday list, not the days, so any range the date input allows (years 1000–9999) is exact and fast.
 * Outside the data years nothing but weekends is removed; `uncoveredDays` and `coverage` say so.
 */
export function betweenWorkdays(from: YMD, to: YMD, includeStart = false): BetweenWorkdays {
  const start = includeStart ? from : addDays(from, 1);
  const end = to;
  const calendarDays = Math.max(0, diffDays(start, end) + 1);
  const weekdays = countWeekdays(start, end);
  let covered = 0;
  const holidays: WeekdayHoliday[] = [];
  if (calendarDays > 0) {
    for (const y of HOLIDAY_YEARS) {
      const ys = compareYMD(start, { y, m: 1, d: 1 }) > 0 ? start : { y, m: 1, d: 1 };
      const ye = compareYMD(end, { y, m: 12, d: 31 }) < 0 ? end : { y, m: 12, d: 31 };
      if (compareYMD(ys, ye) <= 0) covered += diffDays(ys, ye) + 1;
      const seen = new Set<string>();
      for (const h of holidaysOf(y)) {
        if (seen.has(h.date)) continue;
        seen.add(h.date);
        const d = holidayYMD(h);
        if (compareYMD(d, start) < 0 || compareYMD(d, end) > 0 || isWeeklyRest(d)) continue;
        const off = offHoliday(d);
        if (off) holidays.push({ date: d, holiday: off, name: shortHolidayName(off) });
      }
    }
  }
  holidays.sort((a, b) => compareYMD(a.date, b.date));
  const uncoveredDays = calendarDays - covered;
  const coverage: HolidayCoverage = uncoveredDays === 0 ? "full" : covered === 0 ? "none" : "partial";
  return {
    start,
    end,
    calendarDays,
    weekdays,
    weekend: calendarDays - weekdays,
    holidays,
    workdays: weekdays - holidays.length,
    uncoveredDays,
    coverage,
  };
}

/**
 * Earliest year accepted from a date input. Date.UTC maps years 0–99 to 1900–1999, and the native
 * date input passes "0002-…", "0020-…", "0202-…" while a year is being typed, so those stay invalid.
 */
export const MIN_INPUT_YEAR = 1000;
export const MIN_INPUT_DATE = "1000-01-01";
export const MAX_INPUT_DATE = "9999-12-31";

/** "YYYY-MM-DD" from a date input → YMD, or null when invalid or before MIN_INPUT_YEAR. */
export function parseInputDate(raw: string): YMD | null {
  const v = parseYMD(raw);
  return v && v.y >= MIN_INPUT_YEAR ? v : null;
}

/** Largest day count accepted by the N일 뒤/전 calculator. */
export const MAX_SHIFT_DAYS = 99_999;

/**
 * Validates the N일 뒤/전 day count: a whole number 0 … MAX_SHIFT_DAYS,
 * and at least 1 when the base day counts as day 1 (there is no 0일째).
 */
export function shiftCountError(n: number, includeBase: boolean): "range" | "zero" | null {
  if (!Number.isInteger(n) || n < 0 || n > MAX_SHIFT_DAYS) return "range";
  if (includeBase && n < 1) return "zero";
  return null;
}

/**
 * N일 뒤/전 날짜.
 * includeBase=true: 기준일을 1일째로 센다 → "100일째 되는 날" = 기준일 + 99일.
 */
export function shiftDate(base: YMD, n: number, opts: { before?: boolean; includeBase?: boolean } = {}): YMD {
  const offset = opts.includeBase ? Math.max(0, n - 1) : n;
  return addDays(base, opts.before ? -offset : offset);
}

/** 31 Dec of the given date's year. */
export function endOfYear(v: YMD): YMD {
  return { y: v.y, m: 12, d: 31 };
}

// ---------------------------------------------------------------------------
// 기념일 (anniversaries)
// ---------------------------------------------------------------------------

export type AnnivKind = "couple" | "baby";

/** Day-count anniversaries shown in the list. */
export const DAY_MILESTONES = [100, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1500, 2000, 2500, 3000, 4000, 5000, 7000, 10000];
/** Year anniversaries (주년 / 돌·생일). */
export const YEAR_MILESTONES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30];

export type Milestone = {
  type: "days" | "years";
  n: number;
  label: string;
  date: YMD;
  /** Day number of the milestone when the start date is day 1. */
  dayNumber: number;
};

/** N일 기념일 = 시작일 + (N−1)일 (시작일이 1일째). */
export function dayMilestoneDate(start: YMD, n: number): YMD {
  return addDays(start, n - 1);
}

/**
 * N주년·돌 = N년 뒤 같은 날짜. 2월 29일 시작은 평년에 2월 28일로 N년이 차므로(민법 제160조 제3항)
 * 다음 날인 3월 1일 — 만 나이가 바뀌는 날과 같다.
 */
export function yearMilestoneDate(start: YMD, years: number): YMD {
  return monthMark(start, years * 12);
}

/** Day number of `date` when `start` is day 1 (기념일 방식). Same day → 1. */
export function dayNumberOn(start: YMD, date: YMD): number {
  return diffDays(start, date) + 1;
}

export function milestoneLabel(type: "days" | "years", n: number, kind: AnnivKind): string {
  if (kind === "baby") {
    if (type === "days" && n === 100) return "백일 (100일)";
    if (type === "years") return n === 1 ? "돌 (첫 생일)" : n === 2 ? "두 돌" : `${n}번째 생일`;
  }
  return type === "days" ? `${formatNumber(n)}일` : `${n}주년`;
}

/** All milestones for a start date, sorted by date (day-count first on ties). */
export function milestones(start: YMD, kind: AnnivKind): Milestone[] {
  const list: Milestone[] = [
    ...DAY_MILESTONES.map((n) => {
      const date = dayMilestoneDate(start, n);
      return { type: "days" as const, n, label: milestoneLabel("days", n, kind), date, dayNumber: n };
    }),
    ...YEAR_MILESTONES.map((n) => {
      const date = yearMilestoneDate(start, n);
      return { type: "years" as const, n, label: milestoneLabel("years", n, kind), date, dayNumber: dayNumberOn(start, date) };
    }),
  ];
  return list.sort((a, b) => compareYMD(a.date, b.date) || (a.type === b.type ? 0 : a.type === "days" ? -1 : 1));
}

/**
 * A readable slice of the milestone list around `today`:
 * up to `past` already-passed milestones, then upcoming ones, `size` items in total.
 * `nextIndex` is the index (within `items`) of the first milestone on/after today, or -1.
 */
export function milestoneWindow(list: Milestone[], today: YMD, size = 20, past = 2): { items: Milestone[]; nextIndex: number } {
  let idx = list.findIndex((m) => compareYMD(m.date, today) >= 0);
  if (idx === -1) idx = list.length;
  const from = Math.max(0, Math.min(idx - past, list.length - size));
  const items = list.slice(from, from + size);
  const nextIndex = idx < list.length ? idx - from : -1;
  return { items, nextIndex };
}

// ---------------------------------------------------------------------------
// Well-known upcoming dates → /dday/<slug>/
// Every date below was checked against an official source on 2026-10-09.
// Public holiday dates (설·추석·신정·성탄절, 대체공휴일) are owned by src/lib/calc/holidays.ts — add a new
// year there first; dday.test.ts checks every holiday date written in these events against that table.
// Non-holiday events (수능) follow the 평가원 시행 기본계획 and are added here when it is published.
// ---------------------------------------------------------------------------

export type EventDate = { label: string; date: string; end?: string; note?: string };
export type EventSource = { name: string; url: string };

export type DdayEvent = {
  slug: string;
  /** Short name used in labels and chips, e.g. "수능" */
  short: string;
  /** Full name, e.g. "2027학년도 대학수학능력시험" */
  name: string;
  /** "YYYY-MM-DD" (KST) */
  date: string;
  title: string;
  description: string;
  keywords: string[];
  lead: string;
  /**
   * Lead and meta description used once the event has passed (the site is rebuilt daily, so a page
   * built after the date switches to these). Past tense; points to where the next date will come from.
   */
  pastLead: string;
  pastDescription: string;
  /** Long-form paragraphs (합니다체). */
  body: string[];
  facts: { label: string; value: string }[];
  /** Related dates table. */
  schedule: EventDate[];
  sources: EventSource[];
  faq: { q: string; a: string }[];
  /** Basis line under the lead. */
  basis: string;
};

const LAW_HOLIDAYS = "https://www.law.go.kr/법령/관공서의공휴일에관한규정";
const KASI_2027 = "https://astro.kasi.re.kr/kor/life/post/calendarData?year=2027";
const KASA = "https://www.kasa.go.kr/";

export const DDAY_EVENTS: DdayEvent[] = [
  {
    slug: "suneung",
    short: "수능",
    name: "2027학년도 수능",
    date: "2026-11-19",
    title: "수능 디데이 - 2027학년도 수능 2026년 11월 19일 D-day",
    description:
      "2027학년도 수능은 2026년 11월 19일(목)에 치러집니다. 오늘 기준 수능까지 남은 날을 자동으로 세고, 성적 통지일(12월 11일)과 D-100·D-30 날짜까지 정리했습니다.",
    keywords: ["수능 디데이", "수능 D-day", "2027 수능 날짜", "수능 며칠 남았", "2027학년도 수능"],
    lead: "2027학년도 대학수학능력시험은 2026년 11월 19일(목)에 치러집니다. 접속한 날짜를 기준으로 수능까지 남은 날을 자동으로 세어 드려요.",
    pastLead:
      "2027학년도 대학수학능력시험은 2026년 11월 19일(목)에 치러졌습니다. 다음 2028학년도 수능 날짜는 한국교육과정평가원 발표를 확인한 뒤 이 목록에 반영해요.",
    pastDescription:
      "2027학년도 수능은 2026년 11월 19일(목)에 치러졌고 성적 통지일은 12월 11일(금)입니다. 수능 날짜와 D-100·D-30 날짜, 시험 이후 지난 날을 정리했습니다.",
    body: [
      "2027학년도 수능은 한국교육과정평가원이 2026년 3월 31일 발표한 시행 기본계획에 따라 2026년 11월 19일 목요일에 전국 시험장에서 동시에 치러집니다. 성적은 2026년 12월 11일(금)까지 수험생에게 통지됩니다.",
      "이번 시험은 2015 개정 교육과정 범위에서 출제되며, 국어·수학에서 선택과목을 고르는 현행 체제로 치르는 마지막 수능입니다. 2028학년도 수능부터는 제2외국어/한문을 뺀 영역에서 선택과목 없이 공통 과목으로 응시하는 체제가 도입됩니다.",
      "EBS 수능 교재·강의와의 연계는 간접 연계 방식으로 문항 수 기준 50% 수준을 유지합니다. 영어·한국사·제2외국어/한문은 절대평가이고, 한국사는 필수 영역이라 응시하지 않으면 수능 성적 전체가 무효 처리됩니다.",
    ],
    facts: [
      { label: "시험일", value: "2026년 11월 19일 (목)" },
      { label: "출제·시행", value: "교육부, 한국교육과정평가원" },
      { label: "출제 범위", value: "2015 개정 교육과정" },
      { label: "EBS 연계", value: "간접 연계, 문항 수 기준 50% 수준" },
      { label: "절대평가 영역", value: "영어, 한국사, 제2외국어/한문" },
      { label: "성적 통지", value: "2026년 12월 11일 (금)까지" },
    ],
    schedule: [
      { label: "6월 모의평가", date: "2026-06-04" },
      { label: "응시원서 접수", date: "2026-08-24", end: "2026-09-04" },
      { label: "9월 모의평가", date: "2026-09-02" },
      { label: "수능 시행", date: "2026-11-19", note: "D-day" },
      { label: "성적 통지", date: "2026-12-11" },
    ],
    sources: [
      { name: "한국교육과정평가원 대학수학능력시험 누리집 (주요 일정)", url: "https://www.suneung.re.kr/" },
      { name: "2027학년도 수능 시행 기본계획 발표 보도 (2026년 3월 31일)", url: "https://www.newsis.com/view/NISX20260331_0003570832" },
    ],
    faq: [
      {
        q: "2027 수능은 언제인가요?",
        a: "2026년 11월 19일 목요일입니다. 2027학년도 대학 입시에 쓰이는 시험이라 이름은 2027학년도 수능이지만 시험은 2026년에 치릅니다.",
      },
      {
        q: "2027학년도 수능 성적은 언제 나오나요?",
        a: "한국교육과정평가원 일정에 따라 2026년 12월 11일(금)까지 수험생에게 통지됩니다.",
      },
      {
        q: "수능 날 몇 시까지 입실해야 하나요?",
        a: "예년과 같다면 오전 8시 10분까지 시험실에 들어가야 하고 1교시 국어는 8시 40분에 시작합니다. 정확한 시간은 수험표와 평가원 공지로 확인하세요.",
      },
    ],
    basis: "한국교육과정평가원 2027학년도 수능 시행 기본계획 기준 · 2026년 10월 9일 확인",
  },
  {
    slug: "christmas",
    short: "크리스마스",
    name: "2026 크리스마스",
    date: "2026-12-25",
    title: "크리스마스 디데이 - 2026 크리스마스 D-day, 며칠 남았나",
    description:
      "2026년 크리스마스는 12월 25일 금요일이라 토·일과 이어 사흘 연휴가 됩니다. 오늘 기준 크리스마스까지 남은 날을 자동으로 세고, 연말과 2027년 크리스마스 대체공휴일까지 정리했습니다.",
    keywords: ["크리스마스 디데이", "크리스마스 D-day", "크리스마스 며칠 남았", "2026 크리스마스 요일", "성탄절 디데이"],
    lead: "2026년 크리스마스는 12월 25일 금요일입니다. 접속한 날짜를 기준으로 크리스마스까지 남은 날을 자동으로 세어 드려요.",
    pastLead:
      "2026년 크리스마스는 12월 25일 금요일이었고 27일까지 사흘 연휴였습니다. 다음 크리스마스인 2027년 12월 25일은 토요일이라 12월 27일(월)이 대체공휴일이에요.",
    pastDescription:
      "2026년 크리스마스는 12월 25일(금)이었고 주말과 이어 사흘 연휴였습니다. 다음 크리스마스는 2027년 12월 25일(토)이고 12월 27일(월)이 대체공휴일입니다.",
    body: [
      "크리스마스의 공식 이름은 기독탄신일로, 「관공서의 공휴일에 관한 규정」 제2조에 따른 공휴일입니다. 2026년 12월 25일은 금요일이어서 주 5일 근무자라면 12월 25일부터 27일까지 사흘을 이어서 쉽니다.",
      "2023년 5월부터 기독탄신일과 부처님오신날도 대체공휴일 대상이 되었습니다. 2026년은 금요일이라 대체공휴일이 생기지 않지만, 2027년 크리스마스는 토요일이어서 12월 27일(월)이 대체공휴일입니다.",
      "민간 회사도 상시 근로자 5명 이상 사업장은 「근로기준법」 제55조에 따라 관공서 공휴일을 유급휴일로 보장해야 합니다. 5명 미만 사업장은 취업규칙이나 근로계약을 확인해야 합니다. 크리스마스 이브인 12월 24일은 공휴일이 아닙니다.",
    ],
    facts: [
      { label: "날짜", value: "2026년 12월 25일 (금)" },
      { label: "공식 명칭", value: "기독탄신일 (공휴일)" },
      { label: "근거", value: "관공서의 공휴일에 관한 규정 제2조" },
      { label: "연휴", value: "12월 25일(금) ~ 27일(일), 3일" },
      { label: "대체공휴일", value: "2026년은 해당 없음 (평일)" },
    ],
    schedule: [
      { label: "크리스마스 이브", date: "2026-12-24", note: "공휴일 아님" },
      { label: "크리스마스 (기독탄신일)", date: "2026-12-25", note: "D-day" },
      { label: "크리스마스 연휴 마지막 날", date: "2026-12-27" },
      { label: "2026년 마지막 날", date: "2026-12-31" },
      { label: "2027년 신정", date: "2027-01-01", note: "공휴일" },
      { label: "2027년 크리스마스", date: "2027-12-25" },
      { label: "2027년 크리스마스 대체공휴일", date: "2027-12-27" },
    ],
    sources: [
      { name: "관공서의 공휴일에 관한 규정 (국가법령정보센터)", url: LAW_HOLIDAYS },
      { name: "한국천문연구원 2026년 달력자료 (12월 25일 기독탄신일)", url: "https://astro.kasi.re.kr/kor/life/post/calendarData?year=2026" },
      { name: "한국천문연구원 2027년 달력자료 (공휴일·대체공휴일)", url: KASI_2027 },
    ],
    faq: [
      {
        q: "2026년 크리스마스는 무슨 요일인가요?",
        a: "금요일입니다. 토요일·일요일과 이어져 12월 25일부터 27일까지 사흘 연휴가 됩니다.",
      },
      {
        q: "크리스마스도 대체공휴일이 있나요?",
        a: "네. 2023년 5월부터 기독탄신일도 대체공휴일 대상입니다. 토요일이나 일요일과 겹치면 다음 첫 평일에 쉽니다. 2027년 크리스마스는 토요일이라 12월 27일(월)이 대체공휴일입니다.",
      },
      {
        q: "크리스마스 이브도 공휴일인가요?",
        a: "아니요. 12월 24일은 공휴일이 아니라 평일과 같습니다. 회사에 따라 단축 근무나 휴무를 정하기도 합니다.",
      },
    ],
    basis: "관공서의 공휴일에 관한 규정 · 한국천문연구원 달력자료 기준 · 2026년 10월 9일 확인",
  },
  {
    slug: "new-year",
    short: "새해",
    name: "2027년 새해",
    date: "2027-01-01",
    title: "새해 디데이 - 2027년 1월 1일까지 남은 날, 올해 남은 날",
    description:
      "2027년 1월 1일 신정은 금요일이라 1월 3일까지 사흘 연휴입니다. 오늘 기준 새해까지 남은 날과 올해 남은 날을 자동으로 세고, 2027년 설날과 공휴일 수까지 정리했습니다.",
    keywords: ["새해 디데이", "2027 새해 D-day", "올해 남은 날", "새해까지 며칠", "2027년 1월 1일 요일"],
    lead: "2027년 새해 첫날(신정)은 1월 1일 금요일입니다. 접속한 날짜를 기준으로 새해까지 남은 날을 자동으로 세어 드려요.",
    pastLead:
      "2027년 새해 첫날(신정)은 1월 1일 금요일이었고 3일까지 사흘 연휴였습니다. 다음 새해 첫날인 2028년 1월 1일은 토요일이에요.",
    pastDescription:
      "2027년 신정은 1월 1일(금)이었고 1월 3일까지 사흘 연휴였습니다. 2027년은 365일인 평년이고 실질 공휴일은 72일입니다. 다음 새해 첫날은 2028년 1월 1일(토)입니다.",
    body: [
      "1월 1일은 「관공서의 공휴일에 관한 규정」에 따른 공휴일(신정)입니다. 2027년 1월 1일은 금요일이라 1월 1일부터 3일까지 사흘 연휴가 됩니다. 신정은 대체공휴일 대상이 아니어서 주말과 겹치는 해에도 따로 쉬는 날이 생기지 않습니다.",
      "새해 D-day의 숫자는 오늘을 포함해 올해 남은 날수와 같습니다. 새해가 D-10이라면 오늘부터 12월 31일까지 10일이 남은 것이고, 오늘을 빼면 9일입니다. 12월 31일 당일은 D-1입니다.",
      "2027년은 평년이라 365일입니다. 우주항공청이 2026년 6월 29일 발표한 2027년도 월력요항에 따르면 일요일을 포함한 관공서 공휴일은 76일이고, 일요일과 겹치는 4일을 빼면 실질 공휴일은 72일입니다. 띠는 정미년(丁未年) 양띠이며, 전통 역법에서는 설날(2월 7일)이나 입춘부터 새해 띠로 봅니다.",
    ],
    facts: [
      { label: "날짜", value: "2027년 1월 1일 (금)" },
      { label: "연휴", value: "1월 1일(금) ~ 3일(일), 3일" },
      { label: "2027년 일수", value: "365일 (평년)" },
      { label: "2027년 실질 공휴일", value: "72일 (월력요항)" },
      { label: "띠", value: "정미년(丁未年) 양띠" },
    ],
    schedule: [
      { label: "2026년 크리스마스", date: "2026-12-25" },
      { label: "2026년 마지막 날", date: "2026-12-31", note: "D-1" },
      { label: "2027년 신정", date: "2027-01-01", note: "D-day" },
      { label: "신정 연휴 마지막 날", date: "2027-01-03" },
      { label: "2027년 설날", date: "2027-02-07" },
    ],
    sources: [
      { name: "관공서의 공휴일에 관한 규정 (국가법령정보센터)", url: LAW_HOLIDAYS },
      { name: "한국천문연구원 2027년 달력자료", url: KASI_2027 },
      { name: "우주항공청 (2027년도 월력요항, 2026년 6월 29일 발표)", url: KASA },
    ],
    faq: [
      {
        q: "2027년 1월 1일은 무슨 요일인가요?",
        a: "금요일입니다. 토요일·일요일과 이어져 1월 1일부터 3일까지 사흘을 쉴 수 있습니다.",
      },
      {
        q: "1월 2일도 공휴일인가요?",
        a: "아니요. 신정 공휴일은 1월 1일 하루뿐입니다. 2027년 1월 2일은 토요일입니다.",
      },
      {
        q: "올해 남은 날은 어떻게 세나요?",
        a: "새해 D-day 숫자가 곧 오늘을 포함한 올해 남은 날수입니다. 오늘을 빼고 세려면 그 숫자에서 1을 빼면 됩니다.",
      },
    ],
    basis: "우주항공청 2027년도 월력요항 · 관공서의 공휴일에 관한 규정 기준 · 2026년 10월 9일 확인",
  },
  {
    slug: "seollal",
    short: "설날",
    name: "2027년 설날",
    date: "2027-02-07",
    title: "설날 디데이 - 2027 설날 2월 7일, 설 연휴 날짜",
    description:
      "2027년 설날은 2월 7일 일요일입니다. 설 연휴는 2월 6일부터 8일까지이고 2월 9일(화)이 대체공휴일이라 나흘을 쉽니다. 오늘 기준 설날까지 남은 날을 자동으로 계산합니다.",
    keywords: ["설날 디데이", "2027 설날", "2027 설 연휴", "설날 대체공휴일", "설날 며칠 남았"],
    lead: "2027년 설날은 2월 7일 일요일이고, 대체공휴일을 더해 2월 6일부터 9일까지 나흘 연휴입니다. 접속한 날짜를 기준으로 설날까지 남은 날을 세어 드려요.",
    pastLead:
      "2027년 설날은 2월 7일 일요일이었고, 대체공휴일을 더해 2월 6일부터 9일까지 나흘 연휴였습니다. 2028년 설날 날짜는 우주항공청 월력요항을 확인한 뒤 이 목록에 반영해요.",
    pastDescription:
      "2027년 설날은 2월 7일(일)이었고 설 연휴 2월 6일~8일에 대체공휴일 2월 9일(화)을 더해 나흘을 쉬었습니다. 설 연휴 날짜와 대체공휴일 규칙을 정리했습니다.",
    body: [
      "설날은 음력 1월 1일입니다. 「관공서의 공휴일에 관한 규정」에 따라 설 전날·설날·다음 날 사흘이 공휴일이며, 2027년에는 2월 6일(토)·7일(일)·8일(월)이 설 연휴입니다.",
      "설 연휴가 일요일과 겹치면 연휴 다음 첫 번째 평일을 대체공휴일로 쉽니다. 2027년은 설날 당일이 일요일이라 2월 9일(화)이 대체공휴일이 되고, 주 5일 근무자는 2월 6일부터 9일까지 나흘을 쉽니다. 설·추석 연휴는 토요일과 겹칠 때는 대체공휴일이 생기지 않아 2월 6일 몫은 따로 보상되지 않습니다.",
      "연휴 바로 앞인 2월 5일(금)에 연차를 하루 쓰면 2월 5일부터 9일까지 닷새를 이어서 쉴 수 있습니다. 음력 날짜와 공휴일은 우주항공청이 매년 발표하는 월력요항을 기준으로 정해집니다.",
    ],
    facts: [
      { label: "설날", value: "2027년 2월 7일 (일), 음력 1월 1일" },
      { label: "설 연휴", value: "2월 6일(토) ~ 8일(월)" },
      { label: "대체공휴일", value: "2월 9일 (화)" },
      { label: "쉬는 날", value: "4일 (연차 1일 더하면 5일)" },
    ],
    schedule: [
      { label: "연차를 쓰면 좋은 날", date: "2027-02-05", note: "연차 1일 → 5일 연휴" },
      { label: "설 연휴 시작 (설 전날)", date: "2027-02-06" },
      { label: "설날", date: "2027-02-07", note: "D-day" },
      { label: "설 연휴 (다음 날)", date: "2027-02-08" },
      { label: "대체공휴일", date: "2027-02-09" },
      { label: "정월대보름", date: "2027-02-21", note: "공휴일 아님" },
    ],
    sources: [
      { name: "우주항공청 (2027년도 월력요항, 2026년 6월 29일 발표)", url: KASA },
      { name: "한국천문연구원 2027년 달력자료 (설날·대체공휴일)", url: KASI_2027 },
      { name: "관공서의 공휴일에 관한 규정 (국가법령정보센터)", url: LAW_HOLIDAYS },
    ],
    faq: [
      {
        q: "2027년 설 연휴는 며칠인가요?",
        a: "설 연휴 2월 6일(토)~8일(월)에 대체공휴일 2월 9일(화)을 더해 2월 6일부터 9일까지 나흘입니다.",
      },
      {
        q: "2027년 설날 대체공휴일은 언제인가요?",
        a: "설날 당일(2월 7일)이 일요일과 겹쳐 연휴 다음 날인 2월 9일(화)이 대체공휴일입니다.",
      },
      {
        q: "설 연휴에 연차를 쓰면 며칠 쉴 수 있나요?",
        a: "연휴 직전 2월 5일(금)에 연차 하루를 쓰면 2월 5일부터 9일까지 5일을 쉴 수 있습니다.",
      },
    ],
    basis: "우주항공청 2027년도 월력요항 · 한국천문연구원 달력자료 기준 · 2026년 10월 9일 확인",
  },
  {
    slug: "chuseok",
    short: "추석",
    name: "2027년 추석",
    date: "2027-09-15",
    title: "추석 디데이 - 2027 추석 9월 15일, 추석 연휴 날짜",
    description:
      "2027년 추석은 9월 15일 수요일이고 연휴는 9월 14일부터 16일까지입니다. 앞뒤로 연차 이틀을 쓰면 최장 9일을 쉴 수 있습니다. 오늘 기준 추석까지 남은 날을 자동으로 계산합니다.",
    keywords: ["추석 디데이", "2027 추석", "2027 추석 연휴", "추석 며칠 남았", "추석 황금연휴"],
    lead: "2027년 추석은 9월 15일 수요일이고 연휴는 9월 14일부터 16일까지입니다. 접속한 날짜를 기준으로 추석까지 남은 날을 세어 드려요.",
    pastLead:
      "2027년 추석은 9월 15일 수요일이었고 연휴는 9월 14일부터 16일까지였습니다. 2028년 추석 날짜는 우주항공청 월력요항을 확인한 뒤 이 목록에 반영해요.",
    pastDescription:
      "2027년 추석은 9월 15일(수)이었고 연휴는 9월 14일(화)부터 16일(목)까지 사흘이었습니다. 추석 연휴 날짜와 연차를 붙인 최장 연휴, 가을 대체공휴일을 정리했습니다.",
    body: [
      "추석은 음력 8월 15일입니다. 추석 전날·당일·다음 날 사흘이 공휴일이며, 2027년에는 9월 14일(화)부터 16일(목)까지가 추석 연휴입니다. 연휴가 주말이나 다른 공휴일과 겹치지 않아 대체공휴일은 없습니다.",
      "연휴 앞뒤인 9월 13일(월)과 17일(금)에 연차를 쓰면 9월 11일(토)부터 19일(일)까지 9일을 이어서 쉴 수 있습니다. 연차를 하루만 쓴다면 13일이나 17일 중 하루를 붙여 엿새 연휴를 만들 수 있습니다.",
      "가을 연휴는 추석 뒤에도 이어집니다. 2027년 개천절(10월 3일)은 일요일, 한글날(10월 9일)은 토요일이라 각각 10월 4일(월)과 10월 11일(월)이 대체공휴일이 되어 사흘 연휴가 두 번 생깁니다.",
    ],
    facts: [
      { label: "추석", value: "2027년 9월 15일 (수), 음력 8월 15일" },
      { label: "추석 연휴", value: "9월 14일(화) ~ 16일(목), 3일" },
      { label: "대체공휴일", value: "없음" },
      { label: "최장 연휴", value: "9일 (9월 13일·17일 연차 2일)" },
    ],
    schedule: [
      { label: "연차를 쓰면 좋은 날", date: "2027-09-13", note: "연휴 앞" },
      { label: "추석 연휴 시작 (추석 전날)", date: "2027-09-14" },
      { label: "추석", date: "2027-09-15", note: "D-day" },
      { label: "추석 연휴 마지막 날", date: "2027-09-16" },
      { label: "연차를 쓰면 좋은 날", date: "2027-09-17", note: "연휴 뒤" },
      { label: "개천절 대체공휴일", date: "2027-10-04" },
      { label: "한글날 대체공휴일", date: "2027-10-11" },
    ],
    sources: [
      { name: "우주항공청 (2027년도 월력요항, 2026년 6월 29일 발표)", url: KASA },
      { name: "한국천문연구원 2027년 달력자료 (추석·대체공휴일)", url: KASI_2027 },
      { name: "관공서의 공휴일에 관한 규정 (국가법령정보센터)", url: LAW_HOLIDAYS },
    ],
    faq: [
      {
        q: "2027년 추석 연휴는 언제인가요?",
        a: "추석 당일은 9월 15일(수)이고, 연휴는 9월 14일(화)부터 16일(목)까지 사흘입니다.",
      },
      {
        q: "2027년 추석에 대체공휴일이 있나요?",
        a: "없습니다. 연휴 사흘이 모두 평일이라 일요일이나 다른 공휴일과 겹치지 않습니다.",
      },
      {
        q: "추석 연휴에 연차를 쓰면 최대 며칠 쉬나요?",
        a: "9월 13일(월)과 17일(금) 이틀을 쓰면 9월 11일(토)부터 19일(일)까지 9일을 쉴 수 있습니다.",
      },
    ],
    basis: "우주항공청 2027년도 월력요항 · 한국천문연구원 달력자료 기준 · 2026년 10월 9일 확인",
  },
];

export const DDAY_EVENT_SLUGS = DDAY_EVENTS.map((e) => e.slug);

export function getEvent(slug: string): DdayEvent | undefined {
  return DDAY_EVENTS.find((e) => e.slug === slug);
}

export function eventYMD(e: DdayEvent): YMD {
  const v = parseYMD(e.date);
  if (!v) throw new Error(`Invalid event date: ${e.slug}`);
  return v;
}

/** Events on or after `today`, soonest first. */
export function upcomingEvents(today: YMD): DdayEvent[] {
  return DDAY_EVENTS.filter((e) => compareYMD(eventYMD(e), today) >= 0).sort((a, b) => compareYMD(eventYMD(a), eventYMD(b)));
}

/** Events before `today`, most recent first. */
export function pastEvents(today: YMD): DdayEvent[] {
  return DDAY_EVENTS.filter((e) => compareYMD(eventYMD(e), today) < 0).sort((a, b) => compareYMD(eventYMD(b), eventYMD(a)));
}

export type EventStatus = "upcoming" | "today" | "past";

/** Where an event stands on `ref` (the build date on server pages). */
export function eventStatus(e: DdayEvent, ref: YMD): EventStatus {
  const c = compareYMD(eventYMD(e), ref);
  return c > 0 ? "upcoming" : c === 0 ? "today" : "past";
}

/** Known event falling on `date`, if any. */
export function eventOn(date: YMD): DdayEvent | undefined {
  return DDAY_EVENTS.find((e) => compareYMD(eventYMD(e), date) === 0);
}

/** Next Christmas on or after `today`. */
export function nextChristmas(today: YMD): YMD {
  const thisYear = { y: today.y, m: 12, d: 25 };
  return compareYMD(thisYear, today) >= 0 ? thisYear : { y: today.y + 1, m: 12, d: 25 };
}

/** Default D-day target: the soonest listed event, else the next Christmas. */
export function defaultTarget(today: YMD): YMD {
  const next = upcomingEvents(today)[0];
  return next ? eventYMD(next) : nextChristmas(today);
}

/** D-100 … D-1 dates before an event (static, independent of today). */
export const COUNTDOWN_STEPS = [100, 50, 30, 14, 7, 3, 1];
export function countdownDates(date: YMD): { n: number; date: YMD }[] {
  return COUNTDOWN_STEPS.map((n) => ({ n, date: addDays(date, -n) }));
}
