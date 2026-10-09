"use client";

import { CalcLayout, CalcNotice } from "@/components/CalcLayout";
import { CheckboxField, NumberField, SegmentedField } from "@/components/fields";
import {
  Statement,
  StatementFootnote,
  StatementHero,
  StatementRow,
  StatementSection,
} from "@/components/Statement";
import { formatNumber, formatWon, koreanWon } from "@/lib/format";
import {
  calcMinimumWage,
  JUHYU_MIN_WEEKLY_HOURS,
  MAX_DAILY_HOURS,
  MAX_WEEKLY_HOURS,
  monthlyHoursExact,
  netMonthly2026,
  shownHoursAreExact,
  yearOverYear,
  type MinWageYear,
} from "@/lib/calc/minimum-wage";
import { useUrlState } from "@/lib/useUrlState";

type YearKey = "2026" | "2027";

function hoursLabel(h: number): string {
  return `${formatNumber(h, 2)}시간`;
}

function plusWon(n: number): string {
  return `${n >= 0 ? "+" : "−"}${formatWon(Math.abs(n))}`;
}

export function MinimumWageCalculator() {
  // URL keys: y = 연도, w = 주 소정근로시간, d = 1일 근로시간, p = 수습
  const [s, set] = useUrlState({ y: "2026" as YearKey, w: 40, d: 8, p: false as boolean });
  const year: MinWageYear = s.y === "2027" ? 2027 : 2026;
  const weekly = s.w;
  const daily = s.d;
  const probation = s.p;

  const weeklyOk = Number.isFinite(weekly) && weekly > 0 && weekly <= MAX_WEEKLY_HOURS;
  const dailyOk = Number.isFinite(daily) && daily > 0 && daily <= 24;
  const valid = weeklyOk && dailyOk;

  const r = valid ? calcMinimumWage({ year, weeklyHours: weekly, dailyHours: daily, probation }) : null;
  const yoy = valid ? yearOverYear({ weeklyHours: weekly, dailyHours: daily, probation }) : null;
  const net = r && year === 2026 && weekly >= JUHYU_MIN_WEEKLY_HOURS ? netMonthly2026(r.monthly) : null;
  // 월급 uses the exact 월 환산 시간; the 0.01h value shown is marked ≈/약 unless it is exact (209, 182.5 …).
  const hoursExact = r ? shownHoursAreExact(r.monthlyPayHours, r.monthlyHours) : true;

  return (
    <CalcLayout
      inputs={
        <>
          <SegmentedField<YearKey>
            label="적용 연도"
            value={year === 2027 ? "2027" : "2026"}
            onChange={(y) => set({ y })}
            options={[
              { value: "2026", label: "2026년 10,320원" },
              { value: "2027", label: "2027년 10,700원" },
            ]}
            hint="2027년 최저임금은 2026년 8월 5일 확정 고시됐어요. 2027년 1월 1일부터 적용돼요."
          />
          <NumberField
            label="주 소정근로시간"
            value={weekly}
            onChange={(w) => set({ w })}
            unit="시간"
            decimals={1}
            max={MAX_WEEKLY_HOURS}
            presets={[15, 20, 30, 40].map((n) => ({ label: `주 ${n}시간`, value: n }))}
            hint="계약서에 정한 1주 근무시간이에요. 주 15시간 이상이면 주휴수당이 붙고, 연장근로는 넣지 않아요."
          />
          <NumberField
            label="1일 근무시간 (일급 계산용)"
            value={daily}
            onChange={(d) => set({ d })}
            unit="시간"
            decimals={1}
            max={24}
            presets={[4, 6, 8].map((n) => ({ label: `${n}시간`, value: n }))}
            hint={`하루 ${MAX_DAILY_HOURS}시간을 넘는 부분은 연장근로예요. 5인 이상 사업장이면 1.5배로 따로 계산해 드려요.`}
          />
          <CheckboxField
            label="수습 기간 감액 적용 (90%)"
            checked={probation}
            onChange={(p) => set({ p })}
            hint="계약 기간이 1년 이상이거나 기간을 정하지 않은 정규직이고, 수습 시작일부터 3개월 이내이며, 단순노무직이 아닐 때만 90%를 줄 수 있어요. 1년 미만 계약직·알바는 안 돼요."
          />
        </>
      }
      result={
        r && yoy ? (
          <Statement
            title={`${year}년 최저임금 환산 명세`}
            caption={`주 ${formatNumber(weekly, 1)}시간 · 1일 ${formatNumber(daily, 1)}시간${probation ? " · 수습 90%" : ""}`}
          >
            <StatementHero
              label={probation ? `${year}년 수습 최저시급 (90%)` : `${year}년 최저시급`}
              value={formatWon(r.hourly)}
              sub={`월 ${formatWon(r.monthly)} (${hoursExact ? "" : "약 "}${hoursLabel(r.monthlyHours)} 기준)`}
              stamp="최저"
            />
            <StatementSection title="기간별 최저 임금 (세전)">
              <StatementRow label="시급" value={formatWon(r.hourly)} />
              {r.dailyOvertimeHours > 0 ? (
                <>
                  <StatementRow
                    label="일급 (5인 미만)"
                    note={`1일 ${formatNumber(daily, 1)}시간, 가산 없음`}
                    value={formatWon(r.daily)}
                  />
                  <StatementRow
                    label="일급 (5인 이상)"
                    note={`${MAX_DAILY_HOURS}시간 초과 ${formatNumber(r.dailyOvertimeHours, 1)}시간은 1.5배`}
                    value={formatWon(r.dailyWithPremium)}
                  />
                </>
              ) : (
                <StatementRow label="일급" note={`1일 ${formatNumber(daily, 1)}시간`} value={formatWon(r.daily)} />
              )}
              <StatementRow
                label="주급 (주휴 포함)"
                note={
                  r.juhyuHours > 0
                    ? `근로 ${formatNumber(weekly, 1)}시간 + 주휴 ${formatNumber(r.juhyuHours, 2)}시간`
                    : `근로 ${formatNumber(weekly, 1)}시간, 주휴 없음`
                }
                value={formatWon(r.weekly)}
              />
              <StatementRow
                label="월급"
                note={
                  r.monthly209
                    ? `(40+8)시간 × 365÷7÷12 = ${formatNumber(monthlyHoursExact(weekly), 2)} → 고시 기준 209시간`
                    : `시급 × (${formatNumber(weekly, 1)}+${formatNumber(r.juhyuHours, 2)})시간 × 365÷7÷12 (${hoursExact ? "=" : "≈"} ${hoursLabel(r.monthlyHours)})`
                }
                value={formatWon(r.monthly)}
                emphasis
              />
              <StatementRow label="연봉 환산" note="월급 × 12" value={formatWon(r.annual)} />
              {probation ? (
                <StatementRow label="첫해 연봉" note="수습 3개월 + 정상 9개월" value={formatWon(r.firstYearAnnual)} />
              ) : null}
            </StatementSection>

            <StatementSection title="주급 구성">
              <StatementRow label="근로 시간분" note={`${formatNumber(weekly, 1)}시간 × ${formatWon(r.hourly)}`} value={formatWon(r.weeklyWork)} />
              <StatementRow
                label="주휴수당"
                note={r.juhyuHours > 0 ? "1주 개근 가정" : `주 ${JUHYU_MIN_WEEKLY_HOURS}시간 미만이라 없음`}
                value={formatWon(r.juhyuPay)}
              />
            </StatementSection>

            <StatementSection title="2026년 → 2027년 인상">
              <StatementRow
                label="시급"
                note={`${formatWon(yoy.from.hourly)} → ${formatWon(yoy.to.hourly)} (${formatNumber(yoy.rate * 100, 1)}%)`}
                value={plusWon(yoy.hourly)}
              />
              <StatementRow label="일급" value={plusWon(yoy.daily)} />
              <StatementRow label="주급" value={plusWon(yoy.weekly)} />
              <StatementRow
                label="월급"
                note={`${formatWon(yoy.from.monthly)} → ${formatWon(yoy.to.monthly)}`}
                value={plusWon(yoy.monthly)}
                emphasis
              />
              <StatementRow label="연봉 환산" note={koreanWon(yoy.to.annual)} value={plusWon(yoy.annual)} />
            </StatementSection>

            {net ? (
              <StatementSection title="월급 세후 예상 (참고)">
                <StatementRow label="4대보험" note="국민연금·건강·장기요양·고용" value={`−${formatWon(net.insurance.total)}`} />
                <StatementRow label="소득세·지방소득세" note="간이세액표, 본인 1인" value={`−${formatWon(net.tax.total)}`} />
                <StatementRow label="세후 실수령" value={formatWon(net.net)} emphasis />
              </StatementSection>
            ) : null}

            <StatementFootnote>
              {year === 2027
                ? "2027년 최저임금은 2026년 8월 5일 고용노동부가 확정 고시한 금액이에요. "
                : "2026년 1월 1일부터 12월 31일까지 적용되는 금액이에요. "}
              {r.monthly209
                ? "주 40시간은 최저임금 고시와 같이 월 209시간(208.57시간)으로 계산했어요. "
                : "209시간은 주 40시간일 때 쓰는 고시 기준이라, 이 근무시간은 1시간 단위로 맞추지 않고 공식 그대로의 정확한 월 환산 시간으로 월급을 계산했어요. 시간은 소수 둘째 자리까지만 보여 드려요. "}
              원 미만은 반올림했어요.
              {net ? " 세후 금액은 2026년 요율에 비과세 수당이 없다고 보고 낸 추정치예요." : ""}
              {year === 2027 && weekly >= JUHYU_MIN_WEEKLY_HOURS ? " 2027년 4대보험 요율은 아직 확정 전이라 세후 금액은 빼고 보여 드려요." : ""}
            </StatementFootnote>
          </Statement>
        ) : (
          <CalcNotice>
            {!weeklyOk
              ? `주 소정근로시간을 0보다 크고 ${MAX_WEEKLY_HOURS}시간 이하로 넣어 주세요.`
              : "1일 근무시간을 0보다 크고 24시간 이하로 넣어 주세요."}
          </CalcNotice>
        )
      }
    />
  );
}
