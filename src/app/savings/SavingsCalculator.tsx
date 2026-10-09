"use client";

import { CalcLayout, CalcNotice } from "@/components/CalcLayout";
import { NumberField, SegmentedField } from "@/components/fields";
import { Statement, StatementFootnote, StatementHero, StatementRow, StatementSection } from "@/components/Statement";
import { formatNumber, formatPercent, formatWon, koreanWon } from "@/lib/format";
import {
  AGRI_EXEMPT_CAP,
  calcSavings,
  DEFAULT_MONTHLY,
  DEFAULT_MONTHS,
  DEFAULT_RATE,
  isTaxType,
  isValidSavingsInput,
  MAX_MONTHLY,
  MAX_MONTHS,
  MAX_RATE,
  PERIOD_PRESETS,
  periodLabel,
  TAX_TYPE_ORDER,
  TAX_TYPES,
  type InterestType,
  type TaxType,
} from "@/lib/calc/savings";
import { useUrlState } from "@/lib/useUrlState";

const TAX_HINTS: Record<TaxType, string> = {
  general: "이자소득세 14%와 지방소득세 1.4%를 떼요. 대부분의 적금이 여기에 해당해요.",
  preferential: "소득세 9%와 농어촌특별세 0.5%예요. 예전 세금우대종합저축 세율로, 지금은 신규 가입이 없어요.",
  agri: "농협·수협·신협·새마을금고 예탁금 3천만원까지는 농어촌특별세 1.4%만 내요(농어민 조합원이나 총급여 7천만원 이하 등 요건). 소득 기준을 넘는 준조합원·회원은 2026년 가입분부터 5% 분리과세예요.",
  exempt: "비과세종합저축, 청년도약계좌·청년미래적금처럼 이자에 세금이 붙지 않는 경우예요.",
};

/** Truncate to an integer, keeping NaN (empty box) as is. */
function toInt(n: number): number {
  return Number.isFinite(n) ? Math.trunc(n) : n;
}

const TAX_SHORT: Record<TaxType, string> = {
  general: "일반",
  preferential: "세금우대",
  agri: "조합",
  exempt: "비과세",
};

