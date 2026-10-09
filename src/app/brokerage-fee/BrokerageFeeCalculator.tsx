"use client";

import { CalcLayout, CalcNotice } from "@/components/CalcLayout";
import { CheckboxField, NumberField, SegmentedField } from "@/components/fields";
import {
  Statement,
  StatementFootnote,
  StatementHero,
  StatementRow,
  StatementSection,
  StatementTotal,
} from "@/components/Statement";
import { formatNumber, formatWon, koreanWon, manwonLabel } from "@/lib/format";
import {
  agreedRatePresets,
  computeBrokerageFee,
  DEAL_LABEL,
  feeRule,
  TARGET_LABEL,
  withVat,
  type Deal,
  type Target,
} from "@/lib/calc/brokerage-fee";
import { useUrlState } from "@/lib/useUrlState";
import { DraftNumberField } from "./DraftNumberField";

/** URL codes → internal values (keys stay short in the query string). */
const TARGET_CODES = { h: "house", o: "officetel", e: "other" } as const satisfies Record<string, Target>;
const DEAL_CODES = { s: "sale", j: "jeonse", m: "wolse" } as const satisfies Record<string, Deal>;
type TargetCode = keyof typeof TARGET_CODES;
type DealCode = keyof typeof DEAL_CODES;

const MAN = 10_000;
/**
 * Upper bound for the 협의 요율 box. Deliberately above every 상한요율 (max 0.9%): a rate the user
 * types above the 상한 is kept as typed, and the statement says it was replaced by the 상한요율,
 * instead of the box silently rewriting it.
 */
const RATE_INPUT_MAX = 10;

function pct(n: number): string {
  return `${formatNumber(n, 3)}%`;
}

