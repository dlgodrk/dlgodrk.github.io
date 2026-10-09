"use client";

import { useState } from "react";
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
import { formatPercent, formatWon, koreanWon } from "@/lib/format";
import {
  CARD_CREDIT_ANNUAL_LIMIT,
  generalVatComparison,
  getSimplifiedIndustry,
  PAYMENT_EXEMPT_THRESHOLD,
  SIMPLIFIED_INDUSTRIES,
  simplifiedStatus,
  simplifiedThreshold,
  simplifiedVat,
  splitFromSupply,
  splitFromTotal,
  splitFromVat,
  supplyRangeForVat,
  TAX_INVOICE_THRESHOLD,
  totalSplitAlternative,
  type SimplifiedIndustryId,
} from "@/lib/calc/vat";
import { useUrlState } from "@/lib/useUrlState";

/** s = 공급가액으로, t = 합계금액으로, v = 부가세액으로, g = 간이과세자 납부세액 */
type Mode = "s" | "t" | "v" | "g";
type Kind = "n" | "g";
type GeneralMode = Exclude<Mode, "g">;

const MAX_AMOUNT = 10_000_000_000_000; // 10조원
const MODES: Mode[] = ["s", "t", "v", "g"];

/** 만원 단위 숫자 → 빠른 입력 칩 */
const man = (n: number) => ({ label: koreanWon(n * 10_000), value: n * 10_000 });

/** 원 단위 정수로 맞춤. 붙여 넣은 "1,000.5"나 URL의 소수가 입력칸(반올림 표시)과 계산(절사)에서 달라지지 않게 한다. */
const int = (n: number) => (Number.isFinite(n) ? Math.trunc(n) : n);

export function VatCalculator() {
  // URL keys: m = mode, a = 금액(일반), s = 1년 공급대가, i = 업종, e = 과세유흥장소, p = 매입액, c = 카드 매출
  const [st, set] = useUrlState({
    m: "s" as Mode,
    a: 1_000_000,
    s: 60_000_000,
    i: "retail" as SimplifiedIndustryId,
    e: false as boolean,
    p: 0,
    c: 0,
  });
  // 간이과세자 화면에 다녀와도 보던 일반 계산 방식(공급가액·합계·부가세)으로 돌아오게 기억해 둔다.
  const [lastGeneral, setLastGeneral] = useState<GeneralMode>("s");
  const mode: Mode = MODES.includes(st.m) ? st.m : "s";
  const kind: Kind = mode === "g" ? "g" : "n";
  const amount = int(st.a);
  const simplified: SimplifiedState = { s: int(st.s), i: st.i, e: st.e, p: int(st.p), c: int(st.c) };

  return (
    <CalcLayout
      inputs={
        <>
          <SegmentedField<Kind>
            label="계산 종류"
            value={kind}
            onChange={(k) => {
              if (k === kind) return;
              if (k === "g") {
                if (mode !== "g") setLastGeneral(mode);
                set({ m: "g" });
              } else {
                set({ m: lastGeneral });
              }
            }}
            options={[
              { value: "n", label: "부가세 계산" },
              { value: "g", label: "간이과세자 납부세액" },
            ]}
          />
          {kind === "n" ? (
            <GeneralInputs mode={mode} amount={amount} set={set} />
          ) : (
            <SimplifiedInputs st={simplified} set={set} />
          )}
        </>
      }
      result={kind === "n" ? <GeneralResult mode={mode} amount={amount} /> : <SimplifiedResult st={simplified} />}
    />
  );
}

// ---------------------------------------------------------------------------
// 일반 부가세 계산 (공급가액 / 합계금액 / 부가세액)
// ---------------------------------------------------------------------------

const FIELD: Record<GeneralMode, { label: string; hint: string; presets: number[] }> = {
  s: {
    label: "공급가액 (부가세 별도)",
    hint: "세금계산서의 ‘공급가액’, 견적서의 ‘부가세 별도’ 금액을 넣어 주세요.",
    presets: [10, 50, 100, 300, 500, 1000],
  },
  t: {
    label: "합계금액 (부가세 포함)",
    hint: "카드 결제금액이나 ‘부가세 포함’ 가격처럼 세금이 들어간 금액이에요.",
    presets: [11, 55, 110, 330, 550, 1100],
  },
  v: {
    label: "부가세액",
    hint: "세금계산서의 ‘세액’ 칸에 적힌 금액이에요.",
    presets: [1, 5, 10, 30, 50, 100],
  },
};

