/**
 * Naver blog posts built from the site's own calculators (src/lib/calc/*.ts), so every number in a post
 * is exactly what https://dlgodrk.github.io/ shows for the same conditions.
 *
 * Output: docs/blog/<file>.html — written / checked by scripts/blog/posts.test.ts.
 * Voice: 합니다체, no emoji, no exclamation marks (docs/CONVENTIONS.md).
 */
import { calcSalary, type SalaryInput, type SalaryResult } from "@/lib/calc/salary";
import { pensionBounds } from "@/lib/rates/insurance";
import {
  calcMinimumWage,
  hourlyMinimum,
  MINIMUM_WAGE_HISTORY,
  netMonthly,
  type MinWageResult,
  type MinWageYear,
} from "@/lib/calc/minimum-wage";
import { RATE_2027_NOTE } from "@/lib/calc/hourly-wage";
import {
  holidayBlocks,
  holidaysOf,
  holidayYMD,
  isWeekendOnly,
  leaveDatesLabel,
  leaveTips,
  longestByLeave,
  md,
  mdw,
  shortHolidayName,
  shortMdw,
  yearSummary,
  type HolidayBlock,
  type LeavePlan,
  type LeaveTip,
} from "@/lib/calc/holidays";
import { minimumMonthly } from "@/lib/rates/labor";
import { compareYMD, weekdayKo, type YMD } from "@/lib/date";
import { formatNumber, manwonLabel } from "@/lib/format";
import { caption, h2, link, note, p, page, table, ul } from "./html";

export const CATEGORY = "생활 계산기";
const CHECKED = "2026년 10월 9일";

/**
 * The author runs the site, so every post says so in the paragraph that carries the link
 * (docs/community/README.md: 만든 사람임을 밝힙니다). posts.test.ts checks it.
 */
export const DISCLOSURE = "셈셈 계산기는 제가 직접 만들어 운영하는 무료 계산기 사이트입니다.";

/** A sentence in a post states a comparison; fail the build instead of publishing it when the data no longer agrees. */
function claim(ok: boolean, what: string): void {
  if (!ok) throw new Error(`blog post claim no longer true: ${what}`);
}

export type Post = {
  /** File name under docs/blog/ */
  file: string;
  title: string;
  tags: string[];
  /** Site paths linked from the post body */
  links: string[];
  html: string;
};

const n = (x: number) => formatNumber(x);
const won = (x: number) => `${formatNumber(x)}원`;
const pct1 = (ratio: number) => `${(ratio * 100).toFixed(1)}%`;
const range = (from: number, to: number, step: number) =>
  Array.from({ length: Math.floor((to - from) / step) + 1 }, (_, i) => from + i * step);

// ---------------------------------------------------------------------------
// 1. 2026 연봉 실수령액 표
// ---------------------------------------------------------------------------

export const SALARY_PAY_MONTH = "2026-10";
export const SALARY_NON_TAXABLE = 200_000;
/** 연봉 rows (만원): 2,400~5,000 every 200, 5,500~10,000 every 500. */
export const SALARY_TABLE_MANWON = [...range(2_400, 5_000, 200), ...range(5_500, 10_000, 500)];
/** Columns of the 공제 내역 table (만원). */
export const SALARY_DETAIL_MANWON = [3_000, 4_000, 6_000, 10_000];

/** 연봉(만원) → the site's calcSalary with the post's fixed conditions (비과세 20만원, 1인, 100%, 2026년 10월분). */
export function salaryRow(manwon: number, extra: Partial<SalaryInput> = {}): SalaryResult {
  return calcSalary({
    annual: manwon * 10_000,
    nonTaxable: SALARY_NON_TAXABLE,
    family: 1,
    children: 0,
    ratio: 100,
    payMonth: SALARY_PAY_MONTH,
    ...extra,
  });
}

/** 2027 국민연금 근로자 5.0% on the same 기준소득월액, 10원 미만 절사 (as on the site's /salary/ page). */
export function pension2027(r: SalaryResult): number {
  return Math.floor((r.insurance.pensionBase * 500) / 100_000) * 10;
}

/** Smallest 연봉 (만원) whose 과세 급여 reaches the 국민연금 기준소득월액 상한 (8,148만원). */
export function pensionCapManwon(): number {
  return Math.ceil(((pensionBounds(SALARY_PAY_MONTH).high + SALARY_NON_TAXABLE) * 12) / 10_000);
}

/** Table rows (만원) whose 세전 월급 is below the 2026 최저임금 월 환산액 for 주 40시간 (2,156,880원). */
export function belowMinimumManwon(): number[] {
  return SALARY_TABLE_MANWON.filter((m) => salaryRow(m).monthlyGross < minimumMonthly(2026));
}

/** Table rows whose 월 실수령액 changes under the 2026년 11월분 장기요양 rule (× 0.1314). */
export function novemberChanges(): { manwon: number; diff: number }[] {
  return SALARY_TABLE_MANWON.map((m) => ({
    manwon: m,
    diff: salaryRow(m, { payMonth: "2026-11" }).monthlyNet - salaryRow(m).monthlyNet,
  })).filter((x) => x.diff !== 0);
}

