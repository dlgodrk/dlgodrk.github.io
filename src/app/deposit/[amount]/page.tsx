import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber, formatWon, manwonLabel } from "@/lib/format";
import { RULE_YEAR } from "@/lib/site";
import {
  calcDeposit,
  comprehensiveTaxRatePct,
  DEPOSIT_PAGE_MANWON,
  DEPOSIT_PROTECTION_LIMIT,
  depositAmountLabel,
  depositPageHeadline,
  EXAMPLE_RATE_PCT,
  grossInterest,
  grossInterestByDays,
  institutionsNeeded,
  monthlyPayout,
  netInterestSimple,
  TABLE_MONTHS,
  TABLE_RATES,
} from "@/lib/calc/deposit";
import { approxWon, calcCompound, INVEST_DISCLAIMER, scenariosForLump } from "@/lib/calc/compound-interest";
import { DepositCalculator } from "../DepositCalculator";

// Only the listed amounts exist; anything else is a 404 (required for static export).
export const dynamicParams = false;

export function generateStaticParams() {
  return DEPOSIT_PAGE_MANWON.map((m) => ({ amount: String(m) }));
}

type Props = { params: Promise<{ amount: string }> };

function parse(raw: string): number | null {
  const n = Number(raw);
  return DEPOSIT_PAGE_MANWON.includes(n) ? n : null;
}

const RATE = EXAMPLE_RATE_PCT;
const PAYOUT_RATES = [2.5, 3, 3.5, 4];

function yearCalc(principal: number, rate = RATE) {
  return calcDeposit({ principal, months: 12, ratePct: rate, method: "simple", taxType: "general" });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const manwon = parse((await params).amount);
  if (manwon === null) return {};
  const label = depositAmountLabel(manwon);
  const r = yearCalc(manwon * 10_000);
  return pageMetadata({
    title: depositPageHeadline(manwon).title,
    description: `${label}을 연 ${RATE}% 정기예금에 1년 맡기면 세전 이자 ${formatNumber(r.grossInterest)}원, 세금 15.4%를 떼고 세후 ${formatNumber(r.netInterest)}원을 받습니다. 연 2~5% 금리, 3·6·12·24개월별 세후 이자표와 월 이자 지급액을 확인하세요.`,
    path: `/deposit/${manwon}/`,
    keywords: [`${label} 예금 이자`, `${label} 정기예금 이자`, `${label} 이자 계산`, `${label} 1년 이자`, "예금 이자 계산기"],
  });
}

