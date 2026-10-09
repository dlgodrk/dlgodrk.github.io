import type { Metadata } from "next";
import Link from "next/link";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import {
  BMI_CLASSES,
  BMI_PAGE_HEIGHTS,
  bmiEquation,
  calcBmi,
  classifyBmi,
  classWeightLabel,
  formatKg,
  normalWeightRange,
  standardWeight,
} from "@/lib/calc/bmi";
import { BmiCalculator } from "./BmiCalculator";

const N170 = normalWeightRange(170);
const NORMAL_170 = `${formatKg(N170.min)}~${formatKg(N170.max)}kg`;
const BASIS = "대한비만학회 비만 진료지침(2022) 성인 기준 · 2026년 10월 확인";

export const metadata: Metadata = pageMetadata({
  title: "BMI 계산기 - 비만도·표준체중 계산 (2026 기준)",
  description: `키와 몸무게로 BMI(체질량지수)와 비만 단계를 바로 계산합니다. 대한비만학회 기준 BMI 23 이상은 비만 전단계, 25 이상은 비만이며 키 170cm의 정상 체중은 ${NORMAL_170}입니다. 표준체중과 WHO 기준도 비교해 보세요.`,
  path: "/bmi/",
  keywords: ["BMI 계산기", "비만도 계산기", "체질량지수 계산", "표준체중 계산기", "BMI 정상 범위", "비만 기준"],
});

const FAQ: FaqItem[] = [
  {
    q: "BMI 정상 범위는 얼마인가요?",
    a: "대한비만학회 기준으로 BMI 18.5~22.9가 정상입니다. 18.5 미만은 저체중, 23~24.9는 비만 전단계, 25 이상은 비만입니다. WHO 국제 기준은 18.5~24.9를 정상으로 봅니다.",
  },
  {
    q: "BMI 25면 비만인가요?",
    a: "국내 기준으로는 그렇습니다. 대한비만학회는 BMI 25~29.9를 1단계 비만으로 분류합니다. WHO 기준으로는 BMI 25~29.9가 과체중이고, 30 이상부터 비만입니다.",
  },
  {
    q: "키 170cm 표준체중은 몇 kg인가요?",
    a: `키(m)² × 22로 계산하면 남성은 ${formatKg(standardWeight(170, "m"))}kg, 키(m)² × 21로 계산하면 여성은 ${formatKg(standardWeight(170, "f"))}kg입니다. BMI 정상 범위로 보면 키 170cm는 ${NORMAL_170}입니다.`,
  },
  {
    q: "남자와 여자의 BMI 기준이 다른가요?",
    a: "BMI 비만 기준은 남녀가 같습니다. 성별에 따라 다른 것은 복부비만 허리둘레 기준(남성 90cm, 여성 85cm 이상)과 표준체중 계산식입니다.",
  },
  {
    q: "BMI가 정상인데 뱃살이 많으면 괜찮은가요?",
    a: "BMI가 정상이어도 허리둘레가 남성 90cm, 여성 85cm 이상이면 복부비만입니다. 복부비만은 당뇨병, 고혈압 같은 질환 위험을 높이므로 BMI와 허리둘레를 함께 확인하는 것이 좋습니다.",
  },
  {
    q: "근육이 많으면 BMI가 높게 나오나요?",
    a: "네. BMI는 몸무게만 보기 때문에 근육량이 많은 사람은 체지방이 적어도 비만으로 나올 수 있습니다. 이런 경우 체지방률이나 허리둘레를 함께 보고, 정확한 판단은 의료진에게 받는 것이 좋습니다.",
  },
];

const TABLE_HEIGHTS = [150, 155, 160, 165, 170, 175, 180, 185, 190];

