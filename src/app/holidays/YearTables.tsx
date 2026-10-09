import { Fragment } from "react";
import { formatYMD, type YMD } from "@/lib/date";
import { formatNumber } from "@/lib/format";
import {
  FIRST_YEAR,
  holidayBlocks,
  holidayLabel,
  LAST_YEAR,
  isWeekendOnly,
  leaveDatesLabel,
  leaveTips,
  longestByLeave,
  mdw,
  monthlyWorkdays,
  shortHolidayName,
  yearSummary,
  type HolidayBlock,
  type MonthRow,
} from "@/lib/calc/holidays";

/** Months tied for the fewest / most 주 5일 workdays: { months: "3·4·6월", days: 22 } */
export function extremeMonths(rows: MonthRow[], pick: "min" | "max"): { months: string; days: number } {
  const days = pick === "min" ? Math.min(...rows.map((r) => r.workdays5)) : Math.max(...rows.map((r) => r.workdays5));
  return { months: `${rows.filter((r) => r.workdays5 === days).map((r) => r.m).join("·")}월`, days };
}

/** "2월 6일(토) ~ 9일(화)" with weekdays on both ends. */
export function blockRange(b: { start: YMD; end: YMD }): string {
  const { start: a, end: z } = b;
  if (a.y === z.y && a.m === z.m && a.d === z.d) return mdw(a);
  const endText = a.y !== z.y ? `${z.y}년 ${mdw(z)}` : a.m === z.m ? mdw(z).replace(`${z.m}월 `, "") : mdw(z);
  return `${a.y !== z.y ? `${a.y}년 ` : ""}${mdw(a)} ~ ${endText}`;
}

/** "5/1~5/3" (or "5/5" for one day) — compact, for table cells. */
function shortRange(a: YMD, z: YMD): string {
  const one = (d: YMD) => `${d.m}/${d.d}`;
  return a.y === z.y && a.m === z.m && a.d === z.d ? one(a) : `${one(a)}~${one(z)}`;
}

/** Blocks worth listing: drop holidays fully swallowed by a weekend (e.g. 일요일 현충일). */
export function listedBlocks(year: number): HolidayBlock[] {
  return holidayBlocks(year).filter((b) => !isWeekendOnly(b));
}

export function YearStats({ year }: { year: number }) {
  const s = yearSummary(year);
  const rows: [string, string][] = [
    ["관공서 공휴일 (월력요항 방식: 일요일 + 공휴일 지정일)", `${s.officialDays}일`],
    ["실질 공휴일 (일요일과 겹친 날은 한 번만)", `${s.realDays}일`],
    ["공휴일 지정일 (일반 일요일 제외)", `${s.designated}일 (대체공휴일 ${s.substitutes}일 포함)`],
    ["평일(월~금) 공휴일", `${s.onWeekdays}일`],
    ["토요일과 겹친 공휴일", `${s.onSaturday}일`],
    ["일요일과 겹친 공휴일", `${s.onSunday}일`],
    ["주 5일 근무자 휴일 (토·일 + 평일 공휴일)", `${s.restDays5}일`],
    ["연간 근무일수 (주 5일)", `${s.workdays5}일`],
    ["연간 근무일수 (주 6일)", `${s.workdays6}일`],
  ];
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>
          {year}년 {s.daysInYear}일 기준 (일요일 {s.sundays}일, 토요일 {s.saturdays}일)
        </caption>
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k}>
              <th scope="row" className="text-cell">
                {k}
              </th>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 3일 이상 이어지는 연휴 목록 (연차 없이). */
export function GoldenList({ year }: { year: number }) {
  const blocks = holidayBlocks(year).filter((b) => b.length >= 3);
  return (
    <ul>
      {blocks.map((b) => (
        <li key={`${b.start.m}-${b.start.d}`}>
          <strong>{blockRange(b)}</strong>, {b.length}일: {b.name}
        </li>
      ))}
    </ul>
  );
}

/**
 * 연휴별로 연차 0~4일을 붙였을 때의 최장 일수. Neighbouring 연휴 joined by the same recommended stretch
 * share one row; the footer row holds the longest stretch for each 연차 count.
 */