function salaryPost(): Post {
  const rows = SALARY_TABLE_MANWON.map((m) => ({ m, r: salaryRow(m) }));
  const r3 = salaryRow(3_000);
  const r4 = salaryRow(4_000);
  const r5 = salaryRow(5_000);
  const r10 = salaryRow(10_000);
  const grossUp = r5.monthlyGross - r4.monthlyGross;
  const netUp = r5.monthlyNet - r4.monthlyNet;
  const capManwon = pensionCapManwon();
  const capPension = r10.insurance.pension;
  const noNonTaxable = salaryRow(4_000, { nonTaxable: 0 });
  const family4 = salaryRow(5_000, { family: 4, children: 2 });
  const nov = novemberChanges();
  const p27 = pension2027(r4);
  const detail = SALARY_DETAIL_MANWON.map((m) => salaryRow(m));
  // 주 40시간 최저임금 월 환산액 (209시간, 식대 등 매달 주는 복리후생비 포함 비교). Rows below it get a warning.
  const minMonthly26 = minimumMonthly(2026);
  const belowMin = belowMinimumManwon();
  const minWageSentence = belowMin.length
    ? ` 주 40시간 근무라면 2026년 최저임금 월 환산액이 ${won(minMonthly26)}(연 ${won(minMonthly26 * 12)})이라, 연봉 ${belowMin
        .map((m) => manwonLabel(m))
        .join("·")}은 주 40시간보다 짧게 일하는 경우가 아니면 최저임금에 못 미칩니다.`
    : "";
  claim(r3.tax.total < r3.insurance.total, "연봉 3,000만원: 세금 < 4대보험");
  claim(r10.tax.total > r10.insurance.total, "연봉 1억원: 세금 > 4대보험");

  const title = "2026 연봉 실수령액 표, 2,400만~1억 세후 월급 정리";
  const tags = [
    "연봉실수령액",
    "2026연봉실수령액표",
    "연봉실수령액표",
    "실수령액계산기",
    "세후월급",
    "월급실수령액",
    "4대보험",
    "간이세액표",
    "연봉협상",
    "생활계산기",
  ];

  const novSentence = nov.length
    ? `표의 연봉 가운데 ${nov.map((x) => manwonLabel(x.manwon)).join("·")}은 장기요양보험료가 ${won(Math.abs(nov[0].diff))} ${
        nov[0].diff > 0 ? "줄어 실수령액이 그만큼 늘고" : "늘어 실수령액이 그만큼 줄고"
      }, 나머지 연봉은 금액이 같습니다.`
    : "표의 연봉은 모두 금액이 같습니다.";

  const body = [
    p(
      `연봉 계약서에 적힌 금액과 매달 통장에 들어오는 월급은 다릅니다. 국민연금·건강보험·장기요양보험·고용보험 4대보험과 소득세·지방소득세가 먼저 빠지기 때문입니다. 2026년 10월 급여에 적용되는 요율과 국세청 근로소득 간이세액표로 연봉 2,400만원부터 1억원까지 실제로 받는 월급을 계산해 표로 정리했습니다.`,
    ),
    h2("계산 조건"),
    ul([
      "비과세 식대 월 20만원, 공제대상가족은 본인 1명, 소득세는 간이세액표 금액의 100%를 뗍니다.",
      "2026년 10월분 급여 기준이며, 퇴직금이 연봉에 포함되지 않은 경우(연봉 ÷ 12)입니다.",
      "연 실수령액은 월 실수령액에 12를 곱한 값으로, 연말정산 환급이나 추가 납부는 들어 있지 않습니다.",
    ]),
    h2("2026 연봉별 실수령액 표 (2,400만~1억원)"),
    caption("표 1. 연봉별 월 실수령액 (단위: 원)"),
    table({
      head: ["연봉", "세전 월급", "공제 합계", "월 실수령액", "공제율"],
      rows: rows.map(({ m, r }) => [
        manwonLabel(m),
        n(r.monthlyGross),
        n(r.deductions),
        `<strong>${n(r.monthlyNet)}</strong>`,
        pct1(r.deductionRate),
      ]),
    }),
    note(`세전 월급은 연봉을 12로 나눠 원 미만을 버린 금액이고, 공제율은 공제 합계를 세전 월급으로 나눈 값입니다.${minWageSentence}`),
    p(
      `연봉 3,000만원이면 월 ${won(r3.monthlyNet)}, 4,000만원이면 ${won(r4.monthlyNet)}, 5,000만원이면 ${won(
        r5.monthlyNet,
      )}을 받습니다. 연봉 1억원은 세전 월급이 ${won(r10.monthlyGross)}이지만 ${pct1(r10.deductionRate)}가 공제되어 ${won(
        r10.monthlyNet,
      )}이 들어옵니다.`,
    ),
    h2("어디서 얼마가 빠지나"),
    p(
      "2026년 근로자 부담 요율은 국민연금 4.75%, 건강보험 3.595%, 고용보험 0.9%이고, 장기요양보험료는 건강보험료의 약 13.14%입니다. 소득세는 근로소득 간이세액표(2026년 2월 27일 개정)에서 월 과세 급여와 가족 수로 찾고, 지방소득세는 소득세의 10%입니다. 비과세 식대 20만원은 보험료와 세금 계산에서 모두 빠집니다.",
    ),
    caption("표 2. 연봉별 공제 내역 (월, 단위: 원)"),
    table({
      head: ["항목", ...SALARY_DETAIL_MANWON.map((m) => manwonLabel(m))],
      rows: [
        ["세전 월급", ...detail.map((r) => n(r.monthlyGross))],
        ["국민연금", ...detail.map((r) => n(r.insurance.pension))],
        ["건강보험", ...detail.map((r) => n(r.insurance.health))],
        ["장기요양보험", ...detail.map((r) => n(r.insurance.longTermCare))],
        ["고용보험", ...detail.map((r) => n(r.insurance.employment))],
        ["소득세", ...detail.map((r) => n(r.tax.incomeTax))],
        ["지방소득세", ...detail.map((r) => n(r.tax.localTax))],
        ["공제 합계", ...detail.map((r) => n(r.deductions))],
        ["월 실수령액", ...detail.map((r) => n(r.monthlyNet))],
        ["연 실수령액", ...detail.map((r) => n(r.annualNet))],
      ],
      boldRows: [8],
    }),
    p(
      `연봉이 낮을 때는 공제액 대부분이 4대보험이지만, 연봉이 오를수록 세금 비중이 커집니다. 연봉 3,000만원은 소득세와 지방소득세가 ${won(
        r3.tax.total,
      )}으로 4대보험(${won(r3.insurance.total)})의 ${Math.round((r3.tax.total / r3.insurance.total) * 100)}% 수준인데, 1억원에서는 ${won(
        r10.tax.total,
      )}으로 4대보험(${won(r10.insurance.total)})보다 많습니다.`,
    ),
    h2("표를 볼 때 알아 둘 점"),
    ul([
      `<strong>오른 연봉이 다 들어오지는 않습니다.</strong> 연봉이 4,000만원에서 5,000만원으로 오르면 세전 월급은 ${won(
        grossUp,
      )} 늘지만 실수령액은 ${won(netUp)} 늘어납니다. 늘어난 금액의 약 ${Math.round((netUp / grossUp) * 100)}%만 손에 남는 셈입니다.`,
      `<strong>국민연금에는 상한이 있습니다.</strong> 2026년 7월부터 2027년 6월까지 기준소득월액 상한은 ${n(
        pensionBounds(SALARY_PAY_MONTH).high / 10_000,
      )}만원입니다. 비과세를 뺀 월급이 이 상한에 닿는 연봉 ${manwonLabel(capManwon)}부터는 국민연금이 월 ${won(capPension)}으로 같습니다.`,
      `<strong>비과세 식대가 있으면 더 받습니다.</strong> 연봉 4,000만원에서 식대 20만원이 비과세가 아니라면 월 실수령액은 ${won(
        noNonTaxable.monthlyNet,
      )}으로, 비과세일 때보다 ${won(r4.monthlyNet - noNonTaxable.monthlyNet)} 적습니다.`,
      `<strong>부양가족이 많으면 소득세가 줄어듭니다.</strong> 연봉 5,000만원에서 공제대상가족이 본인 포함 4명이고 그중 8~20세 자녀가 2명이면 월 실수령액은 ${won(
        family4.monthlyNet,
      )}으로, 1인 기준보다 ${won(family4.monthlyNet - r5.monthlyNet)} 많습니다. 실제 세금은 연말정산에서 확정됩니다.`,
      `<strong>11월분부터 10원 차이가 날 수 있습니다.</strong> 개정 노인장기요양보험법에 따라 2026년 11월분 급여부터 장기요양보험료를 건강보험료 × 13.14%로 계산합니다. ${novSentence}`,
      `<strong>2027년에는 국민연금이 조금 더 빠집니다.</strong> 국민연금 근로자 요율이 2027년 5.0%로 오르면, 다른 조건이 같을 때 연봉 4,000만원의 국민연금은 월 ${won(
        r4.insurance.pension,
      )}에서 ${won(p27)}으로 ${won(p27 - r4.insurance.pension)} 늘어납니다.`,
    ]),
    h2("급여명세서와 금액이 다른 이유"),
    p(
      "국민연금은 전년도 소득이나 입사 때 신고한 보수로 정한 기준소득월액에, 건강보험은 회사가 신고한 보수월액에 매깁니다. 그래서 연봉이 오른 직후에는 실제 공제액이 표와 다를 수 있고, 건강보험료는 다음 해 4월 정산, 소득세는 연말정산으로 차액이 정리됩니다. 상여금이 나오는 달이나 식대 말고 다른 비과세 수당이 있을 때도 금액이 달라집니다.",
    ),
    h2("내 조건으로 바로 계산하기"),
    p(
      `부양가족 수, 비과세 금액, 퇴직금 포함 연봉처럼 조건이 다르면 실수령액도 달라집니다. ${DISCLOSURE} 이 사이트의 ${link(
        "/salary/",
        "연봉 실수령액 계산기",
      )}에 연봉이나 월급을 넣으면 항목별 공제 내역까지 바로 볼 수 있습니다. 2026년에는 접속한 달의 요율이 자동으로 적용되고, 2027년 요율은 확정되는 대로 반영됩니다.`,
    ),
    note(
      `출처: 국민연금공단·국민건강보험공단 2026년 보험료율, 고용노동부 고용보험료율(근로자 0.9%), 4대사회보험 정보연계센터 모의계산, 소득세법 시행령 별표2 근로소득 간이세액표(2026. 2. 27. 개정), 지방세법 제103조의13, 최저임금위원회 2026년 최저임금 (${CHECKED} 확인)`,
    ),
  ];

  return {
    file: "2026-salary-take-home-table.html",
    title,
    tags,
    links: ["/salary/"],
    html: page({
      title,
      category: CATEGORY,
      tags,
      basis: "src/lib/calc/salary.ts (calcSalary) · 2026년 10월분 요율 · 비과세 20만원 · 본인 1명",
      body,
    }),
  };
}

