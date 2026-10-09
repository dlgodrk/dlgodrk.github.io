/**
 * 만 나이 계산기 — pure logic (no React, no Date.now()).
 *
 * Legal basis (2026년 기준):
 * - 민법 제158조(나이의 계산과 표시, 2022.12.27 개정 · 2023.6.28 시행):
 *   나이는 출생일을 산입하여 만 나이로 계산하고 연수로 표시한다. 1세 미만은 월수로 표시할 수 있다.
 * - 행정기본법 제7조의2: 행정에 관한 나이도 특별한 규정이 없으면 같은 방식.
 * - 민법 제160조(역에 의한 계산) ② 기간은 최후의 연·월에서 기산일에 해당한 날의 전일로 만료,
 *   ③ 최종의 월에 해당일이 없으면 그 월의 말일로 만료.
 *   → 2월 29일생은 평년에 2월 28일로 1년이 차고 3월 1일부터 한 살 많아진다.
 *   → 1월 31일생의 1개월은 2월 말일로 차고 3월 1일부터 1개월이 된다(1세 미만 월수 표시).
 * - 법제처 법령해석 22-0817(2022.11.25): 노인복지법 제25조~제27조(경로우대 등)의 "65세 이상"이 되는
 *   첫날은 만 65세 생일. (기초연금법에 대한 해석은 아니다. 기초연금은 기초연금법 제3조 "65세 이상".)
 * - 국민연금법 제54조①: 연금은 지급 사유가 생긴 날이 속하는 달의 다음 달부터 지급한다.
 *   → 노령연금은 수급개시연령이 된 달의 다음 달부터 나온다(12월생은 보통 이듬해 1월).
 */
import { compareYMD, daysInMonth, diffDays, type YMD } from "@/lib/date";
import { RULE_YEAR } from "@/lib/site";

/* ------------------------------------------------------------------ */
/* 만 나이                                                              */
/* ------------------------------------------------------------------ */

/**
 * The day on which `k` full months since birth are completed (k ≥ 0).
 * Normally the same day-of-month k months later. If that month has no such day
 * (29~31일생), the period expires on the month's last day (민법 제160조 제3항),
 * so the new count starts on the 1st of the following month.
 */
export function monthAnniversary(birth: YMD, k: number): YMD {
  const total = birth.y * 12 + (birth.m - 1) + k;
  const y = Math.floor(total / 12);
  const m = (total % 12) + 1;
  if (birth.d <= daysInMonth(y, m)) return { y, m, d: birth.d };
  return m === 12 ? { y: y + 1, m: 1, d: 1 } : { y, m: m + 1, d: 1 };
}

/** The day the person becomes 만 n세 (the n-th birthday). 2월 29일생 → 평년엔 3월 1일. */
export function birthdayOfAge(birth: YMD, n: number): YMD {
  return monthAnniversary(birth, n * 12);
}

/** Completed months between birth and ref (출생일 산입). -1 when ref is before birth. */
export function completedMonths(birth: YMD, ref: YMD): number {
  if (compareYMD(ref, birth) < 0) return -1;
  let k = Math.max(0, (ref.y - birth.y) * 12 + (ref.m - birth.m));
  while (k > 0 && compareYMD(monthAnniversary(birth, k), ref) > 0) k--;
  while (compareYMD(monthAnniversary(birth, k + 1), ref) <= 0) k++;
  return k;
}

/** 만 나이 on `ref`. -1 when ref is before birth. */
export function manAge(birth: YMD, ref: YMD): number {
  const k = completedMonths(birth, ref);
  return k < 0 ? -1 : Math.floor(k / 12);
}

/** 연 나이 = 기준연도 − 출생연도 (청소년보호법·병역법이 쓰는 방식). */
export function yeonAge(birthYear: number, refYear: number): number {
  return refYear - birthYear;
}

/** 세는 나이(한국식 나이) = 연 나이 + 1. 법적 효력 없음, 참고용. */
export function countingAge(birthYear: number, refYear: number): number {
  return refYear - birthYear + 1;
}

