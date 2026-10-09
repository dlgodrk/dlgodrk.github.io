import { describe, expect, it } from "vitest";
import { calcSalary, SALARY_PAGE_MANWON } from "./salary";
import {
  annualToMonthlyManwon,
  clampChildren,
  clampFamily,
  convertAmount,
  floorManwon,
  hourlyFromMonthly,
  longTermCareMultiplier,
  LTC_ROUNDED_FROM,
  manwonFloorLabel,
  minimumWageGap,
  monthlyToAnnualManwon,
  nearbyAmounts,
  normalizeRatio,
  pageNeighbors,
  payMonthLabel,
  pensionLimit,
  raiseEffect,
  salaryForManwon,
  salaryInputFromForm,
  salaryPageGroups,
  sanitizeDecimalDraft,
  taxBracketLabel,
  type SalaryForm,
} from "./salary-ui";
import { parseNumber } from "@/lib/format";

const form = (patch: Partial<SalaryForm> = {}): SalaryForm => ({
  mode: "y",
  amountManwon: 4_000,
  severanceIncluded: false,
  nonTaxable: 200_000,
  family: 1,
  children: 0,
  ratio: 100,
  payMonth: "2026-10",
  ...patch,
});

describe("연봉 ↔ 월급 conversion", () => {
  it("converts 연봉 to the exact monthly pay calcSalary uses", () => {
    expect(annualToMonthlyManwon(4_000)).toBe(333.3333); // 3,333,333원
    expect(annualToMonthlyManwon(4_000, true)).toBe(307.6923); // ÷13 → 3,076,923원
    expect(annualToMonthlyManwon(3_840)).toBe(320);
  });

  it("converts 월급 back to 연봉 rounded to 만원", () => {
    expect(monthlyToAnnualManwon(333.3333)).toBe(4_000);
    expect(monthlyToAnnualManwon(307.6923, true)).toBe(4_000);
    expect(monthlyToAnnualManwon(250)).toBe(3_000);
  });

  it("round-trips through a mode switch without changing the result", () => {
    for (const a of [2_400, 3_333, 4_000, 5_555, 12_345]) {
      const m = convertAmount(a, "y", "m");
      expect(convertAmount(m, "m", "y")).toBe(a);
      const yInput = salaryInputFromForm(form({ amountManwon: a }))!;
      const mInput = salaryInputFromForm(form({ mode: "m", amountManwon: m }))!;
      expect(calcSalary(mInput).monthlyNet).toBe(calcSalary(yInput).monthlyNet);
    }
    expect(convertAmount(NaN, "y", "m")).toBeNaN();
    expect(convertAmount(500, "m", "m")).toBe(500);
  });

  it("reads money in whole 만원", () => {
    expect(floorManwon(3_079_800)).toBe(307);
    expect(floorManwon(9_999)).toBe(0);
    expect(manwonFloorLabel(35_229_756)).toBe("3,522만원");
    expect(manwonFloorLabel(190_033_440)).toBe("1억 9,003만원");
  });
});

describe("salaryInputFromForm", () => {
  it("월급 mode feeds 월급 × 12 so calcSalary returns the same 월급", () => {
    const input = salaryInputFromForm(form({ mode: "m", amountManwon: 300, severanceIncluded: true }))!;
    expect(input.annual).toBe(36_000_000);
    expect(input.severanceIncluded).toBe(false); // 퇴직금 포함 only applies to 연봉
    const r = calcSalary(input);
    expect(r.monthlyGross).toBe(3_000_000);
    expect(r.monthlyTaxable).toBe(2_800_000);
  });

  it("keeps 원 precision for decimal 만원 (최저임금 월급 215.688만원)", () => {
    const r = calcSalary(salaryInputFromForm(form({ mode: "m", amountManwon: 215.688, nonTaxable: 0 }))!);
    expect(r.monthlyGross).toBe(2_156_880);
    // 4insure vector for 2,156,880원: 102,410 + 77,530 + 10,180 + 19,410
    expect(r.insurance.total).toBe(209_530);
  });

  it("matches the verified 연봉 3,840만원 vector", () => {
    const r = calcSalary(salaryInputFromForm(form({ amountManwon: 3_840 }))!);
    expect(r.monthlyNet).toBe(2_826_700);
  });

  it("rejects empty or non-positive amounts", () => {
    expect(salaryInputFromForm(form({ amountManwon: NaN }))).toBeNull();
    expect(salaryInputFromForm(form({ amountManwon: 0 }))).toBeNull();
    expect(salaryInputFromForm(form({ amountManwon: -100 }))).toBeNull();
  });

  it("treats an empty 비과세 box as 0 and clamps family inputs", () => {
    const input = salaryInputFromForm(form({ nonTaxable: NaN, family: 2, children: 5, ratio: 90 }))!;
    expect(input.nonTaxable).toBe(0);
    expect(input.children).toBe(1);
    expect(input.ratio).toBe(100);
  });
});