// ---------------------------------------------------------------------------
// 2. 2027 최저임금 월급·주급·주휴수당
// ---------------------------------------------------------------------------

export const MIN_WAGE_HOURS = [15, 20, 30, 40];

export function minWageRow(year: MinWageYear, weeklyHours: number): MinWageResult {
  return calcMinimumWage({ year, weeklyHours, dailyHours: 8 });
}

const hoursText = (h: number) => `${formatNumber(h, 2)}`;

/**
 * 주 40시간 최저임금 2026 → 2027: 세전·세후 인상액과, 그 차이 가운데 국민연금 요율 인상(4.75% → 5.0%)만의 몫.
 * rateOnly = 2027년 월급에 5.0%를 매긴 국민연금 − 같은 월급에 4.75%를 매긴 국민연금.
 * payDriven = 차이 − rateOnly (월급이 오른 만큼 늘어난 보험료·세금).
 */
export function minWageRaise(): { gross: number; net: number; gap: number; rateOnly: number; payDriven: number } {
  const g26 = minWageRow(2026, 40).monthly;
  const g27 = minWageRow(2027, 40).monthly;
  const n26 = netMonthly(g26, 40, 2026);
  const n27 = netMonthly(g27, 40, 2027);
  const rateOnly = n27.pension - netMonthly(g27, 40, 2026).pension;
  const gross = g27 - g26;
  const net = n27.net - n26.net;
  return { gross, net, gap: gross - net, rateOnly, payDriven: gross - net - rateOnly };
}

