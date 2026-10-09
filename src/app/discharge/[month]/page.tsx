import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { addMonths, compareYMD, daysInMonth, formatKoreanDate, formatYMD, weekdayKo, type YMD } from "@/lib/date";
import { formatNumber } from "@/lib/format";
import {
  cohortStatus,
  DISCHARGE_PAGE_MONTHS,
  formatDotDate,
  mondaysOf,
  monthAllDischarged,
  monthSlug,
  PAGE_BRANCHES,
  parseMonthSlug,
  promotionDates,
  reserveSpan,
  reserveYearIn,
  sampleEntryDate,
  sergeantMonths,
  SERVICE_TYPES,
  serviceEndDate,
  totalServiceDays,
  typicalEndMonth,
  type CohortStatus,
} from "@/lib/calc/discharge";
import { DischargeCalculator } from "../DischargeCalculator";
import { BUILD_DAY } from "../buildDay";

// Only the listed months exist; anything else is a 404 (required for static export).
// Months whose enlistees have all been discharged stay indexed (people look up their own 군번) but switch to
// past-tense copy and lead with 예비군 연차, which is what that reader needs next. The site is rebuilt daily,
// so BUILD_DAY moves pages from future to past tense on their own.
export const dynamicParams = false;

export function generateStaticParams() {
  return DISCHARGE_PAGE_MONTHS.map((month) => ({ month }));
}

type Props = { params: Promise<{ month: string }> };

const BASIS = "병무청 복무기간 기준(육군·해병대 18개월, 해군 20개월, 공군 21개월), 예비군법 제3조 · 2026년 10월 9일 확인";

type YM = { y: number; m: number };

type Branch = { label: string; months: number; end: YM; status: CohortStatus };

function ym(v: YM): string {
  return `${v.y}년 ${v.m}월`;
}

/** Topic particle for a label: "육군·해병대는", "해군은". */
function topic(word: string): string {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  const hasFinal = code >= 0 && code <= 11171 && code % 28 !== 0;
  return `${word}${hasFinal ? "은" : "는"}`;
}

function labels(bs: Branch[]): string {
  return bs.map((b) => b.label).join("·");
}

/** Facts shared by metadata and the page body. */
function monthFacts(y: number, m: number, today: YMD) {
  const first: YMD = { y, m, d: 1 };
  const last: YMD = { y, m, d: daysInMonth(y, m) };
  const branches: Branch[] = PAGE_BRANCHES.map((b) => ({
    label: b.label,
    months: b.months,
    end: typicalEndMonth(y, m, b.months),
    status: cohortStatus(y, m, b.months, today),
  }));
  const armyFirstEnd = serviceEndDate(first, 18);
  return {
    army: branches[0].end,
    navy: branches[1].end,
    air: branches[2].end,
    first,
    last,
    armyFirstEnd,
    branches,
    allDone: monthAllDischarged(y, m, today),
    anyDone: branches.some((b) => b.status === "done"),
  };
}

type Facts = ReturnType<typeof monthFacts>;

/**
 * One sentence on when a group of enlistees is discharged, in the right tense for `today`.
 * `who` names the group: "2025년 6월" or "6월 2일부터 말일 사이".
 *   all done: "… 입대자는 육군·해병대 2025년 12월, 해군 …에 모두 전역했습니다."
 *   none:     "… 입대하면 육군·해병대는 2026년 12월, 해군은 …에 전역합니다."
 *   mixed:    "… 입대자 중 육군·해병대는 2026년 8월에 이미 전역했고, 해군은 …에 전역합니다."
 */
