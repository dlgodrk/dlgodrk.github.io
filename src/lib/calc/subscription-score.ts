/**
 * 청약 가점 계산기 — pure logic (no React, no Date.now()).
 *
 * Legal basis (2026-10-09 확인, 현행 주택공급에 관한 규칙 = 국토교통부령 제1592호, 2026. 6. 15. 시행):
 * - [별표 1] 가점제 적용기준 <개정 2024. 12. 18.> (https://www.law.go.kr/법령별표서식/(주택공급에 관한 규칙,20260615,별표1))
 *   1. 가목 3) 무주택기간은 신청자와 배우자 기준, 신청자가 30세가 되는 날부터 계속 무주택인 기간.
 *      30세가 되기 전에 혼인했으면 혼인관계증명서의 혼인신고일부터. 주택을 가진 적이 있으면
 *      처분 후 무주택자가 된 날(여러 번이면 최근)부터.
 *   1. 나목 부양가족: 신청자·배우자와 같은 등본의 세대원(배우자는 분리세대여도 포함). 자녀는 미혼.
 *      직계존속은 신청자가 세대주이고 최근 3년 이상 같은 등본, 직계존속 부부 중 한 명이라도 주택 소유면 둘 다 제외.
 *      30세 이상 직계비속은 최근 1년 이상 같은 등본.
 *   1. 다목 주택청약종합저축 가입기간: 최초 가입일 기준(종류·금액·명의변경 무관).
 *   2. 나목 가점표: 무주택기간 1년 미만 2점 ~ 15년 이상 32점(1년마다 2점),
 *      부양가족 0명 5점 ~ 6명 이상 35점(1명마다 5점),
 *      가입기간 6개월 미만 1점, 6개월~1년 2점, 1년 이상부터 1년마다 1점, 15년 이상 17점.
 *   비고 2. 배우자 통장 가입기간의 50%에 해당하는 기간을 같은 표로 점수화(최대 3점)해 합산, 합산 17점 한도.
 *      (국토교통부령 제1287호 부칙 제2조: 2024. 3. 25. 이후 입주자모집공고분부터)
 * - 제10조제6항: 가점제 가입기간 산정 시 미성년자로서 가입한 2023. 12. 31. 이전 기간(2년 한도)과
 *   2024. 1. 1. 이후 기간의 합이 5년을 넘으면 5년만 인정 (2024. 7. 1. 이후 공고분, 그 전에는 미성년 기간 2년 한도).
 * - 무주택기간 0점: 만 30세 미만 미혼 또는 주택 소유 (입주자모집공고문 가점표 "만30세 미만 미혼자 또는 유주택자 0").
 *   [별표 1] 1. 가목 1): 공고일 현재 세대원 모두 무주택이어야 한다(만 60세 이상 직계존속 소유는 제53조제6호로 제외).
 *   따라서 "now"는 본인·배우자뿐 아니라 같은 등본의 세대원 누구라도 주택을 가진 경우다.
 * - 기간 계산은 민법 제160조(역에 의한 계산): 말일이 없는 달은 그 달 말일에 기간이 찬다.
 */
import { addDays, addMonths, compareYMD, daysInMonth, diffDays, type YMD } from "@/lib/date";

export const SCORE_MAX = 84;
export const HOMELESS_MAX = 32;
export const DEPENDENTS_MAX = 35;
export const SAVINGS_MAX = 17;
export const SPOUSE_BONUS_MAX = 3;
/** 부양가족은 6명 이상이면 모두 35점. */
export const DEPENDENTS_CAP = 6;
/** 무주택기간을 세기 시작하는 나이 (만 30세가 되는 날). */
export const HOMELESS_START_AGE = 30;
/** 민법상 성년 (만 19세). 그 전에 가입한 기간은 미성년 가입기간. */
export const ADULT_AGE = 19;

