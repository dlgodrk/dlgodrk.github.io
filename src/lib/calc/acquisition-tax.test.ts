import { describe, expect, it } from "vitest";
import {
  ACQ_PAGE_MANWON,
  bracketLabel,
  computeAcquisitionTax,
  EOK,
  findAcqPage,
  MAN,
  NATIONAL_HOUSING_M2,
  NATIONAL_HOUSING_M2_RURAL,
  neighborsOf,
  priceLabel,
  rateLabel,
  SCENARIOS,
  standardRateUnits,
  totalFor,
  type AcqInput,
} from "./acquisition-tax";

const base: Omit<AcqInput, "price"> = { houses: 1, regulated: false, over85: false };
const calc = (price: number, opts: Partial<AcqInput> = {}) => computeAcquisitionTax({ ...base, price, ...opts })!;

describe("standard rate (지방세법 제11조 제1항 제8호)", () => {
  it("is 1% up to 6억 and 3% above 9억", () => {
    expect(standardRateUnits(3 * EOK)).toBe(1_000);
    expect(standardRateUnits(6 * EOK)).toBe(1_000);
    expect(standardRateUnits(9 * EOK)).toBe(3_000);
    expect(standardRateUnits(9 * EOK + 1)).toBe(3_000);
    expect(standardRateUnits(15 * EOK)).toBe(3_000);
  });
  it("uses (가액 × 2/3억 − 3)% rounded to 0.01%p between 6억 and 9억", () => {
    // 행정안전부 2019 개정 설명: 7억 1.67%, 7.5억 2%, 8억 2.33%
    expect(standardRateUnits(7 * EOK)).toBe(1_670);
    expect(standardRateUnits(7.5 * EOK)).toBe(2_000);
    expect(standardRateUnits(8 * EOK)).toBe(2_330);
    expect(standardRateUnits(6.5 * EOK)).toBe(1_330);
    expect(standardRateUnits(8.5 * EOK)).toBe(2_670);
    // just over 6억 stays at 1.00%
    expect(standardRateUnits(6 * EOK + 1)).toBe(1_000);
    // 600,750,000 → 1.005% → 반올림 1.01%
    expect(standardRateUnits(600_750_000)).toBe(1_010);
  });
  it("formats rates and brackets", () => {
    expect(rateLabel(1_670)).toBe("1.67%");
    expect(rateLabel(167)).toBe("0.167%");
    expect(rateLabel(400)).toBe("0.4%");
    expect(rateLabel(12_000)).toBe("12%");
    expect(bracketLabel(6 * EOK)).toBe("6억원 이하");
    expect(bracketLabel(7 * EOK)).toBe("6억원 초과 9억원 이하");
    expect(bracketLabel(12 * EOK)).toBe("9억원 초과");
  });
});

describe("1주택 totals", () => {
  it("5억, 85㎡ 이하: 취득세 1% + 지방교육세 0.1%", () => {
    const r = calc(5 * EOK);
    expect(r.acqTax).toBe(5_000_000);
    expect(r.edu).toBe(500_000);
    expect(r.rural).toBe(0);
    expect(r.total).toBe(5_500_000);
    expect(r.effectiveRate).toBeCloseTo(0.011, 10);
  });
  it("5억, 85㎡ 초과 adds 농어촌특별세 0.2%", () => {
    const r = calc(5 * EOK, { over85: true });
    expect(r.rural).toBe(1_000_000);
    expect(r.total).toBe(6_500_000);
  });
  it("7억 and 8억 match the 행정안전부 examples (1,169만원 / 1,864만원)", () => {
    const r7 = calc(7 * EOK);
    expect(r7.acqTax).toBe(11_690_000);
    expect(r7.edu).toBe(1_169_000);
    expect(r7.total).toBe(12_859_000);
    const r8 = calc(8 * EOK);
    expect(r8.acqTax).toBe(18_640_000);
    expect(r8.edu).toBe(1_864_000);
  });
  it("12억 at 3%: 3,600만 + 360만 (+ 240만 농특세 if 85㎡ 초과)", () => {
    expect(calc(12 * EOK).total).toBe(39_600_000);
    expect(calc(12 * EOK, { over85: true }).total).toBe(42_000_000);
  });
  it("floors odd prices to whole won", () => {
    const r = calc(123_456_789);
    expect(r.acqTax).toBe(1_234_567);
    expect(r.edu).toBe(123_456);
  });
  it("returns null for empty or non-positive prices", () => {
    expect(computeAcquisitionTax({ ...base, price: NaN })).toBeNull();
    expect(computeAcquisitionTax({ ...base, price: 0 })).toBeNull();
    expect(computeAcquisitionTax({ ...base, price: -5 })).toBeNull();
  });
});

