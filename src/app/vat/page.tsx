import type { CSSProperties } from "react";
import type { Metadata } from "next";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatPercent, formatWon } from "@/lib/format";
import {
  SIMPLIFIED_INDUSTRIES,
  simplifiedVat,
  splitFromSupply,
  splitFromTotal,
} from "@/lib/calc/vat";
import { VatCalculator } from "./VatCalculator";

export const metadata: Metadata = pageMetadata({
  title: "부가세 계산기 - 공급가액·부가세 10%·합계금액 역산",
  description:
    "공급가액에 부가세 10%를 더한 합계금액과, 부가세 포함 금액에서 공급가액을 거꾸로 계산합니다. 110만원이면 공급가액 100만원, 부가세 10만원. 간이과세자 업종별 부가가치율(15~40%) 납부세액도 계산해요.",
  path: "/vat/",
  keywords: [
    "부가세 계산기",
    "부가가치세 계산",
    "공급가액 계산",
    "부가세 포함 금액 계산",
    "부가세 역산",
    "합계금액 공급가액",
    "간이과세자 부가세 계산",
    "업종별 부가가치율",
  ],
});

const FAQ: FaqItem[] = [
  {
    q: "부가세 포함 금액에서 부가세만 빼려면 어떻게 하나요?",
    a: "합계금액을 1.1로 나누면 공급가액, 11로 나누면 부가세입니다. 110만원이면 공급가액 100만원, 부가세 10만원입니다. 나누어떨어지지 않으면 원 미만을 반올림하거나 버리는데, 방식에 따라 1원 차이가 날 수 있습니다.",
  },
  {
    q: "부가세 원 단위는 반올림인가요, 절사인가요?",
    a: "세금계산서 세액의 끝수 처리 방법은 부가가치세법에 따로 정해져 있지 않고, 실무에서는 공급가액 × 10%에서 원 미만을 버리는 방식을 가장 많이 씁니다. 다만 국세의 과세표준을 계산할 때 1원 미만은 계산하지 않으므로(국고금 관리법 제47조 제2항), 부가세 포함 금액에서 공급가액을 구할 때 공급가액의 원 미만을 버리면 이 규정에 맞습니다. 영수증처럼 반올림하면 1원 차이가 날 수 있으니 거래처와 같은 방식으로 맞추면 됩니다.",
  },
  {
    q: "공급가액과 공급대가는 무엇이 다른가요?",
    a: "공급가액은 부가세를 뺀 금액이고, 공급대가는 부가세를 포함한 금액입니다. 일반과세자는 공급가액에 10%를 더해 받고, 간이과세자는 공급대가를 기준으로 세금을 계산합니다.",
  },
  {
    q: "간이과세자 기준 금액은 얼마인가요?",
    a: "직전 연도 공급대가(부가세 포함 매출)가 1억 400만원 미만인 개인사업자입니다. 2024년 7월 1일부터 8,000만원에서 올랐고, 부동산임대업과 과세유흥장소는 4,800만원 미만이어야 합니다. 업종이나 지역에 따라 매출과 관계없이 간이과세에서 배제되기도 합니다.",
  },
  {
    q: "간이과세자는 부가세를 안 내나요?",
    a: "1년 공급대가가 4,800만원 미만이면 납부의무가 면제됩니다. 그 이상이면 매출 × 업종별 부가가치율 × 10%를 내며, 음식점은 매출의 1.5% 정도입니다. 면제되더라도 다음 해 1월 25일까지 신고는 해야 합니다.",
  },
  {
    q: "부가세 신고 기간은 언제인가요?",
    a: "개인 일반과세자는 1월~6월분을 7월 25일까지, 7월~12월분을 다음 해 1월 25일까지 신고·납부합니다. 4월과 10월에는 직전 세액의 절반이 예정고지됩니다. 간이과세자는 1년분을 다음 해 1월 25일까지 신고합니다.",
  },
];

/** Long text cells in comparison tables wrap instead of scrolling. */
const wrap: CSSProperties = { whiteSpace: "normal", textAlign: "left", verticalAlign: "top" };

