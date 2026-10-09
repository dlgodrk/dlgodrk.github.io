import type { Metadata } from "next";
import Link from "next/link";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber, formatWon, koreanWon } from "@/lib/format";
import { SALARY_PAGE_MANWON } from "@/lib/calc/salary";
import {
  calcMinimumWage,
  exactHoursLabel,
  INCLUSION_SCHEDULE,
  juhyuHours,
  MINIMUM_WAGE_HISTORY,
  monthlyHours,
  monthlyHoursExact,
  nearestSalaryManwon,
  netMonthly,
  RATE_2027_NOTE,
  WEEKLY_HOURS_TABLE,
  yearOverYear,
} from "@/lib/calc/minimum-wage";
import { HOURLY_PAY_MONTH, ruleMonthLabel } from "@/lib/calc/hourly-wage";
import { MinimumWageCalculator } from "./MinimumWageCalculator";

export const metadata: Metadata = pageMetadata({
  title: "최저임금 계산기 2026·2027 - 최저시급 10,320원 월급 환산",
  description:
    "2026년 최저시급 10,320원, 2027년 10,700원(3.7% 인상)으로 일급·주급·월급·연봉을 바로 환산합니다. 주 40시간 월급은 2026년 2,156,880원, 2027년 2,236,300원이고 수습 90%와 단시간 근무도 계산합니다.",
  path: "/minimum-wage/",
  keywords: [
    "최저임금 계산기",
    "2026 최저임금",
    "2027 최저임금",
    "최저시급",
    "최저임금 월급",
    "최저임금 209시간",
    "최저임금 실수령액",
    "수습 최저임금",
    "최저임금 인상률",
    "최저임금 연도별",
  ],
});

/** Weekly hours that have a landing page at /hourly-wage/<hours>/ (subset of that tool's page list). */
const HOURLY_PAGE_LINKS = new Set([10, 15, 20, 25, 30, 35, 40]);

/** "2026년 10월분" — the fixed month of the 2026 net-pay figures on this static page. */
const STATIC_MONTH = `${ruleMonthLabel(HOURLY_PAY_MONTH)}분`;

const FULL = { weeklyHours: 40, dailyHours: 8 };
const y26 = calcMinimumWage({ year: 2026, ...FULL });
const y27 = calcMinimumWage({ year: 2027, ...FULL });
const p26 = calcMinimumWage({ year: 2026, ...FULL, probation: true });
const p27 = calcMinimumWage({ year: 2027, ...FULL, probation: true });
const yoy = yearOverYear(FULL);
/** 2026년 10월분 net (static page basis month). */
const net26 = netMonthly(y26.monthly, 40, 2026, HOURLY_PAY_MONTH);
/** 2027 예상 net — the same figure the 시급·주휴수당 계산기 shows for 10,700원 × 주 40시간. */
const net27 = netMonthly(y27.monthly, 40, 2027);
const pt20 = calcMinimumWage({ year: 2026, weeklyHours: 20, dailyHours: 4 });
const pt15 = calcMinimumWage({ year: 2026, weeklyHours: 15, dailyHours: 3 });
/** 주 20시간 pay if the 0.01h display value (104.29) were multiplied instead of the exact hours. */
const pt20ShownHoursPay = Math.round(pt20.hourly * pt20.monthlyHours);

/** 104.29 → "104.29", 182.5 → "182.5", 209 → "209" */
function hoursText(h: number): string {
  return formatNumber(h, 2);
}

