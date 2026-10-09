import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber } from "@/lib/format";
import {
  exactHoursLabel,
  freelanceTax,
  HOURLY_PAGE_HOURS,
  hoursLabel,
  insuredDeductions,
  JUHYU_MIN_WEEKLY_HOURS,
  MIN_WAGE_2026,
  MIN_WAGE_2027,
  payForWeeklyHours,
  RATE_2027_NOTE,
  scheduleForHours,
  shownHoursAreExact,
} from "@/lib/calc/hourly-wage";
import { HourlyWageCalculator } from "../HourlyWageCalculator";
import {
  hourlyBasis,
  HoursLinkGrid,
  NovemberNote,
  STATIC_MONTH_LABEL,
  WageLinkGrid,
  WageTable,
  WeeklyHoursTable,
  YearCompareTable,
} from "../tables";

// Only the listed weekly hours exist; anything else is a 404 (required for static export).
export const dynamicParams = false;

export function generateStaticParams() {
  return HOURLY_PAGE_HOURS.map((h) => ({ hours: String(h) }));
}

type Props = { params: Promise<{ hours: string }> };

function parse(raw: string): number | null {
  const n = Number(raw);
  return HOURLY_PAGE_HOURS.includes(n) ? n : null;
}

/**
 * "(20 + 4) × 365 ÷ 7 ÷ 12 ≈ 104.29시간" ("=" when exact, e.g. 182.5); only 40h shows "208.57 → 209시간 (고시 기준)".
 * The 0.01h value is for display; pay uses the exact hours (monthlyPayFormula).
 */
function monthlyHoursFormula(
  paid: string,
  p: { monthlyHoursExact: number; monthlyHours: number; monthly209: boolean },
): string {
  if (p.monthly209) return `${paid} × 365 ÷ 7 ÷ 12 = ${formatNumber(p.monthlyHoursExact, 2)} → 209시간 (고시 기준)`;
  const sign = Math.abs(p.monthlyHoursExact - p.monthlyHours) < 1e-9 ? "=" : "≈";
  return `${paid} × 365 ÷ 7 ÷ 12 ${sign} ${hoursLabel(p.monthlyHours)}시간`;
}

type MonthlyPay = { monthlyPayHours: number; monthlyHours: number; monthlyGross: number };

/** "약 " before a 0.01h display value that is rounded (104.29), "" when it is exact (209, 182.5, 146). */
function approx(p: MonthlyPay): string {
  return shownHoursAreExact(p.monthlyPayHours, p.monthlyHours) ? "" : "약 ";
}

/**
 * "10,320 × 43.4523… = 448,428.57 → 448,429원", or "10,320 × 60.8333… = 627,800원" when the product is whole.
 * Pay is 시급 × the exact 월 환산 시간, rounded once to the won.
 */
function monthlyPayFormula(wage: number, p: MonthlyPay): string {
  const exact = wage * p.monthlyPayHours;
  const whole = Math.abs(exact - p.monthlyGross) < 1e-6;
  const product = `${formatNumber(wage)} × ${exactHoursLabel(p.monthlyPayHours)}`;
  return whole
    ? `${product} = ${formatNumber(p.monthlyGross)}원`
    : `${product} ≈ ${formatNumber(exact, 2)} → ${formatNumber(p.monthlyGross)}원`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const h = parse((await params).hours);
  if (h === null) return {};
  const a = payForWeeklyHours(h, MIN_WAGE_2026);
  const b = payForWeeklyHours(h, MIN_WAGE_2027);
  const eligible = h >= JUHYU_MIN_WEEKLY_HOURS;
  return pageMetadata({
    title: `주 ${h}시간 알바 월급 - 2026 최저시급 ${formatNumber(a.monthlyGross)}원`,
    description: eligible
      ? `주 ${h}시간 일하면 2026년 최저시급 10,320원 기준 주휴수당 ${formatNumber(a.juhyuPay)}원 포함 주급 ${formatNumber(a.weeklyTotal)}원, 월급 ${formatNumber(a.monthlyGross)}원(월 ${approx(a)}${hoursLabel(a.monthlyHours)}시간)입니다. 2027년 10,700원이면 월 ${formatNumber(b.monthlyGross)}원, 3.3%·4대보험 공제 후 금액도 확인하세요.`
      : `주 ${h}시간은 15시간 미만이라 주휴수당이 없습니다. 2026년 최저시급 10,320원 기준 주급 ${formatNumber(a.weeklyTotal)}원, 월급 ${formatNumber(a.monthlyGross)}원(월 ${approx(a)}${hoursLabel(a.monthlyHours)}시간)이고 2027년에는 월 ${formatNumber(b.monthlyGross)}원입니다.`,
    path: `/hourly-wage/${h}/`,
    keywords: [`주 ${h}시간 알바 월급`, `주${h}시간 월급`, `주 ${h}시간 주휴수당`, "알바 월급 계산기", "주휴수당 계산기"],
  });
}

