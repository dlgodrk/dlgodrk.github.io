import type { Metadata } from "next";
import Link from "next/link";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber } from "@/lib/format";
import { diffDays, formatKoreanDate, ymd } from "@/lib/date";
import { dayMilestoneDate, dayNumberOn, ddayLabel, eventYMD, pastEvents, upcomingEvents, yearMilestoneDate } from "@/lib/calc/dday";
import { BUILD_DAY } from "./buildDay";
import { DdayCalculator } from "./DdayCalculator";

export const metadata: Metadata = pageMetadata({
  title: "디데이 계산기 - D-day, 날짜 사이 일수, 100일 계산",
  description:
    "목표일까지 남은 날(D-day), 두 날짜 사이 일수, 며칠 뒤 날짜, 100일·1000일 기념일을 바로 계산합니다. 사귄 날을 1일로 세면 100일은 사귄 날로부터 99일 뒤입니다.",
  path: "/dday/",
  keywords: ["디데이 계산기", "D-day 계산", "날짜 계산기", "며칠 남았는지", "100일 계산", "날짜 사이 일수", "기념일 계산"],
});

// Fixed example start date used in the prose tables (not "today").
const EXAMPLE = ymd(2026, 10, 9);

const FAQ: FaqItem[] = [
  {
    q: "디데이 계산할 때 오늘도 포함하나요?",
    a: "일반적인 D-day는 오늘을 빼고 셉니다. 내일이 목표일이면 D-1입니다. 오늘을 1일째로 치는 기념일 방식으로 세면 하루가 늘어나서, D-41인 날은 오늘부터 42일째가 됩니다.",
  },
  {
    q: "사귄 지 100일은 언제인가요?",
    a: `사귄 날을 1일로 세기 때문에 사귄 날에 99일을 더한 날이 100일입니다. 2026년 10월 9일에 사귀었다면 100일은 ${formatKoreanDate(dayMilestoneDate(EXAMPLE, 100))}입니다.`,
  },
  {
    q: "D-day 당일은 D-0인가요?",
    a: "목표일 당일은 보통 D-day라고 부르고, 하루 전이 D-1, 다음 날부터 D+1, D+2로 셉니다.",
  },
  {
    q: "1주년은 365일째인가요?",
    a: "1주년은 다음 해 같은 날짜라서 시작일을 1일로 세면 366일째입니다. 사이에 2월 29일이 끼면 367일째가 됩니다. 아기 돌도 같은 방식입니다.",
  },
  {
    q: "날짜 사이 평일 수에 공휴일도 빠지나요?",
    a: "아니요. 평일 수는 토요일과 일요일만 뺀 월~금요일 수입니다. 설·추석 같은 공휴일은 따로 빼야 합니다.",
  },
  {
    q: "2월 29일에 시작하면 1주년은 언제인가요?",
    a: "평년에는 3월 1일로 봅니다. 민법 제160조 제3항에 따라 2월 29일부터 센 1년은 해당 날짜가 없는 평년에 2월 28일이 끝나면 차고, 다음 해는 3월 1일부터 시작됩니다. 2월 29일에 태어난 아기도 3월 1일에 돌을 맞아 만 1세가 됩니다. 기념일을 2월 28일에 챙기는 것은 자유입니다.",
  },
];

