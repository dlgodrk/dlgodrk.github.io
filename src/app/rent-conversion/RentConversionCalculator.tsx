"use client";

import type { ReactNode } from "react";
import { CalcLayout, CalcNotice } from "@/components/CalcLayout";
import { NumberField, SegmentedField, type Preset } from "@/components/fields";
import {
  Statement,
  StatementFootnote,
  StatementHero,
  StatementRow,
  StatementSection,
} from "@/components/Statement";
import { formatKoreanDate, parseYMD } from "@/lib/date";
import { formatNumber, formatWon, koreanWon, manwonLabel } from "@/lib/format";
import {
  BOK_BASE_RATE_DATE,
  BOK_BASE_RATE_PCT,
  computeImpliedRate,
  computeToJeonse,
  computeToWolse,
  LEGAL_CAP_RATE,
  manToWon,
  MARKET_RATE,
  rateDisplayDigits,
} from "@/lib/calc/rent-conversion";
import { useUrlState } from "@/lib/useUrlState";

/** w = 전세 → 월세, j = 월세 → 전세, r = 전환율 계산 */
const MODES = ["w", "j", "r"] as const;
type Mode = (typeof MODES)[number];

function pct(n: number, digits = 2): string {
  return `${formatNumber(n, digits)}%`;
}

/** "+0.4%p" / "−0.2%p"; a difference that rounds to zero shows as "0%p" (never "−0%p"). */
function pctPoint(diff: number, digits: number): string {
  const text = formatNumber(Math.abs(diff), digits);
  return text === "0" ? "0%p" : `${diff > 0 ? "+" : "−"}${text}%p`;
}

function sameRate(a: number, b: number): boolean {
  return Number.isFinite(a) && Math.abs(a - b) < 1e-9;
}

const CAP_LABEL = pct(LEGAL_CAP_RATE);
const BASE_RATE_LABEL = `${BOK_BASE_RATE_PCT.toFixed(2)}%`;
const BASE_DATE_LABEL = formatKoreanDate(parseYMD(BOK_BASE_RATE_DATE)!, false);
const CAP_NOTE = `기준금리 ${BASE_RATE_LABEL} + 2%와 10% 중 낮은 값`;
const MARKET_LABEL = pct(MARKET_RATE.pct);
const MARKET_FROM = (() => {
  const d = parseYMD(MARKET_RATE.effective)!;
  return `${d.y}년 ${d.m}월`;
})();

function manPresets(values: number[]): Preset[] {
  return values.map((n) => ({ label: n === 0 ? "없음" : manwonLabel(n).replace(/원$/, ""), value: n }));
}

const JEONSE_PRESETS = manPresets([10_000, 20_000, 30_000, 50_000]);
const DEPOSIT_PRESETS = manPresets([0, 5_000, 10_000, 20_000]);
const RENT_PRESETS: Preset[] = [50, 80, 100, 150].map((n) => ({ label: `${n}만`, value: n }));
/** 전세 → 월세: the legal cap is the default and the answer most people need. */
const RATE_PRESETS: Preset[] = [
  { label: `법정 상한 ${CAP_LABEL}`, value: LEGAL_CAP_RATE },
  ...[4.5, 5.5, 6, 7].filter((r) => r !== LEGAL_CAP_RATE).map((r) => ({ label: pct(r), value: r })),
];
/** 월세 → 전세: no legal cap in this direction, so the market reference comes first and the cap is just a number. */
const JEONSE_RATE_PRESETS: Preset[] = [
  { label: `시장 평균 ${MARKET_LABEL}`, value: MARKET_RATE.pct },
  ...[...new Set([LEGAL_CAP_RATE, 5.5, 6, 7])]
    .filter((r) => r !== MARKET_RATE.pct)
    .sort((a, b) => a - b)
    .map((r) => ({ label: pct(r), value: r })),
];

function isMode(v: string): v is Mode {
  return (MODES as readonly string[]).includes(v);
}

