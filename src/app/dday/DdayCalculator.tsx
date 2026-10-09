"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CalcLayout, CalcNotice } from "@/components/CalcLayout";
import { CheckboxField, DateField, NumberField, SegmentedField } from "@/components/fields";
import { Statement, StatementFootnote, StatementHero, StatementRow, StatementSection, StatementTotal } from "@/components/Statement";
import { addDays, compareYMD, diffDays, formatKoreanDate, formatYMD, parseYMD, weekdayKo, type YMD } from "@/lib/date";
import { formatNumber } from "@/lib/format";
import {
  betweenWorkdays,
  calendarSpan,
  countWeekdays,
  dayNumberOn,
  daysBetween,
  ddayLabel,
  DDAY_MODES,
  defaultTarget,
  elapsedSpan,
  endOfYear,
  eventOn,
  formatSpan,
  formatWeeks,
  HOLIDAY_DATA_CHECKED,
  HOLIDAY_DATA_RANGE,
  inclusiveSpan,
  MAX_INPUT_DATE,
  MAX_SHIFT_DAYS,
  milestones,
  milestoneWindow,
  MIN_INPUT_DATE,
  orderDates,
  parseInputDate,
  shiftCountError,
  shiftDate,
  spanMonths,
  upcomingEvents,
  type AnnivKind,
  type BetweenWorkdays,
  type DdayMode,
} from "@/lib/calc/dday";
import { useToday } from "@/lib/useToday";
import { useUrlState } from "@/lib/useUrlState";

type Way = "after" | "before";

/**
 * URL value for a date the user cleared. "" is the untouched default (→ fallback date), so a cleared
 * field needs its own value; otherwise it would snap back to the fallback and overwrite a half-edited input.
 */
const CLEARED = "-";

/** Date from the URL: "" → fallback, CLEARED or invalid (incl. years before 1000) → null. */
function pickDate(raw: string, fallback: YMD): YMD | null {
  if (raw === "") return fallback;
  if (raw === CLEARED) return null;
  return parseInputDate(raw);
}

/** DateField wired to a URL key: keeps half-typed values (Chrome reports year "0020" while typing 2026). */
function DateInput({
  label,
  raw,
  date,
  onChange,
  hint,
}: {
  label: ReactNode;
  raw: string;
  date: YMD | null;
  onChange: (v: string) => void;
  hint?: ReactNode;
}) {
  return (
    <DateField
      label={label}
      value={date ? formatYMD(date) : raw === CLEARED ? "" : raw}
      onChange={(v) => onChange(v === "" ? CLEARED : v)}
      min={MIN_INPUT_DATE}
      max={MAX_INPUT_DATE}
      aside={date ? `${weekdayKo(date)}요일` : undefined}
      hint={hint}
    />
  );
}

