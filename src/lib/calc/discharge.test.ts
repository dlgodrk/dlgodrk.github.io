import { describe, expect, it } from "vitest";
import { formatYMD, parseYMD, type YMD } from "@/lib/date";
import {
  cohortStatus,
  DISCHARGE_PAGE_MONTHS,
  dischargeDate,
  hasReserveDuty,
  monthAllDischarged,
  PAGE_BRANCHES,
  reserveSpan,
  reserveYearIn,
  firstOfMonthOnOrAfter,
  formatDotDate,
  isBeforeShorteningDone,
  mondaysOf,
  parseMonthSlug,
  promotionDates,
  rankOn,
  sampleEntryDate,
  sergeantMonths,
  SERVICE_TYPES,
  serviceEndDate,
  serviceProgress,
  shorteningDone,
  isStartInRange,
  SOLDIER_PAY_2026,
  totalServiceDays,
  typicalEndMonth,
  type ServiceId,
} from "./discharge";

const d = (s: string): YMD => parseYMD(s)!;
const end = (start: string, id: ServiceId) => formatYMD(dischargeDate(d(start), id));

describe("복무기간 (병무청 병역이행안내 개요, 2026)", () => {
  it("lists the current terms", () => {
    const months = Object.fromEntries(SERVICE_TYPES.map((t) => [t.id, t.months]));
    expect(months).toEqual({
      army: 18,
      marine: 18,
      navy: 20,
      air: 21,
      reserve: 18,
      social: 21,
      "ind-active": 34,
      "ind-reserve": 23,
      research: 36,
      alt: 36,
    });
  });
});

describe("전역일 = 입대일 + N개월의 전날", () => {
  // Widely reported real discharge dates (육군 18개월 / 사회복무요원 21개월).
  it("matches publicly reported discharge dates", () => {
    expect(end("2022-12-13", "army")).toBe("2024-06-12"); // BTS 진: 2022.12.13 입대 → 2024.6.12 전역
    expect(end("2023-04-18", "army")).toBe("2024-10-17"); // BTS 제이홉: 2023.4.18 입대 → 2024.10.17 전역
    expect(end("2023-12-11", "army")).toBe("2025-06-10"); // BTS RM·뷔: 2023.12.11 입대 → 2025.6.10 전역
    expect(end("2023-12-12", "army")).toBe("2025-06-11"); // BTS 지민·정국: 2023.12.12 입대 → 2025.6.11 전역
    expect(end("2023-09-22", "social")).toBe("2025-06-21"); // BTS 슈가(사회복무요원): 2023.9.22 소집 → 2025.6.21 소집해제
  });
  it("matches calculator-guide examples", () => {
    expect(end("2024-03-04", "army")).toBe("2025-09-03");
    expect(end("2025-03-01", "army")).toBe("2026-08-31");
    expect(end("2025-06-02", "army")).toBe("2026-12-01");
  });
  it("handles each branch", () => {
    expect(end("2025-06-02", "marine")).toBe("2026-12-01");
    expect(end("2025-06-02", "navy")).toBe("2027-02-01");
    expect(end("2025-06-02", "air")).toBe("2027-03-01");
    expect(end("2025-06-02", "social")).toBe("2027-03-01");
    expect(end("2025-06-02", "ind-active")).toBe("2028-04-01");
    expect(end("2025-06-02", "ind-reserve")).toBe("2027-05-01");
    expect(end("2025-06-02", "research")).toBe("2028-06-01");
  });
  it("1st-of-month start ends on the last day of the previous month", () => {
    expect(end("2025-06-01", "army")).toBe("2026-11-30");
    expect(end("2026-01-01", "army")).toBe("2027-06-30");
  });
  it("uses the month's last day when the corresponding date does not exist (민법 제160조 제3항)", () => {
    expect(formatYMD(serviceEndDate(d("2025-08-31"), 18))).toBe("2027-02-28");
    expect(formatYMD(serviceEndDate(d("2025-08-29"), 18))).toBe("2027-02-28");
    expect(formatYMD(serviceEndDate(d("2026-08-31"), 18))).toBe("2028-02-29"); // 2028 is a leap year
    expect(formatYMD(serviceEndDate(d("2026-08-29"), 18))).toBe("2028-02-28");
    expect(formatYMD(serviceEndDate(d("2024-05-31"), 18))).toBe("2025-11-30");
  });
});