export function RentConversionCalculator() {
  // URL keys: m = 모드, j = 전세보증금(만원), d = 월세 보증금(만원), w = 월세(만원),
  // r = 전세 → 월세 전환율(%), k = 월세 → 전세 전환율(%)
  const [s, set] = useUrlState({
    m: "w" as Mode,
    j: 30_000,
    d: 10_000,
    w: 80,
    r: LEGAL_CAP_RATE,
    k: MARKET_RATE.pct,
  });
  const mode: Mode = isMode(s.m) ? s.m : "w";

  const jeonse = manToWon(s.j);
  const deposit = manToWon(s.d);
  const rent = manToWon(s.w);
  const rateIn = mode === "j" ? s.k : s.r;
  const rateValid = Number.isFinite(rateIn) && rateIn > 0;

  // Keys keep each field's identity when the mode switch reorders them.
  const jeonseField = (label: string) => (
    <NumberField
      key="j"
      label={label}
      value={s.j}
      onChange={(j) => set({ j })}
      unit="만원"
      max={10_000_000}
      reading={(n) => manwonLabel(n)}
      presets={JEONSE_PRESETS}
    />
  );
  const depositField = (label: string, hint?: ReactNode) => (
    <NumberField
      key="d"
      label={label}
      value={s.d}
      onChange={(d) => set({ d })}
      unit="만원"
      max={10_000_000}
      reading={(n) => manwonLabel(n)}
      presets={DEPOSIT_PRESETS}
      hint={hint}
    />
  );
  // 4 decimals in 만원 = won-exact rent (83.3333만원 = 833,333원), so a rent from mode w can be typed back.
  const rentField = (label: string, hint?: ReactNode) => (
    <NumberField
      key="w"
      label={label}
      value={s.w}
      onChange={(w) => set({ w })}
      unit="만원"
      decimals={4}
      max={100_000}
      reading={(n) => koreanWon(manToWon(n))}
      presets={RENT_PRESETS}
      hint={hint}
    />
  );
  // Separate keys: 전세 → 월세 defaults to the legal cap, 월세 → 전세 to the market reference.
  const rateField = (hint: ReactNode) =>
    mode === "j" ? (
      <NumberField
        key="k"
        label="전환율 (연)"
        value={s.k}
        onChange={(k) => set({ k })}
        unit="%"
        decimals={2}
        max={30}
        presets={JEONSE_RATE_PRESETS}
        hint={hint}
      />
    ) : (
      <NumberField
        key="r"
        label="전환율 (연)"
        value={s.r}
        onChange={(r) => set({ r })}
        unit="%"
        decimals={2}
        max={30}
        presets={RATE_PRESETS}
        hint={hint}
      />
    );

  let inputs: ReactNode;
  let result: ReactNode;

  if (mode === "w") {
    inputs = (
      <>
        {jeonseField("지금 전세보증금")}
        {depositField(
          "바꾼 뒤 보증금 (월세 보증금)",
          "전세보증금 중 그대로 둘 금액이에요. 나머지가 월세로 바뀌어요. 전부 월세로 바꾸면 0을 넣으세요.",
        )}
        {rateField(
          `기본값은 법정 상한 ${CAP_LABEL}(기준금리 ${BASE_RATE_LABEL} + 2%)예요. 집주인과 합의한 비율이 있으면 바꿔 넣으세요.`,
        )}
      </>
    );
    const r = computeToWolse({ jeonse, deposit, ratePct: s.r });
    const rateDigits = r ? rateDisplayDigits(r.ratePct) : 2;
    result = r ? (
      <Statement title="전세 → 월세 환산 명세" caption={`법정 상한 연 ${CAP_LABEL} · ${BASE_DATE_LABEL} 기준금리`}>
        <StatementHero
          label="월세로 바꾸면 매달"
          value={formatWon(r.monthlyRent)}
          sub={`보증금 ${koreanWon(deposit)} · 연 ${koreanWon(r.monthlyRent * 12)}`}
          stamp="환산"
        />
        <StatementSection title="전환 내역">
          <StatementRow label="전세보증금" value={formatWon(jeonse)} note={koreanWon(jeonse)} />
          <StatementRow label="바꾼 뒤 보증금" value={formatWon(deposit)} note={koreanWon(deposit)} />
          <StatementRow label="월세로 바뀌는 금액" value={formatWon(r.converted)} note={koreanWon(r.converted)} />
          <StatementRow
            label="적용 전환율"
            value={`연 ${pct(r.ratePct, rateDigits)}`}
            note={sameRate(r.ratePct, LEGAL_CAP_RATE) ? "법정 상한" : "직접 입력"}
          />
          <StatementRow label="월세" value={formatWon(r.monthlyRent)} note="바뀌는 금액 × 전환율 ÷ 12" emphasis />
        </StatementSection>
        <StatementSection title="법정 상한 비교">
          <StatementRow label="법정 전환율 상한" value={`연 ${CAP_LABEL}`} note={CAP_NOTE} />
          <StatementRow label="상한 기준 최대 월세" value={formatWon(r.capMonthlyRent)} />
          <StatementRow label="판정" value={r.overCap ? "상한 초과" : "상한 이내"} emphasis={r.overCap} />
          {r.overCap ? (
            <StatementRow
              label="상한보다 많은 월세"
              value={formatWon(r.excessPerMonth)}
              note={`1년이면 ${koreanWon(r.excessPerMonth * 12)}`}
            />
          ) : null}
        </StatementSection>
        <StatementFootnote>
          법정 상한은 계약 기간 중이나 갱신 때 보증금을 월세로 바꾸는 경우에 적용돼요. 새 임차인과 처음 맺는 계약은
          시세대로 정해요. 월세는 원 미만을 버렸어요. 기준금리 {BASE_RATE_LABEL}는 {BASE_DATE_LABEL} 한국은행
          금융통화위원회가 정한 값이에요.
        </StatementFootnote>
      </Statement>
    ) : (
      <CalcNotice>
        {!(Number.isFinite(jeonse) && jeonse > 0)
          ? "전세보증금을 넣으면 월세로 바꾼 금액을 바로 계산해 드려요."
          : Number.isFinite(deposit) && deposit >= jeonse
            ? "바꾼 뒤 보증금은 전세보증금보다 적어야 해요."
            : !rateValid
              ? "전환율을 0보다 크게 넣어 주세요."
              : "바꾼 뒤 보증금을 넣어 주세요. 전부 월세로 바꾸면 0이에요."}
      </CalcNotice>
    );
  } else if (mode === "j") {
    inputs = (
      <>
        {depositField("지금 보증금")}
        {rentField("지금 월세")}
        {rateField(
          `월세를 전세로 바꾸는 방향은 법정 상한이 없어 보통 시장 전환율을 써요. 기본값 ${MARKET_LABEL}는 한국주택금융공사가 ${MARKET_FROM}부터 전세자금보증 심사에 쓰는 값(지역별 전월세전환율 6개월 평균)이에요. 전환율이 낮을수록 전세 환산액이 커져요.`,
        )}
      </>
    );
    const r = computeToJeonse({ deposit, monthlyRent: rent, ratePct: s.k });
    const diff = r ? r.jeonse - r.jeonseAtCap : 0;
    const rateNote = !r
      ? ""
      : sameRate(r.ratePct, MARKET_RATE.pct)
        ? `주택금융공사 ${MARKET_RATE.period} 기준`
        : sameRate(r.ratePct, LEGAL_CAP_RATE)
          ? "법정 상한과 같은 값"
          : "직접 입력";
    result = r ? (
      <Statement title="월세 → 전세 환산 명세" caption={`전환율 연 ${pct(r.ratePct)} 적용`}>
        <StatementHero label="전세로 환산하면" value={koreanWon(r.jeonse)} sub={formatWon(r.jeonse)} stamp="환산" />
        <StatementSection title="환산 내역">
          <StatementRow label="보증금" value={formatWon(deposit)} note={koreanWon(deposit)} />
          <StatementRow label="월세" value={formatWon(rent)} />
          <StatementRow label="연 월세" value={formatWon(r.annualRent)} note="월세 × 12" />
          <StatementRow label="적용 전환율" value={`연 ${pct(r.ratePct)}`} note={rateNote} />
          <StatementRow
            label="월세를 보증금으로 환산"
            value={formatWon(r.convertedDeposit)}
            note={`연 월세 ÷ ${pct(r.ratePct)}`}
          />
          <StatementRow label="전세 환산 보증금" value={formatWon(r.jeonse)} note={koreanWon(r.jeonse)} emphasis />
        </StatementSection>
        <StatementSection title="법정 상한 비교">
          <StatementRow label="법정 전환율 상한" value={`연 ${CAP_LABEL}`} note={CAP_NOTE} />
          <StatementRow label={`상한 ${CAP_LABEL}로 환산하면`} value={formatWon(r.jeonseAtCap)} note={koreanWon(r.jeonseAtCap)} />
          {diff !== 0 ? (
            <StatementRow
              label="상한 기준 환산액과 차이"
              value={`${diff > 0 ? "+" : "−"}${formatWon(Math.abs(diff))}`}
              note={diff > 0 ? "입력한 전환율이 낮아 더 커요" : "입력한 전환율이 높아 더 작아요"}
            />
          ) : null}
        </StatementSection>
        <StatementFootnote>
          법은 보증금을 월세로 바꾸는 방향만 제한해요. 월세를 전세로 바꿀 때는 당사자가 정하고, 같은 월세라도 전환율이
          높으면 전세 환산액이 작아져요. 시장 평균 {MARKET_LABEL}는 한국주택금융공사 {MARKET_RATE.period} 값이고, 반기마다
          바뀌어요. 동네 시세와 비교하려면 한국부동산원의 지역별 전환율을 넣어 보세요.
        </StatementFootnote>
      </Statement>
    ) : (
      <CalcNotice>
        {!(Number.isFinite(rent) && rent > 0)
          ? "월세를 넣으면 전세로 환산한 금액을 바로 계산해 드려요."
          : !rateValid
            ? "전환율을 0보다 크게 넣어 주세요."
            : "보증금을 넣어 주세요. 보증금이 없으면 0이에요."}
      </CalcNotice>
    );
  } else {
    inputs = (
      <>
        {jeonseField("원래 전세보증금")}
        {depositField("월세 보증금", "월세로 바꾼 뒤(또는 집주인이 제안한) 보증금이에요.")}
        {rentField("월세", "원 단위까지 맞추려면 소수점을 쓰세요. 83.3333만원은 83만 3,333원이에요.")}
      </>
    );
    const r = computeImpliedRate({ jeonse, deposit, monthlyRent: rent });
    const rateDigits = r ? rateDisplayDigits(r.ratePct) : 2;
    result = r ? (
      <Statement title="전환율 계산 명세" caption={`법정 상한 연 ${CAP_LABEL} · ${BASE_DATE_LABEL} 기준금리`}>
        <StatementHero
          label="실제 전환율"
          value={`연 ${pct(r.ratePct, rateDigits)}`}
          sub={
            r.overCap
              ? `법정 상한 ${CAP_LABEL}보다 월 ${formatWon(r.excessPerMonth)} 많아요`
              : `법정 상한 ${CAP_LABEL} 이내예요`
          }
          stamp="환산"
        />
        <StatementSection title="계산 내역">
          <StatementRow label="원래 전세보증금" value={formatWon(jeonse)} note={koreanWon(jeonse)} />
          <StatementRow label="월세 보증금" value={formatWon(deposit)} note={koreanWon(deposit)} />
          <StatementRow label="월세로 바뀐 금액" value={formatWon(r.converted)} note={koreanWon(r.converted)} />
          <StatementRow label="연 월세" value={formatWon(r.annualRent)} note={`월세 ${formatWon(rent)} × 12`} />
          <StatementRow
            label="전환율"
            value={`연 ${pct(r.ratePct, rateDigits)}`}
            note="연 월세 ÷ 바뀐 금액"
            emphasis
          />
        </StatementSection>
        <StatementSection title="법정 상한 비교">
          <StatementRow label="법정 전환율 상한" value={`연 ${CAP_LABEL}`} note={CAP_NOTE} />
          <StatementRow label="상한과 차이" value={pctPoint(r.diffPctPoint, rateDigits)} />
          <StatementRow label="상한 기준 최대 월세" value={formatWon(r.capMonthlyRent)} />
          <StatementRow label="판정" value={r.overCap ? "상한 초과" : "상한 이내"} emphasis={r.overCap} />
          {r.overCap ? (
            <StatementRow
              label="상한보다 더 내는 월세"
              value={formatWon(r.excessPerMonth)}
              note={`1년이면 ${koreanWon(r.excessPerMonth * 12)}`}
            />
          ) : null}
        </StatementSection>
        <StatementFootnote>
          {r.overCap
            ? "계약 기간 중이나 갱신 때 바꾼 월세라면 상한을 넘는 부분은 효력이 없고, 더 낸 월세는 돌려 달라고 청구할 수 있어요(주택임대차보호법 제10조의2). 새 임차인으로 처음 맺은 계약이라면 상한이 적용되지 않아요."
            : "법정 상한은 계약 기간 중이나 갱신 때 보증금을 월세로 바꾸는 경우에 적용돼요. 새 임차인과 처음 맺는 계약은 시세대로 정해요."}
        </StatementFootnote>
      </Statement>
    ) : (
      <CalcNotice>
        {!(Number.isFinite(jeonse) && jeonse > 0)
          ? "원래 전세보증금을 넣으면 전환율을 바로 계산해 드려요."
          : Number.isFinite(deposit) && deposit >= jeonse
            ? "월세 보증금은 원래 전세보증금보다 적어야 해요."
            : !(Number.isFinite(rent) && rent > 0)
              ? "월세를 넣어 주세요."
              : "월세 보증금을 넣어 주세요. 보증금이 없으면 0이에요."}
      </CalcNotice>
    );
  }

  return (
    <CalcLayout
      inputs={
        <>
          <SegmentedField<Mode>
            label="계산 방법"
            value={mode}
            onChange={(m) => set({ m })}
            options={[
              { value: "w", label: "전세 → 월세" },
              { value: "j", label: "월세 → 전세" },
              { value: "r", label: "전환율 계산" },
            ]}
          />
          {inputs}
        </>
      }
      result={result}
    />
  );
}
