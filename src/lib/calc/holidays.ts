/**
 * 공휴일·근무일 계산기 — 2026·2027 관공서 공휴일 데이터와 근무일수·연차 연휴 계산.
 *
 * 근거 (2026년 10월 9일 확인)
 * - 「관공서의 공휴일에 관한 규정」 대통령령 제36290호(2026. 4. 30. 일부개정).
 *   노동절(제2조제6호)은 2026. 5. 1.부터, 모든 국경일(제2조제2호, 제헌절 포함)은 2026. 5. 11.부터 시행.
 *   제3조(대체공휴일) ① 1. 국경일·부처님오신날·노동절·어린이날·기독탄신일이 토요일이나 일요일과 겹치는 경우
 *   2. 설·추석 연휴가 일요일과 겹치는 경우 3. (1·2호의 공휴일이) 평일에 다른 공휴일과 겹치는 경우
 *   → 그 공휴일 다음의 첫 번째 비공휴일. ② 대체공휴일끼리 겹치면 그다음 비공휴일까지. ③ 대체공휴일이 토요일이면 그다음 비공휴일.
 *   1월 1일, 현충일, 선거일, 임시공휴일은 대체공휴일 대상이 아님.
 * - 「공휴일에 관한 법률」: 제헌절 재지정(2026. 1. 29. 국회 통과), 노동절 공휴일 지정(2026. 3. 31. 국회 통과).
 * - 2026년: 한국천문연구원 2026년 달력자료(설·추석·부처님오신날·대체공휴일·6월 3일 전국동시지방선거·제헌절)
 *   + 노동절(2026. 5. 1., 개정 규정 시행일). 천문연 2026 페이지는 5월 1일을 아직 ‘근로자의 날’ 기념일로만 적고 있음.
 *   임시공휴일 지정 없음(9월 28일 지정 요청은 불발, 5월 4일 지정설은 사실 아님).
 * - 2027년: 우주항공청 2027년도 월력요항(2026. 6. 29. 발표) — 일요일 52일 + 공휴일 24일 = 76일,
 *   일요일과 겹치는 4일을 빼면 실질 공휴일 72일, 주 5일제 휴일 119일. 한국천문연구원 2027년 달력자료와 날짜 일치.
 *   2027년에는 임기만료 선거가 없음(다음 국회의원 선거 2028년, 대통령·지방선거 2030년). 임시공휴일 지정 없음.
 *
 * 매년 한 번 갱신: 우주항공청 월력요항(매년 6월 무렵 발표)이 나오면 다음 해를 추가하세요.
 */
import { addDays, compareYMD, diffDays, formatYMD, parseYMD, toUTC, weekdayKo, type YMD } from "@/lib/date";

export const HOLIDAYS_CHECKED_AT = "2026-10-09";

/** Which item of 관공서의 공휴일에 관한 규정 제2조 a holiday comes from. */
export type HolidayCategory =
  | "newyear" // 3호 1월 1일
  | "seollal" // 4호 설 연휴
  | "national" // 2호 국경일 (3·1절, 제헌절, 광복절, 개천절, 한글날)
  | "buddha" // 5호 부처님오신날
  | "labor" // 6호 노동절
  | "children" // 7호 어린이날
  | "memorial" // 8호 현충일
  | "chuseok" // 9호 추석 연휴
  | "christmas" // 10호 기독탄신일
  | "election" // 10의2호 임기만료 선거일
  | "temporary"; // 11호 임시공휴일

export type Holiday = {
  /** "YYYY-MM-DD" */
  date: string;
  /** Display name, e.g. "설날", "대체공휴일 (광복절)" */
  name: string;
  category: HolidayCategory;
  /** 대체공휴일이면 원래 공휴일 날짜 */
  substituteFor?: string;
};

export type HolidaySource = { name: string; url: string };

export const LAW_URL = "https://www.law.go.kr/법령/관공서의공휴일에관한규정";
export const KASI_URL = (year: number) => `https://astro.kasi.re.kr/kor/life/post/calendarData?year=${year}`;
export const KASA_URL = "https://www.kasa.go.kr/";

const H = (date: string, name: string, category: HolidayCategory, substituteFor?: string): Holiday =>
  substituteFor ? { date, name, category, substituteFor } : { date, name, category };

