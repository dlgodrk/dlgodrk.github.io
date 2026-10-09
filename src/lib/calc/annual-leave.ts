/**
 * 연차 유급휴가 계산 (근로기준법 제60조, 2020. 3. 31. 개정 반영 · 2026년 10월 확인).
 *
 * - 제60조①: 1년간 80% 이상 출근 → 15일.
 * - 제60조②: 계속근로 1년 미만(또는 1년간 80% 미만 출근) → 1개월 개근 시 1일. 1년 미만은 최대 11일.
 *   최초 1년이 80% 미만이면 15일은 생기지 않고, 그 1년의 개근한 달마다 이미 생긴 월차만 남는다(같은 달에 두 번 생기지 않음).
 * - 제60조⑥: 업무상 재해 휴업, 출산전후휴가 등, 육아휴직 기간과 육아기·임신기 근로시간 단축으로 줄어든 시간은 출근으로 본다.
 * - 제60조④: 3년 이상 계속근로 → 최초 1년을 초과하는 계속근로연수 매 2년에 1일 가산, 총 25일 한도.
 * - 제60조⑦: 1년 미만 근로자의 ②휴가는 최초 1년의 근로가 끝날 때까지 사용하지 않으면 소멸(2020. 3. 31. 개정).
 * - 대법원 2021. 10. 14. 선고 2021다227100 / 고용노동부 행정해석 변경(2021. 12. 16. 시행):
 *   15일은 1년의 근로를 마친 "다음 날"(366일째)에 근로관계가 있어야 생긴다. 1년 계약 만료 퇴직자는 최대 11일.
 * - 대법원 2022. 9. 7. 선고 2022다245419: 1년을 넘겨 일하면 11일 + 15일 = 최대 26일.
 * - 회계연도 기준(행정해석상 허용): 입사 연도는 15일 × 입사 연도 재직일수 ÷ 365 비례 부여(+ 1년 미만 월차),
 *   다음 해부터 1월 1일에 일괄 부여. 퇴직 시 입사일 기준보다 적으면 그 차이를 정산한다.
 *
 * All dates are YMD values (timezone-safe). "기준일(asOf)" is a day the worker is employed;
 * a leave that arises on asOf counts as arisen.
 */
import { addDays, addMonths, compareYMD, diffDays, isValidYMD, type YMD } from "@/lib/date";

export const ANNUAL_BASE_DAYS = 15;
export const ANNUAL_CAP_DAYS = 25;
/** 1년 미만 근로자의 월 단위 연차 최대 일수 (1개월 개근 × 11개월) */
export const MONTHLY_LEAVE_MAX = 11;
/** 회계연도 비례 연차의 분모 (고용노동부 실무 산식: 15 × 재직일수 / 365) */
export const PRORATA_DENOMINATOR = 365;

export type LeaveBasis = "hire" | "fiscal";

/**
 * 근속(만) n년이 되는 날 생기는 연차 일수. 제60조①④.
 * 1·2년 15일, 3·4년 16일, 5·6년 17일 … 21년 이상 25일. n < 1 이면 0.
 */
export function annualLeaveDays(serviceYears: number): number {
  if (!Number.isFinite(serviceYears) || serviceYears < 1) return 0;
  const n = Math.floor(serviceYears);
  return Math.min(ANNUAL_CAP_DAYS, ANNUAL_BASE_DAYS + Math.floor((n - 1) / 2));
}

/** 15일을 넘는 가산 일수 (제60조④). */
export function bonusLeaveDays(serviceYears: number): number {
  const d = annualLeaveDays(serviceYears);
  return d === 0 ? 0 : d - ANNUAL_BASE_DAYS;
}

/**
 * 입사일부터 `months`개월을 채운 "다음 날" (= 그 기간의 연차가 생기는 날).
 * 민법 제160조: 기간은 마지막 달의 기산일에 해당하는 날의 전날 만료, 해당일이 없으면 그 달 말일 만료.
 * 예) 3월 4일 입사 → 1개월 다음 날 4월 4일, 1년 다음 날 이듬해 3월 4일.
 *     1월 31일 입사 → 1개월은 2월 말일 만료 → 3월 1일.
 */
