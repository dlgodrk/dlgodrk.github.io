import type { Metadata } from "next";
import Link from "next/link";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { RULE_YEAR, RULES_CHECKED_AT } from "@/lib/site";
import { formatKoreanDate, parseYMD } from "@/lib/date";
import {
  AGE_PAGE_YEARS,
  AGE_RULES,
  ANIMALS,
  BRANCHES_HANJA,
  ganjiOfYear,
  manAgeRangeInYear,
  PENSION_AGE_TABLE,
  sameTtiYears,
  STEM_COLORS,
  STEM_ELEMENTS,
  STEMS,
} from "@/lib/calc/age";
import { AgeCalculator } from "./AgeCalculator";

const EXAMPLE_YEAR = 1990;
const ex = manAgeRangeInYear(EXAMPLE_YEAR, RULE_YEAR);
/** A cohort that has not entered school yet: RULE_YEAR's March is already past (rules checked in October). */
const SCHOOL_EXAMPLE_YEAR = RULE_YEAR - 6;
const CHECKED = formatKoreanDate(parseYMD(RULES_CHECKED_AT) ?? { y: RULE_YEAR, m: 1, d: 1 }, false);

export const metadata: Metadata = pageMetadata({
  title: `만 나이 계산기 - ${RULE_YEAR} 나이표, 띠, 연 나이 계산`,
  description: `생년월일만 넣으면 만 나이, 연 나이, 띠, 다음 생일까지 남은 날을 바로 계산합니다. ${RULE_YEAR}년 기준 ${EXAMPLE_YEAR}년생은 만 ${ex.before}~${ex.after}세. 출생연도별 나이표와 술·담배, 선거권, 국민연금 나이 기준도 정리했습니다.`,
  path: "/age/",
  keywords: [
    "만 나이 계산기",
    "만나이 계산",
    "나이 계산기",
    `${RULE_YEAR} 나이표`,
    "띠 계산",
    "연 나이",
    "세는 나이",
    "빠른년생",
    "만 나이 통일법",
  ],
});

const FAQ: FaqItem[] = [
  {
    q: "만 나이는 어떻게 계산하나요?",
    a: `올해 연도에서 태어난 연도를 빼고, 올해 생일이 아직 지나지 않았다면 1을 더 뺍니다. 예를 들어 ${EXAMPLE_YEAR}년 12월 25일생은 ${RULE_YEAR}년 12월 24일까지 만 ${ex.before}세, 12월 25일부터 만 ${ex.after}세입니다.`,
  },
  {
    q: "만 나이 통일법 이후에도 연 나이를 쓰는 경우가 있나요?",
    a: "있습니다. 청소년보호법은 19세가 되는 해의 1월 1일부터 술·담배 구매를 허용하고, 병역법도 ‘18세부터’를 18세가 되는 해의 1월 1일부터로 봅니다. 법에 이렇게 따로 정한 경우에만 연 나이를 쓰고, 나머지는 모두 만 나이입니다.",
  },
  {
    q: "2월 29일생은 평년에 언제 한 살 많아지나요?",
    a: "3월 1일입니다. 민법 제160조 제3항은 기간의 마지막 달에 해당하는 날이 없으면 그 달 말일에 기간이 끝난다고 정합니다. 평년에는 2월 28일로 1년이 차므로 다음 날인 3월 1일부터 한 살 많아집니다.",
  },
  {
    q: "빠른년생은 이제 없나요?",
    a: "2009학년도부터 1월 1일~12월 31일생이 같은 학년이 되면서 없어졌습니다. 2002년 1·2월생(2008년 초등학교 입학)이 마지막 빠른년생이고, 2003년생부터는 태어난 해가 같으면 같은 학년입니다.",
  },
  {
    q: "띠는 1월 1일에 바뀌나요?",
    a: "일상에서는 양력 연도로 띠를 셈하는 경우가 많지만, 전통적으로는 음력 설을, 사주(명리학)에서는 입춘(2월 4일 무렵)을 기준으로 띠가 바뀝니다. 그래서 1·2월생은 전년도 띠로 보기도 합니다.",
  },
  {
    q: "세는 나이를 쓰면 안 되나요?",
    a: "일상 대화에서 쓰는 것은 문제가 없지만 법적 효력은 없습니다. 법령, 계약서, 공문서에 적힌 나이는 특별한 규정이 없으면 만 나이로 해석합니다. 칠순·팔순 같은 관습 행사는 지금도 세는 나이로 챙기는 경우가 많습니다.",
  },
];