function dischargeSummary(who: string, bs: Branch[]): string {
  const done = bs.filter((b) => b.status === "done");
  const rest = bs.filter((b) => b.status !== "done");
  const withTopic = (list: Branch[]) => list.map((b) => `${topic(b.label)} ${ym(b.end)}`).join(", ");
  if (rest.length === 0) return `${who} 입대자는 ${bs.map((b) => `${b.label} ${ym(b.end)}`).join(", ")}에 모두 전역했습니다.`;
  if (done.length === 0) return `${who}에 입대하면 ${withTopic(bs)}에 전역합니다.`;
  return `${who} 입대자 중 ${withTopic(done)}에 이미 전역했고, ${withTopic(rest)}에 전역합니다.`;
}

/** Branches grouped by a numeric key, in branch order: [[2026, [육군·해병대]], [2027, [해군, 공군]]]. */
function groupBy(bs: Branch[], key: (b: Branch) => number): [number, Branch[]][] {
  const out: [number, Branch[]][] = [];
  for (const b of bs) {
    const k = key(b);
    const g = out.find(([x]) => x === k);
    if (g) g[1].push(b);
    else out.push([k, [b]]);
  }
  return out;
}

/** "육군·해병대는 2026년, 해군·공군은 2027년" (or "육군·해병대·해군·공군 모두 2027년") as 예비군 1년차. */
function reserveFirstYears(bs: Branch[]): { text: string; groups: [number, Branch[]][] } {
  const groups = groupBy(bs, (b) => reserveSpan({ ...b.end, d: 1 }).firstYear);
  const text =
    groups.length === 1
      ? `${labels(bs)} 모두 ${groups[0][0]}년`
      : groups.map(([yr, g]) => `${topic(labels(g))} ${yr}년`).join(", ");
  return { text, groups };
}

/** "육군·해병대는 2026년, 해군·공군은 2027년이 예비군 1년차이고, 예비군이 끝나는 날은 각각 …입니다." */
function reserveStartSentence(bs: Branch[]): string {
  const { text, groups } = reserveFirstYears(bs);
  const ends = groups.map(([yr]) => `${yr + 7}년 12월 31일`);
  return groups.length === 1
    ? `${text}이 예비군 1년차이고, 8년차인 ${ends[0]}에 예비군이 끝납니다.`
    : `${text}이 예비군 1년차이고, 8년차 말인 ${ends.join(", ")}에 각각 예비군이 끝납니다.`;
}

/** This year's 연차 for the branches already discharged, or "" when none are. */
function reserveNowSentence(bs: Branch[], today: YMD): string {
  const done = bs.filter((b) => b.status === "done");
  const groups = groupBy(done, (b) => reserveYearIn({ ...b.end, d: 1 }, today.y) ?? -1).filter(([n]) => n >= 0);
  if (groups.length === 0) return "";
  const parts = groups.map(([n, g]) =>
    n === 0 ? `${topic(labels(g))} 올해 전역해 ${today.y + 1}년부터 1년차` : `${topic(labels(g))} ${n}년차`,
  );
  return ` ${today.y}년 현재 ${parts.join(", ")}입니다.`;
}

/** Table cell: where the branch stands as 예비군 this year. */
function reserveNowCell(b: Branch, today: YMD): string {
  if (b.status === "before") return "입대 전";
  if (b.status === "serving") return "복무 중";
  if (b.status === "ending") return `${b.end.m}월 중 차례로 전역`;
  const n = reserveYearIn({ ...b.end, d: 1 }, today.y);
  if (n === null) return "예비군 끝";
  return n === 0 ? "올해 전역 (연차 전)" : `${n}년차`;
}

