"use client";

import { CalcLayout, CalcNotice } from "@/components/CalcLayout";
import { NumberField, SegmentedField } from "@/components/fields";
import { Statement, StatementFootnote, StatementHero, StatementRow, StatementSection } from "@/components/Statement";
import { formatNumber } from "@/lib/format";
import {
  bmiEquation,
  calcBmi,
  classifyBmi,
  formatBmi,
  formatKg,
  HEIGHT_RANGE,
  isValidInput,
  normalRangeGap,
  normalWeightRange,
  STANDARD_WEIGHT_FACTOR,
  standardWeight,
  WAIST_CUTOFF_CM,
  WEIGHT_RANGE,
  whoClass,
  type Sex,
} from "@/lib/calc/bmi";
import { useUrlState } from "@/lib/useUrlState";
import { BmiScale } from "./BmiScale";

const SEX_LABEL: Record<Sex, string> = { m: "남성", f: "여성" };

export function BmiCalculator({ initialHeight = 170, initialWeight = 65 }: { initialHeight?: number; initialWeight?: number }) {
  // URL keys: s = 성별, h = 키(cm), w = 몸무게(kg)
  const [st, set] = useUrlState({ s: "m" as Sex, h: initialHeight, w: initialWeight });
  const sex: Sex = st.s === "f" ? "f" : "m";
  const height = st.h;
  const weight = st.w;
  const valid = isValidInput(height, weight);

  return (
    <CalcLayout
      inputs={
        <>
          <SegmentedField<Sex>
            label="성별"
            value={sex}
            onChange={(s) => set({ s })}
            options={[
              { value: "m", label: "남성" },
              { value: "f", label: "여성" },
            ]}
            hint="표준체중과 복부비만 기준에만 쓰여요. BMI 판정 기준은 남녀가 같아요."
          />
          <NumberField
            label="키"
            value={height}
            onChange={(h) => set({ h })}
            unit="cm"
            decimals={1}
            max={HEIGHT_RANGE.max}
          />
          <NumberField
            label="몸무게"
            value={weight}
            onChange={(w) => set({ w })}
            unit="kg"
            decimals={1}
            max={WEIGHT_RANGE.max}
            hint="가벼운 옷차림으로 잰 몸무게를 넣으면 가장 정확해요."
          />
        </>
      }
      result={
        valid ? (
          <BmiStatement sex={sex} height={height} weight={weight} />
        ) : (
          <CalcNotice>
            키({HEIGHT_RANGE.min}~{HEIGHT_RANGE.max}cm)와 몸무게({WEIGHT_RANGE.min}~{WEIGHT_RANGE.max}kg)를 넣으면 바로
            계산해 드려요.
          </CalcNotice>
        )
      }
    />
  );
}

function BmiStatement({ sex, height, weight }: { sex: Sex; height: number; weight: number }) {
  const bmi = calcBmi(height, weight);
  const cls = classifyBmi(bmi);
  const eq = bmiEquation(bmi);
  const who = whoClass(bmi);
  const range = normalWeightRange(height);
  const gap = normalRangeGap(height, weight);
  const std = standardWeight(height, sex);
  const diff = Math.round((weight - std) * 10) / 10;
  const heightLabel = formatNumber(height, 1);

  return (
    <Statement title="BMI 판정 명세" caption="대한비만학회 2022 기준 · 성인">
      <StatementHero
        label={`키 ${heightLabel}cm · 몸무게 ${formatNumber(weight, 1)}kg의 BMI`}
        value={formatBmi(bmi)}
        sub={`${cls.label} (BMI ${cls.range})`}
      />
      <BmiScale bmi={bmi} />
      <StatementSection title="판정">
        <StatementRow label="대한비만학회 기준" value={cls.label} emphasis />
        <StatementRow label="WHO 국제 기준" note={`BMI ${who.range}`} value={who.label} />
        <StatementRow
          label="복부비만 기준"
          note={`허리둘레 · ${SEX_LABEL[sex]}`}
          value={`${WAIST_CUTOFF_CM[sex]}cm 이상`}
        />
      </StatementSection>
      <StatementSection title={`키 ${heightLabel}cm 기준 체중`}>
        <StatementRow
          label="정상 체중 범위"
          note="BMI 18.5~22.9"
          value={`${formatKg(range.min)}~${formatKg(range.max)}kg`}
          emphasis
        />
        <StatementRow
          label="정상 범위와 차이"
          value={
            gap.side === "inside"
              ? "범위 안"
              : gap.side === "above"
                ? `상한보다 ${formatKg(gap.kg)}kg 많음`
                : `하한보다 ${formatKg(gap.kg)}kg 적음`
          }
        />
        <StatementRow
          label={`표준체중 (${SEX_LABEL[sex]})`}
          note={`참고 · 키(m)² × ${STANDARD_WEIGHT_FACTOR[sex]}`}
          value={`${formatKg(std)}kg`}
        />
        <StatementRow
          label="표준체중 대비"
          note={`${diff < 0 ? "−" : "+"}${formatKg(Math.abs(diff))}kg`}
          value={`${formatNumber((weight / std) * 100)}%`}
        />
      </StatementSection>
      <StatementFootnote>
        {eq.heldBelow !== null &&
          `BMI는 소수 둘째 자리까지 ${eq.value}이고 ${eq.heldBelow} 미만이라 ${cls.label}에 해당해요. 다음 단계로 보이지 않도록 둘째 자리 이하는 버려 표시했어요. `}
        만 18세 이상 성인 기준의 참고용 결과예요. BMI는 근육과 지방을 구분하지 못해 근육량이 많거나 임신 중이면 실제와
        다를 수 있어요. 비만 여부와 건강 상태는 의료진과 상담해 확인하세요.
      </StatementFootnote>
    </Statement>
  );
}
