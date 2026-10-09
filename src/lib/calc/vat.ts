/**
 * 부가가치세(부가세) 계산.
 *
 * 근거 (2026-10-09 확인, 국가법령정보센터 현행 조문):
 * - 부가가치세법 제30조: 세율 10%.
 * - 부가가치세법 제29조 제7항: 받은 금액에 부가세 포함 여부가 불분명하면 그 금액의 110분의 100을 공급가액으로 본다.
 * - 부가가치세법 제63조: 간이과세자 납부세액 = 공급대가 × 업종별 부가가치율 × 10%,
 *   매입 세금계산서 등 공급대가 × 0.5% 공제, 공제 합계가 납부세액을 넘으면 초과분은 없는 것으로 본다(환급 없음).
 * - 부가가치세법 제46조: 신용카드·현금영수증 등 발행세액공제 1% (2026.12.31.까지 1.3%), 연 500만원 (2026.12.31.까지 1,000만원) 한도.
 *   대상은 제1항 제1호 가목(주로 소비자 상대 사업 = 시행령 제73조 제1항·제2항, 법인·직전 연도 공급가액 10억원 초과 개인 제외,
 *   시행령 제88조 제2항·제3항)과 나목(제36조 제1항 제2호 간이과세자 = 직전 연도 공급대가 4,800만원 미만 또는 신규).
 * - 부가가치세법 제61조 제1항 제3호: 부동산임대업·과세유흥장소는 해당 업종 직전 연도 공급대가 4,800만원 이상이면 간이과세 배제.
 * - 부가가치세법 제62조 제1항: 과세유형 전환은 다음 해 7월 1일부터.
 * - 부가가치세법 제69조: 간이과세자 과세기간 공급대가 4,800만원 미만이면 납부의무 면제.
 * - 부가가치세법 시행령 제109조 제1항: 간이과세 기준금액 1억 400만원 (2024.7.1. 시행).
 * - 부가가치세법 시행령 제111조 제2항: 업종별 부가가치율 15~40% (2021.7.1. 이후 공급분).
 *
 * 끝수 처리: 부가가치세법에는 세금계산서 세액의 원 미만 처리 방법이 따로 없다. 다만 국고금 관리법 제47조 제2항은
 * "국세의 과세표준액을 산정할 때 1원 미만의 끝수가 있으면 이를 계산하지 아니한다"고 정한다 (제1항은 납부 시 10원 미만).
 * - 공급가액 → 세액: 실무 관행대로 원 미만 절사(버림)를 기본으로 하고, 반올림 값을 함께 낸다.
 * - 합계 → 공급가액: 합계 × 100/110 을 원 미만 반올림한 값을 공급가액으로, 나머지를 세액으로 둔다
 *   (편의점·카드 영수증에서 1,000원이 909원 + 91원으로 찍히는 방식). 다른 두 방식도 낸다:
 *   세액을 합계 ÷ 11에서 절사("floor"), 공급가액(과세표준)을 합계 × 100/110에서 절사("supplyFloor", 국고금 관리법 제47조 제2항).
 *
 * 모든 금액은 원 단위 정수. 부동소수점 오차를 피하려고 비율은 정수 연산(÷10, ×10/11, ×‰)으로 계산한다.
 */

/** 부가가치세 세율 10% (부가가치세법 제30조). */
export const VAT_RATE = 0.1;

export type VatRounding = "floor" | "round";

export type VatSplit = {
  /** 공급가액 (부가세 제외) */
  supply: number;
  /** 부가가치세액 */
  vat: number;
  /** 합계금액 (공급가액 + 부가세) */
  total: number;
};

/** 원 단위 정수로 정리 (음수·소수 입력 방어). */
function won(n: number): number {
  return Math.trunc(n);
}

/** 공급가액 → 부가세·합계. 기본은 원 미만 절사. */
export function splitFromSupply(supply: number, rounding: VatRounding = "floor"): VatSplit {
  const s = won(supply);
  const raw = s / 10; // = s × 10%
  const vat = rounding === "floor" ? Math.floor(raw) : Math.round(raw);
  return { supply: s, vat, total: s + vat };
}

/** 합계금액을 공급가액·세액으로 나누는 방식. */
export type TotalSplitMethod = VatRounding | "supplyFloor";

