"use client";

import { CalcLayout, CalcNotice } from "@/components/CalcLayout";
import { NumberField, SegmentedField } from "@/components/fields";
import { Statement, StatementFootnote, StatementHero, StatementRow, StatementSection } from "@/components/Statement";
import { formatNumber, formatPercent, formatWon, koreanWon } from "@/lib/format";
import {
  AGRI_EXEMPT_CAP,
  AGRI_TAX_TYPES,
  calcSavings,
  DEFAULT_MONTHLY,
  DEFAULT_MONTHS,
  DEFAULT_RATE,
  isAgriTax,
  isTaxType,
  isValidSavingsInput,
  MAX_MONTHLY,
  MAX_MONTHS,
  MAX_RATE,
  PERIOD_PRESETS,
  periodLabel,
  TAX_TYPES,
  type AgriTaxType,
  type InterestType,
  type TaxType,
} from "@/lib/calc/savings";
import { useUrlState } from "@/lib/useUrlState";

/** Top-level 과세 구분 buttons; the three 조합 예탁금 rates share one button and get a second selector. */
type TopTax = "general" | "preferential" | "agri" | "exempt";
const TOP_ORDER: TopTax[] = ["general", "preferential", "agri", "exempt"];

const TOP_SHORT: Record<TopTax, string> = {
  general: "일반",
  preferential: "세금우대",
  agri: "조합",
  exempt: "비과세",
};

const TOP_HINTS: Record<TopTax, string> = {
  general: "이자소득세 14%와 지방소득세 1.4%를 떼요. 대부분의 적금이 여기에 해당해요. NH농협은행·Sh수협은행 적금도 일반과세예요.",
  preferential:
    "소득세 9%와 농어촌특별세 0.5%예요. 2014년까지 가입한 세금우대종합저축 세율이라 지금은 새로 가입할 수 없어요. 2027년 이후 가입하는 조합 예탁금도 9.5%인데, 그때는 ‘조합’에서 골라야 3천만원 한도까지 반영돼요.",
  agri: "지역 농·축협, 수협, 산림조합, 신협, 새마을금고 예탁금은 1인당 3천만원까지 세금 특례가 있어요. 세율은 가입한 해와 조합원 여부·소득으로 정해져요.",
  exempt: "비과세종합저축, 청년도약계좌·청년미래적금처럼 이자에 세금이 붙지 않는 경우예요.",
};

const AGRI_SHORT: Record<AgriTaxType, string> = {
  agri: "비과세 대상",
  agri2026: "2026년 가입",
  agri2027: "2027년 이후",
};

const AGRI_HINTS: Record<AgriTaxType, string> = {
  agri: "2025년까지 가입했거나, 2026~2028년에 가입했어도 농협·수협·산림조합 조합원 또는 직전 연도 총급여 7천만원(종합소득 6천만원) 이하라면 소득세 없이 농어촌특별세 1.4%만 내요.",
  agri2026:
    "농협·수협·산림조합 조합원이 아니면서 소득 기준을 넘는 사람이 2026년에 가입하면 소득세 5%와 농어촌특별세 0.9%를 내요. 지방소득세는 없고, 만기가 2027년 이후여도 가입한 해 세율 그대로예요.",
  agri2027:
    "농협·수협·산림조합 조합원이 아니면서 소득 기준을 넘는 사람이 2027년 이후 가입하면 소득세 9%와 농어촌특별세 0.5%예요(지방소득세 없음). 비과세 대상도 2029년 가입분은 5.9%, 2030년 이후 가입분은 9.5%예요.",
};

/** Truncate to an integer, keeping NaN (empty box) as is. */
function toInt(n: number): number {
  return Number.isFinite(n) ? Math.trunc(n) : n;
}

/** Two-line segment label: name on top, rate below. */
function RateLabel({ name, rate }: { name: string; rate: string }) {
  return (
    <span className="block leading-tight">
      <span className="block">{name}</span>
      <span className="block text-[0.8125rem] opacity-75 tabular">{rate}</span>
    </span>
  );
}

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
  const agriType: AgriTaxType | null = isAgriTax(taxType) ? taxType : null;
  const topTax: TopTax = isAgriTax(taxType) ? "agri" : taxType;
  const taxInfo = TAX_TYPES[taxType];
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
          <SegmentedField<TopTax>
            label="과세 구분"
            value={topTax}
            onChange={(t) => set({ x: t === "agri" ? (agriType ?? "agri") : t })}
            options={TOP_ORDER.map((t) => ({
              value: t,
              label: <RateLabel name={TOP_SHORT[t]} rate={TAX_TYPES[t === "agri" ? (agriType ?? "agri") : t].rateLabel} />,
            }))}
            hint={TOP_HINTS[topTax]}
          />
          {agriType ? (
            <SegmentedField<AgriTaxType>
              label="조합 예탁금 세율 (가입 시기·대상)"
              value={agriType}
              onChange={(x) => set({ x })}
              options={AGRI_TAX_TYPES.map((t) => ({
                value: t,
                label: <RateLabel name={AGRI_SHORT[t]} rate={TAX_TYPES[t].rateLabel} />,
              }))}
              hint={AGRI_HINTS[agriType]}
            />
          ) : null}
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
                    ? `3천만원까지 ${taxInfo.rateLabel} + 초과분 ${TAX_TYPES.general.rateLabel}`
                    : `${taxInfo.label} ${taxInfo.rateLabel}`
                }
                value={res.tax > 0 ? `−${formatWon(res.tax)}` : "0원"}
              />
              <StatementRow label="세후 이자" value={formatWon(res.afterTaxInterest)} emphasis />
            </StatementSection>
            {res.taxLines.length ? (
              <StatementSection title="세금 내역 (10원 미만 절사)">
                {/* 조합 예탁금 3천만원 초과 시 이자소득세가 두 줄(한도 안·초과분)이라 note까지 묶어 key로 쓴다. */}
                {res.taxLines.map((l) => (
                  <StatementRow key={`${l.label}|${l.note}`} label={l.label} note={l.note} value={formatWon(l.amount)} />
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
                조합 예탁금 세금 특례는 1인당 {koreanWon(AGRI_EXEMPT_CAP)}까지라서, 먼저 넣은 {koreanWon(AGRI_EXEMPT_CAP)}에 붙는
                이자 {formatWon(res.agriSplit.cappedInterest)}만 {taxInfo.rateLabel}로, 나머지{" "}
                {koreanWon(res.agriSplit.excessPrincipal)}에 붙는 이자 {formatWon(res.agriSplit.excessInterest)}은 일반과세{" "}
                {TAX_TYPES.general.rateLabel}로 계산했어요. 다른 조합 예탁금과 합산되고 실제 한도 적용 방식은 조합마다 다를 수
                있으니 가입할 곳에 확인하세요.
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
