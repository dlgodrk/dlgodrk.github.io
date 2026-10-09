import { describe, expect, it } from "vitest";
import {
  calcDeposit,
  comprehensiveTaxRatePct,
  DEPOSIT_PAGE_MANWON,
  depositAmountLabel,
  grossInterest,
  grossInterestByDays,
  institutionsNeeded,
  interestTax,
  isMutualTax,
  isValidInput,
  monthlyPayout,
  MUTUAL_EXEMPT_CAP,
  MUTUAL_OPEN_PERIODS,
  mutualTaxTypeByOpenYear,
  netInterestSimple,
  TABLE_MONTHS,
  TABLE_RATES,
  TAX_RULES,
} from "./deposit";

describe("deposit: 세전 이자", () => {
  it("단리 = 원금 × 연이율 × 개월/12", () => {
    // 1억, 연 3%, 12개월 → 3,000,000원 (흔히 인용되는 '1억 3% 이자 300만원')
    expect(grossInterest(100_000_000, 3, 12, "simple")).toBe(3_000_000);
    // 1천만원, 연 3.5%, 6개월 → 175,000원
    expect(grossInterest(10_000_000, 3.5, 6, "simple")).toBe(175_000);
    // 원 미만 절사: 12,345,678 × 2.75% × 5/12 = 141,460.89... → 141,460
    expect(grossInterest(12_345_678, 2.75, 5, "simple")).toBe(141_460);
  });

  it("월복리 = 원금 × ((1 + r/12)^n − 1)", () => {
    // 10,000,000 × (1.0025^12 − 1) = 304,159.57 → 304,159
    expect(grossInterest(10_000_000, 3, 12, "monthly")).toBe(304_159);
    // 1억, 4%, 24개월: 1e8 × ((1 + 0.04/12)^24 − 1) = 8,314,295.9 → 8,314,295
    expect(grossInterest(100_000_000, 4, 24, "monthly")).toBe(8_314_295);
  });

  it("월복리는 1개월이면 단리와 같다", () => {
    expect(grossInterest(50_000_000, 3.25, 1, "monthly")).toBe(grossInterest(50_000_000, 3.25, 1, "simple"));
  });

  it("returns 0 for empty or invalid inputs", () => {
    expect(grossInterest(0, 3, 12, "simple")).toBe(0);
    expect(grossInterest(NaN, 3, 12, "simple")).toBe(0);
    expect(grossInterest(1_000_000, 0, 12, "simple")).toBe(0);
  });
});

