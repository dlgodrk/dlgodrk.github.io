/**
 * 주택 유상취득(매매) 취득세 계산 — 2026년 기준 (2026-10-09 확인).
 *
 * 근거
 * - 지방세법 제11조 제1항 제8호 (시행 2026. 7. 1., 법률 제21308호): 유상거래 주택
 *   6억원 이하 1%, 9억원 초과 3%, 6억원 초과 9억원 이하는 (취득당시가액 × 2/3억원 − 3) × 1/100.
 *   "소수점이하 다섯째자리에서 반올림하여 소수점 넷째자리까지 계산" → 퍼센트로는 소수 둘째자리.
 *   행정안전부 2019년 개정 설명: 7억원 1.67%(취득세 1,169만원), 8억원 2.33%(1,864만원).
 * - 지방세법 제13조의2 (법제처 생활법령 기준): 표준세율 4% + 중과기준세율(2%)의 200%·400%.
 *   법인 12%, 1세대 2주택(조정대상지역)·3주택(그 외) 8%, 3주택 이상(조정)·4주택 이상(그 외) 12%.
 *   일시적 2주택은 중과하지 않음. 2026년 현재 세율 변경 없음(2022년 완화안은 국회 미통과).
 * - 지방세법 제151조 제1항 제1호: 지방교육세. 제11조 제1항 제8호 주택은 "해당 세율 × 50%"의 20%
 *   (= 취득세율의 10%, 0.1~0.3%). 제13조의2 중과는 (4% − 2%) × 20% = 0.4%.
 *   취득세가 감면되면 지방교육세도 같은 비율로 감면(다목 1)).
 * - 농어촌특별세법 제5조 제1항 제6호: 표준세율을 2%로 보고 산출한 취득세액의 10% → 0.2%,
 *   중과는 (2% + 4%) × 10% = 0.6%, (2% + 8%) × 10% = 1.0%. 제1호: 감면세액의 20%.
 *   제4조 제9호·제11호: 서민주택(국민주택규모, 전용 85㎡ 이하)은 비과세.
 * - 지방세특례제한법 제36조의3 (시행 2026. 6. 2.): 생애최초 주택, 취득당시가액 12억원 이하,
 *   2028. 12. 31.까지 취득분. 산출세액(제11조 제1항 제8호 세율) 200만원 이하 면제, 초과 시 200만원 공제.
 *   제1호(아파트 외 소형 공동주택·도시형생활주택 등 60㎡ 이하·3억원(수도권 6억원) 이하, 인구감소지역 주택)는 300만원.
 *   요건은 "본인 및 배우자"가 주택을 소유한 사실이 없을 것 — 세대 주택 수가 아니다. 그래서 부모 집이 있는
 *   세대(지방세법 시행령 제28조의3: 미혼 30세 미만 자녀는 부모 세대)라도 감면 대상이 되고, 이때는
 *   제13조의2 중과세율을 적용하지 않는다("이 경우 「지방세법」 제13조의2의 세율을 적용하지 아니한다").
 *   2025. 12. 31. 개정(법률 제21309호, 시행 2026. 1. 1.)으로 3개월 내 상시거주·추가 주택 취득 추징 요건 삭제,
 *   추징은 취득일부터 3년 안에 매각·증여하거나 임대 등 다른 용도로 쓰는 경우만 남음.
 *
 * 추정치 처리 (위택스 고지액과 다를 수 있음)
 * - 각 세목은 원 미만 버림.
 * - 85㎡ 초과 주택이 생애최초 감면을 받으면 농어촌특별세 = 본세분(가액 × 0.2%) + 감면분(감면액 × 20%).
 *   본세분을 감면 후 금액으로 계산하는 해석도 있어, 이 계산은 많게 잡은 쪽(상한)입니다.
 */
import { koreanWon } from "@/lib/format";

export const MAN = 10_000;
export const EOK = 100_000_000;

/** All rates are integers in units of 1/100,000 (0.001%) so tax amounts stay exact. */
export const RATE_SCALE = 100_000;

