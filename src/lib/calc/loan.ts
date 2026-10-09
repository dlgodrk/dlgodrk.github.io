/**
 * 대출 상환 계산: 원리금균등 · 원금균등 · 만기일시 상환, 거치기간 지원.
 *
 * 월 이율 r = 연 이율 ÷ 12. 은행과 한국주택금융공사 월 상환액 계산기가 쓰는 표준 방식이다.
 * 실제 은행 이자는 일수(연 365일) 기준이라 30일·31일 달에 따라 회차별 이자가 조금씩 달라진다.
 * (한국주택금융공사 월 상환액 계산 안내: https://www.hf.go.kr/ko/sub01/sub01_06_03.do)
 *
 * 원 단위 처리 (스케줄 전체에 같은 규칙을 적용):
 *  - 회차 이자 = round(직전 잔액 × r)                 원 미만 반올림
 *  - 잔액이 그대로인 달(거치기간, 만기일시)은 누적 이자를 반올림해 차이를 낸다:
 *    k회차 이자 = round(P × r × k) − round(P × r × (k − 1)). 달마다 1원씩 다를 수 있지만
 *    합계가 P × 연 이율 × 기간과 정확히 맞는다 (1억 · 4% · 30년 만기일시 → 총 이자 1억 2,000만원).
 *  - 원리금균등 납입액 = round(PMT)로 고정 (은행 상환표와 같은 방식). 고정 납입액의 끝전 오차는
 *    마지막 회차에서 정리되며, 현실적인 조건(연 10% · 30년, 연 6% · 50년 이하)에서는 2천 원 안쪽이다.
 *    (오차는 금리 × 기간에 따라 지수적으로 커져 연 20% · 50년 같은 비현실적 조건에서는 마지막 회차가 크게 달라진다.
 *    잔액 × 월 이율 = 이자라는 회차별 일관성을 지키는 한 피할 수 없는 성질이라 그대로 둔다.)
 *  - 원금균등 회차 원금 = floor(P ÷ 상환개월수), 나머지(상환개월수 미만의 원)는 앞 회차부터 1원씩 더 갚는다.
 *    모든 회차에 원금이 들어가고 납입액이 늘지 않는다. 금리 0%인 원리금균등도 같은 방식으로 나눈다.
 *  - 마지막 회차는 남은 원금을 전부 갚아 잔액을 0원으로 맞춘다 (끝전 정리)
 *  - 총 이자 = 회차별 (반올림된) 이자의 합, 총 상환액 = 원금 + 총 이자
 *
 * 거치기간: 대출기간에 포함된다. 거치 g개월 동안은 이자만 내고, 남은 (n − g)개월 동안 원금을 나눠 갚는다.
 * 만기일시상환은 처음부터 끝까지 이자만 내므로 거치기간을 적용하지 않는다.
 */
import { formatNumber, formatWon, manwonLabel } from "@/lib/format";

export type RepayMethod = "equal-payment" | "equal-principal" | "bullet";

export const REPAY_METHODS: RepayMethod[] = ["equal-payment", "equal-principal", "bullet"];

export const METHOD_LABEL: Record<RepayMethod, string> = {
  "equal-payment": "원리금균등",
  "equal-principal": "원금균등",
  bullet: "만기일시",
};

/** 입력 한도: 100억원, 연 30%, 50년(600개월). */
export const MAX_PRINCIPAL = 10_000_000_000;
export const MAX_RATE_PCT = 30;
export const MAX_MONTHS = 600;

export type LoanInput = {
  /** 대출원금 (원) */
  principal: number;
  /** 연 이자율 (%), 예: 4.5 */
  annualRatePct: number;
  /** 총 대출기간 (개월, 거치기간 포함) */
  months: number;
  /** 거치기간 (개월). 만기일시상환에서는 무시한다. */
  graceMonths?: number;
  method: RepayMethod;
};

export type ScheduleRow = {
  /** 회차 (1부터) */
  n: number;
  /** 상환원금 */
  principal: number;
  /** 이자 */
  interest: number;
  /** 납입액 = 상환원금 + 이자 */
  payment: number;
  /** 납입 후 대출잔액 */
  balance: number;
  /** 거치기간(이자만 내는) 회차인지 */
  grace: boolean;
};

export type LoanResult = {
  method: RepayMethod;
  principal: number;
  months: number;
  /** 실제 적용된 거치기간 (만기일시는 0) */
  graceMonths: number;
  /** 원금을 나눠 갚는 개월 수 (만기일시는 전체 기간) */
  amortMonths: number;
  rows: ScheduleRow[];
  totalInterest: number;
  totalPayment: number;
  /** 거치기간 중 월 납입액(이자만). 거치기간이 없으면 0 */
  gracePayment: number;
  /** 거치기간이 끝난 뒤 첫 회차 납입액 (만기일시는 첫 달 이자) */
  firstPayment: number;
  /** 마지막 회차 납입액 (만기일시는 원금 + 마지막 달 이자) */
  lastPayment: number;
  /** 원금균등에서 회차마다 줄어드는 납입액(대략). 다른 방식은 0 */
  monthlyDecrease: number;
};