describe("input clamps", () => {
  it("clamps family to 1–11 and children to family − 1", () => {
    expect(clampFamily(0)).toBe(1);
    expect(clampFamily(15)).toBe(11);
    expect(clampFamily(NaN)).toBe(1);
    expect(clampChildren(3, 1)).toBe(0);
    expect(clampChildren(3, 3)).toBe(2);
    expect(clampChildren(-1, 4)).toBe(0);
  });
  it("accepts only 80/100/120% withholding", () => {
    expect(normalizeRatio(80)).toBe(80);
    expect(normalizeRatio(120)).toBe(120);
    expect(normalizeRatio(110)).toBe(100);
  });
});

describe("statement notes", () => {
  it("flags the 국민연금 상·하한 by pay month", () => {
    // 2026.7~2027.6: 410,000 ~ 6,590,000 / 2026.1~6: 400,000 ~ 6,370,000
    expect(pensionLimit(7_000_000, "2026-10")).toBe("cap");
    expect(pensionLimit(6_590_999, "2026-10")).toBeNull(); // 천원 절사 → exactly the cap
    expect(pensionLimit(6_591_000, "2026-10")).toBe("cap");
    expect(pensionLimit(6_400_000, "2026-03")).toBe("cap");
    expect(pensionLimit(6_400_000, "2026-10")).toBeNull();
    expect(pensionLimit(300_000, "2026-10")).toBe("floor");
    expect(pensionLimit(0, "2026-10")).toBeNull();
  });
  it("labels pay months and 간이세액표 rows", () => {
    expect(payMonthLabel("2026-03")).toBe("2026년 3월");
    expect(taxBracketLabel(3_133_333)).toBe("3,120천원 이상 3,140천원 미만");
    expect(taxBracketLabel(1_234_567)).toBe("1,230천원 이상 1,235천원 미만");
    expect(taxBracketLabel(500_000)).toContain("세액 없음");
    expect(taxBracketLabel(12_000_000)).toContain("초과");
  });
  it("converts to 시급 and compares with 최저임금 (209시간)", () => {
    expect(hourlyFromMonthly(2_156_880)).toBe(10_320);
    expect(minimumWageGap(2_166_666, 2026).diff).toBe(9_786);
    expect(minimumWageGap(2_166_666, 2027)).toEqual({ minMonthly: 2_236_300, diff: -69_634, hourlyMin: 10_700 });
  });
});

describe("decimal 월급 box", () => {
  it("keeps a typed decimal point so 312.5 can be typed key by key", () => {
    // The shared NumberField turned "312." back into "312", so 3 → 1 → 2 → . → 5 became 3125.
    const keys = ["3", "31", "312", "312.", "312.5"].map((t) => sanitizeDecimalDraft(t, 4));
    expect(keys).toEqual(["3", "31", "312", "312.", "312.5"]);
    expect(parseNumber(sanitizeDecimalDraft("312.", 4))).toBe(312);
    expect(parseNumber(sanitizeDecimalDraft("312.5", 4))).toBe(312.5);
  });
  it("groups the integer part, limits fraction digits and drops junk", () => {
    expect(sanitizeDecimalDraft("1234.56789", 4)).toBe("1,234.5678");
    expect(sanitizeDecimalDraft("0312.50", 4)).toBe("312.50");
    expect(sanitizeDecimalDraft(".", 4)).toBe("0.");
    expect(sanitizeDecimalDraft("3.1.2", 4)).toBe("3.12");
    expect(sanitizeDecimalDraft("215만 6880원", 4)).toBe("2,156,880");
    expect(sanitizeDecimalDraft("4000.5", 0)).toBe("4,000");
    expect(sanitizeDecimalDraft("", 4)).toBe("");
  });
});

