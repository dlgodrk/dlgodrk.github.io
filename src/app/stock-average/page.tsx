import type { Metadata } from "next";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber, formatPercent, formatWon, koreanWon } from "@/lib/format";
import { formatKoreanDate, parseYMD } from "@/lib/date";
import { RULES_CHECKED_AT } from "@/lib/site";
import {
  averageAfterBuy,
  breakevenRise,
  combineLots,
  recoveryRise,
  SELL_TAX_2025,
  SELL_TAX_2026,
  sharesForTarget,
  valuation,
  withCosts,
  type Market,
} from "@/lib/calc/stock-average";
import { StockAverageCalculator } from "./StockAverageCalculator";

// Worked example used throughout the copy: 72,000원 × 100주 보유, 60,000원에 100주 물타기, 현재가 63,000원.
const HOLD = { price: 72000, qty: 100 };
const BUY = { price: 60000, qty: 100 };
const NOW = 63000;
const exPos = combineLots([HOLD, BUY]);
const riseBefore = breakevenRise(HOLD.price, NOW);
const riseAfter = breakevenRise(exPos.avg, NOW);
// 물타기 후 주가가 54,000원까지 더 내리면
const DROP = 54000;
const lossBefore = valuation(combineLots([HOLD]), DROP).pnl;
const lossAfter = valuation(exPos, DROP).pnl;
// 불타기: 50,000원 × 100주에 70,000원 × 100주
const fireBase = { price: 50000, qty: 100 };
const fireBuy = { price: 70000, qty: 100 };
const firePos = combineLots([fireBase, fireBuy]);
const fireCushion = 1 - firePos.avg / fireBuy.price;
// 목표 평단 역산
const goal63 = sharesForTarget({ avg: HOLD.price, qty: HOLD.qty, buyPrice: BUY.price, target: 63000 });
const goal62 = sharesForTarget({ avg: HOLD.price, qty: HOLD.qty, buyPrice: BUY.price, target: 62000 });
const sharesOf = (r: ReturnType<typeof sharesForTarget>) => (r.kind === "ok" ? r.shares : NaN);
// 수수료 0.015% · 코스피, 평단(66,000원)에 그대로 팔 때
const FEE = 0.00015;
const exCost = withCosts(exPos, FEE, SELL_TAX_2026.kospi, exPos.avg);
const exSellTax = exCost.tradeTax + exCost.ruralTax;

const QTY_TABLE = [50, 100, 200, 300, 500, 1000];
const DROP_TABLE = [0.1, 0.2, 0.3, 0.4, 0.5, 0.7];
const TAX_ROWS: { label: string; m: Market }[] = [
  { label: "코스피", m: "kospi" },
  { label: "코스닥·K-OTC", m: "kosdaq" },
  { label: "코넥스", m: "konex" },
  { label: "국내 상장 ETF", m: "etf" },
];

const pct = (ratio: number) => formatPercent(ratio, 2);
/** Tax rates read as 0.20%, 0.05% (always two decimals), 0 as 0%. */
const taxPct = (ratio: number) => (ratio === 0 ? "0%" : `${(ratio * 100).toFixed(2)}%`);
/** Total only, so the table fits a phone; the 코스피 breakdown is spelled out under the table. */
const taxCell = (t: { tradeTax: number; ruralTax: number }) => {
  const total = t.tradeTax + t.ruralTax;
  return total === 0 ? "없음" : taxPct(total);
};
// 66,000원 → 62,000원으로 더 낮추는 데 드는 추가 수량
const extraTo62 = sharesOf(goal62) - BUY.qty;
// 불타기 전(50,000원 × 100주)이라면 새 평단 가격에서의 수익률
const fireBeforeRate = valuation(combineLots([fireBase]), firePos.avg).rate;

const checked = parseYMD(RULES_CHECKED_AT);
const BASIS = `평균 단가 = 총 매수 금액 ÷ 총 수량 · 증권거래세는 2026년 1월 1일 이후 매도분 세율 · ${
  checked ? formatKoreanDate(checked, false) : RULES_CHECKED_AT
} 확인`;

