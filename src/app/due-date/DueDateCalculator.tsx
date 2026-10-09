"use client";

import { CalcLayout, CalcNotice } from "@/components/CalcLayout";
import { DateField, SegmentedField, StepperField } from "@/components/fields";
import { Statement, StatementFootnote, StatementHero, StatementRow, StatementSection } from "@/components/Statement";
import { addDays, diffDays, formatYMD, parseYMD, weekdayKo, type YMD } from "@/lib/date";
import { BUILD_DATE, useToday } from "@/lib/useToday";
import { useUrlState } from "@/lib/useUrlState";
import {
  CHECK_SCHEDULE,
  checkRange,
  checkStatus,
  clampCycle,
  conceptionFromStart,
  DEFAULT_CYCLE,
  daysToDue,
  ddayLabel,
  formatWeeksDays,
  gestationalAge,
  MAX_CYCLE,
  MIN_CYCLE,
  normalizeEmbryoDay,
  POST_TERM_DAYS,
  PREGNANCY_DAYS,
  pregnancyMonth,
  pregnancyStart,
  progressRatio,
  referenceDateFromStart,
  SAMPLE_WEEKS_AGO,
  startStatus,
  TERM_START_DAYS,
  TERM_STAGE_LABEL,
  termStage,
  TRIMESTER_LABEL,
  trimester,
  voucherExpiry,
  type DueMode,
  type EmbryoDay,
} from "@/lib/calc/due-date";

/** Prefilled example: a last period 8 weeks before the build date (same value in static HTML and client). */
const SAMPLE_DATE = formatYMD(addDays(BUILD_DATE, -SAMPLE_WEEKS_AGO * 7));
/**
 * `d` in the URL: "" = not chosen yet (the example date is shown), CLEARED = the visitor emptied the field.
 * Keeping the default empty (not SAMPLE_DATE) means any date the visitor picks, even one equal to the
 * build-date-based example, is always written to the share link and survives the next rebuild.
 */
const CLEARED = "-";

const MODE_LABEL: Record<DueMode, string> = {
  lmp: "마지막 생리 시작일",
  con: "수정일 (배란일)",
  ivf: "배아 이식일",
};

const MODE_HINT: Record<DueMode, string> = {
  lmp: "마지막 생리가 시작된 첫날을 넣어 주세요.",
  con: "배란 테스트나 병원에서 확인한 배란일, 또는 수정됐다고 보는 날을 넣어 주세요.",
  ivf: "배아를 이식한 날을 넣어 주세요.",
};

/** "2027. 5. 20.(목)" — compact Korean numeric date for statement rows. */
function dotDate(v: YMD, withWeekday = true): string {
  const base = `${v.y}. ${v.m}. ${v.d}.`;
  return withWeekday ? `${base}(${weekdayKo(v)})` : base;
}

/** "2026. 3. 19. ~ 4. 8." (year repeated only when it changes) */
function dotRange(from: YMD, to: YMD): string {
  const end = to.y === from.y ? `${to.m}. ${to.d}.` : `${to.y}. ${to.m}. ${to.d}.`;
  return `${dotDate(from, false)} ~ ${end}`;
}

function isUsable(v: YMD | null): v is YMD {
  return v !== null && v.y >= 1900 && v.y <= 2100;
}

