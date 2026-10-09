import type { Metadata } from "next";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber } from "@/lib/format";
import {
  freelanceTax,
  hoursLabel,
  MIN_WAGE_2026,
  MIN_WAGE_2027,
  payForWeeklyHours,
  probationWage,
} from "@/lib/calc/hourly-wage";
import { HourlyWageCalculator } from "./HourlyWageCalculator";
import { hourlyBasis, HoursLinkGrid, MinimumWageYearTable, WeeklyHoursTable } from "./tables";

const p40 = payForWeeklyHours(40, MIN_WAGE_2026);
const p40y27 = payForWeeklyHours(40, MIN_WAGE_2027);
const p20 = payForWeeklyHours(20, MIN_WAGE_2026);
const p15 = payForWeeklyHours(15, MIN_WAGE_2026);
const p14 = payForWeeklyHours(14, MIN_WAGE_2026);
const p10 = payForWeeklyHours(10, MIN_WAGE_2026);
const tax40 = freelanceTax(p40.monthlyGross);

export const metadata: Metadata = pageMetadata({
  title: "시급 주휴수당 계산기 - 알바 월급·주급 계산 (2026 최저시급)",
  description: `시급과 하루 근무시간, 주 근무일수를 넣으면 주휴수당을 포함한 주급과 월급을 계산합니다. 2026년 최저시급 10,320원으로 주 40시간이면 월 ${formatNumber(p40.monthlyGross)}원, 주 20시간이면 ${formatNumber(p20.monthlyGross)}원. 3.3%·4대보험 공제 후 실수령액까지 확인하세요.`,
  path: "/hourly-wage/",
  keywords: ["주휴수당 계산기", "시급 계산기", "알바 월급 계산기", "주휴수당 계산법", "2026 최저시급 월급", "알바 3.3%"],
});

const FAQ: FaqItem[] = [
  {
    q: "주 15시간 일하면 주휴수당을 받을 수 있나요?",
    a: `네. 1주 소정근로시간이 15시간 이상이고 그 주에 정해진 날을 모두 출근했다면 받습니다. 주 15시간이면 15 ÷ 40 × 8 = 3시간분이라 2026년 최저시급으로 ${formatNumber(p15.juhyuPay)}원입니다. 14시간처럼 15시간에 못 미치면 주휴수당이 없습니다.`,
  },
  {
    q: "2026년 최저시급으로 한 달 일하면 월급이 얼마인가요?",
    a: `주 40시간 일하면 주휴수당을 포함한 월 209시간 기준 ${formatNumber(p40.monthlyGross)}원입니다. 2027년에는 시급 10,700원이라 ${formatNumber(p40y27.monthlyGross)}원이 됩니다. 4대보험과 소득세를 떼면 실수령액은 조금 줄어듭니다.`,
  },
  {
    q: "5인 미만 사업장도 주휴수당을 줘야 하나요?",
    a: "네. 주휴일을 규정한 근로기준법 제55조는 상시 4명 이하 사업장에도 적용됩니다. 반면 연장·야간·휴일근로 50% 가산수당과 연차휴가는 5인 이상 사업장에만 적용됩니다.",
  },
  {
    q: "지각하거나 조퇴하면 주휴수당이 없어지나요?",
    a: "지각과 조퇴는 결근이 아니어서 그 주 주휴수당은 그대로 생깁니다. 다만 일하지 않은 시간만큼 임금을 빼는 것은 가능합니다. 정해진 출근일에 아예 나오지 않으면 결근이라 그 주 주휴수당이 없습니다.",
  },
  {
    q: "알바인데 3.3%를 떼는 것이 맞나요?",
    a: "3.3%는 사업소득(프리랜서)에 대한 원천징수입니다. 정해진 시간과 장소에서 사장의 지시를 받으며 일하는 알바는 근로자라서 원칙적으로 근로소득으로 신고하고 요건에 맞으면 4대보험에 가입해야 합니다. 3.3%로 처리했더라도 실제 근로자라면 주휴수당, 퇴직금 같은 근로기준법상 권리는 그대로 있습니다.",
  },
  {
    q: "알바를 그만두는 마지막 주에도 주휴수당을 받나요?",
    a: "1주 동안 근로관계가 유지되고 그 주의 소정근로일을 모두 출근했다면, 다음 주에 출근할 예정이 없어도 주휴수당이 생긴다는 것이 고용노동부 해석입니다. 주 중간에 그만두면 그 주 주휴수당은 생기지 않습니다.",
  },
];

