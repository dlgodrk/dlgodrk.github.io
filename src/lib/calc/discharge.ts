/**
 * 전역일 계산 (현역병 전역일, 사회복무요원 소집해제일, 산업기능·전문연구요원 복무만료일).
 *
 * 복무기간 (2026년 기준, 병무청 「병역이행안내 개요」 https://www.mma.go.kr/contents.do?mc=usr0000041):
 *   육군·해병대 18개월, 해군 20개월, 공군 21개월, 상근예비역 18개월, 사회복무요원 21개월,
 *   산업기능요원 현역 편입 34개월·보충역 편입 23개월, 전문연구요원 36개월, 대체복무요원 36개월.
 *   육군·상근예비역은 2020.6.2. 입영자부터 21개월 → 18개월 (병무청 mma0000728, mma0000742).
 *   단축은 2018.10. 시행, 육군 2017.1.3. 입대자부터 2주에 1일꼴로 적용 (see shorteningDone).
 *   의무경찰·의무소방은 폐지되어 제외.
 *
 * 만료일 규칙: 입대(입영·소집·편입)일을 첫날로 세어, N개월 뒤 같은 날짜(대응일)의 전날.
 *   예) 2022-12-13 육군 입대 → 2024-06-12 전역.
 *   마지막 달에 대응일이 없으면(예: 8월 31일 입대 → 2월) 그 달 말일 (민법 제160조 제3항).
 *
 * 진급(현역병): 매월 1일 시행. 진급 최저복무기간 이병 2개월, 일병 6개월, 상병 6개월.
 *   5월 1일 입대 → 7월 1일 일병, 5월 2일 입대 → 8월 1일 일병 (하루라도 모자라면 다음 달 1일).
 *
 * No React, no Date.now(): "today" is always passed in.
 */
import {
  addDays,
  addMonths,
  compareYMD,
  daysInMonth,
  diffDays,
  parseYMD,
  weekdayKo,
  type YMD,
} from "@/lib/date";

export type ServiceKind = "soldier" | "social" | "industry" | "research" | "alternative";

export type ServiceId =
  | "army"
  | "marine"
  | "navy"
  | "air"
  | "reserve"
  | "social"
  | "ind-active"
  | "ind-reserve"
  | "research"
  | "alt";

export type ServiceType = {
  id: ServiceId;
  /** Display name, e.g. "육군" */
  name: string;
  /** 복무기간 (months) */
  months: number;
  kind: ServiceKind;
  /** Word for the start date: 입대일 / 소집일 / 편입일 */
  startLabel: string;
  /** Word for the end event: 전역 / 소집해제 / 복무만료 */
  endWord: string;
  /** 2-character seal text */
  stamp: string;
};

export const SERVICE_TYPES: ServiceType[] = [
  { id: "army", name: "육군", months: 18, kind: "soldier", startLabel: "입대일", endWord: "전역", stamp: "전역" },
  { id: "marine", name: "해병대", months: 18, kind: "soldier", startLabel: "입대일", endWord: "전역", stamp: "전역" },
  { id: "navy", name: "해군", months: 20, kind: "soldier", startLabel: "입대일", endWord: "전역", stamp: "전역" },
  { id: "air", name: "공군", months: 21, kind: "soldier", startLabel: "입대일", endWord: "전역", stamp: "전역" },
  { id: "reserve", name: "상근예비역", months: 18, kind: "soldier", startLabel: "입대일", endWord: "전역", stamp: "전역" },
  { id: "social", name: "사회복무요원", months: 21, kind: "social", startLabel: "소집일", endWord: "소집해제", stamp: "해제" },
  { id: "ind-active", name: "산업기능요원(현역)", months: 34, kind: "industry", startLabel: "편입일", endWord: "복무만료", stamp: "만료" },
  { id: "ind-reserve", name: "산업기능요원(보충역)", months: 23, kind: "industry", startLabel: "편입일", endWord: "복무만료", stamp: "만료" },
  { id: "research", name: "전문연구요원", months: 36, kind: "research", startLabel: "편입일", endWord: "복무만료", stamp: "만료" },
  { id: "alt", name: "대체복무요원", months: 36, kind: "alternative", startLabel: "소집일", endWord: "소집해제", stamp: "해제" },
];

export const DEFAULT_SERVICE_ID: ServiceId = "army";

export function getServiceType(id: string): ServiceType | null {
  return SERVICE_TYPES.find((t) => t.id === id) ?? null;
}

export function serviceTypeOf(id: ServiceId): ServiceType {
  return SERVICE_TYPES.find((t) => t.id === id)!;
}

/**
 * Last day of a service period that starts on `start` (counted as day 1) and lasts `months`.
 * = the day before the same date `months` later; if that month has no such date, the month's last day.
 */
