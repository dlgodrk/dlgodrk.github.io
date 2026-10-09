import type { Metadata } from "next";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatKoreanDate, parseYMD } from "@/lib/date";
import { formatNumber, formatWon, koreanWon } from "@/lib/format";
import {
  BASE_RATE_HISTORY,
  BOK_BASE_RATE_CHECKED,
  BOK_BASE_RATE_DATE,
  BOK_BASE_RATE_PCT,
  BOK_BASE_RATE_SOURCE,
  computeImpliedRate,
  computeToJeonse,
  computeToWolse,
  EOK,
  LEGAL_CAP_RATE,
  legalCapRate,
  MAN,
  MARKET_RATE,
  monthlyRentFor,
  TABLE_CONVERTED_AMOUNTS,
  tableRates,
} from "@/lib/calc/rent-conversion";
import { RentConversionCalculator } from "./RentConversionCalculator";

const CAP = `${formatNumber(LEGAL_CAP_RATE, 2)}%`;
const BASE = `${BOK_BASE_RATE_PCT.toFixed(2)}%`;
const BASE_DATE = formatKoreanDate(parseYMD(BOK_BASE_RATE_DATE)!, false);
const ONE_EOK_CAP_RENT = monthlyRentFor(1 * EOK, LEGAL_CAP_RATE);
const MARKET = `${formatNumber(MARKET_RATE.pct, 2)}%`;
const MARKET_FROM = formatKoreanDate(parseYMD(MARKET_RATE.effective)!, false);

// Copy that depends on when the base rate was last checked or changed is derived from the constants,
// so updating BOK_BASE_RATE_* after a 금통위 decision keeps every sentence true.
const CHECKED = parseYMD(BOK_BASE_RATE_CHECKED)!;
const CHECKED_DATE = formatKoreanDate(CHECKED, false);
const AS_OF = `${CHECKED.y}년 ${CHECKED.m}월 현재`;
const PREV_BASE_RATE = BASE_RATE_HISTORY[1]?.rate;
/** "연 2.75%에서 3.00%로 올렸으므로" — direction follows BASE_RATE_HISTORY, never typed by hand. */
const BASE_RATE_CHANGE =
  PREV_BASE_RATE === undefined || PREV_BASE_RATE === BOK_BASE_RATE_PCT
    ? `연 ${BASE}로 정했으므로`
    : `연 ${PREV_BASE_RATE.toFixed(2)}%에서 ${BASE}로 ${BOK_BASE_RATE_PCT > PREV_BASE_RATE ? "올렸으므로" : "내렸으므로"}`;

export const metadata: Metadata = pageMetadata({
  title: `전월세 전환율 계산기 - 전세 월세 환산 (법정 상한 ${CAP})`,
  description: `전세를 월세로, 월세를 전세로 바꿀 때 금액과 전환율을 바로 계산합니다. ${AS_OF} 법정 전환율 상한은 연 ${CAP}(기준금리 ${BASE} + 2%)라서 보증금 1억원을 월세로 바꾸면 월 ${koreanWon(ONE_EOK_CAP_RENT)}까지입니다.`,
  path: "/rent-conversion/",
  keywords: [
    "전월세 전환율 계산기",
    "전월세 전환율",
    "전세 월세 전환 계산",
    "월세 전세 환산",
    "법정 전환율",
    "전월세전환율 상한",
    "반전세 계산",
  ],
});

