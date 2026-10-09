"use client";

import type { ReactNode } from "react";
import { CalcLayout, CalcNotice } from "@/components/CalcLayout";
import { CheckboxField, DateField, NumberField, SegmentedField } from "@/components/fields";
import {
  Statement,
  StatementFootnote,
  StatementHero,
  StatementRow,
  StatementSection,
  StatementTotal,
} from "@/components/Statement";
import { addDays, compareYMD, formatKoreanDate, parseYMD, type YMD } from "@/lib/date";
import { formatNumber, formatWon, koreanWon } from "@/lib/format";
import {
  calcSeverance,
  DATE_MAX,
  DATE_MAX_YEAR,
  DATE_MIN,
  DATE_MIN_YEAR,
  isDateInRange,
  SMALL_TAX_EXEMPTION,
  type SeveranceResult,
} from "@/lib/calc/severance";
import { useUrlState } from "@/lib/useUrlState";

type WageMode = "m" | "t";

const won2Format = new Intl.NumberFormat("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** 88641.31 -> "88,641.31원" (always two decimals) */
function won2(n: number): string {
  return `${won2Format.format(n)}원`;
}

/** Whole won when exact, otherwise two decimals (상여 ÷ 4 can leave .25/.5/.75). */
function wonExact(n: number): string {
  return Number.isInteger(n) ? formatWon(n) : won2(n);
}

/** "2026.07.01" */
function dot(v: YMD): string {
  return `${v.y}.${String(v.m).padStart(2, "0")}.${String(v.d).padStart(2, "0")}`;
}

function manPreset(n: number) {
  return { label: `${formatNumber(n / 10_000)}만`, value: n };
}

const CAPTION = "고용노동부 계산 방식 · 2026년 세법 기준";

export function SeveranceCalculator() {
  // URL keys: s = 입사일, e = 퇴직일, wm = 3개월 임금 입력 방식 (m 월평균×3 / t 총액), w = 월 평균 급여,
  // wt = 3개월 임금총액, b = 연간 상여금, l = 연차수당, o = 1일 통상임금 (선택), h = 주 15시간 이상
  const [s, set] = useUrlState({
    s: "2022-03-02" as string,
    e: "2026-10-01" as string,
    wm: "m" as WageMode,
    w: 3_000_000,
    wt: 9_000_000,
    b: 0,
    l: 0,
    o: NaN as number,
    h: true as boolean,
  });

  const mode: WageMode = s.wm === "t" ? "t" : "m";
  const hire = parseYMD(s.s);
  const retire = parseYMD(s.e);
  const lastWorkDay = retire ? addDays(retire, -1) : null;
  const wage3m = mode === "m" ? s.w * 3 : s.wt;
  const wageOk = Number.isFinite(wage3m) && wage3m > 0;
  const bonus = Number.isFinite(s.b) ? s.b : 0;
  const leave = Number.isFinite(s.l) ? s.l : 0;

  let result: ReactNode;
  if (!hire || !retire || !lastWorkDay) {
    result = <CalcNotice>입사일과 퇴직일을 모두 넣으면 퇴직금을 계산해 드려요.</CalcNotice>;
  } else if (!isDateInRange(hire) || !isDateInRange(retire)) {
    // A half-typed year ("0202-03-02" while typing 2022) must not be calculated as a real date.
    result = (
      <CalcNotice>
        {!isDateInRange(hire) ? "입사일" : "퇴직일"}은 {DATE_MIN_YEAR}년부터 {DATE_MAX_YEAR}년 사이 날짜로 넣어 주세요.
      </CalcNotice>
    );
  } else if (compareYMD(retire, hire) <= 0) {
    result = <CalcNotice>퇴직일은 입사일보다 뒤여야 해요. 날짜를 다시 확인해 주세요.</CalcNotice>;
  } else if (!wageOk) {
    result = <CalcNotice>최근 3개월 임금을 0보다 큰 금액으로 넣으면 퇴직금을 계산해 드려요.</CalcNotice>;
  } else {
    const r = calcSeverance({
      hire,
      retire,
      wage3m,
      annualBonus: bonus,
      annualLeavePay: leave,
      ordinaryDaily: s.o,
      weekly15h: s.h,
    })!;
    result = r.eligible ? (
      <EligibleStatement
        r={r}
        hire={hire}
        lastWorkDay={lastWorkDay}
        wage3m={wage3m}
        mode={mode}
        monthly={s.w}
        bonus={bonus}
        leave={leave}
      />
    ) : (
      <IneligibleStatement r={r} hire={hire} lastWorkDay={lastWorkDay} />
    );
  }

  return (
    <CalcLayout
      inputs={
        <>
          <DateField
            label="입사일"
            value={s.s}
            onChange={(v) => set({ s: v })}
            min={DATE_MIN}
            max={DATE_MAX}
            hint="처음 출근한 날이에요. 수습 기간도 재직 기간에 들어가요."
          />
          <DateField
            label="퇴직일"
            value={s.e}
            onChange={(v) => set({ e: v })}
            min={DATE_MIN}
            max={DATE_MAX}
            hint={
              <>
                마지막으로 일한 날의 <strong>다음 날</strong>이에요. 9월 30일까지 일했다면 10월 1일을 넣으세요.
                {lastWorkDay && retire && isDateInRange(retire)
                  ? ` 지금 입력대로면 마지막 근무일은 ${formatKoreanDate(lastWorkDay)}이에요.`
                  : null}
              </>
            }
          />
          <SegmentedField<WageMode>
            label="최근 3개월 임금 입력 방식"
            value={mode}
            onChange={(wm) => set({ wm })}
            options={[
              { value: "m", label: "월 평균 급여로" },
              { value: "t", label: "3개월 총액 직접" },
            ]}
          />
          {mode === "m" ? (
            <NumberField
              label="월 평균 급여 (세전)"
              value={s.w}
              onChange={(w) => set({ w })}
              unit="원"
              max={1_000_000_000}
              reading={(n) => `${koreanWon(n)} · 3개월 ${koreanWon(n * 3)}`}
              presets={[2_500_000, 3_000_000, 3_500_000, 4_000_000, 5_000_000].map(manPreset)}
              hint="기본급에 매달 받는 수당(식대·직책수당 등)을 더한 세전 금액이에요. 3을 곱해 3개월 임금으로 써요."
            />
          ) : (
            <NumberField
              label="최근 3개월 임금 총액 (세전)"
              value={s.wt}
              onChange={(wt) => set({ wt })}
              unit="원"
              max={3_000_000_000}
              reading={(n) => koreanWon(n)}
              hint="퇴직일 전 3개월 동안 받은 기본급과 수당을 모두 더한 세전 금액이에요. 3개월 기간은 결과에 나와요."
            />
          )}
          <NumberField
            label="연간 상여금"
            value={s.b}
            onChange={(b) => set({ b })}
            unit="원"
            max={3_000_000_000}
            reading={(n) => koreanWon(n)}
            presets={[0, 1_000_000, 3_000_000, 5_000_000].map((n) => (n === 0 ? { label: "없음", value: 0 } : manPreset(n)))}
            hint="퇴직 전 12개월 동안 받은 상여금 총액이에요. 이 중 3/12만 평균임금에 들어가요."
          />
          <NumberField
            label="연차수당"
            value={s.l}
            onChange={(l) => set({ l })}
            unit="원"
            max={1_000_000_000}
            reading={(n) => koreanWon(n)}
            presets={[{ label: "없음", value: 0 }]}
            hint="전년도에 쓰지 못한 연차로 받은 수당 전액을 넣으세요. 이 중 3/12만 평균임금에 들어가요. 퇴직하면서 정산받는 연차수당은 넣지 않아요."
          />
          <NumberField
            label="1일 통상임금 (선택)"
            value={s.o}
            onChange={(o) => set({ o })}
            unit="원"
            max={100_000_000}
            placeholder="모르면 비워 두세요"
            hint="통상시급 × 하루 소정근로시간이에요(예: 10,320원 × 8시간 = 82,560원). 평균임금이 이보다 낮으면 이 금액으로 계산해요."
          />
          <CheckboxField
            label="4주 평균 주 15시간 이상 일했어요"
            checked={s.h}
            onChange={(h) => set({ h })}
            hint="주 15시간 미만으로 일했다면 퇴직금 지급 대상이 아니에요."
          />
        </>
      }
      result={result}
    />
  );
}

function IneligibleStatement({ r, hire, lastWorkDay }: { r: SeveranceResult; hire: YMD; lastWorkDay: YMD }) {
  const under1y = r.reasons.includes("under1y");
  const under15h = r.reasons.includes("under15h");
  return (
    <Statement title="퇴직금 명세" caption={CAPTION}>
      <StatementHero label="예상 퇴직금" value="0원" sub="퇴직금 지급 대상이 아니에요" />
      <StatementSection title="지급 요건 확인">
        <StatementRow label="재직일수" note={`${dot(hire)} ~ ${dot(lastWorkDay)}`} value={`${formatNumber(r.termDays)}일`} />
        <StatementRow
          label="계속근로 1년 이상"
          note={under1y ? `퇴직일이 ${formatKoreanDate(r.firstEligible)} 이후면 대상` : undefined}
          value={under1y ? "미달" : "충족"}
          emphasis={under1y}
        />
        <StatementRow label="4주 평균 주 15시간 이상" value={under15h ? "미달" : "충족"} emphasis={under15h} />
      </StatementSection>
      <StatementFootnote>
        근로자퇴직급여 보장법 제4조에 따라 계속근로기간이 1년 미만이거나 4주 평균 주 15시간 미만이면 회사에 퇴직금 지급 의무가 없어요. 회사
        규정이나 계약서에 따로 정한 퇴직금이 있다면 그에 따라요.
      </StatementFootnote>
    </Statement>
  );
}

function EligibleStatement({
  r,
  hire,
  lastWorkDay,
  wage3m,
  mode,
  monthly,
  bonus,
  leave,
}: {
  r: SeveranceResult;
  hire: YMD;
  lastWorkDay: YMD;
  wage3m: number;
  mode: WageMode;
  monthly: number;
  bonus: number;
  leave: number;
}) {
  const { period, wage, tax } = r;
  const smallExempt = tax?.smallTaxWaived === true;
  return (
    <Statement title="퇴직금 명세" caption={CAPTION}>
      <StatementHero
        label="예상 퇴직금 (세전)"
        value={formatWon(r.severance)}
        sub={tax ? `${koreanWon(r.severance)} · 세금 ${formatWon(tax.total)}` : koreanWon(r.severance)}
        stamp="퇴직금"
      />
      <StatementSection title="재직 기간">
        <StatementRow label="재직일수" note={`${dot(hire)} ~ ${dot(lastWorkDay)}`} value={`${formatNumber(r.termDays)}일`} />
      </StatementSection>
      <StatementSection title="평균임금">
        <StatementRow label="3개월 기간" note={`${dot(period.start)} ~ ${dot(period.end)}`} value={`${period.days}일`} />
        <StatementRow
          label="3개월 임금"
          note={mode === "m" ? `월 ${formatNumber(monthly)}원 × 3` : "직접 입력"}
          value={formatWon(wage3m)}
        />
        <StatementRow label="상여 가산" note={`연 ${formatNumber(bonus)}원 × 3/12`} value={wonExact(wage.bonusAdd)} />
        <StatementRow label="연차수당 가산" note={`${formatNumber(leave)}원 × 3/12`} value={wonExact(wage.leaveAdd)} />
        <StatementRow
          label="1일 평균임금"
          note={`${wonExact(wage.total)} ÷ ${period.days}일, 0.01원 올림`}
          value={won2(wage.daily)}
        />
        {r.ordinaryDaily > 0 ? <StatementRow label="1일 통상임금" value={formatWon(r.ordinaryDaily)} /> : null}
        <StatementRow
          label="적용 기준"
          note={r.basis === "ordinary" ? "평균임금이 통상임금보다 낮아 통상임금 적용" : undefined}
          value={r.basis === "ordinary" ? "통상임금" : "평균임금"}
        />
      </StatementSection>
      <StatementSection title="퇴직금">
        <StatementRow
          label="퇴직금"
          note={`${won2(r.baseDaily)} × 30일 × ${formatNumber(r.termDays)}일 ÷ 365`}
          value={formatWon(r.severance)}
          emphasis
        />
      </StatementSection>
      {tax ? (
        <StatementSection title="퇴직소득세 (일시금으로 받을 때)">
          <StatementRow label="근속연수" note={`근속 ${r.months}개월, 1년 미만은 1년으로 올림`} value={`${tax.years}년`} />
          <StatementRow label="근속연수공제" value={formatWon(tax.serviceDeduction)} />
          <StatementRow label="환산급여" note={`(퇴직금 − 근속연수공제) × 12 ÷ ${tax.years}`} value={formatWon(tax.converted)} />
          <StatementRow label="환산급여공제" value={formatWon(tax.convertedDeduction)} />
          <StatementRow label="과세표준" value={formatWon(tax.taxBase)} />
          <StatementRow
            label="퇴직소득세"
            note={
              smallExempt
                ? `산출세액 ${formatWon(tax.computedTax)}, ${formatNumber(SMALL_TAX_EXEMPTION)}원 미만이라 징수 안 함`
                : `기본세율 ${formatWon(tax.convertedTax)} × ${tax.years}/12`
            }
            value={formatWon(tax.incomeTax)}
          />
          <StatementRow
            label="지방소득세"
            note={smallExempt ? "걷는 퇴직소득세가 없어 함께 0원" : "원천징수하는 퇴직소득세의 10%"}
            value={formatWon(tax.localTax)}
          />
        </StatementSection>
      ) : null}
      <StatementTotal label="세후 수령액 (약)" value={formatWon(r.net)} />
      <StatementFootnote>
        고용노동부 퇴직금 계산기와 같은 방식(평균임금 0.01원 올림, 퇴직금 원 단위 반올림)이에요. 육아휴직·산재 휴업 같은 미산입 기간이 있으면
        금액이 달라질 수 있어요. 퇴직금을 IRP 계좌로 받으면 퇴직소득세를 떼지 않고 나중에 찾을 때까지 미뤄요(과세이연). DC형 퇴직연금은
        적립금과 운용 결과에 따라 받는 금액이 달라요.
        {lastWorkDay.y >= 2027
          ? " 2027년 이후 퇴직은 그해 세법이 바뀌면 세금이 달라질 수 있어요."
          : lastWorkDay.y <= 2022
            ? " 2022년 이전 퇴직은 그때 세법(지금보다 근속연수공제가 적음)이 적용돼 실제 세금이 이 계산과 다를 수 있어요."
            : null}
      </StatementFootnote>
    </Statement>
  );
}