function minimumWagePost(): Post {
  const y27 = MIN_WAGE_HOURS.map((h) => minWageRow(2027, h));
  const y26 = MIN_WAGE_HOURS.map((h) => minWageRow(2026, h));
  const net27 = y27.map((r, i) => netMonthly(r.monthly, MIN_WAGE_HOURS[i], 2027));
  const net26 = y26.map((r, i) => netMonthly(r.monthly, MIN_WAGE_HOURS[i], 2026));
  const hist = MINIMUM_WAGE_HISTORY.find((x) => x.year === 2027);
  if (!hist) throw new Error("2027 minimum wage history missing");
  const full27 = y27[MIN_WAGE_HOURS.indexOf(40)];
  const full26 = y26[MIN_WAGE_HOURS.indexOf(40)];
  const fullNet27 = net27[MIN_WAGE_HOURS.indexOf(40)];
  const fullNet26 = net26[MIN_WAGE_HOURS.indexOf(40)];
  const h20 = y27[MIN_WAGE_HOURS.indexOf(20)];
  const wage = full27.hourly;
  const under = h20.monthly - wage * Math.floor(h20.monthlyPayHours);
  const over = wage * Math.ceil(h20.monthlyPayHours) - h20.monthly;
  const probation = hourlyMinimum(2027, true);
  const raise = minWageRaise();
  // The sentence says both causes add up: higher pay raises 보험료·세금, and the 2027 pension rate rises on top.
  claim(raise.rateOnly > 0, "2027 국민연금 요율 인상분 > 0");
  claim(raise.payDriven > 0 && fullNet27.taxTotal > fullNet26.taxTotal, "월급 인상으로 보험료·소득세도 증가");

  const title = `2027 최저임금 ${n(wage)}원 월급·주급·주휴수당 총정리`;
  const tags = [
    "2027최저임금",
    "최저임금10700원",
    "2027최저시급",
    "주휴수당",
    "주휴수당계산",
    "알바월급",
    "최저임금월급",
    "시급계산기",
    "주15시간",
    "생활계산기",
  ];

  const body = [
    p(
      `2027년 최저임금은 시간당 ${won(wage)}입니다. 2026년 ${won(full26.hourly)}보다 ${won(wage - full26.hourly)}(${hist.rate}%) 올랐고, 2026년 8월 5일 고시되어 2027년 1월 1일부터 근로자를 1명 이상 쓰는 모든 사업장에 적용됩니다. 주 40시간 일하면 주휴수당을 포함한 월 환산액이 ${won(
        full27.monthly,
      )}입니다. 주 15·20·30시간 아르바이트까지 근무시간별 주휴수당과 주급, 월급을 정리했습니다.`,
    ),
    h2("주휴수당 받는 조건과 계산법"),
    p(
      "주휴수당은 1주 동안 정해진 근무일을 모두 나온 근로자에게 주는 유급휴일 수당입니다(근로기준법 제55조, 같은 법 시행령 제30조 제1항). 4주를 평균한 1주 소정근로시간이 15시간 이상이어야 합니다(제18조 제3항). 상시 근로자 5명 미만 사업장에도 똑같이 적용됩니다.",
    ),
    p("<strong>주휴수당 = 시급 × (1주 소정근로시간 ÷ 40 × 8시간)</strong>"),
    p(
      `주 40시간 이상 일하면 주휴시간은 8시간으로 고정됩니다. 2027년 최저임금으로 주 20시간 일하면 주휴시간은 ${n(h20.juhyuHours)}시간이고 주휴수당은 ${n(
        wage,
      )} × ${n(h20.juhyuHours)} = ${won(h20.juhyuPay)}입니다.`,
    ),
    h2("2027 최저임금 근무시간별 주급·월급"),
    caption(`표 1. 2027년 최저임금 ${won(wage)} 기준 (세전, 단위: 원)`),
    table({
      head: ["주 근무시간", "주휴시간", "주휴수당(1주)", "주급(주휴 포함)", "월 환산 시간", "월급"],
      rows: y27.map((r, i) => [
        `주 ${MIN_WAGE_HOURS[i]}시간`,
        `${n(r.juhyuHours)}시간`,
        n(r.juhyuPay),
        n(r.weekly),
        r.monthly209 ? "209" : hoursText(r.monthlyHours),
        `<strong>${n(r.monthly)}</strong>`,
      ]),
    }),
    note(
      "월급 = 시급 × (주 소정근로시간 + 주휴시간) × 365 ÷ 7 ÷ 12, 원 단위 반올림. 월 환산 시간은 소수점 둘째 자리까지 표시했습니다.",
    ),
    p(
      `주 40시간의 월 환산 시간은 계산상 208.57시간이지만 최저임금 고시에서는 209시간으로 씁니다. 주 20시간은 (20 + 4) × 365 ÷ 7 ÷ 12 = 104.2857…시간이라 월급이 ${won(
        h20.monthly,
      )}이고, ${Math.floor(h20.monthlyPayHours)}시간으로 끊으면 ${won(under)} 적게, ${Math.ceil(
        h20.monthlyPayHours,
      )}시간으로 올리면 ${won(over)} 많게 나옵니다.`,
    ),
    h2("2026년보다 얼마나 오르고, 세후로는 얼마일까"),
    caption("표 2. 2026년·2027년 최저임금 월급 비교와 2027년 세후 예상 (단위: 원)"),
    table({
      head: ["주 근무시간", "2026년 월급", "2027년 월급", "인상액", "2027년 세후(예상)"],
      rows: y27.map((r, i) => [
        `주 ${MIN_WAGE_HOURS[i]}시간`,
        n(y26[i].monthly),
        n(r.monthly),
        `+${n(r.monthly - y26[i].monthly)}`,
        n(net27[i].net),
      ]),
    }),
    note(
      `세후(예상)는 4대보험 근로자 부담분과 소득세·지방소득세를 뺀 금액으로, 비과세 0원·공제대상가족 본인 1명 기준입니다. ${RATE_2027_NOTE}`,
    ),
    p(
      `주 40시간 근로자는 2027년에 월 ${won(full27.monthly - full26.monthly)}, 1년에 ${won(
        full27.annual - full26.annual,
      )}을 더 받습니다. 4대보험과 세금을 떼면 실수령액은 ${won(fullNet26.net)}에서 ${won(fullNet27.net)}으로 ${won(
        fullNet27.net - fullNet26.net,
      )} 늘어날 것으로 예상됩니다. 월급이 오르면 4대보험료와 소득세도 함께 늘고, 2027년에는 국민연금 근로자 요율까지 4.75%에서 5.0%로 오르기 때문에 세후 인상액은 세전 인상액보다 ${won(raise.gap)} 작습니다. 이 차이 가운데 요율 인상 몫은 ${won(
        raise.rateOnly,
      )}입니다.`,
    ),
    h2("놓치기 쉬운 5가지"),
    ul([
      `<strong>수습 감액은 조건이 까다롭습니다.</strong> 계약 기간이 1년 이상이거나 기간을 정하지 않은 근로자만 수습 3개월 동안 최저임금의 90%(2027년 ${won(
        probation,
      )})까지 줄 수 있습니다. 1년 미만 계약이거나 단순노무직이면 감액할 수 없습니다(최저임금법 제5조 제2항).`,
      "<strong>주 15시간 미만이면 주휴수당이 없습니다.</strong> 기준은 계약서의 1주 소정근로시간입니다. 근무 요일이 들쭉날쭉하다면 4주 동안의 소정근로시간을 더해 4로 나눠 확인합니다.",
      "<strong>정해진 시간을 넘기면 50%를 더 받습니다.</strong> 상시 5명 이상 사업장은 1일 8시간, 1주 40시간을 넘는 연장근로에 통상임금의 50%를 더 줘야 합니다(근로기준법 제50조·제56조). 주 15·20시간처럼 단시간으로 계약했다면 하루 8시간·주 40시간 안이라도 계약한 시간을 넘긴 만큼 50%를 더 받습니다(기간제법 제6조). 5명 미만 사업장은 두 경우 모두 가산 의무가 없습니다.",
      "<strong>3.3%를 뗀다면 계약 형태부터 확인해야 합니다.</strong> 3.3% 원천징수는 사업소득(프리랜서)에 쓰는 방식입니다. 사업주의 지휘·감독을 받으며 정해진 시간에 일했다면 계약 이름과 관계없이 근로자로 인정될 수 있고, 그러면 주휴수당도 받을 수 있습니다.",
      `<strong>월급제라면 매달 받는 수당까지 합쳐 봅니다.</strong> 2024년부터 매달 주는 상여금과 식대 같은 현금성 복리후생비도 전부 최저임금에 들어갑니다. 주 40시간 월급제라면 기본급에 이런 수당을 더한 금액이 ${won(
        full27.monthly,
      )} 이상인지 확인하면 됩니다.`,
    ]),
    h2("내 근무 조건으로 계산하기"),
    p(
      `${DISCLOSURE} 2026년과 2027년 최저임금 기준 일급·월급·연봉 차이와 수습 감액은 이 사이트의 ${link(
        "/minimum-wage/",
        "최저임금 계산기",
      )}에서 한 번에 비교할 수 있습니다. 시급과 근무시간을 직접 넣어 보려면 같은 사이트의 시급·주휴수당 계산기를 씁니다.`,
    ),
    note(
      `출처: 최저임금위원회 2027년 적용 최저임금 의결(2026. 7. 14.), 고용노동부 최저임금 고시(2026. 8. 5.), 근로기준법 제18조·제50조·제55조·제56조 및 같은 법 시행령 제30조, 최저임금법 제5조·제6조 및 같은 법 시행령 제3조·제5조, 기간제 및 단시간근로자 보호 등에 관한 법률 제6조 (${CHECKED} 확인)`,
    ),
  ];

  return {
    file: "2027-minimum-wage-monthly-pay.html",
    title,
    tags,
    links: ["/minimum-wage/"],
    html: page({
      title,
      category: CATEGORY,
      tags,
      basis: "src/lib/calc/minimum-wage.ts (calcMinimumWage, netMonthly) · 2027년 세후는 예상치",
      body,
    }),
  };
}

