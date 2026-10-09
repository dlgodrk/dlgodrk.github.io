import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { RULE_YEAR, RULES_CHECKED_AT } from "@/lib/site";
import { compareYMD, parseYMD } from "@/lib/date";
import {
  AGE_PAGE_FIRST_YEAR,
  AGE_PAGE_YEARS,
  cohortMilestones,
  EARLY_PENSION_MAX_YEARS,
  ganjiOfYear,
  josa,
  LAST_EARLY_ENTRY_BIRTH_YEAR,
  manAgeRangeInYear,
  manAgeRangeLabel,
  neighborYears,
  pensionStartAge,
  sameTtiYears,
  schoolYears,
  shortYear,
  type SchoolYears,
} from "@/lib/calc/age";
import { AgeCalculator } from "../AgeCalculator";

// Only the listed birth years exist; anything else is a 404 (required for static export).
export const dynamicParams = false;

export function generateStaticParams() {
  return AGE_PAGE_YEARS.map((y) => ({ year: String(y) }));
}

type Props = { params: Promise<{ year: string }> };

/** The date the page's rules were checked (2026-10-09). Events before it are written in the past tense. */
const RULE_DATE = parseYMD(RULES_CHECKED_AT) ?? { y: RULE_YEAR, m: 1, d: 1 };

/** Past tense when 1 March of `year` (school entry) is on or before RULE_DATE. */
function marchTense(year: number, past: string, future: string): string {
  return compareYMD({ y: year, m: 3, d: 1 }, RULE_DATE) <= 0 ? past : future;
}

function parse(raw: string): number | null {
  const n = Number(raw);
  return AGE_PAGE_YEARS.includes(n) ? n : null;
}

