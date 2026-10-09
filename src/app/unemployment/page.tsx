import type { Metadata } from "next";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber, formatWon, koreanWon } from "@/lib/format";
import { RULES_CHECKED_AT } from "@/lib/site";
import { ymd } from "@/lib/date";
import {
  benefitDays,
  calcUnemployment,
  dailyBenefit,
  dailyFloor,
  dailyScheduledHours,
  ANNUAL_BASE_LAW_NO,
  ANNUAL_BASE_RULE_YEAR,
  INSURED_PERIOD_OPTIONS,
  proposalCap,
  sixDayMonthly,
  wagePeriod,
  yearRule,
  type InsuredPeriod,
} from "@/lib/calc/unemployment";
import { UnemploymentCalculator } from "./UnemploymentCalculator";

export const metadata: Metadata = pageMetadata({
  title: "실업급여 계산기 - 2026 구직급여 하루 금액·받는 기간·총액",
  description:
    "이직일, 퇴직 전 3개월 월급, 고용보험 가입기간, 나이를 넣으면 실업급여 하루 금액과 받는 일수, 총액을 계산합니다. 2026년 이직자는 하루 상한 68,100원, 하한 66,048원(8시간)이고 120~270일 받습니다.",
  path: "/unemployment/",
  keywords: [
    "실업급여 계산기",
    "구직급여 계산",
    "실업급여 상한액 2026",
    "실업급여 하한액",
    "실업급여 수급기간",
    "실업급여 조건",
    "자진퇴사 실업급여",
  ],
});

function checkedLabel(): string {
  const [y, m, d] = RULES_CHECKED_AT.split("-").map(Number);
  return `${y}년 ${m}월 ${d}일`;
}

const R2025 = yearRule(2025)!;
const R2026 = yearRule(2026)!;
const R2027 = yearRule(2027)!;
const FLOOR_2026 = dailyFloor(R2026.minWage, 8);
const FLOOR_2027 = dailyFloor(R2027.minWage, 8);
const CAP_2026 = R2026.dailyCap;
/** 기초일액 × 60%가 8시간 하한과 같아지는 금액: 66,048 ÷ 0.6 = 110,080원 */
const FLOOR_BASE_2026 = Math.ceil((FLOOR_2026 * 100) / 60);
const PROPOSAL_CAP_2027 = proposalCap(2027)!;

/** Worked example = the calculator's default inputs. */
const DEFAULT_EX = calcUnemployment({
  separation: ymd(2026, 10, 31),
  monthlyWage: 3_000_000,
  hours: 8,
  period: "1",
  over50OrDisabled: false,
})!;

type Example = { who: string; base: number; hours: number; period: InsuredPeriod; over50: boolean };
const EXAMPLES: Example[] = [
  { who: "30세, 가입 2년", base: 112_000, hours: 8, period: "1", over50: false },
  { who: "45세, 가입 4년", base: 150_000, hours: 8, period: "3", over50: false },
  { who: "52세, 가입 12년", base: 100_000, hours: 8, period: "10", over50: true },
  { who: "25세, 하루 4시간, 가입 10개월", base: 45_000, hours: 4, period: "0", over50: false },
];

const MIN_DAYS = benefitDays("0", false);
const MAX_DAYS = benefitDays("10", true);
const maxTotal2026 = CAP_2026 * MAX_DAYS;
/** 짧은 달 말일 이직 예시: 2026-04-30 → 02-01~04-30, 89일 */
const APR30_PERIOD = wagePeriod(ymd(2026, 4, 30));

/** 주 단위로 정한 단시간 근로자 (시행규칙 제91조의2①2호). 주 3일 × 8시간 = 24시간 → 4.8 → 5시간. */
const WEEKLY_ROWS: { weekly: number; who?: string }[] = [
  { weekly: 12, who: "주 2일 × 6시간" },
  { weekly: 15 },
  { weekly: 20, who: "주 5일 × 4시간" },
  { weekly: 24, who: "주 3일 × 8시간" },
  { weekly: 30 },
  { weekly: 32, who: "주 4일 × 8시간" },
  { weekly: 35 },
  { weekly: 40, who: "주 5일 × 8시간" },
];
const THREE_DAY = dailyScheduledHours("week", 24)!;
const THREE_DAY_FLOOR_2026 = dailyFloor(R2026.minWage, THREE_DAY.hours);