export default function DdayPage() {
  const dayRows = [100, 200, 300, 500, 1000];
  // Split on the build date (the site is rebuilt every day at 00:05 KST).
  const upcoming = upcomingEvents(BUILD_DAY);
  const past = pastEvents(BUILD_DAY);
  return (
    <ToolShell
      slug="dday"
      h1="디데이 계산기 (D-day·날짜 계산)"
      lead="목표일까지 남은 날, 두 날짜 사이 일수, 며칠 뒤 날짜, 100일·1000일 기념일을 한 번에 계산해 드려요. 오늘 날짜는 접속한 날 기준으로 자동 반영돼요."
      basis="한국 시간(KST) 기준 · 기간 계산은 민법 제157조·제160조 원칙"
      calculator={<DdayCalculator />}
      faq={FAQ}
    >
      <h2>디데이 계산 방법</h2>
      <p>
        디데이(D-day)는 목표일에서 오늘 날짜를 뺀 날수입니다. 목표일 하루 전이 D-1, 당일이 D-day이고, 지난 뒤에는 D+1, D+2처럼
        셉니다. 오늘은 세지 않고 목표일은 세는 방식입니다.
      </p>
      <p className="formula">D-n의 n = 목표일 − 오늘 (오늘 제외, 목표일 포함)</p>
      <p>
        예를 들어 2026년 10월 9일에 2027학년도 수능(2026년 11월 19일)까지 세면 10월에 22일, 11월에 19일이 남아 <strong>D-41</strong>
        입니다. 오늘도 하루로 치면 수능 날은 42일째 되는 날이고, 오늘과 수능 날을 모두 빼면 그 사이에 온전히 남은 날은 40일입니다.
      </p>

      <h2>기념일은 첫날을 1일로 셉니다</h2>
      <p>
        연인의 100일, 아기의 백일처럼 날수로 세는 기념일은 사귄 날이나 태어난 날을 <strong>1일째</strong>로 셉니다. 그래서 100일은
        시작일에서 99일 뒤이고, 1000일은 999일 뒤입니다. 반면 1주년이나 돌처럼 해 단위 기념일은 날수와 상관없이 다음 해 같은
        날짜라서, 평년이라면 시작일부터 366일째가 됩니다.
      </p>
      <p className="formula">N일 기념일 = 시작일 + (N − 1)일 &nbsp;&nbsp;|&nbsp;&nbsp; N주년 = N년 뒤 같은 날짜</p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>2026년 10월 9일에 사귀었거나 태어났다면</caption>
          <thead>
            <tr>
              <th scope="col">기념일</th>
              <th scope="col">시작일에서</th>
              <th scope="col">며칠째</th>
              <th scope="col">날짜</th>
            </tr>
          </thead>
          <tbody>
            {dayRows.map((n) => (
              <tr key={n}>
                <td>{n === 100 ? "100일 (백일)" : `${formatNumber(n)}일`}</td>
                <td>+{formatNumber(n - 1)}일</td>
                <td>{formatNumber(n)}일째</td>
                <td>{formatKoreanDate(dayMilestoneDate(EXAMPLE, n))}</td>
              </tr>
            ))}
            {[1, 2].map((y) => {
              const date = yearMilestoneDate(EXAMPLE, y);
              return (
                <tr key={`y${y}`}>
                  <td>{y === 1 ? "1주년 (돌)" : "2주년 (두 돌)"}</td>
                  <td>+{formatNumber(diffDays(EXAMPLE, date))}일</td>
                  <td>{formatNumber(dayNumberOn(EXAMPLE, date))}일째</td>
                  <td>{formatKoreanDate(date)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>날짜 사이 일수: 첫날을 넣을까 뺄까</h2>
      <p>
        법에서 기간을 계산할 때는 첫날을 빼는 것이 원칙입니다(「민법」 제157조, 초일 불산입). 다만 기간이 오전 0시부터 시작하면
        첫날도 셉니다. 나이를 셀 때는 출생일을 포함하고(제158조), 기간은 마지막 날이 끝나면 만료됩니다(제159조). 기간을 주·월·연으로
        정했다면 달력에 따라 계산하고, 마지막 달에 같은 날짜가 없으면 그 달 말일에 끝납니다(제160조).
      </p>
      <p>
        이 계산기의 ‘날짜 사이’는 기본으로 첫날을 빼고 세며, ‘시작일도 하루로 세기’를 켜면 기념일 방식처럼 1일을 더합니다. 예를 들어
        2026년 1월 1일부터 12월 31일까지는 첫날을 빼면 364일, 포함하면 365일입니다. 개월 수도 같은 원칙으로 1월 31일의 한 달 뒤는
        2월 28일(윤년은 29일)로 봅니다. 첫날을 포함해 세면 1월 31일부터 2월 말일까지가 꼭 1개월이고, 다음 달은 3월 1일부터 셉니다.
        만 나이와 아기의 생후 개월 수도 이렇게 셉니다. 근거 조문은{" "}
        <a href="https://www.law.go.kr/법령/민법" target="_blank" rel="noopener noreferrer">
          국가법령정보센터 민법
        </a>
        에서 확인할 수 있습니다.
      </p>
      <p className="note">
        평일 수는 토·일만 뺀 값입니다. 공휴일과 대체공휴일은 해마다 달라 따로 빼야 하며, 근무일·영업일 계산이 필요하면 회사 달력을
        함께 확인하세요.
      </p>

      <h2>주요 일정 D-day</h2>
      {upcoming.length ? (
        <>
          <p>날짜를 공식 발표로 확인한 다가오는 일정입니다. 각 페이지에서 남은 날과 연휴, 관련 날짜를 함께 볼 수 있습니다.</p>
          <div className="table-wrap">
            <table className="data-table">
              <caption>{formatKoreanDate(BUILD_DAY)} 기준</caption>
              <thead>
                <tr>
                  <th scope="col">일정</th>
                  <th scope="col">날짜</th>
                  <th scope="col">D-day</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((e) => (
                  <tr key={e.slug}>
                    <td>
                      <Link href={`/dday/${e.slug}/`}>{e.name}</Link>
                    </td>
                    <td>{formatKoreanDate(eventYMD(e))}</td>
                    <td>{ddayLabel(diffDays(BUILD_DAY, eventYMD(e)))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav aria-label="일정별 디데이 페이지" className="link-grid">
            {upcoming.map((e) => (
              <Link key={e.slug} href={`/dday/${e.slug}/`}>
                {e.short} 디데이
              </Link>
            ))}
          </nav>
        </>
      ) : (
        <p>지금 등록된 다가오는 일정이 없습니다. 다음 일정은 공식 발표를 확인한 뒤 추가합니다. 위 계산기에서 날짜를 직접 골라 세어 보세요.</p>
      )}
      {past.length ? (
        <>
          <h3>지난 일정</h3>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">일정</th>
                  <th scope="col">날짜</th>
                </tr>
              </thead>
              <tbody>
                {past.map((e) => (
                  <tr key={e.slug}>
                    <td>
                      <Link href={`/dday/${e.slug}/`}>{e.name}</Link>
                    </td>
                    <td>{formatKoreanDate(eventYMD(e))} · 지남</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </ToolShell>
  );
}
