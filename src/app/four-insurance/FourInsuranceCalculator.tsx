"use client";

import { CalcLayout, CalcNotice } from "@/components/CalcLayout";
import { CheckboxField, NumberField, SegmentedField, SelectField } from "@/components/fields";
import {
  Statement,
  StatementFootnote,
  StatementHero,
  StatementRow,
  StatementSection,
  StatementTotal,
} from "@/components/Statement";
import { formatNumber, formatPercent, formatWon, koreanWon, manwonLabel } from "@/lib/format";
import {
  annualManwonFromMonthly,
  calcFourInsurance,
  COMPANY_SIZES,
  INDUSTRIAL_AVG_RATE,
  MAX_ANNUAL_MANWON,
  MAX_INDUSTRIAL_RATE,
  MAX_MONTHLY_WON,
  MAX_NON_TAXABLE,
  monthlyFromAnnualManwon,
  normalizeSize,
  payMonthLabel,
  periodLabel,
  resolvePayMonth,
  RULE_PERIODS,
  sizeInfo,
  type CompanySize,
} from "@/lib/calc/four-insurance";
import { rulePayMonth } from "@/lib/rates/insurance";
import { minimumMonthly } from "@/lib/rates/labor";
import { useToday } from "@/lib/useToday";
import { useUrlState } from "@/lib/useUrlState";
import { InsuranceTable } from "./InsuranceTable";

/** 입력 기준: m = 월 급여(원), y = 연봉(만원) */
type Mode = "m" | "y";

const MONTHLY_PRESETS = [
  { label: "최저임금", value: minimumMonthly(2026) },
  { label: "250만", value: 2_500_000 },
  { label: "300만", value: 3_000_000 },
  { label: "350만", value: 3_500_000 },
  { label: "400만", value: 4_000_000 },
  { label: "500만", value: 5_000_000 },
];

const ANNUAL_PRESETS = [3_000, 3_600, 4_000, 5_000, 6_000, 8_000].map((v) => ({ label: `${formatNumber(v)}만`, value: v }));

const NON_TAXABLE_PRESETS = [
  { label: "없음", value: 0 },
  { label: "20만원", value: 200_000 },
  { label: "40만원", value: 400_000 },
];

const SIZE_OPTIONS = COMPANY_SIZES.map((s) => ({
  value: s.value,
  label: `${s.label} (${formatNumber(s.rate / 100, 2)}%)`,
}));

