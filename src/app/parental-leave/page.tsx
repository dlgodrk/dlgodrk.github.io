import type { Metadata } from "next";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber, formatWon, manwonLabel } from "@/lib/format";
import { RULES_CHECKED_AT } from "@/lib/site";
import { ymd } from "@/lib/date";
import {
  calcMaternity,
  calcParentalLeave,
  calcSpouseLeave,
  GENERAL_MAX_SIX_MONTHS,
  GENERAL_MAX_YEAR,
  generalRule,
  MATERNITY_CAP,
  maternityFloor,
  PARENTAL_FLOOR,
  SIX_SIX_MAX_SIX_MONTHS,
  singleParentRule,
  sixSixRule,
  spouseLeaveCap,
  type MonthRule,
} from "@/lib/calc/parental-leave";
import { ParentalLeaveCalculator } from "./ParentalLeaveCalculator";

export const metadata: Metadata = pageMetadata({
  title: "육아휴직 급여 계산기 2026 - 6+6·출산휴가 급여까지",
  description:
    "2026년 육아휴직 급여를 달별로 계산합니다. 1~3개월 월 최대 250만원, 4~6개월 200만원, 7개월부터 80%·160만원, 하한 70만원. 6+6 특례와 한부모, 출산휴가·배우자 출산휴가 급여도 함께 확인하세요.",
  path: "/parental-leave/",
  keywords: [
    "육아휴직 급여 계산기",
    "육아휴직 급여 2026",
    "6+6 부모육아휴직제",
    "육아휴직 급여 상한액",
    "출산휴가 급여 계산",
    "배우자 출산휴가 급여",
    "사후지급금 폐지",
  ],
});

function checkedLabel(): string {
  const [y, m, d] = RULES_CHECKED_AT.split("-").map(Number);
  return `${y}년 ${m}월 ${d}일`;
}

/** "250만원" */
function man(n: number): string {
  return manwonLabel(n / 10_000);
}

function ruleCell(r: MonthRule): string {
  return `${r.ratePct}% · ${man(r.cap)}`;
}

/** Basis month for static copy: a leave starting in October 2026. */
const BASIS = ymd(2026, 10, 1);

const EX = calcParentalLeave({ wage: 3_000_000, months: 12, household: "alone" })!;
const SIX = calcParentalLeave({
  wage: 5_000_000,
  months: 6,
  household: "both",
  spouseMonths: 6,
  withinEighteen: true,
})!;
const MAT_P = calcMaternity({ wage: 3_000_000, birth: "single", size: "priority", start: BASIS })!;
const MAT_L = calcMaternity({ wage: 3_000_000, birth: "single", size: "large", start: BASIS })!;
const SPOUSE = calcSpouseLeave({ wage: 3_000_000, days: 20, size: "priority", start: BASIS })!;
const SPOUSE_CAP = spouseLeaveCap(BASIS, 20).cap;
const SPOUSE_CAP_2025 = spouseLeaveCap(ymd(2025, 6, 1), 20).cap;
const FLOOR_2026 = maternityFloor(BASIS);
const CAP_2026 = MATERNITY_CAP[2026];
const CAP_2025 = MATERNITY_CAP[2025];

const WAGE_ROWS = [1_500_000, 2_000_000, 2_500_000, 3_000_000, 3_500_000, 4_000_000, 5_000_000].map((wage) => {
  const year = calcParentalLeave({ wage, months: 12, household: "alone" })!;
  const six = calcParentalLeave({ wage, months: 6, household: "both", spouseMonths: 6, withinEighteen: true })!;
  return { wage, m1: year.rows[0].amount, m4: year.rows[3].amount, m7: year.rows[6].amount, year: year.total, six: six.total };
});

const RULE_ROWS: { label: string; k: number }[] = [
  { label: "1개월째", k: 1 },
  { label: "2개월째", k: 2 },
  { label: "3개월째", k: 3 },
  { label: "4개월째", k: 4 },
  { label: "5개월째", k: 5 },
  { label: "6개월째", k: 6 },
  { label: "7개월째부터", k: 7 },
];

