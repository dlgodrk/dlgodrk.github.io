import { describe, expect, it } from "vitest";
import { SALARY_PAGE_MANWON } from "./salary";
import {
  annualPagesNear,
  bracketPages,
  ESTIMATE_2027_PAY_MONTH,
  estimate2027,
  MONTHLY_PAGE_MANWON,
  monthlyNeighbors,
  monthlyPageGroups,
  monthlyPagePath,
  monthlyPagesNear,
  monthlyStep,
  salaryForMonthlyManwon,
} from "./salary-monthly";
import { LTC_ROUNDED_FROM, salaryForManwon, vsMinimumHourly } from "./salary-ui";

describe("월급 page list", () => {
  it("covers 150만~600만원 by 10만원, then 650만~1,000만원 by 50만원", () => {
    expect(MONTHLY_PAGE_MANWON).toHaveLength(54);
    expect(MONTHLY_PAGE_MANWON[0]).toBe(150);
    expect(MONTHLY_PAGE_MANWON.at(-1)).toBe(1_000);
    for (let i = 1; i < MONTHLY_PAGE_MANWON.length; i++) {
      const prev = MONTHLY_PAGE_MANWON[i - 1];
      expect(MONTHLY_PAGE_MANWON[i] - prev).toBe(monthlyStep(prev));
    }
    expect(MONTHLY_PAGE_MANWON).toContain(600);
    expect(MONTHLY_PAGE_MANWON).not.toContain(610);
  });

  it("lives under the static monthly folder with numeric params only", () => {
    expect(monthlyPagePath(300)).toBe("/salary/monthly/300/");
    for (const m of MONTHLY_PAGE_MANWON) expect(String(m)).toMatch(/^\d+$/);
  });

  it("groups every page into exactly one link-grid section", () => {
    const groups = monthlyPageGroups();
    expect(groups.map((g) => g.title)).toEqual([
      "월급 150만~300만원",
      "월급 310만~450만원",
      "월급 460만~600만원",
      "월급 650만~1,000만원",
    ]);
    expect(groups.flatMap((g) => g.items)).toEqual(MONTHLY_PAGE_MANWON);
  });

  it("shows up to 9 neighbours, shifting the window at the ends", () => {
    expect(monthlyNeighbors(300)).toEqual([260, 270, 280, 290, 300, 310, 320, 330, 340]);
    expect(monthlyNeighbors(150)).toEqual([150, 160, 170, 180, 190, 200, 210, 220, 230]);
    expect(monthlyNeighbors(1_000)).toEqual([600, 650, 700, 750, 800, 850, 900, 950, 1_000]);
    expect(monthlyNeighbors(305)).toEqual([]);
  });
});

describe("salaryForMonthlyManwon", () => {
  it("월급 300만원 (식대 20만원 비과세, 본인 1명, 2026년 10월분)", () => {
    const r = salaryForMonthlyManwon(300);
    expect(r.monthlyGross).toBe(3_000_000);
    expect(r.monthlyTaxable).toBe(2_800_000);
    // Hand check: 2,800,000 × 4.75% = 133,000 / × 3.595% = 100,660 / 100,660 × 0.9448 ÷ 7.19 = 13,227 → 13,220 / × 0.9% = 25,200
    expect(r.insurance).toMatchObject({ pension: 133_000, health: 100_660, longTermCare: 13_220, employment: 25_200, total: 272_080 });
    expect(r.monthlyNet).toBe(3_000_000 - 272_080 - r.tax.total);
    // Same pay as 연봉 3,600만원 ÷ 12
    expect(r).toEqual(salaryForManwon(3_600));
  });

  it("월급 150만원: 4대보험 hand check", () => {
    const r = salaryForMonthlyManwon(150);
    // 1,300,000 × 4.75% = 61,750 / × 3.595% = 46,735 → 46,730 / 46,730 × 0.9448 ÷ 7.19 = 6,140.6 → 6,140 / × 0.9% = 11,700
    expect(r.insurance).toMatchObject({ pension: 61_750, health: 46_730, longTermCare: 6_140, employment: 11_700, total: 126_320 });
  });

  it("matches the verified 4insure vector for 최저임금 월급 2,156,880원 with no 비과세", () => {
    const r = salaryForMonthlyManwon(215.688, { nonTaxable: 0 });
    expect(r.monthlyGross).toBe(2_156_880);
    expect(r.insurance.total).toBe(209_530);
  });

  it("ignores 퇴직금 포함 and keeps the 월급 exact", () => {
    expect(salaryForMonthlyManwon(310, { severanceIncluded: true }).monthlyGross).toBe(3_100_000);
  });

  it("pays more with 식대 비과세 and with more 공제대상가족 on every page", () => {
    for (const m of MONTHLY_PAGE_MANWON) {
      const base = salaryForMonthlyManwon(m);
      expect(base.monthlyNet).toBeGreaterThan(salaryForMonthlyManwon(m, { nonTaxable: 0 }).monthlyNet);
      expect(salaryForMonthlyManwon(m, { family: 4, children: 2 }).monthlyNet).toBeGreaterThan(base.monthlyNet);
    }
  });

  it("keeps the 장기요양 label true for every 월급 page in both periods", () => {
    for (const m of MONTHLY_PAGE_MANWON) {
      const oct = salaryForMonthlyManwon(m);
      const nov = salaryForMonthlyManwon(m, { payMonth: LTC_ROUNDED_FROM });
      expect(oct.insurance.longTermCare).toBe(Math.floor((oct.insurance.health * 9448) / 719_000) * 10);
      expect(nov.insurance.longTermCare).toBe(Math.floor((nov.insurance.health * 1314) / 100_000) * 10);
    }
    const changed = MONTHLY_PAGE_MANWON.filter(
      (m) => salaryForMonthlyManwon(m).monthlyNet !== salaryForMonthlyManwon(m, { payMonth: LTC_ROUNDED_FROM }).monthlyNet,
    );
    expect(changed).toEqual([190, 480, 520, 650, 900]);
  });
});

