/**
 * 복리 계산 (거치식 원금 + 매월 적립).
 *
 * 기호
 *  P = 초기 원금, C = 매월 적립액, R = 연 수익률(명목, 예: 0.05), Y = 기간(년)
 *  i = R / 12 (한 달치 이율), L = 복리 주기 개월 수 (월 1 · 분기 3 · 연 12)
 *
 * 복리 주기 (국내 은행·계산기 관행)
 *  - 월복리: 매달 R/12 의 이자를 원금에 더한다.
 *  - 분기복리: 3개월마다 R/4, 연복리: 12개월마다 R 의 이자를 더한다.
 *  - 주기 안에서는 단리로 쌓는다. 주기 중간에 들어온 적립금은 남은 개월 수 × i 만큼 이자가 붙고,
 *    그 이자는 주기 끝에 원금에 합쳐진 뒤부터 다시 이자를 낳는다.
 *    그래서 연복리 1년 · 월초 적립은 은행 정기적금 단리 공식(월납입 × i × 78)과 같다.
 *  - 단리는 "주기 = 전체 기간"인 특수한 경우다 (이자가 만기에 한 번만 붙는다).
 *
 * 닫힌 식 (j = i × L, N = 12Y / L, 주기 안 적립 개월합 S = 월초 L(L+1)/2 · 월말 L(L−1)/2)
 *  주기마다 들어오는 적립분 D = C × (L + i × S)
 *  만기 금액 = P × (1 + j)^N + D × ((1 + j)^N − 1) / j        (j = 0 이면 P + D × N)
 *  예) 월복리·월말: C × ((1 + i)^n − 1) / i,  월복리·월초: 그 값 × (1 + i)
 *
 * 세금은 "만기에 수익 전체에 15.4%(소득세 14% + 지방소득세 1.4%)를 한 번 낸다"는 단순 가정이다.
 * 각 세목은 10원 미만을 버린다 (국고금 관리법 제47조, 은행 원천징수 관행; savings.ts와 같은 방식).
 *
 * Pure functions only. No React, no Date.
 */

import { formatNumber, formatWon } from "@/lib/format";

export type Compounding = "monthly" | "quarterly" | "yearly";
export type Timing = "begin" | "end";
export type TaxMode = "none" | "general";

export const COMPOUNDING_ORDER: Compounding[] = ["monthly", "quarterly", "yearly"];

/** 복리 주기 개월 수 */
export const COMPOUNDING_MONTHS: Record<Compounding, number> = { monthly: 1, quarterly: 3, yearly: 12 };

export const COMPOUNDING_LABEL: Record<Compounding, string> = {
  monthly: "월복리",
  quarterly: "분기복리",
  yearly: "연복리",
};

export const TIMING_LABEL: Record<Timing, string> = { begin: "월초 적립", end: "월말 적립" };

export function isCompounding(v: string): v is Compounding {
  return v === "monthly" || v === "quarterly" || v === "yearly";
}

export function isTiming(v: string): v is Timing {
  return v === "begin" || v === "end";
}

export function isTaxMode(v: string): v is TaxMode {
  return v === "none" || v === "general";
}

export type CompoundInput = {
  /** 초기 원금 (원) */
  principal: number;
  /** 매월 적립액 (원) */
  monthly: number;
  /** 연 수익률 (%), 예: 5 */
  ratePct: number;
  /** 기간 (년, 정수) */
  years: number;
  compounding?: Compounding;
  timing?: Timing;
};

export type YearRow = {
  year: number;
  /** 누적 납입 원금 (원) */
  contributed: number;
  /** 연말 평가금액 (원, 반올림) */
  balance: number;
  /** 평가금액 − 누적 납입 */
  gain: number;
};

export type CompoundResult = {
  /** 총 납입 원금 = P + C × 12Y */
  contributed: number;
  /** 만기 금액 (세전, 원 단위 반올림) */
  balance: number;
  /** 총 수익 = 만기 금액 − 총 납입 원금 */
  gain: number;
  /** 수익률(누적) = 총 수익 ÷ 총 납입 원금 */
  gainRatio: number;
  /** 연 실효수익률 (1 + R/m)^m − 1 */
  effectiveAnnual: number;
  /** 1년차 ~ Y년차 연말 기준 */
  rows: YearRow[];
};

