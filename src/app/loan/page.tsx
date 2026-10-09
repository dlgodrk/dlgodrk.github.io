import type { Metadata } from "next";
import Link from "next/link";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber, formatWon, koreanWon } from "@/lib/format";
import { formatKoreanDate, parseYMD } from "@/lib/date";
import { RULES_CHECKED_AT } from "@/lib/site";
import {
  calcLoan,
  compareMethods,
  dayCountGap,
  equalPaymentSummary,
  LOAN_EXAMPLE_RATE,
  LOAN_PAGE_MANWON,
  loanAmountLabel,
} from "@/lib/calc/loan";
import { LoanCalculator } from "./LoanCalculator";

// Worked example used throughout the copy: 1억원, 연 4%, 30년.
const EX = { principal: 100_000_000, annualRatePct: LOAN_EXAMPLE_RATE, months: 360 };
const ex = compareMethods(EX);
const exEq = ex["equal-payment"];
const exPr = ex["equal-principal"];
const exBu = ex.bullet;
const exGrace = calcLoan({ ...EX, graceMonths: 12, method: "equal-payment" });
// Actual-day (365일) interest vs 연 이율 ÷ 12 for the example balance, rounded to 100원.
const exGap = dayCountGap(EX.principal, LOAN_EXAMPLE_RATE);
const gapLong = koreanWon(Math.round(exGap.longMonth / 100) * 100);
const gapFeb = koreanWon(Math.round(exGap.february / 100) * 100);

const checked = parseYMD(RULES_CHECKED_AT);
/**
 * 스트레스 DSR 표를 확인한 날. 은행연합회 2026년 하반기 운영방안(2026-06-30 발표, 2026-07-01 ~ 12-31 적용)과
 * 소비자포털 스트레스 금리 공시 기준. 표 내용을 다시 확인하면 이 날짜도 함께 바꾼다 (공용 RULES_CHECKED_AT과 따로 둔다).
 */
const DSR_AS_OF = "2026년 10월 9일";
const BASIS = `월 이율 = 연 이율 ÷ 12 · 원 미만 반올림 · 대출 제도 ${checked ? formatKoreanDate(checked, false) : RULES_CHECKED_AT} 확인`;

export const metadata: Metadata = pageMetadata({
  title: "대출 이자 계산기 - 원리금균등·원금균등·만기일시 비교",
  description: `대출금액, 금리, 기간을 넣으면 월 상환액과 총 이자를 바로 계산합니다. 1억원을 연 4%로 30년 원리금균등 상환하면 월 ${formatWon(exEq.firstPayment)}. 상환방식 비교와 회차별 상환 스케줄도 확인하세요.`,
  path: "/loan/",
  keywords: [
    "대출 이자 계산기",
    "대출 계산기",
    "원리금균등 계산기",
    "원금균등 계산기",
    "월 상환액 계산",
    "주택담보대출 이자 계산",
    "1억 대출 이자",
  ],
});