function GeneralInputs({
  mode,
  amount,
  set,
}: {
  mode: Mode;
  amount: number;
  set: (patch: { m?: Mode; a?: number }) => void;
}) {
  const gm: GeneralMode = mode === "g" ? "s" : mode;
  const f = FIELD[gm];
  return (
    <>
      <SegmentedField<GeneralMode>
        label="알고 있는 금액"
        value={gm}
        onChange={(m) => set({ m })}
        options={[
          { value: "s", label: "공급가액" },
          { value: "t", label: "합계금액" },
          { value: "v", label: "부가세액" },
        ]}
      />
      <NumberField
        label={f.label}
        value={amount}
        onChange={(a) => set({ a: int(a) })}
        unit="원"
        max={MAX_AMOUNT}
        reading={(n) => koreanWon(n)}
        presets={f.presets.map(man)}
        hint={f.hint}
      />
    </>
  );
}

function GeneralResult({ mode, amount }: { mode: Mode; amount: number }) {
  const value = Math.trunc(amount);
  if (!Number.isFinite(amount) || value <= 0) {
    return <CalcNotice>금액을 1원 이상 넣으면 공급가액, 부가세, 합계를 바로 나눠 드려요.</CalcNotice>;
  }

  if (mode === "t") {
    const r = splitFromTotal(value);
    const alt = totalSplitAlternative(value);
    const supplyFloorAlt = alt?.method === "supplyFloor";
    return (
      <Statement title="부가세 역산 명세" caption="합계 ÷ 1.1 · 원 미만 반올림(관행)">
        <StatementHero
          label="공급가액"
          value={formatWon(r.supply)}
          sub={alt === null ? `부가세 ${formatWon(r.vat)}` : `부가세 ${formatWon(r.vat)} · 반올림 기준`}
          stamp="공급가"
        />
        <StatementSection title={alt === null ? "세금계산서에 적을 금액" : "반올림 (카드 영수증 방식)"}>
          <StatementRow
            label="공급가액"
            note={alt === null ? "합계 × 100/110" : "합계 × 100/110, 원 미만 반올림"}
            value={formatWon(r.supply)}
            emphasis
          />
          <StatementRow label="세액" note="합계 − 공급가액" value={formatWon(r.vat)} />
        </StatementSection>
        {alt === null ? null : (
          <StatementSection title={supplyFloorAlt ? "절사 (공급가액 원 미만 버림)" : "절사 (세액 원 미만 버림)"}>
            <StatementRow
              label="공급가액"
              note={supplyFloorAlt ? "합계 × 100/110, 원 미만 버림" : "합계 − 세액"}
              value={formatWon(alt.split.supply)}
            />
            <StatementRow
              label="세액"
              note={supplyFloorAlt ? "합계 − 공급가액" : "합계 ÷ 11, 원 미만 버림"}
              value={formatWon(alt.split.vat)}
            />
          </StatementSection>
        )}
        <StatementTotal label="합계금액" value={formatWon(r.total)} />
        <StatementFootnote>
          {alt === null
            ? "합계가 11로 나누어떨어져서 끝수를 어떻게 처리하든 결과가 같아요."
            : supplyFloorAlt
              ? "원 미만을 반올림할지 버릴지는 법에 정해진 방식이 없는 관행이라 1원 차이가 나요. 반올림 값은 카드 영수증 방식이고(세액을 합계 ÷ 11에서 버려도 같아요), 절사 값은 국세 과세표준의 1원 미만은 계산하지 않는다는 국고금 관리법 제47조 제2항에 맞춘 방식이에요. 거래처와 같은 방식으로 맞추면 돼요."
              : "원 미만을 반올림할지 버릴지는 법에 정해진 방식이 없는 관행이라 1원 차이가 나요. 반올림 값은 공급가액의 원 미만을 버린 결과(국고금 관리법 제47조 제2항)와 같고, 세액을 합계 ÷ 11에서 버리면 위 절사 값이 돼요. 거래처와 같은 방식으로 맞추면 돼요."}
        </StatementFootnote>
      </Statement>
    );
  }

  if (mode === "v") {
    const r = splitFromVat(value);
    const range = supplyRangeForVat(value);
    return (
      <Statement title="부가세 역산 명세" caption="공급가액 = 부가세 × 10">
        <StatementHero label="공급가액" value={formatWon(r.supply)} sub={`합계 ${formatWon(r.total)}`} />
        <StatementSection title="세금계산서 금액">
          <StatementRow label="공급가액" note="부가세 × 10" value={formatWon(r.supply)} emphasis />
          <StatementRow label="세액" value={formatWon(r.vat)} />
        </StatementSection>
        <StatementTotal label="합계금액" value={formatWon(r.total)} />
        <StatementFootnote>
          세액을 원 미만 버려서 적었다면 실제 공급가액은 {formatWon(range.min)}~{formatWon(range.max)} 사이일 수 있어요.
        </StatementFootnote>
      </Statement>
    );
  }

  const r = splitFromSupply(value);
  const alt = splitFromSupply(value, "round");
  return (
    <Statement title="부가세 계산 명세" caption="세율 10% · 원 미만 절사(관행)">
      <StatementHero label="부가세 (10%)" value={formatWon(r.vat)} sub={`합계 ${formatWon(r.total)}`} stamp="부가세" />
      <StatementSection title="세금계산서에 적을 금액">
        <StatementRow label="공급가액" value={formatWon(r.supply)} />
        <StatementRow label="세액" note="공급가액 × 10%" value={formatWon(r.vat)} emphasis />
      </StatementSection>
      <StatementTotal label="합계금액" value={formatWon(r.total)} />
      <StatementFootnote>
        {alt.vat !== r.vat
          ? `원 미만을 버렸어요. 반올림하면 세액 ${formatWon(alt.vat)}, 합계 ${formatWon(alt.total)}으로 1원 차이가 나요. 세금계산서 세액의 끝수 처리는 법에 따로 정해져 있지 않고, 실무에서는 버림을 많이 써요.`
          : `합계금액은 ${koreanWon(r.total)}이에요. 세액의 원 미만은 버리는 방식으로 계산해요.`}
      </StatementFootnote>
    </Statement>
  );
}

