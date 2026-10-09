import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber, formatWon, manwonLabel } from "@/lib/format";
import { RULE_YEAR } from "@/lib/site";
import {
  AGRI_EXEMPT_CAP,
  calcSavings,
  MAX_MONTHS,
  monthsLabel,
  monthsToReach,
  periodLabel,
  rateLabel,
  SAVINGS_HEADLINE_RATE,
  SAVINGS_PAGE_MONTHLY,
  SAVINGS_TARGETS,
  savingsPageHeadline,
  TABLE_PERIODS,
  TABLE_RATES,
} from "@/lib/calc/savings";
import { approxWon, calcCompound, INVEST_DISCLAIMER, scenariosForMonthly } from "@/lib/calc/compound-interest";
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
const HEADLINE_RATE = SAVINGS_HEADLINE_RATE;

/** 청년미래적금 월 납입 한도 (만원). */
const YOUTH_FUTURE_MAX_MANWON = 50;

/** 투자 비교에 쓰는 가정 (복리 시나리오가 없는 금액): 연 5% · 10년 · 월복리 · 월초. */
const INVEST_FALLBACK = { ratePct: 5, years: 10 };

function simple(won: number, months: number, ratePct: number) {
  return calcSavings({ monthly: won, months, ratePct });
}

/** 10,000,000 → "1천만원", 100,000,000 → "1억원" (목표 금액 표기). */
function targetLabel(won: number): string {
  return won >= 100_000_000 ? `${won / 100_000_000}억원` : `${won / 10_000_000}천만원`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m = parse((await params).monthly);
  if (m === null) return {};
  const r = simple(m * 10_000, 12, HEADLINE_RATE);
  return pageMetadata({
    title: savingsPageHeadline(m).title,
    description: `월 ${m}만원 적금을 1년 넣으면 원금 ${manwonLabel(m * 12)}, 연 ${HEADLINE_RATE}% 단리 기준 세후 이자 ${formatNumber(r.afterTaxInterest)}원입니다. 금리 2~6%, 기간 6개월~3년별 세후 만기 수령액과 목표 금액까지 걸리는 기간을 표로 비교하세요.`,
    path: `/savings/${m}/`,
    keywords: [`월 ${m}만원 적금`, `${m}만원 적금 1년 이자`, `월 ${m}만원 적금 만기`, `${m}만원씩 적금`, "적금 이자 계산기"],
  });
}