export type AgeResult = {
  /** 만 나이 */
  man: number;
  /** months past the last birthday (0–11) */
  months: number;
  /** days past the last monthly anniversary */
  days: number;
  /** completed months since birth (for babies under 1) */
  totalMonths: number;
  yeon: number;
  counting: number;
  /** whole days from birth to ref (birth day itself = 0) */
  daysLived: number;
  /** ref is a birthday (the day the age just went up) */
  isBirthday: boolean;
  /** next birthday on or after ref (ref itself when isBirthday) */
  nextBirthday: YMD;
  daysToNextBirthday: number;
  /** 만 나이 reached on nextBirthday */
  nextAge: number;
  /** born on Feb 29 */
  leapDayBirth: boolean;
};

/** Full age breakdown on `ref`. null when ref is before birth. */
export function ageAt(birth: YMD, ref: YMD): AgeResult | null {
  const totalMonths = completedMonths(birth, ref);
  if (totalMonths < 0) return null;
  const man = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const days = diffDays(monthAnniversary(birth, totalMonths), ref);
  const isBirthday = man > 0 && compareYMD(birthdayOfAge(birth, man), ref) === 0;
  const nextAge = isBirthday ? man : man + 1;
  const nextBirthday = birthdayOfAge(birth, nextAge);
  return {
    man,
    months,
    days,
    totalMonths,
    yeon: yeonAge(birth.y, ref.y),
    counting: countingAge(birth.y, ref.y),
    daysLived: diffDays(birth, ref),
    isBirthday,
    nextBirthday,
    daysToNextBirthday: diffDays(ref, nextBirthday),
    nextAge,
    leapDayBirth: birth.m === 2 && birth.d === 29,
  };
}

/**
 * 만 나이 range during a calendar year for people born in `birthYear`:
 * before the birthday → year − birthYear − 1, from the birthday → year − birthYear.
 * `before` is null for babies born that same year.
 */
export function manAgeRangeInYear(birthYear: number, year: number): { before: number | null; after: number } {
  const after = year - birthYear;
  return { before: after >= 1 ? after - 1 : null, after };
}

/** "만 35세·36세" / "만 0세" */
export function manAgeRangeLabel(birthYear: number, year: number, sep = "·"): string {
  const { before, after } = manAgeRangeInYear(birthYear, year);
  return before === null ? `만 ${after}세` : `만 ${before}세${sep}${after}세`;
}

/* ------------------------------------------------------------------ */
/* 띠 · 60갑자                                                          */
/* ------------------------------------------------------------------ */

export const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"] as const;
export const STEMS_HANJA = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
export const BRANCHES = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"] as const;
export const BRANCHES_HANJA = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;
export const ANIMALS = ["쥐", "소", "호랑이", "토끼", "용", "뱀", "말", "양", "원숭이", "닭", "개", "돼지"] as const;
/** 천간 2개씩 같은 오행·색: 갑을=목(푸른), 병정=화(붉은), 무기=토(황금·누런), 경신=금(흰), 임계=수(검은) */
export const STEM_ELEMENTS = ["목(木)", "화(火)", "토(土)", "금(金)", "수(水)"] as const;
export const STEM_COLORS = ["푸른", "붉은", "황금", "흰", "검은"] as const;

