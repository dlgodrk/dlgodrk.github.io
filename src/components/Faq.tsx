import type { FaqItem } from "@/lib/seo";

/** Visible FAQ list using native <details> (works without JavaScript). */
export function Faq({ items, title = "자주 묻는 질문" }: { items: FaqItem[]; title?: string }) {
  return (
    <section aria-labelledby="faq-title" className="max-w-3xl">
      <h2 id="faq-title" className="text-xl font-bold text-ink">
        {title}
      </h2>
      <div className="mt-4 divide-y divide-rule border-y border-rule">
        {items.map((it) => (
          <details key={it.q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-medium text-ink">
              <span>{it.q}</span>
              <span aria-hidden className="mt-0.5 text-lg leading-none text-muted transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-2 leading-relaxed text-ink-soft">{it.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
