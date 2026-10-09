"use client";

import { useId, useMemo, useState } from "react";
import { CalcLayout, CalcNotice } from "@/components/CalcLayout";
import { NumberField, SegmentedField } from "@/components/fields";
import {
  Statement,
  StatementFootnote,
  StatementHero,
  StatementRow,
  StatementSection,
  StatementTotal,
} from "@/components/Statement";
import { formatNumber, formatWon, koreanWon } from "@/lib/format";
import {
  compareMethods,
  dayCountGap,
  MAX_PRINCIPAL,
  MAX_RATE_PCT,
  METHOD_LABEL,
  REPAY_METHODS,
  validateLoan,
  type LoanResult,
  type RepayMethod,
} from "@/lib/calc/loan";
import { useUrlState } from "@/lib/useUrlState";
import { DecimalField } from "./DecimalField";

type MethodKey = "eq" | "pr" | "bu";
type Unit = "y" | "m";

const KEY_TO_METHOD: Record<MethodKey, RepayMethod> = { eq: "equal-payment", pr: "equal-principal", bu: "bullet" };

const METHOD_HINT: Record<MethodKey, string> = {
  eq: "매달 같은 금액(원금+이자)을 갚아요. 가장 흔한 방식이에요.",
  pr: "원금을 똑같이 나눠 갚아서 처음 부담이 크고 갈수록 줄어요.",
  bu: "매달 이자만 내고 만기에 원금을 한 번에 갚아요.",
};

const AMOUNT_PRESETS = [
  { label: "1천만", value: 10_000_000 },
  { label: "3천만", value: 30_000_000 },
  { label: "5천만", value: 50_000_000 },
  { label: "1억", value: 100_000_000 },
  { label: "2억", value: 200_000_000 },
  { label: "3억", value: 300_000_000 },
];

/** Rows shown before "전체 보기". */
const PREVIEW_ROWS = 12;