export type Ganji = {
  /** "경오" */
  name: string;
  /** "庚午" */
  hanja: string;
  stemIndex: number;
  branchIndex: number;
  /** 0–59 position in the 60갑자 cycle (갑자 = 0) */
  cycleIndex: number;
  element: string;
  color: string;
  animal: string;
  /** "말띠" */
  ttiShort: string;
  /** "백말띠", "붉은 말띠", "황금 돼지띠" */
  tti: string;
};

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** 60갑자 of a (solar) year. stem = (y−4) mod 10, branch = (y−4) mod 12. 1984 = 갑자년. */
export function ganjiOfYear(y: number): Ganji {
  const stemIndex = mod(y - 4, 10);
  const branchIndex = mod(y - 4, 12);
  const pair = Math.floor(stemIndex / 2);
  const color = STEM_COLORS[pair];
  const animal = ANIMALS[branchIndex];
  // 경오년(흰 말)은 '백말띠'라는 말이 굳어져 있어 그대로 쓴다.
  const tti = color === "흰" && animal === "말" ? "백말띠" : `${color} ${animal}띠`;
  return {
    name: `${STEMS[stemIndex]}${BRANCHES[branchIndex]}`,
    hanja: `${STEMS_HANJA[stemIndex]}${BRANCHES_HANJA[branchIndex]}`,
    stemIndex,
    branchIndex,
    cycleIndex: mod(y - 1984, 60),
    element: STEM_ELEMENTS[pair],
    color,
    animal,
    ttiShort: `${animal}띠`,
    tti,
  };
}

/** Years in [from, to] that share the same 띠 (12-year cycle) as `y`. */
export function sameTtiYears(y: number, from: number, to: number): number[] {
  const out: number[] = [];
  for (let x = from + mod(y - from, 12); x <= to; x += 12) out.push(x);
  return out;
}

/* ------------------------------------------------------------------ */
/* 학교 입학·졸업 연도                                                  */
/* ------------------------------------------------------------------ */

/**
 * 초·중등교육법 제13조: 만 6세가 된 날이 속하는 해의 다음 해 3월 1일 입학 → 출생연도 + 7.
 * 2008년까지는 '6세가 된 날의 다음 날 이후 최초의 학년초' 입학이라 3월~이듬해 2월생이 한 학년이었고,
 * 1·2월생은 한 해 먼저 입학했다(빠른년생). 2009학년도부터 1~12월생 기준으로 바뀌어
 * 2002년 1·2월생(2008년 입학)이 마지막 빠른년생이다.
 */
export const LAST_EARLY_ENTRY_BIRTH_YEAR = 2002;
/**
 * 1950년대 중반 이전 출생자는 학년 시작(4월)·학제·전쟁 등으로 실제 입학 시기가 제각각이라
 * 현행 규칙으로 계산하지 않는다.
 */
export const SCHOOL_CALC_FROM_YEAR = 1956;

export type SchoolYears = {
  /** 빠른년생(2002년 이전 1·2월생) 기준으로 계산했는지 */
  early: boolean;
  elementaryEntry: number;
  elementaryGrad: number;
  middleEntry: number;
  middleGrad: number;
  highEntry: number;
  highGrad: number;
  /** 재수 없이 바로 진학할 때 */
  universityEntry: number;
};

/** Whether a birth date falls in the old early-entry group (2002년 이전 1·2월생). */
export function isEarlyEntryBirth(birthYear: number, birthMonth: number): boolean {
  return birthYear <= LAST_EARLY_ENTRY_BIRTH_YEAR && birthMonth <= 2;
}

/**
 * School years without 조기입학·입학 연기·유급. Entry in March, graduation in February.
 * null for births before SCHOOL_CALC_FROM_YEAR.
 */
export function schoolYears(birthYear: number, birthMonth: number): SchoolYears | null {
  if (birthYear < SCHOOL_CALC_FROM_YEAR) return null;
  const early = isEarlyEntryBirth(birthYear, birthMonth);
  const entry = birthYear + (early ? 6 : 7);
  return {
    early,
    elementaryEntry: entry,
    elementaryGrad: entry + 6,
    middleEntry: entry + 6,
    middleGrad: entry + 9,
    highEntry: entry + 9,
    highGrad: entry + 12,
    universityEntry: entry + 12,
  };
}

/* ------------------------------------------------------------------ */
/* 국민연금                                                             */
/* ------------------------------------------------------------------ */

/**
 * 국민연금 노령연금 수급개시연령 (국민연금법 제61조, 부칙 <법률 제8541호, 2007.7.23> 제8조).
 * 1952년 이전 60세, 1953~56년 61세, 1957~60년 62세, 1961~64년 63세, 1965~68년 64세, 1969년 이후 65세.
 * 2025년 개정(2026.1.1 시행, 보험료율·소득대체율 조정)에서도 수급개시연령은 바뀌지 않았다.
 */
