/**
 * 적금(정기적금) 이자 계산.
 *
 * 매달 같은 금액을 넣는 정기적금은 회차마다 남은 개월 수만큼만 이자가 붙는다.
 * k번째 회차(k = 1..n) 납입금은 만기까지 (n − k + 1)개월 예치된다.
 *
 * - 단리: 이자 = 월납입액 × (연이율/12) × (1 + 2 + … + n) = 월납입액 × 연이율/12 × n(n+1)/2
 * - 월복리: 이자 = Σ_{k=1..n} 월납입액 × ((1 + 연이율/12)^k − 1)
 *
 * 은행 실제 이자는 회차별 예치 일수(일할)로 계산하므로 몇 원~몇십 원 차이가 날 수 있다.
 * 여기서는 은행 적금 계산기와 같은 월 단위 모델을 쓰고 원 미만은 버린다.
 *
 * 세금(원천징수)
 * - 일반과세 15.4%: 이자소득세 14% (소득세법 제129조 제1항 제1호 라목) +
 *   지방소득세 = 원천징수 소득세의 10% (지방세법 제103조의13)
 * - 세금우대 9.5%: 소득세 9% + 농어촌특별세 0.5% (옛 세금우대종합저축, 조세특례제한법 제89조,
 *   2014.12.31까지 가입분만). 3천만원 한도가 있는 2027년 이후 가입 조합 예탁금은 agri2027로 따로 둔다.
 * - 조합 예탁금 (지역 농·축협·수협·산림조합·신협·새마을금고, 조세특례제한법 제89조의3,
 *   2025.12.23 전문개정, 2026.1.1 시행). 세율은 이자를 받는 해가 아니라 예탁금에 "가입한" 해로 정해진다.
 *   - agri 1.4%: 소득세 비과세 + 농어촌특별세 1.4% (감면세액 14%의 10%, 농어촌특별세법 제5조①).
 *     2025.12.31까지 가입분(누구나), 그리고 같은 조 ②의 대상자 — 제88조의5②1호: 대통령령으로 정하는
 *     조합(농협·수협·산림조합)의 조합원, 또는 직전 과세기간 총급여 7천만원 이하·종합소득금액 6천만원
 *     이하인 사람 — 의 2026.1.1~2028.12.31 가입분. (이들도 2029년 가입분 5%, 2030년 이후 9%.)
 *   - agri2026 5.9%: 그 밖의 사람이 2026년에 가입. 소득세 5% + 농어촌특별세 0.9% (감면세액 9%의 10%).
 *   - agri2027 9.5%: 그 밖의 사람이 2027.1.1 이후 가입. 소득세 9% + 농어촌특별세 0.5% (감면세액 5%의 10%).
 *   5%·9% 분리과세분에는 지방소득세가 붙지 않는다 (제89조의3①).
 *   셋 다 "1명당 3천만원 이하의 예탁금만 해당"하므로 원금 합계가 3천만원을 넘으면 먼저 넣은 3천만원
 *   (앞 회차부터)에 붙는 이자만 특례 세율, 나머지 회차 이자는 일반과세 15.4%로 나눠 계산한다.
 *   (같은 방식으로 deposit.ts는 MUTUAL_EXEMPT_CAP 초과 원금을 일반과세로 계산)
 * - 비과세 0%: 비과세종합저축(조특법 제88조의2), 청년도약계좌·청년미래적금 등
 * 각 세목은 따로 계산해 10원 미만을 버린다 (국고금 관리법 제47조 끝수 계산, 은행 원천징수 관행).
 */

export type InterestType = "simple" | "monthly";
/** 조합 예탁금 과세 구분: 비과세 대상(1.4%) · 2026년 가입(5.9%) · 2027년 이후 가입(9.5%). */
export type AgriTaxType = "agri" | "agri2026" | "agri2027";
export type TaxType = "general" | "preferential" | AgriTaxType | "exempt";

