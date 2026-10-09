import type { Metadata } from "next";
import Link from "next/link";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber, formatPercent, formatWon } from "@/lib/format";
import { isLeapYear } from "@/lib/date";
import { RULE_YEAR } from "@/lib/site";
import {
  ageTable,
  CAR_TAX_BASIS,
  CAR_TAX_PAGE_CC,
  ccClass,
  computeCarTax,
  PREPAY_MONTHS,
  PREPAY_RATE_PCT,
  PREPAY_WINDOW,
  prepay,
  remainingDays,
  type PrepayMonth,
} from "@/lib/calc/car-tax";
import { CarTaxCalculator } from "./CarTaxCalculator";

const Y = RULE_YEAR;
const DAYS = isLeapYear(Y) ? 366 : 365;

/** 신차 기준 = 차령 2년 이하(경감 0%)로 1년 내내 보유. 올해 등록한 차는 일할이라 전년도 1월 등록으로 계산한다. */
const newCar = (cc: number) => computeCarTax({ kind: "private", cc, regYear: Y - 1, regMonth: 1, taxYear: Y });
const NEW_1999 = newCar(1999);
const NEW_1598 = newCar(1598);
const LIGHT = newCar(998);
const EV = computeCarTax({ kind: "electric", cc: 0, regYear: Y - 1, regMonth: 1, taxYear: Y });
const EV_BIZ = computeCarTax({ kind: "electricBusiness", cc: 0, regYear: Y - 1, regMonth: 1, taxYear: Y });
/** Worked example: 1,999cc first registered in March four years before → 차령 5년. */
const EX_REG = Y - 4;
const EX = computeCarTax({ kind: "private", cc: 1999, regYear: EX_REG, regMonth: 3, taxYear: Y });
const EX_JAN = prepay(EX, 1);
/** Worked example: 1,999cc first registered on 8월 16일 this year → 제1기분 없음, 제2기분 일할. */
const NEW_REG = computeCarTax({ kind: "private", cc: 1999, regYear: Y, regMonth: 8, regDay: 16, taxYear: Y });

/** Nominal discount as a share of the annual bill (equal halves). */
function nominalRate(m: PrepayMonth): number {
  const r = PREPAY_RATE_PCT / 100;
  if (m === 1 || m === 3) return (remainingDays(Y, m) / DAYS) * r;
  if (m === 6) return r / 2;
  return (92 / 184) * (r / 2);
}

const PREPAY_FORMULA: Record<PrepayMonth, string> = {
  1: `연세액 × ${remainingDays(Y, 1)}/${DAYS} × 5%`,
  3: `연세액 × ${remainingDays(Y, 3)}/${DAYS} × 5%`,
  6: "하반기분 × 5%",
  9: "하반기분 × 92/184 × 5%",
};

export const metadata: Metadata = pageMetadata({
  title: `자동차세 계산기 - ${Y} 배기량별 세액·연납 할인`,
  description: `배기량과 최초 등록일로 ${Y}년 자동차세와 지방교육세, 차령 경감, 연납 할인액을 계산합니다. 1,999cc(2.0L급) 신차는 연 ${formatWon(NEW_1999.total)}, 1월에 연납하면 약 ${formatPercent(nominalRate(1))}를 덜 냅니다.`,
  path: "/car-tax/",
  keywords: [
    "자동차세 계산기",
    "자동차세 연납",
    "자동차세 연납 할인",
    "배기량별 자동차세",
    "차령 경감",
    "전기차 자동차세",
    `${Y} 자동차세`,
  ],
});

