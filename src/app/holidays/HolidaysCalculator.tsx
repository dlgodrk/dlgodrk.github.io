"use client";

import type { ReactNode } from "react";
import { CalcLayout, CalcNotice } from "@/components/CalcLayout";
import { CheckboxField, DateField, NumberField, SegmentedField, StepperField } from "@/components/fields";
import { Statement, StatementFootnote, StatementHero, StatementRow, StatementSection, StatementTotal } from "@/components/Statement";
import { addDays, compareYMD, daysInMonth, diffDays, formatKoreanDate, formatYMD, parseYMD, weekdayKo, type YMD } from "@/lib/date";
import { formatNumber } from "@/lib/format";
import {
  addWorkdays,
  countWorkdays,
  FIRST_YEAR,
  holidayBlocks,
  HOLIDAY_YEARS,
  isWeekendOnly,
  LAST_YEAR,
  leaveDatesLabel,
  leaveRows,
  MAX_ADD_WORKDAYS,
  MAX_RANGE_DAYS,
  mdw,
  rangeLabel,
  upcomingBlocks,
  type HolidayHit,
  type WorkRule,
} from "@/lib/calc/holidays";
import { useToday } from "@/lib/useToday";
import { useUrlState } from "@/lib/useUrlState";

export type HolidaysMode = "range" | "add" | "leave";
const MODES: HolidaysMode[] = ["range", "add", "leave"];

/** URL value for a date the user cleared ("" means untouched → default date). */
const CLEARED = "-";
const MIN_INPUT = "1900-01-01";
const MAX_INPUT = "2100-12-31";
const MAX_LEAVE = 5;
const MAX_LISTED = 40;

function parseInput(raw: string): YMD | null {
  const v = parseYMD(raw);
  return v && v.y >= 1900 && v.y <= 2100 ? v : null;
}

/** Date from the URL: "" → fallback, CLEARED or invalid → null. */
function pickDate(raw: string, fallback: YMD): YMD | null {
  if (raw === "") return fallback;
  if (raw === CLEARED) return null;
  return parseInput(raw);
}

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
      // Keep a half-typed value (Chrome reports year "0020" while typing 2026) instead of snapping back.
      value={date ? formatYMD(date) : raw === CLEARED ? "" : raw}
      onChange={(v) => onChange(v === "" ? CLEARED : v)}
      min={MIN_INPUT}
      max={MAX_INPUT}
      aside={date ? `${weekdayKo(date)}요일` : undefined}
      hint={hint}
    />
  );
}

/** "2026년 10월 1일 ~ 31일" */
function fullRange(a: YMD, b: YMD): string {
  return a.y === b.y ? `${a.y}년 ${rangeLabel(a, b)}` : rangeLabel(a, b);
}

function ruleCaption(rule: WorkRule): string {
  if (rule.smallBiz) return rule.saturdayWork ? "주 6일 · 5인 미만 기준" : "주 5일 · 5인 미만 기준";
  return rule.saturdayWork ? "주 6일 · 관공서 공휴일 기준" : "주 5일 · 관공서 공휴일 기준";
}

const COVERAGE_NOTE = `공휴일 자료는 ${FIRST_YEAR}~${LAST_YEAR}년(관공서의 공휴일에 관한 규정, 월력요항 기준, 2026년 10월 9일 확인)이에요.`;

function HolidayHitRows({ hits, showYear }: { hits: HolidayHit[]; showYear: boolean }) {
  const shown = hits.slice(0, MAX_LISTED);
  return (
    <>
      {shown.map((h) => (
        <StatementRow
          key={formatYMD(h.date)}
          label={`${showYear ? `${h.date.y}년 ` : ""}${mdw(h.date)}`}
          note={h.holiday.name}
          value={h.reducesWork ? "쉬는 날" : "휴무일과 겹침"}
        />
      ))}
      {hits.length > shown.length ? <StatementRow label="그 밖의 공휴일" value={`${hits.length - shown.length}일`} /> : null}
    </>
  );
}

