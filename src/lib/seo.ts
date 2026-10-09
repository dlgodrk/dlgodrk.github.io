import type { Metadata } from "next";
import { SITE_NAME, SITE_URL, absoluteUrl } from "./site";
import { TOOLS } from "./tools";

/** OG image for a path: /og/<tool-slug>.png for tool pages, otherwise the default card. */
export function ogImageFor(path: string): string {
  const first = path.split("/").filter(Boolean)[0];
  const slug = TOOLS.some((t) => t.slug === first) ? first : "default";
  return `${SITE_URL}/og/${slug}.png`;
}

type PageMetaInput = {
  /** Page title WITHOUT the site name (the root layout template appends " | 셈셈 계산기"). */
  title: string;
  /** 80–160 Korean characters. Lead with what the page answers. */
  description: string;
  /** Site path such as "/salary/" or "/salary/3000/" */
  path: string;
  keywords?: string[];
  /** Set true for pages that should not be indexed. */
  noindex?: boolean;
};

/** Standard metadata for every page: canonical URL, Open Graph, Twitter card. */
export function pageMetadata({ title, description, path, keywords, noindex }: PageMetaInput): Metadata {
  const url = absoluteUrl(path);
  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      siteName: SITE_NAME,
      url,
      title,
      description,
      images: [{ url: ogImageFor(path), width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImageFor(path)] },
    robots: noindex ? { index: false, follow: true } : undefined,
  };
}

type Crumb = { name: string; path: string };

export function breadcrumbJsonLd(crumbs: Crumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

export function webAppJsonLd(opts: { name: string; description: string; path: string; category?: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: opts.name,
    description: opts.description,
    url: absoluteUrl(opts.path),
    applicationCategory: opts.category ?? "UtilitiesApplication",
    operatingSystem: "Any",
    inLanguage: "ko-KR",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };
}

export type FaqItem = { q: string; a: string };

export function faqJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };
}