describe("복무일수와 복무율", () => {
  const start = d("2025-06-02");
  const fin = d("2026-12-01");
  it("counts total days inclusively", () => {
    expect(totalServiceDays(start, fin)).toBe(548);
  });
  it("splits served and remaining days", () => {
    const p = serviceProgress(start, fin, d("2026-10-09"));
    expect(p.status).toBe("serving");
    expect(p.servedDays).toBe(495);
    expect(p.remainingDays).toBe(53);
    expect(p.servedDays + p.remainingDays).toBe(p.totalDays);
    expect(Math.round(p.ratio * 1000) / 10).toBe(90.3);
  });
  it("handles the first and last day", () => {
    expect(serviceProgress(start, fin, start).servedDays).toBe(1);
    const last = serviceProgress(start, fin, fin);
    expect(last.status).toBe("serving");
    expect(last.remainingDays).toBe(0);
    expect(last.ratio).toBe(1);
  });
  it("handles before and after", () => {
    const before = serviceProgress(start, fin, d("2025-05-30"));
    expect(before.status).toBe("before");
    expect(before.daysUntilStart).toBe(3);
    expect(before.ratio).toBe(0);
    const after = serviceProgress(start, fin, d("2026-12-11"));
    expect(after.status).toBe("done");
    expect(after.daysSinceEnd).toBe(10);
    expect(after.ratio).toBe(1);
  });
});

describe("진급 예정일 (이병 2개월·일병 6개월·상병 6개월, 매월 1일)", () => {
  const fmt = (p: ReturnType<typeof promotionDates>) => [formatYMD(p.일병), formatYMD(p.상병), formatYMD(p.병장)];
  it("promotes on the 1st once the minimum period is complete", () => {
    // 5월 1일 입대 → 7월 1일 일병, 5월 2일 입대 → 8월 1일 일병 (하루라도 모자라면 다음 달)
    expect(formatYMD(promotionDates(d("2025-05-01")).일병)).toBe("2025-07-01");
    expect(formatYMD(promotionDates(d("2025-05-02")).일병)).toBe("2025-08-01");
    // 6월 30일 입대: 8월 1일엔 2개월에 29일 모자람 → 9월 1일 일병 (2일 입대와 같음)
    expect(formatYMD(promotionDates(d("2025-06-30")).일병)).toBe("2025-09-01");
  });
  it("computes the full schedule", () => {
    expect(fmt(promotionDates(d("2025-06-02")))).toEqual(["2025-09-01", "2026-03-01", "2026-09-01"]);
    expect(fmt(promotionDates(d("2025-06-01")))).toEqual(["2025-08-01", "2026-02-01", "2026-08-01"]);
    expect(fmt(promotionDates(d("2025-12-31")))).toEqual(["2026-03-01", "2026-09-01", "2027-03-01"]);
  });
  it("knows the rank on a date", () => {
    const s = d("2025-06-02");
    expect(rankOn(s, d("2025-06-01"))).toBeNull();
    expect(rankOn(s, d("2025-06-02"))).toBe("이병");
    expect(rankOn(s, d("2025-08-31"))).toBe("이병");
    expect(rankOn(s, d("2025-09-01"))).toBe("일병");
    expect(rankOn(s, d("2026-03-01"))).toBe("상병");
    expect(rankOn(s, d("2026-10-09"))).toBe("병장");
  });
  it("counts months as 병장", () => {
    expect(sergeantMonths(d("2025-06-02"), 18)).toBe(3);
    expect(sergeantMonths(d("2025-06-01"), 18)).toBe(4);
    expect(sergeantMonths(d("2025-06-02"), 21)).toBe(6);
  });
  it("first-of-month helper", () => {
    expect(formatYMD(firstOfMonthOnOrAfter(d("2025-12-02")))).toBe("2026-01-01");
    expect(formatYMD(firstOfMonthOnOrAfter(d("2026-01-01")))).toBe("2026-01-01");
  });
});

