/** Site-wide constants. SITE_URL has no trailing slash. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://dlgodrk.github.io").replace(/\/$/, "");
export const SITE_NAME = "셈셈 계산기";
export const SITE_SHORT_NAME = "셈셈";
export const SITE_TAGLINE = "월급부터 만 나이, 평수까지. 계산은 셈셈에서.";
export const SITE_DESCRIPTION =
  "2026년 기준 연봉 실수령액, 만 나이, 퇴직금, 실업급여, 주휴수당, 평수, 대출 이자, 전역일까지. 회원가입 없이 바로 쓰는 생활 계산기 모음입니다.";
/** The year all money/tax rules on the site are based on. */
export const RULE_YEAR = 2026;
/** Date the rules were last checked (YYYY-MM-DD). Update when rates are re-verified. */
export const RULES_CHECKED_AT = "2026-10-09";

/**
 * The site's public contact channel: the source repository's GitHub Issues.
 * Anyone can read and open an issue without giving the site any personal data
 * (a GitHub account is needed only to post). No email address is published.
 */
export const SITE_CONTACT = {
  /** Link text, e.g. in the footer */
  label: "문의·오류 제보",
  /** Where the channel lives, for prose ("GitHub 이슈") */
  channel: "GitHub 이슈",
  url: "https://github.com/dlgodrk/dlgodrk.github.io/issues",
} as const;

/** Optional search-engine verification codes, injected at build time. */
export const VERIFICATION = {
  google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
  naver: process.env.NEXT_PUBLIC_NAVER_SITE_VERIFICATION,
  bing: process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION,
};

/** Path prefix the site is served under ("/semcalc" on GitHub Pages, "" on a custom domain). */
export const BASE_PATH = new URL(SITE_URL).pathname.replace(/\/$/, "");

/** Absolute URL for a site path. Paths always end with "/" (trailingSlash: true). */
export function absoluteUrl(path = "/"): string {
  let p = path.startsWith("/") ? path : `/${path}`;
  if (!p.endsWith("/") && !/\.[a-z0-9]+$/i.test(p)) p += "/";
  return `${SITE_URL}${p}`;
}
