"use client";

import { CalcLayout, CalcNotice } from "@/components/CalcLayout";
import { CheckboxField, DateField, NumberField, SegmentedField, SelectField, StepperField } from "@/components/fields";
import { Statement, StatementFootnote, StatementHero, StatementRow, StatementSection } from "@/components/Statement";
import { formatNumber, formatWon, koreanWon } from "@/lib/format";
import { parseYMD, type YMD } from "@/lib/date";
import {
  ANNUAL_BASE_LAW_NO,
  ANNUAL_BASE_RULE_YEAR,
  calcUnemployment,
  claimWindow,
  dailyFloor,
  dailyScheduledHours,
  eligibility,
  FIRST_YEAR,
  floorHours,
  FOUR_WEEK_DIVISOR,
  INSURED_PERIOD_OPTIONS,
  insuredPeriodLabel,
  isInsuredPeriod,
  LAST_YEAR,
  MAX_FLOOR_HOURS,
  MAX_MONTHLY_WAGE,
  proposalCap,
  proposalDaily,
  REQUIRED_INSURED_DAYS,
  sixDayMonthly,
  WAITING_DAYS,
  WEEK_BASIS_HOURS,
  yearRule,
  type DailyHours,
  type HoursBasis,
  type InsuredPeriod,
  type UnemploymentResult,
} from "@/lib/calc/unemployment";
import { useToday } from "@/lib/useToday";
import { useUrlState } from "@/lib/useUrlState";

type AgeKey = "u" | "o";
type ReasonKey = "i" | "v";
/** 소정근로시간을 정한 단위: d 하루, w 1주, f 이직 전 4주 합계 */
type BasisKey = "d" | "w" | "f";

const BASIS: Record<BasisKey, HoursBasis> = { d: "day", w: "week", f: "fourWeek" };

function h2(n: number): string {
  return formatNumber(n, 2);
}

/** (24 + 주휴 4.8) ÷ 48 × 8 = 4.8 — 시행규칙 제91조의2① 계산식 */
function hoursFormula(d: DailyHours): string {
  const sum = d.paidHoliday > 0 ? `(${h2(d.scheduled)} + 주휴 ${h2(d.paidHoliday)})` : h2(d.scheduled);
  const tail = d.basis === "week" ? ` ÷ ${WEEK_BASIS_HOURS} × 8` : ` ÷ ${FOUR_WEEK_DIVISOR}`;
  return `${sum}${tail} = ${h2(d.average)}`;
}

/** 올림·8시간 상한을 어떻게 적용했는지 */
function hoursRounding(d: DailyHours): string {
  if (d.average > MAX_FLOOR_HOURS) return `${MAX_FLOOR_HOURS}시간 상한`;
  if (d.hours !== d.average) return "소수점 올림";
  return "그대로";
}

function hoursReading(basis: HoursBasis, n: number): string {
  const d = dailyScheduledHours(basis, n);
  if (!d) return "";
  const avgWeek = basis === "fourWeek" ? `4주 평균 주 ${h2(n / 4)}시간 · ` : "";
  return `${avgWeek}${hoursFormula(d)} → 하루 ${d.hours}시간으로 계산`;
}

const MIN_DATE = `${FIRST_YEAR}-01-01`;
const MAX_DATE = `${LAST_YEAR}-12-31`;

/** 2026.11.01 */
function dot(v: YMD): string {
  return `${v.y}.${String(v.m).padStart(2, "0")}.${String(v.d).padStart(2, "0")}`;
}

function appliedLabel(r: UnemploymentResult): string {
  if (r.floorApplied) return "하한 적용";
  if (r.capApplied) return "상한 적용";
  return "적용 안 함";
}

function proposalNote(daily: number, cap: number, floor: number): string {
  if (daily === cap) return "정부안 상한";
  if (daily === floor) return "하한액";
  return "기초일액의 60%";
}