export default function AgePage() {
  const years = [...AGE_PAGE_YEARS].reverse();
  const thisYear = ganjiOfYear(RULE_YEAR);
  return (
    <ToolShell
      slug="age"
      h1="만 나이 계산기"
      lead="2023년 6월 28일부터 법과 계약서의 나이는 만 나이로 통일됐습니다. 생년월일을 넣으면 오늘 기준 만 나이와 연 나이, 띠, 다음 생일까지 남은 날을 바로 알려 드립니다."
      basis={`${RULE_YEAR}년 기준 · 민법 제158조(만 나이)·제160조(기간 계산) · ${CHECKED} 확인`}
      calculator={<AgeCalculator />}
      faq={FAQ}
    >
      <h2>만 나이 계산 방법</h2>
      <p>
        만 나이는 태어난 날 0세에서 시작해 생일이 돌아올 때마다 한 살씩 더하는 나이입니다. 태어난 날도 하루로 세며(출생일
        산입), 계산식은 다음과 같습니다.
      </p>
      <p className="formula">만 나이 = 기준연도 − 출생연도 − (올해 생일이 아직 안 지났으면 1)</p>
      <p>
        예를 들어 {EXAMPLE_YEAR}년 12월 25일생은 {RULE_YEAR} − {EXAMPLE_YEAR} = {ex.after}에서 생일 전이면 1을 빼{" "}
        <strong>
          {RULE_YEAR}년 12월 24일까지 만 {ex.before}세
        </strong>
        , 12월 25일부터 <strong>만 {ex.after}세</strong>입니다. 돌이 지나지 않은 아기는 민법에 따라 ‘생후 8개월’처럼 개월
        수로 표시할 수 있습니다.
      </p>

      <h2>만 나이, 연 나이, 세는 나이 차이</h2>
      <div className="table-wrap">
        <table className="data-table">
          <caption>
            {EXAMPLE_YEAR}년 12월 25일생의 {RULE_YEAR}년 나이
          </caption>
          <thead>
            <tr>
              <th scope="col">구분</th>
              <th scope="col">계산 방법</th>
              <th scope="col">생일 전</th>
              <th scope="col">생일 후</th>
              <th scope="col">쓰이는 곳</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>만 나이</td>
              <td>생일마다 +1</td>
              <td>{ex.before}세</td>
              <td>{ex.after}세</td>
              <td>법령·계약·공문서 전반</td>
            </tr>
            <tr>
              <td>연 나이</td>
              <td>올해 − 출생연도</td>
              <td>{ex.after}세</td>
              <td>{ex.after}세</td>
              <td>청소년보호법, 병역법</td>
            </tr>
            <tr>
              <td>세는 나이</td>
              <td>연 나이 + 1</td>
              <td>{ex.after + 1}세</td>
              <td>{ex.after + 1}세</td>
              <td>법적 효력 없음 (관습)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>만 나이 통일법 (2023년 6월 28일 시행)</h2>
      <p>
        2022년 12월 27일 민법과 행정기본법이 개정되어 2023년 6월 28일부터 법령, 계약, 공문서에 나오는 나이는 따로 정한 규정이
        없으면 모두 만 나이로 계산합니다. 흔히 ‘만 나이 통일법’이라고 부르지만 같은 이름의 법이 새로 생긴 것은 아니고, 두
        법의 조문이 바뀐 것입니다.
      </p>
      <ul>
        <li>
          <a href="https://www.law.go.kr/법령/민법/제158조">민법 제158조(나이의 계산과 표시)</a>: “나이는 출생일을 산입하여
          만(滿) 나이로 계산하고, 연수(年數)로 표시한다. 다만, 1세에 이르지 아니한 경우에는 월수(月數)로 표시할 수 있다.”
        </li>
        <li>
          <a href="https://www.law.go.kr/법령/행정기본법/제7조의2">행정기본법 제7조의2</a>: 행정에 관한 나이도 다른 법령에
          특별한 규정이 없으면 같은 방식으로 만 나이로 계산합니다.
        </li>
      </ul>
      <p>
        바뀌지 않은 것도 있습니다. 청소년보호법(술·담배)과 병역법은 법에 연 나이 규정을 따로 두고 있어 지금도 연 나이를 씁니다.
        초등학교 입학도 ‘만 6세가 된 날이 속하는 해의 다음 해’ 기준이라 같은 해 태어난 아이는 같은 학년입니다. 이미 만 나이를
        쓰던 국민연금, 기초연금, 정년 같은 제도는 달라진 점이 없습니다. 법제처는 노인복지법의 ‘65세 이상’이 되는 첫날도 만
        65세 생일이라고 해석했습니다(법령해석 22-0817).
      </p>

      <h2>법으로 정한 주요 나이 기준</h2>
      <p>
        같은 ‘19세’라도 성년은 만 나이, 술·담배는 연 나이로 따집니다. {RULE_YEAR}년 10월 현재 법령 기준으로 정리했습니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">항목</th>
              <th scope="col">기준 나이</th>
              <th scope="col">계산</th>
              <th scope="col">근거</th>
            </tr>
          </thead>
          <tbody>
            {AGE_RULES.map((rule) => (
              <tr key={rule.id}>
                <td>{rule.label}</td>
                <td>{rule.threshold}</td>
                <td>{rule.basis} 나이</td>
                <td>
                  <a href={rule.url}>{rule.law}</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="note">
        {AGE_RULES.filter((rule) => rule.note).map((rule) => (
          <li key={rule.id}>
            {rule.label}: {rule.note}
          </li>
        ))}
      </ul>

      <h3>국민연금 노령연금 받는 나이</h3>
      <p>
        노령연금은 가입기간이 10년 이상이면 출생연도에 따라 만 60~65세부터 받습니다. 연금은 그 나이가 된 달의 다음 달부터
        나오므로(<a href="https://www.law.go.kr/법령/국민연금법/제54조">국민연금법 제54조</a>) 12월생은 보통 이듬해 1월에 첫
        연금을 받습니다. 조기노령연금으로 최대 5년 앞당길 수
        있지만 1년에 6%씩 덜 받고, 반대로 최대 5년 늦추면 1년에 7.2%씩 더 받습니다. 2025년 연금개혁(2026년 시행)은 보험료율과
        소득대체율을 조정했고 수급 나이는 바꾸지 않았습니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">출생연도</th>
              <th scope="col">노령연금</th>
              <th scope="col">조기노령연금 (최대)</th>
            </tr>
          </thead>
          <tbody>
            {PENSION_AGE_TABLE.map((row) => (
              <tr key={row.label}>
                <td>{row.label}</td>
                <td>만 {row.age}세</td>
                <td>만 {row.age - 5}세</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>2월 29일생의 만 나이</h2>
      <p>
        윤년 2월 29일에 태어났다면 평년에는 생일이 없습니다. 이때는{" "}
        <a href="https://www.law.go.kr/법령/민법/제160조">민법 제160조</a> 제3항에 따라 ‘최종의 월에 해당일이 없는 때에는
        그 월의 말일로 기간이 만료’합니다. 그래서 평년에는 2월 28일이 끝나는 순간 1년이 차고, <strong>3월 1일부터</strong> 한
        살 많아집니다. 이 계산기도 같은 기준을 씁니다. 예를 들어 2004년 2월 29일생은 2025년 2월 28일까지 만 20세였고 3월
        1일부터 만 21세가 되었습니다. 윤년인 2028년에는 2월 29일에 만 24세가 됩니다.
      </p>

      <h2>학교 입학 연도와 빠른년생</h2>
      <p>
        <a href="https://www.law.go.kr/법령/초·중등교육법/제13조">초·중등교육법 제13조</a>에 따라 아이는 만 6세가 된 날이
        속하는 해의 다음 해 3월 1일에 초등학교에 들어갑니다. 생일과 상관없이 출생연도에 7을 더하면 입학 연도입니다.
      </p>
      <p className="formula">초등학교 입학 = 출생연도 + 7 · 중학교 = +13 · 고등학교 = +16 · 고교 졸업(2월) = +19</p>
      <p>
        예를 들어 {SCHOOL_EXAMPLE_YEAR}년생은 {SCHOOL_EXAMPLE_YEAR + 7}년 3월에 초등학교, {SCHOOL_EXAMPLE_YEAR + 13}년에
        중학교, {SCHOOL_EXAMPLE_YEAR + 16}년에 고등학교에 입학합니다.
        보호자가 원하면 1년 일찍(조기입학) 또는 늦게(입학 연기) 보낼 수도 있습니다.
      </p>
      <p>
        예전에는 ‘6세가 된 날의 다음 날 이후 최초의 학년초’에 입학하게 되어 있어 3월생부터 이듬해 2월생까지가 한 학년이었습니다.
        그래서 1·2월생은 같은 해 태어난 친구보다 한 해 먼저 입학했고, 이들을 ‘빠른년생’이라고 불렀습니다. 법이 바뀌어
        2009학년도부터 1월 1일~12월 31일생이 같은 학년이 되었고, <strong>2002년 1·2월생(2008년 입학)이 마지막 빠른년생</strong>
        입니다. 빠른년생이었더라도 입학을 미뤄 또래와 함께 학교에 다닌 사람도 많습니다.
      </p>

      <h2>띠와 60갑자 계산</h2>
      <p>
        띠는 태어난 해의 지지(12지)로 정합니다. 해마다 천간(10간)과 지지가 함께 한 칸씩 움직여 60년마다 같은 이름이 돌아오는데,
        이것이 60갑자이고 만 60세를 ‘환갑(還甲)’이라 부르는 이유입니다. 천간에는 오행과 색이 붙어 있어 ‘붉은 말띠’ 같은 이름이
        생깁니다.
      </p>
      <p className="formula">천간 = (연도 − 4)를 10으로 나눈 나머지 · 지지 = (연도 − 4)를 12로 나눈 나머지</p>
      <p className="formula">
        {RULE_YEAR} − 4 = {RULE_YEAR - 4} → 10으로 나눈 나머지 {(RULE_YEAR - 4) % 10} = {thisYear.name[0]}(
        {thisYear.hanja[0]}) · 12로 나눈 나머지 {(RULE_YEAR - 4) % 12} = {thisYear.name[1]}({thisYear.hanja[1]}) →{" "}
        {thisYear.name}년
      </p>
      <p>
        천간 ‘{thisYear.name[0]}’의 오행이 {thisYear.element}에 해당해 {RULE_YEAR}년생은 <strong>{thisYear.tti}</strong>
        입니다. 나머지 0부터 천간은 갑·을·병·정·무·기·경·신·임·계, 지지는 자(쥐)·축(소)·인(호랑이)·묘(토끼)·진(용)·사(뱀)·오(말)·미(양)·신(원숭이)·유(닭)·술(개)·해(돼지)
        순서입니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">천간</th>
              <th scope="col">오행</th>
              <th scope="col">띠 앞에 붙는 색</th>
            </tr>
          </thead>
          <tbody>
            {STEM_COLORS.map((color, i) => (
              <tr key={color}>
                <td>
                  {STEMS[i * 2]}·{STEMS[i * 2 + 1]}
                </td>
                <td>{STEM_ELEMENTS[i]}</td>
                <td>{color === "황금" ? "황금(누런)" : color}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        띠가 바뀌는 날은 기준에 따라 다릅니다. 일상에서는 양력 1월 1일로 셈하는 경우가 많지만, 전통적으로는 음력 설, 사주에서는
        입춘(2월 4일 무렵)이 기준입니다. 1·2월생이라면 전년도 띠로 볼 수도 있습니다.
      </p>

      <h3>띠별 출생연도</h3>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">띠</th>
              <th scope="col">출생연도</th>
            </tr>
          </thead>
          <tbody>
            {ANIMALS.map((animal, i) => {
              // First page year whose branch index is i: branch = (y − 4) mod 12.
              const first = AGE_PAGE_YEARS.find((y) => ganjiOfYear(y).branchIndex === i)!;
              const list = sameTtiYears(first, AGE_PAGE_YEARS[0], RULE_YEAR);
              return (
                <tr key={animal}>
                  <td>
                    {animal}띠 ({BRANCHES_HANJA[i]})
                  </td>
                  <td>
                    {list.map((y, j) => (
                      <span key={y}>
                        {j > 0 ? " · " : null}
                        <Link href={`/age/${y}/`}>{y}</Link>
                      </span>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>{RULE_YEAR}년 출생연도별 나이표</h2>
      <p>
        {RULE_YEAR}년 한 해 동안의 나이입니다. 만 나이는 생일 전과 후 두 가지이고, 연 나이는 1년 내내 같습니다. 출생연도를
        누르면 그해 태어난 사람의 학교 입학 연도, 국민연금 수급 나이, 나이별 이정표를 볼 수 있습니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">출생연도</th>
              <th scope="col">만 나이 (생일 전·후)</th>
              <th scope="col">연 나이</th>
              <th scope="col">띠</th>
            </tr>
          </thead>
          <tbody>
            {years.map((y) => {
              const range = manAgeRangeInYear(y, RULE_YEAR);
              const g = ganjiOfYear(y);
              return (
                <tr key={y}>
                  <td>
                    <Link href={`/age/${y}/`}>{y}년생</Link>
                  </td>
                  <td>{range.before === null ? "0세" : `${range.before}·${range.after}세`}</td>
                  <td>{RULE_YEAR - y}세</td>
                  <td>
                    {g.ttiShort} ({g.name})
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="note">
        띠는 양력 연도 기준입니다. 학교·연금 연도는 조기입학, 입학 연기, 제도 변경에 따라 실제와 다를 수 있습니다.
      </p>
    </ToolShell>
  );
}
