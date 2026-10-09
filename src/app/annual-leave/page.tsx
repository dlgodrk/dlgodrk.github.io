import type { Metadata } from "next";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber } from "@/lib/format";
import { formatKoreanDate, type YMD } from "@/lib/date";
import {
  anniversary,
  annualLeaveDays,
  cumulativeFiscalBasis,
  cumulativeHireBasis,
  fiscalProrataDays,
  hireYearWorkedDays,
  leaveAllowance,
  leaveTable,
  MIN_WAGE_2026,
  monthlyAccrualDates,
  YEARS_TO_CAP,
} from "@/lib/calc/annual-leave";
import { AnnualLeaveCalculator } from "./AnnualLeaveCalculator";

export const metadata: Metadata = pageMetadata({
  title: "연차 계산기 - 입사일·회계연도 기준 연차 개수 계산",
  description:
    "입사일만 넣으면 오늘 기준 연차 개수와 다음 연차 발생일을 계산합니다. 1년 미만은 매달 1일(최대 11일), 1년 80% 출근 시 15일, 근속 3년부터 2년마다 1일씩 늘어 최대 25일. 회계연도 기준 비례 연차도 확인하세요.",
  path: "/annual-leave/",
  keywords: [
    "연차 계산기",
    "연차 개수 계산",
    "1년 미만 연차",
    "회계연도 연차 계산",
    "근속연수별 연차",
    "연차 발생 기준",
    "연차수당 계산",
    "1년 계약직 연차",
  ],
});

const LAW_URL = "https://www.law.go.kr/법령/근로기준법";
const DECREE_URL = "https://www.law.go.kr/법령/근로기준법시행령";

// Worked example used throughout the prose (same as the calculator default).
const EX_HIRE: YMD = { y: 2024, m: 3, d: 4 };
const EX_RETIRE: YMD = { y: 2026, m: 6, d: 30 };

function shortDate(v: YMD): string {
  return `${v.y}. ${v.m}. ${v.d}.`;
}

function days(n: number): string {
  return `${formatNumber(n, 2)}일`;
}

const FAQ: FaqItem[] = [
  {
    q: "입사 1년 차에는 연차가 몇 개인가요?",
    a: "입사 후 1년이 되기 전까지는 1개월 개근할 때마다 1일씩, 최대 11일이 생깁니다. 1년을 채운 다음 날 80% 이상 출근했다면 15일이 새로 생기므로 입사 후 2년 동안 받는 연차는 최대 26일입니다. 1년 미만 때 생긴 11일은 입사 1년이 되는 날 전까지 써야 합니다.",
  },
  {
    q: "1년 계약직이 1년을 채우고 퇴사하면 연차수당은 며칠분인가요?",
    a: "최대 11일분입니다. 15일은 1년 근로를 마친 다음 날(366일째)에 근로관계가 남아 있어야 생기기 때문입니다(대법원 2021다227100, 고용노동부 2021. 12. 16. 행정해석). 하루라도 더 근무해 366일째에 재직 중이면 15일이 더해져 최대 26일분이 됩니다.",
  },
  {
    q: "3년차, 5년차, 10년차 연차는 몇 개인가요?",
    a: "근속 3년을 채운 다음 날, 즉 입사 4년차 첫날에 16일이 생깁니다. 입사 3년차(근속 2년~3년)에는 아직 15일입니다. 같은 방식으로 근속 5년(입사 6년차)에 17일, 근속 10년(입사 11년차)에 19일이 생깁니다. 최초 1년을 넘는 근속연수 2년마다 1일씩 늘어나고, 근속 21년부터는 한도인 25일입니다.",
  },
  {
    q: "연차수당은 어떻게 계산하나요?",
    a: `1일 통상임금에 쓰지 못한 연차 일수를 곱합니다. 1일 통상임금은 통상시급 × 1일 소정근로시간입니다. 2026년 최저시급 ${formatNumber(MIN_WAGE_2026)}원, 하루 8시간이면 1일 ${formatNumber(MIN_WAGE_2026 * 8)}원이고 15일을 남겼다면 ${formatNumber(leaveAllowance(MIN_WAGE_2026, 8, 15))}원입니다.`,
  },
  {
    q: "회계연도 기준으로 연차를 받으면 손해인가요?",
    a: "입사한 해의 연차는 근무 일수에 비례해 줄어들지만, 퇴직할 때 입사일 기준으로 다시 계산해 그보다 적게 받았다면 차이를 연차수당으로 정산해야 합니다. 그래서 최종적으로 법정 기준보다 손해를 보지는 않습니다.",
  },
  {
    q: "5인 미만 사업장도 연차가 있나요?",
    a: "법정 연차는 없습니다. 상시 근로자 4명 이하 사업장은 근로기준법 시행령 별표 1에 따라 연차 규정이 적용되지 않습니다. 다만 근로계약서나 취업규칙에 휴가를 정해 두었다면 회사는 그 약속을 지켜야 합니다.",
  },
];