export function DdayCalculator({ initialTarget = "", initialMode = "dday" }: { initialTarget?: string; initialMode?: DdayMode }) {
  const { today, isLive } = useToday();
  // URL keys: m = mode | t = D-day target | s/e/i/h = between start/end/include start/exclude holidays
  // b/n/w/j = add-days base/count/direction/include base | a/k = anniversary start/kind
  const [s, set] = useUrlState({
    m: initialMode as DdayMode,
    t: initialTarget,
    s: "",
    e: "",
    i: false as boolean,
    h: false as boolean,
    b: "",
    n: 100,
    w: "after" as Way,
    j: false as boolean,
    a: "",
    k: "couple" as AnnivKind,
  });
  const mode: DdayMode = DDAY_MODES.includes(s.m) ? s.m : "dday";

  // Before hydration `today` is the build date; say so by naming the date instead of "오늘".
  const basis = isLive ? `오늘 ${formatKoreanDate(today)}` : formatKoreanDate(today);

  let inputs: ReactNode;
  let result: ReactNode;

  if (mode === "dday") {
    // An event page falls back to its own event; the main page to the soonest listed event.
    const target = pickDate(s.t, parseYMD(initialTarget) ?? defaultTarget(today));
    const upcoming = upcomingEvents(today);
    inputs = (
      <>
        <DateInput
          label="목표 날짜"
          raw={s.t}
          date={target}
          onChange={(t) => set({ t })}
          hint="날짜를 고르면 오늘부터 며칠 남았는지(D-day) 바로 알려 드려요."
        />
        {upcoming.length ? (
          <div className="field">
            <span className="field-label">주요 일정</span>
            <div className="chips" role="group" aria-label="주요 일정 빠른 선택">
              {upcoming.map((ev) => (
                <button
                  key={ev.slug}
                  type="button"
                  className="chip"
                  aria-pressed={target !== null && formatYMD(target) === ev.date}
                  onClick={() => set({ t: ev.date })}
                >
                  {ev.short}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </>
    );
    result = target ? <DdayResult target={target} today={today} isLive={isLive} basis={basis} /> : <CalcNotice>목표 날짜를 골라 주세요.</CalcNotice>;
  } else if (mode === "between") {
    const start = pickDate(s.s, today);
    const end = pickDate(s.e, endOfYear(today));
    inputs = (
      <>
        <DateInput label="시작일" raw={s.s} date={start} onChange={(v) => set({ s: v })} />
        <DateInput label="종료일" raw={s.e} date={end} onChange={(v) => set({ e: v })} />
        <CheckboxField
          label="시작일도 하루로 세기 (+1일)"
          checked={s.i}
          onChange={(i) => set({ i })}
          hint="기념일·근무일처럼 첫날을 세는 경우에 켜세요. 계약·법정 기간은 보통 첫날을 빼고 셉니다(민법 초일 불산입)."
        />
        <CheckboxField
          label="공휴일 제외 (평일 근무일만)"
          checked={s.h}
          onChange={(h) => set({ h })}
          hint={`토·일과 공휴일·대체공휴일을 뺀 근무일수를 달력 일수와 함께 보여 줘요. 공휴일 자료는 ${HOLIDAY_DATA_RANGE}이에요.`}
        />
      </>
    );
    result =
      start && end ? (
        <BetweenResult a={start} b={end} includeStart={s.i} excludeHolidays={s.h} />
      ) : (
        <CalcNotice>시작일과 종료일을 모두 골라 주세요.</CalcNotice>
      );
  } else if (mode === "add") {
    const base = pickDate(s.b, today);
    const way: Way = s.w === "before" ? "before" : "after";
    const countError = shiftCountError(s.n, s.j);
    inputs = (
      <>
        <DateInput
          label="기준일"
          raw={s.b}
          date={base}
          onChange={(v) => set({ b: v })}
          hint="처음에는 오늘 날짜가 들어가 있어요."
        />
        <SegmentedField<Way>
          label="방향"
          value={way}
          onChange={(w) => set({ w })}
          options={[
            { value: "after", label: "며칠 뒤" },
            { value: "before", label: "며칠 전" },
          ]}
        />
        <NumberField
          label="일수"
          value={s.n}
          onChange={(n) => set({ n })}
          unit="일"
          max={MAX_SHIFT_DAYS}
          presets={[7, 30, 50, 100, 200, 365, 1000].map((n) => ({ label: `${formatNumber(n)}일`, value: n }))}
        />
        <CheckboxField
          label="기준일을 1일째로 세기"
          checked={s.j}
          onChange={(j) => set({ j })}
          hint="‘오늘부터 100일째 되는 날’처럼 셀 때 켜세요. 이때는 99일을 더해요."
        />
      </>
    );
    result = !base ? (
      <CalcNotice>기준일을 골라 주세요.</CalcNotice>
    ) : countError === "range" ? (
      <CalcNotice>일수는 0부터 {formatNumber(MAX_SHIFT_DAYS)}까지 정수로 넣어 주세요.</CalcNotice>
    ) : countError === "zero" ? (
      <CalcNotice>기준일을 1일째로 세면 1일째부터 셀 수 있어요. 일수를 1 이상으로 넣어 주세요.</CalcNotice>
    ) : (
      <AddResult base={base} n={s.n} before={way === "before"} includeBase={s.j} today={today} isLive={isLive} />
    );
  } else {
    const start = pickDate(s.a, today);
    const kind: AnnivKind = s.k === "baby" ? "baby" : "couple";
    inputs = (
      <>
        <SegmentedField<AnnivKind>
          label="무엇을 기념하나요"
          value={kind}
          onChange={(k) => set({ k })}
          options={[
            { value: "couple", label: "연애 (사귄 날)" },
            { value: "baby", label: "아기 (태어난 날)" },
          ]}
        />
        <DateInput
          label={kind === "baby" ? "태어난 날" : "사귄 날"}
          raw={s.a}
          date={start}
          onChange={(a) => set({ a })}
          hint="시작한 날을 1일째로 세는 한국식 기념일 계산이에요. 100일은 시작일에서 99일 뒤예요."
        />
      </>
    );
    result = start ? (
      <AnnivResult start={start} kind={kind} today={today} isLive={isLive} basis={basis} />
    ) : (
      <CalcNotice>{kind === "baby" ? "태어난 날" : "사귄 날"}을 골라 주세요.</CalcNotice>
    );
  }

  return (
    <CalcLayout
      inputs={
        <>
          <SegmentedField<DdayMode>
            label="계산 방식"
            value={mode}
            onChange={(m) => set({ m })}
            options={[
              { value: "dday", label: "D-day" },
              { value: "between", label: "날짜 사이" },
              { value: "add", label: "며칠 뒤" },
              { value: "anniv", label: "기념일" },
            ]}
          />
          {inputs}
        </>
      }
      result={result}
    />
  );
}

/** Name for a date: a known event name, otherwise the formatted date. */
function dateName(v: YMD): string {
  const ev = eventOn(v);
  return ev ? `${ev.name}(${v.m}월 ${v.d}일)` : formatKoreanDate(v, false);
}

function DdayResult({ target, today, isLive, basis }: { target: YMD; today: YMD; isLive: boolean; basis: string }) {
  const diff = diffDays(today, target);
  const n = Math.abs(diff);
  const { from, to } = orderDates(today, target);
  const ev = eventOn(target);
  const name = dateName(target);
  return (
    <Statement title="디데이 명세" caption="한국 시간 기준">
      <StatementHero
        label={diff > 0 ? `${name}까지` : diff < 0 ? `${name}부터` : name}
        value={ddayLabel(diff)}
        sub={
          diff > 0
            ? `${formatNumber(n)}일 남았어요 · ${basis} 기준`
            : diff < 0
              ? `${formatNumber(n)}일 지났어요 · ${basis} 기준`
              : `바로 오늘이에요 · ${basis} 기준`
        }
        stamp="디데이"
      />
      <StatementSection title="날짜">
        <StatementRow label="목표일" value={formatKoreanDate(target)} />
        <StatementRow label={isLive ? "오늘" : "기준일"} value={formatKoreanDate(today)} />
        {ev ? (
          <StatementRow label="일정 안내" value={<Link href={`/dday/${ev.slug}/`}>{ev.short} D-day 자세히</Link>} />
        ) : null}
      </StatementSection>
      {diff !== 0 ? (
        <StatementSection title={diff > 0 ? "남은 날 세는 법" : "지난 날 세는 법"}>
          <StatementRow
            label={diff > 0 ? "남은 날" : "지난 날"}
            note={diff > 0 ? "오늘 제외, 목표일 포함" : "목표일 제외, 오늘 포함"}
            value={`${formatNumber(n)}일`}
            emphasis
          />
          <StatementRow
            label={diff > 0 ? "오늘을 1일째로 세면" : "목표일을 1일째로 세면"}
            note="기념일 방식"
            value={diff > 0 ? `목표일이 ${formatNumber(n + 1)}일째` : `오늘이 ${formatNumber(n + 1)}일째`}
          />
          {diff > 1 ? <StatementRow label="목표일 전까지 온전한 날" note="오늘·목표일 제외" value={`${formatNumber(n - 1)}일`} /> : null}
          <StatementRow label="주 단위" value={formatWeeks(n)} />
          <StatementRow label="달력 기준" value={formatSpan(calendarSpan(from, to))} />
        </StatementSection>
      ) : null}
      <StatementFootnote>
        D-day는 오늘을 빼고 목표일까지 센 날수예요. 하루 전이 D-1, 당일이 D-day, 다음 날부터 D+1이에요. 오늘을 하루로 치는 기념일 방식이면 1일이 더해져요.
      </StatementFootnote>
    </Statement>
  );
}

/** Weekday holidays listed by name in the 근무일 statement; the rest are summed in one row. */
const MAX_HOLIDAY_ROWS = 10;

/** "12월 25일 (금)", with the year when the range spans years. */
function holidayDate(v: YMD, withYear: boolean): string {
  return withYear ? formatKoreanDate(v) : `${v.m}월 ${v.d}일 (${weekdayKo(v)})`;
}

/** 근무일 breakdown: 달력 일수 − 주말 − 평일 공휴일 = 근무일수, then the holidays by name. */
function WorkdaySections({ work, includeStart }: { work: BetweenWorkdays; includeStart: boolean }) {
  const shown = work.holidays.slice(0, MAX_HOLIDAY_ROWS);
  const rest = work.holidays.length - shown.length;
  const withYear = work.start.y !== work.end.y;
  return (
    <>
      <StatementSection title="근무일 (주 5일, 공휴일 제외)">
        <StatementRow
          label="달력 일수"
          note={includeStart ? "시작일 포함" : "시작일 다음 날부터"}
          value={`${formatNumber(work.calendarDays)}일`}
        />
        <StatementRow label="주말 (토·일)" value={`−${formatNumber(work.weekend)}일`} />
        {work.coverage === "none" ? (
          <StatementRow label="평일 공휴일" note={`자료는 ${HOLIDAY_DATA_RANGE}만 있음`} value="반영 안 됨" />
        ) : (
          <StatementRow
            label="평일 공휴일"
            note={work.coverage === "partial" ? `${HOLIDAY_DATA_RANGE} 안의 날만` : "대체공휴일·선거일 포함"}
            value={`−${formatNumber(work.holidays.length)}일`}
          />
        )}
      </StatementSection>
      <StatementTotal label="근무일수" value={`${formatNumber(work.workdays)}일`} />
      {shown.length ? (
        <StatementSection title="빠진 평일 공휴일">
          {shown.map((h) => (
            <StatementRow key={formatYMD(h.date)} label={h.name} value={holidayDate(h.date, withYear)} />
          ))}
          {rest > 0 ? <StatementRow label="그 밖의 평일 공휴일" value={`${formatNumber(rest)}일`} /> : null}
        </StatementSection>
      ) : null}
    </>
  );
}

function BetweenResult({ a, b, includeStart, excludeHolidays }: { a: YMD; b: YMD; includeStart: boolean; excludeHolidays: boolean }) {
  const { from, to, swapped } = orderDates(a, b);
  const days = daysBetween(from, to, includeStart);
  const excl = daysBetween(from, to, false);
  // The counted range: (from, to] when the first day is excluded, [from, to] when included.
  const rangeStart = includeStart ? from : addDays(from, 1);
  const weekdays = countWeekdays(rangeStart, to);
  // 시작일 포함: a month counted from the 31st ends on the last day of a shorter month (민법 제160조 제3항).
  const span = includeStart ? inclusiveSpan(from, to) : calendarSpan(from, to);
  const work = excludeHolidays ? betweenWorkdays(from, to, includeStart) : null;
  const range = `${formatKoreanDate(from, false)}부터 ${formatKoreanDate(to, false)}까지`;
  return (
    <Statement title="날짜 사이 일수 명세" caption={`${includeStart ? "시작일 포함" : "시작일 제외"}${work ? " · 공휴일 제외" : ""}`}>
      {work ? (
        <StatementHero
          label={`${range} 근무일`}
          value={`${formatNumber(work.workdays)}일`}
          sub={
            work.coverage === "none"
              ? `달력 ${formatNumber(days)}일 · 주말 ${formatNumber(work.weekend)}일 제외 · 공휴일 자료 밖`
              : `달력 ${formatNumber(days)}일 · 주말 ${formatNumber(work.weekend)}일 · 평일 공휴일 ${formatNumber(work.holidays.length)}일 제외`
          }
        />
      ) : (
        <StatementHero label={range} value={`${formatNumber(days)}일`} sub={`${formatWeeks(days)} · ${formatSpan(span)}`} />
      )}
      <StatementSection title="기간">
        <StatementRow label="시작일" value={formatKoreanDate(from)} />
        <StatementRow label="종료일" value={formatKoreanDate(to)} />
        <StatementRow label="시작일 제외" note="민법 방식, 일반 D-day와 같음" value={`${formatNumber(excl)}일`} emphasis={!work && !includeStart} />
        <StatementRow label="시작일 포함" note="기념일 방식" value={`${formatNumber(excl + 1)}일`} emphasis={!work && includeStart} />
      </StatementSection>
      {work ? <WorkdaySections work={work} includeStart={includeStart} /> : null}
      <StatementSection title="다른 단위로">
        <StatementRow label="주" value={formatWeeks(days)} />
        <StatementRow label="달력 기준" note="년·개월·일" value={formatSpan(span)} />
        {work ? null : (
          <>
            <StatementRow label="평일 (월~금)" note="공휴일 미반영" value={`${formatNumber(weekdays)}일`} />
            <StatementRow label="주말 (토·일)" value={`${formatNumber(days - weekdays)}일`} />
          </>
        )}
        <StatementRow label="시간" value={`${formatNumber(days * 24)}시간`} />
      </StatementSection>
      <StatementFootnote>
        {swapped ? "종료일이 시작일보다 앞서 있어 두 날짜를 바꿔 계산했어요. " : ""}
        {work ? (
          <>
            {work.coverage === "none"
              ? `이 기간은 공휴일 자료(${HOLIDAY_DATA_RANGE}) 밖이라 토·일만 뺐어요. 실제 근무일은 이보다 적을 수 있어요. `
              : work.coverage === "partial"
                ? `${HOLIDAY_DATA_RANGE} 밖의 ${formatNumber(work.uncoveredDays)}일은 공휴일 자료가 없어 토·일만 뺐어요. `
                : ""}
            근무일은 주 5일 근무와 관공서 공휴일(대체공휴일·선거일 포함) 기준이에요. 공휴일 자료는 {HOLIDAY_DATA_RANGE}이고{" "}
            {HOLIDAY_DATA_CHECKED}에 확인했어요. 토요일 근무나 5인 미만 사업장 기준은{" "}
            <Link href="/holidays/">공휴일·근무일 계산기</Link>에서 셀 수 있어요.{" "}
          </>
        ) : (
          "평일 수는 토·일만 뺀 값이에요. ‘공휴일 제외’를 켜면 공휴일·대체공휴일까지 뺀 근무일수를 볼 수 있어요. "
        )}
        {includeStart
          ? "개월 수는 시작일부터 다음 달 같은 날짜의 전날까지를 1개월로 보고, 그 날짜가 없는 달은 말일까지를 1개월로 봐요(1월 31일~2월 28일 = 1개월)."
          : "개월 수는 달력 기준이고, 같은 날짜가 없는 달은 그 달 마지막 날로 봐요."}
      </StatementFootnote>
    </Statement>
  );
}

function AddResult({
  base,
  n,
  before,
  includeBase,
  today,
  isLive,
}: {
  base: YMD;
  n: number;
  before: boolean;
  includeBase: boolean;
  today: YMD;
  isLive: boolean;
}) {
  const result = shiftDate(base, n, { before, includeBase });
  const offset = Math.abs(diffDays(base, result));
  const fromToday = diffDays(today, result);
  const baseText = formatKoreanDate(base, false);
  const heroLabel = includeBase
    ? `${baseText}부터 ${before ? "거꾸로 " : ""}${formatNumber(n)}일째 되는 날`
    : `${baseText}에서 ${formatNumber(n)}일 ${before ? "전" : "뒤"}`;
  return (
    <Statement title="날짜 계산 명세" caption={includeBase ? "기준일 = 1일째" : "기준일 다음 날 = 1일째"}>
      <StatementHero
        label={heroLabel}
        value={formatKoreanDate(result)}
        sub={`${weekdayKo(result)}요일 · ${isLive ? "오늘" : formatKoreanDate(today, false)} 기준 ${ddayLabel(fromToday)}`}
      />
      <StatementSection title="계산 내역">
        <StatementRow label="기준일" value={formatKoreanDate(base)} />
        <StatementRow
          label={before ? "뺀 날수" : "더한 날수"}
          note={includeBase ? `${formatNumber(n)}일째 = ${formatNumber(offset)}일 ${before ? "전" : "뒤"}` : undefined}
          value={`${formatNumber(offset)}일`}
        />
        <StatementRow label="결과 날짜" value={formatKoreanDate(result)} emphasis />
        <StatementRow label="주 단위" value={formatWeeks(offset)} />
        <StatementRow label={isLive ? "오늘 기준" : `${formatKoreanDate(today, false)} 기준`} value={ddayLabel(fromToday)} />
      </StatementSection>
      <StatementFootnote>
        보통 ‘100일 뒤’는 기준일에 100일을 더한 날이에요. ‘100일째 되는 날’처럼 기준일을 1일로 세면 99일을 더해요.
      </StatementFootnote>
    </Statement>
  );
}

function AnnivResult({ start, kind, today, isLive, basis }: { start: YMD; kind: AnnivKind; today: YMD; isLive: boolean; basis: string }) {
  const list = milestones(start, kind);
  const { items, nextIndex } = milestoneWindow(list, today);
  const dayNum = dayNumberOn(start, today);
  const next = nextIndex >= 0 ? items[nextIndex] : null;
  const started = compareYMD(start, today) <= 0;
  // Months complete on each month mark, like 만 나이 (1월 31일생은 3월 1일에 생후 1개월).
  const span = started ? elapsedSpan(start, today) : null;
  const what = kind === "baby" ? "태어난 지" : "사귄 지";
  return (
    <Statement title="기념일 명세" caption="시작일 = 1일째">
      {started ? (
        <StatementHero
          label={`${what} · ${basis} 기준`}
          value={`${formatNumber(dayNum)}일째`}
          sub={next ? `다음 기념일 ${next.label} · ${formatKoreanDate(next.date)} · ${ddayLabel(diffDays(today, next.date))}` : undefined}
        />
      ) : (
        <StatementHero
          label={`${kind === "baby" ? "태어날 날" : "시작일"}까지 · ${basis} 기준`}
          value={ddayLabel(diffDays(today, start))}
          sub="시작일이 1일째가 돼요"
        />
      )}
      <StatementSection title="기념일 날짜">
        {items.map((m, idx) => {
          const diff = diffDays(today, m.date);
          return (
            <StatementRow
              key={`${m.type}-${m.n}`}
              label={m.label}
              note={diff < 0 ? "지남" : `${ddayLabel(diff)} · ${formatNumber(m.dayNumber)}일째`}
              value={formatKoreanDate(m.date)}
              emphasis={idx === nextIndex}
            />
          );
        })}
      </StatementSection>
      {started && span ? (
        <StatementSection title="지금까지">
          <StatementRow label={kind === "baby" ? "태어난 날" : "사귄 날"} value={formatKoreanDate(start)} />
          <StatementRow label={isLive ? "오늘" : "기준일"} value={`${formatNumber(dayNum)}일째`} />
          {kind === "baby" ? (
            <StatementRow label="생후" value={`${formatNumber(spanMonths(span))}개월 ${span.days}일`} />
          ) : (
            <StatementRow label="달력 기준" value={formatSpan(span)} />
          )}
        </StatementSection>
      ) : null}
      <StatementFootnote>
        기념일은 시작일을 1일째로 세요. 그래서 100일은 시작일에서 99일 뒤예요. 주년{kind === "baby" ? "과 돌" : ""}은 날수와 관계없이 해마다 같은
        날짜예요. 2월 29일에 시작했다면 평년에는 2월 28일로 1년이 차서 3월 1일이 {kind === "baby" ? "돌·생일(만 나이가 바뀌는 날)" : "주년"}이에요.
      </StatementFootnote>
    </Statement>
  );
}
