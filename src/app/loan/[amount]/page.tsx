import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber, formatWon, koreanWon } from "@/lib/format";
import {
  compareMethods,
  equalPaymentSummary,
  LOAN_EXAMPLE_RATE,
  LOAN_PAGE_MANWON,
  LOAN_TABLE_RATES,
  loanAmountLabel,
  loanDefaultYears,
  loanPageHeadline,
  loanTableYears,
  METHOD_LABEL,
  monthlyRate,
  REPAY_METHODS,
} from "@/lib/calc/loan";
import { LoanCalculator } from "../LoanCalculator";

// Only the listed amounts exist; anything else is a 404 (required for static export).
export const dynamicParams = false;

export function generateStaticParams() {
  return LOAN_PAGE_MANWON.map((m) => ({ amount: String(m) }));
}

type Props = { params: Promise<{ amount: string }> };

function parse(raw: string): number | null {
  const n = Number(raw);
  return LOAN_PAGE_MANWON.includes(n) ? n : null;
}

/** Search-style variant without commas: 3000 → "3천만원", 15000 → "1억5천" */
function altLabel(manwon: number): string {
  const eok = Math.floor(manwon / 10000);
  const cheon = (manwon % 10000) / 1000;
  if (eok && cheon) return `${eok}억${cheon}천`;
  if (eok) return `${eok}억`;
  return `${cheon}천만원`;
}

/** 만원 단위 반올림 표기: 71,869,506 → "7,187만원", 115,840,000 → "1억 1,584만원" */
function manwonRounded(won: number): string {
  return koreanWon(Math.round(won / 10000) * 10000);
}

function pageData(manwon: number) {
  const principal = manwon * 10_000;
  const label = loanAmountLabel(manwon);
  const years = loanDefaultYears(manwon);
  const tableYears = loanTableYears(manwon);
  const base = equalPaymentSummary(principal, LOAN_EXAMPLE_RATE, years);
  return { principal, label, years, tableYears, base };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const manwon = parse((await params).amount);
  if (manwon === null) return {};
  const { label, years, base, tableYears } = pageData(manwon);
  return pageMetadata({
    title: loanPageHeadline(manwon).title,
    description: `${label}을 연 4%로 ${years}년 원리금균등 상환하면 월 ${formatWon(base.payment)}, 총 이자 ${koreanWon(base.totalInterest)}입니다. 금리 3~6%, 기간 ${tableYears.join("·")}년별 월 상환액과 총 이자 표, 상환방식 비교를 확인하세요.`,
    path: `/loan/${manwon}/`,
    keywords: [`${label} 대출 이자`, `${altLabel(manwon)} 대출 이자`, `${label} 월 상환액`, `${label} 대출 이자 계산`, "대출 이자 계산기"],
  });
}

