import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber, formatPercent, formatWon, manwonLabel } from "@/lib/format";
import { RULE_YEAR } from "@/lib/site";
import {
  calcSavings,
  periodLabel,
  rateLabel,
  SAVINGS_PAGE_MONTHLY,
  TABLE_PERIODS,
  TABLE_RATES,
} from "@/lib/calc/savings";
import { SavingsCalculator } from "../SavingsCalculator";

// Only the listed amounts exist; anything else is a 404 (required for static export).
export const dynamicParams = false;

export function generateStaticParams() {
  return SAVINGS_PAGE_MONTHLY.map((m) => ({ monthly: String(m) }));
}

type Props = { params: Promise<{ monthly: string }> };

/** URL segment is the monthly amount in 만원 (e.g. "50"). */
function parse(raw: string): number | null {
  const n = Number(raw);
  return SAVINGS_PAGE_MONTHLY.includes(n) ? n : null;
}

/** Headline rate used for the page's direct answer. */
const HEADLINE_RATE = 3.5;

/** 청년미래적금 월 납입 한도 (만원). */
const YOUTH_FUTURE_MAX_MANWON = 50;

function simple(won: number, months: number, ratePct: number) {
  return calcSavings({ monthly: won, months, ratePct });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m = parse((await params).monthly);
  if (m === null) return {};
  const r = simple(m * 10_000, 12, HEADLINE_RATE);
  return pageMetadata({
    title: `월 ${m}만원 적금 1년 이자 - 금리별 만기 수령액표`,
    description: `월 ${m}만원 적금을 1년 넣으면 원금 ${manwonLabel(m * 12)}, 연 ${HEADLINE_RATE}% 단리 기준 세후 이자 ${formatNumber(r.afterTaxInterest)}원입니다. 금리 2~6%, 기간 6개월~3년별 세후 만기 수령액을 표로 비교하세요.`,
    path: `/savings/${m}/`,
    keywords: [`월 ${m}만원 적금`, `${m}만원 적금 1년 이자`, `월 ${m}만원 적금 만기`, `${m}만원씩 적금`, "적금 이자 계산기"],
  });
}

