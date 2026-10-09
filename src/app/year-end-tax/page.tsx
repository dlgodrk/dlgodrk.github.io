import type { Metadata } from "next";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatWon } from "@/lib/format";
import { estimatePrepaidTax } from "@/lib/calc/year-end-tax";
import { DEFAULT_FORM, yearEndFromForm } from "@/lib/calc/year-end-tax-ui";
import { YearEndTaxCalculator } from "./YearEndTaxCalculator";
import { SOURCES, YEAR_END_BASIS } from "./sources";

// Worked examples from the same engine as the calculator: 총급여 5,000만원, 본인 1명,
// 신용카드 1,500만원 + 체크카드 500만원, 4대보험과 기납부세액은 2026년 1~12월분 요율·간이세액표 100%로 추정.
const EX = yearEndFromForm(DEFAULT_FORM)!;
const R = EX.result;
const C = R.chosen;
const EX_PS = yearEndFromForm({ ...DEFAULT_FORM, pensionSavings: 6_000_000 })!.result;
const EX_NOCARD = yearEndFromForm({ ...DEFAULT_FORM, credit: 0, debit: 0 })!.result;

// 2017·2018년생 자녀 1명이 간이세액표에서만 공제된 만큼 (총급여 5,000만원, 3인 가족, 지방소득세 포함).
const withheld = (kids: number) => {
  const w = estimatePrepaidTax(50_000_000, 3, kids);
  return w.incomeTax + w.localTax;
};
const TABLE_KID_GAP = withheld(0) - withheld(1);

/** "환급 110,300원" / "추가 납부 12,340원" */
function settleLabel(total: number): string {
  return total < 0 ? `${formatWon(-total)} 환급` : total > 0 ? `${formatWon(total)} 추가 납부` : "환급·추가 납부 없음";
}

const STEPS: { step: string; how: string; value: number }[] = [
  { step: "총급여", how: "비과세 제외 1년 급여", value: R.totalPay },
  { step: "근로소득공제", how: "1,200만원 + 4,500만원 초과분의 5%", value: R.earnedDeduction },
  { step: "근로소득금액", how: "총급여 − 근로소득공제", value: R.earnedIncome },
  { step: "소득공제", how: "기본 150만, 국민연금, 건강·고용보험료, 신용카드 등", value: C.incomeDeductions },
  { step: "과세표준", how: "근로소득금액 − 소득공제", value: C.taxBase },
  { step: "산출세액", how: `기본세율 ${C.marginalRate}% 구간`, value: C.calculatedTax },
  { step: "근로소득세액공제", how: `산출세액 × 55%·30%, 한도 ${formatWon(C.earned.limit)}`, value: C.credits.earned },
  { step: "결정세액", how: "산출세액 − 세액공제", value: C.determinedTax },
  { step: "이미 낸 소득세", how: "간이세액표 100%로 12달 추정", value: R.prepaidIncomeTax },
];

const CHANGES: { item: string; before: string; after: string }[] = [
  {
    item: "자녀세액공제 대상 나이",
    before: "8세 이상 기본공제 자녀",
    after: "9세 이상, 단 2017년생 제외 (2006~2016년생)",
  },
  {
    item: "신용카드 공제 기본한도",
    before: "300만원 (7천만원 초과 250만원)",
    after: "자녀 1명 +50만원, 2명 이상 +100만원 (7천만원 초과 +25만·+50만원)",
  },
  { item: "고향사랑기부금", before: "10만원 초과분 15%", after: "10만원 초과 20만원 이하 40%" },
  { item: "교육비", before: "자녀 소득 100만원 이하만", after: "자녀 소득 요건 폐지, 9세 미만·초2 이하 예체능 학원비 추가" },
  { item: "월세 세액공제", before: "세대주 또는 세대원", after: "주소를 달리하는 배우자도 요건 충족 시 추가 (합계 1,000만원)" },
];