export function DueDateCalculator() {
  // URL keys: m = 계산 기준, d = 날짜, c = 생리 주기, e = 배아 일수
  const [s, set] = useUrlState({ m: "lmp" as DueMode, d: "", c: DEFAULT_CYCLE, e: 5 });
  const { today } = useToday();

  const mode: DueMode = s.m === "con" || s.m === "ivf" ? s.m : "lmp";
  const cycle = clampCycle(s.c);
  const embryoDay: EmbryoDay = normalizeEmbryoDay(s.e);
  const opts = { cycle, embryoDay };
  const isSample = s.d === "";
  const dateText = isSample ? SAMPLE_DATE : s.d === CLEARED ? "" : s.d;
  const parsed = parseYMD(dateText);
  const date = isUsable(parsed) ? parsed : null;

  return (
    <CalcLayout
      inputs={
        <>
          <SegmentedField<DueMode>
            label="계산 기준"
            value={mode}
            onChange={(m) => {
              if (m === mode) return;
              // Keep the same pregnancy when switching: convert the date to the new reference point.
              if (date) set({ m, d: formatYMD(referenceDateFromStart(m, pregnancyStart(mode, date, opts), opts)) });
              else set({ m });
            }}
            options={[
              { value: "lmp", label: "마지막 생리일" },
              { value: "con", label: "배란·수정일" },
              { value: "ivf", label: "시험관 이식일" },
            ]}
          />
          {mode === "ivf" ? (
            <SegmentedField<"3" | "5">
              label="배아 일수"
              value={embryoDay === 3 ? "3" : "5"}
              onChange={(v) => set({ e: v === "3" ? 3 : 5 })}
              options={[
                { value: "3", label: "3일 배아" },
                { value: "5", label: "5일 배아 (포배기)" },
              ]}
              hint="신선 배아와 동결 배아 모두 같은 방식으로 계산해요."
            />
          ) : null}
          <DateField
            label={MODE_LABEL[mode]}
            value={dateText}
            onChange={(d) => set({ d: d === "" ? CLEARED : d })}
            aside={date ? `${weekdayKo(date)}요일` : undefined}
            hint={isSample ? `${MODE_HINT[mode]} 지금은 예시 날짜가 들어가 있어요.` : MODE_HINT[mode]}
          />
          {mode === "lmp" ? (
            <StepperField
              label="평소 생리 주기"
              value={cycle}
              onChange={(c) => set({ c })}
              min={MIN_CYCLE}
              max={MAX_CYCLE}
              unit="일"
              hint="주기가 28일보다 길면 예정일이 그만큼 늦어지고, 짧으면 빨라져요. 잘 모르면 28일로 두세요."
            />
          ) : null}
        </>
      }
      result={
        date ? (
          <DueStatement mode={mode} date={date} cycle={cycle} embryoDay={embryoDay} today={today} />
        ) : (
          <CalcNotice>{MODE_LABEL[mode]}을 넣으면 출산 예정일과 오늘 기준 임신 주수를 바로 계산해 드려요.</CalcNotice>
        )
      }
    />
  );
}

