"use client";

import { CalcLayout, CalcNotice } from "@/components/CalcLayout";
import { NumberField, SegmentedField } from "@/components/fields";
import { Statement, StatementFootnote, StatementHero, StatementRow, StatementSection } from "@/components/Statement";
import { formatNumber } from "@/lib/format";
import {
  areaBand,
  estimateSupplyPyeong,
  m2ToPyeong,
  pyeongToM2,
  round2,
  sizeClass,
  TYPICAL_EXCLUSIVE_RATIO,
  TYPICAL_OFFICETEL_RATIO,
} from "@/lib/calc/pyeong";
import { useUrlState } from "@/lib/useUrlState";

type Mode = "m2" | "py";

/** 2-decimal display that matches the static pages (13.915 → 13.92). */
const f2 = (n: number) => formatNumber(round2(n), 2);

export function PyeongCalculator({ initialM2 = 84 }: { initialM2?: number }) {
  // URL keys: m = mode, v = value
  const [s, set] = useUrlState({ m: "m2" as Mode, v: initialM2 });
  const mode = s.m === "py" ? "py" : "m2";
  const value = s.v;
  const valid = Number.isFinite(value) && value > 0;

  const m2 = mode === "m2" ? value : pyeongToM2(value);
  const py = mode === "m2" ? m2ToPyeong(value) : value;
  // Up to 30㎡ reads as 원룸·오피스텔, where listings use 계약면적 instead of 공급면적.
  const studio = areaBand(m2) === "studio";

  return (
    <CalcLayout
      inputs={
        <>
          <SegmentedField<Mode>
            label="변환 방향"
            value={mode}
            onChange={(m) => {
              // Keep the same physical area when switching direction.
              if (valid) set({ m, v: round2(m === "py" ? m2ToPyeong(value) : pyeongToM2(value)) });
              else set({ m });
            }}
            options={[
              { value: "m2", label: "㎡ → 평" },
              { value: "py", label: "평 → ㎡" },
            ]}
          />
          <NumberField
            label={mode === "m2" ? "면적 (제곱미터)" : "면적 (평)"}
            value={value}
            onChange={(v) => set({ v })}
            unit={mode === "m2" ? "㎡" : "평"}
            decimals={2}
            max={100000}
            presets={
              mode === "m2"
                ? [39, 49, 59, 74, 84, 101, 114].map((n) => ({ label: `${n}㎡`, value: n }))
                : [10, 18, 24, 25, 32, 34, 40].map((n) => ({ label: `${n}평`, value: n }))
            }
            hint={mode === "m2" ? "아파트 분양 공고의 ‘전용면적’ 숫자를 넣으면 흔히 말하는 평형도 함께 보여 드려요." : undefined}
          />
        </>
      }
      result={
        valid ? (
          <Statement title="면적 환산 명세" caption="1평 = 3.3058㎡">
            <StatementHero
              label={mode === "m2" ? `${formatNumber(value, 2)}㎡는` : `${formatNumber(value, 2)}평은`}
              value={mode === "m2" ? `${f2(py)}평` : `${f2(m2)}㎡`}
              sub={mode === "m2" ? `소수점 버림 ${Math.floor(py)}평` : `${formatNumber(m2 * 10.7639, 0)} 제곱피트`}
            />
            <StatementSection title="환산 내역">
              <StatementRow label="제곱미터" value={`${f2(m2)}㎡`} />
              <StatementRow label="평" value={`${f2(py)}평`} />
              <StatementRow label="제곱피트" value={`${formatNumber(m2 * 10.7639104, 1)}ft²`} />
            </StatementSection>
            {mode === "m2" && studio ? (
              <StatementSection title="원룸·오피스텔이라면 (전용면적으로 볼 때)">
                <StatementRow
                  label="추정 계약면적"
                  note={`전용률 ${Math.round(TYPICAL_OFFICETEL_RATIO * 100)}% 가정`}
                  value={`약 ${f2(m2ToPyeong(m2 / TYPICAL_OFFICETEL_RATIO))}평`}
                  emphasis
                />
                <StatementRow label="계약면적 (㎡)" value={`약 ${formatNumber(m2 / TYPICAL_OFFICETEL_RATIO, 1)}㎡`} />
                <StatementRow label="규모 구분" note="통상적 구분" value={sizeClass(m2)} />
              </StatementSection>
            ) : null}
            {mode === "m2" && !studio ? (
              <StatementSection title="아파트라면 (전용면적으로 볼 때)">
                <StatementRow
                  label="흔히 부르는 평형"
                  note={`전용률 ${Math.round(TYPICAL_EXCLUSIVE_RATIO * 100)}% 가정`}
                  value={`약 ${Math.round(estimateSupplyPyeong(m2))}평형`}
                  emphasis
                />
                <StatementRow label="추정 공급면적" value={`약 ${formatNumber(m2 / TYPICAL_EXCLUSIVE_RATIO, 1)}㎡`} />
                <StatementRow label="규모 구분" note="통상적 구분" value={sizeClass(m2)} />
              </StatementSection>
            ) : null}
            <StatementFootnote>
              {studio && mode === "m2"
                ? "오피스텔은 계약면적 기준 전용률이 보통 50~60%라 광고 면적이 건물마다 달라요. 정확한 면적은 분양 공고나 건축물대장을 확인하세요."
                : "평형은 단지마다 전용률이 달라 1~2평 차이 날 수 있어요. 정확한 공급면적은 분양 공고나 건축물대장을 확인하세요."}
            </StatementFootnote>
          </Statement>
        ) : (
          <CalcNotice>면적을 0보다 큰 숫자로 입력하면 바로 환산해 드려요.</CalcNotice>
        )
      }
    />
  );
}
