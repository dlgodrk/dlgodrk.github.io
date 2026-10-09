import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber } from "@/lib/format";
import {
  BMI_CLASSES,
  BMI_PAGE_HEIGHTS,
  bmiEquation,
  bmiPerKg,
  calcBmi,
  classifyBmi,
  classWeightLabel,
  classWeightRange,
  defaultWeightFor,
  formatBmi,
  formatKg,
  getBmiClass,
  heightBand,
  heightM2,
  KOREAN_AVG_HEIGHT_CM,
  neighborHeights,
  normalRangeWidth,
  normalWeightRange,
  standardWeight,
  weightAtBmi,
  weightTableFor,
  whoClass,
  type BmiClassId,
} from "@/lib/calc/bmi";
import { BmiCalculator } from "../BmiCalculator";

// Only the listed heights exist; anything else is a 404 (required for static export).
export const dynamicParams = false;

export function generateStaticParams() {
  return BMI_PAGE_HEIGHTS.map((h) => ({ height: String(h) }));
}

type Props = { params: Promise<{ height: string }> };

function parse(raw: string): number | null {
  const n = Number(raw);
  return BMI_PAGE_HEIGHTS.includes(n) ? n : null;
}

const BASIS = "대한비만학회 비만 진료지침(2022) 성인 기준 · 2026년 10월 확인";

/** Every number a height page needs, computed once. */
function figures(h: number) {
  const normal = normalWeightRange(h);
  const min = (id: BmiClassId) => classWeightRange(h, getBmiClass(id)).min!;
  return {
    m: formatKg(standardWeight(h, "m")),
    f: formatKg(standardWeight(h, "f")),
    normal: `${formatKg(normal.min)}~${formatKg(normal.max)}kg`,
    underMax: formatKg(classWeightRange(h, getBmiClass("under")).max!),
    preMin: formatKg(min("pre")),
    ob1Min: formatKg(min("ob1")),
    ob2Min: formatKg(min("ob2")),
    ob3Min: formatKg(min("ob3")),
  };
}

type Figures = ReturnType<typeof figures>;

/** "2.5cm 작고" / "10.4cm 큽니다" (`end` = sentence end). Averages have a decimal, so never equal. */
function compareHeight(h: number, avg: number, end: boolean): string {
  const diff = h - avg;
  const cm = `${formatNumber(Math.abs(diff), 1)}cm`;
  if (diff > 0) return `${cm} ${end ? "큽니다" : "크고"}`;
  return `${cm} ${end ? "작습니다" : "작고"}`;
}

/**
 * The page's third paragraph, written per height band so pages differ in substance, not only in numbers:
 * how fast BMI moves, which 표준체중 people usually compare with, and the BMI caveat that matters most
 * at that height (both caveats are hedged: the height² scaling critique is a known limitation, not a guideline).
 */