describe("cross-links between 연봉 and 월급 pages", () => {
  it("brackets a value inside a sorted list", () => {
    expect(bracketPages(300, MONTHLY_PAGE_MANWON)).toEqual([300]);
    expect(bracketPages(333.3333, MONTHLY_PAGE_MANWON)).toEqual([330, 340]);
    expect(bracketPages(625, MONTHLY_PAGE_MANWON)).toEqual([600, 650]);
    expect(bracketPages(149, MONTHLY_PAGE_MANWON)).toEqual([]);
    expect(bracketPages(1_001, MONTHLY_PAGE_MANWON)).toEqual([]);
    expect(bracketPages(NaN, MONTHLY_PAGE_MANWON)).toEqual([]);
  });

  it("links 연봉 pages to the matching or nearest 월급 pages", () => {
    expect(monthlyPagesNear(salaryForManwon(3_600).monthlyGross)).toEqual([300]);
    expect(monthlyPagesNear(salaryForManwon(4_000).monthlyGross)).toEqual([330, 340]); // 3,333,333원
    expect(monthlyPagesNear(salaryForManwon(8_000).monthlyGross)).toEqual([650, 700]); // 6,666,666원
    expect(monthlyPagesNear(salaryForManwon(1_500).monthlyGross)).toEqual([]); // 125만원: below the list
    expect(monthlyPagesNear(salaryForManwon(15_000).monthlyGross)).toEqual([]); // 1,250만원: above the list
  });

  it("links every 월급 page to an existing 연봉 page", () => {
    expect(annualPagesNear(300)).toEqual([3_600]);
    expect(annualPagesNear(310)).toEqual([3_700, 3_800]); // 3,720만원
    expect(annualPagesNear(950)).toEqual([11_000, 11_500]); // 1억 1,400만원
    expect(annualPagesNear(1_000)).toEqual([12_000]);
    for (const m of MONTHLY_PAGE_MANWON) {
      const links = annualPagesNear(m);
      expect(links.length).toBeGreaterThan(0);
      for (const a of links) expect(SALARY_PAGE_MANWON).toContain(a);
    }
  });
});

describe("2027년 예상 (국민연금 근로자 5.0%만 반영, 나머지는 2026년 값 가정)", () => {
  it("월급 300만원: 국민연금 133,000 → 140,000원", () => {
    const e = estimate2027(300);
    expect(e.base).toEqual(salaryForMonthlyManwon(300, { payMonth: ESTIMATE_2027_PAY_MONTH }));
    expect(e.pension).toBe(140_000); // 2,800,000 × 5.0%
    expect(e.pensionDiff).toBe(7_000);
    expect(e.monthlyNet).toBe(e.base.monthlyNet - 7_000);
  });

  it("stops at the 기준소득월액 상한 6,590,000원 (until 2027년 6월)", () => {
    for (const m of [700, 1_000]) {
      const e = estimate2027(m);
      expect(e.base.insurance.pension).toBe(313_020); // 6,590,000 × 4.75% = 313,025 → 313,020
      expect(e.pension).toBe(329_500); // 6,590,000 × 5.0%
      expect(e.pensionDiff).toBe(16_480);
    }
  });

  it("changes only the 국민연금 line", () => {
    for (const m of MONTHLY_PAGE_MANWON) {
      const e = estimate2027(m);
      expect(e.pensionDiff).toBeGreaterThan(0);
      expect(e.base.monthlyNet - e.monthlyNet).toBe(e.pensionDiff);
    }
  });
});

describe("최저시급 comparison text", () => {
  it("reads as a multiple when well above the minimum and as a gap near it", () => {
    expect(vsMinimumHourly(14_354, 2026)).toBe("2026년 최저시급 10,320원의 1.39배");
    expect(vsMinimumHourly(7_177, 2026)).toBe("2026년 최저시급 10,320원보다 3,143원 적은 수준");
    expect(vsMinimumHourly(11_000, 2027)).toBe("2027년 최저시급 10,700원보다 300원 많은 수준");
    expect(vsMinimumHourly(10_320, 2026)).toBe("2026년 최저시급 10,320원과 같은 수준");
  });
});
