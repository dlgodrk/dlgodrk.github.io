import { parseYMD, type YMD } from "@/lib/date";

/**
 * Build date (KST) for server-rendered copy on the enlistment-month pages. next.config.ts inlines
 * NEXT_PUBLIC_BUILD_DATE and the site is rebuilt every day, so a page can tell whether everyone who
 * enlisted that month has already been discharged and switch to past tense. Same value and fallback as
 * useToday's BUILD_DATE, read here so server pages do not import the "use client" module.
 */
export const BUILD_DAY: YMD = parseYMD(process.env.NEXT_PUBLIC_BUILD_DATE) ?? { y: 2026, m: 10, d: 9 };