export function serviceEndDate(start: YMD, months: number): YMD {
  const target = addMonths(start, months); // clamps the day to the month's length
  return target.d === start.d ? addDays(target, -1) : target;
}

export function dischargeDate(start: YMD, id: ServiceId): YMD {
  return serviceEndDate(start, serviceTypeOf(id).months);
}

/** Total days served, counting both the first and the last day. */
export function totalServiceDays(start: YMD, end: YMD): number {
  return diffDays(start, end) + 1;
}

export type ServiceStatus = "before" | "serving" | "done";

export type ServiceProgress = {
  status: ServiceStatus;
  totalDays: number;
  /** Days served up to and including `today` (0 before the start, totalDays after the end). */
  servedDays: number;
  /** Days left after `today` until the end date (0 on the end date and after). */
  remainingDays: number;
  /** servedDays / totalDays, 0..1 */
  ratio: number;
  /** Days from today to the start date (only meaningful when status = "before"). */
  daysUntilStart: number;
  /** Days since the end date (only meaningful when status = "done"). */
  daysSinceEnd: number;
};

export function serviceProgress(start: YMD, end: YMD, today: YMD): ServiceProgress {
  const totalDays = totalServiceDays(start, end);
  if (compareYMD(today, start) < 0) {
    return {
      status: "before",
      totalDays,
      servedDays: 0,
      remainingDays: totalDays,
      ratio: 0,
      daysUntilStart: diffDays(today, start),
      daysSinceEnd: 0,
    };
  }
  if (compareYMD(today, end) > 0) {
    return {
      status: "done",
      totalDays,
      servedDays: totalDays,
      remainingDays: 0,
      ratio: 1,
      daysUntilStart: 0,
      daysSinceEnd: diffDays(end, today),
    };
  }
  const servedDays = diffDays(start, today) + 1;
  return {
    status: "serving",
    totalDays,
    servedDays,
    remainingDays: diffDays(today, end),
    ratio: servedDays / totalDays,
    daysUntilStart: 0,
    daysSinceEnd: 0,
  };
}

/* ---------- 현역병 진급 ---------- */

export type Rank = "이병" | "일병" | "상병" | "병장";
export const RANKS: Rank[] = ["이병", "일병", "상병", "병장"];

/** 진급 최저복무기간 (months spent in the previous rank). */
export const PROMOTION_MONTHS = { 일병: 2, 상병: 6, 병장: 6 } as const;

/** The first 1st-of-month on or after `v`. */
export function firstOfMonthOnOrAfter(v: YMD): YMD {
  return v.d === 1 ? v : addMonths({ y: v.y, m: v.m, d: 1 }, 1);
}

export type PromotionDates = { 일병: YMD; 상병: YMD; 병장: YMD };

/**
 * Normal promotion dates (no 누락, no 조기진급). Promotions happen on the 1st of a month once the
 * minimum time in rank is complete: 이병 needs 2 full months from the enlistment date.
 */
export function promotionDates(start: YMD): PromotionDates {
  const pfc = firstOfMonthOnOrAfter(addMonths(start, PROMOTION_MONTHS.일병));
  const cpl = addMonths(pfc, PROMOTION_MONTHS.상병);
  const sgt = addMonths(cpl, PROMOTION_MONTHS.병장);
  return { 일병: pfc, 상병: cpl, 병장: sgt };
}

/** Rank on `date` under normal promotion, or null before enlistment. */
export function rankOn(start: YMD, date: YMD): Rank | null {
  if (compareYMD(date, start) < 0) return null;
  const p = promotionDates(start);
  if (compareYMD(date, p.병장) >= 0) return "병장";
  if (compareYMD(date, p.상병) >= 0) return "상병";
  if (compareYMD(date, p.일병) >= 0) return "일병";
  return "이병";
}

/** Whole months spent as 병장 before discharge (rounded down), for copy like "병장 3개월". */
export function sergeantMonths(start: YMD, months: number): number {
  const end = serviceEndDate(start, months);
  const sgt = promotionDates(start).병장;
  let n = 0;
  while (compareYMD(addMonths(sgt, n + 1), addDays(end, 1)) <= 0) n++;
  return n;
}

/* ---------- 2026년 병 봉급 ---------- */

/** 2026년 병 봉급 (월, 원). 공무원보수규정 별표 13 비고, 2025년과 같은 금액(동결). */
export const SOLDIER_PAY_2026: Record<Rank, number> = {
  이병: 750_000,
  일병: 900_000,
  상병: 1_200_000,
  병장: 1_500_000,
};

/** 장병내일준비적금: 월 납입 비과세 한도(모든 금융회사 합산, 조세특례제한법 제91조의19). */
export const SAVINGS_MONTHLY_CAP = 550_000;
/** 정부 재정지원금 = 만기 시 납입원금의 100% (병역법 시행령 제158조의2). */
export const SAVINGS_MATCH_RATE = 1;