export default function AnnualLeavePage() {
  const table = leaveTable(YEARS_TO_CAP);
  const monthly = monthlyAccrualDates(EX_HIRE);
  const prorata = fiscalProrataDays(EX_HIRE);
  const worked = hireYearWorkedDays(EX_HIRE);
  const hireTotal = cumulativeHireBasis(EX_HIRE, EX_RETIRE);
  const fiscalTotal = cumulativeFiscalBasis(EX_HIRE, EX_RETIRE);
  const y0 = EX_HIRE.y;
  const compareRows: { when: string; hire: string; fiscal: string }[] = [
    { when: `${shortDate(monthly[0])} ~ ${shortDate(monthly[10])}`, hire: "매달 1일, 11일", fiscal: "매달 1일, 11일" },
    { when: shortDate({ y: y0 + 1, m: 1, d: 1 }), hire: "-", fiscal: `비례 ${days(prorata)}` },
    { when: shortDate(anniversary(EX_HIRE, 1)), hire: days(annualLeaveDays(1)), fiscal: "-" },
    { when: shortDate({ y: y0 + 2, m: 1, d: 1 }), hire: "-", fiscal: days(annualLeaveDays(2)) },
    { when: shortDate(anniversary(EX_HIRE, 2)), hire: days(annualLeaveDays(2)), fiscal: "-" },
    { when: shortDate({ y: y0 + 3, m: 1, d: 1 }), hire: "-", fiscal: days(annualLeaveDays(3)) },
    { when: shortDate(anniversary(EX_HIRE, 3)), hire: days(annualLeaveDays(3)), fiscal: "-" },
  ];
  const dailyWage300 = Math.round((3_000_000 / 209) * 8);

  return (
    <ToolShell
      slug="annual-leave"
      h1="연차 계산기 (입사일·회계연도 기준)"
      lead="입사일을 넣으면 오늘 기준으로 생긴 연차 개수와 다음 연차가 생기는 날을 알려 드려요. 1년 미만은 한 달 개근마다 1일, 1년이 지나면 15일이고 2년마다 1일씩 늘어 최대 25일입니다."
      basis="근로기준법 제60조·제61조(2020. 3. 31. 개정 반영) 기준 · 2026년 10월 9일 확인"
      calculator={<AnnualLeaveCalculator />}
      faq={FAQ}
    >
      <h2>연차 계산 방법</h2>
      <p>
        연차 유급휴가는{" "}
        <a href={`${LAW_URL}/제60조`} rel="noopener">
          근로기준법 제60조
        </a>
        가 정합니다. 상시 근로자 5명 이상 사업장에서 주 15시간 이상 일하는 근로자라면 정규직, 계약직, 아르바이트 등 고용
        형태와 관계없이 같은 규칙이 적용되고, 단시간 근로자는 근로시간 비율만큼 받습니다.
      </p>
      <ul>
        <li>
          <strong>입사 1년 미만</strong>: 1개월 개근할 때마다 1일, 최대 11일(제2항). 입사 1년이 되는 날 전까지 써야 합니다.
        </li>
        <li>
          <strong>1년 이상</strong>: 1년간 80% 이상 출근하면 15일(제1항). 80%에 못 미치면 그 1년 중 개근한 달마다 1일입니다.
          최초 1년이 80%에 못 미치면 15일은 생기지 않고, 그 1년 동안 개근한 달마다 생긴 월차만 남습니다.
        </li>
        <li>
          <strong>3년 이상</strong>: 최초 1년을 넘는 근속연수 2년마다 1일을 더하고, 총 25일이 한도입니다(제4항).
        </li>
      </ul>
      <p className="formula">연차 일수 = 15 + (근속연수 − 1) ÷ 2의 몫 &nbsp;(최대 25일)</p>
      <p>
        예를 들어 {formatKoreanDate(EX_HIRE, false)}에 입사했다면 {formatKoreanDate(monthly[0], false)}부터{" "}
        {formatKoreanDate(monthly[10], false)}까지 매달 1일씩 <strong>11일</strong>이 생깁니다. 1년을 채운 다음 날인{" "}
        {formatKoreanDate(anniversary(EX_HIRE, 1), false)}에 <strong>15일</strong>,{" "}
        {formatKoreanDate(anniversary(EX_HIRE, 2), false)}에 다시 15일, 근속 3년이 되는{" "}
        {formatKoreanDate(anniversary(EX_HIRE, 3), false)}에 <strong>16일</strong>이 생깁니다. 1년 차에 쓴 월차를 2년 차
        15일에서 빼던 규정은 2018년 5월 29일 시행된 개정으로 없어졌습니다.
      </p>

      <h2>근속연수별 연차 일수표</h2>
      <p>입사일 기준, 매년 80% 이상 출근했을 때 근속연수마다 새로 생기는 연차입니다. 누계에는 1년 미만 때 생긴 11일이 들어 있습니다.</p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">근속연수</th>
              <th scope="col">연차 일수</th>
              <th scope="col">가산 일수</th>
              <th scope="col">입사 후 누계</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row) => (
              <tr key={row.years}>
                <td>{row.years === YEARS_TO_CAP ? `${row.years}년 이상` : `${row.years}년`}</td>
                <td>{row.days}일</td>
                <td>{row.bonus ? `+${row.bonus}일` : "-"}</td>
                <td>{formatNumber(row.cumulative)}일</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>1년 계약직과 366일 규칙</h2>
      <p>
        15일은 1년 근로를 마친 <strong>다음 날(366일째)</strong>에 근로관계가 남아 있어야 생깁니다. 대법원은 1년 기간제
        계약이 끝나 퇴직한 근로자에게는 최대 11일만 생긴다고 판단했고(2021. 10. 14. 선고 2021다227100), 고용노동부도 2021년
        12월 16일부터 정규직과 계약직 모두에 같은 기준을 적용하도록 행정해석을 바꿨습니다.
      </p>
      <p>
        반대로 1년을 넘겨 366일째에 재직 중이면 15일이 더해져 최대 26일이 됩니다(대법원 2022. 9. 7. 선고 2022다245419). 1년만
        일하고 그만둔다면 근로관계가 입사 1주년 당일까지 이어지는지에 따라 연차수당이 15일분 달라집니다. 또한 2020년 3월 31일
        개정으로 1년 미만 때 생긴 월차는 입사 1년이 되는 날 전까지 써야 하고, 이 월차에도 사용촉진제도가 적용됩니다.
      </p>

      <h2>회계연도 기준과 입사일 기준 비교</h2>
      <p>
        법의 원칙은 입사일 기준이지만, 고용노동부 행정해석은 관리 편의를 위해 회계연도(1월 1일~12월 31일) 단위로 연차를 주는
        것도 허용합니다. 단, 근로자에게 불리하지 않아야 합니다. 입사한 해의 몫은 근무 일수에 비례해 다음 해 1월 1일에 줍니다.
      </p>
      <p className="formula">비례 연차 = 15일 × 입사일부터 12월 31일까지 재직일수 ÷ 365</p>
      <p>
        {formatKoreanDate(EX_HIRE, false)} 입사자는 {y0}년 재직일수가 {worked}일이라 {y0 + 1}년 1월 1일에 15 × {worked} ÷ 365
        = 약 <strong>{days(prorata)}</strong>이 생기고, 1년 미만 월차 11일은 따로 생깁니다. 그 뒤로는 매년 1월 1일에 연차가
        생깁니다.
      </p>
      <p>
        회계연도 기준에서 가산휴가를 언제부터 붙이는지는 법령에 따로 정해져 있지 않습니다. 이 계산기는 근로자에게 불리하지 않도록 입사 연도를 1년으로
        쳐서 가산휴가를 계산합니다. 회사에 따라 가산 시점이 1년 늦을 수 있지만, 퇴직 때는 입사일 기준과 비교해 정산합니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>{formatKoreanDate(EX_HIRE, false)} 입사자의 연차 발생</caption>
          <thead>
            <tr>
              <th scope="col">발생일</th>
              <th scope="col">입사일 기준</th>
              <th scope="col">회계연도 기준</th>
            </tr>
          </thead>
          <tbody>
            {compareRows.map((row) => (
              <tr key={row.when}>
                <td>{row.when}</td>
                <td>{row.hire}</td>
                <td>{row.fiscal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        퇴직할 때는 두 방식의 누계를 비교해 입사일 기준이 더 많으면 그 차이를 연차수당으로 정산해야 합니다. 위 근로자가{" "}
        {formatKoreanDate(EX_RETIRE, false)}까지 일했다면 입사일 기준 누계는 {days(hireTotal)}, 회계연도 기준 누계는{" "}
        {days(fiscalTotal)}이라 <strong>{days(hireTotal - fiscalTotal)}분</strong>을 더 정산받습니다. 반대로 회계연도 기준으로
        더 받아 이미 쓴 연차를 퇴직 때 임금에서 빼려면 취업규칙 등에 정산 근거가 있어야 한다는 것이 일반적인 해석입니다.
      </p>

      <h2>연차수당 계산</h2>
      <p>쓰지 못한 연차는 사용 기간(발생 후 1년)이 끝난 뒤나 퇴직할 때 수당으로 받습니다.</p>
      <p className="formula">연차수당 = 1일 통상임금 × 미사용 연차 일수</p>
      <p>
        1일 통상임금은 통상시급 × 1일 소정근로시간(보통 8시간)입니다. 2026년 최저시급 {formatNumber(MIN_WAGE_2026)}원이면 1일{" "}
        {formatNumber(MIN_WAGE_2026 * 8)}원, 15일을 모두 남기면 {formatNumber(leaveAllowance(MIN_WAGE_2026, 8, 15))}원입니다. 월
        통상임금 300만원(월 209시간)이라면 1일 약 {formatNumber(dailyWage300)}원이라 10일분은{" "}
        {formatNumber(leaveAllowance(3_000_000 / 209, 8, 10))}원입니다. 임금채권이라 3년이 지나면 청구할 수 없습니다.
      </p>

      <h2>연차 사용촉진제도</h2>
      <p>
        회사가{" "}
        <a href={`${LAW_URL}/제61조`} rel="noopener">
          근로기준법 제61조
        </a>
        의 절차를 지키면 근로자가 쓰지 않아 소멸한 연차에 대해 수당을 주지 않아도 됩니다.
      </p>
      <ul>
        <li>
          <strong>1년 이상 근로자</strong>: 사용 기간이 끝나기 6개월 전을 기준으로 10일 안에 남은 일수를 알리고 사용 시기를 정해
          달라고 서면으로 촉구합니다. 근로자가 10일 안에 정하지 않으면 끝나기 2개월 전까지 회사가 시기를 정해 서면으로 알립니다.
        </li>
        <li>
          <strong>1년 미만 근로자의 월차</strong>: 입사 1년이 되기 3개월 전 기준 10일 안에 촉구하고(그 뒤 생긴 월차는 1개월 전
          기준 5일 안), 1개월 전까지 시기를 지정해 알립니다(뒤에 생긴 월차는 10일 전까지).
        </li>
      </ul>
      <p>
        절차를 하나라도 빠뜨렸거나, 지정한 휴가일에 출근한 근로자에게 일을 시키면서 노무 수령을 거부하지 않았다면 수당을 줘야
        합니다.
      </p>

      <h2>5인 미만 사업장과 단시간 근로자</h2>
      <p>
        상시 근로자 4명 이하 사업장은{" "}
        <a href={DECREE_URL} rel="noopener">
          근로기준법 시행령
        </a>{" "}
        제7조 [별표 1]에 따라 연차 규정이 적용되지 않습니다. 회사가 근로계약서나 취업규칙으로 휴가를 약속했다면 그 내용을
        따릅니다. 4주 평균 1주 소정근로시간이 15시간 미만인 초단시간 근로자도 연차가 없고(제18조 제3항), 15시간 이상인 단시간
        근로자는 통상 근로자 연차를 근로시간 비율로 나눈 만큼 시간 단위로 받습니다. 출근율을 따질 때 업무상 재해로 쉰 기간,
        출산전후휴가·유산사산휴가 기간, 육아휴직 기간은 출근한 것으로 보고, 육아기·임신기 근로시간 단축으로 줄어든 근로시간도
        출근한 것으로 봅니다(제60조 제6항).
      </p>
      <p className="note">
        근거: 근로기준법 제18조·제60조·제61조, 같은 법 시행령 제7조 [별표 1], 대법원 2021다227100·2022다245419 판결, 고용노동부
        행정해석(2021. 12. 16. 시행). 회사 취업규칙이 법보다 유리하면 그에 따릅니다.
      </p>
    </ToolShell>
  );
}
