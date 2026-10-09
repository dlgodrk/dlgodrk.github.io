"use client";

import type { ReactNode } from "react";
import { CalcLayout, CalcNotice } from "@/components/CalcLayout";
import { CheckboxField, SegmentedField, SelectField } from "@/components/fields";
import {
  Statement,
  StatementFootnote,
  StatementHero,
  StatementRow,
  StatementSection,
  StatementTotal,
} from "@/components/Statement";
import { koreanWon } from "@/lib/format";
import {
  applyPercentChange,
  changeRate,
  changeWord,
  discountBreakdownWon,
  discountRateFrom,
  formatPct,
  formatSigned,
  formatValue,
  listPriceFrom,
  percentOf,
  percentPointDiff,
  ratioPercent,
  recoveryRate,
  roundToDigits,
  tidy,
  topicParticle,
  type Direction,
} from "@/lib/calc/percent";
import { useUrlState } from "@/lib/useUrlState";
import { DecimalField, DEFAULT_DECIMALS } from "./DecimalField";

type Mode = "of" | "ra" | "ch" | "in" | "dc";
type DiscountKind = "p" | "r" | "o";

const MODES: { value: Mode; label: string; caption: string }[] = [
  { value: "of", label: "A의 B%는 얼마? (퍼센트 값)", caption: "A의 B%는 얼마?" },
  { value: "ra", label: "A는 B의 몇 %? (비율)", caption: "A는 B의 몇 %?" },
  { value: "ch", label: "A → B 변화율 (증가율·감소율)", caption: "A → B 변화율" },
  { value: "in", label: "A에서 B% 증가·감소한 값", caption: "B% 증가·감소한 값" },
  { value: "dc", label: "할인가·할인율·정가", caption: "할인 계산" },
];

// URL keys: m = mode; o* = A의 B%, r* = 비율, c* = 변화율, i* = 증감, d* = 할인
const DEFAULTS = {
  m: "of",
  oa: 50000,
  ob: 15,
  ra: 45,
  rb: 60,
  ca: 25000,
  cb: 30000,
  cp: false,
  ia: 50000,
  ib: 10,
  id: "u",
  dk: "p",
  dl: 39000,
  dr: 20,
  d2: 0,
  ds: 29900,
};

type State = typeof DEFAULTS;
type Patch = (patch: Partial<State>) => void;
type Parts = { inputs: ReactNode; result: ReactNode };

const MAX_VALUE = 1_000_000_000_000;
const MAX_PCT = 1_000_000;
const TITLE = "퍼센트 계산 명세";

const fin = Number.isFinite;
const fv = (n: number) => formatValue(n);
/** Prices and payments are whole won: 원 미만 반올림. */
const won = (n: number) => `${formatValue(n, 0)}원`;
const pctPresets = (list: number[]) => list.map((n) => ({ label: `${n}%`, value: n }));

// Money boxes take whole won; every other box takes DEFAULT_DECIMALS fraction digits.
const MONEY_KEYS = ["dl", "ds"] as const;
const NUMBER_KEYS = ["oa", "ob", "ra", "rb", "ca", "cb", "ia", "ib", "dr", "d2"] as const;

/**
 * A shared or hand-edited link can carry more decimals than a box accepts (?dl=39000.5).
 * Round to the box precision so the number shown in the box is the number used.
 */
function normalize(raw: State): State {
  const s = { ...raw };
  for (const k of MONEY_KEYS) s[k] = roundToDigits(s[k], 0);
  for (const k of NUMBER_KEYS) s[k] = roundToDigits(s[k], DEFAULT_DECIMALS);
  return s;
}

function toMode(raw: string): Mode {
  return MODES.some((m) => m.value === raw) ? (raw as Mode) : "of";
}

function toKind(raw: string): DiscountKind {
  return raw === "r" || raw === "o" ? raw : "p";
}

export function PercentCalculator() {
  const [raw, set] = useUrlState(DEFAULTS);
  const s = normalize(raw);
  const mode = toMode(s.m);
  const parts =
    mode === "ra"
      ? ratioParts(s, set)
      : mode === "ch"
        ? changeParts(s, set)
        : mode === "in"
          ? increaseParts(s, set)
          : mode === "dc"
            ? discountParts(s, set)
            : percentOfParts(s, set);

  return (
    <CalcLayout
      inputs={
        <>
          <SelectField<Mode>
            label="무엇을 계산할까요?"
            value={mode}
            onChange={(m) => set({ m })}
            options={MODES.map(({ value, label }) => ({ value, label }))}
            hint="퍼센트 값, 비율, 변화율, 증가·감소, 할인까지 5가지를 골라 쓸 수 있어요."
          />
          {parts.inputs}
        </>
      }
      result={parts.result}
    />
  );
}

