# 셈셈 계산기 — conventions for building a calculator

Project root: the repository root (package name `semcalc`).
Live URL: https://dlgodrk.github.io/ (GitHub Pages, served at the domain root; if a basePath is ever added, links keep working only when you link with `next/link` or `absoluteUrl()`, never raw "/path" strings in `<a>`/`<img>`) — brand name **셈셈 계산기** (short: 셈셈).
Audience: Korean adults on phones (≈75% mobile). Every page is Korean.
Size today (2026-10-09 build): **30 calculators** (registry: `src/lib/tools.ts`) and **536 URLs** in `sitemap.xml`
(home, /about/, /privacy/, 30 tool pages, 503 programmatic pages). Today is 2026-10-09.

## Stack (read before coding)
- Next.js **16.4** App Router with `output: "export"` + `trailingSlash: true` → a fully static site.
  This Next.js is newer than your training data. `params` is a **Promise** (`const { x } = await params`).
  Docs live in `node_modules/next/dist/docs/` — read the relevant file if unsure.
- React 19, TypeScript strict, Tailwind CSS v4 (tokens in `src/app/globals.css`).
- Tests: Vitest (`src/**/*.test.ts`).
- No server: no route handlers that read requests, no server actions, no cookies, no `next/image` optimization.

## Reference implementation — copy its structure
`pyeong` (평수 계산기) is the canonical example. Read all of these before starting:
- `src/lib/calc/pyeong.ts` + `src/lib/calc/pyeong.test.ts` — pure logic + tests
- `src/app/pyeong/PyeongCalculator.tsx` — client calculator (inputs + Statement)
- `src/app/pyeong/page.tsx` — main tool page (metadata, ToolShell, long-form content, FAQ)
- `src/app/pyeong/[m2]/page.tsx` — programmatic landing pages (generateStaticParams)

For money tools that use 4대보험 or 간이세액, also read `src/lib/calc/hourly-wage.ts` (header comment) and
`src/app/salary/SalaryCalculator.tsx` — they show the pay-month and 2027 conventions below.

## Files you own for tool `<slug>`
| File | Purpose |
|---|---|
| `src/lib/calc/<slug>.ts` | Pure functions + constants + programmatic param lists. No React, no Date.now(). |
| `src/lib/calc/<slug>.test.ts` | Vitest tests with real-world vectors (cite sources in comments). |
| `src/lib/calc/<slug>-<part>.ts` (+ test) | Optional split modules, e.g. `salary-monthly.ts`, `pyeong-pages.ts`, `year-end-tax-ui.ts`. |
| `src/app/<slug>/page.tsx` | Server page: `export const metadata = pageMetadata({...})`, `<ToolShell>`, prose, FAQ. |
| `src/app/<slug>/<Pascal>Calculator.tsx` | `"use client"` interactive calculator. |
| `src/app/<slug>/[param]/page.tsx` | Optional programmatic pages (`dynamicParams = false`). Nested families are fine (`salary/monthly/[manwon]`, `hourly-wage/wage/[won]`). |
| other files under `src/app/<slug>/` | Any extra components only this tool uses. |

**Do NOT edit shared files**: anything in `src/components/`, `src/lib/{format,date,seo,site,tools,useUrlState,useToday}.ts`,
`src/lib/rates/` (insurance, withholding, labor and their fixtures), `src/app/{layout.tsx,page.tsx,globals.css,not-found.tsx}`,
`src/app/{about,privacy}/`, `next.config.ts`, `package.json`, `scripts/`, `public/` (it holds the search-engine
verification files), `.github/`, `docs/` (unless you were given a doc), and other tools' folders and `src/lib/calc/` files.
Importing another tool's pure functions read-only is fine (`minimum-wage.ts` imports from `hourly-wage.ts`).
If a shared file has a bug or you need a new shared capability, implement a local helper inside your own files and
**report** the needed shared change in your final output (`shared_change_requests`).
Do not install packages.

