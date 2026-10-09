import Link from "next/link";
import { relatedTools } from "@/lib/tools";

export function RelatedTools({ slug }: { slug: string }) {
  const tools = relatedTools(slug, 6);
  return (
    <section aria-labelledby="related-title">
      <h2 id="related-title" className="text-xl font-bold text-ink">
        같이 쓰는 계산기
      </h2>
      <ul className="mt-4 grid gap-x-8 sm:grid-cols-2">
        {tools.map((t) => (
          <li key={t.slug} className="border-b border-rule">
            <Link href={`/${t.slug}/`} className="group flex flex-col py-3">
              <span className="font-medium text-ink group-hover:text-link">{t.name}</span>
              <span className="text-sm text-muted">{t.summary}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
