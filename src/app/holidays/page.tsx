import type { Metadata } from "next";
import Link from "next/link";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import {
  countWorkdays,
  HOLIDAY_PAGE_YEARS,
  KASA_URL,
  KASI_URL,
  LAW_URL,
  TIP_MAX_LEAVE,
  yearSummary,
} from "@/lib/calc/holidays";
import { HolidaysCalculator } from "./HolidaysCalculator";
import { HolidayList, NextHolidayNote } from "./HolidayList";
import { LeaveTipList } from "./YearTables";

const S26 = yearSummary(2026);
const S27 = yearSummary(2027);

export const metadata: Metadata = pageMetadata({
  title: "공휴일·근무일수 계산기 - 2026·2027 빨간 날, 영업일 계산",
  description: `2027년 실질 공휴일은 일요일 포함 ${S27.realDays}일, 평일에 쉬는 공휴일은 ${S27.onWeekdays}일입니다. 기간을 넣으면 주말과 공휴일을 뺀 근무일수·영업일을 세고, 연차를 붙여 가장 길게 쉬는 날도 찾아 드립니다.`,
  path: "/holidays/",
  keywords: [
    "근무일수 계산기",
    "영업일 계산기",
    "2027 공휴일",
    "2026 공휴일",
    "대체공휴일",
    "황금연휴",
    "연차 꿀팁",
    "빨간날",
    "이번달 근무일수",
  ],
});

const LABOR_LAW_URL = "https://www.law.go.kr/법령/근로기준법";
const LABOR_DECREE_URL = "https://www.law.go.kr/법령/근로기준법시행령";

const FAQ: FaqItem[] = [
  {
    q: "2027년 공휴일은 모두 며칠인가요?",
    a: `우주항공청 2027년도 월력요항은 일요일 ${S27.sundays}일과 공휴일 지정일 ${S27.designated}일(대체공휴일 ${S27.substitutes}일 포함)을 더해 관공서 공휴일을 ${S27.officialDays}일로 셉니다. 일요일과 겹친 ${S27.onSunday}일을 한 번만 센 실질 공휴일은 ${S27.realDays}일입니다. 공휴일 지정일 가운데 평일에 쉬는 날은 ${S27.onWeekdays}일이고, 주 5일 근무자는 토·일요일을 더해 ${S27.restDays5}일을 쉽니다.`,
  },
  {
    q: "대체공휴일은 어떤 경우에 생기나요?",
    a: "국경일(3·1절, 제헌절, 광복절, 개천절, 한글날), 부처님오신날, 노동절, 어린이날, 성탄절이 토요일이나 일요일과 겹치면 다음 첫 평일이 대체공휴일이 됩니다. 설·추석 연휴는 일요일과 겹칠 때만 생깁니다. 1월 1일과 현충일, 선거일은 대체공휴일 대상이 아닙니다.",
  },
  {
    q: "근무일수와 영업일은 어떻게 세나요?",
    a: "기간의 달력일에서 토·일요일과 평일에 낀 공휴일을 빼면 됩니다. 주말과 겹친 공휴일은 이미 주말로 빠졌으니 두 번 빼지 않습니다. ‘3영업일 뒤’처럼 셀 때는 기준일 다음 날부터 근무일만 셉니다.",
  },
  {
    q: "5인 미만 회사도 공휴일에 쉬나요?",
    a: "법으로 정해진 의무는 없습니다. 근로기준법 제55조 제2항(공휴일 유급휴일)은 상시 근로자 5명 이상 사업장에만 적용됩니다. 다만 노동절(5월 1일)은 별도 법률에 따라 사업장 규모와 관계없이 유급휴일입니다. 취업규칙이나 근로계약으로 공휴일 휴무를 정했다면 그에 따릅니다.",
  },
  {
    q: "제헌절과 노동절도 이제 공휴일인가요?",
    a: "네. 2026년 「공휴일에 관한 법률」 개정과 「관공서의 공휴일에 관한 규정」 개정(대통령령 제36290호)으로 노동절은 2026년 5월 1일부터, 제헌절은 2026년 7월 17일부터 공휴일입니다. 두 날 모두 대체공휴일 대상이라 2027년에는 5월 3일과 7월 19일이 대체공휴일입니다.",
  },
  {
    q: "공휴일 자료는 몇 년까지 있나요?",
    a: "2026년과 2027년입니다. 다음 해 공휴일은 우주항공청이 매년 6월 무렵 발표하는 월력요항을 확인한 뒤 추가합니다. 그 밖의 기간은 계산기에서 주말만 빼고 셉니다.",
  },
];

