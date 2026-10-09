import { describe, expect, it } from "vitest";
import { employeeInsurance } from "@/lib/rates/insurance";
import { monthlyWithholding } from "@/lib/rates/withholding";
import {
  birthTaxCredit,
  calcYearEndTax,
  cardDeduction,
  childTaxCredit,
  donationCredit,
  earnedIncomeDeduction,
  earnedTaxCredit,
  earnedTaxCreditLimit,
  estimateAnnualInsurance,
  estimatePrepaidTax,
  hometownCredit,
  housingSubscriptionDeduction,
  insuranceCredit,
  marginalRate,
  medicalCredit,
  pensionAccountCredit,
  personalDeduction,
  rentCredit,
  settlementSeason,
  trunc10,
  type YearEndTaxInput,
} from "./year-end-tax";

// Every expected value below is worked out by hand from the statute text (소득세법 §47, §50~§59의4,
// 조특법 §58, §87, §92, §95의2, §126의2 as in force for the 2026 과세기간). No NTS worked example for
// 2026 귀속 exists yet (the 2026 귀속 신고안내 is published in January 2027).

describe("근로소득공제 (소득세법 §47)", () => {
  it("applies each bracket and the 2,000만원 cap", () => {
    expect(earnedIncomeDeduction(4_000_000)).toBe(2_800_000); // 70%
    expect(earnedIncomeDeduction(12_000_000)).toBe(6_300_000); // 350만 + 700만×40%
    expect(earnedIncomeDeduction(40_000_000)).toBe(11_250_000); // 750만 + 2,500만×15%
    expect(earnedIncomeDeduction(50_000_000)).toBe(12_250_000); // 1,200만 + 500만×5%
    expect(earnedIncomeDeduction(150_000_000)).toBe(15_750_000); // 1,475만 + 5,000만×2%
    expect(earnedIncomeDeduction(400_000_000)).toBe(20_000_000); // 한도
  });
});

describe("근로소득세액공제 (소득세법 §59)", () => {
  it("uses 55% up to 130만원 and 71.5만 + 30% above", () => {
    expect(earnedTaxCredit(1_000_000, 30_000_000).raw).toBe(550_000);
    expect(earnedTaxCredit(1_300_000, 30_000_000).raw).toBe(715_000);
    expect(earnedTaxCredit(2_300_000, 30_000_000).raw).toBe(1_015_000);
  });
  it("limits by 총급여", () => {
    expect(earnedTaxCreditLimit(33_000_000)).toBe(740_000);
    expect(earnedTaxCreditLimit(40_000_000)).toBe(684_000); // 74만 − 700만×0.8%
    expect(earnedTaxCreditLimit(50_000_000)).toBe(660_000); // 60.4만 → 최저 66만
    expect(earnedTaxCreditLimit(70_000_000)).toBe(660_000);
    expect(earnedTaxCreditLimit(70_200_000)).toBe(560_000); // 66만 − 20만×1/2
    expect(earnedTaxCreditLimit(80_000_000)).toBe(500_000);
    expect(earnedTaxCreditLimit(120_000_000)).toBe(500_000);
    expect(earnedTaxCreditLimit(120_400_000)).toBe(300_000); // 50만 − 40만×1/2
    expect(earnedTaxCreditLimit(200_000_000)).toBe(200_000);
  });
});

describe("인적공제 (§50, §51)", () => {
  it("adds 기본 150만, 경로 100만, 장애인 200만 and 부녀자/한부모", () => {
    expect(personalDeduction(4, 1, 1, "n", 40_000_000).total).toBe(6_000_000 + 1_000_000 + 2_000_000);
    expect(personalDeduction(2, 0, 0, "s", 40_000_000).extra).toBe(1_000_000);
    expect(personalDeduction(2, 0, 0, "w", 30_000_000).extra).toBe(500_000);
    // 부녀자공제는 종합소득금액 3천만원 이하만
    expect(personalDeduction(2, 0, 0, "w", 30_000_001).extra).toBe(0);
    // 추가공제 인원은 기본공제 인원을 넘지 않는다
    expect(personalDeduction(1, 3, 0, "n", 0).senior).toBe(1_000_000);
  });
});