const FAQ: FaqItem[] = [
  {
    q: "육아휴직 급여는 한 달에 최대 얼마인가요?",
    a: `일반 육아휴직은 1~3개월째 월 최대 250만원, 4~6개월째 200만원, 7개월째부터는 통상임금의 80%로 최대 160만원입니다. 1년을 모두 쓰면 최대 ${man(GENERAL_MAX_YEAR)}입니다. 자녀 생후 18개월 안에 부모가 모두 휴직하는 6+6 특례라면 6개월째 상한이 450만원까지 올라갑니다. 통상임금이 적어도 월 70만원은 받습니다.`,
  },
  {
    q: "사후지급금은 이제 없어졌나요?",
    a: "네. 예전에는 급여의 25%를 떼어 두었다가 복직하고 6개월을 더 일해야 줬지만, 2025년 1월 1일부터 이 제도가 없어졌습니다. 지금은 휴직 기간 중에 매달 전액을 받습니다.",
  },
  {
    q: "6+6 부모육아휴직제는 부부가 동시에 써야 하나요?",
    a: "아닙니다. 자녀가 생후 18개월이 되기 전에 부모가 모두 육아휴직을 시작하면 동시에 쓰든 차례로 쓰든 적용됩니다. 다만 상향된 상한은 두 사람이 공통으로 쓴 기간만큼만 적용됩니다. 먼저 쉰 사람은 휴직 중에는 일반 기준으로 받고, 배우자가 휴직을 시작한 뒤 차액을 추가로 받습니다.",
  },
  {
    q: "통상임금은 어떻게 알 수 있나요?",
    a: "기본급에 직무수당, 직책수당, 고정 식대처럼 매달 정해진 금액으로 주는 수당을 더한 금액이 통상임금입니다. 2024년 12월 대법원 전원합의체 판결로 재직 조건이 붙은 정기상여금도 통상임금에 들어갈 수 있습니다. 연장·야간근로수당과 실적에 따른 성과급은 빠집니다. 정확한 금액은 회사가 고용센터에 내는 육아휴직 확인서에 적힌 통상임금으로 정해집니다.",
  },
  {
    q: "출산휴가 급여는 얼마나 받나요?",
    a: `출산전후휴가 90일 중 최초 60일은 통상임금 전액을 받고, 나머지 30일은 고용보험이 30일에 ${man(CAP_2026)}까지만 줍니다(2026년 시작분). 최초 60일분은 대규모기업이면 회사가 모두 주고, 우선지원대상기업이면 고용보험 급여에 회사가 모자란 부분을 채워 줍니다. 통상임금 300만원이면 90일 동안 ${formatWon(MAT_P.total)}을 받습니다.`,
  },
  {
    q: "배우자 출산휴가는 며칠이고 급여는 얼마인가요?",
    a: `20일이고 모두 유급이라 통상임금 전액을 받습니다. 우선지원대상기업에 다니면 고용보험이 20일분을 ${formatWon(SPOUSE_CAP)}까지 대신 내 줍니다. 2026년 9월 18일부터는 출산예정일 50일 전부터 출산 후 120일 안에 3번까지 나눠(모두 4번에 걸쳐) 쓸 수 있습니다.`,
  },
];