export const metadata: Metadata = pageMetadata({
  title: "주식 평단가 계산기 - 물타기·불타기 평균단가 계산",
  description: `추가 매수 가격과 수량을 넣으면 새 평단가, 평가손익, 본전까지 필요한 상승률을 계산합니다. 72,000원 100주에 60,000원 100주를 물타기하면 평단 ${formatWon(exPos.avg)}. 목표 평단에 필요한 수량도 역산합니다.`,
  path: "/stock-average/",
  keywords: [
    "주식 평단가 계산기",
    "물타기 계산기",
    "평균단가 계산",
    "불타기 계산기",
    "평단 낮추기",
    "물타기 수량 계산",
    "본전 상승률",
  ],
});

const FAQ: FaqItem[] = [
  {
    q: "물타기 평단 계산은 어떻게 하나요?",
    a: `지금까지 산 금액을 모두 더해 전체 수량으로 나눕니다. 72,000원에 100주를 가진 상태에서 60,000원에 100주를 더 사면 (7,200,000원 + 6,000,000원) ÷ 200주 = ${formatWon(exPos.avg)}이 새 평단입니다.`,
  },
  {
    q: "평단을 원하는 가격까지 낮추려면 몇 주를 사야 하나요?",
    a: `필요 수량 = 보유 수량 × (지금 평단 − 목표 평단) ÷ (목표 평단 − 추가 매수가)입니다. 72,000원 100주를 60,000원에 물타기할 때 평단 63,000원을 만들려면 ${formatNumber(sharesOf(goal63))}주, 62,000원은 ${formatNumber(sharesOf(goal62))}주가 필요합니다. 추가 매수가인 60,000원 이하로는 아무리 사도 내려가지 않습니다.`,
  },
  {
    q: "주식을 일부 팔면 평단가가 바뀌나요?",
    a: "바뀌지 않습니다. 국내 증권사는 이동평균법으로 평단을 관리해, 팔면 그만큼 실현손익이 생기고 남은 주식의 평단은 그대로입니다. 평단은 새로 살 때만 다시 계산됩니다.",
  },
  {
    q: "반토막 나면 몇 % 올라야 본전인가요?",
    a: `50% 하락한 주식은 100% 올라야 본전입니다. 30% 하락이면 ${pct(recoveryRise(0.3))}, 20% 하락이면 ${pct(recoveryRise(0.2))} 올라야 합니다. 떨어진 만큼 기준 가격이 낮아져서 필요한 상승률이 하락률보다 커집니다.`,
  },
  {
    q: "2026년에 주식을 팔 때 세금은 얼마인가요?",
    a: `2026년 1월 1일 이후 매도분부터 코스피는 증권거래세 0.05%에 농어촌특별세 0.15%를 더한 0.20%, 코스닥은 0.20%, 코넥스는 0.10%입니다. 코스피 주식 1,000만원어치를 팔면 세금이 2만원이고, 이익이 났는지와 관계없이 매도 금액에 붙습니다. 국내 상장 ETF는 거래세가 없습니다.`,
  },
];