export default function HourlyWagePage() {
  return (
    <ToolShell
      slug="hourly-wage"
      h1="시급·주휴수당 계산기 (알바 월급 계산기)"
      lead={`시급과 근무시간을 넣으면 주휴수당을 포함한 주급과 월급, 3.3%나 4대보험을 뗀 실수령액까지 계산해 드려요. 2026년 최저시급 10,320원으로 주 40시간 일하면 월 ${formatNumber(p40.monthlyGross)}원입니다.`}
      basis={hourlyBasis()}
      calculator={<HourlyWageCalculator />}
      faq={FAQ}
      appCategory="FinanceApplication"
    >
      <h2>주휴수당 조건과 계산 공식</h2>
      <p>
        근로기준법 제55조는 1주에 평균 1회 이상 유급휴일을 주도록 하고, 시행령 제30조는 그 휴일을 1주 동안 정해진 근로일을
        개근한 근로자에게 주도록 정합니다. 이 유급휴일에 받는 하루치 임금이 주휴수당입니다. 받으려면 두 가지가 모두 맞아야 합니다.
      </p>
      <ul>
        <li>
          <strong>1주 소정근로시간 15시간 이상</strong>: 4주 평균으로 판단합니다. 근로기준법 제18조 제3항에 따라 15시간 미만이면 주휴가
          적용되지 않습니다.
        </li>
        <li>
          <strong>그 주의 소정근로일 개근</strong>: 출근하기로 한 날을 모두 나와야 합니다. 지각·조퇴는 결근이 아닙니다.
        </li>
      </ul>
      <p className="formula">주휴수당 = (1주 소정근로시간 ÷ 40) × 8시간 × 시급 &nbsp;(최대 8시간분)</p>
      <p>
        예를 들어 하루 4시간씩 주 5일, 주 20시간을 일하면 20 ÷ 40 × 8 = 4시간분이 주휴시간입니다. 2026년 최저시급이면 4 × 10,320 ={" "}
        <strong>{formatNumber(p20.juhyuPay)}원</strong>이고, 주급은 20시간분 {formatNumber(p20.weeklyBase)}원을 더해{" "}
        {formatNumber(p20.weeklyTotal)}원입니다. 주 40시간 이상이면 주휴수당은 8시간분, {formatNumber(p40.juhyuPay)}원에서 더 늘지
        않습니다. 사장이 그때그때 시킨 추가 근무는 소정근로시간이 아니라서 주휴시간 계산에 들어가지 않습니다. 주휴수당은 상시 근로자 4명
        이하 사업장에도 똑같이 적용됩니다.
      </p>

      <h2>주 15시간 미만 초단시간 근로자</h2>
      <p>
        4주 평균 1주 소정근로시간이 15시간 미만인 초단시간 근로자는 주휴수당이 없습니다. 같은 이유로 연차휴가(근로기준법 제60조)와
        퇴직금(근로자퇴직급여 보장법 제4조)도 적용되지 않습니다. 주 14시간 알바는 2026년 최저시급으로 월{" "}
        {formatNumber(p14.monthlyGross)}원인데, 1시간 늘려 주 15시간이 되면 주휴수당 3시간분이 붙어 월{" "}
        {formatNumber(p15.monthlyGross)}원으로 {formatNumber(p15.monthlyGross - p14.monthlyGross)}원 늘어납니다.
      </p>
      <p>
        초단시간 근로자는 국민연금과 건강보험 직장가입 대상도 아닙니다. 고용보험은 원칙적으로 제외되지만 3개월 이상 계속 일하면
        가입합니다. 정부가 초단시간 근로자에게 주휴수당과 연차를 넓히는 방안을 추진하고 있지만 2026년 10월 현재 법은 바뀌지
        않았습니다.
      </p>

      <h2>월급 환산: 왜 209시간인가</h2>
      <p>
        월급은 1주에 돈을 받는 시간(근무시간 + 주휴시간)에 한 달 평균 주 수를 곱해 구합니다. 1년은 365일이라 한 달은 평균 365 ÷ 7 ÷
        12 = 약 4.345주입니다.
      </p>
      <p className="formula">월 환산 시간 = (1주 소정근로시간 + 주휴시간) × 365 ÷ 7 ÷ 12</p>
      <p>
        주 40시간이면 (40 + 8) × 365 ÷ 7 ÷ 12 = 208.57시간이고, 반올림한 <strong>209시간</strong>이 최저임금 월 환산액의 기준입니다.
        이 계산기는 다른 근무시간도 같은 방식으로 시간 단위에서 반올림합니다. 주 20시간이면 (20 + 4) × 365 ÷ 7 ÷ 12 = 104.29시간, 즉
        104시간이라 월 {formatNumber(p20.monthlyGross)}원입니다. 다만 월 50시간이 안 되는 짧은 근무는 1시간 단위 반올림만으로 월급이
        1% 넘게 달라지므로 소수점 둘째 자리까지 씁니다. 주 10시간이면 월 {hoursLabel(p10.monthlyHours)}시간,{" "}
        {formatNumber(p10.monthlyGross)}원입니다. 실제 월급은 그 달에 근무일이 4주치인지 5주치인지에 따라 조금씩 달라지므로, 주급으로
        받는 알바라면 주급 합계를 기준으로 보는 것이 정확합니다.
      </p>
      <WeeklyHoursTable />
      <p className="note">월급은 세전 금액이며, 주휴수당은 개근을 가정했습니다.</p>

      <h2>2026·2027 최저임금</h2>
      <p>
        2026년 최저임금은 시간당 <strong>10,320원</strong>으로 2025년보다 290원(2.9%) 올랐고, 2027년 최저임금은{" "}
        <strong>10,700원</strong>(380원, 3.7% 인상)으로 2026년 8월 5일 고시됐습니다. 업종과 사업장 규모에 상관없이 근로자를 1명이라도
        쓰는 모든 사업장에 적용됩니다.
      </p>
      <MinimumWageYearTable />
      <p className="note">
        출처:{" "}
        <a href="https://www.minimumwage.go.kr/minWage/policy/decisionMain.do" target="_blank" rel="noopener noreferrer">
          최저임금위원회 연도별 최저임금 결정현황
        </a>
      </p>

      <h2>수습 기간에는 최저임금의 90%까지 줄 수 있을까</h2>
      <p>
        최저임금법 제5조 제2항과 시행령 제3조에 따라 아래 조건을 모두 갖춘 경우에만 수습 기간 동안 최저임금의 90%까지 줄 수 있습니다.
        2026년에는 시급 {formatNumber(probationWage(MIN_WAGE_2026))}원, 2027년에는 {formatNumber(probationWage(MIN_WAGE_2027))}원이
        하한입니다.
      </p>
      <ul>
        <li>근로계약 기간이 1년 이상일 것 (1년 미만 단기 알바는 수습이어도 감액 불가)</li>
        <li>수습을 시작한 날부터 3개월 이내일 것</li>
        <li>고용노동부 장관이 고시한 단순노무업무가 아닐 것 (주방 보조, 청소, 배달 같은 일은 감액 불가)</li>
      </ul>

      <h2>알바 3.3%와 4대보험, 무엇이 다른가</h2>
      <p>
        <strong>3.3%</strong>는 사업소득을 줄 때 떼는 세금으로 소득세 3%(소득세법 제129조)와 그 10%인 지방소득세 0.3%로 이루어지며
        각각 10원 미만은 버립니다. 2026년 최저시급 주 40시간 월급 {formatNumber(p40.monthlyGross)}원이라면 소득세{" "}
        {formatNumber(tax40.incomeTax)}원, 지방소득세 {formatNumber(tax40.localTax)}원을 떼고 {formatNumber(p40.netFreelance)}원을
        받습니다. 2024년 7월 지급분부터는 인적용역 사업소득에 1,000원 미만 소액부징수가 적용되지 않아 금액이 적어도 원천징수합니다. 떼인
        세금은 다음 해 5월 종합소득세 신고 때 정산합니다.
      </p>
      <p>
        <strong>4대보험+소득세</strong>는 근로자로 신고할 때입니다. 2026년 기준 국민연금 4.75%, 건강보험 3.595%, 장기요양보험(건강보험료의
        약 13.14%), 고용보험 0.9%를 내고, 소득세는 간이세액표에 따라 뗍니다. 같은 월급이면 실수령액은{" "}
        {formatNumber(p40.netInsured)}원으로 3.3%보다 적지만, 국민연금 가입 기간이 쌓이고 실업급여를 받을 수 있으며 회사가 같은 금액
        이상을 함께 냅니다.
      </p>
      <p>
        근로자인지는 계약서 이름이 아니라 실제로 정해진 시간과 장소에서 지시를 받으며 일하는지로 판단합니다. 3.3%로 처리됐더라도 실제
        근로자라면 최저임금, 주휴수당, 퇴직금 같은 권리는 그대로 인정됩니다.
      </p>

      <h2>연장·야간·휴일근로 (5인 이상 사업장)</h2>
      <p>
        하루 8시간, 1주 40시간을 넘는 연장근로와 밤 10시부터 오전 6시 사이 야간근로, 8시간 이내의 휴일근로에는 시급의 50%를 더
        줘야 하고, 휴일에 8시간을 넘겨 일한 시간은 100%를 더 줘야 합니다(근로기준법 제56조). 단시간 근로자는 계약한 시간을 넘겨 일하면 40시간 이내라도 50%를 더 받습니다(기간제법 제6조).
        이 가산수당은 상시 5인 이상 사업장에만 적용되며, 이 계산기는 모든 시간을 기본 시급으로 계산하고 연장근로 가산분은 따로 알려
        드립니다.
      </p>

      <h2>근거 법령</h2>
      <ul>
        <li>
          <a href="https://www.law.go.kr/법령/근로기준법/제55조" target="_blank" rel="noopener noreferrer">
            근로기준법 제55조 (휴일)
          </a>
          ,{" "}
          <a href="https://www.law.go.kr/법령/근로기준법시행령/제30조" target="_blank" rel="noopener noreferrer">
            시행령 제30조
          </a>
          ,{" "}
          <a href="https://www.law.go.kr/법령/근로기준법/제18조" target="_blank" rel="noopener noreferrer">
            제18조 (단시간근로자)
          </a>
        </li>
        <li>
          <a href="https://www.law.go.kr/법령/최저임금법/제5조" target="_blank" rel="noopener noreferrer">
            최저임금법 제5조 (수습 감액)
          </a>
          ,{" "}
          <a href="https://www.law.go.kr/법령/최저임금법시행령/제3조" target="_blank" rel="noopener noreferrer">
            시행령 제3조
          </a>
        </li>
        <li>
          <a href="https://www.law.go.kr/법령/소득세법/제129조" target="_blank" rel="noopener noreferrer">
            소득세법 제129조 (원천징수세율)
          </a>
          ,{" "}
          <a href="https://www.law.go.kr/법령/소득세법/제86조" target="_blank" rel="noopener noreferrer">
            제86조 (소액 부징수)
          </a>
        </li>
        <li>
          <a href="https://www.4insure.or.kr/" target="_blank" rel="noopener noreferrer">
            4대사회보험 정보연계센터 (보험료 모의계산)
          </a>
        </li>
      </ul>

      <h2>주 근무시간별 알바 월급 바로 보기</h2>
      <HoursLinkGrid />
    </ToolShell>
  );
}
