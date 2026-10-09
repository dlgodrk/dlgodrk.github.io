import type { Metadata } from "next";
import Link from "next/link";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber, formatWon, koreanWon } from "@/lib/format";
import {
  bracketLabel,
  BROKERAGE_FEE_PAGES,
  computeBrokerageFee,
  findBracket,
  HOUSE_LEASE_BRACKETS,
  HOUSE_SALE_BRACKETS,
  LEASE_TABLE_AMOUNTS,
  maxFeeFor,
  OFFICETEL_LEASE_RATE,
  OFFICETEL_SALE_RATE,
  OTHER_MAX_RATE,
  SALE_TABLE_AMOUNTS,
  withVat,
  type Bracket,
  type Deal,
} from "@/lib/calc/brokerage-fee";
import { findAcqPage, totalFor } from "@/lib/calc/acquisition-tax";
import { BrokerageFeeCalculator } from "./BrokerageFeeCalculator";

export const metadata: Metadata = pageMetadata({
  title: "부동산 중개수수료(복비) 계산기 - 2026 매매·전세·월세",
  description:
    "매매·전세·월세 부동산 중개수수료(복비) 상한을 바로 계산합니다. 5억 아파트 매매는 상한 200만원, 전세 3억은 90만원(부가세 별도). 2026년 주택 중개보수 요율표와 월세 환산법까지 확인하세요.",
  path: "/brokerage-fee/",
  keywords: [
    "복비 계산기",
    "중개수수료 계산기",
    "부동산 중개보수 계산",
    "중개보수 요율표",
    "월세 복비",
    "전세 복비",
    "아파트 매매 복비",
  ],
});

const FAQ: FaqItem[] = [
  {
    q: "복비는 매도인과 매수인이 모두 내나요?",
    a: "네. 중개보수는 중개의뢰인 쌍방으로부터 각각 받도록 정해져 있습니다. 매매는 매도인과 매수인이, 전세·월세는 임대인과 임차인이 각자 상한 이내의 금액을 냅니다. 요율표의 상한은 한쪽이 내는 금액 기준입니다.",
  },
  {
    q: "상한요율대로 꼭 내야 하나요?",
    a: "아닙니다. 요율표의 금액은 받을 수 있는 최대치이고, 실제 보수는 그 안에서 중개사와 협의해 정합니다. 계약 전에 요율이나 금액을 정해 두면 잔금 때 다툼을 줄일 수 있습니다.",
  },
  {
    q: "월세 복비는 어떻게 계산하나요?",
    a: "보증금에 월세 × 100을 더한 금액을 거래금액으로 봅니다. 이 합이 5천만원 미만이면 월세 × 70으로 다시 계산합니다. 보증금 1,000만원, 월세 50만원이면 6,000만원이 거래금액이고 상한은 0.4%인 24만원입니다.",
  },
  {
    q: "복비에 부가세 10%도 내야 하나요?",
    a: "일반과세자 중개사무소라면 중개보수와 별도로 10%의 부가세를 낼 수 있습니다. 상한 200만원이면 부가세 포함 220만원입니다. 간이과세자 사무소는 세금 구조가 달라 10%를 그대로 받는 것이 맞는지 확인해 보세요.",
  },
  {
    q: "복비는 언제 내나요?",
    a: "중개사와 약정한 시기에 내고, 약정이 없으면 거래대금 지급이 끝난 날, 보통 잔금일에 냅니다(공인중개사법 시행령 제27조의2).",
  },
  {
    q: "상한보다 많이 받았다면 돌려받을 수 있나요?",
    a: "네. 상한을 넘는 부분의 약정은 무효라서 초과분을 돌려 달라고 청구할 수 있습니다. 상한을 넘겨 받는 것은 공인중개사법상 금지행위라 시·군·구청 등록관청에 신고할 수도 있습니다.",
  },
];