/** 납입 회차를 원 단위로 표시할 때 쓰는 반올림 (부동소수 잡음 제거). */
function won(x: number): number {
  return Math.round(x);
}

/**
 * Month-by-month simulation. `periodMonths` is the crediting period (1, 3, 12, or the whole term for 단리).
 * Returns the balance at the end of every year (all accrued interest credited, since 12 is a multiple of 1/3/12).
 */
function simulate(
  principal: number,
  monthly: number,
  ratePct: number,
  years: number,
  periodMonths: number,
  timing: Timing,
): number[] {
  const i = ratePct / 1200;
  const n = years * 12;
  let credited = principal;
  let pending = 0;
  const yearEnd: number[] = [];
  for (let m = 1; m <= n; m++) {
    if (timing === "begin") credited += monthly;
    pending += credited * i;
    if (timing === "end") credited += monthly;
    if (m % periodMonths === 0 || m === n) {
      credited += pending;
      pending = 0;
    }
    // 단리(주기 = 전체 기간)에서도 연말 평가금액은 그때까지 쌓인 이자를 포함해 보여 준다.
    if (m % 12 === 0) yearEnd.push(credited + pending);
  }
  return yearEnd;
}

/** 만기 금액 닫힌 식 (테스트와 프로그래매틱 표에서 사용). 반올림하지 않은 값. */
export function futureValue({
  principal,
  monthly,
  ratePct,
  years,
  compounding = "monthly",
  timing = "begin",
}: CompoundInput): number {
  return futureValueWithPeriod(principal, monthly, ratePct, years, COMPOUNDING_MONTHS[compounding], timing);
}

function futureValueWithPeriod(
  principal: number,
  monthly: number,
  ratePct: number,
  years: number,
  L: number,
  timing: Timing,
): number {
  const i = ratePct / 1200;
  const j = i * L;
  const N = (years * 12) / L;
  const S = timing === "begin" ? (L * (L + 1)) / 2 : (L * (L - 1)) / 2;
  const D = monthly * (L + i * S);
  if (j === 0) return principal + D * N;
  const g = Math.pow(1 + j, N);
  return principal * g + (D * (g - 1)) / j;
}

/** 단리 만기 금액: 이자가 만기에 한 번만 붙는다 (원금 × R × Y + 적립 회차별 남은 개월 × i). */
export function simpleValue(principal: number, monthly: number, ratePct: number, years: number, timing: Timing = "begin"): number {
  return futureValueWithPeriod(principal, monthly, ratePct, years, years * 12, timing);
}

/** 연 실효수익률: (1 + R/m)^m − 1, m = 연간 복리 횟수 */
export function effectiveAnnualRate(ratePct: number, compounding: Compounding): number {
  const m = 12 / COMPOUNDING_MONTHS[compounding];
  return Math.pow(1 + ratePct / 100 / m, m) - 1;
}

export function calcCompound(input: CompoundInput): CompoundResult {
  const { principal, monthly, ratePct, years, compounding = "monthly", timing = "begin" } = input;
  const ends = simulate(principal, monthly, ratePct, years, COMPOUNDING_MONTHS[compounding], timing);
  const rows: YearRow[] = ends.map((b, k) => {
    const year = k + 1;
    const contributed = principal + monthly * 12 * year;
    const balance = won(b);
    return { year, contributed, balance, gain: balance - contributed };
  });
  const last = rows[rows.length - 1];
  const contributed = principal + monthly * 12 * years;
  const balance = last ? last.balance : won(principal);
  const gain = balance - contributed;
  return {
    contributed,
    balance,
    gain,
    gainRatio: contributed > 0 ? gain / contributed : 0,
    effectiveAnnual: effectiveAnnualRate(ratePct, compounding),
    rows,
  };
}

/* ---------------- 세금 (단순 가정) ---------------- */

/** 이자·배당소득 원천징수: 소득세 14% (소득세법 제129조①) + 지방소득세 = 소득세의 10% (지방세법 제103조의13) */
export const GAIN_TAX_RATE = 0.154;

