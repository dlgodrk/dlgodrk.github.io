import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatWon, koreanWon } from "@/lib/format";
import {
  ACQ_PAGE_MANWON,
  bracketLabel,
  computeAcquisitionTax,
  EOK,
  FIRST_HOME_LIMIT,
  FIRST_HOME_LIMIT_SMALL,
  FIRST_HOME_PRICE_CAP,
  FIRST_HOME_SMALL_CAP_CAPITAL,
  findAcqPage,
  HIGH_BRACKET_MIN,
  LOW_BRACKET_MAX,
  MAN,
  neighborsOf,
  priceLabel,
  rateLabel,
  SCENARIOS,
  standardRateUnits,
  totalFor,
  type AcqInput,
} from "@/lib/calc/acquisition-tax";
import { AcquisitionTaxCalculator } from "../AcquisitionTaxCalculator";
import { BASIS, SOURCE_LINKS } from "../sources";

// Only the listed prices exist; anything else is a 404 (required for static export).
export const dynamicParams = false;

export function generateStaticParams() {
  return ACQ_PAGE_MANWON.map((m) => ({ price: String(m) }));
}

type Props = { params: Promise<{ price: string }> };

const ONE: Omit<AcqInput, "price"> = { houses: 1, regulated: false, over85: false };
const HEAVY8: Omit<AcqInput, "price"> = { houses: 2, regulated: true, over85: false };

