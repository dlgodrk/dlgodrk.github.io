"use client";

import { CalcLayout, CalcNotice } from "@/components/CalcLayout";
import { DateField, SelectField } from "@/components/fields";
import { Statement, StatementFootnote, StatementHero, StatementRow, StatementSection } from "@/components/Statement";
import { addDays, compareYMD, diffDays, formatKoreanDate, parseYMD, type YMD } from "@/lib/date";
import { formatNumber, formatWon } from "@/lib/format";
import {
  DEFAULT_SERVICE_ID,
  getServiceType,
  isBeforeShorteningDone,
  isStartInRange,
  promotionDates,
  rankOn,
  SERVICE_TYPES,
  serviceEndDate,
  serviceProgress,
  shorteningDone,
  SOLDIER_PAY_2026,
  START_MAX,
  START_MIN,
  type ServiceId,
  type ServiceProgress,
  type ServiceType,
} from "@/lib/calc/discharge";
import { useToday } from "@/lib/useToday";
import { useUrlState } from "@/lib/useUrlState";

const PROMOTED_RANKS = ["일병", "상병", "병장"] as const;

const START_HINT: Record<ServiceType["kind"], string> = {
  soldier: "입영통지서에 적힌 입영일(훈련소에 들어가는 날)을 넣어 주세요.",
  social: "사회복무요원 소집일을 넣어 주세요. 군사교육소집(기초군사훈련) 기간도 복무기간에 들어가요.",
  industry: "병무청에 편입된 날을 넣어 주세요. 군사교육소집 기간도 복무기간에 들어가요.",
  research: "병무청에 편입된 날을 넣어 주세요. 군사교육소집 기간도 복무기간에 들어가요.",
  alternative: "대체복무요원 소집일을 넣어 주세요.",
};

export function DischargeCalculator({
  initialDate = "2025-06-02",
  initialType = DEFAULT_SERVICE_ID,
}: {
  initialDate?: string;
  initialType?: ServiceId;
}) {
  // URL keys: d = start date, t = service type
  const [s, set] = useUrlState({ d: initialDate, t: initialType as string });
  const type = getServiceType(s.t) ?? getServiceType(DEFAULT_SERVICE_ID)!;
  const start = parseYMD(s.d);
  const { today } = useToday();

  return (
    <CalcLayout
      inputs={
        <>
          <DateField
            label={type.startLabel}
            value={s.d}
            onChange={(d) => set({ d })}
            min={START_MIN}
            max={START_MAX}
            hint={START_HINT[type.kind]}
          />
          <SelectField<ServiceId>
            label="복무 형태"
            value={type.id}
            onChange={(t) => set({ t })}
            options={SERVICE_TYPES.map((t) => ({ value: t.id, label: `${t.name} · ${t.months}개월` }))}
            hint="의무경찰·의무소방은 폐지되어 목록에 없어요."
          />
        </>
      }
      result={
        !start ? (
          <CalcNotice>{type.startLabel}을 넣으면 바로 계산해 드려요.</CalcNotice>
        ) : !isStartInRange(start) ? (
          <CalcNotice>2000년~2040년 사이의 {type.startLabel}을 넣어 주세요.</CalcNotice>
        ) : (
          <DischargeStatement start={start} type={type} today={today} />
        )
      }
    />
  );
}

