import type { Metadata } from "next";
import Link from "next/link";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber, formatWon } from "@/lib/format";
import { RULE_YEAR, RULES_CHECKED_AT } from "@/lib/site";
import {
  calcDeposit,
  DEPOSIT_PAGE_MANWON,
  depositAmountLabel,
  grossInterest,
  grossInterestByDays,
  interestTax,
  netInterestSimple,
  TAX_RULES,
  type TaxType,
} from "@/lib/calc/deposit";
import { DepositCalculator } from "./DepositCalculator";

export const metadata: Metadata = pageMetadata({
  title: "예금 이자 계산기 - 정기예금 세후 이자, 만기 수령액",
  description:
    "예치 금액, 기간, 금리를 넣으면 정기예금 세후 이자와 만기 수령액을 계산합니다. 1천만원을 연 3%로 1년 맡기면 세후 253,800원. 단리·월복리, 이자소득세 15.4%, 비과세까지 반영합니다.",
  path: "/deposit/",
  keywords: ["예금 이자 계산기", "정기예금 이자 계산", "예금 세후 이자", "이자소득세 15.4%", "1억 예금 이자", "월복리 계산"],
});

function checkedLabel(): string {
  const [y, m, d] = RULES_CHECKED_AT.split("-").map(Number);
  return `${y}년 ${m}월 ${d}일`;
}

const EX_P = 10_000_000;
const EX_RATE = 3;
const ex = calcDeposit({ principal: EX_P, months: 12, ratePct: EX_RATE, method: "simple", taxType: "general" });
const exCompound = grossInterest(EX_P, EX_RATE, 12, "monthly");
const oneEok = (rate: number) => formatNumber(netInterestSimple(100_000_000, rate, 12));
const oneEokGross = calcDeposit({ principal: 100_000_000, months: 12, ratePct: 3, method: "simple", taxType: "general" });
// 일할 계산과의 차이 예시: 1억, 연 3%, 6개월 (181~184일)
const day181 = grossInterestByDays(100_000_000, 3, 181);
const day184 = grossInterestByDays(100_000_000, 3, 184);
const month6 = grossInterest(100_000_000, 3, 6, "simple");
const dayGap = Math.max(month6 - day181, day184 - month6);

const FAQ: FaqItem[] = [
  {
    q: "1억을 정기예금에 넣으면 1년 이자는 얼마인가요?",
    a: `연 3% 단리 기준 세전 이자는 ${formatNumber(oneEokGross.grossInterest)}원이고, 이자소득세 15.4%인 ${formatNumber(oneEokGross.totalTax)}원을 떼면 세후 ${oneEok(3)}원입니다. 연 2.5%면 세후 ${oneEok(2.5)}원, 연 3.5%면 ${oneEok(3.5)}원입니다.`,
  },
  {
    q: "예금 이자에 붙는 세금은 몇 퍼센트인가요?",
    a: "일반과세는 15.4%입니다. 소득세 14%에 지방소득세(소득세의 10%) 1.4%가 더해진 것으로, 은행이 이자를 줄 때 미리 떼고 지급합니다. 지역 농·축협, 신협, 새마을금고 같은 상호금융 예탁금은 1인당 3천만원까지 농어촌특별세 1.4%만 냅니다. 다만 2026년에 새로 가입한 사람 중 조합원이 아니면서 소득 기준(직전 연도 총급여 7천만원, 종합소득 6천만원)을 넘는 사람은 5.9%(소득세 5% + 농어촌특별세 0.9%)를 냅니다. 비과세종합저축 같은 상품은 세금이 없습니다.",
  },
  {
    q: "단리와 월복리 중 무엇이 더 유리한가요?",
    a: `같은 금리라면 월복리가 유리합니다. 1,000만원을 연 3%로 1년 맡기면 단리 이자는 ${formatNumber(ex.grossInterest)}원, 월복리는 ${formatNumber(exCompound)}원입니다. 다만 차이가 크지 않아 상품을 고를 때는 금리 자체를 먼저 비교하는 것이 좋습니다.`,
  },
  {
    q: "정기예금을 중도해지하면 이자는 어떻게 되나요?",
    a: "약정 금리 대신 은행이 정한 중도해지 이율이 적용됩니다. 맡긴 기간에 따라 약정 금리의 일부만 주는 방식이라 이자가 크게 줄어듭니다. 정확한 이율은 상품설명서의 중도해지 이율 표에서 확인할 수 있습니다.",
  },
  {
    q: "예금자보호는 얼마까지 되나요?",
    a: "2025년 9월 1일부터 금융회사별로 1인당 원금과 소정의 이자를 합해 1억원까지 보호됩니다. 같은 금융회사에 여러 계좌가 있으면 합산하므로, 1억원이 넘는 돈은 금융회사를 나눠 맡기는 것이 안전합니다.",
  },
  {
    q: "이자가 2천만원을 넘으면 어떻게 되나요?",
    a: "한 해에 받은 이자와 배당의 합계가 2천만원을 넘으면 금융소득종합과세 대상이 됩니다. 넘는 금액을 다른 종합소득과 합쳐 누진세율로 다시 계산하고, 다음 해 5월에 종합소득세를 신고합니다. 비과세 이자와 상호금융 예탁금·세금우대처럼 분리과세되는 이자는 2천만원 계산에 넣지 않습니다.",
  },
];

