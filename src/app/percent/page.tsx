import type { Metadata } from "next";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import {
  averageRate,
  changeRate,
  combinedDiscountRate,
  compoundChange,
  discountRateFrom,
  formatPct,
  formatSigned,
  formatValue,
  percentPointDiff,
} from "@/lib/calc/percent";
import { PercentCalculator } from "./PercentCalculator";

export const metadata: Metadata = pageMetadata({
  title: "퍼센트 계산기 - 백분율, 증가율, 할인율 계산",
  description:
    "A의 B%, A는 B의 몇 %, 증가율·감소율, 할인가와 할인율을 한 번에 계산합니다. 25,000에서 30,000이면 20% 증가, 20% 할인 후 10% 추가 할인은 실제 28% 할인처럼 바로 답을 보여 드립니다.",
  path: "/percent/",
  keywords: [
    "퍼센트 계산기",
    "퍼센트 구하기",
    "백분율 계산",
    "증가율 계산",
    "감소율 계산",
    "변화율 계산",
    "할인율 계산",
    "퍼센트포인트",
  ],
});

const FAQ: FaqItem[] = [
  {
    q: "퍼센트 구하는 공식은 무엇인가요?",
    a: "A가 전체 B의 몇 %인지는 A ÷ B × 100으로 구합니다. 반대로 A의 B%는 A × B ÷ 100입니다. 예를 들어 45는 60의 75%이고, 50,000의 15%는 7,500입니다.",
  },
  {
    q: "증가율(상승률)은 어떻게 계산하나요?",
    a: "(나중 값 − 처음 값) ÷ 처음 값 × 100입니다. 25,000원이 30,000원이 되면 20% 증가이고, 반대로 30,000원이 25,000원이 되면 약 16.67% 감소입니다. 나누는 기준은 항상 처음 값입니다.",
  },
  {
    q: "%와 %p(퍼센트포인트)는 어떻게 다른가요?",
    a: "%p는 두 퍼센트 값의 단순한 차이이고, %는 처음 값에 견준 상대적인 변화율입니다. 금리가 3%에서 3.5%로 오르면 0.5%p 상승이고, 변화율로는 약 16.67% 상승입니다.",
  },
  {
    q: "20% 할인 후 10% 추가 할인은 총 몇 % 할인인가요?",
    a: "28%입니다. 추가 할인은 이미 20% 깎인 가격에 적용되므로 1 − 0.8 × 0.9 = 0.28이 됩니다. 10만원짜리 상품이라면 72,000원에 사게 됩니다.",
  },
  {
    q: "할인된 가격으로 정가를 구하려면 어떻게 하나요?",
    a: "판매가 ÷ (1 − 할인율)입니다. 20% 할인해서 8,000원이라면 정가는 8,000 ÷ 0.8 = 10,000원입니다. 8,000원에 20%를 더한 9,600원이 아닙니다.",
  },
  {
    q: "10% 오르고 10% 내리면 원래 가격으로 돌아오나요?",
    a: "아닙니다. 100이 10% 오르면 110이고, 110에서 10% 내리면 99가 되어 처음보다 1% 낮습니다. 110에서 원래 값 100으로 돌아가려면 약 9.09%만 내리면 됩니다.",
  },
];

const PP_EXAMPLES: { label: string; from: number; to: number }[] = [
  { label: "대출 금리", from: 3, to: 3.5 },
  { label: "지지율", from: 40, to: 50 },
  { label: "실업률", from: 4, to: 3 },
  { label: "시장 점유율", from: 20, to: 15 },
];

const STACKED: [number, number][] = [
  [10, 10],
  [20, 10],
  [30, 10],
  [30, 20],
  [50, 20],
  [50, 50],
];

