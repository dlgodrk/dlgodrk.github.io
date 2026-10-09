import { describe, expect, it } from "vitest";
import { ymd } from "@/lib/date";
import {
  adulthood,
  AGE_PAGE_YEARS,
  AGE_RULES,
  ageAt,
  birthdayOfAge,
  cohortMilestones,
  completedMonths,
  countingAge,
  firstVoteYear,
  ganjiOfYear,
  isEarlyEntryBirth,
  josa,
  manAge,
  manAgeRangeInYear,
  manAgeRangeLabel,
  monthAnniversary,
  neighborYears,
  pensionStartAge,
  ruleStartDate,
  sameTtiYears,
  schoolYears,
  shortYear,
  yeonAge,
} from "./age";

describe("만 나이 (민법 제158조)", () => {
  it("counts a year on each birthday", () => {
    expect(manAge(ymd(1990, 1, 1), ymd(2026, 10, 9))).toBe(36);
    // 1990-12-25생: 2026-12-24까지 35세, 12-25부터 36세
    expect(manAge(ymd(1990, 12, 25), ymd(2026, 10, 9))).toBe(35);
    expect(manAge(ymd(1990, 12, 25), ymd(2026, 12, 24))).toBe(35);
    expect(manAge(ymd(1990, 12, 25), ymd(2026, 12, 25))).toBe(36);
  });
  it("starts at 0 on the day of birth and is -1 before it", () => {
    expect(manAge(ymd(2026, 3, 5), ymd(2026, 3, 5))).toBe(0);
    expect(manAge(ymd(2026, 3, 5), ymd(2026, 3, 4))).toBe(-1);
    expect(ageAt(ymd(2026, 3, 5), ymd(2026, 3, 4))).toBeNull();
  });
  it("2월 29일생은 평년에 3월 1일부터 한 살 많아진다 (민법 제160조 제3항)", () => {
    const b = ymd(2004, 2, 29);
    expect(manAge(b, ymd(2005, 2, 28))).toBe(0);
    expect(manAge(b, ymd(2005, 3, 1))).toBe(1);
    expect(manAge(b, ymd(2008, 2, 28))).toBe(3);
    expect(manAge(b, ymd(2008, 2, 29))).toBe(4);
    expect(manAge(b, ymd(2026, 2, 28))).toBe(21);
    expect(manAge(b, ymd(2026, 3, 1))).toBe(22);
    expect(birthdayOfAge(b, 22)).toEqual(ymd(2026, 3, 1));
    expect(birthdayOfAge(b, 20)).toEqual(ymd(2024, 2, 29));
  });
  it("counts months for babies, month-end births roll to the 1st", () => {
    expect(completedMonths(ymd(2026, 1, 15), ymd(2026, 2, 14))).toBe(0);
    expect(completedMonths(ymd(2026, 1, 15), ymd(2026, 2, 15))).toBe(1);
    // 1월 31일생: 2월에 31일이 없어 2월 말일로 1개월이 차고 3월 1일부터 1개월
    expect(completedMonths(ymd(2026, 1, 31), ymd(2026, 2, 28))).toBe(0);
    expect(completedMonths(ymd(2026, 1, 31), ymd(2026, 3, 1))).toBe(1);
    expect(monthAnniversary(ymd(1990, 12, 31), 2)).toEqual(ymd(1991, 3, 1));
    expect(monthAnniversary(ymd(1990, 12, 31), 12)).toEqual(ymd(1991, 12, 31));
  });
  it("연 나이 and 세는 나이", () => {
    expect(yeonAge(1990, 2026)).toBe(36);
    expect(countingAge(1990, 2026)).toBe(37);
  });
});

describe("ageAt", () => {
  it("builds the full breakdown", () => {
    const r = ageAt(ymd(1990, 1, 1), ymd(2026, 10, 9))!;
    expect(r.man).toBe(36);
    expect(r.months).toBe(9);
    expect(r.days).toBe(8);
    expect(r.yeon).toBe(36);
    expect(r.counting).toBe(37);
    // 36년(윤년 9번) = 13,149일 + 1/1~10/9 281일
    expect(r.daysLived).toBe(13430);
    expect(r.nextBirthday).toEqual(ymd(2027, 1, 1));
    expect(r.daysToNextBirthday).toBe(84);
    expect(r.nextAge).toBe(37);
    expect(r.isBirthday).toBe(false);
  });
  it("detects a birthday", () => {
    const r = ageAt(ymd(1990, 10, 9), ymd(2026, 10, 9))!;
    expect(r.isBirthday).toBe(true);
    expect(r.man).toBe(36);
    expect(r.daysToNextBirthday).toBe(0);
    expect(r.nextAge).toBe(36);
  });
  it("handles a leap-day birth in a common year", () => {
    const r = ageAt(ymd(2004, 2, 29), ymd(2026, 2, 10))!;
    expect(r.leapDayBirth).toBe(true);
    expect(r.man).toBe(21);
    expect(r.nextBirthday).toEqual(ymd(2026, 3, 1));
    expect(r.daysToNextBirthday).toBe(19);
  });
  it("does not call the day of birth a birthday", () => {
    const r = ageAt(ymd(2026, 10, 9), ymd(2026, 10, 9))!;
    expect(r.isBirthday).toBe(false);
    expect(r.nextBirthday).toEqual(ymd(2027, 10, 9));
  });
});

