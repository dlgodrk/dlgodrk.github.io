import type { Metadata } from "next";
import Link from "next/link";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber, formatPercent, formatWon } from "@/lib/format";
import { RULE_YEAR } from "@/lib/site";
import {
  approxWon,
  calcCompound,
  COMPOUNDING_LABEL,
  COMPOUNDING_ORDER,
  DEFAULT_MONTHLY,
  DEFAULT_PRINCIPAL,
  DEFAULT_RATE,
  DEFAULT_YEARS,
  doublingYears,
  effectiveAnnualRate,
  INVEST_DISCLAIMER,
  realValue,
  rule72Years,
  SCENARIOS,
  simpleValue,
  type Compounding,
} from "@/lib/calc/compound-interest";
import { CompoundInterestCalculator } from "./CompoundInterestCalculator";

// Worked example = calculator defaults: 1,000만원 + 월 50만원 · 연 5% · 10년 · 월복리 · 월초
const P = DEFAULT_PRINCIPAL;
const C = DEFAULT_MONTHLY;
const R = DEFAULT_RATE;
const Y = DEFAULT_YEARS;
const ex = calcCompound({ principal: P, monthly: C, ratePct: R, years: Y });
const exLump = calcCompound({ principal: P, monthly: 0, ratePct: R, years: Y });
const exMonthly = ex.balance - exLump.balance;

const lumpBy = (c: Compounding) => calcCompound({ principal: P, monthly: 0, ratePct: R, years: Y, compounding: c }).balance;
const monthlyBy = (c: Compounding) => calcCompound({ principal: 0, monthly: C, ratePct: R, years: Y, compounding: c }).balance;

// 월 100만원 · 10년 · 연 5% 월복리: 월초 vs 월말
const begin100 = calcCompound({ principal: 0, monthly: 1_000_000, ratePct: 5, years: 10, timing: "begin" }).balance;
const end100 = calcCompound({ principal: 0, monthly: 1_000_000, ratePct: 5, years: 10, timing: "end" }).balance;

export const metadata: Metadata = pageMetadata({
  title: "복리 계산기 - 적립식·거치식 만기 금액과 72의 법칙",
  description: `초기 원금, 매월 적립액, 연 수익률, 기간을 넣으면 복리 만기 금액과 연도별 수익을 계산합니다. 1,000만원에 매달 50만원씩 10년, 연 5% 월복리면 약 ${approxWon(ex.balance)}입니다.`,
  path: "/compound-interest/",
  keywords: ["복리 계산기", "복리 계산", "적립식 복리 계산기", "월복리 계산기", "72의 법칙", "복리 수익률 계산"],
});

