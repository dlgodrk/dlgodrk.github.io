"use client";

import { useId, type ReactNode } from "react";
import { CalcLayout, CalcNotice } from "@/components/CalcLayout";
import { CheckboxField, NumberField, SegmentedField, SelectField } from "@/components/fields";
import { Statement, StatementFootnote, StatementHero, StatementRow, StatementSection } from "@/components/Statement";
import { formatNumber, formatPercent } from "@/lib/format";
import {
  averageAfterBuy,
  breakevenRise,
  cellText,
  combineLots,
  decodeLots,
  DEFAULT_FEE_PCT,
  DIGITS,
  encodeLots,
  formatAmount,
  formatPrice,
  formatQty,
  formatSignedAmount,
  formatSignedPercent,
  isBlankLot,
  isCompleteLot,
  isMarket,
  MARKETS,
  MAX_BUY_ROWS,
  MAX_FEE_PCT,
  MAX_PRICE,
  MAX_QTY,
  parseCell,
  roundDigits,
  SELL_TAX_2026,
  sellTaxRate,
  sharesForTarget,
  valuation,
  withCosts,
  type Currency,
  type Lot,
  type Market,
  type Position,
} from "@/lib/calc/stock-average";
import { useUrlState } from "@/lib/useUrlState";

type Mode = "avg" | "goal";

/**
 * Example inputs per currency. Switching currency swaps any box that still holds the other example.
 * h, b and c are text so an emptied box stays empty in a shared link (a number key drops NaN and
 * the link would bring the example back).
 */
type Example = { h: string; b: string; c: string; rb: number; ta: number };
const EXAMPLES: Record<Currency, Example> = {
  won: { h: "72000x100", b: "60000x100", c: "63000", rb: 60000, ta: 66000 },
  usd: { h: "180x10", b: "150x10", c: "160", rb: 150, ta: 165 },
};

// URL keys: m = 계산 방식, u = 통화, h = 현재 보유("평단x수량"), b = 추가 매수 줄("단가x수량_단가x수량"),
// c = 현재가, f = 수수료·세금 반영, fr = 수수료율(%, text so an emptied box stays empty in a shared link),
// mk = 매도 시장, rb = (역산) 추가 매수가, ta = (역산) 목표 평단
const DEFAULTS = {
  m: "avg" as Mode,
  u: "won" as Currency,
  ...EXAMPLES.won,
  f: false,
  fr: cellText(DEFAULT_FEE_PCT),
  mk: "kospi" as Market,
};

const EMPTY_LOT: Lot = { price: NaN, qty: NaN };

const fin = Number.isFinite;

/** Tax rates always read with two decimals: 0.20%, 0.05%. */
function ratePct(ratio: number): string {
  return `${(ratio * 100).toFixed(2)}%`;
}

function riseValue(rise: number): string {
  if (!fin(rise)) return "-";
  return rise > 0 ? formatSignedPercent(rise) : "필요 없음";
}

/**
 * Bordered group of two boxes (단가·수량) with a small title row.
 * Like the shared fields, the hint is linked to the group with aria-describedby.
 */