export default async function LoanAmountPage({ params }: Props) {
  const manwon = parse((await params).amount);
  if (manwon === null) notFound();
  const { principal, label, years, tableYears, base } = pageData(manwon);

  // Grid tables: rate × term, 원리금균등.
  const grid = LOAN_TABLE_RATES.map((rate) => ({
    rate,
    cells: tableYears.map((y) => equalPaymentSummary(principal, rate, y)),
  }));

  // Same loan with all three methods, plus a few sensitivity numbers for the copy.
  const methods = compareMethods({ principal, annualRatePct: LOAN_EXAMPLE_RATE, months: years * 12 });
  const plusHalf = equalPaymentSummary(principal, LOAN_EXAMPLE_RATE + 0.5, years);
  const plusOne = equalPaymentSummary(principal, LOAN_EXAMPLE_RATE + 1, years);
  const idx = tableYears.indexOf(years);
  const shorterYears = idx > 0 ? tableYears[idx - 1] : null;
  const shorter = shorterYears ? equalPaymentSummary(principal, LOAN_EXAMPLE_RATE, shorterYears) : null;
  const monthlyInterestAt = (rate: number) => Math.round(principal * monthlyRate(rate));
  const pr = methods["equal-principal"];
  const bu = methods.bullet;

  const faq: FaqItem[] = [
    {
      q: `${label} 대출하면 한 달 이자는 얼마인가요?`,
      a: `연 4%라면 한 달 이자는 ${label} × 4% ÷ 12 = 약 ${formatWon(monthlyInterestAt(4))}입니다. 연 3%면 ${formatWon(monthlyInterestAt(3))}, 연 5%면 ${formatWon(monthlyInterestAt(5))}입니다. 원금을 나눠 갚는 방식이라면 잔액이 줄어드는 만큼 이자도 매달 줄어듭니다.`,
    },
    {
      q: `${label}을 ${years}년 동안 갚으면 월 상환액은 얼마인가요?`,
      a: `연 4% 원리금균등 기준으로 매달 ${formatWon(base.payment)}을 내고 총 이자는 ${koreanWon(base.totalInterest)}입니다. 원금균등이라면 첫 달 ${formatWon(pr.firstPayment)}에서 시작해 마지막 달 ${formatWon(pr.lastPayment)}까지 줄어듭니다.`,
    },
    {
      q: `${label} ${years}년 대출, 금리가 0.5%포인트 오르면 얼마나 더 내나요?`,
      a: `${label}·${years}년 원리금균등 기준으로 연 4%가 4.5%가 되면 월 상환액이 ${formatWon(plusHalf.payment - base.payment)}, 총 이자가 ${koreanWon(plusHalf.totalInterest - base.totalInterest)} 늘어납니다.`,
    },
  ];

  return (
    <ToolShell
      slug="loan"
      path={`/loan/${manwon}/`}
      extraCrumbs={[{ name: `${label} 대출`, path: `/loan/${manwon}/` }]}
      h1={loanPageHeadline(manwon).h1}
      lead={`${label}을 연 4%로 ${years}년 동안 원리금균등으로 갚으면 매달 ${formatWon(base.payment)}, 총 이자는 ${koreanWon(base.totalInterest)}입니다. 금리와 기간을 바꾸면 바로 다시 계산해 드려요.`}
      basis="월 이율 = 연 이율 ÷ 12 · 원 미만 반올림 · 고정금리 가정"
      calculator={<LoanCalculator initialAmount={principal} initialYears={years} />}
      faq={faq}
      appCategory="FinanceApplication"
    >
      <h2>{label} 대출 월 상환액 표 (원리금균등)</h2>
      <p>
        {label}을 원리금균등으로 갚을 때 매달 내는 원금과 이자의 합입니다. 같은 금리라면 기간이 길수록 월 부담은 줄지만 이자를
        내는 기간이 길어져 총 이자는 늘어납니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>연 이자율 × 대출기간, 단위 원</caption>
          <thead>
            <tr>
              <th scope="col">연 이자율</th>
              {tableYears.map((y) => (
                <th key={y} scope="col">
                  {y}년
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row) => (
              <tr key={row.rate} className={row.rate === LOAN_EXAMPLE_RATE ? "is-current" : undefined}>
                <td>{formatNumber(row.rate, 1)}%</td>
                {row.cells.map((c, i) => (
                  <td key={tableYears[i]}>{formatNumber(c.payment)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>{label} 대출 총 이자 표</h2>
      <p>대출기간 전체 동안 내는 이자의 합계입니다. 원리금균등 기준이며 만원 단위로 반올림했습니다.</p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>연 이자율 × 대출기간, 총 이자</caption>
          <thead>
            <tr>
              <th scope="col">연 이자율</th>
              {tableYears.map((y) => (
                <th key={y} scope="col">
                  {y}년
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grid.map((row) => (
              <tr key={row.rate} className={row.rate === LOAN_EXAMPLE_RATE ? "is-current" : undefined}>
                <td>{formatNumber(row.rate, 1)}%</td>
                {row.cells.map((c, i) => (
                  <td key={tableYears[i]}>{manwonRounded(c.totalInterest)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>
        {label}, 연 4% {years}년 상환방식 비교
      </h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">상환방식</th>
              <th scope="col">첫 달</th>
              <th scope="col">마지막 달</th>
              <th scope="col">총 이자</th>
            </tr>
          </thead>
          <tbody>
            {REPAY_METHODS.map((m) => (
              <tr key={m}>
                <td>{METHOD_LABEL[m]}</td>
                <td>{formatWon(methods[m].firstPayment)}</td>
                <td>{formatWon(methods[m].lastPayment)}</td>
                <td>{koreanWon(methods[m].totalInterest)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        {label}을 연 4%로 {years}년 동안 원리금균등으로 갚으면 매달 <strong>{formatWon(base.payment)}</strong>, 총 이자는{" "}
        <strong>{koreanWon(base.totalInterest)}</strong>입니다. 원금균등으로 바꾸면 첫 달에 {formatWon(pr.firstPayment)}을 내야
        하지만 총 이자는 {koreanWon(base.totalInterest - pr.totalInterest)} 줄어듭니다. 만기일시상환이라면 매달 이자{" "}
        {formatWon(bu.firstPayment)}만 내다가 만기에 원금 {label}을 한 번에 갚고, 총 이자는 {koreanWon(bu.totalInterest)}으로 가장
        많습니다.
      </p>
      <p>
        금리가 1%포인트 올라 연 5%가 되면 월 상환액은 {formatWon(plusOne.payment - base.payment)} 늘어난{" "}
        {formatWon(plusOne.payment)}, 총 이자는 {koreanWon(plusOne.totalInterest - base.totalInterest)} 늘어납니다.
        {shorter && shorterYears
          ? ` 반대로 같은 금리에서 기간을 ${shorterYears}년으로 줄이면 월 상환액은 ${formatWon(shorter.payment)}으로 늘지만 총 이자는 ${koreanWon(base.totalInterest - shorter.totalInterest)} 아낄 수 있습니다.`
          : ""}
      </p>
      <p className="note">
        고정금리를 가정해 연 이율 ÷ 12로 계산한 값입니다. 은행은 실제 일수로 이자를 계산하고 인지세·보증료 같은 비용이 따로
        들 수 있어, 정확한 금액은 대출 약정서의 상환 계획표를 확인하세요.
      </p>

      <h2>다른 금액 대출 이자 보기</h2>
      <nav aria-label="대출금액별 이자 페이지" className="link-grid">
        {LOAN_PAGE_MANWON.map((m) => (
          <Link key={m} href={`/loan/${m}/`} aria-current={m === manwon ? "page" : undefined}>
            {loanAmountLabel(m)} 대출 이자
          </Link>
        ))}
      </nav>
      <p>
        상환방식별 차이와 공식, 거치기간, 스트레스 DSR은 <Link href="/loan/">대출 이자 계산기</Link> 본문에서 자세히 설명합니다.
      </p>
    </ToolShell>
  );
}
