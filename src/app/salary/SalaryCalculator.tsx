"use client";

import { useState } from "react";
import { CalcLayout, CalcNotice } from "@/components/CalcLayout";
import { CheckboxField, NumberField, SegmentedField, SelectField, StepperField } from "@/components/fields";
import {
  Statement,
  StatementFootnote,
  StatementHero,
  StatementRow,
  StatementSection,
  StatementTotal,
} from "@/components/Statement";
import { formatNumber, formatPercent, formatWon, manwonLabel } from "@/lib/format";
import { calcSalary, DEFAULT_NON_TAXABLE } from "@/lib/calc/salary";
import {
  ANNUAL_PRESETS_MANWON,
  clampChildren,
  clampFamily,
  convertAmount,
  LTC_ROUNDED_FROM,
  manwonFloorLabel,
  MAX_ANNUAL_MANWON,
  MAX_FAMILY,
  MAX_MONTHLY_MANWON,
  MAX_NON_TAXABLE,
  MIN_FAMILY,
  MONTHLY_PRESETS_MANWON,
  nearbyAmounts,
  normalizeRatio,
  payMonthLabel,
  pensionLimit,
  salaryInputFromForm,
  type SalaryMode,
} from "@/lib/calc/salary-ui";
import { rulePayMonth } from "@/lib/rates/insurance";
import { useToday } from "@/lib/useToday";
import { useUrlState } from "@/lib/useUrlState";
import { DecimalField } from "./DecimalField";

const RATIO_OPTIONS = [
  { value: "80", label: "80% (매달 덜 떼기)" },
  { value: "100", label: "100% (기본)" },
  { value: "120", label: "120% (매달 더 떼기)" },
];

const NON_TAXABLE_PRESETS = [
  { label: "없음", value: 0 },
  { label: "20만원", value: 200_000 },
  { label: "40만원", value: 400_000 },
  { label: "60만원", value: 600_000 },
];

/** "4,000만" style chip label */
function chipLabel(manwon: number): string {
  return manwon >= 10_000 && manwon % 10_000 === 0 ? `${manwon / 10_000}억` : `${formatNumber(manwon)}만`;
}

