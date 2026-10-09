import type { Metadata } from "next";
import Link from "next/link";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber, formatPercent, formatWon, manwonLabel } from "@/lib/format";
import {
  calcFourInsurance,
  COMPANY_SIZES,
  estimate2027,
  FOUR_INSURANCE_PAGE_MANWON,
  INDUSTRIAL_AVG_RATE,
  LTC_ROUNDED_FROM,
  PAGE_PAY_MONTH,
  pageResult,
} from "@/lib/calc/four-insurance";
import { FourInsuranceCalculator } from "./FourInsuranceCalculator";
import { FourInsuranceLinks } from "./FourInsuranceLinks";
import { InsuranceTable } from "./InsuranceTable";
import { FOUR_INSURANCE_BASIS, SOURCES } from "./sources";

// Worked examples from the same engine as the calculator (2026년 10월분, 비과세 없음, 150명 미만, 산재 1.47%).
const EX = pageResult(3_000_000);
const EX_2027 = estimate2027(3_000_000);
const EX_SPLIT = pageResult(4_321_987);
const CAP_H1 = pageResult(7_000_000, { payMonth: "2026-03" });
const CAP_H2 = pageResult(7_000_000);
const LTC_OCT = pageResult(5_000_000);
const LTC_NOV = pageResult(5_000_000, { payMonth: LTC_ROUNDED_FROM });
/** Rough monthly 퇴직금 accrual: 월 급여 ÷ 12, rounded to 10원. Not part of laborCost. */
const EX_SEVERANCE = Math.round(EX.monthlyGross / 120) * 10;

/** 2026 rate table: rate columns stay short; the base/limit goes on a grey second line under the item. */
const RATE_ROWS = [
  { item: "국민연금", basis: "기준소득월액 41만~659만원 (7월분부터), 1~6월분 40만~637만원", employee: "4.75%", employer: "4.75%" },
  { item: "건강보험", basis: "전체 7.19%, 한쪽 월 10,080원~4,591,740원", employee: "3.595%", employer: "3.595%" },
  { item: "장기요양보험", basis: "건강보험료의 약 13.14% (전체 0.9448%)", employee: "0.4724%", employer: "0.4724%" },
  { item: "고용보험 실업급여", basis: "상·하한 없음", employee: "0.9%", employer: "0.9%" },
  { item: "고용안정·직업능력개발", basis: "고용보험, 사업장 규모별", employee: "-", employer: "0.25~0.85%" },
  { item: "산재보험", basis: "업종별, 출퇴근재해 0.06% 포함", employee: "-", employer: "평균 1.47%" },
];
const WRAP_CELL = { whiteSpace: "normal" } as const;
const CELL_SUB = "mt-0.5 block text-[0.8125rem] font-normal text-muted";
/** 국민연금 근로자 몫 상한 (기준소득월액 6,590,000원 × 4.75%). */
const PENSION_MAX = calcFourInsurance({ monthlyGross: 6_590_000, payMonth: PAGE_PAY_MONTH }).pension.employee;

export const metadata: Metadata = pageMetadata({
  title: "4대보험 계산기 2026 - 근로자·회사 부담 요율표",
  description: `2026년 요율로 4대보험료를 근로자와 회사 몫으로 나눠 계산합니다. 월급 300만원이면 근로자 ${formatWon(
    EX.employeeTotal,
  )}, 회사 ${formatWon(EX.employerTotal)}(산재 평균 1.47% 포함)을 냅니다. 국민연금·건강·장기요양·고용·산재보험 요율표도 정리했습니다.`,
  path: "/four-insurance/",
  keywords: ["4대보험 계산기", "4대보험 요율", "2026 4대보험 요율표", "4대보험 사업주 부담", "4대보험 회사 부담", "산재보험료율", "인건비 계산"],
});