describe("신용카드 등 소득공제 (조특법 §126의2, 2026년 사용분)", () => {
  it("is zero until spending passes 25% of 총급여", () => {
    const r = cardDeduction(40_000_000, { credit: 10_000_000 });
    expect(r.threshold).toBe(10_000_000);
    expect(r.total).toBe(0);
  });
  it("fills the threshold with 신용카드 first", () => {
    // 5천만: 최저 1,250만 × 15% = 187.5만 차감, 2,000만×15% + 500만×30% = 450만 → 262.5만
    const r = cardDeduction(50_000_000, { credit: 20_000_000, debit: 5_000_000 });
    expect(r.deductible).toBe(2_625_000);
    expect(r.total).toBe(2_625_000);
  });
  it("moves into the 30% tier when 신용카드 is below the threshold", () => {
    // 최저 1,000만: 신용 500만×15% + 500만×30% = 225만 차감. 합계 75 + 150 (체크+문화 500만×30%) + 120 (300만×40%) = 345만
    const r = cardDeduction(40_000_000, { credit: 5_000_000, debit: 4_000_000, culture: 1_000_000, market: 2_000_000, transit: 1_000_000 });
    expect(r.deductible).toBe(1_200_000);
  });
  it("moves into the 40% tier last", () => {
    // 최저 1,000만: 30 + 90 + 500만×40% = 320만 차감, 합계 30 + 90 + 320 = 440만 → 120만
    const r = cardDeduction(40_000_000, { credit: 2_000_000, debit: 3_000_000, market: 8_000_000 });
    expect(r.deductible).toBe(1_200_000);
  });
  it("raises the base limit by 50만원 per child (max 2) for 총급여 7천만원 이하", () => {
    expect(cardDeduction(60_000_000, {}, 0).baseLimit).toBe(3_000_000);
    expect(cardDeduction(60_000_000, {}, 1).baseLimit).toBe(3_500_000);
    expect(cardDeduction(60_000_000, {}, 3).baseLimit).toBe(4_000_000);
    expect(cardDeduction(80_000_000, {}, 1).baseLimit).toBe(2_750_000);
    expect(cardDeduction(80_000_000, {}, 2).baseLimit).toBe(3_000_000);
  });
  it("adds 전통시장·대중교통 over the base limit", () => {
    // 6천만, 자녀 2: 최저 1,500만. 375 + 240 + 60 = 675만 − 225만 = 450만. 기본한도 400만, 추가 50만 (전통시장·대중교통 60만 이내)
    const r = cardDeduction(60_000_000, { credit: 25_000_000, debit: 8_000_000, market: 1_000_000, transit: 500_000 }, 2);
    expect(r.deductible).toBe(4_500_000);
    expect(r.basic).toBe(4_000_000);
    expect(r.extra).toBe(500_000);
    expect(r.total).toBe(4_500_000);
  });
  it("caps the extra amount for 총급여 7천만원 초과 and folds 문화체육 into 신용카드", () => {
    // 8천만: 문화 200만은 신용카드로. 최저 2,000만, (3,200만×15% + 100만×40%) − 300만 = 220만
    const a = cardDeduction(80_000_000, { credit: 30_000_000, culture: 2_000_000, transit: 1_000_000 }, 1);
    expect(a.cultureSeparate).toBe(false);
    expect(a.deductible).toBe(2_200_000);
    expect(a.total).toBe(2_200_000);
    // 큰 사용액: 공제 가능 720만, 기본 300만 (자녀 2), 추가는 대중교통 120만
    const b = cardDeduction(80_000_000, { credit: 60_000_000, transit: 3_000_000 }, 2);
    expect(b.deductible).toBe(7_200_000);
    expect(b.basic).toBe(3_000_000);
    expect(b.extra).toBe(1_200_000);
    expect(b.extraLimit).toBe(2_000_000);
  });
  it("above 7천만원 문화체육 follows the payment method (§126의2②): debit-paid culture belongs in `debit`", () => {
    // 8천만: 최저 2,000만은 신용 2,500만에서 채운다. 문화 300만을 체크카드로 냈으면 300만 × 30% = 90만 더.
    const asDebit = cardDeduction(80_000_000, { credit: 25_000_000, debit: 3_000_000 });
    const asCulture = cardDeduction(80_000_000, { credit: 25_000_000, culture: 3_000_000 });
    expect(asDebit.total).toBe(1_650_000); // 75만 + 90만
    expect(asCulture.total).toBe(1_200_000); // culture 칸은 신용카드 15%로 계산
  });
});

describe("주택청약 (조특법 §87②)", () => {
  it("needs 무주택 세대주 and 총급여 7천만원 이하, 300만원 × 40%", () => {
    expect(housingSubscriptionDeduction(50_000_000, 3_000_000, true)).toBe(1_200_000);
    expect(housingSubscriptionDeduction(50_000_000, 5_000_000, true)).toBe(1_200_000);
    expect(housingSubscriptionDeduction(50_000_000, 3_000_000, false)).toBe(0);
    expect(housingSubscriptionDeduction(70_000_001, 3_000_000, true)).toBe(0);
  });
});