## Registering a tool (orchestrator, `src/lib/tools.ts`)
A new tool needs a `TOOLS` entry and an OG image (`node scripts/og.mjs` writes `public/og/<slug>.png`). Ask for both in
`shared_change_requests`. Fields of `Tool`:
- `slug`, `name` (list name, e.g. "연봉 실수령액 계산기"), `summary` (one plain line), `category`
  (`work` | `money` | `date` | `home` | `health` | `text`), `aliases` (words for the site search box), `popularity` (home order).
- `related?: string[]` — hand-picked companion slugs, shown first in the "같이 쓰는 계산기" block (6 tools in all).
  The rest is filled by `relatedTools()`: same category starting after the tool and wrapping around, then the most
  popular tool of each other category, then by popularity. **Pairs must be symmetric** (if A lists B, B lists A) and slugs
  must exist and not repeat — `src/lib/tools.test.ts` fails otherwise. When you request a pair, name both sides.

## Shared building blocks
- `ToolShell` (`@/components/ToolShell`): page frame — breadcrumbs, H1, lead, calculator, prose (`children`), FAQ, related tools, JSON-LD (BreadcrumbList, WebApplication, FAQPage). Props: `slug, h1, lead, basis, calculator, faq, path, extraCrumbs, appCategory` (`"FinanceApplication"` for money tools, `"HealthApplication"` for health, default Utilities).
- `CalcLayout` (`@/components/CalcLayout`): `inputs` (left) + `result` (right, sticky) + share button. `CalcNotice` for empty/invalid state.
- Fields (`@/components/fields`): `NumberField` (comma formatting, `unit`, `presets`, `reading`, `decimals`, `max`), `SegmentedField`, `SelectField`, `DateField` (value `"YYYY-MM-DD"`), `StepperField`, `CheckboxField`, `TextAreaField`.
  **Every field takes `hint`** (ReactNode, `TextAreaField` included): a help line under the control, linked with
  `aria-describedby` so screen readers read it on focus. Put field help there, not in a loose `<p>` or only in a placeholder.
- Statement (`@/components/Statement`): the site's signature result view (명세서).
  `Statement` › `StatementHero` (one big answer; optional `stamp` = 2–3 char red seal, only for the primary money/date answer) › `StatementSection` › `StatementRow` (`label`, `value`, `note`, `emphasis`) › `StatementTotal` › `StatementFootnote`.
  - `StatementHero` is the only live region: polite + atomic, so label, value and `sub` are read together when the answer
    changes. `live` defaults to `true`; pass `live={false}` on a second, non-primary hero. `Statement` itself is
    deliberately not a live region — do not add `aria-live` to rows or sections.
  - Long figures shrink automatically: the hero measures its `value` text with `longestRunEm()` and sets `--hero-em`, so
    "14,512,345,678원" still fits a 360px phone. Keep `value` as text or simple inline elements (its text is measured).
- `useUrlState({ k: default, ... })` (`@/lib/useUrlState`): inputs live in the query string so results are shareable. Keys 1–3 chars. Defaults must be the values you want rendered in the static HTML.
- `useToday()` (`@/lib/useToday`): hydration-safe "today" (KST). First render = build date, then real today.
  **Never call `new Date()`, `Date.now()` or `todayKST()` during render** in client components (hydration mismatch). Server pages may use `RULE_YEAR` from `@/lib/site` for year-based copy.
- `@/lib/format`: `formatNumber(n, digits)`, `formatWon`, `koreanWon` (1억 2,345만원), `manwonLabel`, `parseNumber`, `floorTo` (절사), `roundTo`, `formatPercent`,
  `longestRunEm(text)` (estimated em width of the longest unbreakable run: Hangul 1, digits/Latin 0.62, punctuation 0.3; "14,512,345,678원" → 8.72 — use it only if you build another big figure outside `StatementHero`).