describe("다주택·법인 중과 (지방세법 제13조의2)", () => {
  it("조정대상지역 2주택 8%: 지방교육세 0.4%, 농특세 0.6%", () => {
    const r = calc(10 * EOK, { houses: 2, regulated: true });
    expect(r.rateCase).toBe("heavy8");
    expect(r.acqTax).toBe(80_000_000);
    expect(r.edu).toBe(4_000_000);
    expect(r.total).toBe(84_000_000);
    expect(calc(10 * EOK, { houses: 2, regulated: true, over85: true }).total).toBe(90_000_000);
  });
  it("비조정대상지역 2주택 keeps 1~3%", () => {
    const r = calc(5 * EOK, { houses: 2, regulated: false });
    expect(r.rateCase).toBe("standard");
    expect(r.total).toBe(5_500_000);
  });
  it("일시적 2주택 in 조정대상지역 keeps 1~3%", () => {
    const r = calc(5 * EOK, { houses: 2, regulated: true, temporary2: true });
    expect(r.rateCase).toBe("standard");
    expect(r.reason).toContain("일시적 2주택");
  });
  it("3주택: 비조정 8%, 조정 12%", () => {
    expect(calc(5 * EOK, { houses: 3, regulated: false }).rateUnits).toBe(8_000);
    const r = calc(5 * EOK, { houses: 3, regulated: true, over85: true });
    expect(r.rateUnits).toBe(12_000);
    expect(r.acqTax).toBe(60_000_000);
    expect(r.edu).toBe(2_000_000);
    expect(r.rural).toBe(5_000_000);
    expect(r.total).toBe(67_000_000);
  });
  it("4주택 이상 is 12% everywhere", () => {
    expect(calc(3 * EOK, { houses: 4, regulated: false }).rateUnits).toBe(12_000);
    expect(calc(3 * EOK, { houses: 5, regulated: true }).rateUnits).toBe(12_000);
  });
  it("법인 is 12% even for the first house", () => {
    const r = calc(5 * EOK, { buyer: "corp" });
    expect(r.rateCase).toBe("heavy12");
    expect(r.total).toBe(62_000_000);
  });
});