export const RATE_STANDARD_LOW = 1_000; // 1%
export const RATE_STANDARD_HIGH = 3_000; // 3%
export const RATE_HEAVY_8 = 8_000; // 8%
export const RATE_HEAVY_12 = 12_000; // 12%
/** 지방교육세 for 제13조의2 중과: (4% − 2%) × 20% */
export const EDU_HEAVY = 400; // 0.4%
/** 농어촌특별세 (전용 85㎡ 초과) */
export const RURAL_STANDARD = 200; // 0.2%
export const RURAL_HEAVY_8 = 600; // 0.6%
export const RURAL_HEAVY_12 = 1_000; // 1.0%
/** 감면받은 취득세에 붙는 농어촌특별세 비율 (농어촌특별세법 제5조 제1항 제1호) */
export const RURAL_ON_REDUCTION_PERCENT = 20;

export const LOW_BRACKET_MAX = 6 * EOK;
export const HIGH_BRACKET_MIN = 9 * EOK;

/** 생애최초 감면 (지방세특례제한법 제36조의3) */
export const FIRST_HOME_PRICE_CAP = 12 * EOK;
export const FIRST_HOME_LIMIT = 2_000_000;
export const FIRST_HOME_LIMIT_SMALL = 3_000_000;
/** 300만원 한도 소형 비아파트(제1호 가~다목)의 수도권 가액 상한 (그 외 지역 3억원). 라목(인구감소지역)은 상한 없음. */
export const FIRST_HOME_SMALL_CAP_CAPITAL = 6 * EOK;
export const FIRST_HOME_DEADLINE = "2028년 12월 31일";

export type Buyer = "person" | "corp";
export type RateCase = "standard" | "heavy8" | "heavy12";

export type AcqInput = {
  /** 취득가액 (원) */
  price: number;
  /** 취득 후 세대 주택 수 (이번에 사는 집 포함). 4 이상은 "4주택 이상". */
  houses: number;
  /** 이번에 사는 집이 조정대상지역에 있는지 */
  regulated: boolean;
  /** 전용면적 85㎡ 초과 */
  over85: boolean;
  buyer?: Buyer;
  /** 조정대상지역 2주택이지만 종전 주택을 기한 안에 처분할 일시적 2주택 */
  temporary2?: boolean;
  /**
   * 생애최초 주택 구입 감면 신청 (본인·배우자가 주택을 소유한 적 없음).
   * 세대 주택 수(houses)와 별개: 부모 집이 있는 세대라도 감면되며, 이때 중과하지 않는다.
   */
  firstHome?: boolean;
  /** 생애최초 감면 한도 (200만원, 소형 비아파트·인구감소지역은 300만원) */
  firstHomeLimit?: number;
};

export type FirstHomeCheck = { requested: boolean; eligible: boolean; reason?: string };

export type AcqResult = {
  price: number;
  rateCase: RateCase;
  /** 취득세율 (1/100,000 단위) */
  rateUnits: number;
  eduUnits: number;
  ruralUnits: number;
  /** 세율이 정해진 이유, e.g. "6억원 이하 1주택", "조정대상지역 2주택 중과" */
  reason: string;
  /** 감면 전 취득세 (산출세액) */
  acqBase: number;
  /** 생애최초 감면액 (취득세) */
  reduction: number;
  /** 감면 후 취득세 */
  acqTax: number;
  /** 감면 전 지방교육세 */
  eduBase: number;
  edu: number;
  /** 농어촌특별세 본세분 (85㎡ 초과) */
  ruralBase: number;
  /** 농어촌특별세 감면분 (감면액 × 20%, 85㎡ 초과) */
  ruralOnReduction: number;
  rural: number;
  total: number;
  /** total / price */
  effectiveRate: number;
  firstHome: FirstHomeCheck;
};

/** floor(a × b ÷ d) for non-negative integers, exact even past 2^53. */
function mulDivFloor(a: number, b: number, d: number): number {
  const p = a * b;
  if (Number.isSafeInteger(p)) return Math.floor(p / d);
  return Number((BigInt(a) * BigInt(b)) / BigInt(d));
}

/**
 * 1주택 등 표준 유상거래 세율 (지방세법 제11조 제1항 제8호), 1/100,000 단위.
 * 6억 초과 9억 이하: (가액 × 2/3억 − 3)% 를 퍼센트 소수 둘째자리(비율 넷째자리)로 반올림.
 */