export type GainTax = { incomeTax: number; localTax: number; total: number };

/** 이자·배당소득이 1년에 이 금액을 넘으면 종합과세 대상 (소득세법 제14조③6호). */
export const COMPREHENSIVE_TAX_THRESHOLD = 20_000_000;

/** 수익 전체에 만기 한 번 과세한다고 가정한 세금. 세목별 10원 미만 절사. */
export function gainTax(gain: number): GainTax {
  const base = Math.max(0, Math.floor(gain));
  const incomeTax = Math.floor((base * 14) / 1000) * 10;
  const localTax = Math.floor(incomeTax / 100) * 10;
  return { incomeTax, localTax, total: incomeTax + localTax };
}

/* ---------------- 물가 · 72의 법칙 ---------------- */

/** 실질 가치 = 명목 금액 ÷ (1 + 물가상승률)^년수 (오늘 돈 가치로 환산) */
export function realValue(amount: number, inflationPct: number, years: number): number {
  return amount / Math.pow(1 + inflationPct / 100, years);
}

/** 72의 법칙: 원금이 두 배가 되는 대략의 햇수 = 72 ÷ 연 수익률(%) */
export function rule72Years(ratePct: number): number {
  return ratePct > 0 ? 72 / ratePct : Infinity;
}

/** 정확한 2배 기간 = ln 2 ÷ (m × ln(1 + R/m)) */
export function doublingYears(ratePct: number, compounding: Compounding = "yearly"): number {
  if (!(ratePct > 0)) return Infinity;
  const m = 12 / COMPOUNDING_MONTHS[compounding];
  return Math.log(2) / (m * Math.log(1 + ratePct / 100 / m));
}

/* ---------------- 입력 범위 ---------------- */

export const MAX_PRINCIPAL = 10_000_000_000; // 100억원
export const MAX_MONTHLY = 100_000_000; // 1억원
export const MAX_RATE = 30;
export const MIN_YEARS = 1;
export const MAX_YEARS = 50;
export const MAX_INFLATION = 20;

/**
 * 결과를 원 단위까지 정확히 보여 줄 수 있는 상한 (1,000조원).
 * 입력 상한을 모두 채우면(100억 + 월 1억 · 연 30% · 50년) 만기 금액이 Number.MAX_SAFE_INTEGER(약 9,007조)를 넘어
 * 끝자리가 부정확해지므로, 이 값을 넘는 결과는 숫자 대신 안내 문구를 보여 준다.
 */
export const MAX_BALANCE = 1_000_000_000_000_000;

export const DEFAULT_PRINCIPAL = 10_000_000;
export const DEFAULT_MONTHLY = 500_000;
export const DEFAULT_RATE = 5;
export const DEFAULT_YEARS = 10;

export function isValidCompoundInput(principal: number, monthly: number, ratePct: number, years: number): boolean {
  return (
    Number.isFinite(principal) &&
    principal >= 0 &&
    principal <= MAX_PRINCIPAL &&
    Number.isFinite(monthly) &&
    monthly >= 0 &&
    monthly <= MAX_MONTHLY &&
    principal + monthly > 0 &&
    Number.isFinite(ratePct) &&
    ratePct >= 0 &&
    ratePct <= MAX_RATE &&
    Number.isInteger(years) &&
    years >= MIN_YEARS &&
    years <= MAX_YEARS
  );
}

/* ---------------- 표시 도우미 ---------------- */

const JO = 1_000_000_000_000;
const EOK = 100_000_000;
const MAN = 10_000;

/**
 * 만원 단위로 반올림한 한국식 금액 (요약용): 155,929,289 → "1억 5,593만원",
 * 1,453,699,232,997 → "1조 4,536억 9,923만원" (1만원 미만은 원 단위).
 * 사용자가 입력한 금액처럼 정확해야 하는 곳에는 koreanWon/formatWon을 쓴다.
 */
