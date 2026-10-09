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
  exactHoursLabel,
  hoursLabel,
  JUHYU_MIN_WEEKLY_HOURS,
  liveRateRules,
  MIN_WAGE_2026,
  MIN_WAGE_2027,
  pensionRateLabel,
  RATE_2027_NOTE_UI,
  rateYearForWage,
  round1,
  ruleMonthLabel,
  shownHoursAreExact,
  type DeductionMode,
  type RateYear,
} from "@/lib/calc/hourly-wage";
import { useToday } from "@/lib/useToday";
import { useUrlState } from "@/lib/useUrlState";

const MODES: DeductionMode[] = ["none", "freelance", "insured"];

/** URL value of the 4대보험 기준 choice: "" = automatic (see rateYear below). */
type YearChoice = "" | "2026" | "2027";

export function HourlyWageCalculator({
  initialWage = MIN_WAGE_2026,
  initialDaily = 8,
  initialDays = 5,
}: {
  initialWage?: number;
  initialDaily?: number;
  initialDays?: number;
}) {
  // URL keys: w = 시급, h = 1일 근무시간, d = 주 근무일수, a = 개근, m = 공제 방식, y = 4대보험 기준 연도
  const [s, set] = useUrlState({
    w: initialWage,
    h: initialDaily,
    d: initialDays,
    a: true as boolean,
    m: "none" as DeductionMode,
    y: "" as YearChoice,
  });
  const { today } = useToday();
  // The visitor's month decides the rules, like the salary tool (first render = build date, as in the HTML).
  const live = liveRateRules(today.y, today.m);
  const mode: DeductionMode = MODES.includes(s.m) ? s.m : "none";
  const days = Math.min(7, Math.max(1, Math.round(Number.isFinite(s.d) ? s.d : 5)));
  const wageOk = Number.isFinite(s.w) && s.w > 0;
  // The box takes one decimal (4.5시간); round a hand-edited link (?h=7.75) the same way so the
  // hours shown in the box are the hours calculated.
  const hours = round1(s.h);
  const hoursOk = Number.isFinite(hours) && hours > 0 && hours <= 24;
  const valid = wageOk && hoursOk;
  // From 2027 only the 2027 rules apply. In 2026 the visitor picks; by default the 2027 최저시급 (10,700원)
  // uses the 2027 예상 — the same figure as the 2026·2027 tables and the 최저임금 계산기 — other wages this month.
  const yearChoosable = live.rateYear === 2026;
  const rateYear: RateYear = !yearChoosable
    ? 2027
    : s.y === "2027"
      ? 2027
      : s.y === "2026"
        ? 2026
        : rateYearForWage(wageOk ? s.w : 0);

  const r = valid
    ? calcHourly({
        wage: s.w,
        dailyHours: hours,
        days,
        perfectAttendance: s.a,
        deduction: mode,
        payMonth: live.payMonth,
        rateYear,
      })
    : null;
  const minWage = live.rateYear === 2027 ? MIN_WAGE_2027 : MIN_WAGE_2026;
  const belowMin = wageOk && s.w < minWage;
  const ruleLabel = rateYear === 2027 ? "2027년 예상" : `${ruleMonthLabel(live.payMonth)}분`;
  // Pay uses the exact 월 환산 시간; the 0.01h value shown gets "약" unless it is exact (209, 182.5 …).
  const hoursExact = r ? shownHoursAreExact(r.monthlyPayHours, r.monthlyHours) : true;
  const monthHours = r ? `${hoursExact ? "" : "약 "}${hoursLabel(r.monthlyHours)}시간` : "";

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
                ? `${live.rateYear === 2027 ? "2027" : "2026"}년 최저시급 ${formatNumber(minWage)}원보다 낮아요. 수습 3개월 이내 등 예외가 아니면 최저임금법 위반이에요.`
                : undefined
            }
          />
          <NumberField
            label="하루 근무시간"
            value={hours}
            onChange={(h) => set({ h })}
            unit="시간"
            decimals={1}
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
                  ? "근로자로 4대보험에 가입한 경우예요. 부양가족은 본인 1명 기준이에요."
                  : "세금과 보험료를 떼기 전 금액을 보여 드려요."
            }
          />
          {mode === "insured" && yearChoosable ? (
            <SegmentedField<"2026" | "2027">
              label="4대보험·세금 기준"
              value={rateYear === 2027 ? "2027" : "2026"}
              onChange={(y) => set({ y })}
              options={[
                { value: "2026", label: `${ruleMonthLabel(live.payMonth)}분` },
                { value: "2027", label: "2027년 예상" },
              ]}
              hint={
                rateYear === 2027
                  ? s.y === "" && wageOk && s.w === MIN_WAGE_2027
                    ? "2027년 최저시급이라 2027년 예상으로 계산했어요. 국민연금이 5.0%로 올라요."
                    : "국민연금 5.0%, 건강보험 7.19%(동결)를 넣고 장기요양·고용보험과 소득세는 2026년 값으로 가정했어요."
                  : "지금 달 급여에 적용되는 요율이에요."
              }
            />
          ) : null}
        </>
      }
      result={
        r ? (
          <Statement title="알바 급여 명세" caption={`시급 ${formatNumber(r.wage)}원 · 주 ${hoursLabel(r.weeklyWork)}시간`}>
            <StatementHero
              label={mode === "none" ? "예상 월급 (세전)" : "예상 월급 (세후 실수령)"}
              value={formatWon(mode === "none" ? r.monthlyGross : r.monthlyNet)}
              sub={`${koreanWon(mode === "none" ? r.monthlyGross : r.monthlyNet)} · 월 ${monthHours} 기준`}
              stamp={mode === "none" ? "세전" : "세후"}
            />
            <StatementSection title="주급">
              <StatementRow
                label="주 소정근로시간"
                value={`${hoursLabel(r.contractualWeekly)}시간`}
                note={
                  r.overtime > 0
                    ? `${hoursLabel(hours)}시간 × ${days}일 중 연장 ${hoursLabel(r.overtime)}시간 제외`
                    : `${hoursLabel(hours)}시간 × ${days}일`
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
                value={monthHours}
                note={
                  !r.monthly209
                    ? `(${hoursLabel(r.weeklyWork)}+${hoursLabel(r.juhyuHours)})시간 × 365÷7÷12${hoursExact ? "" : ", 0.01시간까지 표시"}`
                    : r.overtime > 0
                      ? `(40+8)시간분 고시 기준 209 + 연장 ${hoursLabel(r.overtime)}시간 × 365÷7÷12`
                      : `(40+8)시간 × 365÷7÷12 = ${formatNumber(r.monthlyHoursExact, 2)} → 고시 기준 209`
                }
              />
              <StatementRow
                label="월급 (세전)"
                value={formatWon(r.monthlyGross)}
                note={
                  hoursExact
                    ? `시급 × ${hoursLabel(r.monthlyHours)}시간`
                    : `시급 × ${exactHoursLabel(r.monthlyPayHours)}시간, 원 미만 반올림`
                }
                emphasis
              />
            </StatementSection>
            {r.freelance ? (
              <StatementSection title="공제 (3.3%)">
                <StatementRow label="소득세" value={formatWon(r.freelance.incomeTax)} note="3%" />
                <StatementRow label="지방소득세" value={formatWon(r.freelance.localTax)} note="소득세의 10%" />
              </StatementSection>
            ) : null}
            {r.insured ? (
              <StatementSection title={`공제 (4대보험+소득세, ${ruleLabel})`}>
                <StatementRow
                  label="국민연금"
                  value={formatWon(r.insured.pension)}
                  note={r.insured.shortTime ? "초단시간 제외" : pensionRateLabel(r.rateYear)}
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
              {r.monthly209
                ? "주 40시간분은 최저임금 고시와 같이 월 209시간(208.57시간)으로 계산했어요. "
                : "209시간은 주 40시간일 때 쓰는 고시 기준이라, 이 근무시간은 1시간 단위로 맞추지 않고 공식 그대로 계산했어요. "}
              {hoursExact
                ? ""
                : "반올림하지 않은 정확한 월 환산 시간에 시급을 곱하고 원 미만만 반올림했어요. 시간은 소수 둘째 자리까지만 보여 드려요. "}
              월급은 1년 평균 4.345주(365÷7÷12)로 나눈 값이라 실제로는 그 달 근무일수에 따라 조금씩 달라져요. 주급 합계 ×
              365÷7÷12로 계산하면 {formatWon(r.monthlyByWeeks)}이에요.
              {r.overtime > 0
                ? ` 하루 8시간·주 40시간을 넘는 ${hoursLabel(r.overtime)}시간은 연장근로예요. 상시 5인 이상 사업장이면 50%를 더 받아 주 ${formatWon(r.overtimePremiumWeekly)}, 월 약 ${formatWon(r.overtimePremiumMonthly)}이 늘어나요(위 금액은 1배로 계산).`
                : ""}
              {days === 7 ? " 주 7일 근무는 쉬는 날(주휴일)에도 일하는 셈이라 5인 이상 사업장이면 휴일근로 가산이 붙어요." : ""}
              {r.insured?.shortTime
                ? " 주 15시간 미만은 국민연금·건강보험 직장가입 대상이 아니에요. 고용보험은 3개월 이상 계속 일한다고 보고 넣었어요."
                : ""}
              {mode === "insured"
                ? r.rateYear === 2027
                  ? ` ${RATE_2027_NOTE_UI} 소득세는 간이세액표(본인 1명) 기준이에요.`
                  : ` 4대보험은 ${ruleMonthLabel(live.payMonth)}분 요율, 소득세는 간이세액표(본인 1명) 기준이에요.`
                : ""}
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