describe("세액공제", () => {
  it("자녀세액공제 25만 / 55만 / +40만 (§59의2①)", () => {
    expect([0, 1, 2, 3, 4].map(childTaxCredit)).toEqual([0, 250_000, 550_000, 950_000, 1_350_000]);
  });
  it("출산·입양 30만 / 50만 / 70만 (§59의2③)", () => {
    expect([0, 1, 2, 3].map(birthTaxCredit)).toEqual([0, 300_000, 500_000, 700_000]);
  });
  it("연금계좌 600만/900만 한도, 5,500만원 기준 15%·12% (§59의3)", () => {
    expect(pensionAccountCredit(55_000_000, 6_000_000, 3_000_000)).toEqual({ eligible: 9_000_000, rate: 15, credit: 1_350_000 });
    expect(pensionAccountCredit(55_000_001, 8_000_000, 0)).toEqual({ eligible: 6_000_000, rate: 12, credit: 720_000 });
    expect(pensionAccountCredit(40_000_000, 0, 12_000_000).eligible).toBe(9_000_000);
  });
  it("보장성 보험료 100만원 × 12%", () => {
    expect(insuranceCredit(800_000)).toBe(96_000);
    expect(insuranceCredit(2_000_000)).toBe(120_000);
  });
  it("의료비 총급여 3% 초과분 15%, 그 밖의 가족 700만원 한도", () => {
    expect(medicalCredit(40_000_000, 500_000, 3_000_000)).toEqual({ threshold: 1_200_000, eligible: 2_300_000, credit: 345_000 });
    expect(medicalCredit(40_000_000, 0, 10_000_000).credit).toBe(1_050_000);
    // 미달분은 본인 의료비에서 뺀다
    expect(medicalCredit(60_000_000, 2_500_000, 0)).toEqual({ threshold: 1_800_000, eligible: 700_000, credit: 105_000 });
    expect(medicalCredit(60_000_000, 1_000_000, 0).credit).toBe(0);
  });
  it("기부금 한도와 15%/30% (§59의4④, §34)", () => {
    // 종교단체만: 소득금액 3,000만 × 10% = 300만 한도
    expect(donationCredit(30_000_000, 0, 5_000_000)).toEqual({ eligible: 3_000_000, limit: 3_000_000, credit: 450_000 });
    // 일반기부금 1,500만: 1천만×15% + 500만×30%
    expect(donationCredit(100_000_000, 15_000_000, 0).credit).toBe(3_000_000);
  });
  it("고향사랑기부금 10만 이하 100/110, 20만까지 40%, 그 위 15% (조특법 §58, 2026~)", () => {
    expect(hometownCredit(50_000)).toBe(45_454);
    expect(hometownCredit(100_000)).toBe(90_909);
    expect(hometownCredit(200_000)).toBe(130_909);
    expect(hometownCredit(500_000)).toBe(175_909);
  });
  it("월세 17% (5,500만원 이하) / 15% (8천만원 이하), 1,000만원 한도", () => {
    expect(rentCredit(55_000_000, 6_000_000, true)).toEqual({ rate: 17, credit: 1_020_000 });
    expect(rentCredit(60_000_000, 12_000_000, true)).toEqual({ rate: 15, credit: 1_500_000 });
    expect(rentCredit(80_000_001, 6_000_000, true).credit).toBe(0);
    expect(rentCredit(40_000_000, 6_000_000, false).credit).toBe(0);
  });
  it("marginal rate follows 기본세율 brackets", () => {
    expect(marginalRate(14_000_000)).toBe(6);
    expect(marginalRate(28_975_000)).toBe(15);
    expect(marginalRate(123_450_000)).toBe(35);
  });
});

const BASE: YearEndTaxInput = { totalPay: 0, family: 1, pension: 0, healthEmployment: 0, prepaidIncomeTax: 0 };

