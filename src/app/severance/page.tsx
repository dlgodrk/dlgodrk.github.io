import type { Metadata } from "next";
import Link from "next/link";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber, formatWon, koreanWon } from "@/lib/format";
import { formatKoreanDate, parseYMD, type YMD } from "@/lib/date";
import {
  calcSeverance,
  retirementIncomeTax,
  severanceEstimate,
  TABLE_MONTHLY,
  TABLE_PERIOD_DAYS,
  TABLE_YEARS,
  TAX_TABLE_AMOUNTS,
  TAX_TABLE_YEARS,
} from "@/lib/calc/severance";
import { SeveranceCalculator } from "./SeveranceCalculator";

const LAW_RETIRE = "https://www.law.go.kr/법령/근로자퇴직급여보장법";
const LAW_LABOR = "https://www.law.go.kr/법령/근로기준법";
const LAW_INCOME_TAX = "https://www.law.go.kr/법령/소득세법";
const MOEL_CALC = "https://www.moel.go.kr/retirementpayCal.do";

/** Text cells in .data-table (which right-aligns and no-wraps by default). */
const WRAP_CELL = { textAlign: "left", whiteSpace: "normal" } as const;
/**
 * Row-header <th> in the last body row. globals.css drops the bottom border only for `tbody tr:last-child td`
 * and styles `tr.is-current td`, so a row <th> needs those rules inline to match its row.
 */
const LAST_ROW_HEAD = { borderBottom: 0 } as const;
const CURRENT_ROW_HEAD = { ...WRAP_CELL, ...LAST_ROW_HEAD, background: "var(--wash)", fontWeight: 700, color: "var(--ink)" } as const;

const ymd = (s: string): YMD => parseYMD(s)!;

/** "2,934,783원" -> "293만원" for compact tables. */
function manwon(n: number): string {
  return `${formatNumber(Math.round(n / 10_000))}만원`;
}

// 고용노동부 퇴직금 계산기 예제 (https://www.moel.go.kr/retirementpayCal.do)
const EX = {
  hire: ymd("2014-10-02"),
  retire: ymd("2017-09-16"),
  wage3m: 7_080_000,
  annualBonus: 4_000_000,
  annualLeavePay: 300_000,
};
const ex = calcSeverance({ ...EX, weekly15h: true })!;
const exTax = ex.tax!;

// 퇴직소득세 단계 예시: 퇴직금 5,000만원 · 근속 10년
const TAX_EX_AMOUNT = 50_000_000;
const TAX_EX_YEARS = 10;
const taxEx = retirementIncomeTax(TAX_EX_AMOUNT, TAX_EX_YEARS);

// Description example: 월 300만원 · 5년
const desc5y = severanceEstimate(3_000_000, 5);
const desc5yTax = retirementIncomeTax(desc5y, 5).total;
const oneYear300 = severanceEstimate(3_000_000, 1);

export const metadata: Metadata = pageMetadata({
  title: "퇴직금 계산기 - 퇴직소득세·세후 수령액까지 (2026)",
  description: `입사일, 퇴직일, 최근 3개월 급여로 퇴직금과 퇴직소득세, 세후 수령액을 고용노동부 방식으로 계산합니다. 월급 300만원으로 5년 일하면 퇴직금 약 ${manwon(desc5y)}, 세금은 ${formatWon(desc5yTax)}입니다.`,
  path: "/severance/",
  keywords: [
    "퇴직금 계산기",
    "퇴직금 계산",
    "퇴직금 계산 방법",
    "퇴직소득세 계산기",
    "퇴직금 세금",
    "평균임금 계산",
    "2026 퇴직금",
  ],
});