const LIMITS: { item: string; rule: string }[] = [
  {
    item: "신용카드 등",
    rule: "총급여 25% 초과분. 신용 15%, 체크·현금 30%, 전통시장·대중교통 40%, 도서·공연·체육시설 30%(총급여 7천만원 초과면 결제 수단대로). 한도 300만원(자녀 1명당 +50만원, 최대 +100만원)에 전통시장·대중교통·문화 추가 300만원 (총급여 7천만원 이하 기준)",
  },
  { item: "연금저축·IRP", rule: "합산 900만원(연금저축 600만원)까지 15% 또는 12%" },
  { item: "보장성 보험료", rule: "100만원까지 12%" },
  { item: "의료비", rule: "총급여 3% 초과분 15%, 그 밖의 가족 700만원 한도" },
  { item: "교육비", rule: "15%, 자녀 1명당 300만원(대학생 900만원)" },
  {
    item: "월세",
    rule: "무주택 세대의 세대주(세대주가 주택 관련 공제를 받지 않으면 세대원), 총급여 8천만원 이하. 1,000만원까지 15%·17%",
  },
  { item: "주택청약", rule: "무주택 세대주(배우자 포함), 총급여 7천만원 이하. 300만원까지 40% 소득공제" },
  { item: "결혼세액공제", rule: "2024~2026년 혼인신고분, 1회 50만원 (부부 각각). 2026년 혼인신고분이 마지막" },
  { item: "표준세액공제", rule: "특별공제·월세를 받지 않을 때 13만원" },
];

export const metadata: Metadata = pageMetadata({
  title: "연말정산 계산기 2026년 귀속 - 환급액 미리 계산",
  description: `2026년 총급여와 카드 사용액, 연금저축·의료비·월세를 넣으면 2027년 1~2월 연말정산 환급액이나 추가 납부액을 계산합니다. 총급여 5,000만원·카드 2,000만원(1인)이면 약 ${settleLabel(
    R.settleTotal,
  )}입니다.`,
  path: "/year-end-tax/",
  keywords: ["연말정산 계산기", "연말정산 환급금 계산", "2027 연말정산", "2026년 귀속 연말정산", "13월의 월급", "연말정산 미리보기"],
});

const FAQ: FaqItem[] = [
  {
    q: "2026년 귀속 연말정산은 언제 하나요?",
    a: "2026년 1~12월에 받은 급여를 2027년 1~2월에 회사가 정산합니다. 홈택스 간소화 자료는 보통 1월 15일에 열리고, 환급이나 추가 납부는 대개 2월분 급여(늦으면 3월분)에 반영됩니다. 그 전에 11월쯤 열리는 연말정산 미리보기로 1~9월 카드 사용액을 확인할 수 있습니다.",
  },
  {
    q: "공제를 넣었는데 왜 세금을 더 내라고 나오나요?",
    a: "매달 떼는 세금은 간이세액표로 정하는데, 이 표는 일정한 보험료·특별공제가 있다고 보고 만든 것입니다. 부양가족 없이 공제 항목이 적은 1인 가구는 실제 공제가 표의 가정보다 적어 추가 납부가 나오기 쉽습니다. 원천징수 비율을 80%로 낮춰 둔 경우에도 그렇습니다.",
  },
  {
    q: "신용카드는 얼마나 써야 공제받나요?",
    a: `총급여의 25%를 넘게 쓴 금액부터 공제됩니다. 총급여 5,000만원이면 1,250만원을 넘는 부분이 대상이고, 그 기준까지는 공제율 15%인 신용카드부터 채워진 것으로 봅니다. 그래서 기준을 넘긴 뒤에는 체크카드(30%)를 쓰는 편이 유리합니다. 같은 조건에서 카드 2,000만원을 쓰면 카드를 안 쓸 때(${settleLabel(
      EX_NOCARD.settleTotal,
    )})보다 정산 결과가 ${formatWon(EX_NOCARD.settleTotal - R.settleTotal)} 좋아집니다.`,
  },
  {
    q: "연금저축에 넣으면 얼마나 돌려받나요?",
    a: `총급여 5,500만원 이하는 납입액의 15%, 넘으면 12%를 세액에서 뺍니다(연금저축 600만원, IRP 포함 900만원 한도). 이 페이지 예시(총급여 5,000만원, ${settleLabel(
      R.settleTotal,
    )})에 연금저축 600만원을 더하면 정산 결과는 ${settleLabel(EX_PS.settleTotal)}입니다. 지방소득세까지 ${formatWon(
      R.settleTotal - EX_PS.settleTotal,
    )}을 더 돌려받는 셈입니다.`,
  },
  {
    q: "자녀세액공제는 몇 살 자녀부터 받나요?",
    a: "2026년 귀속부터 아동수당 대상이 늘어난 만큼 자녀세액공제 나이도 올라갑니다. 2026년은 9세 이상이 기준이지만 2017년생은 2029년까지 아동수당을 받으므로 빠져서, 실제로는 2006~2016년생 기본공제 자녀가 대상입니다. 금액은 1명 25만원, 2명 55만원, 3명부터 1명당 40만원이 더해집니다. 다만 매달 월급에서 떼는 세금(간이세액표)은 여전히 8세 이상 자녀를 공제하므로, 2017·2018년생 자녀가 있으면 연말정산 환급이 그만큼 줄 수 있습니다.",
  },
  {
    q: "맞벌이 부부는 공제를 어떻게 나누나요?",
    a: "자녀 같은 부양가족은 한 사람만 기본공제를 받을 수 있고, 그 가족의 의료비·교육비도 공제받는 사람이 넣습니다. 보통 세율이 높은 쪽이 인적공제를 받는 것이 유리하지만, 의료비는 총급여의 3%를 넘어야 공제되므로 급여가 적은 쪽으로 모으는 편이 나을 수 있습니다. 신용카드 사용액은 각자 자기 카드 사용분만 공제됩니다.",
  },
];

