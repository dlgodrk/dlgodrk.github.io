import { describe, expect, it } from "vitest";
import { ymd } from "@/lib/date";
import {
  calcMaternity,
  calcParentalLeave,
  calcSpouseLeave,
  dailyOrdinaryWage,
  GENERAL_MAX_SIX_MONTHS,
  GENERAL_MAX_YEAR,
  generalRule,
  maternityCap,
  maternityFloor,
  monthEnd,
  monthlyBenefit,
  monthPeriods,
  SIX_SIX_MAX_SIX_MONTHS,
  sixSixRule,
  spouseLeaveCap,
} from "./parental-leave";

const amounts = (r: ReturnType<typeof calcParentalLeave>) => r!.rows.map((x) => x.amount);

describe("육아휴직 급여 — 일반 기준 (시행령 제95조)", () => {
  it("월 상한 250·200·160만원과 지급률 100·100·80%", () => {
    expect(generalRule(1)).toMatchObject({ ratePct: 100, cap: 2_500_000 });
    expect(generalRule(3)).toMatchObject({ ratePct: 100, cap: 2_500_000 });
    expect(generalRule(4)).toMatchObject({ ratePct: 100, cap: 2_000_000 });
    expect(generalRule(6)).toMatchObject({ ratePct: 100, cap: 2_000_000 });
    expect(generalRule(7)).toMatchObject({ ratePct: 80, cap: 1_600_000 });
    expect(generalRule(18)).toMatchObject({ ratePct: 80, cap: 1_600_000 });
  });

  it("통상임금 300만원, 12개월 → 2,310만원 (고용노동부 '1년 최대 2,310만원')", () => {
    const r = calcParentalLeave({ wage: 3_000_000, months: 12, household: "alone" })!;
    // 250×3 + 200×3 + min(240, 160)×6 = 750 + 600 + 960
    expect(r.total).toBe(23_100_000);
    expect(r.total).toBe(GENERAL_MAX_YEAR);
    expect(r.rows[0]).toMatchObject({ capped: true, amount: 2_500_000 });
    expect(r.rows[6]).toMatchObject({ raw: 2_400_000, amount: 1_600_000, capped: true });
    expect(r.average).toBe(1_925_000);
    expect(r.extended).toBe(false);
  });

  it("통상임금 200만원, 12개월 → 2,160만원", () => {
    // 200×6 + 160×6 (80% = 160만원 = 상한과 같음, 상한 적용 아님)
    const r = calcParentalLeave({ wage: 2_000_000, months: 12, household: "alone" })!;
    expect(r.total).toBe(21_600_000);
    expect(r.rows[6]).toMatchObject({ amount: 1_600_000, capped: false });
  });

  it("통상임금 150만원, 12개월 → 1,620만원", () => {
    const r = calcParentalLeave({ wage: 1_500_000, months: 12, household: "alone" })!;
    expect(r.total).toBe(1_500_000 * 6 + 1_200_000 * 6);
  });

  it("하한 70만원: 통상임금 80만원이면 7개월째부터 64만원 → 70만원", () => {
    const r = calcParentalLeave({ wage: 800_000, months: 12, household: "alone" })!;
    expect(r.rows[6]).toMatchObject({ raw: 640_000, amount: 700_000, floored: true });
    expect(r.total).toBe(800_000 * 6 + 700_000 * 6);
  });

  it("통상임금이 70만원보다 적어도 하한 70만원", () => {
    expect(monthlyBenefit(600_000, generalRule(1))).toEqual({ raw: 600_000, amount: 700_000, capped: false, floored: true });
  });

  it("80%는 원 미만 절사", () => {
    expect(monthlyBenefit(1_234_567, generalRule(7)).raw).toBe(987_653);
  });

  it("1년 넘게 쓰면 요건 확인 표시: 혼자 쓰면 요건 미충족, 부모 각각 3개월 이상이면 충족", () => {
    const alone = calcParentalLeave({ wage: 3_000_000, months: 18, household: "alone" })!;
    expect(alone.extended).toBe(true);
    expect(alone.extensionOk).toBe(false);
    // 13~18개월도 80%·160만원
    expect(alone.total).toBe(GENERAL_MAX_YEAR + 1_600_000 * 6);
    const both = calcParentalLeave({ wage: 3_000_000, months: 18, household: "both", spouseMonths: 3, withinEighteen: false })!;
    expect(both.extensionOk).toBe(true);
    expect(calcParentalLeave({ wage: 3_000_000, months: 18, household: "both", spouseMonths: 2 })!.extensionOk).toBe(false);
  });

  it("잘못된 통상임금은 null", () => {
    expect(calcParentalLeave({ wage: NaN, months: 12, household: "alone" })).toBeNull();
    expect(calcParentalLeave({ wage: 0, months: 12, household: "alone" })).toBeNull();
  });
});