function caption(mode: Mode): string {
  return MODES.find((m) => m.value === mode)?.caption ?? "";
}

// ---------- (1) A의 B%는? ----------
function percentOfParts(s: State, set: Patch): Parts {
  const a = s.oa;
  const b = s.ob;
  const valid = fin(a) && fin(b);
  const r = percentOf(a, b);
  return {
    inputs: (
      <>
        <DecimalField key="oa" label="전체 값 (A)" value={a} onChange={(oa) => set({ oa })} max={MAX_VALUE} placeholder="예: 50000" />
        <DecimalField
          key="ob"
          label="퍼센트 (B)"
          value={b}
          onChange={(ob) => set({ ob })}
          unit="%"
          max={MAX_PCT}
          presets={pctPresets([5, 10, 15, 20, 30, 50])}
        />
      </>
    ),
    result: valid ? (
      <Statement title={TITLE} caption={caption("of")}>
        <StatementHero label={`${fv(a)}의 ${fv(b)}%는`} value={fv(r)} sub={`${fv(a)} × ${fv(b)} ÷ 100`} />
        <StatementSection title="계산 내역">
          <StatementRow label="전체 값 (A)" value={fv(a)} />
          <StatementRow label="퍼센트 (B)" value={formatPct(b)} note={`× ${fv(b / 100)}`} />
          <StatementRow label={`A의 ${fv(b)}%`} value={fv(r)} emphasis />
        </StatementSection>
        <StatementSection title="함께 보면 좋은 값">
          <StatementRow label={`A에 ${fv(b)}%를 더하면`} value={fv(applyPercentChange(a, b, "up"))} />
          <StatementRow label={`A에서 ${fv(b)}%를 빼면`} value={fv(applyPercentChange(a, b, "down"))} />
        </StatementSection>
        <StatementFootnote>
          퍼센트는 100을 기준으로 한 비율이라 B%를 구할 때는 B를 100으로 나눈 수를 곱해요 ({fv(b)}% → × {fv(b / 100)}).
        </StatementFootnote>
      </Statement>
    ) : (
      <CalcNotice>전체 값과 퍼센트를 넣으면 바로 계산해 드려요.</CalcNotice>
    ),
  };
}

// ---------- (2) A는 B의 몇 %? ----------
function ratioParts(s: State, set: Patch): Parts {
  const a = s.ra;
  const b = s.rb;
  const p = fin(a) && fin(b) ? ratioPercent(a, b) : null;
  const inputs = (
    <>
      <DecimalField key="ra" label="부분 값 (A)" value={a} onChange={(ra) => set({ ra })} max={MAX_VALUE} placeholder="예: 45" />
      <DecimalField key="rb" label="전체 값 (B)" value={b} onChange={(rb) => set({ rb })} max={MAX_VALUE} placeholder="예: 60" hint="기준이 되는 값이에요. 시험이라면 총 문항 수, 예산이라면 전체 예산." />
    </>
  );
  if (p === null) {
    return {
      inputs,
      result: (
        <CalcNotice>
          {fin(a) && b === 0 ? "전체 값이 0이면 비율을 계산할 수 없어요." : "두 값을 모두 넣으면 바로 계산해 드려요."}
        </CalcNotice>
      ),
    };
  }
  const versus = changeRate(b, a);
  const reverse = ratioPercent(b, a);
  return {
    inputs,
    result: (
      <Statement title={TITLE} caption={caption("ra")}>
        <StatementHero
          label={`${fv(a)}${topicParticle(fv(a))} ${fv(b)}의`}
          value={formatPct(p)}
          sub={`${fv(a)} ÷ ${fv(b)} × 100`}
        />
        <StatementSection title="계산 내역">
          <StatementRow label="부분 값 (A)" value={fv(a)} />
          <StatementRow label="전체 값 (B)" value={fv(b)} />
          <StatementRow label="비율" note="A ÷ B × 100" value={formatPct(p)} emphasis />
          <StatementRow label="소수로 나타내면" value={formatValue(tidy(a / b), 4)} />
          {a >= 0 && a <= b ? (
            <StatementRow label="나머지 비율" note={`B − A = ${fv(b - a)}`} value={formatPct(100 - p)} />
          ) : null}
        </StatementSection>
        <StatementSection title="기준을 바꿔 보면">
          {versus !== null ? (
            <StatementRow
              label="A는 B보다"
              value={versus === 0 ? "같아요" : `${formatPct(Math.abs(versus))} ${versus < 0 ? "적어요" : "많아요"}`}
            />
          ) : null}
          {reverse !== null ? <StatementRow label="B는 A의" value={formatPct(reverse)} /> : null}
        </StatementSection>
        <StatementFootnote>
          비율은 기준이 되는 값(B)으로 나눠요. 같은 두 수라도 무엇을 기준으로 삼느냐에 따라 결과가 달라져요.
        </StatementFootnote>
      </Statement>
    ),
  };
}

