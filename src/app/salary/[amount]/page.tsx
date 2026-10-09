import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber, formatWon, manwonLabel } from "@/lib/format";
import { DEFAULT_PAY_MONTH, SALARY_PAGE_MANWON } from "@/lib/calc/salary";
import {
  FAMILY_SCENARIOS,
  floorManwon,
  hourlyFromMonthly,
  longTermCareMultiplier,
  LTC_ROUNDED_FROM,
  manwonFloorLabel,
  minimumWageGap,
  pageNeighbors,
  pensionLimit,
  raiseEffect,
  salaryForManwon,
  taxBracketLabel,
} from "@/lib/calc/salary-ui";
import { MINIMUM_WAGE, minimumMonthly } from "@/lib/rates/labor";
import { SalaryCalculator } from "../SalaryCalculator";
import { SalaryLinks } from "../SalaryLinks";
import { CELL_SUB, PENSION_CAP, PENSION_CAP_ANNUAL_MANWON, WRAP_CELL } from "../sources";

// Only the listed salaries exist; anything else is a 404 (required for static export).
export const dynamicParams = false;

export function generateStaticParams() {
  return SALARY_PAGE_MANWON.map((m) => ({ amount: String(m) }));
}

type Props = { params: Promise<{ amount: string }> };

function parse(raw: string): number | null {
  const n = Number(raw);
  return SALARY_PAGE_MANWON.includes(n) ? n : null;
}

const BASIS =
  "가정: 월 비과세 식대 20만원 · 본인 1명 · 간이세액 100% · 2026년 10월 급여 기준 요율 (2026년 10월 9일 확인)";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m = parse((await params).amount);
  if (m === null) return {};
  const r = salaryForManwon(m);
  const label = manwonLabel(m);
  return pageMetadata({
    title: `연봉 ${label} 실수령액 - 월 ${formatNumber(floorManwon(r.monthlyNet))}만원 (2026년)`,
    description: `2026년 연봉 ${label}의 월 실수령액은 ${formatWon(r.monthlyNet)}입니다. 세전 월급 ${formatWon(r.monthlyGross)}에서 ${
      r.tax.total > 0
        ? `4대보험 ${formatWon(r.insurance.total)}과 소득세·지방소득세 ${formatWon(r.tax.total)}을 뺀 금액입니다.`
        : `4대보험 ${formatWon(r.insurance.total)}만 빠지고 소득세는 0원입니다.`
    } 부양가족별 실수령액과 주변 연봉 표를 함께 정리했습니다.`,
    path: `/salary/${m}/`,
    keywords: [`연봉 ${m}만원 실수령액`, `연봉 ${m} 실수령액`, `연봉 ${label} 월급`, `연봉 ${m} 세후`, "연봉 실수령액 계산기"],
  });
}

/** "2026년 최저시급 10,320원의 1.62배" or, close to the minimum, the gap in 원. */
function vsMinimumHourly(hourly: number, year: 2026 | 2027): string {
  const min = MINIMUM_WAGE[year];
  const ratio = hourly / min;
  if (ratio >= 1.2) return `${year}년 최저시급 ${formatWon(min)}의 ${ratio.toFixed(2)}배`;
  const diff = hourly - min;
  return `${year}년 최저시급 ${formatWon(min)}보다 ${formatWon(Math.abs(diff))} ${diff >= 0 ? "많은" : "적은"} 수준`;
}

