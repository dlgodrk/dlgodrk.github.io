import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata } from "@/lib/seo";
import { formatNumber } from "@/lib/format";
import { PYEONG_PAGE_M2 } from "@/lib/calc/pyeong";
import { buildAreaPage, f2, PYEONG_BASIS } from "@/lib/calc/pyeong-pages";
import { PyeongCalculator } from "../PyeongCalculator";
import { Segs } from "../Segs";

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
  const p = buildAreaPage(m2);
  return pageMetadata({
    title: p.title,
    description: p.description,
    path: `/pyeong/${m2}/`,
    keywords: p.keywords,
  });
}

export default async function PyeongDetailPage({ params }: Props) {
  const m2 = parse((await params).m2);
  if (m2 === null) notFound();
  const p = buildAreaPage(m2);
  const studio = p.band === "studio";

  return (
    <ToolShell
      slug="pyeong"
      path={`/pyeong/${m2}/`}
      extraCrumbs={[{ name: `${m2}㎡`, path: `/pyeong/${m2}/` }]}
      h1={p.h1}
      lead={p.lead}
      basis={PYEONG_BASIS}
      calculator={<PyeongCalculator initialM2={m2} />}
      faq={p.faq}
    >
      <h2>{m2}㎡ 평수 계산</h2>
      <p className="formula">
        {m2}㎡ × 0.3025 = {formatNumber(p.py, 4)}평 ≈ {f2(p.py)}평
      </p>
      <p>
        <Segs p={p.numbers} />
      </p>

      <h2>전용 {m2}㎡는 어떤 집인가요</h2>
      {p.about.map((para, i) => (
        <p key={i}>
          <Segs p={para} />
        </p>
      ))}

      <h2>{studio ? `${m2}㎡ 오피스텔의 계약면적 추정` : `전용 ${m2}㎡의 공급면적·평형 추정`}</h2>
      <p>
        <Segs p={p.estimateIntro} />
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">기준</th>
              <th scope="col">전용률</th>
              <th scope="col">추정 면적</th>
              <th scope="col">평 환산</th>
            </tr>
          </thead>
          <tbody>
            {p.estimates.map((r) => (
              <tr key={`${r.kind}-${r.ratio}`} className={r.typical ? "is-current" : undefined}>
                <td>
                  {r.kind} {r.basis}
                </td>
                <td>{Math.round(r.ratio * 100)}%</td>
                <td>약 {formatNumber(r.areaM2, 1)}㎡</td>
                <td>약 {f2(r.pyeong)}평</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">{p.estimateNote}</p>

      <h2>전용 {m2}㎡에 적용되는 면적 기준</h2>
      <ul>
        {p.rules.map((para, i) => (
          <li key={i}>
            <Segs p={para} />
          </li>
        ))}
      </ul>

      <h2>비슷한 면적과 비교</h2>
      {p.compare.map((para, i) => (
        <p key={i}>
          <Segs p={para} />
        </p>
      ))}

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
