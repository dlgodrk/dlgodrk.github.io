import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "./Breadcrumbs";
import { JsonLd } from "./JsonLd";
import { RelatedTools } from "./RelatedTools";
import { Faq } from "./Faq";
import { breadcrumbJsonLd, faqJsonLd, webAppJsonLd, type FaqItem } from "@/lib/seo";
import { getCategory, getTool } from "@/lib/tools";

/**
 * Standard page frame for every calculator page (server component).
 * - `calculator`: the interactive client component (inputs + <Statement>).
 * - `children`: long-form explanation rendered as prose (server-rendered, crawlable).
 * - `faq`: visible FAQ section + FAQPage JSON-LD.
 * - `extraCrumbs`: programmatic sub-pages (e.g. /salary/3000/) extend the breadcrumb trail.
 */
export function ToolShell({
  slug,
  h1,
  lead,
  calculator,
  children,
  faq,
  extraCrumbs = [],
  path,
  appCategory,
  basis,
}: {
  slug: string;
  h1: string;
  /** 1–2 sentences: what the page calculates and on what basis. Plain string preferred. */
  lead: ReactNode;
  calculator: ReactNode;
  children?: ReactNode;
  faq?: FaqItem[];
  extraCrumbs?: Crumb[];
  /** Path of this page; defaults to /<slug>/ */
  path?: string;
  /** schema.org applicationCategory, e.g. "FinanceApplication" */
  appCategory?: string;
  /** Basis line under the lead, e.g. "2026년 기준 요율 · 2026년 10월 9일 확인" */
  basis?: string;
}) {
  const tool = getTool(slug);
  const category = getCategory(tool.category);
  const pagePath = path ?? `/${slug}/`;
  const crumbs: Crumb[] = [{ name: "홈", path: "/" }, { name: tool.name, path: `/${slug}/` }, ...extraCrumbs];
  const ld: object[] = [
    breadcrumbJsonLd(crumbs),
    webAppJsonLd({
      name: h1,
      description: typeof lead === "string" ? lead : tool.summary,
      path: pagePath,
      category: appCategory,
    }),
  ];
  if (faq?.length) ld.push(faqJsonLd(faq));

  return (
    <>
      <JsonLd data={ld} />
      <div className="page-wrap pt-6 sm:pt-8">
        <Breadcrumbs items={crumbs} />
        <header className="mt-4 max-w-3xl">
          <p className="text-sm font-medium text-link">{category.name}</p>
          <h1 className="mt-1 text-[1.75rem] leading-tight font-bold tracking-tight text-ink sm:text-[2.125rem]">{h1}</h1>
          <div className="mt-3 text-[1.0625rem] leading-relaxed text-ink-soft">{lead}</div>
          {basis ? <p className="mt-2 text-sm text-muted">{basis}</p> : null}
        </header>
        <div className="mt-6 sm:mt-8">{calculator}</div>
      </div>
      {children ? (
        <article className="page-wrap mt-14">
          <div className="prose-ko">{children}</div>
        </article>
      ) : null}
      {faq?.length ? (
        <div className="page-wrap mt-14">
          <Faq items={faq} />
        </div>
      ) : null}
      <div className="page-wrap mt-14 mb-16">
        <RelatedTools slug={slug} />
      </div>
    </>
  );
}