describe("deposit: 이자소득세 (10원 미만 절사, 국고금 관리법 제47조)", () => {
  it("일반과세 15.4% = 소득세 14% + 지방소득세(소득세의 10%)", () => {
    expect(interestTax(3_000_000, "general")).toEqual({ incomeTax: 420_000, localTax: 42_000, ruralTax: 0, total: 462_000 });
    // 1,234,567 × 14% = 172,839.38 → 172,830 / 172,830 × 10% = 17,283 → 17,280
    expect(interestTax(1_234_567, "general")).toEqual({ incomeTax: 172_830, localTax: 17_280, ruralTax: 0, total: 190_110 });
  });

  it("drops amounts under 10원 entirely", () => {
    // 50 × 14% = 7원 → 0원 (전액이 10원 미만이면 계산하지 않음)
    expect(interestTax(50, "general").total).toBe(0);
    // 100 × 14% = 14 → 10원, 지방소득세 1원 → 0원
    expect(interestTax(100, "general")).toEqual({ incomeTax: 10, localTax: 0, ruralTax: 0, total: 10 });
  });

  it("세금우대 9.5% = 소득세 9% + 농어촌특별세 0.5%", () => {
    expect(interestTax(300_000, "preferential")).toEqual({ incomeTax: 27_000, localTax: 0, ruralTax: 1_500, total: 28_500 });
    // 123,456 × 9% = 11,111.04 → 11,110 / × 0.5% = 617.28 → 610
    expect(interestTax(123_456, "preferential").total).toBe(11_720);
  });

  it("상호금융 예탁금 1.4% = 농어촌특별세만", () => {
    expect(interestTax(300_000, "mutual")).toEqual({ incomeTax: 0, localTax: 0, ruralTax: 4_200, total: 4_200 });
  });

  it("상호금융 저율과세 5.9% = 소득세 5% + 농어촌특별세 0.9%, 지방소득세 없음", () => {
    // 조세특례제한법 제89조의3①1호 (2026년 가입분 100분의 5, 개인지방소득세 부과하지 않음)
    // 농어촌특별세법 제5조①2호: 이자소득 감면세액(14% − 5% = 9%)의 10% = 0.9%
    expect(interestTax(1_000_000, "mutualLow")).toEqual({ incomeTax: 50_000, localTax: 0, ruralTax: 9_000, total: 59_000 });
    // 123,456 × 5% = 6,172.8 → 6,170 / × 0.9% = 1,111.1 → 1,110
    expect(interestTax(123_456, "mutualLow").total).toBe(7_280);
  });

  it("비과세 0%", () => {
    expect(interestTax(300_000, "exempt").total).toBe(0);
  });

  it("상호금융 2027년 이후 가입 9.5% = 소득세 9% + 농어촌특별세 0.5%, 지방소득세 없음", () => {
    // 조세특례제한법 제89조의3①2호 (2027.1.1 이후 가입분 100분의 9, 개인지방소득세 부과하지 않음)
    // 농어촌특별세법 제5조①2호·④: 감면세액(14% − 9% = 5%)의 10% = 0.5%
    expect(interestTax(1_000_000, "mutualHigh")).toEqual({ incomeTax: 90_000, localTax: 0, ruralTax: 5_000, total: 95_000 });
    // 123,456 × 9% = 11,111.04 → 11,110 / × 0.5% = 617.28 → 610 (세금우대와 같은 세율)
    expect(interestTax(123_456, "mutualHigh")).toEqual(interestTax(123_456, "preferential"));
  });

  it("2026년 가입 3천만원, 연 3%, 1년: 농어촌특별세 0.9%까지 붙어 5.9%", () => {
    // 이자 900,000 → 소득세 45,000 + 농어촌특별세 8,100 = 53,100 (소득세 5%만 보면 45,000으로 과소 계산)
    const r = calcDeposit({ principal: 30_000_000, months: 12, ratePct: 3, method: "simple", taxType: "mutualLow" });
    expect([r.grossInterest, r.incomeTax, r.localTax, r.ruralTax, r.totalTax]).toEqual([900_000, 45_000, 0, 8_100, 53_100]);
    expect(r.netInterest).toBe(846_900);
  });

  it("농어촌특별세 = (14% − 적용 소득세율)의 10%, 지방소득세는 일반과세에만", () => {
    for (const [type, r] of Object.entries(TAX_RULES)) {
      if (type === "general" || type === "exempt") {
        expect(r.ruralBp).toBe(0);
        continue;
      }
      expect(r.local).toBe(false);
      expect(r.ruralBp).toBe((1400 - r.incomeBp) / 10);
    }
    expect([TAX_RULES.mutual.totalBp, TAX_RULES.mutualLow.totalBp, TAX_RULES.mutualHigh.totalBp]).toEqual([140, 590, 950]);
  });

  it("rule table totals match their parts", () => {
    for (const r of Object.values(TAX_RULES)) {
      expect(r.incomeBp + (r.local ? r.incomeBp / 10 : 0) + r.ruralBp).toBe(r.totalBp);
    }
  });

  it("rule names are distinct so labels never mix up 5.9% and 9.5%", () => {
    const names = Object.values(TAX_RULES).map((r) => r.name);
    expect(new Set(names).size).toBe(names.length);
    expect(TAX_RULES.mutualLow.name).toContain("2026");
    expect(TAX_RULES.mutualHigh.name).toContain("2027");
  });
});

