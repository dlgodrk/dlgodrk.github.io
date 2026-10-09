import { describe, expect, it } from "vitest";
import {
  areaBand,
  depositTier,
  estimateSupplyPyeong,
  m2ToPyeong,
  privatePointShare,
  PYEONG_PAGE_M2,
  pyeongToM2,
  round2,
  sizeClass,
  typicalLayout,
} from "./pyeong";

describe("pyeong", () => {
  it("converts ㎡ to 평 with the legal ratio", () => {
    expect(round2(m2ToPyeong(84))).toBe(25.41);
    expect(round2(m2ToPyeong(59))).toBe(17.85);
    expect(round2(m2ToPyeong(3.305785))).toBe(1);
  });
  it("converts 평 to ㎡", () => {
    expect(round2(pyeongToM2(1))).toBe(3.31);
    expect(round2(pyeongToM2(30))).toBe(99.17);
    expect(round2(pyeongToM2(34))).toBe(112.4);
  });
  it("round-trips", () => {
    expect(pyeongToM2(m2ToPyeong(123.45))).toBeCloseTo(123.45, 10);
  });
  it("rounds exact halves up despite binary floats", () => {
    // 46 × 0.3025 = 13.915, 66 × 0.3025 = 19.965, 30 × 0.3025 = 9.075 (exact decimals)
    expect(round2(m2ToPyeong(46))).toBe(13.92);
    expect(round2(m2ToPyeong(66))).toBe(19.97);
    expect(round2(m2ToPyeong(30))).toBe(9.08);
    expect(round2(m2ToPyeong(74))).toBe(22.39);
    expect(round2(Number.NaN)).toBeNaN();
  });
  it("estimates the common 평형 label", () => {
    // 전용 84㎡ is marketed as 33~34평형; 59㎡ as 24~25평형 (docs/research/misc-2026.md, 관행).
    expect(Math.round(estimateSupplyPyeong(84))).toBe(34);
    expect(Math.round(estimateSupplyPyeong(59))).toBe(24);
  });
  it("classifies sizes", () => {
    expect(sizeClass(84)).toContain("국민주택규모");
    expect(sizeClass(59)).toContain("소형");
  });
  it("uses one cut-off per band boundary", () => {
    expect(areaBand(30)).toBe("studio");
    expect(areaBand(30.01)).toBe("small");
    expect(areaBand(60)).toBe("small");
    expect(areaBand(60.01)).toBe("mid");
    expect(areaBand(85)).toBe("mid");
    expect(areaBand(85.01)).toBe("large");
    expect(areaBand(135)).toBe("large");
    expect(areaBand(135.01)).toBe("xlarge");
    expect(typicalLayout(84).baths).toBe("욕실 2개");
  });
  it("private-housing 가점제 share by area (주택공급에 관한 규칙 제28조②④, 시행 2026-06-15)", () => {
    expect(privatePointShare(59)).toEqual({ overheated: 40, adjusted: 40, elsewhereMax: 40 });
    expect(privatePointShare(60)).toEqual({ overheated: 40, adjusted: 40, elsewhereMax: 40 });
    expect(privatePointShare(84)).toEqual({ overheated: 70, adjusted: 70, elsewhereMax: 40 });
    expect(privatePointShare(85)).toEqual({ overheated: 70, adjusted: 70, elsewhereMax: 40 });
    expect(privatePointShare(86)).toEqual({ overheated: 80, adjusted: 50, elsewhereMax: 0 });
  });
  it("subscription deposit tier (주택공급에 관한 규칙 별표 2, 서울·부산 300/600/1,000/1,500만원)", () => {
    expect(depositTier(84).seoulBusan).toBe(300);
    expect(depositTier(85).seoulBusan).toBe(300);
    expect(depositTier(90).seoulBusan).toBe(600);
    expect(depositTier(102).seoulBusan).toBe(600);
    expect(depositTier(103).metro).toBe(700);
    expect(depositTier(135).other).toBe(400);
    expect(depositTier(136)).toMatchObject({ label: "모든 면적", seoulBusan: 1500, metro: 1000, other: 500 });
  });
  it("page list is sorted, unique and has no 1㎡ clusters except the 84/85 boundary pair", () => {
    expect([...PYEONG_PAGE_M2].sort((a, b) => a - b)).toEqual(PYEONG_PAGE_M2);
    expect(new Set(PYEONG_PAGE_M2).size).toBe(PYEONG_PAGE_M2.length);
    for (let i = 1; i < PYEONG_PAGE_M2.length; i++) {
      const [a, b] = [PYEONG_PAGE_M2[i - 1], PYEONG_PAGE_M2[i]];
      if (a === 84 && b === 85) continue;
      expect(b - a, `${a}→${b}`).toBeGreaterThanOrEqual(3);
    }
  });
  it("keeps the pages other parts of the site link to", () => {
    // src/app/page.tsx links /pyeong/84/ and /pyeong/59/; the acquisition-tax fix links /pyeong/85/.
    for (const m2 of [59, 84, 85]) expect(PYEONG_PAGE_M2).toContain(m2);
  });
});
