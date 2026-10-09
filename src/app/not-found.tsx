import Link from "next/link";
import { TOOLS } from "@/lib/tools";

export default function NotFound() {
  const popular = [...TOOLS].sort((a, b) => b.popularity - a.popularity).slice(0, 6);
  return (
    <div className="page-wrap pt-14 pb-20">
      <h1 className="text-[1.75rem] font-bold text-ink">찾는 페이지가 없어요</h1>
      <p className="mt-3 text-ink-soft">주소가 바뀌었거나 잘못 입력된 것 같아요. 아래에서 필요한 계산기를 골라 보세요.</p>
      <ul className="mt-8 max-w-xl border-t border-rule">
        {popular.map((t) => (
          <li key={t.slug} className="border-b border-rule">
            <Link href={`/${t.slug}/`} className="block py-3 font-medium text-ink hover:text-link">
              {t.name}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-8">
        <Link href="/" className="text-link underline underline-offset-4">
          전체 계산기 보기
        </Link>
      </p>
    </div>
  );
}