export default function StockAveragePage() {
  return (
    <ToolShell
      slug="stock-average"
      h1="주식 평단가 계산기 (물타기·불타기)"
      lead="지금 평단과 추가로 살 가격·수량을 넣으면 새 평균 단가와 손익, 본전까지 필요한 상승률을 바로 보여 드려요. 목표 평단을 만들려면 몇 주를 사야 하는지도 계산할 수 있어요."
      basis={BASIS}
      calculator={<StockAverageCalculator />}
      faq={FAQ}
      appCategory="FinanceApplication"
    >
      <h2>평단가 계산 공식</h2>
      <p>평균 단가(평단)는 지금까지 산 금액을 모두 더해 보유 수량으로 나눈 값입니다.</p>
      <p className="formula">새 평단 = (기존 평단 × 보유 수량 + 추가 매수가 × 추가 수량) ÷ (보유 수량 + 추가 수량)</p>
      <p>
        예를 들어 72,000원에 100주를 가진 상태에서 60,000원에 100주를 더 사면 (7,200,000원 + 6,000,000원) ÷ 200주 ={" "}
        <strong>{formatWon(exPos.avg)}</strong>입니다. 현재가가 {formatWon(NOW)}이라면 본전까지 필요한 상승률이{" "}
        {pct(riseBefore)}에서 {pct(riseAfter)}로 줄어듭니다.
      </p>

      <h2>추가 수량별 평단 변화</h2>
      <p>
        같은 가격에 더 살수록 평단은 추가 매수가에 가까워지지만, 내려가는 폭은 점점 작아집니다. 72,000원 100주를 가진 상태에서
        60,000원에 추가로 살 때의 변화입니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>
            보유 72,000원 × 100주, 추가 매수가 {formatWon(BUY.price)} · 본전 상승률은 현재가 {formatWon(BUY.price)} 기준
          </caption>
          <thead>
            <tr>
              <th scope="col">추가 수량·금액</th>
              <th scope="col">새 평단</th>
              <th scope="col">본전 상승률</th>
            </tr>
          </thead>
          <tbody>
            {QTY_TABLE.map((n) => {
              const avg = averageAfterBuy(HOLD.price, HOLD.qty, BUY.price, n);
              return (
                <tr key={n} className={n === BUY.qty ? "is-current" : undefined}>
                  <td>
                    {formatNumber(n)}주
                    <span className="block text-xs font-normal text-muted">{koreanWon(n * BUY.price)}</span>
                  </td>
                  <td>{formatWon(avg)}</td>
                  <td>{pct(breakevenRise(avg, BUY.price))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p>
        평단을 {formatWon(exPos.avg)}에서 62,000원으로 {formatWon(exPos.avg - 62000)} 더 낮추려면 {formatNumber(extraTo62)}주,{" "}
        {koreanWon(extraTo62 * BUY.price)}이 더 들어갑니다. 목표 평단에 필요한
        수량은 아래 식으로 구하며, 목표 평단은 반드시 추가 매수가와 지금 평단 사이에 있어야 합니다.
      </p>
      <p className="formula">필요 수량 = 보유 수량 × (지금 평단 − 목표 평단) ÷ (목표 평단 − 추가 매수가)</p>

      <h2>물타기와 불타기, 무엇이 위험한가</h2>
      <ul>
        <li>
          <strong>물타기</strong>는 손실 중인 종목을 더 사서 평단을 낮추는 것입니다. 본전이 가까워 보이지만 같은 종목에 돈이 더
          몰립니다. 위 예에서 주가가 {formatWon(DROP)}까지 더 내리면 물타기 전 손실은 {koreanWon(-lossBefore)}이지만 물타기 후에는{" "}
          {koreanWon(-lossAfter)}입니다. 평단이 낮아져도 손실 금액은 주가와 보유 수량으로 정해집니다.
        </li>
        <li>
          <strong>불타기</strong>는 수익 중인 종목을 더 사는 것입니다. 50,000원 100주에 70,000원 100주를 더 사면 평단이{" "}
          {formatWon(firePos.avg)}으로 올라, 주가가 {pct(fireCushion)}만 내려도 전체 수익이 0이 됩니다. 불타기 전이었다면 같은
          가격에서도 {pct(fireBeforeRate)} 수익입니다.
        </li>
      </ul>
      <p>
        평단은 과거에 산 가격의 평균일 뿐, 앞으로 주가가 어디로 갈지와는 관계가 없습니다. 추가로 사기 전에 그 종목을 지금 가격에
        처음 산다고 해도 살 이유가 있는지, 한 종목 비중이 지나치게 커지지 않는지를 먼저 따져 보는 것이 좋습니다.
      </p>
      <p className="note">
        이 페이지의 계산과 설명은 일반적인 정보이며, 특정 종목의 매수나 매도를 권하는 투자 조언이 아닙니다. 투자 판단과 그 결과의
        책임은 투자자 본인에게 있습니다.
      </p>

      <h2>하락률별 본전 상승률</h2>
      <p>떨어진 만큼 기준 가격이 낮아지기 때문에, 본전에 필요한 상승률은 하락률보다 항상 큽니다.</p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">평단 대비 하락률</th>
              <th scope="col">본전까지 필요한 상승률</th>
            </tr>
          </thead>
          <tbody>
            {DROP_TABLE.map((d) => (
              <tr key={d}>
                <td>−{formatNumber(d * 100)}%</td>
                <td>+{pct(recoveryRise(d))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>수수료와 세금이 손익에 주는 영향</h2>
      <p>
        주식을 사고팔 때마다 증권사 수수료가 나가고, 팔 때는 매도 금액에 증권거래세가 붙습니다. 거래세는 이익이 났는지와
        관계없이 매도 금액 전체에 매겨집니다. 금융투자소득세 폐지에 맞춰 2026년 1월 1일 이후 매도분부터 세율이 2023년 수준으로
        돌아갔습니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>매도 금액에 붙는 세율 (증권거래세 + 농어촌특별세 합계, 2026년은 1월 1일 이후 매도분)</caption>
          <thead>
            <tr>
              <th scope="col">시장</th>
              <th scope="col">2025년</th>
              <th scope="col">2026년</th>
            </tr>
          </thead>
          <tbody>
            {TAX_ROWS.map(({ label, m }) => (
              <tr key={m}>
                <td>{label}</td>
                <td>{taxCell(SELL_TAX_2025[m])}</td>
                <td>{taxCell(SELL_TAX_2026[m])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        코스피는 농어촌특별세 {taxPct(SELL_TAX_2026.kospi.ruralTax)}에 증권거래세가 2025년 {taxPct(SELL_TAX_2025.kospi.tradeTax)},
        2026년 {taxPct(SELL_TAX_2026.kospi.tradeTax)} 더해진 세율입니다. 코스닥·K-OTC와 코넥스는 농어촌특별세 없이 증권거래세만
        냅니다.
      </p>
      <p>
        위 예시 200주(평단 {formatWon(exPos.avg)})를 수수료 0.015%인 계좌에서 코스피에 평단 그대로 팔면 매수·매도 수수료{" "}
        {formatWon(exCost.buyFee + exCost.sellFee)}과 세금 {formatWon(exSellTax)}을 합쳐 {formatWon(-exCost.netPnl)}을 잃습니다.
        수수료와 세금까지 되찾는 실질 본전 가격은 약 <strong>{formatWon(exCost.breakevenPrice)}</strong>입니다. 계산기에서
        ‘수수료·세금도 반영하기’를 켜면 이 값을 함께 보여 줍니다.
      </p>
      <p>
        해외주식은 국내 증권거래세가 없지만, 1년 동안의 매매차익이 250만원을 넘으면 넘는 금액에 22%(지방소득세 포함)의
        양도소득세를 냅니다. 국내 상장주식은 대주주가 아니면 매매차익에 양도소득세가 없습니다. 국내 상장 ETF는 증권거래세가
        없지만, 국내 주식형이 아닌 ETF(해외주식·채권·원자재 등)는 매매차익에 배당소득세 15.4%가 붙습니다. 이런
        양도소득세와 배당소득세는 계산기의 ‘수수료·세금도 반영하기’에 들어가지 않습니다.
      </p>
      <p className="note">
        근거:{" "}
        <a href="https://www.law.go.kr/법령/증권거래세법/제8조" target="_blank" rel="noopener noreferrer">
          증권거래세법 제8조
        </a>
        ,{" "}
        <a href="https://www.law.go.kr/법령/증권거래세법시행령/제5조" target="_blank" rel="noopener noreferrer">
          같은 법 시행령 제5조(탄력세율)
        </a>
        ,{" "}
        <a href="https://www.law.go.kr/법령/농어촌특별세법/제5조" target="_blank" rel="noopener noreferrer">
          농어촌특별세법 제5조
        </a>
        . 시행령 제5조는 2025년 12월 31일 개정(대통령령 제36001호), 2026년 1월 1일 시행된 세율 기준입니다.
      </p>

      <h2>평단 계산할 때 알아 둘 점</h2>
      <ul>
        <li>
          <strong>일부를 팔아도 평단은 그대로</strong>: 매도하면 실현손익만 생기고 남은 주식의 평단은 바뀌지 않습니다. 그래서
          ‘팔았다 다시 사서 평단 낮추기’는 판 가격과 다시 산 가격에 따라 결과가 달라집니다.
        </li>
        <li>
          <strong>증권사 앱과 몇 원 다를 수 있음</strong>: 증권사나 설정에 따라 매수 수수료를 평단에 포함해 보여 주기도 합니다.
        </li>
        <li>
          <strong>액면분할·무상증자</strong>: 수량이 늘어난 비율만큼 평단이 낮아지고 총 매수 금액은 그대로입니다. 권리 반영 뒤의
          수량과 평단을 넣으세요.
        </li>
        <li>
          <strong>해외주식은 달러 기준</strong>: 원화 평단은 살 때마다의 환율이 섞여 달러 평단과 수익률이 다르게 나옵니다. 이
          계산기는 달러 금액 그대로 계산합니다.
        </li>
      </ul>
    </ToolShell>
  );
}
