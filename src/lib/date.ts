/**
 * Timezone-safe calendar-date helpers. Dates are plain {y,m,d} values handled in UTC
 * so results never shift by a day because of the viewer's timezone.
 * Month is 1-12.
 */
export type YMD = { y: number; m: number; d: number };

const DAY_MS = 86_400_000;
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function ymd(y: number, m: number, d: number): YMD {
  return { y, m, d };
}

/** "2026-10-09" -> YMD (null if invalid) */
export function parseYMD(s: string | null | undefined): YMD | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s.trim());
  if (!m) return null;
  const v = { y: +m[1], m: +m[2], d: +m[3] };
  return isValidYMD(v) ? v : null;
}

export function isValidYMD(v: YMD): boolean {
  if (!Number.isInteger(v.y) || !Number.isInteger(v.m) || !Number.isInteger(v.d)) return false;
  if (v.m < 1 || v.m > 12 || v.d < 1) return false;
  return v.d <= daysInMonth(v.y, v.m);
}

export function toUTC(v: YMD): number {
  // Date.UTC maps years 0–99 to 1900–1999; setUTCFullYear does not.
  const dt = new Date(0);
  dt.setUTCFullYear(v.y, v.m - 1, v.d);
  dt.setUTCHours(0, 0, 0, 0);
  return dt.getTime();
}

export function fromUTC(ms: number): YMD {
  const dt = new Date(ms);
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1, d: dt.getUTCDate() };
}

/** "2026-10-09" */
export function formatYMD(v: YMD): string {
  return `${v.y}-${String(v.m).padStart(2, "0")}-${String(v.d).padStart(2, "0")}`;
}

/** "2026년 10월 9일 (금)" */
export function formatKoreanDate(v: YMD, withWeekday = true): string {
  const base = `${v.y}년 ${v.m}월 ${v.d}일`;
  return withWeekday ? `${base} (${weekdayKo(v)})` : base;
}

export function weekdayKo(v: YMD): string {
  return WEEKDAYS[new Date(toUTC(v)).getUTCDay()];
}

export function daysInMonth(y: number, m: number): number {
  return [31, isLeapYear(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
}

export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

export function addDays(v: YMD, days: number): YMD {
  return fromUTC(toUTC(v) + days * DAY_MS);
}

/**
 * Add calendar months. If the target month is shorter, the day is clamped
 * to the month's last day (e.g. Jan 31 + 1 month -> Feb 28/29).
 */
export function addMonths(v: YMD, months: number): YMD {
  const total = v.y * 12 + (v.m - 1) + months;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  return { y, m, d: Math.min(v.d, daysInMonth(y, m)) };
}

/** Whole days from a to b (b - a). Same day -> 0. */
export function diffDays(a: YMD, b: YMD): number {
  return Math.round((toUTC(b) - toUTC(a)) / DAY_MS);
}

export function compareYMD(a: YMD, b: YMD): number {
  return toUTC(a) - toUTC(b);
}

/** Today's date in Korea (UTC+9), regardless of the viewer's timezone. */
export function todayKST(now: Date = new Date()): YMD {
  return fromUTC(now.getTime() + 9 * 3_600_000 - ((now.getTime() + 9 * 3_600_000) % DAY_MS));
}
