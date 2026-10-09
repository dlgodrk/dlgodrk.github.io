import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { weekdayKo } from "@/lib/date";
import {
  dayOfWeek,
  HOLIDAY_PAGE_YEARS,
  HOLIDAY_SOURCES,
  holidayBlocks,
  holidaysOf,
  holidayYMD,
  isBridge,
  leaveDatesLabel,
  leaveTips,
  longestByLeave,
  md,
  mdw,
  monthlyWorkdays,
  plainName,
  rangeLabel,
  TIP_MAX_LEAVE,
  yearSummary,
  type Holiday,
  type LeavePlan,
  type LeaveTip,
} from "@/lib/calc/holidays";
import { HolidaysCalculator } from "../HolidaysCalculator";
import { HolidayList } from "../HolidayList";
import { blockRange, extremeMonths, GoldenList, LeaveTipList, LeaveTipsTable, listedBlocks, MonthlyTable, YearStats } from "../YearTables";

const LABOR_DECREE_URL = "https://www.law.go.kr/법령/근로기준법시행령";

// Only years with verified holiday data exist; anything else is a 404 (required for static export).
export const dynamicParams = false;

export function generateStaticParams() {
  return HOLIDAY_PAGE_YEARS.map((y) => ({ year: String(y) }));
}

type Props = { params: Promise<{ year: string }> };

function parse(raw: string): number | null {
  const n = Number(raw);
  return HOLIDAY_PAGE_YEARS.includes(n) ? n : null;
}

const BASIS: Record<number, string> = {
  2026: "한국천문연구원 2026년 달력자료 · 관공서의 공휴일에 관한 규정(노동절·제헌절 반영) 기준 · 2026년 10월 9일 확인",
  2027: "우주항공청 2027년도 월력요항(2026년 6월 29일 발표) · 관공서의 공휴일에 관한 규정 기준 · 2026년 10월 9일 확인",
};

/** Year-specific facts (합니다체). */
const NOTES: Record<number, { title: string; paragraphs: string[] }> = {
  2026: {
    title: "2026년에 새로 생긴 공휴일과 주의할 점",
    paragraphs: [
      "2026년에는 노동절(5월 1일)이 처음으로 관공서 공휴일이 되었고, 제헌절(7월 17일)이 2008년 이후 18년 만에 다시 공휴일이 되었습니다. 「공휴일에 관한 법률」 개정(제헌절 2026년 1월 29일, 노동절 3월 31일 국회 통과)에 따라 「관공서의 공휴일에 관한 규정」이 2026년 4월 30일 개정되었고, 두 날 모두 금요일이라 대체공휴일은 생기지 않았습니다. 한국천문연구원 2026년 달력자료에는 5월 1일이 아직 ‘근로자의 날’ 기념일로만 적혀 있지만, 개정 규정이 2026년 5월 1일부터 시행되어 이 표에는 공휴일로 넣었습니다.",
      "6월 3일 제9회 전국동시지방선거일은 같은 규정 제2조 제10호의2에 따른 공휴일이었습니다. 추석 연휴 다음 월요일인 9월 28일을 임시공휴일로 지정하자는 요청이 있었지만 지정되지 않았고, 2026년에는 임시공휴일이 없습니다.",
    ],
  },
  2027: {
    title: "2027년에 달라지는 점",
    paragraphs: [
      "2027년에는 노동절(5월 1일)과 제헌절(7월 17일)이 모두 토요일이라, 2026년 개정 규정에 따라 처음으로 노동절·제헌절 대체공휴일(5월 3일, 7월 19일)이 생깁니다. 우주항공청은 2027년 월력요항에서 일요일 52일과 공휴일 24일을 더한 관공서 공휴일이 76일이고, 일요일과 겹치는 4일(설날, 현충일, 광복절, 개천절)을 한 번만 세면 실질 공휴일이 72일이라고 밝혔습니다.",
      "민간 회사도 상시 근로자 5명 이상이면 근로기준법 시행령 제30조 제2항에 따라 관공서 공휴일과 「관공서의 공휴일에 관한 규정」 제3조의 대체공휴일을 유급휴일로 줘야 합니다. 개정 규정 제3조가 노동절을 대체공휴일 대상에 넣었으므로 5월 3일 노동절 대체공휴일도 유급휴일이고, 5명 미만 사업장은 이 의무가 없습니다. 고용노동부가 2026년 4월 노동절 당일을 다른 근무일과 맞바꾸는 ‘휴일대체’를 할 수 없다고 해석한 것은 이와 별개의 문제입니다.",
      "2027년에는 임기만료에 따른 선거가 없어 선거일 공휴일이 없습니다(다음 국회의원 선거는 2028년). 2026년 10월 9일 현재 2027년 임시공휴일로 지정된 날도 없습니다.",
    ],
  },
};