function DueStatement({
  mode,
  date,
  cycle,
  embryoDay,
  today,
}: {
  mode: DueMode;
  date: YMD;
  cycle: number;
  embryoDay: EmbryoDay;
  today: YMD;
}) {
  const opts = { cycle, embryoDay };
  const start = pregnancyStart(mode, date, opts);
  const due = addDays(start, PREGNANCY_DAYS);
  const ga = gestationalAge(start, today);
  const days = ga.totalDays;
  const daysLeft = diffDays(today, due);
  const stage = termStage(days);
  const status = startStatus(mode, date, today, opts);
  const before = status !== "started";
  const pregnant = !before && days < POST_TERM_DAYS;
  const expiry = voucherExpiry(due);
  const addDaysTotal = daysToDue(mode, opts);
  /** LMP mode with a non-28 cycle: 임신 0주 0일 is moved to LMP + (주기 − 28)일. */
  const corrected = mode === "lmp" && cycle !== DEFAULT_CYCLE;
  const shift = cycle - DEFAULT_CYCLE;
  const shiftText = `${shift > 0 ? "+" : "−"} ${Math.abs(shift)}일`;

  const formula =
    mode === "lmp"
      ? corrected
        ? `+ 280일 ${shiftText}`
        : "+ 280일"
      : `+ ${addDaysTotal}일`;

  const caption =
    mode === "lmp"
      ? `마지막 생리 시작일 + 280일${corrected ? " (주기 보정)" : ""}`
      : mode === "con"
        ? "수정일 + 266일"
        : `${embryoDay}일 배아 이식일 + ${addDaysTotal}일`;

  let heroSub: string;
  if (status === "lmp-future") heroSub = `${weekdayKo(due)}요일 · 임신 기간 시작 전`;
  else if (status === "before-start")
    heroSub = `${weekdayKo(due)}요일 · ${corrected ? "주기 보정 기준 0주 0일 전" : "임신 기간 시작 전"}`;
  else if (daysLeft > 0) heroSub = `${weekdayKo(due)}요일 · 오늘 ${formatWeeksDays(ga)} · ${ddayLabel(daysLeft)}`;
  else if (daysLeft === 0) heroSub = `${weekdayKo(due)}요일 · 오늘이 예정일이에요`;
  else heroSub = `${weekdayKo(due)}요일 · 예정일 ${-daysLeft}일 지남`;

  return (
    <Statement title="출산 예정일 명세" caption={caption}>
      <StatementHero
        label="출산 예정일"
        value={
          <>
            <span className="whitespace-nowrap">{due.y}년</span>{" "}
            <span className="whitespace-nowrap">
              {due.m}월 {due.d}일
            </span>
          </>
        }
        sub={heroSub}
        stamp="예정일"
      />
      {pregnant ? <ProgressBar days={days} /> : null}

      <StatementSection title={`오늘(${today.m}월 ${today.d}일) 기준`}>
        {before ? (
          <StatementRow
            label="임신 주수"
            value="시작 전"
            note={
              status === "lmp-future"
                ? "입력한 생리 시작일이 오늘보다 뒤예요"
                : `${corrected ? "주기 보정 기준 " : ""}임신 0주 0일(${dotDate(start, false)})까지 ${-days}일`
            }
          />
        ) : pregnant ? (
          <>
            <StatementRow
              label="현재 임신 주수"
              value={formatWeeksDays(ga)}
              note={corrected ? `총 ${days}일 · 주기 보정` : `총 ${days}일`}
              emphasis
            />
            <StatementRow
              label={daysLeft >= 0 ? "예정일까지" : "예정일 경과"}
              value={daysLeft > 0 ? `${daysLeft}일 남음` : daysLeft === 0 ? "오늘이 예정일" : `${-daysLeft}일 지남`}
              note={ddayLabel(daysLeft)}
            />
            <StatementRow label="임신 시기" value={TRIMESTER_LABEL[trimester(days)]} />
            <StatementRow label="임신 개월" value={`임신 ${pregnancyMonth(days)}개월`} note="4주를 한 달로 셈" />
            <StatementRow label="만삭 구분" value={TERM_STAGE_LABEL[stage]} />
          </>
        ) : (
          <StatementRow label="예정일 경과" value={`${-daysLeft}일 지남`} note="42주가 지난 날짜예요" />
        )}
      </StatementSection>

      <StatementSection title="계산 근거">
        <StatementRow label={MODE_LABEL[mode]} value={dotDate(date)} />
        {mode === "lmp" ? (
          <>
            <StatementRow label="생리 주기" value={`${cycle}일`} note={corrected ? "주기 보정" : "표준 주기"} />
            {corrected ? (
              <StatementRow label="보정 임신 0주 0일" value={dotDate(start)} note={`생리 시작일 ${shiftText}`} />
            ) : null}
            <StatementRow label="추정 배란·수정일" value={dotDate(conceptionFromStart(start))} note="다음 생리 14일 전" />
          </>
        ) : (
          <>
            {mode === "ivf" ? (
              <StatementRow label="추정 수정일" value={dotDate(addDays(date, -embryoDay))} note={`이식일 − ${embryoDay}일`} />
            ) : null}
            <StatementRow label="환산 마지막 생리일" value={dotDate(start)} note="임신 0주 0일" />
          </>
        )}
        <StatementRow label="더한 날수" value={formula} />
      </StatementSection>

      <StatementSection title="주요 시점">
        <StatementRow label="만삭 시작" note="37주 0일" value={dotDate(addDays(start, TERM_START_DAYS))} />
        <StatementRow label="출산 예정일" note="40주 0일" value={dotDate(due)} emphasis />
        <StatementRow label="지연 임신 기준" note="42주 0일" value={dotDate(addDays(start, POST_TERM_DAYS))} />
        <StatementRow
          label="진료비 바우처 사용 기한"
          note="예정일로부터 2년"
          value={`${expiry.y}년 ${expiry.m}월 무렵`}
        />
      </StatementSection>

      <StatementSection title="주수별 검사 시기 (일반적인 권장)">
        {CHECK_SCHEDULE.map((c) => {
          const r = checkRange(start, c);
          const check = checkStatus(before ? -1 : days, c);
          const weeks = c.fromWeek === c.toWeek ? `${c.fromWeek}주~` : `${c.fromWeek}~${c.toWeek}주`;
          return (
            <StatementRow
              key={c.id}
              label={c.name}
              note={check === "now" ? `${weeks} · 지금 시기` : weeks}
              value={
                check === "past" ? (
                  <span className="text-muted">{dotRange(r.from, r.to)}</span>
                ) : c.fromWeek === c.toWeek ? (
                  `${dotDate(r.from, false)}부터`
                ) : (
                  dotRange(r.from, r.to)
                )
              }
              emphasis={check === "now"}
            />
          );
        })}
      </StatementSection>

      <StatementFootnote>
        출산 예정일은 추정치예요. 실제 출산은 임신 37주 0일~41주 6일 사이면 정상 범위로 보고, 예정일 당일에 태어나는
        아기는 많지 않아요.{" "}
        {corrected
          ? "생리 주기를 보정했기 때문에 임신 주수와 검사 시기도 보정한 0주 0일부터 셌어요. 병원에서는 첫 초음파로 예정일을 정하기 전까지 보통 마지막 생리 시작일부터 주수를 세서 며칠 차이가 날 수 있어요. "
          : null}
        초기 초음파로 예정일이 조정되면 병원에서 정한 날짜를 따르세요. 검사 시기는 대한산부인과학회
        안내를 바탕으로 한 일반적인 시기라 병원과 산모 상태에 따라 달라질 수 있으며, 진료나 진단을 대신하지 않아요.
      </StatementFootnote>
    </Statement>
  );
}