export function standardRateUnits(price: number): number {
  if (price <= LOW_BRACKET_MAX) return RATE_STANDARD_LOW;
  if (price > HIGH_BRACKET_MIN) return RATE_STANDARD_HIGH;
  // price / 1,500,000 = 가액 × 2/3억 × 100 → minus 300 gives the rate in 0.01% steps.
  const hundredths = Math.round(price / 1_500_000 - 300);
  return hundredths * 10;
}

/** "1%", "1.67%", "12%" */
export function rateLabel(units: number): string {
  const pct = units / 1_000;
  return `${Number(pct.toFixed(3))}%`;
}

/** 표준세율 구간 이름 */
export function bracketLabel(price: number): string {
  if (price <= LOW_BRACKET_MAX) return "6억원 이하";
  if (price <= HIGH_BRACKET_MIN) return "6억원 초과 9억원 이하";
  return "9억원 초과";
}

/**
 * 생애최초 감면 여부. 본인·배우자 무주택은 사용자가 체크로 확인한 것으로 보고,
 * 세대 주택 수는 따지지 않는다 (지방세특례제한법 제36조의3 제1항: "본인 및 배우자").
 */
export function checkFirstHome(input: AcqInput): FirstHomeCheck {
  if (!input.firstHome) return { requested: false, eligible: false };
  if (input.buyer === "corp") return { requested: true, eligible: false, reason: "법인은 생애최초 감면 대상이 아니에요." };
  if (input.price > FIRST_HOME_PRICE_CAP)
    return { requested: true, eligible: false, reason: "취득가액이 12억원을 넘으면 생애최초 감면을 받을 수 없어요." };
  return { requested: true, eligible: true };
}

/** Which rate applies and why (지방세법 제11조·제13조의2). */
export function rateCaseFor(input: AcqInput, firstHomeEligible = false): { rateCase: RateCase; reason: string } {
  const bracket = bracketLabel(input.price);
  if (input.buyer === "corp") return { rateCase: "heavy12", reason: "법인 주택 취득 중과" };
  const h = Math.max(1, Math.floor(input.houses));
  if (firstHomeEligible) {
    // 생애최초 감면 대상이면 세대 주택 수와 관계없이 제13조의2 중과를 적용하지 않는다.
    return { rateCase: "standard", reason: h === 1 ? `${bracket} 생애최초 1주택` : `${bracket} 생애최초 (중과 제외)` };
  }
  const area = input.regulated ? "조정대상지역" : "비조정대상지역";
  if (h === 1) return { rateCase: "standard", reason: `${bracket} 1주택` };
  if (h === 2) {
    if (!input.regulated) return { rateCase: "standard", reason: `${bracket} 비조정대상지역 2주택` };
    if (input.temporary2) return { rateCase: "standard", reason: `${bracket} 일시적 2주택` };
    return { rateCase: "heavy8", reason: "조정대상지역 2주택 중과" };
  }
  if (h === 3) return input.regulated ? { rateCase: "heavy12", reason: "조정대상지역 3주택 중과" } : { rateCase: "heavy8", reason: "비조정대상지역 3주택 중과" };
  return { rateCase: "heavy12", reason: `${area} 4주택 이상 중과` };
}

export function computeAcquisitionTax(input: AcqInput): AcqResult | null {
  if (!Number.isFinite(input.price) || input.price < 1) return null;
  const price = Math.floor(input.price);
  const normalized: AcqInput = { ...input, price };
  const firstHome = checkFirstHome(normalized);
  const { rateCase, reason } = rateCaseFor(normalized, firstHome.eligible);

  let rateUnits: number;
  let eduUnits: number;
  let ruralUnits: number;
  if (rateCase === "standard") {
    rateUnits = standardRateUnits(price);
    eduUnits = rateUnits / 10; // 세율 × 50% × 20%
    ruralUnits = RURAL_STANDARD;
  } else if (rateCase === "heavy8") {
    rateUnits = RATE_HEAVY_8;
    eduUnits = EDU_HEAVY;
    ruralUnits = RURAL_HEAVY_8;
  } else {
    rateUnits = RATE_HEAVY_12;
    eduUnits = EDU_HEAVY;
    ruralUnits = RURAL_HEAVY_12;
  }
  if (!input.over85) ruralUnits = 0;

  const acqBase = mulDivFloor(price, rateUnits, RATE_SCALE);
  const limit = input.firstHomeLimit === FIRST_HOME_LIMIT_SMALL ? FIRST_HOME_LIMIT_SMALL : FIRST_HOME_LIMIT;
  const reduction = firstHome.eligible ? Math.min(acqBase, limit) : 0;
  const acqTax = acqBase - reduction;

  const eduBase = mulDivFloor(price, eduUnits, RATE_SCALE);
  // 지방교육세는 취득세 감면 비율만큼 함께 줄어든다.
  const edu = reduction > 0 && acqBase > 0 ? mulDivFloor(eduBase, acqTax, acqBase) : eduBase;

  const ruralBase = mulDivFloor(price, ruralUnits, RATE_SCALE);
  const ruralOnReduction = input.over85 ? Math.floor((reduction * RURAL_ON_REDUCTION_PERCENT) / 100) : 0;
  const rural = ruralBase + ruralOnReduction;

  const total = acqTax + edu + rural;
  return {
    price,
    rateCase,
    rateUnits,
    eduUnits,
    ruralUnits,
    reason,
    acqBase,
    reduction,
    acqTax,
    eduBase,
    edu,
    ruralBase,
    ruralOnReduction,
    rural,
    total,
    effectiveRate: total / price,
    firstHome,
  };
}