const FAQ: FaqItem[] = [
  {
    q: "원리금균등과 원금균등 중 어느 쪽이 유리한가요?",
    a: `총 이자만 보면 원금균등이 항상 적습니다. 1억원을 연 4%로 30년 갚으면 원금균등이 원리금균등보다 이자를 약 ${koreanWon(Math.round((exEq.totalInterest - exPr.totalInterest) / 10000) * 10000)} 덜 냅니다. 대신 첫 달 상환액이 ${formatWon(exPr.firstPayment - exEq.firstPayment)} 더 많아 초기 부담이 큽니다. 매달 같은 금액이 편하거나 당장 여유가 적다면 원리금균등이 낫습니다.`,
  },
  {
    q: "1억 대출하면 한 달 이자는 얼마인가요?",
    a: `연 4%라면 한 달 이자는 1억원 × 4% ÷ 12 = 약 ${formatWon(exBu.firstPayment)}입니다. 만기일시상환이면 매달 이 금액만 내고, 30년 원리금균등이면 원금을 포함해 매달 ${formatWon(exEq.firstPayment)}을 냅니다.`,
  },
  {
    q: "대출 이자는 어떻게 계산하나요?",
    a: `매달 이자는 남은 대출잔액에 월 이율(연 이율 ÷ 12)을 곱해 계산합니다. 원금을 갚을수록 잔액이 줄어 이자도 줄어듭니다. 실제 은행은 그달의 일수(1년 365일 기준)로 이자를 계산해, 잔액 1억원·연 4%라면 31일인 달은 약 ${gapLong} 더 내고 2월(28일)은 약 ${gapFeb} 덜 냅니다.`,
  },
  {
    q: "거치기간을 두면 이자가 더 많아지나요?",
    a: `네. 거치기간에는 원금이 줄지 않아 이자가 그대로 붙고, 남은 기간에 원금을 몰아서 갚기 때문에 거치 후 월 상환액도 커집니다. 1억원·연 4%·30년에 거치 1년을 두면 총 이자가 약 ${koreanWon(Math.round((exGrace.totalInterest - exEq.totalInterest) / 10000) * 10000)} 늘어납니다.`,
  },
  {
    q: "대출을 일찍 갚으면 중도상환수수료를 내야 하나요?",
    a: "중도상환수수료는 원칙적으로 금지되고, 대출일부터 3년 이내에 갚는 경우에만 받을 수 있습니다. 2025년 1월 13일 이후 새로 받은 대출은 은행의 실제 비용 안에서만 수수료를 매기도록 바뀌었습니다. 정확한 요율은 대출 약정서나 은행 공시를 확인하세요.",
  },
  {
    q: "스트레스 DSR이 적용되면 내는 이자도 오르나요?",
    a: "아니요. 스트레스 금리는 대출 한도를 정할 때만 더하는 가상의 금리라 실제로 내는 이자에는 붙지 않습니다. 다만 같은 소득이라도 빌릴 수 있는 금액이 줄어듭니다. 2026년 하반기 은행권 기준으로 수도권·규제지역 주택담보대출은 3.0%, 지방 주택담보대출은 0.75%(2단계 유지, 2026년 12월 31일까지)를 더해 한도를 계산합니다.",
  },
];

const TABLE_YEARS = [5, 10, 20, 30];

