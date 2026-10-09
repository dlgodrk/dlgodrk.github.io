import type { Metadata } from "next";
import Link from "next/link";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import {
  estimateSupplyPyeong,
  m2ToPyeong,
  NATIONAL_HOUSING_M2,
  NATIONAL_HOUSING_M2_RURAL,
  PYEONG_PAGE_M2,
  pyeongToM2,
  SMALL_HOUSING_M2,
} from "@/lib/calc/pyeong";
import { f2, PYEONG_BASIS, PYEONG_RULES_CHECKED } from "@/lib/calc/pyeong-pages";
import { PyeongCalculator } from "./PyeongCalculator";

const P84 = f2(m2ToPyeong(84));
const L84 = Math.round(estimateSupplyPyeong(84));
const P59 = f2(m2ToPyeong(59));
const L59 = Math.round(estimateSupplyPyeong(59));
const P85 = f2(m2ToPyeong(NATIONAL_HOUSING_M2));
const ANSWER = `1평은 3.3058㎡, 1㎡는 0.3025평이라 전용 84㎡는 ${P84}평(약 ${L84}평형)입니다.`;

export const metadata: Metadata = pageMetadata({
  title: "평수 계산기 - ㎡ 평 변환 (84㎡ 몇 평?)",
  description: `${ANSWER} 59㎡는 ${P59}평(약 ${L59}평형)입니다. ㎡와 평을 바로 바꾸고 면적별 환산표와 60㎡·85㎡ 기준까지 정리했습니다.`,
  path: "/pyeong/",
  keywords: ["평수 계산기", "평 계산", "제곱미터 평 변환", "84제곱미터 평수", "59제곱미터 평수", "1평 몇 제곱미터"],
});

const FAQ: FaqItem[] = [
  {
    q: "1평은 몇 제곱미터인가요?",
    a: "1평은 400/121㎡, 약 3.3058㎡입니다. 반대로 1㎡는 0.3025평입니다. 그래서 ㎡에 0.3025를 곱하면 평, 평에 3.3058을 곱하면 ㎡가 됩니다.",
  },
  {
    q: "전용 84㎡ 아파트는 몇 평인가요?",
    a: `전용면적 84㎡를 그대로 바꾸면 ${P84}평입니다. 아파트 광고에서 말하는 ‘${L84}평형’은 계단·복도 같은 주거공용면적을 더한 공급면적 기준이라 숫자가 더 큽니다. 전용률 75%로 보면 공급면적은 112㎡, 약 ${L84}평형입니다.`,
  },
  {
    q: "전용면적과 공급면적은 무엇이 다른가요?",
    a: "전용면적은 현관문 안쪽에서 우리 집만 쓰는 면적입니다. 공급면적은 전용면적에 계단, 복도, 엘리베이터 같은 주거공용면적을 더한 값입니다. 발코니 확장 면적은 서비스 면적이라 둘 다에 들어가지 않습니다.",
  },
  {
    q: "국민주택규모 85㎡는 몇 평인가요?",
    a: `국민주택규모 상한인 전용 85㎡는 ${P85}평입니다. 이 이하 주택은 살 때 농어촌특별세가 붙지 않고 새로 분양할 때 부가가치세가 면제됩니다. 수도권을 제외한 도시지역이 아닌 읍·면은 ${NATIONAL_HOUSING_M2_RURAL}㎡(${f2(m2ToPyeong(NATIONAL_HOUSING_M2_RURAL))}평)까지입니다.`,
  },
  {
    q: "부동산 광고에 평 단위를 써도 되나요?",
    a: "법정 계량단위는 제곱미터라서 공식 문서와 광고에는 ㎡를 써야 합니다. 평은 생활에서 널리 쓰이는 관용 단위입니다.",
  },
];

/** Rule lines where the exclusive area changes what applies (see src/lib/calc/pyeong-pages.ts for sources). */
const THRESHOLDS: { m2: number; what: string }[] = [
  {
    m2: SMALL_HOUSING_M2,
    what: "규제지역 민영주택 가점제 40%·추첨제 60%(60㎡ 초과 85㎡ 이하는 70%·30%), 소형·저가주택 무주택 인정, 3억원(수도권 6억원) 이하 연립·다세대 생애최초 감면 한도 300만원",
  },
  {
    m2: NATIONAL_HOUSING_M2,
    what: "국민주택규모: 취득 시 농어촌특별세 비과세, 분양가 부가가치세 면제, 청약 예치금 최저 구간(서울·부산 300만원), 주거용 오피스텔 중개보수 0.5%·0.4%",
  },
  { m2: 102, what: "청약 예치금 두 번째 구간(서울·부산 600만원)" },
  { m2: 135, what: "청약 예치금 세 번째 구간(서울·부산 1,000만원). 넘으면 ‘모든 면적’ 1,500만원" },
];

