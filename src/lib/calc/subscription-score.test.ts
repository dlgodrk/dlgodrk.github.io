import { describe, expect, it } from "vitest";
import { ymd } from "@/lib/date";
import {
  age30Date,
  bracketOf,
  calcByBrackets,
  calcByDates,
  calcHomeless,
  checkDateInputs,
  completedMonths,
  dependentsPoints,
  formatMonths,
  HOMELESS_BRACKETS,
  homelessPointsForYears,
  maxScoreByDependents,
  monthAnniversary,
  nextSavingsRaise,
  SAVINGS_BRACKETS,
  savingsPeriod,
  savingsPointsForMonths,
  savingsScore,
  SCORE_MAX,
  spouseBonusForMonths,
  SPOUSE_BRACKETS,
  type DateInputs,
} from "./subscription-score";

const REF = ymd(2026, 10, 9);

// Point tables: 주택공급에 관한 규칙 [별표 1] 제2호나목 (현행, 2026. 6. 15. 시행본에서 확인)
describe("별표 1 가점표", () => {
  it("무주택기간: 1년 미만 2점, 1년마다 2점, 15년 이상 32점", () => {
    expect(homelessPointsForYears(0)).toBe(2);
    expect(homelessPointsForYears(1)).toBe(4);
    expect(homelessPointsForYears(7)).toBe(16);
    expect(homelessPointsForYears(8)).toBe(18);
    expect(homelessPointsForYears(14)).toBe(30);
    expect(homelessPointsForYears(15)).toBe(32);
    expect(homelessPointsForYears(30)).toBe(32);
  });
  it("부양가족: 0명 5점 ~ 6명 이상 35점", () => {
    expect(dependentsPoints(0)).toBe(5);
    expect(dependentsPoints(1)).toBe(10);
    expect(dependentsPoints(3)).toBe(20);
    expect(dependentsPoints(6)).toBe(35);
    expect(dependentsPoints(9)).toBe(35);
    expect(dependentsPoints(-1)).toBe(5);
  });
  it("청약통장: 6개월 미만 1, 6개월~1년 2, 1~2년 3, 14~15년 16, 15년 이상 17", () => {
    expect(savingsPointsForMonths(0)).toBe(1);
    expect(savingsPointsForMonths(5)).toBe(1);
    expect(savingsPointsForMonths(6)).toBe(2);
    expect(savingsPointsForMonths(11)).toBe(2);
    expect(savingsPointsForMonths(12)).toBe(3);
    expect(savingsPointsForMonths(24)).toBe(4);
    expect(savingsPointsForMonths(96)).toBe(10); // 8년 이상 9년 미만 10점
    expect(savingsPointsForMonths(179)).toBe(16);
    expect(savingsPointsForMonths(180)).toBe(17);
    expect(savingsPointsForMonths(300)).toBe(17);
  });
  it("만점은 84점", () => {
    expect(maxScoreByDependents(6)).toBe(SCORE_MAX);
    expect(maxScoreByDependents(0)).toBe(54);
    expect(maxScoreByDependents(3)).toBe(69);
  });
});

// 별표 1 비고 2 + 입주자모집공고문 배우자 점수표(배우자 1년 미만 1점, 1~2년 2점, 2년 이상 3점)
describe("배우자 통장 가산점", () => {
  it("배우자 가입기간의 50%를 같은 표로, 최대 3점", () => {
    expect(spouseBonusForMonths(0)).toBe(1);
    expect(spouseBonusForMonths(11)).toBe(1);
    expect(spouseBonusForMonths(12)).toBe(2);
    expect(spouseBonusForMonths(23)).toBe(2);
    expect(spouseBonusForMonths(24)).toBe(3);
    expect(spouseBonusForMonths(240)).toBe(3);
  });
  it("본인 5년(7점) + 배우자 4년(3점) = 10점 (비고 2: 배우자 몫은 3점 상한)", () => {
    const s = savingsScore(60, 48, REF);
    expect(s).toMatchObject({ own: 7, bonus: 3, applied: 3, total: 10 });
  });
  it("합산은 17점을 넘지 않는다", () => {
    expect(savingsScore(170, 60, REF)).toMatchObject({ own: 16, bonus: 3, applied: 1, total: 17 });
    expect(savingsScore(200, 60, REF)).toMatchObject({ own: 17, applied: 0, total: 17 });
  });
  it("2024. 3. 25. 전 공고에는 합산하지 않는다 (부칙 제2조)", () => {
    expect(savingsScore(60, 48, ymd(2024, 3, 24))).toMatchObject({ bonus: 0, total: 7, spouseAllowed: false });
    expect(savingsScore(60, 48, ymd(2024, 3, 25))).toMatchObject({ bonus: 3, total: 10, spouseAllowed: true });
  });
  it("배우자 통장이 없으면 0점", () => {
    expect(savingsScore(60, null, REF).total).toBe(7);
  });
});