export function FourInsuranceCalculator({ initialWon = 3_000_000 }: { initialWon?: number }) {
  // URL keys: m 입력 기준, a 금액(m: 원, y: 만원), n 월 비과세(원), c 사업장 규모, r 산재보험료율(%),
  //           p 적용 기준 월("" = 자동), o 국민연금 제외, g 실업급여 제외
  const [s, set] = useUrlState({
    m: "m" as Mode,
    a: initialWon,
    n: 0,
    c: "s" as CompanySize,
    r: INDUSTRIAL_AVG_RATE,
    p: "",
    o: false as boolean,
    g: false as boolean,
  });
  const { today } = useToday();

  const mode: Mode = s.m === "y" ? "y" : "m";
  const size = normalizeSize(s.c);
  const autoMonth = rulePayMonth(today.y, today.m);
  const picked = RULE_PERIODS.some((p) => p.value === s.p) ? s.p : "";
  const payMonth = resolvePayMonth(picked, autoMonth);
  const clampedYear = picked === "" && today.y !== 2026;

  const amountValid = Number.isFinite(s.a) && s.a > 0;
  const monthlyGross = amountValid ? (mode === "m" ? Math.floor(s.a) : monthlyFromAnnualManwon(s.a)) : 0;
  const r =
    monthlyGross > 0
      ? calcFourInsurance({
          monthlyGross,
          nonTaxable: s.n,
          payMonth,
          size,
          industrialRate: s.r,
          pensionExempt: s.o,
          employmentExempt: s.g,
        })
      : null;
  const typedNonTaxable = Number.isFinite(s.n) ? Math.max(0, Math.floor(s.n)) : 0;
  const rateEmpty = !Number.isFinite(s.r);

  return (
    <CalcLayout
      inputs={
        <>
          <SegmentedField<Mode>
            label="입력 기준"
            value={mode}
            onChange={(next) => {
              if (next === mode) return;
              // Keep the same pay when switching so the result does not jump.
              if (!amountValid) {
                set({ m: next });
                return;
              }
              set({ m: next, a: next === "y" ? annualManwonFromMonthly(s.a) : monthlyFromAnnualManwon(s.a) });
            }}
            options={[
              { value: "m", label: "월 급여" },
              { value: "y", label: "연봉" },
            ]}
          />
          {mode === "m" ? (
            <NumberField
              key="m"
              label="월 급여 (세전)"
              value={s.a}
              onChange={(a) => set({ a })}
              unit="원"
              max={MAX_MONTHLY_WON}
              reading={(v) => (v > 0 ? koreanWon(v) : null)}
              presets={MONTHLY_PRESETS}
              hint="상여금을 뺀, 매달 받는 세전 급여를 넣어 주세요. 최저임금은 2026년 주 40시간 월 환산액이에요."
            />
          ) : (
            <NumberField
              key="y"
              label="연봉 (세전)"
              value={s.a}
              onChange={(a) => set({ a })}
              unit="만원"
              max={MAX_ANNUAL_MANWON}
              reading={(v) => (v > 0 ? manwonLabel(v) : null)}
              presets={ANNUAL_PRESETS}
              hint="연봉을 12로 나눈 금액을 월 급여로 계산해요."
            />
          )}
          <NumberField
            label="월 비과세액"
            value={s.n}
            // Store 0 (not NaN) for an empty box so a shared link keeps it.
            onChange={(n) => set({ n: Number.isFinite(n) ? n : 0 })}
            unit="원"
            max={MAX_NON_TAXABLE}
            presets={NON_TAXABLE_PRESETS}
            hint="식대(월 20만원까지) 같은 비과세 수당은 4대보험 기준 보수에서 빠져요. 급여명세서에 따로 적혀 있으면 넣어 주세요."
          />
          <SelectField<CompanySize>
            label="사업장 규모 (상시 근로자 수)"
            value={size}
            onChange={(c) => set({ c })}
            options={SIZE_OPTIONS}
            hint="회사가 내는 고용보험 중 고용안정·직업능력개발 보험료율만 규모에 따라 달라져요. 우선지원대상기업은 업종별 인원 기준(제조업 500명 이하 등)을 충족하는 중소기업이에요."
          />
          <NumberField
            label="산재보험료율"
            value={s.r}
            onChange={(r) => set({ r })}
            unit="%"
            decimals={3}
            max={MAX_INDUSTRIAL_RATE}
            presets={[{ label: `평균 ${INDUSTRIAL_AVG_RATE}%`, value: INDUSTRIAL_AVG_RATE }]}
            hint="업종별 요율에 출퇴근재해 요율 0.06%를 더한 값이에요. 모르면 2026년 평균 1.47%로 계산하고, 내 사업장 요율은 근로복지공단 고지서에서 확인할 수 있어요."
          />
          <SelectField<string>
            label="적용 기준 월"
            value={picked}
            onChange={(p) => set({ p })}
            options={[{ value: "", label: `자동 (${payMonthLabel(autoMonth)}분)` }, ...RULE_PERIODS]}
            hint="국민연금 기준소득월액 상한은 1~6월분 637만원, 7월분부터 659만원이에요. 장기요양보험료는 11월분부터 건강보험료의 13.14%로 계산해 10원 차이가 날 수 있어요."
          />
          <CheckboxField
            label="만 60세 이상 (국민연금 제외)"
            checked={s.o}
            onChange={(o) => set({ o })}
            hint="만 60세가 되면 국민연금 사업장가입자에서 빠져 근로자와 회사 모두 연금보험료를 내지 않아요."
          />
          <CheckboxField
            label="65세 이후 새로 고용 (실업급여 제외)"
            checked={s.g}
            onChange={(g) => set({ g })}
            hint="실업급여 보험료는 근로자와 회사 모두 내지 않지만, 회사의 고용안정·직능 보험료는 그대로 내요."
          />
        </>
      }
      result={
        r ? (
          <Statement title="4대보험료 명세" caption={`${periodLabel(picked, payMonth)} · ${sizeInfo(size).short}`}>
            <StatementHero
              label="근로자 부담 합계 (월)"
              value={formatWon(r.employeeTotal)}
              sub={`회사 부담 ${formatWon(r.employerTotal)} · 보수의 ${formatPercent(r.pay > 0 ? r.employeeTotal / r.pay : 0, 2)}`}
              stamp="4대보험"
            />
            <div className="statement-section" style={{ paddingLeft: 0, paddingRight: 0 }}>
              <h3 className="statement-section-title" style={{ padding: "0 1.25rem" }}>
                보험료 내역 (월, 원)
              </h3>
              <InsuranceTable r={r} compact caption="4대보험료 근로자·사업주 부담 (단위: 원)" />
            </div>
            <StatementSection title="계산 기준">
              <StatementRow label="보수월액" note="세전 급여 − 비과세" value={formatWon(r.pay)} emphasis />
              {s.o ? null : (
                <StatementRow
                  label="국민연금 기준소득월액"
                  note={r.pensionLimit === "cap" ? "상한 적용" : r.pensionLimit === "floor" ? "하한 적용" : "천원 미만 버림"}
                  value={formatWon(r.pensionBase)}
                />
              )}
              <StatementRow label="4대보험만 뺀 급여" note="소득세 별도" value={formatWon(r.monthlyGross - r.employeeTotal)} />
            </StatementSection>
            <StatementSection title="회사 부담">
              <StatementRow
                label="세전 월 급여"
                note={mode === "y" ? "연봉 ÷ 12" : undefined}
                value={formatWon(r.monthlyGross)}
              />
              <StatementRow label="사업주 4대보험료" note="산재 포함" value={formatWon(r.employerTotal)} />
            </StatementSection>
            <StatementTotal label="월 인건비 (퇴직금 제외)" value={formatWon(r.laborCost)} />
            <StatementFootnote>
              {[
                `${periodLabel(picked, payMonth)} 요율로 계산했어요.`,
                picked === "" ? "기준 월은 접속한 달에 맞춰 바뀌어요." : null,
                clampedYear
                  ? "2027년 요율이 반영되기 전이라 2026년 12월분 기준으로 보여 드려요. 2027년에는 국민연금 근로자·회사 몫이 각각 5.0%로 올라요."
                  : null,
                rateEmpty
                  ? "산재보험료율을 비워 두어 산재보험료는 0원으로 계산했어요."
                  : r.industrialRate === INDUSTRIAL_AVG_RATE
                    ? `산재보험은 회사만 내요. ${INDUSTRIAL_AVG_RATE}%는 출퇴근재해 0.06%를 포함한 2026년 전 업종 평균이라 업종마다 달라요.`
                    : `산재보험은 회사만 내며, 입력한 요율 ${formatNumber(r.industrialRate, 3)}%로 계산했어요.`,
                r.nonTaxable < typedNonTaxable ? "비과세액이 월 급여보다 커서 월 급여까지만 반영했어요." : null,
                "월 인건비는 급여와 회사 4대보험료만 더한 값이라, 1년 이상 근무하면 생기는 퇴직금 적립분(매달 월 급여의 약 1/12)과 임금채권부담금은 빠져 있어요.",
                "실제 고지액은 신고된 보수월액과 기준소득월액으로 정해져 조금 다를 수 있어요. 소득세는 빠져 있어요.",
              ]
                .filter(Boolean)
                .join(" ")}
            </StatementFootnote>
          </Statement>
        ) : (
          <CalcNotice>
            {mode === "m" ? "월 급여를" : "연봉을"} 0보다 큰 금액으로 넣으면 근로자와 회사가 내는 4대보험료를 바로 계산해 드려요.
          </CalcNotice>
        )
      }
    />
  );
}