// ---------------------------------------------------------------------------
// 3. 2027 공휴일과 연차 붙이기
// ---------------------------------------------------------------------------

/** "2/6(토) ~ 2/9(화)", "5/5(수)", "2026년 12/25(금) ~ 2027년 1/3(일)" */
export function spanLabel(a: YMD, b: YMD): string {
  if (a.y === b.y && a.m === b.m && a.d === b.d) return shortMdw(a);
  if (a.y !== b.y) return `${a.y}년 ${shortMdw(a)} ~ ${b.y}년 ${shortMdw(b)}`;
  return `${shortMdw(a)} ~ ${shortMdw(b)}`;
}

/** "9월 11일(토)부터 19일(일)까지" for sentences. */
function fromTo(a: YMD, b: YMD): string {
  if (a.y !== b.y) return `${a.y}년 ${mdw(a)}부터 ${b.y}년 ${mdw(b)}까지`;
  return `${mdw(a)}부터 ${a.m === b.m ? `${b.d}일(${weekdayKo(b)})` : mdw(b)}까지`;
}

export type TipPlan = { tip: LeaveTip; plan: LeavePlan };

/** Every recommended plan of 2027, in date order. */
export function tipPlans(year = 2027): TipPlan[] {
  return leaveTips(year)
    .flatMap((tip) => tip.plans.map((plan) => ({ tip, plan })))
    .sort((a, b) => a.plan.start.y - b.plan.start.y || a.plan.start.m - b.plan.start.m || a.plan.start.d - b.plan.start.d);
}

