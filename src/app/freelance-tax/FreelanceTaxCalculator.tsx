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
import {
  bizWithholding,
  DAILY_DEDUCTION,
  grossForNet,
  OTHER_THRESHOLD_PAYMENT,
  PROPOSED_BIZ_RATE_PERCENT_2027,
  withholding,
  type IncomeKind,
  type Withholding,
} from "@/lib/calc/freelance-tax";
import { formatNumber, formatPercent, formatWon, koreanWon } from "@/lib/format";
import { rulePayMonth } from "@/lib/rates/insurance";
import { useToday } from "@/lib/useToday";
import { useUrlState } from "@/lib/useUrlState";

/** b = 사업소득 3.3%, o = 기타소득 8.8%, d = 일용근로소득 */
type KindKey = "b" | "o" | "d";
/** g = 세전 → 실수령, n = 실수령 → 세전 */
type Dir = "g" | "n";

const KIND_OF: Record<KindKey, IncomeKind> = { b: "biz", o: "other", d: "daily" };
const MAX_AMOUNT = 10_000_000_000; // 100억원
const MAX_DAYS = 365;
const DAILY_DEFAULT = 200_000;
const PAY_DEFAULT = 1_000_000;

const KIND_HINT: Record<KindKey, string> = {
  b: "프리랜서·알바처럼 일을 계속하고 받는 사업소득이에요. 소득세 3%와 지방소득세 0.3%를 떼요.",
  o: "강연료·원고료처럼 어쩌다 한 번 받는 기타소득이에요. 60%를 경비로 빼고 나머지에 22%를 매겨요.",
  d: "같은 곳에서 3개월 미만(건설은 1년 미만) 일하고 받는 일당이에요. 하루 15만원까지는 세금이 없어요.",
};

const STATEMENT_TITLE: Record<KindKey, string> = {
  b: "3.3% 원천징수 명세",
  o: "8.8% 기타소득 원천징수 명세",
  d: "일용근로소득 원천징수 명세",
};

const manPreset = (n: number) => ({ label: koreanWon(n * 10_000), value: n * 10_000 });
const PAY_PRESETS = [10, 30, 50, 100, 200, 300, 500].map(manPreset);
const DAILY_PRESETS = [15, 18, 20, 25, 30].map(manPreset);

