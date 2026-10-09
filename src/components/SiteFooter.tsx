import Link from "next/link";
import { CATEGORIES, TOOLS } from "@/lib/tools";
import { RULES_CHECKED_AT, SITE_NAME } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-rule bg-sheet">
      <div className="page-wrap py-10">
        <nav aria-label="전체 계산기" className="grid gap-8 sm:grid-cols-3 lg:grid-cols-6">
          {CATEGORIES.map((c) => (
            <div key={c.id}>
              <h2 className="text-sm font-bold text-ink">{c.name}</h2>
              <ul className="mt-2 space-y-1.5">
                {TOOLS.filter((t) => t.category === c.id).map((t) => (
                  <li key={t.slug}>
                    <Link href={`/${t.slug}/`} className="text-sm text-muted hover:text-ink">
                      {t.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="mt-10 border-t border-rule pt-6 text-sm leading-relaxed text-muted">
          <p>
            {SITE_NAME}의 계산 결과는 공개된 법령과 요율을 바탕으로 한 추정치입니다. 실제 금액은 회사 규정이나 개인 사정에
            따라 다를 수 있으니, 중요한 결정 전에는 담당 기관에 확인하세요. 요율 확인일 {RULES_CHECKED_AT}.
          </p>
          <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
            <Link href="/about/" className="hover:text-ink">
              소개
            </Link>
            <Link href="/privacy/" className="hover:text-ink">
              개인정보처리방침
            </Link>
            <span>© {new Date().getFullYear()} {SITE_NAME}</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