describe("한부모 특례 (시행령 제95조의3③)", () => {
  it("통상임금 400만원, 18개월 → 300×3 + 200×3 + 160×12 = 3,420만원", () => {
    const r = calcParentalLeave({ wage: 4_000_000, months: 18, household: "single" })!;
    expect(amounts(r).slice(0, 7)).toEqual([3_000_000, 3_000_000, 3_000_000, 2_000_000, 2_000_000, 2_000_000, 1_600_000]);
    expect(r.total).toBe(34_200_000);
    expect(r.extensionOk).toBe(true);
    expect(r.sixSixMonths).toBe(0);
  });
});

describe("6+6 부모육아휴직제 (시행령 제95조의3①)", () => {
  it("상향 상한 250·250·300·350·400·450만원, 6개월 합계 2,000만원 vs 일반 1,350만원", () => {
    expect([1, 2, 3, 4, 5, 6].map((k) => sixSixRule(k, 6).cap)).toEqual([
      2_500_000, 2_500_000, 3_000_000, 3_500_000, 4_000_000, 4_500_000,
    ]);
    expect(SIX_SIX_MAX_SIX_MONTHS).toBe(20_000_000);
    expect(GENERAL_MAX_SIX_MONTHS).toBe(13_500_000);
  });

  it("통상임금 500만원, 부모 모두 6개월 → 2,000만원 (650만원 더)", () => {
    const r = calcParentalLeave({
      wage: 5_000_000,
      months: 6,
      household: "both",
      spouseMonths: 6,
      withinEighteen: true,
      order: "second",
    })!;
    expect(r.total).toBe(20_000_000);
    expect(r.baselineTotal).toBe(13_500_000);
    expect(r.sixSixGain).toBe(6_500_000);
    expect(r.paidLater).toBe(0);
  });

  it("통상임금 300만원이면 3개월째부터 통상임금이 상한보다 낮아 300만원씩 → 1,700만원", () => {
    const r = calcParentalLeave({ wage: 3_000_000, months: 6, household: "both", spouseMonths: 6, withinEighteen: true })!;
    expect(amounts(r)).toEqual([2_500_000, 2_500_000, 3_000_000, 3_000_000, 3_000_000, 3_000_000]);
    expect(r.total).toBe(17_000_000);
    expect(r.sixSixGain).toBe(3_500_000);
  });

  it("부모 각각 12개월, 통상임금 500만원 → 1인 2,960만원 (6+6 2,000 + 160×6)", () => {
    const r = calcParentalLeave({ wage: 5_000_000, months: 12, household: "both", spouseMonths: 12, withinEighteen: true })!;
    expect(r.total).toBe(29_600_000);
  });

  it("공통 사용 기간만큼만 상향: 나 12개월·배우자 3개월이면 3개월만 6+6", () => {
    const r = calcParentalLeave({ wage: 5_000_000, months: 12, household: "both", spouseMonths: 3, withinEighteen: true })!;
    expect(r.sixSixMonths).toBe(3);
    expect(amounts(r).slice(0, 6)).toEqual([2_500_000, 2_500_000, 3_000_000, 2_000_000, 2_000_000, 2_000_000]);
    // 250+250+300 + 200×3 + 160×6
    expect(r.total).toBe(23_600_000);
    expect(r.sixSixGain).toBe(500_000);
  });

  it("내가 먼저 쉬면 휴직 중엔 일반 기준, 차액은 배우자 휴직 후 추가 지급", () => {
    const r = calcParentalLeave({
      wage: 5_000_000,
      months: 6,
      household: "both",
      spouseMonths: 6,
      withinEighteen: true,
      order: "first",
    })!;
    expect(r.paidDuring).toBe(13_500_000);
    expect(r.paidLater).toBe(6_500_000);
    expect(r.total).toBe(20_000_000);
    expect(r.rows[5]).toMatchObject({ during: 2_000_000, later: 2_500_000 });
  });

  it("생후 18개월이 지나면 6+6 없이 일반 기준", () => {
    const r = calcParentalLeave({ wage: 5_000_000, months: 6, household: "both", spouseMonths: 6, withinEighteen: false })!;
    expect(r.sixSixMonths).toBe(0);
    expect(r.total).toBe(13_500_000);
  });
});