export function pensionStartAge(birthYear: number): number {
  if (birthYear <= 1952) return 60;
  if (birthYear <= 1956) return 61;
  if (birthYear <= 1960) return 62;
  if (birthYear <= 1964) return 63;
  if (birthYear <= 1968) return 64;
  return 65;
}

export const PENSION_AGE_TABLE: { label: string; age: number }[] = [
  { label: "1952년 이전", age: 60 },
  { label: "1953~1956년", age: 61 },
  { label: "1957~1960년", age: 62 },
  { label: "1961~1964년", age: 63 },
  { label: "1965~1968년", age: 64 },
  { label: "1969년 이후", age: 65 },
];

/** 조기노령연금: 최대 5년 앞당김, 1년당 6% 감액. 연기연금: 최대 5년, 1년당 7.2% 가산. */
export const EARLY_PENSION_MAX_YEARS = 5;
export const EARLY_PENSION_CUT_PER_YEAR = 0.06;
export const DEFERRED_PENSION_BONUS_PER_YEAR = 0.072;

/* ------------------------------------------------------------------ */
/* 법정 나이 기준                                                       */
/* ------------------------------------------------------------------ */

export type AgeBasis = "만" | "연";

export type AgeRule = {
  id: string;
  label: string;
  /** threshold age */
  age: number;
  basis: AgeBasis;
  /** human-readable threshold, e.g. "만 18세", "19세가 되는 해 1월 1일" */
  threshold: string;
  note?: string;
  law: string;
  url: string;
};

const LAW = "https://www.law.go.kr/법령";

/** Key age thresholds in Korean law (2026년 10월 현재). */
export const AGE_RULES: AgeRule[] = [
  { id: "work", label: "근로(아르바이트)", age: 15, basis: "만", threshold: "만 15세", note: "15세가 넘어도 중학생은 불가, 취직인허증이 있으면 예외", law: "근로기준법 제64조", url: `${LAW}/근로기준법/제64조` },
  { id: "moped", label: "원동기장치자전거 면허", age: 16, basis: "만", threshold: "만 16세", law: "도로교통법 제82조", url: `${LAW}/도로교통법/제82조` },
  { id: "idcard", label: "주민등록증 발급", age: 17, basis: "만", threshold: "만 17세", law: "주민등록법 제24조", url: `${LAW}/주민등록법/제24조` },
  { id: "vote", label: "선거권", age: 18, basis: "만", threshold: "만 18세", note: "선거일 현재 나이로 판단", law: "공직선거법 제15조·제17조", url: `${LAW}/공직선거법/제15조` },
  { id: "license", label: "운전면허(1종·2종 보통)", age: 18, basis: "만", threshold: "만 18세", law: "도로교통법 제82조", url: `${LAW}/도로교통법/제82조` },
  { id: "license-large", label: "1종 대형·특수 면허", age: 19, basis: "만", threshold: "만 19세", note: "운전경력 1년 이상도 필요", law: "도로교통법 제82조", url: `${LAW}/도로교통법/제82조` },
  { id: "marriage", label: "혼인", age: 18, basis: "만", threshold: "만 18세", note: "성년 전에는 부모 동의 필요", law: "민법 제807조·제808조", url: `${LAW}/민법/제807조` },
  { id: "military", label: "병역준비역 편입(남성)", age: 18, basis: "연", threshold: "18세가 되는 해 1월 1일", law: "병역법 제2조·제8조", url: `${LAW}/병역법/제8조` },
  { id: "military-exam", label: "병역판정검사(남성)", age: 19, basis: "연", threshold: "19세가 되는 해", law: "병역법 제11조", url: `${LAW}/병역법/제11조` },
  { id: "adult", label: "민법상 성년", age: 19, basis: "만", threshold: "만 19세", note: "2013년 7월 1일 20세에서 19세로 낮아짐", law: "민법 제4조", url: `${LAW}/민법/제4조` },
  { id: "alcohol", label: "술·담배 구매", age: 19, basis: "연", threshold: "19세가 되는 해 1월 1일", note: "청소년 = 만 19세 미만, 단 19세가 되는 해 1월 1일을 맞은 사람 제외", law: "청소년보호법 제2조", url: `${LAW}/청소년보호법/제2조` },
  { id: "pension", label: "국민연금 노령연금", age: 65, basis: "만", threshold: "만 60~65세(출생연도별)", note: "가입기간 10년 이상, 수급 나이가 된 달의 다음 달부터 지급(국민연금법 제54조)", law: "국민연금법 제61조·부칙", url: `${LAW}/국민연금법/제61조` },
  { id: "senior", label: "기초연금·경로우대", age: 65, basis: "만", threshold: "만 65세", note: "경로우대(노인복지법)는 만 65세 생일부터(법제처 해석 22-0817), 기초연금은 만 65세 이상 중 소득인정액 기준 충족 시", law: "기초연금법 제3조, 노인복지법 제26조", url: `${LAW}/기초연금법/제3조` },
];

