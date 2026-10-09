import { describe, expect, it } from "vitest";
import {
  applyPercentChange,
  averageRate,
  changeRate,
  changeWord,
  combinedDiscountRate,
  compoundChange,
  discountBreakdown,
  discountBreakdownWon,
  discountRateFrom,
  formatPct,
  formatSigned,
  formatValue,
  listPriceFrom,
  percentOf,
  percentPointDiff,
  ratioPercent,
  recoveryRate,
  roundToDigits,
  sanitizeDecimalInput,
  tidy,
  toggleSignText,
  topicParticle,
  valueBeforeChange,
} from "./percent";
import { parseNumber } from "@/lib/format";

// All vectors below are plain arithmetic, checked by hand.

describe("tidy", () => {
  it("removes floating-point noise", () => {
    expect(tidy(0.1 + 0.2)).toBe(0.3);
    expect(tidy(50000 * 1.1)).toBe(55000);
    expect(tidy(-0)).toBe(0);
    expect(Object.is(tidy(-0), -0)).toBe(false);
  });
});

describe("A의 B%", () => {
  it("multiplies by B/100", () => {
    expect(percentOf(50000, 15)).toBe(7500);
    expect(percentOf(200, 150)).toBe(300);
    expect(percentOf(3.5, 20)).toBe(0.7);
    expect(percentOf(0, 30)).toBe(0);
  });
});

describe("A는 B의 몇 %", () => {
  it("divides by the whole", () => {
    expect(ratioPercent(45, 60)).toBe(75);
    expect(ratioPercent(1, 3)).toBeCloseTo(33.3333, 4);
    expect(ratioPercent(120, 80)).toBe(150);
  });
  it("returns null when the whole is 0", () => {
    expect(ratioPercent(5, 0)).toBeNull();
  });
});

describe("변화율과 퍼센트포인트", () => {
  it("uses the previous value as the base", () => {
    expect(changeRate(25000, 30000)).toBe(20);
    expect(changeRate(30000, 25000)).toBeCloseTo(-16.6667, 4);
    // 80 → 100 is +25%, but 100 → 80 is −20%.
    expect(changeRate(80, 100)).toBe(25);
    expect(changeRate(100, 80)).toBe(-20);
    expect(changeRate(100, 100)).toBe(0);
  });
  it("tripling is a 200% increase, not 300%", () => {
    expect(changeRate(100, 300)).toBe(200);
  });
  it("uses |A| so a smaller loss reads as an increase", () => {
    expect(changeRate(-100, -50)).toBe(50);
    expect(changeRate(-100, 50)).toBe(150);
  });
  it("returns null from 0", () => {
    expect(changeRate(0, 10)).toBeNull();
  });
  it("separates %p from %", () => {
    // 금리 3% → 3.5%: 0.5%p 상승, 상대적으로는 16.67% 상승
    expect(percentPointDiff(3, 3.5)).toBe(0.5);
    expect(changeRate(3, 3.5)).toBeCloseTo(16.6667, 4);
    // 지지율 40% → 50%: 10%p, 25% 증가
    expect(percentPointDiff(40, 50)).toBe(10);
    expect(changeRate(40, 50)).toBe(25);
  });
});

describe("B% 증가/감소", () => {
  it("applies the change", () => {
    expect(applyPercentChange(50000, 10, "up")).toBe(55000);
    expect(applyPercentChange(50000, 10, "down")).toBe(45000);
    expect(applyPercentChange(80, 25, "up")).toBe(100);
    expect(applyPercentChange(100, 100, "down")).toBe(0);
  });
  it("up then down by the same % ends lower", () => {
    const up = applyPercentChange(100, 10, "up");
    expect(up).toBe(110);
    expect(applyPercentChange(up, 10, "down")).toBe(99);
  });
  it("finds the value before the change (e.g. 부가세 10% 포함가)", () => {
    // 부가가치세 세율 10% (부가가치세법, law.go.kr). 11,000원(부가세 포함) → 공급가 10,000원.
    expect(valueBeforeChange(11000, 10, "up")).toBe(10000);
    expect(valueBeforeChange(8000, 20, "down")).toBe(10000);
    expect(valueBeforeChange(5, 100, "down")).toBeNull();
  });
  it("knows the rate needed to recover", () => {
    expect(recoveryRate(25, "up")).toBe(20);
    expect(recoveryRate(10, "up")).toBeCloseTo(9.0909, 4);
    expect(recoveryRate(50, "down")).toBe(100);
    expect(recoveryRate(20, "down")).toBe(25);
    expect(recoveryRate(100, "down")).toBeNull();
  });
  it("compounds and averages growth", () => {
    expect(compoundChange([10, 20])).toBe(32);
    expect(compoundChange([10, -10])).toBe(-1);
    expect(averageRate([10, 20])).toBeCloseTo(14.8913, 4);
    expect(averageRate([])).toBeNull();
  });
});