describe("회차별 기간 (민법 제160조)", () => {
  it("1일 시작이면 달력 월과 같음", () => {
    expect(monthEnd(ymd(2026, 11, 1), 1)).toEqual(ymd(2026, 11, 30));
    expect(monthEnd(ymd(2026, 11, 1), 4)).toEqual(ymd(2027, 2, 28));
  });
  it("중간 시작이면 해당일 전날까지", () => {
    expect(monthEnd(ymd(2026, 10, 9), 1)).toEqual(ymd(2026, 11, 8));
  });
  it("마지막 달에 해당일이 없으면 그 달 말일", () => {
    expect(monthEnd(ymd(2026, 1, 31), 1)).toEqual(ymd(2026, 2, 28));
    const p = monthPeriods(ymd(2026, 1, 31), 3);
    expect(p[1]).toEqual({ from: ymd(2026, 3, 1), to: ymd(2026, 3, 30) });
    expect(p[2]).toEqual({ from: ymd(2026, 3, 31), to: ymd(2026, 4, 30) });
  });
  it("calcParentalLeave fills periods when a start date is given", () => {
    const r = calcParentalLeave({ wage: 3_000_000, months: 12, household: "alone", start: ymd(2026, 11, 1) })!;
    expect(r.rows[11].to).toEqual(ymd(2027, 10, 31));
  });
});

