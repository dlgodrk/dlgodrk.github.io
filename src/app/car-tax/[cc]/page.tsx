import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber, formatPercent, formatWon } from "@/lib/format";
import { RULE_YEAR } from "@/lib/site";
import {
  ageTable,
  CAR_TAX_BASIS,
  CAR_TAX_PAGE_CC,
  ccClass,
  computeCarTax,
  perCcRate,
  PREPAY_MONTHS,
  PREPAY_WINDOW,
  prepay,
  type CarTaxResult,
} from "@/lib/calc/car-tax";
import { CarTaxCalculator } from "../CarTaxCalculator";

// Only the listed displacements exist; anything else is a 404 (required for static export).
export const dynamicParams = false;

export function generateStaticParams() {
  return CAR_TAX_PAGE_CC.map((cc) => ({ cc: String(cc) }));
}

type Props = { params: Promise<{ cc: string }> };

const Y = RULE_YEAR;

function parse(raw: string): number | null {
  const n = Number(raw);
  return CAR_TAX_PAGE_CC.includes(n) ? n : null;
}

/**
 * 신차 기준: 차령 2년 이하(경감 없음)로 1년 내내 보유. 올해 등록한 차는 등록일부터 일할이라
 * 전년도 1월 등록(차령 2년)으로 계산한다.
 */
function newCar(cc: number, kind: "private" | "business" = "private"): CarTaxResult {
  return computeCarTax({ kind, cc, regYear: Y - 1, regMonth: 1, taxYear: Y });
}

/** 올해 10월 1일에 처음 등록한 차: 제1기분 없음, 제2기분 92일분 일할. */
function registeredOct1(cc: number): CarTaxResult {
  return computeCarTax({ kind: "private", cc, regYear: Y, regMonth: 10, regDay: 1, taxYear: Y });
}

/** 차령 n년 (1~6월 등록) 기준. */
function carAtAge(cc: number, age: number): CarTaxResult {
  return computeCarTax({ kind: "private", cc, regYear: Y - age + 1, regMonth: 1, taxYear: Y });
}

function schedule(r: CarTaxResult): string {
  if (r.lumpSum)
    return `연 자동차세가 10만원 이하라 6월에 1년치를 한꺼번에 고지할 수 있고, 하반기분 5%를 빼 ${formatWon(r.june)}을 냅니다.`;
  return `6월과 12월에 ${formatWon(r.june)}씩 나눠 냅니다.`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const cc = parse((await params).cc);
  if (cc === null) return {};
  const r = newCar(cc);
  const old = carAtAge(cc, 12);
  const jan = prepay(r, 1);
  return pageMetadata({
    title: `${formatNumber(cc)}cc 자동차세 ${Y} - 연 ${formatWon(r.total)} 차령별 정리`,
    description: `배기량 ${formatNumber(cc)}cc 자가용의 ${Y}년 자동차세는 신차 기준 연 ${formatWon(r.total)}(지방교육세 포함)입니다. 차령 3년차부터 5%씩 줄어 12년 이상이면 ${formatWon(old.total)}, 1월 연납 시 ${formatWon(jan.deduction)}을 덜 냅니다.`,
    path: `/car-tax/${cc}/`,
    keywords: [`${cc}cc 자동차세`, `${formatNumber(cc)}cc 자동차세`, `${cc}cc 자동차세 연납`, `${Y} 자동차세`, "자동차세 계산기"],
  });
}

