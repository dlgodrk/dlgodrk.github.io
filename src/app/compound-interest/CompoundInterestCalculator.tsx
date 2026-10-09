"use client";

import { CalcLayout, CalcNotice } from "@/components/CalcLayout";
import { NumberField, SegmentedField } from "@/components/fields";
import { Statement, StatementFootnote, StatementHero, StatementRow, StatementSection } from "@/components/Statement";
import { formatNumber, formatPercent, formatWon, koreanWon } from "@/lib/format";
import {
  approxWon,
  calcCompound,
  COMPOUNDING_LABEL,
  COMPREHENSIVE_TAX_THRESHOLD,
  DEFAULT_MONTHLY,
  DEFAULT_PRINCIPAL,
  DEFAULT_RATE,
  DEFAULT_YEARS,
  doublingYears,
  gainTax,
  isCompounding,
  isTaxMode,
  isTiming,
  isValidCompoundInput,
  MAX_BALANCE,
  MAX_INFLATION,
  MAX_MONTHLY,
  MAX_PRINCIPAL,
  MAX_RATE,
  MAX_YEARS,
  realValue,
  rule72Years,
  TIMING_LABEL,
  type Compounding,
  type TaxMode,
  type Timing,
} from "@/lib/calc/compound-interest";
import { useUrlState } from "@/lib/useUrlState";
import { GrowthChart } from "./GrowthChart";
import { YearTable } from "./YearTable";

const COMPOUNDING_HINTS: Record<Compounding, string> = {
  monthly: "매달 연 수익률의 1/12을 원금에 더해요. 적립식 투자 계산에서 가장 많이 쓰는 방식이에요.",
  quarterly: "3개월마다 연 수익률의 1/4을 더해요. 그사이에 넣은 돈은 분기 말까지 단리로 이자가 쌓여요.",
  yearly: "1년에 한 번 연 수익률만큼 더해요. 그해 중간에 넣은 돈은 연말까지 남은 개월만큼 단리로 쌓여요.",
};

/** Truncate to an integer, keeping NaN (empty box) as is. */
function toInt(n: number): number {
  return Number.isFinite(n) ? Math.trunc(n) : n;
}

const manPreset = (won: number) => ({
  label: won === 0 ? "없음" : won >= 100_000_000 ? `${won / 100_000_000}억` : `${formatNumber(won / 10_000)}만`,
  value: won,
});

export type CompoundInitial = { principal?: number; monthly?: number; ratePct?: number; years?: number };