export default function LoanPage() {
  return (
    <ToolShell
      slug="loan"
      h1="대출 이자 계산기 (월 상환액·총 이자)"
      lead={`1억원을 연 4%로 30년 동안 원리금균등으로 갚으면 매달 ${formatWon(exEq.firstPayment)}, 총 이자는 ${koreanWon(exEq.totalInterest)}입니다. 대출금액, 금리, 기간을 넣으면 원리금균등·원금균등·만기일시 상환액을 바로 비교해 드려요.`}
      basis={BASIS}
      calculator={<LoanCalculator />}
      faq={FAQ}
      appCategory="FinanceApplication"
    >
      <h2>상환방식 3가지, 무엇이 다를까</h2>
      <p>
        같은 1억원을 연 4%로 30년 빌려도 어떻게 갚느냐에 따라 매달 내는 돈과 총 이자가 크게 달라집니다. 아래는 거치기간
        없이 계산한 결과입니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>1억원 · 연 4% · 30년 기준</caption>
          <thead>
            <tr>
              <th scope="col">상환방식</th>
              <th scope="col">매달 내는 돈</th>
              <th scope="col">총 이자</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>원리금균등</td>
              <td>{formatWon(exEq.firstPayment)} (매달 같음)</td>
              <td>{koreanWon(exEq.totalInterest)}</td>
            </tr>
            <tr>
              <td>원금균등</td>
              <td>
                {formatWon(exPr.firstPayment)} → {formatWon(exPr.lastPayment)}
              </td>
              <td>{koreanWon(exPr.totalInterest)}</td>
            </tr>
            <tr>
              <td>만기일시</td>
              <td>{formatWon(exBu.firstPayment)} (이자만)</td>
              <td>{koreanWon(exBu.totalInterest)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <ul>
        <li>
          <strong>원리금균등</strong>: 원금과 이자를 합친 금액을 매달 똑같이 냅니다. 생활비 계획을 세우기 쉬워 주택담보대출과
          신용대출 분할상환에서 가장 많이 씁니다. 초반에는 납입액 대부분이 이자라 원금이 천천히 줄고, 총 이자는 원금균등보다
          많습니다.
        </li>
        <li>
          <strong>원금균등</strong>: 원금을 똑같이 나눠 갚고 이자는 남은 잔액에만 붙습니다. 총 이자가 가장 적지만 첫 달 부담이
          가장 커서, 소득이 안정적이고 초기 여유가 있을 때 유리합니다.
        </li>
        <li>
          <strong>만기일시</strong>: 매달 이자만 내다가 만기에 원금을 한 번에 갚습니다. 월 부담은 가장 작지만 원금이 줄지 않아
          총 이자가 가장 많습니다. 전세자금대출처럼 기간이 짧은 대출에서 주로 씁니다.
        </li>
      </ul>

      <h2>월 상환액 계산 공식</h2>
      <p>P는 대출원금, r은 월 이율(연 이율 ÷ 12), n은 원금을 나눠 갚는 개월 수입니다.</p>
      <p className="formula">원리금균등 월 납입액 = P × r × (1 + r)ⁿ ÷ ((1 + r)ⁿ − 1)</p>
      <p className="formula">원금균등 k회차 납입액 = P ÷ n + (k회차 직전 잔액 × r)</p>
      <p className="formula">만기일시 월 이자 = P × r, 마지막 달에 원금 P 상환</p>
      <p>
        예를 들어 1억원을 연 4%, 30년(360개월) 원리금균등으로 빌리면 r = 0.04 ÷ 12 ≈ 0.003333이고 월 납입액은{" "}
        <strong>{formatWon(exEq.firstPayment)}</strong>입니다. 첫 달에는 이 중 {formatWon(exEq.rows[0].interest)}이 이자,{" "}
        {formatWon(exEq.rows[0].principal)}이 원금이며, 회차가 지날수록 이자 몫은 줄고 원금 몫이 늘어납니다. 원금이 절반 아래로
        내려가는 것은 {exEq.rows.findIndex((r) => r.balance <= EX.principal / 2) + 1}회차 무렵입니다.
      </p>

      <h2>거치기간이 있을 때</h2>
      <p>
        거치기간은 원금은 갚지 않고 이자만 내는 기간입니다. 이 계산기는 거치기간을 대출기간 안에 포함해, 거치가 끝난 뒤 남은
        기간 동안 원금을 나눠 갚는 것으로 계산합니다. 1억원·연 4%·30년에 거치 1년을 두면 처음 12개월은 월{" "}
        {formatWon(exGrace.gracePayment)}, 이후 29년은 월 {formatWon(exGrace.firstPayment)}을 내고 총 이자는{" "}
        {koreanWon(exGrace.totalInterest)}으로 거치 없이 갚을 때보다 {koreanWon(exGrace.totalInterest - exEq.totalInterest)}{" "}
        많아집니다.
      </p>

      <h2>대출금액별 월 상환액 (연 4%, 원리금균등)</h2>
      <div className="table-wrap">
        <table className="data-table">
          <caption>매달 갚는 원금 + 이자, 원 단위 반올림</caption>
          <thead>
            <tr>
              <th scope="col">대출금액</th>
              {TABLE_YEARS.map((y) => (
                <th key={y} scope="col">
                  {y}년
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {LOAN_PAGE_MANWON.map((m) => (
              <tr key={m}>
                <td>
                  <Link href={`/loan/${m}/`}>{loanAmountLabel(m)}</Link>
                </td>
                {TABLE_YEARS.map((y) => (
                  <td key={y}>{formatNumber(equalPaymentSummary(m * 10_000, LOAN_EXAMPLE_RATE, y).payment)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>은행 상환액과 조금 다른 이유</h2>
      <ul>
        <li>
          <strong>일수 계산</strong>: 이 계산기는 매달 연 이율 ÷ 12를 적용합니다. 은행은 그달의 실제 일수로 이자를 계산해 31일인
          달은 조금 더, 2월처럼 짧은 달은 조금 덜 냅니다(
          <a href="https://www.hf.go.kr/ko/sub01/sub01_06_03.do" target="_blank" rel="noopener noreferrer">
            한국주택금융공사 안내
          </a>
          ). 1년을 365일로 보면 잔액 1억원·연 4%일 때 한 달 이자 {formatWon(exBu.firstPayment)}에 비해 31일인 달은 약{" "}
          {gapLong} 많고 2월(28일)은 약 {gapFeb} 적습니다. 대출금이 클수록 이 차이도 커집니다.
        </li>
        <li>
          <strong>원 단위 처리</strong>: 원 미만은 반올림하고 마지막 회차에서 남은 끝전을 정리했습니다. 이자만 내는 달(거치기간,
          만기일시)은 합계가 원금 × 연 이율 × 기간과 정확히 맞도록 달마다 1원씩 다를 수 있습니다. 은행마다 원 미만 처리 방식이
          달라 원 단위 차이가 날 수 있습니다.
        </li>
        <li>
          <strong>변동금리</strong>: 금리가 바뀌면 그때의 잔액과 남은 기간으로 상환액을 다시 계산합니다. 금리를 바꿔 넣어 보면
          변동 후 부담을 미리 가늠할 수 있습니다.
        </li>
        <li>
          <strong>부대비용</strong>: 인지세, 보증료, 근저당 설정비 같은 비용은 포함하지 않았습니다.
        </li>
      </ul>

      <h2>대출 한도와 스트레스 DSR ({DSR_AS_OF} 기준)</h2>
      <p>
        DSR(총부채원리금상환비율)은 1년 동안 갚는 모든 대출의 원리금이 연소득에서 차지하는 비율로, 금융회사는 이 비율로 대출
        한도를 정합니다. 스트레스 DSR은 앞으로 금리가 오를 수 있다고 보고 실제 금리에 스트레스 금리를 더해 DSR을 계산하는
        제도로, 2025년 7월 1일 3단계가 시행됐습니다. 다만 지역에 따라 적용 수준이 다릅니다. 은행권이 2026년 7월 1일부터 12월
        31일까지 적용하는 기준은 다음과 같습니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>은행권 스트레스 금리 · 변동금리 기준 · 2026년 하반기</caption>
          <thead>
            <tr>
              <th scope="col">대출</th>
              <th scope="col">스트레스 금리</th>
              <th scope="col">내용</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>수도권·규제지역 주택담보대출</td>
              <td>3.0%</td>
              <td>3단계. 2025년 10월 16일부터 하한이 1.5%에서 3%로 올랐습니다.</td>
            </tr>
            <tr>
              <td>지방(비규제지역) 주택담보대출</td>
              <td>0.75%</td>
              <td>2단계 기준(1.5%의 50%)을 2026년 12월 31일까지 유지합니다.</td>
            </tr>
            <tr>
              <td>신용대출</td>
              <td>1.5%</td>
              <td>기존과 새 신용대출 잔액 합계가 1억원을 넘을 때만 적용합니다.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        혼합형·주기형 상품은 고정금리 기간이 길수록 스트레스 금리를 덜 반영합니다. 스트레스 금리는 한도 계산에만 쓰이고 실제로
        내는 이자에는 붙지 않습니다. 매년 6월과 12월에 다음 6개월 동안 쓸 값을 다시 정하므로 2027년 1월부터는 달라질 수 있고,
        정확한 한도는 금융회사에서 확인해야 합니다(
        <a href="https://portal.kfb.or.kr/compare/stress_loan.php" target="_blank" rel="noopener noreferrer">
          은행연합회 스트레스 금리 공시
        </a>
        ,{" "}
        <a href="https://www.fsc.go.kr/no010101/84617" target="_blank" rel="noopener noreferrer">
          금융위원회 3단계 스트레스 DSR 시행방안
        </a>
        ,{" "}
        <a href="https://www.fsc.go.kr/no010101/85432" target="_blank" rel="noopener noreferrer">
          2025년 10·15 대출수요 관리 방안
        </a>
        ).
      </p>

      <h2>중도상환수수료</h2>
      <p>
        만기 전에 원금을 갚으면 중도상환수수료가 붙을 수 있습니다. 중도상환수수료는 원칙적으로 금지되고 대출일부터 3년 이내에
        갚을 때만 예외적으로 받을 수 있으며, 2025년 1월 13일 이후 새로 맺은 대출은 자금 운용 손실과 행정비용 같은 실제 비용
        안에서만 받도록 바뀌었습니다. 이때 5대 은행 주택담보대출 평균 수수료율은 고정금리 1.4%에서 0.65%로 낮아졌습니다(
        <a href="https://www.fsc.go.kr/edu/news/83839" target="_blank" rel="noopener noreferrer">
          금융위원회
        </a>
        ). 여윳돈으로 원금을 일부 먼저 갚으면 이후 이자가 줄어드니, 수수료와 줄어드는 이자를 비교해 보세요.
      </p>
      <p className="note">
        이 계산기는 고정금리를 가정한 추정치입니다. 실제 상환액은 대출 약정서와 금융회사의 상환 계획표를 기준으로 합니다.
      </p>

      <h2>금액별 대출 이자 표</h2>
      <nav aria-label="대출금액별 이자 페이지" className="link-grid">
        {LOAN_PAGE_MANWON.map((m) => (
          <Link key={m} href={`/loan/${m}/`}>
            {loanAmountLabel(m)} 대출 이자
          </Link>
        ))}
      </nav>
    </ToolShell>
  );
}
