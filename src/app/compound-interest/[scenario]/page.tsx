import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber, formatPercent, formatWon } from "@/lib/format";
import { RULE_YEAR } from "@/lib/site";
import {
  approxWon,
  calcCompound,
  COMPOUNDING_LABEL,
  COMPREHENSIVE_TAX_THRESHOLD,
  doublingYears,
  findScenario,
  gainTax,
  INVEST_DISCLAIMER,
  realValue,
  rule72Years,
  SCENARIOS,
  simpleValue,
  TABLE_RATES,
  TABLE_YEARS,
  type Compounding,
  type Scenario,
  type Timing,
} from "@/lib/calc/compound-interest";
import { calcSavings, SAVINGS_HEADLINE_RATE, SAVINGS_PAGE_MONTHLY } from "@/lib/calc/savings";
import { DEPOSIT_PAGE_MANWON, depositAmountLabel, EXAMPLE_RATE_PCT, netInterestSimple } from "@/lib/calc/deposit";
import { CompoundInterestCalculator } from "../CompoundInterestCalculator";

// Only the listed scenarios exist; anything else is a 404 (required for static export).
export const dynamicParams = false;

export function generateStaticParams() {
  return SCENARIOS.map((s) => ({ scenario: s.slug }));
}

type Props = { params: Promise<{ scenario: string }> };

/** Inflation assumed for the page's 실질 가치 sentence (한국은행 물가안정목표). */
const INFLATION = 2;

function calc(s: Scenario, over: { ratePct?: number; years?: number; compounding?: Compounding; timing?: Timing } = {}) {
  return calcCompound({
    principal: s.principal,
    monthly: s.monthly,
    ratePct: over.ratePct ?? s.ratePct,
    years: over.years ?? s.years,
    compounding: over.compounding ?? "monthly",
    timing: over.timing ?? "begin",
  });
}

/** Sentence opener: "매달 100만원씩 10년(120회) 넣고" / "1,000만원을 10년 동안". */
function actionPhrase(s: Scenario): string {
  return s.monthly > 0 ? `매달 ${approxWon(s.monthly)}씩 ${s.years}년(${s.years * 12}회) 넣고` : `${approxWon(s.principal)}을 ${s.years}년 동안`;
}

/** Table caption: "월 100만원 · 10년(120회)" / "1,000만원 거치 · 10년". */
function captionPhrase(s: Scenario): string {
  return s.monthly > 0 ? `월 ${approxWon(s.monthly)} · ${s.years}년(${s.years * 12}회)` : `${approxWon(s.principal)} 거치 · ${s.years}년`;
}

type BankLink = { heading: string; text: string; href: string; linkText: string };

/**
 * 같은 금액의 은행 적금(/savings/<만원>/)이나 정기예금(/deposit/<만원>/) 페이지가 있으면, 확정 금리로 받는 금액과
 * 함께 그 페이지로 링크한다. 그 페이지들도 이 시나리오로 링크한다 (scenariosForMonthly·scenariosForLump).
 */
function bankComparison(s: Scenario): BankLink | null {
  if (s.principal === 0 && s.monthly > 0) {
    const manwon = s.monthly / 10_000;
    if (!SAVINGS_PAGE_MONTHLY.includes(manwon)) return null;
    const r = calcSavings({ monthly: s.monthly, months: 12, ratePct: SAVINGS_HEADLINE_RATE });
    return {
      heading: `같은 월 ${manwon}만원을 은행 적금에 넣으면`,
      text: `월 ${manwon}만원을 은행 정기적금(연 ${SAVINGS_HEADLINE_RATE}% 단리, 일반과세 15.4%)에 1년 넣으면 세후 이자는 ${formatWon(r.afterTaxInterest)}, 만기 수령액은 ${formatWon(r.maturity)}입니다. 적금은 이자가 적어도 약정한 금리를 그대로 받으므로, 투자 수익률을 가정한 위 금액과 나란히 놓고 비교해 보세요.`,
      href: `/savings/${manwon}/`,
      linkText: `월 ${manwon}만원 적금 이자 보기`,
    };
  }
  if (s.monthly === 0 && s.principal > 0) {
    const manwon = s.principal / 10_000;
    if (!DEPOSIT_PAGE_MANWON.includes(manwon)) return null;
    const label = depositAmountLabel(manwon);
    return {
      heading: `같은 ${label}을 정기예금에 맡기면`,
      text: `${label}을 연 ${EXAMPLE_RATE_PCT}% 정기예금에 1년 맡기면 세후 이자는 ${formatWon(netInterestSimple(s.principal, EXAMPLE_RATE_PCT, 12))}입니다. 예금은 약정 금리가 확정되고 금융회사별로 원금과 이자를 합쳐 1억원까지 예금자보호를 받습니다.`,
      href: `/deposit/${manwon}/`,
      linkText: `${label} 예금 이자 보기`,
    };
  }
  return null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = findScenario((await params).scenario);
  if (!s) return {};
  const r = calc(s);
  return pageMetadata({
    title: `${s.label} 복리 계산 - 연 ${s.ratePct}%면 ${approxWon(r.balance)}`,
    description: `${actionPhrase(s)} 연 ${s.ratePct}% 월복리로 굴리면 만기 금액은 ${formatWon(r.balance)}, 수익은 ${approxWon(r.gain)}입니다. 수익률·기간별 만기 금액표와 세후 금액, 실질 가치까지 확인하세요.`,
    path: `/compound-interest/${s.slug}/`,
    keywords: [...s.keywords, "복리 계산기"],
  });
}