// ---------------------------------------------------------------------------
// 간이과세자 납부세액
// ---------------------------------------------------------------------------

type SimplifiedState = { s: number; i: SimplifiedIndustryId; e: boolean; p: number; c: number };

function SimplifiedInputs({
  st,
  set,
}: {
  st: SimplifiedState;
  set: (patch: Partial<SimplifiedState>) => void;
}) {
  const industry = getSimplifiedIndustry(st.i);
  return (
    <>
      <SelectField<SimplifiedIndustryId>
        label="업종"
        value={industry.id}
        onChange={(i) => set({ i })}
        options={SIMPLIFIED_INDUSTRIES.map((x) => ({ value: x.id, label: `${x.label} (${x.ratePct}%)` }))}
        hint={
          industry.rentalThreshold
            ? `부가가치율 ${industry.ratePct}%. 부동산임대업은 간이과세 기준이 4,800만원이에요.`
            : `부가가치율 ${industry.ratePct}%: ${industry.full}`
        }
      />
      {industry.rentalThreshold ? null : (
        <CheckboxField
          label="과세유흥장소(유흥주점 등)예요"
          checked={st.e}
          onChange={(e) => set({ e })}
          hint="유흥주점, 외국인전용 유흥음식점 같은 과세유흥장소는 간이과세 기준이 4,800만원이에요."
        />
      )}
      <NumberField
        label="1년 매출 (공급대가)"
        value={st.s}
        onChange={(s) => set({ s: int(s) })}
        unit="원"
        max={MAX_AMOUNT}
        reading={(n) => koreanWon(n)}
        presets={[3000, 4800, 6000, 8000, 10000].map(man)}
        hint="부가세를 포함한 1월~12월 매출 합계예요."
      />
      <NumberField
        label="세금계산서·카드로 받은 매입액 (선택)"
        value={st.p}
        onChange={(p) => set({ p: int(p) })}
        unit="원"
        max={MAX_AMOUNT}
        reading={(n) => (n > 0 ? koreanWon(n) : null)}
        hint="사업용으로 사면서 세금계산서, 신용카드 영수증, 지출증빙 현금영수증을 받은 금액(부가세 포함)이에요. 0.5%를 빼 줘요."
      />
      <NumberField
        label="카드·현금영수증 매출 (선택)"
        value={st.c}
        onChange={(c) => set({ c: int(c) })}
        unit="원"
        max={MAX_AMOUNT}
        reading={(n) => (n > 0 ? koreanWon(n) : null)}
        hint="위 매출 중 신용카드, 현금영수증, 간편결제로 받은 금액이에요. 1.3%를 빼 줘요. 직전 연도 매출이 4,800만원 이상이면 소매·음식·숙박업처럼 주로 소비자를 상대하는 업종만 공제돼요."
      />
    </>
  );
}