/** The first day a rule applies to someone born on `birth`. */
export function ruleStartDate(birth: YMD, basis: AgeBasis, age: number): YMD {
  return basis === "연" ? { y: birth.y + age, m: 1, d: 1 } : birthdayOfAge(birth, age);
}

/* ------------------------------------------------------------------ */
/* 출생연도별 페이지 (/age/<year>/)                                      */
/* ------------------------------------------------------------------ */

export const AGE_PAGE_FIRST_YEAR = 1930;
/** Pages run up to the rule year (babies born this year). */
export const AGE_PAGE_LAST_YEAR = RULE_YEAR;
export const AGE_PAGE_YEARS: number[] = Array.from(
  { length: AGE_PAGE_LAST_YEAR - AGE_PAGE_FIRST_YEAR + 1 },
  (_, i) => AGE_PAGE_FIRST_YEAR + i,
);

/**
 * Attach a Korean particle chosen by the word's final consonant (받침).
 * josa("말", "이라서", "라서") → "말이라서", josa("쥐", "은", "는") → "쥐는"
 */
export function josa(word: string, withFinal: string, withoutFinal: string): string {
  const last = word.charCodeAt(word.length - 1);
  const hasFinal = last >= 0xac00 && last <= 0xd7a3 && (last - 0xac00) % 28 !== 0;
  return word + (hasFinal ? withFinal : withoutFinal);
}

/** 1990 → "90", 2005 → "05" */
export function shortYear(y: number): string {
  return String(mod(y, 100)).padStart(2, "0");
}

/**
 * 성년이 된 해. 민법 성년은 2013년 7월 1일부터 19세(그 전 20세).
 * 1992년 이전 출생 → 만 20세, 1993년생 → 모두 2013년(만 19~20세), 1994년 이후 → 만 19세.
 */
export function adulthood(birthYear: number): { year: number; age: string } {
  if (birthYear <= 1992) return { year: birthYear + 20, age: "만 20세" };
  if (birthYear === 1993) return { year: 2013, age: "만 19~20세" };
  return { year: birthYear + 19, age: "만 19세" };
}

/**
 * 처음 선거권을 갖게 된 해. 선거연령은 20세 → 19세(2005년 8월 공직선거법 개정) → 18세(2020년 1월 개정).
 * 1985년 이전 출생 → 만 20세, 1986~2001년생 → 만 19세, 2002년 이후 → 만 18세.
 * 1950년 이전 출생자는 선거연령 변천(1960년 이전 21세)이 얽혀 계산하지 않는다(null).
 */
export function firstVoteYear(birthYear: number): { year: number; age: string } | null {
  if (birthYear < 1950) return null;
  if (birthYear <= 1985) return { year: birthYear + 20, age: birthYear === 1985 ? "만 19~20세" : "만 20세" };
  if (birthYear <= 2001) return { year: birthYear + 19, age: birthYear === 2001 ? "만 18~19세" : "만 19세" };
  return { year: birthYear + 18, age: "만 18세" };
}