/**
 * 합계금액(부가세 포함) → 공급가액·부가세. 어느 방식이든 공급가액 + 부가세 = 합계.
 * - "round" (기본): 공급가액 = 합계 × 100/110 원 미만 반올림, 부가세 = 합계 − 공급가액.
 *   (×10/11 의 소수부는 11분의 n 이라 정확히 0.5가 나오지 않으므로 반올림 방향이 모호하지 않다.)
 * - "floor": 부가세 = 합계 ÷ 11 원 미만 절사, 공급가액 = 합계 − 부가세.
 * - "supplyFloor": 공급가액 = 합계 × 100/110 원 미만 절사 (국고금 관리법 제47조 제2항), 부가세 = 합계 − 공급가액.
 *
 * 합계 = 11q + r 일 때: r = 0 이면 셋이 같고, r = 1~5 면 round = floor ≠ supplyFloor,
 * r = 6~10 이면 round = supplyFloor ≠ floor (차이는 늘 1원).
 */
export function splitFromTotal(total: number, method: TotalSplitMethod = "round"): VatSplit {
  const t = won(total);
  if (method === "floor") {
    const vat = Math.floor(t / 11);
    return { supply: t - vat, vat, total: t };
  }
  const exact = (t * 10) / 11;
  const supply = method === "supplyFloor" ? Math.floor(exact) : Math.round(exact);
  return { supply, vat: t - supply, total: t };
}

/**
 * 기본 방식("round")과 결과가 다른 다른 끝수 처리 방식 하나. 합계가 11의 배수면 null.
 * 합계 ÷ 11의 나머지가 1~5면 "supplyFloor", 6~10이면 "floor"가 1원 다르다.
 */
export function totalSplitAlternative(total: number): { method: Exclude<TotalSplitMethod, "round">; split: VatSplit } | null {
  const base = splitFromTotal(total);
  for (const method of ["supplyFloor", "floor"] as const) {
    const split = splitFromTotal(total, method);
    if (split.vat !== base.vat) return { method, split };
  }
  return null;
}

/** 부가세액 → 공급가액·합계 (공급가액 = 부가세 × 10). */
export function splitFromVat(vat: number): VatSplit {
  const v = won(vat);
  return { supply: v * 10, vat: v, total: v * 11 };
}

/**
 * 세액을 원 미만 절사했을 때 같은 세액이 나오는 공급가액의 범위.
 * 부가세 1,234원 → 공급가액 12,340원 ~ 12,349원.
 */
export function supplyRangeForVat(vat: number): { min: number; max: number } {
  const v = won(vat);
  return { min: v * 10, max: v * 10 + 9 };
}

// ---------------------------------------------------------------------------
// 간이과세자
// ---------------------------------------------------------------------------

/** 간이과세 적용 기준: 직전 연도 공급대가 1억 400만원 미만 (시행령 제109조 제1항, 2024.7.1.~). */
export const SIMPLIFIED_THRESHOLD = 104_000_000;
/** 부동산임대업·과세유흥장소의 간이과세 기준: 해당 업종 직전 연도 공급대가 4,800만원 미만 (법 제61조 제1항 제3호). */
export const SIMPLIFIED_THRESHOLD_RENTAL = 48_000_000;
/** 납부의무 면제 기준: 해당 과세기간 공급대가 4,800만원 미만 (법 제69조). 세금계산서 발급의무 기준(직전 연도)도 같은 금액. */
export const PAYMENT_EXEMPT_THRESHOLD = 48_000_000;
/** 예정부과 생략 기준: 징수할 금액 50만원 미만 (법 제66조). 일반과세자 예정고지도 같은 기준 (법 제48조 제3항). */
export const INTERIM_NOTICE_MIN = 500_000;

/** 매입 세금계산서 등 수취세액공제율 0.5% (법 제63조 제3항), 천분율. */
export const PURCHASE_CREDIT_PERMILLE = 5;
/** 신용카드매출전표 등 발행세액공제율 1.3% (법 제46조 제1항, 2026.12.31.까지), 천분율. */
export const CARD_CREDIT_PERMILLE = 13;
/** 신용카드 등 발행세액공제 연간 한도 1,000만원 (2026.12.31.까지). */
export const CARD_CREDIT_ANNUAL_LIMIT = 10_000_000;
/**
 * 일반과세 개인사업자가 신용카드 등 발행세액공제를 받을 수 있는 직전 연도 공급가액 상한 10억원
 * (법 제46조 제1항 제1호 가목, 시행령 제88조 제3항 — 사업장 기준). 넘으면 공제 없음.
 */
