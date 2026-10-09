"use client";

import { CalcLayout, CalcNotice } from "@/components/CalcLayout";
import { NumberField, SegmentedField } from "@/components/fields";
import {
  Statement,
  StatementFootnote,
  StatementHero,
  StatementRow,
  StatementSection,
  StatementTotal,
} from "@/components/Statement";
import { formatNumber, formatWon, koreanWon } from "@/lib/format";
import {
  calcDeposit,
  COMPREHENSIVE_TAX_THRESHOLD,
  DEPOSIT_PROTECTION_LIMIT,
  isValidInput,
  MAX_MONTHS,
  MAX_PRINCIPAL,
  MAX_RATE_PCT,
  monthlyPayout,
  MUTUAL_EXEMPT_CAP,
  TAX_RULES,
  type InterestMethod,
  type TaxType,
} from "@/lib/calc/deposit";
import { useUrlState } from "@/lib/useUrlState";

type MethodKey = "s" | "c";
/**
 * URL value of `x`. 상호금융 예탁금은 가입 시기로 세율이 정해진다 (조특법 제89조의3):
 * m = 비과세(1.4%), n = 2026년 가입(5.9%), h = 2027년 이후 가입(9.5%).
 * p = 옛 세금우대종합저축 9.5% (3천만원 한도 분할 없음).
 */
type TaxKey = "g" | "p" | "m" | "n" | "h" | "e";
/** Top-level 과세 구분 buttons; 상호금융(m/n/h) shares one button and gets a second selector. */
type TopKey = "g" | "p" | "m" | "e";
type MutualKey = "m" | "n" | "h";

const TAX_BY_KEY: Record<TaxKey, TaxType> = {
  g: "general",
  p: "preferential",
  m: "mutual",
  n: "mutualLow",
  h: "mutualHigh",
  e: "exempt",
};
const TOP_LABEL: Record<TopKey, string> = { g: "일반", p: "세금우대", m: "상호금융", e: "비과세" };
const MUTUAL_LABEL: Record<MutualKey, string> = { m: "비과세", n: "2026년 가입", h: "2027년 이후" };

const TAX_HINT: Record<TopKey, string> = {
  g: "대부분의 은행·저축은행 예금은 일반과세(소득세 14% + 지방소득세 1.4%)예요. NH농협은행·Sh수협은행 예금도 일반과세예요.",
  p: "소득세 9%와 농어촌특별세 0.5%를 떼는 옛 세금우대종합저축(2014년까지 가입, 지금은 신규 가입 불가) 세율이에요. 2027년 이후 가입하는 상호금융 예탁금도 9.5%지만 3천만원 한도가 있으니 ‘상호금융’에서 골라요.",
  m: "지역 농·축협, 수협(조합), 신협, 산림조합, 새마을금고 예탁금은 1인당 3천만원까지 세금 특례가 있어요. 세율은 가입한 해와 비과세 대상인지로 정해져요. NH농협은행·Sh수협은행 예금은 일반과세예요.",
  e: "비과세종합저축처럼 이자에 세금이 붙지 않는 상품일 때 골라요.",
};

const MUTUAL_HINT: Record<MutualKey, string> = {
  m: "2025년까지 가입한 예탁금은 누구나 소득세가 비과세예요. 2026~2028년 가입분은 농·어·임업인 조합원이거나 직전 연도 총급여 7천만원(종합소득 6천만원) 이하인 사람만 비과세예요. 농어촌특별세 1.4%만 떼요.",
  n: "비과세 대상이 아닌 사람이 2026년에 가입한 예탁금이에요. 소득세 5%와 농어촌특별세 0.9%를 떼고 지방소득세는 없어요. 만기가 2027년이어도 가입한 해 세율이 그대로예요.",
  h: "비과세 대상이 아닌 사람이 2027년 이후 가입하는 예탁금이에요. 소득세 9%와 농어촌특별세 0.5%를 떼요. 비과세 대상자도 2029년 가입분은 5.9%, 2030년 이후 가입분은 9.5%예요.",
};

function pct(bp: number): string {
  return `${formatNumber(bp / 100, 2)}%`;
}

function monthsReading(n: number): string | null {
  if (!Number.isInteger(n) || n < 12) return null;
  const y = Math.floor(n / 12);
  const m = n % 12;
  return m ? `${y}년 ${m}개월` : `${y}년`;
}