export default async function DepositAmountPage({ params }: Props) {
  const manwon = parse((await params).amount);
  if (manwon === null) notFound();
  const P = manwon * 10_000;
  const label = depositAmountLabel(manwon);
  const r = yearCalc(P);
  const compound = grossInterest(P, RATE, 12, "monthly");
  const payout = monthlyPayout(P, RATE, "general");
  const payoutYear = payout.net * 12;
  const payoutDiff = payoutYear - r.netInterest;

  // 은행식 일할 계산(원금 × 연이율 × 일수 / 365)과 개월 수 계산의 차이
  const day28 = grossInterestByDays(P, RATE, 28);
  const day31 = grossInterestByDays(P, RATE, 31);
  const sixMonths = grossInterest(P, RATE, 6, "simple");
  const day181 = grossInterestByDays(P, RATE, 181);
  const day184 = grossInterestByDays(P, RATE, 184);
  const sixGap = Math.max(sixMonths - day181, day184 - sixMonths);

  // 금융소득종합과세: rate at which this deposit alone passes 2천만원 in its payout year.
  const ctRate12 = comprehensiveTaxRatePct(P, 12);
  const ctRate24 = comprehensiveTaxRatePct(P, 24);
  const ctText =
    ctRate24 >= 10
      ? `${label}이면 2년 만기로 이자를 한 번에 받아도 금리가 연 ${formatNumber(ctRate24, 2)}%를 넘어야 이 예금 하나로 2천만원을 넘으므로, 사실상 이 예금만으로는 종합과세 걱정이 없습니다. 다만 같은 해에 받은 다른 이자·배당과 합산된다는 점은 기억해 두세요.`
      : `${label}이면 1년 만기 기준 금리가 연 ${formatNumber(ctRate12, 2)}%를 넘을 때, 2년 만기로 이자를 한 번에 받으면 연 ${formatNumber(ctRate24, 2)}%를 넘을 때 이 예금 하나로 그해 금융소득이 2천만원을 넘습니다. 넘으면 초과분이 다른 소득과 합산돼 종합과세되므로, 월 이자 지급식이나 만기 분산을 고려할 만합니다.`;

  // 예금자보호: principal + 1년 이자 (연 RATE%) vs 1억원
  const withInterest = P + r.grossInterest;
  const nInst = institutionsNeeded(withInterest);
  const maxSafeManwon = Math.floor(DEPOSIT_PROTECTION_LIMIT / (1 + RATE / 100) / 10_000);
  // 한도를 넘는 부분: 원금이 1억 이하이면 이자 일부만, 1억을 넘으면 원금 일부도 보호받지 못한다.
  const unprotected = Math.max(0, withInterest - DEPOSIT_PROTECTION_LIMIT);
  const principalCovered = P <= DEPOSIT_PROTECTION_LIMIT;
  const protectText =
    withInterest <= DEPOSIT_PROTECTION_LIMIT
      ? `원금과 연 ${RATE}% 1년 이자를 합쳐도 ${formatWon(withInterest)}으로 예금자보호 한도 1억원 안입니다. 같은 금융회사에 다른 예금이 없다면 원금과 이자 모두 보호됩니다. 같은 금융회사의 다른 예·적금은 합산된다는 점만 확인하세요.`
      : `원금과 연 ${RATE}% 1년 이자를 합치면 ${formatWon(withInterest)}으로 예금자보호 한도 1억원을 넘습니다. ${
          principalCovered
            ? `원금 ${label}은 보호되지만 이자 ${formatWon(unprotected)}은 한도를 넘어 보호받지 못합니다. 이자까지 보호받으려면`
            : `한 곳에 맡기면 ${formatWon(unprotected)}(원금 일부와 이자)은 보호받지 못합니다. 전액을 보호받으려면`
        } 최소 ${nInst}곳의 금융회사에 나눠 맡겨야 하며, 한 곳에 원금 ${manwonLabel(maxSafeManwon)} 이하로 넣으면 1년 이자까지 1억원 안에 들어갑니다.`;

  // 복리로 오래 굴릴 때: 1년 예금 재예치(연복리, 세전)와 같은 원금의 복리 시나리오 (서로 링크).
  const rollover = calcCompound({ principal: P, monthly: 0, ratePct: RATE, years: 10, compounding: "yearly" });
  const scenarios = scenariosForLump(P);

  const idx = DEPOSIT_PAGE_MANWON.indexOf(manwon);
  const prev = idx > 0 ? DEPOSIT_PAGE_MANWON[idx - 1] : null;
  const next = idx < DEPOSIT_PAGE_MANWON.length - 1 ? DEPOSIT_PAGE_MANWON[idx + 1] : null;

  const faq: FaqItem[] = [
    {
      q: `${label} 예금 1년 이자는 얼마인가요?`,
      a: `단리, 일반과세(15.4%) 기준 세후 이자는 연 2.5%면 ${formatNumber(netInterestSimple(P, 2.5, 12))}원, 연 3%면 ${formatNumber(netInterestSimple(P, 3, 12))}원, 연 3.5%면 ${formatNumber(netInterestSimple(P, 3.5, 12))}원, 연 4%면 ${formatNumber(netInterestSimple(P, 4, 12))}원입니다.`,
    },
    {
      q: `${label}을 월 이자 지급식으로 맡기면 매달 얼마 받나요?`,
      a: `연 ${RATE}% 기준 매달 세전 ${formatNumber(payout.gross)}원에서 세금 ${formatNumber(payout.tax)}원을 떼고 ${formatNumber(payout.net)}원이 입금됩니다. 이 금액은 한 달 평균이고, 은행은 달마다 일수로 계산하므로 실제 세전 이자는 28일인 달에 약 ${formatNumber(day28)}원(약 8% 적음), 31일인 달에 약 ${formatNumber(day31)}원(약 2% 많음)입니다.`,
    },
    {
      q: `${label}을 6개월만 맡기면 이자는 얼마인가요?`,
      a: `연 ${RATE}% 단리라면 6개월 세전 이자는 ${formatNumber(grossInterest(P, RATE, 6, "simple"))}원, 세후 ${formatNumber(netInterestSimple(P, RATE, 6))}원입니다. 6개월 만기 금리는 1년 만기와 다르게 정해지는 경우가 많으니 상품별 금리를 넣어 계산해 보세요.`,
    },
    {
      q: `${label} 예금도 전액 예금자보호가 되나요?`,
      a:
        withInterest <= DEPOSIT_PROTECTION_LIMIT
          ? `네. 2025년 9월 1일부터 예금자보호 한도가 금융회사별 1억원이라, 같은 곳에 다른 예금이 없다면 ${label}과 이자는 모두 보호됩니다.`
          : principalCovered
            ? `원금 ${label}은 모두 보호됩니다. 다만 한도가 금융회사별 1인당 원금과 이자를 합쳐 1억원이라, 연 ${RATE}% 1년 이자${
                unprotected >= r.grossInterest
                  ? ` ${formatNumber(r.grossInterest)}원은 모두`
                  : ` 중 ${formatNumber(unprotected)}원은`
              } 한도를 넘어 보호받지 못합니다. 이자까지 보호받으려면 ${nInst}곳 이상에 나눠 맡기세요.`
            : `일부만 보호됩니다. 한도는 금융회사별 1인당 원금과 이자를 합쳐 1억원이라, ${label}을 전액 보호받으려면 최소 ${nInst}곳에 나눠 맡겨야 합니다.`,
    },
  ];

  return (
    <ToolShell
      slug="deposit"
      path={`/deposit/${manwon}/`}
      extraCrumbs={[{ name: `${label} 예금 이자`, path: `/deposit/${manwon}/` }]}
      h1={depositPageHeadline(manwon).h1}
      lead={`${label}을 연 ${RATE}% 정기예금에 1년 맡기면 세전 이자 ${formatWon(r.grossInterest)}에서 세금 15.4%를 떼고 세후 ${formatWon(r.netInterest)}을 받습니다. 금리 2~5%, 기간 3~24개월별 세후 이자를 표로 정리했어요.`}
      basis={`${RULE_YEAR}년 세법 기준 · 단리 · 일반과세 15.4%(소득세 14% + 지방소득세 1.4%)`}
      calculator={<DepositCalculator initialAmount={P} />}
      faq={faq}
      appCategory="FinanceApplication"
    >
      <h2>{label} 1년 예금 이자 계산</h2>
      <p className="formula">
        {formatNumber(P)}원 × {RATE}% = 세전 {formatWon(r.grossInterest)} → 세금 {formatWon(r.totalTax)} → 세후{" "}
        {formatWon(r.netInterest)}
      </p>
      <p>
        세금 {formatWon(r.totalTax)}은 소득세 {formatWon(r.incomeTax)}(14%)와 지방소득세 {formatWon(r.localTax)}(1.4%)를 합한
        금액입니다. 만기에는 원금을 더해 <strong>{formatWon(r.maturity)}</strong>을 받습니다. 같은 금리라도 월복리 상품이라면 1년
        세전 이자는 {formatWon(compound)}으로 단리보다 {formatWon(compound - r.grossInterest)} 많습니다.
      </p>

      <h2>{label} 금리·기간별 세후 이자표</h2>
      <p>
        단리, 일반과세(15.4%)로 만기에 한 번에 받는 경우의 세후 이자입니다. 연 {RATE}% 줄은 위의 예시와 같은 조건입니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>{label} 예치 시 세후 이자 (원)</caption>
          <thead>
            <tr>
              <th scope="col">연 금리</th>
              {TABLE_MONTHS.map((m) => (
                <th key={m} scope="col">
                  {m}개월
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TABLE_RATES.map((rate) => (
              <tr key={rate} className={rate === RATE ? "is-current" : undefined}>
                <td>{formatNumber(rate, 2)}%</td>
                {TABLE_MONTHS.map((m) => (
                  <td key={m}>{formatNumber(netInterestSimple(P, rate, m))}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>{label} 월 이자 지급식으로 받으면</h2>
      <p>
        매달 이자를 받는 월 이자 지급식 정기예금이라면 연 {RATE}% 기준 매달 세전 {formatWon(payout.gross)}에서 세금{" "}
        {formatWon(payout.tax)}을 떼고 <strong>{formatWon(payout.net)}</strong>이 입금됩니다. 1년 합계는 {formatWon(payoutYear)}
        {payoutDiff === 0
          ? "으로 만기에 한 번에 받는 세후 이자와 같습니다."
          : `으로, 만기에 한 번에 받는 세후 이자(${formatWon(r.netInterest)})와 ${formatWon(Math.abs(payoutDiff))} 차이가 납니다. 이자를 받을 때마다 세금을 떼면서 10원 미만을 버리기 때문입니다.`}{" "}
        이자를 다시 굴리지 않아 복리 효과는 없지만, 생활비로 쓰거나 이자 소득이 한 해에 몰리지 않게 하는 데 유리합니다. 아래
        표는 한 달 평균 금액이고, 은행은 달마다 일수로 계산하므로 실제 세전 이자는 28일인 달에 {formatWon(day28)}, 31일인 달에{" "}
        {formatWon(day31)}으로 달라집니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">연 금리</th>
              <th scope="col">매달 세전</th>
              <th scope="col">매달 세금</th>
              <th scope="col">매달 세후</th>
            </tr>
          </thead>
          <tbody>
            {PAYOUT_RATES.map((rate) => {
              const p = monthlyPayout(P, rate, "general");
              return (
                <tr key={rate} className={rate === RATE ? "is-current" : undefined}>
                  <td>{formatNumber(rate, 2)}%</td>
                  <td>{formatWon(p.gross)}</td>
                  <td>{formatWon(p.tax)}</td>
                  <td>{formatWon(p.net)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>{label} 예금, 세금과 예금자보호 확인</h2>
      <p>
        <strong>금융소득종합과세</strong>: {ctText}
      </p>
      <p>
        <strong>예금자보호</strong>: {protectText}
      </p>
      <p className="note">
        표의 금액은 개월 수로 계산한 값입니다. 은행은 실제 예치일수를 365로 나눠 계산하므로 일수에 따라 금액이 달라집니다. 예를
        들어 {label}을 연 {RATE}%로 6개월 맡기면 예치일수(181~184일)에 따라 세전 이자가 {formatWon(day181)}~
        {formatWon(day184)}으로, 개월 수로 계산한 {formatWon(sixMonths)}과 최대 {formatWon(sixGap)} 차이가 납니다.
      </p>

      <h2>{label}을 오래 굴리면 (복리)</h2>
      <p>
        1년 만기 예금을 연 {RATE}%로 10년 동안 원금과 이자까지 다시 맡기면(세전, 해마다 복리) {label}은 약{" "}
        <strong>{approxWon(rollover.balance)}</strong>이 됩니다. 실제로는 만기마다 이자에서 세금을 떼므로 이보다 조금 적습니다.
      </p>
      {scenarios.length ? (
        <ul>
          {scenarios.map((s) => {
            const x = calcCompound({ principal: P, monthly: 0, ratePct: s.ratePct, years: s.years });
            return (
              <li key={s.slug}>
                연 {s.ratePct}% 수익을 가정해 {s.years}년 동안 월복리로 굴리면 약 <strong>{approxWon(x.balance)}</strong>으로 원금의{" "}
                {formatNumber(x.balance / P, 2)}배가 됩니다.{" "}
                <Link href={`/compound-interest/${s.slug}/`}>
                  {s.label} 연 {s.ratePct}% 복리 계산 보기
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>
          기간과 수익률을 바꿔 보려면 <Link href="/compound-interest/">복리 계산기</Link>를 이용하세요.
        </p>
      )}
      {scenarios.length ? (
        <p className="note">
          예금은 약정 금리가 확정되지만, 위 목록의 수익률은 투자 상품을 가정한 값입니다. {INVEST_DISCLAIMER}
        </p>
      ) : null}

      <h2>다른 금액 예금 이자 보기</h2>
      <p>
        {prev !== null ? (
          <>
            <Link href={`/deposit/${prev}/`}>{depositAmountLabel(prev)} 예금 이자</Link>
            {next !== null ? " · " : null}
          </>
        ) : null}
        {next !== null ? <Link href={`/deposit/${next}/`}>{depositAmountLabel(next)} 예금 이자</Link> : null}
      </p>
      <nav aria-label="금액별 예금 이자 페이지" className="link-grid">
        {DEPOSIT_PAGE_MANWON.map((m) => (
          <Link key={m} href={`/deposit/${m}/`} aria-current={m === manwon ? "page" : undefined}>
            {depositAmountLabel(m)} 예금 이자
          </Link>
        ))}
      </nav>
    </ToolShell>
  );
}