/** Round to 2 decimals (rate in %, term in years). The boxes accept 2 fraction digits. */
function round2(n: number): number {
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

/** 6,393 → "6,400원", 26,484 → "2만 6,500원" (백원 단위 반올림) */
function approxWon(n: number): string {
  return koreanWon(Math.round(n / 100) * 100);
}

/** 37 → "3년 1개월" */
function termLabel(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  if (y && m) return `${y}년 ${m}개월`;
  if (y) return `${y}년`;
  return `${m}개월`;
}

export function LoanCalculator({
  initialAmount = 100_000_000,
  initialYears = 30,
  initialRate = 4,
}: {
  /** 대출금액 기본값 (원) */
  initialAmount?: number;
  /** 대출기간 기본값 (년) */
  initialYears?: number;
  /** 연 이자율 기본값 (%) */
  initialRate?: number;
}) {
  // URL keys: a 대출금액(원), r 연 이자율(%), t 기간, u 기간 단위(y|m), g 거치기간(개월), m 상환방식(eq|pr|bu)
  const [s, set] = useUrlState({
    a: initialAmount,
    r: initialRate,
    t: initialYears,
    u: "y" as Unit,
    g: 0,
    m: "eq" as MethodKey,
  });
  const [showAll, setShowAll] = useState(false);
  const cmpId = useId();
  const schedId = useId();

  const unit: Unit = s.u === "m" ? "m" : "y";
  const key: MethodKey = s.m === "pr" || s.m === "bu" ? s.m : "eq";
  const method = KEY_TO_METHOD[key];
  const principal = s.a;
  // Rounded so the number in the box (2 decimals) is the number calculated, even for ?r=4.567.
  const rate = round2(s.r);
  // Years may have 2 decimals (1.5년 = 18개월); 2 decimals always map back to whole months.
  const term = unit === "y" ? round2(s.t) : Number.isFinite(s.t) ? Math.round(s.t) : NaN;
  const months = Number.isFinite(term) ? Math.round(unit === "y" ? term * 12 : term) : NaN;
  // An empty grace box means "no grace period".
  const grace = Number.isFinite(s.g) ? Math.round(s.g) : 0;

  const error = validateLoan({ principal, annualRatePct: rate, months, graceMonths: grace, method });
  // 만기일시 is valid with any grace value; the comparison rows for the other two methods
  // then fall back to no grace when the value would not fit inside the term.
  const cmpGrace = grace > 0 && grace < months ? grace : 0;
  const all = useMemo(
    () => (error ? null : compareMethods({ principal, annualRatePct: rate, months, graceMonths: cmpGrace })),
    [error, principal, rate, months, cmpGrace],
  );
  const res = all ? all[method] : null;

  return (
    <>
      <CalcLayout
        inputs={
          <>
            <NumberField
              label="대출금액"
              value={principal}
              onChange={(a) => set({ a })}
              unit="원"
              max={MAX_PRINCIPAL}
              reading={(n) => koreanWon(n)}
              presets={AMOUNT_PRESETS}
            />
            <DecimalField
              label="연 이자율"
              value={rate}
              onChange={(r) => set({ r })}
              unit="%"
              decimals={2}
              max={MAX_RATE_PCT}
              presets={[3, 3.5, 4, 4.5, 5, 6].map((n) => ({ label: `${n}%`, value: n }))}
              hint="대출 약정서나 상품 안내의 연 금리를 넣어 주세요."
            />
            <SegmentedField<Unit>
              label="대출기간 단위"
              value={unit}
              onChange={(u) => {
                if (u === unit) return;
                // Keep the same length: 18개월 ↔ 1.5년, 13개월 → 1.08년 (still 13개월).
                if (Number.isFinite(months) && months > 0) {
                  set({ u, t: u === "m" ? months : round2(months / 12) });
                } else set({ u });
              }}
              options={[
                { value: "y", label: "년" },
                { value: "m", label: "개월" },
              ]}
            />
            <DecimalField
              label="대출기간"
              value={term}
              onChange={(t) => set({ t })}
              unit={unit === "y" ? "년" : "개월"}
              decimals={unit === "y" ? 2 : 0}
              max={unit === "y" ? 50 : 600}
              presets={
                unit === "y"
                  ? [1, 2, 3, 5, 10, 20, 30, 40].map((n) => ({ label: `${n}년`, value: n }))
                  : [6, 12, 18, 24, 36, 48, 60].map((n) => ({ label: `${n}개월`, value: n }))
              }
              aside={unit === "y" && Number.isFinite(months) && months > 0 ? `${months}개월` : undefined}
            />
            <SegmentedField<MethodKey>
              label="상환방식"
              value={key}
              onChange={(m) => set({ m })}
              options={[
                { value: "eq", label: "원리금균등" },
                { value: "pr", label: "원금균등" },
                { value: "bu", label: "만기일시" },
              ]}
              hint={METHOD_HINT[key]}
            />
            <NumberField
              label="거치기간"
              value={s.g}
              onChange={(g) => set({ g })}
              unit="개월"
              max={600}
              presets={[
                { label: "없음", value: 0 },
                { label: "6개월", value: 6 },
                { label: "1년", value: 12 },
                { label: "2년", value: 24 },
                { label: "3년", value: 36 },
              ]}
              hint={
                key === "bu"
                  ? "만기일시상환은 처음부터 이자만 내서 거치기간을 따로 적용하지 않아요."
                  : "원금은 갚지 않고 이자만 내는 기간이에요. 대출기간 안에 포함돼요."
              }
            />
          </>
        }
        result={res ? <LoanStatement res={res} rate={rate} /> : <CalcNotice>{error}</CalcNotice>}
      />

      {all && res ? (
        <div className="mt-10 grid gap-10">
          <section aria-labelledby={cmpId} className="min-w-0">
            <h2 id={cmpId} className="text-xl font-bold text-ink">
              상환방식별 비교
            </h2>
            <p className="mt-1 text-sm text-muted">
              같은 금액·금리·기간으로 세 방식을 나란히 계산했어요.
              {all["equal-payment"].graceMonths > 0
                ? ` 원리금균등·원금균등의 첫 달은 거치 ${all["equal-payment"].graceMonths}개월이 끝난 뒤 기준이에요.`
                : ""}
            </p>
            <div className="table-wrap mt-3">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">상환방식</th>
                    <th scope="col">첫 달 납입액</th>
                    <th scope="col">마지막 달 납입액</th>
                    <th scope="col">총 이자</th>
                    <th scope="col">총 상환액</th>
                  </tr>
                </thead>
                <tbody>
                  {REPAY_METHODS.map((m) => {
                    const r = all[m];
                    return (
                      <tr key={m} className={m === method ? "is-current" : undefined}>
                        <td>
                          {METHOD_LABEL[m]}
                          {m === method ? <span className="sr-only"> (선택한 방식)</span> : null}
                        </td>
                        <td>{formatWon(r.firstPayment)}</td>
                        <td>{formatWon(r.lastPayment)}</td>
                        <td>{formatWon(r.totalInterest)}</td>
                        <td>{formatWon(r.totalPayment)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <ComparisonNote all={all} />
          </section>

          <section aria-labelledby={schedId} className="min-w-0">
            <h2 id={schedId} className="text-xl font-bold text-ink">
              회차별 상환 스케줄
            </h2>
            <p className="mt-1 text-sm text-muted">
              {METHOD_LABEL[method]}상환 · 총 {formatNumber(res.rows.length)}회차
              {res.graceMonths > 0 ? ` (거치 ${res.graceMonths}회차 포함)` : ""} · 원 미만 반올림
            </p>
            <div className="table-wrap mt-3">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">회차</th>
                    <th scope="col">상환원금</th>
                    <th scope="col">이자</th>
                    <th scope="col">납입액</th>
                    <th scope="col">잔액</th>
                  </tr>
                </thead>
                <tbody>
                  {(showAll ? res.rows : res.rows.slice(0, PREVIEW_ROWS)).map((row) => (
                    <tr key={row.n}>
                      <td>
                        {row.n}
                        {row.grace ? <span className="ml-1 text-xs text-muted">거치</span> : null}
                      </td>
                      <td>{formatNumber(row.principal)}</td>
                      <td>{formatNumber(row.interest)}</td>
                      <td>{formatNumber(row.payment)}</td>
                      <td>{formatNumber(row.balance)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-semibold text-ink">
                    <td>합계</td>
                    <td>{formatNumber(res.principal)}</td>
                    <td>{formatNumber(res.totalInterest)}</td>
                    <td>{formatNumber(res.totalPayment)}</td>
                    <td>-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {res.rows.length > PREVIEW_ROWS ? (
              <button
                type="button"
                className="btn-ghost mt-3"
                aria-expanded={showAll}
                onClick={() => setShowAll((v) => !v)}
              >
                {showAll ? `처음 ${PREVIEW_ROWS}회차만 보기` : `전체 ${formatNumber(res.rows.length)}회차 보기`}
              </button>
            ) : null}
          </section>
        </div>
      ) : null}
    </>
  );
}

function LoanStatement({ res, rate }: { res: LoanResult; rate: number }) {
  const { method, principal, months, graceMonths } = res;
  const interestRatio = principal > 0 ? (res.totalInterest / principal) * 100 : 0;

  const gap = dayCountGap(principal, rate);
  const graceSub = `처음 ${graceMonths}개월은 이자만 월 ${formatWon(res.gracePayment)}`;

  let hero: { label: string; value: string; sub: string; stamp: string };
  if (months === 1) {
    // One installment: every method pays principal + one month of interest at maturity.
    hero = {
      label: `만기에 갚는 돈 (${METHOD_LABEL[method]})`,
      value: formatWon(res.lastPayment),
      sub: `1개월 뒤 원금 ${koreanWon(principal)}과 이자 ${formatWon(res.totalInterest)}을 한 번에 갚아요`,
      stamp: "만기",
    };
  } else if (method === "equal-payment") {
    const evenSub =
      res.amortMonths >= 2 && res.lastPayment !== res.firstPayment
        ? `${termLabel(months)} 동안 매달 같은 금액 · 마지막 달은 끝전 정리로 ${formatWon(res.lastPayment)}`
        : `${termLabel(months)} 동안 매달 같은 금액`;
    hero = {
      label: graceMonths > 0 ? `거치 후 매달 갚는 돈 (원리금균등)` : "매달 갚는 돈 (원리금균등)",
      value: formatWon(res.firstPayment),
      sub: graceMonths > 0 ? graceSub : evenSub,
      stamp: "월상환",
    };
  } else if (method === "equal-principal") {
    const trend =
      res.monthlyDecrease > 0
        ? `매달 약 ${formatWon(res.monthlyDecrease)}씩 줄어요`
        : res.totalInterest === 0
          ? "이자 없이 원금만 나눠 갚아요"
          : null;
    hero = {
      label: graceMonths > 0 ? "거치 후 첫 달 갚는 돈 (원금균등)" : "첫 달 갚는 돈 (원금균등)",
      value: formatWon(res.firstPayment),
      // amortMonths < 2 here only with a grace period (months === 1 is handled above).
      sub:
        res.amortMonths >= 2
          ? [`마지막 달 ${formatWon(res.lastPayment)}`, trend].filter(Boolean).join(" · ")
          : graceSub,
      stamp: "월상환",
    };
  } else {
    hero = {
      label: "매달 내는 이자 (만기일시)",
      value: formatWon(res.firstPayment),
      sub: `만기에 원금 ${koreanWon(principal)}을 한 번에 갚아요`,
      stamp: "월이자",
    };
  }

  return (
    <Statement title="대출 상환 명세" caption={`${METHOD_LABEL[method]}상환 · 연 ${formatNumber(rate, 2)}%`}>
      <StatementHero label={hero.label} value={hero.value} sub={hero.sub} stamp={hero.stamp} />
      <StatementSection title="대출 조건">
        <StatementRow label="대출원금" value={formatWon(principal)} note={koreanWon(principal)} />
        <StatementRow label="연 이자율" value={`${formatNumber(rate, 2)}%`} note={`월 ${formatNumber(rate / 12, 4)}%`} />
        <StatementRow
          label="대출기간"
          value={termLabel(months)}
          note={graceMonths > 0 ? `거치 ${graceMonths}개월 포함` : `${months}회 납입`}
        />
      </StatementSection>
      <StatementSection title="갚는 돈">
        {graceMonths > 0 ? (
          <StatementRow label="거치기간 월 납입액" value={formatWon(res.gracePayment)} note="이자만" />
        ) : null}
        {method === "equal-principal" ? (
          <>
            <StatementRow label="첫 달 납입액" value={formatWon(res.firstPayment)} />
            <StatementRow label="마지막 달 납입액" value={formatWon(res.lastPayment)} />
          </>
        ) : null}
        {method === "bullet" ? (
          <StatementRow label="만기 달 납입액" value={formatWon(res.lastPayment)} note="원금 + 마지막 달 이자" />
        ) : null}
        <StatementRow
          label="총 이자"
          value={formatWon(res.totalInterest)}
          note={`원금의 ${formatNumber(interestRatio, 1)}%`}
          emphasis
        />
      </StatementSection>
      <StatementTotal label="총 상환액" value={formatWon(res.totalPayment)} />
      <StatementFootnote>
        월 이율은 연 이율을 12로 나눠 계산하고 원 미만은 반올림했어요. 은행은 실제 일수로 이자를 매겨서{" "}
        {gap.longMonth >= 100
          ? `처음 잔액 기준으로 31일인 달은 약 ${approxWon(gap.longMonth)} 더, 2월은 약 ${approxWon(gap.february)} 덜 낼 수 있어요.`
          : "달마다 이자가 조금씩 달라요."}{" "}
        변동금리라면 금리가 바뀔 때 상환액도 달라져요.
      </StatementFootnote>
    </Statement>
  );
}

/** One-line takeaway under the comparison table. */
function ComparisonNote({ all }: { all: Record<RepayMethod, LoanResult> }) {
  const eq = all["equal-payment"];
  const pr = all["equal-principal"];
  const bu = all.bullet;
  const saved = eq.totalInterest - pr.totalInterest;
  const extra = bu.totalInterest - eq.totalInterest;
  if (eq.totalInterest === 0) {
    return <p className="mt-3 text-sm text-ink-soft">금리가 0%라 어떤 방식이든 이자가 없어요.</p>;
  }
  if (eq.amortMonths <= 1) {
    return <p className="mt-3 text-sm text-ink-soft">한 번에 갚는 대출이라 세 방식의 결과가 같아요.</p>;
  }
  return (
    <p className="mt-3 text-sm leading-relaxed text-ink-soft">
      원금균등은 원리금균등보다 총 이자가 <strong className="text-ink">{koreanWon(Math.max(0, saved))}</strong> 적지만 첫 달
      부담이 {formatWon(Math.max(0, pr.firstPayment - eq.firstPayment))} 더 커요. 만기일시는 원금이 줄지 않아 원리금균등보다
      이자를 <strong className="text-ink">{koreanWon(Math.max(0, extra))}</strong> 더 내요.
    </p>
  );
}
