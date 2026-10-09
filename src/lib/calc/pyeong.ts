/**
 * 평 ↔ ㎡ conversion.
 * 1평 = 400/121 ㎡ (6자 × 6자, 1자 = 10/33 m)  ≈ 3.305785 ㎡
 * 1㎡ = 121/400 평 = 0.3025 평
 * 2007-07-01부터 법정 면적 단위는 ㎡이고 평은 관용 단위입니다.
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
 * 관행 범위 약 70~80% (판상형이 높고 타워형이 낮음). 75%를 중간값으로 써서
 * 대화·광고에서 쓰는 "N평형"을 추정합니다. Convention, not statute (docs/research/verifier-corrections.md #12).
 */
export const TYPICAL_EXCLUSIVE_RATIO = 0.75;
/** Apartment 전용률 range used for estimate tables (공급면적 기준, 관행). */
export const APARTMENT_RATIOS = [0.7, 0.75, 0.8] as const;
/**
 * Officetel 전용률 range (분모는 계약면적 = 전용 + 주거공용 + 기타공용, 관행 약 50~60%).
 * Sources: zippoom.com 전용률 안내, glasswallet.com 전용·공급면적 안내 (2026-10-09 확인).
 */
export const OFFICETEL_RATIOS = [0.5, 0.55, 0.6] as const;
export const TYPICAL_OFFICETEL_RATIO = 0.55;

/** Estimated supply area (공급면적) in 평 for a given exclusive area in ㎡. */
export function estimateSupplyPyeong(exclusiveM2: number, ratio = TYPICAL_EXCLUSIVE_RATIO): number {
  return m2ToPyeong(exclusiveM2 / ratio);
}

/**
 * 국민주택규모 (주택법 제2조 제6호): 주거전용 85㎡ 이하.
 * 수도권을 제외한 도시지역이 아닌 읍·면 지역은 100㎡ 이하.
 */
export const NATIONAL_HOUSING_M2 = 85;
export const NATIONAL_HOUSING_M2_RURAL = 100;
/** 민영주택 가점제 비율과 소형·저가주택 기준이 갈리는 면적 (주택공급에 관한 규칙 제28조·제53조). */
export const SMALL_HOUSING_M2 = 60;

/** Size class shown in the calculator (통상적 구분). 국민주택규모 = 전용 85㎡ 이하 (수도권·도시지역 기준). */
export function sizeClass(exclusiveM2: number): string {
  if (exclusiveM2 <= 40) return "초소형 (전용 40㎡ 이하)";
  if (exclusiveM2 <= 60) return "소형 (전용 60㎡ 이하)";
  if (exclusiveM2 <= 85) return "중소형 (국민주택규모, 전용 85㎡ 이하)";
  if (exclusiveM2 <= 135) return "중대형 (전용 85㎡ 초과 135㎡ 이하)";
  return "대형 (전용 135㎡ 초과)";
}

/**
 * Content band for programmatic pages. One cut-off per boundary, no overlap:
 * studio ≤ 30 < small ≤ 60 < mid ≤ 85 < large ≤ 135 < xlarge.
 */
export type AreaBand = "studio" | "small" | "mid" | "large" | "xlarge";

export function areaBand(m2: number): AreaBand {
  if (m2 <= 30) return "studio";
  if (m2 <= SMALL_HOUSING_M2) return "small";
  if (m2 <= NATIONAL_HOUSING_M2) return "mid";
  if (m2 <= 135) return "large";
  return "xlarge";
}

/** 일반적 경향 only (단지·연식·평면마다 다름): typical room and bathroom counts for an exclusive area. */
export function typicalLayout(m2: number): { rooms: string; baths: string } {
  if (m2 <= 30) return { rooms: "원룸 또는 1.5룸", baths: "욕실 1개" };
  if (m2 <= 45) return { rooms: "방 1~2개", baths: "욕실 1개" };
  if (m2 <= 50) return { rooms: "방 2개", baths: "욕실 1개" };
  if (m2 <= 60) return { rooms: "방 2~3개", baths: "욕실 1~2개" };
  if (m2 <= 75) return { rooms: "방 3개", baths: "욕실 1~2개" };
  if (m2 <= 85) return { rooms: "방 3개(알파룸이 붙기도 함)", baths: "욕실 2개" };
  if (m2 <= 115) return { rooms: "방 3~4개", baths: "욕실 2개" };
  if (m2 <= 135) return { rooms: "방 4개", baths: "욕실 2개" };
  return { rooms: "방 4~5개", baths: "욕실 2~3개" };
}