/* ---------- programmatic pages: /discharge/<yyyy-mm>/ ---------- */

export const PAGE_FIRST_MONTH = { y: 2024, m: 6 };
export const PAGE_LAST_MONTH = { y: 2027, m: 12 };

export function monthSlug(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, "0")}`;
}

function buildMonths(): string[] {
  const out: string[] = [];
  let y = PAGE_FIRST_MONTH.y;
  let m = PAGE_FIRST_MONTH.m;
  while (y < PAGE_LAST_MONTH.y || (y === PAGE_LAST_MONTH.y && m <= PAGE_LAST_MONTH.m)) {
    out.push(monthSlug(y, m));
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

/** Enlistment months that get their own page, oldest first: "2024-06" … "2027-12". */
export const DISCHARGE_PAGE_MONTHS: string[] = buildMonths();

export function parseMonthSlug(slug: string): { y: number; m: number } | null {
  if (!DISCHARGE_PAGE_MONTHS.includes(slug)) return null;
  const [y, m] = slug.split("-").map(Number);
  return { y, m };
}

/** Every Monday in a month. */
export function mondaysOf(y: number, m: number): YMD[] {
  const out: YMD[] = [];
  for (let d = 1; d <= daysInMonth(y, m); d++) {
    const v = { y, m, d };
    if (weekdayKo(v) === "월") out.push(v);
  }
  return out;
}

/** Example enlistment date for a month page: the first Monday on or after the 2nd. */
export function sampleEntryDate(y: number, m: number): YMD {
  return mondaysOf(y, m).find((v) => v.d >= 2)!;
}

/** Month in which people who enlist on the 2nd or later of (y, m) finish `months` of service. */
export function typicalEndMonth(y: number, m: number, months: number): { y: number; m: number } {
  const e = serviceEndDate({ y, m, d: 2 }, months);
  return { y: e.y, m: e.m };
}

/** "2026.12.01 (화)" — compact date for tables. */
export function formatDotDate(v: YMD, withWeekday = true): string {
  const s = `${v.y}.${String(v.m).padStart(2, "0")}.${String(v.d).padStart(2, "0")}`;
  return withWeekday ? `${s} (${weekdayKo(v)})` : s;
}

export type ShorteningDone = {
  /** First start date that surely gets today's full term. */
  from: YMD;
  /** true = the date is the official one; false = a conservative cut-off (exact date not confirmed). */
  exact: boolean;
};

/**
 * When the 2018 국방개혁 2.0 shortening (2017.1.3. 입대자부터 2주에 1일꼴로 단축, 2018.10. 시행) was
 * complete for a service type, or null when that type's term did not change.
 *   육군·상근예비역: "'20.6.2. 입영자부터 21개월 → 18개월로 단축" (병무청 mma0000728, mma0000742).
 *   해병대: 육군과 같이 2020.6.2. 입대자부터 18개월 (나무위키 「현역병」·「복무단축」).
 *   해군·공군·사회복무요원·보충역 산업기능요원: 완료 시점을 공식 자료로 확인하지 못해 보수적으로 2022.1.1.
 *   현역 산업기능요원(34개월)·전문연구요원(3년)·대체복무요원(2020.10. 시행, 36개월): 단축 없음.
 */
export function shorteningDone(id: ServiceId): ShorteningDone | null {
  switch (id) {
    case "army":
    case "marine":
    case "reserve":
      return { from: { y: 2020, m: 6, d: 2 }, exact: true };
    case "navy":
    case "air":
    case "social":
    case "ind-reserve":
      return { from: { y: 2022, m: 1, d: 1 }, exact: false };
    default:
      return null;
  }
}

/** True when `start` falls before the shortening was complete for this service type. */
export function isBeforeShorteningDone(start: YMD, id: ServiceId): boolean {
  const done = shorteningDone(id);
  return done !== null && ymdKey(start) < ymdKey(done.from);
}

/**
 * 20261009-style number for ordering. Used instead of compareYMD where years below 100 may appear,
 * because the shared helpers use Date.UTC, which maps years 0–99 to 1900–1999.
 */
function ymdKey(v: YMD): number {
  return v.y * 10_000 + v.m * 100 + v.d;
}

/* ---------- input range ---------- */

/** Start dates the calculator accepts (same bounds as the date input's min/max). */
export const START_MIN = "2000-01-01";
export const START_MAX = "2040-12-31";

/** True when `v` is within START_MIN..START_MAX (inclusive). */
export function isStartInRange(v: YMD): boolean {
  const k = ymdKey(v);
  return k >= ymdKey(parseYMD(START_MIN)!) && k <= ymdKey(parseYMD(START_MAX)!);
}