export function FreelanceTaxCalculator({ initialAmount = PAY_DEFAULT }: { initialAmount?: number }) {
  // URL keys: k = 소득 종류, m = 계산 방향, a = 금액(원), d = 일용 일수
  const [s, set] = useUrlState({ k: "b" as KindKey, m: "g" as Dir, a: initialAmount, d: 1 });
  const { today } = useToday();

  const kindKey: KindKey = s.k === "o" || s.k === "d" ? s.k : "b";
  const kind = KIND_OF[kindKey];
  const isDaily = kindKey === "d";
  const reverse = !isDaily && s.m === "n";
  const amount = s.a;
  const days = s.d;

  // Rules of the visitor's current pay month (the site implements 2026; later dates are clamped to 2026-12).
  const payMonth = rulePayMonth(today.y, today.m);
  const [ruleYear, ruleMonth] = payMonth.split("-").map(Number);
  const basis = `${ruleYear}년 ${ruleMonth}월 지급분 기준`;
  const pastRuleYear = today.y > ruleYear;

  const amountValid = Number.isFinite(amount) && amount > 0 && amount <= MAX_AMOUNT;
  const daysValid = !isDaily || (Number.isInteger(days) && days >= 1 && days <= MAX_DAYS);

  let r: Withholding | null = null;
  let exact = true;
  let gross2027: number | null = null;
  let net2027: number | null = null;
  if (amountValid && daysValid) {
    if (reverse && (kind === "biz" || kind === "other")) {
      const sol = grossForNet(kind, amount);
      r = sol.result;
      exact = sol.exact;
      if (kind === "biz") gross2027 = grossForNet("biz", amount, PROPOSED_BIZ_RATE_PERCENT_2027).gross;
    } else {
      r = withholding(kind, amount, days);
      if (kind === "biz") net2027 = bizWithholding(amount, PROPOSED_BIZ_RATE_PERCENT_2027).net;
    }
  }

  const changeKind = (k: KindKey) => {
    if (k === kindKey) return;
    // 일당과 지급액은 크기가 달라서, 일용직으로 오가면 금액을 그 종류의 기본값(금액 페이지는 그 페이지 금액)으로 바꿔 둔다.
    if (k === "d") set({ k, m: "g", a: DAILY_DEFAULT, d: 1 });
    else if (kindKey === "d") set({ k, a: initialAmount });
    else set({ k });
  };

  return (
    <CalcLayout
      inputs={
        <>
          <SegmentedField<KindKey>
            label="소득 종류"
            value={kindKey}
            onChange={changeKind}
            options={[
              { value: "b", label: "3.3% 사업소득" },
              { value: "o", label: "8.8% 기타소득" },
              { value: "d", label: "일용직" },
            ]}
            hint={KIND_HINT[kindKey]}
          />
          {isDaily ? null : (
            <SegmentedField<Dir>
              label="계산 방향"
              value={reverse ? "n" : "g"}
              onChange={(m) => {
                if (m === s.m) return;
                // 같은 거래를 반대 방향에서 보도록 지금 결과 금액을 넘겨준다.
                if (r) set({ m, a: m === "n" ? r.net : r.gross });
                else set({ m });
              }}
              options={[
                { value: "g", label: "세전 → 실수령" },
                { value: "n", label: "실수령 → 세전" },
              ]}
            />
          )}
          <NumberField
            label={isDaily ? "일당 (세전)" : reverse ? "받고 싶은 실수령액" : "지급액 (세전)"}
            value={amount}
            onChange={(a) => set({ a })}
            unit="원"
            max={MAX_AMOUNT}
            reading={(n) => koreanWon(n)}
            presets={isDaily ? DAILY_PRESETS : PAY_PRESETS}
            hint={
              reverse
                ? "통장에 들어올 금액을 넣으면 계약서에 적을 세전 금액을 찾아 드려요."
                : isDaily
                  ? undefined
                  : "계약서나 지급명세서의 세전 금액을 넣어 주세요."
            }
          />
          {isDaily ? (
            <NumberField
              label="한 번에 받는 일수"
              value={days}
              onChange={(d) => set({ d })}
              unit="일"
              max={MAX_DAYS}
              hint="같은 일당으로 여러 날 치를 한꺼번에 받으면 그 일수를 넣어 주세요. 세금이 1,000원 미만인지는 한 번에 받는 금액으로 따져요."
            />
          ) : null}
        </>
      }
      result={
        r ? (
          <Statement title={STATEMENT_TITLE[kindKey]} caption={basis}>
            {reverse ? (
              <StatementHero
                label={`실수령 ${formatWon(amount)}을 받으려면`}
                value={formatWon(r.gross)}
                sub={`세전 금액에서 세금 ${formatWon(r.total)}을 떼면 ${formatWon(r.net)}`}
                stamp="세전"
              />
            ) : (
              <StatementHero
                label={isDaily && days > 1 ? `실수령액 (${formatNumber(days)}일 치)` : "실수령액"}
                value={formatWon(r.net)}
                sub={`세전 ${formatWon(r.gross)}에서 세금 ${formatWon(r.total)}을 뺀 금액`}
                stamp="실수령"
              />
            )}
            <StatementSection title="원천징수 내역">
              <DetailRows r={r} kindKey={kindKey} days={days} />
              <StatementRow
                label="소득세"
                note={incomeTaxNote(r, kindKey)}
                value={formatWon(r.incomeTax)}
              />
              <StatementRow label="지방소득세" note="소득세의 10%" value={formatWon(r.localTax)} />
            </StatementSection>
            <StatementTotal label="세금 합계" value={formatWon(r.total)} />
            <StatementSection>
              <StatementRow label={reverse ? "세전 지급액" : "실수령액"} value={formatWon(reverse ? r.gross : r.net)} emphasis />
              <StatementRow label="실효세율" note="세금 합계 ÷ 세전 금액" value={formatPercent(r.effectiveRate, 2)} />
            </StatementSection>
            {kindKey === "b" && (net2027 !== null || gross2027 !== null) ? (
              <StatementSection title="참고: 2.2% 인하안이 확정되면">
                <StatementRow
                  label={reverse ? "2.2% 기준 세전 금액" : "2.2% 기준 실수령액"}
                  note="2027년 지급분부터 예정, 국회 심의 중"
                  value={formatWon((reverse ? gross2027 : net2027) ?? 0)}
                />
              </StatementSection>
            ) : null}
            <StatementFootnote>
              {FOOTNOTE[kindKey]}
              {!exact ? " 이 실수령액이 정확히 나오는 세전 금액이 없어서 바로 위 금액으로 계산했어요." : ""}
              {pastRuleYear && kindKey === "b"
                ? ` 이 계산은 ${ruleYear}년 세법 기준이에요. ${ruleYear + 1}년 지급분은 3.3% → 2.2% 인하안의 확정 여부를 확인해 주세요.`
                : ""}
            </StatementFootnote>
          </Statement>
        ) : (
          <CalcNotice>
            {!daysValid
              ? "일수는 1일부터 365일까지 정수로 넣어 주세요."
              : isDaily
                ? "일당을 0보다 큰 금액으로 넣으면 바로 계산해 드려요."
                : "금액을 0보다 큰 숫자로 넣으면 바로 계산해 드려요."}
          </CalcNotice>
        )
      }
    />
  );
}