describe("2026년 병 봉급 (공무원보수규정 별표 13)", () => {
  it("has the frozen 2025 amounts", () => {
    expect(SOLDIER_PAY_2026).toEqual({ 이병: 750000, 일병: 900000, 상병: 1200000, 병장: 1500000 });
  });
});

describe("programmatic month pages", () => {
  it("covers 2024-06 to 2027-12 without gaps", () => {
    expect(DISCHARGE_PAGE_MONTHS[0]).toBe("2024-06");
    expect(DISCHARGE_PAGE_MONTHS[DISCHARGE_PAGE_MONTHS.length - 1]).toBe("2027-12");
    expect(DISCHARGE_PAGE_MONTHS).toHaveLength(43);
    expect(new Set(DISCHARGE_PAGE_MONTHS).size).toBe(43);
    expect([...DISCHARGE_PAGE_MONTHS].sort()).toEqual(DISCHARGE_PAGE_MONTHS);
  });
  it("parses slugs", () => {
    expect(parseMonthSlug("2025-06")).toEqual({ y: 2025, m: 6 });
    expect(parseMonthSlug("2024-05")).toBeNull();
    expect(parseMonthSlug("2025-6")).toBeNull();
  });
  it("finds Mondays and a sample entry date", () => {
    expect(mondaysOf(2025, 6).map((v) => v.d)).toEqual([2, 9, 16, 23, 30]);
    expect(formatYMD(sampleEntryDate(2025, 6))).toBe("2025-06-02");
    expect(formatYMD(sampleEntryDate(2025, 9))).toBe("2025-09-08"); // 2025-09-01 is a Monday → skip the 1st
  });
  it("gives the typical discharge month used in the H1", () => {
    expect(typicalEndMonth(2025, 6, 18)).toEqual({ y: 2026, m: 12 });
    expect(typicalEndMonth(2025, 6, 20)).toEqual({ y: 2027, m: 2 });
    expect(typicalEndMonth(2025, 6, 21)).toEqual({ y: 2027, m: 3 });
  });
  it("formats compact dates", () => {
    expect(formatDotDate(d("2026-12-01"))).toBe("2026.12.01 (화)");
  });
});

describe("예비군 연차 (예비군법 제3조①2: 복무를 마친 날의 다음 날부터 8년이 되는 해의 12월 31일까지)", () => {
  it("makes the year after discharge 1년차 and ends on 12/31 of 전역 연도 + 8", () => {
    const s = reserveSpan(d("2026-10-08"));
    expect(s.firstYear).toBe(2027);
    expect(s.lastYear).toBe(2034);
    expect(formatYMD(s.endDate)).toBe("2034-12-31");
  });
  it("handles a 12월 31일 discharge (next day is 1월 1일, still ends 8 years later on 12/31)", () => {
    // 2025-12-31 전역 → 다음 날 2026-01-01부터 8년이 되는 날 2033-12-31 → 그해 12월 31일까지
    expect(reserveSpan(d("2025-12-31")).lastYear).toBe(2033);
  });
  it("counts 연차 by calendar year", () => {
    const fin = d("2025-12-01");
    expect(reserveYearIn(fin, 2024)).toBeNull();
    expect(reserveYearIn(fin, 2025)).toBe(0); // 전역한 해는 연차에 넣지 않음
    expect(reserveYearIn(fin, 2026)).toBe(1);
    expect(reserveYearIn(fin, 2033)).toBe(8);
    expect(reserveYearIn(fin, 2034)).toBeNull();
  });
  it("applies to 현역·상근예비역 and 사회복무요원 only", () => {
    const kinds = Object.fromEntries(SERVICE_TYPES.map((t) => [t.id, hasReserveDuty(t.kind)]));
    expect(kinds).toMatchObject({ army: true, marine: true, navy: true, air: true, reserve: true, social: true });
    expect(kinds).toMatchObject({ "ind-active": false, "ind-reserve": false, research: false, alt: false });
  });
});