/** 연 이율(%) → 월 이율(소수). 4 → 0.003333… */
export function monthlyRate(annualRatePct: number): number {
  return annualRatePct / 100 / 12;
}

/**
 * 원리금균등 월 납입액 (반올림 전). PMT = P·r(1+r)^n / ((1+r)^n − 1), r = 0이면 P / n.
 */
export function equalPaymentAmount(principal: number, r: number, n: number): number {
  if (!(n > 0)) return NaN;
  if (r === 0) return principal / n;
  const f = Math.pow(1 + r, n);
  return (principal * r * f) / (f - 1);
}

/**
 * 은행처럼 실제 일수(1년 365일)로 이자를 매길 때, 이 계산기(연 이율 ÷ 12)보다 한 달 이자가
 * 31일인 달은 얼마나 많고(longMonth) 28일인 2월은 얼마나 적은지(february). 잔액은 그대로라고 본다.
 * 1억원 · 연 4% → 31일 339,726원 vs 333,333원 (+6,393원), 28일 306,849원 (−26,484원).
 */
export function dayCountGap(balance: number, annualRatePct: number): { longMonth: number; february: number } {
  const monthly = Math.round((balance * annualRatePct) / 1200);
  const byDays = (days: number) => Math.round((balance * annualRatePct * days) / 36500);
  return { longMonth: byDays(31) - monthly, february: monthly - byDays(28) };
}

/**
 * Cleans the text typed into a decimal box while keeping what is mid-entry: "4." and "0.0" stay
 * as typed, so 4.05 can be typed key by key. Digits and the first dot only, at most `decimals`
 * fraction digits, no leading zeros, thousands grouped. decimals = 0 drops the dot entirely.
 */
export function sanitizeDecimalDraft(raw: string, decimals: number): string {
  const body = raw.replace(/[^\d.]/g, "");
  const [intRaw, ...rest] = body.split(".");
  const hasDot = decimals > 0 && rest.length > 0;
  let int = intRaw.replace(/^0+(?=\d)/, "");
  if (hasDot && int === "") int = "0";
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return hasDot ? `${grouped}.${rest.join("").slice(0, decimals)}` : grouped;
}

/** 입력 검증. 문제가 없으면 null, 있으면 사용자에게 보여 줄 문장. */
export function validateLoan(input: LoanInput): string | null {
  const { principal, annualRatePct, months, method } = input;
  const grace = input.graceMonths ?? 0;
  if (!Number.isFinite(principal) || principal < 1) return "대출금액을 1원 이상으로 입력해 주세요.";
  if (principal > MAX_PRINCIPAL) return "대출금액은 100억원까지 계산할 수 있어요.";
  if (!Number.isFinite(annualRatePct) || annualRatePct < 0) return "연 이자율을 0% 이상으로 입력해 주세요.";
  if (annualRatePct > MAX_RATE_PCT) return `연 이자율은 ${MAX_RATE_PCT}%까지 입력할 수 있어요.`;
  if (!Number.isFinite(months) || Math.round(months) < 1) return "대출기간을 1개월 이상으로 입력해 주세요.";
  if (Math.round(months) > MAX_MONTHS) return "대출기간은 50년(600개월)까지 계산할 수 있어요.";
  if (method !== "bullet") {
    if (!Number.isFinite(grace) || grace < 0) return "거치기간을 0개월 이상으로 입력해 주세요.";
    if (Math.round(grace) >= Math.round(months)) return "거치기간은 대출기간보다 짧아야 해요.";
  }
  return null;
}

/** 회차별 상환 스케줄과 합계. 입력은 validateLoan을 통과했다고 가정한다. */
export function calcLoan(input: LoanInput): LoanResult {
  const P = Math.round(input.principal);
  const n = Math.round(input.months);
  const pct = input.annualRatePct;
  const r = monthlyRate(pct);
  const g = input.method === "bullet" ? 0 : Math.max(0, Math.min(n - 1, Math.round(input.graceMonths ?? 0)));
  const m = n - g;

  const rows: ScheduleRow[] = [];
  let balance = P;
  const push = (principal: number, interest: number, grace: boolean) => {
    balance -= principal;
    rows.push({ n: rows.length + 1, principal, interest, payment: principal + interest, balance, grace });
  };

  // k-th month of interest on the untouched principal (거치기간, 만기일시). Rounding the running
  // total keeps the sum exact: Σ = round(P × 연 이율 × k / 12). P × pct × k is computed before
  // dividing so integer inputs stay exact in floating point.
  const cumulative = (k: number) => Math.round((P * pct * k) / 1200);
  const flatInterest = (k: number) => cumulative(k) - cumulative(k - 1);

  // Equal principal split: floor(P/m) every month, the remainder (< m원) 1원 each to the first
  // months. Every installment carries principal and the principal never rises.
  const base = Math.floor(P / m);
  const extra = P - base * m;
  const splitPrincipal = (i: number) => base + (i <= extra ? 1 : 0);

  for (let i = 1; i <= g; i++) push(0, flatInterest(i), true);

  if (input.method === "equal-payment" && r > 0) {
    const pay = Math.round(equalPaymentAmount(P, r, m));
    for (let i = 1; i <= m; i++) {
      const interest = Math.round(balance * r);
      const principal = i === m ? balance : Math.min(balance, Math.max(0, pay - interest));
      push(principal, interest, false);
    }
  } else if (input.method === "equal-payment" || input.method === "equal-principal") {
    // 원금균등, and 원리금균등 at 0% (the two methods coincide when there is no interest).
    for (let i = 1; i <= m; i++) {
      const interest = Math.round(balance * r);
      const principal = i === m ? balance : Math.min(balance, splitPrincipal(i));
      push(principal, interest, false);
    }
  } else {
    for (let i = 1; i <= n; i++) push(i === n ? balance : 0, flatInterest(i), false);
  }

  const totalInterest = rows.reduce((sum, row) => sum + row.interest, 0);
  const first = rows[g];
  return {
    method: input.method,
    principal: P,
    months: n,
    graceMonths: g,
    amortMonths: m,
    rows,
    totalInterest,
    totalPayment: P + totalInterest,
    gracePayment: g > 0 ? rows[0].payment : 0,
    firstPayment: first.payment,
    lastPayment: rows[rows.length - 1].payment,
    monthlyDecrease: input.method === "equal-principal" && m >= 2 ? Math.round((P / m) * r) : 0,
  };
}

