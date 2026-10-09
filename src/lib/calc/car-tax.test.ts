import { describe, expect, it } from "vitest";
import {
  ageReductionPct,
  ageTable,
  bracketLabel,
  CAR_TAX_PAGE_CC,
  carAge,
  computeCarTax,
  perCcRate,
  prepay,
  remainingDays,
  validateInput,
  type CarTaxInput,
} from "./car-tax";

const newCar = (cc: number, kind: CarTaxInput["kind"] = "private"): CarTaxInput => ({
  kind,
  cc,
  regYear: 2026,
  regMonth: 1,
  taxYear: 2026,
});

describe("cc당 세액 (지방세법 제127조 제1항 제1호)", () => {
  it("비영업용 brackets", () => {
    expect(perCcRate("private", 998)).toBe(80);
    expect(perCcRate("private", 1000)).toBe(80);
    expect(perCcRate("private", 1001)).toBe(140);
    expect(perCcRate("private", 1600)).toBe(140);
    expect(perCcRate("private", 1601)).toBe(200);
    expect(perCcRate("private", 3778)).toBe(200);
    expect(bracketLabel("private", 1999)).toBe("1,600cc 초과");
  });
  it("영업용 brackets", () => {
    expect(perCcRate("business", 998)).toBe(18);
    expect(perCcRate("business", 1600)).toBe(18);
    expect(perCcRate("business", 1999)).toBe(19);
    expect(perCcRate("business", 2500)).toBe(19);
    expect(perCcRate("business", 2501)).toBe(24);
  });
});

describe("차령 (지방세법 시행령 제122조 제2항)", () => {
  it("기산일 1~6월: 과세연도 − 기산연도 + 1", () => {
    expect(carAge(2026, 2022, 3)).toEqual({ first: 5, second: 5 });
    expect(carAge(2026, 2026, 6)).toEqual({ first: 1, second: 1 });
  });
  it("기산일 7~12월: 1기분은 1년 적고 2기분은 +1", () => {
    expect(carAge(2026, 2023, 9)).toEqual({ first: 3, second: 4 });
    expect(carAge(2026, 2020, 12)).toEqual({ first: 6, second: 7 });
  });
  it("경감률: 3년차 5%부터 12년 이상 50%", () => {
    expect(ageReductionPct(1)).toBe(0);
    expect(ageReductionPct(2)).toBe(0);
    expect(ageReductionPct(3)).toBe(5);
    expect(ageReductionPct(5)).toBe(15);
    expect(ageReductionPct(12)).toBe(50);
    expect(ageReductionPct(20)).toBe(50);
  });
});