describe("입대 월 전체의 전역 상태 (월별 페이지 시제)", () => {
  const today = d("2026-10-09");
  it("marks 2024-12 enlistees as fully discharged for every branch", () => {
    // 공군 2024-12-31 입대: 21개월 뒤 2026년 9월에는 31일이 없어 그 달 말일 2026-09-30 전역 (민법 제160조③)
    expect(formatYMD(serviceEndDate(d("2024-12-31"), 21))).toBe("2026-09-30");
    expect(cohortStatus(2024, 12, 21, today)).toBe("done");
    expect(monthAllDischarged(2024, 12, today)).toBe(true);
    expect(monthAllDischarged(2024, 6, today)).toBe(true);
  });
  it("marks 2025-01 as partly discharged: 육군·해군 done, 공군 ending", () => {
    expect(cohortStatus(2025, 1, 18, today)).toBe("done");
    expect(cohortStatus(2025, 1, 20, today)).toBe("done");
    // 공군 2025-01-01 → 2026-09-30 (지남), 2025-01-31 → 2026-10-30 (아직)
    expect(cohortStatus(2025, 1, 21, today)).toBe("ending");
    expect(monthAllDischarged(2025, 1, today)).toBe(false);
  });
  it("tells serving, ending and before apart", () => {
    expect(cohortStatus(2025, 4, 18, today)).toBe("ending"); // 4/1 → 2026-09-30, 4/30 → 2026-10-29
    expect(cohortStatus(2025, 3, 20, today)).toBe("serving"); // 3/1 → 2026-10-31
    expect(cohortStatus(2026, 10, 18, today)).toBe("serving");
    expect(cohortStatus(2026, 11, 18, today)).toBe("before");
  });
  it("still counts the end date itself as served", () => {
    // 육군 2025-04-30 입대 → 2026-10-29 전역: that day is not yet "done"
    expect(cohortStatus(2025, 4, 18, d("2026-10-29"))).toBe("ending");
    expect(cohortStatus(2025, 4, 18, d("2026-10-30"))).toBe("done");
  });
  it("lists the page branches in term order", () => {
    expect(PAGE_BRANCHES.map((b) => b.months)).toEqual([18, 20, 21]);
  });
});

describe("단축 경과 기간 경고", () => {
  // 병무청 mma0000728·mma0000742: "'20.6.2. 입영자부터 21개월 → 18개월로 단축" (육군·상근예비역)
  it("uses 2020-06-02 for 육군·해병대·상근예비역", () => {
    for (const id of ["army", "marine", "reserve"] as const) {
      expect(isBeforeShorteningDone(d("2020-06-01"), id)).toBe(true);
      expect(isBeforeShorteningDone(d("2020-06-02"), id)).toBe(false);
      expect(isBeforeShorteningDone(d("2021-03-02"), id)).toBe(false);
      expect(shorteningDone(id)?.exact).toBe(true);
    }
  });
  it("keeps a conservative 2022-01-01 cut-off where the end date is not confirmed", () => {
    for (const id of ["navy", "air", "social", "ind-reserve"] as const) {
      expect(isBeforeShorteningDone(d("2021-12-31"), id)).toBe(true);
      expect(isBeforeShorteningDone(d("2022-01-01"), id)).toBe(false);
      expect(shorteningDone(id)?.exact).toBe(false);
    }
  });
  it("never warns for terms that were not shortened", () => {
    for (const id of ["ind-active", "research", "alt"] as const) {
      expect(shorteningDone(id)).toBeNull();
      expect(isBeforeShorteningDone(d("2018-01-01"), id)).toBe(false);
    }
  });
});

describe("입력 범위 (2000-01-01 ~ 2040-12-31)", () => {
  it("accepts the bounds and rejects dates outside", () => {
    expect(isStartInRange(d("2000-01-01"))).toBe(true);
    expect(isStartInRange(d("2040-12-31"))).toBe(true);
    expect(isStartInRange(d("2025-06-02"))).toBe(true);
    expect(isStartInRange(d("1999-12-31"))).toBe(false);
    expect(isStartInRange(d("2041-01-01"))).toBe(false);
  });
  it("rejects years below 100 that Date.UTC would map to the 1900s", () => {
    // Chrome passes through values like 0002-06-02 and 0202-06-02 while the year is typed.
    expect(isStartInRange(d("0002-06-02"))).toBe(false);
    expect(isStartInRange(d("0020-06-02"))).toBe(false);
    expect(isStartInRange(d("0099-12-01"))).toBe(false);
    expect(isStartInRange(d("0202-06-02"))).toBe(false);
  });
});