export default async function SalaryAmountPage({ params }: Props) {
  const m = parse((await params).amount);
  if (m === null) notFound();

  const label = manwonLabel(m);
  const r = salaryForManwon(m);
  const sev = salaryForManwon(m, { severanceIncluded: true });
  const netMan = floorManwon(r.monthlyNet);
  const limit = pensionLimit(r.monthlyTaxable, DEFAULT_PAY_MONTH);
  const fam = FAMILY_SCENARIOS.map((s) => ({ ...s, r: salaryForManwon(m, { family: s.family, children: s.children }) }));
  const fam4 = fam[fam.length - 1].r;
  const neighbors = pageNeighbors(m).map((n) => ({ n, r: salaryForManwon(n) }));
  const raise = raiseEffect(m, 100);
  const hourly = hourlyFromMonthly(r.monthlyGross);
  const min26 = minimumWageGap(r.monthlyGross, 2026);
  const min27 = minimumWageGap(r.monthlyGross, 2027);
  const showMinWage = r.monthlyGross < minimumMonthly(2026) * 1.5;
  const keepPct = formatNumber(raise.keepRate * 100, 1);
  // From 2026년 11월분 the 장기요양보험료 ratio is rounded to 13.14%; some salaries change by 10원.
  const r11 = salaryForManwon(m, { payMonth: LTC_ROUNDED_FROM });

  const deductionRows: { label: string; basis: string; amount: number; strong?: boolean; current?: boolean }[] = [
    {
      label: "국민연금",
      basis: `${formatNumber(r.insurance.pensionBase)} × 4.75%${limit === "cap" ? " (상한)" : limit === "floor" ? " (하한)" : ""}`,
      amount: r.insurance.pension,
    },
    { label: "건강보험", basis: `${formatNumber(r.monthlyTaxable)} × 3.595%`, amount: r.insurance.health },
    {
      label: "장기요양보험",
      basis: `${formatNumber(r.insurance.health)} × ${longTermCareMultiplier(DEFAULT_PAY_MONTH)}`,
      amount: r.insurance.longTermCare,
    },
    { label: "고용보험", basis: `${formatNumber(r.monthlyTaxable)} × 0.9%`, amount: r.insurance.employment },
    { label: "소득세", basis: `간이세액표 ${taxBracketLabel(r.monthlyTaxable)}`, amount: r.tax.incomeTax },
    { label: "지방소득세", basis: "소득세 × 10%", amount: r.tax.localTax },
    {
      label: "공제 합계",
      basis: `세전 월급의 ${formatNumber(r.deductionRate * 100, 1)}%`,
      amount: r.deductions,
      strong: true,
    },
    { label: "월 실수령액", basis: `${formatNumber(r.monthlyGross)} − 공제 합계`, amount: r.monthlyNet, current: true },
  ];

  const faq: FaqItem[] = [
    {
      q: `연봉 ${label} 실수령액은 얼마인가요?`,
      a: `2026년 10월 급여 기준으로 월 ${formatWon(r.monthlyNet)}, 1년으로 환산하면 약 ${manwonFloorLabel(r.annualNet)}입니다. 세전 월급 ${formatWon(r.monthlyGross)}에서 국민연금 ${formatWon(r.insurance.pension)}, 건강보험 ${formatWon(
        r.insurance.health,
      )}, 장기요양보험 ${formatWon(r.insurance.longTermCare)}, 고용보험 ${formatWon(r.insurance.employment)}, 소득세 ${formatWon(
        r.tax.incomeTax,
      )}, 지방소득세 ${formatWon(r.tax.localTax)}을 뺀 금액이며 비과세 식대 20만원과 본인 1명을 가정했습니다.`,
    },
    {
      q: `연봉 ${label}이면 세전 월급은 얼마인가요?`,
      a: `연봉을 12로 나눈 ${formatWon(r.monthlyGross)}입니다. 퇴직금이 연봉에 포함된 계약이라면 13으로 나눈 ${formatWon(
        sev.monthlyGross,
      )}이 월급이고, 이때 실수령액은 ${formatWon(sev.monthlyNet)}입니다.`,
    },
    {
      q: `연봉 ${label}에 부양가족이 있으면 실수령액이 얼마나 늘어나나요?`,
      a:
        fam4.monthlyNet > r.monthlyNet
          ? `4대보험은 가족 수와 관계없이 같고 소득세만 줄어듭니다. 4인 가구(8~20세 자녀 2명)라면 월 ${formatWon(
              fam4.monthlyNet,
            )}으로 본인 1명일 때보다 ${formatWon(fam4.monthlyNet - r.monthlyNet)} 많습니다.`
          : `이 연봉은 본인 1명 기준으로도 매달 떼는 소득세가 ${formatWon(
              r.tax.incomeTax,
            )}이라 부양가족이 늘어도 월 실수령액이 달라지지 않습니다. 4대보험은 가족 수와 관계없이 같습니다.`,
    },
    {
      q: `연봉 ${label}을 시급으로 환산하면 얼마인가요?`,
      a: `주 40시간 근무(주휴 포함 월 209시간) 기준으로 약 ${formatWon(hourly)}입니다. ${vsMinimumHourly(hourly, 2026)}입니다.`,
    },
  ];

  return (
    <ToolShell
      slug="salary"
      path={`/salary/${m}/`}
      extraCrumbs={[{ name: `연봉 ${label}`, path: `/salary/${m}/` }]}
      h1={`연봉 ${label} 실수령액: 월 ${formatNumber(netMan)}만원 (2026년)`}
      lead={`연봉 ${label}의 2026년 월 실수령액은 ${formatWon(r.monthlyNet)}, 1년으로 환산하면 약 ${manwonFloorLabel(r.annualNet)}입니다. 매달 4대보험과 소득세로 ${formatWon(r.deductions)}이 공제됩니다.`}
      basis={BASIS}
      calculator={<SalaryCalculator initialManwon={m} />}
      faq={faq}
      appCategory="FinanceApplication"
    >
      <h2>연봉 {label} 세전 월급과 공제 내역</h2>
      <p>
        연봉 {label}이면 세전 월급은 <strong>{formatWon(r.monthlyGross)}</strong>(연봉 ÷ 12)입니다. 여기서 비과세 식대 20만원을 뺀{" "}
        {formatWon(r.monthlyTaxable)}이 4대보험과 소득세를 매기는 과세 대상 급여입니다. 퇴직금이 포함된 연봉이라면 13으로 나눈{" "}
        {formatWon(sev.monthlyGross)}이 월급이 되고, 실수령액은 {formatWon(sev.monthlyNet)}으로 줄어듭니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>연봉 {label} 월 공제 내역 (2026년 10월 급여, 본인 1명)</caption>
          <thead>
            <tr>
              <th scope="col">항목 (계산 기준)</th>
              <th scope="col">월 금액</th>
            </tr>
          </thead>
          <tbody>
            {deductionRows.map((row) => (
              <tr key={row.label} className={row.current ? "is-current" : undefined}>
                <td style={WRAP_CELL}>
                  {row.strong ? <strong>{row.label}</strong> : row.label}
                  <span className={CELL_SUB}>{row.basis}</span>
                </td>
                <td>{row.strong ? <strong>{formatNumber(row.amount)}</strong> : formatNumber(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        단위: 원. 보험료와 세금은 각각 10원 미만을 버립니다. 장기요양보험료는 2026년 10월분까지 건강보험료 × 0.9448 ÷ 7.19로
        계산하고, 개정 노인장기요양보험법에 따라 11월분부터는 반올림한 13.14%를 곱합니다.{" "}
        {r11.insurance.longTermCare === r.insurance.longTermCare
          ? `연봉 ${label}은 두 방식으로 계산한 장기요양보험료가 ${formatWon(r.insurance.longTermCare)}으로 같아 2026년 11·12월분 실수령액도 같습니다.`
          : `연봉 ${label}은 11월분부터 장기요양보험료가 ${formatWon(r11.insurance.longTermCare)}으로 ${formatWon(
              r.insurance.longTermCare - r11.insurance.longTermCare,
            )} 줄어 2026년 11·12월분 월 실수령액은 ${formatWon(r11.monthlyNet)}입니다. 위 계산기는 접속한 달의 규칙으로 계산합니다.`}
      </p>
      {r.tax.incomeTax === 0 ? (
        <p>
          월 과세 급여 {formatWon(r.monthlyTaxable)}은 간이세액표에서 본인 1명 기준으로 세액이 생기는 구간(월 106만원 이상)보다 적어서
          매달 떼는 소득세와 지방소득세가 0원입니다. 공제액은 4대보험뿐이라 세전 월급의 {formatNumber(r.deductionRate * 100, 1)}%만
          빠집니다.
        </p>
      ) : null}
      {limit === "cap" ? (
        <p>
          과세 급여가 국민연금 기준소득월액 상한({formatNumber(PENSION_CAP / 10_000)}만원, 2026년 7월~2027년 6월)을 넘어 국민연금은 월{" "}
          {formatWon(r.insurance.pension)}으로 고정됩니다. 비과세 20만원 기준으로{" "}
          <strong>연봉 약 {formatNumber(PENSION_CAP_ANNUAL_MANWON)}만원</strong>부터는 연봉이 올라도 국민연금 공제가 늘지 않고,
          건강보험과 고용보험, 소득세만 늘어납니다.
        </p>
      ) : null}
      {r.monthlyTaxable > 10_000_000 ? (
        <p>
          월 과세 급여가 1,000만원을 넘어 소득세는 간이세액표 마지막의 산식(월 1,000만원 행 세액에 초과분 × 세율을 더하는 방식)으로
          계산합니다. 고소득 구간이라 실제 1년 세금은 연말정산 공제 항목에 따라 크게 달라질 수 있습니다.
        </p>
      ) : null}

      <h2>부양가족 수에 따른 연봉 {label} 실수령액</h2>
      <p>
        4대보험은 가족 수와 관계없이 같고, 매달 떼는 소득세와 지방소득세만 달라집니다. 자녀는 공제대상가족에 들어가는 8세 이상 20세 이하
        자녀를 말합니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">공제대상가족</th>
              <th scope="col">소득세</th>
              <th scope="col">지방소득세</th>
              <th scope="col">월 실수령액</th>
              <th scope="col">1인 대비</th>
            </tr>
          </thead>
          <tbody>
            {fam.map((f) => (
              <tr key={f.key} className={f.family === 1 ? "is-current" : undefined}>
                <td>{f.label}</td>
                <td>{formatNumber(f.r.tax.incomeTax)}</td>
                <td>{formatNumber(f.r.tax.localTax)}</td>
                <td>{formatNumber(f.r.monthlyNet)}</td>
                <td>
                  {f.family === 1 ? "-" : f.r.monthlyNet > r.monthlyNet ? `+${formatNumber(f.r.monthlyNet - r.monthlyNet)}` : "0"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        {fam4.monthlyNet > r.monthlyNet
          ? `연봉 ${label}에서 8~20세 자녀 2명을 포함한 4인 가구라면 월 실수령액은 ${formatWon(fam4.monthlyNet)}으로 본인 1명일 때보다 ${formatWon(
              fam4.monthlyNet - r.monthlyNet,
            )}, 1년에 약 ${formatWon((fam4.monthlyNet - r.monthlyNet) * 12)} 많습니다. 다만 이는 매달 덜 떼는 금액일 뿐이고, 실제 세금은 연말정산에서 확정됩니다.`
          : `연봉 ${label}은 본인 1명 기준 소득세가 ${formatWon(
              r.tax.incomeTax,
            )}이라 부양가족 수가 실수령액에 영향을 주지 않습니다.`}
      </p>

      <h2>연봉 {label} 시급 환산과 최저임금 비교</h2>
      <p>
        주 40시간 근무(주휴 포함 월 209시간) 기준으로 세전 월급 {formatWon(r.monthlyGross)}을 시급으로 바꾸면 약{" "}
        <strong>{formatWon(hourly)}</strong>입니다. {vsMinimumHourly(hourly, 2026)}이고, {vsMinimumHourly(hourly, 2027)}입니다.
      </p>
      {showMinWage ? (
        <p>
          {min26.diff < 0
            ? `세전 월급이 2026년 최저임금 월 환산액 ${formatWon(min26.minMonthly)}보다 ${formatWon(
                -min26.diff,
              )} 적습니다. 주 40시간 일하는 근로자라면 최저임금에 못 미치므로 근로시간이 더 짧은 계약인지 확인해야 합니다.`
            : `세전 월급은 2026년 최저임금 월 환산액 ${formatWon(min26.minMonthly)}보다 ${formatWon(min26.diff)} 많습니다.`}{" "}
          {min27.diff < 0
            ? `2027년 최저임금(월 ${formatWon(min27.minMonthly)})보다는 ${formatWon(
                -min27.diff,
              )} 적어서, 주 40시간 근무라면 2027년 1월부터 월급이 최소 이만큼 올라야 합니다.`
            : `2027년 최저임금 월 환산액 ${formatWon(min27.minMonthly)}보다도 ${formatWon(min27.diff)} 많습니다.`}{" "}
          최저임금과 비교할 때는 매달 정기적으로 주는 상여금과 식대 같은 복리후생비도 포함하므로, 연봉을 12개월에 고르게 나눠 받는다고
          가정한 비교입니다.
        </p>
      ) : null}

      <h2>연봉 {label} 주변 실수령액 표</h2>
      <p>
        같은 조건(비과세 20만원, 본인 1명)으로 계산한 주변 연봉의 실수령액입니다. 연봉이 {label}에서 100만원 오르면 세전 월급은{" "}
        {formatWon(raise.grossDiff)} 늘지만 실수령액은 {formatWon(raise.netDiff)} 늘어, 인상분의 약 {keepPct}%가 통장에 들어옵니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">연봉</th>
              <th scope="col">세전 월급</th>
              <th scope="col">공제액</th>
              <th scope="col">월 실수령액</th>
            </tr>
          </thead>
          <tbody>
            {neighbors.map(({ n, r: nr }) => (
              <tr key={n} className={n === m ? "is-current" : undefined}>
                <td>{n === m ? manwonLabel(n) : <Link href={`/salary/${n}/`}>{manwonLabel(n)}</Link>}</td>
                <td>{formatNumber(nr.monthlyGross)}</td>
                <td>{formatNumber(nr.deductions)}</td>
                <td>{formatNumber(nr.monthlyNet)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        단위: 원. 비과세 금액이나 부양가족이 다르면 위 계산기에서 바꿔 볼 수 있습니다. 계산 방법과 2026년 요율은{" "}
        <Link href="/salary/">연봉 실수령액 계산기</Link>에 정리했습니다.
      </p>

      <h2>다른 연봉 실수령액 보기</h2>
      <SalaryLinks current={m} />
    </ToolShell>
  );
}
