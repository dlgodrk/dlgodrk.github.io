"use client";

import { CalcLayout, CalcNotice } from "@/components/CalcLayout";
import { CheckboxField, DateField, SegmentedField, StepperField } from "@/components/fields";
import {
  Statement,
  StatementFootnote,
  StatementHero,
  StatementRow,
  StatementSection,
} from "@/components/Statement";
import {
  calculateLeave,
  DATE_MAX,
  DATE_MAX_YEAR,
  DATE_MIN,
  DATE_MIN_YEAR,
  isDateInRange,
  MONTHLY_LEAVE_MAX,
  type LeaveEvent,
  type LeaveResult,
} from "@/lib/calc/annual-leave";
import { addDays, compareYMD, diffDays, formatKoreanDate, formatYMD, parseYMD, type YMD } from "@/lib/date";
import { formatNumber } from "@/lib/format";
import { useToday } from "@/lib/useToday";
import { useUrlState } from "@/lib/useUrlState";

type Basis = "h" | "f";
type Size = "5" | "4";

/** 12.452 -> "12.45일", 15 -> "15일" */
function days(n: number): string {
  return `${formatNumber(n, 2)}일`;
}

/** "2027. 3. 4." */
function shortDate(v: YMD): string {
  return `${v.y}. ${v.m}. ${v.d}.`;
}

/** "2년 7개월 6일", 딱 떨어지면 "1년" · "3개월" */
function tenureLabel(r: LeaveResult): string {
  const { years, months, days: d } = r.tenure;
  const parts: string[] = [];
  if (years) parts.push(`${years}년`);
  if (months || (years && d)) parts.push(`${months}개월`);
  if (d || parts.length === 0) parts.push(`${d}일`);
  return parts.join(" ");
}

const DEEMED_ATTENDANCE =
  "육아휴직, 산재 휴업, 출산전후휴가 기간과 육아기·임신기 근로시간 단축으로 줄어든 시간은 출근한 것으로 봐요.";

function eventLabel(e: LeaveEvent): string {
  if (e.kind === "monthly") return "1년 미만 월차";
  if (e.kind === "prorata") return "회계연도 비례 연차";
  return `근속 ${e.serviceYears}년 연차`;
}