describe("기간 계산 (민법 제160조)", () => {
  it("같은 날이 돌아오면 기간이 찬다", () => {
    expect(completedMonths(ymd(2018, 5, 12), ymd(2026, 5, 12))).toBe(96);
    expect(completedMonths(ymd(2018, 5, 12), ymd(2026, 5, 11))).toBe(95);
    expect(completedMonths(ymd(2018, 5, 12), ymd(2018, 5, 12))).toBe(0);
    expect(completedMonths(ymd(2018, 5, 12), ymd(2018, 5, 11))).toBe(-1);
  });
  it("말일이 없는 달은 다음 달 1일부터", () => {
    expect(monthAnniversary(ymd(2024, 1, 31), 1)).toEqual(ymd(2024, 3, 1));
    expect(completedMonths(ymd(2024, 1, 31), ymd(2024, 2, 29))).toBe(0);
    expect(completedMonths(ymd(2024, 1, 31), ymd(2024, 3, 1))).toBe(1);
  });
  it("2월 29일생은 평년이면 3월 1일에 만 30세", () => {
    expect(age30Date(ymd(1996, 2, 29))).toEqual(ymd(2026, 3, 1));
    expect(age30Date(ymd(1994, 2, 28))).toEqual(ymd(2024, 2, 28));
  });
  it("기간 표시", () => {
    expect(formatMonths(100)).toBe("8년 4개월");
    expect(formatMonths(7)).toBe("7개월");
    expect(formatMonths(144)).toBe("12년");
  });
});

// 별표 1 제1호가목3)
describe("무주택기간 기산일", () => {
  const birth = ymd(1990, 3, 15); // 만 30세 = 2020-03-15
  it("미혼이면 만 30세가 되는 날부터", () => {
    const h = calcHomeless({ birth, marriage: null, ownership: "none", homelessSince: null, ref: REF });
    expect(h.start).toEqual(ymd(2020, 3, 15));
    expect(h.startBasis).toBe("age30");
    expect(h.months).toBe(78); // 6년 6개월
    expect(h.points).toBe(14);
    expect(h.next).toEqual({ date: ymd(2027, 3, 15), points: 16 });
  });
  it("만 30세 전에 혼인신고했으면 혼인신고일부터", () => {
    const h = calcHomeless({ birth, marriage: ymd(2018, 5, 12), ownership: "none", homelessSince: null, ref: REF });
    expect(h.start).toEqual(ymd(2018, 5, 12));
    expect(h.startBasis).toBe("marriage");
    expect(h.points).toBe(18); // 8년 4개월
  });
  it("만 30세 이후 혼인이면 그대로 만 30세부터", () => {
    const h = calcHomeless({ birth, marriage: ymd(2021, 6, 1), ownership: "none", homelessSince: null, ref: REF });
    expect(h.startBasis).toBe("age30");
    expect(h.points).toBe(14);
  });
  it("주택을 처분했으면 무주택이 된 날부터 (더 늦을 때)", () => {
    const later = calcHomeless({ birth, marriage: null, ownership: "past", homelessSince: ymd(2022, 8, 10), ref: REF });
    expect(later.startBasis).toBe("disposal");
    expect(later.points).toBe(10); // 4년 1개월
    const earlier = calcHomeless({ birth, marriage: null, ownership: "past", homelessSince: ymd(2015, 1, 1), ref: REF });
    expect(earlier.startBasis).toBe("age30");
    expect(earlier.points).toBe(14);
  });
  it("만 30세 미만 미혼은 0점, 만 30세 생일에 2점", () => {
    const h = calcHomeless({ birth: ymd(2000, 1, 1), marriage: null, ownership: "none", homelessSince: null, ref: REF });
    expect(h.counting).toBe(false);
    expect(h.points).toBe(0);
    expect(h.next).toEqual({ date: ymd(2030, 1, 1), points: 2 });
    const onDay = calcHomeless({
      birth: ymd(2000, 1, 1),
      marriage: null,
      ownership: "none",
      homelessSince: null,
      ref: ymd(2030, 1, 1),
    });
    expect(onDay.points).toBe(2);
  });
  it("지금 주택을 가진 세대는 0점", () => {
    const h = calcHomeless({ birth, marriage: ymd(2018, 5, 12), ownership: "now", homelessSince: null, ref: REF });
    expect(h.owner).toBe(true);
    expect(h.points).toBe(0);
    expect(h.next).toBeNull();
  });
  it("15년 이상은 32점에서 멈춘다", () => {
    const h = calcHomeless({ birth: ymd(1970, 1, 1), marriage: null, ownership: "none", homelessSince: null, ref: REF });
    expect(h.points).toBe(32);
    expect(h.next).toBeNull();
  });
});

