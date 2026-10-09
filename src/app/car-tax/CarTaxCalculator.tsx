"use client";

import { CalcLayout, CalcNotice } from "@/components/CalcLayout";
import { NumberField, SegmentedField, SelectField } from "@/components/fields";
import {
  Statement,
  StatementFootnote,
  StatementHero,
  StatementRow,
  StatementSection,
  StatementTotal,
} from "@/components/Statement";
import { formatNumber, formatPercent, formatWon } from "@/lib/format";
import { compareYMD, daysInMonth } from "@/lib/date";
import { RULE_YEAR } from "@/lib/site";
import { useToday } from "@/lib/useToday";
import { useUrlState } from "@/lib/useUrlState";
import {
  bracketLabel,
  CAR_KIND_LABEL,
  computeCarTax,
  EDU_TAX_PCT,
  ELECTRIC_BUSINESS_ANNUAL,
  ELECTRIC_PRIVATE_ANNUAL,
  isBusiness,
  isElectric,
  PREPAY_BASE_LABEL,
  PREPAY_RATE_CONFIRMED_YEAR,
  PREPAY_WINDOW_END,
  prepay,
  validateInput,
  type CarKind,
  type CarTaxResult,
  type HalfTax,
  type PrepayMonth,
  type PrepayResult,
} from "@/lib/calc/car-tax";

/** URL value of `k`: p 비영업용 · e 비영업용 전기·수소 · b 영업용 · eb 영업용 전기·수소 */
type KindKey = "p" | "e" | "b" | "eb";
type UseKey = "p" | "b";
type FuelKey = "c" | "e";
type PrepayKey = "1" | "3" | "6" | "9" | "0";

const KIND_BY_KEY: Record<KindKey, CarKind> = { p: "private", e: "electric", b: "business", eb: "electricBusiness" };
const OLDEST_REG_YEAR = 1990;
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `${i + 1}월` }));

function kindKey(use: UseKey, fuel: FuelKey): KindKey {
  if (use === "b") return fuel === "e" ? "eb" : "b";
  return fuel === "e" ? "e" : "p";
}

function minus(n: number): string {
  return n > 0 ? `−${formatWon(n)}` : "0원";
}

function ageNote(h: [HalfTax, HalfTax]): string {
  const [a, b] = h;
  if (a.age < 1) return `차령 ${b.age}년 · ${b.reductionPct}% (상반기분 없음)`;
  if (a.age === b.age) return `차령 ${a.age}년 · ${a.reductionPct}%`;
  return `상반기 ${a.age}년 ${a.reductionPct}% · 하반기 ${b.age}년 ${b.reductionPct}%`;
}

/** Note for one 기분 row: 일할 days, or the regular due dates. */
function halfNote(h: HalfTax, due: string): string {
  return h.days < h.periodDays ? `등록일부터 ${h.days}일분 일할` : due;
}

function heroSub(r: CarTaxResult, pp: PrepayResult | null, windowPassed: boolean): string {
  // Only advertise a prepayment the visitor can still make (window not over yet).
  if (pp?.available && pp.deduction > 0 && !pp.sameAsLumpSum && !windowPassed)
    return `${pp.month}월 연납하면 ${formatWon(pp.annualPay)}`;
  if (r.lumpSum) return `6월에 한 번 ${formatWon(r.june)} 고지`;
  if (r.june === 0) return `하반기(7~12월)분 ${formatWon(r.december)}만 내요`;
  if (r.june === r.december) return `6월·12월에 ${formatWon(r.june)}씩`;
  return `6월분 ${formatWon(r.june)} + 12월분 ${formatWon(r.december)}`;
}