export const HOLIDAYS: Record<number, Holiday[]> = {
  2026: [
    H("2026-01-01", "신정 (1월 1일)", "newyear"),
    H("2026-02-16", "설날 전날", "seollal"),
    H("2026-02-17", "설날", "seollal"),
    H("2026-02-18", "설날 다음 날", "seollal"),
    H("2026-03-01", "3·1절", "national"),
    H("2026-03-02", "대체공휴일 (3·1절)", "national", "2026-03-01"),
    H("2026-05-01", "노동절", "labor"),
    H("2026-05-05", "어린이날", "children"),
    H("2026-05-24", "부처님오신날", "buddha"),
    H("2026-05-25", "대체공휴일 (부처님오신날)", "buddha", "2026-05-24"),
    H("2026-06-03", "전국동시지방선거일", "election"),
    H("2026-06-06", "현충일", "memorial"),
    H("2026-07-17", "제헌절", "national"),
    H("2026-08-15", "광복절", "national"),
    H("2026-08-17", "대체공휴일 (광복절)", "national", "2026-08-15"),
    H("2026-09-24", "추석 전날", "chuseok"),
    H("2026-09-25", "추석", "chuseok"),
    H("2026-09-26", "추석 다음 날", "chuseok"),
    H("2026-10-03", "개천절", "national"),
    H("2026-10-05", "대체공휴일 (개천절)", "national", "2026-10-03"),
    H("2026-10-09", "한글날", "national"),
    H("2026-12-25", "기독탄신일 (성탄절)", "christmas"),
  ],
  2027: [
    H("2027-01-01", "신정 (1월 1일)", "newyear"),
    H("2027-02-06", "설날 전날", "seollal"),
    H("2027-02-07", "설날", "seollal"),
    H("2027-02-08", "설날 다음 날", "seollal"),
    H("2027-02-09", "대체공휴일 (설날)", "seollal", "2027-02-07"),
    H("2027-03-01", "3·1절", "national"),
    H("2027-05-01", "노동절", "labor"),
    H("2027-05-03", "대체공휴일 (노동절)", "labor", "2027-05-01"),
    H("2027-05-05", "어린이날", "children"),
    H("2027-05-13", "부처님오신날", "buddha"),
    H("2027-06-06", "현충일", "memorial"),
    H("2027-07-17", "제헌절", "national"),
    H("2027-07-19", "대체공휴일 (제헌절)", "national", "2027-07-17"),
    H("2027-08-15", "광복절", "national"),
    H("2027-08-16", "대체공휴일 (광복절)", "national", "2027-08-15"),
    H("2027-09-14", "추석 전날", "chuseok"),
    H("2027-09-15", "추석", "chuseok"),
    H("2027-09-16", "추석 다음 날", "chuseok"),
    H("2027-10-03", "개천절", "national"),
    H("2027-10-04", "대체공휴일 (개천절)", "national", "2027-10-03"),
    H("2027-10-09", "한글날", "national"),
    H("2027-10-11", "대체공휴일 (한글날)", "national", "2027-10-09"),
    H("2027-12-25", "기독탄신일 (성탄절)", "christmas"),
    H("2027-12-27", "대체공휴일 (성탄절)", "christmas", "2027-12-25"),
  ],
};

export const HOLIDAY_SOURCES: Record<number, HolidaySource[]> = {
  2026: [
    { name: "한국천문연구원 2026년 달력자료", url: KASI_URL(2026) },
    { name: "관공서의 공휴일에 관한 규정 (대통령령 제36290호, 노동절·제헌절 추가)", url: LAW_URL },
  ],
  2027: [
    { name: "우주항공청 2027년도 월력요항 (2026년 6월 29일 발표)", url: KASA_URL },
    { name: "한국천문연구원 2027년 달력자료", url: KASI_URL(2027) },
    { name: "관공서의 공휴일에 관한 규정 (국가법령정보센터)", url: LAW_URL },
  ],
};

/** Years with verified holiday data, ascending. */
export const HOLIDAY_YEARS = Object.keys(HOLIDAYS)
  .map(Number)
  .sort((a, b) => a - b);
export const FIRST_YEAR = HOLIDAY_YEARS[0];
export const LAST_YEAR = HOLIDAY_YEARS[HOLIDAY_YEARS.length - 1];

const BY_DATE = new Map<string, Holiday[]>();
for (const year of HOLIDAY_YEARS) {
  for (const h of HOLIDAYS[year]) {
    const list = BY_DATE.get(h.date) ?? [];
    list.push(h);
    BY_DATE.set(h.date, list);
  }
}

export function isCoveredYear(y: number): boolean {
  return y in HOLIDAYS;
}

export function holidaysOf(year: number): Holiday[] {
  return HOLIDAYS[year] ?? [];
}

export function holidayYMD(h: Holiday): YMD {
  return parseYMD(h.date)!;
}

