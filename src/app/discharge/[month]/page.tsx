import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { addMonths, daysInMonth, formatKoreanDate, formatYMD, weekdayKo, type YMD } from "@/lib/date";
import { formatNumber } from "@/lib/format";
import {
  DISCHARGE_PAGE_MONTHS,
  formatDotDate,
  mondaysOf,
  monthSlug,
  parseMonthSlug,
  promotionDates,
  sampleEntryDate,
  sergeantMonths,
  SERVICE_TYPES,
  serviceEndDate,
  totalServiceDays,
  typicalEndMonth,
} from "@/lib/calc/discharge";
import { DischargeCalculator } from "../DischargeCalculator";

// Only the listed months exist; anything else is a 404 (required for static export).
export const dynamicParams = false;

export function generateStaticParams() {
  return DISCHARGE_PAGE_MONTHS.map((month) => ({ month }));
}

type Props = { params: Promise<{ month: string }> };

const BASIS = "병무청 복무기간 기준(육군·해병대 18개월, 해군 20개월, 공군 21개월) · 2026년 10월 9일 확인";

function ym(v: { y: number; m: number }): string {
  return `${v.y}년 ${v.m}월`;
}

/** Facts shared by metadata and the page body. */
function monthFacts(y: number, m: number) {
  const army = typicalEndMonth(y, m, 18);
  const navy = typicalEndMonth(y, m, 20);
  const air = typicalEndMonth(y, m, 21);
  const first: YMD = { y, m, d: 1 };
  return { army, navy, air, first, armyFirstEnd: serviceEndDate(first, 18) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const parsed = parseMonthSlug((await params).month);
  if (!parsed) return {};
  const { y, m } = parsed;
  const f = monthFacts(y, m);
  return pageMetadata({
    title: `${y}년 ${m}월 입대 전역일 - 육군 ${ym(f.army)} 전역`,
    description: `${y}년 ${m}월 2일~말일에 입대하면 육군·해병대는 ${ym(f.army)}, 해군은 ${ym(f.navy)}, 공군은 ${ym(f.air)}에 전역합니다(1일 입대는 하루 빠름). 입대일별 전역일표와 진급 예정일을 확인하세요.`,
    path: `/discharge/${monthSlug(y, m)}/`,
    keywords: [`${y}년 ${m}월 입대 전역일`, `${String(y).slice(2)}년 ${m}월 군번 전역일`, `${m}월 입대 전역`, "전역일 계산기"],
  });
}

export default async function DischargeMonthPage({ params }: Props) {
  const slug = (await params).month;
  const parsed = parseMonthSlug(slug);
  if (!parsed) notFound();
  const { y, m } = parsed;
  const f = monthFacts(y, m);
  const sample = sampleEntryDate(y, m);
  const sampleArmyEnd = serviceEndDate(sample, 18);
  const second: YMD = { y, m, d: 2 };
  const last: YMD = { y, m, d: daysInMonth(y, m) };
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

  const faq: FaqItem[] = [
    {
      q: `${y}년 ${m}월에 입대하면 언제 전역하나요?`,
      a: `${m}월 2일부터 말일 사이에 입대하면 육군·해병대는 ${ym(f.army)}, 해군은 ${ym(f.navy)}, 공군은 ${ym(f.air)}에 전역합니다. 예를 들어 ${formatKoreanDate(sample, false)}에 육군으로 입대하면 ${formatKoreanDate(sampleArmyEnd, false)}에 전역합니다. ${m}월 1일 입대자는 하루 이른 ${formatKoreanDate(f.armyFirstEnd, false)}(육군 기준)에 전역합니다.`,
    },
    {
      q: `${y}년 ${m}월 입대 육군은 언제 병장이 되나요?`,
      a: `정상 진급 기준으로 ${m}월 2일 이후 입대자는 ${formatKoreanDate(promoLater.일병, false)} 일병, ${formatKoreanDate(promoLater.상병, false)} 상병, ${formatKoreanDate(promoLater.병장, false)} 병장이 되어 병장으로 약 ${sgtMonthsLater}~${sgtMonthsLater + 1}개월 복무합니다. ${m}월 1일 입대자는 모두 한 달씩 빠릅니다.`,
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
      h1={`${y}년 ${m}월 입대 전역일 (육군 ${ym(f.army)})`}
      lead={`${y}년 ${m}월에 입대하면 육군·해병대는 ${ym(f.army)}, 해군은 ${ym(f.navy)}, 공군은 ${ym(f.air)}에 전역합니다. ${m}월 1일 입대자는 하루 이른 ${formatKoreanDate(f.armyFirstEnd, false)}(육군 기준)에 전역합니다.`}
      basis={BASIS}
      calculator={<DischargeCalculator initialDate={formatYMD(sample)} />}
      faq={faq}
    >
      <h2>
        {y}년 {m}월 입대 전역일 계산
      </h2>
      <p className="formula">
        {formatKoreanDate(sample, false)} + 18개월 = {formatKoreanDate(addMonths(sample, 18), false)} → 전날{" "}
        {formatKoreanDate(sampleArmyEnd, false)} 전역
      </p>
      <p>
        전역일은 입대일부터 복무기간이 지난 달의 같은 날짜 전날입니다. {formatKoreanDate(sample)}에 육군으로 입대하면{" "}
        <strong>{formatKoreanDate(sampleArmyEnd)}</strong>에 전역하고, 입대일과 전역일을 포함한 전체 복무일수는{" "}
        {formatNumber(totalServiceDays(sample, sampleArmyEnd))}일입니다. 같은 날 해군으로 입대하면{" "}
        {formatKoreanDate(serviceEndDate(sample, 20), false)}, 공군은 {formatKoreanDate(serviceEndDate(sample, 21), false)}에
        전역합니다. {m}월 2일부터 {last.d}일 사이에 입대한 육군 병사의 전역일은{" "}
        {formatKoreanDate(serviceEndDate(second, 18), false)}부터 {formatKoreanDate(serviceEndDate(last, 18), false)} 사이입니다.
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
        {y}년 {m}월 입대 육군 진급 예정일
      </h2>
      <p>
        진급은 매월 1일에 하며 이병 2개월, 일병 6개월, 상병 6개월을 채워야 합니다. {m}월 2일 이후 입대자는 병장으로 약{" "}
        {sgtMonthsLater}~{sgtMonthsLater + 1}개월 복무하고 전역합니다. 진급 심사에서 누락되거나 조기 진급하면 날짜가 달라집니다.
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