/** 지금의 민법(법률 제471호)이 시행된 해. 그 전에는 조선민사령(의용민법)이 성년(20세)을 정했다. */
export const CIVIL_CODE_EFFECTIVE_YEAR = 1960;

/** Milestone label for the year a cohort came of age; the 민법 did not exist before 1960. */
export function adultMilestoneLabel(adultYear: number): string {
  return adultYear < CIVIL_CODE_EFFECTIVE_YEAR ? "성년이 되는 해" : "민법상 성년이 되는 해";
}

export type Milestone = { year: number; label: string; age: string; current?: boolean };

/**
 * Life milestones for everyone born in `birthYear`, sorted by year.
 * Rules that changed over time are applied as they stood at the time; rules whose
 * history is unclear are only listed for cohorts that reached them under today's law.
 */
export function cohortMilestones(birthYear: number, ruleYear: number = RULE_YEAR): Milestone[] {
  const Y = birthYear;
  const list: Milestone[] = [];
  const school = schoolYears(Y, 3);
  if (school) {
    list.push({ year: school.elementaryEntry, label: "초등학교 입학 (3월)", age: "만 6~7세" });
    list.push({ year: school.middleEntry, label: "중학교 입학", age: "만 12~13세" });
    list.push({ year: school.highEntry, label: "고등학교 입학", age: "만 15~16세" });
    list.push({ year: school.highGrad, label: "고등학교 졸업·대학 입학", age: "만 18~19세" });
  }
  if (Y >= 2000) {
    list.push({ year: Y + 18, label: "병역준비역 편입 (남성, 1월 1일)", age: "연 18세" });
    list.push({ year: Y + 19, label: "병역판정검사 (남성)", age: "연 19세" });
  }
  if (Y >= 1990) {
    list.push({ year: Y + 18, label: "운전면허 응시 가능 (생일부터)", age: "만 18세" });
    list.push({ year: Y + 19, label: "술·담배 구매 가능 (1월 1일부터)", age: "연 19세" });
  }
  const vote = firstVoteYear(Y);
  if (vote) list.push({ year: vote.year, label: "처음 선거권을 갖는 해", age: vote.age });
  const adult = adulthood(Y);
  list.push({ year: adult.year, label: adultMilestoneLabel(adult.year), age: adult.age });
  list.push({ year: Y + 60, label: "환갑 (회갑)", age: "만 60세" });
  if (Y >= 1953) {
    const p = pensionStartAge(Y);
    // 수급 연령에 도달한 해. 실제 지급은 그다음 달부터(국민연금법 제54조)라 12월생은 보통 이듬해 1월에 첫 연금을 받는다.
    list.push({ year: Y + p, label: "국민연금 수급 연령 도달", age: `만 ${p}세` });
  }
  list.push({
    year: Y + 65,
    label: Y >= 1949 ? "기초연금·경로우대 대상 연령" : "경로우대 대상 연령",
    age: "만 65세",
  });
  list.push({ year: Y + 69, label: "칠순 (고희)", age: "세는 나이 70세" });
  list.push({ year: Y + 79, label: "팔순", age: "세는 나이 80세" });
  list.push({ year: ruleYear, label: "올해", age: manAgeRangeLabel(Y, ruleYear, "~"), current: true });
  // Stable sort by year; the "올해" marker goes first within its year.
  return list
    .map((m, i) => ({ m, i }))
    .sort((a, b) => a.m.year - b.m.year || Number(!!b.m.current) - Number(!!a.m.current) || a.i - b.i)
    .map(({ m }) => m);
}

/** Birth years around `y` (inclusive), clipped to the page range. */
export function neighborYears(y: number, radius = 5): number[] {
  const out: number[] = [];
  for (let x = y - radius; x <= y + radius; x++) if (x >= AGE_PAGE_FIRST_YEAR && x <= AGE_PAGE_LAST_YEAR) out.push(x);
  return out;
}