- `@/lib/date`: timezone-safe `YMD` helpers — `parseYMD`, `formatYMD`, `formatKoreanDate` ("2026년 10월 9일 (금)"), `addDays`, `addMonths` (clamps day), `diffDays`, `daysInMonth`, `isLeapYear`, `weekdayKo`, `compareYMD`.
- `@/lib/seo`: `pageMetadata({ title, description, path, keywords, noindex })` — title WITHOUT site name (layout appends " | 셈셈 계산기"). The OG image is picked from the path's first segment (`/og/<slug>.png`). `FaqItem` type.
- `@/lib/site`: `SITE_URL`, `SITE_NAME`, `RULE_YEAR` (2026), `RULES_CHECKED_AT`, `absoluteUrl()`, and
  `SITE_CONTACT` — the only public contact channel (GitHub Issues). Link it as
  `<a href={SITE_CONTACT.url}>{SITE_CONTACT.channel}</a>` in prose ("GitHub 이슈") or with `SITE_CONTACT.label`
  ("문의·오류 제보") in UI. Never publish an email address or another contact route.
- CSS helpers for prose content: `.formula` (boxed formula line), `.note` (small grey), `.table-wrap` + `.data-table` (tables; `tr.is-current` highlights a row; cells are right-aligned and do not wrap, so mark description cells `.text-cell` to wrap left-aligned), `.link-grid` (grid of links to programmatic pages; `aria-current="page"` marks the current one).

## Shared rates and money conventions
These keep the same case giving the same number on every page. Follow them; do not re-derive rates.
- **Rates live in `src/lib/rates/`** (verified, shared): `employeeInsurance(monthlyTaxable, payMonth, opts)` and
  `pensionBounds()` in `insurance.ts` (matches the 4insure.or.kr simulator), `monthlyWithholding(monthlyTaxable, family,
  children, ratio, payMonth)` in `withholding.ts` (all 7,117 cells of 간이세액표), `MINIMUM_WAGE`, `minimumWage(year)`,
  `minimumMonthly(year)`, `MONTHLY_STANDARD_HOURS` (209) and 구직급여 caps in `labor.ts`.
- **Integers only for money.** Scale rates to integers (`floor(pay × 3595 / 1,000,000) × 10`), because
  `3,000,000 × 0.009 = 26,999.999…` truncates to the wrong 10원. 보험료·원천세 are cut below 10원 (10원 미만 절사).
- **Pay month (`"YYYY-MM"`) decides the 4대보험 rules.** The 2026 rules change twice: 국민연금 기준소득월액 상·하한 from
  2026-07 (41만~659만원) and 장기요양 = 건강보험료 × 0.1314 from 2026-11 (before: × 0.9448/7.19), so the same pay can differ by 10원.
  - Client calculators use the visitor's month: `rulePayMonth(today.y, today.m)` from `@/lib/rates/insurance` with
    `useToday()`. It clamps to the implemented 2026 window (before 2026 → "2026-01", after 2026 → "2026-12").
    The 시급·주휴수당 calculator uses `liveRateRules(y, m)` (hourly-wage.ts), which switches to the 2027 예상 from 2027;
    the 최저임금 calculator applies the 2027 예상 whenever the 2027 wage is picked.
  - Static pages use one fixed month, "2026-10" (`DEFAULT_PAY_MONTH`, `PAGE_PAY_MONTH`, `HOURLY_PAY_MONTH`), and say
    "2026년 10월분 요율" in the table caption or `basis`.
- **2027 figures are an estimate ('예상') with one meaning everywhere** (status 2026-10-09):
  국민연금 근로자 4.75% → 5.0% (법정 인상), 건강보험료율 7.19% 동결 (2026-09-08 건강보험정책심의위원회 의결, 고시 전),
  장기요양·고용보험 요율과 간이세액표는 미정이라 2026년 값(2026년 12월분 규칙)으로 가정. Use the canonical sentence instead of
  writing your own: `RATE_2027_NOTE` (합니다체, page prose) or `RATE_2027_NOTE_UI` (해요체, calculator footnotes) from
  `@/lib/calc/hourly-wage`. `RATE_2027_NOTE` reads:
  > 2027년 금액은 예상치로, 법으로 정해진 국민연금 인상(근로자 4.75% → 5.0%)과 7.19%로 동결된 건강보험료율(2026년 9월 8일 건강보험정책심의위원회 의결, 고시 전)을 반영하고, 아직 정해지지 않은 장기요양·고용보험 요율과 간이세액표는 2026년 값으로 가정했습니다.

  Employer-side pages also assume 산재보험 평균 1.47% (2027년분은 12월 말 고시) and must say so (`estimate2027()` in
  four-insurance.ts). 구직급여 2027 상한 is not set yet. When any of these is published, update the shared constants and this paragraph.