function DischargeStatement({ start, type, today }: { start: YMD; type: ServiceType; today: YMD }) {
  const end = serviceEndDate(start, type.months);
  const p = serviceProgress(start, end, today);
  const pct = formatNumber(p.ratio * 100, 1);
  const isSoldier = type.kind === "soldier";
  const shortening = shorteningNote(start, type);

  return (
    <Statement title={`${type.endWord}일 명세`} caption={`${type.name} ${type.months}개월`}>
      <StatementHero
        label={`${type.endWord}일`}
        value={formatKoreanDate(end)}
        sub={heroSub(p, type)}
        stamp={type.stamp}
      />
      <ProgressBar progress={p} pct={pct} />
      <StatementSection title="복무 기간">
        <StatementRow label={type.startLabel} value={formatKoreanDate(start)} />
        <StatementRow label="복무기간" value={`${type.months}개월`} />
        <StatementRow label="전체 복무일수" value={`${formatNumber(p.totalDays)}일`} note="첫날과 마지막 날 포함" />
        <StatementRow
          label="오늘까지 복무일수"
          value={`${formatNumber(p.servedDays)}일`}
          note={`${formatKoreanDate(today, false)} 기준`}
        />
        <StatementRow label="남은 일수" value={`${formatNumber(p.remainingDays)}일`} emphasis />
      </StatementSection>
      {isSoldier ? <PromotionSection start={start} today={today} end={end} /> : null}
      <StatementFootnote>
        {type.endWord}일은 {type.startLabel}부터 {type.months}개월이 되는 날의 전날이에요.{" "}
        {isSoldier
          ? "형 집행·군기교육·복무이탈 기간은 복무기간에 들어가지 않아 그만큼 늦어질 수 있어요."
          : "복무를 이탈하거나 제재를 받으면 복무기간이 늘어날 수 있어요."}
        {shortening ? ` ${shortening}` : ""}
      </StatementFootnote>
    </Statement>
  );
}

/** Warning for start dates from the 2017~2021 step-by-step shortening period, or null. */
function shorteningNote(start: YMD, type: ServiceType): string | null {
  const done = shorteningDone(type.id);
  if (!done || !isBeforeShorteningDone(start, type.id)) return null;
  const who = `${type.startLabel.replace(/일$/, "")}자`;
  const lastDay = addDays(done.from, -1);
  return done.exact
    ? `${formatKoreanDate(lastDay, false)} 이전 ${who}는 복무기간이 ${type.months}개월보다 길었던 시기라 실제 ${type.endWord}일이 이보다 늦어요. 병무청에서 확인하세요.`
    : `${lastDay.y}년 이전 ${who}는 복무기간 단축이 단계적으로 적용된 시기와 겹칠 수 있으니 실제 날짜를 병무청에서 확인하세요.`;
}

function heroSub(p: ServiceProgress, type: ServiceType): string {
  const startWord = type.startLabel.replace(/일$/, "");
  if (p.status === "before") return `${startWord}까지 ${formatNumber(p.daysUntilStart)}일 남았어요`;
  if (p.status === "done") return `${type.endWord} 후 ${formatNumber(p.daysSinceEnd)}일 지났어요`;
  if (p.remainingDays === 0) return `오늘이 ${type.endWord}일이에요`;
  return `D-${formatNumber(p.remainingDays)} · ${type.endWord}까지 ${formatNumber(p.remainingDays)}일`;
}

function ProgressBar({ progress, pct }: { progress: ServiceProgress; pct: string }) {
  const width = Math.min(100, Math.max(0, progress.ratio * 100));
  return (
    <div className="border-t border-dashed border-rule-strong px-5 pt-3 pb-3.5">
      <div className="flex items-baseline justify-between gap-3 text-[0.9375rem]">
        <span className="text-ink-soft">복무율</span>
        <span className="tabular font-bold text-ink">{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-label="복무율"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(width * 10) / 10}
        className="mt-2 h-3 overflow-hidden rounded-full border border-rule bg-wash"
      >
        <div className="h-full rounded-full bg-link transition-[width] duration-300" style={{ width: `${width}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-muted tabular">
        {formatNumber(progress.servedDays)}일 / {formatNumber(progress.totalDays)}일
      </p>
    </div>
  );
}

function PromotionSection({ start, end, today }: { start: YMD; end: YMD; today: YMD }) {
  const promo = promotionDates(start);
  const current = compareYMD(today, end) > 0 ? null : rankOn(start, today);
  return (
    <StatementSection title="진급 예정일 (정상 진급 기준)">
      {PROMOTED_RANKS.map((r) => {
        const date = promo[r];
        const left = diffDays(today, date);
        return (
          <StatementRow
            key={r}
            label={r}
            value={formatKoreanDate(date)}
            note={left > 0 ? `D-${formatNumber(left)}` : left === 0 ? "오늘" : "지남"}
          />
        );
      })}
      {current ? (
        <StatementRow
          label={`지금 계급 ${current}`}
          note="2026년 월 봉급"
          value={formatWon(SOLDIER_PAY_2026[current])}
          emphasis
        />
      ) : null}
    </StatementSection>
  );
}