type TaxLineRule = {
  label: string;
  note: string;
  /** Rate in basis points of the interest (1400 = 14%). Ignored when `ofPrevious` is set. */
  bp: number;
  /** When set, this line is `ofPrevious` × the previous line's (already truncated) amount, e.g. 지방소득세 = 소득세 × 10%. */
  ofPrevious?: number;
};

export type TaxTypeInfo = {
  label: string;
  /** Total nominal rate as a ratio, e.g. 0.154 */
  rate: number;
  rateLabel: string;
  lines: TaxLineRule[];
};

export const TAX_TYPES: Record<TaxType, TaxTypeInfo> = {
  general: {
    label: "일반과세",
    rate: 0.154,
    rateLabel: "15.4%",
    lines: [
      { label: "이자소득세", note: "14%", bp: 1400 },
      { label: "지방소득세", note: "소득세의 10%", bp: 0, ofPrevious: 10 },
    ],
  },
  preferential: {
    label: "세금우대",
    rate: 0.095,
    rateLabel: "9.5%",
    lines: [
      { label: "이자소득세", note: "9%", bp: 900 },
      { label: "농어촌특별세", note: "0.5%", bp: 50 },
    ],
  },
  agri: {
    label: "조합 예탁금 비과세",
    rate: 0.014,
    rateLabel: "1.4%",
    lines: [{ label: "농어촌특별세", note: "1.4%", bp: 140 }],
  },
  agri2026: {
    label: "조합 예탁금 2026년 가입",
    rate: 0.059,
    rateLabel: "5.9%",
    lines: [
      { label: "이자소득세", note: "5%", bp: 500 },
      { label: "농어촌특별세", note: "0.9%", bp: 90 },
    ],
  },
  agri2027: {
    label: "조합 예탁금 2027년 이후 가입",
    rate: 0.095,
    rateLabel: "9.5%",
    lines: [
      { label: "이자소득세", note: "9%", bp: 900 },
      { label: "농어촌특별세", note: "0.5%", bp: 50 },
    ],
  },
  exempt: {
    label: "비과세",
    rate: 0,
    rateLabel: "0%",
    lines: [],
  },
};

export const TAX_TYPE_ORDER: TaxType[] = ["general", "preferential", "agri", "agri2026", "agri2027", "exempt"];

/** 조합 예탁금 세 가지 (1인 3천만원 한도가 붙는 과세 구분), 가입 시기 순. */
export const AGRI_TAX_TYPES: AgriTaxType[] = ["agri", "agri2026", "agri2027"];

export function isTaxType(v: string): v is TaxType {
  return (TAX_TYPE_ORDER as string[]).includes(v);
}

export function isAgriTax(t: TaxType): t is AgriTaxType {
  return t === "agri" || t === "agri2026" || t === "agri2027";
}

/** Floor a won amount, tolerating floating-point noise like 113749.99999999999. */
function floorWon(x: number): number {
  return Math.floor(x + 1e-6);
}

/** interest × bp/10000, truncated below 10원. Integer arithmetic for exactness. */
function taxAtBp(interest: number, bp: number): number {
  return Math.floor((interest * bp) / 100_000) * 10;
}

/**
 * Pre-tax interest of a fixed monthly installment savings account, in 원 (원 미만 절사).
 * @param monthly 월 납입액 (원)
 * @param months 납입 개월 수 (= 만기 개월 수)
 * @param ratePct 연 이자율 (%), e.g. 3.5
 */
export function savingsInterest(monthly: number, months: number, ratePct: number, type: InterestType = "simple"): number {
  if (!(monthly > 0) || !(months >= 1) || !(ratePct > 0)) return 0;
  const n = Math.floor(months);
  if (type === "simple") {
    return floorWon((monthly * ratePct * ((n * (n + 1)) / 2)) / 1200);
  }
  const i = ratePct / 1200;
  // Σ_{k=1..n} ((1+i)^k − 1) = (1+i)((1+i)^n − 1)/i − n
  const growth = ((1 + i) * (Math.pow(1 + i, n) - 1)) / i - n;
  return floorWon(monthly * growth);
}

