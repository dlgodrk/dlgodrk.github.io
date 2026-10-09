import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber, koreanWon } from "@/lib/format";
import { SALARY_PAGE_MANWON } from "@/lib/calc/salary";
import { nearestSalaryManwon } from "@/lib/calc/minimum-wage";
import {
  exactHoursLabel,
  freelanceTax,
  HOURLY_PAGE_HOURS,
  HOURLY_WAGE_PAGES,
  hoursLabel,
  MIN_WAGE_2026,
  MIN_WAGE_2027,
  payForWeeklyHours,
  probationWage,
  RATE_2027_NOTE,
  shownHoursAreExact,
  WAGE_PAGE_HOURS,
} from "@/lib/calc/hourly-wage";
import { HourlyWageCalculator } from "../../HourlyWageCalculator";
import { hourlyBasis, NovemberNote, STATIC_MONTH_LABEL, WageLinkGrid } from "../../tables";

// Only the listed wages exist; anything else is a 404 (required for static export).
// This static `wage` segment sits next to the [hours] route: Next.js matches static segments first,
// and [hours] (dynamicParams = false) only generates numeric weekly hours, so the routes never clash.
export const dynamicParams = false;

export function generateStaticParams() {
  return HOURLY_WAGE_PAGES.map((w) => ({ won: String(w) }));
}

type Props = { params: Promise<{ won: string }> };

function parse(raw: string): number | null {
  const n = Number(raw);
  return HOURLY_WAGE_PAGES.includes(n) ? n : null;
}

/** "2026 최저시급" / "2027 최저시급" for the two legal minimums, else null. */
function minimumTag(wage: number): string | null {
  if (wage === MIN_WAGE_2026) return "2026 최저시급";
  if (wage === MIN_WAGE_2027) return "2027 최저시급";
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const w = parse((await params).won);
  if (w === null) return {};
  const p40 = payForWeeklyHours(40, w);
  const W = formatNumber(w);
  const tag = minimumTag(w);
  return pageMetadata({
    title: tag
      ? `시급 ${W}원 월급 - ${tag} 주 40시간 ${formatNumber(p40.monthlyGross)}원`
      : `시급 ${W}원 월급·주급 - 주 40시간 ${formatNumber(p40.monthlyGross)}원`,
    description: `시급 ${W}원으로 주 40시간 일하면 주휴수당 ${formatNumber(p40.juhyuPay)}원을 포함해 주급 ${formatNumber(p40.weeklyTotal)}원, 월급 ${formatNumber(p40.monthlyGross)}원(209시간)입니다. 주 15·20·30시간 월급과 3.3%·4대보험 공제 후 실수령액도 정리했습니다.`,
    path: `/hourly-wage/wage/${w}/`,
    keywords: [`시급 ${w} 월급`, `시급 ${W}원 월급`, `시급 ${w} 주휴수당`, `시급 ${w} 한달`, `시급 ${w} 일당`, "주휴수당 계산기"],
  });
}