/** 배우자 통장 합산 시행일: 이 날 이후 입주자모집공고분부터 적용. */
export const SPOUSE_BONUS_FROM: YMD = { y: 2024, m: 3, d: 25 };
/** 미성년 가입기간 5년 인정 시행일 (그 전 공고는 2년 한도). */
export const MINOR_5Y_FROM: YMD = { y: 2024, m: 7, d: 1 };
/** 2023. 12. 31. 이전 미성년 기간은 2년 한도, 2024. 1. 1. 이후 기간과 합쳐 5년 한도. */
export const MINOR_SPLIT: YMD = { y: 2024, m: 1, d: 1 };

/** Dates before this year are rejected (Date.UTC maps years 0–99 to 1900s). */
export const MIN_YEAR = 1900;

/* ------------------------------------------------------------------ */
/* 기간 계산                                                            */
/* ------------------------------------------------------------------ */

/**
 * The day on which `k` full months since `start` are completed (k ≥ 0, 초일 산입).
 * Normally the same day-of-month k months later. If that month has no such day,
 * the period ends on the month's last day (민법 제160조 제3항), so the next count starts on the 1st.
 */
export function monthAnniversary(start: YMD, k: number): YMD {
  const total = start.y * 12 + (start.m - 1) + k;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  if (start.d <= daysInMonth(y, m)) return { y, m, d: start.d };
  return m === 12 ? { y: y + 1, m: 1, d: 1 } : { y, m: m + 1, d: 1 };
}

/** Completed months from `start` to `ref`. -1 when ref is before start. */
export function completedMonths(start: YMD, ref: YMD): number {
  if (compareYMD(ref, start) < 0) return -1;
  let k = (ref.y - start.y) * 12 + (ref.m - start.m);
  while (k > 0 && compareYMD(monthAnniversary(start, k), ref) > 0) k--;
  return Math.max(0, k);
}

/** "8년 4개월", "7개월", "12년", "0개월" */
export function formatMonths(months: number): string {
  const m = Math.max(0, Math.floor(months));
  const y = Math.floor(m / 12);
  const r = m % 12;
  if (y === 0) return `${r}개월`;
  return r === 0 ? `${y}년` : `${y}년 ${r}개월`;
}

function minYMD(a: YMD, b: YMD): YMD {
  return compareYMD(a, b) <= 0 ? a : b;
}
function maxYMD(a: YMD, b: YMD): YMD {
  return compareYMD(a, b) >= 0 ? a : b;
}

/* ------------------------------------------------------------------ */
/* 항목별 점수표 (별표 1 제2호나목)                                      */
/* ------------------------------------------------------------------ */

/** 무주택기간 점수 (산정 대상일 때). 0년(1년 미만) 2점, 1년마다 2점, 15년 이상 32점. */
export function homelessPointsForYears(years: number): number {
  return Math.min(HOMELESS_MAX, 2 + 2 * Math.max(0, Math.floor(years)));
}

/** 부양가족 수 점수: 0명 5점, 1명마다 5점, 6명 이상 35점. */
export function dependentsPoints(n: number): number {
  const c = Math.min(DEPENDENTS_CAP, Math.max(0, Math.floor(Number.isFinite(n) ? n : 0)));
  return 5 + 5 * c;
}

/** 청약통장 가입기간 점수: 6개월 미만 1, 6개월~1년 2, 1년 이상부터 1년마다 1점, 15년 이상 17점. */
export function savingsPointsForMonths(months: number): number {
  if (months < 6) return 1;
  if (months < 12) return 2;
  return Math.min(SAVINGS_MAX, Math.floor(months / 12) + 2);
}

/**
 * 배우자 통장 가산점: 배우자 가입기간의 50%에 해당하는 기간을 같은 표로 점수화, 최대 3점.
 * 배우자 1년 미만 → 1점, 1년 이상 2년 미만 → 2점, 2년 이상 → 3점.
 */
export function spouseBonusForMonths(spouseMonths: number): number {
  return Math.min(SPOUSE_BONUS_MAX, savingsPointsForMonths(spouseMonths / 2));
}

export type SavingsScore = {
  /** 본인 가입기간 점수 */
  own: number;
  /** 배우자 가입기간으로 계산한 점수 (최대 3점, 17점 한도 적용 전) */
  bonus: number;
  /** 17점 한도를 적용한 뒤 실제로 더해진 배우자 점수 */
  applied: number;
  total: number;
  /** 기준일(공고일)이 배우자 합산 시행 이후인지 */
  spouseAllowed: boolean;
};