describe("출산전후휴가 급여", () => {
  it("상한: 2025년 210만원, 2026년 220만원, 2027년은 최저임금 월 환산액 2,236,300원으로 예상", () => {
    expect(maternityCap(ymd(2025, 12, 31))).toMatchObject({ cap: 2_100_000, estimated: false });
    expect(maternityCap(ymd(2026, 1, 1))).toMatchObject({ cap: 2_200_000, estimated: false });
    expect(maternityCap(ymd(2027, 1, 1))).toMatchObject({ cap: 2_236_300, estimated: true });
    expect(maternityFloor(ymd(2026, 5, 1))).toBe(2_156_880);
  });

  it("우선지원대상기업, 통상임금 300만원, 90일 → 고용보험 660만원 + 회사 160만원", () => {
    const r = calcMaternity({ wage: 3_000_000, birth: "single", size: "priority", start: ymd(2026, 11, 1) })!;
    expect(r.insurance).toBe(6_600_000);
    expect(r.employer).toBe(1_600_000);
    expect(r.total).toBe(8_200_000);
    expect(r.capApplied).toBe(true);
    expect(r.end).toEqual(ymd(2027, 1, 29));
  });

  it("대규모기업, 통상임금 300만원 → 회사 60일 600만원 + 고용보험 30일 220만원", () => {
    const r = calcMaternity({ wage: 3_000_000, birth: "single", size: "large", start: ymd(2026, 11, 1) })!;
    expect(r.employer).toBe(6_000_000);
    expect(r.insurance).toBe(2_200_000);
    expect(r.insuredDays).toBe(30);
    expect(r.total).toBe(8_200_000);
  });

  it("다태아 120일: 회사 유급 75일, 대규모기업은 고용보험 45일", () => {
    const pr = calcMaternity({ wage: 3_000_000, birth: "multiple", size: "priority", start: ymd(2026, 3, 1) })!;
    expect(pr.segments.map((s) => [s.fromDay, s.toDay])).toEqual([
      [1, 30],
      [31, 60],
      [61, 75],
      [76, 90],
      [91, 120],
    ]);
    expect(pr.insurance).toBe(8_800_000);
    expect(pr.employer).toBe(2_000_000);
    const lg = calcMaternity({ wage: 3_000_000, birth: "multiple", size: "large", start: ymd(2026, 3, 1) })!;
    expect(lg.employer).toBe(7_500_000);
    expect(lg.insurance).toBe(3_300_000);
    expect(lg.total).toBe(pr.total);
  });

  it("미숙아 100일: 대규모기업은 고용보험 40일", () => {
    const r = calcMaternity({ wage: 3_000_000, birth: "premature", size: "large", start: ymd(2026, 3, 1) })!;
    expect(r.insuredDays).toBe(40);
    // 220만원 + 220만원 × 10/30
    expect(r.insurance).toBe(2_200_000 + 733_333);
  });

  it("통상임금이 최저임금보다 낮으면 최저임금 월 환산액(2,156,880원)으로", () => {
    const r = calcMaternity({ wage: 2_000_000, birth: "single", size: "priority", start: ymd(2026, 6, 1) })!;
    expect(r.floorApplied).toBe(true);
    expect(r.insuredMonthly).toBe(2_156_880);
    expect(r.insurance).toBe(2_156_880 * 3);
    expect(r.employer).toBe(0);
    const pt = calcMaternity({ wage: 1_200_000, birth: "single", size: "priority", start: ymd(2026, 6, 1), fullTime: false })!;
    expect(pt.insurance).toBe(3_600_000);
  });

  it("2025년 시작은 상한 210만원", () => {
    const r = calcMaternity({ wage: 3_000_000, birth: "single", size: "priority", start: ymd(2025, 6, 1) })!;
    expect(r.insurance).toBe(6_300_000);
  });
});

describe("배우자 출산휴가 급여", () => {
  it("상한 20일분: 2026년 1,684,210원, 2025년 1,607,650원 (고시 금액)", () => {
    expect(spouseLeaveCap(ymd(2026, 10, 1), 20).cap).toBe(1_684_210);
    expect(spouseLeaveCap(ymd(2025, 3, 1), 20).cap).toBe(1_607_650);
  });

  it("통상임금 300만원, 20일, 우선지원대상기업 → 2,296,650원 중 정부 1,684,210원", () => {
    expect(dailyOrdinaryWage(3_000_000)).toBe(114_832);
    const r = calcSpouseLeave({ wage: 3_000_000, days: 20, size: "priority", start: ymd(2026, 10, 9) })!;
    // 20일분은 일수까지 곱한 뒤 절사 (상한 고시액 1,684,210원과 같은 방식): 3,000,000 × 8 × 20 ÷ 209 = 2,296,650.7.
    // 절사한 일액 × 20(= 2,296,640원)과 10원 다르므로 화면에는 "하루 × 일수" 곱셈식을 보여 주지 않습니다.
    expect(r.total).toBe(2_296_650);
    expect(r.government).toBe(1_684_210);
    expect(r.employer).toBe(612_440);
    expect(r.capApplied).toBe(true);
  });

  it("대규모기업은 정부 지원 없이 회사가 20일 전부 유급", () => {
    const r = calcSpouseLeave({ wage: 3_000_000, days: 20, size: "large", start: ymd(2026, 10, 9) })!;
    expect(r.government).toBe(0);
    expect(r.employer).toBe(2_296_650);
  });

  it("통상임금 200만원이면 상한 아래라 전액 정부 지원", () => {
    const r = calcSpouseLeave({ wage: 2_000_000, days: 20, size: "priority", start: ymd(2026, 10, 9) })!;
    expect(r.total).toBe(1_531_100);
    expect(r.government).toBe(1_531_100);
    expect(r.employer).toBe(0);
  });
});