const FAQ: FaqItem[] = [
  {
    q: "전월세 전환율 법정 상한은 지금 몇 %인가요?",
    a: `${AS_OF} 연 ${CAP}입니다. 주택임대차보호법상 전환율은 연 10%와 ‘한국은행 기준금리 + 연 2%’ 중 낮은 비율을 넘을 수 없는데, 한국은행이 ${BASE_DATE} 기준금리를 연 ${BASE}로 정해 ${BASE} + 2% = ${CAP}가 상한입니다. 기준금리가 바뀌면 상한도 함께 바뀝니다.`,
  },
  {
    q: "전세 3억을 보증금 1억 월세로 바꾸면 월세는 얼마인가요?",
    a: `월세로 바뀌는 2억원에 법정 상한 ${CAP}를 곱하고 12로 나누면 월 ${formatWon(monthlyRentFor(2 * EOK, LEGAL_CAP_RATE))}입니다. 계약 기간 중이나 갱신 때 바꾸는 것이라면 집주인은 이보다 많은 월세를 받을 수 없습니다.`,
  },
  {
    q: "새로 계약할 때도 법정 전환율이 적용되나요?",
    a: "일반적으로 적용되지 않는다고 봅니다. 법정 상한은 이미 맺은 임대차에서 보증금을 월세로 ‘전환’할 때의 제한이라, 새 임차인과 처음 계약하면서 보증금과 월세를 정하는 경우에는 시세에 따라 정합니다. 계약 기간 중에 바꾸거나 계약갱신요구권으로 갱신하면서 바꾸는 경우에는 적용됩니다.",
  },
  {
    q: "계약 갱신 때 집주인이 월세로 바꾸자고 하면 따라야 하나요?",
    a: "아닙니다. 계약갱신요구권으로 갱신한 임대차는 종전과 같은 조건으로 다시 계약한 것으로 보므로, 임차인이 동의하지 않으면 전세를 월세로 바꿀 수 없습니다. 동의해서 바꾸더라도 법정 전환율 상한을 넘을 수 없습니다(국토교통부·법무부 주택임대차보호법 해설집).",
  },
  {
    q: "법정 상한보다 월세를 더 냈다면 돌려받을 수 있나요?",
    a: "네. 주택임대차보호법 제10조의2에 따라 제7조의2의 산정률을 넘겨 낸 차임은 반환을 청구할 수 있습니다. 먼저 집주인에게 초과분을 계산해 요구하고, 해결되지 않으면 주택임대차분쟁조정위원회에 조정을 신청하거나 소송으로 다툴 수 있습니다.",
  },
  {
    q: "한국부동산원 전월세전환율과 법정 전환율은 무엇이 다른가요?",
    a: "한국부동산원 전월세전환율은 실제 전·월세 거래 자료로 계산한 지역별 시장 평균이고, 법정 전환율은 계약 중 전환할 때 넘을 수 없는 상한입니다. 시장 전환율은 지역과 주택 유형마다 다르고 대체로 법정 상한보다 높습니다. 신규 계약 시세를 가늠하거나 월세를 전세로 환산할 때 참고하는 값입니다.",
  },
];