const NO_SUB_REASON: Partial<Record<Holiday["category"], string>> = {
  newyear: "1월 1일은 대체공휴일 대상이 아님",
  memorial: "현충일은 대체공휴일 대상이 아님",
  seollal: "설 연휴는 일요일과 겹칠 때만 대체공휴일",
  chuseok: "추석 연휴는 일요일과 겹칠 때만 대체공휴일",
  election: "선거일은 대체공휴일 대상이 아님",
};

function yearData(year: number) {
  const sum = yearSummary(year);
  const list = holidaysOf(year);
  const subs = list.filter((h) => h.substituteFor);
  const replaced = new Set(subs.map((h) => h.substituteFor));
  const lost = list.filter((h) => {
    const w = dayOfWeek(holidayYMD(h));
    return !h.substituteFor && (w === 0 || w === 6) && !replaced.has(h.date);
  });
  const golden = holidayBlocks(year).filter((b) => b.length >= 3);
  const blocks = listedBlocks(year);
  const tips = leaveTips(year);
  const recs = tips.flatMap((tip) => tip.plans.map((rec) => ({ tip, rec })));
  // Longest recommended stretch; ties → fewer 연차, then one that starts in this year, then earlier.
  const longestRec = recs.reduce<(typeof recs)[number] | null>((best, x) => {
    if (!best) return x;
    const d = x.rec.length - best.rec.length || best.rec.leave - x.rec.leave || Number(x.rec.start.y === year) - Number(best.rec.start.y === year);
    return d > 0 ? x : best;
  }, null);
  const longestBase = blocks.reduce((a, b) => (b.length > a.length ? b : a), blocks[0]);
  // Exact longest stretch for each 연차 count 1..TIP_MAX_LEAVE (not only the recommended ones).
  const maxima = longestByLeave(tips);
  // 징검다리: tips whose recommended stretch joins two 연휴 with 연차 in between (longest such plan per tip).
  const bridges = tips
    .map((tip) => ({ tip, rec: tip.plans.filter((p) => isBridge(p)).sort((a, b) => b.length - a.length)[0] }))
    .filter((x): x is { tip: LeaveTip; rec: LeavePlan } => x.rec !== undefined);
  const months = monthlyWorkdays(year);
  const minMonth = extremeMonths(months, "min");
  const maxMonth = extremeMonths(months, "max");
  return { sum, list, subs, lost, golden, tips, longestRec, longestBase, maxima, bridges, minMonth, maxMonth };
}

