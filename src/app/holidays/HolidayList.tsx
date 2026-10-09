"use client";

import { addDays, compareYMD, diffDays, formatKoreanDate, weekdayKo } from "@/lib/date";
import { dayOfWeek, holidaysOf, holidayYMD, md, nextHoliday, shortHolidayName, yearSummary } from "@/lib/calc/holidays";
import { useToday } from "@/lib/useToday";

/**
 * A year's holidays as a table. Today-dependent marks (지남, 오늘, D-n) come from useToday,
 * so the prerendered HTML uses the build date and the visitor's real date takes over after mount.
 */
export function HolidayList({ year }: { year: number }) {
  const { today } = useToday();
  const list = holidaysOf(year);
  const sum = yearSummary(year);
  const upcoming = nextHoliday(addDays(today, 1));
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>
          {year}년 공휴일 {sum.designated}일 (대체공휴일 {sum.substitutes}일 포함, 평일 {sum.onWeekdays}일)
        </caption>
        <thead>
          <tr>
            <th scope="col">날짜</th>
            <th scope="col" className="text-cell">
              공휴일 · 비고
            </th>
          </tr>
        </thead>
        <tbody>
          {list.map((h) => {
            const d = holidayYMD(h);
            const w = dayOfWeek(d);
            const c = compareYMD(d, today);
            const isNext = upcoming !== null && compareYMD(upcoming.date, d) === 0;
            const marks: string[] = [];
            if (h.substituteFor) marks.push("대체공휴일");
            else if (w === 6) marks.push("토요일과 겹침");
            else if (w === 0) marks.push("일요일과 겹침");
            if (c === 0) marks.push("오늘");
            else if (isNext) marks.push(`D-${diffDays(today, d)}`);
            else if (c < 0) marks.push("지남");
            return (
              <tr key={h.date} className={c === 0 || isNext ? "is-current" : c < 0 ? "text-muted" : undefined}>
                <td>
                  {md(d)} ({weekdayKo(d)})
                </td>
                <td className="text-cell">
                  {h.name}
                  {marks.length ? <span className="block text-sm text-muted">{marks.join(" · ")}</span> : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** "다음 공휴일은 12월 25일(금) 성탄절이고, 77일 남았어요." */
export function NextHolidayNote() {
  const { today, isLive } = useToday();
  const when = isLive ? "오늘" : formatKoreanDate(today);
  const now = nextHoliday(today);
  const isToday = now !== null && compareYMD(now.date, today) === 0;
  const next = isToday ? nextHoliday(addDays(today, 1)) : now;
  return (
    <p>
      {isToday && now ? (
        <strong>
          {when}은 {shortHolidayName(now.holiday)}이에요.{" "}
        </strong>
      ) : null}
      {next
        ? `${isLive || isToday ? "" : `${when} 기준, `}다음 공휴일은 ${next.date.y !== today.y ? `${next.date.y}년 ` : ""}${md(next.date)}(${weekdayKo(next.date)}) ${shortHolidayName(next.holiday)}이고, ${diffDays(today, next.date)}일 남았어요.`
        : `${when} 이후 공휴일은 다음 해 월력요항이 나오면 추가해요.`}
    </p>
  );
}