describe("calcYearEndTax — full vectors", () => {
  it("총급여 5천만원, 1인, 카드 2,500만원 → 46만 8,870원 추가 납부", () => {
    const r = calcYearEndTax({
      ...BASE,
      totalPay: 50_000_000,
      pension: 2_250_000,
      healthEmployment: 2_400_000,
      cards: { credit: 20_000_000, debit: 5_000_000 },
      prepaidIncomeTax: 2_000_000,
    })!;
    expect(r.earnedIncome).toBe(37_750_000);
    expect(r.card.total).toBe(2_625_000);
    expect(r.chosen.standard).toBe(false);
    expect(r.chosen.incomeDeductions).toBe(8_775_000);
    expect(r.chosen.taxBase).toBe(28_975_000);
    expect(r.chosen.calculatedTax).toBe(3_086_250); // 2,897.5만 × 15% − 126만
    expect(r.chosen.credits.earned).toBe(660_000);
    expect(r.chosen.determinedTax).toBe(2_426_250);
    expect(r.alternative.determinedTax).toBe(2_656_250); // 표준세액공제 방식이 더 불리
    expect(r.determinedLocalTax).toBe(242_625);
    expect(r.prepaidLocalTax).toBe(200_000);
    expect(r.settleIncomeTax).toBe(426_250);
    expect(r.settleLocalTax).toBe(42_620); // 10원 미만 절사
    expect(r.settleTotal).toBe(468_870);
  });

  it("총급여 6천만원, 4인 가족·자녀 2명, 공제 항목 여럿 → 292만 6,990원 환급", () => {
    const r = calcYearEndTax({
      ...BASE,
      totalPay: 60_000_000,
      family: 4,
      children: 2,
      creditChildren: 2,
      pension: 2_850_000,
      healthEmployment: 2_600_000,
      cards: { credit: 25_000_000, debit: 8_000_000, market: 1_000_000, transit: 500_000 },
      pensionSavings: 6_000_000,
      irp: 3_000_000,
      insurancePremium: 1_200_000,
      medicalSelf: 2_500_000,
      education: 3_000_000,
      hometownDonation: 200_000,
      prepaidIncomeTax: 3_000_000,
    })!;
    expect(r.earnedIncome).toBe(47_250_000);
    expect(r.card.total).toBe(4_500_000);
    expect(r.chosen.taxBase).toBe(31_300_000);
    expect(r.chosen.calculatedTax).toBe(3_435_000);
    expect(r.chosen.credits).toEqual({
      earned: 660_000,
      child: 550_000,
      birth: 0,
      marriage: 0,
      pension: 1_080_000,
      insurance: 120_000,
      medical: 105_000,
      education: 450_000,
      donation: 0,
      hometown: 130_909,
      rent: 0,
      standard: 0,
    });
    expect(r.chosen.determinedTax).toBe(339_091);
    expect(r.determinedLocalTax).toBe(33_909);
    expect(r.settleIncomeTax).toBe(-2_660_900);
    expect(r.settleLocalTax).toBe(-266_090);
    expect(r.settleTotal).toBe(-2_926_990);
  });

  it("low income: 표준세액공제가 유리하면 고르고 결정세액은 0원", () => {
    // 1,200만: 항목별이면 과세표준 311만 → 산출 18.66만 − 근로 10.263만 = 83,970원.
    // 표준이면 과세표준 363만 → 21.78만 − 11.979만 − 13만 → 0원.
    const r = calcYearEndTax({ ...BASE, totalPay: 12_000_000, pension: 570_000, healthEmployment: 520_000 })!;
    expect(r.alternative.determinedTax).toBe(83_970);
    expect(r.chosen.standard).toBe(true);
    expect(r.chosen.determinedTax).toBe(0);
    expect(r.chosen.creditsUnused).toBeGreaterThan(0);
    expect(r.settleTotal).toBe(0);
  });

  it("refunds everything withheld when 결정세액 is 0", () => {
    const r = calcYearEndTax({ ...BASE, totalPay: 10_000_000, prepaidIncomeTax: 50_000 })!;
    expect(r.chosen.determinedTax).toBe(0);
    expect(r.settleIncomeTax).toBe(-50_000);
    expect(r.settleLocalTax).toBe(-5_000);
    expect(r.settleTotal).toBe(-55_000);
  });

  it("high income: 35% 구간, 근로소득세액공제 최저 20만원", () => {
    const r = calcYearEndTax({ ...BASE, totalPay: 150_000_000, pension: 3_800_000, healthEmployment: 5_500_000 })!;
    expect(r.earnedIncome).toBe(134_250_000);
    expect(r.chosen.taxBase).toBe(123_450_000);
    expect(r.chosen.marginalRate).toBe(35);
    expect(r.chosen.calculatedTax).toBe(27_767_500);
    expect(r.chosen.credits.earned).toBe(200_000);
    expect(r.chosen.determinedTax).toBe(27_567_500);
    expect(r.determinedLocalTax).toBe(2_756_750);
  });

  it("marriage, birth and 월세 credits; income deductions never exceed 근로소득금액", () => {
    const r = calcYearEndTax({
      ...BASE,
      totalPay: 30_000_000,
      family: 3,
      children: 1,
      birthOrder: 1,
      married: true,
      homelessHead: true,
      rent: 6_000_000,
      pension: 1_425_000,
      healthEmployment: 1_490_000,
    })!;
    // 근로소득공제 750만 + 1,500만×15% = 975만 → 근로소득금액 2,025만
    expect(r.earnedIncome).toBe(20_250_000);
    expect(r.chosen.credits.birth).toBe(300_000);
    expect(r.chosen.credits.marriage).toBe(500_000);
    expect(r.chosen.credits.rent).toBe(1_020_000);
    expect(r.chosen.determinedTax).toBe(0);
    // 세대원도 세대주가 주택 관련 공제를 받지 않으면 월세 세액공제 대상 (조특법 §95의2①), 주택청약은 아님
    const member = calcYearEndTax({
      ...BASE,
      totalPay: 40_000_000,
      homelessMember: true,
      rent: 6_000_000,
      housingSubscription: 3_000_000,
      pension: 1_800_000,
      healthEmployment: 1_600_000,
    })!;
    expect(member.rentEligible).toBe(true);
    expect(member.rentRate).toBe(17);
    expect(member.chosen.credits.rent).toBe(1_020_000);
    expect(member.housing).toBe(0);
    const tiny = calcYearEndTax({ ...BASE, totalPay: 3_000_000, family: 5, pension: 1_000_000 })!;
    expect(tiny.chosen.incomeDeductions).toBe(tiny.earnedIncome);
    expect(tiny.chosen.taxBase).toBe(0);
  });

  it("returns null without a positive 총급여", () => {
    expect(calcYearEndTax({ ...BASE, totalPay: 0 })).toBeNull();
    expect(calcYearEndTax({ ...BASE, totalPay: Number.NaN })).toBeNull();
  });

  it("truncates settlements toward zero", () => {
    expect(trunc10(-123_456)).toBe(-123_450);
    expect(trunc10(123_456)).toBe(123_450);
    expect(Object.is(trunc10(-5), 0)).toBe(true);
  });
});