const FAQ: FaqItem[] = [
  {
    q: "복리 계산은 어떻게 하나요?",
    a: `목돈 하나라면 원금 × (1 + 연 수익률 ÷ m)^(m × 년수)입니다. m은 1년에 이자를 붙이는 횟수로 월복리 12, 분기복리 4, 연복리 1입니다. 1,000만원을 연 5% 월복리로 10년 두면 ${formatWon(exLump.balance)}이 됩니다. 매달 적립하는 돈은 회차마다 남은 기간만큼 같은 식을 적용해 더합니다.`,
  },
  {
    q: "월복리와 연복리는 얼마나 차이 나나요?",
    a: `1,000만원을 연 5%로 10년 두면 연복리는 ${formatWon(lumpBy("yearly"))}, 월복리는 ${formatWon(lumpBy("monthly"))}으로 ${formatWon(lumpBy("monthly") - lumpBy("yearly"))} 차이가 납니다. 월복리 연 5%는 1년 기준으로 연 ${formatPercent(effectiveAnnualRate(5, "monthly"), 2)}를 받는 것과 같습니다.`,
  },
  {
    q: "72의 법칙이란 무엇인가요?",
    a: `72를 연 수익률(%)로 나누면 원금이 두 배가 되는 대략의 햇수가 나온다는 어림셈입니다. 연 6%면 72 ÷ 6 = 12년이고, 정확히 계산하면 ${formatNumber(doublingYears(6, "yearly"), 1)}년입니다. 수익률이 2~12% 사이일 때 오차가 작습니다.`,
  },
  {
    q: "투자 수익에도 15.4% 세금이 붙나요?",
    a: "예금 이자와 펀드·ETF 분배금 같은 이자·배당소득은 15.4%(소득세 14% + 지방소득세 1.4%)를 원천징수합니다. 국내 상장주식 매매차익은 대주주가 아니면 과세하지 않고, 해외주식 매매차익은 연 250만원을 뺀 나머지에 양도소득세 22%를 냅니다. 이자·배당소득이 1년에 2,000만원을 넘으면 다른 소득과 합쳐 종합과세됩니다.",
  },
  {
    q: "월초 적립과 월말 적립은 무엇이 다른가요?",
    a: `월초에 넣으면 회차마다 한 달치 수익이 더 붙습니다. 월 100만원을 연 5% 월복리로 10년 모으면 월초 적립은 ${formatWon(begin100)}, 월말 적립은 ${formatWon(end100)}으로 ${formatWon(begin100 - end100)} 차이가 납니다.`,
  },
  {
    q: "실질 가치는 어떻게 계산하나요?",
    a: `만기 금액을 (1 + 물가상승률)^년수로 나눕니다. 물가가 연 2%씩 오르면 10년 뒤 1억원은 오늘 돈으로 약 ${approxWon(realValue(100_000_000, 2, 10))}의 가치입니다.`,
  },
];