export function LeaveTipsTable({ year }: { year: number }) {
  const tips = leaveTips(year);
  const maxima = longestByLeave(tips);
  const longestBase = Math.max(...tips.map((t) => t.base));
  const anyUncovered = tips.some((t) => t.table.some((p) => p.uncovered));
  return (
    <>
      <div className="table-wrap">
        <table className="data-table">
          <caption>
            연휴에 연차를 붙였을 때 이어서 쉬는 최장 일수 (주 5일 기준). 열 제목은 붙인 연차 일수이고, 굵은 글씨는 추천 조합입니다.
          </caption>
          <thead>
            <tr>
              <th scope="col">연휴</th>
              <th scope="col">
                <span className="sr-only">연차 </span>0일
              </th>
              {maxima.map((m) => (
                <th key={m.leave} scope="col">
                  <span className="sr-only">연차 </span>
                  {m.leave}일
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tips.map((t) => (
              <tr key={formatYMD(t.blocks[0].start)}>
                <th scope="row">
                  {t.name}
                  <span className="block text-sm text-muted">{t.blocks.map((b) => shortRange(b.start, b.end)).join(", ")}</span>
                </th>
                <td>{t.base}일</td>
                {t.table.map((p) => {
                  const cell = `${p.length}일${p.uncovered ? "*" : ""}`;
                  const rec = t.plans.some((x) => x.leave === p.leave && x.length === p.length);
                  return (
                    <td key={p.leave}>
                      {rec ? (
                        <strong>
                          {cell}
                          <span className="sr-only"> (추천)</span>
                        </strong>
                      ) : (
                        cell
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">가장 긴 연휴</th>
              <td>{longestBase}일</td>
              {maxima.map((m) => (
                <td key={m.leave}>{m.plan.length}일</td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      {anyUncovered ? (
        <p className="note">
          * {FIRST_YEAR}~{LAST_YEAR}년 밖의 날이 들어간 조합입니다. 그 해는 공휴일 자료가 없어 주말만 쉬는 날로 셌습니다.
        </p>
      ) : null}
    </>
  );
}

/** One line per 연휴 with its recommended 연차 dates; 연휴 joined by the same stretch share a line. */
export function LeaveTipList({ year }: { year: number }) {
  const tips = leaveTips(year).filter((t) => t.plans.length > 0);
  return (
    <ul>
      {tips.map((t) => (
        <li key={formatYMD(t.blocks[0].start)}>
          <strong>{t.label}</strong>:{" "}
          {t.plans.map((p, i) => (
            <Fragment key={`${p.leave}-${formatYMD(p.start)}`}>
              {i > 0 ? ", " : ""}
              {leaveDatesLabel(p.leaveDates)}에 연차 {p.leave}일을 쓰면 {blockRange(p)}까지 <strong>{p.length}일</strong>
            </Fragment>
          ))}{" "}
          연휴{t.plans.some((p) => p.uncovered) ? ` (${FIRST_YEAR}~${LAST_YEAR}년 밖의 날은 주말만 쉬는 날로 셈)` : ""}
        </li>
      ))}
    </ul>
  );
}

export function MonthlyTable({ year }: { year: number }) {
  const rows = monthlyWorkdays(year);
  const total = rows.reduce(
    (a, r) => ({
      cal: a.cal + r.calendarDays,
      wk: a.wk + r.weekend,
      hol: a.hol + r.holidaysOnWeekdays.length,
      w5: a.w5 + r.workdays5,
      w6: a.w6 + r.workdays6,
    }),
    { cal: 0, wk: 0, hol: 0, w5: 0, w6: 0 },
  );
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>주 5일은 토·일요일과 공휴일을, 주 6일은 일요일과 공휴일을 뺀 근무일수</caption>
        <thead>
          <tr>
            <th scope="col">월</th>
            <th scope="col">주 5일</th>
            <th scope="col">주 6일</th>
            <th scope="col" className="text-cell">
              평일 공휴일
            </th>
            <th scope="col">달력일 (토·일)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.m}>
              <th scope="row">{r.m}월</th>
              <td>
                <strong>{r.workdays5}일</strong>
              </td>
              <td>{r.workdays6}일</td>
              <td className="text-cell">
                {r.holidaysOnWeekdays.length
                  ? `${r.holidaysOnWeekdays.length}일 (${[...new Set(r.holidaysOnWeekdays.map((h) => (h.substituteFor ? shortHolidayName(h) : holidayLabel(h))))].join(", ")})`
                  : "0일"}
              </td>
              <td>
                {r.calendarDays} ({r.weekend})
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">합계</th>
            <td>{total.w5}일</td>
            <td>{total.w6}일</td>
            <td className="text-cell">{total.hol}일</td>
            <td>
              {formatNumber(total.cal)} ({total.wk})
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
