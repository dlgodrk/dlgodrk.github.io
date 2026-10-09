"use client";

import Link from "next/link";
import { useState } from "react";
import { NumberField } from "@/components/fields";
import { Statement, StatementFootnote, StatementHero, StatementRow, StatementSection } from "@/components/Statement";
import { formatNumber, formatWon, manwonLabel } from "@/lib/format";
import { MAX_ANNUAL_MANWON, manwonFloorLabel, payMonthLabel, salaryForManwon } from "@/lib/calc/salary-ui";
import { rulePayMonth } from "@/lib/rates/insurance";
import { useToday } from "@/lib/useToday";

const PRESETS = [3_000, 4_000, 5_000, 6_000].map((v) => ({ label: `${formatNumber(v)}만`, value: v }));

/**
 * Compact 연봉 실수령액 widget for the home page hero.
 * Assumes 비과세 식대 20만원, 본인 1명, 간이세액 100%; links to /salary/?a=<만원> for the full calculator.
 */
export function SalaryMini() {
  const [annual, setAnnual] = useState(4_000);
  const { today } = useToday();
  const payMonth = rulePayMonth(today.y, today.m);
  const valid = Number.isFinite(annual) && annual > 0;
  const r = valid ? salaryForManwon(annual, { payMonth }) : null;
  const href = valid ? `/salary/?a=${annual}` : "/salary/";

  return (
    <section aria-label="연봉 실수령액 빠른 계산" className="grid items-start gap-3 sm:grid-cols-2">
      <div className="calc-inputs">
        <NumberField
          label="연봉 (세전)"
          value={annual}
          onChange={setAnnual}
          unit="만원"
          max={MAX_ANNUAL_MANWON}
          reading={(v) => (v > 0 ? manwonLabel(v) : null)}
          presets={PRESETS}
        />
      </div>
      <div className="grid gap-2">
        <Statement title="연봉 실수령액" caption={`${payMonthLabel(payMonth)} 급여 기준`}>
          {r ? (
            <>
              <StatementHero
                label="월 실수령액"
                value={formatWon(r.monthlyNet)}
                sub={`연 환산 약 ${manwonFloorLabel(r.annualNet)}`}
                stamp="실수령"
              />
              <StatementSection>
                <StatementRow label="세전 월급" value={formatWon(r.monthlyGross)} />
                <StatementRow label="4대보험·세금" value={formatWon(r.deductions)} />
              </StatementSection>
            </>
          ) : (
            <StatementSection>
              <StatementRow label="월 실수령액" value="연봉을 넣어 주세요" />
            </StatementSection>
          )}
          <StatementFootnote>비과세 식대 20만원, 본인 1명, 간이세액 100% 기준이에요.</StatementFootnote>
        </Statement>
        <Link href={href} className="justify-self-end text-sm font-semibold text-link underline underline-offset-4">
          자세히 계산하기
        </Link>
      </div>
    </section>
  );
}