export default async function HourlyWageWagePage({ params }: Props) {
  const w = parse((await params).won);
  if (w === null) notFound();
  const W = formatNumber(w);
  const tag = minimumTag(w);
  const rows = WAGE_PAGE_HOURS.map((h) => ({
    h,
    p: payForWeeklyHours(h, w),
    /** 2027 예상 net (국민연금 5.0%), same engine as the 2026·2027 tables and the 최저임금 계산기 */
    p27: payForWeeklyHours(h, w, 2027),
  }));
  const at = (h: number) => rows.find((r) => r.h === h)!;
  const p40 = at(40).p;
  const p20 = at(20).p;
  const p15 = at(15).p;
  const p30 = at(30).p;
  const net27at40 = at(40).p27.netInsured;
  const fl40 = freelanceTax(p40.monthlyGross);
  const daily8 = w * 8;
  const min26 = payForWeeklyHours(40, MIN_WAGE_2026);
  const min27 = payForWeeklyHours(40, MIN_WAGE_2027);
  const annual = p40.monthlyGross * 12;
  const salaryManwon = nearestSalaryManwon(annual);
  const salaryLink = SALARY_PAGE_MANWON.includes(salaryManwon) ? salaryManwon : null;
  /** true when 시급 × exact 주 20시간 hours is a whole won (e.g. 14,000 × 104.2857… = 1,460,000), so "=" not "≈". */
  const p20Whole = Math.abs(w * p20.monthlyPayHours - p20.monthlyGross) < 1e-6;

  const faq: FaqItem[] = [
    {
      q: `시급 ${W}원이면 한 달 월급이 얼마인가요?`,
      a: `주 40시간(하루 8시간, 주 5일) 일하면 주휴수당을 포함한 월 209시간 기준 ${formatNumber(p40.monthlyGross)}원입니다. 주 20시간이면 ${formatNumber(p20.monthlyGross)}원, 주 15시간이면 ${formatNumber(p15.monthlyGross)}원입니다. 실제 월급은 그 달 근무일수에 따라 조금 달라집니다.`,
    },
    {
      q: `시급 ${W}원 주휴수당은 얼마인가요?`,
      a: `1주 소정근로시간이 15시간 이상이고 그 주를 개근하면 (주 근무시간 ÷ 40) × 8시간분을 받습니다. 주 40시간이면 1주 ${formatNumber(p40.juhyuPay)}원, 주 20시간이면 ${formatNumber(p20.juhyuPay)}원, 주 15시간이면 ${formatNumber(p15.juhyuPay)}원입니다. 주 15시간 미만이면 주휴수당이 없습니다.`,
    },
    {
      q: `시급 ${W}원 하루 8시간 일당은 얼마인가요?`,
      a: `${W} × 8 = ${formatNumber(daily8)}원입니다. 하루 8시간을 넘는 시간은 연장근로라 상시 5인 이상 사업장이면 그 시간에 시급의 50%를 더 받습니다. 하루 10시간이면 ${W} × 10 + ${W} × 2 × 0.5 = ${formatNumber(w * 11)}원입니다.`,
    },
    {
      q: `시급 ${W}원에서 3.3%를 떼면 얼마를 받나요?`,
      a: `주 40시간 월급 ${formatNumber(p40.monthlyGross)}원에서 소득세 ${formatNumber(fl40.incomeTax)}원과 지방소득세 ${formatNumber(fl40.localTax)}원을 떼면 ${formatNumber(p40.netFreelance)}원입니다. 4대보험에 가입한 근로자라면 ${STATIC_MONTH_LABEL} 요율로 ${formatNumber(p40.netInsured)}원입니다.`,
    },
  ];
  if (w < MIN_WAGE_2027) {
    faq.push({
      q: `2027년에도 시급 ${W}원을 받으면 되나요?`,
      a: `아니요. 2027년 최저시급은 10,700원이라 2027년 1월 1일부터는 시급 ${W}원이 최저임금보다 낮습니다. 수습 감액 요건을 갖추지 않았다면 최소 10,700원을 받아야 하고, 주 40시간 월급은 ${formatNumber(min27.monthlyGross)}원 이상이어야 합니다.`,
    });
  }

  return (
    <ToolShell
      slug="hourly-wage"
      path={`/hourly-wage/wage/${w}/`}
      extraCrumbs={[{ name: `시급 ${W}원`, path: `/hourly-wage/wage/${w}/` }]}
      h1={`시급 ${W}원 월급: 주 40시간 ${formatNumber(p40.monthlyGross)}원 (${tag ? `${tag}, ` : ""}주휴수당 포함)`}
      lead={`시급 ${W}원이면 주 40시간 기준 주급 ${formatNumber(p40.weeklyTotal)}원(주휴수당 ${formatNumber(p40.juhyuPay)}원 포함), 월급 ${formatNumber(p40.monthlyGross)}원입니다. 주 20시간이면 월 ${formatNumber(p20.monthlyGross)}원, 주 15시간이면 월 ${formatNumber(p15.monthlyGross)}원입니다.`}
      basis={hourlyBasis()}
      calculator={<HourlyWageCalculator initialWage={w} />}
      faq={faq}
      appCategory="FinanceApplication"
    >
      <h2>시급 {W}원 근무시간별 주급·월급</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">주 근무시간</th>
              <th scope="col">주휴수당 (주)</th>
              <th scope="col">주급 합계</th>
              <th scope="col">월 환산 시간</th>
              <th scope="col">월급 (세전)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ h, p }) => (
              <tr key={h} className={h === 40 ? "is-current" : undefined}>
                <td>{HOURLY_PAGE_HOURS.includes(h) ? <Link href={`/hourly-wage/${h}/`}>주 {h}시간</Link> : `주 ${h}시간`}</td>
                <td>
                  {formatNumber(p.juhyuPay)}원 ({hoursLabel(p.juhyuHours)}시간분)
                </td>
                <td>{formatNumber(p.weeklyTotal)}원</td>
                <td>
                  {shownHoursAreExact(p.monthlyPayHours, p.monthlyHours) ? "" : "약 "}
                  {hoursLabel(p.monthlyHours)}시간
                </td>
                <td>{formatNumber(p.monthlyGross)}원</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="formula">월급 = 시급 × (주 근무시간 + 주휴시간) × 365 ÷ 7 ÷ 12 &nbsp;(주 40시간은 고시 기준 209시간)</p>
      <p>
        주 40시간이면 주휴시간 8시간을 더해 1주 48시간분을 받고, 최저임금 고시와 같은 월 209시간을 적용해 {W} × 209 ={" "}
        <strong>{formatNumber(p40.monthlyGross)}원</strong>입니다. 주 20시간이면 (20 + 4) × 365 ÷ 7 ÷ 12 ={" "}
        {exactHoursLabel(p20.monthlyPayHours)}시간이라 {W} × {exactHoursLabel(p20.monthlyPayHours)}
        {p20Whole ? " = " : ` ≈ ${formatNumber(w * p20.monthlyPayHours, 2)} → `}
        <strong>{formatNumber(p20.monthlyGross)}원</strong>, 주 30시간이면 (30 + 6) × 365 ÷ 7 ÷ 12 ={" "}
        {exactHoursLabel(p30.monthlyPayHours)}시간이라 <strong>{formatNumber(p30.monthlyGross)}원</strong>입니다. 209시간은 주
        40시간에만 쓰는 고시 기준이라, 다른 근무시간은 월 환산 시간을 반올림하지 않고 시급을 곱한 뒤 원 미만만 반올림했습니다.
      </p>

      <h2>시급 {W}원 주휴수당과 일당</h2>
      <p>
        주휴수당은 1주 소정근로시간이 15시간 이상이고 그 주 출근하기로 한 날을 모두 나왔을 때 (주 근무시간 ÷ 40) × 8시간분이
        생깁니다. 시급 {W}원이면 주 15시간은 3시간분 {formatNumber(p15.juhyuPay)}원, 주 20시간은 4시간분{" "}
        {formatNumber(p20.juhyuPay)}원, 주 30시간은 6시간분 {formatNumber(p30.juhyuPay)}원이고, 주 40시간 이상은 최대치인
        8시간분 <strong>{formatNumber(p40.juhyuPay)}원</strong>입니다. 주 14시간처럼 15시간에 못 미치면 주휴수당이 없어
        1주에 일한 14시간분 {formatNumber(w * 14)}원만 받습니다.
      </p>
      <p>
        하루 8시간 일당은 {W} × 8 = <strong>{formatNumber(daily8)}원</strong>입니다. 하루 8시간이나 주 40시간을 넘긴 시간은
        연장근로라 상시 5인 이상 사업장이면 시급의 50%인 {formatNumber(w / 2, 1)}원을 시간마다 더 받고, 5인 미만 사업장은 가산
        없이 {W}원씩 받습니다.
      </p>

      <h2>시급 {W}원 실수령액 (3.3%·4대보험)</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">주 근무시간</th>
              <th scope="col">월급 (세전)</th>
              <th scope="col">3.3% 공제 후</th>
              <th scope="col">4대보험 공제 후 ({STATIC_MONTH_LABEL})</th>
              <th scope="col">4대보험 공제 후 (2027년 예상)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ h, p, p27 }) => (
              <tr key={h} className={h === 40 ? "is-current" : undefined}>
                <td>주 {h}시간</td>
                <td>{formatNumber(p.monthlyGross)}원</td>
                <td>{formatNumber(p.netFreelance)}원</td>
                <td>{formatNumber(p.netInsured)}원</td>
                <td>{formatNumber(p27.netInsured)}원</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        4대보험 공제 후 금액은 비과세 수당이 없는 본인 1명 기준으로, {STATIC_MONTH_LABEL} 4대보험 요율과 간이세액표를
        적용했습니다. 계산기는 접속한 달의 요율을 씁니다. {RATE_2027_NOTE}
      </p>
      <NovemberNote rows={WAGE_PAGE_HOURS.map((h) => ({ label: `주 ${h}시간`, hours: h, wage: w }))} />
      <p>
        3.3%는 사업소득 원천징수(소득세 3%와 그 10%인 지방소득세, 각각 10원 미만 절사)라서 주 40시간 월급{" "}
        {formatNumber(p40.monthlyGross)}원에서 {formatNumber(fl40.total)}원을 떼고 {formatNumber(p40.netFreelance)}원을 받습니다.
        정해진 시간과 장소에서 사장의 지시를 받으며 일한다면 근로자라서 원칙적으로 4대보험과 근로소득세 대상이고, 이때 주 40시간
        실수령액은 {formatNumber(p40.netInsured)}원입니다.
      </p>

      <h2>2026·2027 최저시급과 비교</h2>
      {w === MIN_WAGE_2026 ? (
        <p>
          시급 10,320원은 2026년 최저시급입니다. 2027년 1월 1일부터는 최저시급이 10,700원으로 380원 오르므로, 같은 일을
          계속한다면 시급을 최소 10,700원으로 올려 받아야 합니다. 주 40시간 월급으로는 {formatNumber(p40.monthlyGross)}원에서{" "}
          {formatNumber(min27.monthlyGross)}원으로 {formatNumber(min27.monthlyGross - p40.monthlyGross)}원 늘어납니다. 수습
          3개월 이내이고 1년 이상 또는 기간을 정하지 않은 계약이며 단순노무직이 아니라면 90%인{" "}
          {formatNumber(probationWage(MIN_WAGE_2026))}원까지 줄 수 있습니다.
        </p>
      ) : w === MIN_WAGE_2027 ? (
        <p>
          시급 10,700원은 2027년 최저시급으로, 2026년 8월 5일 고시되어 2027년 1월 1일부터 적용됩니다. 2026년 최저시급 10,320원보다
          380원(3.7%) 많고, 주 40시간 월급은 {formatNumber(min26.monthlyGross)}원에서 {formatNumber(p40.monthlyGross)}원으로{" "}
          {formatNumber(p40.monthlyGross - min26.monthlyGross)}원 늘어납니다. 2027년에는 국민연금 근로자 부담도 4.75%에서 5.0%로
          올라 4대보험 공제 후 실수령액은 약 {formatNumber(net27at40)}원으로 예상됩니다. 2026년에 이미 시급 10,700원을 받는다면{" "}
          {STATIC_MONTH_LABEL} 요율로 계산한 실수령액은 {formatNumber(p40.netInsured)}원입니다.
        </p>
      ) : (
        <p>
          시급 {W}원은 2026년 최저시급 10,320원보다 {formatNumber(w - MIN_WAGE_2026)}원(
          {formatNumber(((w - MIN_WAGE_2026) / MIN_WAGE_2026) * 100, 1)}%) 많고, 2027년 최저시급 10,700원보다도{" "}
          {formatNumber(w - MIN_WAGE_2027)}원 많아 2027년에도 최저임금을 넘습니다. 주 40시간 월급으로 보면 2026년 최저임금 월급{" "}
          {formatNumber(min26.monthlyGross)}원보다 {formatNumber(p40.monthlyGross - min26.monthlyGross)}원, 2027년 최저임금 월급{" "}
          {formatNumber(min27.monthlyGross)}원보다 {formatNumber(p40.monthlyGross - min27.monthlyGross)}원 많습니다. 시급이 그대로라면
          2027년에는 국민연금 근로자 부담이 5.0%로 올라 주 40시간 4대보험 공제 후 금액이{" "}
          {formatNumber(p40.netInsured - net27at40)}원 줄어든 약 {formatNumber(net27at40)}원으로 예상됩니다.
        </p>
      )}
      <p>
        주 40시간 월급을 12개월로 환산하면 연 {formatNumber(annual)}원, 약{" "}
        {koreanWon(Math.round(annual / 10_000) * 10_000)}입니다.
        {salaryLink !== null ? (
          <>
            {" "}
            연봉 기준 세후 금액은 <Link href={`/salary/${salaryLink}/`}>연봉 {formatNumber(salaryLink)}만원 실수령액</Link>에서
            볼 수 있습니다.
          </>
        ) : null}{" "}
        최저임금 기준과 수습 감액은 <Link href="/minimum-wage/">최저임금 계산기</Link>에 정리했습니다.
      </p>

      <h2>다른 시급 월급 보기</h2>
      <WageLinkGrid current={w} />
    </ToolShell>
  );
}