/** 0주 → 40주 bar with trimester ticks at 14주 and 28주. */
function ProgressBar({ days }: { days: number }) {
  const pct = Math.round(progressRatio(days) * 1000) / 10;
  const weeks = Math.floor(days / 7);
  // aria-valuenow stops at 40; past the due date the text says so instead of "40주 중 41주".
  const valueText =
    days > PREGNANCY_DAYS ? `예정일 지남, 현재 ${weeks}주 ${days % 7}일` : `40주 중 ${weeks}주, ${pct}%`;
  return (
    <div className="px-5 pb-4">
      <div
        role="progressbar"
        aria-label="임신 기간 진행"
        aria-valuemin={0}
        aria-valuemax={40}
        aria-valuenow={Math.min(40, weeks)}
        aria-valuetext={valueText}
        className="relative h-2 overflow-hidden rounded-full bg-wash"
      >
        <div className="h-full rounded-full bg-ink" style={{ width: `${pct}%` }} />
        <span className="absolute inset-y-0 w-px bg-sheet" style={{ left: `${(14 / 40) * 100}%` }} aria-hidden />
        <span className="absolute inset-y-0 w-px bg-sheet" style={{ left: `${(28 / 40) * 100}%` }} aria-hidden />
      </div>
      <div className="mt-1.5 flex justify-between text-xs text-muted tabular" aria-hidden>
        <span>0주</span>
        <span>초기 · 중기 · 후기</span>
        <span>40주</span>
      </div>
    </div>
  );
}
