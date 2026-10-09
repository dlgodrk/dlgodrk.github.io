import { describe, expect, it } from "vitest";
import { parseNumber } from "@/lib/format";
import {
  agreedRatePresets,
  applyRate,
  bracketLabel,
  BROKERAGE_FEE_PAGES,
  computeBrokerageFee,
  convertWolse,
  feeRule,
  findFeePage,
  HOUSE_LEASE_BRACKETS,
  HOUSE_SALE_BRACKETS,
  LEASE_TABLE_AMOUNTS,
  maxFeeFor,
  neighborsOf,
  sanitizeDecimalDraft,
  SALE_TABLE_AMOUNTS,
  withVat,
} from "./brokerage-fee";

const MAN = 10_000;
const EOK = 100_000_000;

describe("brokerage-fee: rate tables", () => {
  // 서울특별시 주택 중개보수 등에 관한 조례 별표1 (land.seoul.go.kr 중개보수 요율표),
  // 경기도 조례 별표1 (gris.gg.go.kr) — 두 표가 동일.
  it("matches the 주택 매매·교환 table", () => {
    expect(HOUSE_SALE_BRACKETS.map((b) => [b.min, b.max, b.rate, b.cap])).toEqual([
      [0, 5_000 * MAN, 0.6, 25 * MAN],
      [5_000 * MAN, 2 * EOK, 0.5, 80 * MAN],
      [2 * EOK, 9 * EOK, 0.4, null],
      [9 * EOK, 12 * EOK, 0.5, null],
      [12 * EOK, 15 * EOK, 0.6, null],
      [15 * EOK, null, 0.7, null],
    ]);
  });
  it("matches the 주택 임대차 table", () => {
    expect(HOUSE_LEASE_BRACKETS.map((b) => [b.min, b.max, b.rate, b.cap])).toEqual([
      [0, 5_000 * MAN, 0.5, 20 * MAN],
      [5_000 * MAN, 1 * EOK, 0.4, 30 * MAN],
      [1 * EOK, 6 * EOK, 0.3, null],
      [6 * EOK, 12 * EOK, 0.4, null],
      [12 * EOK, 15 * EOK, 0.5, null],
      [15 * EOK, null, 0.6, null],
    ]);
  });
  it("brackets are contiguous", () => {
    for (const table of [HOUSE_SALE_BRACKETS, HOUSE_LEASE_BRACKETS]) {
      for (let i = 1; i < table.length; i++) expect(table[i].min).toBe(table[i - 1].max);
    }
  });
  it("labels brackets in Korean", () => {
    expect(bracketLabel(HOUSE_SALE_BRACKETS[0])).toBe("5,000만원 미만");
    expect(bracketLabel(HOUSE_SALE_BRACKETS[2])).toBe("2억원 이상 9억원 미만");
    expect(bracketLabel(HOUSE_SALE_BRACKETS[5])).toBe("15억원 이상");
  });
});

describe("brokerage-fee: 주택 매매", () => {
  // 2021-10 개편 당시 국토교통부 안내 예시: 6억 300만원 → 240만원, 10억 900만원 → 500만원.
  it("6억 → 240만원, 10억 → 500만원", () => {
    expect(maxFeeFor("house", "sale", 6 * EOK)).toBe(2_400_000);
    expect(maxFeeFor("house", "sale", 10 * EOK)).toBe(5_000_000);
  });
  it("5억 → 200만원 (0.4%)", () => {
    expect(maxFeeFor("house", "sale", 5 * EOK)).toBe(2_000_000);
  });
  it("applies 한도액 in the low brackets", () => {
    // 4,500만원 × 0.6% = 27만원 → 한도 25만원
    const r = computeBrokerageFee({ target: "house", deal: "sale", amount: 4_500 * MAN })!;
    expect(r.rawMaxFee).toBe(270_000);
    expect(r.maxFee).toBe(250_000);
    expect(r.capApplied).toBe(true);
    // 1억 9천만원 × 0.5% = 95만원 → 한도 80만원
    expect(maxFeeFor("house", "sale", 19_000 * MAN)).toBe(800_000);
    // 1억 × 0.5% = 50만원 (한도 이내)
    expect(maxFeeFor("house", "sale", 1 * EOK)).toBe(500_000);
  });
  it("uses the higher bracket at the exact boundary (이상)", () => {
    expect(feeRule("house", "sale", 9 * EOK).rate).toBe(0.5);
    expect(feeRule("house", "sale", 9 * EOK - 1).rate).toBe(0.4);
    expect(maxFeeFor("house", "sale", 9 * EOK)).toBe(4_500_000);
    expect(maxFeeFor("house", "sale", 12 * EOK)).toBe(7_200_000);
    expect(maxFeeFor("house", "sale", 15 * EOK)).toBe(10_500_000);
    expect(maxFeeFor("house", "sale", 2 * EOK)).toBe(800_000);
  });
  it("truncates below 1원", () => {
    // 123,456,789 × 0.5% = 617,283.945 → 617,283 (한도 80만 이내)
    expect(maxFeeFor("house", "sale", 123_456_789)).toBe(617_283);
  });
});