// 제10조제6항: 미성년 가입기간 인정 한도
describe("미성년 가입기간", () => {
  it("성년 이후 가입은 그대로", () => {
    const p = savingsPeriod(ymd(2014, 6, 2), REF, ymd(1990, 3, 15))!;
    expect(p.joinedAsMinor).toBe(false);
    expect(p.months).toBe(148); // 12년 4개월
  });
  it("2023년 이전 미성년 기간은 2년만 인정", () => {
    // 2000-05-01생(성년 2019-05-01), 2010-01-01 가입: 미성년 9년 4개월 → 2년
    const p = savingsPeriod(ymd(2010, 1, 1), REF, ymd(2000, 5, 1))!;
    expect(p.minorCapped).toBe(true);
    expect(p.start).toEqual(ymd(2017, 5, 1));
    expect(p.months).toBe(113); // 9년 5개월
    expect(savingsPointsForMonths(p.months)).toBe(11);
  });
  it("2024년 이후 미성년 기간은 2년 한도 밖에서 더해진다", () => {
    // 2006-01-10생(성년 2025-01-10), 2016-01-10 가입: 2023년까지 2년 + 2024-01-01~2025-01-10
    const p = savingsPeriod(ymd(2016, 1, 10), REF, ymd(2006, 1, 10))!;
    expect(p.start).toEqual(ymd(2022, 1, 1));
    expect(p.months).toBe(57);
    expect(savingsPointsForMonths(p.months)).toBe(6);
  });
  it("합계는 5년까지", () => {
    // 2012-01-01생, 2015-01-01 가입, 2028-06-01 공고(아직 미성년): 2년 + 4년 5개월 → 5년
    const p = savingsPeriod(ymd(2015, 1, 1), ymd(2028, 6, 1), ymd(2012, 1, 1))!;
    expect(p.start).toEqual(ymd(2023, 6, 1));
    expect(p.months).toBe(60);
    expect(p.stillMinor).toBe(true);
  });
  it("2024. 7. 1. 전 공고는 미성년 기간 2년 한도", () => {
    // 2005-03-01생(성년 2024-03-01), 2020-01-01 가입, 2024-05-01 공고: 미성년 4년 2개월 → 2년
    const p = savingsPeriod(ymd(2020, 1, 1), ymd(2024, 5, 1), ymd(2005, 3, 1))!;
    expect(p.start).toEqual(ymd(2022, 3, 1));
    expect(p.months).toBe(26);
  });
  it("미성년 기간이 한도 안이면 줄이지 않는다", () => {
    const p = savingsPeriod(ymd(2018, 11, 1), REF, ymd(2000, 5, 1))!;
    expect(p.joinedAsMinor).toBe(true);
    expect(p.minorCapped).toBe(false);
    expect(p.start).toEqual(ymd(2018, 11, 1));
  });
  it("가입일이 기준일보다 뒤면 null", () => {
    expect(savingsPeriod(ymd(2026, 10, 10), REF, null)).toBeNull();
  });
});

describe("점수가 오르는 날", () => {
  it("본인 통장 다음 구간", () => {
    const own = savingsPeriod(ymd(2014, 6, 2), REF, ymd(1990, 3, 15))!;
    expect(nextSavingsRaise(own, null, REF)).toEqual({ date: ymd(2027, 6, 2), points: 15 });
  });
  it("배우자 통장이 먼저 오르면 그 날", () => {
    const own = savingsPeriod(ymd(2014, 6, 2), REF, ymd(1990, 3, 15))!;
    // 배우자 2025-12-15 가입: 2026-12-15에 1년 → 2점
    expect(nextSavingsRaise(own, ymd(2025, 12, 15), REF)).toEqual({ date: ymd(2026, 12, 15), points: 16 });
  });
  it("17점이면 없음", () => {
    const own = savingsPeriod(ymd(2010, 1, 1), REF, ymd(1980, 1, 1))!;
    expect(nextSavingsRaise(own, null, REF)).toBeNull();
  });
});

