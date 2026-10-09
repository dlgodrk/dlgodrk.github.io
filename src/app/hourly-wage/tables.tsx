import Link from "next/link";
import { formatNumber } from "@/lib/format";
import {
  HOURLY_PAGE_HOURS,
  HOURLY_PAY_MONTH,
  HOURLY_WAGE_PAGES,
  hoursLabel,
  JUHYU_MIN_WEEKLY_HOURS,
  MIN_WAGE_2026,
  MIN_WAGE_2027,
  novemberNetIfDifferent,
  payForWeeklyHours,
  rateYearForWage,
  ruleMonthLabel,
  WAGE_TABLE,
} from "@/lib/calc/hourly-wage";
import { MINIMUM_WAGE } from "@/lib/rates/labor";
import { RULES_CHECKED_AT } from "@/lib/site";

/** "2026년 10월분" — the fixed month of the 2026 4대보험 rules on the static pages. */
export const STATIC_MONTH_LABEL = `${ruleMonthLabel(HOURLY_PAY_MONTH)}분`;

/** `basis` line shared by the main page and every /hourly-wage/ sub-page. */
export function hourlyBasis(): string {
  const [y, m, d] = RULES_CHECKED_AT.split("-").map(Number);
  return `2026년 최저시급 10,320원 · 2027년 10,700원 · 표의 실수령액은 ${STATIC_MONTH_LABEL} 4대보험 요율(2027년은 예상) · ${y}년 ${m}월 ${d}일 확인`;
}

/**
 * Note for static tables whose 4대보험 공제 후 figures (2026년 10월분) change by 10원 from 11월분
 * (장기요양 = 건강보험료 × 0.1314). Renders nothing when no row changes.
 */
export function NovemberNote({ rows }: { rows: { label: string; hours: number; wage: number }[] }) {
  const changed = rows.flatMap((r) => {
    const nov = novemberNetIfDifferent(r.hours, r.wage);
    if (nov === null) return [];
    const diff = nov - payForWeeklyHours(r.hours, r.wage).netInsured;
    return [`${r.label}의 4대보험 공제 후 금액은 ${formatNumber(nov)}원(${diff > 0 ? "+" : "−"}${formatNumber(Math.abs(diff))}원)`];
  });
  if (changed.length === 0) return null;
  return (
    <p className="note">
      2026년 11월분부터는 장기요양보험료를 건강보험료 × 0.1314로 계산하므로 {changed.join(", ")}입니다.
    </p>
  );
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
  // 2027 net pay (예상): 국민연금 5.0% (법정 인상), 건강보험 7.19% 동결, 장기요양·고용·간이세액표는 2026년 값 가정.
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
    ["4대보험·소득세 공제 후", `${formatNumber(a.netInsured)}원`, `${formatNumber(b.netInsured)}원 (예상)`],
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

/**
 * 시급별 주급·월급 for one weekly schedule. 4대보험 공제 후 uses the 2026년 10월분 rules, except the
 * 2027 최저시급 (10,700원) row, which uses the 2027 예상 so it matches YearCompareTable's 2027 column.
 */
export function WageTable({ hours }: { hours: number }) {
  return (
    <>
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
              const year = rateYearForWage(w);
              const p = payForWeeklyHours(hours, w, year);
              return (
                <tr key={w} className={w === MIN_WAGE_2026 ? "is-current" : undefined}>
                  <td>
                    {HOURLY_WAGE_PAGES.includes(w) ? (
                      <Link href={`/hourly-wage/wage/${w}/`}>{formatNumber(w)}원</Link>
                    ) : (
                      `${formatNumber(w)}원`
                    )}
                  </td>
                  <td>{formatNumber(p.weeklyTotal)}원</td>
                  <td>{formatNumber(p.monthlyGross)}원</td>
                  <td>{formatNumber(p.netFreelance)}원</td>
                  <td>
                    {formatNumber(p.netInsured)}원{year === 2027 ? " (2027 예상)" : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <NovemberNote
        rows={WAGE_TABLE.filter((w) => rateYearForWage(w) === 2026).map((w) => ({
          label: `시급 ${formatNumber(w)}원 행`,
          hours,
          wage: w,
        }))}
      />
    </>
  );
}

/** Grid of links to every /hourly-wage/wage/<won>/ page. */
export function WageLinkGrid({ current }: { current?: number }) {
  return (
    <nav aria-label="시급별 월급" className="link-grid">
      {HOURLY_WAGE_PAGES.map((w) => (
        <Link key={w} href={`/hourly-wage/wage/${w}/`} aria-current={w === current ? "page" : undefined}>
          시급 {formatNumber(w)}원 월급
        </Link>
      ))}
    </nav>
  );
}

/** 시급별 월급 hub table (주휴수당 포함, 세전) linking to each /hourly-wage/wage/<won>/ page. */
export function WageHubTable({ hours = [15, 20, 30, 40] }: { hours?: number[] }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">시급</th>
            {hours.map((h) => (
              <th key={h} scope="col">
                주 {h}시간
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {HOURLY_WAGE_PAGES.map((w) => (
            <tr key={w} className={w === MIN_WAGE_2026 ? "is-current" : undefined}>
              <td>
                <Link href={`/hourly-wage/wage/${w}/`}>{formatNumber(w)}원</Link>
              </td>
              {hours.map((h) => (
                <td key={h}>{formatNumber(payForWeeklyHours(h, w).monthlyGross)}원</td>
              ))}
            </tr>
          ))}
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