export default async function SavingsDetailPage({ params }: Props) {
  const m = parse((await params).monthly);
  if (m === null) notFound();
  const won = m * 10_000;
  const path = `/savings/${m}/`;
  const headline = savingsPageHeadline(m);

  const head = simple(won, 12, HEADLINE_RATE);
  const at3 = simple(won, 12, 3);
  const at4 = simple(won, 12, 4);
  const at5 = simple(won, 12, 5);
  const step = at4.afterTaxInterest - head.afterTaxInterest; // 3.5% → 4.0%
  const y3 = simple(won, 36, HEADLINE_RATE);
  const y3at3 = simple(won, 36, 3);
  const y3at4 = simple(won, 36, 4);
  const y3monthly = calcSavings({ monthly: won, months: 36, ratePct: 4, interestType: "monthly" });
  // 1년 적금을 세 번 이어 들 때(만기금은 따로 보관)와 3년 적금 하나의 세후 이자 차이.
  const threeOneYear = at4.afterTaxInterest * 3;

  // 목표 금액까지 걸리는 기간: 원금만 vs 연 HEADLINE_RATE% 적금 하나(최대 MAX_MONTHS개월).
  const targets = SAVINGS_TARGETS.map((t) => ({
    target: t,
    principalOnly: Math.ceil(t / won),
    withInterest: monthsToReach(won, t, HEADLINE_RATE),
  }));
  const reachable = targets.filter((t) => t.withInterest !== null);
  const goal = reachable[reachable.length - 1] ?? null;
  const nextGoal = targets.find((t) => t.withInterest === null) ?? null;

  // 조합 예탁금 세금 특례 1인 3천만원: 원금이 한도에 닿는 회차.
  const capMonths = Math.ceil(AGRI_EXEMPT_CAP / won);
  const y3Principal = won * 36;

  // 같은 월 적립액의 복리 시나리오 (없으면 연 5% · 10년 가정으로 계산하고 복리 계산기 본문으로 링크).
  const scenarios = scenariosForMonthly(won);
  const fallback = calcCompound({ principal: 0, monthly: won, ...INVEST_FALLBACK });

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
      h1={headline.h1}
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
        <strong>{formatWon(head.maturity)}</strong>입니다. 금리가 4%로 0.5%p 오르면 1년 세후 이자는{" "}
        {formatNumber(at4.afterTaxInterest)}원으로 {formatNumber(step)}원 늘어납니다.
        {m <= YOUTH_FUTURE_MAX_MANWON
          ? ` 월 ${m}만원은 청년미래적금 월 한도(${YOUTH_FUTURE_MAX_MANWON}만원) 안이라, 만 19~34세 가입 대상이라면 같은 금액을 넣고 이자 비과세와 정부기여금을 함께 받을 수 있습니다.`
          : ` 청년미래적금은 월 ${YOUTH_FUTURE_MAX_MANWON}만원까지라, 가입 대상이라도 나머지 월 ${m - YOUTH_FUTURE_MAX_MANWON}만원은 일반 적금이나 다른 상품에 나눠 넣어야 합니다.`}
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

      <h2>월 {m}만원으로 목표 금액까지 걸리는 기간</h2>
      <p>
        {goal
          ? `월 ${m}만원이면 ${targetLabel(goal.target)}을 모으는 데 원금만으로 ${monthsLabel(goal.principalOnly)}, 연 ${HEADLINE_RATE}% 적금 하나에 넣어 세후 이자까지 받으면 ${monthsLabel(goal.withInterest ?? goal.principalOnly)}이 걸립니다. ${
              goal.principalOnly - (goal.withInterest ?? goal.principalOnly) > 0
                ? `이자 덕분에 ${goal.principalOnly - (goal.withInterest ?? goal.principalOnly)}개월 앞당겨집니다.`
                : "이 기간에는 쌓인 이자가 한 달 납입액보다 적어 기간이 줄지는 않습니다."
            }`
          : `월 ${m}만원으로는 적금 하나로 10년 안에 1천만원을 모으기 어렵습니다.`}
        {nextGoal
          ? ` ${targetLabel(nextGoal.target)}은 원금만으로 ${monthsLabel(nextGoal.principalOnly)}이 걸려, 최장 ${MAX_MONTHS / 12}년짜리 적금 하나로는 닿지 않습니다. 기간을 줄이려면 월 납입액을 늘려야 합니다.`
          : ""}
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>
            월 {m}만원 · 적금 하나(단리 · 일반과세 15.4%) 기준 · 최장 {MAX_MONTHS / 12}년
          </caption>
          <thead>
            <tr>
              <th scope="col">목표 금액</th>
              <th scope="col">원금만 모으면</th>
              <th scope="col">연 {HEADLINE_RATE}% 적금 이자 포함</th>
            </tr>
          </thead>
          <tbody>
            {targets.map((t) => (
              <tr key={t.target} className={goal && t.target === goal.target ? "is-current" : undefined}>
                <td>{targetLabel(t.target)}</td>
                <td>{monthsLabel(t.principalOnly)}</td>
                <td>{t.withInterest === null ? `${MAX_MONTHS / 12}년 넘게` : monthsLabel(t.withInterest)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
              <th scope="col">만기 수령액</th>
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
                  <td>{formatNumber(x.maturity)}원</td>
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
        {formatNumber(y3monthly.afterTaxInterest - y3at4.afterTaxInterest)}원 더 많습니다. 같은 연 4%로 1년 적금을 세 번 이어
        들고 만기금을 따로 둔다면 세후 이자는 해마다 {formatNumber(at4.afterTaxInterest)}원씩 모두{" "}
        {formatNumber(threeOneYear)}원이라, 3년 적금 하나가 {formatNumber(y3at4.afterTaxInterest - threeOneYear)}원 더 받습니다.
        먼저 넣은 회차가 최장 36개월 동안 이자를 받기 때문입니다.
      </p>
      <p>
        세금을 줄이는 방법도 금액이 커질수록 효과가 큽니다. 연 {HEADLINE_RATE}% 1년 기준으로 일반과세 세금은{" "}
        {formatNumber(head.tax)}원이고, 상호금융 조합 예탁금이라면 비과세 대상(농어촌특별세 1.4%)은{" "}
        {formatNumber(calcSavings({ monthly: won, months: 12, ratePct: HEADLINE_RATE, taxType: "agri" }).tax)}원, 소득 기준을
        넘는 사람이 2026년에 가입했다면(5.9%){" "}
        {formatNumber(calcSavings({ monthly: won, months: 12, ratePct: HEADLINE_RATE, taxType: "agri2026" }).tax)}원, 비과세
        상품이라면 0원입니다. 조합 예탁금 세금 특례는 1인당 원금 3천만원까지인데, 월 {m}만원이면 원금이 3천만원에 닿기까지{" "}
        {monthsLabel(capMonths)}이 걸립니다.{" "}
        {y3Principal <= AGRI_EXEMPT_CAP
          ? `3년 적금이라면 원금 ${manwonLabel(m * 36)}이 모두 한도 안에 들어갑니다.`
          : `3년 적금이라면 원금 ${manwonLabel(m * 36)} 가운데 3천만원을 넘는 ${manwonLabel(m * 36 - AGRI_EXEMPT_CAP / 10_000)}에 붙는 이자는 일반과세 15.4%입니다.`}{" "}
        조합 예탁금 세율은 가입한 해와 조합원 여부·소득으로 정해지며, 자세한 대상은{" "}
        <Link href="/savings/">적금 이자 계산기</Link> 본문에 정리했습니다.
      </p>

      <h2>같은 월 {m}만원을 투자로 굴리면</h2>
      {scenarios.length ? (
        <ul>
          {scenarios.map((s) => {
            const r = calcCompound({ principal: 0, monthly: won, ratePct: s.ratePct, years: s.years });
            return (
              <li key={s.slug}>
                연 {s.ratePct}% 수익을 가정해 {s.years}년 동안 월복리로 굴리면 납입 원금 {approxWon(r.contributed)}이 약{" "}
                <strong>{approxWon(r.balance)}</strong>이 됩니다.{" "}
                <Link href={`/compound-interest/${s.slug}/`}>
                  {s.label} 연 {s.ratePct}% 복리 계산 보기
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>
          연 {INVEST_FALLBACK.ratePct}% 수익을 가정해 {INVEST_FALLBACK.years}년 동안 월복리로 굴리면 납입 원금{" "}
          {approxWon(fallback.contributed)}이 약 <strong>{approxWon(fallback.balance)}</strong>이 됩니다. 기간과 수익률을 바꿔
          보려면 <Link href="/compound-interest/">복리 계산기</Link>를 이용하세요.
        </p>
      )}
      <p className="note">
        적금은 약정한 금리를 그대로 받지만, 위 금액은 수익률을 가정한 계산입니다. {INVEST_DISCLAIMER}
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