function bandParagraph(h: number, x: Figures): string {
  const per5 = formatNumber(bmiPerKg(h, 5), 1);
  const width = formatKg(normalRangeWidth(h));
  switch (heightBand(h)) {
    case "short":
      return `키가 작을수록 몸무게 변화가 BMI에 크게 반영됩니다. 키 ${h}cm에서는 5kg 차이가 BMI 약 ${per5}에 해당하고(170cm는 약 ${formatNumber(bmiPerKg(170, 5), 1)}), 정상 범위의 폭도 ${width}kg으로 좁아 몇 kg만 달라져도 단계가 바뀔 수 있습니다. 또 BMI는 몸무게를 키의 제곱으로 나누는 단순한 지표라 키가 작은 사람은 같은 체형이어도 BMI가 조금 낮게 나온다는 지적이 있으니, 정상으로 나와도 허리둘레(여성 85cm, 남성 90cm 이상이면 복부비만)를 함께 확인하는 것이 좋습니다.`;
    case "female":
      return `이 키는 성인 여성 평균에 가까운 구간이라 여성 표준체중 ${x.f}kg을 기준으로 보는 경우가 많습니다. 정상 범위의 폭은 ${width}kg이고, 몸무게가 5kg 달라지면 BMI는 약 ${per5} 달라집니다. 같은 BMI라도 여성은 남성보다 체지방 비율이 높은 편이라, 체중이 정상 범위여도 허리둘레가 85cm 이상이면 복부비만으로 봅니다.`;
    case "male":
      return `이 키는 성인 남성 평균에 가까운 구간이라 남성 표준체중 ${x.m}kg이 흔히 기준으로 쓰입니다. 정상 범위의 폭은 ${width}kg이고, 5kg 차이는 BMI 약 ${per5}입니다. 근력 운동으로 근육량이 많으면 체지방이 적어도 BMI가 비만 전단계(이 키에서 ${x.preMin}kg 이상)로 나올 수 있으니 허리둘레(남성 90cm, 여성 85cm)와 체지방률을 함께 보는 것이 좋습니다.`;
    case "tall":
      return `성인 남성 평균보다 ${formatNumber(h - KOREAN_AVG_HEIGHT_CM.m, 1)}cm 큰 키라 정상 범위의 폭이 ${width}kg으로 넓고, 5kg 차이도 BMI 약 ${per5}에 그칩니다. 다만 BMI는 몸무게를 키의 제곱으로 나누기 때문에 키가 큰 사람은 같은 체형이어도 BMI가 조금 높게 나온다는 지적이 있습니다. 비만 전단계(${x.preMin}kg 이상)로 나오더라도 허리둘레와 체지방률을 함께 확인해 판단하는 것이 좋습니다.`;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const h = parse((await params).height);
  if (h === null) return {};
  const x = figures(h);
  return pageMetadata({
    // ≤ 45 chars for every page height (all weights here are 2-digit with one decimal).
    title: `키 ${h}cm 표준체중 남 ${x.m}·여 ${x.f}kg, 정상 ${x.normal}`,
    description: `키 ${h}cm의 표준체중은 남자 ${x.m}kg, 여자 ${x.f}kg입니다. 대한비만학회 기준 정상 체중(BMI 18.5~22.9)은 ${x.normal}이고, ${x.ob1Min}kg부터 비만(BMI 25 이상)입니다. 몸무게별 BMI 표로 확인하세요.`,
    path: `/bmi/${h}/`,
    keywords: [`키 ${h} 표준체중`, `${h}cm 정상체중`, `${h}cm 몸무게 BMI`, `키 ${h} 비만 기준`, "BMI 계산기"],
  });
}

export default async function BmiHeightPage({ params }: Props) {
  const h = parse((await params).height);
  if (h === null) notFound();
  const x = figures(h);
  const m = formatNumber(h / 100, 2);
  const m2 = formatNumber(heightM2(h), 4);
  const perKg = formatNumber(1 / heightM2(h), 2);
  const sampleWeight = Math.round(standardWeight(h, "m") / 5) * 5;
  const sampleBmi = calcBmi(h, sampleWeight);
  const sampleEq = bmiEquation(sampleBmi);
  const sampleCls = classifyBmi(sampleBmi);
  const sampleWho = whoClass(sampleBmi);
  const neighbors = neighborHeights(h, 4);
  const tableRows = weightTableFor(h).map((w) => {
    const b = calcBmi(h, w);
    return { w, b, cls: classifyBmi(b), who: whoClass(b), eq: bmiEquation(b) };
  });
  const heldRows = tableRows.filter((r) => r.eq.heldBelow !== null);

  // Copy is phrased with copulas (입니다/이고) so it reads correctly whatever the last digit of the BMI is.
  const sampleAnswer =
    sampleEq.heldBelow === null
      ? `BMI는 ${sampleWeight} ÷ ${m2} = ${sampleEq.value}입니다. ` +
        (sampleCls.label === sampleWho.label
          ? `대한비만학회와 WHO 기준 모두 ${sampleCls.label}입니다.`
          : `대한비만학회 기준 ${sampleCls.label}이고, WHO 기준으로는 ${sampleWho.label}입니다.`)
      : `BMI는 ${sampleWeight} ÷ ${m2} ≈ ${sampleEq.value}입니다. ${sampleEq.heldBelow} 미만이라 대한비만학회 기준 ${sampleCls.label}에 해당하고, WHO 기준으로는 ${sampleWho.label}입니다. 계산기와 표에는 다음 단계로 보이지 않도록 소수 둘째 자리 이하를 버린 값(${formatBmi(sampleBmi)})이 표시됩니다.`;

  const faq: FaqItem[] = [
    {
      q: `키 ${h}cm 표준체중은 몇 kg인가요?`,
      a: `남자는 ${m2} × 22 = ${x.m}kg, 여자는 ${m2} × 21 = ${x.f}kg입니다. 표준체중은 참고용 어림값이고, 건강 판정은 BMI 정상 범위(${x.normal})로 보는 것이 일반적입니다.`,
    },
    {
      q: `키 ${h}cm는 몇 kg부터 비만인가요?`,
      a: `대한비만학회 기준으로 BMI 25 이상이 비만이라 키 ${h}cm는 ${x.ob1Min}kg부터 1단계 비만입니다. ${x.preMin}kg부터는 비만 전단계(BMI 23 이상)이고, WHO 국제 기준으로는 ${x.ob2Min}kg(BMI 30)부터 비만입니다.`,
    },
    {
      q: `키 ${h}cm 저체중 기준은 몇 kg인가요?`,
      a: `BMI 18.5 미만이 저체중이라 키 ${h}cm는 ${x.underMax}kg 이하가 저체중에 해당합니다.`,
    },
    {
      q: `키 ${h}cm, 몸무게 ${sampleWeight}kg이면 BMI는 얼마인가요?`,
      a: sampleAnswer,
    },
  ];

  return (
    <ToolShell
      slug="bmi"
      path={`/bmi/${h}/`}
      extraCrumbs={[{ name: `키 ${h}cm`, path: `/bmi/${h}/` }]}
      h1={`키 ${h}cm 표준체중: 남 ${x.m}kg·여 ${x.f}kg (정상 ${x.normal})`}
      lead={`키 ${h}cm의 정상 체중 범위는 ${x.normal}(BMI 18.5~22.9)입니다. 표준체중은 남자 ${x.m}kg, 여자 ${x.f}kg입니다.`}
      basis={BASIS}
      calculator={<BmiCalculator initialHeight={h} initialWeight={defaultWeightFor(h)} />}
      faq={faq}
      appCategory="HealthApplication"
    >
      <h2>키 {h}cm 정상 체중과 표준체중 계산</h2>
      <p className="formula">
        정상 체중: {m}² × 18.5 = {formatNumber(weightAtBmi(h, 18.5), 2)}kg 이상, {m}² × 23 ={" "}
        {formatNumber(weightAtBmi(h, 23), 2)}kg 미만
        <br />
        표준체중: 남 {m2} × 22 = {x.m}kg &nbsp;|&nbsp; 여 {m2} × 21 = {x.f}kg
      </p>
      <p>
        키 {h}cm에서 BMI가 정상(18.5~22.9)인 몸무게를 0.1kg 단위로 정리하면 <strong>{x.normal}</strong>입니다. 대한비만학회
        기준으로 {x.preMin}kg부터 비만 전단계(BMI 23), {x.ob1Min}kg부터 1단계 비만(BMI 25), {x.ob2Min}kg부터 2단계
        비만(BMI 30), {x.ob3Min}kg부터 3단계 비만(BMI 35)이고, {x.underMax}kg 이하는 저체중입니다. WHO 국제 기준으로는{" "}
        {x.ob1Min}kg부터 과체중, {x.ob2Min}kg부터 비만입니다.
      </p>
      <p>
        키 {h}cm는 국가기술표준원 제8차 한국인 인체치수조사(20~69세)의 평균 키인 남성 {KOREAN_AVG_HEIGHT_CM.m}cm보다{" "}
        {compareHeight(h, KOREAN_AVG_HEIGHT_CM.m, false)}, 여성 {KOREAN_AVG_HEIGHT_CM.f}cm보다{" "}
        {compareHeight(h, KOREAN_AVG_HEIGHT_CM.f, true)}. 표준체중(남 {x.m}kg, 여 {x.f}kg)은 키(m)²에 22와 21을 곱한
        어림값이라 정상 범위 안쪽에 있고, 이 키에서는 몸무게 1kg이 BMI 약 {perKg}에 해당합니다.
      </p>
      <p>{bandParagraph(h, x)}</p>

      <h2>키 {h}cm 비만 단계별 체중</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">단계</th>
              <th scope="col">BMI</th>
              <th scope="col">몸무게</th>
            </tr>
          </thead>
          <tbody>
            {BMI_CLASSES.map((c) => (
              <tr key={c.id} className={c.id === "normal" ? "is-current" : undefined}>
                <td>{c.label}</td>
                <td>{c.range}</td>
                <td>{classWeightLabel(h, c)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>키 {h}cm 몸무게별 BMI 표</h2>
      <div className="table-wrap">
        <table className="data-table">
          <caption>
            진하게 표시한 줄이 정상 범위(BMI 18.5~22.9)입니다.
            {heldRows.length > 0 &&
              ` BMI가 단계 경계 바로 아래인 줄(${heldRows.map((r) => `${r.w}kg: ${r.eq.value}`).join(", ")})은 다음 단계로 보이지 않도록 소수 둘째 자리 이하를 버려 표시합니다.`}
          </caption>
          <thead>
            <tr>
              <th scope="col">몸무게</th>
              <th scope="col">BMI</th>
              <th scope="col">대한비만학회</th>
              <th scope="col">WHO</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map(({ w, b, cls, who }) => (
              <tr key={w} className={cls.id === "normal" ? "is-current" : undefined}>
                <td>{w}kg</td>
                <td>{formatBmi(b)}</td>
                <td>{cls.label}</td>
                <td>{who.label}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>{h}cm 전후 키의 정상 체중</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">키</th>
              <th scope="col">정상 체중</th>
              <th scope="col">표준체중 남</th>
              <th scope="col">표준체중 여</th>
            </tr>
          </thead>
          <tbody>
            {neighbors.map((n) => {
              const r = normalWeightRange(n);
              return (
                <tr key={n} className={n === h ? "is-current" : undefined}>
                  <td>{n === h ? `${n}cm` : <Link href={`/bmi/${n}/`}>{n}cm</Link>}</td>
                  <td>
                    {formatKg(r.min)}~{formatKg(r.max)}kg
                  </td>
                  <td>{formatKg(standardWeight(n, "m"))}kg</td>
                  <td>{formatKg(standardWeight(n, "f"))}kg</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="note">
        만 18세 이상 성인 기준의 참고용 수치입니다. 근육량, 나이, 임신 여부에 따라 해석이 달라질 수 있으니 비만 진단과
        치료는 의료진과 상담하세요. 계산 원리와 기준은 <Link href="/bmi/">BMI 계산기</Link>에서 자세히 볼 수 있습니다.
      </p>

      <h2>다른 키도 찾아보기</h2>
      <nav aria-label="키별 표준체중 페이지" className="link-grid">
        {BMI_PAGE_HEIGHTS.map((n) => (
          <Link key={n} href={`/bmi/${n}/`} aria-current={n === h ? "page" : undefined}>
            키 {n}cm
          </Link>
        ))}
      </nav>
    </ToolShell>
  );
}