const base: DateInputs = {
  ref: REF,
  birth: ymd(1990, 3, 15),
  married: true,
  marriage: ymd(2018, 5, 12),
  ownership: "none",
  homelessSince: null,
  dependents: 2,
  join: ymd(2014, 6, 2),
  spouseHasSavings: true,
  spouseJoin: ymd(2020, 3, 2),
};

describe("날짜로 계산 (전체)", () => {
  it("기본 예시: 무주택 18 + 부양가족 15 + 통장 17 = 50점", () => {
    const r = calcByDates(base)!;
    expect(r.homeless.points).toBe(18);
    expect(r.dependentsPoints).toBe(15);
    expect(r.savings).toMatchObject({ own: 14, bonus: 3, applied: 3, total: 17 });
    expect(r.total).toBe(50);
    expect(r.savingsNext).toBeNull();
  });
  it("미혼이면 배우자 통장을 무시한다", () => {
    const r = calcByDates({ ...base, married: false })!;
    expect(r.homeless.points).toBe(14);
    expect(r.savings.total).toBe(14);
  });
  it("입력 검증", () => {
    expect(checkDateInputs(base)).toBeNull();
    expect(checkDateInputs({ ...base, birth: null })).toContain("생년월일");
    expect(checkDateInputs({ ...base, join: ymd(2027, 1, 1) })).toContain("가입일");
    expect(checkDateInputs({ ...base, marriage: ymd(2027, 1, 1) })).toContain("혼인신고일");
    expect(checkDateInputs({ ...base, ownership: "past", homelessSince: null })).toContain("무주택이 된 날");
    expect(checkDateInputs({ ...base, spouseJoin: null })).toContain("배우자");
    expect(checkDateInputs({ ...base, married: false, spouseJoin: null })).toBeNull();
    expect(calcByDates({ ...base, birth: null })).toBeNull();
  });
  it("태어나기 전 날짜는 오류 (오타를 미성년 가입으로 오해하지 않도록)", () => {
    // 1990-03-15생인데 가입일 1985년: 미성년 가입으로 계산하지 않고 해요체 오류를 낸다.
    expect(checkDateInputs({ ...base, join: ymd(1985, 1, 1) })).toBe("청약통장 가입일이 생년월일보다 앞서 있어요.");
    expect(calcByDates({ ...base, join: ymd(1985, 1, 1) })).toBeNull();
    expect(checkDateInputs({ ...base, ownership: "past", homelessSince: ymd(1980, 1, 1) })).toBe(
      "무주택이 된 날이 생년월일보다 앞서 있어요.",
    );
    // 생일 당일 가입·처분은 허용
    expect(checkDateInputs({ ...base, join: ymd(1990, 3, 15) })).toBeNull();
    expect(checkDateInputs({ ...base, ownership: "past", homelessSince: ymd(1990, 3, 15) })).toBeNull();
  });
  it("만점 통장 17점은 본인 12년 + 배우자 2년으로도 가능 (별표 1 비고 2)", () => {
    expect(savingsScore(144, 24, REF).total).toBe(17);
    expect(calcByBrackets(15, 6, 144, 24).total).toBe(SCORE_MAX);
  });
});

describe("기간으로 선택", () => {
  it("구간 목록이 표와 맞다", () => {
    expect(HOMELESS_BRACKETS).toHaveLength(17);
    expect(HOMELESS_BRACKETS.map((b) => b.points)).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32]);
    expect(SAVINGS_BRACKETS).toHaveLength(17);
    expect(SAVINGS_BRACKETS.map((b) => b.points)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
    expect(SPOUSE_BRACKETS.map((b) => b.points)).toEqual([0, 1, 2, 3]);
  });
  it("같은 사례를 구간으로 골라도 50점", () => {
    const r = calcByBrackets(8, 2, 144, 24);
    expect(r.total).toBe(50);
    expect(r.spouseApplied).toBe(3);
  });
  it("모르는 값은 아래 구간으로", () => {
    expect(bracketOf(SAVINGS_BRACKETS, 150).value).toBe(144);
    expect(bracketOf(HOMELESS_BRACKETS, NaN).value).toBe(-1);
  });
  it("만점 84점", () => {
    expect(calcByBrackets(15, 6, 180, 24).total).toBe(84);
  });
});
