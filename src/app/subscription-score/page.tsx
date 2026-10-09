import type { Metadata } from "next";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatKoreanDate, ymd, type YMD } from "@/lib/date";
import {
  calcByDates,
  calcHomeless,
  dependentsPoints,
  formatMonths,
  homelessPointsForYears,
  maxScoreByDependents,
  savingsPointsForMonths,
  SCORE_MAX,
  type DateInputs,
} from "@/lib/calc/subscription-score";
import { SubscriptionScoreCalculator } from "./SubscriptionScoreCalculator";

const LAW_RULE = "https://www.law.go.kr/법령/주택공급에관한규칙";
const LAW_ANNEX1 = "https://www.law.go.kr/법령별표서식/(주택공급에%20관한%20규칙,20260615,별표1)";
const APPLYHOME = "https://www.applyhome.co.kr";
const NEWS_DH_BANGBAE = "https://www.ajunews.com/view/20240904093059205";

/** Fixed example date so the prose never depends on the build day. */
const EX_REF: YMD = ymd(2026, 10, 9);
const EX_BIRTH: YMD = ymd(1990, 3, 15);
const EX: DateInputs = {
  ref: EX_REF,
  birth: EX_BIRTH,
  married: true,
  marriage: ymd(2018, 5, 12),
  ownership: "none",
  homelessSince: null,
  dependents: 2,
  join: ymd(2014, 6, 2),
  spouseHasSavings: true,
  spouseJoin: ymd(2020, 3, 2),
};
const ex = calcByDates(EX)!;

const short = (v: YMD) => formatKoreanDate(v, false);
/** "2020. 3. 15." — narrow date for table cells on phones. */
const dot = (v: YMD) => `${v.y}. ${v.m}. ${v.d}.`;

/** 무주택기간 기산일 사례 (1990. 3. 15.생, 2026. 10. 9. 공고) */
const START_CASES: { situation: string; rule: string; result: ReturnType<typeof calcHomeless> }[] = [
  {
    situation: "미혼",
    rule: "만 30세가 되는 날",
    result: calcHomeless({ birth: EX_BIRTH, marriage: null, ownership: "none", homelessSince: null, ref: EX_REF }),
  },
  {
    situation: "2018. 5. 12. 혼인신고 (만 28세)",
    rule: "혼인신고일",
    result: calcHomeless({ birth: EX_BIRTH, marriage: ymd(2018, 5, 12), ownership: "none", homelessSince: null, ref: EX_REF }),
  },
  {
    situation: "2021. 6. 1. 혼인신고 (만 31세)",
    rule: "만 30세가 되는 날",
    result: calcHomeless({ birth: EX_BIRTH, marriage: ymd(2021, 6, 1), ownership: "none", homelessSince: null, ref: EX_REF }),
  },
  {
    situation: "2022. 8. 10. 집을 팔고 등기 이전",
    rule: "무주택이 된 날",
    result: calcHomeless({ birth: EX_BIRTH, marriage: null, ownership: "past", homelessSince: ymd(2022, 8, 10), ref: EX_REF }),
  },
];

/** 기간별 점수표 행: [label, 무주택 점수, 통장 점수] */
const PERIOD_ROWS: { label: string; homeless: number; savings: number }[] = [
  { label: "6개월 미만", homeless: 2, savings: savingsPointsForMonths(0) },
  { label: "6개월 이상 ~ 1년 미만", homeless: 2, savings: savingsPointsForMonths(6) },
  ...Array.from({ length: 14 }, (_, i) => ({
    label: `${i + 1}년 이상 ~ ${i + 2}년 미만`,
    homeless: homelessPointsForYears(i + 1),
    savings: savingsPointsForMonths((i + 1) * 12),
  })),
  { label: "15년 이상", homeless: homelessPointsForYears(15), savings: savingsPointsForMonths(180) },
];

const HOUSEHOLDS = [
  "본인만 (1인 가구)",
  "배우자",
  "배우자 + 자녀 1명",
  "배우자 + 자녀 2명",
  "배우자 + 자녀 3명",
  "배우자 + 자녀 2명 + 부모 2명",
  "배우자 + 자녀 3명 + 부모 2명",
];

