import type { Metadata } from "next";
import Link from "next/link";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber, formatWon, koreanWon } from "@/lib/format";
import {
  ACQ_PAGE_MANWON,
  computeAcquisitionTax,
  EOK,
  FIRST_HOME_DEADLINE,
  MAN,
  NATIONAL_HOUSING_M2,
  NATIONAL_HOUSING_M2_RURAL,
  priceLabel,
  rateLabel,
  REGULATED_AS_OF,
  REGULATED_GYEONGGI,
  REGULATED_SEOUL,
  standardRateUnits,
  totalFor,
} from "@/lib/calc/acquisition-tax";
import { maxFeeFor } from "@/lib/calc/brokerage-fee";
import { m2ToPyeong, PYEONG_PAGE_M2 } from "@/lib/calc/pyeong";
import { AcquisitionTaxCalculator } from "./AcquisitionTaxCalculator";
import { BASIS, LAW_LINKS, SOURCE_LINKS } from "./sources";

const ONE = { houses: 1, regulated: false, over85: false } as const;
/** /pyeong/85/ while it exists; otherwise the pyeong main page. */
const PYEONG_85_HREF = PYEONG_PAGE_M2.includes(NATIONAL_HOUSING_M2) ? `/pyeong/${NATIONAL_HOUSING_M2}/` : "/pyeong/";
const ex5 = totalFor(5 * EOK, ONE);
const ex5Large = totalFor(5 * EOK, { ...ONE, over85: true });
const ex5Heavy = totalFor(5 * EOK, { houses: 2, regulated: true, over85: false });
const ex6 = totalFor(6 * EOK, ONE);
const ex6Large = totalFor(6 * EOK, { ...ONE, over85: true });

export const metadata: Metadata = pageMetadata({
  title: "취득세 계산기 - 2026 아파트 매매 취득세율표 (다주택·생애최초)",
  description: `주택 매매 취득세를 지방교육세·농어촌특별세까지 바로 계산합니다. 5억 아파트 1주택은 ${koreanWon(ex5)}, 조정대상지역 2주택이면 8% 중과로 ${koreanWon(ex5Heavy)}입니다. 2026년 취득세율표, 생애최초 감면, 조정대상지역 현황을 확인하세요.`,
  path: "/acquisition-tax/",
  keywords: [
    "취득세 계산기",
    "아파트 취득세",
    "취득세율표 2026",
    "주택 취득세",
    "생애최초 취득세 감면",
    "다주택자 취득세 중과",
    "2주택 취득세",
  ],
});

const FAQ: FaqItem[] = [
  {
    q: "6억 아파트 취득세는 얼마인가요?",
    a: `1주택이고 전용 85㎡ 이하라면 취득세 1%인 600만원에 지방교육세 60만원을 더해 ${koreanWon(ex6)}입니다. 전용 85㎡를 넘으면 농어촌특별세 0.2%인 120만원이 붙어 ${koreanWon(ex6Large)}입니다.`,
  },
  {
    q: "2주택이 되면 취득세가 8%인가요?",
    a: "새로 사는 집이 조정대상지역에 있을 때만 8%입니다. 비조정대상지역이면 2주택이어도 1주택과 같은 1~3%이고, 이사 등으로 잠시 2주택이 되는 일시적 2주택도 기존 집을 기한 안에 팔면 1~3%를 적용합니다.",
  },
  {
    q: "생애최초 취득세 감면은 누가 받을 수 있나요?",
    a: "본인과 배우자 모두 주택을 가진 적이 없는 대한민국 국민(미성년자 제외)이 12억원 이하 주택을 본인이 살 목적으로 매매할 때 받습니다. 부모 등 같은 세대 가족의 집은 따지지 않고, 감면 대상이면 다주택 중과도 적용하지 않습니다. 취득세가 200만원 이하이면 전액 면제, 넘으면 200만원을 빼 줍니다. 2028년 12월 31일 취득분까지 적용됩니다.",
  },
  {
    q: "생애최초 감면을 받은 뒤 지켜야 할 것이 있나요?",
    a: "취득일부터 3년 안에 팔거나 증여하거나 임대 등 다른 용도로 쓰면 감면받은 세금을 다시 냅니다. 2026년 1월 1일 이후 취득한 집은 ‘3개월 안에 전입해 살아야 한다’는 요건이 법 개정으로 없어졌습니다. 감면은 자동이 아니라 취득세를 신고할 때 함께 신청해야 합니다.",
  },
  {
    q: "취득세는 언제까지 내야 하나요?",
    a: "취득일부터 60일 안에 신고하고 납부합니다. 매매는 잔금을 치른 날이 취득일이고, 잔금 전에 등기를 했다면 등기일이 취득일입니다. 위택스나 관할 시·군·구청에서 신고할 수 있습니다.",
  },
  {
    q: "분양권이나 오피스텔도 주택 수에 들어가나요?",
    a: "2020년 8월 12일 이후 취득한 분양권·입주권과 주택분 재산세가 과세되는 오피스텔은 주택 수에 포함됩니다. 주택 수는 본인이 아니라 같은 세대(배우자 포함) 전체를 기준으로 셉니다.",
  },
];