export const CARD_CREDIT_SUPPLY_LIMIT = 1_000_000_000;

export type SimplifiedIndustryId = "retail" | "mfg" | "lodging" | "construct" | "service" | "pro" | "rent";

export type SimplifiedIndustry = {
  id: SimplifiedIndustryId;
  /** 짧은 이름 (선택 목록용) */
  label: string;
  /** 시행령 제111조 제2항 표의 업종 원문 */
  full: string;
  /** 업종별 부가가치율 (%) */
  ratePct: number;
  /** 간이과세 기준이 4,800만원인 업종 (부동산임대업, 법 제61조 제1항 제3호) */
  rentalThreshold?: boolean;
};

/**
 * 간이과세자 업종별 부가가치율 (부가가치세법 시행령 제111조 제2항, 2021.7.1. 이후 공급분).
 * 시행령 표의 40% 칸은 부동산임대업만 간이과세 기준이 달라(법 제61조 제1항 제3호) "pro"와 "rent"로 나눴다.
 */
export const SIMPLIFIED_INDUSTRIES: readonly SimplifiedIndustry[] = [
  {
    id: "retail",
    label: "소매업·음식점업",
    full: "소매업, 재생용 재료수집 및 판매업, 음식점업",
    ratePct: 15,
  },
  {
    id: "mfg",
    label: "제조업·농림어업·소화물 운송업",
    full: "제조업, 농업·임업 및 어업, 소화물 전문 운송업",
    ratePct: 20,
  },
  { id: "lodging", label: "숙박업", full: "숙박업", ratePct: 25 },
  {
    id: "construct",
    label: "건설업·운수창고업·정보통신업",
    full: "건설업, 운수 및 창고업(소화물 전문 운송업 제외), 정보통신업",
    ratePct: 30,
  },
  { id: "service", label: "그 밖의 서비스업", full: "그 밖의 서비스업", ratePct: 30 },
  {
    id: "pro",
    label: "전문·금융·임대 서비스업, 부동산 관련 서비스업",
    full:
      "금융 및 보험 관련 서비스업, 전문·과학 및 기술서비스업(인물사진 및 행사용 영상 촬영업 제외), 사업시설관리·사업지원 및 임대서비스업, 부동산 관련 서비스업",
    ratePct: 40,
  },
  {
    id: "rent",
    label: "부동산임대업",
    full: "부동산임대업",
    ratePct: 40,
    rentalThreshold: true,
  },
];

export function getSimplifiedIndustry(id: string): SimplifiedIndustry {
  return SIMPLIFIED_INDUSTRIES.find((i) => i.id === id) ?? SIMPLIFIED_INDUSTRIES[0];
}

export type SimplifiedVatInput = {
  /** 과세기간(1년) 공급대가 = 부가세 포함 매출 */
  sales: number;
  /** 업종별 부가가치율 (%) */
  ratePct: number;
  /** 세금계산서·카드영수증 등을 받은 매입 공급대가 (부가세 포함) */
  purchases?: number;
  /** 신용카드·현금영수증·간편결제 등으로 받은 매출 (공급대가) */
  cardSales?: number;
};

export type SimplifiedVatResult = {
  /** 공급대가 × 부가가치율 × 10% (원 미만 절사) */
  grossTax: number;
  /** 매입세금계산서 등 수취세액공제 (0.5%) */
  purchaseCredit: number;
  /** 신용카드 등 발행세액공제 (1.3%, 연 1,000만원 한도) — 한도 적용 후 */
  cardCredit: number;
  /** 실제로 빼는 공제 합계 (납부세액을 넘지 않음) */
  appliedCredit: number;
  /** 공제 후 납부세액 (면제 전) */
  taxAfterCredit: number;
  /** 공급대가 4,800만원 미만 → 납부의무 면제 */
  exempt: boolean;
  /** 최종 납부할 세액 */
  payable: number;
  /** 매출 대비 실효세율 (부가가치율 × 10%) */
  effectiveRate: number;
};

