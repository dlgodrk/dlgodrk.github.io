import type { Metadata } from "next";
import Link from "next/link";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber, formatWon, manwonLabel } from "@/lib/format";
import { calcSalary, DEFAULT_PAY_MONTH } from "@/lib/calc/salary";
import {
  longTermCareMultiplier,
  manwonFloorLabel,
  PAGE_ASSUMPTIONS,
  salaryForManwon,
  taxBracketLabel,
} from "@/lib/calc/salary-ui";
import { MONTHLY_PAGE_MANWON, monthlyPagePath, salaryForMonthlyManwon } from "@/lib/calc/salary-monthly";
import { SalaryCalculator } from "./SalaryCalculator";
import { SalaryLinks } from "./SalaryLinks";
import { SalaryMonthlyLinks } from "./SalaryMonthlyLinks";
import { CELL_SUB, PENSION_CAP, PENSION_CAP_ANNUAL_MANWON, SALARY_BASIS, SOURCES, WRAP_CELL } from "./sources";

// Worked examples, computed with the same engine as the calculator (2026년 10월분, 비과세 20만원, 1인).
const EX = salaryForManwon(4_000);
const EX_NO_NT = salaryForManwon(4_000, { nonTaxable: 0 });
const EX_SEV = salaryForManwon(4_000, { severanceIncluded: true });
const EX_300 = calcSalary({ annual: 3_000_000 * 12, ...PAGE_ASSUMPTIONS });
/** 2027 국민연금 5% (근로자) on the same 기준소득월액, 10원 미만 절사 */
const EX_PENSION_2027 = Math.floor((EX.insurance.pensionBase * 500) / 100_000) * 10;
/** 국민연금 at the 기준소득월액 cap (313,020원 for 2026.7~2027.6). */
const CAP_PENSION = salaryForManwon(30_000).insurance.pension;

/** 2026 근로자 부담분 rule table: rate on the first line, base/limit as a grey second line (fits a phone). */
const RULE_ROWS = [
  { item: "국민연금", share: "4.75% (전체 9.5%)", basis: "기준소득월액 41만~659만원 (2026.7~2027.6)" },
  { item: "건강보험", share: "3.595% (전체 7.19%)", basis: "월 보험료 10,080원~4,591,740원" },
  { item: "장기요양보험", share: "건강보험료의 약 13.14%", basis: "보수월액의 0.9448% (전체)" },
  { item: "고용보험", share: "0.9%", basis: "상·하한 없음" },
  { item: "소득세", share: "근로소득 간이세액표", basis: "2026. 2. 27. 개정, 3월 지급분부터" },
  { item: "지방소득세", share: "소득세의 10%", basis: "소득세에 따라 결정" },
];
const RULE_CELL = { ...WRAP_CELL, textAlign: "left" } as const;

const TABLE_MANWON = Array.from({ length: (10_000 - 2_000) / 500 + 1 }, (_, i) => 2_000 + i * 500);
/** 세전 월급 rows (만원) of the main-page 월급 table; each links to its /salary/monthly/<만원>/ page. */
const MONTHLY_TABLE_MANWON = [200, 250, 300, 350, 400, 450, 500, 550, 600, 700, 800, 900, 1_000];

export const metadata: Metadata = pageMetadata({
  title: "연봉 실수령액 계산기 2026 - 4대보험·세금 뗀 월급",
  description: `2026년 4대보험 요율과 간이세액표로 연봉·월급 실수령액을 계산합니다. 연봉 4,000만원이면 월 ${formatWon(
    EX.monthlyNet,
  )}을 받습니다. 비과세, 부양가족, 퇴직금 포함 연봉까지 반영하고 연봉별 실수령액 표도 제공합니다.`,
  path: "/salary/",
  keywords: ["연봉 실수령액 계산기", "연봉 실수령액", "월급 실수령액", "2026 연봉 실수령액표", "4대보험 계산", "세후 월급"],
});