export function UnemploymentCalculator() {
  // URL keys: d = 이직일, w = 월 평균 급여, u = 근로시간 단위(d 하루 / w 주 / f 4주 합계), h = 1일 소정근로시간,
  // wh = 1주 소정근로시간, fh = 이직 전 4주 소정근로시간 합계, p = 가입기간, a = 나이(u 50세 미만 / o 이상),
  // x = 장애인, r = 이직 사유(i 비자발 / v 자발), j = 정당한 사유, e = 180일 충족
  const [s, set] = useUrlState({
    d: "2026-10-31",
    w: 3_000_000,
    u: "d" as BasisKey,
    h: 8,
    wh: 20,
    fh: 80,
    p: "1" as InsuredPeriod,
    a: "u" as AgeKey,
    x: false,
    r: "i" as ReasonKey,
    j: false,
    e: true,
  });
  const period: InsuredPeriod = isInsuredPeriod(s.p) ? s.p : "1";
  const age: AgeKey = s.a === "o" ? "o" : "u";
  const reason: ReasonKey = s.r === "v" ? "v" : "i";
  const basisKey: BasisKey = s.u === "w" || s.u === "f" ? s.u : "d";
  const basis = BASIS[basisKey];
  // The stepper shows whole hours 1–8; a decimal in the URL is rounded up like the 산정규정.
  const dayHours = Number.isFinite(floorHours(s.h)) ? floorHours(s.h) : 1;
  const hoursDetail = dailyScheduledHours(basis, basisKey === "d" ? dayHours : basisKey === "w" ? s.wh : s.fh);
  const hours = hoursDetail?.hours ?? null;
  const over50OrDisabled = age === "o" || s.x;

  const separation = parseYMD(s.d);
  const rule = separation ? yearRule(separation.y) : null;
  const r =
    separation && hoursDetail
      ? calcUnemployment({ separation, monthlyWage: s.w, hours: hoursDetail.average, period, over50OrDisabled })
      : null;
  const elig = eligibility({ metInsuredDays: s.e, voluntary: reason === "v", justified: s.j });
  const floorNow = rule && hours !== null ? dailyFloor(rule.minWage, hours) : null;
  const capProposal = r?.projected ? proposalCap(r.rule.year) : null;
  const dailyProposal = r?.projected ? proposalDaily(r.baseDaily, r.rule.year, r.hours) : null;
  const floorHint =
    rule && floorNow !== null && hours !== null
      ? ` ${rule.year}년 이직, 하루 ${hours}시간이면 하한액이 ${formatWon(floorNow)}이에요.`
      : "";
  // Hydration-safe: first render uses the build date, then the visitor's real today (KST).
  const { today } = useToday();
  const win = r ? claimWindow(r, today) : null;

  return (
    <CalcLayout
      inputs={
        <>
          <DateField
            label="이직일 (마지막 근무일)"
            value={s.d}
            onChange={(d) => set({ d })}
            min={MIN_DATE}
            max={MAX_DATE}
            hint="상한액과 하한액은 이직일이 속한 해를 기준으로 정해져요."
          />
          <NumberField
            label="퇴직 전 3개월 월 평균 급여 (세전)"
            value={s.w}
            onChange={(w) => set({ w })}
            unit="원"
            max={MAX_MONTHLY_WAGE}
            reading={(n) => koreanWon(n)}
            presets={[
              { label: "250만원", value: 2_500_000 },
              { label: "300만원", value: 3_000_000 },
              { label: "350만원", value: 3_500_000 },
              { label: "400만원", value: 4_000_000 },
              { label: "500만원", value: 5_000_000 },
            ]}
            hint="기본급과 매달 받는 수당을 더한 세전 금액이에요. 1년 상여금이 있다면 12로 나눈 금액을 더해 넣어요."
          />
          <SegmentedField<BasisKey>
            label="근로계약서의 근로시간"
            value={basisKey}
            onChange={(u) => set({ u })}
            options={[
              {
                value: "d",
                label: (
                  <span className="block leading-tight">
                    하루 단위
                    <span className="mt-0.5 block text-xs">주 5·6일 같은 시간</span>
                  </span>
                ),
              },
              {
                value: "w",
                label: (
                  <span className="block leading-tight">
                    주 단위
                    <span className="mt-0.5 block text-xs">주 4일 이하 등</span>
                  </span>
                ),
              },
              {
                value: "f",
                label: (
                  <span className="block leading-tight">
                    4주 합계
                    <span className="mt-0.5 block text-xs">주마다 달라요</span>
                  </span>
                ),
              },
            ]}
            hint="하한액은 이직 전 1일 소정근로시간에 비례해요. 주 5일 미만이거나 요일마다 시간이 다르면 주 근무시간으로 하루 시간을 다시 계산해요."
          />
          {basisKey === "d" ? (
            <StepperField
              label="1일 소정근로시간"
              value={dayHours}
              onChange={(h) => set({ h })}
              min={1}
              max={MAX_FLOOR_HOURS}
              unit="시간"
              hint={`근로계약서상 하루 근무시간이에요. 4시간 30분처럼 끝수가 있으면 올려서 넣어요.${floorHint}`}
            />
          ) : basisKey === "w" ? (
            <NumberField
              label="1주 소정근로시간 (주휴 제외)"
              value={s.wh}
              onChange={(wh) => set({ wh })}
              unit="시간"
              decimals={1}
              max={40}
              reading={(n) => hoursReading("week", n)}
              presets={[12, 15, 20, 24, 30].map((n) => ({ label: `${n}시간`, value: n }))}
              hint={`예) 주 3일 × 8시간 = 24시간. 주 15시간 이상이면 주휴시간을 더해 ÷ 48 × 8로 하루 시간을 구하고, 소수점은 올려요.${floorHint}`}
            />
          ) : (
            <NumberField
              label="이직 전 4주 소정근로시간 합계 (주휴 제외)"
              value={s.fh}
              onChange={(fh) => set({ fh })}
              unit="시간"
              decimals={1}
              max={160}
              reading={(n) => hoursReading("fourWeek", n)}
              presets={[40, 60, 80, 100, 120].map((n) => ({ label: `${n}시간`, value: n }))}
              hint={`주마다 근무시간이 다르면 이직 전 4주 합계에 주휴시간을 더해 28로 나눠요. 소수점은 올려요.${floorHint}`}
            />
          )}
          <SelectField<InsuredPeriod>
            label="고용보험 가입기간"
            value={period}
            onChange={(p) => set({ p })}
            options={INSURED_PERIOD_OPTIONS}
            hint="회사를 옮겼어도 공백이 3년 이내이고 그 사이 실업급여를 받지 않았다면 기간을 합쳐요."
          />
          <SegmentedField<AgeKey>
            label="이직일 기준 나이"
            value={age}
            onChange={(a) => set({ a })}
            options={[
              { value: "u", label: "만 50세 미만" },
              { value: "o", label: "만 50세 이상" },
            ]}
            hint="만 50세 이상이면 가입 1년 이상부터 받는 일수가 30일씩 늘어요."
          />
          <CheckboxField
            label="장애인이에요"
            checked={s.x}
            onChange={(x) => set({ x })}
            hint="장애인고용촉진법상 장애인은 나이와 관계없이 50세 이상과 같은 일수를 받아요."
          />
          <SegmentedField<ReasonKey>
            label="이직 사유"
            value={reason}
            onChange={(v) => set({ r: v })}
            options={[
              {
                value: "i",
                label: (
                  <span className="block leading-tight">
                    비자발적
                    <span className="mt-0.5 block text-xs">권고사직·해고·계약만료</span>
                  </span>
                ),
              },
              {
                value: "v",
                label: (
                  <span className="block leading-tight">
                    자발적
                    <span className="mt-0.5 block text-xs">자진 퇴사</span>
                  </span>
                ),
              },
            ]}
          />
          {reason === "v" ? (
            <CheckboxField
              label="정당한 이직 사유가 있어요"
              checked={s.j}
              onChange={(j) => set({ j })}
              hint={
                <>
                  임금체불, 통근 왕복 3시간 이상, 직장 내 괴롭힘, 질병으로 업무가 어려운데 휴직이 안 되는 경우처럼 법에서 정한
                  사유예요. <a href="#just-reasons" className="underline">전체 목록 보기</a>
                </>
              }
            />
          ) : null}
          <CheckboxField
            label={`이직 전 18개월 동안 고용보험 가입 ${REQUIRED_INSURED_DAYS}일 이상`}
            checked={s.e}
            onChange={(e) => set({ e })}
            hint="주휴일 같은 유급휴일도 세요. 주 5일 근무라면 대략 7개월 넘게 일했으면 채워져요."
          />
        </>
      }
      result={
        !separation ? (
          <CalcNotice>이직일(마지막 근무일)을 넣으면 실업급여를 바로 계산해 드려요.</CalcNotice>
        ) : !rule ? (
          <CalcNotice>
            {FIRST_YEAR}년 1월 1일부터 {LAST_YEAR}년 12월 31일 사이의 이직일만 계산할 수 있어요. {FIRST_YEAR - 1}년 이전에
            이직했다면 수급기간(이직 다음 날부터 12개월)이 이미 끝났고, {ANNUAL_BASE_RULE_YEAR}년 이직부터는 기초일액을 이직 전
            1년간 보수로 계산하도록 법이 바뀌어요(법률 {ANNUAL_BASE_LAW_NO}).
          </CalcNotice>
        ) : !hoursDetail ? (
          <CalcNotice>
            {basisKey === "w" ? "1주 소정근로시간을" : "이직 전 4주 소정근로시간 합계를"} 넣으면 하한액 기준이 되는 하루 시간을
            계산해 드려요.
          </CalcNotice>
        ) : !r ? (
          <CalcNotice>퇴직 전 3개월의 월 평균 급여를 넣으면 하루 받는 금액과 총액을 계산해 드려요.</CalcNotice>
        ) : !elig.eligible ? (
          <CalcNotice>
            <strong className="text-ink">지금 조건으로는 실업급여를 받기 어려워요.</strong>{" "}
            {elig.reasons.includes("insured-days")
              ? `이직일 이전 18개월 동안 고용보험에 가입해 일한 날(피보험단위기간)이 ${REQUIRED_INSURED_DAYS}일 이상이어야 해요. 다시 취업해 기간을 채우면 그때 이직한 기준으로 받을 수 있어요. `
              : ""}
            {elig.reasons.includes("voluntary")
              ? "개인 사정으로 스스로 그만두면 원칙적으로 받을 수 없어요. 다만 임금체불, 통근 곤란, 직장 내 괴롭힘처럼 법에서 정한 정당한 사유가 있으면 받을 수 있으니 아래 목록을 확인해 보세요. "
              : ""}
            참고로 조건을 채운다면 하루 {formatWon(r.daily)} × {r.days}일, 총 {koreanWon(r.total)} 정도예요.
          </CalcNotice>
        ) : (
          <>
            {win?.ended ? (
              <div className="mb-3">
                <CalcNotice>
                  <strong className="text-ink">이 이직일의 수급기간은 {dot(r.receiveEnd)}에 끝났어요.</strong> 수급기간(이직
                  다음 날부터 12개월)이 지나면 남은 일수는 받을 수 없어서, 지금 신청해도 구직급여가 나오지 않아요. 아래 금액은
                  기간 안에 받았을 때 기준이에요. 질병이나 출산·육아로 수급기간 연기를 신청해 두었다면 고용센터에 확인하세요.
                </CalcNotice>
              </div>
            ) : win && win.lostDays > 0 ? (
              <div className="mb-3">
                <CalcNotice>
                  {win.payableDays > 0 ? (
                    <>
                      <strong className="text-ink">
                        아직 신청하지 않았다면 지금 바로 해도 {win.payableDays}일분만 받을 수 있어요.
                      </strong>{" "}
                      수급기간이{" "}
                      {dot(r.receiveEnd)}에 끝나서, 오늘 신청하면 대기기간 {WAITING_DAYS}일을 빼고 약{" "}
                      {koreanWon(r.daily * win.payableDays)}이 나오고 남은 {win.lostDays}일분은 받지 못해요. 하루라도 빨리
                      고용24에서 구직 신청을 하세요.
                    </>
                  ) : (
                    <>
                      <strong className="text-ink">아직 신청하지 않았다면 지금 신청해도 받을 수 있는 날이 없어요.</strong>{" "}
                      수급기간이{" "}
                      {dot(r.receiveEnd)}에 끝나서 대기기간 {WAITING_DAYS}일이 지나기 전에 기간이 끝나요.
                    </>
                  )}
                </CalcNotice>
              </div>
            ) : null}
            {r.projected ? (
              <div className="mb-3">
                <CalcNotice>
                  <strong className="text-ink">{r.rule.year}년 상한액은 아직 정해지지 않았어요.</strong> 현행 법령대로 계산한
                  예상치예요. {r.rule.year}년 최저임금(시간당 {formatWon(r.rule.minWage)})으로 8시간 하한이{" "}
                  {formatWon(dailyFloor(r.rule.minWage, 8))}이 되어 현행 상한 {formatWon(r.rule.dailyCap)}보다 높아요. 이때는
                  하한이 우선해요. 연말 시행령 개정에 따라 달라질 수 있어요.
                </CalcNotice>
              </div>
            ) : null}
            <Statement
              title="실업급여 예상 명세"
              caption={`${r.rule.year}년 이직 기준${r.projected ? " · 예상" : ""}`}
            >
              <StatementHero
                label={
                  win?.ended
                    ? "총 수급액 (수급기간 안에 받았을 때)"
                    : r.projected
                      ? `총 예상 수급액 (${r.rule.year}년 이직, 예상)`
                      : "총 예상 수급액"
                }
                value={formatWon(r.total)}
                sub={`하루 ${formatWon(r.daily)} × ${r.days}일 · ${koreanWon(r.total)}`}
                stamp="수급"
              />
              <StatementSection title="받는 금액">
                <StatementRow
                  label="1일 구직급여"
                  note={r.floorApplied ? "하한액" : r.capApplied ? "상한액" : "기초일액의 60%"}
                  value={formatWon(r.daily)}
                  emphasis
                />
                <StatementRow
                  label="소정급여일수"
                  note={`${age === "o" ? "50세 이상" : s.x ? "장애인" : "50세 미만"} · 가입 ${insuredPeriodLabel(period)}`}
                  value={`${r.days}일`}
                />
                <StatementRow label="월 환산" note="30일 기준" value={formatWon(r.monthly)} />
              </StatementSection>
              <StatementSection title="산정 내역">
                <StatementRow label="3개월 임금총액" note={`월 ${formatWon(s.w)} × 3`} value={formatWon(r.totalWage)} />
                <StatementRow label="산정 일수" note={`${dot(r.wageStart)}~${dot(r.wageEnd)}`} value={`${r.wageDays}일`} />
                <StatementRow label="기초일액" note="임금총액 ÷ 일수" value={formatWon(r.baseDaily)} />
                <StatementRow
                  label="기초일액 × 60%"
                  note={r.capApplied ? `기초일액 상한 ${formatWon(r.rule.baseCap)}` : undefined}
                  value={formatWon(r.computedDaily)}
                />
                {hoursDetail.basis !== "day" ? (
                  <StatementRow
                    label="하한 기준 1일 시간"
                    note={`${hoursFormula(hoursDetail)}, ${hoursRounding(hoursDetail)}`}
                    value={`${r.hours}시간`}
                  />
                ) : null}
                <StatementRow
                  label="상·하한 적용"
                  note={`상한 ${formatWon(r.rule.dailyCap)}${r.projected ? "(현행)" : ""} · 하한 ${formatWon(r.floor)}(${r.hours}시간)`}
                  value={appliedLabel(r)}
                />
              </StatementSection>
              <StatementSection title="받는 일정">
                <StatementRow label="대기기간" note="실업 신고일부터, 지급 안 함" value={`${WAITING_DAYS}일`} />
                <StatementRow label="수급 기간" note="이직 다음 날부터 12개월" value={`${dot(r.receiveStart)}~${dot(r.receiveEnd)}`} />
                <StatementRow label="받는 기간" note="1~4주마다 실업인정 후 지급" value={`약 ${Math.round(r.days / 30)}개월`} />
                {win && !win.ended && win.lostDays > 0 ? (
                  <StatementRow
                    label="오늘 신청하면"
                    note={`대기 ${WAITING_DAYS}일 빼고 ${dot(r.receiveEnd)}까지`}
                    value={`${win.payableDays}일`}
                  />
                ) : null}
              </StatementSection>
              {r.projected && capProposal !== null && dailyProposal !== null ? (
                <StatementSection title={`${r.rule.year}년 개편 정부안이 통과되면 (미확정)`}>
                  <StatementRow label="상한액" note="8시간 하한 × 103%, 셈도장 추산" value={formatWon(capProposal)} />
                  <StatementRow
                    label="1일 구직급여"
                    note={proposalNote(dailyProposal, capProposal, r.floor)}
                    value={formatWon(dailyProposal)}
                  />
                  <StatementRow
                    label="월 지급액"
                    note="주 6일분 지급, 30일 기준"
                    value={formatWon(sixDayMonthly(dailyProposal))}
                  />
                </StatementSection>
              ) : null}
              <StatementFootnote>
                월급으로 어림한 값이에요. 실제 금액은 회사가 고용센터에 내는 이직확인서의 평균임금(상여금·연차수당 포함)과
                통상임금 중 큰 금액으로 정해져요. 원 미만은 버렸어요.
              </StatementFootnote>
              <StatementFootnote>
                하한 기준 하루 시간은 고용보험법 시행규칙 제91조의2와 급여기초임금일액 산정규정 제3조대로 계산했어요(소수점
                올림, 최대 8시간). 유급휴일은 주휴일만 더했어요.
              </StatementFootnote>
              <StatementFootnote>
                수급 기간이 지나면 남은 일수는 받을 수 없어요. 퇴사 후 바로 고용24에서 구직 신청부터 하세요.
              </StatementFootnote>
            </Statement>
          </>
        )
      }
    />
  );
}
