import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatPercent, formatWon, manwonLabel } from "@/lib/format";
import {
  bizWithholding,
  compareKinds,
  FREELANCE_PAGE_MANWON,
  grossForNet,
  otherWithholding,
  type Withholding,
} from "@/lib/calc/freelance-tax";
import { FreelanceTaxCalculator } from "../FreelanceTaxCalculator";
import { FREELANCE_BASIS, LawLinks } from "../shared";

// Only the listed amounts exist; anything else is a 404 (required for static export).
export const dynamicParams = false;

export function generateStaticParams() {
  return FREELANCE_PAGE_MANWON.map((m) => ({ manwon: String(m) }));
}

type Props = { params: Promise<{ manwon: string }> };

/** 1년 3.3% 소득이 이 금액 이하면 (기본공제만으로도) 환급 가능성이 크다는 문장을 붙인다. */
const SMALL_YEAR_GROSS = 12_000_000;

function parse(raw: string): number | null {
  const n = Number(raw);
  return FREELANCE_PAGE_MANWON.includes(n) ? n : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m = parse((await params).manwon);
  if (m === null) return {};
  const label = manwonLabel(m);
  const { biz, other } = compareKinds(m * 10_000);
  const rev = grossForNet("biz", m * 10_000);
  return pageMetadata({
    title: `${label} 3.3% 세금 - 실수령 ${formatWon(biz.net)} (8.8% 비교)`,
    description: `${label}에서 3.3%를 떼면 소득세 ${formatWon(biz.incomeTax)}, 지방소득세 ${formatWon(biz.localTax)}으로 실수령액은 ${formatWon(biz.net)}입니다. 기타소득 8.8%라면 ${formatWon(other.net)}, 실수령 ${label}을 받으려면 세전 ${formatWon(rev.gross)}입니다.`,
    path: `/freelance-tax/${m}/`,
    keywords: [`${label} 3.3%`, `${m}만원 3.3% 실수령`, `${label} 3.3 세금`, `${label} 8.8%`, `${label} 세후`, "3.3% 계산기"],
  });
}

function TaxCell({ r }: { r: Withholding }) {
  return <>{r.exempt === "threshold" ? "0원 (과세최저한)" : formatWon(r.total)}</>;
}