export function AnnualLeaveCalculator() {
  // URL keys: h = 입사일, a = 기준일("" = 오늘), b = 산정 방식, p = 출근율 80% 이상, g = 개근한 달, w = 사업장 규모
  const [s, set] = useUrlState({
    h: "2024-03-04",
    a: "",
    b: "h" as Basis,
    p: true as boolean,
    g: 0,
    w: "5" as Size,
  });
  const { today } = useToday();
  const basis = s.b === "f" ? "fiscal" : "hire";
  const small = s.w === "4";
  const hire = parseYMD(s.h);
  const asOf = s.a ? parseYMD(s.a) : today;
  // A half-typed year ("0202-03-04" while typing 2024) is a valid YMD but not a real 입사일.
  const outOfRange = hire && asOf ? (!isDateInRange(hire) ? "입사일" : !isDateInRange(asOf) ? "기준일" : null) : null;
  const r =
    hire && asOf && !outOfRange
      ? calculateLeave({ hire, asOf, basis, attended80: s.p, perfectMonths: s.g })
      : null;
  // 출근율 입력은 결과를 바꾸는 기간에만 보여 준다 (입사 1년 미만은 개근 가정).
  const attendance = r ? r.attendanceInputs : "rate";
  const rateHint =
    attendance === "rate"
      ? basis === "hire"
        ? `입사 후 첫 1년의 출근율이에요. 80%에 못 미치면 15일이 생기지 않고 1년 미만 월차만 남아요. ${DEEMED_ATTENDANCE}`
        : `입사한 해의 출근율이에요. 80%에 못 미치면 비례 연차가 생기지 않아요. ${DEEMED_ATTENDANCE}`
      : DEEMED_ATTENDANCE;

  return (
    <CalcLayout
      inputs={
        <>
          <DateField
            label="입사일"
            value={s.h}
            onChange={(h) => set({ h })}
            min={DATE_MIN}
            max={DATE_MAX}
            hint="근로계약서에 적힌 첫 근무일을 넣어 주세요."
          />
          <DateField
            label="기준일"
            value={s.a || formatYMD(today)}
            onChange={(a) => set({ a })}
            min={DATE_MIN}
            max={DATE_MAX}
            aside={
              s.a ? (
                <button type="button" className="text-link hover:underline" onClick={() => set({ a: "" })}>
                  오늘로
                </button>
              ) : (
                "오늘"
              )
            }
            hint="이 날짜까지 재직한다고 보고 계산해요. 퇴사 예정이면 마지막 근무일을 넣어 보세요."
          />
          <SegmentedField<Basis>
            label="산정 방식"
            value={s.b === "f" ? "f" : "h"}
            onChange={(b) => set({ b })}
            options={[
              { value: "h", label: "입사일 기준" },
              { value: "f", label: "회계연도 기준(1월 1일)" },
            ]}
            hint={
              s.b === "f"
                ? "회사가 매년 1월 1일에 연차를 한꺼번에 주는 방식이에요. 입사한 해의 몫은 근무 일수에 비례해 줘요."
                : "법이 정한 원칙이에요. 입사일이 돌아올 때마다 새 연차가 생겨요."
            }
          />
          {attendance === "none" ? (
            <p className="field-hint">
              입사 1년 미만 기간은 출근율과 관계없이 매달 개근했다고 보고 계산해요.
            </p>
          ) : (
            <CheckboxField
              label={basis === "hire" ? "직전 1년 출근율 80% 이상" : "전년도(1~12월) 출근율 80% 이상"}
              checked={s.p}
              onChange={(p) => set({ p })}
              hint={rateHint}
            />
          )}
          {!s.p && attendance === "months" ? (
            <StepperField
              label={basis === "hire" ? "그 1년 중 개근한 달" : "전년도에 개근한 달"}
              value={Math.max(0, Math.min(MONTHLY_LEAVE_MAX, s.g))}
              onChange={(g) => set({ g })}
              min={0}
              max={MONTHLY_LEAVE_MAX}
              unit="개월"
              hint="출근율이 80%에 못 미치면 15일 대신 개근한 달마다 1일이 생겨요."
            />
          ) : null}
          <SegmentedField<Size>
            label="사업장 규모"
            value={small ? "4" : "5"}
            onChange={(w) => set({ w })}
            options={[
              { value: "5", label: "5인 이상" },
              { value: "4", label: "5인 미만" },
            ]}
            hint={small ? "상시 근로자 4명 이하 사업장은 근로기준법의 연차 규정이 적용되지 않아요." : undefined}
          />
        </>
      }
      result={
        !hire || !asOf ? (
          <CalcNotice>입사일과 기준일을 모두 넣으면 연차를 바로 계산해 드려요.</CalcNotice>
        ) : outOfRange ? (
          <CalcNotice>
            {outOfRange}은 {DATE_MIN_YEAR}년부터 {DATE_MAX_YEAR}년 사이 날짜로 넣어 주세요.
          </CalcNotice>
        ) : !r ? (
          <CalcNotice>기준일이 입사일보다 빠르면 계산할 수 없어요. 날짜를 다시 확인해 주세요.</CalcNotice>
        ) : small ? (
          <SmallWorkplaceStatement r={r} />
        ) : (
          <LeaveStatement r={r} hire={hire} asOf={asOf} basis={basis} isToday={!s.a} />
        )
      }
    />
  );
}

