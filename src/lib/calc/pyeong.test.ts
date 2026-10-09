import { describe, expect, it } from "vitest";
import { estimateSupplyPyeong, m2ToPyeong, PYEONG_PAGE_M2, pyeongToM2, round2, sizeClass } from "./pyeong";

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
  it("estimates the common 평형 label", () => {
    // 전용 84㎡ is marketed as 33~34평형; 59㎡ as 24~25평형.
    expect(Math.round(estimateSupplyPyeong(84))).toBe(34);
    expect(Math.round(estimateSupplyPyeong(59))).toBe(24);
  });
  it("classifies sizes", () => {
    expect(sizeClass(84)).toContain("국민주택규모");
    expect(sizeClass(59)).toContain("소형");
  });
  it("page list is sorted and unique", () => {
    expect([...PYEONG_PAGE_M2].sort((a, b) => a - b)).toEqual(PYEONG_PAGE_M2);
    expect(new Set(PYEONG_PAGE_M2).size).toBe(PYEONG_PAGE_M2.length);
  });
});