export function approxWon(n: number): string {
  if (!Number.isFinite(n)) return "-";
  if (Math.abs(Math.round(n)) < MAN) return formatWon(n);
  const v = Math.round(n / MAN) * MAN;
  const neg = v < 0;
  let a = Math.abs(v);
  const jo = Math.floor(a / JO);
  a -= jo * JO;
  const eok = Math.floor(a / EOK);
  a -= eok * EOK;
  const man = Math.round(a / MAN);
  const parts: string[] = [];
  if (jo) parts.push(`${formatNumber(jo)}조`);
  if (eok) parts.push(`${formatNumber(eok)}억`);
  if (man) parts.push(`${formatNumber(man)}만`);
  return `${neg ? "-" : ""}${parts.join(" ")}원`;
}

/** Axis label: 0 → "0", 25,000 → "2.5만", 50,000,000 → "5,000만", 125,000,000 → "1.25억", 1.5조 → "1.5조". */
export function axisLabel(n: number): string {
  if (n === 0) return "0";
  if (n >= JO) return `${(n / JO).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}조`;
  if (n >= EOK) return `${(n / EOK).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}억`;
  if (n >= 10_000) return `${(n / 10_000).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}만`;
  return n.toLocaleString("ko-KR");
}

/** A "nice" axis step (1, 2, 2.5, 5 × 10^k) so that `max` fits in about `ticks` gridlines. */
export function niceStep(max: number, ticks = 4): number {
  if (!(max > 0)) return 1;
  const raw = max / ticks;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const f of [1, 2, 2.5, 5, 10]) {
    if (f * pow >= raw) return f * pow;
  }
  return 10 * pow;
}

/* ---------------- 프로그래매틱 시나리오 ---------------- */

export type Scenario = {
  slug: string;
  /** 초기 원금 (원) */
  principal: number;
  /** 매월 적립액 (원) */
  monthly: number;
  years: number;
  ratePct: number;
  /** 제목·링크용 짧은 이름, 예: "월 100만원 10년" */
  label: string;
  /** 이 시나리오를 찾는 상황 설명 (합니다체, 숫자 계산 없이) */
  context: string;
  keywords: string[];
};

/** URL slug: monthly-<만원>-<년>y-<%> 또는 lump-<만원>-<년>y-<%> */
export function scenarioSlug(s: Pick<Scenario, "principal" | "monthly" | "years" | "ratePct">): string {
  const kind = s.monthly > 0 ? "monthly" : "lump";
  const manwon = (s.monthly > 0 ? s.monthly : s.principal) / 10_000;
  return `${kind}-${manwon}-${s.years}y-${s.ratePct}`;
}