/** 같은 조건으로 세 가지 상환방식을 모두 계산한다 (비교표용). */
export function compareMethods(input: Omit<LoanInput, "method">): Record<RepayMethod, LoanResult> {
  return {
    "equal-payment": calcLoan({ ...input, method: "equal-payment" }),
    "equal-principal": calcLoan({ ...input, method: "equal-principal" }),
    bullet: calcLoan({ ...input, method: "bullet" }),
  };
}

/* ---------- programmatic pages: /loan/<만원>/ ---------- */

/** 대출금액(만원)별 랜딩 페이지. 1,000만원 ~ 5억원. */
export const LOAN_PAGE_MANWON = [1000, 2000, 3000, 5000, 7000, 10000, 15000, 20000, 30000, 40000, 50000];

/** 금액별 표에 쓰는 연 이자율(%) */
export const LOAN_TABLE_RATES = [3.0, 3.5, 4.0, 4.5, 5.0, 6.0];

/**
 * 예시 문장과 계산기 기본값에 쓰는 연 이자율(%). 시장 금리 주장이 아니라 비교용 기준값이다.
 * /loan/ 페이지 본문이 "연 4%"라고 적고 있으니 바꾸면 본문도 함께 고친다.
 */
export const LOAN_EXAMPLE_RATE = 4.0;

/**
 * 금액별 표에 넣을 대출기간(년). 소액은 신용대출처럼 짧게, 1억원 이상은 주택담보대출처럼 길게 본다.
 */
export function loanTableYears(manwon: number): number[] {
  if (manwon <= 3000) return [1, 3, 5, 10];
  if (manwon <= 7000) return [1, 3, 5, 10, 20];
  if (manwon <= 20000) return [3, 5, 10, 20, 30];
  return [5, 10, 20, 30];
}

/** 금액별 대표 대출기간(년): 계산기 기본값과 본문 예시에 쓴다. */
export function loanDefaultYears(manwon: number): number {
  if (manwon <= 3000) return 5;
  if (manwon <= 7000) return 10;
  return 30;
}

/** 페이지 제목용 금액 표기. 10000 → "1억", 15000 → "1억 5,000만원", 3000 → "3,000만원" */
export function loanAmountLabel(manwon: number): string {
  if (manwon >= 10000 && manwon % 10000 === 0) return `${manwon / 10000}억`;
  return manwonLabel(manwon);
}

/** 원리금균등 월 납입액(원 단위 반올림)과 총 이자. 표 계산용 지름길. */
export function equalPaymentSummary(principal: number, annualRatePct: number, years: number) {
  const res = calcLoan({ principal, annualRatePct, months: years * 12, method: "equal-payment" });
  return { payment: res.firstPayment, totalInterest: res.totalInterest, totalPayment: res.totalPayment };
}

/**
 * /loan/<만원>/ 페이지의 title과 H1. 대표 답(연 4% · 대표 기간 · 원리금균등 월 상환액)을 넣어
 * 페이지마다 제목이 달라지게 한다. title은 사이트 이름을 뺀 45자 이하.
 * 1억 → title "1억 대출 이자 - 연 4% 30년 월 상환액 477,415원", h1 "1억 대출 이자: 연 4% 30년이면 월 477,415원"
 */
export function loanPageHeadline(manwon: number): { title: string; h1: string } {
  const label = loanAmountLabel(manwon);
  const years = loanDefaultYears(manwon);
  const pay = formatWon(equalPaymentSummary(manwon * 10_000, LOAN_EXAMPLE_RATE, years).payment);
  const terms = `연 ${formatNumber(LOAN_EXAMPLE_RATE, 2)}% ${years}년`;
  return {
    title: `${label} 대출 이자 - ${terms} 월 상환액 ${pay}`,
    h1: `${label} 대출 이자: ${terms}이면 월 ${pay}`,
  };
}
