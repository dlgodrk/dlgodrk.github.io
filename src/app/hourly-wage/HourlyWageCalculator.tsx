"use client";

import { CalcLayout, CalcNotice } from "@/components/CalcLayout";
import { CheckboxField, NumberField, SegmentedField, StepperField } from "@/components/fields";
import {
  Statement,
  StatementFootnote,
  StatementHero,
  StatementRow,
  StatementSection,
  StatementTotal,
} from "@/components/Statement";
import { formatNumber, formatWon, koreanWon } from "@/lib/format";
import {
  calcHourly,
  hoursLabel,
  JUHYU_MIN_WEEKLY_HOURS,
  MIN_WAGE_2026,
  MIN_WAGE_2027,
  type DeductionMode,
} from "@/lib/calc/hourly-wage";
import { useUrlState } from "@/lib/useUrlState";
import { HoursField } from "./HoursField";

const MODES: DeductionMode[] = ["none", "freelance", "insured"];

export function HourlyWageCalculator({
  initialDaily = 8,
  initialDays = 5,
}: {
  initialDaily?: number;
  initialDays?: number;
}) {
  // URL keys: w = 시급, h = 1일 근무시간, d = 주 근무일수, a = 개근, m = 공제 방식
  const [s, set] = useUrlState({
    w: MIN_WAGE_2026,
    h: initialDaily,
    d: initialDays,
    a: true as boolean,
    m: "none" as DeductionMode,
  });
  const mode: DeductionMode = MODES.includes(s.m) ? s.m : "none";
  const days = Math.min(7, Math.max(1, Math.round(Number.isFinite(s.d) ? s.d : 5)));
  const wageOk = Number.isFinite(s.w) && s.w > 0;
  const hoursOk = Number.isFinite(s.h) && s.h > 0 && s.h <= 24;
  const valid = wageOk && hoursOk;

  const r = valid ? calcHourly({ wage: s.w, dailyHours: s.h, days, perfectAttendance: s.a, deduction: mode }) : null;
  const belowMin = wageOk && s.w < MIN_WAGE_2026;

  return (
    <CalcLayout
      inputs={
        <>
          <NumberField
            label="시급"
            value={s.w}
            onChange={(w) => set({ w })}
            unit="원"
            max={1_000_000}
            presets={[
              { label: "2026 최저 10,320", value: MIN_WAGE_2026 },
              { label: "2027 최저 10,700", value: MIN_WAGE_2027 },
              { label: "11,000", value: 11_000 },
              { label: "12,000", value: 12_000 },
              { label: "15,000", value: 15_000 },
            ]}
            hint={
              belowMin
                ? "2026년 최저시급 10,320원보다 낮아요. 수습 3개월 이내 등 예외가 아니면 최저임금법 위반이에요."
                : undefined
            }
          />
          <HoursField
            label="하루 근무시간"
            value={s.h}
            onChange={(h) => set({ h })}
            unit="시간"
            max={24}
            presets={[3, 4, 5, 6, 8].map((n) => ({ label: `${n}시간`, value: n }))}
            hint="휴게시간은 빼고 넣어 주세요. 30분은 0.5시간이에요."
          />
          <StepperField label="주 근무일수" value={days} onChange={(d) => set({ d })} min={1} max={7} unit="일" />
          <CheckboxField
            label="결근 없이 개근"
            checked={s.a}
            onChange={(a) => set({ a })}
            hint="그 주 출근하기로 한 날을 모두 나가야 주휴수당이 생겨요. 지각·조퇴는 결근이 아니에요."
          />
          <SegmentedField<DeductionMode>
            label="공제 방식"
            value={mode}
            onChange={(m) => set({ m })}
            options={[
              { value: "none", label: "공제 없음" },
              { value: "freelance", label: "3.3%" },
              { value: "insured", label: "4대보험+소득세" },
            ]}
            hint={
              mode === "freelance"
                ? "사업소득으로 신고할 때 떼는 소득세 3%와 지방소득세 0.3%예요."
                : mode === "insured"
                  ? "근로자로 4대보험에 가입한 경우예요. 2026년 요율, 부양가족 본인 1명 기준이에요."
                  : "세금과 보험료를 떼기 전 금액을 보여 드려요."
            }
          />
        </>
      }
      result={
        r ? (
          <Statement title="알바 급여 명세" caption={`시급 ${formatNumber(r.wage)}원 · 주 ${hoursLabel(r.weeklyWork)}시간`}>
            <StatementHero
              label={mode === "none" ? "예상 월급 (세전)" : "예상 월급 (세후 실수령)"}
              value={formatWon(mode === "none" ? r.monthlyGross : r.monthlyNet)}
              sub={`${koreanWon(mode === "none" ? r.monthlyGross : r.monthlyNet)} · 월 ${hoursLabel(r.monthlyHours)}시간 기준`}
              stamp={mode === "none" ? "세전" : "세후"}
            />
            <StatementSection title="주급">
              <StatementRow
                label="주 소정근로시간"
                value={`${hoursLabel(r.contractualWeekly)}시간`}
                note={
                  r.overtime > 0
                    ? `${hoursLabel(s.h)}시간 × ${days}일 중 연장 ${hoursLabel(r.overtime)}시간 제외`
                    : `${hoursLabel(s.h)}시간 × ${days}일`
                }
              />
              <StatementRow label="주급(기본)" value={formatWon(r.weeklyBase)} note={`시급 × ${hoursLabel(r.weeklyWork)}시간`} />
              <StatementRow
                label="주휴수당"
                value={formatWon(r.juhyuPay)}
                note={
                  r.juhyuEligible
                    ? `${hoursLabel(r.juhyuHours)}시간분`
                    : r.contractualWeekly < JUHYU_MIN_WEEKLY_HOURS
                      ? "주 15시간 미만이라 없음"
                      : "결근한 주는 없음"
                }
              />
              <StatementRow label="주급 합계" value={formatWon(r.weeklyTotal)} emphasis />
            </StatementSection>
            <StatementSection title="월급">
              <StatementRow
                label="월 환산 시간"
                value={`${hoursLabel(r.monthlyHours)}시간`}
                note={`(${hoursLabel(r.weeklyWork)}+${hoursLabel(r.juhyuHours)})시간 × 365÷7÷12 = ${formatNumber(r.monthlyHoursExact, 2)}`}
              />
              <StatementRow label="월급 (세전)" value={formatWon(r.monthlyGross)} emphasis />
            </StatementSection>
            {r.freelance ? (
              <StatementSection title="공제 (3.3%)">
                <StatementRow label="소득세" value={formatWon(r.freelance.incomeTax)} note="3%" />
                <StatementRow label="지방소득세" value={formatWon(r.freelance.localTax)} note="소득세의 10%" />
              </StatementSection>
            ) : null}
            {r.insured ? (
              <StatementSection title="공제 (4대보험+소득세)">
                <StatementRow
                  label="국민연금"
                  value={formatWon(r.insured.pension)}
                  note={r.insured.shortTime ? "초단시간 제외" : "4.75%"}
                />
                <StatementRow
                  label="건강보험"
                  value={formatWon(r.insured.health)}
                  note={r.insured.shortTime ? "초단시간 제외" : "3.595%"}
                />
                <StatementRow label="장기요양보험" value={formatWon(r.insured.longTermCare)} />
                <StatementRow label="고용보험" value={formatWon(r.insured.employment)} note="0.9%" />
                <StatementRow label="소득세" value={formatWon(r.insured.incomeTax)} note="간이세액표" />
                <StatementRow label="지방소득세" value={formatWon(r.insured.localTax)} />
              </StatementSection>
            ) : null}
            {mode !== "none" ? (
              <>
                <StatementSection>
                  <StatementRow label="공제 합계" value={`−${formatWon(r.deductionTotal)}`} />
                </StatementSection>
                <StatementTotal label="월 실수령액" value={formatWon(r.monthlyNet)} />
              </>
            ) : (
              <StatementTotal label="월 실수령액 (공제 전)" value={formatWon(r.monthlyNet)} />
            )}
            <StatementFootnote>
              월급은 1년 평균 4.345주(365÷7÷12)로 나눈 값이라 실제로는 그 달 근무일수에 따라 조금씩 달라져요. 주급 합계 ×
              365÷7÷12로 계산하면 {formatWon(r.monthlyByWeeks)}이에요.
              {r.overtime > 0
                ? ` 하루 8시간·주 40시간을 넘는 ${hoursLabel(r.overtime)}시간은 연장근로예요. 상시 5인 이상 사업장이면 50%를 더 받아 주 ${formatWon(r.overtimePremiumWeekly)}, 월 약 ${formatWon(r.overtimePremiumMonthly)}이 늘어나요(위 금액은 1배로 계산).`
                : ""}
              {days === 7 ? " 주 7일 근무는 쉬는 날(주휴일)에도 일하는 셈이라 5인 이상 사업장이면 휴일근로 가산이 붙어요." : ""}
              {r.insured?.shortTime
                ? " 주 15시간 미만은 국민연금·건강보험 직장가입 대상이 아니에요. 고용보험은 3개월 이상 계속 일한다고 보고 넣었어요."
                : ""}
              {mode === "insured" ? " 4대보험은 2026년 10월 요율, 소득세는 간이세액표(본인 1명) 기준이에요." : ""}
            </StatementFootnote>
          </Statement>
        ) : (
          <CalcNotice>
            {!wageOk ? "시급을 입력하면 바로 계산해 드려요." : "하루 근무시간을 0보다 크고 24시간 이하로 입력해 주세요."}
          </CalcNotice>
        )
      }
    />
  );
}