/** One representative amount per bracket for the "예시" column. */
const SALE_EXAMPLES = [3_000, 10_000, 50_000, 100_000, 130_000, 200_000].map((m) => m * 10_000);
const LEASE_EXAMPLES = [3_000, 7_000, 30_000, 80_000, 130_000, 200_000].map((m) => m * 10_000);

function short(won: number): string {
  return koreanWon(won).replace(/원$/, "");
}

function pageHref(deal: Deal, amount: number): string | null {
  const p = BROKERAGE_FEE_PAGES.find((x) => x.deal === deal && x.amount === amount);
  return p ? `/brokerage-fee/${p.slug}/` : null;
}

function BracketTable({ brackets, examples, deal }: { brackets: Bracket[]; examples: number[]; deal: Deal }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">거래금액</th>
            <th scope="col">상한요율</th>
            <th scope="col">한도액</th>
            <th scope="col">예시 (상한액)</th>
          </tr>
        </thead>
        <tbody>
          {brackets.map((b, i) => {
            const ex = examples[i];
            const fits = findBracket(brackets, ex) === b;
            return (
              <tr key={b.min}>
                <td>{bracketLabel(b)}</td>
                <td>{formatNumber(b.rate, 1)}%</td>
                <td>{b.cap !== null ? koreanWon(b.cap) : "없음"}</td>
                <td>{fits ? `${short(ex)} → ${koreanWon(maxFeeFor("house", deal, ex))}` : "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function QuickTable({ deal, amounts }: { deal: Deal; amounts: number[] }) {
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">{deal === "sale" ? "매매가" : "전세 보증금"}</th>
            <th scope="col">상한요율</th>
            <th scope="col">상한액</th>
            <th scope="col">부가세 포함</th>
          </tr>
        </thead>
        <tbody>
          {amounts.map((a) => {
            const r = computeBrokerageFee({ target: "house", deal, amount: a })!;
            const href = pageHref(deal, a);
            return (
              <tr key={a}>
                <td>{href ? <Link href={href}>{koreanWon(a)}</Link> : koreanWon(a)}</td>
                <td>{formatNumber(r.rule.rate, 1)}%</td>
                <td>{formatWon(r.maxFee)}</td>
                <td>{formatWon(withVat(r.maxFee))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function BrokerageFeePage() {
  const MAN = 10_000;
  const ex1 = computeBrokerageFee({ target: "house", deal: "wolse", amount: 1_000 * MAN, monthlyRent: 50 * MAN })!;
  const ex2 = computeBrokerageFee({ target: "house", deal: "wolse", amount: 500 * MAN, monthlyRent: 40 * MAN })!;
  // 한도액이 적용되는 월세 예시: 8,000만원 × 0.4% = 32만원 → 한도 30만원
  const ex3 = computeBrokerageFee({ target: "house", deal: "wolse", amount: 5_000 * MAN, monthlyRent: 30 * MAN })!;
  const sale5 = maxFeeFor("house", "sale", 5 * 100_000_000);
  const lease3 = maxFeeFor("house", "jeonse", 3 * 100_000_000);
  const acq5 = totalFor(5 * 100_000_000, { houses: 1, regulated: false, over85: false });
  const acq5Page = findAcqPage("50000");

  return (
    <ToolShell
      slug="brokerage-fee"
      h1="부동산 중개수수료(복비) 계산기"
      lead={`5억 아파트 매매 복비 상한은 ${koreanWon(sale5)}(0.4%), 전세 3억은 ${koreanWon(lease3)}(0.3%)이며 실제 복비는 이 안에서 중개사와 협의해 정합니다. 매매가나 보증금, 월세를 넣으면 법정 상한요율로 중개보수 상한액을 바로 계산해 드려요.`}
      basis="공인중개사법 시행규칙 제20조(2026. 8. 28. 시행)·별표 1(2021. 10. 19. 개정)·별표 2, 서울·경기 주택 중개보수 조례 기준 · 2026년 10월 9일 확인"
      calculator={<BrokerageFeeCalculator />}
      faq={FAQ}
      appCategory="FinanceApplication"
    >
      <h2>중개보수(복비) 계산 방법</h2>
      <p>
        중개보수는 거래금액에 상한요율을 곱해 구하고, 한도액이 있는 구간에서는 그 금액을 넘을 수 없습니다. 이렇게 나온
        금액은 <strong>받을 수 있는 최대치(상한)</strong>이고, 실제 보수는 그 안에서 중개의뢰인과 개업공인중개사가 협의해
        정합니다(공인중개사법 시행규칙 제20조).
      </p>
      <p className="formula">중개보수 상한액 = 거래금액 × 상한요율 (한도액이 있으면 한도액까지)</p>
      <p>
        예를 들어 5억원 아파트를 매매하면 5억원 × 0.4% = <strong>{koreanWon(sale5)}</strong>이 상한입니다. 매도인과 매수인이
        각각 최대 {koreanWon(sale5)}을 내고, 일반과세자 중개사무소라면 부가세 10%를 더해 {koreanWon(withVat(sale5))}이 됩니다.
        매수인은 복비와 별도로 취득세도 내는데, 같은 집을 1주택(전용 85㎡ 이하)으로 사면 지방교육세를 합쳐{" "}
        {koreanWon(acq5)}입니다(
        <Link href={acq5Page !== null ? `/acquisition-tax/${acq5Page}/` : "/acquisition-tax/"}>5억 아파트 취득세</Link>).
      </p>

      <h2>주택 매매·교환 중개보수 요율표</h2>
      <BracketTable brackets={HOUSE_SALE_BRACKETS} examples={SALE_EXAMPLES} deal="sale" />
      <p className="note">
        서울특별시·경기도 주택 중개보수 등에 관한 조례 별표 1 기준입니다. 주택에는 부속토지와 주택 분양권이 포함되고,
        분양권은 지금까지 낸 금액(융자 포함)에 프리미엄을 더한 금액이 거래금액입니다. 교환은 두 물건 중 가격이 큰 쪽이
        거래금액입니다.
      </p>

      <h2>주택 임대차(전세·월세) 중개보수 요율표</h2>
      <BracketTable brackets={HOUSE_LEASE_BRACKETS} examples={LEASE_EXAMPLES} deal="jeonse" />
      <p>
        2021년 개편으로 모든 구간에서 임대차 요율이 매매 요율보다 낮거나 같아졌습니다. 5천만원 미만과 1억원 미만 구간은
        한도액이 있어, 예를 들어 전세 9,000만원은 0.4%인 36만원이 아니라 한도액 30만원이 상한입니다.
      </p>

      <h2>오피스텔, 토지·상가 중개보수</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">구분</th>
              <th scope="col">거래 종류</th>
              <th scope="col">상한요율</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>주거용 오피스텔</td>
              <td>매매·교환</td>
              <td>{formatNumber(OFFICETEL_SALE_RATE, 1)}%</td>
            </tr>
            <tr>
              <td>주거용 오피스텔</td>
              <td>임대차 (전세·월세)</td>
              <td>{formatNumber(OFFICETEL_LEASE_RATE, 1)}%</td>
            </tr>
            <tr>
              <td>그 밖의 오피스텔, 토지, 상가, 사무실 등</td>
              <td>매매·교환·임대차</td>
              <td>{formatNumber(OTHER_MAX_RATE, 1)}% 이내 협의</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        주거용 오피스텔은 전용면적 85㎡ 이하이면서 상·하수도 시설을 갖춘 전용 입식 부엌, 전용 수세식 화장실과 목욕시설을
        갖춘 경우입니다. 2026년 8월 28일 시행된 시행규칙 개정으로 주거용 오피스텔도 이 상한요율 이내에서 중개의뢰인과
        중개사가 협의해 정한다는 점이 조문에 명시되었고, 요율 자체는 바뀌지 않았습니다. 이 요건을 못 갖추면 토지·상가와
        같이 0.9% 이내에서 협의합니다. 주택 외 중개대상물은 한도액이
        없고, 중개사는 받으려는 요율을 사무소에 게시해야 합니다. 주택과 상가가 섞인 건물은 주택 면적이 절반 이상이면 주택
        요율을, 절반 미만이면 주택 외 요율을 적용합니다.
      </p>

      <h2>월세 거래금액 환산 방법</h2>
      <p>월세는 보증금만으로 계산하지 않고, 월세를 보증금처럼 환산해 더한 금액을 거래금액으로 봅니다.</p>
      <p className="formula">거래금액 = 보증금 + 월세 × 100 (합계가 5천만원 미만이면 보증금 + 월세 × 70)</p>
      <ul>
        <li>
          <strong>보증금 1,000만원, 월세 50만원</strong>: 1,000만원 + 50만원 × 100 = {koreanWon(ex1.dealAmount)}. 5천만원
          이상이므로 그대로 쓰고, 임대차 {formatNumber(ex1.rule.rate, 1)}%를 곱해 상한은 {koreanWon(ex1.maxFee)}입니다(한도액
          30만원 이내).
        </li>
        <li>
          <strong>보증금 500만원, 월세 40만원</strong>: ×100으로 더하면 {koreanWon(ex2.conversion!.base100)}이라 5천만원
          미만입니다. 그래서 500만원 + 40만원 × 70 = {koreanWon(ex2.dealAmount)}을 거래금액으로 하고, 0.5%를 곱해 상한은{" "}
          {koreanWon(ex2.maxFee)}입니다.
        </li>
        <li>
          <strong>보증금 5,000만원, 월세 30만원</strong>: 5,000만원 + 30만원 × 100 = {koreanWon(ex3.dealAmount)}으로{" "}
          {ex3.rule.bracket ? bracketLabel(ex3.rule.bracket) : ""} 구간입니다. {formatNumber(ex3.rule.rate, 1)}%를 곱하면{" "}
          {koreanWon(ex3.rawMaxFee)}이지만 이 구간의 한도액이 {koreanWon(ex3.rule.cap ?? 0)}이라 상한은{" "}
          <strong>{koreanWon(ex3.maxFee)}</strong>입니다.
        </li>
      </ul>
      <p>
        70배 규정은 소액 월세 세입자의 부담을 덜기 위한 것입니다. 같은 환산식은 오피스텔과 상가 월세에도 똑같이 적용됩니다.
        이 ‘월세 × 100’은 복비를 계산하기 위한 환산일 뿐이고, 계약 중에 전세를 월세로 바꿀 때 받을 수 있는 월세 상한은
        법정 전환율로 따로 정해집니다. 그 금액은 <Link href="/rent-conversion/">전월세 전환율 계산기</Link>로 확인할 수
        있습니다.
      </p>

      <h2>금액별 복비 빠른 표</h2>
      <h3>주택 매매</h3>
      <QuickTable deal="sale" amounts={SALE_TABLE_AMOUNTS.filter((a) => a <= 15 * 100_000_000 || a === 20 * 100_000_000)} />
      <h3>주택 전세</h3>
      <QuickTable deal="jeonse" amounts={LEASE_TABLE_AMOUNTS} />
      <p className="note">상한액은 한쪽(매도인 또는 매수인, 임대인 또는 임차인) 기준이며, 부가세 포함은 일반과세자 10% 기준입니다.</p>

      <h2>중개보수는 언제 내나요</h2>
      <p>
        지급 시기는 중개사와 의뢰인이 약정한 때이고, 약정이 없으면 중개대상물의 거래대금 지급이 끝난 날, 보통 잔금일입니다
        (공인중개사법 시행령 제27조의2). 계약금 단계에서 일부를 먼저 달라고 한다면 그 내용을 계약서나 영수증에 남겨 두는
        것이 좋습니다. 중개사의 고의나 과실로 거래가 무효·취소·해제되었다면 중개보수를 받을 수 없습니다(공인중개사법
        제32조).
      </p>

      <h2>부가세와 현금영수증</h2>
      <p>
        중개보수는 부가가치세 과세 대상이라 일반과세자 중개사무소는 보수의 10%를 부가세로 따로 받습니다. 부가세는 상한액에
        포함되지 않는 별도 금액이므로, 상한 200만원이면 부가세를 더해 220만원까지 낼 수 있습니다. 간이과세자 사무소는
        세금계산서 발급 여부와 세 부담이 일반과세자와 달라, 10%를 그대로 받는 것이 맞는지 사업자 유형을 확인해 보는 것이
        좋습니다. 부동산 중개업은 현금영수증 의무발행 업종이므로 현금으로 냈다면 현금영수증을 받아 두세요.
      </p>

      <h2>분쟁이 생겼을 때 확인할 것</h2>
      <ul>
        <li>
          <strong>지역 요율표</strong>: 주택 요율은 시·도 조례로 정합니다. 서울은{" "}
          <a href="https://land.seoul.go.kr/land/broker/brokerageCommission.do" rel="noopener">
            서울부동산정보광장
          </a>
          , 경기는{" "}
          <a href="https://gris.gg.go.kr/reb/selectRebRateView.do" rel="noopener">
            경기부동산포털
          </a>
          에서 요율표를 확인할 수 있습니다. 다른 시·도는 해당 시·도 누리집이나 조례를 확인하세요.
        </li>
        <li>
          <strong>확인·설명서</strong>: 중개대상물 확인·설명서에는 중개보수와 실비 금액, 산출 내역이 적힙니다. 서명하기 전에
          금액과 요율을 확인하세요.
        </li>
        <li>
          <strong>초과분 반환</strong>: 상한을 넘는 약정 부분은 무효라 돌려받을 수 있습니다(대법원 2007. 12. 20. 선고
          2005다32159 전원합의체 판결). 사례비·수고비 같은 다른 명목으로 더 받는 것도 초과 수수입니다.
        </li>
        <li>
          <strong>신고</strong>: 상한을 넘겨 받는 것은 공인중개사법 제33조 금지행위로, 1년 이하 징역 또는 1천만원 이하
          벌금 대상입니다. 중개사무소가 있는 시·군·구청 부동산 중개 담당 부서(등록관청)에 신고할 수 있습니다.
        </li>
      </ul>

      <h2>근거 법령</h2>
      <ul>
        <li>
          <a href="https://www.law.go.kr/법령/공인중개사법" rel="noopener">
            공인중개사법
          </a>{" "}
          제32조(중개보수), 제33조(금지행위)
        </li>
        <li>
          <a href="https://www.law.go.kr/법령/공인중개사법시행령" rel="noopener">
            공인중개사법 시행령
          </a>{" "}
          제27조의2(중개보수의 지급시기)
        </li>
        <li>
          <a href="https://www.law.go.kr/법령/공인중개사법시행규칙" rel="noopener">
            공인중개사법 시행규칙
          </a>{" "}
          제20조(중개보수 및 실비의 한도 등)와 별표 1(주택), 별표 2(오피스텔). 현행은 2026. 8. 28. 시행본(국토교통부령
          제1611호)이며, 주택 요율(별표 1)은 2021. 10. 19. 개정 이후 바뀌지 않았습니다.
        </li>
        <li>서울특별시 주택 중개보수 등에 관한 조례(2021. 12. 30. 시행), 경기도 주택 중개보수 등에 관한 조례(2022. 3. 4. 시행)</li>
      </ul>

      <h2>금액별 복비 바로 보기</h2>
      <nav aria-label="금액별 복비 페이지" className="link-grid">
        {BROKERAGE_FEE_PAGES.map((p) => (
          <Link key={p.slug} href={`/brokerage-fee/${p.slug}/`}>
            {p.deal === "sale" ? `${short(p.amount)} 매매 복비` : `전세 ${short(p.amount)} 복비`}
          </Link>
        ))}
      </nav>
    </ToolShell>
  );
}