export default function CompoundInterestPage() {
  const rule72Rates = [2, 3, 4, 5, 6, 7, 8, 10, 12];
  const gridMonthly = [100_000, 300_000, 500_000, 1_000_000];
  const gridYears = [10, 20, 30];

  return (
    <ToolShell
      slug="compound-interest"
      h1="복리 계산기 (적립식·거치식)"
      lead={`1,000만원에 매달 50만원씩 10년 동안 넣고 연 5% 월복리로 굴리면 만기 금액은 ${formatWon(ex.balance)}입니다. 원금과 적립액, 수익률, 기간을 넣으면 연도별 수익과 세금, 물가 반영 금액까지 바로 계산해 드려요.`}
      basis={`월·분기·연복리 표준 공식 · 세금은 ${RULE_YEAR}년 이자·배당소득 원천징수율 15.4% 단순 가정 · 2026년 10월 9일 확인`}
      calculator={<CompoundInterestCalculator />}
      faq={FAQ}
      appCategory="FinanceApplication"
    >
      <h2>복리 계산 공식</h2>
      <p>
        복리는 이자에 다시 이자가 붙는 방식입니다. 1년에 이자를 붙이는 횟수를 m, 연 수익률을 R이라 하면 목돈(거치식)과 매달
        넣는 돈(적립식)의 만기 금액은 다음과 같습니다.
      </p>
      <p className="formula">
        거치식: 원금 × (1 + R ÷ m)<sup>m × 년수</sup>
        <br />
        적립식 (월복리·월초): 월 적립액 × (1 + i) × ((1 + i)<sup>n</sup> − 1) ÷ i &nbsp;(i = R ÷ 12, n = 개월 수)
      </p>
      <p>
        예를 들어 초기 원금 1,000만원에 매달 50만원을 10년 동안 넣고 연 5% 월복리로 굴리면, 원금 부분은 10,000,000 × (1 +
        0.05 ÷ 12)<sup>120</sup> = {formatWon(exLump.balance)}, 적립 부분은 500,000 × (1 + 0.05 ÷ 12) × ((1 + 0.05 ÷ 12)
        <sup>120</sup> − 1) ÷ (0.05 ÷ 12) = {formatWon(exMonthly)}입니다. 둘을 더한 만기 금액은{" "}
        <strong>{formatWon(ex.balance)}</strong>이고, 총 납입 원금 {approxWon(ex.contributed)}을 빼면 수익은 약{" "}
        {approxWon(ex.gain)}(누적 {formatPercent(ex.gainRatio, 1)})입니다. 월말에
        넣는다면 적립 부분에서 (1 + i)를 곱하지 않습니다.
      </p>

      <h2>복리 주기와 적립 시점에 따른 차이</h2>
      <p>
        분기복리와 연복리는 주기가 끝날 때 이자를 원금에 합칩니다. 주기 중간에 넣은 돈은 그때까지 남은 개월 수만큼 단리로
        이자가 쌓였다가 주기 끝에 원금이 됩니다. 그래서 연복리로 1년만 계산하면 은행 정기적금의 단리 이자와 같고, 주기가
        짧을수록 같은 연 수익률에서도 만기 금액이 커집니다. 아래 표는 연 {R}%, {Y}년 기준입니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>
            연 {R}% · {Y}년 · 적립식은 월초 기준
          </caption>
          <thead>
            <tr>
              <th scope="col">방식</th>
              <th scope="col">1,000만원 거치</th>
              <th scope="col">월 50만원 적립</th>
              <th scope="col">연 실효수익률</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>단리</td>
              <td>{formatWon(Math.round(simpleValue(P, 0, R, Y)))}</td>
              <td>{formatWon(Math.round(simpleValue(0, C, R, Y)))}</td>
              <td>-</td>
            </tr>
            {[...COMPOUNDING_ORDER].reverse().map((c) => (
              <tr key={c} className={c === "monthly" ? "is-current" : undefined}>
                <td>{COMPOUNDING_LABEL[c]}</td>
                <td>{formatWon(lumpBy(c))}</td>
                <td>{formatWon(monthlyBy(c))}</td>
                <td>{formatPercent(effectiveAnnualRate(R, c), 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        단리는 이자를 만기에 한 번만 붙이는 경우입니다. 같은 조건에서 월 50만원을 월말에 넣으면 월복리 만기 금액은{" "}
        {formatWon(calcCompound({ principal: 0, monthly: C, ratePct: R, years: Y, timing: "end" }).balance)}입니다.
      </p>

      <h2>72의 법칙: 돈이 두 배가 되는 기간</h2>
      <p>
        72를 연 수익률(%)로 나누면 목돈이 두 배가 되는 대략의 햇수가 나옵니다. 연 {R}%라면 72 ÷ {R} = {formatNumber(rule72Years(R), 1)}
        년이고, 월복리로 정확히 계산하면 {formatNumber(doublingYears(R, "monthly"), 1)}년입니다. 반대로 10년 안에 두 배를 만들려면
        연 7.2% 정도가 필요하다는 식으로 목표 수익률을 가늠할 때도 씁니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>연복리 기준 · 단위: 년</caption>
          <thead>
            <tr>
              <th scope="col">연 수익률</th>
              <th scope="col">72의 법칙</th>
              <th scope="col">정확한 값</th>
              <th scope="col">오차</th>
            </tr>
          </thead>
          <tbody>
            {rule72Rates.map((r) => {
              // Compare the values as shown (one decimal) so the 오차 column matches the table.
              const approx = Math.round(rule72Years(r) * 10) / 10;
              const exact = Math.round(doublingYears(r, "yearly") * 10) / 10;
              const diff = Math.round((approx - exact) * 10) / 10;
              return (
                <tr key={r} className={r === R ? "is-current" : undefined}>
                  <td>{r}%</td>
                  <td>{approx.toFixed(1)}</td>
                  <td>{exact.toFixed(1)}</td>
                  <td>{diff === 0 ? "0.0" : `${diff > 0 ? "+" : "−"}${Math.abs(diff).toFixed(1)}`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>월 적립액·기간별 만기 금액</h2>
      <p>
        매달 같은 금액을 연 {R}% 월복리로 넣었을 때의 만기 금액입니다. 기간이 두 배가 되면 납입 원금은 두 배지만 만기 금액은
        그보다 훨씬 많이 늘어납니다. 다른 금액과 수익률은 위 계산기에 직접 넣어 보세요.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>
            연 {R}% · 월복리 · 월초 적립 · 괄호는 납입 원금
          </caption>
          <thead>
            <tr>
              <th scope="col">월 적립액</th>
              {gridYears.map((y) => (
                <th key={y} scope="col">
                  {y}년
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gridMonthly.map((m) => (
              <tr key={m}>
                <td>{formatNumber(m / 10_000)}만원</td>
                {gridYears.map((y) => (
                  <td key={y}>
                    {approxWon(calcCompound({ principal: 0, monthly: m, ratePct: R, years: y }).balance)}
                    <br />
                    <span className="text-xs text-muted">({approxWon(m * 12 * y)})</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>세금과 물가는 이렇게 반영합니다</h2>
      <ul>
        <li>
          <strong>세금 15.4% (단순 가정)</strong>: 만기에 수익 전체에서 소득세 14%(
          <a href="https://www.law.go.kr/법령/소득세법/제129조" target="_blank" rel="noopener noreferrer">
            소득세법 제129조
          </a>
          )와 그 10%인 지방소득세(
          <a href="https://www.law.go.kr/법령/지방세법/제103조의13" target="_blank" rel="noopener noreferrer">
            지방세법 제103조의13
          </a>
          )를 한 번 뗀다고 계산합니다. 예금처럼 이자를 받을 때마다 세금을 떼면 세후 이자만 다시 불어나므로 실제 세후 금액은 이보다
          조금 적습니다.
        </li>
        <li>
          <strong>상품마다 다른 과세</strong>: 국내 상장주식 매매차익은 대주주가 아니면 비과세이고, 해외주식은 양도소득세, 연금저축·IRP는
          연금을 받을 때 연금소득세를 냅니다. 이자·배당소득이 연 2,000만원을 넘으면 종합과세 대상입니다(
          <a href="https://www.law.go.kr/법령/소득세법/제14조" target="_blank" rel="noopener noreferrer">
            소득세법 제14조
          </a>
          ).
        </li>
        <li>
          <strong>실질 가치</strong>: 만기 금액 ÷ (1 + 물가상승률)<sup>년수</sup>로 오늘 돈 가치로 바꿉니다.{" "}
          <a href="https://www.bok.or.kr/" target="_blank" rel="noopener noreferrer">
            한국은행
          </a>
          은 소비자물가 상승률 2%를 물가안정목표로 삼고 있어, 장기 계산에서는 2% 안팎을 많이 넣습니다. 물가가 연 2%면 10년 뒤 돈의
          가치는 지금의 약 {formatPercent(1 / Math.pow(1.02, 10), 0)}입니다.
        </li>
        <li>
          <strong>수익률 가정</strong>: 이 계산은 매년 같은 수익률이 이어진다고 가정합니다. 예금은 금리가 정해져 있지만, 주식·펀드는
          해마다 수익률이 달라지고 원금 손실이 날 수 있습니다. 은행 적금 이자는{" "}
          <Link href="/savings/">적금 이자 계산기</Link>, 목돈 예금은 <Link href="/deposit/">예금 이자 계산기</Link>가 더
          정확합니다.
        </li>
      </ul>
      <p className="note">{INVEST_DISCLAIMER}</p>

      <h2>자주 찾는 복리 계산</h2>
      <nav aria-label="복리 계산 시나리오 페이지" className="link-grid">
        {SCENARIOS.map((s) => (
          <Link key={s.slug} href={`/compound-interest/${s.slug}/`}>
            {s.label} 연 {s.ratePct}%
          </Link>
        ))}
      </nav>
    </ToolShell>
  );
}
