import { describe, expect, it } from "vitest";
import { CATEGORIES, TOOLS, getTool, relatedTools } from "./tools";

const slugs = new Set(TOOLS.map((t) => t.slug));

describe("TOOLS registry", () => {
  it("has unique slugs and known categories", () => {
    expect(slugs.size).toBe(TOOLS.length);
    const cats = new Set(CATEGORIES.map((c) => c.id));
    for (const t of TOOLS) expect(cats.has(t.category), t.slug).toBe(true);
  });

  it("curated related slugs exist, are not self and are not repeated", () => {
    for (const t of TOOLS) {
      const rel = t.related ?? [];
      expect(new Set(rel).size, t.slug).toBe(rel.length);
      for (const s of rel) {
        expect(slugs.has(s), `${t.slug} → ${s}`).toBe(true);
        expect(s, t.slug).not.toBe(t.slug);
      }
    }
  });

  it("curated pairs are symmetric", () => {
    for (const t of TOOLS) {
      for (const s of t.related ?? []) {
        expect(getTool(s).related ?? [], `${s} should list ${t.slug}`).toContain(t.slug);
      }
    }
  });
});

describe("relatedTools", () => {
  it("returns `count` distinct tools without the tool itself", () => {
    for (const t of TOOLS) {
      const r = relatedTools(t.slug, 6).map((x) => x.slug);
      expect(r).toHaveLength(6);
      expect(new Set(r).size).toBe(6);
      expect(r).not.toContain(t.slug);
    }
  });

  it("puts curated companions first, in their listed order", () => {
    expect(relatedTools("salary").map((t) => t.slug).slice(0, 4)).toEqual([
      "severance",
      "unemployment",
      "four-insurance",
      "year-end-tax",
    ]);
    expect(relatedTools("hourly-wage").map((t) => t.slug).slice(0, 2)).toEqual(["minimum-wage", "freelance-tax"]);
    expect(relatedTools("loan").map((t) => t.slug).slice(0, 3)).toEqual(["acquisition-tax", "brokerage-fee", "rent-conversion"]);
    expect(relatedTools("car-tax").map((t) => t.slug).slice(0, 2)).toEqual(["loan", "vat"]);
    expect(relatedTools("bmi").map((t) => t.slug).slice(0, 2)).toEqual(["due-date", "age"]);
    expect(relatedTools("pyeong").map((t) => t.slug).slice(0, 2)).toEqual(["acquisition-tax", "subscription-score"]);
    expect(relatedTools("dday").map((t) => t.slug).slice(0, 2)).toEqual(["holidays", "age"]);
    expect(relatedTools("parental-leave").map((t) => t.slug).slice(0, 2)).toEqual(["due-date", "salary"]);
  });

  it("fills with same-category tools before other categories", () => {
    const r = relatedTools("savings");
    expect(r.every((t) => t.category === "money")).toBe(true);
  });

  it("links every tool from at least two other tools' related blocks", () => {
    const inbound = new Map(TOOLS.map((t) => [t.slug, 0]));
    for (const t of TOOLS) {
      for (const r of relatedTools(t.slug, 6)) inbound.set(r.slug, inbound.get(r.slug)! + 1);
    }
    const orphans = [...inbound].filter(([, n]) => n < 2);
    expect(orphans).toEqual([]);
  });

  it("respects a smaller count", () => {
    expect(relatedTools("char-count", 3)).toHaveLength(3);
  });
});