describe("기본값 추정", () => {
  it("sums 12 months of 2026 근로자 4대보험", () => {
    const r = estimateAnnualInsurance(36_000_000);
    // 월 300만: 국민연금 142,500 / 건강 107,850 / 장기요양 14,170 / 고용 27,000
    expect(r.pension).toBe(1_710_000);
    expect(r.health).toBe(1_294_200);
    expect(r.longTermCare).toBe(170_040);
    expect(r.employment).toBe(324_000);
    expect(r.healthEmployment).toBe(1_788_240);
    // 국민연금 상한은 7월분부터 659만원
    const high = estimateAnnualInsurance(120_000_000);
    expect(high.pension).toBe(6 * employeeInsurance(10_000_000, "2026-01").pension + 6 * employeeInsurance(10_000_000, "2026-07").pension);
  });
  it("sums 간이세액표 withholding with the 자녀 공제 switch in March", () => {
    expect(estimatePrepaidTax(36_000_000, 1, 0).incomeTax).toBe(12 * monthlyWithholding(3_000_000, 1).incomeTax);
    const kids = estimatePrepaidTax(60_000_000, 3, 1);
    const jan = monthlyWithholding(5_000_000, 3, 1, 100, "2026-01");
    const mar = monthlyWithholding(5_000_000, 3, 1, 100, "2026-03");
    expect(jan.incomeTax).toBeGreaterThan(mar.incomeTax);
    expect(kids.incomeTax).toBe(2 * jan.incomeTax + 10 * mar.incomeTax);
    expect(kids.localTax).toBe(2 * jan.localTax + 10 * mar.localTax);
    expect(estimatePrepaidTax(60_000_000, 3, 1, 120).incomeTax).toBeGreaterThan(kids.incomeTax);
  });
});

describe("settlementSeason", () => {
  it("follows the 2026 귀속 calendar", () => {
    expect(settlementSeason({ y: 2026, m: 10, d: 9 })).toBe("early");
    expect(settlementSeason({ y: 2026, m: 11, d: 20 })).toBe("preview");
    expect(settlementSeason({ y: 2027, m: 1, d: 15 })).toBe("filing");
    expect(settlementSeason({ y: 2027, m: 5, d: 1 })).toBe("may");
    expect(settlementSeason({ y: 2027, m: 7, d: 1 })).toBe("late");
  });
});