describe("brokerage-fee: 주택 임대차", () => {
  // 2021-10 개편 안내 예시: 6억 전세 480만원 → 240만원
  it("전세 6억 → 240만원, 3억 → 90만원", () => {
    expect(maxFeeFor("house", "jeonse", 6 * EOK)).toBe(2_400_000);
    expect(maxFeeFor("house", "jeonse", 3 * EOK)).toBe(900_000);
  });
  it("applies 한도액 in the low brackets", () => {
    // 4,500만원 × 0.5% = 22.5만원 → 한도 20만원
    expect(maxFeeFor("house", "jeonse", 4_500 * MAN)).toBe(200_000);
    // 9,000만원 × 0.4% = 36만원 → 한도 30만원
    expect(maxFeeFor("house", "jeonse", 9_000 * MAN)).toBe(300_000);
    // 1억 × 0.3% = 30만원
    expect(maxFeeFor("house", "jeonse", 1 * EOK)).toBe(300_000);
  });
});

describe("brokerage-fee: 월세 환산 (시행규칙 제20조⑤1호)", () => {
  it("uses ×100 when the sum is 5천만원 이상", () => {
    // 보증금 1,000만원 + 월세 50만원 × 100 = 6,000만원
    const c = convertWolse(1_000 * MAN, 50 * MAN);
    expect(c).toEqual({ base100: 6_000 * MAN, multiplier: 100, amount: 6_000 * MAN });
  });
  it("switches to ×70 when the ×100 sum is under 5천만원", () => {
    // 보증금 500만원 + 월세 40만원 × 100 = 4,500만원 < 5,000만원 → 500만 + 40만 × 70 = 3,300만원
    const c = convertWolse(500 * MAN, 40 * MAN);
    expect(c.multiplier).toBe(70);
    expect(c.base100).toBe(4_500 * MAN);
    expect(c.amount).toBe(3_300 * MAN);
  });
  it("exactly 5천만원 stays at ×100", () => {
    expect(convertWolse(0, 50 * MAN).multiplier).toBe(100);
    expect(convertWolse(0, 50 * MAN).amount).toBe(5_000 * MAN);
  });
  it("computes the fee on the converted amount", () => {
    // 6,000만원 × 0.4% = 24만원 (한도 30만원 이내)
    const a = computeBrokerageFee({ target: "house", deal: "wolse", amount: 1_000 * MAN, monthlyRent: 50 * MAN })!;
    expect(a.dealAmount).toBe(6_000 * MAN);
    expect(a.maxFee).toBe(240_000);
    // 3,300만원 × 0.5% = 16.5만원 (한도 20만원 이내)
    const b = computeBrokerageFee({ target: "house", deal: "wolse", amount: 500 * MAN, monthlyRent: 40 * MAN })!;
    expect(b.maxFee).toBe(165_000);
    // 보증금 1억 + 월세 100만 = 2억 → 0.3% = 60만원
    expect(computeBrokerageFee({ target: "house", deal: "wolse", amount: 1 * EOK, monthlyRent: 100 * MAN })!.maxFee).toBe(
      600_000,
    );
  });
  it("ignores monthly rent outside 월세 mode", () => {
    const r = computeBrokerageFee({ target: "house", deal: "jeonse", amount: 3 * EOK, monthlyRent: 100 * MAN })!;
    expect(r.dealAmount).toBe(3 * EOK);
    expect(r.conversion).toBeNull();
  });
});