const FOOTNOTE: Record<KindKey, string> = {
  b: "소득세와 지방소득세는 각각 10원 미만을 버려요. 2024년 7월 지급분부터는 세금이 1,000원이 안 돼도 떼요. 떼인 3.3%는 다음 해 5월 종합소득세 신고 때 정산해서 돌려받거나 더 낼 수 있어요.",
  o: `필요경비 60%를 인정받는 강연료·원고료 같은 기타소득 기준이에요. 한 건이 ${formatWon(OTHER_THRESHOLD_PAYMENT)} 이하면 세금이 없어요. 1년 기타소득금액(받은 돈의 40%)이 300만원 이하면 8.8%로 끝낼지, 5월에 합산 신고할지 고를 수 있어요.`,
  d: "일용근로소득은 이렇게 떼면 세금이 끝나서 5월에 따로 신고하지 않아요. 소득세와 지방소득세는 각각 10원 미만을 버리고, 고용보험료(0.9%)는 넣지 않았어요.",
};

function incomeTaxNote(r: Withholding, kindKey: KindKey): string {
  if (r.exempt === "threshold") return `한 건 ${formatWon(OTHER_THRESHOLD_PAYMENT)} 이하라 과세최저한으로 0원`;
  if (r.exempt === "small") return `계산하면 ${formatWon(r.computedIncomeTax)}이지만 1,000원 미만이라 안 떼요`;
  if (kindKey === "o") return "기타소득금액의 20%";
  if (kindKey === "d") return r.taxBase > 0 ? "과세표준 × 6% − 세액공제 55%" : "과세표준이 0원";
  return "지급액의 3%";
}

function DetailRows({ r, kindKey, days }: { r: Withholding; kindKey: KindKey; days: number }) {
  if (kindKey === "o") {
    return (
      <>
        <StatementRow label="지급액 (세전)" value={formatWon(r.gross)} />
        <StatementRow label="필요경비" note="지급액의 60%" value={`−${formatWon(r.gross - r.taxBase)}`} />
        <StatementRow label="기타소득금액" value={formatWon(r.taxBase)} />
      </>
    );
  }
  if (kindKey === "d") {
    const perDay = days > 0 ? r.gross / days : r.gross;
    const deduction = Math.min(perDay, DAILY_DEDUCTION) * days;
    // 일당이 15만원 미만이면 공제는 일당까지만이라, 메모도 실제 공제액과 맞춘다.
    const times = days > 1 ? ` × ${formatNumber(days)}일` : "";
    const deductionNote = perDay < DAILY_DEDUCTION ? `일당 전액${times} (한도 하루 15만원)` : `하루 15만원${times}`;
    return (
      <>
        <StatementRow
          label="지급액 (세전)"
          note={days > 1 ? `일당 ${formatWon(perDay)} × ${formatNumber(days)}일` : undefined}
          value={formatWon(r.gross)}
        />
        <StatementRow
          label="근로소득공제"
          note={deductionNote}
          value={`−${formatWon(deduction)}`}
        />
        <StatementRow label="과세표준" value={formatWon(r.taxBase)} />
      </>
    );
  }
  return <StatementRow label="지급액 (세전)" value={formatWon(r.gross)} />;
}
