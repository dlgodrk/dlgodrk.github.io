/**
 * 출산 예정일 (estimated due date, EDD) and gestational age.
 *
 * Every method is reduced to one anchor: the "pregnancy start" (임신 0주 0일), i.e. the
 * first day of the last menstrual period (LMP) or its equivalent. Then
 *   EDD = start + 280일 (40주)
 *   gestational age today = today − start
 *
 * - LMP (Naegele's rule, 28-day-cycle assumption): EDD = LMP + 280일.
 *   Cycle-length correction (modified Naegele): EDD = LMP + 280 + (주기 − 28)일,
 *   because ovulation happens about 14 days before the next period.
 * - Conception / ovulation date: EDD = 수정일 + 266일 (38주). start = 수정일 − 14일.
 * - IVF (fresh or frozen): EDD = 이식일 + 266 − 배아 일수 → 5일 배아 +261일, 3일 배아 +263일.
 *   ACOG Committee Opinion No. 700 (2017, "Methods for Estimating the Due Date"):
 *   EDD for a day-5 embryo is 261 days from transfer, for a day-3 embryo 263 days.
 *
 * Term definitions (ACOG CO 579; 대한산부인과학회 일반인 의학정보 「조산」·「지연임신」):
 *   37주 0일 미만 조산, 37주 0일~41주 6일 만삭 범위, 42주 0일(294일) 이상 지연 임신.
 *
 * Pure functions only (no Date.now()).
 */
import { addDays, addMonths, diffDays, type YMD } from "@/lib/date";

export type DueMode = "lmp" | "con" | "ivf";
export type EmbryoDay = 3 | 5;

/** LMP → EDD, 40 weeks. */
export const PREGNANCY_DAYS = 280;
/** Ovulation/conception is assumed 14 days after the LMP start of a 28-day cycle. */
export const OVULATION_OFFSET = 14;
/** Conception → EDD, 38 weeks. */
export const CONCEPTION_TO_DUE = PREGNANCY_DAYS - OVULATION_OFFSET; // 266

export const DEFAULT_CYCLE = 28;
export const MIN_CYCLE = 21;
export const MAX_CYCLE = 40;

/** 37주 0일: start of term (만삭). */
export const TERM_START_DAYS = 37 * 7; // 259
/** 42주 0일: post-term (지연 임신). */
export const POST_TERM_DAYS = 42 * 7; // 294

/** Example start used for the calculator's prefilled date: 8 weeks before the build date. */
export const SAMPLE_WEEKS_AGO = 8;

export type DueOptions = { cycle?: number; embryoDay?: EmbryoDay };

/** Integer cycle length clamped to 21–40; anything invalid falls back to 28. */
export function clampCycle(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_CYCLE;
  return Math.min(MAX_CYCLE, Math.max(MIN_CYCLE, Math.round(n)));
}

/** Only 3-day and 5-day (blastocyst) embryos are supported; default 5. */
export function normalizeEmbryoDay(n: number): EmbryoDay {
  return n === 3 ? 3 : 5;
}

/** Days added to the reference date to reach the due date. */
export function daysToDue(mode: DueMode, opts: DueOptions = {}): number {
  if (mode === "con") return CONCEPTION_TO_DUE;
  if (mode === "ivf") return CONCEPTION_TO_DUE - normalizeEmbryoDay(opts.embryoDay ?? 5);
  return PREGNANCY_DAYS + (clampCycle(opts.cycle ?? DEFAULT_CYCLE) - DEFAULT_CYCLE);
}

/** 임신 0주 0일 (LMP-equivalent) for a reference date entered in the given mode. */
export function pregnancyStart(mode: DueMode, date: YMD, opts: DueOptions = {}): YMD {
  return addDays(date, daysToDue(mode, opts) - PREGNANCY_DAYS);
}

/** Inverse of pregnancyStart: the reference date (LMP, conception or transfer) for a start. */
export function referenceDateFromStart(mode: DueMode, start: YMD, opts: DueOptions = {}): YMD {
  return addDays(start, PREGNANCY_DAYS - daysToDue(mode, opts));
}

/** Estimated due date. */
export function dueDate(mode: DueMode, date: YMD, opts: DueOptions = {}): YMD {
  return addDays(date, daysToDue(mode, opts));
}

/** Estimated conception (≈ ovulation) date for a pregnancy start. */
export function conceptionFromStart(start: YMD): YMD {
  return addDays(start, OVULATION_OFFSET);
}