export function CompoundInterestCalculator({ initial = {} }: { initial?: CompoundInitial }) {
  // URL keys: p = 초기 원금, m = 매월 적립액, r = 연 수익률(%), y = 기간(년),
  // c = 복리 주기, t = 적립 시점, x = 세금, i = 물가상승률(%)
  const [s, set] = useUrlState({
    p: initial.principal ?? DEFAULT_PRINCIPAL,
    m: initial.monthly ?? DEFAULT_MONTHLY,
    r: initial.ratePct ?? DEFAULT_RATE,
    y: initial.years ?? DEFAULT_YEARS,
    c: "monthly" as Compounding,
    t: "begin" as Timing,
    x: "none" as TaxMode,
    i: 0,
  });
  const principal = toInt(s.p);
  const monthly = toInt(s.m);
  const years = toInt(s.y);
  const ratePct = s.r;
  const compounding: Compounding = isCompounding(s.c) ? s.c : "monthly";
  const timing: Timing = isTiming(s.t) ? s.t : "begin";
  const taxMode: TaxMode = isTaxMode(s.x) ? s.x : "none";
  const inflation = Number.isFinite(s.i) && s.i > 0 && s.i <= MAX_INFLATION ? s.i : 0;

  // An empty box counts as 0 for the two money inputs (you can leave one of them blank).
  const p0 = Number.isFinite(principal) ? principal : 0;
  const m0 = Number.isFinite(monthly) ? monthly : 0;
  const valid = isValidCompoundInput(p0, m0, ratePct, years);
  const computed = valid ? calcCompound({ principal: p0, monthly: m0, ratePct, years, compounding, timing }) : null;
  // Past 1,000조원 the last digits are no longer exact, so show a notice instead of made-up numbers.
  const tooLarge = computed !== null && !(computed.balance <= MAX_BALANCE);
  const res = tooLarge ? null : computed;
  const tax = res && taxMode === "general" ? gainTax(res.gain) : null;
  const afterTax = res && tax ? res.balance - tax.total : null;
  const finalForReal = afterTax ?? res?.balance ?? 0;
  const real = res && inflation > 0 ? realValue(finalForReal, inflation, years) : null;
  const compLabel = COMPOUNDING_LABEL[compounding];

  return (
    <>
      <CalcLayout
        inputs={
          <>
            <NumberField
              label="초기 원금"
              value={principal}
              onChange={(p) => set({ p: toInt(p) })}
              unit="원"
              max={MAX_PRINCIPAL}
              reading={(n) => (n > 0 ? koreanWon(n) : "처음에 넣는 목돈이 없으면 0으로 두세요.")}
              presets={[0, 10_000_000, 30_000_000, 50_000_000, 100_000_000].map(manPreset)}
            />
            <NumberField
              label="매월 적립액"
              value={monthly}
              onChange={(m) => set({ m: toInt(m) })}
              unit="원"
              max={MAX_MONTHLY}
              reading={(n) => (n > 0 ? `매달 ${koreanWon(n)}` : "목돈만 굴리는 거치식이면 0으로 두세요.")}
              presets={[0, 100_000, 300_000, 500_000, 1_000_000].map(manPreset)}
            />
            <NumberField
              label="연 수익률"
              value={ratePct}
              onChange={(r) => set({ r })}
              unit="%"
              decimals={2}
              max={MAX_RATE}
              presets={[3, 4, 5, 7, 10].map((r) => ({ label: `${r}%`, value: r }))}
              hint="예금이라면 연 금리를, 투자라면 기대하는 연평균 수익률을 넣으세요."
            />
            <NumberField
              label="기간"
              value={years}
              onChange={(y) => set({ y: toInt(y) })}
              unit="년"
              max={MAX_YEARS}
              presets={[5, 10, 20, 30].map((y) => ({ label: `${y}년`, value: y }))}
            />
            <SegmentedField<Compounding>
              label="복리 주기"
              value={compounding}
              onChange={(c) => set({ c })}
              options={[
                { value: "monthly", label: "월" },
                { value: "quarterly", label: "분기" },
                { value: "yearly", label: "연" },
              ]}
              hint={COMPOUNDING_HINTS[compounding]}
            />
            <SegmentedField<Timing>
              label="적립 시점"
              value={timing}
              onChange={(t) => set({ t })}
              options={[
                { value: "begin", label: "월초" },
                { value: "end", label: "월말" },
              ]}
              hint={
                m0 > 0
                  ? "월초에 넣으면 그달 한 달치 수익이 더 붙어요. 은행 적금은 월초 기준으로 계산해요."
                  : "매월 적립액이 없으면 결과가 같아요."
              }
            />
            <SegmentedField<TaxMode>
              label="세금"
              value={taxMode}
              onChange={(x) => set({ x })}
              options={[
                { value: "none", label: "없음" },
                { value: "general", label: "15.4% 과세" },
              ]}
              hint="만기에 수익 전체에서 이자·배당소득세 15.4%를 한 번 뗀다고 보는 단순 가정이에요. 실제 과세 방식은 상품마다 달라요."
            />
            <NumberField
              label="물가상승률"
              value={s.i}
              onChange={(i) => set({ i })}
              unit="%"
              decimals={2}
              max={MAX_INFLATION}
              presets={[
                { label: "반영 안 함", value: 0 },
                { label: "2%", value: 2 },
                { label: "2.5%", value: 2.5 },
                { label: "3%", value: 3 },
              ]}
              hint="넣으면 만기 금액이 오늘 돈으로 얼마의 가치인지 함께 보여 드려요. 한국은행 물가안정목표는 2%예요."
            />
          </>
        }
        result={
          res ? (
            <Statement title="복리 계산 명세" caption={`${compLabel} · 연 ${formatNumber(ratePct, 2)}% · ${years}년`}>
              <StatementHero
                label={tax ? `${years}년 뒤 만기 금액 (세전)` : `${years}년 뒤 만기 금액`}
                value={formatWon(res.balance)}
                sub={`원금 ${approxWon(res.contributed)} + 수익 ${approxWon(res.gain)}`}
                stamp="복리"
              />
              <StatementSection title="납입과 수익">
                <StatementRow
                  label="총 납입 원금"
                  note={
                    m0 > 0
                      ? `${p0 > 0 ? `초기 ${koreanWon(p0)} + ` : ""}월 ${koreanWon(m0)} × ${years * 12}회`
                      : "초기 원금만"
                  }
                  value={formatWon(res.contributed)}
                />
                <StatementRow label="총 수익" note={`${compLabel} 연 ${formatNumber(ratePct, 2)}%`} value={formatWon(res.gain)} />
                <StatementRow
                  label="수익률(누적)"
                  note="총 수익 ÷ 총 납입 원금"
                  value={formatPercent(res.gainRatio, 1)}
                  emphasis
                />
              </StatementSection>
              {tax && afterTax !== null ? (
                <StatementSection title="세금 (단순 가정)">
                  <StatementRow label="이자·배당소득세" note="수익의 14%, 10원 미만 절사" value={`−${formatWon(tax.incomeTax)}`} />
                  <StatementRow label="지방소득세" note="소득세의 10%" value={`−${formatWon(tax.localTax)}`} />
                  <StatementRow label="세후 금액" note="만기에 한 번 과세 가정" value={formatWon(afterTax)} emphasis />
                </StatementSection>
              ) : null}
              {real !== null ? (
                <StatementSection title="물가 반영">
                  <StatementRow
                    label="실질 가치"
                    note={`${tax ? "세후 금액을 " : ""}연 ${formatNumber(inflation, 2)}% 물가로 ${years}년 할인`}
                    value={formatWon(real)}
                    emphasis
                  />
                  <StatementRow
                    label="물가로 줄어드는 가치"
                    note="명목 금액 대비"
                    value={`−${formatPercent(1 - real / finalForReal, 1)}`}
                  />
                </StatementSection>
              ) : null}
              <StatementSection title="참고">
                <StatementRow label="연 실효수익률" note={compLabel} value={formatPercent(res.effectiveAnnual, 2)} />
                {ratePct > 0 ? (
                  <>
                    <StatementRow
                      label="목돈이 2배 되는 기간"
                      note={`72의 법칙: 72 ÷ ${formatNumber(ratePct, 2)}`}
                      value={`약 ${formatNumber(rule72Years(ratePct), 1)}년`}
                    />
                    <StatementRow
                      label="정확히 계산하면"
                      note={compLabel}
                      value={`${doublingYears(ratePct, compounding).toFixed(1)}년`}
                    />
                  </>
                ) : null}
              </StatementSection>
              <StatementFootnote>
                매년 같은 수익률이 이어진다고 가정한 예시이고 투자 권유가 아니에요. 실제 투자 수익은 해마다 달라지고 원금 손실이
                날 수도 있어요.
                {m0 > 0 ? ` ${TIMING_LABEL[timing]} 기준이에요.` : ""}
                {compounding !== "monthly" && m0 > 0
                  ? " 주기 중간에 넣은 돈은 주기 끝까지 단리로 이자가 쌓인 뒤 원금에 합쳐져요."
                  : ""}
              </StatementFootnote>
              {tax && res.gain > COMPREHENSIVE_TAX_THRESHOLD ? (
                <StatementFootnote>
                  수익을 한 해에 한꺼번에 받으면 이자·배당소득이 2,000만원을 넘어 종합과세될 수 있어요. 이때는 세금이 15.4%보다
                  늘어날 수 있어요.
                </StatementFootnote>
              ) : null}
            </Statement>
          ) : tooLarge ? (
            <CalcNotice>
              만기 금액이 1,000조원을 넘어 원 단위까지 정확하게 보여 드릴 수 없어요. 금액이나 수익률, 기간을 줄여 보세요.
            </CalcNotice>
          ) : (
            <CalcNotice>
              초기 원금이나 매월 적립액 중 하나는 0보다 크게, 수익률은 0~{MAX_RATE}%, 기간은 1~{MAX_YEARS}년으로 넣으면 바로
              계산해 드려요.
            </CalcNotice>
          )
        }
      />
      {res ? (
        <section aria-labelledby="ci-growth-title" className="mt-8 rounded-[10px] border border-rule bg-sheet p-4 sm:p-6">
          <h2 id="ci-growth-title" className="text-lg font-bold text-ink">
            연도별 자산 변화
          </h2>
          <p className="mt-1 text-sm text-muted">
            {m0 > 0 ? "원금은 매년 같은 만큼 늘지만" : "원금은 그대로지만"}, 수익은 쌓인 돈에 다시 붙어서 뒤로 갈수록 빠르게
            커져요.
          </p>
          <div className="mt-5">
            <GrowthChart rows={res.rows} principal={p0} />
          </div>
          <div className="mt-6">
            <YearTable rows={res.rows} />
          </div>
        </section>
      ) : null}
    </>
  );
}