export default function BmiPage() {
  // Copy around these numbers uses copulas (이고/이며), so it reads correctly whatever the last digit is.
  const example = bmiEquation(calcBmi(170, 65));
  const exampleHeavy = bmiEquation(calcBmi(170, 75));
  return (
    <ToolShell
      slug="bmi"
      h1="BMI 계산기 (비만도·표준체중)"
      lead="대한비만학회 기준 성인 BMI 정상 범위는 18.5~22.9이고, 23 이상은 비만 전단계, 25 이상은 비만이에요. 키와 몸무게를 넣으면 BMI(체질량지수)와 비만 단계, 키에 맞는 정상 체중 범위를 바로 알려 드려요."
      basis={BASIS}
      calculator={<BmiCalculator />}
      faq={FAQ}
      appCategory="HealthApplication"
    >
      <h2>BMI 계산 방법</h2>
      <p>
        BMI(체질량지수, Body Mass Index)는 몸무게를 키의 제곱으로 나눈 값입니다. 키와 몸무게만으로 비만 정도를 가늠할 수
        있어 건강검진과 진료에서 가장 먼저 쓰는 지표입니다.
      </p>
      <p className="formula">BMI = 몸무게(kg) ÷ 키(m)²</p>
      <p>
        예를 들어 키 170cm, 몸무게 65kg이면 BMI는 65 ÷ (1.7 × 1.7) = 65 ÷ 2.89 {example.op}{" "}
        <strong>{example.value}</strong>이고, {classifyBmi(calcBmi(170, 65)).label} 범위입니다. 같은 키에서 몸무게가
        75kg이면 BMI는 75 ÷ 2.89 {exampleHeavy.op} {exampleHeavy.value}이며 {classifyBmi(calcBmi(170, 75)).label}에
        해당합니다.
      </p>

      <h2>한국 성인 비만 기준 (대한비만학회)</h2>
      <p>
        대한비만학회 비만 진료지침은 아시아인이 같은 BMI에서도 당뇨병, 고혈압 같은 동반질환 위험이 더 높다는 근거에 따라
        서양보다 낮은 기준을 씁니다. 2024년 비만 기준을 BMI 27로 올리자는 연구가 나왔지만, 학회는 2025년 3월 BMI 25
        이상을 비만으로 보는 현행 기준을 유지하기로 했습니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>키 170cm 체중은 0.1kg 단위로 계산한 값입니다.</caption>
          <thead>
            <tr>
              <th scope="col">단계</th>
              <th scope="col">BMI (kg/㎡)</th>
              <th scope="col">키 170cm라면</th>
            </tr>
          </thead>
          <tbody>
            {BMI_CLASSES.map((c) => (
              <tr key={c.id}>
                <td>{c.label}</td>
                <td>{c.range}</td>
                <td>{classWeightLabel(170, c)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>3단계 비만은 흔히 고도비만이라고 부릅니다. 비만 전단계는 과체중이라고도 합니다.</p>

      <h2>허리둘레로 보는 복부비만</h2>
      <p>
        BMI가 정상이어도 배에 지방이 많으면 건강 위험이 커집니다. 대한비만학회는 허리둘레가{" "}
        <strong>남성 90cm 이상, 여성 85cm 이상</strong>이면 복부비만으로 봅니다. 허리둘레는 숨을 편하게 내쉰 상태에서 갈비뼈
        맨 아래와 골반뼈 윗부분의 중간 지점을 줄자로 수평으로 재는 것이 일반적입니다. BMI와 허리둘레를 함께 보면 비만 관련
        질환 위험을 더 정확히 가늠할 수 있습니다.
      </p>

      <h2>WHO 국제 기준과 비교</h2>
      <p>
        세계보건기구(WHO)는 BMI 25 이상을 과체중, 30 이상을 비만으로 봅니다. 그래서 BMI 27인 사람은 국내 기준으로 1단계
        비만이지만 WHO 기준으로는 과체중입니다. 외국 앱이나 해외 자료의 판정이 국내 결과와 다른 이유가 여기에 있습니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">구분</th>
              <th scope="col">대한비만학회</th>
              <th scope="col">WHO</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>저체중</td>
              <td>18.5 미만</td>
              <td>18.5 미만</td>
            </tr>
            <tr>
              <td>정상</td>
              <td>18.5~22.9</td>
              <td>18.5~24.9</td>
            </tr>
            <tr>
              <td>비만 전단계(과체중)</td>
              <td>23~24.9</td>
              <td>25~29.9</td>
            </tr>
            <tr>
              <td>비만</td>
              <td>25 이상</td>
              <td>30 이상</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>표준체중 계산법 (참고)</h2>
      <p>
        표준체중은 키에 맞는 체중을 어림하는 값으로, 국내에서는 아래 식을 흔히 씁니다. 공식 진단 기준은 아니므로 참고용으로
        보시기 바랍니다.
      </p>
      <p className="formula">남성 = 키(m)² × 22 &nbsp;&nbsp;|&nbsp;&nbsp; 여성 = 키(m)² × 21</p>
      <p>
        키 170cm 남성은 2.89 × 22 = <strong>{formatKg(standardWeight(170, "m"))}kg</strong>, 키 160cm 여성은 2.56 × 21 ={" "}
        <strong>{formatKg(standardWeight(160, "f"))}kg</strong>입니다. 계산기의 ‘표준체중 대비’는 현재 몸무게를 표준체중으로
        나눈 비율입니다. 이 비율이 120% 이상이면 비만으로 보는 ‘비만도’ 계산법도 쓰였지만, 지금 성인 비만은 BMI와
        허리둘레로 판정합니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>정상 체중은 BMI 18.5 이상 23 미만에 해당하는 몸무게입니다.</caption>
          <thead>
            <tr>
              <th scope="col">키</th>
              <th scope="col">정상 체중</th>
              <th scope="col">표준체중 남</th>
              <th scope="col">표준체중 여</th>
            </tr>
          </thead>
          <tbody>
            {TABLE_HEIGHTS.map((h) => {
              const r = normalWeightRange(h);
              return (
                <tr key={h}>
                  <td>
                    <Link href={`/bmi/${h}/`}>{h}cm</Link>
                  </td>
                  <td>
                    {formatKg(r.min)}~{formatKg(r.max)}kg
                  </td>
                  <td>{formatKg(standardWeight(h, "m"))}kg</td>
                  <td>{formatKg(standardWeight(h, "f"))}kg</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>BMI만으로 판단하기 어려운 경우</h2>
      <ul>
        <li>
          <strong>근육량이 많은 사람</strong>: 운동선수처럼 근육이 많으면 체지방이 적어도 BMI가 높게 나옵니다.
        </li>
        <li>
          <strong>노인</strong>: 나이가 들어 근육이 줄면 BMI가 정상이어도 체지방이 많을 수 있습니다.
        </li>
        <li>
          <strong>임신부</strong>: 임신 중 체중 변화는 성인 BMI 기준으로 판정하지 않습니다.
        </li>
        <li>
          <strong>어린이·청소년</strong>: 성장기에는 성인 기준 대신 2017 소아청소년 성장도표의 성별·나이별 BMI 백분위를
          씁니다. 85백분위 이상은 비만 전단계, 95백분위 이상은 비만입니다.
        </li>
      </ul>
      <p className="note">
        이 계산기는 참고용 정보를 제공하며 질병을 진단하지 않습니다. 비만 여부와 치료가 필요한지는 의료진과 상담해
        확인하세요. 근거:{" "}
        <a href="https://www.jomes.org/journal/view.html?doi=10.7570/jomes23016" target="_blank" rel="noopener noreferrer">
          대한비만학회 2022 비만 진료지침
        </a>
        ,{" "}
        <a
          href="https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight"
          target="_blank"
          rel="noopener noreferrer"
        >
          WHO 비만·과체중 팩트시트
        </a>
      </p>

      <h2>키별 표준체중 바로 보기</h2>
      <nav aria-label="키별 표준체중 페이지" className="link-grid">
        {BMI_PAGE_HEIGHTS.map((h) => (
          <Link key={h} href={`/bmi/${h}/`}>
            키 {h}cm
          </Link>
        ))}
      </nav>
    </ToolShell>
  );
}
