import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber, formatPercent, formatWon, manwonLabel } from "@/lib/format";
import {
  COMPANY_SIZES,
  estimate2027,
  FOUR_INSURANCE_PAGE_MANWON,
  LTC_ROUNDED_FROM,
  pageResult,
} from "@/lib/calc/four-insurance";
import { FourInsuranceCalculator } from "../FourInsuranceCalculator";
import { FourInsuranceLinks } from "../FourInsuranceLinks";
import { InsuranceTable } from "../InsuranceTable";
import { FOUR_INSURANCE_PAGE_BASIS } from "../sources";

// Only the listed pay levels exist; anything else is a 404 (required for static export).
export const dynamicParams = false;

export function generateStaticParams() {
  return FOUR_INSURANCE_PAGE_MANWON.map((m) => ({ manwon: String(m) }));
}

type Props = { params: Promise<{ manwon: string }> };

function parse(raw: string): number | null {
  const n = Number(raw);
  return FOUR_INSURANCE_PAGE_MANWON.includes(n) ? n : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m = parse((await params).manwon);
  if (m === null) return {};
  const r = pageResult(m * 10_000);
  const label = manwonLabel(m);
  return pageMetadata({
    title: `월급 ${label} 4대보험 - 근로자 ${formatWon(r.employeeTotal)}·회사 ${formatWon(r.employerTotal)}`,
    description: `2026년 10월분 기준 월급 ${label}의 4대보험료는 근로자 ${formatWon(r.employeeTotal)}, 회사 ${formatWon(
      r.employerTotal,
    )}입니다. 국민연금 ${formatWon(r.pension.employee)}, 건강보험 ${formatWon(r.health.employee)}, 장기요양 ${formatWon(
      r.longTermCare.employee,
    )}, 고용보험 ${formatWon(r.employment.employee)}과 회사 몫 산재보험까지 항목별로 정리했습니다.`,
    path: `/four-insurance/${m}/`,
    keywords: [`월급 ${m}만원 4대보험`, `월급 ${label} 4대보험료`, `${m}만원 4대보험 회사 부담`, `월급 ${m} 4대보험`, "4대보험 계산기"],
  });
}

const PERIODS = [
  { key: "h1", label: "2026년 1~6월분", payMonth: "2026-03" },
  { key: "q3", label: "2026년 7~10월분", payMonth: "2026-10" },
  { key: "q4", label: "2026년 11~12월분", payMonth: LTC_ROUNDED_FROM },
] as const;