export default function YearEndTaxPage() {
  return (
    <ToolShell
      slug="year-end-tax"
      h1="연말정산 계산기 (2026년 귀속)"
      lead="2026년 총급여와 카드 사용액, 연금저축·의료비·월세 같은 공제 항목을 넣으면 2027년 초 연말정산에서 돌려받을 세금이나 더 낼 세금을 미리 계산해 드려요."
      basis={YEAR_END_BASIS}
      calculator={<YearEndTaxCalculator />}
      faq={FAQ}
      appCategory="FinanceApplication"
    >
      <h2>연말정산 계산 순서</h2>
      <p>
        연말정산은 1년 동안 매달 간이세액표로 미리 뗀 소득세를 실제 세금과 맞춰 보는 절차입니다. 실제 세금(결정세액)이 이미 낸
        세금보다 적으면 차액을 돌려받고, 많으면 더 냅니다.
      </p>
      <p className="formula">
        총급여 − 근로소득공제 − 소득공제 = 과세표준 → × 기본세율 = 산출세액 → − 세액공제 = 결정세액 → − 기납부세액 = 환급(−)·추가
        납부(+)
      </p>
      <p>
        아래는 총급여 5,000만원, 본인 1명, 신용카드 1,500만원과 체크카드 500만원을 쓴 경우입니다. 4대보험료와 이미 낸 세금은
        2026년 1~12월분 요율과 간이세액표로 추정했습니다. 결과는 지방소득세까지 더해 <strong>{settleLabel(R.settleTotal)}</strong>
        입니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">단계</th>
              <th scope="col" className="text-cell">
                계산
              </th>
              <th scope="col">금액</th>
            </tr>
          </thead>
          <tbody>
            {STEPS.map((s) => (
              <tr key={s.step}>
                <td>{s.step}</td>
                <td className="text-cell">{s.how}</td>
                <td>{formatWon(s.value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        신용카드 공제는 최저사용금액 {formatWon(R.card.threshold)}(총급여 25%)을 넘은 부분에 대해 {formatWon(R.card.total)}이고,
        결정세액 {formatWon(C.determinedTax)}의 10%인 지방소득세 {formatWon(R.determinedLocalTax)}도 함께 정산됩니다.
      </p>

      <h2>2026년 귀속에서 달라진 점</h2>
      <p>
        2025년 말과 2026년 4월에 바뀐 세법 중 이번 연말정산에 처음 반영되는 내용입니다. 자녀세액공제 나이, 신용카드 자녀 한도,
        고향사랑기부금 40%는 계산에 반영했고, 나머지는 공제 금액을 넣을 때 참고하면 됩니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col" className="text-cell">
                항목
              </th>
              <th scope="col" className="text-cell">
                2025년 귀속
              </th>
              <th scope="col" className="text-cell">
                2026년 귀속
              </th>
            </tr>
          </thead>
          <tbody>
            {CHANGES.map((c) => (
              <tr key={c.item}>
                <td className="text-cell">{c.item}</td>
                <td className="text-cell">{c.before}</td>
                <td className="text-cell">{c.after}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        2026년 8월 정부 세제개편안(부양가족 소득 요건 300만원으로 완화, 출산·혼인 세액공제를 재정 지원으로 전환, 월세 공제 한도
        확대 등)은 국회 심의 중이고 대부분 2027년 이후 적용될 예정이라 이 계산에는 넣지 않았습니다. 12월 국회 의결 뒤 다시
        확인하겠습니다.
      </p>

      <h2>주요 공제 한도 한눈에 보기</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">항목</th>
              <th scope="col" className="text-cell">
                공제 방식과 한도
              </th>
            </tr>
          </thead>
          <tbody>
            {LIMITS.map((l) => (
              <tr key={l.item}>
                <td>{l.item}</td>
                <td className="text-cell">{l.rule}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        소득공제는 세율을 곱하기 전의 소득을 줄이므로 실제로 줄어드는 세금은 공제액 × 세율(6~45%)입니다. 세액공제는 계산된
        세금에서 바로 빠집니다. 세액공제가 산출세액보다 많으면 남는 부분은 돌려받지 못하고, 기부금만 10년 동안 이월됩니다.
      </p>

      <h2>계산할 때 주의할 점</h2>
      <ul>
        <li>
          <strong>표준세액공제와 특별공제는 둘 중 하나</strong>입니다. 건강·고용보험료 소득공제, 보험료·의료비·교육비·기부금
          세액공제, 월세 세액공제를 하나도 받지 않을 때만 13만원을 받을 수 있어, 계산기는 두 방식 중 세금이 적은 쪽을 고릅니다.
        </li>
        <li>
          <strong>총급여는 비과세를 뺀 금액</strong>입니다. 식대(월 20만원), 6세 이하 자녀 보육수당(자녀 1명당 월 20만원) 같은
          비과세 급여는 넣지 않습니다. 2026년 원천징수영수증이나 급여명세서의 과세 급여를 더하면 됩니다.
        </li>
        <li>
          <strong>이미 낸 세금은 직접 넣는 것이 가장 정확</strong>합니다. 자동 추정은 매달 같은 급여를 받았다고 보므로 상여가
          있었거나 중간에 입사·이직했다면 차이가 납니다.
        </li>
        <li>
          <strong>2017·2018년생 자녀가 있으면 환급이 줄 수 있습니다</strong>. 매달 떼는 세금(간이세액표)은 8세 이상 20세 이하
          자녀를 공제하지만, 2026년 귀속 자녀세액공제는 2006~2016년생만 대상입니다. 이 자녀는 원천징수 때만 공제를 받은 셈이라
          연말정산에서 그만큼 돌려받는 세금이 줄거나 더 내게 됩니다. 총급여 5,000만원·3인 가족이면 자녀 1명에 1년{" "}
          {formatWon(TABLE_KID_GAP)}(지방소득세 포함) 정도입니다. 계산기에서 2017·2018년생 자녀 수를 넣으면 반영됩니다.
        </li>
        <li>
          <strong>총급여 7천만원을 넘으면 도서·공연·체육시설 사용액을 따로 나누지 않습니다</strong>. 결제 수단에 따라
          신용카드(15%)나 체크카드·현금영수증(30%) 금액에 넣어 계산합니다.
        </li>
        <li>
          연말정산 뒤에 빠뜨린 공제를 알았다면 5월 종합소득세 신고 때 더하거나, 5년 안에 경정청구로 돌려받을 수 있습니다.
        </li>
      </ul>

      <h2>근거 법령과 확인처</h2>
      <ul>
        {SOURCES.map((src) => (
          <li key={src.url}>
            <a href={src.url} target="_blank" rel="noopener noreferrer">
              {src.name}
            </a>
          </li>
        ))}
      </ul>
      <p className="note">
        자녀세액공제 나이는 소득세법 제59조의2(법률 제21548호, 2026. 4. 21.) 부칙의 연도별 특례, 신용카드 자녀 한도와
        고향사랑기부금 40%는 2025. 12. 23. 개정 조세특례제한법(2026년 사용·기부분부터)을 따랐습니다. 이 계산기는 간이 예상이며
        정치자금기부금, 주택자금 차입금, 중소기업 취업자 감면 같은 항목은 넣지 않았습니다.
      </p>
    </ToolShell>
  );
}