export function periodNextDay(hire: YMD, months: number): YMD {
  if (months <= 0) return hire;
  const t = addMonths(hire, months);
  return t.d < hire.d ? addDays(t, 1) : t;
}

/** n주년 = 근속 n년을 채운 다음 날 (15일·가산휴가가 생기는 날). */
export function anniversary(hire: YMD, years: number): YMD {
  return periodNextDay(hire, years * 12);
}

/** 1년 미만 월차가 생기는 날 11개 (1개월 ~ 11개월을 채운 다음 날). */
export function monthlyAccrualDates(hire: YMD): YMD[] {
  return Array.from({ length: MONTHLY_LEAVE_MAX }, (_, i) => periodNextDay(hire, i + 1));
}

/** 기준일까지 채운 개월 수 (periodNextDay(hire, k) <= asOf 인 최대 k). */
export function completedMonths(hire: YMD, asOf: YMD): number {
  if (compareYMD(asOf, hire) <= 0) return 0;
  let k = Math.max(0, (asOf.y - hire.y) * 12 + (asOf.m - hire.m));
  while (k > 0 && compareYMD(periodNextDay(hire, k), asOf) > 0) k--;
  while (compareYMD(periodNextDay(hire, k + 1), asOf) <= 0) k++;
  return k;
}

export type Tenure = {
  years: number;
  months: number;
  days: number;
  /** 입사일을 1일째로 센 재직 일수 */
  dayCount: number;
  totalMonths: number;
};

/**
 * 근속기간 (표시용). 기준일도 근무한 날로 보고 기준일이 끝날 때까지 센다 — "재직 N일째"와 같은 방식.
 * 예) 2024. 3. 4. 입사 → 2025. 3. 3.까지 근무하면 1년 0개월 0일 (365일째).
 * 연차 발생 판단(기준일에 생기는 연차 포함)은 completedMonths(hire, asOf)를 쓰며 이 값과 다르다.
 */
export function tenure(hire: YMD, asOf: YMD): Tenure {
  const end = addDays(asOf, 1);
  const totalMonths = completedMonths(hire, end);
  return {
    years: Math.floor(totalMonths / 12),
    months: totalMonths % 12,
    days: diffDays(periodNextDay(hire, totalMonths), end),
    dayCount: diffDays(hire, asOf) + 1,
    totalMonths,
  };
}

/** 기준일까지 생긴 1년 미만 월차 수 (매달 개근 가정, 0~11). */
export function monthlyLeaveAccrued(hire: YMD, asOf: YMD): number {
  return Math.min(MONTHLY_LEAVE_MAX, completedMonths(hire, asOf));
}

/** 입사 연도 재직 일수 (입사일 ~ 12월 31일, 양 끝 포함). */
export function hireYearWorkedDays(hire: YMD): number {
  return diffDays(hire, { y: hire.y + 1, m: 1, d: 1 });
}

/**
 * 회계연도 기준 비례 연차: 15 × 입사 연도 재직일수 ÷ 365 (15일 한도).
 * 입사 다음 해 1월 1일에 생긴다. 소수점은 회사 규정(올림·시간 환산 등)에 따른다.
 */
export function fiscalProrataDays(hire: YMD): number {
  return Math.min(ANNUAL_BASE_DAYS, (ANNUAL_BASE_DAYS * hireYearWorkedDays(hire)) / PRORATA_DENOMINATOR);
}

/**
 * 회계연도 기준에서 y년 1월 1일에 적용하는 근속연수.
 * 이 계산기의 가정: 입사 연도를 1년으로 쳐서(입사 다음 해 = 1년, 비례 연차) 근로자에게 불리하지 않게 센다.
 * 법령·행정해석이 정한 방식은 아니며, 가산 시점을 1년 늦게 잡는 회사도 있다(퇴직 때 입사일 기준과 비교해 정산).
 */
export function fiscalServiceYears(hire: YMD, year: number): number {
  return year - hire.y;
}