function SmallWorkplaceStatement({ r }: { r: LeaveResult }) {
  return (
    <Statement title="연차 발생 명세" caption="5인 미만 사업장">
      <StatementHero label="법정 연차" value="0일" sub="5인 미만 사업장은 연차 규정이 적용되지 않아요" />
      <StatementSection title="참고: 5인 이상 사업장이었다면">
        <StatementRow label="근속기간" value={tenureLabel(r)} note={`재직 ${formatNumber(r.tenure.dayCount)}일째`} />
        <StatementRow label="1년 미만 월차" value={days(r.monthlyAccrued)} />
        <StatementRow label="지금 발생해 있는 연차" value={days(r.current.days)} />
      </StatementSection>
      <StatementFootnote>
        근로기준법 시행령 제7조 [별표 1]에 따라 상시 근로자 4명 이하 사업장에는 연차 유급휴가(제60조)가 적용되지 않아요.
        취업규칙이나 근로계약서에 휴가가 정해져 있다면 그 약속을 따릅니다.
      </StatementFootnote>
    </Statement>
  );
}

function LeaveStatement({
  r,
  hire,
  asOf,
  basis,
  isToday,
}: {
  r: LeaveResult;
  hire: YMD;
  asOf: YMD;
  basis: "hire" | "fiscal";
  isToday: boolean;
}) {
  const c = r.current;
  const firstYear = compareYMD(asOf, r.firstAnniversary) < 0;
  const lastMonthlyDay = addDays(r.firstAnniversary, -1);
  // 최초 1년(회계연도 기준은 입사한 해) 출근율 80% 미만이면 15일·비례 연차가 생기지 않는다.
  const lowFirst = r.lowApplied && r.attendanceInputs === "rate";
  const lowNote = lowFirst
    ? basis === "hire"
      ? "최초 1년 출근율 80% 미만 · 15일 없음"
      : "입사한 해 출근율 80% 미만 · 비례 연차 없음"
    : "출근율 80% 미만 · 개근한 달마다 1일";

  let heroLabel: string;
  let heroSub: string;
  if (c.kind === "monthly") {
    heroLabel = "지금까지 생긴 연차 (입사 1년 미만)";
    heroSub =
      basis === "hire"
        ? `${formatKoreanDate(r.firstAnniversary, false)}에 15일이 새로 생겨요`
        : `${hire.y + 1}년 1월 1일에 비례 연차 ${days(r.prorata.days)}이 생겨요`;
  } else if (c.kind === "prorata") {
    heroLabel = `${asOf.y}년 연차 (회계연도 기준)`;
    heroSub =
      c.monthlyIncluded > 0
        ? `${r.lowApplied ? "비례 연차 없음" : `비례 연차 ${days(c.prorata ?? 0)}`} + 1년 미만 월차 ${c.monthlyIncluded}일`
        : r.lowApplied
          ? lowNote
          : `비례 연차 · ${shortDate(c.from)} ~ ${shortDate(c.to)} 사용`;
  } else {
    heroLabel =
      basis === "hire" ? `올해 연차 (근속 ${c.serviceYears}년)` : `${asOf.y}년 연차 (회계연도 기준)`;
    heroSub = c.kind === "annual-low" ? lowNote : `${shortDate(c.from)} ~ ${shortDate(c.to)} 사용`;
  }

  const next = r.next;
  const dday = next ? diffDays(asOf, next.date) : 0;
  const settlement = r.cumulative.hire - r.cumulative.fiscal;

  return (
    <Statement
      title="연차 발생 명세"
      caption={basis === "hire" ? "입사일 기준 · 근로기준법 제60조" : "회계연도 기준 · 근로기준법 제60조"}
    >
      <StatementHero label={heroLabel} value={days(c.days)} sub={heroSub} stamp="연차" />

      <StatementSection title="근속">
        <StatementRow label="입사일" value={formatKoreanDate(hire)} />
        <StatementRow label="기준일" value={formatKoreanDate(asOf)} note={isToday ? "오늘" : undefined} />
        <StatementRow
          label="근속기간"
          value={tenureLabel(r)}
          note={`재직 ${formatNumber(r.tenure.dayCount)}일째`}
        />
      </StatementSection>

      <StatementSection title="연차 발생">
        <StatementRow
          label="1년 미만 월차 발생 수"
          note={firstYear ? `${shortDate(lastMonthlyDay)}까지 사용` : "입사 1년이 되는 날 사용 기간 끝"}
          value={`${r.monthlyAccrued}일 / 최대 ${MONTHLY_LEAVE_MAX}일`}
        />
        {basis === "hire" ? (
          firstYear ? (
            <StatementRow label="첫 15일 발생" note="1년 근로 다음 날 재직 시" value={shortDate(r.firstAnniversary)} />
          ) : (
            <StatementRow
              label="올해 연차"
              note={`${shortDate(c.from)} ~ ${shortDate(c.to)}`}
              value={days(c.days)}
              emphasis
            />
          )
        ) : c.kind === "monthly" ? (
          <StatementRow
            label={`${hire.y + 1}년 1월 1일 비례 연차`}
            note={`15일 × ${r.prorata.workedDays}일 ÷ 365`}
            value={days(r.prorata.days)}
          />
        ) : c.kind === "prorata" ? (
          <StatementRow
            label="비례 연차 (1월 1일 발생)"
            note={r.lowApplied ? lowNote : `15일 × ${r.prorata.workedDays}일 ÷ 365`}
            value={days(c.prorata ?? 0)}
            emphasis
          />
        ) : (
          <StatementRow
            label={`${asOf.y}년 연차`}
            note={c.kind === "annual-low" ? lowNote : `입사 연도를 1년으로 친 근속 ${c.serviceYears}년`}
            value={days(c.days)}
            emphasis
          />
        )}
        {next ? (
          <>
            <StatementRow label="다음 연차 발생일" note={`D-${dday}`} value={formatKoreanDate(next.date)} />
            <StatementRow
              label="그날 생기는 연차"
              note={next.events.map(eventLabel).join(" + ")}
              value={days(next.days)}
            />
          </>
        ) : null}
      </StatementSection>

      <StatementSection title="앞으로 생길 연차 (매년 80% 출근 가정)">
        {r.upcoming.map((e) => (
          <StatementRow
            key={formatYMD(e.date)}
            label={shortDate(e.date)}
            note={e.kind === "prorata" ? "비례 연차" : `근속 ${e.serviceYears}년`}
            value={days(e.days)}
          />
        ))}
      </StatementSection>

      {basis === "hire" ? (
        <StatementSection title="입사 후 누계">
          <StatementRow label="지금까지 생긴 연차 합계" note="사용분 차감 전" value={days(r.cumulative.hire)} />
        </StatementSection>
      ) : (
        <StatementSection title="지금 퇴사한다면 (입사일 기준과 비교)">
          <StatementRow label="회계연도 기준 누계" value={days(r.cumulative.fiscal)} />
          <StatementRow label="입사일 기준 누계" value={days(r.cumulative.hire)} />
          <StatementRow
            label="퇴직 때 더 정산할 연차"
            note={settlement > 0.0001 ? "입사일 기준이 더 많아요" : "회계연도 기준이 같거나 많아요"}
            value={settlement > 0.0001 ? days(settlement) : "없음"}
            emphasis
          />
        </StatementSection>
      )}

      <StatementFootnote>
        {r.lowApplied
          ? "1년 미만 월차는 매달 개근했다고 보고 셌어요. 가장 최근 연차만 입력한 대로 출근율 80% 미만으로, 그 전 해는 80% 이상으로 계산했어요."
          : "1년 미만 때는 매달 개근, 그 뒤로는 매년 출근율 80% 이상이라고 보고 계산했어요."}{" "}
        기준일에 재직 중이라고 봤어요. 1년 계약이 끝나 366일째에 근로관계가 없으면 15일은 생기지 않아요. 쓰지 못한 연차는 1일
        통상임금 × 남은 일수로 수당을 받을 수 있어요.
        {basis === "fiscal"
          ? " 가산휴가는 입사 연도를 1년으로 쳐서 셌는데, 회사에 따라 1년 늦게 붙기도 해요. 비례 연차의 소수점은 회사 규정에 따라 올림하거나 시간 단위로 줘요."
          : ""}
      </StatementFootnote>
    </Statement>
  );
}