/** 본인 + 배우자 가입기간 점수 (합산 17점 한도). spouseMonths = null 이면 배우자 통장 없음. */
export function savingsScore(ownMonths: number, spouseMonths: number | null, ref: YMD): SavingsScore {
  const own = savingsPointsForMonths(ownMonths);
  const spouseAllowed = compareYMD(ref, SPOUSE_BONUS_FROM) >= 0;
  const bonus = spouseMonths !== null && spouseMonths >= 0 && spouseAllowed ? spouseBonusForMonths(spouseMonths) : 0;
  const total = Math.min(SAVINGS_MAX, own + bonus);
  return { own, bonus, applied: total - own, total, spouseAllowed };
}

/** 부양가족 수별 이론상 최고 가점 (무주택 32 + 통장 17 + 부양가족 점수). */
export function maxScoreByDependents(n: number): number {
  return HOMELESS_MAX + SAVINGS_MAX + dependentsPoints(n);
}

/* ------------------------------------------------------------------ */
/* 무주택기간                                                           */
/* ------------------------------------------------------------------ */

export type Ownership = "none" | "past" | "now";
export type HomelessStartBasis = "age30" | "marriage" | "disposal";

export type HomelessResult = {
  /** 지금 주택을 가진 세대 → 0점 */
  owner: boolean;
  /** 기준일에 무주택기간을 세고 있는지 (만 30세 미만 미혼이면 false) */
  counting: boolean;
  /** 무주택기간 기산일 (owner면 null) */
  start: YMD | null;
  startBasis: HomelessStartBasis | null;
  /** 30세가 되는 날 (참고) */
  age30: YMD;
  months: number;
  points: number;
  /** 다음에 점수가 오르는 날 */
  next: { date: YMD; points: number } | null;
};

/** 만 30세가 되는 날. 2월 29일생은 평년이면 3월 1일. */
export function age30Date(birth: YMD): YMD {
  return monthAnniversary(birth, HOMELESS_START_AGE * 12);
}

/**
 * 무주택기간 점수.
 * @param marriage 혼인신고일 (미혼이면 null). 만 30세가 되기 전이면 이 날부터 센다.
 * @param homelessSince 주택을 처분해 무주택자가 된 날 (ownership === "past"일 때).
 */
export function calcHomeless(input: {
  birth: YMD;
  marriage: YMD | null;
  ownership: Ownership;
  homelessSince: YMD | null;
  ref: YMD;
}): HomelessResult {
  const { birth, marriage, ownership, homelessSince, ref } = input;
  const age30 = age30Date(birth);
  if (ownership === "now") {
    return { owner: true, counting: false, start: null, startBasis: null, age30, months: 0, points: 0, next: null };
  }
  let start = age30;
  let startBasis: HomelessStartBasis = "age30";
  if (marriage && compareYMD(marriage, age30) < 0) {
    start = marriage;
    startBasis = "marriage";
  }
  if (ownership === "past" && homelessSince && compareYMD(homelessSince, start) > 0) {
    start = homelessSince;
    startBasis = "disposal";
  }
  if (compareYMD(ref, start) < 0) {
    return { owner: false, counting: false, start, startBasis, age30, months: 0, points: 0, next: { date: start, points: 2 } };
  }
  const months = completedMonths(start, ref);
  const years = Math.floor(months / 12);
  const points = homelessPointsForYears(years);
  const next = points < HOMELESS_MAX ? { date: monthAnniversary(start, (years + 1) * 12), points: points + 2 } : null;
  return { owner: false, counting: true, start, startBasis, age30, months, points, next };
}

/* ------------------------------------------------------------------ */
/* 청약통장 가입기간                                                     */
/* ------------------------------------------------------------------ */