/** Calendar date of a given gestational age (weeks + days) for a pregnancy start. */
export function dateAtGestation(start: YMD, weeks: number, days = 0): YMD {
  return addDays(start, weeks * 7 + days);
}

export type GestationalAge = { totalDays: number; weeks: number; days: number };

/** Gestational age on `on`. totalDays may be negative (before the pregnancy start). */
export function gestationalAge(start: YMD, on: YMD): GestationalAge {
  const totalDays = diffDays(start, on);
  const abs = Math.abs(totalDays);
  return { totalDays, weeks: Math.floor(abs / 7), days: abs % 7 };
}

/**
 * Has the pregnancy (임신 0주 0일) started on `today`?
 * - "lmp-future": LMP mode and the entered LMP is after today (reported as an input problem,
 *   even when a short cycle pulls the corrected start to today or earlier).
 * - "before-start": 0주 0일 is still ahead. In LMP mode this happens only with a cycle longer
 *   than 28 days, where the corrected start (LMP + 주기 − 28) can lie after a past LMP.
 * - "started": gestational age is 0 days or more.
 */
export type StartStatus = "lmp-future" | "before-start" | "started";

export function startStatus(mode: DueMode, date: YMD, today: YMD, opts: DueOptions = {}): StartStatus {
  if (mode === "lmp" && diffDays(today, date) > 0) return "lmp-future";
  return diffDays(pregnancyStart(mode, date, opts), today) < 0 ? "before-start" : "started";
}

/** "12주 3일" */
export function formatWeeksDays(ga: Pick<GestationalAge, "weeks" | "days">): string {
  return `${ga.weeks}주 ${ga.days}일`;
}

export type Trimester = 1 | 2 | 3;

/** ACOG trimesters: 1분기 ~13주 6일, 2분기 14주 0일~27주 6일, 3분기 28주 0일~. */
export function trimester(totalDays: number): Trimester {
  if (totalDays < 14 * 7) return 1;
  if (totalDays < 28 * 7) return 2;
  return 3;
}

export const TRIMESTER_LABEL: Record<Trimester, string> = {
  1: "임신 초기 (1분기)",
  2: "임신 중기 (2분기)",
  3: "임신 후기 (3분기)",
};

/**
 * 임신 개월 in the Korean convention of 4 weeks (28 days) per month:
 * 0–3주 = 1개월, 4–7주 = 2개월, …, 36–39주 = 10개월. Capped at 10.
 */
export function pregnancyMonth(totalDays: number): number {
  if (totalDays < 0) return 0;
  return Math.min(10, Math.floor(totalDays / 28) + 1);
}

/** Week range (inclusive) covered by a 4-week pregnancy month, e.g. 5 → [16, 19]. */
export function monthWeekRange(month: number): [number, number] {
  return [(month - 1) * 4, (month - 1) * 4 + 3];
}

export type TermStage = "before" | "preterm" | "early-term" | "full-term" | "late-term" | "post-term";

/** ACOG CO 579 term categories by gestational age in days. */
export function termStage(totalDays: number): TermStage {
  if (totalDays < 0) return "before";
  if (totalDays < TERM_START_DAYS) return "preterm"; // < 37w
  if (totalDays < 39 * 7) return "early-term"; // 37w0d–38w6d
  if (totalDays < 41 * 7) return "full-term"; // 39w0d–40w6d
  if (totalDays < POST_TERM_DAYS) return "late-term"; // 41w0d–41w6d
  return "post-term"; // ≥ 42w0d
}

export const TERM_STAGE_LABEL: Record<TermStage, string> = {
  before: "임신 시작 전",
  preterm: "만삭 전 (37주 미만)",
  "early-term": "조기 만삭 (37~38주)",
  // '만삭' alone is the umbrella term for 37w0d–41w6d (KSOG), so ACOG's "full term" gets its own name.
  "full-term": "완전 만삭 (39~40주)",
  "late-term": "후기 만삭 (41주)",
  "post-term": "지연 임신 (42주 이상)",
};

/** "D-23", "D-day", "D+5" for days until the due date. */
export function ddayLabel(daysLeft: number): string {
  if (daysLeft === 0) return "D-day";
  return daysLeft > 0 ? `D-${daysLeft}` : `D+${-daysLeft}`;
}

/** Share of the 280-day pregnancy elapsed, clamped to 0–1. */
export function progressRatio(totalDays: number): number {
  return Math.min(1, Math.max(0, totalDays / PREGNANCY_DAYS));
}