const FAQ: FaqItem[] = [
  {
    q: "실업급여는 하루 최대 얼마까지 받을 수 있나요?",
    a: `2026년에 이직했다면 하루 ${formatNumber(CAP_2026)}원이 상한입니다. 30일로 치면 ${formatNumber(CAP_2026 * 30)}원이고, 최장 270일을 받으면 ${formatNumber(maxTotal2026)}원입니다. 반대로 주 5일 하루 8시간 일했다면 월급이 적어도 하루 ${formatNumber(FLOOR_2026)}원(하한액)은 받습니다. 주 3일 근무처럼 소정근로시간이 짧으면 하한액도 그만큼 낮아집니다.`,
  },
  {
    q: "자진 퇴사해도 실업급여를 받을 수 있나요?",
    a: "원칙적으로는 받을 수 없습니다. 다만 이직 전 1년 안에 임금체불이나 최저임금 미달이 2개월 이상 있었던 경우, 통근 왕복이 3시간 이상 걸리게 된 경우, 직장 내 괴롭힘이나 성희롱을 당한 경우, 질병으로 일하기 어려운데 휴직이 허용되지 않은 경우처럼 고용보험법 시행규칙 별표2의 정당한 사유가 있으면 받을 수 있습니다. 사유는 고용센터가 증빙 서류로 판단합니다.",
  },
  {
    q: "계약기간이 끝나서 퇴사해도 받을 수 있나요?",
    a: "받을 수 있습니다. 계약기간 만료나 정년으로 더 다닐 수 없게 된 경우는 정당한 이직 사유입니다. 다만 회사가 같은 조건으로 재계약을 제안했는데 본인이 거절했다면 자발적 이직으로 볼 수 있습니다.",
  },
  {
    q: "실업급여는 언제까지 신청해야 하나요?",
    a: "구직급여는 이직일 다음 날부터 12개월 안에만 받을 수 있습니다. 신청이 늦어 이 기간이 끝나면 남은 일수는 받지 못합니다. 예를 들어 소정급여일수가 240일인데 퇴사 6개월 뒤에 신청하면 일부를 잃게 되므로, 퇴사 후 바로 고용24에서 구직 신청을 하는 것이 좋습니다.",
  },
  {
    q: "실업급여를 받는 중에 아르바이트를 해도 되나요?",
    a: "일할 수는 있지만 일한 날과 받은 돈을 실업인정 신청 때 반드시 신고해야 합니다. 일한 날에는 구직급여가 나오지 않고, 신고하지 않으면 부정수급으로 받은 돈을 돌려주는 것은 물론 추가 징수와 처벌을 받을 수 있습니다.",
  },
  {
    q: "실업급여에도 세금이 붙나요?",
    a: "구직급여는 소득세가 붙지 않는 비과세 소득이라 계산된 금액에서 세금을 떼지 않고 입금됩니다. 실업급여를 받을 권리는 남에게 넘기거나 압류할 수 없고, 실업급여 전용 수급계좌로 받으면 그 계좌에 들어온 급여도 압류로부터 보호됩니다.",
  },
];