/** FAQ answer to "가장 길게 쉴 수 있는 연휴" from the exact per-연차 maxima. */
function longestAnswer({ longestBase, maxima, bridges }: Pick<ReturnType<typeof yearData>, "longestBase" | "maxima" | "bridges">): string {
  const parts = [`연차 없이 가장 긴 연휴는 ${longestBase.name} ${blockRange(longestBase)} ${longestBase.length}일입니다.`];
  if (maxima.length) {
    const top = maxima[0].tip;
    if (maxima.every((m) => m.tip === top)) {
      parts.push(
        `연차를 붙였을 때 가장 길게 쉬는 연휴는 ${top.name}입니다. 연차 ${maxima.map((m) => `${m.leave}일이면 ${m.plan.length}일`).join(", ")}까지 이어서 쉴 수 있습니다.`,
      );
      const rec = top.plans[0];
      if (rec) {
        parts.push(
          `${top.name}의 추천 조합은 ${leaveDatesLabel(rec.leaveDates)} 연차 ${rec.leave}일로, ${blockRange(rec)} ${rec.length}일을 쉽니다.`,
        );
      }
    } else {
      parts.push(`연차 일수별로 가장 긴 연휴는 ${maxima.map((m) => `${m.leave}일 ${m.tip.name} ${m.plan.length}일`).join(", ")}입니다.`);
    }
  }
  const others = bridges.filter((x) => x.tip !== maxima[0]?.tip);
  if (others.length) {
    parts.push(
      `연차로 두 연휴를 잇는 징검다리 연휴는 ${others
        .map(({ tip, rec }) => `${tip.label} ${rangeLabel(rec.start, rec.end)}(연차 ${rec.leave}일, ${rec.length}일)`)
        .join(", ")}입니다.`,
    );
  }
  return parts.join(" ");
}

function originalOf(year: number, h: Holiday): Holiday | undefined {
  return holidaysOf(year).find((o) => o.date === h.substituteFor);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const year = parse((await params).year);
  if (year === null) return {};
  const { sum, golden, longestRec } = yearData(year);
  return pageMetadata({
    title: `${year}년 공휴일 총정리 - 대체공휴일·황금연휴·연차 꿀팁`,
    description: `${year}년 실질 공휴일은 일요일 포함 ${sum.realDays}일, 평일에 쉬는 공휴일은 ${sum.onWeekdays}일입니다. 대체공휴일 ${sum.substitutes}일, 3일 이상 연휴 ${golden.length}번${longestRec ? `, 연차 ${longestRec.rec.leave}일로 ${longestRec.rec.length}일 쉬는 방법` : ""}과 월별 근무일수까지 정리했습니다.`,
    path: `/holidays/${year}/`,
    keywords: [`${year} 공휴일`, `${year}년 대체공휴일`, `${year} 황금연휴`, `${year} 연차 꿀팁`, `${year}년 근무일수`, `${year} 빨간날`],
  });
}