export default function PercentPage() {
  const avg = averageRate([10, 20]) ?? 0;
  return (
    <ToolShell
      slug="percent"
      h1="퍼센트 계산기 (백분율·증가율·할인율)"
      lead="몇 %인지, 몇 % 늘었는지, 할인하면 얼마인지 바로 계산해 드려요. 계산 종류를 고르고 숫자만 넣으면 공식과 함께 답을 보여 드립니다."
      basis="일반 백분율 공식 기준 · 결과는 소수점 둘째 자리까지 반올림(1 미만 값은 더 자세히), 할인 금액은 원 단위로 표시"
      calculator={<PercentCalculator />}
      faq={FAQ}
      appCategory="FinanceApplication"
    >
      <h2>퍼센트 계산 공식 5가지</h2>
      <p>퍼센트(%)는 전체를 100으로 보았을 때의 비율입니다. 위 계산기에서 고를 수 있는 다섯 가지 계산의 공식과 예시는 다음과 같습니다.</p>

      <h3>1. A의 B%는 얼마인가</h3>
      <p className="formula">A의 B% = A × B ÷ 100</p>
      <p>
        50,000원의 15%는 50,000 × 15 ÷ 100 = <strong>7,500원</strong>입니다. 수수료, 세금, 팁, 점수 환산처럼 ‘얼마의 몇 %’를
        구할 때 씁니다.
      </p>

      <h3>2. A는 B의 몇 %인가</h3>
      <p className="formula">비율(%) = A ÷ B × 100</p>
      <p>
        60문제 중 45문제를 맞혔다면 45 ÷ 60 × 100 = <strong>75%</strong>입니다. 나누는 수 B가 기준, 즉 전체입니다.
      </p>

      <h3>3. A에서 B로 몇 % 변했나 (변화율)</h3>
      <p className="formula">변화율(%) = (B − A) ÷ A × 100</p>
      <p>
        25,000원이던 가격이 30,000원이 되면 (30,000 − 25,000) ÷ 25,000 × 100 = <strong>20% 증가</strong>입니다. 결과가 음수면
        감소율로 읽습니다.
      </p>

      <h3>4. A에서 B% 늘리거나 줄이면</h3>
      <p className="formula">증가: A × (1 + B ÷ 100) &nbsp;|&nbsp; 감소: A × (1 − B ÷ 100)</p>
      <p>
        50,000에서 10% 늘리면 50,000 × 1.1 = <strong>55,000</strong>, 10% 줄이면 50,000 × 0.9 = <strong>45,000</strong>입니다.
      </p>

      <h3>5. 할인가, 할인율, 정가</h3>
      <p className="formula">
        판매가 = 정가 × (1 − 할인율 ÷ 100)
        <br />
        할인율 = (정가 − 판매가) ÷ 정가 × 100
        <br />
        정가 = 판매가 ÷ (1 − 할인율 ÷ 100)
      </p>
      <p>
        정가 39,000원 상품을 20% 할인하면 7,800원이 빠져 <strong>31,200원</strong>입니다. 39,000원짜리를 29,900원에 판다면
        할인율은 약 <strong>{formatPct(discountRateFrom(39000, 29900) ?? 0)}</strong>입니다.
      </p>

      <h2>퍼센트(%)와 퍼센트포인트(%p)의 차이</h2>
      <p>
        퍼센트포인트(%p)는 두 퍼센트 값의 단순한 차이이고, 퍼센트(%)는 처음 값에 견준 상대적인 변화율입니다. 금리가 3%에서
        3.5%로 오르면 0.5%p 오른 것이고, 상대적으로는 (3.5 − 3) ÷ 3 × 100 ≈ 16.67% 오른 것입니다. ‘금리가 0.5% 올랐다’고
        쓰면 3%의 0.5%만큼, 즉 3.015%가 됐다는 뜻으로 읽힐 수 있어 뉴스와 통계에서는 %p를 구분해 씁니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">예시</th>
              <th scope="col">이전 → 이후</th>
              <th scope="col">%p 차이</th>
              <th scope="col">변화율</th>
            </tr>
          </thead>
          <tbody>
            {PP_EXAMPLES.map((e) => (
              <tr key={e.label}>
                <td>{e.label}</td>
                <td>
                  {formatValue(e.from)}% → {formatValue(e.to)}%
                </td>
                <td>{formatSigned(percentPointDiff(e.from, e.to))}%p</td>
                <td>{formatSigned(changeRate(e.from, e.to) ?? 0)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">계산기에서 ‘A → B 변화율’을 고르고 ‘두 값이 퍼센트(%)예요’를 켜면 두 값을 함께 보여 드립니다.</p>

      <h2>연속 할인은 더하지 않고 곱합니다</h2>
      <p>
        20% 할인 뒤 10% 추가 할인은 30% 할인이 아닙니다. 두 번째 할인은 이미 깎인 가격에 적용되기 때문입니다. 100,000원짜리
        상품이라면 20% 할인으로 80,000원, 다시 10% 할인으로 72,000원이 되어 실제 할인율은 <strong>28%</strong>입니다.
      </p>
      <p className="formula">실제 할인율 = 1 − (1 − 0.2) × (1 − 0.1) = 0.28 → 28%</p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">1차 할인</th>
              <th scope="col">추가 할인</th>
              <th scope="col">단순 합</th>
              <th scope="col">실제 할인율</th>
            </tr>
          </thead>
          <tbody>
            {STACKED.map(([a, b]) => (
              <tr key={`${a}-${b}`}>
                <td>{a}%</td>
                <td>{b}%</td>
                <td>{a + b}%</td>
                <td>{formatPct(combinedDiscountRate([a, b]))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        정률 할인끼리는 순서를 바꿔도 결과가 같지만, 금액을 깎아 주는 정액 쿠폰이 섞이면 순서에 따라 값이 달라집니다.
        50,000원 상품에 10% 할인과 5,000원 쿠폰을 함께 쓸 때 10%를 먼저 적용하면 40,000원, 쿠폰을 먼저 적용하면 40,500원입니다.
      </p>

      <h2>증가율 계산할 때 흔한 실수</h2>
      <ul>
        <li>
          <strong>기준을 바꿔 나누기</strong>: 변화율은 항상 처음 값으로 나눕니다. 80에서 100이 되면 {formatPct(changeRate(80, 100) ?? 0)}{" "}
          증가지만, 100에서 80이 되면 {formatPct(Math.abs(changeRate(100, 80) ?? 0))} 감소입니다.
        </li>
        <li>
          <strong>오른 만큼 내리면 제자리라는 착각</strong>: 100이 10% 오르면 110, 다시 10% 내리면 99입니다. 50% 떨어진 값이
          원래대로 돌아오려면 100% 올라야 합니다.
        </li>
        <li>
          <strong>결과에서 퍼센트를 빼서 원래 값 구하기</strong>:{" "}
          <a href="https://www.law.go.kr/법령/부가가치세법" target="_blank" rel="noopener noreferrer">
            부가가치세
          </a>{" "}
          10%가 포함된 11,000원의 공급가액은 11,000 × 0.9 = 9,900원이 아니라 11,000 ÷ 1.1 = 10,000원입니다. 20% 할인가
          8,000원의 정가도 9,600원이 아니라 8,000 ÷ 0.8 = 10,000원입니다.
        </li>
        <li>
          <strong>몇 배와 몇 % 증가 혼동</strong>: 100이 300이 되면 3배가 된 것이고, 증가율로는 {formatPct(changeRate(100, 300) ?? 0)}{" "}
          증가입니다.
        </li>
        <li>
          <strong>증가율을 더하거나 평균 내기</strong>: 첫해 10%, 다음 해 20% 늘었다면 2년 동안 30%가 아니라{" "}
          {formatPct(compoundChange([10, 20]))}(1.1 × 1.2 = 1.32) 늘어난 것이고, 연평균 증가율은 15%가 아니라 약 {formatPct(avg)}
          입니다.
        </li>
      </ul>
    </ToolShell>
  );
}