describe("할인", () => {
  it("computes sale price and discount", () => {
    const d = discountBreakdown(39000, 20);
    expect(d.firstDiscount).toBe(7800);
    expect(d.final).toBe(31200);
    expect(d.totalDiscount).toBe(7800);
    expect(d.effectiveRate).toBe(20);
  });
  it("stacked discounts multiply (20% then 10% = 28%, not 30%)", () => {
    expect(combinedDiscountRate([20, 10])).toBe(28);
    expect(combinedDiscountRate([10, 20])).toBe(28);
    expect(combinedDiscountRate([10, 10])).toBe(19);
    expect(combinedDiscountRate([50, 50])).toBe(75);
    const d = discountBreakdown(100000, 20, 10);
    expect(d.afterFirst).toBe(80000);
    expect(d.extraDiscount).toBe(8000);
    expect(d.final).toBe(72000);
    expect(d.totalDiscount).toBe(28000);
    expect(d.effectiveRate).toBe(28);
  });
  it("shows prices in whole won and keeps the rows adding up", () => {
    // 33,333 × 0.67 = 22,333.11 → 22,333원, 할인 11,000원
    const a = discountBreakdownWon(33333, 33);
    expect(a.final).toBe(22333);
    expect(a.firstDiscount).toBe(11000);
    expect(a.totalDiscount).toBe(11000);
    expect(a.effectiveRate).toBe(33);
    // 9,990 × 0.85 = 8,491.5 → 8,492원, 다시 5%: 8,492 × 0.95 = 8,067.4 → 8,067원
    const b = discountBreakdownWon(9990, 15, 5);
    expect(b.afterFirst).toBe(8492);
    expect(b.firstDiscount).toBe(1498);
    expect(b.extraDiscount).toBe(425);
    expect(b.final).toBe(8067);
    expect(b.totalDiscount).toBe(1923);
    expect(b.firstDiscount + b.extraDiscount).toBe(b.totalDiscount);
    // Whole-won inputs that divide evenly are unchanged.
    const c = discountBreakdownWon(100000, 20, 10);
    expect(c.final).toBe(72000);
    expect(c.totalDiscount).toBe(28000);
    expect(c.effectiveRate).toBe(28);
  });
  it("finds the discount rate from two prices", () => {
    expect(discountRateFrom(39000, 29900)).toBeCloseTo(23.3333, 4);
    expect(discountRateFrom(10000, 7000)).toBe(30);
    expect(discountRateFrom(10000, 12000)).toBe(-20);
    expect(discountRateFrom(0, 100)).toBeNull();
  });
  it("finds the list price from the sale price", () => {
    expect(listPriceFrom(8000, 20)).toBe(10000);
    expect(listPriceFrom(9000, 10)).toBe(10000);
    expect(listPriceFrom(29900, 20)).toBe(37375);
    expect(listPriceFrom(100, 100)).toBeNull();
  });
});