export default function HolidaysPage() {
  const octStart = { y: 2026, m: 10, d: 1 };
  const octEnd = { y: 2026, m: 10, d: 31 };
  const oct = countWorkdays(octStart, octEnd);
  const oct6 = countWorkdays(octStart, octEnd, { saturdayWork: true, smallBiz: false });
  return (
    <ToolShell
      slug="holidays"
      h1="공휴일·근무일수 계산기 (영업일·연차 꿀팁)"
      lead="기간을 넣으면 주말과 공휴일을 뺀 근무일수를 바로 세어 드려요. 2026·2027년 공휴일과 대체공휴일, 연차를 붙여 길게 쉬는 방법까지 한 번에 확인하세요."
      basis="관공서의 공휴일에 관한 규정(대통령령 제36290호) · 우주항공청 2027년도 월력요항 기준 · 2026년 10월 9일 확인"
      calculator={<HolidaysCalculator />}
      faq={FAQ}
    >
      <h2>다음 공휴일</h2>
      <NextHolidayNote />

      <h2>근무일수 계산 방법</h2>
      <p>근무일수는 기간의 달력일에서 쉬는 날을 빼서 구합니다. 시작일과 종료일은 모두 포함합니다.</p>
      <p className="formula">근무일수 = 달력일 − 토·일요일 − 평일에 낀 공휴일</p>
      <p>
        예를 들어 2026년 10월은 {oct.calendarDays}일 가운데 토요일 {oct.saturdays}일, 일요일 {oct.sundays}일이 있고, 평일
        공휴일은 개천절 대체공휴일(10월 5일)과 한글날(10월 9일) {oct.holidaysOnWorkdays}일입니다. 개천절(10월 3일)은
        토요일이라 따로 빼지 않습니다. 그래서 주 5일 근무자의 10월 근무일수는 {oct.calendarDays} − {oct.weeklyRest} −{" "}
        {oct.holidaysOnWorkdays} = <strong>{oct.workdays}일</strong>입니다. 토요일에도 일한다면 일요일 {oct.sundays}일과
        공휴일 {oct6.holidaysOnWorkdays}일을 빼 <strong>{oct6.workdays}일</strong>이 됩니다.
      </p>

      <h2>2026·2027년 공휴일 한눈에</h2>
      <p>
        2026년은 노동절과 제헌절이 새로 공휴일이 되어, 일요일을 포함하고 겹친 날은 한 번만 센 실질 공휴일이{" "}
        {S26.realDays}일입니다. 2027년은 월력요항 기준 관공서 공휴일 {S27.officialDays}일,
        실질 공휴일 {S27.realDays}일입니다. 평일에 쉬는 공휴일은 2026년 {S26.onWeekdays}일, 2027년 {S27.onWeekdays}일이고, 주 5일 근무자의 연간
        근무일수는 2026년 {S26.workdays5}일, 2027년 {S27.workdays5}일입니다.
      </p>
      {HOLIDAY_PAGE_YEARS.map((y) => (
        <section key={y}>
          <h3>
            <Link href={`/holidays/${y}/`}>{y}년 공휴일</Link>
          </h3>
          <HolidayList year={y} />
        </section>
      ))}

      <h2>2027년 연차 꿀팁</h2>
      <p>
        연휴 앞뒤 근무일에 연차를 붙이면 주말까지 이어서 쉴 수 있습니다. 연차를 {TIP_MAX_LEAVE}일까지 붙여 보고, 연차 하루에
        따라붙는 주말·공휴일이 가장 많은 조합을 골랐습니다. 연휴별로 연차 일수에 따른 최장 일수는{" "}
        <Link href="/holidays/2027/">2027년 공휴일 페이지</Link>에 정리했습니다.
      </p>
      <LeaveTipList year={2027} />

      <h2>대체공휴일 규칙</h2>
      <p>
        「관공서의 공휴일에 관한 규정」 제3조(2026년 4월 30일 개정)에 따라 아래 경우에는 그 공휴일 다음의 첫 번째
        비공휴일이 대체공휴일이 됩니다.
      </p>
      <ul>
        <li>3·1절, 제헌절, 광복절, 개천절, 한글날, 부처님오신날, 노동절, 어린이날, 성탄절이 토요일이나 일요일과 겹칠 때</li>
        <li>설·추석 연휴(전날·당일·다음 날)가 일요일과 겹칠 때. 토요일과 겹치면 생기지 않습니다.</li>
        <li>위 공휴일이 평일에 다른 공휴일과 같은 날일 때</li>
      </ul>
      <p>
        1월 1일, 현충일, 선거일, 임시공휴일은 주말과 겹쳐도 대체공휴일이 없습니다. 대체공휴일이 토요일이 되거나 다른
        대체공휴일과 겹치면 그다음 비공휴일로 넘어갑니다.
      </p>

      <h2>회사원도 공휴일에 쉬나요</h2>
      <p>
        상시 근로자 5명 이상 사업장은 <a href={LABOR_LAW_URL}>근로기준법</a> 제55조 제2항과{" "}
        <a href={LABOR_DECREE_URL}>같은 법 시행령</a> 제30조 제2항에 따라 관공서 공휴일과 대체공휴일을 유급휴일로 줘야
        합니다. 5명 미만 사업장에는 이 조항이 적용되지 않아, 공휴일 가운데에서는 노동절만 법정 유급휴일입니다(주휴일은
        별도). 계산기의 ‘5인 미만 사업장 기준’을 켜면 공휴일 가운데 노동절만 쉬는 날로 셉니다.
      </p>
      <p>
        노동절 대체공휴일은 2027년 5월 3일에 처음 생깁니다. 개정 규정 제3조가 노동절을 대체공휴일 대상에 넣었으므로 상시
        5명 이상 사업장은 5월 3일도 유급휴일로 줘야 합니다. 고용노동부가 2026년 4월 노동절 당일을 다른 근무일과 맞바꾸는
        ‘휴일대체’는 할 수 없다고 해석한 것은 이와 별개의 문제입니다.
      </p>

      <h2>출처와 함께 쓰는 도구</h2>
      <ul>
        <li>
          <a href={LAW_URL}>관공서의 공휴일에 관한 규정</a> (국가법령정보센터)
        </li>
        <li>
          한국천문연구원 달력자료 <a href={KASI_URL(2026)}>2026년</a>, <a href={KASI_URL(2027)}>2027년</a>
        </li>
        <li>
          <a href={KASA_URL}>우주항공청</a> 2027년도 월력요항 (2026년 6월 29일 발표)
        </li>
        <li>
          설·추석·크리스마스까지 남은 날은 <Link href="/dday/">디데이 계산기</Link>, 올해 쓸 수 있는 연차 개수는{" "}
          <Link href="/annual-leave/">연차 계산기</Link>에서 확인하세요.
        </li>
      </ul>

      <h2>연도별 공휴일</h2>
      <nav aria-label="연도별 공휴일 페이지" className="link-grid">
        {HOLIDAY_PAGE_YEARS.map((y) => (
          <Link key={y} href={`/holidays/${y}/`}>
            {y}년 공휴일
          </Link>
        ))}
      </nav>
    </ToolShell>
  );
}