/** Holidays on a date (usually 0 or 1). */
export function holidaysOn(d: YMD): Holiday[] {
  return BY_DATE.get(formatYMD(d)) ?? [];
}

/** 0 = Sunday … 6 = Saturday (timezone-safe). */
export function dayOfWeek(d: YMD): number {
  return new Date(toUTC(d)).getUTCDay();
}

// ---------------------------------------------------------------------------
// Work rules
// ---------------------------------------------------------------------------

export type WorkRule = {
  /** 토요일도 일하는 주 6일 근무 */
  saturdayWork: boolean;
  /**
   * 상시 근로자 5명 미만 사업장: 관공서 공휴일을 유급휴일로 줄 의무가 없다(근로기준법 제55조②은 5인 이상만 적용).
   * 공휴일 가운데에서는 노동절(5월 1일)만 「노동절 제정에 관한 법률」에 따라 규모와 관계없이 유급휴일
   * (주휴일은 제55조①로 5인 미만에도 별도로 적용).
   */
  smallBiz: boolean;
};

export const DEFAULT_RULE: WorkRule = { saturdayWork: false, smallBiz: false };

/** The holiday that gives a day off on `d` under `rule`, or null. */
export function offHoliday(d: YMD, rule: WorkRule = DEFAULT_RULE): Holiday | null {
  const list = holidaysOn(d);
  if (!list.length) return null;
  if (rule.smallBiz) return list.find((h) => h.category === "labor" && !h.substituteFor) ?? null;
  return list[0];
}

/** Rest day by the weekly schedule alone (Sunday, and Saturday for 주 5일). */
export function isWeeklyRest(d: YMD, rule: WorkRule = DEFAULT_RULE): boolean {
  const w = dayOfWeek(d);
  return w === 0 || (w === 6 && !rule.saturdayWork);
}

export function isOffDay(d: YMD, rule: WorkRule = DEFAULT_RULE): boolean {
  return isWeeklyRest(d, rule) || offHoliday(d, rule) !== null;
}

export function isWorkday(d: YMD, rule: WorkRule = DEFAULT_RULE): boolean {
  return !isOffDay(d, rule);
}

// ---------------------------------------------------------------------------
// 근무일수 (inclusive range)
// ---------------------------------------------------------------------------

export type HolidayHit = { date: YMD; holiday: Holiday; /** true when it fell on a scheduled workday */ reducesWork: boolean };

export type WorkdayCount = {
  calendarDays: number;
  workdays: number;
  saturdays: number;
  sundays: number;
  /** Weekly rest days in range (Sat+Sun for 주 5일, Sun for 주 6일) */
  weeklyRest: number;
  /** Holidays on otherwise-working days (these are what lower the count) */
  holidaysOnWorkdays: number;
  /** Holidays that fell on a weekly rest day (no extra day off) */
  holidaysOnRestDays: number;
  /** Holidays in range under the rule, in date order */
  holidays: HolidayHit[];
  /** Days in range outside the years with holiday data (only weekends removed there) */
  uncoveredDays: number;
};

/** Max range the calculator accepts (about 30 years) to keep the loop bounded. */
export const MAX_RANGE_DAYS = 11_000;

export function countWorkdays(start: YMD, end: YMD, rule: WorkRule = DEFAULT_RULE): WorkdayCount {
  const out: WorkdayCount = {
    calendarDays: 0,
    workdays: 0,
    saturdays: 0,
    sundays: 0,
    weeklyRest: 0,
    holidaysOnWorkdays: 0,
    holidaysOnRestDays: 0,
    holidays: [],
    uncoveredDays: 0,
  };
  const n = diffDays(start, end) + 1;
  if (n <= 0) return out;
  let w = dayOfWeek(start);
  for (let i = 0; i < Math.min(n, MAX_RANGE_DAYS); i++) {
    const d = addDays(start, i);
    out.calendarDays++;
    if (w === 6) out.saturdays++;
    if (w === 0) out.sundays++;
    const rest = w === 0 || (w === 6 && !rule.saturdayWork);
    if (rest) out.weeklyRest++;
    if (!isCoveredYear(d.y)) out.uncoveredDays++;
    const h = offHoliday(d, rule);
    if (h) {
      out.holidays.push({ date: d, holiday: h, reducesWork: !rest });
      if (rest) out.holidaysOnRestDays++;
      else out.holidaysOnWorkdays++;
    }
    if (!rest && !h) out.workdays++;
    w = (w + 1) % 7;
  }
  return out;
}

/**
 * The `n`-th working day after `start` (start itself is not counted), e.g. "3영업일 후".
 * `uncovered` is true when the walk passed a year without holiday data.
 */