const FAQ: FaqItem[] = [
  {
    q: "자동차세 연납은 언제 신청하고 얼마나 할인되나요?",
    a: `1월 16~31일, 3월 16~31일, 6월 16~30일, 9월 16~30일에 위택스(서울은 ETAX)나 시·군·구청 세무부서에서 신청합니다. ${Y}년 이자율 5%를 남은 기간 세액에 적용해 1월은 연세액의 약 ${formatPercent(nominalRate(1))}, 3월 약 ${formatPercent(nominalRate(3))}, 6월 ${formatPercent(nominalRate(6))}, 9월 ${formatPercent(nominalRate(9))}가 줄어듭니다.`,
  },
  {
    q: "차령 경감은 몇 년차부터 받나요?",
    a: `비영업용 승용차는 차령 3년차부터 해마다 5%씩, 12년차 이후 최대 50%까지 줄어듭니다. 1~6월에 등록한 차는 ‘과세연도 − 등록연도 + 1’로 차령을 세므로 ${Y - 2}년 3월에 등록했다면 ${Y}년에 3년차라 5%가 줄어듭니다. 7~12월에 등록한 차는 하반기분부터 경감률이 오릅니다.`,
  },
  {
    q: "전기차 자동차세는 얼마인가요?",
    a: `전기·수소차는 ‘그 밖의 승용자동차’라 배기량과 관계없이 비영업용 연 10만원이고, 지방교육세 3만원을 더해 ${formatWon(EV.total)}입니다. 택시·렌터카 같은 영업용 전기·수소차는 연 ${formatWon(EV_BIZ.total)}이고 지방교육세가 없습니다. 차령 경감은 배기량으로 세금을 매기는 승용차에만 있어 오래 타도 금액이 같습니다.`,
  },
  {
    q: "경차 자동차세는 왜 6월에 한 번만 나오나요?",
    a: `연 자동차세가 10만원 이하이면 6월(제1기분)에 1년치를 한꺼번에 부과할 수 있고, 이때 하반기분 세액의 5%를 빼 줍니다(지방세법 제128조 제4항). 998cc 경차는 자동차세 ${formatWon(LIGHT.carTax)}, 지방교육세를 더해 ${formatWon(LIGHT.total)}이고 6월에 ${formatWon(LIGHT.june)}이 고지됩니다.`,
  },
  {
    q: "신차를 사거나 차를 팔면 자동차세는 어떻게 되나요?",
    a: `자동차세는 소유한 날짜만큼 나눠(일할) 계산합니다. 새로 등록한 차는 첫 기분(등록일부터 6월 30일 또는 12월 31일까지)만 ‘연세액 × 보유 일수 ÷ ${DAYS}’로 계산하고, 7월 이후에 등록했다면 6월분은 없습니다. 연중에 이전등록이나 말소등록을 하면 그날까지만 부담하고, 미리 연납했다면 남은 기간의 세액을 돌려받습니다.`,
  },
  {
    q: "하이브리드 자동차세는 어떻게 계산하나요?",
    a: `하이브리드차는 엔진 배기량으로 일반 승용차와 똑같이 계산합니다. 1,598cc 하이브리드는 cc당 140원이 적용돼 신차 기준 지방교육세 포함 연 약 ${formatNumber(Math.round(NEW_1598.total / 10_000))}만원입니다.`,
  },
];