describe("생애최초 감면 (지방세특례제한법 제36조의3)", () => {
  it("3억, 85㎡ 이하: 300만 − 200만 = 100만, 지방교육세도 같은 비율로 감면", () => {
    const r = calc(3 * EOK, { firstHome: true });
    expect(r.firstHome.eligible).toBe(true);
    expect(r.acqBase).toBe(3_000_000);
    expect(r.reduction).toBe(2_000_000);
    expect(r.acqTax).toBe(1_000_000);
    expect(r.eduBase).toBe(300_000);
    expect(r.edu).toBe(100_000);
    expect(r.total).toBe(1_100_000);
  });
  it("2억: 산출세액 200만원 이하라 전액 면제", () => {
    const r = calc(2 * EOK, { firstHome: true });
    expect(r.acqTax).toBe(0);
    expect(r.edu).toBe(0);
    expect(r.total).toBe(0);
  });
  it("300만원 한도 (소형 비아파트·인구감소지역)", () => {
    expect(calc(3 * EOK, { firstHome: true, firstHomeLimit: 3_000_000 }).total).toBe(0);
    const r = calc(5 * EOK, { firstHome: true, firstHomeLimit: 3_000_000 });
    expect(r.reduction).toBe(3_000_000);
    expect(r.total).toBe(2_200_000);
  });
  it("85㎡ 초과: 감면액의 20%가 농어촌특별세로 붙는다", () => {
    const r = calc(5 * EOK, { firstHome: true, over85: true });
    expect(r.acqTax).toBe(3_000_000);
    expect(r.edu).toBe(300_000);
    expect(r.ruralBase).toBe(1_000_000);
    expect(r.ruralOnReduction).toBe(400_000);
    expect(r.total).toBe(4_700_000);
  });
  it("국민주택규모 이하: 감면분 농어촌특별세도 비과세 (농어촌특별세법 제4조 제9호)", () => {
    const r = calc(5 * EOK, { firstHome: true, over85: false });
    expect(r.ruralBase).toBe(0);
    expect(r.ruralOnReduction).toBe(0);
    expect(r.total).toBe(3_300_000);
  });
  it("12억 is the price cap", () => {
    const ok = calc(12 * EOK, { firstHome: true });
    expect(ok.reduction).toBe(2_000_000);
    expect(ok.edu).toBe(3_400_000);
    expect(ok.total).toBe(37_400_000);
    const over = calc(12 * EOK + 1, { firstHome: true });
    expect(over.firstHome.eligible).toBe(false);
    expect(over.reduction).toBe(0);
  });
  it("needs an individual buyer", () => {
    const corp = calc(3 * EOK, { firstHome: true, buyer: "corp" });
    expect(corp.firstHome.eligible).toBe(false);
    expect(corp.rateCase).toBe("heavy12");
  });
  it("depends on 본인·배우자, not 세대 주택 수, and switches off 중과 (제36조의3 제1항 괄호)", () => {
    // 부모 집이 있는 세대의 무주택 자녀가 조정대상지역 5억 아파트를 처음 사는 경우:
    // 8% 중과(4,200만원)가 아니라 1% − 200만원 → 300만 + 지방교육세 30만 = 330만원.
    const r = calc(5 * EOK, { houses: 2, regulated: true, firstHome: true });
    expect(r.firstHome.eligible).toBe(true);
    expect(r.rateCase).toBe("standard");
    expect(r.reason).toContain("생애최초");
    expect(r.reduction).toBe(2_000_000);
    expect(r.total).toBe(3_300_000);
    expect(calc(5 * EOK, { houses: 4, regulated: true, firstHome: true }).total).toBe(3_300_000);
  });
  it("over 12억 the 감면 and the 중과 exemption both fall away", () => {
    const r = calc(12 * EOK + MAN, { houses: 2, regulated: true, firstHome: true });
    expect(r.firstHome.eligible).toBe(false);
    expect(r.rateCase).toBe("heavy8");
  });
});

describe("국민주택규모 (주택법 제2조제6호, 2026-10-09 확인)", () => {
  // 주거전용면적 85㎡ 이하; 수도권을 제외한 도시지역이 아닌 읍·면 지역은 100㎡ 이하.
  // 농어촌특별세법 시행령 제4조⑤: 서민주택 = 국민주택규모 이하 → 제4조 제9호·제11호 비과세.
  it("uses 85㎡ and 100㎡ (수도권 밖 비도시 읍·면)", () => {
    expect(NATIONAL_HOUSING_M2).toBe(85);
    expect(NATIONAL_HOUSING_M2_RURAL).toBe(100);
  });
  it("a 95㎡ home in a 비수도권 비도시 읍·면 is within 국민주택규모, so no 농특세 (over85: false)", () => {
    // 5억, 1주택: 취득세 500만 + 지방교육세 50만, 농특세 0.2%(100만) 없음.
    expect(calc(5 * EOK, { over85: false }).rural).toBe(0);
    expect(calc(5 * EOK, { over85: true }).rural).toBe(1_000_000);
  });
});

describe("pages and scenarios", () => {
  it("page list is sorted, unique and parses slugs", () => {
    expect([...ACQ_PAGE_MANWON].sort((a, b) => a - b)).toEqual(ACQ_PAGE_MANWON);
    expect(new Set(ACQ_PAGE_MANWON).size).toBe(ACQ_PAGE_MANWON.length);
    expect(findAcqPage("30000")).toBe(30_000);
    expect(findAcqPage("31000")).toBeNull();
    expect(findAcqPage("3e4")).toBeNull();
    expect(priceLabel(30_000)).toBe("3억");
    expect(priceLabel(120_000)).toBe("12억");
  });
  it("neighbors stay in range", () => {
    expect(neighborsOf(20_000)).toEqual([20_000, 30_000, 40_000]);
    expect(neighborsOf(70_000)).toEqual([50_000, 60_000, 70_000, 80_000, 90_000]);
    expect(neighborsOf(150_000)).toEqual([100_000, 120_000, 150_000]);
  });
  it("scenario totals rise with the number of houses", () => {
    const totals = SCENARIOS.map((s) => totalFor(5 * EOK, { ...s.input, over85: false }));
    expect(totals).toEqual([5_500_000, 5_500_000, 42_000_000, 42_000_000, 62_000_000, 62_000_000, 62_000_000]);
  });
});