export function addWorkdays(start: YMD, n: number, rule: WorkRule = DEFAULT_RULE): { date: YMD; skipped: HolidayHit[]; uncovered: boolean } {
  let d = start;
  let left = Math.max(0, Math.floor(n));
  const skipped: HolidayHit[] = [];
  let uncovered = false;
  let guard = 0;
  while (left > 0 && guard++ < MAX_RANGE_DAYS) {
    d = addDays(d, 1);
    if (!isCoveredYear(d.y)) uncovered = true;
    const h = offHoliday(d, rule);
    const rest = isWeeklyRest(d, rule);
    if (h) skipped.push({ date: d, holiday: h, reducesWork: !rest });
    if (!rest && !h) left--;
  }
  return { date: d, skipped, uncovered };
}

export const MAX_ADD_WORKDAYS = 1000;

// ---------------------------------------------------------------------------
// 대체공휴일 rule (used by tests to cross-check the data against 제3조)
// ---------------------------------------------------------------------------

const SAT_OR_SUN: HolidayCategory[] = ["national", "buddha", "labor", "children", "christmas"]; // 제3조①1
const SUN_ONLY: HolidayCategory[] = ["seollal", "chuseok"]; // 제3조①2
const RULE_2_TO_10: HolidayCategory[] = [...SAT_OR_SUN, ...SUN_ONLY, "memorial"]; // 제2조제2호~제10호

/**
 * 대체공휴일 dates produced by 제3조 from a list of base (non-substitute) holidays.
 * 비공휴일 = a day that is neither Sunday nor a base holiday; Saturdays are skipped by 제3조③.
 */
export function substituteDates(base: Holiday[]): string[] {
  const baseDates = new Set(base.map((h) => h.date));
  const byDate = new Map<string, Holiday[]>();
  for (const h of base) byDate.set(h.date, [...(byDate.get(h.date) ?? []), h]);
  const taken = new Set<string>();
  const out: string[] = [];
  for (const date of [...byDate.keys()].sort()) {
    const d = parseYMD(date)!;
    const w = dayOfWeek(d);
    const list = byDate.get(date)!.filter((h) => RULE_2_TO_10.includes(h.category));
    let need = 0;
    if (w === 6) need = list.filter((h) => SAT_OR_SUN.includes(h.category)).length;
    else if (w === 0) need = list.filter((h) => SAT_OR_SUN.includes(h.category) || SUN_ONLY.includes(h.category)).length;
    else if (list.length > 1) need = list.length - 1;
    let c = d;
    while (need > 0) {
      c = addDays(c, 1);
      const key = formatYMD(c);
      const cw = dayOfWeek(c);
      if (cw === 0 || cw === 6 || baseDates.has(key) || taken.has(key)) continue;
      taken.add(key);
      out.push(key);
      need--;
    }
  }
  return out.sort();
}

// ---------------------------------------------------------------------------
// Year summary (월력요항 counts)
// ---------------------------------------------------------------------------

export type YearSummary = {
  year: number;
  /** 공휴일로 지정된 날짜 수 (대체공휴일 포함, 주말과 겹친 날 포함; 일반 일요일은 제외), e.g. 24 */
  designated: number;
  substitutes: number;
  sundays: number;
  saturdays: number;
  onSaturday: number;
  onSunday: number;
  /** Holidays on Mon–Fri */
  onWeekdays: number;
  /** 실질 공휴일: 일요일 + 공휴일 지정일, 일요일과 겹친 날은 한 번만 (월력요항 "실질 공휴일", e.g. 72) */
  realDays: number;
  /** 월력요항 "관공서 공휴일": 일요일 + 공휴일 지정일, 겹친 날도 두 번 (e.g. 76) */
  officialDays: number;
  /** 주 5일제 실제 휴일 수 (토·일 + 평일 공휴일), e.g. 119 */
  restDays5: number;
  daysInYear: number;
  /** 주 5일 근무일수 */
  workdays5: number;
  /** 주 6일 근무일수 (일요일·공휴일 제외) */
  workdays6: number;
};

