import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber, formatWon, manwonLabel } from "@/lib/format";
import { DEFAULT_NON_TAXABLE, DEFAULT_PAY_MONTH } from "@/lib/calc/salary";
import {
  FAMILY_SCENARIOS,
  floorManwon,
  hourlyFromMonthly,
  LTC_ROUNDED_FROM,
  minimumWageGap,
  pensionLimit,
  vsMinimumHourly,
} from "@/lib/calc/salary-ui";
import {
  annualPagesNear,
  estimate2027,
  MONTHLY_NON_TAXABLE_COLUMNS,
  MONTHLY_PAGE_MANWON,
  monthlyNeighbors,
  monthlyPagePath,
  salaryForMonthlyManwon,
} from "@/lib/calc/salary-monthly";
import { minimumMonthly } from "@/lib/rates/labor";
import { SalaryCalculator } from "../../SalaryCalculator";
import { SalaryDeductionTable } from "../../SalaryDeductionTable";
import { SalaryMonthlyLinks } from "../../SalaryMonthlyLinks";
import { CELL_SUB, PENSION_CAP, WRAP_CELL } from "../../sources";

// Only the listed monthly amounts exist; anything else is a 404 (required for static export).
// The static "monthly" folder sits beside /salary/[amount]/, whose params are numbers only.
export const dynamicParams = false;

export function generateStaticParams() {
  return MONTHLY_PAGE_MANWON.map((m) => ({ manwon: String(m) }));
}

type Props = { params: Promise<{ manwon: string }> };

function parse(raw: string): number | null {
  const n = Number(raw);
  return MONTHLY_PAGE_MANWON.includes(n) ? n : null;
}

const BASIS =
  "가정: 월급에 비과세 식대 20만원 포함 · 본인 1명 · 간이세액 100% · 2026년 10월분 급여 기준 요율 (2026년 10월 9일 확인)";

/** 세전 월급 (만원) from which 국민연금 stops rising with 비과세 20만원 (기준소득월액 상한 659만원 + 20만원). */
const PENSION_CAP_MONTHLY_MANWON = Math.ceil((PENSION_CAP + DEFAULT_NON_TAXABLE) / 10_000);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m = parse((await params).manwon);
  if (m === null) return {};
  const r = salaryForMonthlyManwon(m);
  const label = manwonLabel(m);
  return pageMetadata({
    title: `월급 ${label} 실수령액 - 세후 월 ${formatNumber(floorManwon(r.monthlyNet))}만원 (2026년)`,
    description: `2026년 세전 월급 ${label}의 실수령액은 월 ${formatWon(r.monthlyNet)}입니다. 4대보험 ${formatWon(
      r.insurance.total,
    )}과 소득세·지방소득세 ${formatWon(r.tax.total)}을 뺀 금액(식대 20만원 비과세, 본인 1명)이며, 부양가족·비과세별 실수령액과 연봉 환산도 정리했습니다.`,
    path: monthlyPagePath(m),
    keywords: [`월급 ${m}만원 실수령액`, `월급 ${m} 실수령액`, `세전 월급 ${m} 세후`, `월급 ${m}만원 세후`, `월급 ${m} 4대보험`, "월급 실수령액 계산기"],
  });
}

