import { describe, expect, it } from "vitest";
import {
  BMI_CLASSES,
  BMI_PAGE_HEIGHTS,
  bmiEquation,
  calcBmi,
  classifyBmi,
  classWeightLabel,
  classWeightRange,
  defaultWeightFor,
  displayBmi,
  formatBmi,
  formatKg,
  getBmiClass,
  isValidInput,
  minWeightAtOrAbove,
  neighborHeights,
  normalRangeGap,
  normalWeightRange,
  scalePosition,
  standardWeight,
  weightTableFor,
  whoClass,
} from "./bmi";

describe("calcBmi", () => {
  it("is kg divided by m squared", () => {
    // 65 ÷ (1.7 × 1.7) = 65 ÷ 2.89 = 22.49…
    expect(calcBmi(170, 65)).toBeCloseTo(22.4913, 4);
    // 키 160cm·체중 64kg → 64 ÷ 2.56 = 25 exactly (1단계 비만 starts here)
    expect(calcBmi(160, 64)).toBe(25);
    expect(calcBmi(200, 100)).toBe(25);
    expect(calcBmi(175, 80)).toBeCloseTo(26.1224, 4);
  });
});

describe("classifyBmi — 대한비만학회 비만 진료지침 2022, Table 2 (doi:10.7570/jomes23016)", () => {
  const cases: [number, string][] = [
    [16, "under"],
    [18.4, "under"],
    [18.5, "normal"],
    [22.9, "normal"],
    [22.99, "normal"],
    [23, "pre"],
    [24.9, "pre"],
    [25, "ob1"],
    [29.9, "ob1"],
    [30, "ob2"],
    [34.9, "ob2"],
    [35, "ob3"],
    [48, "ob3"],
  ];
  it.each(cases)("BMI %f → %s", (bmi, id) => {
    expect(classifyBmi(bmi).id).toBe(id);
  });
  it("labels follow the guideline wording", () => {
    expect(BMI_CLASSES.map((c) => c.label)).toEqual(["저체중", "정상", "비만 전단계", "1단계 비만", "2단계 비만", "3단계 비만"]);
    expect(getBmiClass("normal").range).toBe("18.5~22.9");
  });
});

describe("displayBmi", () => {
  it("rounds to one decimal", () => {
    expect(formatBmi(calcBmi(170, 65))).toBe("22.5");
    expect(displayBmi(26.12)).toBe(26.1);
    expect(displayBmi(26.16)).toBe(26.2);
  });
  it("never shows a number from the next class", () => {
    expect(displayBmi(22.97)).toBe(22.9); // still 정상
    expect(displayBmi(18.46)).toBe(18.4); // still 저체중
    expect(displayBmi(24.96)).toBe(24.9); // still 비만 전단계
    expect(displayBmi(29.999)).toBe(29.9);
  });
});