/**
 * Pre-tax interest earned by the first `cap` 원 of installments (앞 회차부터, 마지막은 일부만), in 원 (원 미만 절사).
 * k번째 회차는 (n − k + 1)개월 예치된다. 조합 예탁금 3천만원 한도를 나누는 데 쓴다.
 */
export function savingsInterestOfFirst(
  monthly: number,
  months: number,
  ratePct: number,
  type: InterestType,
  cap: number,
): number {
  if (!(monthly > 0) || !(months >= 1) || !(ratePct > 0) || !(cap > 0)) return 0;
  const n = Math.floor(months);
  const i = ratePct / 1200;
  let left = Math.min(cap, monthly * n);
  // Simple interest: accumulate Σ amount × (months held) and multiply once to limit float noise.
  let amountMonths = 0;
  let compound = 0;
  for (let k = 1; k <= n && left > 0; k++) {
    const amount = Math.min(monthly, left);
    const held = n - k + 1;
    if (type === "simple") amountMonths += amount * held;
    else compound += amount * (Math.pow(1 + i, held) - 1);
    left -= amount;
  }
  return floorWon(type === "simple" ? (amountMonths * ratePct) / 1200 : compound);
}

/** Pre-tax interest of a lump-sum time deposit (정기예금, 단리), in 원. Used for the 적금 vs 예금 comparison. */
export function depositInterest(principal: number, months: number, ratePct: number): number {
  if (!(principal > 0) || !(months >= 1) || !(ratePct > 0)) return 0;
  return floorWon((principal * ratePct * months) / 1200);
}

export type TaxLine = { label: string; note: string; amount: number };

/** Withholding tax on interest, each tax item truncated below 10원 separately. */
export function interestTax(interest: number, taxType: TaxType): { lines: TaxLine[]; total: number } {
  const info = TAX_TYPES[taxType];
  const lines: TaxLine[] = [];
  const base = Math.max(0, Math.floor(interest));
  for (const rule of info.lines) {
    let amount: number;
    if (rule.ofPrevious !== undefined) {
      const prev = lines.length ? lines[lines.length - 1].amount : 0;
      amount = Math.floor((prev * rule.ofPrevious) / 1000) * 10;
    } else {
      amount = taxAtBp(base, rule.bp);
    }
    lines.push({ label: rule.label, note: rule.note, amount });
  }
  return { lines, total: lines.reduce((s, l) => s + l.amount, 0) };
}

export type SavingsInput = {
  monthly: number;
  months: number;
  ratePct: number;
  interestType?: InterestType;
  taxType?: TaxType;
};

export type SavingsResult = {
  /** 원금 합계 */
  principal: number;
  /** 세전 이자 */
  interest: number;
  taxLines: TaxLine[];
  /** 이자과세 합계 */
  tax: number;
  /** 세후 이자 */
  afterTaxInterest: number;
  /** 세후 만기 수령액 */
  maturity: number;
  /** 세후 이자 ÷ 원금 합계 (기간 전체) */
  afterTaxReturn: number;
  /** afterTaxReturn을 1년 기준으로 단순 환산 */
  afterTaxAnnualized: number;
  /** 원금 전체를 처음부터 맡긴 예금이라면 세전 연 몇 %와 같은지 (세전 이자 ÷ 원금 ÷ 년수) */
  depositEquivalentRate: number;
  /**
   * 조합 예탁금(agri·agri2026·agri2027)인데 원금 합계가 3천만원을 넘을 때만 값이 있다.
   * 먼저 넣은 3천만원에 붙는 이자(특례 세율)와 나머지 이자(일반과세 15.4%)로 나눈 내역.
   */
  agriSplit: { cappedInterest: number; excessInterest: number; excessPrincipal: number } | null;
};

/**
 * 상호금융(농협·수협·신협·산림조합·새마을금고) 예탁금 특례(비과세·저율과세) 한도:
 * 1인당 3,000만원, 모든 조합 예탁금 합산 (조특법 제89조의3①).
 */