export function BrokerageFeeCalculator({
  initialDeal = "s",
  initialAmount = 50_000,
}: {
  /** "s" 매매, "j" 전세, "m" 월세 */
  initialDeal?: DealCode;
  /** 거래금액 또는 보증금 (만원) */
  initialAmount?: number;
}) {
  // URL keys: t = 대상, k = 거래 종류, a = 매매가/전세보증금 (만원), d = 월세 보증금 (만원),
  // r = 월세 (만원), p = 협의 요율 (%), v = 부가세 포함
  const [s, set] = useUrlState({
    t: "h" as TargetCode,
    k: initialDeal as DealCode,
    a: initialAmount,
    d: 1_000,
    r: 50,
    p: NaN as number,
    v: false as boolean,
  });

  // Values come from the URL, so guard against unknown codes (and inherited keys like "toString").
  const tCode: TargetCode = Object.prototype.hasOwnProperty.call(TARGET_CODES, s.t) ? s.t : "h";
  const kCode: DealCode = Object.prototype.hasOwnProperty.call(DEAL_CODES, s.k) ? s.k : "s";
  const target = TARGET_CODES[tCode];
  const deal = DEAL_CODES[kCode];
  const isWolse = deal === "wolse";
  const isSale = deal === "sale";

  const amountWon = (isWolse ? s.d : s.a) * MAN;
  const rentWon = isWolse ? s.r * MAN : 0;
  const result = computeBrokerageFee({
    target,
    deal,
    amount: amountWon,
    monthlyRent: rentWon,
    agreedRate: s.p,
    includeVat: s.v,
  });
  // Rule for the input hint even before a valid amount is entered.
  const ruleRate = (result?.rule ?? feeRule(target, deal, Number.isFinite(amountWon) ? amountWon : 0)).rate;

  const payers = isSale ? "매도인·매수인" : "임대인·임차인";

  const targetHint =
    target === "house"
      ? "아파트·빌라·단독주택과 주택 분양권이에요. 건물 면적의 절반 이상이 주택이면 주택으로 봐요."
      : target === "officetel"
        ? "전용 85㎡ 이하이고 전용 부엌·수세식 화장실·목욕시설을 갖춘 오피스텔이에요. 그 밖의 오피스텔은 ‘토지·상가 등’으로 계산하세요."
        : "토지, 상가, 사무실, 공장과 주거용 요건을 갖추지 못한 오피스텔이에요. 0.9% 안에서 협의해요.";

  let heroSub: string;
  if (!result) heroSub = "";
  else if (result.agreedUsed && !result.agreedClamped)
    heroSub = `협의 요율 ${pct(result.appliedRate)} 적용 시 ${formatWon(result.fee)}${s.v ? ` · 부가세 포함 ${formatWon(result.total)}` : ""}`;
  else if (s.v) heroSub = `부가세 포함 ${formatWon(withVat(result.maxFee))} · ${payers} 각각`;
  else heroSub = `부가세 별도 · ${payers}이 각각 내는 최대 금액`;

  return (
    <CalcLayout
      inputs={
        <>
          <SegmentedField<TargetCode>
            label="대상"
            value={tCode}
            onChange={(t) => set({ t })}
            options={[
              { value: "h", label: "주택" },
              { value: "o", label: "오피스텔" },
              { value: "e", label: "토지·상가 등" },
            ]}
            hint={targetHint}
          />
          <SegmentedField<DealCode>
            label="거래 종류"
            value={kCode}
            onChange={(k) => set({ k })}
            options={[
              { value: "s", label: "매매·교환" },
              { value: "j", label: "전세" },
              { value: "m", label: "월세" },
            ]}
          />
          {isWolse ? (
            <>
              <NumberField
                label="보증금"
                value={s.d}
                onChange={(d) => set({ d })}
                unit="만원"
                max={10_000_000}
                reading={(n) => manwonLabel(n)}
                presets={[0, 500, 1_000, 2_000, 5_000, 10_000].map((n) => ({
                  label: n === 0 ? "없음" : manwonLabel(n).replace(/원$/, ""),
                  value: n,
                }))}
              />
              <DraftNumberField
                label="월세"
                value={s.r}
                onChange={(r) => set({ r })}
                unit="만원"
                decimals={1}
                max={100_000}
                reading={(n) => manwonLabel(n)}
                presets={[30, 50, 70, 100, 150].map((n) => ({ label: `${n}만`, value: n }))}
                hint="보증금 + 월세 × 100으로 거래금액을 환산해요. 그 합이 5천만원 미만이면 월세 × 70을 써요."
              />
            </>
          ) : (
            <NumberField
              label={isSale ? "거래금액 (매매가)" : "전세 보증금"}
              value={s.a}
              onChange={(a) => set({ a })}
              unit="만원"
              max={10_000_000}
              reading={(n) => manwonLabel(n)}
              presets={(isSale ? [10_000, 30_000, 50_000, 90_000, 100_000, 150_000] : [5_000, 10_000, 20_000, 30_000, 50_000]).map(
                (n) => ({ label: manwonLabel(n).replace(/원$/, ""), value: n }),
              )}
              hint={isSale ? "교환은 두 물건 중 비싼 쪽 가격, 분양권은 지금까지 낸 돈(대출 포함)에 프리미엄을 더한 금액이에요." : undefined}
            />
          )}
          <DraftNumberField
            label="협의 요율 (선택)"
            value={s.p}
            onChange={(p) => set({ p })}
            unit="%"
            decimals={3}
            max={RATE_INPUT_MAX}
            placeholder={`비우면 상한 ${pct(ruleRate)} 적용`}
            presets={[
              { label: `상한 ${pct(ruleRate)}`, value: NaN },
              ...agreedRatePresets(ruleRate).map((r) => ({ label: pct(r), value: r })),
            ]}
            hint="중개사와 상한보다 낮게 합의했다면 넣거나 골라 주세요. 상한요율보다 높게 넣으면 상한요율로 계산해요."
          />
          <CheckboxField
            label="부가세 10% 더하기"
            checked={s.v}
            onChange={(v) => set({ v })}
            hint="일반과세자 중개사무소는 보수의 10%를 부가세로 따로 받아요. 간이과세자는 다를 수 있어요."
          />
        </>
      }
      result={
        result ? (
          <Statement
            title="중개보수 명세"
            caption={`${TARGET_LABEL[target]} · ${DEAL_LABEL[deal]} · ${target === "house" ? "서울·경기 조례 기준" : "시행규칙 기준"}`}
          >
            <StatementHero label="중개보수 상한액 (한쪽 기준)" value={formatWon(result.maxFee)} sub={heroSub} stamp="상한" />

            <StatementSection title="거래금액">
              {result.conversion ? (
                <>
                  <StatementRow label="보증금" value={formatWon(Number.isFinite(amountWon) ? Math.max(0, amountWon) : 0)} />
                  <StatementRow
                    label={`월세 × ${result.conversion.multiplier}`}
                    value={formatWon(rentWon * result.conversion.multiplier)}
                    note={
                      result.conversion.multiplier === 70
                        ? `×100 합계 ${koreanWon(result.conversion.base100)}이 5천만원 미만`
                        : undefined
                    }
                  />
                </>
              ) : null}
              <StatementRow
                label={result.conversion ? "거래금액 (환산)" : "거래금액"}
                value={formatWon(result.dealAmount)}
                note={koreanWon(result.dealAmount)}
                emphasis
              />
            </StatementSection>

            <StatementSection title="상한 계산">
              <StatementRow label="상한요율" value={target === "other" ? `${pct(result.rule.rate)} 이내` : pct(result.rule.rate)} note={result.rule.label} />
              <StatementRow label="한도액" value={result.rule.cap !== null ? formatWon(result.rule.cap) : "없음"} />
              <StatementRow label="거래금액 × 상한요율" value={formatWon(result.rawMaxFee)} />
              <StatementRow
                label="중개보수 상한액"
                value={formatWon(result.maxFee)}
                note={result.capApplied ? "한도액까지만 받을 수 있어요" : undefined}
                emphasis
              />
            </StatementSection>

            <StatementSection title="낼 금액">
              {result.agreedUsed ? (
                <StatementRow
                  label="협의 요율"
                  value={pct(result.appliedRate)}
                  note={result.agreedClamped ? `입력한 ${pct(s.p)}가 상한을 넘어 상한요율로 계산` : undefined}
                />
              ) : null}
              <StatementRow
                label="계산된 보수"
                value={formatWon(result.fee)}
                note={result.agreedUsed && !result.agreedClamped ? undefined : "상한요율 적용"}
              />
              <StatementRow label="부가세" value={s.v ? formatWon(result.vat) : "더하지 않음"} note={s.v ? "보수의 10%" : undefined} />
            </StatementSection>
            <StatementTotal label="합계 (한쪽 기준)" value={formatWon(result.total)} />

            <StatementFootnote>
              상한액은 받을 수 있는 최대치예요. 실제 보수는 이 안에서 중개사와 협의해 정하고, {payers}이 각각 내요.
              {target === "house"
                ? " 주택 요율은 서울·경기 조례 기준이며 다른 시·도는 조례에 따라 다를 수 있어요."
                : " 오피스텔·토지·상가 요율은 공인중개사법 시행규칙으로 전국이 같아요."}
            </StatementFootnote>
          </Statement>
        ) : (
          <CalcNotice>
            {isWolse ? "보증금이나 월세를 넣으면" : "거래금액을 넣으면"} 중개보수 상한액을 바로 계산해 드려요.
          </CalcNotice>
        )
      }
    />
  );
}