describe("deposit: 상호금융 예탁금 세율은 가입 연도로 정한다 (조특법 제89조의3, 2025.12.23 전문개정)", () => {
  it("2025년까지 가입분은 누구나 비과세(1.4%)", () => {
    expect(mutualTaxTypeByOpenYear(2020, false)).toBe("mutual");
    expect(mutualTaxTypeByOpenYear(2025, false)).toBe("mutual");
    expect(mutualTaxTypeByOpenYear(2025, true)).toBe("mutual");
  });

  it("비과세 대상이 아닌 사람: 2026년 가입 5.9%, 2027년 이후 가입 9.5% (제89조의3①1·2호)", () => {
    expect(mutualTaxTypeByOpenYear(2026, false)).toBe("mutualLow");
    expect(mutualTaxTypeByOpenYear(2027, false)).toBe("mutualHigh");
    expect(mutualTaxTypeByOpenYear(2028, false)).toBe("mutualHigh");
    expect(mutualTaxTypeByOpenYear(2035, false)).toBe("mutualHigh");
  });

  it("비과세 대상자(농·어·임업인 조합원, 총급여 7천만원 이하 등): 2026~2028년 가입 비과세, 2029년 5.9%, 2030년~ 9.5% (제89조의3②)", () => {
    expect(mutualTaxTypeByOpenYear(2026, true)).toBe("mutual");
    expect(mutualTaxTypeByOpenYear(2028, true)).toBe("mutual");
    expect(mutualTaxTypeByOpenYear(2029, true)).toBe("mutualLow");
    expect(mutualTaxTypeByOpenYear(2030, true)).toBe("mutualHigh");
  });

  it("가입 시기별 표의 행", () => {
    expect(MUTUAL_OPEN_PERIODS.map((p) => mutualTaxTypeByOpenYear(p.year, true))).toEqual([
      "mutual",
      "mutual",
      "mutual",
      "mutualLow",
      "mutualHigh",
    ]);
    expect(MUTUAL_OPEN_PERIODS.map((p) => mutualTaxTypeByOpenYear(p.year, false))).toEqual([
      "mutual",
      "mutualLow",
      "mutualHigh",
      "mutualHigh",
      "mutualHigh",
    ]);
  });

  it("세 가지 상호금융 유형 모두 3천만원 한도 특례", () => {
    expect(isMutualTax("mutual")).toBe(true);
    expect(isMutualTax("mutualLow")).toBe(true);
    expect(isMutualTax("mutualHigh")).toBe(true);
    expect(isMutualTax("preferential")).toBe(false);
    expect(isMutualTax("general")).toBe(false);
  });
});