export default function RentConversionPage() {
  const toWolse = computeToWolse({ jeonse: 3 * EOK, deposit: 1 * EOK, ratePct: LEGAL_CAP_RATE })!;
  const toJeonse = computeToJeonse({ deposit: 1 * EOK, monthlyRent: 80 * MAN, ratePct: LEGAL_CAP_RATE })!;
  const toJeonseMarket = computeToJeonse({ deposit: 1 * EOK, monthlyRent: 80 * MAN, ratePct: MARKET_RATE.pct })!;
  const over = computeImpliedRate({ jeonse: 3 * EOK, deposit: 1 * EOK, monthlyRent: 90 * MAN })!;
  const rates = tableRates();

  return (
    <ToolShell
      slug="rent-conversion"
      h1="전월세 전환율 계산기 (전세 ↔ 월세 환산)"
      lead={`전세보증금 일부를 월세로 바꾸면 월세가 얼마인지, 지금 내는 월세의 전환율이 법정 상한을 넘는지 바로 계산해 드려요. ${AS_OF} 법정 상한은 연 ${CAP}예요.`}
      basis={`주택임대차보호법 제7조의2·시행령 제9조, 한국은행 기준금리 연 ${BASE}(${BASE_DATE} 결정) 기준 · ${CHECKED_DATE} 확인`}
      calculator={<RentConversionCalculator />}
      faq={FAQ}
      appCategory="FinanceApplication"
    >
      <h2>법정 전환율 상한: 지금은 연 {CAP}</h2>
      <p>
        주택임대차보호법 제7조의2는 보증금의 전부나 일부를 월세로 바꿀 때 받을 수 있는 월세에 상한을 둡니다. 전환되는
        금액에 곱할 수 있는 비율은 아래 두 값 중 낮은 쪽이고, 구체적인 숫자는 시행령 제9조가 정합니다.
      </p>
      <p className="formula">법정 전환율 상한 = min(연 10%, 한국은행 기준금리 + 연 2%)</p>
      <p>
        한국은행 금융통화위원회가 {BASE_DATE} 기준금리를 {BASE_RATE_CHANGE} {BASE} + 2% ={" "}
        <strong>연 {CAP}</strong>가 지금의 상한입니다({CHECKED_DATE} 확인). 기준금리가 바뀌면 상한도 바로 바뀝니다.
      </p>
      <p>
        법제처는 2020년 시행령 개정(가산 이율 연 3.5% → 2%)을 적용할지를 월세로 전환하는 갱신계약의 체결일을 기준으로
        판단했습니다(법령해석 20-0683). 어느 날의 기준금리를 쓸지는 법령에 따로 정해져 있지 않지만, 같은 취지로 보통 전환
        계약을 맺는 날의 기준금리로 상한을 따집니다.
      </p>

      <h2>전월세 전환 계산 방법</h2>
      <p className="formula">월세 = (전세보증금 − 월세 보증금) × 전환율 ÷ 12</p>
      <p>
        전세 3억원에서 보증금을 1억원만 남기고 나머지를 월세로 바꾸면, 2억원 × {CAP} ÷ 12 ={" "}
        <strong>월 {formatWon(toWolse.monthlyRent)}</strong>이 법정 상한 기준 월세입니다.
      </p>
      <p className="formula">전세 환산 보증금 = 보증금 + 월세 × 12 ÷ 전환율</p>
      <p>
        보증금 1억원, 월세 80만원인 집을 전환율 {CAP}로 전세로 환산하면 1억원 + 960만원 ÷ {CAP} ={" "}
        <strong>{koreanWon(toJeonse.jeonse)}</strong>입니다. 이 방향은 법정 상한이 없어 보통 시장 전환율을 쓰는데,
        시장 평균 {MARKET}로 환산하면 1억원 + 960만원 ÷ {MARKET} ={" "}
        <strong>{koreanWon(toJeonseMarket.jeonse)}</strong>으로 {koreanWon(toJeonse.jeonse - toJeonseMarket.jeonse)}{" "}
        적습니다. 같은 월세라도 전환율이 높을수록 전세 환산액은 작아집니다.
      </p>
      <p className="formula">전환율 = 월세 × 12 ÷ (전세보증금 − 월세 보증금)</p>
      <p>
        전세 3억원을 보증금 1억원, 월세 90만원으로 바꾸자는 제안이라면 1,080만원 ÷ 2억원 ={" "}
        <strong>연 {formatNumber(over.ratePct, 2)}%</strong>로 상한 {CAP}를 넘습니다. 상한 기준 월세는{" "}
        {formatWon(over.capMonthlyRent)}이라 매달 {formatWon(over.excessPerMonth)}, 1년에{" "}
        {formatWon(over.excessPerMonth * 12)}을 더 내는 셈입니다.
      </p>

      <h2>전환 금액별 월세표</h2>
      <p>월세로 바꾸는 보증금(전세보증금 − 남길 보증금)에 따라 전환율별 월세를 정리했습니다. 원 미만은 버렸습니다.</p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">바꾸는 금액</th>
              {rates.map((r) => (
                <th key={r} scope="col">
                  연 {formatNumber(r, 2)}%{r === LEGAL_CAP_RATE ? " (상한)" : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TABLE_CONVERTED_AMOUNTS.map((amount) => (
              <tr key={amount}>
                <td>{koreanWon(amount)}</td>
                {rates.map((r) => (
                  <td key={r}>{formatWon(monthlyRentFor(amount, r))}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        계약 기간 중이나 갱신 때 바꾸는 경우에는 상한 열보다 많은 월세를 받을 수 없습니다. 상한보다 높은 열은 시장
        전환율과 비교해 보라고 넣은 값입니다.
      </p>

      <h2>법정 상한이 적용되는 경우</h2>
      <ul>
        <li>
          <strong>계약 기간 중 전환</strong>: 살고 있는 동안 집주인과 합의해 보증금 일부를 돌려받고 월세로 바꾸는 경우입니다.
          법정 상한이 그대로 적용됩니다.
        </li>
        <li>
          <strong>계약갱신요구권으로 갱신하면서 전환</strong>: 갱신된 임대차는 종전과 같은 조건으로 다시 계약한 것으로
          보므로 임차인이 동의하지 않으면 월세로 바꿀 수 없고, 동의해 바꾸더라도 법정 상한이 적용됩니다(국토교통부·법무부
          주택임대차보호법 해설집).
        </li>
        <li>
          <strong>새 임차인과의 신규 계약</strong>: 보증금을 ‘전환’하는 것이 아니라 처음부터 보증금과 월세를 정하는
          것이어서 일반적으로 법정 상한이 적용되지 않고 시세대로 정합니다. 기존 세입자가 계약 만료 뒤 합의로 다시 계약하는
          경우는 해석이 갈릴 수 있으니, 다툼이 생기면 주택임대차분쟁조정위원회에 문의하는 것이 좋습니다.
        </li>
        <li>
          <strong>월세 → 전세</strong>: 법 조항은 보증금을 월세로 바꾸는 방향만 제한합니다. 월세를 줄이고 보증금을 올리는
          전환율은 당사자가 정합니다.
        </li>
        <li>
          <strong>상가</strong>: 상가건물(환산보증금이 지역별 기준 이하인 임대차)은 상가건물 임대차보호법 제12조·시행령
          제5조에 따라 연 12%와 기준금리의 4.5배 중 낮은 비율이 상한입니다. 환산보증금이 기준(서울 9억원 등)을 넘는
          임대차에는 이 상한이 적용되지 않습니다(같은 법 제2조제3항).
        </li>
      </ul>
      <p>
        상한을 넘는 월세 약정은 임차인에게 불리한 부분이라 효력이 없고(제10조), 이미 더 낸 월세는 돌려 달라고 청구할 수
        있습니다(제10조의2).
      </p>

      <h2>시장 전환율(한국부동산원)과 법정 상한의 차이</h2>
      <p>
        한국부동산원은 전국주택가격동향조사에서 확정일자 등 실제 전·월세 거래 자료를 바탕으로 지역별·주택 유형별
        전월세전환율을 매달 공표합니다. 이 값은 시장에서 실제로 거래된 평균이고, 법정 상한은 계약 중 전환할 때 넘을 수 없는 한도라 성격이
        다릅니다.
      </p>
      <p>
        시장 전환율은 대체로 법정 상한보다 높고, 일반적으로 아파트보다 연립·다세대와 단독주택이, 수도권보다 지방이 높은
        편입니다. 예를 들어 한국주택금융공사는 {MARKET_FROM}부터 전세자금보증 심사에 쓰는 전월세전환율을{" "}
        <a href={MARKET_RATE.url} rel="noopener">
          {MARKET}
        </a>
        (국가통계포털 지역별 전월세전환율 최근 6개월 평균)로 정했습니다. 이 값은 반기마다 새로 공지됩니다. 계산기의 월세
        → 전세 환산은 이 값을 기본으로 씁니다. 신규 계약 시세를 가늠할 때는 해당 지역의 시장 전환율을 넣어 보세요. 지역별
        값은{" "}
        <a href="https://www.reb.or.kr/r-one/" rel="noopener">
          한국부동산원 부동산통계정보시스템(R-ONE)
        </a>
        에서 확인할 수 있습니다.
      </p>

      <h2>기준금리 변경과 법정 상한</h2>
      <p>법정 상한은 기준금리를 따라 움직입니다. 최근 기준금리가 바뀐 날과 그때부터의 상한은 다음과 같습니다.</p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">기준금리 변경일</th>
              <th scope="col">기준금리</th>
              <th scope="col">법정 전환율 상한</th>
            </tr>
          </thead>
          <tbody>
            {BASE_RATE_HISTORY.map((h, i) => (
              <tr key={h.date} className={i === 0 ? "is-current" : undefined}>
                <td>{formatKoreanDate(parseYMD(h.date)!, false)}</td>
                <td>연 {h.rate.toFixed(2)}%</td>
                <td>
                  연 {formatNumber(legalCapRate(h.rate), 2)}%{i === 0 ? " (현재)" : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        가산 이율 연 2%는 2020년 9월 29일 시행령 개정으로 연 3.5%에서 낮아진 값입니다. 그 전에 전환한 계약은 당시
        기준을 따릅니다.
      </p>

      <h2>근거 법령과 자료</h2>
      <ul>
        <li>
          <a href="https://www.law.go.kr/법령/주택임대차보호법" rel="noopener">
            주택임대차보호법
          </a>{" "}
          제7조의2(월차임 전환 시 산정률의 제한), 제10조(강행규정), 제10조의2(초과 차임 등의 반환청구)
        </li>
        <li>
          <a href="https://www.law.go.kr/법령/주택임대차보호법시행령" rel="noopener">
            주택임대차보호법 시행령
          </a>{" "}
          제9조(월차임 전환 시 산정률): ① 연 1할, ② 기준금리에 더하는 이율 연 2퍼센트. 현행은 2026. 7. 1. 시행본이며 제9조는
          2020. 9. 29. 개정 이후 그대로입니다.
        </li>
        <li>
          <a href={BOK_BASE_RATE_SOURCE.url} rel="noopener">
            {BOK_BASE_RATE_SOURCE.name}
          </a>
          : {BASE_DATE} 연 {BASE} ({CHECKED_DATE} 확인)
        </li>
        <li>
          <a href={MARKET_RATE.url} rel="noopener">
            {MARKET_RATE.name}
          </a>
          : 전월세전환율 {MARKET}, {MARKET_FROM} 보증신청 건부터 적용
        </li>
        <li>
          <a
            href="https://www.moleg.go.kr/lawinfo/nwLwAnInfo.mo?mid=a10106020000&cs_seq=425261"
            rel="noopener"
          >
            법제처 법령해석 20-0683
          </a>
          (2021. 3. 3.): 개정 시행령(가산 이율 연 2%)의 적용 여부는 월세로 전환하는 갱신계약의 체결일을 기준으로 판단
        </li>
        <li>국토교통부·법무부 「개정 주택임대차보호법 해설집」(2020. 8.) 전월세 전환 Q&amp;A</li>
      </ul>
    </ToolShell>
  );
}