export function yearSummary(year: number): YearSummary {
  const list = holidaysOf(year);
  const dates = [...new Set(list.map((h) => h.date))].map((s) => parseYMD(s)!);
  const all = countWorkdays({ y: year, m: 1, d: 1 }, { y: year, m: 12, d: 31 });
  const six = countWorkdays({ y: year, m: 1, d: 1 }, { y: year, m: 12, d: 31 }, { saturdayWork: true, smallBiz: false });
  const onSaturday = dates.filter((d) => dayOfWeek(d) === 6).length;
  const onSunday = dates.filter((d) => dayOfWeek(d) === 0).length;
  return {
    year,
    designated: dates.length,
    substitutes: list.filter((h) => h.substituteFor).length,
    sundays: all.sundays,
    saturdays: all.saturdays,
    onSaturday,
    onSunday,
    onWeekdays: dates.length - onSaturday - onSunday,
    realDays: all.sundays + dates.length - onSunday,
    officialDays: all.sundays + dates.length,
    restDays5: all.calendarDays - all.workdays,
    daysInYear: all.calendarDays,
    workdays5: all.workdays,
    workdays6: six.workdays,
  };
}

export type MonthRow = {
  m: number;
  calendarDays: number;
  weekend: number;
  holidaysOnWeekdays: Holiday[];
  workdays5: number;
  workdays6: number;
};