describe("장기요양보험 label", () => {
  // The label shown next to the 장기요양보험 amount must reproduce that amount on every salary page.
  const floor10 = (x: number) => Math.floor(x / 10) * 10;
  const pages = SALARY_PAGE_MANWON.map((m) => ({ m, oct: salaryForManwon(m), nov: salaryForManwon(m, { payMonth: LTC_ROUNDED_FROM }) }));
  it("uses 0.9448 ÷ 7.19 through 2026년 10월분 and 13.14% from 11월분", () => {
    expect(longTermCareMultiplier("2026-10")).toBe("0.9448 ÷ 7.19 (약 13.14%)");
    expect(longTermCareMultiplier(LTC_ROUNDED_FROM)).toBe("13.14%");
    expect(longTermCareMultiplier("2026-12")).toBe("13.14%");
  });
  it("matches the engine for every /salary/<만원>/ page in both periods", () => {
    for (const { oct, nov } of pages) {
      // health × 0.9448 ÷ 7.19 = health × 9448 ÷ 71900, then 10원 미만 절사 (integer math as in the engine)
      expect(oct.insurance.longTermCare).toBe(Math.floor((oct.insurance.health * 9448) / 719_000) * 10);
      expect(nov.insurance.longTermCare).toBe(floor10((nov.insurance.health * 1314) / 10_000));
    }
  });
  it("changes by 10원 from 11월분 on 14 pages, and only through 장기요양보험", () => {
    const changed = pages.filter(({ oct, nov }) => oct.monthlyNet !== nov.monthlyNet);
    expect(changed.map((p) => p.m)).toEqual([
      2_600, 2_900, 3_700, 6_700, 7_000, 7_800, 8_600, 8_900, 9_700, 13_000, 16_000, 18_500, 19_000, 25_000,
    ]);
    for (const { oct, nov } of changed) {
      expect(oct.insurance.longTermCare - nov.insurance.longTermCare).toBe(10);
      expect(nov.monthlyNet - oct.monthlyNet).toBe(10);
    }
    expect(salaryForManwon(2_600).insurance.longTermCare).toBe(9_290); // 70,700 × 0.9448 ÷ 7.19 = 9,290.6
    expect(pages.find((p) => p.m === 2_600)!.nov.insurance.longTermCare).toBe(9_280); // 70,700 × 13.14% = 9,289.98
  });
});

describe("tables", () => {
  it("builds a ±5 grid around the input", () => {
    expect(nearbyAmounts(4_000, "y")).toEqual([3_500, 3_600, 3_700, 3_800, 3_900, 4_000, 4_100, 4_200, 4_300, 4_400, 4_500]);
    expect(nearbyAmounts(300, "m")).toEqual([250, 260, 270, 280, 290, 300, 310, 320, 330, 340, 350]);
    expect(nearbyAmounts(12_000, "y")[0]).toBe(9_500);
  });
  it("inserts an off-grid input and drops non-positive rows", () => {
    const rows = nearbyAmounts(4_050, "y");
    expect(rows).toContain(4_050);
    expect(rows).toHaveLength(12);
    expect(nearbyAmounts(200, "y")).toEqual([100, 200, 300, 400, 500, 600, 700]);
    expect(nearbyAmounts(NaN, "y")).toEqual([]);
  });
  it("picks page neighbours, shifting the window at the ends", () => {
    expect(pageNeighbors(4_200)).toEqual([3_700, 3_800, 3_900, 4_000, 4_100, 4_200, 4_300, 4_400, 4_500, 4_600, 4_700]);
    expect(pageNeighbors(1_500)).toEqual(SALARY_PAGE_MANWON.slice(0, 11));
    expect(pageNeighbors(30_000)).toEqual(SALARY_PAGE_MANWON.slice(-11));
    expect(pageNeighbors(1_234)).toEqual([]);
  });
  it("groups every salary page exactly once", () => {
    const all = salaryPageGroups().flatMap((g) => g.items);
    expect(all).toEqual(SALARY_PAGE_MANWON);
  });
});

describe("page numbers", () => {
  it("uses the page assumptions (비과세 20만원, 1인, 2026-10)", () => {
    const r = salaryForManwon(4_000);
    expect(r.monthlyGross).toBe(3_333_333);
    expect(r.monthlyTaxable).toBe(3_133_333);
    // 4insure-style integer math: 148,810 / 112,640 / 14,800 / 28,190
    expect(r.insurance.pension).toBe(148_810);
    expect(r.insurance.health).toBe(112_640);
    expect(r.insurance.longTermCare).toBe(14_800);
    expect(r.insurance.employment).toBe(28_190);
  });
  it("monthly take-home rises with every salary page", () => {
    let prev = -1;
    for (const m of SALARY_PAGE_MANWON) {
      const net = salaryForManwon(m).monthlyNet;
      expect(net).toBeGreaterThan(prev);
      prev = net;
    }
  });
  it("computes the effect of a 100만원 raise", () => {
    const e = raiseEffect(4_000);
    expect(e.grossDiff).toBe(83_333);
    expect(e.netDiff).toBeGreaterThan(0);
    expect(e.netDiff).toBeLessThan(e.grossDiff);
    expect(e.keepRate).toBeCloseTo(e.netDiff / 83_333, 10);
  });
});