/** Everything the page and its metadata say about one birth year. */
function facts(Y: number) {
  const R = RULE_YEAR;
  const range = manAgeRangeInYear(Y, R);
  const g = ganjiOfYear(Y);
  return {
    R,
    Y,
    yy: shortYear(Y),
    a: R - Y,
    range,
    rangeLabel: manAgeRangeLabel(Y, R),
    g,
    prevG: ganjiOfYear(Y - 1),
    school: schoolYears(Y, 3),
    earlySchool: Y <= LAST_EARLY_ENTRY_BIRTH_YEAR ? schoolYears(Y, 1) : null,
    pension: pensionStartAge(Y),
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const Y = parse((await params).year);
  if (Y === null) return {};
  const f = facts(Y);
  const ageSentence =
    f.range.before === null
      ? `${Y}년생(${f.yy}년생)은 ${f.R}년 만 0세, 연 나이 0세입니다.`
      : `${Y}년생(${f.yy}년생)은 ${f.R}년 생일 전 만 ${f.range.before}세, 생일이 지나면 만 ${f.range.after}세이고 연 나이는 ${f.a}세입니다.`;
  const schoolPart = f.school ? `초등학교 입학은 ${f.school.elementaryEntry}년, ` : "";
  return pageMetadata({
    title: `${Y}년생 나이 (${f.yy}년생) - ${f.R}년 ${f.rangeLabel}, ${f.g.tti}`,
    description: `${ageSentence} ${f.g.name}년 ${f.g.tti}이며, ${schoolPart}국민연금 수급 나이는 만 ${f.pension}세입니다. 나이별 이정표와 주변 연도 나이표를 확인하세요.`,
    path: `/age/${Y}/`,
    keywords: [
      `${Y}년생 나이`,
      `${f.yy}년생 나이`,
      `${Y}년생 띠`,
      `${f.yy}년생 띠`,
      `${f.yy}년생 만나이`,
      `${Y}년생 몇살`,
      "만 나이 계산기",
    ],
  });
}

function SchoolTable({ school, early }: { school: SchoolYears; early: SchoolYears | null }) {
  const rows: { label: string; pick: (s: SchoolYears) => string }[] = [
    { label: "초등학교 입학", pick: (s) => `${s.elementaryEntry}년 3월` },
    { label: "초등학교 졸업", pick: (s) => `${s.elementaryGrad}년 2월` },
    { label: "중학교 입학", pick: (s) => `${s.middleEntry}년 3월` },
    { label: "중학교 졸업", pick: (s) => `${s.middleGrad}년 2월` },
    { label: "고등학교 입학", pick: (s) => `${s.highEntry}년 3월` },
    { label: "고등학교 졸업", pick: (s) => `${s.highGrad}년 2월` },
    { label: "대학 입학 (재수 없이)", pick: (s) => `${s.universityEntry}년 3월` },
  ];
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th scope="col">구분</th>
            <th scope="col">{early ? "3~12월생" : "연도"}</th>
            {early ? <th scope="col">1·2월생 (빠른년생)</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td>{row.label}</td>
              <td>{row.pick(school)}</td>
              {early ? <td>{row.pick(early)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function AgeYearPage({ params }: Props) {
  const Y = parse((await params).year);
  if (Y === null) notFound();
  const f = facts(Y);
  const { R, a, g, prevG, school, earlySchool, pension, yy } = f;
  const isBabyYear = f.range.before === null;
  const milestones = cohortMilestones(Y, R);
  const neighbors = neighborYears(Y, 5);
  const sameTti = sameTtiYears(Y, AGE_PAGE_FIRST_YEAR, R).filter((y) => y !== Y);
  const stem = g.name[0];
  const branch = g.name[1];
  const colorLabel = g.color === "황금" ? "황금색(누런색)" : `${g.color}색`;
  const particle = (word: string, withFinal: string, withoutFinal: string) =>
    josa(word, withFinal, withoutFinal).slice(word.length);
  const tense = (year: number, past: string, future: string) => (year < R ? past : future);

  const faq: FaqItem[] = [
    {
      q: `${Y}년생은 ${R}년에 몇 살인가요?`,
      a: isBabyYear
        ? `${R}년에 태어난 아기는 첫돌 전까지 만 0세입니다. 연 나이도 0세이고, 예전 방식인 세는 나이로는 1세입니다. 돌 전에는 ‘생후 몇 개월’처럼 개월 수로 나이를 표시할 수 있습니다.`
        : `생일 전에는 만 ${f.range.before}세, 생일이 지나면 만 ${f.range.after}세입니다. 연 나이는 ${a}세이고, 예전 방식인 세는 나이로는 ${a + 1}세입니다.`,
    },
    {
      q: `${Y}년생은 무슨 띠인가요?`,
      a: `${g.name}년(${g.hanja}年)생으로 ${g.tti}입니다. 띠를 음력 설이나 입춘 기준으로 보면 ${Y}년 1월~2월 중순 가운데 그해 설날이나 입춘(2월 4일 무렵)보다 먼저 태어난 사람은 ${prevG.tti}(${prevG.name}년)일 수 있습니다. 설날은 해마다 1월 하순에서 2월 중순 사이로 바뀝니다.`,
    },
  ];
  if (Y >= 2000) {
    faq.push({
      q: `${Y}년생은 언제부터 술·담배를 살 수 있나요?`,
      a: `청소년보호법은 19세가 되는 해의 1월 1일을 맞은 사람을 청소년에서 제외합니다. 그래서 ${Y}년생은 생일과 관계없이 ${Y + 19}년 1월 1일부터 술·담배를 살 수 있습니다. 반면 민법상 성년(만 19세)은 ${Y + 19}년 생일부터입니다.`,
    });
  }
  if (school) {
    faq.push({
      q: `${Y}년생은 몇 년에 초등학교에 입학하나요?`,
      a: earlySchool
        ? `${Y}년 3~12월생은 ${school.elementaryEntry}년 3월에 입학했습니다. 당시에는 1·2월생이 한 해 먼저 입학하는 제도가 있어 ${Y}년 1·2월생은 ${earlySchool.elementaryEntry}년 입학이 원칙이었습니다(빠른 ${yy}년생). 입학을 미뤄 3~12월생과 함께 다닌 경우도 많습니다. 고등학교 졸업은 각각 ${school.highGrad}년, ${earlySchool.highGrad}년 2월입니다.`
        : `만 6세가 된 날이 속하는 해의 다음 해 3월에 입학하므로 ${Y}년생은 생일과 관계없이 ${school.elementaryEntry}년 3월에 초등학교에 ${marchTense(school.elementaryEntry, "입학했습니다", "입학합니다")}. 고등학교 졸업은 ${school.highGrad}년 2월입니다.`,
    });
  }
  if (Y < 2000) {
    faq.push({
      q: `${Y}년생 국민연금은 몇 살부터 받나요?`,
      a:
        Y >= 1953
          ? `${Y}년생의 노령연금 수급개시연령은 만 ${pension}세입니다. 가입기간이 10년 이상이면 만 ${pension}세가 된 달의 다음 달부터 받으므로 대부분 ${Y + pension}년부터, 12월생은 보통 ${Y + pension + 1}년 1월부터 받습니다. 조기노령연금은 최대 5년 앞당겨 만 ${pension - EARLY_PENSION_MAX_YEARS}세부터 신청할 수 있지만 1년에 6%씩 감액됩니다.`
          : `1952년 이전 출생자의 노령연금 수급개시연령은 만 60세라서 ${Y}년생은 ${Y + 60}년에 수급 연령이 되었습니다. 국민연금은 1988년에 시작되어, 가입기간이 짧은 이 세대에는 특례노령연금 같은 별도 기준이 있었습니다.`,
    });
  }
  if (!school) {
    faq.push({
      q: `${Y}년생 환갑·칠순·팔순은 언제인가요?`,
      a: `환갑(만 60세)은 ${Y + 60}년, 칠순(세는 나이 70세)은 ${Y + 69}년, 팔순(세는 나이 80세)은 ${Y + 79}년입니다. 칠순·팔순은 관습상 세는 나이로 챙기는 경우가 많습니다.`,
    });
  }

  return (
    <ToolShell
      slug="age"
      path={`/age/${Y}/`}
      extraCrumbs={[{ name: `${Y}년생`, path: `/age/${Y}/` }]}
      h1={`${Y}년생 나이: ${R}년 ${f.rangeLabel} (${g.tti})`}
      lead={
        isBabyYear
          ? `${R}년에 태어난 아기는 올해 만 0세이고, 돌 전에는 ‘생후 몇 개월’처럼 개월 수로 나이를 표시할 수 있습니다. ${g.name}년(${g.hanja}年) ${g.tti}입니다.`
          : `${Y}년생은 ${R}년에 생일이 지나기 전까지 만 ${f.range.before}세, 생일부터 만 ${f.range.after}세입니다. 연 나이는 ${a}세이고, ${g.name}년(${g.hanja}年)에 태어난 ${g.tti}입니다.`
      }
      basis={`${R}년 기준 · 만 나이는 민법 제158조, 연 나이는 기준연도 − 출생연도`}
      calculator={<AgeCalculator initialBirth={`${Y}-05-17`} />}
      faq={faq}
    >
      <h2>
        {Y}년생 {R}년 나이
      </h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">구분</th>
              <th scope="col">{R}년</th>
              <th scope="col">{R + 1}년</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>만 나이 (생일 전)</td>
              <td>{f.range.before === null ? "출생 전" : `${f.range.before}세`}</td>
              <td>{a}세</td>
            </tr>
            <tr className="is-current">
              <td>만 나이 (생일 후)</td>
              <td>{a}세</td>
              <td>{a + 1}세</td>
            </tr>
            <tr>
              <td>연 나이</td>
              <td>{a}세</td>
              <td>{a + 1}세</td>
            </tr>
            <tr>
              <td>세는 나이 (참고)</td>
              <td>{a + 1}세</td>
              <td>{a + 2}세</td>
            </tr>
          </tbody>
        </table>
      </div>
      {isBabyYear ? (
        <p>
          예를 들어 {R}년 5월 17일에 태어난 아기는 {R + 1}년 5월 17일 첫돌에 만 1세가 됩니다. 그 전까지는 만 0세이고, 법적으로도
          ‘생후 5개월’처럼 개월 수로 표시할 수 있습니다. 생년월일을 위 계산기에 넣으면 정확한 개월 수와 날 수를 볼 수 있습니다.
        </p>
      ) : (
        <p>
          예를 들어 {Y}년 5월 17일생은 {R}년 5월 16일까지 만 {f.range.before}세, 5월 17일부터 만 {a}세입니다. 연 나이는 생일과
          관계없이 {R}년 1년 내내 {a}세이며, 청소년보호법과 병역법처럼 법에서 따로 정한 경우에만 씁니다. 2023년 6월 28일부터는
          계약서나 공문서에 적힌 나이도 특별한 규정이 없으면 만 나이로 봅니다.
          {Y <= LAST_EARLY_ENTRY_BIRTH_YEAR && Y >= 1956
            ? ` ${Y}년 1·2월생은 학교에 한 해 먼저 들어간 ‘빠른 ${yy}’일 수 있어 ${Y - 1}년생과 같은 학년인 경우도 있지만, 법적 나이는 생년월일대로 계산합니다.`
            : null}
        </p>
      )}

      <h2>
        {Y}년생 띠: {g.name}년 {g.tti}
      </h2>
      <p>
        {Y}년은 60갑자로 {g.name}년({g.hanja}年)입니다. 천간 ‘{stem}’{particle(stem, "은", "는")} 오행의 {g.element}에
        해당해 색으로는 {colorLabel}, 지지 ‘{branch}’{particle(branch, "은", "는")} {josa(g.animal, "이라서", "라서")}{" "}
        <strong>{g.tti}</strong>라고 부릅니다. 띠를 음력 설이나 입춘(2월 4일 무렵) 기준으로
        보면 {Y}년 1월~2월 중순 가운데 그해 설날이나 입춘보다 먼저 태어난 사람은 전년도인 {Y - 1}년의{" "}
        {prevG.tti}({prevG.name}년)일 수 있습니다. 설날은 해마다 1월 하순에서 2월 중순 사이로 바뀌므로, 이 기준을
        따른다면 태어난 해의 설날 날짜를 확인해 보세요.
      </p>
      <p>
        {g.ttiShort}는 12년마다 돌아옵니다. 같은 {g.ttiShort}인 출생연도는{" "}
        {sameTti.map((y, i) => (
          <span key={y}>
            {i > 0 ? ", " : null}
            <Link href={`/age/${y}/`}>{y}년생</Link>
          </span>
        ))}
        입니다. 색까지 같은 {g.name}년은 60년마다 돌아와 {Y - 60}년생과 {Y + 60}년생도 {g.name}년생이며, {Y}년생은 만 60세가
        되는 {Y + 60}년에 환갑을 {tense(Y + 60, "맞았습니다", "맞습니다")}.
      </p>

      <h2>
        {Y}년생 학교 입학·졸업 연도
      </h2>
      {school ? (
        <>
          <p>
            {earlySchool ? (
              <>
                {Y}년생이 입학할 당시 법은 ‘6세가 된 날의 다음 날 이후 최초의 학년초’에 입학하게 되어 있어 3월생부터 이듬해
                2월생까지가 한 학년이었습니다. 그래서 {Y}년 3~12월생은 {school.elementaryEntry}년, 1·2월생은{" "}
                {earlySchool.elementaryEntry}년에 초등학교에 들어갔습니다. 1·2월생이라도 입학을 미뤘다면 3~12월생과 같은
                학년입니다.
              </>
            ) : (
              <>
                지금은 만 6세가 된 날이 속하는 해의 다음 해 3월 1일에 초등학교에 입학합니다(초·중등교육법 제13조). 2009학년도부터
                1월 1일~12월 31일생이 같은 학년이라 {Y}년생은 생일과 관계없이 {school.elementaryEntry}년 3월에{" "}
                {marchTense(school.elementaryEntry, "입학했습니다", "입학합니다")}. 조기입학이나 입학 연기를 하면 1년씩 달라집니다.
              </>
            )}
          </p>
          <SchoolTable school={school} early={earlySchool} />
        </>
      ) : (
        <p>
          {Y}년생이 학교에 들어가던 무렵에는 학년이 시작하는 달과 학제가 지금과 달랐고, 전쟁과 가정 형편 때문에 늦게 입학한
          경우도 많았습니다. 그래서 이 세대는 입학·졸업 연도를 일률적으로 계산하지 않았습니다. 현행 기준(출생연도 + 7년)을 그대로
          적용하면 {Y + 7}년 입학에 해당합니다.
        </p>
      )}

      <h2>
        {Y}년생 국민연금·기초연금 받는 나이
      </h2>
      {Y >= 1953 ? (
        <p>
          {Y}년생의 국민연금 노령연금 수급개시연령은 <strong>만 {pension}세</strong>입니다. 가입기간이 10년 이상이면 만{" "}
          {pension}세가 된 달의 다음 달부터 받습니다(
          <a href="https://www.law.go.kr/법령/국민연금법/제54조">국민연금법 제54조</a>). 그래서 대부분 {Y + pension}년에 첫
          연금을 {tense(Y + pension, "받았고", "받고")}, 12월생은 보통 {Y + pension + 1}년 1월부터{" "}
          {tense(Y + pension, "받았습니다", "받습니다")}. 조기노령연금을 신청하면 최대 5년 앞선 만{" "}
          {pension - EARLY_PENSION_MAX_YEARS}세({Y + pension - EARLY_PENSION_MAX_YEARS}년)부터 받을 수 있지만 1년 앞당길
          때마다 6%씩 줄고, 반대로 최대 5년 늦추면 1년에 7.2%씩 늘어납니다.
          {Y + pension < R ? ` ${R}년 현재 ${Y}년생은 이미 수급 연령에 도달했습니다.` : null}
          {Y + pension === R ? ` ${R}년 생일에 만 ${pension}세가 되어 수급 연령에 도달하고, 그다음 달부터 연금이 나옵니다.` : null}
          {Y >= 1969 ? " 2025년 연금개혁에서도 수급 나이는 바뀌지 않았지만, 앞으로의 제도 개편에 따라 달라질 수 있습니다." : null}
        </p>
      ) : (
        <p>
          1952년 이전에 태어난 사람의 노령연금 수급개시연령은 만 60세라서 {Y}년생은 {Y + 60}년에 수급 연령이 되었습니다. 다만
          국민연금이 1988년에 시작되어 가입기간이 짧은 세대에는 특례노령연금 같은 별도 기준이 적용됐을 수 있습니다.
        </p>
      )}
      <p>
        지하철 경로우대처럼 노인복지법에서 ‘65세 이상’에게 주는 혜택은 만 65세 생일부터 받을 수 있습니다(법제처
        법령해석 22-0817). 기초연금도 만 65세 이상이 대상이며(
        <a href="https://www.law.go.kr/법령/기초연금법/제3조">기초연금법 제3조</a>), 나이 외에 소득인정액이 선정기준액
        이하여야 합니다. {Y}년생은 {Y + 65}년에 만 65세가 {Y + 65 < R ? "되었습니다" : "됩니다"}.
      </p>

      <h2>
        {Y}년생 나이별 이정표
      </h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">연도</th>
              <th scope="col">이정표</th>
              <th scope="col">나이</th>
            </tr>
          </thead>
          <tbody>
            {milestones.map((m) => (
              <tr key={`${m.year}-${m.label}`} className={m.current ? "is-current" : undefined}>
                <td>{m.year}년</td>
                <td>{m.label}</td>
                <td>{m.age}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        학교 연도는 3~12월생, 조기입학·입학 연기가 없을 때 기준입니다. 성년과 선거권은 그 당시 법(성년 20세→19세, 선거권
        20세→19세→18세)대로 계산했고, 병역·운전면허·술·담배는 지금 기준이 적용되는 세대에만 표시했습니다. 칠순·팔순은 관습대로
        세는 나이 기준입니다.
      </p>

      <h2>
        {Y}년생 주변 출생연도 나이표 ({R}년)
      </h2>
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
            {neighbors.map((n) => {
              const r = manAgeRangeInYear(n, R);
              const ng = ganjiOfYear(n);
              return (
                <tr key={n} className={n === Y ? "is-current" : undefined}>
                  <td>{n === Y ? `${n}년생` : <Link href={`/age/${n}/`}>{n}년생</Link>}</td>
                  <td>{r.before === null ? "0세" : `${r.before}·${r.after}세`}</td>
                  <td>{R - n}세</td>
                  <td>
                    {ng.tti} ({ng.name})
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>다른 출생연도 나이 보기</h2>
      <nav aria-label="출생연도별 나이 페이지" className="link-grid">
        {[...AGE_PAGE_YEARS].reverse().map((n) => (
          <Link key={n} href={`/age/${n}/`} aria-current={n === Y ? "page" : undefined}>
            {n}년생 ({shortYear(n)})
          </Link>
        ))}
      </nav>
    </ToolShell>
  );
}