// ---------- (3) A → B 변화율, %p ----------
function changeParts(s: State, set: Patch): Parts {
  const a = s.ca;
  const b = s.cb;
  const isPct = s.cp;
  const unit = isPct ? "%" : undefined;
  const inputs = (
    <>
      <DecimalField
        key="ca"
        label={isPct ? "이전 비율 (A)" : "이전 값 (A)"}
        value={a}
        onChange={(ca) => set({ ca })}
        unit={unit}
        max={MAX_VALUE}
        allowNegative
        placeholder="예: 25000"
      />
      <DecimalField
        key="cb"
        label={isPct ? "이후 비율 (B)" : "이후 값 (B)"}
        value={b}
        onChange={(cb) => set({ cb })}
        unit={unit}
        max={MAX_VALUE}
        allowNegative
        placeholder="예: 30000"
      />
      <CheckboxField
        label="두 값이 퍼센트(%)예요"
        checked={isPct}
        onChange={(cp) => set({ cp })}
        hint="금리, 지지율, 점유율처럼 이미 퍼센트인 값을 비교하면 %p 차이도 함께 보여 드려요."
      />
    </>
  );
  if (!fin(a) || !fin(b)) {
    return { inputs, result: <CalcNotice>이전 값과 이후 값을 넣으면 바로 계산해 드려요.</CalcNotice> };
  }
  const r = changeRate(a, b);
  const diff = percentPointDiff(a, b);
  if (r === null && !isPct) {
    return {
      inputs,
      result: (
        <CalcNotice>
          이전 값이 0이면 변화율을 계산할 수 없어요. 0에서 늘어난 비율은 정의되지 않아서, 이럴 때는 증감량({formatSigned(diff)})으로
          말해요.
        </CalcNotice>
      ),
    };
  }
  const show = (n: number) => (isPct ? formatPct(n) : fv(n));
  const back = r !== null && r !== 0 ? changeRate(b, a) : null;

  let heroValue: string;
  let heroSub: string;
  if (isPct) {
    heroValue = diff === 0 ? "변화 없음" : `${fv(Math.abs(diff))}%p ${changeWord(diff, "상승", "하락")}`;
    heroSub =
      r === null
        ? "이전 값이 0%라 변화율은 계산할 수 없어요"
        : r === 0
          ? "변화율 0%"
          : `변화율로는 ${formatPct(Math.abs(r))} ${changeWord(r)}`;
  } else {
    const rate = r ?? 0;
    heroValue = rate === 0 ? "변화 없음" : `${formatPct(Math.abs(rate))} ${changeWord(rate)}`;
    heroSub = `증감량 ${formatSigned(diff)}${a > 0 && b >= 0 ? ` · ${fv(tidy(b / a))}배` : ""}`;
  }

  return {
    inputs,
    result: (
      <Statement title={TITLE} caption={caption("ch")}>
        <StatementHero label={`${show(a)} → ${show(b)}`} value={heroValue} sub={heroSub} />
        <StatementSection title="계산 내역">
          <StatementRow label="이전 값 (A)" value={show(a)} />
          <StatementRow label="이후 값 (B)" value={show(b)} />
          <StatementRow
            label={isPct ? "퍼센트포인트 차이" : "증감량"}
            note="B − A"
            value={isPct ? `${formatSigned(diff)}%p` : formatSigned(diff)}
            emphasis={isPct}
          />
          <StatementRow
            label="변화율"
            note="(B − A) ÷ A × 100"
            value={r === null ? "계산 불가" : `${formatSigned(r)}%`}
            emphasis={!isPct}
          />
          {!isPct && a > 0 && b >= 0 ? <StatementRow label="배율" note="B ÷ A" value={`${fv(tidy(b / a))}배`} /> : null}
          {back !== null ? (
            <StatementRow label="B에서 A로 돌아가려면" value={`${formatPct(Math.abs(back))} ${changeWord(back)}`} />
          ) : null}
        </StatementSection>
        <StatementFootnote>
          {isPct
            ? "%p(퍼센트포인트)는 두 퍼센트의 단순한 차이이고, %는 이전 값에 견준 상대적인 변화율이에요. 뉴스에서 ‘금리 0.25%p 인하’처럼 쓰는 이유예요."
            : a < 0
              ? "이전 값이 음수라 절댓값을 기준으로 계산했어요. 적자 축소처럼 부호가 걸린 경우에는 비율보다 증감량으로 설명하는 편이 정확해요."
              : "변화율의 기준은 이전 값(A)이에요. 두 값이 금리·지지율처럼 퍼센트라면 ‘두 값이 퍼센트(%)예요’를 켜서 %p 차이도 확인하세요."}
        </StatementFootnote>
      </Statement>
    ),
  };
}

