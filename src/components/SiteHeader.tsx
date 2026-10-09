import Link from "next/link";
import { SITE_SHORT_NAME } from "@/lib/site";
import { ToolSearch } from "./ToolSearch";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75">
      <div className="page-wrap flex h-14 items-center gap-4">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="셈셈 계산기 홈">
          <Logo />
          <span className="text-lg font-bold tracking-tight text-ink">{SITE_SHORT_NAME}</span>
        </Link>
        <div className="ml-auto w-full max-w-xs">
          <ToolSearch />
        </div>
      </div>
    </header>
  );
}

/** Wordmark glyph: a tiny statement sheet with a seal dot. */
function Logo() {
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden>
      <rect x="3.5" y="2.5" width="16" height="21" rx="1.5" fill="var(--sheet)" stroke="var(--ink)" strokeWidth="1.6" />
      <path d="M7 8h9M7 12h9M7 16h5" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="19" cy="18.5" r="4.5" fill="var(--sheet)" stroke="var(--seal)" strokeWidth="1.8" />
    </svg>
  );
}