export default function DepositPage() {
  const compareMonths = [6, 12, 24, 36, 60];
  const taxRows: { type: TaxType; parts: string; who: string }[] = [
    {
      type: "general",
      parts: "소득세 14% + 지방소득세 1.4%",
      who: "은행·저축은행 예금 대부분 (NH농협은행·Sh수협은행 포함)",
    },
    { type: "preferential", parts: "소득세 9% + 농어촌특별세 0.5%", who: "2014년까지 가입한 세금우대종합저축" },
    {
      type: "mutual",
      parts: "소득세 비과세 + 농어촌특별세 1.4%",
      who: "상호금융 예탁금 3천만원까지: 2025년까지 가입분, 2026~2028년 가입한 조합원·소득 기준 이하인 사람",
    },
    {
      type: "mutualLow",
      parts: "소득세 5% + 농어촌특별세 0.9%",
      who: "상호금융 예탁금 3천만원까지: 2026년에 가입한 그 밖의 사람 (2027년 이후 가입분은 소득세 9%)",
    },
    { type: "exempt", parts: "없음", who: "비과세종합저축 등" },
  ];
  return (
    <ToolShell
      slug="deposit"
      h1="예금 이자 계산기 (세후 이자·만기 수령액)"
      lead="예치 금액과 기간, 금리를 넣으면 이자소득세를 뗀 세후 이자와 만기에 받는 돈을 바로 계산해 드려요."
      basis={`${RULE_YEAR}년 세법 기준 · 일반과세 15.4% · 예금자보호 1억원 · ${checkedLabel()} 확인`}
      calculator={<DepositCalculator />}
      faq={FAQ}
      appCategory="FinanceApplication"
    >
      <h2>예금 이자 계산 방법</h2>
      <p>
        정기예금 이자는 원금에 연 이율과 맡긴 기간을 곱해 구합니다. 대부분의 정기예금은 단리이고, 일부 상품만 매달 붙은 이자를
        원금에 더해 굴리는 월복리입니다.
      </p>
      <p className="formula">단리 이자 = 원금 × 연 이율 × 개월 ÷ 12</p>
      <p className="formula">월복리 이자 = 원금 × {"{"}(1 + 연 이율 ÷ 12)<sup>개월</sup> − 1{"}"}</p>
      <p>
        예를 들어 1,000만원을 연 3%로 12개월 맡기면 단리 이자는 1,000만원 × 0.03 = <strong>{formatWon(ex.grossInterest)}</strong>
        입니다. 여기서 이자소득세 15.4%인 {formatWon(ex.totalTax)}을 떼면 세후 이자는 <strong>{formatWon(ex.netInterest)}</strong>,
        만기 수령액은 {formatWon(ex.maturity)}입니다.
      </p>
      <p className="note">
        은행은 실제 예치일수를 365로 나눠 이자를 계산하므로 개월 수로 계산한 이 계산기와 결과가 다를 수 있고, 금액이 클수록 차이도
        커집니다. 예를 들어 1억원을 연 3%로 6개월 맡기면 예치일수가 181~184일이라 세전 이자가 {formatWon(day181)}~
        {formatWon(day184)}으로, 개월 수로 계산한 {formatWon(month6)}과 최대 {formatWon(dayGap)} 차이가 납니다. 월 이자 지급식도
        28일인 달은 평균보다 약 8% 적고 31일인 달은 약 2% 많습니다.
      </p>

      <h2>단리와 월복리 차이</h2>
      <p>
        월복리는 매달 붙은 이자에도 다시 이자가 붙어 기간이 길수록 단리와 차이가 커집니다. 1,000만원을 연 3%로 맡겼을 때의 세전
        이자입니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
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
              const simple = grossInterest(EX_P, EX_RATE, n, "simple");
              const compound = grossInterest(EX_P, EX_RATE, n, "monthly");
              return (
                <tr key={n}>
                  <td>{n < 12 ? `${n}개월` : `${n / 12}년`}</td>
                  <td>{formatWon(simple)}</td>
                  <td>{formatWon(compound)}</td>
                  <td>{formatWon(compound - simple)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p>
        1년 만기 월복리 3%는 단리로 약 {formatNumber((exCompound / EX_P) * 100, 2)}%와 같습니다. 단리·복리보다 금리 자체가 더 큰
        차이를 만들기 때문에, 상품을 비교할 때는 우대 조건을 포함한 최종 금리를 먼저 보는 것이 좋습니다.
      </p>

      <h2>이자소득세 15.4%의 구조</h2>
      <p>
        예금 이자는 은행이 세금을 먼저 떼고 지급합니다(원천징수). 일반과세는 소득세 14%(
        <a href="https://www.law.go.kr/법령/소득세법/제129조" target="_blank" rel="noopener noreferrer">
          소득세법 제129조
        </a>
        )와 그 10%인 지방소득세 1.4%(
        <a href="https://www.law.go.kr/법령/지방세법/제103조의13" target="_blank" rel="noopener noreferrer">
          지방세법 제103조의13
        </a>
        )를 합해 15.4%입니다. 세금은 세목마다 10원 미만을 버립니다(
        <a href="https://www.law.go.kr/법령/국고금관리법/제47조" target="_blank" rel="noopener noreferrer">
          국고금 관리법 제47조
        </a>
        ).
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">과세 구분</th>
              <th scope="col">세율 구성</th>
              <th scope="col">적용 대상</th>
              <th scope="col">이자 100만원일 때 세금</th>
            </tr>
          </thead>
          <tbody>
            {taxRows.map(({ type, parts, who }) => (
              <tr key={type}>
                <td>
                  {TAX_RULES[type].name} {formatNumber(TAX_RULES[type].totalBp / 100, 2)}%
                </td>
                <td>{parts}</td>
                <td>{who}</td>
                <td>{formatWon(interestTax(1_000_000, type).total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        지역 농·축협, 수협(조합), 신협, 산림조합, 새마을금고의 예탁금은 전 조합을 합쳐 1인당 3천만원까지 세금 특례가
        있습니다(
        <a href="https://www.law.go.kr/법령/조세특례제한법/제89조의3" target="_blank" rel="noopener noreferrer">
          조세특례제한법 제89조의3
        </a>
        ). NH농협은행·Sh수협은행은 은행이라 이 특례가 없고 일반과세(15.4%)입니다. 2025년 12월 31일까지 가입한 예탁금은
        계속 소득세가 비과세되고 농어촌특별세 1.4%만 냅니다.
      </p>
      <p>
        2025년 12월 법 개정으로 2026년 1월 1일 이후 가입분은 사람에 따라 달라집니다. 시행령으로 정하는 조합의 조합원이거나,
        직전 연도 총급여 7천만원 이하(근로소득만 있는 경우 등) 또는 종합소득금액 6천만원 이하인 사람은 2028년 가입분까지
        비과세가 이어집니다(
        <a href="https://www.law.go.kr/법령/조세특례제한법/제88조의5" target="_blank" rel="noopener noreferrer">
          같은 법 제88조의5
        </a>
        ). 그 밖의 사람은 소득세 5%(2026년 가입분) 또는 9%(2027년 이후 가입분)로 분리과세되고, 지방소득세는 붙지 않으며
        감면받은 소득세의 10%가 농어촌특별세로 붙습니다(
        <a href="https://www.law.go.kr/법령/농어촌특별세법/제5조" target="_blank" rel="noopener noreferrer">
          농어촌특별세법 제5조
        </a>
        ). 그래서 2026년 가입분은 소득세 5%와 농어촌특별세 0.9%를 합해 5.9%, 2027년 이후 가입분은 9.5%입니다. 세율은 이자를 받는 해가 아니라
        가입한 해로 정해지므로, 2026년에 가입한 예탁금은 2027년에 만기가 돼도 5%가 적용됩니다. 가입 전에 조합에서 적용 세율을
        확인하는 것이 좋습니다.
      </p>

      <h2>금융소득종합과세 2천만원 기준</h2>
      <p>
        한 해에 받은 이자와 배당이 합쳐서 2천만원 이하이면 15.4% 원천징수로 납세가 끝납니다. 2천만원을 넘으면 넘는 부분을
        근로·사업소득 등과 합산해 종합소득세율(지방소득세 포함 6.6~49.5%)로 다시 계산하고 다음 해 5월에 신고합니다(
        <a href="https://www.law.go.kr/법령/소득세법/제14조" target="_blank" rel="noopener noreferrer">
          소득세법 제14조
        </a>
        ). 비과세 이자와 세금우대·상호금융 예탁금처럼 분리과세되는 이자는 2천만원 계산에 넣지 않습니다.
      </p>
      <p>
        정기예금 이자는 실제로 받는 날, 보통 만기일이 속한 해의 소득이 됩니다. 2~3년 만기 예금은 여러 해 치 이자가 한 해에 몰릴
        수 있으므로, 금액이 크다면 월 이자 지급식을 고르거나 만기를 해마다 나누는 방법으로 2천만원 기준을 관리할 수 있습니다.
      </p>

      <h2>예금자보호 한도 1억원</h2>
      <p>
        2025년 9월 1일부터 예금자보호 한도가 5천만원에서 <strong>1억원</strong>으로 올랐습니다. 금융회사가 문을 닫아도 한
        금융회사당 1인 기준으로 원금과 소정의 이자를 합해 1억원까지 돌려받습니다. 은행·저축은행 예금은{" "}
        <a href="https://www.kdic.or.kr/" target="_blank" rel="noopener noreferrer">
          예금보험공사
        </a>
        가, 지역 농·축협, 수협, 신협, 산림조합, 새마을금고 예금은 각 중앙회가 같은 한도로 보호하며, 우체국 예금은 국가가 지급을 보장합니다(
        <a href="https://www.fsc.go.kr/" target="_blank" rel="noopener noreferrer">
          금융위원회
        </a>
        ). 같은 금융회사라면 지점이나 계좌가 달라도 합산되므로, 1억원이 넘는 돈은 금융회사를 나눠 맡기는 것이 안전합니다.
      </p>

      <h2>정기예금과 파킹통장 차이</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">구분</th>
              <th scope="col">정기예금</th>
              <th scope="col">파킹통장</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>금리</td>
              <td>가입 때 정한 금리가 만기까지 고정</td>
              <td>은행이 수시로 바꿀 수 있음</td>
            </tr>
            <tr>
              <td>입출금</td>
              <td>만기 전 해지 시 중도해지 이율</td>
              <td>언제든 자유롭게</td>
            </tr>
            <tr>
              <td>이자 지급</td>
              <td>만기 일시 또는 매월</td>
              <td>매월 또는 매일</td>
            </tr>
            <tr>
              <td>알맞은 돈</td>
              <td>당분간 쓰지 않을 목돈</td>
              <td>비상금, 곧 쓸 돈</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        파킹통장은 정해진 금액까지만 높은 금리를 주는 경우가 많고, 이자에는 정기예금과 똑같이 15.4% 세금이 붙습니다. 금리가
        내려갈 것 같으면 정기예금으로 금리를 묶어 두는 편이 유리하고, 언제 쓸지 모르는 돈이라면 파킹통장이 낫습니다.
      </p>

      <h2>금액별 예금 이자 보기</h2>
      <nav aria-label="금액별 예금 이자 페이지" className="link-grid">
        {DEPOSIT_PAGE_MANWON.map((m) => (
          <Link key={m} href={`/deposit/${m}/`}>
            {depositAmountLabel(m)} 예금 이자
          </Link>
        ))}
      </nav>
    </ToolShell>
  );
}