const FAQ: FaqItem[] = [
  {
    q: "연봉 4,000만원이면 실수령액은 얼마인가요?",
    a: `2026년 10월분 급여 기준으로 월 ${formatWon(EX.monthlyNet)}입니다. 세전 월급 ${formatWon(EX.monthlyGross)}에서 4대보험 ${formatWon(
      EX.insurance.total,
    )}과 소득세·지방소득세 ${formatWon(EX.tax.total)}을 뺀 금액이며, 비과세 식대 20만원과 본인 1명을 가정했습니다. 1년으로 환산하면 약 ${manwonFloorLabel(EX.annualNet)}입니다.`,
  },
  {
    q: "월급 300만원이면 실수령액은 얼마인가요?",
    a: `세전 월급 300만원(비과세 식대 20만원 포함, 본인 1명)이라면 4대보험과 세금 ${formatWon(EX_300.deductions)}을 빼고 월 ${formatWon(
      EX_300.monthlyNet,
    )}을 받습니다. 연봉으로는 3,600만원입니다.`,
  },
  {
    q: "비과세 식대는 꼭 입력해야 하나요?",
    a: `급여명세서에 식대가 따로 있다면 넣는 것이 정확합니다. 비과세 금액은 소득세와 4대보험 계산에서 모두 빠지기 때문에, 연봉 4,000만원이라면 식대 20만원이 비과세일 때 월 실수령액이 비과세가 없을 때보다 ${formatWon(
      EX.monthlyNet - EX_NO_NT.monthlyNet,
    )} 많습니다. 식대 비과세 한도는 2026년에도 월 20만원입니다.`,
  },
  {
    q: "공제대상가족 수는 어떻게 세나요?",
    a: "본인을 포함해 기본공제를 받을 수 있는 가족 수입니다. 배우자와 부양가족은 연간 소득금액이 100만원 이하(근로소득만 있으면 총급여 500만원 이하)여야 하고, 부모님은 60세 이상, 자녀는 20세 이하여야 합니다. 맞벌이 부부라면 같은 자녀를 두 사람이 함께 넣을 수 없습니다.",
  },
  {
    q: "계산 결과와 실제 급여명세서가 다른 이유는 무엇인가요?",
    a: "국민연금은 전년도 소득이나 입사 때 신고한 보수로 정한 기준소득월액에, 건강보험은 신고된 보수월액에 매기기 때문에 연봉이 오른 직후에는 실제 공제액이 계산값과 다를 수 있습니다. 상여금이 나오는 달, 회사가 다른 비과세 항목을 적용하는 경우에도 차이가 납니다. 건강보험은 매년 4월 정산, 소득세는 연말정산으로 차액이 정리됩니다.",
  },
  {
    q: "2027년에는 실수령액이 어떻게 달라지나요?",
    a: `국민연금 보험료율은 2025년 개정된 국민연금법에 따라 2027년 10%(근로자 5.0%)로 오릅니다. 다른 조건이 같다면 연봉 4,000만원의 국민연금 공제는 월 ${formatWon(
      EX.insurance.pension,
    )}에서 ${formatWon(EX_PENSION_2027)}으로 ${formatWon(
      EX_PENSION_2027 - EX.insurance.pension,
    )} 늘어납니다. 2027년 건강보험료율은 2026년 9월 건강보험정책심의위원회에서 7.19% 동결로 의결됐고(고시 전), 장기요양·고용보험 요율과 간이세액표는 2026년 10월 현재 정해지지 않았습니다.`,
  },
];