const FAQ: FaqItem[] = [
  {
    q: "월급 300만원이면 4대보험 회사 부담은 얼마인가요?",
    a: `2026년 10월분 기준으로 회사는 매달 ${formatWon(EX.employerTotal)}을 냅니다. 국민연금 ${formatWon(EX.pension.employer)}, 건강보험 ${formatWon(
      EX.health.employer,
    )}, 장기요양보험 ${formatWon(EX.longTermCare.employer)}, 고용보험 ${formatWon(EX.employment.employer)}(150명 미만), 산재보험 ${formatWon(
      EX.industrial.employer,
    )}(평균 요율 1.47%)을 더한 금액으로 월급의 약 ${formatPercent(EX.employerTotal / EX.pay, 1)}입니다. 근로자는 ${formatWon(
      EX.employeeTotal,
    )}을 냅니다.`,
  },
  {
    q: "2026년 4대보험 요율은 얼마인가요?",
    a: "국민연금 9.5%(근로자·회사 각 4.75%), 건강보험 7.19%(각 3.595%), 장기요양보험은 건강보험료의 약 13.14%(각자 같은 금액), 고용보험 실업급여 1.8%(각 0.9%)입니다. 회사는 여기에 고용안정·직업능력개발 보험료 0.25~0.85%와 업종별 산재보험료(평균 1.47%)를 더 냅니다.",
  },
  {
    q: "비과세 식대도 4대보험료 계산에 들어가나요?",
    a: "아닙니다. 식대(월 20만원까지), 자가운전보조금, 6세 이하 자녀 보육수당 같은 비과세 소득은 국민연금 기준소득월액, 건강보험 보수월액, 고용·산재보험 보수에서 모두 빠집니다. 그래서 같은 월급이라도 비과세 수당이 있으면 4대보험료가 줄어듭니다.",
  },
  {
    q: "산재보험료는 근로자도 내나요?",
    a: "아닙니다. 산재보험료는 회사가 전액 냅니다. 요율은 사업 종류마다 다르고, 2026년 전 업종 평균은 출퇴근재해 요율 0.06%를 포함해 1.47%입니다. 내 사업장 요율은 근로복지공단 보험료 고지서에서 확인할 수 있습니다.",
  },
  {
    q: "2027년에는 4대보험료가 얼마나 오르나요?",
    a: `국민연금 보험료율은 법에 따라 2027년 10%(근로자·회사 각 5.0%)로 오릅니다. 건강보험료율은 2026년 9월 8일 건강보험정책심의위원회에서 7.19% 동결을 의결했고(고시 전), 장기요양·고용보험 요율은 아직 정해지지 않았습니다. 나머지를 2026년 값으로 가정하면 월급 300만원의 근로자 부담은 ${formatWon(
      EX.employeeTotal,
    )}에서 약 ${formatWon(EX_2027.employeeTotal)}으로 늘어날 것으로 예상됩니다.`,
  },
  {
    q: "계산 결과가 급여명세서와 다른 이유는 무엇인가요?",
    a: "4대보험료는 이번 달 실제 월급이 아니라 신고된 보수로 매깁니다. 국민연금은 매년 7월 전년도 소득으로 정한 기준소득월액을, 건강보험은 신고된 보수월액을 쓰고 다음 해 4월에 정산합니다. 고용·산재보험도 다음 해 보수총액 신고로 정산하므로, 연봉이 오른 직후나 상여금이 있는 달에는 계산값과 차이가 납니다.",
  },
];