describe("bmiEquation (worked division written in copy)", () => {
  it("uses '=' and the display value when that is ordinary rounding", () => {
    expect(bmiEquation(calcBmi(170, 65))).toEqual({ op: "=", value: "22.5", heldBelow: null }); // 65 ÷ 2.89
    expect(bmiEquation(calcBmi(170, 75))).toEqual({ op: "=", value: "26.0", heldBelow: null }); // 75 ÷ 2.89 = 25.95…
    expect(bmiEquation(calcBmi(160, 64))).toEqual({ op: "=", value: "25.0", heldBelow: null }); // exactly 25
  });
  it("uses '≈' with two decimals when the display was held under a boundary", () => {
    // 45 ÷ 1.96 = 22.959… → ordinary rounding 23.0, display 22.9; writing "= 22.9" would be wrong arithmetic
    expect(bmiEquation(calcBmi(140, 45))).toEqual({ op: "≈", value: "22.96", heldBelow: 23 });
    expect(bmiEquation(calcBmi(156, 45))).toEqual({ op: "≈", value: "18.49", heldBelow: 18.5 }); // 45 ÷ 2.4336
    expect(bmiEquation(calcBmi(155, 60))).toEqual({ op: "≈", value: "24.97", heldBelow: 25 }); // 60 ÷ 2.4025
    expect(bmiEquation(calcBmi(189, 125))).toEqual({ op: "≈", value: "34.99", heldBelow: 35 }); // 125 ÷ 3.5721
  });
  it("adds decimals until the value stays under the boundary", () => {
    expect(bmiEquation(22.9962)).toEqual({ op: "≈", value: "22.996", heldBelow: 23 });
    expect(bmiEquation(24.99961)).toEqual({ op: "≈", value: "24.9996", heldBelow: 25 });
  });
  it("is close to the raw BMI and in the same class everywhere (brute force)", () => {
    const bad: string[] = [];
    for (const h of BMI_PAGE_HEIGHTS) {
      for (let t = 200; t <= 2000; t++) {
        const bmi = calcBmi(h, t / 10);
        const eq = bmiEquation(bmi);
        const v = Number(eq.value);
        const held = formatBmi(bmi) !== (Math.round(bmi * 10 + 1e-6) / 10).toFixed(1);
        const ok =
          classifyBmi(v).id === classifyBmi(bmi).id &&
          Math.abs(v - bmi) < (eq.op === "=" ? 0.05 + 1e-9 : 0.005 + 1e-9) &&
          (eq.op === "≈") === held &&
          (eq.heldBelow === null || v < eq.heldBelow);
        if (!ok) bad.push(`${h}cm ${t / 10}kg → ${bmi} ${eq.op} ${eq.value}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe("weight ranges on the 0.1 kg grid", () => {
  it("170cm normal range is 53.5~66.4kg (BMI 18.5 이상 23 미만)", () => {
    // 2.89 × 18.5 = 53.465 → first 0.1 kg step 53.5; 2.89 × 23 = 66.47 → last step below it 66.4
    expect(normalWeightRange(170)).toEqual({ min: 53.5, max: 66.4 });
    expect(classWeightLabel(170, getBmiClass("under"))).toBe("53.4kg 이하");
    expect(classWeightLabel(170, getBmiClass("pre"))).toBe("66.5~72.2kg");
    expect(classWeightLabel(170, getBmiClass("ob1"))).toBe("72.3~86.6kg");
    expect(classWeightLabel(170, getBmiClass("ob2"))).toBe("86.7~101.1kg");
    expect(classWeightLabel(170, getBmiClass("ob3"))).toBe("101.2kg 이상");
  });
  it("160cm: BMI 25 lands exactly on 64.0kg", () => {
    expect(minWeightAtOrAbove(160, 25)).toBe(64);
    expect(classWeightRange(160, getBmiClass("pre")).max).toBe(63.9);
  });
  it("agrees with classifyBmi and the displayed BMI for every page height (brute force)", () => {
    const mismatches: string[] = [];
    for (const h of BMI_PAGE_HEIGHTS) {
      const ranges = BMI_CLASSES.map((c) => ({ c, ...classWeightRange(h, c) }));
      for (let t = 200; t <= 2000; t++) {
        const w = t / 10;
        const bmi = calcBmi(h, w);
        const cls = classifyBmi(bmi);
        const inRange = ranges.find((r) => (r.min === null || w >= r.min - 1e-9) && (r.max === null || w <= r.max + 1e-9));
        const shown = displayBmi(bmi);
        const shownOk = shown >= cls.min && (cls.max === null || shown < cls.max);
        if (inRange?.c.id !== cls.id || !shownOk) mismatches.push(`${h}cm ${w}kg → ${cls.id}, range ${inRange?.c.id}, shown ${shown}`);
      }
    }
    expect(mismatches).toEqual([]);
  });
  it("reports the gap to the normal range", () => {
    expect(normalRangeGap(170, 60)).toEqual({ side: "inside", kg: 0 });
    expect(normalRangeGap(170, 70)).toEqual({ side: "above", kg: 3.6 });
    expect(normalRangeGap(170, 50)).toEqual({ side: "below", kg: 3.5 });
  });
});

describe("standardWeight (키(m)² × 22 남 / × 21 여, 참고용)", () => {
  it("matches the common worked examples", () => {
    expect(formatKg(standardWeight(170, "m"))).toBe("63.6"); // 2.89 × 22 = 63.58
    expect(formatKg(standardWeight(170, "f"))).toBe("60.7"); // 2.89 × 21 = 60.69
    expect(formatKg(standardWeight(160, "f"))).toBe("53.8"); // 2.56 × 21 = 53.76
    expect(formatKg(standardWeight(180, "m"))).toBe("71.3"); // 3.24 × 22 = 71.28
  });
  it("default weight for a height page is the male standard weight", () => {
    expect(defaultWeightFor(170)).toBe(64);
    expect(defaultWeightFor(155)).toBe(53);
  });
});

describe("whoClass (WHO: overweight ≥ 25, obesity ≥ 30)", () => {
  it("uses the international cut-offs", () => {
    expect(whoClass(18.4).label).toBe("저체중");
    expect(whoClass(24.9).label).toBe("정상");
    expect(whoClass(25).label).toBe("과체중");
    expect(whoClass(29.9).label).toBe("과체중");
    expect(whoClass(30).label).toBe("비만 1단계");
    expect(whoClass(35).label).toBe("비만 2단계");
    expect(whoClass(40).label).toBe("비만 3단계");
  });
});

describe("scalePosition", () => {
  it("stays in [0, 1] and never decreases", () => {
    let prev = -1;
    for (let b = 10; b <= 50; b += 0.05) {
      const p = scalePosition(b);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
      expect(p).toBeGreaterThanOrEqual(prev - 1e-12);
      prev = p;
    }
  });
  it("puts class boundaries on segment edges", () => {
    expect(scalePosition(18.5)).toBeCloseTo(1 / 6, 10);
    expect(scalePosition(23)).toBeCloseTo(2 / 6, 10);
    expect(scalePosition(25)).toBeCloseTo(3 / 6, 10);
    expect(scalePosition(35)).toBeCloseTo(5 / 6, 10);
    expect(scalePosition(12)).toBe(0);
    expect(scalePosition(45)).toBe(1);
  });
});

describe("inputs and page lists", () => {
  it("validates adult ranges", () => {
    expect(isValidInput(170, 65)).toBe(true);
    expect(isValidInput(NaN, 65)).toBe(false);
    expect(isValidInput(170, 0)).toBe(false);
    expect(isValidInput(50, 65)).toBe(false);
  });
  it("has 61 height pages, 140~200cm, sorted and unique", () => {
    expect(BMI_PAGE_HEIGHTS).toHaveLength(61);
    expect(BMI_PAGE_HEIGHTS[0]).toBe(140);
    expect(BMI_PAGE_HEIGHTS.at(-1)).toBe(200);
    expect(new Set(BMI_PAGE_HEIGHTS).size).toBe(61);
    expect([...BMI_PAGE_HEIGHTS].sort((a, b) => a - b)).toEqual(BMI_PAGE_HEIGHTS);
  });
  it("weight table spans BMI 17 to past 35 in 5 kg steps", () => {
    expect(weightTableFor(170)).toEqual([45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105]);
    for (const h of BMI_PAGE_HEIGHTS) {
      const t = weightTableFor(h);
      expect(calcBmi(h, t[0])).toBeLessThanOrEqual(17);
      expect(calcBmi(h, t.at(-1)!)).toBeGreaterThanOrEqual(35);
      expect(t.length).toBeLessThanOrEqual(18);
    }
  });
  it("neighbours are clipped to the page list", () => {
    expect(neighborHeights(170)).toEqual([166, 167, 168, 169, 170, 171, 172, 173, 174]);
    expect(neighborHeights(140)).toEqual([140, 141, 142, 143, 144]);
  });
});
