import { describe, expect, it } from "vitest";
import { estimateAnnualInsurance, estimatePrepaidTax } from "./year-end-tax";
import {
  clampChildren,
  clampCreditChildren,
  clampFamily,
  clampMembers,
  clampTableChildren,
  DEFAULT_FORM,
  normalizeBirthOrder,
  normalizeHome,
  normalizeRatio,
  shortWon,
  sumAmounts,
  yearEndFromForm,
} from "./year-end-tax-ui";

describe("yearEndFromForm", () => {
  it("auto-estimates 4대보험 and 기납부세액 for the default example", () => {
    const out = yearEndFromForm(DEFAULT_FORM)!;
    expect(out.input.totalPay).toBe(50_000_000);
    expect(out.input.pension).toBe(estimateAnnualInsurance(50_000_000).pension);
    expect(out.input.healthEmployment).toBe(estimateAnnualInsurance(50_000_000).healthEmployment);
    expect(out.input.prepaidIncomeTax).toBe(estimatePrepaidTax(50_000_000, 1, 0).incomeTax);
    // Regression for the number quoted in the page description (총급여 5,000만원, 카드 2,000만원, 1인).
    expect(out.result.settleTotal).toBe(-110_300);
  });

  it("uses manual 4대보험 and 기납부세액 when chosen, treating empty boxes as 0", () => {
    const out = yearEndFromForm({
      ...DEFAULT_FORM,
      insuranceMode: "m",
      pensionManual: 2_000_000,
      healthManual: Number.NaN,
      prepaidMode: "m",
      prepaidManual: 1_000_000,
    })!;
    expect(out.input.pension).toBe(2_000_000);
    expect(out.input.healthEmployment).toBe(0);
    expect(out.input.prepaidIncomeTax).toBe(1_000_000);
    expect(out.result.prepaidLocalTax).toBe(100_000);
  });

  it("returns null without a positive 총급여", () => {
    expect(yearEndFromForm({ ...DEFAULT_FORM, totalPayManwon: 0 })).toBeNull();
    expect(yearEndFromForm({ ...DEFAULT_FORM, totalPayManwon: Number.NaN })).toBeNull();
  });

  it("clamps family-related counts", () => {
    const out = yearEndFromForm({ ...DEFAULT_FORM, family: 2, children: 5, creditChildren: 5, tableChildren: 3, seniors: 9 })!;
    expect(out.input.children).toBe(1);
    expect(out.input.creditChildren).toBe(1);
    expect(out.tableChildren).toBe(0);
    expect(out.input.seniors).toBe(2);
  });

  it("counts 2017·2018년생 in the 간이세액표 estimate but not in 자녀세액공제", () => {
    // 3인 가족, 자녀 1명이 2018년생: 매달 원천징수는 8세 이상 자녀 공제(별표2)를 받았지만
    // 2026 귀속 자녀세액공제(2006~2016년생)는 없다 → 기납부세액이 그만큼 적고 환급도 줄어든다.
    const form = { ...DEFAULT_FORM, totalPayManwon: 6_000, family: 3, children: 1, creditChildren: 0 };
    const without = yearEndFromForm(form)!;
    const with2018 = yearEndFromForm({ ...form, tableChildren: 1 })!;
    expect(with2018.tableChildren).toBe(1);
    expect(with2018.input.creditChildren).toBe(0);
    expect(with2018.result.chosen.credits.child).toBe(0);
    expect(with2018.input.prepaidIncomeTax).toBe(estimatePrepaidTax(60_000_000, 3, 1).incomeTax);
    // 1~2월 12,500원 × 2 + 3~12월 20,830원 × 10 = 233,300원, 지방소득세 23,300원
    expect(without.result.prepaidIncomeTax - with2018.result.prepaidIncomeTax).toBe(233_300);
    expect(with2018.result.settleTotal - without.result.settleTotal).toBe(256_600);
    // 2006~2016년생 자녀와 합쳐 간이세액표 자녀 수가 된다
    const both = yearEndFromForm({ ...form, family: 4, children: 2, creditChildren: 1, tableChildren: 1 })!;
    expect(both.input.prepaidIncomeTax).toBe(estimatePrepaidTax(60_000_000, 4, 2).incomeTax);
    expect(both.result.chosen.credits.child).toBe(250_000);
  });

  it("gives 월세 to a 무주택 세대원 but 주택청약 only to the 세대주", () => {
    const form = { ...DEFAULT_FORM, totalPayManwon: 4_000, rent: 6_000_000, housingSubscription: 3_000_000 };
    const member = yearEndFromForm({ ...form, home: "m" })!;
    expect(member.result.chosen.credits.rent).toBe(1_020_000);
    expect(member.result.housing).toBe(0);
    const head = yearEndFromForm({ ...form, home: "h" })!;
    expect(head.result.chosen.credits.rent).toBe(1_020_000);
    expect(head.result.housing).toBe(1_200_000);
    const owner = yearEndFromForm({ ...form, home: "n" })!;
    expect(owner.result.rentEligible).toBe(false);
    expect(owner.result.housing).toBe(0);
  });

  it("flags 문화체육 entered in its own box when 총급여 is over 7천만원", () => {
    expect(yearEndFromForm({ ...DEFAULT_FORM, totalPayManwon: 8_000, culture: 1_000_000 })!.cultureAsCredit).toBe(true);
    expect(yearEndFromForm({ ...DEFAULT_FORM, totalPayManwon: 7_000, culture: 1_000_000 })!.cultureAsCredit).toBe(false);
    expect(yearEndFromForm({ ...DEFAULT_FORM, totalPayManwon: 8_000 })!.cultureAsCredit).toBe(false);
  });
});

describe("helpers", () => {
  it("clamp and normalize", () => {
    expect(clampFamily(0)).toBe(1);
    expect(clampFamily(Number.NaN)).toBe(1);
    expect(clampFamily(20)).toBe(11);
    expect(clampChildren(3, 1)).toBe(0);
    expect(clampCreditChildren(3, 2)).toBe(2);
    expect(clampTableChildren(3, 3, 1)).toBe(2);
    expect(clampTableChildren(1, 2, 2)).toBe(0);
    expect(normalizeHome("m")).toBe("m");
    expect(normalizeHome("1")).toBe("h"); // older links: boolean 무주택 세대주
    expect(normalizeHome("0")).toBe("n");
    expect(normalizeHome("x")).toBe("n");
    expect(clampMembers(5, 3)).toBe(3);
    expect(normalizeRatio(80)).toBe(80);
    expect(normalizeRatio(90)).toBe(100);
    expect(normalizeBirthOrder(2)).toBe(2);
    expect(normalizeBirthOrder(7)).toBe(0);
  });
  it("formats group summaries", () => {
    expect(sumAmounts(1_000, Number.NaN, 2_000)).toBe(3_000);
    expect(shortWon(0)).toBe("0원");
    expect(shortWon(5_000)).toBe("5,000원");
    expect(shortWon(15_000_000)).toBe("1,500만원");
    expect(shortWon(120_000_000)).toBe("1억 2,000만원");
    expect(shortWon(200_000_000)).toBe("2억원");
  });
});