/**
 * 가장 최근 연차를 낳은 기간(입사일 기준은 직전 1년, 회계연도 기준은 직전 해)의 출근율.
 * 생략하면 80% 이상으로 본다. 그보다 앞선 해는 모두 80% 이상으로 가정한다.
 */
export type LatestAttendance = {
  attended80: boolean;
  /** 80% 미만일 때 그 기간에 개근한 달 수 (0~11) */
  perfectMonths?: number;
};

function clampMonths(n: number | undefined): number {
  if (n === undefined || !Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(MONTHLY_LEAVE_MAX, Math.floor(n)));
}

/**
 * 출근율 80% 미만인 기간 뒤에 생기는 연차 (제60조②: 1개월 개근 시 1일).
 * 근속 1년(회계연도 기준은 입사 다음 해의 비례 연차)이면 0: 최초 1년의 개근한 달에는 이미 1년 미만 월차가
 * 생겼으므로 같은 달에 대해 다시 생기지 않고, 15일(비례 연차)도 생기지 않는다.
 */
export function lowAttendanceDays(serviceYears: number, perfectMonths: number | undefined): number {
  return serviceYears <= 1 ? 0 : clampMonths(perfectMonths);
}

/** 근속 n년째에 생기는 연 단위 연차. latestLow면 출근율 80% 미만으로 계산. */
function grantDays(serviceYears: number, latestLow: LatestAttendance | null): number {
  return latestLow ? lowAttendanceDays(serviceYears, latestLow.perfectMonths) : annualLeaveDays(serviceYears);
}

/**
 * 입사일 기준 누계: 기준일까지 생긴 월차 + 매 주년 연차.
 * 앞선 해는 80% 출근 가정, 가장 최근 주년 연차만 `latest` 출근율을 반영한다.
 */
export function cumulativeHireBasis(hire: YMD, asOf: YMD, latest?: LatestAttendance): number {
  if (compareYMD(asOf, hire) < 0) return 0;
  const low = latest && !latest.attended80 ? latest : null;
  let total = monthlyLeaveAccrued(hire, asOf);
  for (let n = 1; compareYMD(anniversary(hire, n), asOf) <= 0; n++) {
    const isLatest = compareYMD(anniversary(hire, n + 1), asOf) > 0;
    total += grantDays(n, isLatest ? low : null);
  }
  return total;
}

/**
 * 회계연도 기준 누계: 월차 + 비례 연차 + 매년 1월 1일 연차.
 * 앞선 해는 80% 출근 가정, 기준일이 속한 해의 1월 1일 연차만 `latest` 출근율을 반영한다.
 */
export function cumulativeFiscalBasis(hire: YMD, asOf: YMD, latest?: LatestAttendance): number {
  if (compareYMD(asOf, hire) < 0) return 0;
  const low = latest && !latest.attended80 ? latest : null;
  let total = monthlyLeaveAccrued(hire, asOf);
  if (asOf.y >= hire.y + 1) total += asOf.y === hire.y + 1 && low ? 0 : fiscalProrataDays(hire);
  for (let y = hire.y + 2; y <= asOf.y; y++) total += grantDays(fiscalServiceYears(hire, y), y === asOf.y ? low : null);
  return total;
}

export type LeaveEventKind = "monthly" | "annual" | "prorata";

export type LeaveEvent = {
  date: YMD;
  days: number;
  kind: LeaveEventKind;
  /** annual: 적용 근속연수 */
  serviceYears?: number;
};

export type LeaveInput = {
  hire: YMD;
  asOf: YMD;
  basis: LeaveBasis;
  /** 이번 연차를 낳은 직전 1년(회계연도 기준이면 직전 해)의 출근율이 80% 이상인지 */
  attended80: boolean;
  /** 80% 미만일 때 그 기간에 개근한 달 수 (제60조②, 0~11) */
  perfectMonths?: number;
};

export type CurrentLeave = {
  /** 지금 발생해 있는 연차 (사용분 차감 전) */
  days: number;
  /** 이번 연차 기간 */
  from: YMD;
  to: YMD;
  /** 이 기간 연차의 근거 */
  kind: "monthly" | "annual" | "annual-low" | "prorata";
  /** annual: 적용 근속연수 */
  serviceYears?: number;
  /** 지금 포함된 1년 미만 월차 (아직 소멸 전인 것) */
  monthlyIncluded: number;
  /** 회계연도 기준 비례 연차 (입사 다음 해만) */
  prorata?: number;
};