export type SavingsPeriod = {
  join: YMD;
  /** 미성년 기간 인정 한도를 반영한 실질 기산일 (한도에 안 걸리면 가입일과 같음) */
  start: YMD;
  months: number;
  /** 미성년(만 19세 전)일 때 가입했는지 */
  joinedAsMinor: boolean;
  /** 미성년 기간 인정 한도 때문에 기간이 줄었는지 */
  minorCapped: boolean;
  /** 기준일에 아직 미성년인지 (이 경우 앞으로의 점수 변화는 계산하지 않음) */
  stillMinor: boolean;
};

/**
 * 본인 통장의 가점 산정용 가입기간. birth가 있으면 미성년 가입기간 한도(제10조제6항)를 적용한다.
 * - 2024. 7. 1. 이후 공고: 2023. 12. 31. 이전 미성년 기간(2년 한도) + 2024. 1. 1. 이후 미성년 기간, 합계 5년 한도
 * - 그 전 공고: 미성년 기간 2년 한도
 * 한도를 넘는 날수만큼 기산일을 뒤로 미룬 날을 `start`로 돌려준다.
 * 가입일이 기준일보다 뒤면 null.
 */
export function savingsPeriod(join: YMD, ref: YMD, birth: YMD | null): SavingsPeriod | null {
  if (compareYMD(join, ref) > 0) return null;
  const plain = (stillMinor: boolean): SavingsPeriod => ({
    join,
    start: join,
    months: completedMonths(join, ref),
    joinedAsMinor: false,
    minorCapped: false,
    stillMinor,
  });
  if (!birth) return plain(false);
  const adult = monthAnniversary(birth, ADULT_AGE * 12);
  const stillMinor = compareYMD(ref, adult) < 0;
  if (compareYMD(join, adult) >= 0) return plain(stillMinor);

  const end = minYMD(adult, ref); // 미성년 구간 [join, end)
  const minorDays = diffDays(join, end);
  let recognized: number;
  if (compareYMD(ref, MINOR_5Y_FROM) < 0) {
    recognized = Math.min(minorDays, diffDays(addMonths(end, -24), end));
  } else {
    const preEnd = minYMD(end, MINOR_SPLIT);
    const pre = compareYMD(join, preEnd) < 0 ? diffDays(join, preEnd) : 0;
    const preCap = diffDays(addMonths(preEnd, -24), preEnd);
    const post = compareYMD(end, MINOR_SPLIT) > 0 ? diffDays(maxYMD(join, MINOR_SPLIT), end) : 0;
    recognized = Math.min(Math.min(pre, preCap) + post, diffDays(addMonths(end, -60), end));
  }
  const start = recognized < minorDays ? addDays(end, -recognized) : join;
  return {
    join,
    start,
    months: completedMonths(start, ref),
    joinedAsMinor: true,
    minorCapped: recognized < minorDays,
    stillMinor,
  };
}

/** 본인 점수 구간이 바뀌는 다음 개월 수 (15년 = 180개월 이상이면 null). */
function nextOwnThreshold(months: number): number | null {
  if (months < 6) return 6;
  if (months < 12) return 12;
  if (months >= 180) return null;
  return (Math.floor(months / 12) + 1) * 12;
}

/** 배우자 점수 구간이 바뀌는 다음 개월 수 (24개월 이상이면 null). */
function nextSpouseThreshold(months: number): number | null {
  if (months < 12) return 12;
  if (months < 24) return 24;
  return null;
}

/**
 * 청약통장 점수(본인+배우자, 17점 한도)가 다음에 오르는 날과 그때 점수.
 * 본인이 아직 미성년이면 기산일이 계속 바뀌므로 계산하지 않는다(null).
 */