describe("만 나이 range in a year", () => {
  it("before / after birthday", () => {
    expect(manAgeRangeInYear(1990, 2026)).toEqual({ before: 35, after: 36 });
    expect(manAgeRangeInYear(2026, 2026)).toEqual({ before: null, after: 0 });
    expect(manAgeRangeLabel(1990, 2026)).toBe("만 35세·36세");
    expect(manAgeRangeLabel(2025, 2026)).toBe("만 0세·1세");
    expect(manAgeRangeLabel(2026, 2026)).toBe("만 0세");
  });
});

describe("띠 · 60갑자", () => {
  it("matches known years", () => {
    expect(ganjiOfYear(1990)).toMatchObject({ name: "경오", hanja: "庚午", tti: "백말띠", ttiShort: "말띠" });
    expect(ganjiOfYear(1930).name).toBe("경오");
    expect(ganjiOfYear(2026)).toMatchObject({ name: "병오", hanja: "丙午", tti: "붉은 말띠", element: "화(火)" });
    expect(ganjiOfYear(1966).tti).toBe("붉은 말띠");
    expect(ganjiOfYear(1984)).toMatchObject({ name: "갑자", tti: "푸른 쥐띠", cycleIndex: 0 });
    expect(ganjiOfYear(2024).tti).toBe("푸른 용띠"); // 갑진년 청룡
    expect(ganjiOfYear(2023).tti).toBe("검은 토끼띠"); // 계묘년
    expect(ganjiOfYear(2019).tti).toBe("황금 돼지띠"); // 기해년
    expect(ganjiOfYear(2020).tti).toBe("흰 쥐띠"); // 경자년
    expect(ganjiOfYear(1988).name).toBe("무진");
    expect(ganjiOfYear(2002).name).toBe("임오");
  });
  it("cycles every 60 years", () => {
    expect(ganjiOfYear(1926).name).toBe(ganjiOfYear(1986).name);
    expect(ganjiOfYear(2043).cycleIndex).toBe(59); // 계해
  });
  it("lists years with the same animal", () => {
    expect(sameTtiYears(1990, 1930, 2026)).toEqual([1930, 1942, 1954, 1966, 1978, 1990, 2002, 2014, 2026]);
    expect(sameTtiYears(2000, 1990, 2026)).toEqual([2000, 2012, 2024]);
  });
});

describe("학교 연도 (초·중등교육법 제13조)", () => {
  it("enters elementary school in birth year + 7", () => {
    expect(schoolYears(2010, 5)).toMatchObject({
      early: false,
      elementaryEntry: 2017,
      elementaryGrad: 2023,
      middleEntry: 2023,
      highEntry: 2026,
      highGrad: 2029,
      universityEntry: 2029,
    });
  });
  it("빠른년생: 2002년 이전 1·2월생은 한 해 먼저", () => {
    expect(isEarlyEntryBirth(1990, 1)).toBe(true);
    expect(isEarlyEntryBirth(1990, 3)).toBe(false);
    expect(schoolYears(1990, 1)!.elementaryEntry).toBe(1996);
    expect(schoolYears(1990, 3)!.elementaryEntry).toBe(1997);
    // 마지막 빠른년생 2002년 1·2월생은 2008년 입학, 2003년생부터는 1~12월생이 같은 학년
    expect(schoolYears(2002, 2)!.elementaryEntry).toBe(2008);
    expect(schoolYears(2002, 3)!.elementaryEntry).toBe(2009);
    expect(schoolYears(2003, 1)).toMatchObject({ early: false, elementaryEntry: 2010 });
  });
  it("is not computed for older cohorts", () => {
    expect(schoolYears(1950, 5)).toBeNull();
  });
});

describe("국민연금 수급개시연령 (국민연금법 부칙 제8조)", () => {
  it("follows the birth-year schedule", () => {
    expect([1952, 1953, 1956, 1957, 1960, 1961, 1964, 1965, 1968, 1969, 1990].map(pensionStartAge)).toEqual([
      60, 61, 61, 62, 62, 63, 63, 64, 64, 65, 65,
    ]);
  });
});