/**
 * 간이과세자 1년분 납부세액 어림 (가산세·예정부과 기납부세액·전자세금계산서 발급공제 제외).
 * 카드 발행세액공제는 받을 수 있다고 보고 계산한다. 직전 연도 공급대가 4,800만원 이상인 간이과세자는
 * 시행령 제73조 제1항·제2항 업종(소매·음식·숙박 등 주로 소비자 상대)일 때만 받으므로(법 제46조 제1항 제1호),
 * 해당하지 않으면 cardSales 를 0으로 넘긴다.
 */
export function simplifiedVat({ sales, ratePct, purchases = 0, cardSales = 0 }: SimplifiedVatInput): SimplifiedVatResult {
  const s = Math.max(0, won(sales));
  const p = Math.max(0, won(purchases));
  // 카드 등 매출은 전체 매출을 넘을 수 없다.
  const c = Math.min(Math.max(0, won(cardSales)), s);
  // 공급대가 × (ratePct / 100) × (10 / 100) = s × ratePct / 1000
  const grossTax = Math.floor((s * ratePct) / 1000);
  const purchaseCredit = Math.floor((p * PURCHASE_CREDIT_PERMILLE) / 1000);
  const cardCredit = Math.min(Math.floor((c * CARD_CREDIT_PERMILLE) / 1000), CARD_CREDIT_ANNUAL_LIMIT);
  // 공제 합계가 납부세액을 넘으면 초과분은 없는 것으로 본다 (법 제63조 제6항).
  const appliedCredit = Math.min(purchaseCredit + cardCredit, grossTax);
  const taxAfterCredit = grossTax - appliedCredit;
  const exempt = s < PAYMENT_EXEMPT_THRESHOLD;
  return {
    grossTax,
    purchaseCredit,
    cardCredit,
    appliedCredit,
    taxAfterCredit,
    exempt,
    payable: exempt ? 0 : taxAfterCredit,
    effectiveRate: ratePct / 1000,
  };
}

/**
 * 같은 매출·매입을 일반과세자로 계산했을 때의 납부(환급)세액 어림.
 * 매출·매입 모두 부가세 포함 금액으로 보고 10/110을 세액으로 계산한다 (매입세액 전액 공제 가정).
 * 신용카드 등 발행세액공제는 차감 전 납부세액까지만 공제된다 (법 제46조 제1항). 음수면 환급.
 * 이 매출을 직전 연도 매출로 보고, 공급가액이 10억원을 넘으면 카드 공제를 하지 않는다 (시행령 제88조 제3항).
 * 업종 요건(시행령 제73조 제1항·제2항, 주로 소비자 상대)은 따지지 않는다.
 */
export function generalVatComparison({
  sales,
  purchases = 0,
  cardSales = 0,
}: {
  sales: number;
  purchases?: number;
  cardSales?: number;
}): { outputTax: number; inputTax: number; cardCredit: number; payable: number } {
  const s = Math.max(0, won(sales));
  const outputTax = splitFromTotal(s).vat;
  const inputTax = splitFromTotal(Math.max(0, won(purchases))).vat;
  const base = outputTax - inputTax;
  const c = Math.min(Math.max(0, won(cardSales)), s);
  const eligible = s - outputTax <= CARD_CREDIT_SUPPLY_LIMIT;
  const cardRaw = eligible ? Math.min(Math.floor((c * CARD_CREDIT_PERMILLE) / 1000), CARD_CREDIT_ANNUAL_LIMIT) : 0;
  const cardCredit = Math.min(cardRaw, Math.max(0, base));
  return { outputTax, inputTax, cardCredit, payable: base - cardCredit };
}

/** 간이과세 기준금액: 부동산임대업·과세유흥장소는 4,800만원, 그 밖에는 1억 400만원 (법 제61조 제1항, 시행령 제109조 제1항). */
export function simplifiedThreshold(rentalOrEntertainment = false): number {
  return rentalOrEntertainment ? SIMPLIFIED_THRESHOLD_RENTAL : SIMPLIFIED_THRESHOLD;
}

/**
 * 과세유형 안내: 1년 공급대가를 다음 해의 "직전 연도 공급대가"로 본 간이과세 해당 여부.
 * 기준 이상이면 다음 해 7월 1일부터 일반과세 (법 제62조 제1항).
 */
export function simplifiedStatus(sales: number, rentalOrEntertainment = false): "exempt" | "simplified" | "general" {
  if (sales >= simplifiedThreshold(rentalOrEntertainment)) return "general";
  if (sales < PAYMENT_EXEMPT_THRESHOLD) return "exempt";
  return "simplified";
}
