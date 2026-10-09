/**
 * 평 ↔ ㎡ conversion.
 * 1평 = 400/121 ㎡ (6자 × 6자, 1자 = 10/33 m)  ≈ 3.305785 ㎡
 * 1㎡ = 121/400 평 = 0.3025 평
 */
export const M2_PER_PYEONG = 400 / 121;
export const PYEONG_PER_M2 = 121 / 400;

export function m2ToPyeong(m2: number): number {
  return m2 * PYEONG_PER_M2;
}

export function pyeongToM2(pyeong: number): number {
  return pyeong * M2_PER_PYEONG;
}

/**
 * Typical apartment exclusive-area ratio (전용률 = 전용면적 / 공급면적).
 * New-build apartments in Korea usually fall around 72–78%; we use 75% as a midpoint
 * to estimate the "N평형" figure people use in conversation and listings.
 */
export const TYPICAL_EXCLUSIVE_RATIO = 0.75;

/** Estimated supply area (공급면적) in 평 for a given exclusive area in ㎡. */
export function estimateSupplyPyeong(exclusiveM2: number, ratio = TYPICAL_EXCLUSIVE_RATIO): number {
  return m2ToPyeong(exclusiveM2 / ratio);
}

/** Size class used in housing rules. 국민주택규모 = 전용 85㎡ 이하 (수도권·도시지역 기준). */
export function sizeClass(exclusiveM2: number): string {
  if (exclusiveM2 <= 40) return "초소형 (전용 40㎡ 이하)";
  if (exclusiveM2 <= 60) return "소형 (전용 60㎡ 이하)";
  if (exclusiveM2 <= 85) return "중소형 (국민주택규모, 전용 85㎡ 이하)";
  if (exclusiveM2 <= 135) return "중대형 (전용 85㎡ 초과 135㎡ 이하)";
  return "대형 (전용 135㎡ 초과)";
}

/** Exclusive areas (㎡) that get their own landing page: /pyeong/<m2>/ */
export const PYEONG_PAGE_M2 = [
  10, 15, 20, 25, 30, 33, 35, 39, 40, 45, 46, 49, 50, 51, 55, 59, 60, 65, 66, 70, 74, 75, 76, 80, 84, 85, 90, 95, 99,
  100, 101, 102, 105, 110, 114, 115, 120, 125, 130, 135, 140, 145, 150, 160, 165, 170, 180, 185, 198, 200,
];

/** Round to 2 decimals for display. */
export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