export function nextSavingsRaise(
  own: SavingsPeriod,
  spouseJoin: YMD | null,
  ref: YMD,
): { date: YMD; points: number } | null {
  if (own.stillMinor) return null;
  const at = (d: YMD) =>
    savingsScore(completedMonths(own.start, d), spouseJoin ? completedMonths(spouseJoin, d) : null, d).total;
  const now = at(ref);
  if (now >= SAVINGS_MAX) return null;
  const candidates: YMD[] = [];
  const t = nextOwnThreshold(own.months);
  if (t !== null) candidates.push(monthAnniversary(own.start, t));
  if (spouseJoin && compareYMD(spouseJoin, ref) <= 0) {
    const st = nextSpouseThreshold(completedMonths(spouseJoin, ref));
    if (st !== null) candidates.push(monthAnniversary(spouseJoin, st));
  }
  if (compareYMD(ref, SPOUSE_BONUS_FROM) < 0 && spouseJoin) candidates.push(SPOUSE_BONUS_FROM);
  candidates.sort(compareYMD);
  for (const d of candidates) {
    const p = at(d);
    if (p > now) return { date: d, points: p };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* 날짜로 계산 (전체)                                                    */
/* ------------------------------------------------------------------ */

export type DateInputs = {
  /** 입주자모집공고일 (기준일) */
  ref: YMD | null;
  birth: YMD | null;
  married: boolean;
  marriage: YMD | null;
  ownership: Ownership;
  homelessSince: YMD | null;
  dependents: number;
  join: YMD | null;
  spouseHasSavings: boolean;
  spouseJoin: YMD | null;
};

/** 입력 오류를 해요체 문장으로 돌려준다. 문제가 없으면 null. */
export function checkDateInputs(i: DateInputs): string | null {
  const tooOld = (v: YMD) => v.y < MIN_YEAR;
  if (!i.ref) return "기준일(입주자모집공고일)을 넣어 주세요.";
  if (!i.birth) return "생년월일을 넣으면 바로 가점을 계산해 드려요.";
  if (tooOld(i.birth) || tooOld(i.ref)) return `날짜는 ${MIN_YEAR}년 이후로 넣어 주세요.`;
  if (compareYMD(i.birth, i.ref) > 0) return "생년월일이 기준일보다 뒤예요. 날짜를 다시 확인해 주세요.";
  if (i.married) {
    if (!i.marriage) return "혼인신고일을 넣어 주세요.";
    if (compareYMD(i.marriage, i.birth) < 0) return "혼인신고일이 생년월일보다 앞서 있어요.";
    if (compareYMD(i.marriage, i.ref) > 0) return "혼인신고일이 기준일보다 뒤예요. 공고일 현재 미혼이면 미혼을 골라 주세요.";
  }
  if (i.ownership === "past") {
    if (!i.homelessSince) return "주택을 처분해 무주택이 된 날을 넣어 주세요.";
    if (compareYMD(i.homelessSince, i.birth) < 0) return "무주택이 된 날이 생년월일보다 앞서 있어요.";
    if (compareYMD(i.homelessSince, i.ref) > 0) return "무주택이 된 날이 기준일보다 뒤라면 ‘지금 있어요’를 골라 주세요.";
  }
  if (!i.join) return "청약통장 가입일을 넣어 주세요.";
  if (tooOld(i.join)) return `날짜는 ${MIN_YEAR}년 이후로 넣어 주세요.`;
  if (compareYMD(i.join, i.birth) < 0) return "청약통장 가입일이 생년월일보다 앞서 있어요.";
  if (compareYMD(i.join, i.ref) > 0) return "청약통장 가입일이 기준일보다 뒤예요. 공고일 현재 가입돼 있어야 청약할 수 있어요.";
  if (i.married && i.spouseHasSavings) {
    if (!i.spouseJoin) return "배우자 청약통장 가입일을 넣어 주세요.";
    if (tooOld(i.spouseJoin)) return `날짜는 ${MIN_YEAR}년 이후로 넣어 주세요.`;
    if (compareYMD(i.spouseJoin, i.ref) > 0) return "배우자 통장 가입일이 기준일보다 뒤예요. 공고일 현재 가입한 통장만 합산해요.";
  }
  return null;
}

export type DateResult = {
  homeless: HomelessResult;
  dependents: number;
  dependentsPoints: number;
  own: SavingsPeriod;
  spouseMonths: number | null;
  savings: SavingsScore;
  savingsNext: { date: YMD; points: number } | null;
  total: number;
};

/** 날짜 입력으로 전체 가점을 계산한다. checkDateInputs가 null인 입력만 넣을 것 (아니면 null). */
export function calcByDates(i: DateInputs): DateResult | null {
  if (checkDateInputs(i) !== null) return null;
  const ref = i.ref!;
  const birth = i.birth!;
  const homeless = calcHomeless({
    birth,
    marriage: i.married ? i.marriage : null,
    ownership: i.ownership,
    homelessSince: i.ownership === "past" ? i.homelessSince : null,
    ref,
  });
  const own = savingsPeriod(i.join!, ref, birth);
  if (!own) return null;
  const spouseJoin = i.married && i.spouseHasSavings ? i.spouseJoin : null;
  const spouseMonths = spouseJoin ? completedMonths(spouseJoin, ref) : null;
  const savings = savingsScore(own.months, spouseMonths, ref);
  const dPoints = dependentsPoints(i.dependents);
  return {
    homeless,
    dependents: Math.min(DEPENDENTS_CAP, Math.max(0, Math.floor(i.dependents))),
    dependentsPoints: dPoints,
    own,
    spouseMonths,
    savings,
    savingsNext: nextSavingsRaise(own, spouseJoin, ref),
    total: homeless.points + dPoints + savings.total,
  };
}

/* ------------------------------------------------------------------ */
/* 기간으로 선택 (구간 목록)                                              */
/* ------------------------------------------------------------------ */

export type Bracket = { value: number; label: string; points: number };

/** 무주택기간 구간. value = 연수(-1 = 해당 없음). */
export const HOMELESS_BRACKETS: Bracket[] = [
  { value: -1, label: "해당 없음 (만 30세 미만 미혼·주택 소유 세대)", points: 0 },
  { value: 0, label: "1년 미만", points: 2 },
  ...Array.from({ length: 14 }, (_, i) => ({
    value: i + 1,
    label: `${i + 1}년 이상 ~ ${i + 2}년 미만`,
    points: homelessPointsForYears(i + 1),
  })),
  { value: 15, label: "15년 이상", points: 32 },
];

/** 본인 청약통장 가입기간 구간. value = 개월 수 하한. */
export const SAVINGS_BRACKETS: Bracket[] = [
  { value: 0, label: "6개월 미만", points: 1 },
  { value: 6, label: "6개월 이상 ~ 1년 미만", points: 2 },
  ...Array.from({ length: 14 }, (_, i) => ({
    value: (i + 1) * 12,
    label: `${i + 1}년 이상 ~ ${i + 2}년 미만`,
    points: savingsPointsForMonths((i + 1) * 12),
  })),
  { value: 180, label: "15년 이상", points: 17 },
];

/** 배우자 청약통장 가입기간 구간. value = 개월 수 하한(-1 = 없음). */
export const SPOUSE_BRACKETS: Bracket[] = [
  { value: -1, label: "없음 (미가입)", points: 0 },
  { value: 0, label: "1년 미만", points: 1 },
  { value: 12, label: "1년 이상 ~ 2년 미만", points: 2 },
  { value: 24, label: "2년 이상", points: 3 },
];

/** 구간 값으로 점수를 찾는다. 목록에 없는 값이면 가장 가까운 아래 구간. */
export function bracketOf(list: Bracket[], value: number): Bracket {
  let found = list[0];
  for (const b of list) if (Number.isFinite(value) && value >= b.value) found = b;
  return found;
}

/** 기간으로 고른 구간의 합계. */
export function calcByBrackets(homelessYears: number, dependents: number, savingsMonths: number, spouseMonths: number) {
  const homeless = bracketOf(HOMELESS_BRACKETS, homelessYears);
  const own = bracketOf(SAVINGS_BRACKETS, savingsMonths);
  const spouse = bracketOf(SPOUSE_BRACKETS, spouseMonths);
  const savings = Math.min(SAVINGS_MAX, own.points + spouse.points);
  const dPoints = dependentsPoints(dependents);
  return {
    homeless,
    own,
    spouse,
    spouseApplied: savings - own.points,
    savings,
    dependentsPoints: dPoints,
    total: homeless.points + dPoints + savings,
  };
}
