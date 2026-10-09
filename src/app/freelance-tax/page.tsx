import type { Metadata } from "next";
import Link from "next/link";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatWon, manwonLabel } from "@/lib/format";
import {
  bizWithholding,
  DAILY_DEDUCTION,
  DAILY_NTS_EXAMPLE_WAGE,
  dailyWithholding,
  FREELANCE_PAGE_MANWON,
  grossForNet,
  OTHER_THRESHOLD_PAYMENT,
  otherWithholding,
  PROPOSED_BIZ_RATE_PERCENT_2027,
} from "@/lib/calc/freelance-tax";
import { FreelanceTaxCalculator } from "./FreelanceTaxCalculator";
import { FREELANCE_BASIS, LawLinks } from "./shared";

const ONE_MILLION = bizWithholding(1_000_000);
const ONE_MILLION_2027 = bizWithholding(1_000_000, PROPOSED_BIZ_RATE_PERCENT_2027);
// 국세청 예시 "일 급여액 187,000원: 999원" — 10원 절사 전 세액 (37,000 × 2.7% = 999, exact in integers).
const NTS_EXAMPLE_TAX = ((DAILY_NTS_EXAMPLE_WAGE - DAILY_DEDUCTION) * 27) / 1000;

export const metadata: Metadata = pageMetadata({
  title: "3.3% 계산기 - 프리랜서 세금·실수령액 역산 (8.8%·일용직)",
  description: `프리랜서·알바 3.3% 세금을 2026년 기준으로 바로 계산합니다. 100만원이면 소득세 3만원과 지방소득세 3천원을 떼고 ${formatWon(ONE_MILLION.net)}을 받습니다. 실수령액으로 세전 금액 역산, 강연료·원고료 8.8%, 일용직 세금까지 확인하세요.`,
  path: "/freelance-tax/",
  keywords: [
    "3.3% 계산기",
    "3.3 계산기",
    "프리랜서 세금 계산기",
    "3.3% 실수령액",
    "3.3% 역산",
    "8.8% 계산기",
    "기타소득 세금 계산",
    "일용직 세금 계산",
  ],
});