export default function UnemploymentPage() {
  const floorHoursRows = [1, 2, 3, 4, 5, 6, 7, 8];
  return (
    <ToolShell
      slug="unemployment"
      h1="실업급여 계산기 (2026년 구직급여 예상액)"
      lead={`2026년에 이직한 하루 8시간 근로자는 실업급여를 하루 ${formatNumber(FLOOR_2026)}원(하한)~${formatNumber(CAP_2026)}원(상한)씩, 나이와 가입기간에 따라 ${MIN_DAYS}~${MAX_DAYS}일 동안 받아요. 이직일과 월급, 가입기간을 넣으면 총액을 바로 계산해 드려요.`}
      basis={`2026년 이직자 기준 · 하루 상한 ${formatNumber(CAP_2026)}원 · 하한 ${formatNumber(FLOOR_2026)}원(8시간) · ${checkedLabel()} 확인`}
      calculator={<UnemploymentCalculator />}
      faq={FAQ}
      appCategory="FinanceApplication"
    >
      <h2>실업급여를 받을 수 있는 조건</h2>
      <p>
        흔히 실업급여라고 부르는 돈의 정식 이름은 구직급여입니다. 고용보험법 제40조에 따라 아래 조건을 모두 채워야 받을 수
        있습니다.
      </p>
      <ul>
        <li>
          <strong>가입 기간</strong>: 이직일 이전 18개월 동안 고용보험 피보험단위기간이 합쳐서 180일 이상이어야 합니다.
          피보험단위기간은 임금을 받은 날을 세는 것이라 주휴일 같은 유급휴일은 들어가고 무급 휴무일은 빠집니다. 주 5일 근무라면
          대략 7개월 남짓 일하면 채워집니다. 주 15시간 미만이면서 주 2일 이하로 일한 초단시간 근로자는 기준 기간이 24개월입니다.
        </li>
        <li>
          <strong>이직 사유</strong>: 권고사직, 해고, 계약기간 만료, 폐업처럼 본인 뜻과 달리 일자리를 잃어야 합니다. 스스로
          그만둔 경우에도 아래의 정당한 사유가 있으면 인정됩니다.
        </li>
        <li>
          <strong>근로 의사와 능력</strong>: 일할 의사와 능력이 있는데도 취업하지 못한 상태여야 하고, 재취업 활동을 해야
          합니다.
        </li>
      </ul>
      <p>
        형법이나 직무 관련 법률 위반, 회사에 큰 손해를 끼친 일, 장기간 무단결근처럼 본인의 중대한 잘못으로 해고되었거나,
        이직이나 창업을 위해 그만둔 경우에는 받을 수 없습니다. 또 65세가 된 뒤에 새로 고용된 사람은 구직급여 적용 대상이
        아닙니다. 65세 전부터 같은 회사에 계속 다녔다면 받을 수 있습니다.
      </p>

      <h2 id="just-reasons">자발적 퇴사라도 받을 수 있는 정당한 이직 사유</h2>
      <p>
        고용보험법 시행규칙 별표2가 정한 사유입니다. 해당하면 자진 퇴사라도 수급자격이 제한되지 않습니다. 고용센터는 급여명세서,
        진단서, 출퇴근 경로 같은 객관적 자료로 판단합니다.
      </p>
      <ul>
        <li>
          이직일 전 1년 안에 다음 일이 <strong>2개월 이상</strong> 있었던 경우: 근로조건이 채용 때보다 낮아짐, 임금체불,
          최저임금에 못 미치는 임금, 법정 연장근로 한도 위반, 휴업으로 평균임금의 70% 미만을 받음
        </li>
        <li>종교, 성별, 장애, 노조 활동 등을 이유로 한 불합리한 차별</li>
        <li>성희롱·성폭력 등 성적인 괴롭힘, 또는 근로기준법상 직장 내 괴롭힘을 당한 경우</li>
        <li>회사의 도산·폐업이 확실하거나 대량 감원이 예정된 경우</li>
        <li>
          사업 양도·합병, 일부 사업 폐지, 조직 축소, 경영 악화 등으로 회사가 퇴직을 권고하거나 희망퇴직을 모집해 그만둔 경우
        </li>
        <li>
          사업장 이전, 다른 지역 전근, 배우자·부양가족과 함께 살기 위한 이사 등으로 통근 왕복이 <strong>3시간 이상</strong>{" "}
          걸리게 된 경우
        </li>
        <li>부모나 동거 친족의 질병·부상으로 30일 이상 간호해야 하는데 휴가·휴직이 허용되지 않은 경우</li>
        <li>중대재해가 난 사업장이 시정명령을 받고도 고치지 않아 같은 위험에 노출된 경우</li>
        <li>질병, 부상, 체력 부족 등으로 업무가 어려운데 업무 전환이나 휴직이 허용되지 않은 경우 (의사 소견 등으로 확인)</li>
        <li>임신, 출산, 만 8세 이하(초등 2학년 이하) 자녀 육아, 병역 의무로 일하기 어려운데 휴가·휴직이 허용되지 않은 경우</li>
        <li>법령이 바뀌어 회사의 사업이 위법해진 경우</li>
        <li>정년이 되었거나 계약기간이 끝나 더 다닐 수 없게 된 경우</li>
        <li>그 밖에 같은 상황이라면 다른 근로자도 그만두었을 것이라고 객관적으로 인정되는 경우</li>
      </ul>

      <h2>실업급여 계산 방법</h2>
      <p>
        하루에 받는 구직급여(구직급여일액)는 퇴직 전 평균임금인 기초일액의 60%입니다. 여기에 나이와 가입기간으로 정해지는
        소정급여일수를 곱하면 총액이 됩니다.
      </p>
      <p className="formula">
        기초일액 = 이직 전 3개월 임금총액 ÷ 그 3개월의 총일수
        <br />
        1일 구직급여 = 기초일액(상한 {formatNumber(R2026.baseCap)}원) × 60%, 단 하한 미만이면 하한
        <br />
        하한 = 최저임금(시급) × 이직 전 1일 소정근로시간(최대 8시간) × 80%
        <br />총 수급액 = 1일 구직급여 × 소정급여일수
      </p>
      <p>
        3개월의 총일수는 이직일 다음 날(퇴직일)부터 거꾸로 센 3개월, 즉 이직일까지 3개월의 실제 달력 일수로, 89일에서
        92일 사이입니다. 예를 들어 2026년 4월 30일에 이직했다면 {APR30_PERIOD.start.m}월 {APR30_PERIOD.start.d}일부터 4월
        30일까지 {APR30_PERIOD.days}일입니다. 이 계산기는 월 평균 급여의 3배를 임금총액으로 보고 이 일수로 나눕니다. 2026년 10월
        31일에 이직했다면 산정기간은 8월 1일부터 10월 31일까지 {DEFAULT_EX.wageDays}일입니다. 월급이 300만원이면 900만원 ÷ {DEFAULT_EX.wageDays}일 ={" "}
        {formatNumber(DEFAULT_EX.baseDaily)}원이 기초일액이고, 60%인 {formatNumber(DEFAULT_EX.computedDaily)}원이 하한{" "}
        {formatNumber(DEFAULT_EX.floor)}원보다 적어 하한이 적용됩니다. 가입기간이 1~3년인 50세 미만이면 150일을 받아 총{" "}
        <strong>{formatNumber(DEFAULT_EX.total)}원</strong>입니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>2026년 이직, 계산 예시 (원 미만 버림)</caption>
          <thead>
            <tr>
              <th scope="col">상황</th>
              <th scope="col">기초일액</th>
              <th scope="col">1일 구직급여</th>
              <th scope="col">일수</th>
              <th scope="col">총액</th>
            </tr>
          </thead>
          <tbody>
            {EXAMPLES.map((ex) => {
              const b = dailyBenefit(ex.base, R2026, ex.hours);
              const days = benefitDays(ex.period, ex.over50);
              const how = b.floorApplied ? "하한" : b.capApplied ? "상한" : "60%";
              return (
                <tr key={ex.who}>
                  <td>{ex.who}</td>
                  <td>{formatWon(ex.base)}</td>
                  <td>
                    {formatWon(b.daily)} ({how})
                  </td>
                  <td>{days}일</td>
                  <td>{formatWon(b.daily * days)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="note">
        실제 기초일액은 회사가 고용센터에 내는 이직확인서의 평균임금으로 정해집니다. 상여금과 연차수당은 1년 치의 3/12이
        들어가고, 평균임금이 통상임금보다 적으면 통상임금을 씁니다. 원 미만 처리는 공식 규정을 찾지 못해 버림으로 계산했습니다.
      </p>

      <h2>2026년 실업급여 상한액과 하한액</h2>
      <p>
        2026년 1월 1일 이후 이직한 사람은 기초일액 상한이 {formatNumber(R2026.baseCap)}원으로 올라 하루 상한액이{" "}
        {formatNumber(CAP_2026)}원입니다(종전 {formatNumber(R2025.dailyCap)}원). 하한액은 이직일 당시 최저임금 시급에 이직 전 1일
        소정근로시간(최대 8시간)을 곱하고 80%를 적용해 정해지므로, 하루 8시간 근로자는 10,320원 × 8 × 80% ={" "}
        {formatNumber(FLOOR_2026)}원입니다. 그래서 하루 8시간 근로자는 기초일액이 {formatNumber(FLOOR_BASE_2026)}원보다 적으면
        하한을, {formatNumber(R2026.baseCap)}원을 넘으면 상한을 받고, 그 사이일 때만 기초일액의 60%를 받습니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">이직 연도</th>
              <th scope="col">최저임금(시급)</th>
              <th scope="col">하한(8시간)</th>
              <th scope="col">상한</th>
            </tr>
          </thead>
          <tbody>
            {[R2025, R2026, R2027].map((rule) => (
              <tr key={rule.year} className={rule.year === 2026 ? "is-current" : undefined}>
                <td>{rule.year}년</td>
                <td>{formatWon(rule.minWage)}</td>
                <td>{formatWon(dailyFloor(rule.minWage, 8))}</td>
                <td>{rule.capConfirmed ? formatWon(rule.dailyCap) : "미정"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        30일로 환산하면 2026년 상한은 월 {formatNumber(CAP_2026 * 30)}원, 하한은 월 {formatNumber(FLOOR_2026 * 30)}원입니다.
        하루 소정근로시간이 8시간보다 짧으면 하한도 그만큼 줄어듭니다. 주 5일 미만으로 일했다면 아래처럼 주
        근로시간으로 하루 시간을 다시 계산합니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>1일 소정근로시간별 하한액</caption>
          <thead>
            <tr>
              <th scope="col">1일 소정근로시간</th>
              <th scope="col">2026년 이직</th>
              <th scope="col">2027년 이직</th>
            </tr>
          </thead>
          <tbody>
            {floorHoursRows.map((h) => (
              <tr key={h}>
                <td>{h}시간</td>
                <td>{formatWon(dailyFloor(R2026.minWage, h))}</td>
                <td>{formatWon(dailyFloor(R2027.minWage, h))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 id="part-time-hours">주 3일·단시간 근로자의 하한액: 1일 소정근로시간 계산법</h2>
      <p>
        하한액의 기준인 이직 전 1일 소정근로시간은 근로계약서의 하루 근무시간을 그대로 쓰는 것이 아닙니다. 고용보험법 제45조
        제4항의 위임에 따라 시행규칙 제91조의2 제1항이 근로시간을 정한 방식별로 계산식을 두고 있고, 2023년 1월 1일 이후
        이직한 사람부터 적용됩니다.
      </p>
      <ul>
        <li>
          <strong>하루 단위</strong>(주 5일이나 6일을 매일 같은 시간으로 정한 경우): 그 시간
        </li>
        <li>
          <strong>주 단위</strong>: (주 소정근로시간 + 그 주의 유급휴일 시간) ÷ 48시간 × 8시간
        </li>
        <li>
          <strong>월 단위</strong>: (월 소정근로시간 + 그 달의 유급휴일 시간) ÷ 209시간 × 8시간
        </li>
        <li>
          <strong>주마다 근로시간이 다른 경우</strong>: (이직 전 4주의 소정근로시간 + 그 기간 유급휴일 시간) ÷ 28
        </li>
      </ul>
      <p>
        이렇게 구한 값이 소수이면 올림해 정수로 만들고, 8시간 이상이면 8시간으로 봅니다(급여기초임금일액 산정규정 제3조).
        예전에는 3시간 이하를 4시간으로 쳐 주었지만, 2023년 12월 1일 이후 이직한 사람부터는 1~3시간도 실제 시간대로
        계산합니다. 예를 들어 하루 8시간씩 주 3일 일했다면 주 24시간에 주휴시간{" "}
        {formatNumber(THREE_DAY.paidHoliday, 1)}시간을 더해 ÷ 48 × 8 = {formatNumber(THREE_DAY.average, 1)}시간, 올림해{" "}
        {THREE_DAY.hours}시간입니다. 그래서 2026년 하한은 하루 {formatNumber(FLOOR_2026)}원이 아니라{" "}
        <strong>{formatNumber(THREE_DAY_FLOOR_2026)}원</strong>입니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>주 단위로 정한 경우, 1주 소정근로시간별 하한액</caption>
          <thead>
            <tr>
              <th scope="col">1주 소정근로시간</th>
              <th scope="col">주휴시간</th>
              <th scope="col">1일 소정근로시간</th>
              <th scope="col">2026년 하한</th>
              <th scope="col">2027년 하한</th>
            </tr>
          </thead>
          <tbody>
            {WEEKLY_ROWS.map(({ weekly, who }) => {
              const d = dailyScheduledHours("week", weekly)!;
              return (
                <tr key={weekly} className={weekly === 24 ? "is-current" : undefined}>
                  <td>
                    {weekly}시간{who ? ` (${who})` : ""}
                  </td>
                  <td>{formatNumber(d.paidHoliday, 1)}시간</td>
                  <td>
                    {d.hours === d.average ? `${d.hours}시간` : `${formatNumber(d.average, 2)} → ${d.hours}시간`}
                  </td>
                  <td>{formatWon(dailyFloor(R2026.minWage, d.hours))}</td>
                  <td>{formatWon(dailyFloor(R2027.minWage, d.hours))}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="note">
        주휴시간은 1주 소정근로시간이 15시간 이상일 때 주 소정근로시간 ÷ 40 × 8로 넣었습니다. 실제 인정 시간은 회사가
        이직확인서에 적은 소정근로시간을 바탕으로 고용센터가 정합니다.
      </p>

      <h2>소정급여일수: 며칠 동안 받나</h2>
      <p>
        받는 일수는 이직일 당시 나이와 고용보험 가입기간(피보험기간)으로 정해집니다(고용보험법 제50조, 별표1). 장애인고용촉진법상
        장애인은 나이와 관계없이 50세 이상과 같은 일수를 받습니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">가입기간</th>
              <th scope="col">50세 미만</th>
              <th scope="col">50세 이상·장애인</th>
            </tr>
          </thead>
          <tbody>
            {INSURED_PERIOD_OPTIONS.map((o) => (
              <tr key={o.value}>
                <td>{o.label}</td>
                <td>{benefitDays(o.value, false)}일</td>
                <td>{benefitDays(o.value, true)}일</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        구직급여는 실업 신고일부터 7일의 대기기간이 지난 뒤부터 계산하며, 이직일 다음 날부터 12개월 안에 소정급여일수만큼
        받습니다. 임신·출산·육아나 질병 등으로 당장 일할 수 없다면 수급기간 안에 신고해 최대 4년까지 미룰 수 있습니다.
      </p>

      <h2>실업급여 신청 절차</h2>
      <ol>
        <li>
          <strong>이직확인서 확인</strong>: 회사가 고용센터에 피보험자격 상실신고와 이직확인서를 내야 합니다. 이직 사유가
          사실과 맞게 적혔는지 확인하세요.
        </li>
        <li>
          <strong>구직 신청</strong>: <a href="https://www.work24.go.kr">고용24</a>(옛 워크넷)에 회원가입하고 구직 신청을 합니다.
        </li>
        <li>
          <strong>수급자격 신청자 교육</strong>: 고용24에서 온라인 교육을 듣습니다.
        </li>
        <li>
          <strong>수급자격 인정 신청</strong>: 신분증을 가지고 거주지 관할 고용센터를 방문해 신청합니다. 보통 이날을 실업
          신고일로 보고, 여기서부터 대기기간 7일을 셉니다.
        </li>
        <li>
          <strong>실업인정과 지급</strong>: 고용센터가 정한 날마다(1~4주 간격) 재취업 활동 내역을 내고 실업인정을 받으면, 그
          기간의 구직급여가 계좌로 들어옵니다. 첫 실업인정은 대개 고용센터에 출석해서 하고, 이후에는 온라인으로도 할 수
          있습니다.
        </li>
      </ol>
      <p>
        소정급여일수를 절반 이상 남기고 재취업해 12개월 이상 일하면, 남은 구직급여의 절반을 조기재취업수당으로 받을 수 있습니다.
      </p>

      <h2>2027년 실업급여 개편안 (정부안, 미확정)</h2>
      <p>
        2027년 최저임금이 시간당 {formatNumber(R2027.minWage)}원으로 정해지면서 8시간 하한액이 {formatNumber(FLOOR_2027)}원이
        되어, 현행 상한 {formatNumber(R2027.dailyCap)}원보다 높아집니다. 고용노동부는 2026년 9월 1일 고용보험위원회에 다음과
        같은 개편 방안을 올렸고, 연내 법률과 시행령 개정을 목표로 하고 있습니다. 아직 확정된 내용이 아닙니다.
      </p>
      <ul>
        <li>
          상한액을 정액 대신 하한액의 103%로 연동합니다. 2027년이라면 하루 약 {formatNumber(PROPOSAL_CAP_2027)}원입니다(셈셈
          추산).
        </li>
        <li>
          무급휴일을 빼고 주 6일분만 지급합니다. 총 지급 일수와 총액은 같지만 더 긴 기간에 나눠 받아, 30일 기준 월 지급액이
          하한 약 {koreanWon(Math.round(sixDayMonthly(FLOOR_2027) / 10_000) * 10_000)}, 상한 약{" "}
          {koreanWon(Math.round(sixDayMonthly(PROPOSAL_CAP_2027) / 10_000) * 10_000)}으로 줄어듭니다.
        </li>
        <li>근로자와 사업주가 각각 내는 실업급여 보험료율을 0.9%에서 1.0%로 올립니다.</li>
      </ul>
      <p>
        이 계산기는 2027년 이직일을 넣으면 현행 법령대로 계산하고 결과에 ‘예상’이라고 표시합니다. 현행 법령에서는 하한이 상한보다
        우선하므로 하루 8시간 근로자는 {formatNumber(FLOOR_2027)}원을 받게 됩니다. 정부안이 통과될 때의 하루 금액과 월
        지급액도 함께 보여 줍니다.
      </p>

      <h2>{ANNUAL_BASE_RULE_YEAR}년 이직부터 기초일액은 1년 보수 기준 (법 개정 완료)</h2>
      <p>
        기초일액을 이직 전 3개월 평균임금 대신 1년간의 보수로 계산하는 방식은 개편안이 아니라 이미 법률로 정해졌습니다. 2026년
        3월 17일 공포된 고용보험법 일부개정법률(법률 {ANNUAL_BASE_LAW_NO})은 제45조 제1항을 고쳐, 마지막 이직일 전 1년간
        신고된 월 보수를 모두 더해 대통령령으로 정하는 산정기간의 총 일수로 나눈 금액(보수일액)을 기초일액으로 하도록
        했습니다. 이 조항은 {ANNUAL_BASE_RULE_YEAR}년 1월 1일부터 시행됩니다(부칙 제1조). 최저기초일액(이직 전 1일
        소정근로시간 × 최저임금)을 정한 제45조 제4항은 이 개정에서 바뀌지 않았습니다.
      </p>
      <p>
        부칙 제3조는 {ANNUAL_BASE_RULE_YEAR}년 1월 1일 전에 이직한 근로자의 구직급여는 종전 규정에 따라 산정한다고 정하고
        있습니다. 따라서 {ANNUAL_BASE_RULE_YEAR - 1}년 12월 31일까지 이직하면, 즉 이 계산기가 받는 모든 이직일은 지금처럼 이직
        전 3개월 평균임금으로 계산합니다. 반면 위의 상한 103% 연동, 주 6일분 지급, 보험료율 1.0% 인상은 2026년 9월 1일
        고용보험위원회에 올라간 정부안일 뿐 아직 법령으로 정해지지 않았습니다.
      </p>

      <h2>근거 법령과 참고 자료</h2>
      <ul>
        <li>
          <a href="https://www.law.go.kr/법령/고용보험법">고용보험법</a> 제40조(수급 요건), 제45조(기초일액), 제46조(구직급여일액),
          제48조(수급기간), 제49조(대기기간), 제50조와 별표1(소정급여일수)
        </li>
        <li>
          <a href="https://www.law.go.kr/법령/고용보험법/(21473,20260317)">고용보험법 일부개정법률(법률 제21473호, 2026.3.17)</a>{" "}
          제45조 개정규정(2028.1.1 시행), 부칙 제1조(시행일)·제3조(구직급여의 산정에 관한 경과조치)
        </li>
        <li>
          <a href="https://www.law.go.kr/법령/고용보험법시행규칙">고용보험법 시행규칙</a> 제91조의2(이직 전 1일 소정근로시간의
          산정), 별표2(정당한 이직 사유)
        </li>
        <li>
          <a href="https://www.law.go.kr/LSW/admRulInfoP.do?admRulSeq=2100000232090">
            급여기초임금일액 산정규정(고용노동부예규 제221호, 2023.12.1)
          </a>{" "}
          제3조(소수점 올림, 8시간 상한)
        </li>
        <li>
          <a href="https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=722&ccfNo=2&cciNo=3&cnpClsNo=2">
            찾기쉬운 생활법령정보 – 구직급여일액
          </a>
          ,{" "}
          <a href="https://www.moel.go.kr/news/enews/report/enewsView.do?news_seq=18736">고용노동부 보도자료(2025.12.16)</a>
        </li>
      </ul>
    </ToolShell>
  );
}
