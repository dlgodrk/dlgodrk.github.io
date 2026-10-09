import Link from "next/link";
import { formatNumber } from "@/lib/format";
import {
  HOURLY_PAGE_HOURS,
  hoursLabel,
  JUHYU_MIN_WEEKLY_HOURS,
  MIN_WAGE_2026,
  MIN_WAGE_2027,
  payForWeeklyHours,
  WAGE_TABLE,
} from "@/lib/calc/hourly-wage";
import { MINIMUM_WAGE } from "@/lib/rates/labor";
import { RULES_CHECKED_AT } from "@/lib/site";

/** `basis` line shared by the main page and every /hourly-wage/<hours>/ page. */
export function hourlyBasis(): string {
  const [y, m, d] = RULES_CHECKED_AT.split("-").map(Number);
  return `2026년 최저시급 10,320원 · 2027년 10,700원 · 4대보험 2026년 요율 · ${y}년 ${m}월 ${d}일 확인`;
}

/** 연도별 최저임금 and its 일급·주급·월급 conversions. */
export function MinimumWageYearTable() {
  const years = [2025, 2026, 2027];
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">연도</th>
            <th scope="col">시급</th>
            <th scope="col">일급 (8시간)</th>
            <th scope="col">주급 (40시간+주휴)</th>
            <th scope="col">월급 (209시간)</th>
          </tr>
        </thead>
        <tbody>
          {years.map((y) => {
            const w = MINIMUM_WAGE[y];
            const p = payForWeeklyHours(40, w);
            return (
              <tr key={y} className={y === 2026 ? "is-current" : undefined}>
                <td>{y}년</td>
                <td>{formatNumber(w)}원</td>
                <td>{formatNumber(w * 8)}원</td>
                <td>{formatNumber(p.weeklyTotal)}원</td>
                <td>{formatNumber(p.monthlyGross)}원</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** 주 근무시간별 주휴수당·월급 at the 2026 and 2027 minimum wage. */
export function WeeklyHoursTable({ hours = HOURLY_PAGE_HOURS, current }: { hours?: number[]; current?: number }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">주 근무시간</th>
            <th scope="col">주휴수당 (주)</th>
            <th scope="col">월 환산 시간</th>
            <th scope="col">2026 월급</th>
            <th scope="col">2027 월급</th>
          </tr>
        </thead>
        <tbody>
          {hours.map((h) => {
            const a = payForWeeklyHours(h, MIN_WAGE_2026);
            const b = payForWeeklyHours(h, MIN_WAGE_2027);
            return (
              <tr key={h} className={h === current ? "is-current" : undefined}>
                <td>{h === current ? `주 ${h}시간` : <Link href={`/hourly-wage/${h}/`}>주 {h}시간</Link>}</td>
                <td>{h < JUHYU_MIN_WEEKLY_HOURS ? "없음" : `${formatNumber(a.juhyuPay)}원`}</td>
                <td>{hoursLabel(a.monthlyHours)}시간</td>
                <td>{formatNumber(a.monthlyGross)}원</td>
                <td>{formatNumber(b.monthlyGross)}원</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** 2026 vs 2027 최저시급 breakdown for one weekly schedule. */
export function YearCompareTable({ hours }: { hours: number }) {
  const a = payForWeeklyHours(hours, MIN_WAGE_2026);
  // 2027 net pay: 국민연금 5.0% (법정 인상), other 4대보험 rates and 간이세액표 assumed at 2026 values.
  const b = payForWeeklyHours(hours, MIN_WAGE_2027, 2027);
  const rows: [string, string, string][] = [
    ["주급(기본)", `${formatNumber(a.weeklyBase)}원`, `${formatNumber(b.weeklyBase)}원`],
    [
      "주휴수당",
      a.juhyuPay ? `${formatNumber(a.juhyuPay)}원 (${hoursLabel(a.juhyuHours)}시간분)` : "없음",
      b.juhyuPay ? `${formatNumber(b.juhyuPay)}원` : "없음",
    ],
    ["주급 합계", `${formatNumber(a.weeklyTotal)}원`, `${formatNumber(b.weeklyTotal)}원`],
    ["월 환산 시간", `${hoursLabel(a.monthlyHours)}시간`, `${hoursLabel(b.monthlyHours)}시간`],
    ["월급 (세전)", `${formatNumber(a.monthlyGross)}원`, `${formatNumber(b.monthlyGross)}원`],
    ["3.3% 공제 후", `${formatNumber(a.netFreelance)}원`, `${formatNumber(b.netFreelance)}원`],
    ["4대보험·소득세 공제 후", `${formatNumber(a.netInsured)}원`, `${formatNumber(b.netInsured)}원`],
  ];
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">주 {hours}시간</th>
            <th scope="col">2026년 (10,320원)</th>
            <th scope="col">2027년 (10,700원)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, x, y]) => (
            <tr key={label}>
              <td>{label}</td>
              <td>{x}</td>
              <td>{y}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 시급별 주급·월급 for one weekly schedule. */
export function WageTable({ hours }: { hours: number }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">시급</th>
            <th scope="col">주급 합계</th>
            <th scope="col">월급 (세전)</th>
            <th scope="col">3.3% 공제 후</th>
            <th scope="col">4대보험 공제 후</th>
          </tr>
        </thead>
        <tbody>
          {WAGE_TABLE.map((w) => {
            const p = payForWeeklyHours(hours, w);
            return (
              <tr key={w} className={w === MIN_WAGE_2026 ? "is-current" : undefined}>
                <td>{formatNumber(w)}원</td>
                <td>{formatNumber(p.weeklyTotal)}원</td>
                <td>{formatNumber(p.monthlyGross)}원</td>
                <td>{formatNumber(p.netFreelance)}원</td>
                <td>{formatNumber(p.netInsured)}원</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Grid of links to every /hourly-wage/<hours>/ page. */
export function HoursLinkGrid({ current }: { current?: number }) {
  return (
    <nav aria-label="주 근무시간별 알바 월급" className="link-grid">
      {HOURLY_PAGE_HOURS.map((h) => (
        <Link key={h} href={`/hourly-wage/${h}/`} aria-current={h === current ? "page" : undefined}>
          주 {h}시간 월급
        </Link>
      ))}
    </nav>
  );
}