const FAQ: FaqItem[] = [
  {
    q: "1년에서 며칠 모자라도 퇴직금을 못 받나요?",
    a: "네. 계속근로기간이 1년 미만이면 회사에 퇴직금 지급 의무가 없습니다. 퇴직일(마지막 근무일 다음 날)이 입사일로부터 1년 뒤 같은 날 이후여야 합니다. 예를 들어 2025년 10월 1일에 입사했다면 2026년 9월 30일까지 일해 퇴직일이 10월 1일이 되어야 받습니다.",
  },
  {
    q: "5인 미만 사업장이나 아르바이트도 퇴직금을 받나요?",
    a: "받습니다. 사업장 규모나 정규직·계약직·아르바이트 같은 고용 형태와 상관없이 1년 이상 계속 일했고 4주 평균 주 15시간 이상이면 대상입니다. 4인 이하 사업장도 2013년부터 퇴직금을 전액 지급해야 합니다.",
  },
  {
    q: "상여금과 연차수당도 퇴직금에 들어가나요?",
    a: "들어갑니다. 퇴직 전 12개월 동안 받은 상여금의 3/12, 전년도에 쓰지 못해 받은 연차수당의 3/12을 3개월 임금에 더해 평균임금을 냅니다. 퇴직하면서 정산받는 미사용 연차수당은 평균임금에 넣지 않습니다.",
  },
  {
    q: "퇴직금에도 세금을 떼나요?",
    a: `퇴직소득세와 그 10%인 지방소득세를 뗍니다. 근속연수공제와 환산급여공제가 커서 실제 세금은 많지 않습니다. 퇴직금 5,000만원·근속 10년이면 ${formatWon(taxEx.total)}입니다. 퇴직금을 IRP 계좌로 받으면 찾을 때까지 세금이 미뤄집니다.`,
  },
  {
    q: "퇴직금은 언제까지 받아야 하나요?",
    a: "퇴직한 날부터 14일 이내에 받아야 합니다. 특별한 사정이 있으면 당사자가 합의해 기한을 늦출 수 있습니다. 늦게 주면 연 20%의 지연이자가 붙고, 주지 않으면 고용노동부에 진정을 낼 수 있습니다.",
  },
  {
    q: "월급 300만원이면 1년 퇴직금은 얼마인가요?",
    a: `상여금이 없고 3개월이 92일인 경우 약 ${formatWon(oneYear300)}입니다. 퇴직금은 30일분 평균임금 기준이라 3개월 기간이 89~92일 중 며칠인지에 따라 월급과 조금 다릅니다.`,
  },
];