- **Exact-hours pay for hourly work** (최저임금법 시행령 제5조①3; fact-check item 5 in `docs/research/verifier-corrections.md`):
  월 환산 시간 = (주 소정근로시간 + 주휴시간) × 365/7/12. Only 주 40시간 + 주휴 8시간 uses the official whole 209시간
  (208.57 → 209). Every other schedule uses the exact decimal value: 월급 = 시급 × exact hours, rounded once to the won;
  hours are only **displayed** rounded to 0.01h (주 15시간 → 78.21, 주 20시간 → 104.29). Never ceil or round the hours,
  never pro-rate 209 (20시간 ≠ 104.5). 2026 checks: 주 15시간 807,171원, 주 20시간 1,076,229원, 주 40시간 2,156,880원.
  Use `monthlyPay`, `monthlyPayHours` and `monthlyHours` (display) from `@/lib/calc/hourly-wage`, which work in exact
  1/8400-hour integer units.

## Content & SEO rules
- **H1** contains the primary keyword people type (e.g. "만 나이 계산기"). Programmatic pages put the direct answer in the H1 (e.g. "1990년생 나이: 2026년 만 35세·36세").
- **title** ≤ 45 Korean chars (site name is appended). Primary keyword first. **description** 80–150 chars, includes a concrete number/answer.
- **lead**: 1–2 sentences that answer the query directly. Plain string.
- Prose (children of ToolShell): real, specific content — formula with a worked example, a useful table, rules/edge cases, legal basis with official source links (law.go.kr, 기관 사이트), and caveats. Use `<h2>` for sections. Aim for 600–1,200 Korean characters of genuinely useful text on the main page; programmatic pages ≥ 300 chars of page-specific text plus a page-specific table. No filler, no keyword stuffing.
- FAQ: 4–6 real questions people ask (check Naver/Google "함께 찾는" style phrasing), concise accurate answers.
- Internal links: link to sibling programmatic pages (`.link-grid`) and from the main page to them. Use `next/link`.
- Programmatic pages must be genuinely different from each other (specific numbers, table centered on the value). Only generate pages with real search demand.
- Contact or error-report links use `SITE_CONTACT` (see above).
- Voice: UI microcopy in 해요체, friendly and short ("생년월일을 넣으면 바로 계산해 드려요."). Long-form prose in 합니다체. No emoji. No exclamation marks. Sentence-level clarity over marketing.
- Accuracy: rules must be current for **2026** (today is 2026-10-09). Verify legal numbers with WebSearch/WebFetch against official sources; note 기준일 in `basis` prop. If rules changed during 2026, handle both periods or state the one used. Anything about 2027 follows the 예상 rule above.

## Verification commands (run from project root)
- Tests: `npx vitest run src/lib/calc/<slug>.test.ts`
- Types (filter to your files; other agents may be mid-edit): `npx tsc --noEmit 2>&1 | grep -E "src/(app/<slug>|lib/calc/<slug>)"` (no output = clean)
- Lint: `npx eslint src/app/<slug> src/lib/calc/<slug>.ts`
- **Never** run `next build`, `next dev`, `npm run build` — other agents share the `.next` folder. The orchestrator builds
  and then runs `node scripts/audit.mjs` (links, titles, canonical, JSON-LD).
- Do not use any browser tools (Claude_Browser / claude-in-chrome). Use WebSearch/WebFetch for research.
- Use the Write/Edit tools for files (bash heredocs with Korean text can break on this Windows machine).