export function DepositCalculator({ initialAmount = 10_000_000 }: { initialAmount?: number }) {
  // URL keys: a = 예치 금액(원), m = 기간(개월), r = 연 이자율(%), t = 이자 방식, x = 과세 구분
  const [s, set] = useUrlState({ a: initialAmount, m: 12, r: 3, t: "s" as MethodKey, x: "g" as TaxKey });
  const methodKey: MethodKey = s.t === "c" ? "c" : "s";
  const method: InterestMethod = methodKey === "c" ? "monthly" : "simple";
  const taxKey: TaxKey = s.x === "p" || s.x === "m" || s.x === "n" || s.x === "h" || s.x === "e" ? s.x : "g";
  const topKey: TopKey = taxKey === "n" || taxKey === "h" ? "m" : taxKey;
  const mutualKey: MutualKey = taxKey === "n" || taxKey === "h" ? taxKey : "m";
  const taxType = TAX_BY_KEY[taxKey];
  const rule = TAX_RULES[taxType];
  const general = TAX_RULES.general;

  const valid = isValidInput({ principal: s.a, months: s.m, ratePct: s.r });
  const r = valid ? calcDeposit({ principal: s.a, months: s.m, ratePct: s.r, method, taxType }) : null;
  const payout = r && method === "simple" ? monthlyPayout(r.principal, r.ratePct, taxType) : null;
  const split = r ? r.mutualExcess > 0 : false;

  const showIncome = rule.incomeBp > 0 || split;
  const showLocal = rule.local || split;
  const showRural = rule.ruralBp > 0;
  const capLabel = `${formatNumber(MUTUAL_EXEMPT_CAP / 10_000_000)}천만원`;
  const rateSummary = split
    ? `${capLabel}까지 ${pct(rule.totalBp)} + 초과분 ${pct(general.totalBp)}`
    : `${rule.name} ${pct(rule.totalBp)}`;

  return (
    <CalcLayout
      inputs={
        <>
          <NumberField
            label="예치 금액"
            value={s.a}
            onChange={(a) => set({ a })}
            unit="원"
            max={MAX_PRINCIPAL}
            reading={(n) => koreanWon(n)}
            presets={[
              { label: "1천만원", value: 10_000_000 },
              { label: "3천만원", value: 30_000_000 },
              { label: "5천만원", value: 50_000_000 },
              { label: "1억원", value: 100_000_000 },
            ]}
          />
          <NumberField
            label="예치 기간"
            value={s.m}
            onChange={(m) => set({ m })}
            unit="개월"
            max={MAX_MONTHS}
            reading={(n) => monthsReading(n)}
            presets={[
              { label: "3개월", value: 3 },
              { label: "6개월", value: 6 },
              { label: "1년", value: 12 },
              { label: "2년", value: 24 },
              { label: "3년", value: 36 },
            ]}
          />
          <NumberField
            label="연 이자율 (세전)"
            value={s.r}
            onChange={(v) => set({ r: v })}
            unit="%"
            decimals={2}
            max={MAX_RATE_PCT}
            presets={[2.5, 3, 3.5, 4].map((n) => ({ label: `${n}%`, value: n }))}
            hint="우대금리까지 더한 최종 금리를 넣어요."
          />
          <SegmentedField<MethodKey>
            label="이자 방식"
            value={methodKey}
            onChange={(t) => set({ t })}
            options={[
              { value: "s", label: "단리" },
              { value: "c", label: "월복리" },
            ]}
            hint="대부분의 정기예금은 단리예요. 상품설명서에 ‘월복리’라고 적혀 있을 때만 바꿔요."
          />
          <SegmentedField<TopKey>
            label="과세 구분"
            value={topKey}
            onChange={(k) => set({ x: k === "m" ? mutualKey : k })}
            options={(["g", "p", "m", "e"] as const).map((k) => ({
              value: k,
              label: (
                <span className="block leading-tight">
                  {TOP_LABEL[k]}
                  <span className="mt-0.5 block text-xs">
                    {pct(TAX_RULES[TAX_BY_KEY[k === "m" ? mutualKey : k]].totalBp)}
                  </span>
                </span>
              ),
            }))}
            hint={TAX_HINT[topKey]}
          />
          {topKey === "m" ? (
            <SegmentedField<MutualKey>
              label="상호금융 세율 (가입 시기)"
              value={mutualKey}
              onChange={(x) => set({ x })}
              options={(["m", "n", "h"] as const).map((k) => ({
                value: k,
                label: (
                  <span className="block leading-tight">
                    {MUTUAL_LABEL[k]}
                    <span className="mt-0.5 block text-xs">{pct(TAX_RULES[TAX_BY_KEY[k]].totalBp)}</span>
                  </span>
                ),
              }))}
              hint={MUTUAL_HINT[mutualKey]}
            />
          ) : null}
        </>
      }
      result={
        r ? (
          <Statement title="예금 이자 명세" caption={split ? `${rule.name} ${rateSummary}` : rateSummary}>
            <StatementHero
              label="만기 세후 이자"
              value={formatWon(r.netInterest)}
              sub={`만기에 원금 포함 ${koreanWon(r.maturity)}을 받아요`}
              stamp="만기"
            />
            <StatementSection title="이자 내역">
              <StatementRow label="원금" value={formatWon(r.principal)} />
              <StatementRow
                label="세전 이자"
                note={`${method === "simple" ? "단리" : "월복리"} · 연 ${formatNumber(r.ratePct, 2)}% · ${r.months}개월`}
                value={formatWon(r.grossInterest)}
              />
            </StatementSection>
            <StatementSection title="세금">
              {showIncome ? (
                <StatementRow
                  label="이자소득세"
                  note={
                    split
                      ? rule.incomeBp > 0
                        ? `${capLabel}까지 ${pct(rule.incomeBp)} + 초과분 ${pct(general.incomeBp)}`
                        : `${capLabel} 초과분 ${pct(general.incomeBp)}`
                      : pct(rule.incomeBp)
                  }
                  value={formatWon(r.incomeTax)}
                />
              ) : null}
              {showLocal ? (
                <StatementRow
                  label="지방소득세"
                  note={split ? "초과분 소득세의 10%" : "소득세의 10%"}
                  value={formatWon(r.localTax)}
                />
              ) : null}
              {showRural ? (
                <StatementRow
                  label="농어촌특별세"
                  note={split ? `${capLabel}까지 ${pct(rule.ruralBp)}` : pct(rule.ruralBp)}
                  value={formatWon(r.ruralTax)}
                />
              ) : null}
              <StatementRow
                label="세금 합계"
                note={split ? rateSummary : rule.detail}
                value={formatWon(r.totalTax)}
                emphasis
              />
            </StatementSection>
            <StatementSection title="받는 이자">
              <StatementRow label="세후 이자" value={formatWon(r.netInterest)} emphasis />
              <StatementRow label="월 평균 이자" note="세후 이자 ÷ 개월" value={formatWon(Math.floor(r.monthlyAvgNet))} />
              <StatementRow label="세후 수익률" note="연 단리 환산" value={`연 ${formatNumber(r.netAnnualRatePct, 2)}%`} />
            </StatementSection>
            {payout ? (
              <StatementSection title="매달 이자로 받으면 (월 이자 지급식)">
                <StatementRow label="매달 세전 이자" note="한 달 평균, 28일인 달은 약 8% 적어요" value={formatWon(payout.gross)} />
                <StatementRow label="매달 세후 이자" note={`세금 ${formatWon(payout.tax)}`} value={formatWon(payout.net)} />
              </StatementSection>
            ) : null}
            <StatementTotal label="만기 수령액" value={formatWon(r.maturity)} />
            <StatementFootnote>
              은행은 실제 예치일수를 365로 나눠 이자를 계산해요. 달마다 일수(28~31일)가 달라 실제 이자와 차이가 나고, 금액이
              클수록 차이도 커져요. 세금은 세목마다 10원 미만을 버렸어요.
            </StatementFootnote>
            {split ? (
              <StatementFootnote>
                상호금융 예탁금 세금 특례는 1인당 {capLabel}까지라서 넘는 {koreanWon(r.mutualExcess)}은 일반과세(
                {pct(general.totalBp)})로 계산했어요. 다른 조합에 맡긴 예탁금이 있으면 한도를 함께 써요.
              </StatementFootnote>
            ) : null}
            {r.comprehensiveGross > COMPREHENSIVE_TAX_THRESHOLD ? (
              <StatementFootnote>
                일반과세되는 이자가 한 해에 2천만원을 넘으면 금융소득종합과세 대상이 돼요. 다른 이자·배당과 합쳐 다음 해 5월에
                신고해야 할 수 있어요.
              </StatementFootnote>
            ) : null}
            {r.principal + r.grossInterest > DEPOSIT_PROTECTION_LIMIT ? (
              <StatementFootnote>
                예금자보호는 금융회사별로 원금과 이자를 합쳐 1억원까지예요. 넘는 부분은 보호받지 못하니 금융회사를 나눠 맡기는 걸
                고려해 보세요.
              </StatementFootnote>
            ) : null}
          </Statement>
        ) : (
          <CalcNotice>
            예치 금액과 기간(1~{MAX_MONTHS}개월), 연 이자율(최대 {MAX_RATE_PCT}%)을 넣으면 세후 이자를 바로 계산해 드려요.
          </CalcNotice>
        )
      }
    />
  );
}