export type LeaveResult = {
  tenure: Tenure;
  firstAnniversary: YMD;
  /** 기준일까지 생긴 1년 미만 월차 (0~11) */
  monthlyAccrued: number;
  monthlyDates: YMD[];
  current: CurrentLeave;
  /** 기준일 다음으로 연차가 생기는 날 (같은 날 여러 건이면 합산) */
  next: { date: YMD; days: number; events: LeaveEvent[] } | null;
  /** 앞으로 생길 연 단위 연차 (주년 또는 1월 1일), 80% 출근 가정 */
  upcoming: LeaveEvent[];
  /** 누계. 가장 최근 연차는 입력한 출근율을 두 방식 모두에 반영 */
  cumulative: { hire: number; fiscal: number };
  /** 회계연도 기준 비례 연차 정보 */
  prorata: { days: number; workedDays: number };
  /**
   * 지금 연차 기간에 어떤 출근율 입력이 결과를 바꾸는지.
   * none: 입사 1년 미만 월차만 (개근 가정) · rate: 80% 여부만 (최초 1년 뒤) · months: 80% 여부 + 개근한 달 수
   */
  attendanceInputs: "none" | "rate" | "months";
  /** 출근율 80% 미만 입력이 실제로 지금 연차에 반영됐는지 */
  lowApplied: boolean;
};

function jan1(y: number): YMD {
  return { y, m: 1, d: 1 };
}

function dec31(y: number): YMD {
  return { y, m: 12, d: 31 };
}