export default async function SavingsDetailPage({ params }: Props) {
  const m = parse((await params).monthly);
  if (m === null) notFound();
  const won = m * 10_000;
  const path = `/savings/${m}/`;

  const head = simple(won, 12, HEADLINE_RATE);
  const at3 = simple(won, 12, 3);
  const at4 = simple(won, 12, 4);
  const at5 = simple(won, 12, 5);
  const step = at4.afterTaxInterest - head.afterTaxInterest; // 3.5% → 4.0%
  const y3 = simple(won, 36, HEADLINE_RATE);
  const y3at3 = simple(won, 36, 3);
  const y3at4 = simple(won, 36, 4);
  const y3monthly = calcSavings({ monthly: won, months: 36, ratePct: 4, interestType: "monthly" });

  const faq: FaqItem[] = [
    {
      q: `월 ${m}만원 적금 1년 이자는 얼마인가요?`,
      a: `연 ${HEADLINE_RATE}% 단리 기준 세전 이자는 ${formatNumber(head.interest)}원, 이자과세 15.4%를 뗀 세후 이자는 ${formatNumber(head.afterTaxInterest)}원입니다. 연 4%라면 세후 ${formatNumber(at4.afterTaxInterest)}원, 연 5%라면 세후 ${formatNumber(at5.afterTaxInterest)}원입니다.`,
    },
    {
      q: `월 ${m}만원씩 3년 모으면 얼마가 되나요?`,
      a: `원금은 ${manwonLabel(m * 36)}이고, 연 ${HEADLINE_RATE}% 단리라면 세후 이자 ${formatNumber(y3.afterTaxInterest)}원을 더해 만기에 ${formatWon(y3.maturity)}을 받습니다.`,
    },
    {
      q: `월 ${m}만원 적금에서 금리 1%p 차이는 얼마인가요?`,
      a: `1년 기준 연 3%와 4%의 세후 이자 차이는 ${formatNumber(at4.afterTaxInterest - at3.afterTaxInterest)}원입니다. 3년 적금이면 ${formatNumber(y3at4.afterTaxInterest - y3at3.afterTaxInterest)}원 차이가 납니다.`,
    },
    {
      q: `월 ${m}만원 적금을 비과세로 받으면 얼마나 더 받나요?`,
      a: `연 ${HEADLINE_RATE}% 1년 기준 일반과세 세금 ${formatNumber(head.tax)}원을 내지 않으므로 이자 ${formatNumber(head.interest)}원을 그대로 받습니다. ${
        m <= YOUTH_FUTURE_MAX_MANWON
          ? `비과세종합저축이나 청년미래적금(월 ${YOUTH_FUTURE_MAX_MANWON}만원 한도)처럼 가입 대상이 정해진 상품에서만 가능합니다.`
          : `비과세종합저축(1인 5천만원 한도)처럼 가입 대상이 정해진 상품에서만 가능합니다. 청년미래적금은 월 ${YOUTH_FUTURE_MAX_MANWON}만원까지만 넣을 수 있어 월 ${m}만원 전체를 비과세로 받을 수는 없습니다.`
      }`,
    },
  ];

  return (
    <ToolShell
      slug="savings"
      path={path}
      extraCrumbs={[{ name: `월 ${m}만원`, path }]}
      h1={`월 ${m}만원 적금 1년 이자: 금리별 만기 수령액`}
      lead={`월 ${m}만원씩 1년 넣으면 원금은 ${manwonLabel(m * 12)}이고, 연 ${HEADLINE_RATE}% 단리라면 세후 이자 ${formatNumber(head.afterTaxInterest)}원을 더해 ${formatWon(head.maturity)}을 받습니다.`}
      basis={`단리 · 일반과세 15.4% (${RULE_YEAR}년 세율) 기준 · 2026년 10월 9일 확인`}
      calculator={<SavingsCalculator initialMonthly={won} />}
      faq={faq}
      appCategory="FinanceApplication"
    >
      <h2>월 {m}만원 적금 1년 이자 계산</h2>
      <p className="formula">
        {formatNumber(won)}원 × {HEADLINE_RATE}% ÷ 12 × 78 = {formatNumber(head.interest)}원 (세전)
      </p>
      <p>
        78은 1회차부터 12회차까지 예치 개월 수를 더한 값(12 + 11 + … + 1)입니다. 세전 이자 {formatNumber(head.interest)}원에서
        이자소득세 {formatNumber(head.taxLines[0].amount)}원과 지방소득세 {formatNumber(head.taxLines[1].amount)}원을 떼면 세후
        이자는 <strong>{formatNumber(head.afterTaxInterest)}원</strong>, 원금 {manwonLabel(m * 12)}과 합친 만기 수령액은{" "}
        <strong>{formatWon(head.maturity)}</strong>입니다. 원금 대비 이자는 세전 {formatPercent(head.interest / head.principal, 2)}로
        표시 금리 {HEADLINE_RATE}%의 절반 남짓이고, 세금을 떼면 {formatPercent(head.afterTaxReturn, 2)}로 절반에 조금 못
        미칩니다. 금리가 4%로 0.5%p 오르면 1년 세후 이자는{" "}
        {formatNumber(at4.afterTaxInterest)}원으로 {formatNumber(step)}원 늘어납니다.
      </p>

      <h2>월 {m}만원 적금 금리·기간별 세후 만기 수령액</h2>
      <div className="table-wrap">
        <table className="data-table">
          <caption>단리 · 일반과세 15.4% · 단위: 원</caption>
          <thead>
            <tr>
              <th scope="col">연 금리</th>
              {TABLE_PERIODS.map((n) => (
                <th key={n} scope="col">
                  {periodLabel(n)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>원금</td>
              {TABLE_PERIODS.map((n) => (
                <td key={n}>{formatNumber(won * n)}</td>
              ))}
            </tr>
            {TABLE_RATES.map((r) => (
              <tr key={r} className={r === HEADLINE_RATE ? "is-current" : undefined}>
                <td>{rateLabel(r)}</td>
                {TABLE_PERIODS.map((n) => (
                  <td key={n}>{formatNumber(simple(won, n, r).maturity)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        은행은 납입일별 일수로 이자를 계산하므로 실제 금액과 몇십 원 차이가 날 수 있습니다. 강조한 줄이 위 계산 예시(연{" "}
        {HEADLINE_RATE}%)입니다.
      </p>

      <h2>금리별 1년 이자 명세 (월 {m}만원)</h2>
      <div className="table-wrap">
        <table className="data-table">
          <caption>12개월 · 단리 · 일반과세 15.4%</caption>
          <thead>
            <tr>
              <th scope="col">연 금리</th>
              <th scope="col">세전 이자</th>
              <th scope="col">세금</th>
              <th scope="col">세후 이자</th>
              <th scope="col">원금 대비</th>
            </tr>
          </thead>
          <tbody>
            {TABLE_RATES.map((r) => {
              const x = simple(won, 12, r);
              return (
                <tr key={r} className={r === HEADLINE_RATE ? "is-current" : undefined}>
                  <td>{rateLabel(r)}</td>
                  <td>{formatNumber(x.interest)}원</td>
                  <td>{formatNumber(x.tax)}원</td>
                  <td>{formatNumber(x.afterTaxInterest)}원</td>
                  <td>{formatPercent(x.afterTaxReturn, 2)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>월 {m}만원으로 3년 모으면</h2>
      <p>
        월 {m}만원을 3년(36개월) 넣으면 원금은 {manwonLabel(m * 36)}입니다. 연 4% 단리라면 세후 이자{" "}
        {formatNumber(y3at4.afterTaxInterest)}원을 더해 {formatWon(y3at4.maturity)}을 받고, 같은 4%라도 월복리 상품이라면 세후
        이자가 {formatNumber(y3monthly.afterTaxInterest)}원으로{" "}
        {formatNumber(y3monthly.afterTaxInterest - y3at4.afterTaxInterest)}원 더 많습니다. 기간이 길어질수록 첫 회차의 예치
        기간이 길어져 원금 대비 이자 비율도 커집니다. 1년 적금의 원금 대비 세후 이자가 {formatPercent(at4.afterTaxReturn, 2)}
        라면 3년 적금은 {formatPercent(y3at4.afterTaxReturn, 2)}입니다.
      </p>
      <p>
        세금을 줄이는 방법도 금액이 커질수록 효과가 큽니다. 연 {HEADLINE_RATE}% 1년 기준으로 일반과세 세금은{" "}
        {formatNumber(head.tax)}원이고, 상호금융 조합 예탁금이라면 비과세 대상(농어촌특별세 1.4%)은{" "}
        {formatNumber(calcSavings({ monthly: won, months: 12, ratePct: HEADLINE_RATE, taxType: "agri" }).tax)}원, 소득 기준을
        넘는 사람이 2026년에 가입했다면(5.9%){" "}
        {formatNumber(calcSavings({ monthly: won, months: 12, ratePct: HEADLINE_RATE, taxType: "agri2026" }).tax)}원, 비과세
        상품이라면 0원입니다. 조합 예탁금 세율은 가입한 해와 조합원 여부·소득으로 정해지며, 자세한 대상은{" "}
        <Link href="/savings/">적금 이자 계산기</Link> 본문에 정리했습니다.
      </p>

      <h2>다른 금액도 찾아보기</h2>
      <nav aria-label="월 납입액별 적금 이자 페이지" className="link-grid">
        {SAVINGS_PAGE_MONTHLY.map((n) => (
          <Link key={n} href={`/savings/${n}/`} aria-current={n === m ? "page" : undefined}>
            월 {n}만원 적금
          </Link>
        ))}
      </nav>
    </ToolShell>
  );
}