/**
 * 민영주택 1순위 가점제 비율 (%) — 주택공급에 관한 규칙 제28조 제2항·제4항
 * (시행 2026. 6. 15., 국토교통부령 제1592호, law.go.kr 2026-10-09 확인).
 * - overheated: 투기과열지구
 * - adjusted: 청약과열지역(조정대상지역)
 * - elsewhereMax: 그 밖의 지역 상한 (85㎡ 이하는 40% 이하에서 시장·군수·구청장이 정함, 85㎡ 초과는 전량 추첨 = 0)
 * 나머지는 추첨제. 수도권 공공주택지구(그린벨트 50% 이상 해제)는 투기과열지구와 같은 비율(85㎡ 초과는 80% 이하).
 */
export function privatePointShare(m2: number): { overheated: number; adjusted: number; elsewhereMax: number } {
  if (m2 <= SMALL_HOUSING_M2) return { overheated: 40, adjusted: 40, elsewhereMax: 40 };
  if (m2 <= NATIONAL_HOUSING_M2) return { overheated: 70, adjusted: 70, elsewhereMax: 40 };
  return { overheated: 80, adjusted: 50, elsewhereMax: 0 };
}

/**
 * 민영주택 청약 예치기준금액 (만원) — 주택공급에 관한 규칙 별표 2.
 * 지역은 입주자모집공고일 현재 신청자의 주민등록상 거주지 기준.
 * Sources: R114 청약 예치기준금액 (2026-04-01), wikidocs 2026 정리 (2026-10-09 확인).
 */
export type DepositTier = { maxM2: number; label: string; seoulBusan: number; metro: number; other: number };

export const SUBSCRIPTION_DEPOSIT_TIERS: readonly DepositTier[] = [
  { maxM2: 85, label: "전용 85㎡ 이하", seoulBusan: 300, metro: 250, other: 200 },
  { maxM2: 102, label: "전용 102㎡ 이하", seoulBusan: 600, metro: 400, other: 300 },
  { maxM2: 135, label: "전용 135㎡ 이하", seoulBusan: 1000, metro: 700, other: 400 },
  { maxM2: Infinity, label: "모든 면적", seoulBusan: 1500, metro: 1000, other: 500 },
];

export function depositTier(m2: number): DepositTier {
  return SUBSCRIPTION_DEPOSIT_TIERS.find((t) => m2 <= t.maxM2) ?? SUBSCRIPTION_DEPOSIT_TIERS[SUBSCRIPTION_DEPOSIT_TIERS.length - 1];
}

/**
 * Exclusive areas (㎡) that get their own landing page: /pyeong/<m2>/
 * Kept: common apartment 주택형 (39·46·49·55·59·74·84·101·114·135㎡), 원룸·오피스텔 sizes (20·30),
 * near-whole-평 sizes (20 ≈ 6평, 30 ≈ 9평, 33 ≈ 10평, 66 ≈ 20평, 165 ≈ 50평), 90㎡ (85㎡ 초과지만 읍·면 100㎡
 * 기준 안) and 200㎡ (토지·상가).
 * 84 and 85 are both kept on purpose: 85㎡ is the 국민주택규모 boundary page with its own text.
 * 2026-10-09: pruned 1㎡ clusters, tiny areas and round numbers with nothing page-specific to say
 * (10, 15, 25, 35, 40, 45, 50, 51, 60, 65, 70, 75, 76, 80, 95, 99, 100, 102, 105, 110, 115, 120, 125, 130,
 * 140, 145, 150, 160, 170, 180, 185, 198).
 */
export const PYEONG_PAGE_M2 = [20, 30, 33, 39, 46, 49, 55, 59, 66, 74, 84, 85, 90, 101, 114, 135, 165, 200];

/**
 * Round half up to 2 decimals without binary float drift
 * (46 × 0.3025 = 13.915 → 13.92, not 13.91).
 */
export function round2(n: number): number {
  if (!Number.isFinite(n)) return n;
  const r = Math.round(Number(`${n.toFixed(10)}e2`)) / 100;
  return Number.isFinite(r) ? r : Math.round(n * 100) / 100;
}