export default async function CompoundScenarioPage({ params }: Props) {
  const s = findScenario((await params).scenario);
  if (!s) notFound();
  const path = `/compound-interest/${s.slug}/`;
  const isMonthly = s.monthly > 0;
  const r = calc(s);
  const n = s.years * 12;
  const tax = gainTax(r.gain);
  const afterTax = r.balance - tax.total;
  const real = realValue(r.balance, INFLATION, s.years);
  const lower = calc(s, { ratePct: s.ratePct - 1 });
  const higher = calc(s, { ratePct: s.ratePct + 1 });
  const yearly = calc(s, { compounding: "yearly" });
  const endTiming = calc(s, { timing: "end" });

  // Growth in the final year vs the first year (or vs one year's contributions).
  const lastRow = r.rows[r.rows.length - 1];
  const prevRow = r.rows[r.rows.length - 2];
  const lastYearGain = lastRow.gain - (prevRow ? prevRow.gain : 0);
  const firstYearGain = r.rows[0].gain;
  const yearlyContribution = s.monthly * 12;
  const crossYear = r.rows.find((row) => row.gain >= row.contributed)?.year ?? null;
  const half = r.rows[Math.max(0, Math.floor(s.years / 2) - 1)];
  const bank = bankComparison(s);

  const rateLine = `${s.ratePct}% ÷ 12`;
  const formula = isMonthly
    ? `${formatNumber(s.monthly)} × (1 + ${rateLine}) × ((1 + ${rateLine})^${n} − 1) ÷ (${rateLine}) = ${formatWon(r.balance)}`
    : `${formatNumber(s.principal)} × (1 + ${rateLine})^${n} = ${formatWon(r.balance)}`;

  const methods: { label: string; value: number; base?: boolean }[] = [
    { label: "단리 (만기에 한 번)", value: Math.round(simpleValue(s.principal, s.monthly, s.ratePct, s.years)) },
    { label: COMPOUNDING_LABEL.yearly, value: yearly.balance },
    { label: COMPOUNDING_LABEL.quarterly, value: calc(s, { compounding: "quarterly" }).balance },
    { label: `${COMPOUNDING_LABEL.monthly}${isMonthly ? " · 월초 (기준)" : " (기준)"}`, value: r.balance, base: true },
    ...(isMonthly ? [{ label: `${COMPOUNDING_LABEL.monthly} · 월말`, value: endTiming.balance }] : []),
  ];

  const faq: FaqItem[] = [
    {
      q: `${s.label} 연 ${s.ratePct}% 복리면 얼마가 되나요?`,
      a: `${actionPhrase(s)} 연 ${s.ratePct}% 월복리로 굴리면 만기 금액은 ${formatWon(r.balance)}입니다. 납입 원금 ${approxWon(r.contributed)}에 수익 ${approxWon(r.gain)}이 붙어 원금 대비 ${formatPercent(r.gainRatio, 1)}가 늘어납니다.`,
    },
    {
      q: `세금을 떼면 얼마를 받나요?`,
      a: `수익 ${formatWon(r.gain)} 전체에 만기에 한 번 15.4%(소득세 14% + 지방소득세 1.4%)를 뗀다고 가정하면 세금은 ${formatWon(tax.total)}, 세후 금액은 ${formatWon(afterTax)}입니다. 예금처럼 해마다 이자에서 세금을 떼면 이보다 조금 적고, 국내 주식처럼 매매차익이 비과세라면 세전 금액에 가깝습니다.${
        r.gain > COMPREHENSIVE_TAX_THRESHOLD
          ? " 수익을 한 해에 한꺼번에 받으면 이자·배당소득이 2,000만원을 넘어 종합과세되므로 세금이 더 늘어날 수 있습니다."
          : ""
      }`,
    },
    {
      q: `수익률이 1%p 달라지면 얼마나 차이 나나요?`,
      a: `같은 조건에서 연 ${s.ratePct - 1}%면 ${approxWon(lower.balance)}, 연 ${s.ratePct + 1}%면 ${approxWon(higher.balance)}입니다. 연 ${s.ratePct}%와 비교하면 각각 ${approxWon(r.balance - lower.balance)} 적고 ${approxWon(higher.balance - r.balance)} 많습니다.`,
    },
    isMonthly
      ? {
          q: "월초 대신 월말에 넣으면 얼마나 줄어드나요?",
          a: `월말에 넣으면 회차마다 한 달치 수익이 빠져 만기 금액이 ${formatWon(endTiming.balance)}으로 ${formatWon(r.balance - endTiming.balance)} 적습니다. 연복리로 계산하면 월초 기준 ${formatWon(yearly.balance)}입니다.`,
        }
      : {
          q: `${approxWon(s.principal)}이 두 배가 되려면 몇 년 걸리나요?`,
          a: `72의 법칙으로 72 ÷ ${s.ratePct} = 약 ${formatNumber(rule72Years(s.ratePct), 1)}년이고, 월복리로 정확히 계산하면 ${formatNumber(doublingYears(s.ratePct, "monthly"), 1)}년입니다. ${s.years}년 뒤에는 원금의 ${formatNumber(r.balance / s.principal, 2)}배가 됩니다.`,
        },
  ];

  return (
    <ToolShell
      slug="compound-interest"
      path={path}
      extraCrumbs={[{ name: `${s.label} 연 ${s.ratePct}%`, path }]}
      h1={`${s.label} 복리: 연 ${s.ratePct}%면 ${approxWon(r.balance)}`}
      lead={
        isMonthly
          ? `매달 ${approxWon(s.monthly)}씩 ${s.years}년 넣으면 납입 원금은 ${approxWon(r.contributed)}이고, 연 ${s.ratePct}% 월복리로 굴리면 만기에 ${approxWon(r.balance)}이 됩니다. 수익은 ${approxWon(r.gain)}입니다.`
          : `${approxWon(s.principal)}을 연 ${s.ratePct}% 월복리로 ${s.years}년 두면 만기에 ${approxWon(r.balance)}이 됩니다. 원금의 ${formatNumber(r.balance / s.principal, 2)}배이고 수익은 ${approxWon(r.gain)}입니다.`
      }
      basis={`월복리${isMonthly ? " · 월초 적립" : ""} · 세전 기준 (세금은 ${RULE_YEAR}년 15.4% 단순 가정) · 2026년 10월 9일 확인`}
      calculator={
        <CompoundInterestCalculator
          initial={{ principal: s.principal, monthly: s.monthly, ratePct: s.ratePct, years: s.years }}
        />
      }
      faq={faq}
      appCategory="FinanceApplication"
    >
      <h2>
        {s.label} 연 {s.ratePct}% 복리 계산
      </h2>
      <p className="formula">{formula}</p>
      <p>
        {s.context}
        {s.source ? (
          <>
            {" "}
            (출처:{" "}
            <a href={s.source.href} target="_blank" rel="noopener noreferrer">
              {s.source.label}
            </a>
            )
          </>
        ) : null}
      </p>
      <p>
        {isMonthly ? (
          <>
            첫해에 붙는 수익은 {approxWon(firstYearGain)}에 그치지만, 마지막 {s.years}년차 한 해 동안 붙는 수익은{" "}
            <strong>{approxWon(lastYearGain)}</strong>으로 그해 넣는 원금 {approxWon(yearlyContribution)}의{" "}
            {formatNumber(lastYearGain / yearlyContribution, 1)}배입니다.{" "}
            {crossYear
              ? `누적 수익이 납입 원금보다 커지는 때는 ${crossYear}년차입니다.`
              : `${s.years}년 동안은 누적 수익이 납입 원금을 넘지 않고, 원금 대비 ${formatPercent(r.gainRatio, 1)}까지 늘어납니다.`}{" "}
            기간의 절반인 {half.year}년차 평가금액은 {approxWon(half.balance)}이라, 나머지 절반 동안 {approxWon(r.balance - half.balance)}이
            더 쌓입니다.
          </>
        ) : (
          <>
            첫해 수익은 {approxWon(firstYearGain)}이지만 마지막 {s.years}년차 한 해 동안 붙는 수익은{" "}
            <strong>{approxWon(lastYearGain)}</strong>으로 첫해의 {formatNumber(lastYearGain / firstYearGain, 1)}배입니다. 이자가
            원금에 합쳐져 다시 이자를 낳기 때문입니다. 72의 법칙으로 보면 연 {s.ratePct}%에서는 약{" "}
            {formatNumber(rule72Years(s.ratePct), 1)}년마다 두 배가 되고, {half.year}년차 평가금액은 {approxWon(half.balance)}입니다.
          </>
        )}
      </p>
      <p>
        만기에 수익 전체에서 15.4%를 뗀다고 가정하면 세후 금액은 {formatWon(afterTax)}입니다. 물가가 연 {INFLATION}%씩 오른다면{" "}
        {s.years}년 뒤의 {approxWon(r.balance)}은 오늘 돈으로 약 <strong>{approxWon(real)}</strong>의 가치입니다. 같은 조건을
        연복리로 계산하면 {formatWon(yearly.balance)}으로 월복리보다 {approxWon(r.balance - yearly.balance)} 적습니다.
      </p>

      <h2>
        수익률별 {s.label} 만기 금액
      </h2>
      <div className="table-wrap">
        <table className="data-table">
          <caption>
            {captionPhrase(s)} · 월복리{isMonthly ? " · 월초 적립" : ""} · 세전
          </caption>
          <thead>
            <tr>
              <th scope="col">연 수익률</th>
              <th scope="col">만기 금액</th>
              <th scope="col">총 수익</th>
              <th scope="col">수익률(누적)</th>
            </tr>
          </thead>
          <tbody>
            {TABLE_RATES.map((rate) => {
              const x = calc(s, { ratePct: rate });
              return (
                <tr key={rate} className={rate === s.ratePct ? "is-current" : undefined}>
                  <td>{rate}%</td>
                  <td>{approxWon(x.balance)}</td>
                  <td>{approxWon(x.gain)}</td>
                  <td>{formatPercent(x.gainRatio, 1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="note">강조한 줄이 이 페이지의 기준 수익률(연 {s.ratePct}%)입니다. 금액은 만원 단위로 반올림했습니다.</p>

      <h2>
        기간별 만기 금액 (연 {s.ratePct}%)
      </h2>
      <p>
        {isMonthly
          ? `매달 ${approxWon(s.monthly)}씩 넣는 기간을 바꿔 본 표입니다. 기간이 길수록 납입 원금보다 수익이 빠르게 커집니다.`
          : `${approxWon(s.principal)}을 맡겨 두는 기간을 바꿔 본 표입니다. 원금은 그대로인데 평가금액은 기간이 길수록 가파르게 늘어납니다.`}
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>연 {s.ratePct}% · 월복리 · 세전</caption>
          <thead>
            <tr>
              <th scope="col">기간</th>
              <th scope="col">납입 원금</th>
              <th scope="col">만기 금액</th>
              <th scope="col">총 수익</th>
            </tr>
          </thead>
          <tbody>
            {TABLE_YEARS.map((y) => {
              const x = calc(s, { years: y });
              return (
                <tr key={y} className={y === s.years ? "is-current" : undefined}>
                  <td>{y}년</td>
                  <td>{approxWon(x.contributed)}</td>
                  <td>{approxWon(x.balance)}</td>
                  <td>{approxWon(x.gain)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>복리 방식에 따른 차이</h2>
      <div className="table-wrap">
        <table className="data-table">
          <caption>
            {captionPhrase(s)} · 연 {s.ratePct}% · 세전
          </caption>
          <thead>
            <tr>
              <th scope="col">방식</th>
              <th scope="col">만기 금액</th>
              <th scope="col">기준과 차이</th>
            </tr>
          </thead>
          <tbody>
            {methods.map((m) => (
              <tr key={m.label} className={m.base ? "is-current" : undefined}>
                <td>{m.label}</td>
                <td>{formatWon(m.value)}</td>
                <td>{m.base ? "-" : `${m.value > r.balance ? "+" : "−"}${formatWon(Math.abs(m.value - r.balance))}`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        분기·연복리는 주기 중간의 돈에 주기 끝까지 단리로 이자가 쌓인다고 계산했습니다. 공식과 가정은{" "}
        <Link href="/compound-interest/">복리 계산기</Link> 본문에 정리했습니다.
      </p>

      {bank ? (
        <>
          <h2>{bank.heading}</h2>
          <p>
            {bank.text} <Link href={bank.href}>{bank.linkText}</Link>
          </p>
        </>
      ) : null}

      <p className="note">{INVEST_DISCLAIMER}</p>

      <h2>다른 복리 시나리오</h2>
      <nav aria-label="복리 계산 시나리오 페이지" className="link-grid">
        {SCENARIOS.map((x) => (
          <Link key={x.slug} href={`/compound-interest/${x.slug}/`} aria-current={x.slug === s.slug ? "page" : undefined}>
            {x.label} 연 {x.ratePct}%
          </Link>
        ))}
      </nav>
    </ToolShell>
  );
}
