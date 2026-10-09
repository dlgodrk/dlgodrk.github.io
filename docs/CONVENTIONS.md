# 셈셈 계산기 — conventions for building a calculator

Project root: the repository root (package name `semcalc`).
Live URL: https://dlgodrk.github.io/ (GitHub Pages, served at the domain root; if a basePath is ever added, links keep working only when you link with `next/link` or `absoluteUrl()`, never raw "/path" strings in `<a>`/`<img>`) — brand name **셈셈 계산기** (short: 셈셈).
Audience: Korean adults on phones (≈75% mobile). Every page is Korean.

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

## Files you own for tool `<slug>`
| File | Purpose |
|---|---|
| `src/lib/calc/<slug>.ts` | Pure functions + constants + programmatic param lists. No React, no Date.now(). |
| `src/lib/calc/<slug>.test.ts` | Vitest tests with real-world vectors (cite sources in comments). |
| `src/app/<slug>/page.tsx` | Server page: `export const metadata = pageMetadata({...})`, `<ToolShell>`, prose, FAQ. |
| `src/app/<slug>/<Pascal>Calculator.tsx` | `"use client"` interactive calculator. |
| `src/app/<slug>/[param]/page.tsx` | Optional programmatic pages (`dynamicParams = false`). |
| other files under `src/app/<slug>/` | Any extra components only this tool uses. |

**Do NOT edit shared files**: anything in `src/components/`, `src/lib/{format,date,seo,site,tools,useUrlState,useToday}.ts`,
`src/app/{layout.tsx,page.tsx,globals.css,not-found.tsx}`, `next.config.ts`, `package.json`, `scripts/`, other tools' folders.
If a shared file has a bug or you need a new shared capability, implement a local helper inside your own files and
**report** the needed shared change in your final output (`shared_change_requests`).
Do not install packages.

## Shared building blocks
- `ToolShell` (`@/components/ToolShell`): page frame — breadcrumbs, H1, lead, calculator, prose (`children`), FAQ, related tools, JSON-LD (BreadcrumbList, WebApplication, FAQPage). Props: `slug, h1, lead, basis, calculator, faq, path, extraCrumbs, appCategory` (`"FinanceApplication"` for money tools, `"HealthApplication"` for health, default Utilities).
- `CalcLayout` (`@/components/CalcLayout`): `inputs` (left) + `result` (right, sticky) + share button. `CalcNotice` for empty/invalid state.
- Fields (`@/components/fields`): `NumberField` (comma formatting, `unit`, `presets`, `reading`, `decimals`, `max`), `SegmentedField`, `SelectField`, `DateField` (value `"YYYY-MM-DD"`), `StepperField`, `CheckboxField`, `TextAreaField`.
- Statement (`@/components/Statement`): the site's signature result view (명세서).
  `Statement` › `StatementHero` (one big answer; optional `stamp` = 2–3 char red seal, only for the primary money/date answer) › `StatementSection` › `StatementRow` (`label`, `value`, `note`, `emphasis`) › `StatementTotal` › `StatementFootnote`.
- `useUrlState({ k: default, ... })` (`@/lib/useUrlState`): inputs live in the query string so results are shareable. Keys 1–3 chars. Defaults must be the values you want rendered in the static HTML.
- `useToday()` (`@/lib/useToday`): hydration-safe "today" (KST). First render = build date, then real today.
  **Never call `new Date()`, `Date.now()` or `todayKST()` during render** in client components (hydration mismatch). Server pages may use `RULE_YEAR` from `@/lib/site` for year-based copy.
- `@/lib/format`: `formatNumber(n, digits)`, `formatWon`, `koreanWon` (1억 2,345만원), `manwonLabel`, `parseNumber`, `floorTo` (절사), `roundTo`, `formatPercent`.
- `@/lib/date`: timezone-safe `YMD` helpers — `parseYMD`, `formatYMD`, `formatKoreanDate` ("2026년 10월 9일 (금)"), `addDays`, `addMonths` (clamps day), `diffDays`, `daysInMonth`, `isLeapYear`, `weekdayKo`, `compareYMD`.
- `@/lib/seo`: `pageMetadata({ title, description, path, keywords })` — title WITHOUT site name (layout appends " | 셈셈 계산기"). `FaqItem` type.
- CSS helpers for prose content: `.formula` (boxed formula line), `.note` (small grey), `.table-wrap` + `.data-table` (tables; `tr.is-current` highlights a row), `.link-grid` (grid of links to programmatic pages).

## Content & SEO rules
- **H1** contains the primary keyword people type (e.g. "만 나이 계산기"). Programmatic pages put the direct answer in the H1 (e.g. "1990년생 나이: 2026년 만 35세·36세").
- **title** ≤ 45 Korean chars (site name is appended). Primary keyword first. **description** 80–150 chars, includes a concrete number/answer.
- **lead**: 1–2 sentences that answer the query directly. Plain string.
- Prose (children of ToolShell): real, specific content — formula with a worked example, a useful table, rules/edge cases, legal basis with official source links (law.go.kr, 기관 사이트), and caveats. Use `<h2>` for sections. Aim for 600–1,200 Korean characters of genuinely useful text on the main page; programmatic pages ≥ 300 chars of page-specific text plus a page-specific table. No filler, no keyword stuffing.
- FAQ: 4–6 real questions people ask (check Naver/Google "함께 찾는" style phrasing), concise accurate answers.
- Internal links: link to sibling programmatic pages (`.link-grid`) and from the main page to them. Use `next/link`.
- Programmatic pages must be genuinely different from each other (specific numbers, table centered on the value). Only generate pages with real search demand.
- Voice: UI microcopy in 해요체, friendly and short ("생년월일을 넣으면 바로 계산해 드려요."). Long-form prose in 합니다체. No emoji. No exclamation marks. Sentence-level clarity over marketing.
- Accuracy: rules must be current for **2026** (today is 2026-10-09). Verify legal numbers with WebSearch/WebFetch against official sources; note 기준일 in `basis` prop. If rules changed during 2026, handle both periods or state the one used.

## Verification commands (run from project root)
- Tests: `npx vitest run src/lib/calc/<slug>.test.ts`
- Types (filter to your files; other agents may be mid-edit): `npx tsc --noEmit 2>&1 | grep -E "src/(app/<slug>|lib/calc/<slug>)"` (no output = clean)
- Lint: `npx eslint src/app/<slug> src/lib/calc/<slug>.ts`
- **Never** run `next build`, `next dev`, `npm run build` — other agents share the `.next` folder. The orchestrator builds.
- Do not use any browser tools (Claude_Browser / claude-in-chrome). Use WebSearch/WebFetch for research.
- Use the Write/Edit tools for files (bash heredocs with Korean text can break on this Windows machine).