export default function ParentalLeavePage() {
  return (
    <ToolShell
      slug="parental-leave"
      h1="육아휴직 급여 계산기 (2026 6+6·출산휴가 급여)"
      lead={`2026년 육아휴직 급여는 첫 3개월 통상임금 100%(월 최대 250만원), 4~6개월 100%(200만원), 7개월째부터 80%(160만원)이고 하한은 월 ${man(PARENTAL_FLOOR)}이에요. 통상임금과 기간을 넣으면 달마다 받는 돈과 총액을 바로 계산해 드려요.`}
      basis={`2026년 10월 시작분 기준 · 육아휴직 상한 250·200·160만원 · 출산휴가 30일 상한 ${man(CAP_2026)} · ${checkedLabel()} 확인`}
      calculator={<ParentalLeaveCalculator />}
      faq={FAQ}
      appCategory="FinanceApplication"
    >
      <h2>2026년 육아휴직 급여 지급 기준</h2>
      <p>
        육아휴직 급여는 휴직을 시작한 날의 월 통상임금을 기준으로, 몇 개월째 휴직인지에 따라 지급률과 월 상한이 달라집니다.
        2025년 1월 1일부터 상한이 월 150만원에서 최대 250만원으로 오르고 사후지급금이 없어졌으며, 2026년 10월 현재 이 기준이
        그대로 적용됩니다. 어떤 경우든 월 {man(PARENTAL_FLOOR)}보다 적게 주지는 않습니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>지급률 · 월 상한 (하한은 모두 월 70만원)</caption>
          <thead>
            <tr>
              <th scope="col">회차</th>
              <th scope="col">일반</th>
              <th scope="col">한부모</th>
              <th scope="col">6+6 특례</th>
            </tr>
          </thead>
          <tbody>
            {RULE_ROWS.map(({ label, k }) => (
              <tr key={k}>
                <td>{label}</td>
                <td>{ruleCell(generalRule(k))}</td>
                <td>{ruleCell(singleParentRule(k))}</td>
                <td>{ruleCell(sixSixRule(k, 6))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        1년을 넘겨 쓰는 13~18개월째도 7개월째부터의 기준(80%, 월 160만원)을 따릅니다.
      </p>

      <h2>육아휴직 급여 계산 방법</h2>
      <p className="formula">월 급여 = 통상임금 × 지급률 (월 상한까지, 최소 70만원)</p>
      <p>
        통상임금이 300만원인 사람이 혼자 1년을 쉬면 1~3개월째는 상한 250만원, 4~6개월째는 상한 200만원, 7~12개월째는
        300만원의 80%인 240만원이 상한 160만원에 걸립니다. 250만원 × 3 + 200만원 × 3 + 160만원 × 6 ={" "}
        <strong>{formatWon(EX.total)}</strong>, 한 달 평균 {formatWon(EX.average)}입니다. 휴직이 달 중간에 끝나면 마지막 달은
        일수에 비례해 줄어듭니다.
      </p>

      <h2>통상임금별 육아휴직 급여</h2>
      <div className="table-wrap">
        <table className="data-table">
          <caption>혼자 12개월 사용 / 6+6은 부모 각각 6개월 사용 기준</caption>
          <thead>
            <tr>
              <th scope="col">월 통상임금</th>
              <th scope="col">1~3개월째</th>
              <th scope="col">4~6개월째</th>
              <th scope="col">7개월째~</th>
              <th scope="col">12개월 합계</th>
              <th scope="col">6+6 첫 6개월</th>
            </tr>
          </thead>
          <tbody>
            {WAGE_ROWS.map((r) => (
              <tr key={r.wage}>
                <td>{man(r.wage)}</td>
                <td>{formatNumber(r.m1)}</td>
                <td>{formatNumber(r.m4)}</td>
                <td>{formatNumber(r.m7)}</td>
                <td>{formatNumber(r.year)}</td>
                <td>{formatNumber(r.six)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        통상임금이 250만원을 넘으면 첫 6개월은 상한에 걸려 금액이 같아지고, 200만원 이상이면 7개월째부터 160만원으로 같아집니다.
      </p>

      <h2>6+6 부모육아휴직제</h2>
      <p>
        자녀가 생후 18개월이 되기 전에 부모가 모두 육아휴직을 하면 각자의 첫 6개월 동안 통상임금 100%를 받고, 월 상한이 1·2개월째
        250만원에서 6개월째 450만원까지 올라갑니다. 6개월을 꽉 채워 받으면 부모 한 사람당 {man(SIX_SIX_MAX_SIX_MONTHS)}으로, 일반
        기준 최대 {man(GENERAL_MAX_SIX_MONTHS)}보다 {man(SIX_SIX_MAX_SIX_MONTHS - GENERAL_MAX_SIX_MONTHS)} 많습니다.
      </p>
      <ul>
        <li>두 사람의 휴직 기간이 겹칠 필요는 없습니다. 순서대로 써도 됩니다.</li>
        <li>
          상향된 상한은 부모가 공통으로 쓴 기간만큼만 적용됩니다. 엄마가 6개월, 아빠가 3개월을 쓰면 두 사람 모두 처음 3개월만
          특례를 받고, 엄마의 4~6개월째는 일반 기준(200만원)입니다.
        </li>
        <li>
          먼저 쉰 사람은 휴직 중에는 일반 기준으로 받다가, 배우자가 휴직을 시작하면 차액을 한꺼번에 받습니다. 이때 기준은 먼저 쉰
          사람의 휴직 시작일 통상임금입니다.
        </li>
        <li>7개월째부터는 6+6과 관계없이 80%, 월 160만원 상한입니다.</li>
      </ul>
      <p>
        예를 들어 통상임금이 각각 500만원인 부부가 6개월씩 쉬면 한 사람당 {formatWon(SIX.total)}, 부부 합계{" "}
        {formatWon(SIX.total * 2)}을 받습니다.
      </p>

      <h2>육아휴직 기간과 나눠 쓰기</h2>
      <ul>
        <li>
          <strong>기간</strong>: 자녀 1명당 1년입니다. 2025년 2월 23일부터 같은 자녀로 부모가 각각 3개월 이상 쓰거나, 한부모이거나,
          장애아동의 부모이면 6개월을 더해 1년 6개월까지 쓸 수 있습니다.
        </li>
        <li>
          <strong>대상 자녀</strong>: 만 8세 이하 또는 초등학교 2학년 이하 자녀입니다.
        </li>
        <li>
          <strong>나눠 쓰기</strong>: 3번까지 나눠 모두 4번에 걸쳐 쓸 수 있습니다. 2026년 8월 20일부터는 방학이나 자녀 입원처럼
          돌봄 공백이 생기면 자녀 1명당 연 1회 1주 또는 2주 단위의 단기 육아휴직도 쓸 수 있고, 이는 분할 횟수에 들어가지
          않습니다. 단기 육아휴직도 쓴 7일·14일만큼 같은 지급률·상한 기준으로 육아휴직 급여를 받고, 쓴 기간은 전체 육아휴직
          기간에서 빠집니다.
        </li>
        <li>
          <strong>출산 전 사용</strong>: 2026년 9월 18일부터는 배우자에게 유산·조산 위험이 있으면 출산 전에도 남편이 육아휴직을 쓸
          수 있습니다.
        </li>
      </ul>

      <h2>출산전후휴가 급여</h2>
      <p>
        출산전후휴가는 90일(미숙아 100일, 쌍둥이 이상 120일)이고 출산 후에 45일(다태아 60일) 이상이 남도록 써야 합니다. 최초
        60일(다태아 75일)은 회사가 통상임금을 줘야 하는 유급 기간이고, 고용보험은 30일에 {man(CAP_2026)}까지 지급합니다. 이
        상한은 2026년 1월 1일부터 {man(CAP_2025)}에서 올랐습니다. 통상임금이 최저임금보다 낮으면 최저임금(주 40시간 월{" "}
        {formatWon(FLOOR_2026)})으로 계산합니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>통상임금 300만원, 90일 휴가 (2026년 시작)</caption>
          <thead>
            <tr>
              <th scope="col">회사 규모</th>
              <th scope="col" className="text-cell">
                누가 주나요
              </th>
              <th scope="col">고용보험</th>
              <th scope="col">회사</th>
              <th scope="col">합계</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>우선지원대상기업</td>
              <td className="text-cell">고용보험이 90일 모두 지급, 회사는 최초 60일의 상한 초과분</td>
              <td>{formatNumber(MAT_P.insurance)}</td>
              <td>{formatNumber(MAT_P.employer)}</td>
              <td>{formatNumber(MAT_P.total)}</td>
            </tr>
            <tr>
              <td>대규모기업</td>
              <td className="text-cell">회사가 최초 60일 전액, 고용보험이 나머지 30일</td>
              <td>{formatNumber(MAT_L.insurance)}</td>
              <td>{formatNumber(MAT_L.employer)}</td>
              <td>{formatNumber(MAT_L.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="note">
        받는 총액은 회사 규모와 관계없이 같고, 누가 얼마를 내는지만 다릅니다. 대규모기업은 미숙아 40일, 다태아 45일을 고용보험이
        지급합니다. 회사가 주는 몫은 근로소득이라 세금이 붙고, 고용보험 급여는 비과세입니다.
      </p>

      <h2>배우자 출산휴가 급여</h2>
      <p>
        배우자 출산휴가는 2025년 2월 23일부터 20일로 늘었고 20일 모두 유급입니다. 2026년 9월 18일부터는 출산예정일 50일 전부터
        출산 후 120일 안에 3번까지 나눠(모두 4번에 걸쳐) 쓸 수 있습니다. 우선지원대상기업 근로자는 고용보험이 20일분
        통상임금을 {formatWon(SPOUSE_CAP)}(2025년 {formatWon(SPOUSE_CAP_2025)})까지 지원하고, 나머지는 회사가 줍니다.
      </p>
      <p className="formula">20일분 통상임금 = 월 통상임금 ÷ 209시간 × 8시간 × 20일 (원 미만 버림)</p>
      <p>
        통상임금 300만원이면 300만원 ÷ 209 × 8 × 20 = {formatWon(SPOUSE.total)}이고, 이 중{" "}
        {formatWon(SPOUSE.government)}을 고용보험이, {formatWon(SPOUSE.employer)}을 회사가 냅니다. 대규모기업은 회사가 전액을
        줍니다.
      </p>

      <h2>신청 방법과 지급 시기</h2>
      <ul>
        <li>
          <strong>받을 수 있는 사람</strong>: 30일 이상(단기 육아휴직은 7일·14일) 육아휴직을 하고, 휴직 전 고용보험
          피보험단위기간이 모두 180일 이상인 근로자입니다.
        </li>
        <li>
          <strong>신청</strong>: <a href="https://www.work24.go.kr">고용24</a>에서 온라인으로 하거나 사업장·거주지 관할 고용센터에
          냅니다. 회사는 육아휴직 확인서를 고용센터에 따로 제출합니다.
        </li>
        <li>
          <strong>육아휴직 급여 시기</strong>: 휴직을 시작하고 1개월이 지난 뒤부터 매달 신청해 받습니다. 휴직이 끝난 날부터 12개월
          안에 신청하지 않으면 받지 못합니다.
        </li>
        <li>
          <strong>출산휴가 급여 시기</strong>: 휴가가 끝난 날부터 12개월 안에 신청해야 합니다. 대규모기업은 회사가 주는 최초
          60일이 지난 뒤 나머지 기간분을 신청합니다.
        </li>
        <li>
          <strong>줄거나 못 받는 경우</strong>: 휴직 중 주 15시간 이상 일하거나 월 150만원 이상 소득이 있으면 그 기간 급여가
          나오지 않고, 회사에서 받은 돈과 급여를 더해 통상임금을 넘으면 넘는 만큼 줄어듭니다.
        </li>
      </ul>

      <h2>법적 근거</h2>
      <ul>
        <li>
          <a href="https://www.law.go.kr/법령/고용보험법시행령">고용보험법 시행령</a> 제95조(육아휴직 급여), 제95조의3(출생 후
          18개월 이내 자녀에 대한 특례, 한부모 특례), 제101조(출산전후휴가 급여)
        </li>
        <li>
          <a href="https://www.law.go.kr/법령/고용보험법">고용보험법</a> 제70조(육아휴직 급여), 제75조·제76조(출산전후휴가 급여 등)
        </li>
        <li>
          <a href="https://www.law.go.kr/법령/근로기준법/제74조">근로기준법 제74조</a>(출산전후휴가, 최초 60일 유급)
        </li>
        <li>
          <a href="https://www.law.go.kr/법령/남녀고용평등과일ㆍ가정양립지원에관한법률">남녀고용평등과 일·가정 양립 지원에 관한 법률</a>{" "}
          제18조의2(배우자 출산휴가), 제19조(육아휴직)
        </li>
        <li>고용노동부 「출산전후휴가 급여 등 상한액 고시」(2026년 1월 1일 시행, 30일 220만원)</li>
      </ul>
    </ToolShell>
  );
}