export default function SalaryPage() {
  const rows = TABLE_MANWON.map((m) => ({ m, r: salaryForManwon(m) }));
  const monthlyRows = MONTHLY_TABLE_MANWON.map((m) => ({ m, r: salaryForMonthlyManwon(m) }));
  return (
    <ToolShell
      slug="salary"
      h1="연봉 실수령액 계산기 (2026년)"
      lead={`2026년 연봉 4,000만원의 월 실수령액은 ${formatWon(
        EX.monthlyNet,
      )}(10월분 급여, 식대 20만원 비과세·본인 1명 기준)이에요. 연봉이나 월급을 넣으면 비과세, 부양가족 수, 퇴직금 포함 여부까지 반영해 4대보험과 소득세를 뺀 실수령액을 바로 계산해 드려요.`}
      basis={SALARY_BASIS}
      calculator={<SalaryCalculator />}
      faq={FAQ}
      appCategory="FinanceApplication"
    >
      <h2>2026년 실수령액 계산 기준</h2>
      <p>
        월 실수령액은 세전 월급에서 4대보험 근로자 부담분과 소득세, 지방소득세를 뺀 금액입니다. 4대보험과 소득세는 모두 식대 같은
        비과세 수당을 뺀 <strong>과세 대상 급여</strong>를 기준으로 계산합니다. 2026년에는 국민연금 보험료율이 9%에서 9.5%로,
        건강보험료율이 7.09%에서 7.19%로 올랐습니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>2026년 근로자 부담분 (회사도 같은 금액 이상을 따로 부담)</caption>
          <thead>
            <tr>
              <th scope="col">항목</th>
              <th scope="col" style={RULE_CELL}>
                근로자 부담 (기준·한도)
              </th>
            </tr>
          </thead>
          <tbody>
            {RULE_ROWS.map((row) => (
              <tr key={row.item}>
                <td>{row.item}</td>
                <td style={RULE_CELL}>
                  {row.share}
                  <span className={CELL_SUB}>{row.basis}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        끝수 처리: 국민연금은 과세 급여의 천원 미만을 버린 기준소득월액에 요율을 곱하고, 모든 보험료와 세금은 10원 미만을 버립니다.
        국민연금 기준소득월액 상·하한은 매년 7월에 바뀌며, 2026년 1~6월 급여에는 40만~637만원이 적용됩니다. 장기요양보험료는 2026년
        10월분까지 건강보험료 × (0.9448 ÷ 7.19)로 계산하고, 개정 노인장기요양보험법에 따라 11월분부터는 비율을 반올림한 13.14%를 곱해 일부
        금액에서 10원 차이가 날 수 있습니다. 계산기는 접속한 달의 규칙을 자동으로 적용합니다. 만 60세 이상이라 국민연금을 더 내지 않거나
        두루누리 지원을 받는다면 실제 공제액은 더 적습니다.
      </p>
      <p className="note">
        출처:{" "}
        {SOURCES.map((s, i) => (
          <span key={s.url}>
            {i > 0 ? ", " : null}
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.name}
            </a>
          </span>
        ))}
      </p>

      <h2>실수령액 계산 방법 (연봉 4,000만원 예시)</h2>
      <p className="formula">월 실수령액 = 세전 월급 − (국민연금 + 건강보험 + 장기요양보험 + 고용보험 + 소득세 + 지방소득세)</p>
      <p>비과세 식대 20만원, 본인 1명, 2026년 10월 급여 기준으로 차례대로 계산하면 다음과 같습니다.</p>
      <ol>
        <li>
          세전 월급: 40,000,000원 ÷ 12 = <strong>{formatWon(EX.monthlyGross)}</strong> (원 미만 버림)
        </li>
        <li>
          과세 대상 급여: {formatNumber(EX.monthlyGross)} − 200,000(식대) = <strong>{formatWon(EX.monthlyTaxable)}</strong>
        </li>
        <li>
          국민연금: 기준소득월액 {formatWon(EX.insurance.pensionBase)}(천원 미만 버림) × 4.75% ={" "}
          <strong>{formatWon(EX.insurance.pension)}</strong>
        </li>
        <li>
          건강보험: {formatNumber(EX.monthlyTaxable)} × 3.595% = <strong>{formatWon(EX.insurance.health)}</strong>
        </li>
        <li>
          장기요양보험: {formatNumber(EX.insurance.health)} × {longTermCareMultiplier(DEFAULT_PAY_MONTH)} ={" "}
          <strong>{formatWon(EX.insurance.longTermCare)}</strong>
        </li>
        <li>
          고용보험: {formatNumber(EX.monthlyTaxable)} × 0.9% = <strong>{formatWon(EX.insurance.employment)}</strong>
        </li>
        <li>
          소득세: 간이세액표 {taxBracketLabel(EX.monthlyTaxable)} 구간, 공제대상가족 1명 칸 ={" "}
          <strong>{formatWon(EX.tax.incomeTax)}</strong>
        </li>
        <li>
          지방소득세: {formatNumber(EX.tax.incomeTax)} × 10% = <strong>{formatWon(EX.tax.localTax)}</strong>
        </li>
        <li>
          실수령액: {formatNumber(EX.monthlyGross)} − {formatNumber(EX.deductions)}(공제 합계) ={" "}
          <strong>{formatWon(EX.monthlyNet)}</strong>
        </li>
      </ol>
      <p>
        각 보험료는 곱한 뒤 10원 미만을 버립니다. 공제액은 세전 월급의 약 {formatNumber(EX.deductionRate * 100, 1)}%이고, 1년으로 환산한
        실수령액은 약 {manwonFloorLabel(EX.annualNet)}입니다. 연봉이 같아도 비과세 금액과 부양가족 수에 따라 실수령액이
        달라지므로 위 계산기에 본인 조건을 넣어 확인하세요.
      </p>

      <h2>2026 연봉 실수령액 표 (2,000만~1억원)</h2>
      <p>
        비과세 식대 20만원, 본인 1명, 간이세액 100%, 2026년 10월 급여 기준입니다. 연봉을 누르면 해당 연봉의 공제 내역과 부양가족별
        실수령액을 볼 수 있습니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">연봉</th>
              <th scope="col">세전 월급</th>
              <th scope="col">4대보험</th>
              <th scope="col">소득세·지방세</th>
              <th scope="col">월 실수령액</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ m, r }) => (
              <tr key={m}>
                <td>
                  <Link href={`/salary/${m}/`}>{manwonLabel(m)}</Link>
                </td>
                <td>{formatNumber(r.monthlyGross)}</td>
                <td>{formatNumber(r.insurance.total)}</td>
                <td>{formatNumber(r.tax.total)}</td>
                <td>
                  <strong>{formatNumber(r.monthlyNet)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        단위: 원. 연봉 약 {formatNumber(PENSION_CAP_ANNUAL_MANWON)}만원(비과세 20만원 기준)부터는 국민연금이 기준소득월액 상한(
        {formatNumber(PENSION_CAP / 10_000)}만원)에 걸려 월 {formatWon(CAP_PENSION)}으로 더 늘지 않습니다.
      </p>

      <h2>2026 월급 실수령액 표 (세전 200만~1,000만원)</h2>
      <p>
        연봉 대신 세전 월급으로 찾는 경우를 위한 표입니다. 월급에 비과세 식대 20만원이 들어 있고 본인 1명, 2026년 10월분 급여 기준입니다.
        월급을 누르면 비과세 여부와 부양가족에 따른 실수령액, 연봉 환산, 2027년 예상액을 볼 수 있습니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">세전 월급</th>
              <th scope="col">4대보험</th>
              <th scope="col">소득세·지방세</th>
              <th scope="col">월 실수령액</th>
            </tr>
          </thead>
          <tbody>
            {monthlyRows.map(({ m, r }) => (
              <tr key={m}>
                <td>
                  <Link href={monthlyPagePath(m)}>{manwonLabel(m)}</Link>
                </td>
                <td>{formatNumber(r.insurance.total)}</td>
                <td>{formatNumber(r.tax.total)}</td>
                <td>
                  <strong>{formatNumber(r.monthlyNet)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        단위: 원. 세전 월급 {formatNumber(MONTHLY_PAGE_MANWON[0])}만~600만원은 10만원, 그 위로 1,000만원까지는 50만원 간격으로 따로 정리한
        페이지가 있습니다.
      </p>

      <h2>간이세액표와 연말정산</h2>
      <p>
        매달 떼는 소득세는 소득세법 시행령에 붙은 <strong>근로소득 간이세액표</strong>에서 월 과세 급여와 공제대상가족 수로 찾은
        금액입니다. 1년 치 세금은 다음 해 2월 연말정산에서 신용카드 사용액, 보험료, 의료비, 교육비, 연금저축 같은 공제를 반영해 확정됩니다.
        그래서 매달 낸 세금이 실제 세금보다 많으면 환급을 받고, 적으면 2월 급여에서 더 떼어 갑니다.
      </p>
      <p>
        근로자는 원천징수 비율을 80%, 100%, 120% 가운데 고를 수 있습니다(소득세법 시행령 제194조). 회사에 소득세 원천징수세액
        조정신청서를 내면 이후 지급되는 급여부터 그해 말까지 적용됩니다. 80%를 고르면 매달 실수령액이 늘지만 연말정산 환급이 줄거나 추가
        납부가 생길 수 있고, 120%는 반대로 매달 더 떼고 연말정산에서 돌려받는 방식입니다.
      </p>
      <p>
        공제대상가족 중 8세 이상 20세 이하 자녀가 있으면 간이세액표 금액에서 자녀 1명은 20,830원, 2명은 45,830원, 3명부터는 1명당 33,330원을
        더 뺍니다. 이 금액은 2026년 3월 지급분부터 적용되었습니다.
      </p>

      <h2>비과세 소득이 실수령액을 늘리는 이유</h2>
      <p>
        비과세 수당은 소득세뿐 아니라 국민연금, 건강보험, 고용보험 계산에서도 빠집니다. 연봉 4,000만원 기준으로 비과세가 없으면 월
        실수령액은 {formatWon(EX_NO_NT.monthlyNet)}, 식대 20만원이 비과세이면 {formatWon(EX.monthlyNet)}으로{" "}
        {formatWon(EX.monthlyNet - EX_NO_NT.monthlyNet)} 차이가 납니다. 자주 쓰는 비과세 항목은 다음과 같습니다.
      </p>
      <ul>
        <li>
          <strong>식대</strong>: 회사가 식사를 현물로 주지 않을 때 월 20만원까지. 2026년에도 한도는 20만원입니다.
        </li>
        <li>
          <strong>출산·보육수당</strong>: 6세 이하 자녀 보육수당은 2026년부터 자녀 1명당 월 20만원까지(2025년까지는 근로자 1명당 월
          20만원).
        </li>
        <li>
          <strong>자가운전보조금</strong>: 본인 차량을 업무에 쓰고 실제 여비 대신 받는 돈, 월 20만원까지.
        </li>
        <li>
          <strong>기타</strong>: 연구보조비(월 20만원), 생산직 근로자의 연장·야간·휴일근로수당 일부, 국외근로소득 등.
        </li>
      </ul>
      <p>
        회사가 비과세로 처리하는지는 급여명세서에서 확인할 수 있습니다. 잘 모르겠다면 가장 흔한 식대 20만원을 그대로 두고 계산하면 됩니다.
      </p>

      <h2>퇴직금 포함 연봉이란</h2>
      <p>
        퇴직금 포함 연봉은 연봉 총액에 1년 치 퇴직금(약 한 달 치 월급)이 들어 있는 계약입니다. 이때 매달 받는 월급은 연봉을 13으로 나눈
        금액이고, 나머지 13분의 1은 퇴직할 때 퇴직금으로 받습니다. 연봉 4,000만원이 퇴직금 포함이라면 세전 월급은{" "}
        {formatWon(EX_SEV.monthlyGross)}, 실수령액은 {formatWon(EX_SEV.monthlyNet)}으로 퇴직금 별도일 때보다 월{" "}
        {formatWon(EX.monthlyNet - EX_SEV.monthlyNet)} 적습니다.
      </p>
      <p>
        퇴직금은 퇴직할 때 지급하는 것이 원칙이라, 매달 월급에 퇴직금을 나눠 얹어 주는 약정은 퇴직금 지급으로 인정되지 않는 것이 판례의
        태도입니다. 연봉 계약서에 퇴직금 포함 여부가 적혀 있으니 계산 전에 확인하세요.
      </p>

      <h2>연봉별 실수령액 바로 보기</h2>
      <SalaryLinks />

      <h2>월급별 실수령액 바로 보기</h2>
      <SalaryMonthlyLinks />
    </ToolShell>
  );
}