export default async function CarTaxCcPage({ params }: Props) {
  const cc = parse((await params).cc);
  if (cc === null) notFound();

  const label = `${formatNumber(cc)}cc`;
  const r = newCar(cc);
  const rate = perCcRate("private", cc);
  const biz = newCar(cc, "business");
  const old = carAtAge(cc, 12);
  const ten = carAtAge(cc, 10);
  const jan = prepay(r, 1);
  const mar = prepay(r, 3);
  const rows = ageTable("private", cc, Y);
  const oct = registeredOct1(cc);
  /** Same car one cc over the 1,600cc line (shows the bracket jump). */
  const over1600 = cc <= 1600 && cc > 1000 ? newCar(1601) : null;

  const faq: FaqItem[] = [
    {
      q: `${label} 자동차세는 1년에 얼마인가요?`,
      a: `${Y}년 신차(차령 2년 이하) 기준 자동차세 ${formatWon(r.carTax)}, 지방교육세 ${formatWon(r.eduTax)}로 연 ${formatWon(r.total)}입니다. ${schedule(r)}`,
    },
    {
      q: `${label} 차를 10년 타면 자동차세가 얼마나 줄어드나요?`,
      a: `차령 10년이면 경감률이 40%라 연 ${formatWon(ten.total)}입니다. 12년 이상은 50%로 고정돼 연 ${formatWon(old.total)}을 냅니다.`,
    },
    {
      q: `${label} 자동차세를 연납하면 얼마나 아끼나요?`,
      a: `신차 기준 1월(16~31일)에 연납하면 ${formatWon(jan.deduction)}을 빼 ${formatWon(jan.annualPay)}, 3월에 연납하면 ${formatWon(mar.deduction)}을 빼 ${formatWon(mar.annualPay)}을 냅니다. ${Y}년 이자율 5%를 남은 기간 세액에 적용한 금액입니다.`,
    },
  ];

  return (
    <ToolShell
      slug="car-tax"
      path={`/car-tax/${cc}/`}
      extraCrumbs={[{ name: label, path: `/car-tax/${cc}/` }]}
      h1={`${label} 자동차세: ${Y}년 연 ${formatWon(r.total)} (차령별)`}
      lead={`${label} 비영업용 승용차는 cc당 ${rate}원이 적용돼 신차 기준 자동차세 ${formatWon(r.carTax)}에 지방교육세 ${formatWon(r.eduTax)}를 더해 연 ${formatWon(r.total)}입니다. 차령 3년차부터 해마다 5%씩 줄어 12년 이상이면 연 ${formatWon(old.total)}입니다.`}
      basis={CAR_TAX_BASIS}
      calculator={<CarTaxCalculator initialCc={cc} initialRegYear={Y - 1} />}
      faq={faq}
      appCategory="FinanceApplication"
    >
      <h2>{label} 자동차세 계산</h2>
      <p className="formula">
        {label} × {rate}원 = {formatWon(r.carTax)} + 지방교육세 30% {formatWon(r.eduTax)} = 연 {formatWon(r.total)}
      </p>
      {cc <= 1000 ? (
        <p>
          {label}는 {ccClass(cc)}에서 흔한 배기량으로, 1,000cc 이하 구간이라 cc당 80원이 적용됩니다. 경차는 배기량 1,000cc 미만에 길이 3.6m,
          너비 1.6m, 높이 2.0m 이하인 차를 말하며, 자동차세는 이 구간 세율로만 계산합니다. {schedule(r)}
        </p>
      ) : cc <= 1600 ? (
        <p>
          {label}는 {ccClass(cc)}에서 흔한 배기량으로, 1,600cc 이하 구간이라 cc당 140원이 적용됩니다. {schedule(r)} 1,600cc를 1cc만
          넘어도 cc당 200원이 돼 1,601cc라면 연 {formatWon(over1600?.total ?? 0)}으로 크게 오릅니다.
        </p>
      ) : (
        <p>
          {label}는 {ccClass(cc)}에서 흔한 배기량으로, 1,600cc를 넘어 cc당 200원 구간입니다. 이 구간은 배기량에 정비례해 100cc마다 연
          26,000원(지방교육세 포함)씩 늘어납니다. {schedule(r)}
        </p>
      )}
      <p>
        같은 {label}라도 택시·렌터카 같은 영업용이면 cc당 {biz.perCc}원이라 연 {formatWon(biz.total)}이고, 지방교육세와 차령
        경감이 없습니다. 하이브리드도 엔진 배기량이 {label}라면 위 금액과 같습니다.
      </p>

      <h2>
        {label} 차령별 자동차세 ({Y}년)
      </h2>
      <p>
        1~6월에 처음 등록한 차 기준입니다. 7~12월에 등록했다면 상반기분은 한 해 덜 된 차령으로 계산돼 차령 3~12년차는 표보다 조금 더 냅니다. 1월 연납
        금액은 해당 차령의 연 합계에서 {Y}년 1월 연납 공제를 뺀 값입니다.
      </p>
      <p>
        {Y}년에 처음 등록한 차(차령 1년)는 표에 없습니다. 등록일부터 그 기분 말일까지 날짜 수만큼 일할 계산하기 때문입니다. 예를
        들어 {label} 차를 {Y}년 10월 1일에 등록했다면 6월분은 없고, 12월 31일까지 {oct.halves[1].days}일분인{" "}
        {formatWon(oct.total)}(지방교육세 포함)만 냅니다. 이 경우 그해 1·3·6·9월 연납 기간이 모두 등록 전에 끝나 연납도 할 수
        없습니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">차령</th>
              <th scope="col">최초 등록</th>
              <th scope="col">경감률</th>
              <th scope="col">자동차세</th>
              <th scope="col">지방교육세</th>
              <th scope="col">연 합계</th>
              <th scope="col">1월 연납 시</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.age}>
                <td>{row.age === 12 ? "12년 이상" : `${row.age}년`}</td>
                <td>{row.age === 12 ? `${row.regYear}년 이전` : `${row.regYear}년`}</td>
                <td>{row.reductionPct}%</td>
                <td>{formatWon(row.result.carTax)}</td>
                <td>{formatWon(row.result.eduTax)}</td>
                <td>{formatWon(row.result.total)}</td>
                <td>{formatWon(row.january.annualPay)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>
        {label} 연납 할인 ({Y}년, 신차 기준)
      </h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">신청 월</th>
              <th scope="col">신청·납부 기간</th>
              <th scope="col">공제액</th>
              <th scope="col">연간 납부액</th>
              <th scope="col">연세액 대비</th>
            </tr>
          </thead>
          <tbody>
            {PREPAY_MONTHS.map((m) => {
              const p = prepay(r, m);
              return (
                <tr key={m}>
                  <td>{m}월</td>
                  <td>{PREPAY_WINDOW[m]}</td>
                  {!p.available ? (
                    <td colSpan={3} className="text-cell">
                      해당 없음 (6월에 1년치를 이미 고지)
                    </td>
                  ) : (
                    <>
                      <td>−{formatWon(p.deduction)}</td>
                      <td>
                        {formatWon(p.annualPay)}
                        {p.sameAsLumpSum ? " (정기 6월 고지와 같음)" : ""}
                      </td>
                      <td>{formatPercent(p.effectiveRate)}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="note">
        6월·9월 연납은 아직 내지 않은 하반기분만 할인되고, 6월분 정기 고지는 그대로 냅니다. 차령 경감을 받는 차는 연세액이 줄어든
        비율만큼 공제액도 줄어듭니다.
      </p>

      <h2>다른 배기량과 비교 ({Y}년)</h2>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">배기량</th>
              <th scope="col" className="text-cell">
                흔한 차급
              </th>
              <th scope="col">신차 연 합계</th>
              <th scope="col">12년 이상</th>
            </tr>
          </thead>
          <tbody>
            {CAR_TAX_PAGE_CC.map((n) => (
              <tr key={n} className={n === cc ? "is-current" : undefined}>
                <td>{n === cc ? `${formatNumber(n)}cc` : <Link href={`/car-tax/${n}/`}>{formatNumber(n)}cc</Link>}</td>
                <td className="text-cell">{ccClass(n)}</td>
                <td>{formatWon(newCar(n).total)}</td>
                <td>{formatWon(carAtAge(n, 12).total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>다른 배기량도 찾아보기</h2>
      <nav aria-label="배기량별 자동차세 페이지" className="link-grid">
        {CAR_TAX_PAGE_CC.map((n) => (
          <Link key={n} href={`/car-tax/${n}/`} aria-current={n === cc ? "page" : undefined}>
            {formatNumber(n)}cc 자동차세
          </Link>
        ))}
      </nav>
    </ToolShell>
  );
}