const FAQ: FaqItem[] = [
  {
    q: "2026년 최저임금 월급은 얼마인가요?",
    a: `주 40시간 근무 기준 월 ${formatWon(y26.monthly)}(세전)입니다. 시급 10,320원에 주휴시간을 포함한 월 209시간을 곱한 금액입니다. 비과세 수당이 없는 1인 가구라면 ${STATIC_MONTH} 요율로 4대보험과 소득세를 떼고 약 ${formatWon(net26.net)}을 받습니다.`,
  },
  {
    q: "2027년 최저임금은 얼마인가요?",
    a: `시급 10,700원으로 2026년보다 380원(3.7%) 오릅니다. 주 40시간 월 환산액은 ${formatWon(y27.monthly)}으로 ${formatWon(yoy.monthly)} 늘어납니다. 2026년 7월 14일 최저임금위원회가 의결했고 8월 5일 확정 고시되어 2027년 1월 1일부터 적용됩니다. 국민연금 근로자 부담이 5.0%로 오르는 것을 반영하면 세후 실수령액은 약 ${formatWon(net27.net)}으로 예상됩니다.`,
  },
  {
    q: "최저임금 월급 209시간은 어떻게 나온 건가요?",
    a: `주 40시간 일하면 유급 주휴시간 8시간이 더해져 1주 유급시간이 48시간입니다. 1년은 365 ÷ 7 = 약 52.14주이므로 한 달 평균은 48 × 365 ÷ 7 ÷ 12 = 약 208.57시간이 되고, 이를 정수로 맞춘 209시간이 최저임금 고시의 월 환산 기준입니다. 209시간은 주 40시간 근무에만 씁니다. 주 20시간이라면 (20 + 4) × 365 ÷ 7 ÷ 12 = 약 ${hoursText(pt20.monthlyHours)}시간이고, 월급은 이 시간을 반올림하지 않은 정확한 값(${exactHoursLabel(pt20.monthlyPayHours)}시간)에 시급을 곱해 원 미만만 반올림한 ${formatWon(pt20.monthly)}(2026년)입니다.`,
  },
  {
    q: "식대나 상여금도 최저임금에 포함되나요?",
    a: "매월 1회 이상 정기적으로 지급하는 상여금과 현금으로 주는 식대·교통비 같은 복리후생비는 2024년부터 전액 최저임금에 포함됩니다. 분기나 연 단위로 주는 상여금, 연장·야간·휴일근로수당, 현물로 제공하는 식사는 포함되지 않습니다.",
  },
  {
    q: "수습기간에는 최저임금의 90%만 줘도 되나요?",
    a: "근로계약 기간을 1년 이상으로 정했거나 기간을 정하지 않은 정규직이고, 수습 시작일부터 3개월 이내일 때만 가능합니다. 1년 미만 계약직·아르바이트와 청소·경비·배달 같은 단순노무 직종은 수습이어도 100%를 줘야 합니다. 2026년 수습 최저시급은 9,288원, 2027년은 9,630원입니다.",
  },
  {
    q: "5인 미만 사업장이나 아르바이트도 최저임금을 받아야 하나요?",
    a: "네. 최저임금은 근로자를 1명 이상 쓰는 모든 사업장에 적용되며 정규직, 계약직, 아르바이트, 외국인, 청소년 모두 같습니다. 동거하는 친족만 쓰는 사업과 가사사용인 등 법에서 정한 예외만 빠집니다.",
  },
];