/** 월별 근무일수 (주 5일·주 6일). */
export function monthlyWorkdays(year: number): MonthRow[] {
  const rows: MonthRow[] = [];
  for (let m = 1; m <= 12; m++) {
    const start = { y: year, m, d: 1 };
    const end = addDays({ y: m === 12 ? year + 1 : year, m: m === 12 ? 1 : m + 1, d: 1 }, -1);
    const five = countWorkdays(start, end);
    const six = countWorkdays(start, end, { saturdayWork: true, smallBiz: false });
    rows.push({
      m,
      calendarDays: five.calendarDays,
      weekend: five.weeklyRest,
      holidaysOnWeekdays: five.holidays.filter((h) => h.reducesWork).map((h) => h.holiday),
      workdays5: five.workdays,
      workdays6: six.workdays,
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 연휴 블록과 연차 붙이기
// ---------------------------------------------------------------------------

export type HolidayBlock = {
  start: YMD;
  end: YMD;
  /** Consecutive days off with no leave */
  length: number;
  holidays: Holiday[];
  /** e.g. "설 연휴", "노동절", "개천절" */
  name: string;
};

const BLOCK_LABEL: Partial<Record<HolidayCategory, string>> = {
  newyear: "신정",
  seollal: "설 연휴",
  chuseok: "추석 연휴",
  buddha: "부처님오신날",
  labor: "노동절",
  children: "어린이날",
  memorial: "현충일",
  christmas: "성탄절",
};

/** Short label for a holiday inside a block name (대체공휴일 → its original). */
export function holidayLabel(h: Holiday): string {
  if (h.category === "election") return h.name.replace("전국동시", "");
  if (h.category === "national" || h.category === "temporary") {
    if (h.substituteFor) return BY_DATE.get(h.substituteFor)?.[0]?.name ?? h.name;
    return h.name;
  }
  return BLOCK_LABEL[h.category] ?? h.name;
}

/** Name without the parenthetical: "기독탄신일 (성탄절)" → "성탄절", "신정 (1월 1일)" → "신정". */
export function plainName(h: Holiday): string {
  if (h.category === "christmas") return "성탄절";
  return h.name.replace(/\s*\(.*\)$/, "");
}

/** "성탄절", "광복절 대체공휴일", "설날 전날" — for sentences and compact cells. */
export function shortHolidayName(h: Holiday): string {
  if (h.substituteFor) {
    const orig = BY_DATE.get(h.substituteFor)?.find((o) => !o.substituteFor);
    return orig ? `${plainName(orig)} 대체공휴일` : h.name;
  }
  return plainName(h);
}

function blockName(list: Holiday[]): string {
  return [...new Set(list.map(holidayLabel))].join("·");
}

/** Maximal run of off days that contains `d` (d must be an off day). */
function runAround(d: YMD, rule: WorkRule): { start: YMD; end: YMD } {
  let s = d;
  let e = d;
  while (isOffDay(addDays(s, -1), rule)) s = addDays(s, -1);
  while (isOffDay(addDays(e, 1), rule)) e = addDays(e, 1);
  return { start: s, end: e };
}

/**
 * Runs of consecutive days off that contain at least one holiday of `year` (in date order).
 * A run may reach into the neighbouring year (e.g. 12월 31일 ~ 1월 2일).
 */
export function holidayBlocks(year: number, rule: WorkRule = DEFAULT_RULE): HolidayBlock[] {
  const blocks: HolidayBlock[] = [];
  for (const h of holidaysOf(year)) {
    const d = holidayYMD(h);
    if (!offHoliday(d, rule)) continue;
    const last = blocks[blocks.length - 1];
    if (last && compareYMD(d, last.end) <= 0) continue;
    const { start, end } = runAround(d, rule);
    const list: Holiday[] = [];
    for (let c = start; compareYMD(c, end) <= 0; c = addDays(c, 1)) {
      const oh = offHoliday(c, rule);
      if (oh) list.push(oh);
    }
    blocks.push({ start, end, length: diffDays(start, end) + 1, holidays: list, name: blockName(list) });
  }
  return blocks;
}

export type LeavePlan = {
  /** 연차 일수 */
  leave: number;
  start: YMD;
  end: YMD;
  /** Consecutive days off including the leave days */
  length: number;
  /** Ascending */
  leaveDates: YMD[];
  /**
   * The stretch reaches a year without holiday data, where only weekends count as days off
   * (an unknown holiday there may have been taken as a 연차 day).
   */
  uncovered: boolean;
};

/** Working days next to [start, end], nearest first, `count` of them, walking in `dir`. */
function workdaysFrom(from: YMD, dir: 1 | -1, count: number, rule: WorkRule): YMD[] {
  const out: YMD[] = [];
  let d = from;
  let guard = 0;
  while (out.length < count && guard++ < 400) {
    d = addDays(d, dir);
    if (isWorkday(d, rule)) out.push(d);
  }
  return out;
}

/**
 * Every longest stretch of days off that contains `block` and uses exactly `leave` working days as 연차.
 * Exact: taking i working days on the left and leave − i on the right, the stretch runs from the day after
 * the (i+1)-th working day on the left to the day before the (leave−i+1)-th working day on the right.
 * Ties (same length) are all returned: those inside the data years first, then earliest first.
 * With `notBefore`, every 연차 day must be on or after that date (e.g. tomorrow, so no plan asks for a
 * day that has already passed); returns [] when no combination qualifies.
 */
export function leaveOptions(block: HolidayBlock, leave: number, rule: WorkRule = DEFAULT_RULE, notBefore?: YMD): LeavePlan[] {
  const k = Math.max(0, Math.floor(leave));
  const left = workdaysFrom(block.start, -1, k + 1, rule);
  const right = workdaysFrom(block.end, 1, k + 1, rule);
  let best: LeavePlan[] = [];
  for (let i = 0; i <= k; i++) {
    const j = k - i;
    const leaveDates = [...left.slice(0, i).reverse(), ...right.slice(0, j)];
    if (notBefore && leaveDates.length && compareYMD(leaveDates[0], notBefore) < 0) continue;
    const start = addDays(left[i], 1);
    const end = addDays(right[j], -1);
    const length = diffDays(start, end) + 1;
    // Covered years are contiguous, so the stretch is inside them iff both ends are.
    const uncovered = !isCoveredYear(start.y) || !isCoveredYear(end.y);
    const plan: LeavePlan = { leave: k, start, end, length, leaveDates, uncovered };
    if (!best.length || length > best[0].length) best = [plan];
    else if (length === best[0].length) best.push(plan);
  }
  return best.sort((a, b) => Number(a.uncovered) - Number(b.uncovered) || compareYMD(a.start, b.start));
}

/** Best plan for each leave count 1..maxLeave (first of the tied options). */
export function leaveTable(block: HolidayBlock, maxLeave = 3, rule: WorkRule = DEFAULT_RULE): LeavePlan[] {
  const out: LeavePlan[] = [];
  for (let k = 1; k <= maxLeave; k++) out.push(leaveOptions(block, k, rule)[0]);
  return out;
}

/**
 * A plan must bring in more than this many free days (weekends, holidays) per 연차 day to be recommended.
 * 0.5 leaves out "take the whole week": 연차 4일 that only add the next weekend (2 days).
 */
export const MIN_TIP_SCORE = 0.5;

/** Largest 연차 count the static tip lists and tables look at. */
export const TIP_MAX_LEAVE = 4;

/**
 * 추천 plan: the most "free" days off per leave day — (length − block − leave) / leave —
 * ties go to the longer break. null when no plan scores above MIN_TIP_SCORE.
 */
export function recommendedPlan(block: HolidayBlock, maxLeave = 3, rule: WorkRule = DEFAULT_RULE): LeavePlan | null {
  let best: LeavePlan | null = null;
  let bestScore = 0;
  for (const p of leaveTable(block, maxLeave, rule)) {
    const score = (p.length - block.length - p.leave) / p.leave;
    if (score <= MIN_TIP_SCORE) continue;
    const better = !best || score > bestScore + 1e-9 || (Math.abs(score - bestScore) < 1e-9 && p.length > best.length);
    if (better) {
      best = p;
      bestScore = score;
    }
  }
  return best;
}

/** Blocks of every covered year, in date order, without duplicates across a year boundary. */
export function allBlocks(rule: WorkRule = DEFAULT_RULE): HolidayBlock[] {
  const out: HolidayBlock[] = [];
  for (const y of HOLIDAY_YEARS) {
    for (const b of holidayBlocks(y, rule)) {
      if (!out.some((o) => compareYMD(o.start, b.start) === 0)) out.push(b);
    }
  }
  return out;
}

/** Blocks that have not ended before `today`. */
export function upcomingBlocks(today: YMD, rule: WorkRule = DEFAULT_RULE): HolidayBlock[] {
  return allBlocks(rule).filter((b) => compareYMD(b.end, today) >= 0);
}

/**
 * A holiday swallowed by the weekly rest days: the block is just the weekend itself
 * (e.g. 일요일 현충일). Under 주 6일 a Saturday holiday is a real day off, so it is not "weekend only".
 */
export function isWeekendOnly(block: HolidayBlock, rule: WorkRule = DEFAULT_RULE): boolean {
  for (let c = block.start; compareYMD(c, block.end) <= 0; c = addDays(c, 1)) {
    if (!isWeeklyRest(c, rule)) return false;
  }
  return true;
}

export type LeaveRow = {
  blocks: HolidayBlock[];
  name: string;
  plan: LeavePlan;
  /** Other combinations giving the same length */
  alternatives: LeavePlan[];
};

/**
 * Best plan for `leave` days per block; neighbouring blocks whose best stretch is the same
 * (e.g. 노동절 and 어린이날 joined by one 연차) are merged into one row.
 * `notBefore` is passed to leaveOptions; blocks with no qualifying plan are left out.
 */
export function leaveRows(blocks: HolidayBlock[], leave: number, rule: WorkRule = DEFAULT_RULE, notBefore?: YMD): LeaveRow[] {
  const rows: LeaveRow[] = [];
  for (const b of blocks) {
    const options = leaveOptions(b, leave, rule, notBefore);
    if (!options.length) continue;
    const [plan, ...alternatives] = options;
    const last = rows[rows.length - 1];
    if (last && compareYMD(last.plan.start, plan.start) === 0 && compareYMD(last.plan.end, plan.end) === 0) {
      last.blocks.push(b);
      last.name = [...new Set([...last.name.split("·"), ...b.name.split("·")])].join("·");
      continue;
    }
    rows.push({ blocks: [b], name: b.name, plan, alternatives });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// 연차 꿀팁 for the static year pages
// ---------------------------------------------------------------------------

/** Holidays that give a day off inside a stretch, in date order. */
export function planHolidays(plan: { start: YMD; end: YMD }, rule: WorkRule = DEFAULT_RULE): Holiday[] {
  const out: Holiday[] = [];
  for (let c = plan.start; compareYMD(c, plan.end) <= 0; c = addDays(c, 1)) {
    const h = offHoliday(c, rule);
    if (h) out.push(h);
  }
  return out;
}

/** "성탄절·신정" — the holidays a stretch covers. */
export function planName(plan: { start: YMD; end: YMD }, rule: WorkRule = DEFAULT_RULE): string {
  return blockName(planHolidays(plan, rule));
}

/** 징검다리: a 연차 day sits between two holidays of the stretch, joining two 연휴 into one. */
export function isBridge(plan: LeavePlan, rule: WorkRule = DEFAULT_RULE): boolean {
  const hs = planHolidays(plan, rule);
  if (hs.length < 2) return false;
  const first = holidayYMD(hs[0]);
  const last = holidayYMD(hs[hs.length - 1]);
  return plan.leaveDates.some((d) => compareYMD(d, first) > 0 && compareYMD(d, last) < 0);
}

export type LeaveTip = {
  /** The year's 연휴 blocks this tip covers (neighbours whose recommended stretches overlap are merged) */
  blocks: HolidayBlock[];
  /** Block names joined, e.g. "노동절·어린이날" */
  name: string;
  /** Holidays covered by the recommended stretches, e.g. "성탄절·신정"; equals `name` when there is no plan */
  label: string;
  /** Longest block with no 연차 */
  base: number;
  /** Recommended plans with distinct stretches, fewest 연차 first (may be empty) */
  plans: LeavePlan[];
  /** Longest stretch for 1..maxLeave 연차 days over the tip's blocks (earliest on ties) */
  table: LeavePlan[];
};

const samePlan = (a: LeavePlan, b: LeavePlan) => compareYMD(a.start, b.start) === 0 && compareYMD(a.end, b.end) === 0 && a.leave === b.leave;

/**
 * One tip per 연휴 of `year` (weekend-only holidays left out). Neighbouring blocks whose recommended
 * stretches overlap — 노동절·어린이날, 개천절·한글날 — become one tip, so no stretch is listed twice.
 */
export function leaveTips(year: number, maxLeave = TIP_MAX_LEAVE, rule: WorkRule = DEFAULT_RULE): LeaveTip[] {
  const groups: { blocks: HolidayBlock[]; plans: LeavePlan[] }[] = [];
  const spanEnds: YMD[] = [];
  for (const b of holidayBlocks(year, rule)) {
    if (isWeekendOnly(b, rule)) continue;
    const rec = recommendedPlan(b, maxLeave, rule);
    const start = rec ? rec.start : b.start;
    const end = rec ? rec.end : b.end;
    const i = groups.length - 1;
    if (i >= 0 && compareYMD(start, spanEnds[i]) <= 0) {
      groups[i].blocks.push(b);
      if (rec && !groups[i].plans.some((p) => samePlan(p, rec))) groups[i].plans.push(rec);
      if (compareYMD(end, spanEnds[i]) > 0) spanEnds[i] = end;
      continue;
    }
    groups.push({ blocks: [b], plans: rec ? [rec] : [] });
    spanEnds.push(end);
  }
  return groups.map(({ blocks, plans }) => {
    const table: LeavePlan[] = [];
    for (let k = 1; k <= maxLeave; k++) {
      let best: LeavePlan | null = null;
      for (const b of blocks) {
        const p = leaveOptions(b, k, rule)[0];
        if (!best || p.length > best.length) best = p;
      }
      table.push(best!);
    }
    const name = [...new Set(blocks.flatMap((b) => b.name.split("·")))].join("·");
    const inPlans = new Map<string, Holiday>();
    for (const p of plans) for (const h of planHolidays(p, rule)) inPlans.set(h.date, h);
    const label = inPlans.size ? blockName([...inPlans.values()].sort((a, b) => a.date.localeCompare(b.date))) : name;
    return {
      blocks,
      name,
      label,
      base: Math.max(...blocks.map((b) => b.length)),
      plans: [...plans].sort((a, b) => a.leave - b.leave),
      table,
    };
  });
}

/** For each 연차 count 1..n, the longest stretch over all tips (earliest on ties). */
export function longestByLeave(tips: LeaveTip[]): { leave: number; tip: LeaveTip; plan: LeavePlan }[] {
  if (!tips.length) return [];
  const n = Math.min(...tips.map((t) => t.table.length));
  const out: { leave: number; tip: LeaveTip; plan: LeavePlan }[] = [];
  for (let k = 1; k <= n; k++) {
    let best: { leave: number; tip: LeaveTip; plan: LeavePlan } | null = null;
    for (const tip of tips) {
      const plan = tip.table[k - 1];
      if (!best || plan.length > best.plan.length) best = { leave: k, tip, plan };
    }
    if (best) out.push(best);
  }
  return out;
}

/** First holiday on or after `today` in the covered years. */
export function nextHoliday(today: YMD): { holiday: Holiday; date: YMD } | null {
  for (const y of HOLIDAY_YEARS) {
    for (const h of HOLIDAYS[y]) {
      const d = holidayYMD(h);
      if (compareYMD(d, today) >= 0) return { holiday: h, date: d };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Formatting helpers shared by the pages
// ---------------------------------------------------------------------------

/** "2월 6일" */
export function md(d: YMD): string {
  return `${d.m}월 ${d.d}일`;
}

/** "2월 6일(토)" */
export function mdw(d: YMD): string {
  return `${d.m}월 ${d.d}일(${weekdayKo(d)})`;
}

/** "2/6(토)" */
export function shortMdw(d: YMD): string {
  return `${d.m}/${d.d}(${weekdayKo(d)})`;
}

/** "2/10(수)·2/11(목)" */
export function leaveDatesLabel(dates: YMD[]): string {
  return dates.map(shortMdw).join("·");
}

/** "2월 6일 ~ 9일" or "1월 30일 ~ 2월 1일" or "2026년 12월 31일 ~ 2027년 1월 2일" */
export function rangeLabel(a: YMD, b: YMD): string {
  if (compareYMD(a, b) === 0) return md(a);
  if (a.y !== b.y) return `${a.y}년 ${md(a)} ~ ${b.y}년 ${md(b)}`;
  if (a.m === b.m) return `${md(a)} ~ ${b.d}일`;
  return `${md(a)} ~ ${md(b)}`;
}

/** Year pages that exist: /holidays/<year>/ */
export const HOLIDAY_PAGE_YEARS = HOLIDAY_YEARS;