export const metadata: Metadata = pageMetadata({
  title: "청약 가점 계산기 - 84점 만점 점수표와 계산법 (2026)",
  description: `무주택기간(32점), 부양가족(35점), 청약통장 가입기간(17점)으로 청약 가점을 계산합니다. 배우자 통장 가산점(최대 3점)과 미성년 가입기간 한도까지 반영하며, 부양가족 2명이면 최고 ${maxScoreByDependents(2)}점입니다.`,
  path: "/subscription-score/",
  keywords: [
    "청약 가점 계산기",
    "청약 가점",
    "청약 가점 계산",
    "청약 가점표",
    "무주택기간 계산",
    "부양가족 청약 가점",
    "배우자 청약통장 가점",
    "청약 84점",
  ],
});

const FAQ: FaqItem[] = [
  {
    q: "청약 가점 만점은 몇 점인가요?",
    a: "84점입니다. 무주택기간 32점, 부양가족 수 35점, 청약통장 가입기간 17점을 더합니다. 무주택 15년 이상, 부양가족 6명 이상에 통장 점수 17점을 채워야 만점이 됩니다. 통장 17점은 본인이 15년 이상 가입했거나, 배우자 통장 가산점을 더해 채울 수 있습니다(예: 본인 12년 이상 + 배우자 2년 이상).",
  },
  {
    q: "부양가족 수에 본인과 배우자가 들어가나요?",
    a: "본인은 들어가지 않고 배우자는 들어갑니다. 배우자는 주민등록상 세대가 나뉘어 있어도 부양가족으로 봅니다. 그래서 배우자와 자녀 1명이 있으면 부양가족 2명, 15점입니다.",
  },
  {
    q: "만 30세 전에 결혼하면 무주택기간은 언제부터 세나요?",
    a: "만 30세가 되기 전에 혼인신고를 했다면 혼인관계증명서의 혼인신고일부터 셉니다. 결혼식 날짜가 아니라 신고일이 기준입니다. 만 30세 이후에 혼인했다면 그대로 만 30세가 되는 날부터 셉니다. 이혼·재혼처럼 혼인 이력이 복잡하면 사업주체나 청약홈에 미리 확인하는 것이 안전합니다.",
  },
  {
    q: "배우자 청약통장 기간도 점수에 들어가나요?",
    a: "2024년 3월 25일 이후 공고부터 들어갑니다. 배우자 가입기간의 50%에 해당하는 기간을 점수표로 바꿔 최대 3점을 더하며, 본인 점수와 합쳐 17점을 넘지 못합니다. 배우자가 2년 이상 가입했다면 3점을 모두 받습니다. 노부모 부양 특별공급의 가점 계산에는 적용되지 않습니다.",
  },
  {
    q: "부모님을 부양가족으로 넣으려면 어떤 조건이 필요한가요?",
    a: "공고일 현재 신청자가 세대주이고, 부모(배우자의 부모 포함)가 최근 3년 이상 계속 같은 주민등록표에 올라 있어야 합니다. 부모나 그 배우자 중 한 명이라도 주택을 가지고 있으면 두 분 모두 제외됩니다. 가점제로 당첨되면 부모의 최근 3년 건강보험 요양급여 내역을 내야 합니다.",
  },
  {
    q: "가점을 잘못 입력하면 어떻게 되나요?",
    a: "당첨 뒤 서류 검증에서 점수가 틀린 것이 드러나면 부적격 당첨자가 됩니다. 소명하지 못하면 당첨이 취소되고, 당첨일부터 수도권은 1년, 그 밖의 지역은 6개월(투기과열지구·청약과열지역은 1년, 위축지역은 3개월) 동안 다른 분양주택에 당첨될 수 없습니다. 다만 다시 계산한 가점이 그 주택형의 당첨 가점 이상이면 당첨이 유지됩니다.",
  },
];