describe("연간 자동차세", () => {
  it("2,000cc급 신차: 399,800 + 교육세 119,940 = 519,740원", () => {
    const r = computeCarTax(newCar(1999));
    expect(r.baseAnnual).toBe(399_800);
    expect(r.carTax).toBe(399_800);
    expect(r.eduTax).toBe(119_940);
    expect(r.total).toBe(519_740);
    expect(r.june).toBe(259_870);
    expect(r.december).toBe(259_870);
    expect(r.lumpSum).toBe(false);
  });

  it("matches 서울시 2023-01-12 보도자료 연세액 (1,998cc 519,480원, 3,342cc 868,920원)", () => {
    // https://news.seoul.go.kr/gov/?p=544533 — 신차 기준 연세액 표
    expect(computeCarTax(newCar(1998)).total).toBe(519_480);
    expect(computeCarTax(newCar(3342)).total).toBe(868_920);
  });

  it("차령 5년(15% 경감): 각 기분 199,900 × 0.85 = 169,915 → 169,910원", () => {
    const r = computeCarTax({ kind: "private", cc: 1999, regYear: 2022, regMonth: 3, taxYear: 2026 });
    expect(r.halves[0]).toMatchObject({ age: 5, reductionPct: 15, carTax: 169_910, eduTax: 50_970 });
    expect(r.carTax).toBe(339_820);
    expect(r.reduction).toBe(59_980);
    expect(r.total).toBe(441_760);
  });

  it("7~12월 등록 차는 상·하반기 경감률이 다르다", () => {
    const r = computeCarTax({ kind: "private", cc: 1598, regYear: 2023, regMonth: 9, taxYear: 2026 });
    // A = 1,598 × 140 = 223,720 → 반기 111,860
    expect(r.halves[0]).toMatchObject({ age: 3, reductionPct: 5, carTax: 106_260 }); // 106,267 → 106,260
    expect(r.halves[1]).toMatchObject({ age: 4, reductionPct: 10, carTax: 100_670 }); // 100,674 → 100,670
  });

  it("차령 12년 이상은 50%에서 멈춘다", () => {
    const r = computeCarTax({ kind: "private", cc: 2497, regYear: 2008, regMonth: 5, taxYear: 2026 });
    expect(r.halves[0].reductionPct).toBe(50);
    expect(r.carTax).toBe(249_700);
  });

  it("경차 998cc: 79,840원 → 10만원 이하라 6월 일괄, 하반기분 5% 공제", () => {
    const r = computeCarTax(newCar(998));
    expect(r.carTax).toBe(79_840);
    expect(r.halves[0]).toMatchObject({ carTax: 39_920, eduTax: 11_970, total: 51_890 });
    expect(r.total).toBe(103_780);
    expect(r.lumpSum).toBe(true);
    expect(r.lumpSumDeduction).toBe(2_590); // 51,890 × 5% = 2,594.5
    expect(r.june).toBe(101_190);
    expect(r.december).toBe(0);
  });

  it("전기·수소차: 100,000 + 교육세 30,000 = 130,000원, 차령 경감 없음", () => {
    const r = computeCarTax({ kind: "electric", cc: 0, regYear: 2010, regMonth: 1, taxYear: 2026 });
    expect(r.carTax).toBe(100_000);
    expect(r.eduTax).toBe(30_000);
    expect(r.total).toBe(130_000);
    expect(r.reduction).toBe(0);
    // 연세액 10만원 '이하' → 6월 일괄 고지 가능, 하반기 65,000 × 5% = 3,250 공제
    expect(r.lumpSum).toBe(true);
    expect(r.june).toBe(126_750);
  });

  it("영업용 전기·수소: 연 20,000원, 지방교육세 없음 (제127조 제1항 제3호)", () => {
    const r = computeCarTax({ kind: "electricBusiness", cc: NaN, regYear: 2020, regMonth: 1, taxYear: 2026 });
    expect(r.baseAnnual).toBe(20_000);
    expect(r.carTax).toBe(20_000);
    expect(r.eduTax).toBe(0);
    expect(r.total).toBe(20_000);
    expect(r.lumpSum).toBe(true);
    expect(r.june).toBe(19_500); // 하반기 10,000 × 5% = 500 공제
    expect(validateInput({ kind: "electricBusiness", cc: NaN, regYear: 2020, regMonth: 1, taxYear: 2026 })).toBeNull();
  });

  it("영업용: 지방교육세·차령 경감 없음", () => {
    const r = computeCarTax({ kind: "business", cc: 1999, regYear: 2010, regMonth: 1, taxYear: 2026 });
    expect(r.baseAnnual).toBe(37_981);
    expect(r.carTax).toBe(37_980); // 18,990.5 → 18,990 × 2
    expect(r.eduTax).toBe(0);
    expect(r.total).toBe(37_980);
    expect(r.lumpSum).toBe(true);
  });

  it("10만원 경계는 자동차세(교육세 제외) 기준", () => {
    // 1,353cc 차령 12년 이상: 반기 189,420 × 50% / 2 = 47,355 → 47,350 × 2 = 94,700 → 10만원 이하
    const old = computeCarTax({ kind: "private", cc: 1353, regYear: 2014, regMonth: 1, taxYear: 2026 });
    expect(old.carTax).toBe(94_700);
    expect(old.total).toBeGreaterThan(100_000);
    expect(old.lumpSum).toBe(true);
    expect(computeCarTax(newCar(1353)).lumpSum).toBe(false);
  });
});