export default function PyeongPage() {
  const pyeongTable = [10, 15, 18, 20, 24, 25, 30, 32, 34, 40, 45, 50, 60];
  return (
    <ToolShell
      slug="pyeong"
      h1="평수 계산기 (㎡ ↔ 평 변환)"
      lead={`${ANSWER} 면적을 넣으면 ㎡와 평을 서로 바꾸고, 아파트 전용면적이면 흔히 부르는 평형까지 알려 드려요.`}
      basis={PYEONG_BASIS}
      calculator={<PyeongCalculator />}
      faq={FAQ}
    >
      <h2>평수 계산 방법</h2>
      <p>평은 사방 6자인 정사각형의 넓이로, 정확히 400/121㎡입니다. 계산식은 아래와 같습니다.</p>
      <p className="formula">평 = ㎡ × 0.3025 &nbsp;&nbsp;|&nbsp;&nbsp; ㎡ = 평 × 3.3058</p>
      <p>
        예를 들어 전용면적 59㎡는 59 × 0.3025 = <strong>{P59}평</strong>이고, 30평은 30 × 3.3058 ={" "}
        <strong>{f2(pyeongToM2(30))}㎡</strong>입니다.
      </p>

      <h2>아파트 전용면적별 평수 환산표</h2>
      <p>
        아파트에서 많이 쓰는 전용면적을 평으로 바꾼 표입니다. ‘흔히 부르는 평형’은 전용률 75%를 가정해 공급면적으로 추정한
        값이라 단지마다 1~2평 다를 수 있습니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">전용면적</th>
              <th scope="col">평 환산</th>
              <th scope="col">흔히 부르는 평형</th>
            </tr>
          </thead>
          <tbody>
            {[39, 49, 59, 74, 84, 101, 114, 135].map((m2) => (
              <tr key={m2}>
                <td>
                  <Link href={`/pyeong/${m2}/`}>{m2}㎡</Link>
                </td>
                <td>{f2(m2ToPyeong(m2))}평</td>
                <td>약 {Math.round(estimateSupplyPyeong(m2))}평형</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>평 → 제곱미터 환산표</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">평</th>
              <th scope="col">제곱미터</th>
            </tr>
          </thead>
          <tbody>
            {pyeongTable.map((p) => (
              <tr key={p}>
                <td>{p}평</td>
                <td>{f2(pyeongToM2(p))}㎡</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>전용면적, 공급면적, 계약면적</h2>
      <ul>
        <li>
          <strong>전용면적</strong>: 현관 안쪽, 우리 집만 쓰는 공간. 분양 공고와 등기부의 기준 면적입니다.
        </li>
        <li>
          <strong>공급면적</strong>: 전용면적 + 계단·복도·엘리베이터 같은 주거공용면적. ‘34평형’ 같은 말은 보통 이 면적 기준입니다.
          아파트 전용률(전용 ÷ 공급)은 보통 70~80%입니다.
        </li>
        <li>
          <strong>계약면적</strong>: 공급면적 + 지하주차장·관리사무소 같은 기타공용면적. 오피스텔은 이 면적으로 표시하는 경우가
          많고, 계약면적 대비 전용률은 보통 50~60%입니다.
        </li>
        <li>
          <strong>서비스면적</strong>: 발코니처럼 면적 산정에서 빠지는 공간. 확장하면 실사용 면적이 늘어납니다.
        </li>
      </ul>

      <h2>세금과 청약이 달라지는 면적: 60㎡·85㎡·102㎡·135㎡</h2>
      <p>
        세금과 청약 규칙은 모두 공급면적이 아니라 <strong>전용면적</strong>으로 판단합니다. 같은 ‘34평형’이라도 전용면적이
        85㎡ 이하인지에 따라 내는 세금과 청약 방식이 달라집니다. 아래 내용은 {PYEONG_RULES_CHECKED}에 확인한 법령을
        따릅니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">전용면적</th>
              <th scope="col">평 환산</th>
              <th scope="col" className="text-cell">
                이하일 때 적용되는 것
              </th>
            </tr>
          </thead>
          <tbody>
            {THRESHOLDS.map((t) => (
              <tr key={t.m2}>
                <td>
                  {PYEONG_PAGE_M2.includes(t.m2) ? <Link href={`/pyeong/${t.m2}/`}>{t.m2}㎡</Link> : `${t.m2}㎡`}
                </td>
                <td>{f2(m2ToPyeong(t.m2))}평</td>
                <td className="text-cell">{t.what}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        국민주택규모는 주택법 제2조 제6호의 주거전용 85㎡ 이하이고, 수도권을 제외한 도시지역이 아닌 읍·면은 100㎡
        이하입니다. 85㎡를 넘으면 집을 살 때 농어촌특별세가 매매가의 0.2%(1주택 1~3% 세율 기준) 더 붙으니 금액은{" "}
        <Link href="/acquisition-tax/">취득세 계산기</Link>로 확인할 수 있습니다. 민영주택 가점제 비율은 주택공급에 관한 규칙
        제28조, 예치금은 같은 규칙 별표 2에 따르며, 내 점수는 <Link href="/subscription-score/">청약 가점 계산기</Link>로
        계산할 수 있습니다. 주거용 오피스텔 중개보수는 <Link href="/brokerage-fee/">중개보수(복비) 계산기</Link>에서
        확인할 수 있습니다. 대표 주택형은 <Link href="/pyeong/59/">59㎡</Link>, <Link href="/pyeong/84/">84㎡</Link>,{" "}
        <Link href="/pyeong/85/">85㎡(국민주택규모 경계)</Link> 페이지에 따로 정리했습니다.
      </p>

      <h2>면적별 평수 바로 보기</h2>
      <nav aria-label="면적별 평수 페이지" className="link-grid">
        {PYEONG_PAGE_M2.map((m2) => (
          <Link key={m2} href={`/pyeong/${m2}/`}>
            {m2}㎡ 평수
          </Link>
        ))}
      </nav>
    </ToolShell>
  );
}