/**
 * Commonly recommended prenatal check windows (generic, non-diagnostic).
 * Source: 대한산부인과학회 일반인 의학정보 「산전 진단 검사」 정기 진찰 시 검사 항목 표
 * (최초 방문, 9–13주, 15–20주, 20–24주, 24–28주, 32–36주), 「임신성 당뇨」(24–28주 50g 선별검사),
 * 「지연임신」(41주부터 주 2회 산전 태아 감시). NT window 11–13주 follows the standard
 * 11+0 to 13+6 week nuchal-translucency measurement period (within KSOG's 9–13주 window).
 */
export type CheckItem = {
  id: string;
  name: string;
  fromWeek: number;
  toWeek: number;
  detail: string;
};

export const CHECK_SCHEDULE: CheckItem[] = [
  {
    id: "first",
    name: "첫 진찰·첫 초음파",
    fromWeek: 5,
    toWeek: 8,
    detail: "아기집과 심장 박동 확인, 혈액형·빈혈·풍진 항체·B형 간염 등 기본 혈액 검사와 소변 검사",
  },
  {
    id: "nt",
    name: "목덜미 투명대(NT) 초음파",
    fromWeek: 11,
    toWeek: 13,
    detail: "1차 기형아 선별 검사(이중 표지물질 검사 등)를 함께 하는 경우가 많음",
  },
  {
    id: "quad",
    name: "쿼드(2차 기형아) 검사",
    fromWeek: 15,
    toWeek: 20,
    detail: "사중 표지물질 혈액 검사. 필요하면 양수 검사를 이 무렵 시행",
  },
  {
    id: "anatomy",
    name: "정밀 초음파",
    fromWeek: 20,
    toWeek: 24,
    detail: "임신 중기 초음파로 태아 구조 확인, 필요 시 태아 심장 초음파",
  },
  {
    id: "gdm",
    name: "임신성 당뇨 검사",
    fromWeek: 24,
    toWeek: 28,
    detail: "50g 당부하 선별 검사와 빈혈 검사",
  },
  {
    id: "late",
    name: "후기 초음파·막달 검사",
    fromWeek: 32,
    toWeek: 36,
    detail: "태아 체중, 태반 위치, 양수량 확인. 병원에 따라 분만 전 검사(막달 검사)를 함께 함",
  },
  {
    id: "postdate",
    name: "예정일 이후 태아 감시",
    fromWeek: 41,
    toWeek: 41,
    detail: "출산 전이라면 41주부터 주 2회 태아 상태 확인 권장",
  },
];

export type CheckStatus = "past" | "now" | "upcoming";

/** Inclusive calendar range of a week window: fromWeek 0일 ~ toWeek 6일. */
export function checkRange(start: YMD, item: Pick<CheckItem, "fromWeek" | "toWeek">): { from: YMD; to: YMD } {
  return { from: dateAtGestation(start, item.fromWeek), to: dateAtGestation(start, item.toWeek, 6) };
}

export function checkStatus(totalDays: number, item: Pick<CheckItem, "fromWeek" | "toWeek">): CheckStatus {
  if (totalDays < item.fromWeek * 7) return "upcoming";
  if (totalDays <= item.toWeek * 7 + 6) return "now";
  return "past";
}

/**
 * 2026 government support amounts (원). Verified 2026-10-09:
 * - 건강보험 임신·출산 진료비 지원 (정부24 보조금24 SD0000007672, 최종수정 2026-07-30):
 *   단태아 100만원, 다태아 140만원 기본(태아당 100만원이 되도록 추가 지급), 분만취약지 20만원 추가.
 *   사용 종료일: 분만예정일(출산일)로부터 2년.
 * - 첫만남이용권 (정부24 135200005015, 2024-01-01 이후 출생아): 첫째 200만원, 둘째 이상 300만원,
 *   출생일로부터 2년 이내 신청.
 */
export const SUPPORT = {
  voucherSingle: 1_000_000,
  voucherMultiBase: 1_400_000,
  voucherPerFetusMulti: 1_000_000,
  voucherRemoteAreaExtra: 200_000,
  voucherYears: 2,
  firstMeetFirst: 2_000_000,
  firstMeetSecondPlus: 3_000_000,
} as const;

/** Month in which the pregnancy voucher expires when counted from the due date (2 years). */
export function voucherExpiry(due: YMD): YMD {
  return addMonths(due, SUPPORT.voucherYears * 12);
}