export default function VatPage() {
  const supplyTable = [100_000, 500_000, 1_000_000, 3_000_000, 5_000_000, 10_000_000, 30_000_000, 100_000_000];
  const totalTable = [1_000, 10_000, 33_000, 55_000, 100_000, 330_000, 1_000_000, 1_100_000, 3_300_000, 10_000_000];
  const example = simplifiedVat({ sales: 80_000_000, ratePct: 15, purchases: 30_000_000, cardSales: 50_000_000 });
  const odd = splitFromTotal(1_000);
  const oddAlt = splitFromTotal(1_000, "floor");
  const tenK = splitFromTotal(10_000);
  const tenKFloor = splitFromTotal(10_000, "supplyFloor");

  return (
    <ToolShell
      slug="vat"
      h1="부가세 계산기 (공급가액·부가세·합계금액)"
      lead="공급가액, 합계금액, 부가세 중 아는 금액 하나만 넣으면 나머지를 세금계산서 기준으로 나눠 드려요. 간이과세자는 업종별 부가가치율로 1년 납부세액을 어림할 수 있어요."
      basis="부가가치세법 제30조(세율 10%)·제61조, 시행령 제109조·제111조(간이과세 기준·업종별 부가가치율), 국고금 관리법 제47조 기준 · 2026년 10월 9일 확인"
      calculator={<VatCalculator />}
      faq={FAQ}
      appCategory="FinanceApplication"
    >
      <h2>부가가치세(부가세)란</h2>
      <p>
        부가가치세는 물건이나 서비스를 팔 때 붙는 세금으로, 세율은 10%입니다(부가가치세법 제30조). 세금은 최종 소비자가
        가격에 얹어 부담하고, 사업자는 받은 부가세(매출세액)에서 물건을 사며 낸 부가세(매입세액)를 뺀 차액을 국가에
        냅니다. 세금계산서에는 부가세를 뺀 <strong>공급가액</strong>과 <strong>세액</strong>을 따로 적고, 둘을 더한 금액이{" "}
        <strong>합계금액</strong>입니다. 부가세가 포함된 매출은 <strong>공급대가</strong>라고 부릅니다.
      </p>

      <h2>부가세 계산 공식과 예시</h2>
      <p className="formula">부가세 = 공급가액 × 10% &nbsp;|&nbsp; 합계금액 = 공급가액 × 1.1</p>
      <p className="formula">공급가액 = 합계금액 ÷ 1.1 &nbsp;|&nbsp; 부가세 = 합계금액 ÷ 11</p>
      <p>
        공급가액이 1,000,000원이면 부가세는 100,000원, 합계는 1,100,000원입니다. 반대로 부가세 포함 55,000원을 받았다면
        55,000 ÷ 1.1 = <strong>50,000원</strong>이 공급가액이고 5,000원이 부가세입니다. 받은 금액에 부가세가 들어 있는지
        분명하지 않으면 그 금액의 110분의 100을 공급가액으로 봅니다(같은 법 제29조 제7항).
      </p>

      <div className="table-wrap">
        <table className="data-table">
          <caption>공급가액(부가세 별도)으로 본 부가세와 합계</caption>
          <thead>
            <tr>
              <th scope="col">공급가액</th>
              <th scope="col">부가세</th>
              <th scope="col">합계금액</th>
            </tr>
          </thead>
          <tbody>
            {supplyTable.map((s) => {
              const r = splitFromSupply(s);
              return (
                <tr key={s}>
                  <td>{formatWon(r.supply)}</td>
                  <td>{formatWon(r.vat)}</td>
                  <td>{formatWon(r.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <caption>합계금액(부가세 포함)에서 나눈 공급가액과 부가세</caption>
          <thead>
            <tr>
              <th scope="col">합계금액</th>
              <th scope="col">공급가액</th>
              <th scope="col">부가세</th>
            </tr>
          </thead>
          <tbody>
            {totalTable.map((t) => {
              const r = splitFromTotal(t);
              return (
                <tr key={t}>
                  <td>{formatWon(r.total)}</td>
                  <td>{formatWon(r.supply)}</td>
                  <td>{formatWon(r.vat)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>원 단위 끝수는 버릴까, 반올림할까</h2>
      <p>
        세금계산서 세액의 원 미만을 어떻게 처리할지는 부가가치세법에 따로 정해져 있지 않아, 거래처마다 1원씩 차이가 나기도
        합니다. 다만 국고금 관리법 제47조 제2항은 국세의 과세표준액을 산정할 때 1원 미만의 끝수는 계산하지 않는다고 정하고
        있어, 과세표준인 공급가액의 원 미만은 버리는 것이 이 규정에 맞습니다. 이 계산기는 실무에서 흔한 방식을 기본으로
        하고, 다른 방식과 1원이 달라지면 결과 아래에 함께 보여 줍니다.
      </p>
      <ul>
        <li>
          <strong>공급가액 → 부가세</strong>: 공급가액 × 10%에서 원 미만을 버립니다. 12,345원이면 부가세{" "}
          {formatWon(splitFromSupply(12_345).vat)}입니다(반올림하면 {formatWon(splitFromSupply(12_345, "round").vat)}).
        </li>
        <li>
          <strong>합계금액 → 공급가액</strong>: 합계 ÷ 1.1을 원 미만 반올림해 공급가액으로 하고, 나머지를 부가세로 둡니다.
          1,000원짜리 상품 영수증에 공급가액 {formatWon(odd.supply)}, 부가세 {formatWon(odd.vat)}이 찍히는 방식입니다.
          부가세를 1,000 ÷ 11에서 원 미만을 버려 구하면 {formatWon(oddAlt.supply)}과 {formatWon(oddAlt.vat)}이 되어 1원
          차이가 납니다. 합계가 10,000원이면 반올림으로는 {formatWon(tenK.supply)} + {formatWon(tenK.vat)}이지만, 공급가액
          9,090.9원의 원 미만을 버리면(국고금 관리법 제47조 제2항) {formatWon(tenKFloor.supply)} +{" "}
          {formatWon(tenKFloor.vat)}입니다. 반올림 결과는 합계를 11로 나눈 나머지가 1~5이면 이 방식과, 6~10이면 부가세를
          버리는 방식과 1원 차이가 납니다.
        </li>
        <li>
          <strong>부가세 → 공급가액</strong>: 부가세 × 10입니다. 세액이 원 미만을 버린 값이라면 실제 공급가액은 최대 9원 더
          클 수 있습니다.
        </li>
      </ul>
      <p>
        주고받는 쪽이 같은 금액으로 적으면 되므로 거래처와 방식을 맞추는 것이 가장 좋습니다. 신고 후 세금을 실제로 낼
        때는 국고금 관리법 제47조 제1항에 따라 10원 미만 끝수를 떼고 냅니다.
      </p>

      <h2>일반과세자와 간이과세자 차이</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">구분</th>
              <th scope="col" style={wrap}>
                일반과세자
              </th>
              <th scope="col" style={wrap}>
                간이과세자
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>대상</td>
              <td style={wrap}>법인, 간이과세 기준을 넘는 개인</td>
              <td style={wrap}>직전 연도 공급대가 1억 400만원 미만 개인</td>
            </tr>
            <tr>
              <td>세액 계산</td>
              <td style={wrap}>매출세액(10%) − 매입세액</td>
              <td style={wrap}>공급대가 × 업종별 부가가치율 × 10%</td>
            </tr>
            <tr>
              <td>매입 공제</td>
              <td style={wrap}>매입세액 전액</td>
              <td style={wrap}>매입 공급대가 × 0.5%</td>
            </tr>
            <tr>
              <td>환급</td>
              <td style={wrap}>매입세액이 많으면 환급</td>
              <td style={wrap}>없음</td>
            </tr>
            <tr>
              <td>세금계산서</td>
              <td style={wrap}>발급</td>
              <td style={wrap}>직전 연도 4,800만원 이상이면 발급, 미만·신규는 영수증</td>
            </tr>
            <tr>
              <td>과세기간</td>
              <td style={wrap}>6개월 (1~6월, 7~12월)</td>
              <td style={wrap}>1년 (1~12월)</td>
            </tr>
            <tr>
              <td>납부 면제</td>
              <td style={wrap}>없음</td>
              <td style={wrap}>1년 공급대가 4,800만원 미만</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        간이과세 기준은 2024년 7월 1일부터 8,000만원에서 <strong>1억 400만원</strong>으로 올랐습니다(시행령 제109조).
        부동산임대업과 과세유흥장소(유흥주점 등)는 해당 업종의 직전 연도 매출 4,800만원이 기준입니다(법 제61조 제1항
        제3호). 1년 매출이 기준 이상이면 다음 해 7월 1일부터 일반과세자로 바뀝니다(제62조). 광업, 도매업, 부동산매매업,
        변호사·세무사 같은 전문자격사업과 국세청장이 정한 배제 지역은 매출이 적어도 간이과세를 받을 수 없습니다. 배제
        지역을 정한 국세청{" "}
        <a href="https://www.law.go.kr/행정규칙/간이과세배제기준" target="_blank" rel="noopener noreferrer">
          「간이과세 배제기준」 고시
        </a>
        (제2026-19호)가 2026년 7월 1일 새로 시행되었으니, 예전 기준으로 배제됐던 곳이라도 홈택스나 세무서에서 다시 확인해
        보세요. 배제 지역 안이라도 전통시장이나 골목형상점가의 영세사업자로서 성실하게 신고해 왔다면 관할세무서장 확인을
        거쳐 간이과세를 받을 수 있습니다(같은 고시 제7조).
      </p>

      <h2>간이과세자 업종별 부가가치율</h2>
      <p className="formula">납부세액 = 공급대가 × 업종별 부가가치율 × 10% − 공제세액</p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>부가가치세법 시행령 제111조 제2항 (2021년 7월 1일 공급분부터)</caption>
          <thead>
            <tr>
              <th scope="col">업종</th>
              <th scope="col">부가가치율</th>
              <th scope="col">매출 대비</th>
              <th scope="col">매출 6,000만원이면</th>
            </tr>
          </thead>
          <tbody>
            {SIMPLIFIED_INDUSTRIES.map((x) => (
              <tr key={x.id}>
                <td style={{ ...wrap, minWidth: "12rem" }}>{x.full}</td>
                <td>{x.ratePct}%</td>
                <td>{formatPercent(x.ratePct / 1000, 1)}</td>
                <td>{formatWon(simplifiedVat({ sales: 60_000_000, ratePct: x.ratePct }).grossTax)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        예를 들어 연 매출 8,000만원인 간이과세 음식점이 세금계산서·카드 영수증을 받은 매입 3,000만원, 카드 매출
        5,000만원이 있다면 8,000만원 × 15% × 10% = {formatWon(example.grossTax)}에서 매입 공제{" "}
        {formatWon(example.purchaseCredit)}(0.5%)와 카드 발행세액공제 {formatWon(example.cardCredit)}(1.3%)를 빼{" "}
        <strong>{formatWon(example.payable)}</strong>을 냅니다. 공제가 납부세액보다 많아도 환급되지 않습니다. 카드
        발행세액공제 1.3%와 연 1,000만원 한도는 2026년 12월 31일까지 적용되고, 그 뒤에는 1%와 500만원입니다(같은 법
        제46조). 이 공제는 직전 연도 매출이 4,800만원 미만이거나 새로 개업한 간이과세자라면 업종과 관계없이 받고, 그
        밖에는 소매·음식·숙박업처럼 주로 소비자를 상대하는 업종(시행령 제73조 제1항·제2항)만 받습니다. 일반과세자 중
        법인과 직전 연도 공급가액이 10억원을 넘는 개인은 받을 수 없습니다(시행령 제88조). 1년 매출이 4,800만원 미만이면 납부할 세금이 없으며, 한 해 중간에 개업했다면 12개월로 환산한 매출로
        판단합니다(제69조).
      </p>

      <h2>부가세 신고·납부 기한</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">구분</th>
              <th scope="col" style={wrap}>
                대상 기간
              </th>
              <th scope="col" style={wrap}>
                기한
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>일반 개인 1기 확정</td>
              <td style={wrap}>1월~6월</td>
              <td style={wrap}>7월 25일</td>
            </tr>
            <tr>
              <td>일반 개인 2기 확정</td>
              <td style={wrap}>7월~12월</td>
              <td style={wrap}>다음 해 1월 25일</td>
            </tr>
            <tr>
              <td>일반 개인 예정고지</td>
              <td style={wrap}>직전 6개월 세액의 50%</td>
              <td style={wrap}>4월 25일, 10월 25일</td>
            </tr>
            <tr>
              <td>법인 예정·확정</td>
              <td style={wrap}>3개월마다</td>
              <td style={wrap}>4월·7월·10월·다음 해 1월 25일</td>
            </tr>
            <tr>
              <td>간이과세자 확정</td>
              <td style={wrap}>1월~12월</td>
              <td style={wrap}>다음 해 1월 25일</td>
            </tr>
            <tr>
              <td>간이과세자 예정부과</td>
              <td style={wrap}>직전 연도 세액의 50%</td>
              <td style={wrap}>7월 25일</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        개인 일반과세자는 4월과 10월에 신고 없이 고지서로 직전 과세기간 세액의 절반을 내고, 확정신고 때 이를 빼고
        정산합니다. 고지할 금액이 50만원 미만이면 고지하지 않습니다. 직전 과세기간 공급가액이 1억 5천만원 미만인 소규모
        법인도 예정고지 대상입니다. 간이과세자가 1월~6월에 세금계산서를 발급했다면 7월 25일까지 예정신고를 해야 합니다.
        기한이 토요일이나 공휴일이면 다음 영업일까지이며(국세기본법 제5조), 2026년 2기 예정고지는 10월 25일이 일요일이라
        10월 26일(월)까지 내면 됩니다. 폐업하면 폐업일이 속한 달의 다음 달 25일까지 신고합니다.
      </p>

      <h2>근거 법령과 참고 자료</h2>
      <ul>
        <li>
          <a href="https://www.law.go.kr/법령/부가가치세법" target="_blank" rel="noopener noreferrer">
            부가가치세법
          </a>{" "}
          제29조(과세표준), 제30조(세율), 제46조(신용카드 등 발행세액공제), 제48조·제49조(신고와 납부), 제61조·제62조(간이과세
          적용 범위와 기간), 제63조(간이과세자 세액), 제66조(예정부과), 제69조(납부의무 면제)
        </li>
        <li>
          <a href="https://www.law.go.kr/법령/부가가치세법시행령" target="_blank" rel="noopener noreferrer">
            부가가치세법 시행령
          </a>{" "}
          제88조(신용카드 등 발행세액공제 대상), 제109조(간이과세 기준 1억 400만원), 제111조(업종별 부가가치율)
        </li>
        <li>
          <a href="https://www.law.go.kr/법령/국고금관리법" target="_blank" rel="noopener noreferrer">
            국고금 관리법
          </a>{" "}
          제47조(국고금의 끝수 계산: 과세표준 1원 미만, 납부 10원 미만)
        </li>
        <li>
          <a href="https://www.law.go.kr/행정규칙/간이과세배제기준" target="_blank" rel="noopener noreferrer">
            국세청 간이과세 배제기준
          </a>{" "}
          (고시 제2026-19호, 2026년 7월 1일 시행)
        </li>
        <li>
          <a
            href="https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=2273&cntntsId=7694"
            target="_blank"
            rel="noopener noreferrer"
          >
            국세청 부가가치세 신고납부기한
          </a>
          ,{" "}
          <a
            href="https://www.nts.go.kr/nts/cm/cntnts/cntntsView.do?mi=2275&cntntsId=7696"
            target="_blank"
            rel="noopener noreferrer"
          >
            국세청 부가가치세 세율
          </a>
        </li>
      </ul>
      <p className="note">
        계산 결과는 어림값입니다. 가산세, 의제매입세액공제, 전자세금계산서 발급세액공제 등은 반영하지 않았으니 실제
        신고는 홈택스 신고서 금액을 기준으로 하세요.
      </p>
    </ToolShell>
  );
}