export function SalaryCalculator({
  initialManwon = 4_000,
  initialMode = "y",
}: {
  /** 연봉 (or 월급 when initialMode is "m") in 만원 */
  initialManwon?: number;
  /** "m" on the /salary/monthly/<만원>/ pages so the calculator opens in 월급 mode */
  initialMode?: SalaryMode;
}) {
  // URL keys: m 입력 기준(y 연봉 | m 월급), a 금액(만원), s 퇴직금 포함, n 월 비과세(원),
  //           f 공제대상가족 수, c 8~20세 자녀 수, r 원천징수 비율(%)
  const [s, set] = useUrlState({
    m: initialMode,
    a: initialManwon,
    s: false as boolean,
    n: DEFAULT_NON_TAXABLE,
    f: 1,
    c: 0,
    r: 100,
  });
  const [showTable, setShowTable] = useState(false);
  const { today } = useToday();

  const mode: SalaryMode = s.m === "m" ? "m" : "y";
  const family = clampFamily(s.f);
  const children = clampChildren(s.c, family);
  const ratio = normalizeRatio(s.r);
  const payMonth = rulePayMonth(today.y, today.m);
  const clampedYear = today.y !== 2026;
  const severance = mode === "y" && s.s;

  const form = {
    mode,
    amountManwon: s.a,
    severanceIncluded: s.s,
    nonTaxable: s.n,
    family,
    children,
    ratio,
    payMonth,
  };
  const input = salaryInputFromForm(form);
  const r = input ? calcSalary(input) : null;
  const limit = r ? pensionLimit(r.monthlyTaxable, payMonth) : null;
  const unitLabel = mode === "y" ? "연봉" : "월급";

  const tableRows =
    showTable && r
      ? nearbyAmounts(s.a, mode).map((amount) => {
          const rowInput = salaryInputFromForm({ ...form, amountManwon: amount });
          return { amount, result: rowInput ? calcSalary(rowInput) : null };
        })
      : [];

  return (
    <CalcLayout
      inputs={
        <>
          <SegmentedField<SalaryMode>
            label="입력 기준"
            value={mode}
            onChange={(next) => {
              if (next === mode) return;
              // Keep the same pay when switching so the result does not jump.
              set({ m: next, a: convertAmount(s.a, mode, next, s.s) });
            }}
            options={[
              { value: "y", label: "연봉" },
              { value: "m", label: "월급" },
            ]}
          />
          {mode === "y" ? (
            <NumberField
              key="y"
              label="연봉 (세전)"
              value={s.a}
              onChange={(a) => set({ a })}
              unit="만원"
              max={MAX_ANNUAL_MANWON}
              reading={(v) => (v > 0 ? manwonLabel(v) : null)}
              presets={ANNUAL_PRESETS_MANWON.map((v) => ({ label: chipLabel(v), value: v }))}
              hint="근로계약서에 적힌 세전 연봉을 만원 단위로 넣어 주세요."
            />
          ) : (
            // The shared NumberField drops a typed decimal point ("312." → "312"), so 월급 uses a draft-text field.
            <DecimalField
              key="m"
              label="월급 (세전)"
              value={s.a}
              onChange={(a) => set({ a })}
              unit="만원"
              decimals={4}
              max={MAX_MONTHLY_MANWON}
              reading={(v) => (v > 0 ? manwonLabel(v) : null)}
              presets={MONTHLY_PRESETS_MANWON.map((v) => ({ label: chipLabel(v), value: v }))}
              hint="상여금 없이 매달 받는 세전 월급을 넣어 주세요. 소수점으로 원 단위까지 넣을 수 있어요(312.5 → 312만 5,000원)."
            />
          )}
          {mode === "y" ? (
            <CheckboxField
              label="퇴직금 포함 연봉"
              checked={s.s}
              onChange={(v) => set({ s: v })}
              hint="연봉에 퇴직금이 들어 있으면 13으로 나눠 월급을 계산해요."
            />
          ) : null}
          <NumberField
            label="월 비과세액"
            value={s.n}
            // An empty box means no 비과세. Store 0 (not NaN) so the URL keeps it; NaN would be dropped
            // and a shared link or reload would bring back the 20만원 default.
            onChange={(n) => set({ n: Number.isFinite(n) ? n : 0 })}
            unit="원"
            max={MAX_NON_TAXABLE}
            presets={NON_TAXABLE_PRESETS}
            hint="식대는 월 20만원까지 비과세예요. 6세 이하 자녀 보육수당은 2026년부터 자녀 1인당 월 20만원, 업무에 본인 차를 쓰고 받는 자가운전보조금도 월 20만원까지예요."
          />
          <StepperField
            label="공제대상가족 수 (본인 포함)"
            value={family}
            onChange={(f) => set({ f, c: clampChildren(children, f) })}
            min={MIN_FAMILY}
            max={MAX_FAMILY}
            unit="명"
            hint="본인 1명에, 연 소득금액 100만원 이하(근로소득만 있으면 총급여 500만원 이하)인 배우자·부모님(60세 이상)·자녀(20세 이하)를 더해 세요."
          />
          <StepperField
            label="그중 8~20세 자녀 수"
            value={children}
            onChange={(c) => set({ c: clampChildren(c, family) })}
            min={0}
            max={Math.max(family - 1, 0)}
            unit="명"
            hint={
              family === 1
                ? "자녀를 넣으려면 먼저 공제대상가족 수를 늘려 주세요."
                : "자녀 1명이면 월 20,830원, 2명이면 45,830원을 소득세에서 더 빼 줘요."
            }
          />
          <SelectField
            label="원천징수 비율"
            value={String(ratio)}
            onChange={(v) => set({ r: Number(v) })}
            options={RATIO_OPTIONS}
            hint="80%를 고르면 매달 실수령액은 늘지만 연말정산 때 환급이 줄거나 더 낼 수 있어요."
          />
        </>
      }
      result={
        r ? (
          <>
            <Statement title="월 실수령액 명세" caption={`${payMonthLabel(payMonth)} 급여 기준`}>
              <StatementHero
                label="월 실수령액"
                value={formatWon(r.monthlyNet)}
                sub={`연 환산 약 ${manwonFloorLabel(r.annualNet)} · 공제율 ${formatPercent(r.deductionRate, 1)}`}
                stamp="실수령"
              />
              <StatementSection title="공제 내역">
                <StatementRow
                  label="국민연금"
                  note={limit === "cap" ? "4.75% · 상한 적용" : limit === "floor" ? "4.75% · 하한 적용" : "4.75%"}
                  value={formatWon(r.insurance.pension)}
                />
                <StatementRow label="건강보험" note="3.595%" value={formatWon(r.insurance.health)} />
                <StatementRow
                  label="장기요양보험"
                  note={payMonth < LTC_ROUNDED_FROM ? "건강보험료의 약 13.14%" : "건강보험료의 13.14%"}
                  value={formatWon(r.insurance.longTermCare)}
                />
                <StatementRow label="고용보험" note="0.9%" value={formatWon(r.insurance.employment)} />
                <StatementRow
                  label="소득세"
                  note={[
                    `간이세액표, 가족 ${family}명`,
                    children > 0 ? `자녀 ${children}명` : null,
                    ratio !== 100 ? `${ratio}%` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  value={formatWon(r.tax.incomeTax)}
                />
                <StatementRow label="지방소득세" note="소득세의 10%" value={formatWon(r.tax.localTax)} />
              </StatementSection>
              <StatementTotal label="공제액 합계" value={formatWon(r.deductions)} />
              <StatementSection title="지급 내역">
                <StatementRow
                  label="월 지급액"
                  note={mode === "m" ? "입력한 월급" : severance ? "연봉 ÷ 13 (퇴직금 포함)" : "연봉 ÷ 12"}
                  value={formatWon(r.monthlyGross)}
                />
                <StatementRow label="비과세" note="식대 등" value={formatWon(r.nonTaxable)} />
                <StatementRow label="과세 대상" note="4대보험·소득세 기준" value={formatWon(r.monthlyTaxable)} emphasis />
              </StatementSection>
              <StatementFootnote>
                {[
                  `${payMonthLabel(payMonth)} 급여 기준 요율로 계산했어요.`,
                  clampedYear
                    ? `2027년 국민연금 인상(근로자 5.0%) 등 2027년 요율은 아직 반영하지 않아 ${payMonthLabel(payMonth)}분 기준으로 보여 드려요.`
                    : null,
                  severance && input
                    ? `연봉 중 ${formatNumber(input.annual - r.monthlyGross * 12)}원은 퇴직금 몫이라 매달 받는 돈에서 빠져요.`
                    : null,
                  "소득세는 간이세액표로 매달 떼는 금액이라 연말정산 결과에 따라 환급받거나 더 낼 수 있어요.",
                  r.nonTaxable < (Number.isFinite(s.n) ? Math.floor(s.n) : 0)
                    ? "비과세액이 월 지급액보다 커서 월 지급액까지만 반영했어요."
                    : null,
                ]
                  .filter(Boolean)
                  .join(" ")}
              </StatementFootnote>
            </Statement>
            {showTable ? (
              <div className="table-wrap mt-3">
                <table className="data-table">
                  <caption>같은 조건으로 계산한 주변 {unitLabel} 실수령액 (누르면 그 금액으로 계산)</caption>
                  <thead>
                    <tr>
                      <th scope="col">{unitLabel}</th>
                      <th scope="col">공제액</th>
                      <th scope="col">월 실수령액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map(({ amount, result }) => {
                      const current = Math.abs(amount - s.a) < 1e-9;
                      return (
                        <tr key={amount} className={current ? "is-current" : undefined}>
                          <td>
                            {current ? (
                              manwonLabel(amount)
                            ) : (
                              <button type="button" className="text-link hover:underline" onClick={() => set({ a: amount })}>
                                {manwonLabel(amount)}
                              </button>
                            )}
                          </td>
                          <td>{result ? formatNumber(result.deductions) : "-"}</td>
                          <td>{result ? formatNumber(result.monthlyNet) : "-"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        ) : (
          <CalcNotice>
            {unitLabel}을 0보다 큰 금액으로 넣으면 4대보험과 소득세를 뺀 실수령액을 바로 계산해 드려요.
          </CalcNotice>
        )
      }
      actions={
        r ? (
          <button type="button" className="btn-ghost" aria-expanded={showTable} onClick={() => setShowTable((v) => !v)}>
            {showTable ? "실수령액 표 닫기" : `주변 ${unitLabel} 실수령액 표`}
          </button>
        ) : null
      }
    />
  );
}