export default function SubscriptionScorePage() {
  return (
    <ToolShell
      slug="subscription-score"
      h1="청약 가점 계산기 (84점 만점)"
      lead="무주택기간, 부양가족 수, 청약통장 가입기간으로 민영주택 가점제 점수를 84점 만점으로 계산해 드려요. 배우자 통장 가산점과 점수가 오르는 날까지 함께 알려 드려요."
      basis="주택공급에 관한 규칙 별표 1(2024. 12. 18. 개정) · 현행 2026. 6. 15. 시행본(국토교통부령 제1592호) 기준 · 2026년 10월 9일 확인"
      calculator={<SubscriptionScoreCalculator />}
      faq={FAQ}
    >
      <h2>청약 가점 계산 방법</h2>
      <p>
        민영주택 1순위에서 가점제로 뽑는 물량은 아래 세 항목의 점수를 더해 높은 순으로 당첨자를 정합니다. 점수는 모두
        입주자모집공고일 현재로 따집니다.
      </p>
      <p className="formula">가점 = 무주택기간(최대 32점) + 부양가족 수(최대 35점) + 청약통장 가입기간(최대 17점) = 최대 84점</p>
      <p>
        예를 들어 1990년 3월 15일생이 2018년 5월 12일 혼인신고를 했고, 배우자·자녀 1명과 무주택으로 살며, 2014년 6월
        2일 청약통장에 가입했다고 하겠습니다. 배우자 통장은 2020년 3월 2일 가입입니다. {short(EX_REF)} 공고라면 무주택기간은
        혼인신고일부터 {formatMonths(ex.homeless.months)}이라 <strong>{ex.homeless.points}점</strong>, 부양가족 2명은{" "}
        <strong>{ex.dependentsPoints}점</strong>입니다. 통장은 본인 {formatMonths(ex.own.months)}로 {ex.savings.own}점에
        배우자 {formatMonths(ex.spouseMonths ?? 0)}의 절반으로 {ex.savings.applied}점을 더해{" "}
        <strong>{ex.savings.total}점</strong>입니다. 합계는 <strong>{ex.total}점</strong>입니다.
      </p>

      <h2>청약 가점표 (무주택기간·청약통장)</h2>
      <p>
        무주택기간은 1년마다 2점, 청약통장 가입기간은 1년마다 1점씩 오릅니다. 만 30세 미만 미혼이거나 주택을 가진
        세대는 무주택기간이 0점입니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">기간</th>
              <th scope="col">무주택</th>
              <th scope="col">청약통장</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="text-cell">만 30세 미만 미혼·주택 소유 세대</td>
              <td>0점</td>
              <td>-</td>
            </tr>
            {PERIOD_ROWS.map((r) => (
              <tr key={r.label}>
                <td className="text-cell">{r.label}</td>
                <td>{r.homeless}점</td>
                <td>{r.savings}점</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">상한</th>
              <td>32점</td>
              <td>17점</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <h2>부양가족 수별 점수와 최고 가점</h2>
      <p>
        부양가족은 1명마다 5점이고 6명 이상은 35점입니다. 무주택기간과 통장이 만점이라도 부양가족 수에 따라 받을 수
        있는 최고 점수가 정해집니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">부양가족</th>
              <th scope="col">점수</th>
              <th scope="col">최고 가점</th>
              <th scope="col" className="text-cell">
                가족 구성 예
              </th>
            </tr>
          </thead>
          <tbody>
            {HOUSEHOLDS.map((label, n) => (
              <tr key={n}>
                <td>{n === 6 ? "6명 이상" : `${n}명`}</td>
                <td>{dependentsPoints(n)}점</td>
                <td>{maxScoreByDependents(n)}점</td>
                <td className="text-cell">{label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        부모는 아래 인정 요건을 갖춰야 합니다. 최고 가점 = 무주택기간 32점 + 통장 17점 + 부양가족 점수, 만점은{" "}
        {SCORE_MAX}점.
      </p>

      <h2>배우자 청약통장 가산점</h2>
      <p>
        2024년 3월 25일 이후 공고부터 민영주택 일반공급 가점제에서 배우자 통장 가입기간의 50%를 같은 표로 점수화해
        본인 통장 점수에 더합니다. 배우자 몫은 최대 3점이고, 합친 점수는 17점을 넘지 않습니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">배우자 가입기간</th>
              <th scope="col">50% 기간</th>
              <th scope="col">더하는 점수</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1년 미만</td>
              <td>6개월 미만</td>
              <td>1점</td>
            </tr>
            <tr>
              <td>1년 이상 ~ 2년 미만</td>
              <td>6개월 이상 ~ 1년 미만</td>
              <td>2점</td>
            </tr>
            <tr>
              <td>2년 이상</td>
              <td>1년 이상</td>
              <td>3점 (상한)</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>무주택기간 산정 기준: 만 30세와 혼인신고일</h2>
      <p>
        무주택기간은 신청자와 배우자를 기준으로, 신청자가 만 30세가 되는 날부터 계속 무주택인 기간입니다. 만 30세 전에
        혼인했다면 혼인신고일부터 셉니다. 본인이나 배우자가 집을 가진 적이 있으면 마지막으로 처분해 무주택이 된
        날(등기접수일과 건축물대장 처리일 중 빠른 날)부터 다시 셉니다. 아래는 1990년 3월 15일생이 {short(EX_REF)} 공고에
        신청하는 경우입니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col" className="text-cell">
                상황 · 기산 기준
              </th>
              <th scope="col">기산일</th>
              <th scope="col">점수</th>
            </tr>
          </thead>
          <tbody>
            {START_CASES.map((c) => (
              <tr key={c.situation}>
                <td className="text-cell">
                  {c.situation}
                  <span className="block text-[0.8125rem] text-muted">{c.rule}부터</span>
                </td>
                <td>{c.result.start ? dot(c.result.start) : "-"}</td>
                <td>{c.result.points}점</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul>
        <li>
          분양권·입주권도 주택으로 봅니다. 공고일 현재 신청자·배우자뿐 아니라 같은 등본의 부모·자녀 등 세대원 모두
          무주택이어야 하며, 세대원 중 한 명이라도 집이 있으면 무주택기간은 0점입니다. 처분 후 다시 세는 날은 신청자·배우자
          기준입니다.
        </li>
        <li>
          전용 60㎡ 이하로 공시가격 1억6천만원(수도권, 그 밖의 지역 1억원) 이하인 아파트, 전용 85㎡ 이하로
          공시가격 5억원(수도권, 그 밖의 지역 3억원) 이하인 빌라·단독주택 등을 1채만 가진 세대는 무주택으로 봅니다(규칙
          제53조제9호, 공공임대주택 공급 제외).
        </li>
        <li>
          만 60세 이상 부모가 집을 가지고 있어도 신청자는 무주택으로 인정되지만, 그 부모는 부양가족에서 빠집니다.
        </li>
      </ul>

      <h2>부양가족 인정 요건</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">대상</th>
              <th scope="col" className="text-cell">
                인정 요건 (공고일 기준)
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>배우자</td>
              <td className="text-cell">혼인신고한 배우자. 주민등록상 세대가 달라도 인정</td>
            </tr>
            <tr>
              <td>부모·조부모</td>
              <td className="text-cell">
                신청자가 세대주이고 최근 3년 이상 계속 같은 등본에 등재. 본인·배우자 쪽 모두 해당. 그 부부 중 한 명이라도
                주택이 있으면 둘 다 제외
              </td>
            </tr>
            <tr>
              <td>미혼 자녀 (만 30세 미만)</td>
              <td className="text-cell">신청자 또는 배우자와 같은 등본에 등재. 이혼한 자녀는 미혼으로 보지 않음</td>
            </tr>
            <tr>
              <td>미혼 자녀 (만 30세 이상)</td>
              <td className="text-cell">최근 1년 이상 계속 같은 등본에 등재</td>
            </tr>
            <tr>
              <td>손자녀</td>
              <td className="text-cell">그 부모가 모두 사망했고 미혼이며 같은 등본에 등재된 경우만</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        2025년 6월 10일부터 가점제 당첨자가 부모를 부양가족에 넣었다면 최근 3년, 만 30세 이상 자녀를 넣었다면 최근
        1년의 건강보험 요양급여 내역을 내야 합니다. 2026년 4월에는 만 30세 이상 자녀의 등재 요건을 1년에서 3년으로
        늘리는 개정안이 입법예고됐지만, 2026년 10월 9일 확인 기준으로 아직 공포되지 않아 이 계산기는 현행 1년 기준을
        안내합니다. 입주자모집공고문에는 해외 체류 기간이나 요양시설 입소에 따른 제외 기준도 함께 실리니 꼭
        확인하세요.
      </p>

      <h2>청약통장 가입기간 계산 시 주의할 점</h2>
      <ul>
        <li>통장 종류나 금액을 바꿔도 최초 가입일을 기준으로 합니다.</li>
        <li>
          미성년자일 때 가입한 기간은 2023년 이전 부분은 최대 2년, 2024년 이후 부분과 합쳐 최대 5년까지만 인정합니다(2024년
          7월 1일 이후 공고, 규칙 제10조제6항). 계산기는 생년월일로 이 한도를 자동 반영합니다.
        </li>
        <li>
          옛 청약예금·청약부금을 해지하는 즉시 그 돈을 주택청약종합저축에 넣었다면(2024년 10월 1일 이후 전환) 예금·부금
          가입기간을 합산합니다.
        </li>
        <li>가점이 같으면 청약통장 가입기간이 긴 사람이 당첨되고, 가입기간도 같으면 추첨합니다(규칙 제28조제7항).</li>
      </ul>

      <h2>가점제 제외와 부적격 주의</h2>
      <ul>
        <li>
          주택을 가진 세대와 과거 2년 이내 가점제로 당첨된 사람이 있는 세대는 가점제 대상에서 빠지고 추첨제로만
          경쟁합니다(규칙 제28조제6항). 다만 투기과열지구·청약과열지역·수도권 공공주택지구가 아닌 곳의 85㎡ 이하
          주택에서는 1주택 세대도 가점제에 들어갈 수 있으며, 이때 무주택기간은 0점입니다.
        </li>
        <li>
          가점은 신청자가 직접 입력하고 당첨 뒤 서류로 검증합니다. 점수가 틀려 부적격 당첨이 되면, 다시 계산한 가점이 그
          주택형의 당첨 가점 이상인 경우가 아니면 당첨이 취소되고, 당첨일부터 수도권 1년, 그 밖의 지역 6개월(투기과열지구·청약과열지역
          1년, 위축지역 3개월) 동안 다른 분양주택에 당첨될 수 없습니다(규칙 제58조).
        </li>
        <li>
          부모를 허위로 전입시키는 위장전입은 단순 착오가 아니라 부정청약으로, 형사처벌과 계약 취소, 청약 제한 대상입니다.
        </li>
      </ul>

      <h2>당첨 가점은 어디서 보나요</h2>
      <p>
        단지·주택형별 당첨자 최저·최고 가점은 당첨자 발표 뒤 한국부동산원{" "}
        <a href={APPLYHOME} rel="noopener">
          청약홈
        </a>
        에서 공개됩니다. 인기 단지는 커트라인이 높아서, 예를 들어 2024년 9월 서울 서초구 디에이치 방배의 당첨 가점은 최저
        69점, 최고 79점이었습니다(
        <a href={NEWS_DH_BANGBAE} rel="noopener">
          아주경제 보도
        </a>
        ). 지역과 주택형마다 차이가 크니 관심 단지의 지난 당첨 가점과 내 점수를 비교해 보세요.
      </p>

      <h2>2024~2026년 바뀐 점</h2>
      <ul>
        <li>2024. 3. 25. 배우자 통장 가입기간 50% 합산(최대 3점), 동점 시 장기 가입자 우선</li>
        <li>2024. 7. 1. 미성년 가입기간 인정 2년 → 최대 5년(2024년 이후 기간 포함)</li>
        <li>2024. 10. 1. 청약예금·부금을 종합저축으로 바로 전환하면 가입기간 합산</li>
        <li>2024. 12. 18. 무주택으로 보는 소형·저가주택 기준 개정(현행 기준은 위 목록)</li>
        <li>2025. 6. 10. 부양가족 실거주 확인을 위한 요양급여 내역 제출</li>
        <li>
          2026. 6. 15. 개정은 신생아·신혼부부·생애최초 특별공급 비율 등을 바꾼 것으로, 가점표(별표 1)는 그대로입니다.
        </li>
      </ul>

      <h2>근거 법령</h2>
      <ul>
        <li>
          <a href={LAW_ANNEX1} rel="noopener">
            주택공급에 관한 규칙 [별표 1] 가점제 적용기준
          </a>{" "}
          (2024. 12. 18. 개정)
        </li>
        <li>
          <a href={LAW_RULE} rel="noopener">
            주택공급에 관한 규칙
          </a>{" "}
          제2조제8호(가점제), 제10조제6항(미성년 가입기간), 제23조제2항(제출 서류), 제28조(민영주택 일반공급), 제53조(주택소유
          판정), 제58조(부적격 당첨자). 현행 국토교통부령 제1592호(2026. 6. 15. 시행)
        </li>
      </ul>
    </ToolShell>
  );
}