export function HolidaysCalculator({
  initialMode = "range",
  initialYear,
}: {
  initialMode?: HolidaysMode;
  /** Year pages: default the range to that year and the 연차 view to that year. */
  initialYear?: number;
}) {
  const { today, isLive } = useToday();
  // URL keys: m = mode | s/e = range start/end | b/n = add base/count | v/k = 연차 view/leave days
  // t6 = 토요일 근무 | sb = 5인 미만
  const [s, set] = useUrlState({
    m: initialMode as HolidaysMode,
    s: "",
    e: "",
    b: "",
    n: 3,
    v: initialYear ? String(initialYear) : "next",
    k: 2,
    t6: false as boolean,
    sb: false as boolean,
  });
  const mode: HolidaysMode = MODES.includes(s.m) ? s.m : "range";
  const rule: WorkRule = { saturdayWork: s.t6, smallBiz: s.sb };

  const saturdayBox = (
    <CheckboxField
      label="토요일도 근무해요 (주 6일)"
      checked={s.t6}
      onChange={(t6) => set({ t6 })}
      hint="켜면 일요일과 공휴일만 쉬는 날로 세어요. 토요일과 겹친 공휴일도 쉬는 날이 돼요."
    />
  );
  const smallBizBox = (
    <CheckboxField
      label="5인 미만 사업장 기준"
      checked={s.sb}
      onChange={(sb) => set({ sb })}
      hint="상시 근로자 5명 미만이면 관공서 공휴일을 유급휴일로 줄 의무가 없어요. 공휴일 가운데에서는 노동절(5월 1일)만 법정 유급휴일이에요(주휴일은 별도). 회사가 공휴일에 쉰다면 끄세요."
    />
  );

  let inputs: ReactNode;
  let result: ReactNode;

  if (mode === "range") {
    const defStart = initialYear ? { y: initialYear, m: 1, d: 1 } : { y: today.y, m: today.m, d: 1 };
    const defEnd = initialYear ? { y: initialYear, m: 12, d: 31 } : { y: today.y, m: today.m, d: daysInMonth(today.y, today.m) };
    const a = pickDate(s.s, defStart);
    const b = pickDate(s.e, defEnd);
    inputs = (
      <>
        <DateInput label="시작일" raw={s.s} date={a} onChange={(v) => set({ s: v })} hint="시작일과 종료일을 모두 포함해서 세어요." />
        <DateInput label="종료일" raw={s.e} date={b} onChange={(v) => set({ e: v })} />
        <div className="field">
          <span className="field-label">빠른 선택</span>
          <div className="chips" role="group" aria-label="기간 빠른 선택">
            <button
              type="button"
              className="chip"
              onClick={() => set({ s: formatYMD({ y: today.y, m: today.m, d: 1 }), e: formatYMD({ y: today.y, m: today.m, d: daysInMonth(today.y, today.m) }) })}
            >
              이번 달
            </button>
            <button
              type="button"
              className="chip"
              onClick={() => {
                const ny = today.m === 12 ? today.y + 1 : today.y;
                const nm = today.m === 12 ? 1 : today.m + 1;
                set({ s: formatYMD({ y: ny, m: nm, d: 1 }), e: formatYMD({ y: ny, m: nm, d: daysInMonth(ny, nm) }) });
              }}
            >
              다음 달
            </button>
            <button type="button" className="chip" onClick={() => set({ s: formatYMD(today), e: formatYMD({ y: today.y, m: 12, d: 31 }) })}>
              오늘~연말
            </button>
            {HOLIDAY_YEARS.map((y) => (
              <button key={y} type="button" className="chip" onClick={() => set({ s: `${y}-01-01`, e: `${y}-12-31` })}>
                {y}년 전체
              </button>
            ))}
          </div>
        </div>
        {saturdayBox}
        {smallBizBox}
      </>
    );
    if (!a || !b) {
      result = <CalcNotice>시작일과 종료일을 모두 골라 주세요.</CalcNotice>;
    } else {
      const swapped = compareYMD(a, b) > 0;
      const start = swapped ? b : a;
      const end = swapped ? a : b;
      if (diffDays(start, end) + 1 > MAX_RANGE_DAYS) {
        result = <CalcNotice>기간은 30년 이내로 골라 주세요.</CalcNotice>;
      } else {
        const c = countWorkdays(start, end, rule);
        const off = c.calendarDays - c.workdays;
        result = (
          <Statement title="근무일수 명세" caption={ruleCaption(rule)}>
            <StatementHero
              label={`${fullRange(start, end)} 근무일수`}
              value={`${formatNumber(c.workdays)}일`}
              sub={`달력 ${formatNumber(c.calendarDays)}일 중 쉬는 날 ${formatNumber(off)}일`}
            />
            <StatementSection title="계산 내역">
              <StatementRow label="달력일" note="시작일·종료일 포함" value={`${formatNumber(c.calendarDays)}일`} />
              <StatementRow label="토요일" note={rule.saturdayWork ? "근무" : "휴무"} value={`${formatNumber(c.saturdays)}일`} />
              <StatementRow label="일요일" note="휴무" value={`${formatNumber(c.sundays)}일`} />
              <StatementRow
                label={rule.saturdayWork ? "근무일에 걸린 공휴일" : "평일 공휴일"}
                note="근무일에서 빠짐"
                value={`${formatNumber(c.holidaysOnWorkdays)}일`}
              />
              {c.holidaysOnRestDays ? (
                <StatementRow label="휴무일과 겹친 공휴일" note="따로 빠지지 않음" value={`${formatNumber(c.holidaysOnRestDays)}일`} />
              ) : null}
            </StatementSection>
            <StatementTotal
              label={`근무일수 (${formatNumber(c.calendarDays)}일 − 쉬는 날 ${formatNumber(off)}일)`}
              value={`${formatNumber(c.workdays)}일`}
            />
            {c.holidays.length ? (
              <StatementSection title="기간 안의 공휴일">
                <HolidayHitRows hits={c.holidays} showYear={start.y !== end.y} />
              </StatementSection>
            ) : null}
            <StatementFootnote>
              {swapped ? "종료일이 시작일보다 앞서 있어 두 날짜를 바꿔 계산했어요. " : ""}
              {c.uncoveredDays
                ? `${FIRST_YEAR}~${LAST_YEAR}년 밖의 ${formatNumber(c.uncoveredDays)}일은 공휴일 자료가 없어 주말만 뺐어요. `
                : ""}
              {rule.smallBiz ? "5인 미만 기준이라 공휴일 가운데 노동절만 쉬는 날로 셌어요. " : ""}
              {COVERAGE_NOTE}
            </StatementFootnote>
          </Statement>
        );
      }
    }
  } else if (mode === "add") {
    const base = pickDate(s.b, today);
    const n = s.n;
    const validN = Number.isInteger(n) && n >= 1 && n <= MAX_ADD_WORKDAYS;
    inputs = (
      <>
        <DateInput label="기준일" raw={s.b} date={base} onChange={(b) => set({ b })} hint="처음에는 오늘 날짜가 들어가 있어요." />
        <NumberField
          label="영업일 수"
          value={n}
          onChange={(v) => set({ n: v })}
          unit="영업일"
          max={MAX_ADD_WORKDAYS}
          presets={[1, 3, 5, 7, 10, 14, 30].map((v) => ({ label: `${v}일`, value: v }))}
          hint="기준일 다음 날부터 세어 n번째 근무일을 알려 드려요."
        />
        {saturdayBox}
        {smallBizBox}
      </>
    );
    if (!base) {
      result = <CalcNotice>기준일을 골라 주세요.</CalcNotice>;
    } else if (!validN) {
      result = <CalcNotice>영업일 수를 1에서 {formatNumber(MAX_ADD_WORKDAYS)} 사이의 정수로 넣어 주세요.</CalcNotice>;
    } else {
      const r = addWorkdays(base, n, rule);
      const c = countWorkdays(addDays(base, 1), r.date, rule);
      const span = diffDays(base, r.date);
      result = (
        <Statement title="영업일 계산 명세" caption={ruleCaption(rule)}>
          <StatementHero
            label={`${formatKoreanDate(base)}부터 ${formatNumber(n)}영업일 뒤`}
            value={formatKoreanDate(r.date)}
            sub={`달력으로는 ${formatNumber(span)}일 뒤`}
          />
          <StatementSection title="기준일 다음 날부터 결과일까지">
            <StatementRow label="근무일" value={`${formatNumber(c.workdays)}일`} />
            <StatementRow label={rule.saturdayWork ? "일요일" : "토·일요일"} value={`${formatNumber(c.weeklyRest)}일`} />
            <StatementRow label="공휴일" note="휴무일과 겹친 날 제외" value={`${formatNumber(c.holidaysOnWorkdays)}일`} />
          </StatementSection>
          {c.holidays.length ? (
            <StatementSection title="지나간 공휴일">
              <HolidayHitRows hits={c.holidays} showYear={base.y !== r.date.y} />
            </StatementSection>
          ) : null}
          <StatementFootnote>
            기준일 다음 날부터 근무일만 1영업일씩 세어요. 기준일이 휴일이어도 같아요.{" "}
            {r.uncovered ? `${FIRST_YEAR}~${LAST_YEAR}년 밖의 날은 공휴일 자료가 없어 주말만 건너뛰었어요. ` : ""}
            {COVERAGE_NOTE}
          </StatementFootnote>
        </Statement>
      );
    }
  } else {
    const leaveRule: WorkRule = { saturdayWork: s.t6, smallBiz: false };
    const k = Number.isInteger(s.k) && s.k >= 1 && s.k <= MAX_LEAVE ? s.k : 2;
    const yearView = HOLIDAY_YEARS.includes(Number(s.v)) ? Number(s.v) : null;
    const blocks = (yearView ? holidayBlocks(yearView, leaveRule) : upcomingBlocks(today, leaveRule)).filter(
      (b) => !isWeekendOnly(b, leaveRule),
    );
    // 앞으로 남은 연휴: 연차는 내일 이후 근무일에만 넣는다 (지난 날짜를 권하지 않음).
    const rows = leaveRows(blocks, k, leaveRule, yearView ? undefined : addDays(today, 1));
    let best = rows[0];
    for (const r of rows) if (r.plan.length > best.plan.length) best = r;
    const when = isLive ? "오늘" : formatKoreanDate(today);
    const showAlt = (r: (typeof rows)[number]) => k === 1 && r.alternatives.length > 0;
    const anyUncovered = rows.some((r) => r.plan.uncovered || (showAlt(r) && r.alternatives[0].uncovered));
    inputs = (
      <>
        <SegmentedField<string>
          label="어느 연휴를 볼까요"
          value={yearView ? String(yearView) : "next"}
          onChange={(v) => set({ v })}
          options={[{ value: "next", label: "앞으로 남은 연휴" }, ...HOLIDAY_YEARS.map((y) => ({ value: String(y), label: `${y}년` }))]}
        />
        <StepperField
          label="쓸 연차 일수"
          value={k}
          onChange={(v) => set({ k: v })}
          min={1}
          max={MAX_LEAVE}
          unit="일"
          hint="연휴 앞뒤 근무일에 연차를 붙여 가장 길게 쉬는 방법을 찾아 드려요."
        />
        {saturdayBox}
      </>
    );
    result = rows.length ? (
      <Statement title="연차 붙이기 명세" caption={yearView ? `${yearView}년 · 연차 ${k}일` : `${when} 이후 · 연차 ${k}일`}>
        <StatementHero
          label={`연차 ${k}일로 만드는 가장 긴 연휴`}
          value={`${best.plan.length}일`}
          sub={`${fullRange(best.plan.start, best.plan.end)} · ${best.name}`}
        />
        <StatementSection title="연휴별로 연차 쓰는 날">
          {rows.map((r) => {
            const first = r.blocks[0];
            const last = r.blocks[r.blocks.length - 1];
            // 연휴가 끝났거나 첫 연차 날이 이미 지난 조합
            const past = compareYMD(last.end, today) < 0 || compareYMD(r.plan.leaveDates[0], today) < 0;
            const alt = showAlt(r) ? ` (또는 ${leaveDatesLabel(r.alternatives[0].leaveDates)})` : "";
            return (
              <StatementRow
                key={formatYMD(first.start)}
                label={`${past ? "[지남] " : ""}${r.name}`}
                note={`${rangeLabel(r.plan.start, r.plan.end)} · 연차 ${leaveDatesLabel(r.plan.leaveDates)}${alt}`}
                value={`${r.plan.length}일`}
                emphasis={r === best}
              />
            );
          })}
        </StatementSection>
        <StatementFootnote>
          연차는 {leaveRule.saturdayWork ? "일요일" : "토·일요일"}과 공휴일이 아닌 근무일에만 넣었어요.{" "}
          {yearView ? "" : "앞으로 남은 연휴는 내일 이후 날짜에만 연차를 넣어요. "}
          같은 길이가 나오는 조합이 여럿이면 앞쪽 날짜부터 보여 드려요.{" "}
          {anyUncovered ? `${FIRST_YEAR}~${LAST_YEAR}년 밖의 날은 공휴일 자료가 없어 주말만 쉬는 날로 봤어요. ` : ""}
          {COVERAGE_NOTE}
        </StatementFootnote>
      </Statement>
    ) : (
      <CalcNotice>{`${LAST_YEAR + 1}년 공휴일은 우주항공청 월력요항이 나오면 추가해요. 위에서 연도를 골라 지난 연휴를 볼 수 있어요.`}</CalcNotice>
    );
  }

  return (
    <CalcLayout
      inputs={
        <>
          <SegmentedField<HolidaysMode>
            label="무엇을 계산할까요"
            value={mode}
            onChange={(m) => set({ m })}
            options={[
              { value: "range", label: "근무일수" },
              { value: "add", label: "영업일 더하기" },
              { value: "leave", label: "연차 꿀팁" },
            ]}
          />
          {inputs}
        </>
      }
      result={result}
    />
  );
}