export default function FreelanceTaxPage() {
  // 2026년 최저시급 10,320원 × 209시간 = 2,156,880원
  const minMonthly = 2_156_880;
  const exMin = bizWithholding(minMonthly);
  const small = bizWithholding(30_000);
  const rev = grossForNet("biz", 1_000_000);
  const revOther = grossForNet("other", 1_000_000);
  const naive = Math.round(1_000_000 / 0.967);
  const naiveNet = bizWithholding(naive).net;
  const lecture = otherWithholding(1_000_000);
  const justOver = otherWithholding(OTHER_THRESHOLD_PAYMENT + 1);
  const daily20 = dailyWithholding(200_000);
  const daily16x4 = dailyWithholding(160_000, 4);

  const faq: FaqItem[] = [
    {
      q: "100만원에서 3.3% 떼면 얼마 받나요?",
      a: `소득세 ${formatWon(ONE_MILLION.incomeTax)}과 지방소득세 ${formatWon(ONE_MILLION.localTax)}, 합계 ${formatWon(ONE_MILLION.total)}을 떼고 ${formatWon(ONE_MILLION.net)}을 받습니다. 다른 금액도 대략 지급액 × 0.967이 실수령액이며, 두 세금은 각각 10원 미만을 버립니다.`,
    },
    {
      q: "실수령 100만원을 받으려면 세전 얼마로 계약해야 하나요?",
      a: `3.3% 기준 세전 ${formatWon(rev.gross)}입니다. 여기서 소득세 ${formatWon(rev.result.incomeTax)}과 지방소득세 ${formatWon(rev.result.localTax)}을 떼면 정확히 1,000,000원이 남습니다. 8.8% 기타소득이라면 세전 ${formatWon(revOther.gross)}이 필요합니다.`,
    },
    {
      q: "3.3%와 8.8%는 무엇이 다른가요?",
      a: `3.3%는 같은 일을 계속·반복해서 하고 받는 사업소득, 8.8%는 강연이나 원고처럼 한두 번 하고 받는 기타소득에서 뗍니다. 8.8%는 받은 돈의 60%를 경비로 인정하고 나머지 40%에 22%를 매긴 결과라서, 한 건이 ${formatWon(OTHER_THRESHOLD_PAYMENT)} 이하면 세금이 없습니다.`,
    },
    {
      q: "3.3% 떼인 세금은 돌려받을 수 있나요?",
      a: "다음 해 5월 종합소득세 신고 때 1년 소득으로 세금을 다시 계산해서, 미리 뗀 세금이 더 많으면 차액을 돌려받습니다. 소득이 적거나 경비가 많으면 대부분 환급받는 경우가 많습니다. 신고하지 않으면 자동으로 돌려주지 않으니, 기한을 놓쳤다면 기한 후 신고로 환급을 신청하세요.",
    },
    {
      q: "일용직은 일당이 얼마부터 세금을 떼나요?",
      a: `하루 15만원까지는 세금이 없고, 넘는 금액의 2.7%가 소득세입니다. 하루 치 소득세가 1,000원 미만이면 떼지 않아서 일당 약 18만 7천원까지는 0원입니다(국세청 예시: 일당 ${formatWon(DAILY_NTS_EXAMPLE_WAGE)} → 소득세 ${formatWon(NTS_EXAMPLE_TAX)}). 여러 날 치를 한 번에 받으면 합친 세액으로 1,000원 미만인지 따집니다.`,
    },
    {
      q: "2027년부터 3.3%가 2.2%로 바뀌나요?",
      a: `정부 세제개편안에 2027년 1월 1일 지급분부터 2.2%로 낮추는 내용이 있지만, 2026년 10월 현재 국회 심의 중이라 확정되지 않았습니다. 확정되면 100만원 기준 실수령액이 ${formatWon(ONE_MILLION_2027.net)}으로 ${formatWon(ONE_MILLION_2027.net - ONE_MILLION.net)} 늘고, 그만큼 5월 환급액은 줄어듭니다.`,
    },
  ];

  return (
    <ToolShell
      slug="freelance-tax"
      h1="3.3% 세금 계산기 (프리랜서·알바 실수령액)"
      lead={`3.3%는 소득세 3%와 지방소득세 0.3%로, 100만원을 받으면 ${formatWon(ONE_MILLION.total)}을 떼고 ${formatWon(ONE_MILLION.net)}이 들어와요. 실수령액으로 세전 금액을 역산하고, 강연료·원고료 8.8%와 일용직 세금도 계산해 드려요.`}
      basis={FREELANCE_BASIS}
      calculator={<FreelanceTaxCalculator />}
      faq={faq}
      appCategory="FinanceApplication"
    >
      <h2>3.3% 세금 계산 방법</h2>
      <p>
        프리랜서나 3.3%로 처리되는 알바가 받는 돈은 사업소득입니다. 돈을 주는 쪽이 지급할 때 소득세 3%(소득세법 제129조 제1항
        제3호)와 그 10%인 지방소득세를 미리 떼어 대신 내고(원천징수) 나머지를 줍니다. 두 세금은 각각 10원 미만을 버립니다(국고금
        관리법 제47조).
      </p>
      <p className="formula">
        소득세 = 지급액 × 3% &nbsp;|&nbsp; 지방소득세 = 소득세 × 10% &nbsp;|&nbsp; 실수령액 = 지급액 − 두 세금
      </p>
      <p>
        예를 들어 2026년 최저시급으로 주 40시간 일한 한 달 치 {formatWon(minMonthly)}을 3.3%로 받으면 소득세는{" "}
        {formatWon(Math.floor((minMonthly * 3) / 100))}에서 10원 미만을 버린 <strong>{formatWon(exMin.incomeTax)}</strong>, 지방소득세는 {formatWon(exMin.localTax)}이고 실수령액은{" "}
        <strong>{formatWon(exMin.net)}</strong>입니다. 2024년 7월 지급분부터는 계속·반복적으로 일하고 받는 인적용역 사업소득에
        ‘1,000원 미만 소액부징수’가 적용되지 않아(소득세법 제86조 제1호), 3만원처럼 적은 금액도 {formatWon(small.total)}을 뗍니다.
      </p>

      <h2>실수령액으로 세전 금액 역산하기</h2>
      <p>
        받고 싶은 실수령액을 0.967로 나누면 대략의 세전 금액이 나옵니다. 하지만 10원 미만을 버리는 계산 때문에 나눗셈 결과가 몇 원씩
        어긋나므로, 계산기는 실제로 세금을 떼 보면서 딱 맞는 금액을 찾습니다. 실수령 100만원을 받으려면 세전{" "}
        <strong>{formatWon(rev.gross)}</strong>으로 계약하면 되고 이때 세금은 {formatWon(rev.result.total)}입니다. 1,000,000 ÷ 0.967을
        반올림한 {formatWon(naive)}으로 계약하면 {formatWon(naiveNet - 1_000_000)}이 더 들어옵니다.
      </p>

      <h2>금액별 3.3% 실수령액 표</h2>
      <p>자주 찾는 금액을 3.3% 사업소득과 8.8% 기타소득으로 받을 때의 실수령액입니다. 금액을 누르면 자세한 계산을 볼 수 있어요.</p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">지급액</th>
              <th scope="col">3.3% 세금</th>
              <th scope="col">3.3% 실수령</th>
              <th scope="col">8.8% 실수령</th>
            </tr>
          </thead>
          <tbody>
            {FREELANCE_PAGE_MANWON.map((m) => {
              const b = bizWithholding(m * 10_000);
              const o = otherWithholding(m * 10_000);
              return (
                <tr key={m}>
                  <td>
                    <Link href={`/freelance-tax/${m}/`}>{manwonLabel(m)}</Link>
                  </td>
                  <td>{formatWon(b.total)}</td>
                  <td>{formatWon(b.net)}</td>
                  <td>
                    {formatWon(o.net)}
                    {o.exempt === "threshold" ? " (과세최저한)" : ""}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>8.8% 기타소득 (강연료·원고료)</h2>
      <p>
        고용 관계 없이 어쩌다 한 번 강연을 하거나 원고를 써 주고 받는 돈은 기타소득입니다(소득세법 제21조 제1항 제15호·제19호). 받은
        금액의 60%를 필요경비로 인정하므로(소득세법 시행령 제87조) 나머지 40%가 기타소득금액이 되고, 여기에 소득세 20%(제129조 제1항
        제6호)와 지방소득세 2%를 매겨 결국 지급액의 8.8%를 뗍니다.
      </p>
      <p className="formula">세금 = 지급액 × 40% × 22% = 지급액 × 8.8%</p>
      <ul>
        <li>
          강연료 100만원: 기타소득금액 {formatWon(lecture.taxBase)}, 소득세 {formatWon(lecture.incomeTax)}, 지방소득세{" "}
          {formatWon(lecture.localTax)}, 실수령 <strong>{formatWon(lecture.net)}</strong>
        </li>
        <li>
          과세최저한: 한 건의 기타소득금액이 5만원 이하면 세금을 매기지 않습니다(제84조). 필요경비 60%라면 지급액{" "}
          {formatWon(OTHER_THRESHOLD_PAYMENT)} 이하가 여기에 해당하고, {formatWon(OTHER_THRESHOLD_PAYMENT + 1)}부터는{" "}
          {formatWon(justOver.total)}을 뗍니다.
        </li>
        <li>
          1년 기타소득금액이 300만원(필요경비 60%면 지급액 750만원) 이하면 8.8%로 끝내는 분리과세와 5월 합산 신고 중 유리한 쪽을 고를
          수 있습니다.
        </li>
        <li>상금처럼 경비율이 다른 기타소득도 있으니, 이 계산은 강연료·원고료·일시적 용역 대가를 기준으로 보세요.</li>
      </ul>

      <h2>일용직 세금 계산</h2>
      <p>
        같은 사업장에서 3개월 미만(건설공사는 1년 미만) 일하고 일당을 받는 일용근로자는 하루 15만원을 근로소득공제로 빼고(소득세법
        제47조 제2항) 나머지에 6%를 곱한 다음, 그 세액의 55%를 근로소득세액공제로 다시 뺍니다(제129조, 제59조 제3항). 결국 15만원을
        넘는 금액의 2.7%가 소득세입니다.
      </p>
      <p className="formula">소득세 = (일당 − 150,000원) × 6% × (1 − 55%) = (일당 − 150,000원) × 2.7%</p>
      <p>
        일당 20만원이면 소득세 {formatWon(daily20.incomeTax)}과 지방소득세 {formatWon(daily20.localTax)}을 떼고{" "}
        {formatWon(daily20.net)}을 받습니다. 원천징수할 소득세가 1,000원 미만이면 떼지 않으므로(제86조) 하루 치로 받을 때 일당 약
        18만 7천원까지는 세금이 0원입니다. 국세청 안내의 예시로는 일당 {formatWon(DAILY_NTS_EXAMPLE_WAGE)}이면 소득세가{" "}
        {formatWon(NTS_EXAMPLE_TAX)}이라 떼지 않습니다. 여러 날 치를 한 번에 받으면 날마다 계산한 세액을 합쳐서 따지므로,
        일당 16만원 4일 치를 한꺼번에 받으면 {formatWon(daily16x4.incomeTax)}을 뗍니다. 일용근로소득은 원천징수로 납세가 끝나서 5월
        종합소득세 신고에 넣지 않습니다.
      </p>

      <h2>3.3%, 8.8%, 근로소득은 어떻게 나뉘나</h2>
      <ul>
        <li>
          <strong>사업소득 3.3%</strong>: 고용 관계 없이 독립적으로 같은 일을 계속·반복해서 하고 받는 대가입니다. 프리랜서
          디자이너·개발자, 학원 강사, 배달 라이더 등이 해당합니다.
        </li>
        <li>
          <strong>기타소득 8.8%</strong>: 같은 종류의 일을 일시적으로 하고 받는 대가입니다. 외부 특강 한 번, 심사나 자문 한 번,
          원고 한 편 같은 경우입니다.
        </li>
        <li>
          <strong>근로소득</strong>: 회사의 지휘·감독을 받으며 정해진 시간과 장소에서 일하는 경우입니다. 계약서에 3.3%라고
          적혀 있어도 실제로 근로자라면 최저임금, 주휴수당, 퇴직금 같은 권리가 인정됩니다. 시급제라면{" "}
          <Link href="/hourly-wage/">시급·주휴수당 계산기</Link>, 월급제라면 <Link href="/salary/">연봉 실수령액 계산기</Link>로
          4대보험을 뗀 금액과 비교해 보세요.
        </li>
      </ul>

      <h2>5월 종합소득세 신고와 환급</h2>
      <p>
        3.3%는 미리 떼는 세금일 뿐 최종 세금이 아닙니다. 사업소득이 있으면 다음 해 5월 1일부터 31일까지 종합소득세를 신고해 1년
        소득에서 필요경비와 공제를 뺀 실제 세금을 계산하고, 미리 낸 3.3%가 더 많으면 차액을 돌려받습니다. 1년 소득이 적고 다른 소득이
        없다면 기본공제(본인 150만원) 등으로 실제 세금이 크게 줄어 떼인 세금 대부분을 환급받는 경우가 많습니다. 2026년에 받은 소득은
        2027년 5월에 홈택스나 손택스에서 신고합니다.
      </p>

      <h2>2027년 3.3% → 2.2% 인하안</h2>
      <p>
        정부가 2026년 8월 발표한 세제개편안에는 인적용역 사업소득의 원천징수세율을 3%에서 2%로 낮추는 내용이 들어 있습니다.
        지방소득세까지 합치면 3.3%가 2.2%가 되어, 100만원을 받을 때 실수령액이 {formatWon(ONE_MILLION.net)}에서{" "}
        {formatWon(ONE_MILLION_2027.net)}으로 늘어납니다. 2027년 1월 1일 이후 지급분부터 적용할 예정이지만 2026년 10월 현재 국회
        심의 중이라 확정되지 않았고, 보험설계사처럼 연말정산하는 사업소득은 대상에서 빠집니다. 원천징수율이 낮아져도 1년 세금 자체가
        줄지는 않으므로 5월 환급액이 그만큼 줄거나 추가로 낼 세금이 생길 수 있습니다. 이 계산기는 확정된 현행 3.3%로 계산하고, 인하안
        금액은 참고로만 보여 드립니다.
      </p>

      <h2>근거 법령</h2>
      <LawLinks />

      <h2>금액별 3.3% 세금 바로 보기</h2>
      <nav aria-label="금액별 3.3% 세금 페이지" className="link-grid">
        {FREELANCE_PAGE_MANWON.map((m) => (
          <Link key={m} href={`/freelance-tax/${m}/`}>
            {manwonLabel(m)} 3.3%
          </Link>
        ))}
      </nav>
    </ToolShell>
  );
}