export default async function FreelanceTaxAmountPage({ params }: Props) {
  const m = parse((await params).manwon);
  if (m === null) notFound();

  const gross = m * 10_000;
  const label = manwonLabel(m);
  const { biz, biz2027, other } = compareKinds(gross);
  const rev = grossForNet("biz", gross);
  const revOther = grossForNet("other", gross);
  const otherExempt = other.exempt === "threshold";
  const yearGross = gross * 12;
  const yearTax = biz.total * 12;

  const faq: FaqItem[] = [
    {
      q: `${label}에서 3.3% 떼면 얼마인가요?`,
      a: `소득세 ${formatWon(biz.incomeTax)}(3%)과 지방소득세 ${formatWon(biz.localTax)}(소득세의 10%), 합계 ${formatWon(biz.total)}을 떼고 ${formatWon(biz.net)}을 받습니다.`,
    },
    {
      q: `실수령 ${label}을 받으려면 세전 얼마로 계약해야 하나요?`,
      a: `3.3% 기준 세전 ${formatWon(rev.gross)}입니다. 소득세 ${formatWon(rev.result.incomeTax)}과 지방소득세 ${formatWon(rev.result.localTax)}을 떼면 정확히 ${formatWon(gross)}이 남습니다.${
        revOther.gross === gross
          ? ` 기타소득이라면 과세최저한 이하라 세전도 ${label} 그대로입니다.`
          : ` 기타소득 8.8%라면 세전 ${formatWon(revOther.gross)}이 필요합니다.`
      }`,
    },
    {
      q: `강연료나 원고료로 ${label}을 받으면 세금이 얼마인가요?`,
      a: otherExempt
        ? `필요경비 60%를 빼면 기타소득금액이 ${formatWon(other.taxBase)}으로 5만원 이하라 과세최저한에 해당해 세금 없이 ${label}을 모두 받습니다.`
        : `필요경비 60%를 빼고 남은 기타소득금액 ${formatWon(other.taxBase)}에 22%를 매겨 소득세 ${formatWon(other.incomeTax)}, 지방소득세 ${formatWon(other.localTax)}을 떼고 ${formatWon(other.net)}을 받습니다.`,
    },
    {
      q: `2.2%로 바뀌면 ${label} 실수령액은 얼마인가요?`,
      a: `정부 세제개편안대로 2027년 1월 1일 지급분부터 3.3%가 2.2%로 낮아지면 ${label}에서 소득세 ${formatWon(biz2027.incomeTax)}과 지방소득세 ${formatWon(biz2027.localTax)}을 떼고 ${formatWon(biz2027.net)}을 받아 지금보다 ${formatWon(biz2027.net - biz.net)} 늘어납니다. 2026년 10월 현재 국회 심의 중이라 확정되지 않았고, 1년 세금 자체가 줄지는 않아 5월 환급액이 그만큼 줄어듭니다.`,
    },
    {
      q: `매달 ${label}씩 받으면 5월에 돌려받나요?`,
      a: `매달 ${label}을 3.3%로 받으면 1년 동안 미리 떼인 세금은 ${formatWon(yearTax)}입니다. 다음 해 5월 종합소득세 신고 때 실제 세금을 다시 계산해 이보다 적으면 차액을 돌려받고, 많으면 더 냅니다. ${
        yearGross <= SMALL_YEAR_GROSS
          ? `1년 소득이 ${formatWon(yearGross)} 정도이고 다른 소득이 없다면 상당 부분을 돌려받을 가능성이 큽니다.`
          : "다른 소득과 경비에 따라 결과가 달라지니 1년 치 지급명세를 모아 두세요."
      }`,
    },
  ];

  return (
    <ToolShell
      slug="freelance-tax"
      path={`/freelance-tax/${m}/`}
      extraCrumbs={[{ name: label, path: `/freelance-tax/${m}/` }]}
      h1={`${label} 3.3% 세금: 실수령 ${formatWon(biz.net)}`}
      lead={`${label}을 3.3% 떼고 받으면 소득세 ${formatWon(biz.incomeTax)}과 지방소득세 ${formatWon(biz.localTax)}, 합계 ${formatWon(biz.total)}을 뺀 ${formatWon(biz.net)}이 들어옵니다. ${
        otherExempt
          ? `강연료처럼 기타소득으로 한 번 받으면 과세최저한이라 세금 없이 ${formatWon(other.net)}을 받습니다.`
          : `강연료처럼 8.8% 기타소득으로 받으면 ${formatWon(other.net)}입니다.`
      }`}
      basis={FREELANCE_BASIS}
      calculator={<FreelanceTaxCalculator initialAmount={gross} />}
      faq={faq}
      appCategory="FinanceApplication"
    >
      <h2>{label} 3.3% 계산</h2>
      <p className="formula">
        소득세 {formatWon(gross)} × 3% = {formatWon(biz.incomeTax)} &nbsp;|&nbsp; 지방소득세 {formatWon(biz.incomeTax)} × 10% ={" "}
        {formatWon(biz.localTax)} &nbsp;|&nbsp; 실수령 {formatWon(gross)} − {formatWon(biz.total)} = {formatWon(biz.net)}
      </p>
      <p>
        {label}을 프리랜서 사업소득으로 받으면 주는 쪽이 3.3%인 <strong>{formatWon(biz.total)}</strong>을 떼어 대신 내고{" "}
        <strong>{formatWon(biz.net)}</strong>을 보내 줍니다.{" "}
        {otherExempt
          ? `같은 ${label}을 강연료나 원고료 같은 기타소득으로 한 번 받는다면, 60%를 경비로 뺀 기타소득금액이 ${formatWon(other.taxBase)}으로 과세최저한(5만원) 이하라 세금 없이 ${label}을 그대로 받습니다.`
          : `같은 금액을 강연료나 원고료 같은 기타소득으로 받으면 60%를 경비로 빼고 남은 ${formatWon(other.taxBase)}에 22%를 매겨 ${formatWon(other.total)}을 떼므로 실수령액은 ${formatWon(other.net)}으로, 3.3%보다 ${formatWon(biz.net - other.net)} 적습니다.`}
      </p>

      <h2>{label} 3.3%·8.8%·2.2% 비교표</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">구분</th>
              <th scope="col">3.3% 사업소득</th>
              <th scope="col">8.8% 기타소득</th>
              <th scope="col">2.2% 인하안</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">소득세</th>
              <td>{formatWon(biz.incomeTax)}</td>
              <td>{formatWon(other.incomeTax)}</td>
              <td>{formatWon(biz2027.incomeTax)}</td>
            </tr>
            <tr>
              <th scope="row">지방소득세</th>
              <td>{formatWon(biz.localTax)}</td>
              <td>{formatWon(other.localTax)}</td>
              <td>{formatWon(biz2027.localTax)}</td>
            </tr>
            <tr>
              <th scope="row">세금 합계</th>
              <td>{formatWon(biz.total)}</td>
              <td>
                <TaxCell r={other} />
              </td>
              <td>{formatWon(biz2027.total)}</td>
            </tr>
            <tr className="is-current">
              <th scope="row">실수령액</th>
              <td>{formatWon(biz.net)}</td>
              <td>{formatWon(other.net)}</td>
              <td>{formatWon(biz2027.net)}</td>
            </tr>
            <tr>
              <th scope="row">실효세율</th>
              <td>{formatPercent(biz.effectiveRate, 2)}</td>
              <td>{formatPercent(other.effectiveRate, 2)}</td>
              <td>{formatPercent(biz2027.effectiveRate, 2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="note">
        2.2% 인하안은 2027년 1월 지급분부터 적용하려는 정부 세제개편안으로, 2026년 10월 현재 국회 심의 중이라 확정되지 않았습니다.
      </p>

      <h2>실수령 {label}을 받으려면</h2>
      <p>
        통장에 정확히 {formatWon(gross)}이 들어오게 하려면 세전 금액을 <strong>{formatWon(rev.gross)}</strong>으로 정하면 됩니다. 여기서
        소득세 {formatWon(rev.result.incomeTax)}과 지방소득세 {formatWon(rev.result.localTax)}을 떼면 {formatWon(rev.result.net)}이
        남습니다.{" "}
        {revOther.gross === gross
          ? `기타소득이라면 과세최저한 이하라 세전도 ${label} 그대로면 됩니다.`
          : `기타소득 8.8%라면 세전 ${formatWon(revOther.gross)}이 필요합니다.`}
      </p>

      <h2>매달 {label}씩 1년 받으면</h2>
      <p>
        매달 {label}을 3.3%로 받으면 1년 지급액은 {formatWon(yearGross)}, 미리 떼인 세금은 {formatWon(yearTax)}입니다. 이 세금은
        최종 세금이 아니라서 2026년에 받은 소득이라면 2027년 5월 종합소득세 신고 때 1년 소득에서 필요경비와 공제를 빼고 다시
        계산합니다. 실제 세금이 {formatWon(yearTax)}보다 적으면 차액을 돌려받고, 많으면 차액을 더 냅니다.{" "}
        {yearGross <= SMALL_YEAR_GROSS
          ? `1년 소득이 ${formatWon(yearGross)} 정도이고 다른 소득이 없다면 본인 기본공제 150만원 등으로 실제 세금이 크게 줄어, 떼인 세금의 상당 부분을 돌려받을 가능성이 큽니다.`
          : "다른 소득과 합산되거나 경비가 적으면 추가 납부가 나올 수 있으니 1년 치 지급명세를 모아 두세요."}
      </p>

      <h2>금액별 3.3% 실수령액</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">지급액</th>
              <th scope="col">3.3% 실수령</th>
              <th scope="col">8.8% 실수령</th>
            </tr>
          </thead>
          <tbody>
            {FREELANCE_PAGE_MANWON.map((n) => (
              <tr key={n} className={n === m ? "is-current" : undefined}>
                <td>{n === m ? manwonLabel(n) : <Link href={`/freelance-tax/${n}/`}>{manwonLabel(n)}</Link>}</td>
                <td>{formatWon(bizWithholding(n * 10_000).net)}</td>
                <td>{formatWon(otherWithholding(n * 10_000).net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        다른 금액이나 일용직 일당은 위 계산기에서 바로 계산할 수 있고, 계산 원리와 사업소득·기타소득 구분은{" "}
        <Link href="/freelance-tax/">3.3% 세금 계산기</Link>에 정리했습니다.
      </p>

      <h2>근거 법령</h2>
      <LawLinks />

      <h2>다른 금액도 찾아보기</h2>
      <nav aria-label="금액별 3.3% 세금 페이지" className="link-grid">
        {FREELANCE_PAGE_MANWON.map((n) => (
          <Link key={n} href={`/freelance-tax/${n}/`} aria-current={n === m ? "page" : undefined}>
            {manwonLabel(n)} 3.3%
          </Link>
        ))}
      </nav>
    </ToolShell>
  );
}