describe("brokerage-fee: 오피스텔·그 외", () => {
  it("주거용 오피스텔: 매매 0.5%, 임대차 0.4%, 한도 없음", () => {
    expect(maxFeeFor("officetel", "sale", 3 * EOK)).toBe(1_500_000);
    expect(maxFeeFor("officetel", "jeonse", 2 * EOK)).toBe(800_000);
    // 소액도 한도 없이 요율대로: 3,000만원 × 0.4% = 12만원
    expect(maxFeeFor("officetel", "jeonse", 3_000 * MAN)).toBe(120_000);
  });
  it("오피스텔 월세도 같은 환산식", () => {
    // 1,000만 + 70만 × 100 = 8,000만원 × 0.4% = 32만원 (주택이면 한도 30만원)
    expect(computeBrokerageFee({ target: "officetel", deal: "wolse", amount: 1_000 * MAN, monthlyRent: 70 * MAN })!.maxFee).toBe(
      320_000,
    );
    expect(computeBrokerageFee({ target: "house", deal: "wolse", amount: 1_000 * MAN, monthlyRent: 70 * MAN })!.maxFee).toBe(
      300_000,
    );
  });
  it("토지·상가 등: 0.9% 이내", () => {
    expect(maxFeeFor("other", "sale", 10 * EOK)).toBe(9_000_000);
    expect(maxFeeFor("other", "jeonse", 1 * EOK)).toBe(900_000);
    expect(feeRule("other", "sale", 1).cap).toBeNull();
  });
});

describe("brokerage-fee: 협의 요율과 부가세", () => {
  it("uses an agreed rate below the cap", () => {
    const r = computeBrokerageFee({ target: "house", deal: "sale", amount: 5 * EOK, agreedRate: 0.3 })!;
    expect(r.agreedUsed).toBe(true);
    expect(r.agreedClamped).toBe(false);
    expect(r.appliedRate).toBe(0.3);
    expect(r.maxFee).toBe(2_000_000);
    expect(r.fee).toBe(1_500_000);
  });
  it("clamps an agreed rate above the cap to the 상한요율", () => {
    const r = computeBrokerageFee({ target: "house", deal: "sale", amount: 5 * EOK, agreedRate: 0.9 })!;
    expect(r.agreedClamped).toBe(true);
    expect(r.appliedRate).toBe(0.4);
    expect(r.fee).toBe(2_000_000);
  });
  it("keeps the 한도액 with an agreed rate", () => {
    // 4,500만원 매매, 협의 0.58% = 261,000원 → 한도 25만원
    const r = computeBrokerageFee({ target: "house", deal: "sale", amount: 4_500 * MAN, agreedRate: 0.58 })!;
    expect(r.fee).toBe(250_000);
  });
  it("ignores empty / zero agreed rates", () => {
    expect(computeBrokerageFee({ target: "house", deal: "sale", amount: 5 * EOK, agreedRate: NaN })!.agreedUsed).toBe(false);
    expect(computeBrokerageFee({ target: "house", deal: "sale", amount: 5 * EOK, agreedRate: 0 })!.agreedUsed).toBe(false);
  });
  it("handles fractional percent without float drift", () => {
    // 7억 × 0.35% = 2,450,000원 exactly
    expect(applyRate(7 * EOK, 0.35)).toBe(2_450_000);
    // 3억 × 0.4% = 1,200,000 (0.4 * 3e8 in floats is 1199999.9999999998)
    expect(applyRate(3 * EOK, 0.4)).toBe(1_200_000);
    expect(applyRate(123_456_789, 0.125)).toBe(154_320);
  });
  it("adds 10% VAT for 일반과세자", () => {
    const r = computeBrokerageFee({ target: "house", deal: "sale", amount: 5 * EOK, includeVat: true })!;
    expect(r.vat).toBe(200_000);
    expect(r.total).toBe(2_200_000);
    const n = computeBrokerageFee({ target: "house", deal: "sale", amount: 5 * EOK })!;
    expect(n.vat).toBe(0);
    expect(n.total).toBe(2_000_000);
    expect(withVat(165_000)).toBe(181_500);
    expect(withVat(617_283)).toBe(617_283 + 61_728);
  });
  it("returns null for empty input", () => {
    expect(computeBrokerageFee({ target: "house", deal: "sale", amount: 0 })).toBeNull();
    expect(computeBrokerageFee({ target: "house", deal: "sale", amount: NaN })).toBeNull();
    expect(computeBrokerageFee({ target: "house", deal: "wolse", amount: 0, monthlyRent: 0 })).toBeNull();
    // 보증금 없는 월세만 있는 경우: 60만 × 100 = 6,000만원 → 0.4% = 24만원
    expect(computeBrokerageFee({ target: "house", deal: "wolse", amount: 0, monthlyRent: 60 * MAN })!.maxFee).toBe(240_000);
  });
});