function LotGroup({ title, action, hint, children }: { title: string; action?: ReactNode; hint?: ReactNode; children: ReactNode }) {
  const id = useId();
  const hintId = `${id}-hint`;
  return (
    <div
      role="group"
      aria-label={title}
      aria-describedby={hint ? hintId : undefined}
      className="grid gap-3 rounded-lg border border-rule p-3 sm:p-4"
    >
      <div className="flex min-h-6 items-center justify-between gap-2">
        <span className="text-sm font-semibold text-ink">{title}</span>
        {action}
      </div>
      <div className="grid items-start gap-3 sm:grid-cols-2">{children}</div>
      {hint ? (
        <p id={hintId} className="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function StockAverageCalculator() {
  const [s, set] = useUrlState(DEFAULTS);
  const mode: Mode = s.m === "goal" ? "goal" : "avg";
  const cur: Currency = s.u === "usd" ? "usd" : "won";
  const dg = DIGITS[cur];
  const unit = cur === "usd" ? "달러" : "원";

  // Round to each box's precision so a hand-edited link shows and uses the same number.
  const [h0] = decodeLots(s.h);
  const holding: Lot = { price: roundDigits(h0.price, dg.avg), qty: roundDigits(h0.qty, dg.qty) };
  const setHolding = (patch: Partial<Lot>) => set({ h: encodeLots([{ ...holding, ...patch }]) });
  const lots: Lot[] = decodeLots(s.b).map((l) => ({ price: roundDigits(l.price, dg.price), qty: roundDigits(l.qty, dg.qty) }));
  const setLots = (next: Lot[]) => set({ b: encodeLots(next) });
  const updateLot = (i: number, patch: Partial<Lot>) => setLots(lots.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const switchCurrency = (u: Currency) => {
    if (u === cur) return;
    const from = EXAMPLES[cur];
    const to = EXAMPLES[u];
    const swap = <K extends keyof Example>(k: K): Example[K] => (s[k] === from[k] ? to[k] : (s[k] as Example[K]));
    set({ u, h: swap("h"), b: swap("b"), c: swap("c"), rb: swap("rb"), ta: swap("ta") });
  };

  const common = (
    <>
      <SegmentedField<Mode>
        label="무엇을 계산할까요?"
        value={mode}
        onChange={(m) => set({ m })}
        options={[
          { value: "avg", label: "추가 매수 후 평단" },
          { value: "goal", label: "목표 평단 만들기" },
        ]}
      />
      <SegmentedField<Currency>
        label="종목 통화"
        value={cur}
        onChange={switchCurrency}
        options={[
          { value: "won", label: "원화 (국내주식)" },
          { value: "usd", label: "달러 (해외주식)" },
        ]}
        hint={cur === "usd" ? "달러 금액 그대로 계산해요. 환율과 환전 수수료는 넣지 않아요." : undefined}
      />
      <LotGroup title="현재 보유" hint="증권사 앱의 평균단가(매입가)와 보유 수량을 그대로 넣으세요.">
        <NumberField
          label="평균 단가"
          value={holding.price}
          onChange={(price) => setHolding({ price })}
          unit={unit}
          decimals={dg.avg}
          max={MAX_PRICE}
        />
        <NumberField
          label="보유 수량"
          value={holding.qty}
          onChange={(qty) => setHolding({ qty })}
          unit="주"
          decimals={dg.qty}
          max={MAX_QTY}
        />
      </LotGroup>
    </>
  );

  if (mode === "goal") {
    const buyPrice = roundDigits(s.rb, dg.price);
    const target = roundDigits(s.ta, dg.avg);
    return (
      <CalcLayout
        inputs={
          <>
            {common}
            <NumberField
              label="추가 매수가"
              value={buyPrice}
              onChange={(rb) => set({ rb })}
              unit={unit}
              decimals={dg.price}
              max={MAX_PRICE}
              hint="보통 지금 주가를 넣어요."
            />
            <NumberField
              label="목표 평단"
              value={target}
              onChange={(ta) => set({ ta })}
              unit={unit}
              decimals={dg.avg}
              max={MAX_PRICE}
              hint="목표 평단은 지금 평단과 추가 매수가 사이 값이어야 만들 수 있어요."
            />
          </>
        }
        result={<GoalResult avg={holding.price} qty={holding.qty} buyPrice={buyPrice} target={target} cur={cur} />}
      />
    );
  }

  const price = roundDigits(parseCell(s.c), dg.price);
  const feeOn = s.f;
  // A hand-edited link can carry any rate; clamp it like the box does while typing so the box shows the rate used.
  // An empty box (NaN) means no fee.
  const feeBox = Math.min(roundDigits(parseCell(s.fr), 4), MAX_FEE_PCT);
  const feePct = fin(feeBox) ? feeBox : 0;
  const market: Market = isMarket(s.mk) ? s.mk : "kospi";

  return (
    <CalcLayout
      inputs={
        <>
          {common}
          {lots.map((lot, i) => (
            <LotGroup
              key={i}
              title={`추가 매수 ${i + 1}`}
              action={
                lots.length > 1 ? (
                  <button
                    type="button"
                    className="min-h-8 rounded px-2 text-sm text-muted hover:text-ink hover:underline"
                    aria-label={`추가 매수 ${i + 1} 삭제`}
                    onClick={() => setLots(lots.filter((_, j) => j !== i))}
                  >
                    삭제
                  </button>
                ) : null
              }
            >
              <NumberField
                label="매수 단가"
                value={lot.price}
                onChange={(p) => updateLot(i, { price: p })}
                unit={unit}
                decimals={dg.price}
                max={MAX_PRICE}
              />
              <NumberField
                label="매수 수량"
                value={lot.qty}
                onChange={(q) => updateLot(i, { qty: q })}
                unit="주"
                decimals={dg.qty}
                max={MAX_QTY}
                reading={(q) => (q > 0 && lot.price > 0 ? `매수 금액 ${formatAmount(q * lot.price, cur)}` : null)}
              />
            </LotGroup>
          ))}
          <button
            type="button"
            className="btn-ghost justify-self-start disabled:cursor-not-allowed disabled:opacity-50"
            disabled={lots.length >= MAX_BUY_ROWS}
            onClick={() => setLots([...lots, EMPTY_LOT])}
          >
            + 추가 매수 줄 더하기 ({lots.length}/{MAX_BUY_ROWS})
          </button>
          <NumberField
            label="현재가 (선택)"
            value={price}
            onChange={(c) => set({ c: cellText(c) })}
            unit={unit}
            decimals={dg.price}
            max={MAX_PRICE}
            hint="넣으면 평가손익과 본전까지 필요한 상승률을 보여 드려요."
          />
          <CheckboxField
            label="수수료·세금도 반영하기"
            checked={feeOn}
            onChange={(f) => set({ f })}
            hint={
              cur === "usd"
                ? "사고팔 때 내는 수수료를 빼고 실제로 남는 손익을 보여 드려요."
                : "매매 수수료와 매도할 때 내는 증권거래세를 빼고 실제로 남는 손익을 보여 드려요."
            }
          />
          {feeOn ? (
            <>
              <NumberField
                label="증권사 수수료율 (매수·매도 각각)"
                value={feeBox}
                onChange={(fr) => set({ fr: cellText(fr) })}
                unit="%"
                decimals={4}
                max={MAX_FEE_PCT}
                presets={[0, 0.015, 0.1, 0.25].map((v) => ({ label: `${v}%`, value: v }))}
                hint={
                  cur === "usd"
                    ? "해외주식 수수료는 증권사와 이벤트마다 달라요. 거래 내역에 적힌 수수료율을 넣으세요."
                    : "비대면 계좌는 보통 0.015% 안팎이에요. 거래 내역에 적힌 수수료율을 넣으세요."
                }
              />
              {cur === "won" ? (
                <SelectField<Market>
                  label="매도 시장 (증권거래세)"
                  value={market}
                  onChange={(mk) => set({ mk })}
                  options={MARKETS.map((m) => ({
                    value: m,
                    label: m === "etf" ? SELL_TAX_2026[m].label : `${SELL_TAX_2026[m].label} · ${ratePct(sellTaxRate(m))}`,
                  }))}
                />
              ) : null}
            </>
          ) : null}
        </>
      }
      result={
        <AverageResult
          holding={holding}
          lots={lots}
          price={price}
          cur={cur}
          fee={feeOn ? { pct: feePct, market: cur === "won" ? market : null } : null}
        />
      }
    />
  );
}

// ---------- 추가 매수 후 평단 ----------

function AverageResult({
  holding,
  lots,
  price,
  cur,
  fee,
}: {
  holding: Lot;
  lots: Lot[];
  price: number;
  cur: Currency;
  /** market null = 해외주식 (국내 증권거래세 없음) */
  fee: { pct: number; market: Market | null } | null;
}) {
  const pos = combineLots([holding, ...lots]);
  if (!(pos.qty > 0)) {
    return <CalcNotice>현재 보유 평단·수량이나 추가 매수 단가·수량을 넣으면 평균 단가를 바로 계산해 드려요.</CalcNotice>;
  }
  const P = (n: number) => formatPrice(n, cur);
  const A = (n: number) => formatAmount(n, cur);
  const hasHolding = isCompleteLot(holding);
  const buys = lots.map((l, i) => ({ ...l, n: i + 1 })).filter((l) => isCompleteLot(l));
  const skipped = lots.map((l, i) => ({ l, n: i + 1 })).filter(({ l }) => !isCompleteLot(l) && !isBlankLot(l));
  const hasPrice = fin(price) && price > 0;
  const averaged = hasHolding && buys.length > 0;

  let sub: ReactNode = `총 ${formatQty(pos.qty, cur)} · ${A(pos.cost)}`;
  if (averaged) {
    const diff = pos.avg - holding.price;
    const same = P(pos.avg) === P(holding.price);
    sub = same
      ? "기존 평단과 같아요"
      : `기존 ${P(holding.price)}보다 ${A(Math.abs(diff))}(${formatPercent(Math.abs(diff) / holding.price)}) ${diff < 0 ? "낮아져요" : "높아져요"}`;
  }

  const notes: string[] = [];
  if (!hasHolding && !isBlankLot(holding)) notes.push("현재 보유는 평균 단가와 수량이 모두 있어야 계산에 들어가요.");
  if (skipped.length) notes.push(`추가 매수 ${skipped.map((x) => x.n).join(", ")}번 줄은 단가와 수량이 모두 있어야 계산에 들어가요.`);
  if (fee?.market === "etf") {
    notes.push(
      "국내 상장 ETF는 증권거래세가 없어요. 국내 주식형이 아닌 ETF(해외·채권·원자재 등)는 매매차익에 배당소득세 15.4%가 붙는데, 여기서는 빠져 있어요.",
    );
  } else if (fee?.market) {
    notes.push("증권거래세는 2026년 1월 1일 이후 매도분 세율이고, 원 미만 처리 방식에 따라 몇 원 차이 날 수 있어요.");
  }
  if (fee && !fee.market) notes.push("해외주식은 국내 증권거래세가 없어요. 양도소득세와 환전 비용은 빠져 있어요.");
  notes.push("평단과 손익을 미리 계산해 보는 도구일 뿐, 매수나 매도를 권하는 것이 아니에요.");

  return (
    <Statement title="평단가 계산 명세" caption={cur === "usd" ? "해외주식 · 달러 기준" : "국내주식 · 원화 기준"}>
      <StatementHero label={averaged ? "추가 매수 후 평균 단가" : "평균 단가"} value={P(pos.avg)} sub={sub} stamp="평단" />
      <StatementSection title="매수 내역">
        {hasHolding ? (
          <StatementRow
            label="현재 보유"
            note={`${P(holding.price)} × ${formatQty(holding.qty, cur)}`}
            value={A(holding.price * holding.qty)}
          />
        ) : null}
        {buys.map((b) => (
          <StatementRow key={b.n} label={`추가 매수 ${b.n}`} note={`${P(b.price)} × ${formatQty(b.qty, cur)}`} value={A(b.price * b.qty)} />
        ))}
        <StatementRow label="총 수량" value={formatQty(pos.qty, cur)} />
        <StatementRow label="총 매수 금액" value={A(pos.cost)} emphasis />
      </StatementSection>
      {hasPrice ? <PriceSection pos={pos} price={price} before={averaged ? holding.price : NaN} cur={cur} /> : null}
      {fee ? <CostSection pos={pos} price={hasPrice ? price : NaN} feePct={fee.pct} market={fee.market} cur={cur} /> : null}
      <StatementFootnote>{notes.join(" ")}</StatementFootnote>
    </Statement>
  );
}

function PriceSection({ pos, price, before, cur }: { pos: Position; price: number; before: number; cur: Currency }) {
  const P = (n: number) => formatPrice(n, cur);
  const v = valuation(pos, price);
  const beforeRise = breakevenRise(before, price);
  const riseNote =
    P(price) === P(pos.avg)
      ? "현재가와 평단이 같아요"
      : v.rise > 0
        ? `${P(price)} → ${P(pos.avg)}`
        : `현재가가 평단보다 ${formatPercent(price / pos.avg - 1)} 높아요`;
  return (
    <StatementSection title={`현재가 ${P(price)} 기준`}>
      <StatementRow label="평가금액" value={formatAmount(v.value, cur)} />
      <StatementRow label="평가손익" value={formatSignedAmount(v.pnl, cur)} emphasis />
      <StatementRow label="수익률" value={formatSignedPercent(v.rate)} />
      <StatementRow label="본전 상승률" note={riseNote} value={riseValue(v.rise)} emphasis />
      {fin(beforeRise) && before !== pos.avg ? (
        <StatementRow label="추가 매수 전 본전 상승률" note={`${P(price)} → ${P(before)}`} value={riseValue(beforeRise)} />
      ) : null}
    </StatementSection>
  );
}

function CostSection({
  pos,
  price,
  feePct,
  market,
  cur,
}: {
  pos: Position;
  price: number;
  feePct: number;
  market: Market | null;
  cur: Currency;
}) {
  const P = (n: number) => formatPrice(n, cur);
  const A = (n: number) => formatAmount(n, cur);
  const taxes = market ? SELL_TAX_2026[market] : { tradeTax: 0, ruralTax: 0 };
  const c = withCosts(pos, feePct / 100, taxes, price);
  const hasPrice = fin(price);
  const feeNote = `${formatNumber(feePct, 4)}%`;
  return (
    <StatementSection title={market ? `수수료·세금 반영 (${SELL_TAX_2026[market].short})` : "수수료 반영 (해외주식)"}>
      <StatementRow label="매수 수수료" note={feeNote} value={A(c.buyFee)} />
      <StatementRow label="수수료 포함 평단" value={P(c.effectiveAvg)} />
      {hasPrice ? (
        <>
          <StatementRow label="매도 수수료" note={feeNote} value={A(c.sellFee)} />
          {market ? (
            <>
              <StatementRow label="증권거래세" note={ratePct(taxes.tradeTax)} value={A(c.tradeTax)} />
              {taxes.ruralTax > 0 ? <StatementRow label="농어촌특별세" note={ratePct(taxes.ruralTax)} value={A(c.ruralTax)} /> : null}
            </>
          ) : null}
          <StatementRow label="지금 다 팔면 남는 손익" value={formatSignedAmount(c.netPnl, cur)} emphasis />
          <StatementRow label="실질 수익률" value={formatSignedPercent(c.netRate)} />
        </>
      ) : null}
      <StatementRow
        label="실질 본전 가격"
        note={market ? "수수료·세금까지 되찾는 매도가" : "수수료까지 되찾는 매도가"}
        value={P(c.breakevenPrice)}
        emphasis={!hasPrice}
      />
      {hasPrice ? <StatementRow label="실질 본전 상승률" value={riseValue(c.netRise)} /> : null}
    </StatementSection>
  );
}

// ---------- 목표 평단 역산 ----------

function GoalResult({
  avg,
  qty,
  buyPrice,
  target,
  cur,
}: {
  avg: number;
  qty: number;
  buyPrice: number;
  target: number;
  cur: Currency;
}) {
  const P = (n: number) => formatPrice(n, cur);
  const A = (n: number) => formatAmount(n, cur);
  const r = sharesForTarget({ avg, qty, buyPrice, target });
  switch (r.kind) {
    case "invalid":
      return <CalcNotice>지금 평단, 보유 수량, 추가 매수가, 목표 평단을 모두 0보다 크게 넣어 주세요.</CalcNotice>;
    case "already":
      return <CalcNotice>지금 평단이 이미 목표 평단과 같아요. 더 사지 않아도 돼요.</CalcNotice>;
    case "same-price":
      return (
        <CalcNotice>
          추가 매수가가 지금 평단({P(avg)})과 같아서 몇 주를 사도 평단은 그대로예요. 평단을 바꾸려면 더 싸거나 비싸게 사야 해요.
        </CalcNotice>
      );
    case "wrong-side":
      return r.direction === "down" ? (
        <CalcNotice>
          지금 평단({P(avg)})보다 싸게 사면 평단은 내려가기만 해요. 목표 평단을 {P(buyPrice)} 초과 {P(avg)} 미만으로 넣어 주세요.
        </CalcNotice>
      ) : (
        <CalcNotice>
          지금 평단({P(avg)})보다 비싸게 사면 평단은 올라가기만 해요. 목표 평단을 {P(avg)} 초과 {P(buyPrice)} 미만으로 넣어 주세요.
        </CalcNotice>
      );
    case "unreachable":
      return (
        <CalcNotice>
          목표 평단({P(target)})은 만들 수 없어요. {P(buyPrice)}에 아무리 많이 사도 평단은 {P(buyPrice)}에 가까워질 뿐 그 아래로
          내려가지 않아요. 목표를 {P(buyPrice)}보다 높게 잡아 보세요.
        </CalcNotice>
      );
    case "unbounded":
      return (
        <CalcNotice>
          추가 매수가({P(buyPrice)})가 목표 평단 이하라서 몇 주를 사도 평단이 목표를 넘지 않아요. 목표를 추가 매수가보다 낮게 잡으면
          최대 몇 주까지 살 수 있는지 알려 드려요.
        </CalcNotice>
      );
    case "none-fits":
      return (
        <CalcNotice>
          {P(buyPrice)}에 1주만 사도 평단이 목표({P(target)})를 넘어요. 1주를 사면 평단은 {P(r.oneShareAvg)} 수준이 돼요.
        </CalcNotice>
      );
  }

  const down = r.direction === "down";
  const fractional = Math.abs(r.exact - r.shares) > 1e-9;
  const rise = breakevenRise(r.resultAvg, buyPrice);
  const multiples = [...new Set([0.5, 1, 2, 3].map((k) => Math.max(1, Math.round(qty * k))))];
  return (
    <Statement title="목표 평단 계산 명세" caption={`${P(buyPrice)}에 추가 매수`}>
      <StatementHero
        label={down ? `평단 ${P(target)}까지 낮추는 데 필요한 수량` : `평단을 ${P(target)} 이하로 지키며 살 수 있는 최대 수량`}
        value={`${formatNumber(r.shares)}주`}
        sub={`추가 매수 금액 ${A(r.cost)}`}
      />
      <StatementSection title="매수 후">
        <StatementRow
          label="추가 매수 수량"
          note={fractional ? `계산값 ${formatNumber(r.exact, 2)}주를 ${down ? "올림" : "내림"}` : undefined}
          value={`${formatNumber(r.shares)}주`}
        />
        <StatementRow label="추가 매수 금액" value={A(r.cost)} />
        <StatementRow label="매수 후 총 수량" value={formatQty(r.totalQty, cur)} />
        <StatementRow label="총 매수 금액" value={A(avg * qty + r.cost)} />
        <StatementRow label="매수 후 평단" value={P(r.resultAvg)} emphasis />
        {down ? <StatementRow label="본전 상승률" note={`${P(buyPrice)} → ${P(r.resultAvg)}`} value={riseValue(rise)} /> : null}
      </StatementSection>
      <StatementSection title={`${P(buyPrice)}에 더 사면 평단은`}>
        {multiples.map((n) => (
          <StatementRow key={n} label={`${formatNumber(n)}주`} note={A(n * buyPrice)} value={P(averageAfterBuy(avg, qty, buyPrice, n))} />
        ))}
      </StatementSection>
      <StatementFootnote>
        1주 단위로, 수수료와 세금은 빼고 계산했어요. 평단 변화를 미리 보는 계산일 뿐, 매수를 권하는 것이 아니에요.
      </StatementFootnote>
    </Statement>
  );
}