export default async function HourlyWageHoursPage({ params }: Props) {
  const h = parse((await params).hours);
  if (h === null) notFound();
  const a = payForWeeklyHours(h, MIN_WAGE_2026);
  const b = payForWeeklyHours(h, MIN_WAGE_2027);
  /** 2027 net pay (예상) — same figure as the 2026·2027 table and the 최저임금 계산기. */
  const b27 = payForWeeklyHours(h, MIN_WAGE_2027, 2027);
  const { daily, days } = scheduleForHours(h);
  const eligible = h >= JUHYU_MIN_WEEKLY_HOURS;
  const ins = insuredDeductions(a.monthlyGross, h);
  const fl = freelanceTax(a.monthlyGross);
  const idx = HOURLY_PAGE_HOURS.indexOf(h);
  const neighbors = HOURLY_PAGE_HOURS.slice(Math.max(0, idx - 3), idx + 4);
  const at15 = payForWeeklyHours(15, MIN_WAGE_2026);
  const jhLabel = hoursLabel(a.juhyuHours);

  const faq: FaqItem[] = [
    {
      q: `주 ${h}시간 알바 월급은 얼마인가요?`,
      a: `2026년 최저시급 10,320원 기준으로 월 ${approx(a)}${hoursLabel(a.monthlyHours)}시간, ${formatNumber(a.monthlyGross)}원입니다${eligible ? "(주휴수당 포함)" : ""}. 2027년 시급 10,700원이면 ${formatNumber(b.monthlyGross)}원입니다.${approx(a) === "" ? "" : ` 월급은 월 환산 시간을 반올림하지 않은 정확한 값(${exactHoursLabel(a.monthlyPayHours)}시간)에 시급을 곱해 원 미만만 반올림한 금액입니다.`} 실제 월급은 그 달 근무일수에 따라 조금 달라집니다.`,
    },
    eligible
      ? {
          q: `주 ${h}시간 일하면 주휴수당은 얼마인가요?`,
          a: `${h} ÷ 40 × 8 = ${jhLabel}시간분이라 2026년 최저시급으로 1주 ${formatNumber(a.juhyuPay)}원, 2027년에는 ${formatNumber(b.juhyuPay)}원입니다. 그 주 출근하기로 한 날을 모두 나가야 받을 수 있습니다.`,
        }
      : {
          q: `주 ${h}시간이면 주휴수당을 받을 수 있나요?`,
          a: `받을 수 없습니다. 4주 평균 1주 소정근로시간이 15시간 미만이면 근로기준법 제18조 제3항에 따라 주휴수당과 연차휴가가 적용되지 않고, 근로자퇴직급여 보장법 제4조에 따라 퇴직금도 없습니다. 주 15시간이 되면 주휴수당 3시간분 ${formatNumber(at15.juhyuPay)}원이 생깁니다.`,
        },
    {
      q: `주 ${h}시간 알바도 4대보험에 가입하나요?`,
      a: eligible
        ? `주 15시간(월 60시간) 이상이라 국민연금, 건강보험, 고용보험 가입 대상입니다. 2026년 최저시급이면 ${STATIC_MONTH_LABEL} 요율로 월 ${formatNumber(ins.pension + ins.health + ins.longTermCare + ins.employment)}원 정도를 내고, 소득세까지 떼면 실수령액은 ${formatNumber(a.netInsured)}원입니다. 2027년에는 국민연금 근로자 부담이 5.0%로 올라 실수령액이 ${formatNumber(b27.netInsured)}원(예상)입니다.`
        : `주 15시간 미만 초단시간 근로자라 국민연금과 건강보험 직장가입 대상이 아닙니다. 고용보험은 3개월 이상 계속 일하면 가입하며 월 ${formatNumber(ins.employment)}원 정도입니다.`,
    },
    {
      q: `주 ${h}시간 알바가 3.3%를 떼면 얼마를 받나요?`,
      a: `월급 ${formatNumber(a.monthlyGross)}원에서 소득세 ${formatNumber(fl.incomeTax)}원과 지방소득세 ${formatNumber(fl.localTax)}원을 떼고 ${formatNumber(a.netFreelance)}원을 받습니다. 다만 사장의 지시를 받으며 일하는 알바는 원칙적으로 근로소득으로 신고해야 합니다.`,
    },
  ];

  return (
    <ToolShell
      slug="hourly-wage"
      path={`/hourly-wage/${h}/`}
      extraCrumbs={[{ name: `주 ${h}시간`, path: `/hourly-wage/${h}/` }]}
      h1={`주 ${h}시간 알바 월급: 2026 최저시급 기준 ${formatNumber(a.monthlyGross)}원 (${eligible ? "주휴수당 포함" : "주휴수당 없음"})`}
      lead={
        eligible
          ? `주 ${h}시간(예: 하루 ${daily}시간 × 주 ${days}일) 일하면 2026년 최저시급 10,320원 기준 주휴수당 ${formatNumber(a.juhyuPay)}원을 포함해 주급 ${formatNumber(a.weeklyTotal)}원, 월급 ${formatNumber(a.monthlyGross)}원입니다.`
          : `주 ${h}시간(예: 하루 ${daily}시간 × 주 ${days}일)은 15시간 미만이라 주휴수당이 없습니다. 2026년 최저시급 10,320원 기준 주급 ${formatNumber(a.weeklyTotal)}원, 월급 ${formatNumber(a.monthlyGross)}원입니다.`
      }
      basis={hourlyBasis()}
      calculator={<HourlyWageCalculator initialDaily={daily} initialDays={days} />}
      faq={faq}
      appCategory="FinanceApplication"
    >
      <h2>주 {h}시간 월급 계산</h2>
      {eligible ? (
        <>
          <p className="formula">
            주휴시간 = {h} ÷ 40 × 8 = {jhLabel}시간 &nbsp;|&nbsp; 월 환산 시간 ={" "}
            {monthlyHoursFormula(`(${h} + ${jhLabel})`, a)}
            {a.monthly209 ? null : (
              <>
                {" "}
                &nbsp;|&nbsp; 월급 = {monthlyPayFormula(MIN_WAGE_2026, a)}
              </>
            )}
          </p>
          <p>
            주 {h}시간은 주휴수당 기준인 15시간 이상이라, 그 주에 정해진 날을 모두 출근하면 {jhLabel}시간분 주휴수당이 붙습니다. 2026년
            최저시급으로 근무한 {h}시간분 {formatNumber(a.weeklyBase)}원에 주휴수당 {formatNumber(a.juhyuPay)}원을 더하면 주급은{" "}
            <strong>{formatNumber(a.weeklyTotal)}원</strong>입니다.{" "}
            {approx(a)
              ? `한 달 평균 4.345주로 바꾸면 월 약 ${hoursLabel(a.monthlyHours)}시간이고, 반올림하지 않은 정확한 시간(${exactHoursLabel(a.monthlyPayHours)}시간)에 10,320원을 곱해 원 미만을 반올림하면 `
              : `한 달 평균 4.345주로 바꾸면 월 ${hoursLabel(a.monthlyHours)}시간, 10,320원을 곱해 `}
            <strong>{formatNumber(a.monthlyGross)}원</strong>입니다.
            {h < 40
              ? ` 주휴수당이 일한 시간에 비례하므로 주 40시간 근무자의 ${formatNumber((h / 40) * 100, 1)}% 수준입니다. 209시간은 주 40시간일 때 쓰는 최저임금 고시 기준이라, 주 ${h}시간은 1시간 단위로 올리거나 반올림하지 않고 공식대로 계산한 시간을 그대로 씁니다.`
              : " 주 40시간은 법정근로시간 한도라 주휴수당도 최대치인 8시간분이고, 월 환산 시간은 최저임금 고시와 같은 209시간입니다. 이보다 더 일한 시간은 연장근로로, 5인 이상 사업장이면 50%를 더 받습니다."}
          </p>
          <p>
            출근하기로 한 날을 하루라도 결근하면 그 주 주휴수당 {formatNumber(a.juhyuPay)}원이 빠지고, 지각·조퇴는 결근이 아니라 주휴수당이
            유지됩니다. 주 {h}시간 근무자는 5인 이상 사업장이면 연차휴가가 생기고, 1년 이상 일하면 사업장 규모와 상관없이 퇴직금도 받습니다.
          </p>
        </>
      ) : (
        <>
          <p className="formula">
            월 환산 시간 = {monthlyHoursFormula(String(h), a)} &nbsp;|&nbsp; 월급 = {monthlyPayFormula(MIN_WAGE_2026, a)}
          </p>
          <p>
            주 {h}시간은 4주 평균 1주 소정근로시간 15시간 미만인 초단시간 근로라 근로기준법 제18조 제3항에 따라 <strong>주휴수당이 없습니다</strong>.
            그래서 일한 시간만큼만 받아 주급은 {formatNumber(a.weeklyTotal)}원, 월급은 {h} × 365 ÷ 7 ÷ 12 ={" "}
            {exactHoursLabel(a.monthlyPayHours)}시간(표시는 {hoursLabel(a.monthlyHours)}시간)을 반올림하지 않고 시급을 곱해{" "}
            {formatNumber(a.monthlyGross)}원입니다. 연차휴가와
            퇴직금도 적용되지 않고, 국민연금·건강보험 직장가입 대상이 아니며, 고용보험은 3개월 이상 계속 일할 때만 가입합니다.
          </p>
          <p>
            주 15시간으로 늘면 주휴수당 3시간분 {formatNumber(at15.juhyuPay)}원이 생겨 월급이 {formatNumber(at15.monthlyGross)}원이 됩니다.
            지금보다 월 {formatNumber(at15.monthlyGross - a.monthlyGross)}원 많은 금액입니다. 다만 근무시간은 4주 평균으로 보므로 어떤 주만
            15시간을 넘겼다고 주휴수당이 생기지는 않습니다.
          </p>
        </>
      )}

      <h2>2026·2027 최저시급 기준 주 {h}시간 주급·월급</h2>
      <YearCompareTable hours={h} />
      <p className="note">
        공제 후 금액은 {STATIC_MONTH_LABEL} 4대보험 요율과 간이세액표(본인 1명)를 적용했습니다.
        {eligible
          ? ` ${RATE_2027_NOTE}`
          : " 초단시간이라 4대보험은 고용보험만 반영했고, 2027년 고용보험 요율은 아직 정해지지 않아 2026년 값(0.9%)으로 가정한 예상치입니다."}
      </p>
      <NovemberNote rows={[{ label: "2026년 열", hours: h, wage: MIN_WAGE_2026 }]} />

      <h2>시급별 주 {h}시간 월급</h2>
      <p>
        최저시급보다 높은 시급을 받는다면 아래 표에서 주 {h}시간 기준 주급과 월급을 바로 확인할 수 있습니다. 표의 월급은 월{" "}
        {approx(a) ? `${exactHoursLabel(a.monthlyPayHours)}시간(약 ${hoursLabel(a.monthlyHours)}시간)` : `${hoursLabel(a.monthlyHours)}시간`}에
        시급을 곱해 원 미만을 반올림한 금액입니다. 4대보험 공제 후 금액은 {STATIC_MONTH_LABEL} 요율 기준이고, 2027년
        최저시급인 10,700원 행만 위 표의 2027년 열과 같은 2027년 예상 요율로 계산했습니다. 시급을 누르면 그 시급의 근무시간별
        월급을 볼 수 있습니다.
      </p>
      <WageTable hours={h} />

      <h2>다른 근무시간과 비교</h2>
      <WeeklyHoursTable hours={neighbors} current={h} />
      <p className="note">
        월 환산 시간은 (주 근무시간 + 주휴시간) × 365 ÷ 7 ÷ 12입니다. 주 40시간만 최저임금 고시 기준 209시간을 쓰고, 나머지는 소수 둘째
        자리까지 표시했습니다. 월급은 반올림 전의 정확한 월 환산 시간으로 계산했습니다.
      </p>

      <h2>다른 근무시간 월급 보기</h2>
      <HoursLinkGrid current={h} />

      <h2>시급별 월급 보기</h2>
      <WageLinkGrid />
    </ToolShell>
  );
}