describe("deposit: calcDeposit", () => {
  it("1억, 연 3%, 12개월, 단리, 일반과세 → 세후 2,538,000원", () => {
    const r = calcDeposit({ principal: 100_000_000, months: 12, ratePct: 3, method: "simple", taxType: "general" });
    expect(r.grossInterest).toBe(3_000_000);
    expect(r.totalTax).toBe(462_000);
    expect(r.netInterest).toBe(2_538_000);
    expect(r.maturity).toBe(102_538_000);
    expect(r.monthlyAvgNet).toBe(211_500);
    expect(r.netAnnualRatePct).toBeCloseTo(2.538, 10);
    expect(r.mutualExcess).toBe(0);
  });

  it("1천만원, 연 3.5%, 12개월 → 세전 350,000 / 세금 53,900 / 세후 296,100", () => {
    const r = calcDeposit({ principal: 10_000_000, months: 12, ratePct: 3.5, method: "simple", taxType: "general" });
    expect([r.grossInterest, r.incomeTax, r.localTax, r.netInterest]).toEqual([350_000, 49_000, 4_900, 296_100]);
  });

  it("상호금융: 3천만원 초과분은 일반과세로 따로 계산", () => {
    // 5천만원, 3%, 12개월: 3천만원 → 900,000 (농특세 12,600) + 2천만원 → 600,000 (92,400)
    const r = calcDeposit({ principal: 50_000_000, months: 12, ratePct: 3, method: "simple", taxType: "mutual" });
    expect(r.mutualExcess).toBe(20_000_000);
    expect(r.grossInterest).toBe(1_500_000);
    expect(r.ruralTax).toBe(12_600);
    expect(r.incomeTax).toBe(84_000);
    expect(r.localTax).toBe(8_400);
    expect(r.netInterest).toBe(1_395_000);
    // 한도 이내면 분할하지 않음
    const small = calcDeposit({ principal: MUTUAL_EXEMPT_CAP, months: 12, ratePct: 3, method: "simple", taxType: "mutual" });
    expect(small.mutualExcess).toBe(0);
    expect(small.totalTax).toBe(12_600);
  });

  it("상호금융 저율과세도 3천만원까지만, 초과분은 일반과세", () => {
    // 5천만원, 3%, 12개월: 3천만원 → 900,000 (소득세 45,000 + 농특세 8,100)
    //                     2천만원 → 600,000 (소득세 84,000 + 지방소득세 8,400)
    const r = calcDeposit({ principal: 50_000_000, months: 12, ratePct: 3, method: "simple", taxType: "mutualLow" });
    expect(r.mutualExcess).toBe(20_000_000);
    expect([r.incomeTax, r.localTax, r.ruralTax]).toEqual([129_000, 8_400, 8_100]);
    expect(r.netInterest).toBe(1_500_000 - 145_500);
    expect(r.comprehensiveGross).toBe(600_000);
  });

  it("상호금융 2027년 이후 가입(9.5%)도 3천만원까지만, 세금우대 9.5%와 달리 초과분은 일반과세", () => {
    // 5천만원, 3%, 12개월: 3천만원 → 900,000 (소득세 81,000 + 농특세 4,500)
    //                     2천만원 → 600,000 (소득세 84,000 + 지방소득세 8,400)
    const r = calcDeposit({ principal: 50_000_000, months: 12, ratePct: 3, method: "simple", taxType: "mutualHigh" });
    expect(r.mutualExcess).toBe(20_000_000);
    expect([r.incomeTax, r.localTax, r.ruralTax, r.totalTax]).toEqual([165_000, 8_400, 4_500, 177_900]);
    expect(r.netInterest).toBe(1_322_100);
    expect(r.comprehensiveGross).toBe(600_000);
    // 세금우대(옛 세금우대종합저축)는 한도 분할 없이 전액 9.5%
    const pref = calcDeposit({ principal: 50_000_000, months: 12, ratePct: 3, method: "simple", taxType: "preferential" });
    expect(pref.mutualExcess).toBe(0);
    expect(pref.totalTax).toBe(142_500);
    // 한도 이내면 두 유형의 세금이 같다
    const capHigh = calcDeposit({ principal: MUTUAL_EXEMPT_CAP, months: 12, ratePct: 3, method: "simple", taxType: "mutualHigh" });
    const capPref = calcDeposit({ principal: MUTUAL_EXEMPT_CAP, months: 12, ratePct: 3, method: "simple", taxType: "preferential" });
    expect(capHigh.totalTax).toBe(85_500);
    expect(capHigh.totalTax).toBe(capPref.totalTax);
    expect(capHigh.comprehensiveGross).toBe(0);
  });

  it("금융소득종합과세 합산 이자는 일반과세 부분만", () => {
    // 비과세 5억, 5%, 12개월: 이자 2,500만원이지만 합산 대상 0
    const exempt = calcDeposit({ principal: 500_000_000, months: 12, ratePct: 5, method: "simple", taxType: "exempt" });
    expect(exempt.grossInterest).toBe(25_000_000);
    expect(exempt.comprehensiveGross).toBe(0);
    // 세금우대(분리과세)도 합산하지 않음
    expect(calcDeposit({ principal: 500_000_000, months: 12, ratePct: 5, method: "simple", taxType: "preferential" }).comprehensiveGross).toBe(0);
    // 상호금융 4.6억, 4.5%: 3천만원 → 1,350,000 (합산 제외) + 4.3억 → 19,350,000 (합산)
    const mutual = calcDeposit({ principal: 460_000_000, months: 12, ratePct: 4.5, method: "simple", taxType: "mutual" });
    expect(mutual.grossInterest).toBe(20_700_000);
    expect(mutual.comprehensiveGross).toBe(19_350_000);
    // 일반과세는 전액 합산
    const general = calcDeposit({ principal: 100_000_000, months: 12, ratePct: 3, method: "simple", taxType: "general" });
    expect(general.comprehensiveGross).toBe(general.grossInterest);
  });

  it("validates inputs", () => {
    expect(isValidInput({ principal: 10_000_000, months: 12, ratePct: 3 })).toBe(true);
    expect(isValidInput({ principal: 0, months: 12, ratePct: 3 })).toBe(false);
    expect(isValidInput({ principal: 10_000_000, months: 0, ratePct: 3 })).toBe(false);
    expect(isValidInput({ principal: 10_000_000, months: 1.5, ratePct: 3 })).toBe(false);
    expect(isValidInput({ principal: 10_000_000, months: 12, ratePct: NaN })).toBe(false);
    expect(isValidInput({ principal: 10_000_000, months: 12, ratePct: 25 })).toBe(false);
  });
});