export default async function SalaryMonthlyPage({ params }: Props) {
  const m = parse((await params).manwon);
  if (m === null) notFound();

  const label = manwonLabel(m);
  const r = salaryForMonthlyManwon(m);
  const r0 = salaryForMonthlyManwon(m, { nonTaxable: 0 });
  const netMan = floorManwon(r.monthlyNet);
  const limit = pensionLimit(r.monthlyTaxable, DEFAULT_PAY_MONTH);
  const ntGain = r.monthlyNet - r0.monthlyNet;

  // 부양가족 × 비과세 table, unique to this 월급.
  const matrix = FAMILY_SCENARIOS.map((s) => ({
    ...s,
    cells: MONTHLY_NON_TAXABLE_COLUMNS.map((c) => ({
      ...c,
      r: salaryForMonthlyManwon(m, { family: s.family, children: s.children, nonTaxable: c.nonTaxable }),
    })),
  }));
  const fam2 = matrix[1].cells[1].r;
  const fam4 = matrix[3].cells[1].r;
  const fam4Gain = fam4.monthlyNet - r.monthlyNet;

  const annualManwon = m * 12;
  const annualLinks = annualPagesNear(m);
  const hourly = hourlyFromMonthly(r.monthlyGross);
  const min26 = minimumWageGap(r.monthlyGross, 2026);
  const min27 = minimumWageGap(r.monthlyGross, 2027);
  const showMinWage = r.monthlyGross < minimumMonthly(2026) * 1.5;

  const neighbors = monthlyNeighbors(m).map((n) => ({ n, r: salaryForMonthlyManwon(n) }));
  const up = salaryForMonthlyManwon(m + 10);
  const upNet = up.monthlyNet - r.monthlyNet;
  const keepPct = formatNumber((upNet / 100_000) * 100, 1);

  // From 2026년 11월분 the 장기요양보험료 ratio is rounded to 13.14%; some pays change by 10원.
  const r11 = salaryForMonthlyManwon(m, { payMonth: LTC_ROUNDED_FROM });
  const e27 = estimate2027(m);

  const faq: FaqItem[] = [
    {
      q: `월급 ${label} 실수령액은 얼마인가요?`,
      a: `2026년 10월분 급여 기준으로 월 ${formatWon(r.monthlyNet)}입니다. 세전 월급 ${formatWon(r.monthlyGross)}에서 국민연금 ${formatWon(
        r.insurance.pension,
      )}, 건강보험 ${formatWon(r.insurance.health)}, 장기요양보험 ${formatWon(r.insurance.longTermCare)}, 고용보험 ${formatWon(
        r.insurance.employment,
      )}, 소득세 ${formatWon(r.tax.incomeTax)}, 지방소득세 ${formatWon(
        r.tax.localTax,
      )}을 뺀 금액입니다. 월급에 비과세 식대 20만원이 들어 있고 공제대상가족은 본인 1명이라고 가정했습니다.`,
    },
    {
      q: `월급 ${label}이면 연봉은 얼마인가요?`,
      a: `월급 ${label}을 12개월 받으면 연봉 ${manwonLabel(annualManwon)}입니다. 퇴직금이 연봉에 포함된 계약이라면 연봉을 13으로 나눠 월급을 주므로, 매달 ${label}을 받으려면 연봉 ${manwonLabel(
        m * 13,
      )}이어야 합니다. 정기 상여금이 따로 있다면 연봉은 그만큼 더 큽니다.`,
    },
    {
      q: `식대가 비과세가 아니면 월급 ${label} 실수령액은 얼마인가요?`,
      a: `비과세 없이 ${label} 전부가 과세 대상이면 4대보험과 소득세가 모두 늘어 월 ${formatWon(
        r0.monthlyNet,
      )}을 받습니다. 식대 20만원이 비과세일 때보다 ${formatWon(ntGain)} 적습니다.`,
    },
    {
      q: `월급 ${label}에 부양가족이 있으면 실수령액이 늘어나나요?`,
      a: `4대보험은 가족 수와 관계없이 같고 매달 떼는 소득세만 줄어듭니다. 배우자를 공제대상가족으로 넣으면 월 ${formatWon(
        fam2.monthlyNet,
      )}, 8~20세 자녀 2명을 둔 4인 가구라면 월 ${formatWon(fam4.monthlyNet)}으로 본인 1명일 때보다 ${formatWon(
        fam4Gain,
      )} 많습니다. 실제 1년 세금은 연말정산에서 확정됩니다.`,
    },
    {
      q: `2027년에는 월급 ${label} 실수령액이 줄어드나요?`,
      a: `국민연금 근로자 부담이 법에 따라 4.75%에서 5.0%로 올라 공제가 월 ${formatWon(
        e27.pensionDiff,
      )} 늘어납니다. 건강보험료율은 7.19% 동결로 의결됐고(고시 전), 장기요양·고용보험 요율과 간이세액표는 아직 정해지지 않아 2026년 값으로 가정하면 2027년 1~6월분 실수령액은 약 ${formatWon(
        e27.monthlyNet,
      )}으로 예상됩니다.`,
    },
  ];

  return (
    <ToolShell
      slug="salary"
      path={monthlyPagePath(m)}
      extraCrumbs={[{ name: `월급 ${label}`, path: monthlyPagePath(m) }]}
      h1={`월급 ${label} 실수령액: 월 ${formatNumber(netMan)}만원 (2026년)`}
      lead={`세전 월급 ${label}의 2026년 실수령액은 월 ${formatWon(r.monthlyNet)}입니다. 식대 20만원 비과세, 본인 1명 기준으로 매달 4대보험 ${formatWon(
        r.insurance.total,
      )}과 소득세·지방소득세 ${formatWon(r.tax.total)}이 빠집니다.`}
      basis={BASIS}
      calculator={<SalaryCalculator initialManwon={m} initialMode="m" />}
      faq={faq}
      appCategory="FinanceApplication"
    >
      <h2>월급 {label} 공제 내역</h2>
      <p>
        세전 월급 {label}에서 비과세 식대 20만원을 뺀 <strong>{formatWon(r.monthlyTaxable)}</strong>이 4대보험과 소득세를 매기는 과세 대상
        급여입니다. 여기서 4대보험 {formatWon(r.insurance.total)}과 소득세·지방소득세 {formatWon(r.tax.total)}, 모두{" "}
        {formatWon(r.deductions)}(월급의 {formatNumber(r.deductionRate * 100, 1)}%)이 빠져 통장에는{" "}
        <strong>{formatWon(r.monthlyNet)}</strong>이 들어옵니다.
      </p>
      <SalaryDeductionTable r={r} payMonth={DEFAULT_PAY_MONTH} caption={`월급 ${label} 월 공제 내역 (2026년 10월분, 본인 1명)`} />
      <p className="note">
        단위: 원. 보험료와 세금은 각각 10원 미만을 버립니다. 장기요양보험료는 2026년 10월분까지 건강보험료 × 0.9448 ÷ 7.19로
        계산하고, 개정 노인장기요양보험법에 따라 11월분부터는 반올림한 13.14%를 곱합니다.{" "}
        {r11.insurance.longTermCare === r.insurance.longTermCare
          ? `월급 ${label}은 두 방식의 장기요양보험료가 ${formatWon(r.insurance.longTermCare)}으로 같아 2026년 11·12월분 실수령액도 같습니다.`
          : `월급 ${label}은 11월분부터 장기요양보험료가 ${formatWon(r11.insurance.longTermCare)}으로 ${formatWon(
              r.insurance.longTermCare - r11.insurance.longTermCare,
            )} 줄어 2026년 11·12월분 실수령액은 ${formatWon(r11.monthlyNet)}입니다. 위 계산기는 접속한 달의 규칙으로 계산합니다.`}
      </p>
      {limit === "cap" ? (
        <p>
          과세 급여 {formatWon(r.monthlyTaxable)}이 국민연금 기준소득월액 상한({formatNumber(PENSION_CAP / 10_000)}만원, 2026년 7월~2027년
          6월)을 넘어 국민연금은 월 {formatWon(r.insurance.pension)}으로 고정됩니다. 식대 20만원이 비과세라면 세전 월급 약{" "}
          {formatNumber(PENSION_CAP_MONTHLY_MANWON)}만원부터는 월급이 올라도 국민연금 공제가 늘지 않고 건강보험, 고용보험, 소득세만
          늘어납니다.
        </p>
      ) : null}

      <h2>부양가족·비과세에 따른 월급 {label} 실수령액</h2>
      <p>
        같은 월급 {label}이라도 비과세 금액에 따라 4대보험과 소득세가, 공제대상가족 수에 따라 소득세가 달라집니다. 자녀는
        공제대상가족에 들어가는 8세 이상 20세 이하 자녀를 말합니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>월급 {label} 월 실수령액 (아래 줄은 공제 합계, 2026년 10월분)</caption>
          <thead>
            <tr>
              <th scope="col">공제대상가족</th>
              {MONTHLY_NON_TAXABLE_COLUMNS.map((c) => (
                <th key={c.key} scope="col">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row) => (
              <tr key={row.key} className={row.family === 1 ? "is-current" : undefined}>
                <td style={WRAP_CELL}>{row.label}</td>
                {row.cells.map((c) => (
                  <td key={c.key}>
                    {row.family === 1 && c.nonTaxable === DEFAULT_NON_TAXABLE ? (
                      <strong>{formatNumber(c.r.monthlyNet)}</strong>
                    ) : (
                      formatNumber(c.r.monthlyNet)
                    )}
                    <span className={CELL_SUB}>공제 {formatNumber(c.r.deductions)}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        식대 20만원을 비과세로 받으면 비과세가 없을 때보다 월 {formatWon(ntGain)}, 1년에 약 {formatWon(ntGain * 12)}을 더 받습니다.
        8~20세 자녀 2명을 둔 4인 가구라면 본인 1명일 때보다 매달 소득세·지방소득세가 {formatWon(fam4Gain)} 적게 빠져 월{" "}
        {formatWon(fam4.monthlyNet)}을 받습니다.
        {fam4.tax.incomeTax === 0 ? ` 이 경우 월급 ${label}은 간이세액표에서 매달 떼는 소득세가 0원입니다.` : null} 부양가족 공제로 덜 떼는
        금액은 연말정산에서 실제 세금과 다시 맞춰집니다.
      </p>

      <h2>월급 {label} 연봉 환산과 시급</h2>
      <p>
        월급 {label}을 12개월 받으면 연봉은 <strong>{manwonLabel(annualManwon)}</strong>입니다. 퇴직금이 포함된 연봉 계약이라면 연봉을
        13으로 나눠 매달 주므로, 같은 월급을 받으려면 연봉이 {manwonLabel(m * 13)}이어야 합니다.{" "}
        {annualLinks.length === 1 ? (
          <>
            같은 금액을 연봉 기준으로 정리한{" "}
            <Link href={`/salary/${annualLinks[0]}/`}>연봉 {manwonLabel(annualLinks[0])} 실수령액</Link>도 참고하세요.
          </>
        ) : (
          <>
            가까운 연봉의 실수령액은{" "}
            {annualLinks.map((a, i) => (
              <span key={a}>
                {i > 0 ? ", " : null}
                <Link href={`/salary/${a}/`}>연봉 {manwonLabel(a)}</Link>
              </span>
            ))}{" "}
            페이지에서 볼 수 있습니다.
          </>
        )}
      </p>
      <p>
        주 40시간 근무(주휴 포함 월 209시간) 기준으로 시급을 환산하면 약 <strong>{formatWon(hourly)}</strong>입니다.{" "}
        {vsMinimumHourly(hourly, 2026)}이고, {vsMinimumHourly(hourly, 2027)}입니다.
      </p>
      {showMinWage ? (
        <p>
          {min26.diff < 0
            ? `세전 월급이 2026년 최저임금 월 환산액 ${formatWon(min26.minMonthly)}보다 ${formatWon(
                -min26.diff,
              )} 적습니다. 주 40시간 일한다면 최저임금에 못 미치므로, 월급 ${label}이 맞다면 소정근로시간이 더 짧은 단시간 근로 계약인지 확인해야 합니다.`
            : `세전 월급은 2026년 최저임금 월 환산액 ${formatWon(min26.minMonthly)}보다 ${formatWon(min26.diff)} 많습니다.`}{" "}
          {min27.diff < 0
            ? `2027년 최저임금 월 환산액 ${formatWon(min27.minMonthly)}보다는 ${formatWon(
                -min27.diff,
              )} 적어서, 주 40시간 근무라면 2027년 1월부터 월급이 최소 이만큼 올라야 합니다.`
            : `2027년 최저임금 월 환산액 ${formatWon(min27.minMonthly)}보다도 ${formatWon(min27.diff)} 많습니다.`}{" "}
          최저임금과 비교할 때는 매달 정기적으로 주는 식대 같은 복리후생비도 포함합니다. 자세한 기준은{" "}
          <Link href="/minimum-wage/">최저임금 계산기</Link>에 정리했습니다.
        </p>
      ) : null}

      <h2>2027년 월급 {label} 실수령액 예상</h2>
      <p>
        2027년에는 개정 국민연금법에 따라 국민연금 보험료율이 9.5%에서 10%로 올라 근로자 부담이 4.75%에서 5.0%가 됩니다. 건강보험료율은
        2026년 9월 8일 건강보험정책심의위원회에서 7.19% 동결로 의결됐지만 아직 고시 전이고, 장기요양·고용보험 요율과 간이세액표는 2026년
        10월 현재 정해지지 않았습니다.
      </p>
      <p>
        정해지지 않은 항목을 2026년 값으로 가정하면, 월급 {label}의 국민연금은 {formatWon(e27.base.insurance.pension)}에서{" "}
        {formatWon(e27.pension)}으로 {formatWon(e27.pensionDiff)} 늘고 2027년 1~6월분 실수령액은{" "}
        <strong>약 {formatWon(e27.monthlyNet)}</strong>으로 예상됩니다. 이 금액은 예상치이며, 남은 요율과 간이세액표가 발표되면 달라질 수
        있습니다.
      </p>

      <h2>월급 {label} 주변 실수령액 표</h2>
      <p>
        같은 조건(식대 20만원 비과세, 본인 1명)으로 계산한 주변 월급의 실수령액입니다. 월급이 {label}에서 10만원 오르면 실수령액은{" "}
        {formatWon(upNet)} 늘어, 인상분의 약 {keepPct}%가 통장에 들어옵니다.
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
            {neighbors.map(({ n, r: nr }) => (
              <tr key={n} className={n === m ? "is-current" : undefined}>
                <td>{n === m ? manwonLabel(n) : <Link href={monthlyPagePath(n)}>{manwonLabel(n)}</Link>}</td>
                <td>{formatNumber(nr.insurance.total)}</td>
                <td>{formatNumber(nr.tax.total)}</td>
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

      <h2>다른 월급 실수령액 보기</h2>
      <SalaryMonthlyLinks current={m} />
    </ToolShell>
  );
}