describe("brokerage-fee: 입력칸 도우미", () => {
  /** Feed keystrokes one by one, as the input box does: each step sanitizes the previous text + key. */
  function type(keys: string, decimals: number): { text: string; value: number }[] {
    const steps: { text: string; value: number }[] = [];
    let text = "";
    for (const k of keys) {
      text = sanitizeDecimalDraft(text + k, decimals);
      steps.push({ text, value: parseNumber(text) });
    }
    return steps;
  }

  it("keeps the trailing dot so 0.35 can be typed key by key", () => {
    // Regression: the shared field turned "0." into "0", so 0 → . → 3 became 3 (then clamped).
    expect(type("0.35", 3)).toEqual([
      { text: "0", value: 0 },
      { text: "0.", value: 0 },
      { text: "0.3", value: 0.3 },
      { text: "0.35", value: 0.35 },
    ]);
    expect(type(".3", 3).at(-1)).toEqual({ text: "0.3", value: 0.3 });
  });
  it("types 월세 45.5만원 without inflating it to 455", () => {
    expect(type("45.5", 1).at(-1)).toEqual({ text: "45.5", value: 45.5 });
    // only one fraction digit for 월세
    expect(type("45.55", 1).at(-1)).toEqual({ text: "45.5", value: 45.5 });
  });
  it("cleans pasted or odd input", () => {
    expect(sanitizeDecimalDraft("0.3%", 3)).toBe("0.3");
    expect(sanitizeDecimalDraft("1000", 1)).toBe("1,000");
    expect(sanitizeDecimalDraft("1,234.5", 1)).toBe("1,234.5");
    expect(sanitizeDecimalDraft("03", 3)).toBe("3");
    expect(sanitizeDecimalDraft("0.1.2", 3)).toBe("0.12");
    // integers only: the fraction is dropped, not glued onto the integer part
    expect(sanitizeDecimalDraft("12.5", 0)).toBe("12");
    expect(sanitizeDecimalDraft("", 3)).toBe("");
  });
  it("a typed agreed rate flows into the fee", () => {
    // 5억 매매, 협의 0.35% = 175만원 (상한 200만원)
    const rate = parseNumber(type("0.35", 3).at(-1)!.text);
    const r = computeBrokerageFee({ target: "house", deal: "sale", amount: 5 * EOK, agreedRate: rate })!;
    expect(r.agreedClamped).toBe(false);
    expect(r.fee).toBe(1_750_000);
  });
  it("offers agreed-rate chips just below the 상한", () => {
    expect(agreedRatePresets(0.4)).toEqual([0.2, 0.25, 0.3, 0.35]);
    expect(agreedRatePresets(0.3)).toEqual([0.1, 0.15, 0.2, 0.25]);
    expect(agreedRatePresets(0.7)).toEqual([0.35, 0.4, 0.5, 0.6]);
    expect(agreedRatePresets(0.9)).toEqual([0.5, 0.6, 0.7, 0.8]);
    for (const rate of [0.3, 0.4, 0.5, 0.6, 0.7, 0.9]) {
      for (const p of agreedRatePresets(rate)) expect(p).toBeLessThan(rate);
    }
  });
});

describe("brokerage-fee: programmatic pages", () => {
  it("has at most 10 unique pages", () => {
    expect(BROKERAGE_FEE_PAGES.length).toBeLessThanOrEqual(10);
    expect(new Set(BROKERAGE_FEE_PAGES.map((p) => p.slug)).size).toBe(BROKERAGE_FEE_PAGES.length);
    for (const p of BROKERAGE_FEE_PAGES) expect(p.slug).toMatch(/^[a-z0-9-]+$/);
  });
  it("every page amount appears in its quick table", () => {
    for (const p of BROKERAGE_FEE_PAGES) {
      const list = p.deal === "sale" ? SALE_TABLE_AMOUNTS : LEASE_TABLE_AMOUNTS;
      expect(list).toContain(p.amount);
    }
  });
  it("finds pages by slug", () => {
    expect(findFeePage("sale-10eok")?.amount).toBe(10 * EOK);
    expect(findFeePage("nope")).toBeNull();
  });
  it("neighbor windows include the value and stay in range", () => {
    for (const p of BROKERAGE_FEE_PAGES) {
      const list = p.deal === "sale" ? SALE_TABLE_AMOUNTS : LEASE_TABLE_AMOUNTS;
      const w = neighborsOf(list, p.amount);
      expect(w).toContain(p.amount);
      expect(w.length).toBe(9);
    }
  });
  it("quick tables are sorted", () => {
    expect([...SALE_TABLE_AMOUNTS].sort((a, b) => a - b)).toEqual(SALE_TABLE_AMOUNTS);
    expect([...LEASE_TABLE_AMOUNTS].sort((a, b) => a - b)).toEqual(LEASE_TABLE_AMOUNTS);
  });
});