// ---------- (4) A에서 B% 증가/감소 ----------
function increaseParts(s: State, set: Patch): Parts {
  const dir: Direction = s.id === "d" ? "down" : "up";
  const up = dir === "up";
  const a = s.ia;
  const b = s.ib;
  const inputs = (
    <>
      <SegmentedField<"u" | "d">
        label="늘릴까요, 줄일까요?"
        value={up ? "u" : "d"}
        onChange={(id) => set({ id })}
        options={[
          { value: "u", label: "증가 (+)" },
          { value: "d", label: "감소 (−)" },
        ]}
      />
      <DecimalField key="ia" label="원래 값 (A)" value={a} onChange={(ia) => set({ ia })} max={MAX_VALUE} placeholder="예: 50000" />
      <DecimalField
        key="ib"
        label={up ? "증가율 (B)" : "감소율 (B)"}
        value={b}
        onChange={(ib) => set({ ib })}
        unit="%"
        max={up ? MAX_PCT : 100}
        presets={pctPresets([5, 10, 15, 20, 30, 50])}
      />
    </>
  );
  if (!fin(a) || !fin(b) || b < 0) {
    return { inputs, result: <CalcNotice>원래 값과 퍼센트를 넣으면 바로 계산해 드려요.</CalcNotice> };
  }
  if (!up && b > 100) {
    return { inputs, result: <CalcNotice>감소율은 100%를 넘을 수 없어요. 100% 감소하면 0이 돼요.</CalcNotice> };
  }
  const result = applyPercentChange(a, b, dir);
  const delta = tidy(result - a);
  const factor = tidy((up ? 100 + b : 100 - b) / 100);
  const recover = recoveryRate(b, dir);
  const opposite: Direction = up ? "down" : "up";
  const roundTrip = applyPercentChange(result, b, opposite);

  return {
    inputs,
    result: (
      <Statement title={TITLE} caption={caption("in")}>
        <StatementHero
          label={`${fv(a)}에서 ${fv(b)}% ${up ? "증가" : "감소"}하면`}
          value={fv(result)}
          sub={`${fv(a)} × ${fv(factor)}`}
        />
        <StatementSection title="계산 내역">
          <StatementRow label="원래 값 (A)" value={fv(a)} />
          <StatementRow label="증감량" note={`A × ${fv(b)}%`} value={formatSigned(delta)} />
          <StatementRow label={up ? "증가한 값" : "감소한 값"} note={`A × ${fv(factor)}`} value={fv(result)} emphasis />
        </StatementSection>
        {b > 0 ? (
          <StatementSection title="원래 값으로 돌아가려면">
            <StatementRow
              label={`결과에서 ${up ? "줄여야" : "늘려야"} 할 비율`}
              value={recover === null ? "되돌릴 수 없어요" : formatPct(recover)}
            />
          </StatementSection>
        ) : null}
        <StatementFootnote>
          {a > 0 && b > 0 && b < 100
            ? `${fv(b)}% ${up ? "올린" : "내린"} 뒤 다시 ${fv(b)}% ${up ? "내리면" : "올리면"} ${fv(roundTrip)}, 처음보다 ${formatPct((b * b) / 100)} 작아요. 같은 비율로 오르내려도 제자리로 돌아오지 않아요.`
            : "증가는 1 + B ÷ 100을, 감소는 1 − B ÷ 100을 곱해서 계산해요."}
        </StatementFootnote>
      </Statement>
    ),
  };
}

