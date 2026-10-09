import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber } from "@/lib/format";
import { estimateSupplyPyeong, m2ToPyeong, PYEONG_PAGE_M2, sizeClass } from "@/lib/calc/pyeong";
import { PyeongCalculator } from "../PyeongCalculator";

// Only the listed areas exist; anything else is a 404 (required for static export).
export const dynamicParams = false;

export function generateStaticParams() {
  return PYEONG_PAGE_M2.map((m2) => ({ m2: String(m2) }));
}

type Props = { params: Promise<{ m2: string }> };

function parse(raw: string): number | null {
  const n = Number(raw);
  return PYEONG_PAGE_M2.includes(n) ? n : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const m2 = parse((await params).m2);
  if (m2 === null) return {};
  const py = formatNumber(m2ToPyeong(m2), 2);
  const label = Math.round(estimateSupplyPyeong(m2));
  return pageMetadata({
    title: `${m2}㎡ 몇 평? ${m2}제곱미터는 ${py}평`,
    description: `${m2}㎡는 ${py}평입니다. 아파트 전용면적 ${m2}㎡라면 흔히 약 ${label}평형으로 부릅니다. 공급면적 추정과 규모 구분, 주변 면적 환산표까지 확인하세요.`,
    path: `/pyeong/${m2}/`,
    keywords: [`${m2}제곱미터 평수`, `${m2}㎡ 몇평`, `전용 ${m2} 평형`, "평수 계산기"],
  });
}

export default async function PyeongDetailPage({ params }: Props) {
  const m2 = parse((await params).m2);
  if (m2 === null) notFound();
  const py = m2ToPyeong(m2);
  const label = Math.round(estimateSupplyPyeong(m2));
  const idx = PYEONG_PAGE_M2.indexOf(m2);
  const neighbors = PYEONG_PAGE_M2.slice(Math.max(0, idx - 4), idx + 5);

  const faq: FaqItem[] = [
    {
      q: `${m2}㎡는 몇 평인가요?`,
      a: `${m2}㎡ × 0.3025 = ${formatNumber(py, 2)}평입니다. 소수점을 버리면 ${Math.floor(py)}평입니다.`,
    },
    {
      q: `전용 ${m2}㎡ 아파트는 몇 평형인가요?`,
      a: `아파트 평형은 공급면적 기준이라 전용면적보다 큽니다. 전용률 75%를 가정하면 공급면적은 약 ${formatNumber(m2 / 0.75, 1)}㎡, 약 ${label}평형입니다. 단지의 전용률에 따라 1~2평 차이가 날 수 있습니다.`,
    },
    {
      q: `${m2}㎡는 국민주택규모인가요?`,
      a:
        m2 <= 85
          ? `네. 국민주택규모는 전용 85㎡ 이하(수도권·도시지역 기준)라서 ${m2}㎡는 국민주택규모에 해당합니다.`
          : `아니요. 국민주택규모는 전용 85㎡ 이하(수도권·도시지역 기준)라서 ${m2}㎡는 이를 넘는 면적입니다.`,
    },
  ];

  return (
    <ToolShell
      slug="pyeong"
      path={`/pyeong/${m2}/`}
      extraCrumbs={[{ name: `${m2}㎡`, path: `/pyeong/${m2}/` }]}
      h1={`${m2}㎡는 몇 평? ${formatNumber(py, 2)}평`}
      lead={`${m2}제곱미터를 평으로 바꾸면 ${formatNumber(py, 2)}평입니다. 아파트 전용면적이라면 흔히 약 ${label}평형이라고 부릅니다.`}
      basis="1평 = 400/121㎡ (약 3.3058㎡) 기준"
      calculator={<PyeongCalculator initialM2={m2} />}
      faq={faq}
    >
      <h2>{m2}㎡ 평수 계산</h2>
      <p className="formula">
        {m2}㎡ × 0.3025 = {formatNumber(py, 4)}평 ≈ {formatNumber(py, 2)}평
      </p>
      <p>
        규모로 보면 <strong>{sizeClass(m2)}</strong>에 속합니다. 아파트 분양 공고에 적힌 숫자가 {m2}㎡라면 그것은 보통
        전용면적이고, 광고나 대화에서 쓰는 평형은 공급면적 기준이라 약 {label}평형 정도로 표현됩니다.
      </p>

      <h2>{m2}㎡ 주변 면적 환산표</h2>
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
            {neighbors.map((n) => (
              <tr key={n} className={n === m2 ? "is-current" : undefined}>
                <td>{n === m2 ? `${n}㎡` : <Link href={`/pyeong/${n}/`}>{n}㎡</Link>}</td>
                <td>{formatNumber(m2ToPyeong(n), 2)}평</td>
                <td>약 {Math.round(estimateSupplyPyeong(n))}평형</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>다른 면적도 찾아보기</h2>
      <nav aria-label="면적별 평수 페이지" className="link-grid">
        {PYEONG_PAGE_M2.map((n) => (
          <Link key={n} href={`/pyeong/${n}/`} aria-current={n === m2 ? "page" : undefined}>
            {n}㎡ 평수
          </Link>
        ))}
      </nav>
    </ToolShell>
  );
}