describe("연납 공제 (지방세법 제128조 제3항, 이자율 5%)", () => {
  it("remaining days", () => {
    expect(remainingDays(2026, 1)).toBe(334);
    expect(remainingDays(2026, 3)).toBe(275);
    expect(remainingDays(2028, 1)).toBe(335);
    expect(remainingDays(2028, 3)).toBe(275);
  });

  it("reproduces 서울시 2023년 1월 연납 사례 (이자율 7%)", () => {
    // 1,998cc 519,480 → 공제 33,270 → 486,210 / 3,342cc 868,920 → 55,650 → 813,270
    const a = prepay({ ...computeCarTax(newCar(1998)), taxYear: 2023 }, 1, 7);
    expect(a.deduction).toBe(33_270);
    expect(a.annualPay).toBe(486_210);
    const b = prepay({ ...computeCarTax(newCar(3342)), taxYear: 2023 }, 1, 7);
    expect(b.deduction).toBe(55_650);
    expect(b.annualPay).toBe(813_270);
  });

  it("2026년 1·3·6·9월 공제 (1,999cc 신차 519,740원)", () => {
    const r = computeCarTax(newCar(1999));
    const jan = prepay(r, 1);
    expect(jan.deduction).toBe(23_770); // 519,740 × 334/365 × 5% = 23,779.9 → 10원 미만 버림
    expect(jan.annualPay).toBe(495_970);
    expect(jan.effectiveRate).toBeCloseTo(0.04575, 4);
    expect(prepay(r, 3).deduction).toBe(19_570); // × 275/365 × 5% = 19,579.2
    const jun = prepay(r, 6);
    expect(jun.deduction).toBe(12_990); // 259,870 × 5% = 12,993.5
    expect(jun.payInMonth).toBe(506_750);
    const sep = prepay(r, 9);
    expect(sep.deduction).toBe(6_490); // 259,870 × 92/184 × 5% = 6,496.75
    expect(sep.payInMonth).toBe(259_870 - 6_490);
    expect(sep.annualPay).toBe(519_740 - 6_490);
  });

  it("10만원 이하 차: 9월 연납은 없고 6월은 정기 일괄 고지와 같다", () => {
    const r = computeCarTax(newCar(998));
    expect(prepay(r, 9).available).toBe(false);
    const jun = prepay(r, 6);
    expect(jun.sameAsLumpSum).toBe(true);
    expect(jun.annualPay).toBe(r.june);
    expect(prepay(r, 1).deduction).toBe(4_740); // 103,780 × 334/365 × 5% = 4,748.2
  });
});

describe("validation", () => {
  it("rejects bad input", () => {
    expect(validateInput({ ...newCar(NaN) })).not.toBeNull();
    expect(validateInput({ ...newCar(0) })).not.toBeNull();
    expect(validateInput({ ...newCar(1999), regYear: 2027 })).not.toBeNull();
    expect(validateInput({ kind: "electric", cc: NaN, regYear: 2026, regMonth: 1, taxYear: 2026 })).toBeNull();
    expect(validateInput(newCar(1999))).toBeNull();
  });
});

describe("programmatic pages", () => {
  it("list is sorted and unique", () => {
    expect([...CAR_TAX_PAGE_CC].sort((a, b) => a - b)).toEqual(CAR_TAX_PAGE_CC);
    expect(new Set(CAR_TAX_PAGE_CC).size).toBe(CAR_TAX_PAGE_CC.length);
  });
  it("age table covers 2~12 years (차령 1년 = 올해 등록, 일할이라 제외)", () => {
    const rows = ageTable("private", 1999, 2026);
    expect(rows).toHaveLength(11);
    expect(rows[0]).toMatchObject({ age: 2, regYear: 2025, reductionPct: 0 });
    expect(rows[0].result.total).toBe(519_740);
    expect(rows[0].result.partialYear).toBe(false);
    expect(rows[0].january.annualPay).toBe(495_970);
    expect(rows[10]).toMatchObject({ age: 12, regYear: 2015, reductionPct: 50 });
    expect(rows[10].result.total).toBe(259_860); // 반기 99,950 + 교육세 29,980
  });
});

