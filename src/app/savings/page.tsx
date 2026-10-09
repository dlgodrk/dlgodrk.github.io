import type { Metadata } from "next";
import Link from "next/link";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber, formatWon, koreanWon } from "@/lib/format";
import { RULE_YEAR } from "@/lib/site";
import {
  calcSavings,
  depositInterest,
  interestTax,
  periodLabel,
  SAVINGS_PAGE_MONTHLY,
  savingsInterest,
} from "@/lib/calc/savings";
import { SavingsCalculator } from "./SavingsCalculator";

// Worked example used throughout the page: 월 50만원 · 1년 · 연 4% · 단리 · 일반과세
const EX_MONTHLY = 500_000;
const EX_RATE = 4;
const ex = calcSavings({ monthly: EX_MONTHLY, months: 12, ratePct: EX_RATE });
const exDeposit = depositInterest(ex.principal, 12, EX_RATE);
const exDepositTax = interestTax(exDeposit, "general").total;
// 조합 예탁금 3천만원 한도를 넘는 예: 월 200만원 · 3년 · 연 4% (1~15회차만 1.4%)
const agriEx = calcSavings({ monthly: 2_000_000, months: 36, ratePct: EX_RATE, taxType: "agri" });
// 같은 월 50만원 · 1년 · 연 4% 적금을 조합 예탁금으로 넣을 때 가입 시기·대상별 세금
const exAgri = calcSavings({ monthly: EX_MONTHLY, months: 12, ratePct: EX_RATE, taxType: "agri" });
const exAgri2026 = calcSavings({ monthly: EX_MONTHLY, months: 12, ratePct: EX_RATE, taxType: "agri2026" });
const exAgri2027 = calcSavings({ monthly: EX_MONTHLY, months: 12, ratePct: EX_RATE, taxType: "agri2027" });

export const metadata: Metadata = pageMetadata({
  title: "적금 이자 계산기 - 세후 만기 수령액 (단리·월복리)",
  description: `월 납입액, 기간, 금리를 넣으면 적금 세전 이자와 이자과세 15.4%, 세후 만기 수령액을 바로 계산합니다. 월 50만원을 1년 연 4% 단리로 넣으면 세후 이자 ${formatNumber(ex.afterTaxInterest)}원입니다.`,
  path: "/savings/",
  keywords: ["적금 이자 계산기", "적금 계산기", "적금 만기 수령액", "적금 이자 계산", "월복리 적금 계산", "적금 이자 세금"],
});

const FAQ: FaqItem[] = [
  {
    q: "적금 이자는 어떻게 계산하나요?",
    a: `단리 정기적금 이자는 월 납입액 × 연 이율 ÷ 12 × n(n+1)/2 입니다(n은 개월 수). 월 50만원을 연 4%로 12개월 넣으면 500,000 × 0.04 ÷ 12 × 78 = 130,000원이 세전 이자이고, 15.4%를 떼면 세후 ${formatNumber(ex.afterTaxInterest)}원입니다.`,
  },
  {
    q: "연 4% 적금인데 왜 이자가 4%가 안 되나요?",
    a: "매달 넣은 돈이 만기까지 남은 기간만큼만 이자를 받기 때문입니다. 1년 적금이면 첫 달 돈은 12개월, 마지막 달 돈은 1개월만 맡겨져 평균 6.5개월치 이자가 붙습니다. 그래서 원금 대비 세전 이자는 약 2.17%, 세후로는 약 1.83%입니다.",
  },
  {
    q: "적금 이자에서 세금은 얼마나 떼나요?",
    a: "일반과세는 이자의 15.4%(이자소득세 14% + 지방소득세 1.4%)입니다. 은행은 소득세와 지방소득세를 따로 계산해 각각 10원 미만을 버리므로, 단순히 15.4%를 곱한 값보다 몇 원 적을 수 있습니다.",
  },
  {
    q: "단리와 월복리 적금은 이자 차이가 얼마나 나나요?",
    a: "금리가 같다면 기간이 길수록 차이가 커집니다. 월 50만원, 연 4% 기준 1년이면 약 1,600원, 3년이면 약 4만 4천원을 월복리가 더 받습니다. 다만 월복리 상품의 금리가 조금만 낮아도 단리가 유리해질 수 있어 직접 계산해 비교해야 합니다.",
  },
  {
    q: "세금 안 내는 적금은 누가 가입할 수 있나요?",
    a: "비과세종합저축은 2026년 신규 가입부터 만 65세 이상 기초연금 수급자, 장애인, 독립·국가유공자, 기초생활수급자 등이 1인 5천만원까지 가입할 수 있습니다. 소득 요건을 갖춘 만 19~34세 청년은 이자가 비과세인 청년미래적금(월 50만원 한도)을 이용할 수 있습니다. 지역 농·축협, 수협, 산림조합, 신협, 새마을금고 예탁금은 2026~2028년에 가입해도 농협·수협·산림조합 조합원이거나 직전 연도 총급여 7천만원(종합소득 6천만원) 이하라면 3천만원까지 농어촌특별세 1.4%만 냅니다. 그 밖의 사람은 2026년 가입분 5.9%, 2027년 이후 가입분 9.5%입니다.",
  },
  {
    q: "적금과 예금 중 어느 쪽이 이자가 많나요?",
    a: `같은 금리라면 목돈을 한 번에 맡기는 예금이 거의 두 배입니다. 600만원을 연 4% 예금에 1년 넣으면 세전 이자가 ${formatNumber(exDeposit)}원이지만, 월 50만원 적금은 130,000원입니다. 목돈이 있으면 예금, 매달 모아야 하면 적금이 맞습니다.`,
  },
];