export default function SeverancePage() {
  return (
    <ToolShell
      slug="severance"
      h1="퇴직금 계산기 (퇴직소득세·세후 수령액)"
      lead={`퇴직금은 1일 평균임금 × 30일 × 재직일수 ÷ 365로, 월급 300만원이면 1년에 약 ${manwon(oneYear300)}, 5년이면 약 ${manwon(desc5y)}이에요. 입사일, 퇴직일, 최근 3개월 급여를 넣으면 고용노동부 방식으로 계산하고 퇴직소득세를 뗀 세후 수령액까지 알려 드려요.`}
      basis="근로자퇴직급여 보장법·소득세법(2026년 귀속) 기준 · 2026년 10월 9일 확인"
      calculator={<SeveranceCalculator />}
      faq={FAQ}
      appCategory="FinanceApplication"
    >
      <h2>퇴직금을 받을 수 있는 조건</h2>
      <p>
        <a href={`${LAW_RETIRE}/제4조`}>근로자퇴직급여 보장법 제4조</a>에 따라 아래 두 조건을 모두 채우면 회사는 퇴직금을 지급해야 합니다.
      </p>
      <ul>
        <li>
          <strong>계속근로기간 1년 이상</strong>: 입사일부터 마지막 근무일까지가 1년 이상이어야 합니다. 고용노동부 계산기는 입사일이 ‘퇴직일 − 1년’보다
          늦으면 지급 대상이 아니라고 판단합니다.
        </li>
        <li>
          <strong>4주 평균 주 15시간 이상</strong>: 1주 소정근로시간이 4주 평균 15시간 미만인 초단시간 근로자는 제외됩니다.
        </li>
      </ul>
      <p>
        정규직, 계약직, 아르바이트 같은 고용 형태는 상관없습니다. 4인 이하 사업장도 2010년 12월부터 단계적으로 적용되어 2013년부터는 퇴직금을
        전액 지급해야 합니다. 수습 기간과 육아휴직 기간도 계속근로기간에 들어갑니다.
      </p>

      <h2>퇴직일은 마지막 근무일의 다음 날</h2>
      <p>
        퇴직금 계산에서 퇴직일은 마지막으로 일한 날의 <strong>다음 날</strong>입니다. 9월 30일까지 일했다면 퇴직일은 10월 1일이고, 평균임금을 내는
        ‘퇴직 전 3개월’은 7월 1일부터 9월 30일까지 92일입니다. 재직일수도 입사일부터 퇴직일 전날까지 셉니다. 3개월 기간은 퇴직일에 따라 89~92일이
        되며, 5월 29일~31일 퇴직처럼 3개월 전 날짜가 2월에 없으면 고용노동부 계산기처럼 3월 1일부터 셉니다.
      </p>

      <h2>평균임금과 퇴직금 계산 방법</h2>
      <p className="formula">1일 평균임금 = (3개월 임금 + 연간 상여금 × 3/12 + 연차수당 × 3/12) ÷ 3개월 일수</p>
      <p className="formula">퇴직금 = 1일 평균임금 × 30일 × 재직일수 ÷ 365</p>
      <p>
        3개월 임금은 기본급과 매달 받는 수당을 더한 세전 금액입니다. 산재 휴업, 출산휴가, 육아휴직처럼{" "}
        <a href={`${LAW_LABOR}시행령/제2조`}>근로기준법 시행령 제2조</a>에 정한 기간은 일수와 임금에서 모두 뺍니다. 평균임금이 통상임금보다 낮으면{" "}
        <a href={`${LAW_LABOR}/제2조`}>근로기준법 제2조 제2항</a>에 따라 통상임금을 평균임금으로 씁니다. 연차수당은 전년도에 쓰지 못한 연차로
        받은 수당만 넣고, 퇴직하면서 정산받는 미사용 연차수당은 넣지 않습니다. 남은 연차 일수는 <Link href="/annual-leave/">연차 계산기</Link>로
        확인할 수 있습니다.
      </p>
      <p>
        <a href={MOEL_CALC}>고용노동부 퇴직금 계산기</a>의 예제로 계산해 보면 다음과 같습니다. 이 계산기도 같은 방식(1일 평균임금은 0.01원 단위
        올림, 퇴직금은 원 단위 반올림)을 씁니다.
      </p>
      <ol>
        <li>
          입사일 {formatKoreanDate(EX.hire, false)}, 퇴직일 {formatKoreanDate(EX.retire, false)} → 재직일수{" "}
          <strong>{formatNumber(ex.termDays)}일</strong>
        </li>
        <li>
          3개월 기간 {formatKoreanDate(ex.period.start, false)} ~ {formatKoreanDate(ex.period.end, false)} →{" "}
          <strong>{ex.period.days}일</strong>
        </li>
        <li>
          임금 {formatWon(EX.wage3m)} + 상여 {formatWon(EX.annualBonus)} × 3/12({formatWon(ex.wage.bonusAdd)}) + 연차수당{" "}
          {formatWon(EX.annualLeavePay)} × 3/12({formatWon(ex.wage.leaveAdd)}) = <strong>{formatWon(ex.wage.total)}</strong>
        </li>
        <li>
          1일 평균임금 {formatWon(ex.wage.total)} ÷ {ex.period.days}일 = <strong>{formatNumber(ex.wage.daily, 2)}원</strong>
        </li>
        <li>
          퇴직금 {formatNumber(ex.wage.daily, 2)}원 × 30 × {formatNumber(ex.termDays)} ÷ 365 = <strong>{formatWon(ex.severance)}</strong>
        </li>
        <li>
          근속 {ex.months}개월 → {exTax.years}년. 2026년 세법을 적용하면 퇴직소득세 {formatWon(exTax.incomeTax)}, 지방소득세{" "}
          {formatWon(exTax.localTax)} → 세후 <strong>{formatWon(ex.net)}</strong> (실제 {EX.retire.y}년 퇴직에는 당시 세법이 적용됩니다)
        </li>
      </ol>

      <h2>월급·근속연수별 퇴직금 표</h2>
      <p>
        상여금과 연차수당 없이 월급만 받은 경우입니다. 3개월 기간은 {TABLE_PERIOD_DAYS}일(10월 1일 퇴직 등), 재직일수는 365일 × 근속연수로 가정하고
        만원 단위로 반올림했습니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">근속</th>
              {TABLE_MONTHLY.map((m) => (
                <th key={m} scope="col">
                  월 {formatNumber(m / 10_000)}만원
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TABLE_YEARS.map((y, i) => (
              <tr key={y}>
                <th scope="row" style={i === TABLE_YEARS.length - 1 ? LAST_ROW_HEAD : undefined}>
                  {y}년
                </th>
                {TABLE_MONTHLY.map((m) => (
                  <td key={m}>{manwon(severanceEstimate(m, y))}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        3개월이 92일이면 30일분 평균임금이 월급의 약 97.8%라서 1년 퇴직금이 월급보다 조금 적습니다. 상여금이 있으면 연 상여의 1/12 정도가 1년치에
        더해집니다.
      </p>

      <h2>퇴직소득세 계산 단계</h2>
      <p>
        퇴직금은 근로소득과 따로 <a href={`${LAW_INCOME_TAX}/제48조`}>소득세법 제48조</a>와{" "}
        <a href={`${LAW_INCOME_TAX}/제55조`}>제55조</a>에 따라 퇴직소득세를 매깁니다. 오래 일할수록 공제가 커지고, 1년치로 환산해 세율을 매긴 뒤 다시
        근속연수만큼 곱하기 때문에 세금이 낮습니다. 퇴직금 5,000만원, 근속 10년인 예시입니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">단계</th>
              <th scope="col">계산 방법</th>
              <th scope="col">예시</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" style={WRAP_CELL}>
                ① 근속연수
              </th>
              <td style={WRAP_CELL}>근속월수(1개월 미만은 1개월) ÷ 12, 1년 미만은 올림</td>
              <td>{taxEx.years}년</td>
            </tr>
            <tr>
              <th scope="row" style={WRAP_CELL}>
                ② 근속연수공제
              </th>
              <td style={WRAP_CELL}>
                5년 이하 100만원 × n, 10년 이하 500만원 + 200만원 × (n − 5), 20년 이하 1,500만원 + 250만원 × (n − 10), 20년 초과 4,000만원 + 300만원
                × (n − 20)
              </td>
              <td>{formatWon(taxEx.serviceDeduction)}</td>
            </tr>
            <tr>
              <th scope="row" style={WRAP_CELL}>
                ③ 환산급여
              </th>
              <td style={WRAP_CELL}>(퇴직금 − 근속연수공제) × 12 ÷ 근속연수</td>
              <td>{formatWon(taxEx.converted)}</td>
            </tr>
            <tr>
              <th scope="row" style={WRAP_CELL}>
                ④ 환산급여공제
              </th>
              <td style={WRAP_CELL}>
                800만원 이하 전액, 7,000만원 이하 800만원 + 초과분 60%, 1억원 이하 4,520만원 + 55%, 3억원 이하 6,170만원 + 45%, 3억원 초과 1억 5,170만원 +
                35%
              </td>
              <td>{formatWon(taxEx.convertedDeduction)}</td>
            </tr>
            <tr>
              <th scope="row" style={WRAP_CELL}>
                ⑤ 과세표준
              </th>
              <td style={WRAP_CELL}>환산급여 − 환산급여공제</td>
              <td>{formatWon(taxEx.taxBase)}</td>
            </tr>
            <tr>
              <th scope="row" style={WRAP_CELL}>
                ⑥ 환산산출세액
              </th>
              <td style={WRAP_CELL}>과세표준 × 기본세율(6~45%)</td>
              <td>{formatWon(taxEx.convertedTax)}</td>
            </tr>
            <tr>
              <th scope="row" style={WRAP_CELL}>
                ⑦ 퇴직소득세
              </th>
              <td style={WRAP_CELL}>환산산출세액 × 근속연수 ÷ 12, 10원 미만 절사</td>
              <td>{formatWon(taxEx.incomeTax)}</td>
            </tr>
            <tr>
              <th scope="row" style={WRAP_CELL}>
                ⑧ 지방소득세
              </th>
              <td style={WRAP_CELL}>퇴직소득세 × 10%</td>
              <td>{formatWon(taxEx.localTax)}</td>
            </tr>
            <tr className="is-current">
              <th scope="row" style={CURRENT_ROW_HEAD}>
                합계
              </th>
              <td style={WRAP_CELL}>⑦ + ⑧</td>
              <td>{formatWon(taxEx.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="note">
        원천징수할 퇴직소득세가 1,000원 미만이면 걷지 않습니다(소액부징수). 근속연수공제와 기본세율 구간은 2023년 1월 개정 이후 그대로이며 2026년
        귀속분에도 같은 표가 적용됩니다. 2022년 이전에 퇴직했다면 근속연수공제가 더 적은 개정 전 규정이 적용되므로 세금이 이 표와 다릅니다.
      </p>

      <h2>퇴직금·근속연수별 퇴직소득세</h2>
      <p>지방소득세를 더한 금액입니다. 같은 퇴직금이라도 오래 일할수록 세금이 크게 줄어듭니다.</p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">퇴직금</th>
              {TAX_TABLE_YEARS.map((y) => (
                <th key={y} scope="col">
                  근속 {y}년
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TAX_TABLE_AMOUNTS.map((a, i) => (
              <tr key={a}>
                <th scope="row" style={i === TAX_TABLE_AMOUNTS.length - 1 ? LAST_ROW_HEAD : undefined}>
                  {koreanWon(a)}
                </th>
                {TAX_TABLE_YEARS.map((y) => (
                  <td key={y}>{formatWon(retirementIncomeTax(a, y).total)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>퇴직연금 DB형과 DC형의 차이</h2>
      <p>회사가 퇴직연금에 가입했다면 제도 유형에 따라 받는 금액을 정하는 방식이 다릅니다.</p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">구분</th>
              <th scope="col">DB형 (확정급여형)</th>
              <th scope="col">DC형 (확정기여형)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row" style={WRAP_CELL}>
                받는 금액
              </th>
              <td style={WRAP_CELL}>퇴직 시 평균임금 × 30일 × 근속연수. 퇴직금과 같은 수준 이상</td>
              <td style={WRAP_CELL}>회사가 매년 연간 임금총액의 1/12 이상 넣은 부담금 + 운용 수익</td>
            </tr>
            <tr>
              <th scope="row" style={WRAP_CELL}>
                운용 책임
              </th>
              <td style={WRAP_CELL}>회사</td>
              <td style={WRAP_CELL}>근로자</td>
            </tr>
            <tr>
              <th scope="row" style={WRAP_CELL}>
                유리한 경우
              </th>
              <td style={WRAP_CELL}>임금이 꾸준히 오르고 오래 다닐 때</td>
              <td style={WRAP_CELL}>임금 상승이 적거나, 직접 운용해 수익을 내고 싶을 때</td>
            </tr>
            <tr>
              <th scope="row" style={{ ...WRAP_CELL, ...LAST_ROW_HEAD }}>
                이 계산기 결과
              </th>
              <td style={WRAP_CELL}>거의 같음</td>
              <td style={WRAP_CELL}>다름 (적립금 조회 필요)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>지급 기한 14일과 IRP 계좌</h2>
      <ul>
        <li>
          <strong>14일 이내 지급</strong>: <a href={`${LAW_RETIRE}/제9조`}>근로자퇴직급여 보장법 제9조</a>에 따라 회사는 퇴직한 날부터 14일 안에
          퇴직금을 줘야 합니다. 특별한 사정이 있으면 당사자 합의로 늦출 수 있습니다.
        </li>
        <li>
          <strong>지연이자</strong>: 기한을 넘기면 <a href={`${LAW_LABOR}/제37조`}>근로기준법 제37조</a>에 따라 연 20%의 지연이자가 붙습니다. 받지
          못했다면 고용노동부에 진정을 낼 수 있습니다.
        </li>
        <li>
          <strong>IRP 이전</strong>: 퇴직금은 원칙적으로 근로자 명의의 개인형퇴직연금(IRP) 계좌로 이전해 지급합니다. 55세 이후 퇴직 등 법에 정한
          경우에는 현금으로 받을 수 있습니다. IRP로 받으면 퇴직소득세를 떼지 않고 찾을 때까지 미루며, 연금으로 나눠 받으면 세금이 30% 이상 줄어듭니다.
        </li>
      </ul>
      <p>
        퇴직금과 실업급여는 별개라서 퇴직금을 받아도 실업급여가 줄지 않습니다. 권고사직이나 계약 만료처럼 비자발적으로 퇴직했다면{" "}
        <Link href="/unemployment/">실업급여 계산기</Link>로 하루 지급액과 받는 기간을 확인해 보세요.
      </p>
      <p className="note">
        이 계산기는 법정 퇴직금 기준의 예상액입니다. 회사의 퇴직금 규정, 중간정산, 미산입 기간이 있으면 실제 금액과 다를 수 있으니 회사에서 받은
        퇴직소득 원천징수영수증으로 확인하세요.
      </p>
    </ToolShell>
  );
}