/** Shorthand used by tables: total tax for a scenario. */
export function totalFor(price: number, opts: Omit<AcqInput, "price">): number {
  return computeAcquisitionTax({ price, ...opts })?.total ?? 0;
}

/* ------------------------------------------------------------------ */
/* Scenario rows for tables (주택 수 × 조정 여부 × 면적)                 */
/* ------------------------------------------------------------------ */

export type Scenario = { key: string; label: string; input: Omit<AcqInput, "price" | "over85"> };

export const SCENARIOS: Scenario[] = [
  { key: "1", label: "1주택 (지역 무관)", input: { houses: 1, regulated: false } },
  { key: "2n", label: "2주택 · 비조정대상지역", input: { houses: 2, regulated: false } },
  { key: "2r", label: "2주택 · 조정대상지역", input: { houses: 2, regulated: true } },
  { key: "3n", label: "3주택 · 비조정대상지역", input: { houses: 3, regulated: false } },
  { key: "3r", label: "3주택 · 조정대상지역", input: { houses: 3, regulated: true } },
  { key: "4", label: "4주택 이상 (지역 무관)", input: { houses: 4, regulated: false } },
  { key: "corp", label: "법인", input: { houses: 1, regulated: false, buyer: "corp" } },
];

/* ------------------------------------------------------------------ */
/* 조정대상지역 지정 현황 (2026-10-09 확인)                               */
/* ------------------------------------------------------------------ */

export const REGULATED_AS_OF = "2026년 10월 9일";
export const REGULATED_SEOUL = "서울특별시 25개 자치구 전역";
/** 경기도 조정대상지역: 2025. 10. 16. 지정 12곳 + 2026. 7. 1. 지정 3곳 */
export const REGULATED_GYEONGGI = [
  "과천시",
  "광명시",
  "구리시",
  "성남시 분당구·수정구·중원구",
  "수원시 영통구·장안구·팔달구",
  "안양시 동안구",
  "용인시 수지구·기흥구",
  "의왕시",
  "하남시",
  "화성시 동탄구",
];

/* ------------------------------------------------------------------ */
/* Programmatic pages: /acquisition-tax/<만원>/                         */
/* ------------------------------------------------------------------ */

/** 취득가액 (만원) with their own landing page. */
export const ACQ_PAGE_MANWON = [20_000, 30_000, 40_000, 50_000, 60_000, 70_000, 80_000, 90_000, 100_000, 120_000, 150_000];

export function findAcqPage(slug: string): number | null {
  if (!/^\d+$/.test(slug)) return null;
  const n = Number(slug);
  return ACQ_PAGE_MANWON.includes(n) ? n : null;
}

/** 30000 → "3억", 120000 → "12억" */
export function priceLabel(manwon: number): string {
  return koreanWon(manwon * MAN).replace(/원$/, "");
}

/** Up to `radius` listed prices on each side (inclusive of the page itself). */
export function neighborsOf(manwon: number, radius = 2): number[] {
  const i = ACQ_PAGE_MANWON.indexOf(manwon);
  if (i < 0) return [];
  return ACQ_PAGE_MANWON.slice(Math.max(0, i - radius), i + radius + 1);
}