describe("올해 처음 등록한 차 (제128조 제2항 단서, 시행령 제126조 일할)", () => {
  const reg = (cc: number, m: number, d: number): CarTaxInput => ({
    kind: "private",
    cc,
    regYear: 2026,
    regMonth: m,
    regDay: d,
    taxYear: 2026,
  });

  it("7~12월 등록: 제1기분 없음, 제2기분은 등록일부터 일할", () => {
    // 1,999cc 2026-08-01 등록: 8/1~12/31 = 153일, 399,800 × 153/365 = 167,587.4 → 167,580
    const r = computeCarTax(reg(1999, 8, 1));
    expect(r.halves[0]).toMatchObject({ age: 0, days: 0, carTax: 0, eduTax: 0, total: 0 });
    expect(r.halves[1]).toMatchObject({ age: 1, days: 153, carTax: 167_580, eduTax: 50_270, total: 217_850 });
    expect(r.total).toBe(217_850);
    expect(r.june).toBe(0);
    expect(r.december).toBe(217_850);
    expect(r.lumpSum).toBe(false);
    expect(r.partialYear).toBe(true);
    expect(r.fullTotal).toBe(519_740);
    expect(r.prorationCut).toBe(399_800 - 167_580);
    expect(r.reduction).toBe(0);
  });

  it("1~6월 등록: 제1기분만 일할, 제2기분은 정기", () => {
    // 2026-03-20 등록: 3/20~6/30 = 103일, 399,800 × 103/365 = 112,820.3 → 112,820
    const r = computeCarTax(reg(1999, 3, 20));
    expect(r.halves[0]).toMatchObject({ age: 1, days: 103, carTax: 112_820, eduTax: 33_840, total: 146_660 });
    expect(r.halves[1]).toMatchObject({ days: 184, total: 259_870 });
    expect(r.total).toBe(406_530);
    expect(r.ownedDays).toBe(287);
  });

  it("기분 첫날 등록은 일할 없이 그 기분 전체", () => {
    expect(computeCarTax(reg(1999, 1, 1)).total).toBe(519_740);
    const jul1 = computeCarTax(reg(1999, 7, 1));
    expect(jul1.halves[0].total).toBe(0);
    expect(jul1.halves[1].total).toBe(259_870);
  });

  it("등록일은 그 달 말일로 맞춘다", () => {
    expect(computeCarTax(reg(1999, 2, 31)).halves[0].days).toBe(181 - 58); // 2/28~6/30
  });

  it("연납: 등록 전에 끝난 신청 기간은 해당 없음", () => {
    const aug = computeCarTax(reg(1999, 8, 1));
    for (const m of [1, 3, 6] as const) {
      expect(prepay(aug, m)).toMatchObject({ available: false, unavailableReason: "notRegistered" });
    }
    const sep = prepay(aug, 9);
    expect(sep.available).toBe(true);
    expect(sep.deduction).toBe(6_490); // 하반기 259,870 × 92/184 × 5%: 10/1~12/31 전부 보유
    expect(sep.payInMonth).toBe(217_850 - 6_490);
    expect(prepay(computeCarTax(reg(1999, 10, 5)), 9).unavailableReason).toBe("notRegistered");

    const mar = computeCarTax(reg(1999, 3, 20));
    expect(prepay(mar, 1).available).toBe(false);
    const p3 = prepay(mar, 3);
    expect(p3.deduction).toBe(19_570); // 4/1~12/31 전부 보유 → 1년 보유 차와 같은 공제
    expect(p3.annualPay).toBe(406_530 - 19_570);
  });

  it("경차: 상반기 등록이면 6월 일괄, 하반기 등록이면 12월분만", () => {
    const mar = computeCarTax(reg(998, 3, 20));
    expect(mar.lumpSum).toBe(true);
    expect(mar.halves[0].carTax).toBe(22_530); // 79,840 × 103/365 = 22,530.2
    const aug = computeCarTax(reg(998, 8, 1));
    expect(aug.lumpSum).toBe(false);
    expect(aug.june).toBe(0);
    expect(aug.december).toBe(aug.halves[1].total);
  });

  it("작년 이전 등록 차와 전기·영업용은 일할하지 않는다", () => {
    const r = computeCarTax({ ...reg(1999, 8, 1), regYear: 2025 });
    expect(r.partialYear).toBe(false);
    expect(r.ownedFrom).toBeNull();
    expect(computeCarTax({ ...reg(1999, 8, 1), kind: "electric" }).total).toBe(130_000);
  });

  it("validates the day only for this year's registrations", () => {
    expect(validateInput(reg(1999, 8, 0))).not.toBeNull();
    expect(validateInput(reg(1999, 2, 30))).not.toBeNull();
    expect(validateInput({ ...reg(1999, 2, 30), regYear: 2020 })).toBeNull();
    expect(validateInput(reg(1999, 8, 31))).toBeNull();
  });
});