export default function MinimumWagePage() {
  const history = [...MINIMUM_WAGE_HISTORY].filter((h) => h.year >= 2017).reverse();
  const salary26 = nearestSalaryManwon(y26.annual);
  const salary27 = nearestSalaryManwon(y27.annual);
  const salaryLinks = [salary26, salary27].filter((m, i, a) => SALARY_PAGE_MANWON.includes(m) && a.indexOf(m) === i);

  return (
    <ToolShell
      slug="minimum-wage"
      h1="2026·2027 최저임금 계산기 (최저시급 10,320원 → 10,700원)"
      lead="2026년 최저시급은 10,320원(월 2,156,880원), 2027년은 10,700원(월 2,236,300원)이에요. 근무시간을 넣으면 일급·주급·월급·연봉으로 바로 바꿔 드려요."
      basis={`2026년·2027년 최저임금 고시(고용노동부) 기준 · 표의 실수령액은 ${STATIC_MONTH} 4대보험 요율(2027년은 예상) · 2026년 10월 9일 확인`}
      calculator={<MinimumWageCalculator />}
      faq={FAQ}
      appCategory="FinanceApplication"
    >
      <h2>2026·2027 최저임금 한눈에 보기</h2>
      <p>
        최저임금은 시간급으로 정하고, 일급·주급·월급은 시간급에 근무시간을 곱해 환산합니다. 아래는 주 40시간(1일 8시간, 주
        5일) 근무 기준입니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">구분</th>
              <th scope="col">2026년</th>
              <th scope="col">2027년</th>
              <th scope="col">인상액</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>시급</td>
              <td>{formatWon(y26.hourly)}</td>
              <td>{formatWon(y27.hourly)}</td>
              <td>+{formatWon(yoy.hourly)}</td>
            </tr>
            <tr>
              <td>일급 (8시간)</td>
              <td>{formatWon(y26.daily)}</td>
              <td>{formatWon(y27.daily)}</td>
              <td>+{formatWon(yoy.daily)}</td>
            </tr>
            <tr>
              <td>주급 (주휴 포함 48시간)</td>
              <td>{formatWon(y26.weekly)}</td>
              <td>{formatWon(y27.weekly)}</td>
              <td>+{formatWon(yoy.weekly)}</td>
            </tr>
            <tr className="is-current">
              <td>월급 (209시간)</td>
              <td>{formatWon(y26.monthly)}</td>
              <td>{formatWon(y27.monthly)}</td>
              <td>+{formatWon(yoy.monthly)}</td>
            </tr>
            <tr>
              <td>연봉 환산 (월급 × 12)</td>
              <td>{formatWon(y26.annual)}</td>
              <td>{formatWon(y27.annual)}</td>
              <td>+{formatWon(yoy.annual)}</td>
            </tr>
            <tr>
              <td>수습 시급 (90%)</td>
              <td>{formatWon(p26.hourly)}</td>
              <td>{formatWon(p27.hourly)}</td>
              <td>+{formatWon(p27.hourly - p26.hourly)}</td>
            </tr>
            <tr>
              <td>수습 월급 (90%)</td>
              <td>{formatWon(p26.monthly)}</td>
              <td>{formatWon(p27.monthly)}</td>
              <td>+{formatWon(p27.monthly - p26.monthly)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>최저임금 월급 계산식 (209시간)</h2>
      <p>
        월급으로 받는 근로자의 최저임금은 1주 유급시간을 한 달 평균으로 바꾼 ‘월 환산 시간’에 시급을 곱해 계산합니다. 주 40시간
        일하면 유급 주휴시간 8시간이 더해져 1주 유급시간은 48시간입니다.
      </p>
      <p className="formula">월 환산 시간 = (주 소정근로시간 + 주휴시간) × 365 ÷ 7 ÷ 12</p>
      <p>
        (40 + 8) × 365 ÷ 7 ÷ 12 = {formatNumber(monthlyHoursExact(40), 2)}시간이고, 이를 정수로 맞춘{" "}
        <strong>209시간</strong>이 최저임금 고시의 월 환산 기준입니다. 그래서 2026년은 10,320원 × 209 ={" "}
        <strong>{formatWon(y26.monthly)}</strong>, 2027년은 10,700원 × 209 = <strong>{formatWon(y27.monthly)}</strong>
        입니다.
      </p>
      <p>
        주휴시간은 1주 소정근로시간이 15시간 이상이고 그 주를 개근했을 때 ‘주 소정근로시간 ÷ 40 × 8시간’(최대 8시간)만큼
        생깁니다. 단시간 근로자도 같은 식으로 계산합니다. 최저임금법 시행령 제5조 제1항 제3호는 이 공식만 정하고 끝수 처리
        방법은 정하지 않습니다. 그래서 이 계산기는 209시간을 주 40시간(주휴 8시간 포함)에만 쓰고, 다른 근무시간은 1시간
        단위로 올리거나 반올림하지 않은 정확한 월 환산 시간에 시급을 곱한 뒤 원 미만만 반올림합니다. 월 환산 시간은 소수 둘째
        자리까지 보여 드립니다. 주 20시간이면 (20 + 4) × 365 ÷ 7 ÷ 12 = {exactHoursLabel(pt20.monthlyPayHours)}시간(약{" "}
        {hoursText(pt20.monthlyHours)}시간)이라 2026년 최저 월급은 10,320원 × {exactHoursLabel(pt20.monthlyPayHours)} ={" "}
        {formatNumber(pt20.hourly * pt20.monthlyPayHours, 2)}원, <strong>{formatWon(pt20.monthly)}</strong>입니다. 주
        15시간이면 (15 + 3) × 365 ÷ 7 ÷ 12 = 약 {hoursText(pt15.monthlyHours)}시간이라 <strong>{formatWon(pt15.monthly)}</strong>
        입니다.
      </p>
      <p>
        주 20시간을 104시간이나 105시간으로 맞추거나, 209시간을 근무시간 비율대로 나눠 104.5시간으로 계산하는 곳도 있습니다.
        이런 방식은 법정 공식과 월 수천 원 차이가 나고, 소수 둘째 자리로 반올림한 {hoursText(pt20.monthlyHours)}시간을 곱해도{" "}
        {formatWon(pt20ShownHoursPay)}으로 {formatWon(Math.abs(pt20ShownHoursPay - pt20.monthly))} 차이가 납니다. 급여명세서를
        볼 때 어떤 기준인지 확인하는 것이 좋습니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>주 근무시간별 최저임금 월급 (세전, 주휴 개근 가정)</caption>
          <thead>
            <tr>
              <th scope="col">주 근무시간</th>
              <th scope="col">주휴시간</th>
              <th scope="col">월 환산 시간</th>
              <th scope="col">2026년 월급</th>
              <th scope="col">2027년 월급</th>
            </tr>
          </thead>
          <tbody>
            {WEEKLY_HOURS_TABLE.map((w) => (
              <tr key={w} className={w === 40 ? "is-current" : undefined}>
                <td>{HOURLY_PAGE_LINKS.has(w) ? <Link href={`/hourly-wage/${w}/`}>주 {w}시간</Link> : `주 ${w}시간`}</td>
                <td>{juhyuHours(w) > 0 ? `${formatNumber(juhyuHours(w), 1)}시간` : "없음"}</td>
                <td>{hoursText(monthlyHours(w))}시간</td>
                <td>{formatWon(calcMinimumWage({ year: 2026, weeklyHours: w, dailyHours: 8 }).monthly)}</td>
                <td>{formatWon(calcMinimumWage({ year: 2027, weeklyHours: w, dailyHours: 8 }).monthly)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        주 15시간 미만은 주휴수당이 없어 실제 근로시간만 환산합니다. 월 환산 시간은 주 40시간만 고시 기준 209시간이고
        나머지는 소수 둘째 자리까지 표시한 값입니다. 월급은 반올림 전의 정확한 월 환산 시간에 시급을 곱해 원 단위로
        반올림했습니다. 연장·야간·휴일근로수당은 별도입니다.
      </p>

      <h2>최저임금 월급 실수령액 (2026년, 2027년 예상)</h2>
      <p>
        2026년 최저임금 월급 {formatWon(y26.monthly)}에서 근로자 몫의 4대보험과 소득세를 떼면 실제로 받는 돈은 약{" "}
        <strong>{formatWon(net26.net)}</strong>입니다({STATIC_MONTH} 요율 기준). 2027년에는 월급이 {formatWon(y27.monthly)}으로
        오르지만 국민연금 근로자 부담도 4.75%에서 5.0%로 올라 실수령액은 약 <strong>{formatWon(net27.net)}</strong>으로
        예상됩니다. 둘 다 비과세 수당이 없고 부양가족이 없는 1인 기준이며, 식대처럼 비과세 수당이 있으면 공제액이 줄어듭니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">항목</th>
              <th scope="col">2026년 ({STATIC_MONTH})</th>
              <th scope="col">2027년 (예상)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>월급 (세전)</td>
              <td>{formatWon(y26.monthly)}</td>
              <td>{formatWon(y27.monthly)}</td>
            </tr>
            <tr>
              <td>국민연금 (4.75% → 5.0%)</td>
              <td>{formatWon(net26.pension)}</td>
              <td>{formatWon(net27.pension)}</td>
            </tr>
            <tr>
              <td>건강보험 (3.595%)</td>
              <td>{formatWon(net26.health)}</td>
              <td>{formatWon(net27.health)}</td>
            </tr>
            <tr>
              <td>장기요양보험</td>
              <td>{formatWon(net26.longTermCare)}</td>
              <td>{formatWon(net27.longTermCare)}</td>
            </tr>
            <tr>
              <td>고용보험 (0.9%)</td>
              <td>{formatWon(net26.employment)}</td>
              <td>{formatWon(net27.employment)}</td>
            </tr>
            <tr>
              <td>소득세 + 지방소득세</td>
              <td>{formatWon(net26.taxTotal)}</td>
              <td>{formatWon(net27.taxTotal)}</td>
            </tr>
            <tr className="is-current">
              <td>월 실수령액</td>
              <td>{formatWon(net26.net)}</td>
              <td>{formatWon(net27.net)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="note">
        2026년 열은 {STATIC_MONTH} 4대보험 요율과 간이세액표(본인 1명)를 적용했고, 계산기는 접속한 달의 요율을 씁니다. 2026년
        11월분부터 장기요양보험료 계산 방식이 바뀌지만 이 월급에서는 금액이 같습니다. {RATE_2027_NOTE}
      </p>
      <p>
        부양가족이나 비과세 금액을 바꿔 보려면 <Link href="/salary/">연봉 실수령액 계산기</Link>를 이용하세요. 최저임금 연봉
        환산액은 2026년 약 {koreanWon(Math.round(y26.annual / 10_000) * 10_000)}, 2027년 약{" "}
        {koreanWon(Math.round(y27.annual / 10_000) * 10_000)}입니다.
      </p>

      <h2>최저임금 연도별 추이 (2017~2027년)</h2>
      <p>
        최저임금은 최저임금위원회가 매년 심의·의결하고 고용노동부 장관이 8월 5일까지 고시해 다음 해 1월 1일부터 적용합니다.
        2017년 이후 인상률은 2018년 16.4%가 가장 높았고 2021년 1.5%가 가장 낮았습니다. 2017년 6,470원이던 시급은 2027년
        10,700원으로 10년 사이 약 {formatNumber((10_700 / 6_470 - 1) * 100)}% 올랐습니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">적용 연도</th>
              <th scope="col">시급</th>
              <th scope="col">인상률</th>
              <th scope="col">인상액</th>
              <th scope="col">월 환산 (209시간)</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.year} className={h.year === 2026 ? "is-current" : undefined}>
                <td>{h.year}년</td>
                <td>{formatWon(h.hourly)}</td>
                <td>{h.rate}%</td>
                <td>+{formatWon(h.increase)}</td>
                <td>{formatWon(h.monthly)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        출처:{" "}
        <a href="https://www.minimumwage.go.kr/minWage/policy/decisionMain.do" target="_blank" rel="noopener noreferrer">
          최저임금위원회 연도별 최저임금 결정현황
        </a>
        . 인상률은 위원회 공식 표기를 그대로 옮겼습니다.
      </p>

      <h2>2027년 최저임금 결정 과정</h2>
      <ol>
        <li>
          <strong>3월</strong>: 고용노동부 장관이 최저임금위원회에 심의를 요청합니다(매년 3월 31일까지). 위원회는 근로자위원,
          사용자위원, 공익위원 각 9명씩 27명입니다.
        </li>
        <li>
          <strong>2026년 7월 14일</strong>: 제14차 전원회의에서 노사 최종안을 표결에 부쳐 사용자위원안인 시급 10,700원(3.7%
          인상)을 의결했습니다. 결과는 15표 대 11표(무효 1표)였습니다.
        </li>
        <li>
          <strong>7월 16일~27일</strong>: 고용노동부가 최저임금안을 공고하고 이의제기를 받았습니다. 민주노총과
          소상공인연합회가 이의를 제기했지만 받아들여지지 않았습니다.
        </li>
        <li>
          <strong>2026년 8월 5일</strong>: 2027년 적용 최저임금 시급 10,700원(월 2,236,300원) 확정 고시.
        </li>
        <li>
          <strong>2027년 1월 1일</strong>: 업종 구분 없이 모든 사업장에 시행.
        </li>
      </ol>

      <h2>최저임금에 포함되는 임금 (산입범위)</h2>
      <p>
        최저임금을 지켰는지는 기본급만이 아니라 매월 1회 이상 정기적으로 지급하는 임금을 모두 더해 판단합니다(최저임금법 제6조
        제4항). 다음은 더하지 않습니다.
      </p>
      <ul>
        <li>연장·야간·휴일근로수당과 가산임금, 연차휴가 미사용수당처럼 소정근로시간 밖의 근로에 대한 임금</li>
        <li>분기·반기·연 단위로 주는 상여금처럼 1개월을 넘는 주기로 지급하는 임금</li>
        <li>식사·숙소 제공처럼 현물로 주는 복리후생</li>
      </ul>
      <p>
        매월 주는 정기상여금과 현금으로 주는 식대·교통비 같은 복리후생비는 2019년부터 단계적으로 산입 범위가 넓어졌고,{" "}
        <strong>2024년부터는 전액</strong> 최저임금에 포함됩니다. 연도별로 ‘월 환산 최저임금의 몇 %를 넘는 부분만
        산입했는지’는 다음과 같습니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">연도</th>
              <th scope="col">정기상여금 제외 비율</th>
              <th scope="col">현금성 복리후생비 제외 비율</th>
            </tr>
          </thead>
          <tbody>
            {INCLUSION_SCHEDULE.map((r) => (
              <tr key={r.year} className={r.bonusExcludedPct === 0 ? "is-current" : undefined}>
                <td>{r.year}</td>
                <td>{r.bonusExcludedPct === 0 ? "0% (전액 산입)" : `${r.bonusExcludedPct}%`}</td>
                <td>{r.welfareExcludedPct === 0 ? "0% (전액 산입)" : `${r.welfareExcludedPct}%`}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">근거: 최저임금법 제6조 제4항, 부칙(법률 제15666호, 2018. 6. 12.) 제2조.</p>
      <h3>내 월급이 최저임금 이상인지 확인하기</h3>
      <p>
        2026년에 주 40시간 일하며 기본급 2,000,000원과 매월 현금 식대 200,000원을 받는다면 산입 임금은 2,200,000원입니다.
        2,200,000 ÷ 209 = 약 {formatNumber(2_200_000 / 209)}원으로 2026년 최저시급 10,320원보다 많아 문제가 없습니다. 하지만
        2027년에는 월 {formatWon(y27.monthly)} 이상이어야 하므로 같은 급여라면{" "}
        <strong>{formatWon(y27.monthly - 2_200_000)}</strong>이 모자랍니다.
      </p>

      <h2>수습 근로자 최저임금 (90%)</h2>
      <p>수습 중인 근로자는 다음 조건을 모두 갖춘 경우에만 최저임금의 90%를 적용할 수 있습니다(최저임금법 제5조 제2항, 시행령 제3조).</p>
      <ul>
        <li>근로계약 기간을 1년 이상으로 정했거나, 기간을 정하지 않은 근로계약(정규직 등)일 것</li>
        <li>수습 시작일부터 3개월 이내일 것</li>
        <li>고용노동부 장관이 고시한 단순노무 업무(청소·경비·배달 등)가 아닐 것</li>
      </ul>
      <p>
        2026년 수습 최저시급은 {formatWon(p26.hourly)}(월 {formatWon(p26.monthly)}), 2027년은 {formatWon(p27.hourly)}(월{" "}
        {formatWon(p27.monthly)})입니다. 3개월이 지나면 그다음 날부터 100%를 줘야 하고, 1년 미만으로 계약한 계약직·아르바이트는
        수습 기간이라도 감액할 수 없습니다.
      </p>

      <h2>5인 미만 사업장·아르바이트도 적용</h2>
      <p>
        최저임금은 근로자를 1명이라도 쓰는 모든 사업장에 적용됩니다(최저임금법 제3조). 연장근로 가산수당처럼 5인 미만
        사업장에는 적용되지 않는 근로기준법 조항과 달리, 최저임금은 사업장 규모, 정규직·계약직·아르바이트, 내·외국인, 청소년
        여부와 관계없이 똑같이 지켜야 합니다.
      </p>
      <p>
        예외는 동거하는 친족만 쓰는 사업, 가사사용인, 선원법이 적용되는 선원입니다. 정신·신체 장애로 근로능력이 현저히 낮은
        사람은 사용자가 고용노동부 장관의 인가를 받은 경우에만 적용에서 빠집니다.
      </p>

      <h2>최저임금 위반 시 처벌</h2>
      <ul>
        <li>
          최저임금보다 적게 주거나 최저임금을 이유로 종전 임금을 낮추면 <strong>3년 이하 징역 또는 2천만원 이하 벌금</strong>
          에 처해집니다(최저임금법 제28조 제1항).
        </li>
        <li>
          최저임금에 못 미치게 정한 근로계약은 그 부분이 무효이고 최저임금과 같은 임금을 주기로 한 것으로 봅니다(제6조 제3항).
          덜 받은 차액은 체불임금으로 청구할 수 있습니다.
        </li>
        <li>
          사업주는 최저임금을 근로자가 쉽게 볼 수 있는 곳에 게시하는 등 널리 알려야 하며, 어기면 100만원 이하 과태료를
          냅니다(제11조, 제31조).
        </li>
      </ul>
      <p>
        최저임금을 받지 못했다면 고용노동부 고객상담센터(국번 없이 1350)에서 상담하거나 관할 지방고용노동관서에 진정할 수
        있습니다. 임금을 청구할 수 있는 기간(소멸시효)은 3년입니다. 법 조문은{" "}
        <a href="https://www.law.go.kr/법령/최저임금법" target="_blank" rel="noopener noreferrer">
          국가법령정보센터 최저임금법
        </a>
        에서 볼 수 있습니다.
      </p>

      <h2>함께 쓰면 좋은 계산기</h2>
      <ul>
        <li>
          <Link href="/hourly-wage/">시급·주휴수당 계산기</Link>: 내 시급과 근무 요일로 주급, 월급, 주휴수당을 계산합니다.
        </li>
        <li>
          <Link href="/salary/">연봉 실수령액 계산기</Link>: 4대보험과 소득세를 뗀 월 실수령액을 계산합니다.
        </li>
      </ul>
      <nav aria-label="최저임금 관련 페이지" className="link-grid">
        {WEEKLY_HOURS_TABLE.filter((w) => HOURLY_PAGE_LINKS.has(w) && w !== 40).map((w) => (
          <Link key={w} href={`/hourly-wage/${w}/`}>
            주 {w}시간 알바 월급
          </Link>
        ))}
        {[y26.hourly, y27.hourly].map((w) => (
          <Link key={`wage-${w}`} href={`/hourly-wage/wage/${w}/`}>
            시급 {formatNumber(w)}원 월급
          </Link>
        ))}
        {salaryLinks.map((m) => (
          <Link key={m} href={`/salary/${m}/`}>
            연봉 {formatNumber(m)}만원 실수령액
          </Link>
        ))}
      </nav>
    </ToolShell>
  );
}