/** 검색 수요가 있는 대표 조합. 계산은 모두 월복리 · 월초 적립(계산기 기본값). */
export const SCENARIOS: Scenario[] = [
  {
    slug: "monthly-10-30y-10",
    principal: 0,
    monthly: 100_000,
    years: 30,
    ratePct: 10,
    label: "월 10만원 30년",
    context:
      "월 10만원을 미국 S&P 500 지수 상품에 30년 동안 넣으면 얼마가 되는지는 적립식 투자를 처음 시작할 때 가장 많이 찾는 계산입니다. 연 10%는 S&P 500의 장기 연평균 수익률(배당 재투자, 달러 기준, 물가 반영 전)로 흔히 인용되는 값이지만, 과거 수익률이 앞으로도 이어진다는 보장은 없고 환율과 세금에 따라 원화 기준 결과도 달라집니다.",
    keywords: ["월 10만원 30년 복리", "월 10만원 S&P500 30년", "10만원씩 30년 투자"],
  },
  {
    slug: "monthly-30-20y-5",
    principal: 0,
    monthly: 300_000,
    years: 20,
    ratePct: 5,
    label: "월 30만원 20년",
    context:
      "월 30만원은 연금저축이나 개인형 퇴직연금(IRP)에 매달 꾸준히 넣는 금액으로 많이 계산합니다. 연 5%는 주식과 채권을 섞은 자산배분을 가정할 때 쓰는 비교적 보수적인 수익률입니다. 연금 계좌는 수익에 바로 15.4%를 떼지 않고 나중에 연금으로 받을 때 연금소득세를 내므로, 세후 금액은 이 계산의 단순 가정과 다릅니다.",
    keywords: ["월 30만원 20년 복리", "월 30만원 적립식 20년", "30만원씩 20년 모으면"],
  },
  {
    slug: "monthly-50-30y-7",
    principal: 0,
    monthly: 500_000,
    years: 30,
    ratePct: 7,
    label: "월 50만원 30년",
    context:
      "월 50만원을 30년 동안 넣는 계획은 30대 초반에 시작해 60대 초반 은퇴 시점까지 노후 자금을 모으는 시나리오로 자주 계산합니다. 기간이 길어서 수익률 1%p 차이가 만기 금액을 크게 바꾸므로, 아래 수익률별 표를 함께 보는 것이 좋습니다.",
    keywords: ["월 50만원 30년 복리", "월 50만원 30년 7%", "50만원씩 30년 투자"],
  },
  {
    slug: "monthly-100-10y-5",
    principal: 0,
    monthly: 1_000_000,
    years: 10,
    ratePct: 5,
    label: "월 100만원 10년",
    context:
      "월 100만원 10년은 ‘10년 안에 1억 모으기’ 목표를 세울 때 가장 많이 확인하는 조합입니다. 납입 원금만 1억 2,000만원이라 수익이 붙으면 1억을 넉넉히 넘기고, 같은 목표를 더 짧은 기간에 이루려면 월 적립액을 늘려야 합니다.",
    keywords: ["월 100만원 10년 복리", "월 100만원 10년 5%", "100만원씩 10년 모으면"],
  },
  {
    slug: "monthly-100-20y-7",
    principal: 0,
    monthly: 1_000_000,
    years: 20,
    ratePct: 7,
    label: "월 100만원 20년",
    context:
      "월 100만원을 20년 동안 투자하면 납입 원금은 2억 4,000만원입니다. 기간이 길어 후반부로 갈수록 해마다 붙는 수익이 그해 넣는 원금 1,200만원보다 커지는 복리 효과를 뚜렷하게 볼 수 있습니다.",
    keywords: ["월 100만원 20년 복리", "월 100만원 20년 투자", "100만원씩 20년 7%"],
  },
  {
    slug: "lump-1000-10y-5",
    principal: 10_000_000,
    monthly: 0,
    years: 10,
    ratePct: 5,
    label: "1,000만원 10년",
    context:
      "목돈 1,000만원을 한 번 넣어 두고 10년 동안 추가 납입 없이 굴리는 거치식 시나리오입니다. 사회초년생이 처음 모은 목돈이나 당장 쓸 일이 없는 여유 자금을 장기로 묶어 둘 때 많이 계산합니다.",
    keywords: ["1000만원 복리 10년", "1000만원 10년 5%", "천만원 복리 계산"],
  },
  {
    slug: "lump-5000-10y-4",
    principal: 50_000_000,
    monthly: 0,
    years: 10,
    ratePct: 4,
    label: "5,000만원 10년",
    context:
      "5,000만원을 연 4% 안팎의 예금·채권형 상품에 10년 묶어 두는 시나리오입니다. 이자가 원금에 붙어 다시 이자를 낳는 구조라면 이 계산과 같고, 이자를 해마다 찾아 쓰면 단리와 같아집니다.",
    keywords: ["5000만원 복리 10년", "5천만원 10년 4%", "5천만원 굴리기"],
  },
  {
    slug: "lump-10000-20y-5",
    principal: 100_000_000,
    monthly: 0,
    years: 20,
    ratePct: 5,
    label: "1억 20년",
    context:
      "퇴직금이나 모아 둔 목돈 1억원을 연 5%로 20년 동안 굴리는 경우입니다. 수익을 꺼내 쓰지 않고 계속 재투자한다는 가정이라, 해마다 이자를 생활비로 쓸 계획이라면 아래 ‘복리 방식에 따른 차이’ 표의 단리 금액이 더 현실적입니다.",
    keywords: ["1억 복리 20년", "1억 연 5% 20년", "1억 20년 굴리면"],
  },
];

export function findScenario(slug: string): Scenario | null {
  return SCENARIOS.find((s) => s.slug === slug) ?? null;
}

/** 수익률·기간 비교표에 쓰는 값 */
export const TABLE_RATES = [2, 3, 4, 5, 6, 7, 8, 10];
export const TABLE_YEARS = [5, 10, 15, 20, 25, 30, 40];
