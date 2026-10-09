import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { JsonLd } from "@/components/JsonLd";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, VERIFICATION } from "@/lib/site";

const plex = IBM_Plex_Sans_KR({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  // Korean glyphs are served as many small unicode-range slices; let the browser
  // fetch only the slices a page actually uses instead of preloading.
  preload: false,
  variable: "--font-plex-kr",
});

const verificationOther: Record<string, string> = {};
if (VERIFICATION.naver) verificationOther["naver-site-verification"] = VERIFICATION.naver;
if (VERIFICATION.bing) verificationOther["msvalidate.01"] = VERIFICATION.bing;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} - 연봉 실수령액·만 나이·퇴직금 생활 계산기 모음`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: `${SITE_URL}/` },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: SITE_NAME,
    url: `${SITE_URL}/`,
    title: `${SITE_NAME} - 생활 계산기 모음`,
    description: SITE_DESCRIPTION,
    images: [{ url: `${SITE_URL}/og/default.png`, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: { card: "summary_large_image", images: [`${SITE_URL}/og/default.png`] },
  verification: {
    google: VERIFICATION.google,
    other: Object.keys(verificationOther).length ? verificationOther : undefined,
  },
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f4f7" },
    { media: "(prefers-color-scheme: dark)", color: "#11151b" },
  ],
};

const siteJsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    inLanguage: "ko-KR",
    description: SITE_DESCRIPTION,
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/icon-512.png`,
  },
];

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${plex.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <JsonLd data={siteJsonLd} />
        <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-sheet focus:px-3 focus:py-2">
          본문으로 건너뛰기
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