describe("deposit: 월 이자 지급식", () => {
  it("1억, 연 3% → 매달 세전 250,000 / 세금 38,500 / 세후 211,500", () => {
    expect(monthlyPayout(100_000_000, 3, "general")).toEqual({ gross: 250_000, tax: 38_500, net: 211_500 });
  });
  it("매달 10원 미만 절사 때문에 만기 일시 지급과 세금이 조금 다를 수 있다", () => {
    // 1천만원, 연 3.1%: 월 25,833원 → 세금 3,610+360=3,970 → 12개월 47,640
    // 만기 일시: 310,000원 → 43,400+4,340=47,740
    const m = monthlyPayout(10_000_000, 3.1, "general");
    expect(m.gross).toBe(25_833);
    expect(m.tax).toBe(3_970);
    expect(netInterestSimple(10_000_000, 3.1, 12)).toBe(310_000 - 47_740);
  });
  it("상호금융은 매달 지급분도 3천만원까지만 특례, 초과분은 일반과세", () => {
    // 1억, 3%: 3천만원분 75,000 (농특세 1,050) + 7천만원분 175,000 (24,500 + 2,450) → 세금 28,000
    expect(monthlyPayout(100_000_000, 3, "mutual")).toEqual({ gross: 250_000, tax: 28_000, net: 222_000 });
    // 한도 이내: 2천만원, 3% → 50,000, 농특세 700
    expect(monthlyPayout(20_000_000, 3, "mutual")).toEqual({ gross: 50_000, tax: 700, net: 49_300 });
    // 저율과세 3천만원, 3%: 75,000 × (5% → 3,750 → 3,750) + 0.9% (675 → 670)
    expect(monthlyPayout(30_000_000, 3, "mutualLow")).toEqual({ gross: 75_000, tax: 4_420, net: 70_580 });
    // 2027년 이후 가입 3천만원, 3%: 75,000 × 9% = 6,750 + 0.5% (375 → 370) = 7,120
    expect(monthlyPayout(30_000_000, 3, "mutualHigh")).toEqual({ gross: 75_000, tax: 7_120, net: 67_880 });
  });
});

describe("deposit: 일할 계산 (원금 × 연이율 × 일수 / 365)", () => {
  it("달 길이와 기간 일수에 따라 개월 수 계산과 달라진다", () => {
    // 1억, 3%: 28일 230,136 / 31일 254,794 (개월 계산 250,000)
    expect(grossInterestByDays(100_000_000, 3, 28)).toBe(230_136);
    expect(grossInterestByDays(100_000_000, 3, 31)).toBe(254_794);
    // 6개월 181일 1,487,671 / 184일 1,512,328 (개월 계산 1,500,000)
    expect(grossInterestByDays(100_000_000, 3, 181)).toBe(1_487_671);
    expect(grossInterestByDays(100_000_000, 3, 184)).toBe(1_512_328);
    // 365일이면 개월 계산과 같고, 윤년(366일)이면 3,008,219
    expect(grossInterestByDays(100_000_000, 3, 365)).toBe(grossInterest(100_000_000, 3, 12, "simple"));
    expect(grossInterestByDays(100_000_000, 3, 366)).toBe(3_008_219);
    expect(grossInterestByDays(0, 3, 30)).toBe(0);
  });
});

describe("deposit: 금융소득종합과세·예금자보호 helpers", () => {
  it("rate at which one deposit's interest passes 2천만원", () => {
    expect(comprehensiveTaxRatePct(500_000_000, 12)).toBeCloseTo(4, 10);
    expect(comprehensiveTaxRatePct(200_000_000, 24)).toBeCloseTo(5, 10);
    expect(comprehensiveTaxRatePct(10_000_000, 12)).toBeCloseTo(200, 10);
  });
  it("institutions needed to keep 원금+이자 within 1억원 each", () => {
    expect(institutionsNeeded(99_000_000)).toBe(1);
    expect(institutionsNeeded(100_000_000)).toBe(1);
    expect(institutionsNeeded(103_000_000)).toBe(2);
    expect(institutionsNeeded(206_000_000)).toBe(3);
  });
});

describe("deposit: programmatic pages", () => {
  it("labels amounts the way people search", () => {
    expect(depositAmountLabel(1000)).toBe("1천만원");
    expect(depositAmountLabel(5000)).toBe("5천만원");
    expect(depositAmountLabel(10000)).toBe("1억");
    expect(depositAmountLabel(50000)).toBe("5억");
    expect(depositAmountLabel(1500)).toBe("1,500만원");
  });
  it("page list is sorted and unique", () => {
    expect([...DEPOSIT_PAGE_MANWON].sort((a, b) => a - b)).toEqual(DEPOSIT_PAGE_MANWON);
    expect(new Set(DEPOSIT_PAGE_MANWON).size).toBe(DEPOSIT_PAGE_MANWON.length);
    expect(DEPOSIT_PAGE_MANWON).toHaveLength(7);
  });
  it("table axes", () => {
    expect(TABLE_RATES[0]).toBe(2);
    expect(TABLE_RATES[TABLE_RATES.length - 1]).toBe(5);
    expect(TABLE_RATES).toHaveLength(13);
    expect(TABLE_MONTHS).toEqual([3, 6, 12, 24]);
  });
});