// ---------- (5) 할인가 · 할인율 · 정가 ----------
function discountParts(s: State, set: Patch): Parts {
  const kind = toKind(s.dk);
  const money = (key: "dl" | "ds", label: string) => (
    <DecimalField
      key={key}
      label={label}
      value={s[key]}
      onChange={(n) => (key === "dl" ? set({ dl: n }) : set({ ds: n }))}
      unit="원"
      decimals={0}
      max={MAX_VALUE}
      reading={(n) => koreanWon(n)}
      placeholder="예: 39000"
    />
  );
  const rateField = (
    <DecimalField
      key="dr"
      label="할인율"
      value={s.dr}
      onChange={(dr) => set({ dr })}
      unit="%"
      max={100}
      presets={pctPresets([10, 15, 20, 30, 50, 70])}
    />
  );
  const inputs = (
    <>
      <SegmentedField<DiscountKind>
        label="무엇을 구할까요?"
        value={kind}
        onChange={(dk) => set({ dk })}
        options={[
          { value: "p", label: "판매가" },
          { value: "r", label: "할인율" },
          { value: "o", label: "정가" },
        ]}
        hint={
          kind === "p"
            ? "정가와 할인율로 할인 금액과 판매가를 구해요."
            : kind === "r"
              ? "정가와 판매가로 몇 % 할인인지 구해요."
              : "할인된 가격과 할인율로 원래 가격(정가)을 구해요."
        }
      />
      {kind === "p" ? (
        <>
          {money("dl", "정가")}
          {rateField}
          <DecimalField
            key="d2"
            label="추가 할인율 (선택)"
            value={s.d2}
            onChange={(d2) => set({ d2 })}
            unit="%"
            max={100}
            presets={pctPresets([0, 5, 10, 15, 20])}
            hint="쿠폰·카드 할인처럼 할인된 가격에서 한 번 더 깎아 주는 비율이에요."
          />
        </>
      ) : kind === "r" ? (
        <>
          {money("dl", "정가")}
          {money("ds", "판매가 (할인 후 가격)")}
        </>
      ) : (
        <>
          {money("ds", "판매가 (할인 후 가격)")}
          {rateField}
        </>
      )}
    </>
  );
  const cap = kind === "p" ? "판매가 구하기" : kind === "r" ? "할인율 구하기" : "정가 구하기";

  if (kind === "p") {
    const list = s.dl;
    const rate = s.dr;
    const extra = fin(s.d2) ? s.d2 : 0;
    if (!fin(list) || list <= 0 || !fin(rate) || rate < 0 || rate > 100 || extra < 0 || extra > 100) {
      return { inputs, result: <CalcNotice>정가와 할인율(0~100%)을 넣으면 판매가를 바로 계산해 드려요.</CalcNotice> };
    }
    const d = discountBreakdownWon(list, rate, extra);
    return {
      inputs,
      result: (
        <Statement title="할인 계산 명세" caption={cap}>
          <StatementHero
            label={`${won(list)}에서 ${fv(rate)}%${extra > 0 ? ` + 추가 ${fv(extra)}%` : ""} 할인하면`}
            value={won(d.final)}
            sub={`${won(d.totalDiscount)} 할인${extra > 0 ? ` · 실제 할인율 ${formatPct(d.effectiveRate)}` : ""}`}
            stamp="할인가"
          />
          <StatementSection title="할인 내역">
            <StatementRow label="정가" value={won(list)} />
            <StatementRow label={`할인 (${fv(rate)}%)`} value={`-${won(d.firstDiscount)}`} />
            {extra > 0 ? (
              <>
                <StatementRow label="1차 할인가" value={won(d.afterFirst)} />
                <StatementRow label={`추가 할인 (${fv(extra)}%)`} note="1차 할인가 기준" value={`-${won(d.extraDiscount)}`} />
              </>
            ) : null}
            <StatementRow label="총 할인 금액" value={won(d.totalDiscount)} />
            <StatementRow
              label="실제 할인율"
              note={extra > 0 ? `${fv(rate)}% + ${fv(extra)}% = ${fv(rate + extra)}%가 아니에요` : undefined}
              value={formatPct(d.effectiveRate)}
              emphasis={extra > 0}
            />
          </StatementSection>
          <StatementTotal label="판매가" value={won(d.final)} />
          <StatementFootnote>
            금액은 원 미만을 반올림해 보여 드려요. 매장에 따라 10원이나 100원 단위를 버리거나 반올림해서 실제 결제 금액과
            조금 다를 수 있어요.
          </StatementFootnote>
        </Statement>
      ),
    };
  }

  if (kind === "r") {
    const list = s.dl;
    const sale = s.ds;
    const rate = fin(list) && fin(sale) && sale >= 0 ? discountRateFrom(list, sale) : null;
    if (rate === null) {
      return { inputs, result: <CalcNotice>정가(0원 초과)와 판매가를 넣으면 할인율을 바로 계산해 드려요.</CalcNotice> };
    }
    const saved = tidy(list - sale);
    const paid = ratioPercent(sale, list) ?? 0;
    return {
      inputs,
      result: (
        <Statement title="할인 계산 명세" caption={cap}>
          <StatementHero
            label={`${won(list)} → ${won(sale)}`}
            value={rate > 0 ? `${formatPct(rate)} 할인` : rate < 0 ? `${formatPct(-rate)} 인상` : "할인 없음"}
            sub={rate > 0 ? `${won(saved)} 싸게 사요` : rate < 0 ? `정가보다 ${won(-saved)} 비싸요` : "정가와 같은 가격이에요"}
          />
          <StatementSection title="계산 내역">
            <StatementRow label="정가" value={won(list)} />
            <StatementRow label="판매가" value={won(sale)} />
            <StatementRow label="할인 금액" note="정가 − 판매가" value={won(saved)} />
            <StatementRow label="할인율" note="할인 금액 ÷ 정가 × 100" value={formatPct(rate)} emphasis />
            <StatementRow label="정가 대비 내는 비율" value={formatPct(paid)} />
          </StatementSection>
          <StatementFootnote>
            할인율은 판매가가 아니라 정가로 나눠서 구해요. 판매가로 나누면 실제보다 큰 할인율이 나와요.
          </StatementFootnote>
        </Statement>
      ),
    };
  }

  const sale = s.ds;
  const rate = s.dr;
  const exact = fin(sale) && sale >= 0 && fin(rate) && rate >= 0 ? listPriceFrom(sale, rate) : null;
  if (exact === null) {
    return {
      inputs,
      result: (
        <CalcNotice>
          {fin(rate) && rate >= 100
            ? "할인율이 100%면 판매가가 0원이라 정가를 알 수 없어요."
            : "판매가와 할인율(0~100% 미만)을 넣으면 정가를 바로 계산해 드려요."}
        </CalcNotice>
      ),
    };
  }
  // Whole won: 10,000원 at 30% is 14,285.71…원, shown as 14,286원.
  const list = roundToDigits(exact, 0);
  const discount = list - sale;
  const naive = roundToDigits(applyPercentChange(sale, rate, "up"), 0);
  return {
    inputs,
    result: (
      <Statement title="할인 계산 명세" caption={cap}>
        <StatementHero
          label={`${fv(rate)}% 할인해서 ${won(sale)}이라면`}
          value={won(list)}
          sub={`할인 금액 ${won(discount)}`}
          stamp="정가"
        />
        <StatementSection title="계산 내역">
          <StatementRow label="판매가" value={won(sale)} />
          <StatementRow label="할인율" value={formatPct(rate)} />
          <StatementRow
            label="정가"
            note={list === exact ? "판매가 ÷ (1 − 할인율)" : "판매가 ÷ (1 − 할인율), 원 미만 반올림"}
            value={won(list)}
            emphasis
          />
          <StatementRow label="할인 금액" value={won(discount)} />
        </StatementSection>
        <StatementFootnote>
          {rate === 0
            ? "할인율이 0%면 판매가가 곧 정가예요."
            : naive < list
              ? `판매가에 ${fv(rate)}%를 더하면 ${won(naive)}으로 정가보다 적게 나와요. 정가는 판매가를 (1 − 할인율)로 나눠서 구해요.`
              : "정가는 판매가에 할인율을 더하지 않고, 판매가를 (1 − 할인율)로 나눠서 구해요."}
        </StatementFootnote>
      </Statement>
    ),
  };
}