export default function FourInsurancePage() {
  const tableRows = FOUR_INSURANCE_PAGE_MANWON.map((m) => ({ m, r: pageResult(m * 10_000) }));
  const sizeRows = COMPANY_SIZES.map((s) => ({ s, r: pageResult(3_000_000, { size: s.value }) }));

  return (
    <ToolShell
      slug="four-insurance"
      h1="4대보험 계산기 (2026년 근로자·회사 부담)"
      lead={`월급 300만원이면 2026년 10월분 4대보험료는 근로자 ${formatWon(EX.employeeTotal)}, 회사 ${formatWon(
        EX.employerTotal,
      )}이에요. 월 급여나 연봉을 넣으면 국민연금, 건강·장기요양, 고용, 산재보험료를 근로자와 회사 몫으로 나눠 계산해 드려요.`}
      basis={FOUR_INSURANCE_BASIS}
      calculator={<FourInsuranceCalculator />}
      faq={FAQ}
      appCategory="FinanceApplication"
    >
      <h2>2026년 4대보험 요율표 (근로자·회사)</h2>
      <p>
        4대보험은 국민연금, 건강보험(장기요양보험 포함), 고용보험, 산재보험입니다. 국민연금·건강보험·장기요양보험·고용보험 실업급여는
        근로자와 회사가 같은 금액을 나눠 내고, 고용보험의 고용안정·직업능력개발 보험료와 산재보험료는 회사만 냅니다. 2026년에는
        국민연금 보험료율이 9%에서 9.5%로, 건강보험료율이 7.09%에서 7.19%로 올랐습니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>2026년 4대보험 요율 (보수월액 기준)</caption>
          <thead>
            <tr>
              <th scope="col">항목 (기준·한도)</th>
              <th scope="col">근로자</th>
              <th scope="col">회사</th>
            </tr>
          </thead>
          <tbody>
            {RATE_ROWS.map((row) => (
              <tr key={row.item}>
                <td style={WRAP_CELL}>
                  {row.item}
                  <span className={CELL_SUB}>{row.basis}</span>
                </td>
                <td>{row.employee}</td>
                <td>{row.employer}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        보수월액은 세전 월 급여에서 식대 같은 비과세 소득을 뺀 금액입니다. 국민연금은 보수월액의 천원 미만을 버린 기준소득월액에
        요율을 곱하고, 모든 보험료는 근로자 몫과 회사 몫을 따로 계산해 각각 10원 미만을 버립니다.
      </p>

      <h2>4대보험 계산 방법 (월급 300만원 예시)</h2>
      <p className="formula">보험료 = 보수월액 × 보험료율 (근로자·회사 몫 각각 10원 미만 버림)</p>
      <p>비과세 없이 월급 300만원, 150명 미만 사업장, 2026년 10월분 기준으로 계산하면 다음과 같습니다.</p>
      <ol>
        <li>
          국민연금: 3,000,000 × 4.75% = <strong>{formatWon(EX.pension.employee)}</strong> (회사도 {formatWon(EX.pension.employer)})
        </li>
        <li>
          건강보험: 3,000,000 × 3.595% = <strong>{formatWon(EX.health.employee)}</strong> (회사도 같은 금액)
        </li>
        <li>
          장기요양보험: {formatNumber(EX.health.employee)} × 0.9448 ÷ 7.19 = <strong>{formatWon(EX.longTermCare.employee)}</strong> (회사도
          같은 금액)
        </li>
        <li>
          고용보험: 근로자 3,000,000 × 0.9% = <strong>{formatWon(EX.employment.employee)}</strong>, 회사는 실업급여{" "}
          {formatWon(EX.unemployment.employer)} + 고용안정·직능 0.25% {formatWon(EX.jobStability.employer)} ={" "}
          <strong>{formatWon(EX.employment.employer)}</strong>
        </li>
        <li>
          산재보험: 3,000,000 × 1.47% = <strong>{formatWon(EX.industrial.employer)}</strong> (회사만)
        </li>
      </ol>
      <p>
        합계는 근로자 <strong>{formatWon(EX.employeeTotal)}</strong>, 회사 <strong>{formatWon(EX.employerTotal)}</strong>입니다. 근로자는
        월급의 {formatPercent(EX.employeeTotal / EX.pay, 1)}를 4대보험으로 내고, 회사는 월급 외에 {formatPercent(EX.employerTotal / EX.pay, 1)}를
        더 부담해 급여와 4대보험을 합친 월 인건비는 {formatWon(EX.laborCost)}이 됩니다. 근로자 몫은 월급에서 공제되고, 여기에 소득세가
        더해진 실수령액은 <Link href="/salary/">연봉 실수령액 계산기</Link>에서 확인할 수 있습니다.
      </p>
      <p>
        이 월 인건비에는 퇴직금이 빠져 있습니다. 주 15시간 이상 일하며 1년 이상 근무한 근로자에게는 근속 1년마다 30일분 평균임금 이상의 퇴직금을 줘야 하므로,
        회사는 매달 월 급여의 약 1/12(월급 300만원이면 약 {formatWon(EX_SEVERANCE)})을 더 적립해 두는 것이 안전합니다. 산재보험료와 함께
        내는 임금채권부담금도 들어 있지 않습니다. 근속기간별 퇴직금은 <Link href="/severance/">퇴직금 계산기</Link>에서 계산할 수
        있습니다.
      </p>
      <InsuranceTable r={EX} caption="월급 300만원 4대보험료 (2026년 10월분, 단위: 원)" />

      <h2>사업장 규모별 고용보험 회사 부담</h2>
      <p>
        고용보험 실업급여 보험료는 근로자와 회사가 0.9%씩 내지만, 고용안정·직업능력개발 보험료는 회사만 내고 상시 근로자 수에 따라
        요율이 달라집니다. 두 보험료는 따로 계산해 각각 10원 미만을 버립니다. 예를 들어 보수월액 4,321,987원이면 실업급여{" "}
        {formatWon(EX_SPLIT.unemployment.employer)} + 고용안정·직능 {formatWon(EX_SPLIT.jobStability.employer)} ={" "}
        {formatWon(EX_SPLIT.employment.employer)}입니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>월급 300만원일 때 회사가 내는 고용보험료</caption>
          <thead>
            <tr>
              <th scope="col">사업장 규모</th>
              <th scope="col">고용안정·직능</th>
              <th scope="col">회사 고용보험료</th>
              <th scope="col">회사 부담 합계</th>
            </tr>
          </thead>
          <tbody>
            {sizeRows.map(({ s, r }) => (
              <tr key={s.value}>
                <td className="text-cell">{s.label}</td>
                <td>{formatNumber(s.rate / 100, 2)}%</td>
                <td>{formatNumber(r.employment.employer)}</td>
                <td>{formatNumber(r.employerTotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        우선지원대상기업은 업종별 상시 근로자 수 기준(제조업 500명 이하 등)을 충족하는 중소기업입니다. 회사 부담 합계에는 산재보험
        평균 요율 1.47%를 넣었습니다.
      </p>

      <h2>기준 월에 따라 달라지는 금액</h2>
      <ul>
        <li>
          <strong>국민연금 상·하한</strong>: 기준소득월액 상한과 하한은 매년 7월에 바뀝니다. 2026년 1~6월분은 40만~637만원, 7월분부터는
          41만~659만원입니다. 월급 700만원이면 근로자 몫이 1~6월분 {formatWon(CAP_H1.pension.employee)}, 7월분부터{" "}
          {formatWon(CAP_H2.pension.employee)}입니다.
        </li>
        <li>
          <strong>장기요양보험 끝수</strong>: 2026년 10월분까지는 건강보험료 × 0.9448 ÷ 7.19로 계산하고, 개정 노인장기요양보험법(법률
          제21690호)에 따라 11월분부터는 비율을 반올림한 13.14%를 곱합니다. 월급 500만원이면 10월분 {formatWon(LTC_OCT.longTermCare.employee)},
          11월분부터 {formatWon(LTC_NOV.longTermCare.employee)}으로 10원 차이가 납니다.
        </li>
      </ul>
      <p>계산기는 접속한 달의 규칙을 자동으로 적용하며, ‘적용 기준 월’에서 다른 기간을 골라 비교할 수도 있습니다.</p>

      <h2>산재보험료율 확인 방법</h2>
      <p>
        산재보험료는 회사가 전액 냅니다. 고용노동부가 2025년 12월 31일 고시한 2026년 평균 산재보험료율은 1.47%로 2025년과 같고, 이는
        사업 종류별 요율에 전 업종 공통인 출퇴근재해 요율 0.06%(1천분의 0.6)를 더한 평균입니다. 실제 요율은 업종에 따라 크게 다르므로
        근로복지공단 보험료 고지서나 고용·산재보험 토탈서비스에서 사업장 요율을 확인해 계산기에 넣으세요. 산재보험료와 함께 걷는
        임금채권부담금과 석면피해구제분담금은 이 계산에 넣지 않았습니다.
      </p>

      <h2>계산값과 실제 고지액이 다를 수 있는 경우</h2>
      <ul>
        <li>
          <strong>신고 보수 기준</strong>: 국민연금은 매년 7월 전년도 소득으로 정한 기준소득월액, 건강보험은 신고된 보수월액에 매기고
          다음 해 4월에 정산합니다. 고용·산재보험도 보수총액 신고로 정산합니다.
        </li>
        <li>
          <strong>나이</strong>: 만 60세가 되면 국민연금 사업장가입자에서 빠집니다. 65세 이후 새로 고용된 사람은 실업급여 보험료를
          내지 않지만 회사의 고용안정·직능 보험료는 그대로입니다.
        </li>
        <li>
          <strong>두루누리 지원</strong>: 근로자 10명 미만 사업장에 새로 가입한 저임금 근로자는 국민연금·고용보험료의 80%를 지원받을 수
          있습니다. 보수 기준 등 요건은 근로복지공단에서 확인하세요.
        </li>
      </ul>

      <h2>월급별 4대보험료 표</h2>
      <p>
        비과세 없음, 150명 미만 사업장, 산재 평균 {INDUSTRIAL_AVG_RATE}%, 2026년 10월분 기준입니다. 월급을 누르면 항목별 금액과
        사업장 규모별 회사 부담을 볼 수 있습니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">월급</th>
              <th scope="col">근로자 부담</th>
              <th scope="col">회사 부담</th>
              <th scope="col">월 인건비</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map(({ m, r }) => (
              <tr key={m}>
                <td>
                  <Link href={`/four-insurance/${m}/`}>{manwonLabel(m)}</Link>
                </td>
                <td>{formatNumber(r.employeeTotal)}</td>
                <td>{formatNumber(r.employerTotal)}</td>
                <td>{formatNumber(r.laborCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        단위: 원. 월 인건비는 월급에 회사 부담을 더한 값이며 퇴직금 적립분은 뺐습니다. 월급이 659만원을 넘으면 국민연금은 근로자·회사
        각각 {formatWon(PENSION_MAX)}에서 더 늘지 않습니다.
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

      <h2>월급별 4대보험료 바로 보기</h2>
      <FourInsuranceLinks />
    </ToolShell>
  );
}