function findPlan(plans: TipPlan[], label: string, leave: number): LeavePlan {
  const hit = plans.find((x) => x.tip.label.includes(label) && x.plan.leave === leave);
  if (!hit) throw new Error(`no 2027 leave plan for ${label} with ${leave} days`);
  return hit.plan;
}

function findBlock(blocks: HolidayBlock[], name: string): HolidayBlock {
  const hit = blocks.find((b) => b.name === name);
  if (!hit) throw new Error(`no 2027 holiday block named ${name}`);
  return hit;
}

/** A holiday of `year` on `date` (not a 대체공휴일). */
function holidayOn(year: number, date: string): YMD {
  const h = holidaysOf(year).find((x) => x.date === date && !x.substituteFor);
  if (!h) throw new Error(`no holiday on ${date}`);
  return holidayYMD(h);
}

/** The 대체공휴일 that replaces the holiday on `date`. */
function substituteOf(year: number, date: string): YMD {
  const h = holidaysOf(year).find((x) => x.substituteFor === date);
  if (!h) throw new Error(`no 대체공휴일 for ${date}`);
  return holidayYMD(h);
}

/** Every 연차 day of `plan` lies strictly between `a` and `b` (the sentence says "a와 b 사이"). */
function leaveBetween(plan: LeavePlan, a: YMD, b: YMD): boolean {
  return plan.leaveDates.every((d) => compareYMD(d, a) > 0 && compareYMD(d, b) < 0);
}

/**
 * For each 연차 count 1..4, the longest stretch of 2027 (same function as the /holidays/2027/ FAQ).
 * The post says one 연휴 wins at every count, so it fails here when that stops being true.
 */
export function longestTip(year = 2027): { tip: LeaveTip; maxima: { leave: number; plan: LeavePlan }[] } {
  const maxima = longestByLeave(leaveTips(year));
  const tip = maxima[0]?.tip;
  claim(!!tip && maxima.every((m) => m.tip === tip), `${year}: one 연휴 is the longest for every 연차 count`);
  return { tip, maxima: maxima.map(({ leave, plan }) => ({ leave, plan })) };
}

function holidaysCell(b: HolidayBlock): string {
  const list = b.holidays.map((h) => {
    const d = holidayYMD(h);
    return `${d.m}/${d.d} ${shortHolidayName(h)}`;
  });
  return isWeekendOnly(b) ? `${list.join(", ")} (일요일, 대체공휴일 없음)` : list.join(", ");
}