/** 6억~9억 구간 예시 (억원) */
const MID_EXAMPLES = [6.5, 7, 7.5, 8, 8.5];

function pageHref(manwon: number): string | null {
  return ACQ_PAGE_MANWON.includes(manwon) ? `/acquisition-tax/${manwon}/` : null;
}

export default function AcquisitionTaxPage() {
  const r7 = computeAcquisitionTax({ price: 7 * EOK, ...ONE })!;
  const firstHome3 = computeAcquisitionTax({ price: 3 * EOK, ...ONE, firstHome: true })!;
  const firstHome5 = computeAcquisitionTax({ price: 5 * EOK, ...ONE, firstHome: true })!;

  return (
    <ToolShell
      slug="acquisition-tax"
      h1="취득세 계산기 (주택 매매)"
      lead={`5억 아파트를 1주택으로 사면 취득세와 지방교육세를 합쳐 ${koreanWon(ex5)}(1.1%), 조정대상지역 2주택이면 8% 중과로 ${koreanWon(ex5Heavy)}입니다. 매매가와 주택 수, 지역, 전용면적을 넣으면 농어촌특별세와 생애최초 감면까지 반영해 바로 계산해 드려요.`}
      basis={BASIS}
      calculator={<AcquisitionTaxCalculator />}
      faq={FAQ}
      appCategory="FinanceApplication"
    >
      <h2>취득세 계산 방법</h2>
      <p>
        주택을 사면 취득세와 함께 지방교육세를 내고, 전용면적이 국민주택규모인{" "}
        <Link href={PYEONG_85_HREF}>
          {NATIONAL_HOUSING_M2}㎡(약 {formatNumber(m2ToPyeong(NATIONAL_HOUSING_M2), 1)}평)
        </Link>
        를 넘으면 농어촌특별세도 냅니다. 수도권 밖에서 도시지역이 아닌 읍·면 지역은 국민주택규모가{" "}
        {NATIONAL_HOUSING_M2_RURAL}㎡라 그 이하이면 농어촌특별세가 없습니다(주택법 제2조 제6호). 세 가지 모두
        취득가액(실제 거래가격)에 각각의 세율을 곱해 구합니다.
      </p>
      <p className="formula">총 납부세액 = 취득가액 × (취득세율 + 지방교육세율 + 농어촌특별세율)</p>
      <p>
        예를 들어 5억원 아파트를 1주택으로 사면 취득세 1%인 500만원에 지방교육세 0.1%인 50만원을 더해{" "}
        <strong>{koreanWon(ex5)}</strong>입니다. 전용 85㎡를 넘는 집이면 농어촌특별세 100만원이 붙어{" "}
        {koreanWon(ex5Large)}이고, 같은 집을 조정대상지역에서 두 번째 집으로 사면 8% 중과로 {koreanWon(ex5Heavy)}이
        됩니다.
      </p>
      <p>
        생애최초 감면을 받으면 취득세에서 감면액을 빼고, 지방교육세도 취득세가 줄어든 비율만큼 함께 줄어듭니다. 전용
        85㎡를 넘는 집은 감면받은 취득세의 20%를 농어촌특별세로 더 냅니다.
      </p>

      <h2>2026년 주택 취득세율표</h2>
      <p>
        세율은 이번에 사는 집을 포함한 세대 주택 수와, 새로 사는 집이 조정대상지역에 있는지에 따라 정해집니다. 기존에
        가진 집의 위치는 따지지 않습니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">취득 후 주택 수</th>
              <th scope="col">조정대상지역</th>
              <th scope="col">그 외 지역</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1주택</td>
              <td>1~3%</td>
              <td>1~3%</td>
            </tr>
            <tr>
              <td>2주택</td>
              <td>8% (일시적 2주택은 1~3%)</td>
              <td>1~3%</td>
            </tr>
            <tr>
              <td>3주택</td>
              <td>12%</td>
              <td>8%</td>
            </tr>
            <tr>
              <td>4주택 이상</td>
              <td>12%</td>
              <td>12%</td>
            </tr>
            <tr>
              <td>법인</td>
              <td>12%</td>
              <td>12%</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="note">
        1~3%는 취득가액 6억원 이하 1%, 9억원 초과 3%, 그 사이는 가격에 따라 올라갑니다(지방세법 제11조 제1항 제8호).
        8%와 12%는 지방세법 제13조의2의 중과세율이며, 정부가 2022년 말 발표한 중과 완화안은 법 개정이 이뤄지지 않아
        2026년에도 위 세율이 그대로 적용됩니다. 생애최초 감면 대상이면 세대 주택 수와 관계없이 중과하지 않습니다.
      </p>

      <h2>6억~9억원 구간 세율</h2>
      <p>6억원 초과 9억원 이하 주택은 가격에 비례해 세율이 1%에서 3%까지 올라갑니다.</p>
      <p className="formula">세율(%) = 취득가액(억원) × 2/3 − 3 (소수 둘째 자리까지 반올림)</p>
      <p>
        7억원이면 7 × 2/3 − 3 = 1.67%라 취득세는 {formatWon(r7.acqTax)}이고, 지방교육세 {formatWon(r7.edu)}을 더하면{" "}
        {koreanWon(r7.total)}입니다. 지방교육세율은 이 구간에서도 취득세율의 10%입니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">취득가액</th>
              <th scope="col">취득세율</th>
              <th scope="col">1주택 합계 (85㎡ 이하)</th>
            </tr>
          </thead>
          <tbody>
            {MID_EXAMPLES.map((e) => {
              const price = e * EOK;
              const href = pageHref(price / MAN);
              return (
                <tr key={e}>
                  <td>{href ? <Link href={href}>{koreanWon(price)}</Link> : koreanWon(price)}</td>
                  <td>{rateLabel(standardRateUnits(price))}</td>
                  <td>{formatWon(totalFor(price, ONE))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>지방교육세와 농어촌특별세</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">취득세율</th>
              <th scope="col">지방교육세</th>
              <th scope="col">농어촌특별세</th>
              <th scope="col">합계 (85㎡ 이하)</th>
              <th scope="col">합계 (85㎡ 초과)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1% (6억원 이하)</td>
              <td>0.1%</td>
              <td>0.2%</td>
              <td>1.1%</td>
              <td>1.3%</td>
            </tr>
            <tr>
              <td>1~3% (6억~9억원)</td>
              <td>0.1~0.3%</td>
              <td>0.2%</td>
              <td>1.1~3.3%</td>
              <td>1.3~3.5%</td>
            </tr>
            <tr>
              <td>3% (9억원 초과)</td>
              <td>0.3%</td>
              <td>0.2%</td>
              <td>3.3%</td>
              <td>3.5%</td>
            </tr>
            <tr>
              <td>8% (중과)</td>
              <td>0.4%</td>
              <td>0.6%</td>
              <td>8.4%</td>
              <td>9.0%</td>
            </tr>
            <tr>
              <td>12% (중과)</td>
              <td>0.4%</td>
              <td>1.0%</td>
              <td>12.4%</td>
              <td>13.4%</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        지방교육세는 1~3% 구간에서 취득세율의 10%이고, 중과될 때는 0.4%로 고정됩니다(지방세법 제151조). 농어촌특별세는
        전용 {NATIONAL_HOUSING_M2}㎡(수도권 밖 도시지역이 아닌 읍·면은 {NATIONAL_HOUSING_M2_RURAL}㎡) 이하 주택에는
        붙지 않고, 이런 주택은 생애최초 감면을 받아도 감면분 농어촌특별세가 없습니다(농어촌특별세법 제4조 제9호·제11호).
        표의 ‘85㎡ 이하·초과’는 이 기준으로 읽으면 됩니다. 세 세금은 취득세를 신고할 때 한꺼번에 냅니다.
      </p>

      <h2>생애최초 주택 구입 감면</h2>
      <p>
        본인과 배우자 모두 주택을 가진 적이 없는 사람이 처음 집을 사면 취득세를 깎아 줍니다(지방세특례제한법
        제36조의3). 2025년 말 법 개정으로 <strong>{FIRST_HOME_DEADLINE} 취득분까지</strong> 연장되었습니다.
      </p>
      <ul>
        <li>
          <strong>대상</strong>: 취득가액 12억원 이하 주택을 본인이 살 목적으로 매매. 대한민국 국민이어야 하고 미성년자는
          제외되며, 소득 요건은 없습니다.
        </li>
        <li>
          <strong>세대 다주택이어도 가능</strong>: 무주택 여부는 본인과 배우자만 봅니다. 부모와 같은 세대라 세대 주택 수로는
          2주택 이상이 되더라도 감면을 받고, 이때는 8%·12% 중과 대신 1~3%를 적용합니다.
        </li>
        <li>
          <strong>한도</strong>: 산출 취득세가 200만원 이하이면 전액 면제, 넘으면 200만원을 뺍니다. 전용 60㎡ 이하·3억원(수도권
          6억원) 이하인 연립·다세대·도시형생활주택 등과 인구감소지역 주택은 300만원까지입니다. 아파트는 인구감소지역에
          있을 때만 300만원입니다.
        </li>
        <li>
          <strong>예시</strong>: 3억원 아파트는 취득세 300만원에서 200만원을 빼고 지방교육세도 같은 비율로 줄어 합계{" "}
          {koreanWon(firstHome3.total)}, 5억원 아파트는 {koreanWon(firstHome5.total)}입니다.
        </li>
        <li>
          <strong>사후관리</strong>: 취득일부터 3년 안에 팔거나 증여하거나 임대 등 다른 용도로 쓰면 감면세액을 추징합니다.
          2025년 12월 법 개정으로 2026년 1월 1일 이후 취득분은 ‘3개월 안에 전입해 살아야 한다’는 요건과 추가 주택 취득
          제한이 없어졌습니다.
        </li>
        <li>
          <strong>85㎡ 초과</strong>: 감면받은 취득세의 20%가 농어촌특별세로 붙어 실제 혜택이 조금 줄어듭니다.
        </li>
      </ul>
      <p className="note">
        행정안전부는 2026년 8월 지방세제 개편안에서 40세 미만 청년의 한도를 300만원으로 올리고 주거용 오피스텔을 대상에
        넣는 방안을 발표했습니다. 국회를 통과해야 확정되는 내용이라 이 계산기에는 반영하지 않았습니다.
      </p>

      <h2>조정대상지역 현황 ({REGULATED_AS_OF} 기준)</h2>
      <ul>
        <li>
          <strong>서울</strong>: {REGULATED_SEOUL}. 강남·서초·송파·용산구에 더해 2025년 10월 16일 나머지 21개 구가
          지정되었습니다.
        </li>
        <li>
          <strong>경기</strong>: {REGULATED_GYEONGGI.join(", ")}. 2025년 10월 16일 12곳, 2026년 7월 1일 구리시·용인시
          기흥구·화성시 동탄구가 추가되었습니다.
        </li>
        <li>
          <strong>그 밖의 지역</strong>: 인천과 지방 광역시·도는 모두 비조정대상지역입니다.
        </li>
      </ul>
      <p className="note">
        조정대상지역은 국토교통부가 주거정책심의위원회 심의를 거쳐 수시로 지정·해제합니다. 취득세는 잔금일(취득일)
        기준으로 판단하니 계약 전후로 바뀌지 않았는지 확인하세요. 출처:{" "}
        <a href={SOURCE_LINKS.regulated2025} rel="noopener">
          정책브리핑 2025. 10. 15.
        </a>
        ,{" "}
        <a href={SOURCE_LINKS.regulated2026} rel="noopener">
          정책브리핑 2026. 6. 30.
        </a>
      </p>

      <h2>주택 수는 이렇게 셉니다</h2>
      <ul>
        <li>본인이 아니라 주민등록상 같은 세대 전체 기준입니다. 배우자는 따로 살아도 같은 세대로 봅니다.</li>
        <li>
          취득일 현재 미혼이고 30세 미만인 자녀는 주소를 따로 두어도 부모와 같은 세대로 봅니다. 다만 소득이 기준 중위소득의
          40% 이상이고 독립해 생계를 꾸리면 별도 세대입니다(지방세법 시행령 제28조의3). 이런 자녀가 12억원 이하 첫 집을
          사면 생애최초 감면을 받아 중과도 피할 수 있습니다.
        </li>
        <li>이번에 사는 집을 포함해서 셉니다. 무주택자가 처음 사면 1주택, 1채 가진 사람이 한 채 더 사면 2주택입니다.</li>
        <li>2020년 8월 12일 이후 취득한 분양권·조합원입주권과, 주택분 재산세를 내는 오피스텔도 1채로 셉니다.</li>
        <li>
          시가표준액(공시가격) 1억원 이하 주택(정비구역 등은 제외)과, 수도권 밖의 공시가격 2억원 이하 주택(
          <a href={SOURCE_LINKS.lowPriceHomes} rel="noopener">
            2025년 1월 2일 취득분부터
          </a>
          )은 그 집을 살 때 중과하지 않고 주택 수에서도 빠집니다.
        </li>
        <li>상속받은 주택은 상속일부터 5년 동안 주택 수에서 빠집니다.</li>
      </ul>

      <h2>이 계산기가 다루지 않는 경우</h2>
      <p>
        이 계산기는 개인과 법인의 주택 매매(유상취득)를 기준으로 합니다. 아래 경우는 세율이나 요건이 달라 결과가
        달라질 수 있으니 반드시{" "}
        <a href={SOURCE_LINKS.wetax} rel="noopener">
          위택스
        </a>
        나 관할 시·군·구청 세무부서에서 확인하세요.
      </p>
      <ul>
        <li>
          <strong>일시적 2주택</strong>: 기존 집을 정해진 기간(현행 3년) 안에 처분해야 1~3%가 유지되고, 못 팔면 중과세율로
          추징됩니다. 행정안전부의 2026년 지방세제 개편안(8월 26일 발표)은 두 집이 모두 조정대상지역이면 처분기한을 2년으로
          줄여 2026년 10월 1일 이후 새로 취득하는 주택부터 적용하는 내용입니다(2026년 8월 26일 이전에 계약하고 계약금을
          낸 경우는 3년). 아직 지방세법 시행령이 개정되기 전이니 위택스나 시·군·구청에서 기한을 꼭 확인하세요.
        </li>
        <li>
          <strong>증여·상속</strong>: 증여는 기본 3.5%이지만 조정대상지역의 시가표준액 3억원 이상 주택은 12%가 될 수
          있고(1세대 1주택자가 배우자·직계존비속에게 주는 경우 등은 제외), 상속은 2.8%로 매매와 세율 체계가 다릅니다.
        </li>
        <li>
          <strong>그 밖의 특례</strong>: 신축·분양 주택의 옵션 비용, 고급주택 중과, 지방 준공 후 미분양 아파트 특례,
          출산·양육 가구 감면 등은 반영하지 않았습니다.
        </li>
      </ul>

      <h2>금액별 아파트 취득세</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">취득가액</th>
              <th scope="col">1주택 세율</th>
              <th scope="col">1주택 85㎡ 이하</th>
              <th scope="col">1주택 85㎡ 초과</th>
              <th scope="col">조정 2주택 (8%)</th>
            </tr>
          </thead>
          <tbody>
            {ACQ_PAGE_MANWON.map((m) => {
              const price = m * MAN;
              return (
                <tr key={m}>
                  <td>
                    <Link href={`/acquisition-tax/${m}/`}>{priceLabel(m)}</Link>
                  </td>
                  <td>{rateLabel(standardRateUnits(price))}</td>
                  <td>{formatWon(totalFor(price, ONE))}</td>
                  <td>{formatWon(totalFor(price, { ...ONE, over85: true }))}</td>
                  <td>{formatWon(totalFor(price, { houses: 2, regulated: true, over85: false }))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="note">합계는 취득세·지방교육세·농어촌특별세를 더한 금액이며 감면은 반영하지 않았습니다.</p>

      <h2>신고와 납부</h2>
      <p>
        취득세는 취득일부터 60일 안에 신고하고 납부합니다(지방세법 제20조). 매매의 취득일은 잔금을 치른 날이고, 잔금
        전에 소유권 이전등기를 했다면 등기일입니다. 보통 법무사가 등기와 함께 대신 신고하지만, 직접 하려면 위택스에서
        신고서를 내고 납부할 수 있습니다. 생애최초 감면은 신고할 때 감면 신청서를 함께 내야 적용됩니다. 기한을 넘기면
        무신고·납부지연 가산세가 붙습니다.
      </p>
      <p>
        잔금일에는 취득세 말고도 중개보수를 함께 정산하는 경우가 많습니다. 5억원 아파트 매매라면 매수인이 내는 복비
        상한이 {koreanWon(maxFeeFor("house", "sale", 5 * EOK))}(부가세 별도)이니{" "}
        <Link href="/brokerage-fee/">복비 계산기</Link>로 미리 확인해 두세요. 주택담보대출을 받는다면 매달 갚을 원리금은{" "}
        <Link href="/loan/">대출 이자 계산기</Link>로 계산해 볼 수 있습니다.
      </p>

      <h2>근거 법령</h2>
      <ul>
        {LAW_LINKS.map((l) => (
          <li key={l.href}>
            <a href={l.href} rel="noopener">
              {l.name}
            </a>{" "}
            {l.detail}
          </li>
        ))}
      </ul>

      <h2>금액별 취득세 바로 보기</h2>
      <nav aria-label="금액별 취득세 페이지" className="link-grid">
        {ACQ_PAGE_MANWON.map((m) => (
          <Link key={m} href={`/acquisition-tax/${m}/`}>
            {priceLabel(m)} 취득세
          </Link>
        ))}
      </nav>
    </ToolShell>
  );
}