export function SavingsCalculator({ initialMonthly = DEFAULT_MONTHLY }: { initialMonthly?: number }) {
  // URL keys: m = 월 납입액(원), n = 기간(개월), r = 연 이자율(%), t = 이자 방식, x = 과세
  const [s, set] = useUrlState({
    m: initialMonthly,
    n: DEFAULT_MONTHS,
    r: DEFAULT_RATE,
    t: "simple" as InterestType,
    x: "general" as TaxType,
  });
  // 원·개월은 정수만: "12.5"나 ?n=12.5가 들어와도 입력칸 표시와 계산이 같은 값(12)을 쓰도록 버린다.
  const monthly = toInt(s.m);
  const months = toInt(s.n);
  const interestType: InterestType = s.t === "monthly" ? "monthly" : "simple";
  const taxType: TaxType = isTaxType(s.x) ? s.x : "general";
  const valid = isValidSavingsInput(monthly, months, s.r);
  const res = valid ? calcSavings({ monthly, months, ratePct: s.r, interestType, taxType }) : null;
  const typeLabel = interestType === "monthly" ? "월복리" : "단리";

  return (
    <CalcLayout
      inputs={
        <>
          <NumberField
            label="월 납입액"
            value={monthly}
            onChange={(m) => set({ m: toInt(m) })}
            unit="원"
            max={MAX_MONTHLY}
            reading={(n) => (n > 0 ? `매달 ${koreanWon(n)}` : null)}
            presets={[100_000, 300_000, 500_000, 1_000_000, 2_000_000].map((v) => ({
              label: `${formatNumber(v / 10_000)}만`,
              value: v,
            }))}
          />
          <NumberField
            label="적금 기간"
            value={months}
            onChange={(n) => set({ n: toInt(n) })}
            unit="개월"
            max={MAX_MONTHS}
            presets={PERIOD_PRESETS.map((n) => ({ label: periodLabel(n), value: n }))}
          />
          <NumberField
            label="연 이자율"
            value={s.r}
            onChange={(r) => set({ r })}
            unit="%"
            decimals={2}
            max={MAX_RATE}
            presets={[2.5, 3, 3.5, 4, 5].map((r) => ({ label: `${r}%`, value: r }))}
            hint="우대금리까지 받을 수 있다면 합친 최종 금리를 넣으세요."
          />
          <SegmentedField<InterestType>
            label="이자 방식"
            value={interestType}
            onChange={(t) => set({ t })}
            options={[
              { value: "simple", label: "단리" },
              { value: "monthly", label: "월복리" },
            ]}
            hint="은행 정기적금은 대부분 단리예요. 상품 설명서에 ‘월복리’라고 적혀 있을 때만 바꾸세요."
          />
          <SegmentedField<TaxType>
            label="과세 구분"
            value={taxType}
            onChange={(x) => set({ x })}
            options={TAX_TYPE_ORDER.map((t) => ({
              value: t,
              label: (
                <span className="block leading-tight">
                  <span className="block">{TAX_SHORT[t]}</span>
                  <span className="block text-[0.8125rem] opacity-75 tabular">{TAX_TYPES[t].rateLabel}</span>
                </span>
              ),
            }))}
            hint={TAX_HINTS[taxType]}
          />
        </>
      }
      result={
        res ? (
          <Statement title="적금 만기 명세" caption={`${periodLabel(months)} · 연 ${formatNumber(s.r, 2)}% ${typeLabel}`}>
            <StatementHero
              label="만기 수령액 (세후)"
              value={formatWon(res.maturity)}
              sub={`원금 ${koreanWon(res.principal)} + 세후 이자 ${koreanWon(res.afterTaxInterest)}`}
              stamp="만기"
            />
            <StatementSection title="납입과 이자">
              <StatementRow
                label="원금 합계"
                note={`월 ${formatNumber(monthly)}원 × ${months}회`}
                value={formatWon(res.principal)}
              />
              <StatementRow label="세전 이자" note={`${typeLabel} 연 ${formatNumber(s.r, 2)}%`} value={formatWon(res.interest)} />
              <StatementRow
                label="이자과세"
                note={
                  res.agriSplit
                    ? "3천만원까지 1.4% + 초과분 15.4%"
                    : `${TAX_TYPES[taxType].label} ${TAX_TYPES[taxType].rateLabel}`
                }
                value={res.tax > 0 ? `−${formatWon(res.tax)}` : "0원"}
              />
              <StatementRow label="세후 이자" value={formatWon(res.afterTaxInterest)} emphasis />
            </StatementSection>
            {res.taxLines.length ? (
              <StatementSection title="세금 내역 (10원 미만 절사)">
                {res.taxLines.map((l) => (
                  <StatementRow key={l.label} label={l.label} note={l.note} value={formatWon(l.amount)} />
                ))}
              </StatementSection>
            ) : null}
            <StatementSection title="실제 체감 금리">
              <StatementRow
                label="원금 대비 세후 이자"
                note={`${periodLabel(months)} 동안`}
                value={formatPercent(res.afterTaxReturn, 2)}
              />
              <StatementRow label="1년으로 환산하면" note="세후, 단순 연환산" value={`연 ${formatPercent(res.afterTaxAnnualized, 2)}`} emphasis />
              <StatementRow
                label="예금으로 치면"
                note="원금 전체를 처음부터 맡긴 경우, 세전"
                value={`연 ${formatPercent(res.depositEquivalentRate, 2)}`}
              />
            </StatementSection>
            <StatementFootnote>
              적금은 회차마다 남은 기간만큼만 이자가 붙어서, 1년 적금이면 원금 대비 이자가 세전 기준으로 표시 금리의 절반
              남짓이에요. 은행은 납입일별 일수로 이자를 계산하므로 실제 금액과 몇십 원 차이가 날 수 있어요.
              2026년 세율 기준.
            </StatementFootnote>
            {res.agriSplit ? (
              <StatementFootnote>
                조합 예탁금 비과세는 1인당 {koreanWon(AGRI_EXEMPT_CAP)}까지라서, 먼저 넣은 {koreanWon(AGRI_EXEMPT_CAP)}에 붙는
                이자 {formatWon(res.agriSplit.cappedInterest)}만 1.4%로, 나머지 {koreanWon(res.agriSplit.excessPrincipal)}에 붙는
                이자 {formatWon(res.agriSplit.excessInterest)}은 일반과세 15.4%로 계산했어요. 다른 조합 예탁금과 합산되고 실제 한도
                적용 방식은 조합마다 다를 수 있으니 가입할 곳에 확인하세요.
              </StatementFootnote>
            ) : null}
          </Statement>
        ) : (
          <CalcNotice>
            월 납입액은 {koreanWon(MAX_MONTHLY)} 이하로, 기간은 1~{MAX_MONTHS}개월, 금리는 0~{MAX_RATE}% 사이로 넣으면 바로 계산해
            드려요.
          </CalcNotice>
        )
      }
    />
  );
}
