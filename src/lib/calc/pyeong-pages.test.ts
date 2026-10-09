import { describe, expect, it } from "vitest";
import { PYEONG_PAGE_M2 } from "./pyeong";
import { AREA_NOTES, buildAreaPage, estimateRows, nearWholePyeong, paraText, type Para } from "./pyeong-pages";

const TOOL_PATHS = new Set(["/pyeong/", "/acquisition-tax/", "/subscription-score/", "/brokerage-fee/"]);

function allParas(m2: number): Para[] {
  const p = buildAreaPage(m2);
  return [p.numbers, ...p.about, p.estimateIntro, ...p.rules, ...p.compare];
}

function sentences(m2: number): string[] {
  return allParas(m2)
    .map(paraText)
    .join(" ")
    .split(/(?<=다\.)\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Template-insensitive form: numbers removed, so "84㎡" and "59㎡" sentences compare equal. */
const normalize = (s: string) => s.replace(/[\d.,~]+/g, "#");

describe("pyeong programmatic pages", () => {
  it("84㎡ answers with the standard figures", () => {
    const p = buildAreaPage(84);
    expect(p.h1).toBe("84㎡는 몇 평? 25.41평");
    expect(p.lead).toContain("25.41평");
    expect(p.lead).toContain("약 34평형");
    expect(p.estimates.find((r) => r.typical)?.areaM2).toBeCloseTo(112, 6);
  });

  it("every page has hand-written text and page-specific prose", () => {
    for (const m2 of PYEONG_PAGE_M2) {
      expect(AREA_NOTES[m2]?.length ?? 0, `note ${m2}`).toBeGreaterThanOrEqual(150);
      const mine = sentences(m2);
      const others = PYEONG_PAGE_M2.filter((n) => n !== m2).flatMap(sentences);
      // Sentences stated about this area only (its own numbers or its own note).
      const own = mine.filter((s) => !others.includes(s)).join("");
      expect(own.length, `own text ${m2}`).toBeGreaterThanOrEqual(500);
      // Even with every number blanked out, a real chunk of text belongs to this page alone.
      const otherForms = new Set(others.map(normalize));
      const distinct = mine.filter((s) => !otherForms.has(normalize(s))).join("");
      expect(distinct.length, `distinct text ${m2}`).toBeGreaterThanOrEqual(150);
    }
  });

  it("studio areas get 원룸·오피스텔 wording, not an apartment 평형 FAQ", () => {
    for (const m2 of [20, 30]) {
      const p = buildAreaPage(m2);
      expect(p.band).toBe("studio");
      expect(p.faq.some((f) => f.q.includes("아파트는 몇 평형"))).toBe(false);
      expect(p.lead).toContain("오피스텔");
      expect(p.estimates.every((r) => r.kind === "오피스텔")).toBe(true);
    }
    expect(buildAreaPage(59).faq.some((f) => f.q.includes("아파트는 몇 평형"))).toBe(true);
  });

  it("states the rule lines on the right side", () => {
    const text = (m2: number) => allParas(m2).map(paraText).join(" ") + buildAreaPage(m2).faq.map((f) => f.a).join(" ");
    expect(text(59)).toContain("가점제 40%, 추첨제 60%");
    expect(text(84)).toContain("가점제 70%, 추첨제 30%");
    expect(text(84)).toContain("상한까지 1㎡ 여유");
    expect(text(85)).toContain("상한에 딱 맞게 포함");
    expect(buildAreaPage(85).lead).toContain("국민주택규모의 상한");
    expect(text(90)).toContain("100㎡라서, 그런 곳의 주택이라면 국민주택규모에 들어갑니다");
    expect(text(90)).toContain("서울·부산 600만원");
    expect(text(114)).toContain("서울·부산 1,000만원");
    expect(text(165)).toContain("서울·부산 1,500만원");
    expect(text(101)).toContain("가점제 80%");
    expect(text(20)).toContain("4.6%");
  });

  it("near-whole 평 detection", () => {
    expect(nearWholePyeong(33)).toBe(10);
    expect(nearWholePyeong(66)).toBe(20);
    expect(nearWholePyeong(165)).toBe(50);
    expect(nearWholePyeong(84)).toBeNull();
  });

  it("estimate rows by band", () => {
    expect(estimateRows(20).map((r) => r.ratio)).toEqual([0.5, 0.55, 0.6]);
    expect(estimateRows(46).map((r) => `${r.kind}${r.ratio}`)).toEqual(["오피스텔0.55", "아파트0.7", "아파트0.75", "아파트0.8"]);
    expect(estimateRows(101).every((r) => r.kind === "아파트")).toBe(true);
  });

  it("metadata is unique and within length rules", () => {
    const titles = new Set<string>();
    const descs = new Set<string>();
    for (const m2 of PYEONG_PAGE_M2) {
      const p = buildAreaPage(m2);
      expect(p.title.length, `title ${m2}`).toBeLessThanOrEqual(45);
      expect(p.description.length, `desc ${m2}`).toBeGreaterThanOrEqual(80);
      expect(p.description.length, `desc ${m2}`).toBeLessThanOrEqual(150);
      titles.add(p.title);
      descs.add(p.description);
      expect(p.faq.length).toBeGreaterThanOrEqual(4);
    }
    expect(titles.size).toBe(PYEONG_PAGE_M2.length);
    expect(descs.size).toBe(PYEONG_PAGE_M2.length);
  });

  it("links only to pages that exist, and back to the main tool", () => {
    for (const m2 of PYEONG_PAGE_M2) {
      const links = allParas(m2)
        .flat()
        .filter((s): s is { text: string; href: string } => typeof s === "object" && "href" in s);
      expect(links.some((l) => l.href === "/pyeong/")).toBe(true);
      expect(links.some((l) => l.href === "/acquisition-tax/")).toBe(true);
      expect(links.some((l) => l.href === "/subscription-score/")).toBe(true);
      for (const l of links) {
        const page = /^\/pyeong\/(\d+)\/$/.exec(l.href);
        if (page) expect(PYEONG_PAGE_M2).toContain(Number(page[1]));
        else expect(TOOL_PATHS.has(l.href), l.href).toBe(true);
      }
    }
  });

  it("prose and FAQ stay in 합니다체", () => {
    for (const m2 of PYEONG_PAGE_M2) {
      const p = buildAreaPage(m2);
      const all = [...allParas(m2).map(paraText), p.lead, p.description, p.estimateNote, ...p.faq.map((f) => f.a)].join(" ");
      expect(all, `voice ${m2}`).not.toMatch(/(어요|아요|해요|드려요|세요)[.\s]/);
      expect(all).not.toMatch(/!/);
    }
  });
});