function SimplifiedResult({ st }: { st: SimplifiedState }) {
  const sales = Math.trunc(st.s);
  if (!Number.isFinite(st.s) || sales <= 0) {
    return <CalcNotice>1년 매출을 넣으면 간이과세자 부가세 납부세액을 어림해 드려요.</CalcNotice>;
  }
  const industry = getSimplifiedIndustry(st.i);
  const purchases = Number.isFinite(st.p) ? Math.max(0, st.p) : 0;
  const cardSales = Number.isFinite(st.c) ? Math.max(0, st.c) : 0;
  const r = simplifiedVat({ sales, ratePct: industry.ratePct, purchases, cardSales });
  const g = generalVatComparison({ sales, purchases, cardSales });
  // 부동산임대업·과세유흥장소는 간이과세 기준이 4,800만원 (부가가치세법 제61조 제1항 제3호)
  const rental = Boolean(industry.rentalThreshold);
  const lowThreshold = rental || st.e;
  const threshold = simplifiedThreshold(lowThreshold);
  const status = simplifiedStatus(sales, lowThreshold);
  const lostCredit = r.purchaseCredit + r.cardCredit - r.appliedCredit;

  return (
    <Statement title="간이과세자 부가세 명세" caption={`${industry.label} · 부가가치율 ${industry.ratePct}%`}>
      <StatementHero
        label="1년 납부세액 (예상)"
        value={formatWon(r.payable)}
        sub={
          r.exempt
            ? "그 해 매출 4,800만원 미만이라 납부 면제 (신고는 해야 해요)"
            : `매출의 ${formatPercent(r.payable / sales)}`
        }
        stamp="납부"
      />
      <StatementSection title="납부세액 계산">
        <StatementRow label="공급대가 (1년 매출)" value={formatWon(sales)} />
        <StatementRow
          label="납부세액"
          note={`매출 × ${industry.ratePct}% × 10%`}
          value={formatWon(r.grossTax)}
        />
        {r.purchaseCredit > 0 ? (
          <StatementRow label="매입 세금계산서 등 공제" note="매입액 × 0.5%" value={`−${formatWon(r.purchaseCredit)}`} />
        ) : null}
        {r.cardCredit > 0 ? (
          <StatementRow
            label="카드 매출 발행세액공제"
            note={`카드 매출 × 1.3%, 연 ${koreanWon(CARD_CREDIT_ANNUAL_LIMIT)} 한도`}
            value={`−${formatWon(r.cardCredit)}`}
          />
        ) : null}
        {lostCredit > 0 ? (
          <StatementRow label="공제 초과분 (소멸)" note="공제는 납부세액까지만, 환급 없음" value={`+${formatWon(lostCredit)}`} />
        ) : null}
        {r.exempt && r.taxAfterCredit > 0 ? (
          <StatementRow
            label="납부의무 면제"
            note={`그 해 매출 ${koreanWon(PAYMENT_EXEMPT_THRESHOLD)} 미만 (직전 연도 매출과 무관)`}
            value={`−${formatWon(r.taxAfterCredit)}`}
          />
        ) : null}
      </StatementSection>
      <StatementTotal label="낼 세액" value={formatWon(r.payable)} />
      <StatementSection title="비교와 다음 해 과세유형">
        <StatementRow
          label="일반과세자였다면"
          note={
            g.cardCredit > 0
              ? "매출세액 − 매입세액 − 카드 발행세액공제, 매입은 모두 공제 가정"
              : "매출세액 − 매입세액, 매입은 모두 공제 가정"
          }
          value={g.payable >= 0 ? formatWon(g.payable) : `환급 ${formatWon(-g.payable)}`}
        />
        <StatementRow
          label="다음 해 7월부터"
          note={`${lowThreshold ? (rental ? "부동산임대업" : "과세유흥장소") : "간이과세"} 기준 ${koreanWon(threshold)}`}
          value={status === "general" ? "일반과세" : "간이과세 유지"}
        />
        <StatementRow
          label="세금계산서 (다음 해 7월~)"
          note={
            status === "general"
              ? "일반과세자는 발급"
              : `간이과세자는 직전 연도 매출 ${koreanWon(TAX_INVOICE_THRESHOLD)} 이상이면 발급`
          }
          value={status === "simplifiedReceipt" ? "영수증만 발급" : "발급 대상"}
        />
      </StatementSection>
      <StatementFootnote>
        가산세, 7월에 미리 낸 예정부과세액, 전자세금계산서 발급세액공제는 빼고 어림했어요. 납부 면제는 그 해 매출로,
        다음 해 과세유형과 세금계산서 발급 여부는 이 매출을 다음 해의 ‘직전 연도 매출’로 보고 판단했어요(다음 해 7월
        1일~그다음 해 6월 30일 적용). 카드 발행세액공제 1.3%·연 1,000만원 한도는 2026년 12월 31일 공급분까지예요.
        소매·음식·숙박업처럼 주로 소비자를 상대하는 업종은 영수증 발급 대상이고, 직전 연도 매출이 4,800만원 이상인
        간이과세자와 일반과세자는 이런 업종만 카드 발행세액공제를 받아요.
      </StatementFootnote>
    </Statement>
  );
}