export default async function FourInsuranceAmountPage({ params }: Props) {
  const m = parse((await params).manwon);
  if (m === null) notFound();

  const won = m * 10_000;
  const label = manwonLabel(m);
  const r = pageResult(won);
  const e27 = estimate2027(won);
  const periods = PERIODS.map((p) => ({ ...p, r: pageResult(won, { payMonth: p.payMonth }) }));
  const sizes = COMPANY_SIZES.map((s) => ({ s, r: pageResult(won, { size: s.value }) }));
  const idx = FOUR_INSURANCE_PAGE_MANWON.indexOf(m);
  const neighbors = FOUR_INSURANCE_PAGE_MANWON.slice(Math.max(0, idx - 3), idx + 4).map((n) => ({ n, r: pageResult(n * 10_000) }));
  const nov = periods[2].r;
  const h1Pension = periods[0].r.pension.employee;
  const afterInsurance = r.monthlyGross - r.employeeTotal;
  /** Rough monthly 퇴직금 accrual (월 급여 ÷ 12, rounded to 10원); not part of laborCost. */
  const severance = Math.round(won / 120) * 10;

  const pensionText =
    r.pensionLimit === "cap"
      ? `월급이 국민연금 기준소득월액 상한 659만원을 넘어 국민연금은 상한액인 ${formatWon(r.pension.employee)}만 냅니다.`
      : `국민연금은 기준소득월액 ${formatWon(r.pensionBase)}에 4.75%를 곱한 ${formatWon(r.pension.employee)}입니다.`;

  const faq: FaqItem[] = [
    {
      q: `월급 ${label}이면 4대보험료는 얼마인가요?`,
      a: `2026년 10월분 기준으로 근로자는 매달 ${formatWon(r.employeeTotal)}을 냅니다. 국민연금 ${formatWon(r.pension.employee)}, 건강보험 ${formatWon(
        r.health.employee,
      )}, 장기요양보험 ${formatWon(r.longTermCare.employee)}, 고용보험 ${formatWon(r.employment.employee)}을 더한 금액이며 비과세 수당이 없다고 가정했습니다.`,
    },
    {
      q: `월급 ${label}이면 회사 부담 4대보험료는 얼마인가요?`,
      a: `150명 미만 사업장이고 산재보험료율이 평균 1.47%라면 회사는 ${formatWon(r.employerTotal)}을 냅니다. 회사가 근로자보다 더 내는 부분은 고용안정·직능 보험료 ${formatWon(
        r.jobStability.employer,
      )}과 산재보험료 ${formatWon(r.industrial.employer)}입니다. 급여와 4대보험을 합친 월 인건비는 ${formatWon(
        r.laborCost,
      )}이고, 1년 이상 근무하면 줘야 하는 퇴직금 적립분(월 약 ${formatWon(severance)})은 여기에 들어 있지 않습니다.`,
    },
    {
      q: `월급 ${label}에서 4대보험을 빼면 얼마인가요?`,
      a: `${formatWon(r.monthlyGross)} − ${formatWon(r.employeeTotal)} = ${formatWon(
        afterInsurance,
      )}입니다. 실제 통장에 들어오는 돈은 여기서 소득세와 지방소득세를 더 뺀 금액이라 부양가족 수에 따라 달라집니다.`,
    },
    {
      q: `2027년에는 월급 ${label}의 4대보험료가 얼마로 바뀌나요?`,
      a: `국민연금이 근로자·회사 각 5.0%로 오르고(법정 인상), 건강보험료율은 7.19% 동결이 의결된 상태(고시 전)입니다. 장기요양·고용보험 요율과 산재보험료율은 아직 정해지지 않아 2026년 값(산재 평균 1.47%)으로 가정하면 2027년 1월분 근로자 부담은 약 ${formatWon(
        e27.employeeTotal,
      )}, 회사 부담은 약 ${formatWon(e27.employerTotal)}으로 예상됩니다.`,
    },
  ];

  return (
    <ToolShell
      slug="four-insurance"
      path={`/four-insurance/${m}/`}
      extraCrumbs={[{ name: `월급 ${label}`, path: `/four-insurance/${m}/` }]}
      h1={`월급 ${label} 4대보험: 근로자 ${formatWon(r.employeeTotal)}, 회사 ${formatWon(r.employerTotal)} (2026년)`}
      lead={`월급 ${label}(비과세 없음)이면 2026년 10월분 4대보험료로 근로자가 ${formatWon(r.employeeTotal)}, 회사가 ${formatWon(
        r.employerTotal,
      )}을 내요. 퇴직금을 빼고 급여와 4대보험만 더한 회사 인건비는 월 ${formatWon(r.laborCost)}이에요.`}
      basis={FOUR_INSURANCE_PAGE_BASIS}
      calculator={<FourInsuranceCalculator initialWon={won} />}
      faq={faq}
      appCategory="FinanceApplication"
    >
      <h2>월급 {label} 4대보험 항목별 금액</h2>
      <p>
        월급 {label}에 비과세 수당이 없다면 보수월액도 {formatWon(r.pay)}입니다. {pensionText} 건강보험은 {formatNumber(r.pay)} × 3.595% ={" "}
        {formatWon(r.health.employee)}, 장기요양보험은 건강보험료 × 0.9448 ÷ 7.19 = {formatWon(r.longTermCare.employee)}, 고용보험은{" "}
        {formatNumber(r.pay)} × 0.9% = {formatWon(r.employment.employee)}입니다. 회사는 같은 금액에 고용안정·직능 보험료{" "}
        {formatWon(r.jobStability.employer)}(0.25%)과 산재보험료 {formatWon(r.industrial.employer)}(평균 1.47%)을 더 냅니다.
      </p>
      <InsuranceTable r={r} caption={`월급 ${label} 4대보험료 (2026년 10월분, 150명 미만, 단위: 원)`} />
      <p>
        근로자 부담은 월급의 {formatPercent(r.employeeTotal / r.pay, 2)}, 회사 부담은 {formatPercent(r.employerTotal / r.pay, 2)}입니다.
        월급에서 4대보험만 빼면 {formatWon(afterInsurance)}이고, 소득세까지 뺀 실수령액은{" "}
        <Link href="/salary/">연봉 실수령액 계산기</Link>에서 확인할 수 있습니다.
      </p>
      <p>
        회사 입장에서 월급 {label}에 회사 부담 4대보험료를 더한 월 인건비는 {formatWon(r.laborCost)}입니다. 1년 이상 근무하면 퇴직금도
        줘야 하므로 매달 월 급여의 약 1/12인 {formatWon(severance)} 정도를 더 적립해 두면 실제 비용에 가깝습니다. 산재보험료와 함께
        내는 임금채권부담금은 이 계산에 넣지 않았습니다. 정확한 퇴직금은 <Link href="/severance/">퇴직금 계산기</Link>에서 확인할 수
        있습니다.
      </p>

      <h2>사업장 규모별 회사 부담 (월급 {label})</h2>
      <div className="table-wrap">
        <table className="data-table">
          <caption>고용안정·직업능력개발 보험료율만 규모에 따라 다릅니다 (단위: 원)</caption>
          <thead>
            <tr>
              <th scope="col">사업장 규모</th>
              <th scope="col">회사 고용보험료</th>
              <th scope="col">회사 부담 합계</th>
              <th scope="col">월 인건비</th>
            </tr>
          </thead>
          <tbody>
            {sizes.map(({ s, r: x }) => (
              <tr key={s.value} className={s.value === "s" ? "is-current" : undefined}>
                <td className="text-cell">
                  {s.label} ({formatNumber(s.rate / 100, 2)}%)
                </td>
                <td>{formatNumber(x.employment.employer)}</td>
                <td>{formatNumber(x.employerTotal)}</td>
                <td>{formatNumber(x.laborCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>기준 월에 따라 달라지는 금액</h2>
      <p>
        국민연금 기준소득월액 상한은 2026년 7월분부터 637만원에서 659만원으로 올랐고, 장기요양보험료는 11월분부터 건강보험료에 13.14%를
        곱합니다.{" "}
        {h1Pension === r.pension.employee && nov.longTermCare.employee === r.longTermCare.employee
          ? `월급 ${label}은 두 변경의 영향을 받지 않아 2026년 내내 같은 금액입니다.`
          : `월급 ${label}은 기간에 따라 아래처럼 달라집니다.`}{" "}
        2027년 행은 국민연금 5.0%(법정 인상)와 7.19%로 동결이 의결된 건강보험료율(고시 전)을 반영하고, 아직 정해지지 않은 장기요양·고용보험
        요율과 산재보험료율(2026년 평균 1.47%)은 2026년과 같다고 가정한 예상입니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>월급 {label}의 기간별 4대보험료 (150명 미만, 산재 1.47%, 단위: 원)</caption>
          <thead>
            <tr>
              <th scope="col">기간</th>
              <th scope="col">국민연금</th>
              <th scope="col">장기요양</th>
              <th scope="col">근로자 합계</th>
              <th scope="col">회사 합계</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p.key} className={p.key === "q3" ? "is-current" : undefined}>
                <td>{p.label}</td>
                <td>{formatNumber(p.r.pension.employee)}</td>
                <td>{formatNumber(p.r.longTermCare.employee)}</td>
                <td>{formatNumber(p.r.employeeTotal)}</td>
                <td>{formatNumber(p.r.employerTotal)}</td>
              </tr>
            ))}
            <tr>
              <td>2027년 1월분 (예상)</td>
              <td>{formatNumber(e27.pension.employee)}</td>
              <td>{formatNumber(e27.longTermCare.employee)}</td>
              <td>{formatNumber(e27.employeeTotal)}</td>
              <td>{formatNumber(e27.employerTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>주변 월급 4대보험료</h2>
      <div className="table-wrap">
        <table className="data-table">
          <caption>2026년 10월분, 비과세 없음, 150명 미만, 산재 1.47% (단위: 원)</caption>
          <thead>
            <tr>
              <th scope="col">월급</th>
              <th scope="col">근로자 부담</th>
              <th scope="col">회사 부담</th>
              <th scope="col">월 인건비</th>
            </tr>
          </thead>
          <tbody>
            {neighbors.map(({ n, r: x }) => (
              <tr key={n} className={n === m ? "is-current" : undefined}>
                <td>{n === m ? manwonLabel(n) : <Link href={`/four-insurance/${n}/`}>{manwonLabel(n)}</Link>}</td>
                <td>{formatNumber(x.employeeTotal)}</td>
                <td>{formatNumber(x.employerTotal)}</td>
                <td>{formatNumber(x.laborCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        비과세 식대가 있으면 그만큼 보수월액이 줄어 4대보험료도 줄어듭니다. 위 계산기에 비과세액과 사업장 규모, 업종별 산재보험료율을
        넣으면 내 조건으로 다시 계산할 수 있습니다. 2026년 요율 전체는 <Link href="/four-insurance/">4대보험 계산기</Link> 본문에
        정리했습니다.
      </p>

      <h2>다른 월급도 찾아보기</h2>
      <FourInsuranceLinks current={m} />
    </ToolShell>
  );
}