describe("법정 나이 기준", () => {
  it("연 나이 rules start on Jan 1, 만 나이 rules on the birthday", () => {
    expect(ruleStartDate(ymd(2007, 5, 5), "연", 19)).toEqual(ymd(2026, 1, 1));
    expect(ruleStartDate(ymd(2007, 5, 5), "만", 19)).toEqual(ymd(2026, 5, 5));
    expect(ruleStartDate(ymd(2008, 2, 29), "만", 18)).toEqual(ymd(2026, 3, 1));
  });
  it("has unique rule ids", () => {
    expect(new Set(AGE_RULES.map((r) => r.id)).size).toBe(AGE_RULES.length);
  });
  it("성년: 2013년 7월 1일 20세 → 19세", () => {
    expect(adulthood(1990)).toEqual({ year: 2010, age: "만 20세" });
    expect(adulthood(1992).year).toBe(2012);
    expect(adulthood(1993).year).toBe(2013);
    expect(adulthood(1994).year).toBe(2013);
    expect(adulthood(2007)).toEqual({ year: 2026, age: "만 19세" });
  });
  it("선거권: 20세 → 19세(2005) → 18세(2020)", () => {
    expect(firstVoteYear(1949)).toBeNull();
    expect(firstVoteYear(1980)!.year).toBe(2000);
    expect(firstVoteYear(1985)!.year).toBe(2005);
    expect(firstVoteYear(1986)!.year).toBe(2005);
    expect(firstVoteYear(1990)!.year).toBe(2009);
    expect(firstVoteYear(2001)!.year).toBe(2020);
    expect(firstVoteYear(2002)!.year).toBe(2020);
    expect(firstVoteYear(2008)).toEqual({ year: 2026, age: "만 18세" });
  });
});

describe("programmatic pages", () => {
  it("covers 1930–2026", () => {
    expect(AGE_PAGE_YEARS.length).toBe(97);
    expect(AGE_PAGE_YEARS[0]).toBe(1930);
    expect(AGE_PAGE_YEARS[AGE_PAGE_YEARS.length - 1]).toBe(2026);
  });
  it("picks particles by final consonant", () => {
    expect(josa("말", "이라서", "라서")).toBe("말이라서");
    expect(josa("쥐", "이라서", "라서")).toBe("쥐라서");
    expect(josa("경", "은", "는")).toBe("경은");
    expect(josa("무", "은", "는")).toBe("무는");
  });
  it("short year labels", () => {
    expect(shortYear(1990)).toBe("90");
    expect(shortYear(2005)).toBe("05");
  });
  it("neighbors are clipped to the range", () => {
    expect(neighborYears(1931)).toEqual([1930, 1931, 1932, 1933, 1934, 1935, 1936]);
    expect(neighborYears(2026, 2)).toEqual([2024, 2025, 2026]);
  });
  it("milestones are sorted and include this year", () => {
    const ms = cohortMilestones(1990, 2026);
    const years = ms.map((m) => m.year);
    expect([...years].sort((a, b) => a - b)).toEqual(years);
    expect(ms.find((m) => m.current)).toMatchObject({ year: 2026, age: "만 35세~36세" });
    expect(ms.find((m) => m.label.startsWith("초등학교"))!.year).toBe(1997);
    expect(ms.find((m) => m.label.startsWith("국민연금"))!.year).toBe(2055);
    expect(ms.find((m) => m.label.startsWith("환갑"))!.year).toBe(2050);
  });
  it("old cohorts skip rules that did not exist yet", () => {
    const ms = cohortMilestones(1935, 2026);
    expect(ms.some((m) => m.label.startsWith("초등학교"))).toBe(false);
    expect(ms.some((m) => m.label.startsWith("국민연금"))).toBe(false);
    expect(ms.some((m) => m.label.includes("선거권"))).toBe(false);
  });
  it("does not name the 민법 for cohorts that came of age before it took effect (1960.1.1)", () => {
    // 1939년생은 1959년에 성년(조선민사령·의용민법), 1940년생은 1960년 민법 시행 후 성년
    expect(cohortMilestones(1939, 2026).find((m) => m.year === 1959 && m.label.includes("성년"))!.label).toBe(
      "성년이 되는 해",
    );
    expect(cohortMilestones(1940, 2026).find((m) => m.year === 1960 && m.label.includes("성년"))!.label).toBe(
      "민법상 성년이 되는 해",
    );
  });
  it("pension milestone marks the age, not the first payment (국민연금법 제54조: 다음 달부터 지급)", () => {
    const p = cohortMilestones(1990, 2026).find((m) => m.label.startsWith("국민연금"))!;
    expect(p).toMatchObject({ year: 2055, label: "국민연금 수급 연령 도달", age: "만 65세" });
  });
  it("does not cite 법제처 22-0817 (노인복지법 해석) as the basis for 기초연금", () => {
    const senior = AGE_RULES.find((r) => r.id === "senior")!;
    expect(senior.note).toMatch(/경로우대\(노인복지법\)는 만 65세 생일부터\(법제처 해석 22-0817\)/);
  });
});