/** Full calculation for the calculator. Returns null for invalid input (기준일 < 입사일 등). */
export function calculateLeave(input: LeaveInput): LeaveResult | null {
  const { hire, asOf, basis, attended80 } = input;
  if (!isValidYMD(hire) || !isValidYMD(asOf) || compareYMD(asOf, hire) < 0) return null;
  const latest: LatestAttendance = { attended80, perfectMonths: input.perfectMonths };

  const ten = tenure(hire, asOf);
  const firstAnniversary = anniversary(hire, 1);
  const monthlyDates = monthlyAccrualDates(hire);
  const monthlyAccrued = monthlyLeaveAccrued(hire, asOf);
  const beforeFirstAnniv = compareYMD(asOf, firstAnniversary) < 0;
  const prorataDays = fiscalProrataDays(hire);
  // 연차 발생은 기준일에 생기는 연차까지 센다 (표시용 tenure와 다름).
  const yearsDone = Math.floor(completedMonths(hire, asOf) / 12);

  let current: CurrentLeave;
  if (basis === "hire") {
    if (yearsDone < 1) {
      current = {
        days: monthlyAccrued,
        from: hire,
        to: addDays(firstAnniversary, -1),
        kind: "monthly",
        monthlyIncluded: monthlyAccrued,
      };
    } else {
      const from = anniversary(hire, yearsDone);
      const to = addDays(anniversary(hire, yearsDone + 1), -1);
      current = attended80
        ? { days: annualLeaveDays(yearsDone), from, to, kind: "annual", serviceYears: yearsDone, monthlyIncluded: 0 }
        : {
            days: lowAttendanceDays(yearsDone, input.perfectMonths),
            from,
            to,
            kind: "annual-low",
            serviceYears: yearsDone,
            monthlyIncluded: 0,
          };
    }
  } else {
    const y = asOf.y;
    if (y === hire.y) {
      current = {
        days: monthlyAccrued,
        from: hire,
        to: dec31(y),
        kind: "monthly",
        monthlyIncluded: monthlyAccrued,
      };
    } else if (y === hire.y + 1) {
      const monthlyIncluded = beforeFirstAnniv ? monthlyAccrued : 0;
      const p = attended80 ? prorataDays : 0;
      current = {
        days: p + monthlyIncluded,
        from: jan1(y),
        to: dec31(y),
        kind: "prorata",
        prorata: p,
        monthlyIncluded,
      };
    } else {
      const n = fiscalServiceYears(hire, y);
      current = attended80
        ? { days: annualLeaveDays(n), from: jan1(y), to: dec31(y), kind: "annual", serviceYears: n, monthlyIncluded: 0 }
        : {
            days: lowAttendanceDays(n, input.perfectMonths),
            from: jan1(y),
            to: dec31(y),
            kind: "annual-low",
            serviceYears: n,
            monthlyIncluded: 0,
          };
    }
  }

  // 개근한 달 수는 근속 2년 이상(회계연도 기준은 입사 2년 뒤 해부터)의 80% 미만 연차에만 쓰인다.
  const attendanceInputs: LeaveResult["attendanceInputs"] =
    current.kind === "monthly"
      ? "none"
      : current.kind === "prorata" || (current.serviceYears ?? 0) <= 1
        ? "rate"
        : "months";

  // Future events after asOf.
  const events: LeaveEvent[] = monthlyDates
    .filter((d) => compareYMD(d, asOf) > 0)
    .map((date) => ({ date, days: 1, kind: "monthly" as const }));
  const upcoming: LeaveEvent[] = [];
  if (basis === "hire") {
    let n = 1;
    while (compareYMD(anniversary(hire, n), asOf) <= 0) n++;
    for (let i = 0; i < 4; i++, n++) {
      upcoming.push({ date: anniversary(hire, n), days: annualLeaveDays(n), kind: "annual", serviceYears: n });
    }
  } else {
    for (let y = asOf.y + 1; upcoming.length < 4; y++) {
      if (y === hire.y + 1) upcoming.push({ date: jan1(y), days: prorataDays, kind: "prorata" });
      else {
        const n = fiscalServiceYears(hire, y);
        upcoming.push({ date: jan1(y), days: annualLeaveDays(n), kind: "annual", serviceYears: n });
      }
    }
  }
  events.push(upcoming[0]);
  events.sort((a, b) => compareYMD(a.date, b.date));
  const first = events[0];
  const same = events.filter((e) => compareYMD(e.date, first.date) === 0);
  const next = { date: first.date, days: same.reduce((s, e) => s + e.days, 0), events: same };

  return {
    tenure: ten,
    firstAnniversary,
    monthlyAccrued,
    monthlyDates,
    current,
    next,
    upcoming,
    cumulative: { hire: cumulativeHireBasis(hire, asOf, latest), fiscal: cumulativeFiscalBasis(hire, asOf, latest) },
    prorata: { days: prorataDays, workedDays: hireYearWorkedDays(hire) },
    attendanceInputs,
    lowApplied: !attended80 && attendanceInputs !== "none",
  };
}

/** 근속연수별 연차표 (1년 ~ 21년). cumulative는 1년 미만 월차 11일을 포함한 입사 후 누계. */
export type LeaveTableRow = { years: number; days: number; bonus: number; cumulative: number };

export function leaveTable(maxYears = 21): LeaveTableRow[] {
  const rows: LeaveTableRow[] = [];
  let cumulative = MONTHLY_LEAVE_MAX;
  for (let n = 1; n <= maxYears; n++) {
    const days = annualLeaveDays(n);
    cumulative += days;
    rows.push({ years: n, days, bonus: bonusLeaveDays(n), cumulative });
  }
  return rows;
}

/** 근속연수가 처음으로 25일 한도에 닿는 해. */
export const YEARS_TO_CAP = 21;

/** 연차수당 = 1일 통상임금 × 미사용 일수. 1일 통상임금 = 통상시급 × 1일 소정근로시간. */
export function leaveAllowance(hourlyOrdinaryWage: number, dailyHours: number, unusedDays: number): number {
  if (![hourlyOrdinaryWage, dailyHours, unusedDays].every((v) => Number.isFinite(v) && v >= 0)) return NaN;
  return Math.round(hourlyOrdinaryWage * dailyHours) * unusedDays;
}

/** 2026년 최저임금 시급 (2025년 8월 고용노동부 고시, 2026. 1. 1. 시행) — 연차수당 예시용 */
export const MIN_WAGE_2026 = 10_320;