function metaFor(y: number, m: number, f: Facts) {
  if (f.allDone) {
    return {
      title: `${y}년 ${m}월 입대 전역일·예비군 연차 - 육군 ${ym(f.army)} 전역`,
      description: `${dischargeSummary(`${y}년 ${m}월 2일~말일`, f.branches)} 1일 입대는 하루 빠릅니다. 입대일별 전역일표와 예비군 1년차(육군 ${f.army.y + 1}년), 예비군이 끝나는 해를 확인하세요.`,
    };
  }
  return {
    title: `${y}년 ${m}월 입대 전역일 - 육군 ${ym(f.army)} 전역`,
    description: `${dischargeSummary(`${y}년 ${m}월 2일~말일`, f.branches)} 1일 입대는 하루 빠릅니다. 입대일별 전역일표와 진급 예정일, 예비군 1년차를 확인하세요.`,
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const parsed = parseMonthSlug((await params).month);
  if (!parsed) return {};
  const { y, m } = parsed;
  const f = monthFacts(y, m, BUILD_DAY);
  return pageMetadata({
    ...metaFor(y, m, f),
    path: `/discharge/${monthSlug(y, m)}/`,
    keywords: [
      `${y}년 ${m}월 입대 전역일`,
      `${String(y).slice(2)}년 ${m}월 군번 전역일`,
      `${m}월 입대 전역`,
      `${String(y).slice(2)}년 ${m}월 군번 예비군`,
      "전역일 계산기",
    ],
  });
}

export default async function DischargeMonthPage({ params }: Props) {
  const slug = (await params).month;
  const parsed = parseMonthSlug(slug);
  if (!parsed) notFound();
  const { y, m } = parsed;
  const today = BUILD_DAY;
  const f = monthFacts(y, m, today);
  const past = (v: YMD) => compareYMD(v, today) < 0;
  /** "전역했고," / "전역하고," or "전역했습니다." / "전역합니다." by whether `v` has passed. */
  const discharged = (v: YMD, end: boolean) => (past(v) ? (end ? "전역했습니다" : "전역했고") : end ? "전역합니다" : "전역하고");

  const sample = sampleEntryDate(y, m);
  const sampleArmyEnd = serviceEndDate(sample, 18);
  const sampleNavyEnd = serviceEndDate(sample, 20);
  const sampleAirEnd = serviceEndDate(sample, 21);
  const second: YMD = { y, m, d: 2 };
  const last = f.last;
  const promoFirst = promotionDates(f.first);
  const promoLater = promotionDates(second);
  const sgtMonthsLater = sergeantMonths(second, 18);
  const mondays = mondaysOf(y, m);
  const days = Array.from({ length: daysInMonth(y, m) }, (_, i): YMD => ({ y, m, d: i + 1 }));
  const armyDays = days.map((v) => totalServiceDays(v, serviceEndDate(v, 18)));
  const minDays = Math.min(...armyDays);
  const maxDays = Math.max(...armyDays);
  const armyDaysSentence =
    minDays === maxDays
      ? `육군 기준 전체 복무일수는 이 달 입대자 모두 ${formatNumber(minDays)}일입니다.`
      : `육군 기준 전체 복무일수는 입대일에 따라 ${formatNumber(minDays)}~${formatNumber(maxDays)}일입니다.`;
  const path = `/discharge/${slug}/`;
  const firstDaySentence = `${m}월 1일 입대자는 하루 이른 ${formatKoreanDate(f.armyFirstEnd, false)}(육군 기준)에 ${discharged(f.armyFirstEnd, true)}.`;
  const doneBranches = f.branches.filter((b) => b.status === "done");
  const longestDone = doneBranches[doneBranches.length - 1];
  const promoPast = past(promoLater.병장);
  const armyDone = f.branches[0].status === "done";
  // When people who enlist on the 2nd or later finish in January, the 1st's enlistee finishes on 12월 31일 a year earlier.
  const januaryEnds = f.branches.filter((b) => b.end.m === 1);
  const reserveSpanArmy = reserveSpan({ ...f.army, d: 1 });

  const lead = f.allDone
    ? `${dischargeSummary(`${y}년 ${m}월`, f.branches)} 예비군은 전역한 다음 해가 1년차라 ${reserveFirstYears(f.branches).text}이 1년차입니다.`
    : `${dischargeSummary(`${y}년 ${m}월`, f.branches)} ${firstDaySentence}`;

  const faq: FaqItem[] = [
    {
      q: f.allDone
        ? `${y}년 ${m}월 입대자는 언제 전역했나요?`
        : f.anyDone
          ? `${y}년 ${m}월 입대자는 언제 전역하나요?`
          : `${y}년 ${m}월에 입대하면 언제 전역하나요?`,
      a: `${dischargeSummary(`${m}월 2일부터 말일 사이`, f.branches)} 예를 들어 ${formatKoreanDate(sample, false)} 육군 입대자는 ${formatKoreanDate(sampleArmyEnd, false)}에 ${discharged(sampleArmyEnd, true)}. ${firstDaySentence}`,
    },
    {
      q: `${y}년 ${m}월 입대 육군은 언제 병장이 ${promoPast ? "됐나요" : "되나요"}?`,
      a: `정상 진급 기준으로 ${m}월 2일 이후 입대자는 ${formatKoreanDate(promoLater.일병, false)} 일병, ${formatKoreanDate(promoLater.상병, false)} 상병, ${formatKoreanDate(promoLater.병장, false)} 병장이 ${promoPast ? "되었고" : "되어"} 병장으로 약 ${sgtMonthsLater}~${sgtMonthsLater + 1}개월 복무${armyDone ? "한 뒤 전역했습니다" : "합니다"}. ${m}월 1일 입대자는 모두 한 달씩 빠릅니다.`,
    },
    {
      q: f.anyDone ? `${y}년 ${m}월 입대자는 예비군 몇 년차인가요?` : `${y}년 ${m}월에 입대하면 예비군 1년차는 언제인가요?`,
      a: `예비군 연차는 전역한 다음 해가 1년차이고, 전역한 해는 연차에 넣지 않습니다. ${m}월 2일 이후 입대자 기준으로 ${reserveStartSentence(f.branches)}${reserveNowSentence(f.branches, today)}`,
    },
    {
      q: `${m}월 1일 입대와 ${m}월 2일 입대는 무엇이 다른가요?`,
      a: `전역일은 하루 차이지만 진급은 한 달 차이가 납니다. 이병은 입대일부터 꽉 채운 2개월이 지나야 다음 달 1일에 일병이 되는데, 1일 입대자는 ${formatKoreanDate(promoFirst.일병, false)}에 2개월을 채우고 2일 입대자는 하루가 모자라 ${formatKoreanDate(promoLater.일병, false)}에 일병이 됩니다.`,
    },
  ];

  return (
    <ToolShell
      slug="discharge"
      path={path}
      extraCrumbs={[{ name: `${y}년 ${m}월 입대`, path }]}
      h1={
        f.allDone
          ? `${y}년 ${m}월 입대 전역일 (육군 ${ym(f.army)}, 모두 전역)`
          : `${y}년 ${m}월 입대 전역일 (육군 ${ym(f.army)})`
      }
      lead={lead}
      basis={BASIS}
      calculator={<DischargeCalculator initialDate={formatYMD(sample)} />}
      faq={faq}
    >
      {f.allDone ? (
        <p className="note">
          이 달에 입대한 현역병은 공군 기준 {formatKoreanDate(serviceEndDate(last, 21), false)}까지 모두 전역했습니다. 아래 표는
          입대일별 전역일과 진급일을 다시 확인할 수 있도록 남겨 둔 기록입니다. 위 계산기에 입대일을 넣으면 전역 후 지난 날과
          올해 예비군 연차를 볼 수 있습니다.
        </p>
      ) : longestDone ? (
        <p className="note">
          이 달에 입대한 {topic(labels(doneBranches))}{" "}
          {formatKoreanDate(serviceEndDate(last, longestDone.months), false)}까지 모두 전역했습니다. 나머지 군은 아래 표의
          날짜에 전역합니다.
        </p>
      ) : null}

      <h2>
        {y}년 {m}월 입대 전역일 계산
      </h2>
      <p className="formula">
        {formatKoreanDate(sample, false)} + 18개월 = {formatKoreanDate(addMonths(sample, 18), false)} → 전날{" "}
        {formatKoreanDate(sampleArmyEnd, false)} 전역
      </p>
      <p>
        전역일은 입대일부터 복무기간이 지난 달의 같은 날짜 전날입니다. {formatKoreanDate(sample)} 육군 입대자는{" "}
        <strong>{formatKoreanDate(sampleArmyEnd)}</strong>에 {discharged(sampleArmyEnd, false)}, 입대일과 전역일을 포함한 전체
        복무일수는 {formatNumber(totalServiceDays(sample, sampleArmyEnd))}일입니다. 같은 날 해군 입대자는{" "}
        {formatKoreanDate(sampleNavyEnd, false)}에 {discharged(sampleNavyEnd, false)}, 공군 입대자는{" "}
        {formatKoreanDate(sampleAirEnd, false)}에 {discharged(sampleAirEnd, true)}. {m}월 2일부터 {last.d}일 사이에 입대한
        육군 병사의 전역일은 {formatKoreanDate(serviceEndDate(second, 18), false)}부터{" "}
        {formatKoreanDate(serviceEndDate(last, 18), false)} 사이입니다.
      </p>

      <h2>
        {y}년 {m}월 입대일별 군별 전역일
      </h2>
      <p>
        현역병 입영일은 월요일인 경우가 많아 이 달의 월요일({mondays.map((v) => `${v.d}일`).join(", ")})을 강조했습니다.{" "}
        {armyDaysSentence}
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>상근예비역은 육군과 같은 18개월</caption>
          <thead>
            <tr>
              <th scope="col">입대일</th>
              <th scope="col">육군·해병대 (18개월)</th>
              <th scope="col">해군 (20개월)</th>
              <th scope="col">공군 (21개월)</th>
            </tr>
          </thead>
          <tbody>
            {days.map((v) => (
              <tr key={v.d} className={weekdayKo(v) === "월" ? "is-current" : undefined}>
                <td>
                  {m}월 {v.d}일 ({weekdayKo(v)})
                </td>
                <td>{formatDotDate(serviceEndDate(v, 18))}</td>
                <td>{formatDotDate(serviceEndDate(v, 20))}</td>
                <td>{formatDotDate(serviceEndDate(v, 21))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>
        {y}년 {m}월 입대자 예비군 연차
      </h2>
      <p>
        <a href="https://www.law.go.kr/법령/예비군법" target="_blank" rel="noopener noreferrer">
          예비군법
        </a>{" "}
        제3조에 따라 현역병과 상근예비역은 전역한 다음 날부터 8년이 되는 해의 12월 31일까지 예비군에 편성됩니다. 연차는
        1월~12월 단위로 세어 전역한 해는 넣지 않고 다음 해가 1년차, 전역 연도에 8을 더한 해가 마지막 8년차입니다. 이 달
        2일 이후에 입대한 육군·해병대라면 {reserveSpanArmy.firstYear}년이 1년차이고{" "}
        {formatKoreanDate(reserveSpanArmy.endDate, false)}에 예비군이 끝납니다. 병 출신은 보통 1~4년차에 동원훈련(동원
        지정 시 2박 3일) 대상이 되고, 5~6년차에는 거주지 예비군 훈련장에서 기본훈련과 작계훈련을 받습니다. 연차별 훈련
        종류와 시간은 해마다 국방부 예비군 훈련 계획으로 정해지므로 소집 통지서와{" "}
        <a href="https://www.yebigun1.mil.kr/" target="_blank" rel="noopener noreferrer">
          예비군 홈페이지
        </a>
        에서 확인하세요.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>
            {m}월 2일~말일 입대 기준. 상근예비역은 육군과 같습니다.
            {januaryEnds.length > 0
              ? ` ${m}월 1일 입대자는 ${labels(januaryEnds)} 전역일이 전년도 12월 31일이라 예비군 1년차와 끝나는 해가 한 해씩 빠릅니다.`
              : ""}
          </caption>
          <thead>
            <tr>
              <th scope="col">군</th>
              <th scope="col">전역</th>
              <th scope="col">예비군 1년차</th>
              <th scope="col">예비군 끝 (8년차)</th>
              <th scope="col">{today.y}년</th>
            </tr>
          </thead>
          <tbody>
            {f.branches.map((b) => {
              const span = reserveSpan({ ...b.end, d: 1 });
              return (
                <tr key={b.label} className={b.status === "done" ? "is-current" : undefined}>
                  <td>{b.label}</td>
                  <td>{ym(b.end)}</td>
                  <td>{span.firstYear}년</td>
                  <td>{formatDotDate(span.endDate, false)}</td>
                  <td>{reserveNowCell(b, today)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>
        {m}월 1일 시작 시 복무 형태별 만료일
      </h2>
      <p>
        사회복무요원 소집, 산업기능요원·전문연구요원 편입 등 다른 복무 형태도 {m}월 1일에 시작했다고 보고 만료일을
        정리했습니다. 1일에 시작하면 복무기간(개월)만큼 뒤 1일의 전날, 즉 그 전달 말일에 만료됩니다. 예를 들어 18개월
        복무라면 {formatKoreanDate(addMonths(f.first, 18), false)}의 전날인 {formatKoreanDate(f.armyFirstEnd, false)}에
        끝납니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">복무 형태</th>
              <th scope="col">복무기간</th>
              <th scope="col">
                {y}.{m}.1 시작 시
              </th>
            </tr>
          </thead>
          <tbody>
            {SERVICE_TYPES.map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td>{t.months}개월</td>
                <td>{formatDotDate(serviceEndDate(f.first, t.months))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>
        {y}년 {m}월 입대 육군 진급 {promoPast ? "일정" : "예정일"}
      </h2>
      <p>
        진급은 매월 1일에 하며 이병 2개월, 일병 6개월, 상병 6개월을 채워야 합니다. {m}월 2일 이후 입대자는 병장으로 약{" "}
        {sgtMonthsLater}~{sgtMonthsLater + 1}개월 복무{armyDone ? "하고 전역했습니다" : "하고 전역합니다"}. 진급 심사에서
        누락되거나 조기 진급하면 날짜가 달라집니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">계급</th>
              <th scope="col">{m}월 1일 입대</th>
              <th scope="col">
                {m}월 2일~{last.d}일 입대
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>일병</td>
              <td>{formatDotDate(promoFirst.일병)}</td>
              <td>{formatDotDate(promoLater.일병)}</td>
            </tr>
            <tr>
              <td>상병</td>
              <td>{formatDotDate(promoFirst.상병)}</td>
              <td>{formatDotDate(promoLater.상병)}</td>
            </tr>
            <tr>
              <td>병장</td>
              <td>{formatDotDate(promoFirst.병장)}</td>
              <td>{formatDotDate(promoLater.병장)}</td>
            </tr>
            <tr>
              <td>전역</td>
              <td>{formatDotDate(f.armyFirstEnd)}</td>
              <td>
                {formatDotDate(serviceEndDate(second, 18), false)}~{formatDotDate(serviceEndDate(last, 18), false)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>다른 달 입대 전역일</h2>
      <nav aria-label="입대 월별 전역일 페이지" className="link-grid">
        {DISCHARGE_PAGE_MONTHS.map((s) => {
          const p = parseMonthSlug(s)!;
          return (
            <Link key={s} href={`/discharge/${s}/`} aria-current={s === slug ? "page" : undefined}>
              {p.y}년 {p.m}월 입대
            </Link>
          );
        })}
      </nav>
      <p className="note">
        <Link href="/discharge/">전역일 계산기</Link>에서 사회복무요원, 산업기능요원 등 다른 복무 형태와 오늘 기준 남은 날, 복무율을
        계산할 수 있습니다.
      </p>
    </ToolShell>
  );
}