export const AGRI_EXEMPT_CAP = 30_000_000;

export function calcSavings({ monthly, months, ratePct, interestType = "simple", taxType = "general" }: SavingsInput): SavingsResult {
  const n = Math.floor(months);
  const principal = monthly * n;
  const interest = savingsInterest(monthly, n, ratePct, interestType);

  let lines: TaxLine[];
  let total: number;
  let agriSplit: SavingsResult["agriSplit"] = null;
  if (isAgriTax(taxType) && principal > AGRI_EXEMPT_CAP) {
    // 3천만원 한도 안의 회차 이자는 조합 예탁금 세율(1.4%·5.9%·9.5%), 넘는 회차 이자는 일반과세.
    const cappedInterest = Math.min(interest, savingsInterestOfFirst(monthly, n, ratePct, interestType, AGRI_EXEMPT_CAP));
    const excessInterest = interest - cappedInterest;
    const capped = interestTax(cappedInterest, taxType);
    const excess = interestTax(excessInterest, "general");
    lines = [
      ...capped.lines.map((l) => ({ ...l, note: `3천만원까지 이자의 ${l.note}` })),
      { ...excess.lines[0], note: "초과분 이자의 14%" },
      { ...excess.lines[1], note: "초과분 소득세의 10%" },
    ];
    total = capped.total + excess.total;
    agriSplit = { cappedInterest, excessInterest, excessPrincipal: principal - AGRI_EXEMPT_CAP };
  } else {
    ({ lines, total } = interestTax(interest, taxType));
  }

  const afterTaxInterest = interest - total;
  const years = n / 12;
  const afterTaxReturn = principal > 0 ? afterTaxInterest / principal : 0;
  return {
    principal,
    interest,
    taxLines: lines,
    tax: total,
    afterTaxInterest,
    maturity: principal + afterTaxInterest,
    afterTaxReturn,
    afterTaxAnnualized: years > 0 ? afterTaxReturn / years : 0,
    depositEquivalentRate: principal > 0 && years > 0 ? interest / principal / years : 0,
    agriSplit,
  };
}

/** 월 납입액 상한 10억원: 세금 계산(이자 × bp)이 2^53 안에서 정확하도록 묶어 둔다. */
export const MAX_MONTHLY = 1_000_000_000;
export const MAX_MONTHS = 120;
export const MAX_RATE = 30;

/** Input validity used by the calculator UI. */
export function isValidSavingsInput(monthly: number, months: number, ratePct: number): boolean {
  return (
    Number.isFinite(monthly) &&
    monthly > 0 &&
    monthly <= MAX_MONTHLY &&
    Number.isInteger(months) &&
    months >= 1 &&
    months <= MAX_MONTHS &&
    Number.isFinite(ratePct) &&
    ratePct >= 0 &&
    ratePct <= MAX_RATE
  );
}

/** Defaults rendered in the static HTML. */
export const DEFAULT_MONTHLY = 500_000;
export const DEFAULT_MONTHS = 12;
export const DEFAULT_RATE = 3.5;

export const PERIOD_PRESETS = [6, 12, 24, 36];

/** 월 납입액(만원) landing pages: /savings/<manwon>/ */
export const SAVINGS_PAGE_MONTHLY = [10, 20, 30, 50, 100, 200];

/** Rates (%) and periods (months) used in the programmatic-page tables. */
export const TABLE_RATES = [2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6];
export const TABLE_PERIODS = [6, 12, 24, 36];

/** "12개월" -> "1년", "18개월" -> "18개월" */
export function periodLabel(months: number): string {
  return months % 12 === 0 ? `${months / 12}년` : `${months}개월`;
}

/** 3.5 -> "3.5%", 3 -> "3.0%" for tables (always one decimal). */
export function rateLabel(ratePct: number): string {
  return `${ratePct.toFixed(1)}%`;
}