/** Page-specific numbers shared by metadata and the page body. */
function facts(manwon: number) {
  const price = manwon * MAN;
  const label = priceLabel(manwon);
  const one = computeAcquisitionTax({ price, ...ONE })!;
  const oneLarge = computeAcquisitionTax({ price, ...ONE, over85: true })!;
  const heavy8 = computeAcquisitionTax({ price, ...HEAVY8 })!;
  return { price, label, one, oneLarge, heavy8, rate: rateLabel(one.rateUnits) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m = findAcqPage((await params).price);
  if (m === null) return {};
  const { label, one, oneLarge, heavy8, rate } = facts(m);
  return pageMetadata({
    title: `${label} 아파트 취득세 - 1주택 ${koreanWon(one.total)} (2026년)`,
    description: `${label} 아파트 1주택 취득세는 ${rate} 세율로 취득세와 지방교육세를 합쳐 ${koreanWon(one.total)}입니다. 85㎡ 초과는 ${koreanWon(oneLarge.total)}, 조정대상지역 2주택은 ${koreanWon(heavy8.total)}입니다. 주택 수별 표와 생애최초 감면 예시를 확인하세요.`,
    path: `/acquisition-tax/${m}/`,
    keywords: [`${label} 아파트 취득세`, `${label} 취득세`, `${label} 집 취득세`, `${label} 2주택 취득세`, "취득세 계산기"],
  });
}

export default async function AcquisitionTaxDetailPage({ params }: Props) {
  const m = findAcqPage((await params).price);
  if (m === null) notFound();
  const { price, label, one, oneLarge, heavy8, rate } = facts(m);
  const eok = price / EOK;
  const midBracket = price > LOW_BRACKET_MAX && price <= HIGH_BRACKET_MIN;
  const firstHomeOk = price <= FIRST_HOME_PRICE_CAP;

  const fh200 = computeAcquisitionTax({ price, ...ONE, firstHome: true, firstHomeLimit: FIRST_HOME_LIMIT })!;
  const fh200Large = computeAcquisitionTax({ price, ...ONE, over85: true, firstHome: true, firstHomeLimit: FIRST_HOME_LIMIT })!;
  const fh300 = computeAcquisitionTax({ price, ...ONE, firstHome: true, firstHomeLimit: FIRST_HOME_LIMIT_SMALL })!;
  const fh300Large = computeAcquisitionTax({
    price,
    ...ONE,
    over85: true,
    firstHome: true,
    firstHomeLimit: FIRST_HOME_LIMIT_SMALL,
  })!;
  const heavy12 = computeAcquisitionTax({ price, houses: 3, regulated: true, over85: false })!;

  // Bracket context: what happens just above 6억 or just past this price.
  const nextUp = price + 1_000 * MAN;
  const nextUpRate = rateLabel(standardRateUnits(nextUp));
  const nextUpTotal = totalFor(nextUp, ONE);

  let bracketNote: string;
  if (price <= LOW_BRACKET_MAX) {
    bracketNote =
      price === LOW_BRACKET_MAX
        ? `${label}원은 1%가 적용되는 마지막 가격입니다. 1,000만원 더 비싼 ${koreanWon(nextUp)}이면 세율이 ${nextUpRate}로 올라 1주택 합계가 ${koreanWon(nextUpTotal)}이 됩니다.`
        : `6억원 이하 주택은 가격과 관계없이 1%라서, ${label}원 아파트의 취득세는 매매가의 1%인 ${koreanWon(one.acqTax)}입니다. 6억원을 넘는 순간부터 세율이 조금씩 올라갑니다.`;
  } else if (midBracket) {
    bracketNote =
      price === HIGH_BRACKET_MIN
        ? `${label}원은 6억원 초과 9억원 이하 구간의 끝이라 계산식으로 구한 세율이 정확히 3%입니다. 9억원을 넘는 집도 3%라서, 이 가격부터는 금액에 비례해 세금이 늘어납니다.`
        : `${label}원은 6억원 초과 9억원 이하 구간이라 세율이 가격에 따라 정해집니다. 매매가가 5,000만원 오를 때마다 세율이 약 0.33%p씩 올라, ${koreanWon(nextUp)}이면 ${nextUpRate}(1주택 합계 ${koreanWon(nextUpTotal)})입니다.`;
  } else {
    bracketNote = `9억원을 넘는 주택은 1주택이어도 최고 세율 3%가 적용되고, 가격이 더 올라도 세율은 그대로입니다. 그래서 ${label}원 아파트의 취득세는 매매가의 3%인 ${koreanWon(one.acqTax)}입니다.`;
  }

  const faq: FaqItem[] = [
    {
      q: `${label} 아파트 취득세는 얼마인가요?`,
      a: `1주택이고 전용 85㎡ 이하라면 세율 ${rate}로 취득세 ${koreanWon(one.acqTax)}, 지방교육세 ${koreanWon(one.edu)}을 합쳐 ${koreanWon(one.total)}입니다. 전용 85㎡를 넘으면 농어촌특별세 ${koreanWon(oneLarge.rural)}이 더해져 ${koreanWon(oneLarge.total)}입니다.`,
    },
    {
      q: `${label} 아파트를 두 번째 집으로 사면 취득세는요?`,
      a: `새 집이 조정대상지역이면 8% 중과로 ${koreanWon(heavy8.total)}(85㎡ 이하)입니다. 비조정대상지역이거나 기존 집을 기한 안에 파는 일시적 2주택이면 1주택과 같은 ${koreanWon(one.total)}입니다.`,
    },
    firstHomeOk
      ? {
          q: `${label} 아파트 생애최초 감면을 받으면 얼마인가요?`,
          a:
            fh200.acqTax === 0
              ? `산출 취득세가 ${koreanWon(one.acqTax)}으로 200만원 이하라 취득세가 전액 면제되고 지방교육세도 내지 않습니다. 전용 85㎡ 이하라면 낼 세금이 없어 ${koreanWon(one.total)}을 아낍니다.`
              : `산출 취득세 ${koreanWon(one.acqTax)}에서 ${koreanWon(fh200.reduction)}을 빼고 지방교육세도 같은 비율로 줄어 전용 85㎡ 이하 기준 ${koreanWon(fh200.total)}입니다. 감면 전보다 ${koreanWon(one.total - fh200.total)} 적습니다.`,
        }
      : {
          q: `${label} 아파트도 생애최초 감면을 받을 수 있나요?`,
          a: `아니요. 생애최초 감면은 취득가액 12억원 이하 주택만 대상이라 ${label}원 아파트는 첫 집이어도 감면 없이 ${koreanWon(one.total)}(85㎡ 이하)을 냅니다.`,
        },
  ];

  return (
    <ToolShell
      slug="acquisition-tax"
      path={`/acquisition-tax/${m}/`}
      extraCrumbs={[{ name: `${label} 취득세`, path: `/acquisition-tax/${m}/` }]}
      h1={`${label} 아파트 취득세: 1주택 ${koreanWon(one.total)} (85㎡ 이하)`}
      lead={`${label}원 아파트를 1주택으로 사면 취득세 ${rate}에 지방교육세를 더해 ${koreanWon(one.total)}입니다. 전용 85㎡를 넘으면 ${koreanWon(oneLarge.total)}, 조정대상지역에서 2주택이 되면 ${koreanWon(heavy8.total)}입니다.`}
      basis={BASIS}
      calculator={<AcquisitionTaxCalculator initialPrice={m} />}
      faq={faq}
      appCategory="FinanceApplication"
    >
      <h2>{label} 아파트 취득세 계산</h2>
      {midBracket ? <p className="formula">세율 = {eok} × 2/3 − 3 = {rate}</p> : null}
      <p className="formula">
        {label}원 × {rate} = {formatWon(one.acqTax)} (취득세) + {formatWon(one.edu)} (지방교육세) = {formatWon(one.total)}
      </p>
      <p>
        {label}원은 {bracketLabel(price)} 구간입니다. {bracketNote} 지방교육세는 취득세율의 10%인{" "}
        {rateLabel(one.eduUnits)}입니다.
      </p>
      <p>
        전용면적이 85㎡를 넘는 집이면 농어촌특별세 0.2%인 {koreanWon(oneLarge.rural)}이 붙어{" "}
        <strong>{koreanWon(oneLarge.total)}</strong>입니다. 같은 {label}원 아파트를 조정대상지역에서 두 번째 집으로 사면 8%
        중과로 {koreanWon(heavy8.total)}을 내 1주택보다 {koreanWon(heavy8.total - one.total)} 많고, 조정대상지역 3주택이면
        12%가 적용돼 {koreanWon(heavy12.total)}입니다.
      </p>

      <h2>{label} 아파트 주택 수·지역별 취득세</h2>
      <div className="table-wrap">
        <table className="data-table">
          <caption>취득세·지방교육세·농어촌특별세 합계, 감면 미반영</caption>
          <thead>
            <tr>
              <th scope="col">취득 후 주택 수</th>
              <th scope="col">취득세율</th>
              <th scope="col">85㎡ 이하</th>
              <th scope="col">85㎡ 초과</th>
            </tr>
          </thead>
          <tbody>
            {SCENARIOS.map((sc) => {
              const small = computeAcquisitionTax({ price, ...sc.input, over85: false })!;
              const large = computeAcquisitionTax({ price, ...sc.input, over85: true })!;
              return (
                <tr key={sc.key} className={sc.key === "1" ? "is-current" : undefined}>
                  <td>{sc.label}</td>
                  <td>{rateLabel(small.rateUnits)}</td>
                  <td>{formatWon(small.total)}</td>
                  <td>{formatWon(large.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="note">
        주택 수는 이번에 사는 집을 포함한 세대 전체 기준이고, 지역은 새로 사는 집의 위치로 판단합니다. 조정대상지역
        2주택이라도 일시적 2주택이면 1주택과 같은 세금을 냅니다.
      </p>

      <h2>{label} 아파트 생애최초 감면 적용 예</h2>
      {firstHomeOk ? (
        <>
          <p>
            무주택자가 {label}원 아파트를 첫 집으로 사면 산출 취득세 {koreanWon(one.acqTax)}
            {one.acqTax <= FIRST_HOME_LIMIT
              ? "이 200만원 이하라 취득세가 전액 면제되고 지방교육세도 함께 없어집니다."
              : `에서 200만원을 빼 ${koreanWon(fh200.acqTax)}만 냅니다. 지방교육세도 같은 비율로 줄어 ${koreanWon(fh200.edu)}입니다.`}{" "}
            아파트는 인구감소지역에 있을 때만 한도가 300만원이고, 그러면 합계는 {koreanWon(fh300.total)}입니다.
            {price <= FIRST_HOME_SMALL_CAP_CAPITAL
              ? " 아파트가 아닌 전용 60㎡ 이하 연립·다세대·도시형생활주택은 취득가액 3억원(수도권 6억원) 이하일 때 300만원 한도를 받습니다."
              : ""}
          </p>
          <p>
            부모와 같은 세대라 세대 주택 수로는 2주택이 되더라도, 본인과 배우자가 집을 가진 적이 없다면 생애최초 감면 대상입니다.
            이때는 조정대상지역이어도 8% 중과({koreanWon(heavy8.total)}, 85㎡ 이하)를 하지 않고 아래 표의 생애최초 금액이 적용됩니다.
          </p>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">구분</th>
                  <th scope="col">취득세 감면액</th>
                  <th scope="col">85㎡ 이하 합계</th>
                  <th scope="col">85㎡ 초과 합계</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>감면 없음</td>
                  <td>0원</td>
                  <td>{formatWon(one.total)}</td>
                  <td>{formatWon(oneLarge.total)}</td>
                </tr>
                <tr className="is-current">
                  <td>생애최초 (한도 200만원)</td>
                  <td>{formatWon(fh200.reduction)}</td>
                  <td>{formatWon(fh200.total)}</td>
                  <td>{formatWon(fh200Large.total)}</td>
                </tr>
                <tr>
                  <td>생애최초 · 인구감소지역 (한도 300만원)</td>
                  <td>{formatWon(fh300.reduction)}</td>
                  <td>{formatWon(fh300.total)}</td>
                  <td>{formatWon(fh300Large.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="note">
            85㎡ 초과 주택은 감면받은 취득세의 20%가 농어촌특별세로 붙어 혜택이 조금 줄어듭니다(넉넉하게 잡은 추정).
            취득일부터 3년 안에 팔거나 증여하거나 임대하면 감면세액을 추징합니다. 2026년 1월 1일 이후 취득분은 3개월 안에
            전입해야 하는 요건이 없어졌습니다.
          </p>
        </>
      ) : (
        <p>
          생애최초 감면은 취득가액 12억원 이하 주택에만 적용됩니다. {label}원 아파트는 12억원을 넘어 무주택자가 첫 집으로
          사더라도 감면 없이 1주택 세율 3%를 그대로 적용해 {koreanWon(one.total)}(85㎡ 이하)을 냅니다. 12억원 아파트였다면
          200만원 감면으로 합계가 {koreanWon(totalFor(FIRST_HOME_PRICE_CAP, { ...ONE, firstHome: true }))}이 됩니다.
        </p>
      )}

      <h2>{label} 주변 가격 취득세 비교</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">취득가액</th>
              <th scope="col">1주택 세율</th>
              <th scope="col">1주택 85㎡ 이하</th>
              <th scope="col">조정 2주택</th>
            </tr>
          </thead>
          <tbody>
            {neighborsOf(m).map((n) => {
              const p = n * MAN;
              const current = n === m;
              return (
                <tr key={n} className={current ? "is-current" : undefined}>
                  <td>{current ? priceLabel(n) : <Link href={`/acquisition-tax/${n}/`}>{priceLabel(n)}</Link>}</td>
                  <td>{rateLabel(standardRateUnits(p))}</td>
                  <td>{formatWon(totalFor(p, ONE))}</td>
                  <td>{formatWon(totalFor(p, HEAVY8))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="note">
        이 표와 계산기는 주택 매매 기준 추정치입니다. 일시적 2주택 처분 기한, 증여·상속, 분양권·입주권, 저가주택 중과
        제외 같은 예외는{" "}
        <a href={SOURCE_LINKS.wetax} rel="noopener">
          위택스
        </a>
        나 관할 시·군·구청에서 확인하세요.
      </p>

      <h2>다른 금액 취득세 보기</h2>
      <nav aria-label="금액별 취득세 페이지" className="link-grid">
        <Link href="/acquisition-tax/">취득세 계산기</Link>
        {ACQ_PAGE_MANWON.map((n) => (
          <Link key={n} href={`/acquisition-tax/${n}/`} aria-current={n === m ? "page" : undefined}>
            {priceLabel(n)} 취득세
          </Link>
        ))}
      </nav>
    </ToolShell>
  );
}
