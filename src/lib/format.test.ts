import { describe, expect, it } from "vitest";
import { floorTo, formatNumber, formatWon, koreanWon, manwonLabel, parseNumber } from "./format";

describe("format", () => {
  it("formats numbers with commas", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
    expect(formatWon(3000000)).toBe("3,000,000원");
    expect(formatNumber(-0.4)).toBe("0");
  });
  it("reads Korean amounts", () => {
    expect(koreanWon(123456789)).toBe("1억 2,345만 6,789원");
    expect(koreanWon(30_000_000)).toBe("3,000만원".replace("만원", "만원"));
    expect(koreanWon(100_000_000)).toBe("1억원");
    expect(koreanWon(0)).toBe("0원");
    expect(manwonLabel(12000)).toBe("1억 2,000만원");
  });
  it("parses input", () => {
    expect(parseNumber("3,000,000원")).toBe(3000000);
    expect(parseNumber("")).toBeNaN();
    expect(parseNumber("12.5")).toBe(12.5);
  });
  it("truncates", () => {
    expect(floorTo(12345, 10)).toBe(12340);
  });
});