export function CarTaxCalculator({
  initialCc = 1999,
  initialRegYear = RULE_YEAR - 4,
}: {
  initialCc?: number;
  initialRegYear?: number;
}) {
  // URL keys: k = 차종, c = 배기량, y·m·d = 최초 등록 연·월·일, p = 연납 신청 월, t = 과세연도
  const [s, set] = useUrlState({
    k: "p" as KindKey,
    c: initialCc,
    y: initialRegYear,
    m: 3,
    d: 1,
    p: "1" as PrepayKey,
    t: RULE_YEAR,
  });
  const { today } = useToday();

  const kind = KIND_BY_KEY[s.k] ?? "private";
  const use: UseKey = isBusiness(kind) ? "b" : "p";
  const fuel: FuelKey = isElectric(kind) ? "e" : "c";
  const taxYear = s.t === RULE_YEAR + 1 ? RULE_YEAR + 1 : RULE_YEAR;
  const month: PrepayMonth | null = s.p === "1" ? 1 : s.p === "3" ? 3 : s.p === "6" ? 6 : s.p === "9" ? 9 : null;
  // 등록일 only matters for a car first registered in the tax year (일할 계산).
  const newReg = kind === "private" && s.y === taxYear;
  const monthDays = s.m >= 1 && s.m <= 12 ? daysInMonth(taxYear, s.m) : 31;
  const regDay = Math.min(Math.max(1, Math.floor(s.d) || 1), monthDays);

  const input = { kind, cc: s.c, regYear: s.y, regMonth: s.m, regDay, taxYear };
  const error = validateInput(input);
  const r = error ? null : computeCarTax(input);
  const pp = r && month ? prepay(r, month) : null;
  // Whether this year's window is already over (uses the hydration-safe "today").
  const windowPassed = month ? compareYMD(today, { y: taxYear, ...PREPAY_WINDOW_END[month] }) > 0 : false;
  const estimatedRate = taxYear > PREPAY_RATE_CONFIRMED_YEAR;

  const yearOptions = Array.from({ length: taxYear - OLDEST_REG_YEAR + 1 }, (_, i) => {
    const y = taxYear - i;
    return { value: String(y), label: `${y}년` };
  });
  const dayOptions = Array.from({ length: monthDays }, (_, i) => ({ value: String(i + 1), label: `${i + 1}일` }));

  return (
    <CalcLayout
      inputs={
        <>
          <SegmentedField<UseKey>
            label="용도"
            value={use}
            onChange={(u) => set({ k: kindKey(u, fuel) })}
            options={[
              { value: "p", label: "자가용 (비영업용)" },
              { value: "b", label: "영업용" },
            ]}
            hint="택시·렌터카처럼 사업용 번호판을 단 차는 영업용이에요."
          />
          <SegmentedField<FuelKey>
            label="연료"
            value={fuel}
            onChange={(f) => set({ k: kindKey(use, f) })}
            options={[
              { value: "c", label: "휘발유·경유·LPG" },
              { value: "e", label: "전기·수소" },
            ]}
            hint="하이브리드는 엔진 배기량으로 계산해요. 전기·수소차는 배기량 없이 정액이에요."
          />
          {fuel === "c" ? (
            <NumberField
              label="배기량"
              value={s.c}
              onChange={(c) => set({ c })}
              unit="cc"
              max={20000}
              presets={[998, 1598, 1999, 2497, 3342].map((n) => ({ label: `${formatNumber(n)}cc`, value: n }))}
              hint="자동차등록증의 ‘배기량’ 칸에 적힌 숫자를 넣으세요."
            />
          ) : null}
          {kind === "private" ? (
            <div className="field">
              <div className="grid grid-cols-2 gap-3">
                <SelectField<string>
                  label="최초 등록 연도"
                  value={String(s.y)}
                  onChange={(v) => set({ y: Number(v) })}
                  options={yearOptions}
                />
                <SelectField<string>
                  label="등록 월"
                  value={String(s.m)}
                  onChange={(v) => set({ m: Number(v) })}
                  options={MONTH_OPTIONS}
                />
              </div>
              <p className="field-hint">
                자동차등록증의 ‘최초등록일’을 보면 돼요. 제작연도보다 늦은 해에 처음 등록했다면 제작연도 12월로 고르세요. 올해
                등록한 차는 실제 등록 연월을 고르면 돼요.
              </p>
            </div>
          ) : null}
          {newReg ? (
            <SelectField<string>
              label="등록일"
              value={String(regDay)}
              onChange={(v) => set({ d: Number(v) })}
              options={dayOptions}
              hint="올해 처음 등록한 차는 등록일부터 날짜 수만큼(일할) 계산해요."
            />
          ) : null}
          <SegmentedField<PrepayKey>
            label="연납 신청 월"
            value={s.p}
            onChange={(p) => set({ p })}
            options={[
              { value: "1", label: "1월" },
              { value: "3", label: "3월" },
              { value: "6", label: "6월" },
              { value: "9", label: "9월" },
              { value: "0", label: "안 함" },
            ]}
            hint="1년치를 미리 내면 남은 기간분 세액의 5%를 빼 줘요. 빨리 낼수록 많이 아껴요."
          />
          <SegmentedField<string>
            label="과세연도"
            value={String(taxYear)}
            onChange={(v) => {
              const t = Number(v);
              set(s.y > t ? { t, y: t } : { t });
            }}
            options={[
              { value: String(RULE_YEAR), label: `${RULE_YEAR}년` },
              { value: String(RULE_YEAR + 1), label: `${RULE_YEAR + 1}년 (예상)` },
            ]}
          />
        </>
      }
      result={
        r ? (
          <Statement title="자동차세 명세" caption={`${taxYear}년 · ${CAR_KIND_LABEL[kind]}`}>
            <StatementHero
              label={
                r.partialYear
                  ? `${taxYear}년 자동차세 (등록일부터 일할, 지방교육세 포함)`
                  : `${taxYear}년 연간 자동차세 (지방교육세 포함)`
              }
              value={formatWon(r.total)}
              sub={heroSub(r, pp, windowPassed)}
              stamp="세금"
            />
            <StatementSection title="세액 계산">
              {isElectric(kind) ? (
                <StatementRow
                  label="정액 세액"
                  value={`연 ${formatNumber(kind === "electric" ? ELECTRIC_PRIVATE_ANNUAL : ELECTRIC_BUSINESS_ANNUAL)}원`}
                  note={`그 밖의 승용자동차 ${kind === "electric" ? "비영업용" : "영업용"} (배기량 무관)`}
                />
              ) : (
                <>
                  <StatementRow
                    label="cc당 세액"
                    value={`${formatNumber(r.perCc)}원`}
                    note={`${bracketLabel(kind === "business" ? "business" : "private", r.cc)} ${kind === "business" ? "영업용" : "비영업용"}`}
                  />
                  <StatementRow
                    label="기본 세액"
                    value={formatWon(r.baseAnnual)}
                    note={`${formatNumber(r.cc)}cc × ${formatNumber(r.perCc)}원`}
                  />
                </>
              )}
              {kind === "private" ? (
                <StatementRow label="차령 경감" value={minus(r.reduction)} note={ageNote(r.halves)} />
              ) : null}
              {r.partialYear && r.ownedFrom ? (
                <StatementRow
                  label="등록 전 기간 제외"
                  value={minus(r.prorationCut)}
                  note={`${r.ownedFrom.m}월 ${r.ownedFrom.d}일부터 ${r.ownedDays}일분만`}
                />
              ) : null}
              <StatementRow
                label="자동차세"
                value={formatWon(r.carTax)}
                note={kind === "business" && r.carTax !== r.baseAnnual ? "10원 미만 버림" : undefined}
              />
              <StatementRow
                label="지방교육세"
                value={isBusiness(kind) ? "없음" : formatWon(r.eduTax)}
                note={isBusiness(kind) ? "영업용은 부과하지 않아요" : `자동차세의 ${EDU_TAX_PCT}%`}
              />
            </StatementSection>
            <StatementTotal label={r.partialYear ? `${taxYear}년 합계` : "연간 합계"} value={formatWon(r.total)} />

            <StatementSection title={r.partialYear ? "기분별 세액 (연납 안 할 때)" : "정기 고지 (연납 안 할 때)"}>
              {r.lumpSum ? (
                <>
                  <StatementRow
                    label={r.partialYear ? "6월 일괄 (올해분)" : "6월 일괄 (1년치)"}
                    value={formatWon(r.june)}
                    note={`하반기분 5% 공제 ${minus(r.lumpSumDeduction)}`}
                  />
                  <StatementRow label="12월분" value="없음" note="자동차세가 10만원 이하라 6월에 한꺼번에" />
                </>
              ) : (
                <>
                  <StatementRow
                    label="6월분 (1~6월)"
                    value={r.halves[0].days > 0 ? formatWon(r.june) : "없음"}
                    note={r.halves[0].days > 0 ? halfNote(r.halves[0], "6월 16~30일 납부") : "7월 이후 등록이라 부과되지 않아요"}
                  />
                  <StatementRow
                    label="12월분 (7~12월)"
                    value={formatWon(r.december)}
                    note={halfNote(r.halves[1], "12월 16~31일 납부")}
                  />
                </>
              )}
            </StatementSection>

            {pp && month ? (
              <StatementSection title={`${month}월에 연납하면`}>
                <StatementRow
                  label="신청·납부 기간"
                  value={`${taxYear}년 ${pp.window}`}
                  note={
                    windowPassed
                      ? taxYear === RULE_YEAR
                        ? `이 기간은 지났어요 · 과세연도를 ${RULE_YEAR + 1}년으로 바꿔 보세요`
                        : "이 기간은 지났어요"
                      : undefined
                  }
                />
                {pp.unavailableReason === "notRegistered" ? (
                  <StatementRow label={`${month}월 연납`} value="해당 없음" note="신청 기간이 끝난 뒤에 등록한 차예요" />
                ) : pp.unavailableReason === "lumpSum" ? (
                  <StatementRow label="9월 연납" value="해당 없음" note="6월에 1년치를 이미 고지해요" />
                ) : pp.sameAsLumpSum ? (
                  <StatementRow label="6월 연납" value={formatWon(pp.annualPay)} note="정기 6월 일괄 고지와 같아요" />
                ) : (
                  <>
                    <StatementRow label="연납 공제 (절감액)" value={minus(pp.deduction)} note={PREPAY_BASE_LABEL[month]} />
                    {month === 9 ? (
                      <StatementRow
                        label="9월에 낼 돈"
                        value={formatWon(pp.payInMonth)}
                        note={
                          r.halves[0].total > 0
                            ? `하반기분만 · 6월분 ${formatWon(r.halves[0].total)}은 따로`
                            : "하반기분만 (6월분 없음)"
                        }
                      />
                    ) : null}
                    <StatementRow
                      label="연납 시 납부액"
                      value={formatWon(pp.annualPay)}
                      note={`합계의 ${formatPercent(pp.effectiveRate)} 절감`}
                      emphasis
                    />
                    {r.lumpSum ? (
                      <StatementRow
                        label="6월 일괄 고지보다"
                        value={minus(pp.deduction - r.lumpSumDeduction)}
                        note="추가로 아끼는 돈"
                      />
                    ) : null}
                  </>
                )}
              </StatementSection>
            ) : null}

            <StatementFootnote>
              지방세법 제127조·제128조 기준이에요. 6월분·12월분마다 10원 미만을 버려 계산해 고지서와 10원 단위로 다를 수 있어요.
              {r.partialYear
                ? ` 올해 등록한 차는 등록일부터 그 기분 말일까지 ‘연세액 × 보유 일수 ÷ ${r.halves[0].periodDays + r.halves[1].periodDays}’로 계산했어요. 이 금액은 정기분과 따로(수시분) 고지될 수 있어요.`
                : ""}
              {kind !== "private" ? " 올해 새로 등록한 차는 등록일부터 일할 계산해 이보다 적어요." : ""}
              {estimatedRate
                ? ` ${taxYear}년 연납 공제율은 아직 정해지지 않아 ${PREPAY_RATE_CONFIRMED_YEAR}년과 같은 5%로 가정했어요.`
                : ""}
              {" "}장애인·국가유공자 감면 차량은 따로 확인하세요.
            </StatementFootnote>
          </Statement>
        ) : (
          <CalcNotice>{error}</CalcNotice>
        )
      }
    />
  );
}
