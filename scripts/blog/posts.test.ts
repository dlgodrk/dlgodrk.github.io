/**
 * Generator + checks for the Naver blog posts in docs/blog/.
 *
 *   Check (default):  npx vitest run -c scripts/blog/vitest.config.ts
 *   Regenerate:       BLOG_WRITE=1 npx vitest run -c scripts/blog/vitest.config.ts
 *                     (PowerShell: $env:BLOG_WRITE=1; npx vitest run -c scripts/blog/vitest.config.ts; Remove-Item Env:BLOG_WRITE)
 *
 * The numbers come from the site's calculators (posts.ts imports src/lib/calc/*.ts). The cross-checks
 * below recompute them independently from the published rules and pin the official figures the site's
 * own tests are built on, so a post can never drift from the law or from the site.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { calcSalary } from "@/lib/calc/salary";
import {
  dayOfWeek,
  holidayBlocks,
  holidaysOf,
  leaveTips,
  longestByLeave,
  recommendedPlan,
  shortMdw,
  substituteDates,
  TIP_MAX_LEAVE,
  yearSummary,
} from "@/lib/calc/holidays";
import { parseYMD } from "@/lib/date";
import { META_END, META_START, proseText, SITE_URL } from "./html";
import {
  belowMinimumManwon,
  buildPosts,
  DISCLOSURE,
  longestTip,
  MIN_WAGE_HOURS,
  minWageRaise,
  minWageRow,
  novemberChanges,
  pension2027,
  pensionCapManwon,
  SALARY_TABLE_MANWON,
  salaryRow,
  spanLabel,
  tipPlans,
} from "./posts";

const ROOT = path.resolve(__dirname, "../..");
const OUT_DIR = path.join(ROOT, "docs", "blog");
const WRITE = process.env.BLOG_WRITE === "1";
const posts = buildPosts();

const floor10 = (x: number) => Math.floor(x / 10) * 10;
const post = (file: string) => {
  const hit = posts.find((x) => x.file === file);
  if (!hit) throw new Error(`no post ${file}`);
  return hit;
};
const weekday = (s: string) => dayOfWeek(parseYMD(s)!);

describe("cross-check: 2026 연봉 실수령액 (independent recomputation)", () => {
  it("matches the site's verified vector: 연봉 3,840만원 → 월 2,826,700원 (salary.test.ts, 4insure 모의계산)", () => {
    expect(calcSalary({ annual: 38_400_000, nonTaxable: 200_000, family: 1 }).monthlyNet).toBe(2_826_700);
  });

  it("every table row's 4대보험 equals the published 2026 formulas (2026년 10월분)", () => {
    for (const m of SALARY_TABLE_MANWON) {
      const r = salaryRow(m);
      const gross = Math.floor((m * 10_000) / 12);
      const taxable = gross - 200_000;
      // 국민연금 4.75%: 기준소득월액 천원 미만 절사, 41만~659만원 (2026.7~2027.6)
      const base = Math.min(Math.max(Math.floor(taxable / 1000) * 1000, 410_000), 6_590_000);
      const pension = floor10((base * 4.75) / 100 + 1e-9);
      // 건강보험 3.595%, 장기요양 = 건강보험료 × 0.9448/7.19 (2026년 10월분까지), 고용보험 0.9%
      const health = floor10(Math.round(taxable * 3.595 * 1000) / 100_000);
      const care = floor10((health * 9448) / 71_900);
      const employment = floor10(Math.round(taxable * 0.9 * 1000) / 100_000);
      expect(r.monthlyGross, `${m}`).toBe(gross);
      expect(r.insurance.pension, `${m} pension`).toBe(pension);
      expect(r.insurance.health, `${m} health`).toBe(health);
      expect(r.insurance.longTermCare, `${m} care`).toBe(care);
      expect(r.insurance.employment, `${m} employment`).toBe(employment);
      // 지방소득세 = 소득세 × 10%, 10원 미만 절사
      expect(r.tax.localTax).toBe(floor10(r.tax.incomeTax / 10));
      expect(r.monthlyNet).toBe(gross - r.insurance.total - r.tax.total);
    }
  });

  it("pins the figures quoted in the post", () => {
    expect(salaryRow(4_000).monthlyNet).toBe(2_935_813); // same as the /salary/ page example
    expect(salaryRow(10_000).monthlyNet).toBe(6_530_923);
    expect(pensionCapManwon()).toBe(8_148);
    expect(salaryRow(8_148).insurance.pension).toBe(313_020);
    expect(salaryRow(8_147).insurance.pension).toBeLessThan(313_020);
    expect(pension2027(salaryRow(4_000)) - salaryRow(4_000).insurance.pension).toBe(7_840);
    // 11월분 장기요양 × 0.1314: only ±10원 changes, all in the same direction (the sentence assumes it)
    const nov = novemberChanges();
    expect(nov.length).toBeGreaterThan(0);
    expect(new Set(nov.map((x) => x.diff))).toEqual(new Set([10]));
  });

  it("pins the comparisons the prose states in words", () => {
    // "연봉 3,000만원은 소득세와 지방소득세가 … 4대보험의 14% 수준인데, 1억원에서는 … 4대보험보다 많습니다"
    expect(salaryRow(3_000).tax.total).toBeLessThan(salaryRow(3_000).insurance.total);
    expect(salaryRow(10_000).tax.total).toBeGreaterThan(salaryRow(10_000).insurance.total);
    // 표 1 note: only 연봉 2,400만원 (월 2,000,000원) is below the 2026 최저임금 월 환산액 for 주 40시간
    // (10,320원 × 209 = 2,156,880원; 2024년부터 식대 등 매달 주는 복리후생비도 산입되므로 식대를 더해도 같음).
    expect(belowMinimumManwon()).toEqual([2_400]);
    expect(salaryRow(2_400).monthlyGross).toBe(2_000_000);
    expect(salaryRow(2_600).monthlyGross).toBeGreaterThanOrEqual(10_320 * 209);
    const prose = proseText(post("2026-salary-take-home-table.html").html);
    expect(prose).toContain("2,156,880원(연 25,882,560원)");
    expect(prose).not.toContain("퇴직금 포함 연봉이 아니면");
    // The calculator clamps 2027 visits to 2026년 12월분 (rulePayMonth), so the post must not promise 2027 rates.
    expect(prose).toContain("2026년에는 접속한 달의 요율이 자동으로 적용되고");
  });
});

describe("cross-check: 2027 최저임금", () => {
  it("official 월 환산액 (최저임금위원회): 2026 2,156,880원, 2027 2,236,300원 (= 시급 × 209)", () => {
    expect(minWageRow(2026, 40).monthly).toBe(2_156_880);
    expect(minWageRow(2027, 40).monthly).toBe(10_700 * 209);
    expect(minWageRow(2027, 40).monthly).toBe(2_236_300);
  });

  it("주휴수당 and 월급 equal 시급 × 주/40 × 8 and 시급 × (주 + 주휴) × 365/84 (주 40시간 = 209)", () => {
    for (const h of MIN_WAGE_HOURS) {
      const r = minWageRow(2027, h);
      const jh = (Math.min(h, 40) / 40) * 8;
      expect(r.juhyuHours).toBe(jh);
      expect(r.juhyuPay).toBe(10_700 * jh);
      expect(r.weekly).toBe(10_700 * (h + jh));
      const monthly = h === 40 ? 10_700 * 209 : Math.round((10_700 * (h + jh) * 365) / 84);
      expect(r.monthly, `${h}h`).toBe(monthly);
    }
    expect(minWageRow(2027, 20).monthly).toBe(1_115_857);
    expect(minWageRow(2027, 15).monthly).toBe(836_893);
  });

  it("세후 인상액이 작은 이유: the pension rate explains only part of the gap", () => {
    const r = minWageRaise();
    expect(r.gross).toBe(2_236_300 - 2_156_880); // 79,420
    expect(r.net).toBe(63_250);
    expect(r.gap).toBe(16_170);
    // 국민연금 기준소득월액 2,236,000원 (천원 미만 절사): 5.0% 111,800원 − 4.75% 106,210원
    expect(r.rateOnly).toBe(floor10((2_236_000 * 500) / 10_000) - floor10((2_236_000 * 475) / 10_000));
    expect(r.rateOnly).toBe(5_590);
    // the rest comes from 4대보험·소득세 rising with the higher pay, so the sentence names both causes
    expect(r.payDriven).toBe(10_580);
    const prose = proseText(post("2027-minimum-wage-monthly-pay.html").html);
    expect(prose).toContain("월급이 오르면 4대보험료와 소득세도 함께 늘고");
    expect(prose).toContain("세후 인상액은 세전 인상액보다 16,170원 작습니다. 이 차이 가운데 요율 인상 몫은 5,590원입니다.");
    // 단시간근로자 초과근로 가산 (기간제법 제6조) and the 주휴 개근 요건 source (시행령 제30조 제1항)
    expect(prose).toContain("기간제 및 단시간근로자 보호 등에 관한 법률 제6조");
    expect(prose).toContain("근로기준법 제55조, 같은 법 시행령 제30조 제1항");
  });
});

describe("cross-check: 2027 공휴일", () => {
  it("월력요항 (우주항공청 2026-06-29): 관공서 공휴일 76일, 실질 72일, 주 5일 휴일 119일", () => {
    const s = yearSummary(2027);
    expect(s.officialDays).toBe(76);
    expect(s.realDays).toBe(72);
    expect(s.restDays5).toBe(119);
    expect(s.substitutes).toBe(7);
    // the post compares with 2026 in fixed words ("많지만", "적습니다")
    expect(s.substitutes).toBeGreaterThan(yearSummary(2026).substitutes);
    expect(s.onWeekdays).toBeLessThan(yearSummary(2026).onWeekdays);
  });

  it("대체공휴일 dates follow 관공서의 공휴일에 관한 규정 제3조", () => {
    const list = holidaysOf(2027);
    const base = list.filter((h) => !h.substituteFor);
    const subs = list.filter((h) => h.substituteFor).map((h) => h.date);
    expect(substituteDates(base)).toEqual(subs);
    expect(subs).toEqual(["2027-02-09", "2027-05-03", "2027-07-19", "2027-08-16", "2027-10-04", "2027-10-11", "2027-12-27"]);
  });

  it("the recommended plans quoted in the post", () => {
    const rows = tipPlans(2027).map(({ tip, plan }) => `${tip.label}|${plan.leave}|${spanLabel(plan.start, plan.end)}|${plan.length}`);
    expect(rows).toEqual([
      "성탄절·신정|4|2026년 12/25(금) ~ 2027년 1/3(일)|10",
      "설 연휴|3|2/6(토) ~ 2/14(일)|9",
      "노동절·어린이날|1|5/1(토) ~ 5/5(수)|5",
      "노동절·어린이날|3|5/1(토) ~ 5/9(일)|9",
      "부처님오신날|1|5/13(목) ~ 5/16(일)|4",
      "추석 연휴|2|9/11(토) ~ 9/19(일)|9",
      "개천절·한글날|4|10/2(토) ~ 10/11(월)|10",
    ]);
  });

  it("가장 길게 쉬는 연휴 = 추석 for every 연차 count (same as the /holidays/2027/ FAQ)", () => {
    const maxima = longestByLeave(leaveTips(2027));
    expect(maxima.map((x) => x.leave)).toEqual([1, 2, 3, 4]);
    expect(maxima.map((x) => x.plan.length)).toEqual([6, 9, 10, 11]);
    for (const x of maxima) expect(x.tip.label).toBe("추석 연휴");
    const four = maxima[3].plan;
    expect(four.leaveDates.map(shortMdw)).toEqual(["9/9(목)", "9/10(금)", "9/13(월)", "9/17(금)"]);
    expect(spanLabel(four.start, four.end)).toBe("9/9(목) ~ 9/19(일)");
    expect(longestTip(2027).maxima.map((x) => x.plan.length)).toEqual([6, 9, 10, 11]);
    // 10월 (연차 4일 → 10일) is shorter than 추석 with the same 4 days, so the post must not call it the longest
    expect(maxima[3].plan.length).toBeGreaterThan(10);
    const prose = proseText(post("2027-holidays-leave-tips.html").html);
    expect(prose).toContain("2027년에 가장 길게 쉴 수 있는 연휴는 추석입니다. 연차 1일이면 6일, 2일이면 9일, 3일이면 10일, 4일이면 11일을 쉽니다.");
    expect(prose).toContain("9/9(목)·9/10(금)·9/13(월)·9/17(금)에 써서 9월 9일(목)부터 19일(일)까지 11일을 쉽니다.");
    expect(prose).not.toMatch(/가장 길게 쉬려면 10월/);
  });

  it("no '연차 효율이 가장 좋은' superlative: by the site's own score 어린이날 (3.0) beats 추석 (2.0)", () => {
    // recommendedPlan score = (length − block − leave) / leave
    const score = (name: string) => {
      const b = holidayBlocks(2027).find((x) => x.name === name)!;
      const p = recommendedPlan(b, TIP_MAX_LEAVE)!;
      return (p.length - b.length - p.leave) / p.leave;
    };
    expect(score("어린이날")).toBe(3);
    expect(score("부처님오신날")).toBe(2);
    expect(score("추석 연휴")).toBe(2);
    const prose = proseText(post("2027-holidays-leave-tips.html").html);
    expect(prose).not.toMatch(/효율이 가장|가장 효율/);
  });

  it("weekdays and dates the prose names", () => {
    // "노동절과 제헌절 … 두 날이 모두 토요일이라 5월 3일과 7월 19일이 … 대체공휴일"
    expect(weekday("2027-05-01")).toBe(6);
    expect(weekday("2027-07-17")).toBe(6);
    // "성탄절(12월 25일)과 2027년 신정(1월 1일)이 모두 금요일"
    expect(weekday("2026-12-25")).toBe(5);
    expect(weekday("2027-01-01")).toBe(5);
    const prose = proseText(post("2027-holidays-leave-tips.html").html);
    expect(prose).toContain("노동절(5월 1일)이 새로 공휴일이 되고 제헌절(7월 17일)이 다시 공휴일이 되었으며, 두 날 모두 대체공휴일 대상입니다.");
    expect(prose).toContain("두 날이 모두 토요일이라 5월 3일과 7월 19일이 처음으로 대체공휴일이 됩니다.");
    expect(prose).toContain("개천절 대체공휴일(10월 4일)과 한글날(10월 9일) 사이 10/5(화)");
    expect(prose).toContain("성탄절(12월 25일)과 2027년 신정(1월 1일)이 모두 금요일이라");
    // 근로기준법 제60조 연차 does not apply under 5 employees (시행령 제7조 별표 1)
    expect(prose).toContain("상시 5명 미만 사업장은 연차유급휴가 조항이 적용되지 않아");
  });
});

describe("post format (Naver SmartEditor paste)", () => {
  it.each(posts.map((post) => [post.file, post] as const))("%s", (_file, post) => {
    const { html, title } = post;
    // title ≤ 40자, also used as <title>
    expect([...title].length).toBeLessThanOrEqual(40);
    expect(html).toContain(`<title>${title}</title>`);
    // 1,500–2,500자 of prose (tables and the info box excluded, spaces included)
    const prose = proseText(html);
    expect(prose.length, `prose length ${prose.length}`).toBeGreaterThanOrEqual(1_500);
    expect(prose.length, `prose length ${prose.length}`).toBeLessThanOrEqual(2_500);
    // simple semantic HTML only
    expect(html).not.toMatch(/<script|<style|<link|<iframe|<img|\sclass=|\sid=|javascript:/i);
    const tables = html.match(/<table[^>]*>/g) ?? [];
    expect(tables.length).toBeGreaterThanOrEqual(1);
    expect(tables.length).toBeLessThanOrEqual(2);
    for (const t of tables) expect(t).toContain('border="1"');
    // links: exactly one site link per post, never repeated (docs/PROMOTION.md 네이버 블로그: 글마다 사이트 링크는 1개만)
    const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
    expect(post.links).toHaveLength(1);
    expect(hrefs).toEqual(post.links.map((l) => `${SITE_URL}${l}`));
    // disclosure: the paragraph that carries the link says the author runs the site (docs/community/README.md 원칙 1),
    // in the copyable body, not only in the info box
    const body = html.replace(new RegExp(`${META_START}[\\s\\S]*?${META_END}`), "");
    const linkParagraph = body.match(/<p[^>]*>(?:(?!<\/p>)[\s\S])*<a href=[\s\S]*?<\/p>/)?.[0] ?? "";
    expect(linkParagraph).toContain(DISCLOSURE);
    expect(prose).toMatch(/직접 만들|제가 만든/);
    // voice: no exclamation marks, no emoji, 합니다체 endings (no 해요체 imperatives such as "보세요."), a source line
    expect(prose).not.toMatch(/[!！]/);
    expect(prose).not.toMatch(/\p{Extended_Pictographic}/u);
    expect(prose).toMatch(/습니다\./);
    expect(prose).not.toMatch(/요[.?]/);
    expect(prose).toContain("출처:");
    expect(prose).not.toMatch(/undefined|NaN|\[object/);
  });

  it("README lists every title and file", () => {
    const readme = readFileSync(path.join(OUT_DIR, "README.md"), "utf8");
    for (const post of posts) {
      expect(readme).toContain(post.title);
      expect(readme).toContain(post.file);
      for (const tag of post.tags) expect(readme).toContain(tag);
    }
  });
});

describe("docs/blog/*.html", () => {
  it.each(posts.map((post) => [post.file, post] as const))("%s is up to date", (file, post) => {
    const target = path.join(OUT_DIR, file);
    if (WRITE) {
      mkdirSync(OUT_DIR, { recursive: true });
      writeFileSync(target, post.html, "utf8");
    }
    expect(existsSync(target), `${file} missing; run with BLOG_WRITE=1`).toBe(true);
    expect(readFileSync(target, "utf8"), `${file} is stale; run with BLOG_WRITE=1`).toBe(post.html);
  });
});