describe("display helpers", () => {
  it("formats values", () => {
    expect(formatValue(1234.5678)).toBe("1,234.57");
    expect(formatValue(0.012345)).toBe("0.0123");
    expect(formatValue(-0.000000001)).toBe("0");
    expect(formatSigned(5000)).toBe("+5,000");
    expect(formatSigned(-16.6667)).toBe("-16.67");
    expect(formatSigned(0)).toBe("0");
    expect(formatPct(23.33333)).toBe("23.33%");
    expect(changeWord(3)).toBe("증가");
    expect(changeWord(-3)).toBe("감소");
    expect(changeWord(0)).toBe("변화 없음");
  });
  it("rounds to the precision of an input box", () => {
    expect(roundToDigits(39000.5, 0)).toBe(39001);
    expect(roundToDigits(39000.4, 0)).toBe(39000);
    expect(roundToDigits(-0.2, 0)).toBe(0);
    expect(Object.is(roundToDigits(-0.2, 0), -0)).toBe(false);
    expect(roundToDigits(0.123456, 4)).toBe(0.1235);
    expect(roundToDigits(3.05, 4)).toBe(3.05);
    expect(roundToDigits(50000, 4)).toBe(50000);
    expect(roundToDigits(NaN, 4)).toBeNaN();
  });
  it("picks 은/는 by the Korean reading of the number", () => {
    expect(topicParticle("45")).toBe("는"); // 사십오
    expect(topicParticle("30")).toBe("은"); // 삼십
    expect(topicParticle("12")).toBe("는"); // 십이
    expect(topicParticle("1")).toBe("은"); // 일
    expect(topicParticle("1,000")).toBe("은"); // 천
    expect(topicParticle("50,000")).toBe("은"); // 오만
    expect(topicParticle("3.5")).toBe("는"); // 삼 점 오
    expect(topicParticle("2.7")).toBe("은"); // 이 점 칠
    expect(topicParticle("0")).toBe("은"); // 영
    expect(topicParticle("1,000,000,000,000")).toBe("는"); // 일조
    expect(topicParticle("20%")).toBe("는");
    expect(topicParticle("39,000원")).toBe("은");
  });
});

describe("sanitizeDecimalInput", () => {
  it("keeps partial decimals while typing", () => {
    expect(sanitizeDecimalInput("3.", 2)).toBe("3.");
    expect(sanitizeDecimalInput("3.0", 2)).toBe("3.0");
    expect(sanitizeDecimalInput("3.055", 2)).toBe("3.05");
    expect(sanitizeDecimalInput(".5", 2)).toBe("0.5");
  });
  it("groups the integer part and strips junk", () => {
    expect(sanitizeDecimalInput("1234567.5", 2)).toBe("1,234,567.5");
    expect(sanitizeDecimalInput("1,2,34원", 2)).toBe("1,234");
    expect(sanitizeDecimalInput("007", 2)).toBe("7");
    expect(sanitizeDecimalInput("1.2.3", 4)).toBe("1.23");
    expect(sanitizeDecimalInput("12.5", 0)).toBe("12");
    expect(sanitizeDecimalInput("", 2)).toBe("");
  });
  it("allows a leading minus only when asked", () => {
    expect(sanitizeDecimalInput("-50", 2)).toBe("50");
    expect(sanitizeDecimalInput("-50", 2, true)).toBe("-50");
    expect(sanitizeDecimalInput("-", 2, true)).toBe("-");
  });
});

describe("toggleSignText (± button for keypads without a minus key)", () => {
  it("adds a leading minus to a positive or empty box", () => {
    expect(toggleSignText("1,234.5")).toBe("-1,234.5");
    expect(toggleSignText("3.")).toBe("-3.");
    expect(toggleSignText("")).toBe("-");
  });
  it("removes the minus (ASCII or U+2212) from a negative box", () => {
    expect(toggleSignText("-1,234.5")).toBe("1,234.5");
    expect(toggleSignText("−50")).toBe("50");
    expect(toggleSignText("-")).toBe("");
  });
  it("round-trips through the sanitizer used by the field", () => {
    const flipped = sanitizeDecimalInput(toggleSignText("25,000"), 4, true);
    expect(flipped).toBe("-25,000");
    expect(parseNumber(flipped)).toBe(-25000);
    expect(sanitizeDecimalInput(toggleSignText(flipped), 4, true)).toBe("25,000");
  });
});
