import { describe, expect, it } from "vitest";
import { addDays, addMonths, diffDays, formatKoreanDate, parseYMD, todayKST, ymd } from "./date";

describe("date", () => {
  it("parses and validates", () => {
    expect(parseYMD("2026-02-29")).toBeNull();
    expect(parseYMD("2024-02-29")).toEqual(ymd(2024, 2, 29));
  });
  it("adds months with clamping", () => {
    expect(addMonths(ymd(2026, 1, 31), 1)).toEqual(ymd(2026, 2, 28));
    expect(addMonths(ymd(2025, 6, 2), 18)).toEqual(ymd(2026, 12, 2));
  });
  it("diffs days", () => {
    expect(diffDays(ymd(2026, 1, 1), ymd(2026, 12, 31))).toBe(364);
    expect(addDays(ymd(2026, 12, 31), 1)).toEqual(ymd(2027, 1, 1));
  });
  it("formats", () => {
    expect(formatKoreanDate(ymd(2026, 10, 9))).toBe("2026년 10월 9일 (금)");
  });
  it("today in KST", () => {
    expect(todayKST(new Date("2026-10-08T15:30:00Z"))).toEqual(ymd(2026, 10, 9));
    expect(todayKST(new Date("2026-10-08T14:59:00Z"))).toEqual(ymd(2026, 10, 8));
  });
});