export default async function HolidaysYearPage({ params }: Props) {
  const year = parse((await params).year);
  if (year === null) notFound();
  const data = yearData(year);
  const { sum, subs, lost, golden, longestRec, maxima, minMonth, maxMonth } = data;
  const notes = NOTES[year];
  const others = HOLIDAY_PAGE_YEARS.filter((y) => y !== year);
  const maxAll = maxima[maxima.length - 1];

  const faq: FaqItem[] = [
    {
      q: `${year}년 공휴일은 모두 며칠인가요?`,
      a: `월력요항 방식으로 일요일 ${sum.sundays}일과 공휴일 지정일 ${sum.designated}일(대체공휴일 ${sum.substitutes}일 포함)을 더한 관공서 공휴일은 ${sum.officialDays}일이고, 일요일과 겹친 ${sum.onSunday}일을 한 번만 센 실질 공휴일은 ${sum.realDays}일입니다. 공휴일 지정일 가운데 평일(월~금)에 쉬는 날은 ${sum.onWeekdays}일이고, 주 5일 근무자는 토·일요일을 더해 모두 ${sum.restDays5}일을 쉽니다.`,
    },
    {
      q: `${year}년 대체공휴일은 언제인가요?`,
      a: `${subs.length}일입니다. ${subs
        .map((h) => {
          const d = holidayYMD(h);
          const o = originalOf(year, h);
          return `${md(d)}(${weekdayKo(d)}${o ? `, ${plainName(o)} 대체` : ""})`;
        })
        .join(", ")}. 원래 공휴일이 토요일이나 일요일과 겹쳐 다음 첫 평일에 쉬는 날입니다.`,
    },
    {
      q: `${year}년 근무일수는 며칠인가요?`,
      a: `주 5일 근무 기준 ${sum.workdays5}일, 토요일도 일하는 주 6일 기준 ${sum.workdays6}일입니다. 근무일수가 가장 적은 달은 ${minMonth.months}(${minMonth.days}일), 가장 많은 달은 ${maxMonth.months}(${maxMonth.days}일)입니다.`,
    },
    {
      q: `${year}년에 가장 길게 쉴 수 있는 연휴는 언제인가요?`,
      a: longestAnswer(data),
    },
    year === 2027
      ? {
          q: "2027년 노동절에도 대체공휴일이 있나요?",
          a: "네. 2027년 5월 1일 노동절이 토요일이라 5월 3일(월)이 대체공휴일입니다. 2026년 개정된 「관공서의 공휴일에 관한 규정」으로 노동절도 대체공휴일 대상이 되었고, 월력요항과 한국천문연구원 달력에도 반영되어 있습니다. 상시 근로자 5명 이상 사업장은 근로기준법 시행령 제30조 제2항에 따라 5월 3일도 유급휴일로 줘야 하고, 5명 미만 사업장은 의무가 없습니다. 노동절 당일을 다른 날과 맞바꾸는 휴일대체가 안 된다는 고용노동부 해석과는 별개입니다.",
        }
      : {
          q: "2026년 9월 28일은 임시공휴일인가요?",
          a: "아니요. 추석 연휴(9월 24~26일) 다음 월요일인 9월 28일을 임시공휴일로 지정하자는 요청이 있었지만 정부는 지정하지 않았습니다. 추석 다음 날(9월 26일)이 토요일이었지만 설·추석 연휴는 일요일과 겹칠 때만 대체공휴일이 생겨 대체공휴일도 없습니다.",
        },
  ];

  return (
    <ToolShell
      slug="holidays"
      path={`/holidays/${year}/`}
      extraCrumbs={[{ name: `${year}년 공휴일`, path: `/holidays/${year}/` }]}
      h1={`${year}년 공휴일: 실질 공휴일 ${sum.realDays}일, 황금연휴와 연차 꿀팁`}
      lead={`${year}년 실질 공휴일은 일요일을 포함해 ${sum.realDays}일이고, 평일에 쉬는 공휴일은 ${sum.onWeekdays}일입니다. 주 5일 근무라면 토·일요일을 더해 ${sum.restDays5}일을 쉬고, 연차를 붙이면 더 길게 쉴 수 있어요.`}
      basis={BASIS[year]}
      calculator={<HolidaysCalculator initialMode="leave" initialYear={year} />}
      faq={faq}
    >
      <h2>{year}년 공휴일 전체 목록</h2>
      <p>
        대체공휴일 {sum.substitutes}일을 포함해 공휴일로 지정된 날은 {sum.designated}일입니다. 이 가운데 {sum.onSaturday}일은
        토요일, {sum.onSunday}일은 일요일과 겹칩니다.
      </p>
      <HolidayList year={year} />

      <h2>{year}년 공휴일 일수</h2>
      <p>
        월력요항은 일요일과 공휴일 지정일을 더해 관공서 공휴일을 셉니다. {year}년은 일요일 {sum.sundays}일에 공휴일 지정일{" "}
        {sum.designated}일을 더한 {sum.officialDays}일이 관공서 공휴일이고, 일요일과 겹치는 {sum.onSunday}일을 한 번만 세면
        실질 공휴일이 <strong>{sum.realDays}일</strong>입니다. 주 5일 근무자는 여기에 토요일 {sum.saturdays}일을 더하고
        토요일과 겹친 공휴일 {sum.onSaturday}일을 빼 <strong>{sum.restDays5}일</strong>을 쉽니다.
      </p>
      <YearStats year={year} />

      <h2>
        {year}년 대체공휴일 {subs.length}일
      </h2>
      <ul>
        {subs.map((h) => {
          const o = originalOf(year, h);
          return (
            <li key={h.date}>
              <strong>{mdw(holidayYMD(h))}</strong>:{" "}
              {o ? `${plainName(o)}(${md(holidayYMD(o))})이 ${weekdayKo(holidayYMD(o))}요일과 겹쳐서` : h.name}
            </li>
          );
        })}
      </ul>
      {lost.length ? (
        <>
          <p>아래 공휴일은 주말과 겹쳤지만 대체공휴일이 생기지 않습니다.</p>
          <ul>
            {lost.map((h) => (
              <li key={h.date}>
                {mdw(holidayYMD(h))} {h.name}: {NO_SUB_REASON[h.category] ?? "대체공휴일 대상이 아님"}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      <h2>
        {year}년 황금연휴: 3일 이상 연휴 {golden.length}번
      </h2>
      <p>연차를 쓰지 않고 주 5일 근무자가 사흘 이상 이어서 쉬는 연휴입니다.</p>
      <GoldenList year={year} />

      <h2>{year}년 연차 꿀팁</h2>
      <p>
        연휴 앞뒤 근무일에 연차를 {TIP_MAX_LEAVE}일까지 붙였을 때 이어서 쉴 수 있는 가장 긴 날수입니다. 연차 하루에 따라붙는
        주말·공휴일이 가장 많은 조합을 추천으로 골랐고, 연차 4일을 써서 주말 이틀만 더 붙는 조합은 뺐습니다. 같은 연차로
        이어지는 이웃 연휴는 한 줄로 묶었습니다.
        {longestRec
          ? ` 추천 조합 가운데 가장 긴 연휴는 ${longestRec.tip.label}에 맞춰 ${leaveDatesLabel(longestRec.rec.leaveDates)}에 연차 ${longestRec.rec.leave}일을 쓰는 것으로, ${blockRange(longestRec.rec)}까지 ${longestRec.rec.length}일을 쉽니다.`
          : ""}
        {maxAll
          ? ` 추천과 관계없이 연차 ${maxAll.leave}일 안에서 가장 길게 쉬는 방법은 ${maxAll.tip.name}에 ${leaveDatesLabel(maxAll.plan.leaveDates)} 연차를 붙여 ${blockRange(maxAll.plan)} ${maxAll.plan.length}일을 쉬는 것입니다.`
          : ""}
      </p>
      <LeaveTipList year={year} />
      <LeaveTipsTable year={year} />

      <h2>{year}년 월별 근무일수</h2>
      <p>
        주 5일 근무 기준 {year}년 근무일수는 {sum.workdays5}일입니다. 가장 적은 달은 {minMonth.months}({minMonth.days}일),
        가장 많은 달은 {maxMonth.months}({maxMonth.days}일)입니다. 원하는 기간은 위 계산기의 ‘근무일수’에서 바로 셀 수 있습니다.
      </p>
      <MonthlyTable year={year} />

      {notes ? (
        <>
          <h2>{notes.title}</h2>
          {notes.paragraphs.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </>
      ) : null}

      <h2>출처와 함께 보기</h2>
      <ul>
        {HOLIDAY_SOURCES[year].map((s) => (
          <li key={s.url}>
            <a href={s.url}>{s.name}</a>
          </li>
        ))}
        <li>
          <a href={LABOR_DECREE_URL}>근로기준법 시행령</a> 제30조 제2항 (5인 이상 사업장의 공휴일·대체공휴일 유급휴일)
        </li>
        <li>
          설·추석까지 남은 날은 <Link href="/dday/">디데이 계산기</Link>, 쓸 수 있는 연차 개수는{" "}
          <Link href="/annual-leave/">연차 계산기</Link>에서 확인하세요.
        </li>
      </ul>
      <nav aria-label="연도별 공휴일 페이지" className="link-grid">
        <Link href="/holidays/">근무일수 계산기</Link>
        {others.map((y) => (
          <Link key={y} href={`/holidays/${y}/`}>
            {y}년 공휴일
          </Link>
        ))}
      </nav>
    </ToolShell>
  );
}
