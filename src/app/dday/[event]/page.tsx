import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatKoreanDate, parseYMD, weekdayKo } from "@/lib/date";
import {
  countdownDates,
  DDAY_EVENTS,
  eventStatus,
  eventYMD,
  getEvent,
  type DdayEvent,
  type EventDate,
  type EventStatus,
} from "@/lib/calc/dday";
import { DdayCalculator } from "../DdayCalculator";
import { BUILD_DAY } from "../buildDay";

// Only the listed events exist; anything else is a 404 (required for static export).
// Past events keep their URL (old links still work) but switch to past-tense copy and noindex.
export const dynamicParams = false;

export function generateStaticParams() {
  return DDAY_EVENTS.map((e) => ({ event: e.slug }));
}

type Props = { params: Promise<{ event: string }> };

/**
 * H1 by status on the build date (rebuilt daily):
 * upcoming "수능 D-day: 2026년 11월 19일까지 남은 날" · today "수능 D-day: 바로 오늘, 2026년 11월 19일"
 * · past "2027학년도 수능 날짜: 2026년 11월 19일(목), 지난 일정"
 */
function h1For(e: DdayEvent, status: EventStatus): string {
  const date = eventYMD(e);
  const text = formatKoreanDate(date, false);
  if (status === "past") return `${e.name} 날짜: ${text}(${weekdayKo(date)}), 지난 일정`;
  if (status === "today") return `${e.short} D-day: 바로 오늘, ${text}`;
  return `${e.short} D-day: ${text}까지 남은 날`;
}

function scheduleDate(s: EventDate): string {
  const start = parseYMD(s.date)!;
  const end = s.end ? parseYMD(s.end) : null;
  if (!end) return formatKoreanDate(start);
  const endText = end.y === start.y ? formatKoreanDate(end).replace(`${end.y}년 `, "") : formatKoreanDate(end);
  return `${formatKoreanDate(start)} ~ ${endText}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const e = getEvent((await params).event);
  if (!e) return {};
  const past = eventStatus(e, BUILD_DAY) === "past";
  return pageMetadata({
    title: past ? `${e.short} 날짜 - ${e.name} ${formatKoreanDate(eventYMD(e), false)} (지난 일정)` : e.title,
    description: past ? e.pastDescription : e.description,
    path: `/dday/${e.slug}/`,
    keywords: [...e.keywords, "디데이 계산기"],
    // A passed event is no longer what people searching "D-day" want; keep the page, drop it from the index.
    noindex: past,
  });
}

export default async function DdayEventPage({ params }: Props) {
  const e = getEvent((await params).event);
  if (!e) notFound();
  const date = eventYMD(e);
  const status = eventStatus(e, BUILD_DAY);
  const past = status === "past";
  const steps = countdownDates(date);
  const d100 = steps.find((x) => x.n === 100)!;
  const d30 = steps.find((x) => x.n === 30)!;
  const others = DDAY_EVENTS.filter((x) => x.slug !== e.slug && eventStatus(x, BUILD_DAY) !== "past").sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const faq: FaqItem[] = [
    ...e.faq,
    {
      q: `${e.short} D-100, D-30은 언제인가요?`,
      a: `${e.name}(${formatKoreanDate(date)}) 기준으로 D-100은 ${formatKoreanDate(d100.date)}, D-30은 ${formatKoreanDate(d30.date)}입니다. D-day는 당일을 빼고 세기 때문에 D-1은 ${formatKoreanDate(steps[steps.length - 1].date)}입니다.`,
    },
  ];

  return (
    <ToolShell
      slug="dday"
      path={`/dday/${e.slug}/`}
      extraCrumbs={[{ name: `${e.short} D-day`, path: `/dday/${e.slug}/` }]}
      h1={h1For(e, status)}
      lead={past ? e.pastLead : e.lead}
      basis={e.basis}
      calculator={<DdayCalculator initialTarget={e.date} />}
      faq={faq}
    >
      {past ? (
        <p className="note">
          이 일정은 {formatKoreanDate(date)}에 지났습니다. 위 계산기는 그날부터 지난 날(D+)을 세고, 아래 내용은 일정 당시 기준으로
          정리한 기록입니다. 다음 일정은 공식 발표를 확인한 뒤 디데이 계산기 목록에 반영합니다.
        </p>
      ) : null}
      <h2>{e.name} 한눈에 보기</h2>
      <ul>
        {e.facts.map((f) => (
          <li key={f.label}>
            <strong>{f.label}</strong>: {f.value}
          </li>
        ))}
      </ul>
      {e.body.map((p) => (
        <p key={p.slice(0, 24)}>{p}</p>
      ))}

      <h2>{e.short} 관련 날짜</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">구분</th>
              <th scope="col">날짜</th>
              <th scope="col">비고</th>
            </tr>
          </thead>
          <tbody>
            {e.schedule.map((s) => (
              <tr key={`${s.label}-${s.date}`} className={s.date === e.date && !s.end ? "is-current" : undefined}>
                <td>{s.label}</td>
                <td>{scheduleDate(s)}</td>
                <td>{s.note ?? ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>{e.short} D-100부터 D-1까지 날짜</h2>
      <p>
        D-day는 당일을 빼고 세므로 D-n 날짜는 {e.short} 날짜에서 n일을 뺀 날입니다. 위 계산기는 접속한 날 기준으로{" "}
        {past ? "지난 날을" : "남은 날을 다시"} 세어 보여 줍니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">D-day</th>
              <th scope="col">날짜</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((x) => (
              <tr key={x.n}>
                <td>D-{x.n}</td>
                <td>{formatKoreanDate(x.date)}</td>
              </tr>
            ))}
            <tr className="is-current">
              <td>D-day</td>
              <td>{formatKoreanDate(date)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>출처</h2>
      <ul>
        {e.sources.map((s) => (
          <li key={s.url + s.name}>
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {s.name}
            </a>
          </li>
        ))}
      </ul>
      <p className="note">
        날짜는 2026년 10월 9일에 공식 발표 자료로 확인했습니다. 일정이 바뀌면 발표 기관의 공지가 우선합니다.
      </p>

      <h2>{others.length ? "다른 일정 D-day" : "디데이 계산기"}</h2>
      <nav aria-label="일정별 디데이 페이지" className="link-grid">
        {others.map((x) => (
          <Link key={x.slug} href={`/dday/${x.slug}/`}>
            {x.short} 디데이
          </Link>
        ))}
        <Link href="/dday/">디데이 계산기</Link>
      </nav>
    </ToolShell>
  );
}
