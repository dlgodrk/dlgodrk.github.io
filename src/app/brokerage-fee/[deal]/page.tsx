import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber, formatWon, koreanWon } from "@/lib/format";
import {
  applyRate,
  bracketLabel,
  BROKERAGE_FEE_PAGES,
  computeBrokerageFee,
  feeRule,
  findFeePage,
  LEASE_TABLE_AMOUNTS,
  maxFeeFor,
  neighborsOf,
  SALE_TABLE_AMOUNTS,
  withVat,
  type FeePage,
} from "@/lib/calc/brokerage-fee";
import { BrokerageFeeCalculator } from "../BrokerageFeeCalculator";

// Only the listed amounts exist; anything else is a 404 (required for static export).
export const dynamicParams = false;

export function generateStaticParams() {
  return BROKERAGE_FEE_PAGES.map((p) => ({ deal: p.slug }));
}

type Props = { params: Promise<{ deal: string }> };

const BASIS = "공인중개사법 시행규칙 제20조·별표 1, 서울·경기 주택 중개보수 조례 기준 · 2026년 10월 9일 확인";

function short(won: number): string {
  return koreanWon(won).replace(/원$/, "");
}

function pctLabel(rate: number): string {
  return `${formatNumber(rate, 2)}%`;
}

/** Page-specific numbers shared by metadata and the page body. */
function facts(p: FeePage) {
  const isSale = p.deal === "sale";
  const rule = feeRule("house", p.deal, p.amount);
  const fee = maxFeeFor("house", p.deal, p.amount);
  const label = short(p.amount);
  const subject = isSale ? `${label} 아파트 매매` : `전세 ${label}`;
  return { isSale, rule, fee, label, subject, vat: withVat(fee) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = findFeePage((await params).deal);
  if (!p) return {};
  const { isSale, rule, fee, label, vat } = facts(p);
  const payers = isSale ? "매도인·매수인" : "임대인·임차인";
  return pageMetadata({
    title: isSale
      ? `${label} 아파트 복비 - 매매 중개수수료 상한 ${koreanWon(fee)}`
      : `전세 ${label} 복비 - 중개수수료 상한 ${koreanWon(fee)}`,
    description: `${isSale ? `${label} 아파트 매매` : `전세 ${label}`} 중개보수(복비) 상한은 ${label} × ${pctLabel(rule.rate)} = ${koreanWon(fee)}이고, 부가세 10%를 더하면 ${koreanWon(vat)}입니다. ${payers}이 각각 냅니다. 협의 요율별 금액과 주변 금액 비교표를 확인하세요.`,
    path: `/brokerage-fee/${p.slug}/`,
    keywords: isSale
      ? [`${label} 아파트 복비`, `${label} 매매 중개수수료`, `${label} 복비`, "복비 계산기"]
      : [`전세 ${label} 복비`, `전세 ${label} 중개수수료`, `${label} 전세 복비`, "복비 계산기"],
  });
}

export default async function BrokerageFeeDetailPage({ params }: Props) {
  const p = findFeePage((await params).deal);
  if (!p) notFound();
  const { isSale, rule, fee, label, subject, vat } = facts(p);
  const bracket = rule.bracket!;
  const payers = isSale ? "매도인과 매수인" : "임대인과 임차인";
  const MAN = 10_000;

  // Neighbouring amounts for the comparison table.
  const list = isSale ? SALE_TABLE_AMOUNTS : LEASE_TABLE_AMOUNTS;
  const neighbors = neighborsOf(list, p.amount);

  // Lower agreed rates people commonly negotiate (0.05%p steps below the cap, at least 0.1%).
  const agreedRates: number[] = [];
  for (let r = rule.rate; r >= 0.1 - 1e-9 && agreedRates.length < 5; r = Math.round((r - 0.05) * 100) / 100) agreedRates.push(r);
  const sampleRate = agreedRates[Math.min(2, agreedRates.length - 1)];

  // Bracket-boundary context.
  const nextAmount = bracket.max;
  const nextRule = nextAmount !== null ? feeRule("house", p.deal, nextAmount) : null;
  const nextFee = nextAmount !== null ? maxFeeFor("house", p.deal, nextAmount) : null;
  const atBoundary = bracket.min === p.amount && bracket.min > 0;
  const belowAmount = p.amount - 1_000 * MAN;
  const belowRule = atBoundary ? feeRule("house", p.deal, belowAmount) : null;
  const belowFee = atBoundary ? maxFeeFor("house", p.deal, belowAmount) : null;

  // Same amount under the other deal type.
  const otherDeal = isSale ? "jeonse" : "sale";
  const otherFee = maxFeeFor("house", otherDeal, p.amount);
  const otherRule = feeRule("house", otherDeal, p.amount);

  const faq: FaqItem[] = [
    {
      q: `${subject} 복비는 얼마인가요?`,
      a: `상한은 ${label} × ${pctLabel(rule.rate)} = ${koreanWon(fee)}(부가세 별도)입니다. 이 금액은 받을 수 있는 최대치이고, 실제 보수는 그 안에서 중개사와 협의해 정합니다.`,
    },
    {
      q: isSale ? `${label} 매매 복비는 매도인과 매수인이 모두 내나요?` : `전세 ${label} 복비는 집주인도 내나요?`,
      a: `네. 중개보수는 중개의뢰인 쌍방으로부터 각각 받으므로 ${payers}이 각자 최대 ${koreanWon(fee)}을 냅니다. 중개사 한 곳이 양쪽을 모두 중개했다면 한 거래에서 받는 보수는 최대 ${koreanWon(fee * 2)}입니다.`,
    },
    {
      q: `${subject} 복비를 부가세까지 하면 얼마인가요?`,
      a: `일반과세자 중개사무소는 보수의 10%를 부가세로 따로 받으므로 한쪽당 최대 ${koreanWon(vat)}입니다. 간이과세자 사무소라면 금액이 다를 수 있으니 사업자 유형을 확인해 보세요.`,
    },
    {
      q: `${subject} 복비를 ${pctLabel(sampleRate)}로 협의하면 얼마인가요?`,
      a: `${label} × ${pctLabel(sampleRate)} = ${koreanWon(applyRate(p.amount, sampleRate))}입니다. 상한요율 ${pctLabel(rule.rate)} 이내라면 얼마로 정할지는 중개사와 합의하기 나름입니다.`,
    },
  ];

  const crumbName = isSale ? `${label} 매매` : `전세 ${label}`;

  return (
    <ToolShell
      slug="brokerage-fee"
      path={`/brokerage-fee/${p.slug}/`}
      extraCrumbs={[{ name: crumbName, path: `/brokerage-fee/${p.slug}/` }]}
      h1={`${subject} 복비: 상한 ${koreanWon(fee)}`}
      lead={`${subject}의 중개보수(복비) 상한은 ${koreanWon(fee)}입니다. 부가세 10%를 더하면 ${koreanWon(vat)}이고, ${payers}이 각각 냅니다.`}
      basis={BASIS}
      calculator={<BrokerageFeeCalculator initialDeal={isSale ? "s" : "j"} initialAmount={p.amount / MAN} />}
      faq={faq}
      appCategory="FinanceApplication"
    >
      <h2>{subject} 복비 계산</h2>
      <p className="formula">
        {label} × {pctLabel(rule.rate)} = {formatWon(fee)}
      </p>
      <p>
        {label}은 주택 {isSale ? "매매" : "임대차"} 요율표의 <strong>{bracketLabel(bracket)}</strong> 구간이라 상한요율{" "}
        {pctLabel(rule.rate)}가 적용되고 {bracket.cap === null ? "한도액은 없습니다" : `한도액은 ${koreanWon(bracket.cap)}입니다`}.{" "}
        {payers}이 각각 최대 {koreanWon(fee)}을 내므로, 중개사가 양쪽을
        모두 중개했다면 한 거래에서 받는 보수는 최대 {koreanWon(fee * 2)}입니다. 일반과세자 중개사무소라면 부가세 10%를
        더해 한쪽당 {koreanWon(vat)}까지 낼 수 있습니다.
      </p>
      {atBoundary && belowRule && belowFee !== null ? (
        <p>
          {label}은 요율이 바뀌는 경계 금액입니다. {short(belowAmount)}원에 거래하면 {pctLabel(belowRule.rate)}가 적용돼
          상한이 {koreanWon(belowFee)}이지만, {label}부터는 {pctLabel(rule.rate)}로 올라 {koreanWon(fee)}이 됩니다. 구간
          경계 근처라면 요율을 미리 협의해 두는 것이 좋습니다.
        </p>
      ) : null}
      {nextAmount !== null && nextRule && nextFee !== null ? (
        <p>
          거래금액이 {koreanWon(nextAmount)}이 되면 요율이 {pctLabel(nextRule.rate)}로 바뀌어 상한이 {koreanWon(nextFee)}이
          됩니다. 같은 구간 안에서는 금액에 비례해 늘어납니다.
        </p>
      ) : (
        <p>{label}부터는 가장 높은 구간이라, 금액이 더 커져도 요율은 {pctLabel(rule.rate)}로 같고 한도액도 없습니다.</p>
      )}
      <p>
        {isSale
          ? `보증금이 같은 ${label}인 전세라면 임대차 요율 ${pctLabel(otherRule.rate)}가 적용돼 상한은 ${koreanWon(otherFee)}입니다.`
          : `같은 ${label}에 집을 매매한다면 매매 요율 ${pctLabel(otherRule.rate)}가 적용돼 상한은 ${koreanWon(otherFee)}입니다. 보증금에 월세가 붙는 반전세라면 보증금 + 월세 × 100을 거래금액으로 계산하니 위 계산기에서 월세를 선택해 보세요.`}
      </p>

      <h2>협의 요율별 {subject} 복비</h2>
      <p>상한요율보다 낮게 합의하는 경우가 많습니다. 요율별로 한쪽이 내는 금액은 아래와 같습니다.</p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">협의 요율</th>
              <th scope="col">중개보수</th>
              <th scope="col">부가세 포함</th>
            </tr>
          </thead>
          <tbody>
            {agreedRates.map((r) => {
              const f = applyRate(p.amount, r);
              return (
                <tr key={r} className={r === rule.rate ? "is-current" : undefined}>
                  <td>
                    {pctLabel(r)}
                    {r === rule.rate ? " (상한)" : ""}
                  </td>
                  <td>{formatWon(f)}</td>
                  <td>{formatWon(withVat(f))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>{label} 주변 금액 {isSale ? "매매" : "전세"} 복비 비교</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">{isSale ? "매매가" : "전세 보증금"}</th>
              <th scope="col">상한요율</th>
              <th scope="col">상한액</th>
              <th scope="col">부가세 포함</th>
            </tr>
          </thead>
          <tbody>
            {neighbors.map((a) => {
              const r = computeBrokerageFee({ target: "house", deal: p.deal, amount: a })!;
              const page = BROKERAGE_FEE_PAGES.find((x) => x.deal === p.deal && x.amount === a);
              const current = a === p.amount;
              return (
                <tr key={a} className={current ? "is-current" : undefined}>
                  <td>
                    {page && !current ? <Link href={`/brokerage-fee/${page.slug}/`}>{koreanWon(a)}</Link> : koreanWon(a)}
                  </td>
                  <td>{pctLabel(r.rule.rate)}</td>
                  <td>{formatWon(r.maxFee)}</td>
                  <td>{formatWon(withVat(r.maxFee))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="note">
        서울·경기 조례 기준 상한이며 한쪽 기준입니다. 다른 시·도는 조례 요율을 확인하세요. 지급 시기는 약정이 없으면 잔금일입니다.
      </p>

      <h2>다른 금액 복비 보기</h2>
      <nav aria-label="금액별 복비 페이지" className="link-grid">
        <Link href="/brokerage-fee/">복비 계산기</Link>
        {BROKERAGE_FEE_PAGES.map((x) => (
          <Link key={x.slug} href={`/brokerage-fee/${x.slug}/`} aria-current={x.slug === p.slug ? "page" : undefined}>
            {x.deal === "sale" ? `${short(x.amount)} 매매 복비` : `전세 ${short(x.amount)} 복비`}
          </Link>
        ))}
      </nav>
    </ToolShell>
  );
}