function holidaysPost(): Post {
  const s27 = yearSummary(2027);
  const s26 = yearSummary(2026);
  const blocks = holidayBlocks(2027);
  const golden = blocks.filter((b) => b.length >= 3);
  const longestBase = blocks.reduce((a, b) => (b.length > a.length ? b : a));
  const plans = tipPlans(2027);
  const chuseokBlock = findBlock(blocks, "추석 연휴");
  const chuseok = findPlan(plans, "추석", 2);
  const may1 = findPlan(plans, "노동절", 1);
  const may3 = findPlan(plans, "노동절", 3);
  const october = findPlan(plans, "한글날", 4);
  const yearEnd = findPlan(plans, "신정", 4);
  const seollal = findPlan(plans, "설", 3);
  const seollalBlock = findBlock(blocks, "설 연휴");
  // 추석 is the longest stretch for every 연차 count (1일 6일 … 4일 11일), as on /holidays/2027/.
  const longest = longestTip(2027);
  claim(longest.tip.label.includes("추석"), "2027: the longest 연휴 for every 연차 count is 추석");
  const longestAll = longest.maxima[longest.maxima.length - 1];
  // 노동절·제헌절: both on the same weekday in 2027, each with a 대체공휴일.
  const labor = holidayOn(2027, "2027-05-01");
  const constitution = holidayOn(2027, "2027-07-17");
  claim(weekdayKo(labor) === weekdayKo(constitution), "2027 노동절·제헌절 same weekday");
  const laborSub = substituteOf(2027, "2027-05-01");
  const constitutionSub = substituteOf(2027, "2027-07-17");
  // "노동절 대체공휴일과 어린이날 사이", "개천절 대체공휴일과 한글날 사이"
  const children = holidayOn(2027, "2027-05-05");
  claim(leaveBetween(may1, laborSub, children), "5/4 between 노동절 대체공휴일 and 어린이날");
  const foundationSub = substituteOf(2027, "2027-10-03");
  const hangul = holidayOn(2027, "2027-10-09");
  claim(leaveBetween(october, foundationSub, hangul), "10월 연차 between 개천절 대체공휴일 and 한글날");
  // 성탄절(2026)·신정(2027) on the same weekday
  const christmas = holidayOn(2026, "2026-12-25");
  const newYear = holidayOn(2027, "2027-01-01");
  claim(weekdayKo(christmas) === weekdayKo(newYear), "2026 성탄절 and 2027 신정 same weekday");

  const title = `2027 공휴일 총정리, 연차 ${chuseok.leave}일로 추석 ${chuseok.length}일 쉬는 법`;
  const tags = [
    "2027공휴일",
    "2027대체공휴일",
    "2027황금연휴",
    "2027연차꿀팁",
    "연차꿀팁",
    "2027달력",
    "2027추석",
    "2027설날",
    "빨간날",
    "생활계산기",
  ];

  const leaveCell = (pl: LeavePlan) => {
    const label = leaveDatesLabel(pl.leaveDates);
    return pl.leaveDates[0].y !== 2027 ? `${label} (${pl.leaveDates[0].y}년)` : label;
  };

  const body = [
    p(
      `2027년 달력의 빨간 날을 미리 알아 두면 같은 연차로 더 길게 쉴 수 있습니다. 우주항공청이 2026년 6월 29일 발표한 2027년도 월력요항에 따르면 2027년 실질 공휴일은 일요일을 포함해 ${s27.realDays}일입니다. 주 5일 근무자라면 토요일까지 더해 ${s27.restDays5}일을 쉬고 ${s27.workdays5}일을 일합니다. 대체공휴일은 ${s27.substitutes}일로 2026년(${s26.substitutes}일)보다 많지만, 평일에 쉬는 공휴일은 ${s27.onWeekdays}일로 2026년(${s26.onWeekdays}일)보다 ${
        s26.onWeekdays - s27.onWeekdays === 1 ? "하루" : `${s26.onWeekdays - s27.onWeekdays}일`
      } 적습니다.`,
    ),
    h2("2027년 공휴일과 연휴 한눈에 보기"),
    caption("표 1. 2027년 공휴일과 연휴 (토·일 쉬는 주 5일 근무 기준)"),
    table({
      head: ["연휴", "공휴일", "쉬는 기간", "일수"],
      rows: blocks.map((b) => [
        b.name,
        holidaysCell(b),
        spanLabel(b.start, b.end),
        isWeekendOnly(b) ? `${b.length}일(주말)` : `${b.length}일`,
      ]),
      align: ["center", "left", "center", "right"],
    }),
    p(
      `2026년 법 개정으로 노동절(${md(labor)})이 새로 공휴일이 되고 제헌절(${md(
        constitution,
      )})이 다시 공휴일이 되었으며, 두 날 모두 대체공휴일 대상입니다. 2027년에는 두 날이 모두 ${weekdayKo(labor)}요일이라 ${md(
        laborSub,
      )}과 ${md(constitutionSub)}이 처음으로 대체공휴일이 됩니다. 반대로 현충일(6월 6일)은 일요일인데 대체공휴일 대상이 아니어서 쉬는 날이 늘지 않습니다. 연차 없이 사흘 이상 쉬는 연휴는 모두 ${golden.length}번이고, 가장 긴 연휴는 ${longestBase.name} ${fromTo(
        longestBase.start,
        longestBase.end,
      )} ${longestBase.length}일입니다.`,
    ),
    h2("연차 붙이기 추천 조합"),
    p("연차 하루를 쓸 때 함께 따라오는 주말과 공휴일이 가장 많은 조합을 연휴별로 골랐습니다. 연차 4일을 써서 주말 이틀만 더 붙는 조합은 뺐습니다."),
    caption("표 2. 2027 연차 꿀팁 (주 5일 근무 기준)"),
    table({
      head: ["연휴", "연차 쓸 날", "연차", "쉬는 기간", "총 휴일"],
      rows: plans.map(({ tip, plan }) => [
        tip.label,
        leaveCell(plan),
        `${plan.leave}일`,
        spanLabel(plan.start, plan.end),
        `<strong>${plan.length}일</strong>`,
      ]),
      align: ["center", "left", "right", "center", "right"],
    }),
    p(
      `연차를 1~${longestAll.leave}일 중 며칠 쓰든 2027년에 가장 길게 쉴 수 있는 연휴는 추석입니다. 연차 ${longest.maxima
        .map((m) => `${m.leave}일이면 ${m.plan.length}일`)
        .join(", ")}을 쉽니다. 추석 연휴(9월 ${chuseokBlock.start.d}~${chuseokBlock.end.d}일)가 ${weekdayKo(
        chuseokBlock.start,
      )}~${weekdayKo(chuseokBlock.end)}요일이라 앞뒤 ${leaveDatesLabel(chuseok.leaveDates)}에 연차 ${chuseok.leave}일만 써도 ${fromTo(
        chuseok.start,
        chuseok.end,
      )} ${chuseok.length}일을 쉬고, 연차 ${longestAll.leave}일을 모두 쓴다면 ${leaveDatesLabel(longestAll.plan.leaveDates)}에 써서 ${fromTo(
        longestAll.plan.start,
        longestAll.plan.end,
      )} ${longestAll.plan.length}일을 쉽니다. 설 연휴는 ${fromTo(seollalBlock.start, seollalBlock.end)} ${seollalBlock.length}일이고, 바로 뒤 ${leaveDatesLabel(
        seollal.leaveDates,
      )}에 연차 ${seollal.leave}일을 붙이면 ${seollal.length}일이 됩니다.`,
    ),
    p(
      `5월에는 노동절 대체공휴일(${md(laborSub)})과 어린이날(${md(children)}) 사이 ${leaveDatesLabel(
        may1.leaveDates,
      )} 하루만 연차를 내면 ${fromTo(may1.start, may1.end)} ${may1.length}일을 쉽니다. ${leaveDatesLabel(may3.leaveDates)}에 연차 ${
        may3.leave
      }일을 쓰면 ${mdw(may3.end)}까지 ${may3.length}일로 늘어납니다. 10월에는 개천절 대체공휴일(${md(foundationSub)})과 한글날(${md(
        hangul,
      )}) 사이 ${leaveDatesLabel(october.leaveDates)}에 연차 ${october.leave}일을 쓰면 ${fromTo(october.start, october.end)} ${
        october.length
      }일을 쉽니다.`,
    ),
    p(
      `2026년 연차가 남았다면 올해 연말도 노려볼 만합니다. 성탄절(${md(christmas)})과 2027년 신정(${md(newYear)})이 모두 ${weekdayKo(
        christmas,
      )}요일이라, 그 사이 ${leaveDatesLabel(
        yearEnd.leaveDates,
      )}에 연차 ${yearEnd.leave}일을 쓰면 ${fromTo(yearEnd.start, yearEnd.end)} ${yearEnd.length}일을 쉽니다.`,
    ),
    h2("연차 쓰기 전에 확인할 것"),
    ul([
      "<strong>회사 규모:</strong> 상시 근로자 5명 이상 사업장은 관공서 공휴일과 대체공휴일을 유급휴일로 줘야 합니다(근로기준법 시행령 제30조 제2항). 5명 미만 사업장은 이 의무가 없고, 공휴일 가운데 노동절만 규모와 관계없이 유급휴일입니다. 5월 3일 노동절 대체공휴일은 5명 이상 사업장에만 해당합니다.",
      "<strong>신청 시기:</strong> 연차는 근로자가 원하는 날에 쓰는 것이 원칙이지만, 사업 운영에 막대한 지장이 있으면 회사가 시기를 바꿀 수 있습니다(근로기준법 제60조 제5항). 연휴 앞뒤는 신청이 몰리므로 일찍 내는 것이 좋습니다.",
      "<strong>연차 개수:</strong> 1년 동안 80% 이상 출근하면 15일, 입사 1년 미만이면 1개월 개근할 때마다 1일이 생깁니다(근로기준법 제60조). 2027년 1월 초에 입사했다면 9월 추석 연휴 전까지 최대 8일이 생깁니다. 다만 상시 5명 미만 사업장은 연차유급휴가 조항이 적용되지 않아(근로기준법 시행령 제7조 별표 1), 회사 규정이 없으면 법정 연차가 없습니다.",
      "<strong>근무 형태:</strong> 표는 토·일요일에 쉬는 주 5일 근무 기준입니다. 토요일에도 일하거나 교대 근무를 한다면 쉬는 날과 연차 조합이 달라집니다.",
    ]),
    h2("내 근무 조건으로 다시 계산하기"),
    p(
      `${DISCLOSURE} 이 사이트의 ${link(
        "/holidays/2027/",
        "2027년 공휴일·연차 꿀팁 페이지",
      )}에서 월별 근무일수와 연차 일수별로 가장 길게 쉬는 방법을 확인할 수 있습니다. 주 6일 근무나 5인 미만 사업장 기준으로 바꿔 계산할 수도 있습니다.`,
    ),
    note(
      `출처: 우주항공청 2027년도 월력요항(2026. 6. 29. 발표), 한국천문연구원 2027년 달력자료, 관공서의 공휴일에 관한 규정(대통령령 제36290호), 근로기준법 제60조, 근로기준법 시행령 제7조·제30조 (${CHECKED} 확인)`,
    ),
  ];

  return {
    file: "2027-holidays-leave-tips.html",
    title,
    tags,
    links: ["/holidays/2027/"],
    html: page({
      title,
      category: CATEGORY,
      tags,
      basis: "src/lib/calc/holidays.ts (holidayBlocks, leaveTips, yearSummary) · 주 5일 근무 기준",
      body,
    }),
  };
}

export function buildPosts(): Post[] {
  return [salaryPost(), minimumWagePost(), holidaysPost()];
}