export default function CarTaxPage() {
  const ages = ageTable("private", 1999, Y);
  return (
    <ToolShell
      slug="car-tax"
      h1="자동차세 계산기 (연납 할인·차령 경감)"
      lead={`배기량과 최초 등록 연월을 넣으면 ${Y}년 자동차세와 지방교육세, 6월·12월 고지액, 연납하면 아끼는 금액까지 계산해 드려요.`}
      basis={CAR_TAX_BASIS}
      calculator={<CarTaxCalculator />}
      faq={FAQ}
      appCategory="FinanceApplication"
    >
      <h2>자동차세 계산 방법</h2>
      <p>
        승용차 자동차세는 배기량에 cc당 세액을 곱한 금액이 1년 세액입니다. 비영업용(자가용) 승용차는 차령 3년차부터 해마다 5%씩
        줄고, 여기에 자동차세의 30%인 지방교육세가 붙습니다. 1년 세액은 반으로 나눠 6월과 12월에 고지됩니다.
      </p>
      <p className="formula">
        자동차세 = 배기량 × cc당 세액 × (1 − 차령 경감률) &nbsp;|&nbsp; 지방교육세 = 자동차세 × 30%
      </p>
      <p>
        예를 들어 {EX_REG}년 3월에 처음 등록한 1,999cc 자가용은 {Y}년 차령이 5년이라 15%가 줄어듭니다. 1,999cc × 200원 ={" "}
        {formatWon(EX.baseAnnual)}에서 경감 후 자동차세 {formatWon(EX.carTax)}, 지방교육세 {formatWon(EX.eduTax)}로 연{" "}
        <strong>{formatWon(EX.total)}</strong>이고, 6월과 12월에 {formatWon(EX.june)}씩 냅니다. 1월에 연납했다면{" "}
        {formatWon(EX_JAN.deduction)}을 아껴 {formatWon(EX_JAN.annualPay)}만 냅니다.
      </p>

      <h2>배기량별 cc당 세액</h2>
      <div className="table-wrap">
        <table className="data-table">
          <caption>지방세법 제127조 제1항 (연세액 기준)</caption>
          <thead>
            <tr>
              <th scope="col">배기량</th>
              <th scope="col">비영업용</th>
              <th scope="col">영업용</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1,000cc 이하</td>
              <td>80원</td>
              <td>18원</td>
            </tr>
            <tr>
              <td>1,600cc 이하</td>
              <td>140원</td>
              <td>18원</td>
            </tr>
            <tr>
              <td>2,500cc 이하</td>
              <td>200원</td>
              <td>19원</td>
            </tr>
            <tr>
              <td>2,500cc 초과</td>
              <td>200원</td>
              <td>24원</td>
            </tr>
            <tr>
              <td>전기·수소 등</td>
              <td>연 100,000원</td>
              <td>연 20,000원</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="note">
        비영업용은 1,600cc를 넘으면 모두 cc당 200원입니다. 지방교육세는 비영업용에만 붙고, 영업용(택시·렌터카 등)은 차령 경감도
        없습니다.
      </p>

      <h2>차령 경감표 ({Y}년)</h2>
      <p>
        차령은 최초 등록일을 기준으로 셉니다. 다만 제작연도보다 늦은 해에 처음 등록한 차는 제작연도 12월 31일부터 셉니다. 1~6월에
        등록한 차는 ‘과세연도 − 등록연도 + 1’이고, 7~12월에 등록한 차는 상반기분은 1년 적게, 하반기분은 같은 식으로 셉니다. 경감은
        배기량으로 세금을 매기는 비영업용 승용차에만 있습니다. {Y}년에 처음 등록한 차(차령 1년)는 등록일부터 날짜 수만큼 일할
        계산하므로 아래 표에서 뺐습니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">차령</th>
              <th scope="col">최초 등록(1~6월)</th>
              <th scope="col">경감률</th>
              <th scope="col">1,999cc 연 합계</th>
            </tr>
          </thead>
          <tbody>
            {ages.map((row) => (
              <tr key={row.age}>
                <td>{row.age === 12 ? "12년 이상" : `${row.age}년`}</td>
                <td>{row.age === 12 ? `${row.regYear}년 이전` : `${row.regYear}년`}</td>
                <td>{row.reductionPct}%</td>
                <td>{formatWon(row.result.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>{Y}년 연납 할인</h2>
      <p>
        1년치를 미리 한꺼번에 내면 남은 기간에 해당하는 세액에 이자율 {PREPAY_RATE_PCT}%를 적용한 금액을 빼 줍니다(지방세법
        제128조 제3항). 이자율은 2022년까지 10%였다가 2023년 7%, 2024년 5%로 낮아졌고 2025년과 {Y}년에도 5%가 유지됐습니다.
        지방교육세도 줄어든 자동차세의 30%로 다시 계산되므로 할인은 합계 금액 전체에 적용됩니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">신청 월</th>
              <th scope="col">신청·납부 기간</th>
              <th scope="col" className="text-cell">
                공제 계산
              </th>
              <th scope="col">연세액 대비</th>
              <th scope="col">1,999cc 신차</th>
            </tr>
          </thead>
          <tbody>
            {PREPAY_MONTHS.map((m) => (
              <tr key={m}>
                <td>{m}월</td>
                <td>{PREPAY_WINDOW[m]}</td>
                <td className="text-cell">{PREPAY_FORMULA[m]}</td>
                <td>약 {formatPercent(nominalRate(m))}</td>
                <td>−{formatWon(prepay(NEW_1999, m).deduction)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        1월·3월에 연납하면 6월·12월 고지서가 나오지 않습니다. 6월·9월 연납은 아직 내지 않은 하반기분만 할인됩니다. 올해 등록한
        차는 등록한 뒤에 오는 신청 기간에만 연납할 수 있습니다. 연납한 뒤 차를 팔거나 폐차하면 남은 기간 세액을 돌려받습니다.
      </p>

      <h2>납부 시기와 10만원 이하 일괄 고지</h2>
      <ul>
        <li>
          <strong>정기 고지</strong>: 1년 세액을 반씩 나눠 6월 16~30일(1~6월분)과 12월 16~31일(7~12월분)에 냅니다. 각각 그달 1일
          현재 등록원부상 소유자에게 고지됩니다.
        </li>
        <li>
          <strong>10만원 이하</strong>: 연 자동차세(지방교육세 제외)가 10만원 이하이면 6월에 1년치를 한꺼번에 고지할 수 있고, 이때
          하반기분의 5%를 빼 줍니다. 998cc 경차({formatWon(LIGHT.carTax)})와 전기·수소차(100,000원)가 대표적이며, 이런 차는
          1월이나 3월에 연납해야 추가로 아낄 수 있습니다.
        </li>
        <li>
          <strong>분할 납부</strong>: 신청하면 연세액을 4분의 1씩 3월·6월·9월·12월에 나눠 낼 수 있습니다.
        </li>
        <li>
          <strong>새로 등록할 때</strong>: 등록일부터 그 기분 말일까지 ‘연세액 × 보유 일수 ÷ {DAYS}’로 일할 계산합니다.
          예를 들어 {Y}년 8월 16일에 등록한 1,999cc 차는 6월분이 없고, 12월 31일까지 {NEW_REG.halves[1].days}일분인
          자동차세 {formatWon(NEW_REG.carTax)}에 지방교육세 {formatWon(NEW_REG.eduTax)}를 더해 {formatWon(NEW_REG.total)}을
          냅니다.
        </li>
        <li>
          <strong>사고팔 때</strong>: 연중에 이전·말소등록을 하면 소유 기간만큼 날짜로 나눠 계산합니다.
        </li>
      </ul>

      <h2>배기량별 자동차세 ({Y}년 신차 기준)</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">배기량</th>
              <th scope="col" className="text-cell">
                흔한 차급
              </th>
              <th scope="col">자동차세</th>
              <th scope="col">지방교육세</th>
              <th scope="col">연 합계</th>
            </tr>
          </thead>
          <tbody>
            {CAR_TAX_PAGE_CC.map((cc) => {
              const r = newCar(cc);
              return (
                <tr key={cc}>
                  <td>
                    <Link href={`/car-tax/${cc}/`}>{formatNumber(cc)}cc</Link>
                  </td>
                  <td className="text-cell">{ccClass(cc)}</td>
                  <td>{formatWon(r.carTax)}</td>
                  <td>{formatWon(r.eduTax)}</td>
                  <td>{formatWon(r.total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="note">
        차령 2년 이하인 비영업용 승용차를 1년 내내 보유했을 때 금액입니다. 올해 처음 등록한 차는 등록일부터 일할 계산해 첫해에는
        이보다 적게 냅니다.
      </p>

      <h2>근거 법령과 확인처</h2>
      <ul>
        <li>
          <a href="https://www.law.go.kr/법령/지방세법/제127조" rel="noopener">
            지방세법 제127조
          </a>
          (cc당 세액·차령 경감),{" "}
          <a href="https://www.law.go.kr/법령/지방세법/제128조" rel="noopener">
            제128조
          </a>
          (납기·연납 공제·10만원 이하 일괄 부과),{" "}
          <a href="https://www.law.go.kr/법령/지방세법/제151조" rel="noopener">
            제151조
          </a>
          (지방교육세 30%)
        </li>
        <li>
          <a href="https://www.law.go.kr/법령/지방세법시행령/제122조" rel="noopener">
            지방세법 시행령 제122조
          </a>
          (차령 계산),{" "}
          <a href="https://www.law.go.kr/법령/지방세법시행령/제125조" rel="noopener">
            제125조
          </a>
          (연납 이자율 5%),{" "}
          <a href="https://www.law.go.kr/법령/지방세법시행령/제126조" rel="noopener">
            제126조
          </a>
          (일할 계산)
        </li>
        <li>
          <a href="https://www.wetax.go.kr/" rel="noopener">
            위택스
          </a>
          : 내 차의 고지 세액 조회와 연납 신청(서울은 ETAX)
        </li>
      </ul>
      <p className="note">
        계산은 6월분·12월분마다 10원 미만을 버린 추정치입니다. 장애인·국가유공자 차량 감면은 반영하지 않고, 올해 등록한 차의 일할
        계산은 비영업용 승용차만 합니다. 정확한 금액은 고지서나 위택스에서 확인하세요.
      </p>

      <h2>배기량별 자동차세 바로 보기</h2>
      <nav aria-label="배기량별 자동차세 페이지" className="link-grid">
        {CAR_TAX_PAGE_CC.map((cc) => (
          <Link key={cc} href={`/car-tax/${cc}/`}>
            {formatNumber(cc)}cc 자동차세
          </Link>
        ))}
      </nav>
    </ToolShell>
  );
}