export default function SavingsPage() {
  const perMonth = (EX_MONTHLY * EX_RATE) / 1200; // 1개월치 이자 (회차당)
  const installments = Array.from({ length: 12 }, (_, i) => i + 1);
  const compareMonths = [12, 24, 36];

  return (
    <ToolShell
      slug="savings"
      h1="적금 이자 계산기 (세후 만기 수령액)"
      lead="월 납입액과 기간, 금리를 넣으면 이자과세 15.4%를 뗀 적금 만기 수령액을 바로 계산해 드려요. 단리·월복리, 세금우대·비과세도 비교할 수 있어요."
      basis={`${RULE_YEAR}년 세율 기준 (이자소득세 14% + 지방소득세 1.4%) · 2026년 10월 9일 확인`}
      calculator={<SavingsCalculator />}
      faq={FAQ}
      appCategory="FinanceApplication"
    >
      <h2>적금 이자 계산 방법</h2>
      <p>
        정기적금은 매달 같은 금액을 넣고, 회차마다 만기까지 남은 개월 수만큼 이자가 붙습니다. n개월 적금이면 첫 회차는
        n개월, 마지막 회차는 1개월치 이자만 받습니다. 이를 모두 더하면 아래 식이 됩니다.
      </p>
      <p className="formula">단리 이자 = 월 납입액 × 연 이율 ÷ 12 × n(n+1) ÷ 2</p>
      <p className="formula">월복리 이자 = Σ 월 납입액 × [(1 + 연 이율 ÷ 12)^k − 1] &nbsp;(k = 1 … n)</p>
      <p>
        예를 들어 월 50만원을 연 4% 단리로 12개월 넣으면 500,000 × 0.04 ÷ 12 × 78 = <strong>130,000원</strong>이 세전
        이자입니다. 여기서 이자소득세 {formatNumber(ex.taxLines[0].amount)}원과 지방소득세{" "}
        {formatNumber(ex.taxLines[1].amount)}원을 떼면 세후 이자는 {formatNumber(ex.afterTaxInterest)}원, 만기 수령액은{" "}
        <strong>{formatWon(ex.maturity)}</strong>입니다. 은행은 실제 납입일과 일수로 계산하므로 결과가 몇십 원 다를 수
        있습니다.
      </p>

      <h2>적금 이자가 생각보다 적은 이유</h2>
      <p>
        연 4% 적금에 1년 동안 600만원을 넣었는데 이자가 24만원이 아니라 13만원인 이유는, 600만원 전체가 1년 내내 들어
        있지 않기 때문입니다. 1회차 50만원은 12개월 동안 이자를 받지만 12회차 50만원은 1개월치만 받습니다. 평균 예치 기간이
        6.5개월이라 원금 대비 세전 이자는 4% × 6.5 ÷ 12 ≈ 2.17%이고, 세금까지 떼면 약{" "}
        {formatNumber(ex.afterTaxReturn * 100, 2)}%입니다. 적금 금리는 ‘매달 넣는 돈 각각에 붙는 연 금리’라고 이해하면
        정확합니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>월 50만원 · 연 4% 단리 · 12개월, 회차별 세전 이자</caption>
          <thead>
            <tr>
              <th scope="col">회차</th>
              <th scope="col">예치 기간</th>
              <th scope="col">세전 이자</th>
            </tr>
          </thead>
          <tbody>
            {installments.map((k) => (
              <tr key={k}>
                <td>{k}회차</td>
                <td>{13 - k}개월</td>
                <td>{formatNumber(perMonth * (13 - k))}원</td>
              </tr>
            ))}
            <tr className="is-current">
              <td>합계</td>
              <td>평균 6.5개월</td>
              <td>{formatNumber(ex.interest)}원</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="note">회차별 이자는 원 단위로 반올림해 보여 줍니다. 합계는 계산식 그대로의 값입니다.</p>

      <h2>단리와 월복리 비교</h2>
      <p>
        월복리는 매달 붙은 이자에도 다시 이자가 붙는 방식입니다. 금리가 같다면 월복리가 항상 더 많지만, 1~3년 적금에서는
        차이가 크지 않습니다. 오히려 월복리 상품의 금리가 조금 낮으면 단리가 유리합니다. 월 50만원 1년 기준으로 월복리 연
        3.9%의 이자는 {formatNumber(savingsInterest(EX_MONTHLY, 12, 3.9, "monthly"))}원으로, 단리 연 4%(130,000원)보다
        적습니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>월 50만원 · 연 4% · 세전 이자</caption>
          <thead>
            <tr>
              <th scope="col">기간</th>
              <th scope="col">단리</th>
              <th scope="col">월복리</th>
              <th scope="col">차이</th>
            </tr>
          </thead>
          <tbody>
            {compareMonths.map((n) => {
              const simple = savingsInterest(EX_MONTHLY, n, EX_RATE, "simple");
              const monthly = savingsInterest(EX_MONTHLY, n, EX_RATE, "monthly");
              return (
                <tr key={n}>
                  <td>{periodLabel(n)}</td>
                  <td>{formatNumber(simple)}원</td>
                  <td>{formatNumber(monthly)}원</td>
                  <td>+{formatNumber(monthly - simple)}원</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>적금 이자에 붙는 세금 ({RULE_YEAR}년)</h2>
      <div className="table-wrap">
        <table className="data-table">
          <caption>조합 예탁금 세율은 가입한 해 기준, 1인 3천만원까지 (초과분은 일반과세)</caption>
          <thead>
            <tr>
              <th scope="col">구분</th>
              <th scope="col">세율</th>
              <th scope="col">구성과 대상</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>일반과세</td>
              <td>15.4%</td>
              <td className="text-cell">
                이자소득세 14% + 지방소득세 1.4%. 대부분의 예·적금 (NH농협은행·Sh수협은행 포함)
              </td>
            </tr>
            <tr>
              <td>
                조합 예탁금
                <br />
                비과세 대상
              </td>
              <td>1.4%</td>
              <td className="text-cell">
                소득세 없이 농어촌특별세만 냅니다. 2025년까지 가입분, 그리고 2026~2028년 가입분 중 농협·수협·산림조합
                조합원이거나 소득 기준 이하인 사람
              </td>
            </tr>
            <tr>
              <td>
                조합 예탁금
                <br />
                2026년 가입
              </td>
              <td>5.9%</td>
              <td className="text-cell">
                소득세 5% + 농어촌특별세 0.9%, 지방소득세 없음. 비과세 대상이 아닌 사람이 2026년에 가입
              </td>
            </tr>
            <tr>
              <td>
                조합 예탁금 2027년~
                <br />
                옛 세금우대
              </td>
              <td>9.5%</td>
              <td className="text-cell">
                소득세 9% + 농어촌특별세 0.5%. 비과세 대상이 아닌 사람이 2027년 이후 가입한 조합 예탁금, 그리고 2014년 말
                신규 가입이 끝난 세금우대종합저축
              </td>
            </tr>
            <tr>
              <td>비과세</td>
              <td>0%</td>
              <td className="text-cell">비과세종합저축, 청년도약계좌, 청년미래적금 등</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        은행은 이자소득세(14%)를 먼저 계산해 10원 미만을 버리고, 지방소득세는 그 소득세의 10%로 다시 계산해 10원 미만을
        버립니다. 그래서 이자 113,750원의 세금은 15.4%를 그대로 곱한 17,517원이 아니라 15,920원 + 1,590원 ={" "}
        {formatNumber(interestTax(113_750, "general").total)}원입니다. 근거는{" "}
        <a href="https://www.law.go.kr/법령/소득세법/제129조" target="_blank" rel="noopener noreferrer">
          소득세법 제129조
        </a>
        (이자소득 원천징수세율 14%)와{" "}
        <a href="https://www.law.go.kr/법령/지방세법/제103조의13" target="_blank" rel="noopener noreferrer">
          지방세법 제103조의13
        </a>
        (소득세의 10%를 지방소득세로 특별징수)입니다.
      </p>

      <h3>상호금융 조합 예탁금 세율 ({RULE_YEAR}년 변경)</h3>
      <p>
        지역 농·축협, 수협, 산림조합, 신협, 새마을금고의 예탁금은 모든 조합을 합쳐 1인 3천만원까지 세금 특례가
        있습니다(
        <a href="https://www.law.go.kr/법령/조세특례제한법/제89조의3" target="_blank" rel="noopener noreferrer">
          조세특례제한법 제89조의3
        </a>
        ). NH농협은행·Sh수협은행은 은행이라 특례가 없습니다. 2025년 12월 법 개정으로 세율은 이자를 받는 해가 아니라
        예탁금에 가입한 해와 가입한 사람에 따라 정해집니다.
      </p>
      <ul>
        <li>
          <strong>2025년 12월 31일까지 가입</strong>: 누구나 소득세 비과세, 농어촌특별세 1.4%만 냅니다.
        </li>
        <li>
          <strong>비과세 대상의 2026~2028년 가입</strong>: 농협·수협·산림조합의 조합원이거나, 직전 연도 총급여
          7천만원(근로소득만 있는 경우 등) 또는 종합소득금액 6천만원 이하인 사람은 계속 1.4%입니다(
          <a href="https://www.law.go.kr/법령/조세특례제한법/제88조의5" target="_blank" rel="noopener noreferrer">
            같은 법 제88조의5
          </a>
          ). 이들도 2029년 가입분은 5.9%, 2030년 이후 가입분은 9.5%가 됩니다.
        </li>
        <li>
          <strong>그 밖의 사람</strong>(농협·수협·산림조합 조합원이 아니면서 소득 기준을 넘는 준조합원, 신협 조합원,
          새마을금고 회원 등): 2026년 가입분은 소득세 5% + 농어촌특별세 0.9% = 5.9%, 2027년 이후 가입분은 소득세 9% +
          농어촌특별세 0.5% = 9.5%입니다. 지방소득세는 붙지 않습니다.
        </li>
      </ul>
      <p>
        농어촌특별세는 감면받은 소득세(14%와 적용 세율의 차이)의 10%라서 0.9%, 0.5%가 됩니다(
        <a href="https://www.law.go.kr/법령/농어촌특별세법/제5조" target="_blank" rel="noopener noreferrer">
          농어촌특별세법 제5조
        </a>
        ). 2026년에 가입한 적금은 2027년에 만기가 돼도 5.9%입니다. 월 50만원을 연 4% 단리로 1년 넣으면 세금은 일반과세{" "}
        {formatNumber(ex.tax)}원, 비과세 대상 {formatNumber(exAgri.tax)}원, 2026년 가입 {formatNumber(exAgri2026.tax)}원,
        2027년 이후 가입 {formatNumber(exAgri2027.tax)}원입니다. 9.5%는 옛 세금우대종합저축과 같은 세율이지만 별개
        제도이고, 일정 요건의 농어민 등은 농어촌특별세도 면제될 수 있으니 가입할 조합에 적용 세율을 확인하세요.
      </p>
      <p>
        한도 3천만원은 원금 기준이라 적금 원금 합계가 이를 넘으면 넘는 부분의 이자는 일반과세 15.4%입니다. 계산기는 먼저
        넣은 3천만원에 붙는 이자만 조합 예탁금 세율로 계산합니다. 예를 들어 비과세 대상이 월 200만원을 연 4% 단리로 3년
        넣으면(원금 {koreanWon(agriEx.principal)}) 1~15회차 이자 {formatNumber(agriEx.agriSplit?.cappedInterest ?? 0)}원에는 1.4%,
        16~36회차 이자 {formatNumber(agriEx.agriSplit?.excessInterest ?? 0)}원에는 15.4%가 붙어 세금은{" "}
        {formatNumber(agriEx.tax)}원입니다. 다른 조합 예탁금과 합산한 한도이므로 실제 적용은 가입할 곳에 확인하세요.
      </p>

      <h3>비과세종합저축 가입 대상</h3>
      <p>
        비과세종합저축은 1인당 원금 5천만원(전 금융기관 합산)까지 이자에 세금이 없습니다(
        <a href="https://www.law.go.kr/법령/조세특례제한법/제88조의2" target="_blank" rel="noopener noreferrer">
          조세특례제한법 제88조의2
        </a>
        ). 2026년 1월 1일 가입분부터 고령자 요건이 ‘만 65세 이상’에서 ‘만 65세 이상 기초연금 수급자’로 좁혀졌습니다.
        장애인, 독립유공자와 그 유족·가족, 국가유공상이자, 기초생활수급자, 고엽제후유의증환자, 5·18민주화운동 부상자는
        계속 가입할 수 있습니다. 직전 3년 중 한 번이라도 금융소득종합과세 대상이었다면 가입할 수 없고, 2025년까지 가입한
        계좌는 만기까지 혜택이 유지됩니다.
      </p>

      <h3>청년도약계좌와 청년미래적금</h3>
      <p>
        청년도약계좌(5년 만기, 월 최대 70만원, 정부기여금과 이자 비과세)는 2025년 12월 31일로 신규 가입이 끝났고, 기존
        가입자는 만기까지 혜택을 그대로 받습니다. 2026년 6월부터는 3년 만기 청년미래적금이 뒤를 이었습니다. 만 19~34세가 월
        최대 50만원을 넣으면 정부가 납입액의 6%(우대형 12%)를 기여금으로 더해 주고 이자소득세는 없습니다. 모집 일정과 소득
        요건은{" "}
        <a href="https://www.kinfa.or.kr" target="_blank" rel="noopener noreferrer">
          서민금융진흥원
        </a>{" "}
        공지를 확인하세요. 계산기에서는 과세 구분을 ‘비과세’로 두면 은행 이자 부분만 계산됩니다(정부기여금 제외).
      </p>

      <h2>적금과 예금 비교</h2>
      <p>
        같은 금리라면 목돈을 처음부터 맡기는 정기예금이 이자가 거의 두 배입니다. 적금은 목돈이 없을 때 매달 모으는 수단이고,
        이미 목돈이 있다면 예금이 유리합니다. 1년 적금의 금리를 예금 금리로 바꿔 보면 대략 절반 남짓입니다(연 6% 적금 ≈ 연
        3.25% 예금).
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>연 4% 단리 · 1년 · 일반과세 15.4%</caption>
          <thead>
            <tr>
              <th scope="col">구분</th>
              <th scope="col">원금</th>
              <th scope="col">세전 이자</th>
              <th scope="col">세후 이자</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>정기예금 600만원</td>
              <td>6,000,000원</td>
              <td>{formatNumber(exDeposit)}원</td>
              <td>{formatNumber(exDeposit - exDepositTax)}원</td>
            </tr>
            <tr>
              <td>적금 월 50만원</td>
              <td>{formatNumber(ex.principal)}원</td>
              <td>{formatNumber(ex.interest)}원</td>
              <td>{formatNumber(ex.afterTaxInterest)}원</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        목돈을 맡길 계획이라면 <Link href="/deposit/">예금 이자 계산기</Link>로 세후 이자를 비교해 보세요.
      </p>

      <h2>월 납입액별 적금 이자 바로 보기</h2>
      <p>금리 2~6%, 기간 6개월~3년별 세후 만기 수령액을 표로 정리했습니다.</p>
      <nav aria-label="월 납입액별 적금 이자 페이지" className="link-grid">
        {SAVINGS_PAGE_MONTHLY.map((m) => (
          <Link key={m} href={`/savings/${m}/`}>
            월 {m}만원 적금
          </Link>
        ))}
      </nav>
    </ToolShell>
  );
}
