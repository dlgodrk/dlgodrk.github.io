import type { Metadata } from "next";
import Link from "next/link";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber } from "@/lib/format";
import { estimateSupplyPyeong, m2ToPyeong, PYEONG_PAGE_M2, pyeongToM2 } from "@/lib/calc/pyeong";
import { PyeongCalculator } from "./PyeongCalculator";

export const metadata: Metadata = pageMetadata({
  title: "평수 계산기 - ㎡ 평 변환 (84㎡ 몇 평?)",
  description:
    "제곱미터(㎡)를 평으로, 평을 ㎡로 바로 변환합니다. 아파트 전용면적 59㎡, 84㎡가 몇 평형인지, 1평이 몇 제곱미터인지 환산표와 함께 확인하세요.",
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
    a: "전용면적 84㎡를 그대로 바꾸면 약 25.4평입니다. 다만 아파트 광고에서 말하는 ‘34평형’은 계단·복도 같은 주거공용면적을 더한 공급면적 기준이라 숫자가 더 큽니다.",
  },
  {
    q: "전용면적과 공급면적은 무엇이 다른가요?",
    a: "전용면적은 현관문 안쪽에서 우리 집만 쓰는 면적입니다. 공급면적은 전용면적에 계단, 복도, 엘리베이터 같은 주거공용면적을 더한 값입니다. 발코니 확장 면적은 서비스 면적이라 둘 다에 들어가지 않습니다.",
  },
  {
    q: "부동산 광고에 평 단위를 써도 되나요?",
    a: "법정 계량단위는 제곱미터라서 공식 문서와 광고에는 ㎡를 써야 합니다. 평은 생활에서 널리 쓰이는 관용 단위입니다.",
  },
];

export default function PyeongPage() {
  const pyeongTable = [10, 15, 18, 20, 24, 25, 30, 32, 34, 40, 45, 50, 60];
  return (
    <ToolShell
      slug="pyeong"
      h1="평수 계산기 (㎡ ↔ 평 변환)"
      lead="제곱미터와 평을 서로 바꿔 줍니다. 아파트 전용면적을 넣으면 흔히 부르는 평형까지 함께 알려 드려요."
      basis="1평 = 400/121㎡ (약 3.3058㎡) 기준"
      calculator={<PyeongCalculator />}
      faq={FAQ}
    >
      <h2>평수 계산 방법</h2>
      <p>평은 사방 6자인 정사각형의 넓이로, 정확히 400/121㎡입니다. 계산식은 아래와 같습니다.</p>
      <p className="formula">평 = ㎡ × 0.3025 &nbsp;&nbsp;|&nbsp;&nbsp; ㎡ = 평 × 3.3058</p>
      <p>
        예를 들어 전용면적 59㎡는 59 × 0.3025 = <strong>17.85평</strong>이고, 30평은 30 × 3.3058 = <strong>99.17㎡</strong>입니다.
      </p>

      <h2>아파트 전용면적별 평수 환산표</h2>
      <p>
        아파트에서 많이 쓰는 전용면적을 평으로 바꾼 표입니다. ‘흔히 부르는 평형’은 전용률 75%를 가정해 공급면적으로 추정한
        값이라 단지마다 1~2평 다를 수 있어요.
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
                <td>{formatNumber(m2ToPyeong(m2), 2)}평</td>
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
                <td>{formatNumber(pyeongToM2(p), 2)}㎡</td>
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
        </li>
        <li>
          <strong>계약면적</strong>: 공급면적 + 지하주차장·관리사무소 같은 기타공용면적.
        </li>
        <li>
          <strong>서비스면적</strong>: 발코니처럼 면적 산정에서 빠지는 공간. 확장하면 실사용 면적이 늘어납니다.
        </li>
      </ul>

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
