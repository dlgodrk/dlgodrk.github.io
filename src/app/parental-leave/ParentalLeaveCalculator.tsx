"use client";

import { useId } from "react";
import { CalcLayout, CalcNotice } from "@/components/CalcLayout";
import { CheckboxField, DateField, NumberField, SegmentedField, StepperField } from "@/components/fields";
import {
  Statement,
  StatementFootnote,
  StatementHero,
  StatementRow,
  StatementSection,
  StatementTotal,
} from "@/components/Statement";
import { formatKoreanDate, formatYMD, parseYMD, type YMD } from "@/lib/date";
import { formatNumber, formatWon, koreanWon } from "@/lib/format";
import {
  calcMaternity,
  calcParentalLeave,
  calcSpouseLeave,
  MATERNITY_DAYS,
  MAX_MONTHS,
  MAX_WAGE,
  SIX_SIX_MONTHS,
  SPOUSE_LEAVE_DAYS,
  type BirthType,
  type CompanySize,
  type Household,
  type MaternityResult,
  type ParentalResult,
  type ParentalRow,
  type SpouseLeaveResult,
} from "@/lib/calc/parental-leave";
import { useToday } from "@/lib/useToday";
import { useUrlState } from "@/lib/useUrlState";

/** p 육아휴직 / m 출산전후휴가 / s 배우자 출산휴가 */
type Tab = "p" | "m" | "s";
/** n 혼자 / y 배우자도 육아휴직 / s 한부모 */
type HouseKey = "n" | "y" | "s";
/** s 배우자가 먼저(또는 동시에) / f 내가 먼저 */
type OrderKey = "s" | "f";
type SizeKey = "p" | "l";
type BirthKey = "1" | "p" | "2";

const HOUSE: Record<HouseKey, Household> = { n: "alone", y: "both", s: "single" };
const SIZE: Record<SizeKey, CompanySize> = { p: "priority", l: "large" };
const BIRTH: Record<BirthKey, BirthType> = { "1": "single", p: "premature", "2": "multiple" };

const PARENTAL_MIN = "2025-01-01";
const MATERNITY_MIN = "2025-02-23";
const DATE_MAX = "2028-12-31";

const WAGE_PRESETS = [2_000_000, 2_500_000, 3_000_000, 3_500_000, 4_000_000, 5_000_000].map((v) => ({
  label: `${v / 10_000}만원`,
  value: v,
}));

function manwon(n: number): string {
  return `${formatNumber(n / 10_000, 1)}만원`;
}

/** 2026.11.01 */
function dot(v: YMD): string {
  return `${v.y}.${String(v.m).padStart(2, "0")}.${String(v.d).padStart(2, "0")}`;
}

/** 2026.11.01~11.30 (같은 해면 끝 날짜의 연도 생략) */
function span(from: YMD, to: YMD): string {
  const end = from.y === to.y ? `${String(to.m).padStart(2, "0")}.${String(to.d).padStart(2, "0")}` : dot(to);
  return `${dot(from)}~${end}`;
}

function resolveDate(raw: string, today: YMD, min: string): YMD {
  const v = parseYMD(raw);
  if (v && raw >= min && raw <= DATE_MAX) return v;
  return today;
}

export function ParentalLeaveCalculator() {
  // URL keys: t 탭, w 월 통상임금, d 육아휴직 시작일, m 기간(개월), p 가구(n 혼자/y 배우자도/s 한부모),
  // sm 배우자 기간, e 생후 18개월 안(6+6), o 순서(s 배우자 먼저·동시/f 내가 먼저),
  // md 출산휴가·배우자 휴가 시작일, c 기업 규모(p 우선지원/l 대규모), k 출산 유형(1/p 미숙아/2 다태아),
  // pt 단시간 근로자, sd 배우자 출산휴가 사용 일수
  const [s, set] = useUrlState({
    t: "p" as Tab,
    w: 3_000_000,
    d: "",
    m: 12,
    p: "n" as HouseKey,
    sm: 6,
    e: true,
    o: "s" as OrderKey,
    md: "",
    c: "p" as SizeKey,
    k: "1" as BirthKey,
    pt: false,
    sd: SPOUSE_LEAVE_DAYS,
  });
  // Hydration-safe: first render uses the build date, then the visitor's real today (KST).
  const { today } = useToday();
  const tab: Tab = s.t === "m" || s.t === "s" ? s.t : "p";
  const houseKey: HouseKey = s.p === "y" || s.p === "s" ? s.p : "n";
  const sizeKey: SizeKey = s.c === "l" ? "l" : "p";
  const birthKey: BirthKey = s.k === "p" || s.k === "2" ? s.k : "1";
  const order: OrderKey = s.o === "f" ? "f" : "s";
  const months = Number.isFinite(s.m) ? Math.min(MAX_MONTHS, Math.max(1, Math.round(s.m))) : 12;
  const spouseMonths = Number.isFinite(s.sm) ? Math.min(MAX_MONTHS, Math.max(1, Math.round(s.sm))) : 6;
  const spouseDays = Number.isFinite(s.sd) ? Math.min(SPOUSE_LEAVE_DAYS, Math.max(1, Math.round(s.sd))) : SPOUSE_LEAVE_DAYS;

  const leaveStart = resolveDate(s.d, today, PARENTAL_MIN);
  const birthStart = resolveDate(s.md, today, MATERNITY_MIN);
  const wageOk = Number.isFinite(s.w) && s.w > 0;

  const parental =
    tab === "p"
      ? calcParentalLeave({
          wage: s.w,
          months,
          household: HOUSE[houseKey],
          spouseMonths,
          withinEighteen: s.e,
          order: order === "f" ? "first" : "second",
          start: leaveStart,
        })
      : null;
  const maternity =
    tab === "m"
      ? calcMaternity({ wage: s.w, birth: BIRTH[birthKey], size: SIZE[sizeKey], start: birthStart, fullTime: !s.pt })
      : null;
  const spouse =
    tab === "s" ? calcSpouseLeave({ wage: s.w, days: spouseDays, size: SIZE[sizeKey], start: birthStart }) : null;

  const wageNotice = (
    <CalcNotice>
      {wageOk ? "월 통상임금을 1억원 이하로 넣어 주세요." : "월 통상임금을 넣으면 바로 계산해 드려요."}
    </CalcNotice>
  );

  return (
    <>
      <CalcLayout
        inputs={
          <>
            <SegmentedField<Tab>
              label="계산할 급여"
              value={tab}
              onChange={(t) => set({ t })}
              options={[
                { value: "p", label: "육아휴직" },
                { value: "m", label: "출산휴가" },
                { value: "s", label: "배우자 출산휴가" },
              ]}
            />
            <NumberField
              label="월 통상임금 (세전)"
              value={s.w}
              onChange={(w) => set({ w })}
              unit="원"
              max={MAX_WAGE}
              reading={(n) => koreanWon(n)}
              presets={WAGE_PRESETS}
              hint="기본급에 매달 고정으로 받는 수당을 더한 금액이에요. 정기상여금이 있으면 12로 나눠 더해요. 연장·야간수당과 실적 성과급은 빼요."
            />

            {tab === "p" ? (
              <>
                <DateField
                  label="육아휴직 시작일"
                  value={formatYMD(leaveStart)}
                  onChange={(d) => set({ d })}
                  min={PARENTAL_MIN}
                  max={DATE_MAX}
                  hint="달별 지급표의 기간을 이 날짜부터 한 달씩 나눠 보여 드려요."
                />
                <StepperField
                  label="육아휴직 기간"
                  value={months}
                  onChange={(m) => set({ m })}
                  min={1}
                  max={MAX_MONTHS}
                  unit="개월"
                  hint="기본 1년이에요. 부모가 각각 3개월 이상 쓰거나 한부모·장애아동 부모면 1년 6개월까지 쓸 수 있어요."
                />
                <SegmentedField<HouseKey>
                  label="배우자 육아휴직"
                  value={houseKey}
                  onChange={(p) => set({ p })}
                  options={[
                    { value: "n", label: "나만 써요" },
                    { value: "y", label: "배우자도 써요" },
                    { value: "s", label: "한부모예요" },
                  ]}
                  hint={
                    houseKey === "s"
                      ? "한부모는 첫 3개월 상한이 월 300만원으로 높아요."
                      : "같은 자녀로 부모가 모두 육아휴직을 하면 6+6 특례나 기간 연장을 받을 수 있어요."
                  }
                />
                {houseKey === "y" ? (
                  <>
                    <StepperField
                      label="배우자 육아휴직 기간"
                      value={spouseMonths}
                      onChange={(sm) => set({ sm })}
                      min={1}
                      max={MAX_MONTHS}
                      unit="개월"
                      hint="6+6 상향 상한은 두 사람이 공통으로 쓴 기간(짧은 쪽, 최대 6개월)만큼만 적용돼요."
                    />
                    <CheckboxField
                      label="두 사람 모두 자녀 생후 18개월 안에 휴직을 시작해요 (6+6)"
                      checked={s.e}
                      onChange={(e) => set({ e })}
                    />
                    {s.e ? (
                      <SegmentedField<OrderKey>
                        label="누가 먼저 쉬나요"
                        value={order}
                        onChange={(o) => set({ o })}
                        options={[
                          { value: "s", label: "배우자가 먼저·동시에" },
                          { value: "f", label: "내가 먼저" },
                        ]}
                        hint={
                          order === "f"
                            ? "먼저 쉬면 휴직 중에는 일반 기준으로 받고, 배우자가 휴직을 시작하면 차액을 한꺼번에 더 받아요."
                            : "두 번째로 쉬는 사람은 처음부터 6+6 상한으로 받아요."
                        }
                      />
                    ) : null}
                  </>
                ) : null}
              </>
            ) : (
              <>
                {tab === "m" ? (
                  <SegmentedField<BirthKey>
                    label="출산 유형"
                    value={birthKey}
                    onChange={(k) => set({ k })}
                    options={[
                      { value: "1", label: `한 명 ${MATERNITY_DAYS.single}일` },
                      { value: "p", label: `미숙아 ${MATERNITY_DAYS.premature}일` },
                      { value: "2", label: `다태아 ${MATERNITY_DAYS.multiple}일` },
                    ]}
                  />
                ) : (
                  <StepperField
                    label="사용 일수"
                    value={spouseDays}
                    onChange={(sd) => set({ sd })}
                    min={1}
                    max={SPOUSE_LEAVE_DAYS}
                    unit="일"
                    hint="주말·공휴일을 뺀 근무일 기준으로 20일이에요."
                  />
                )}
                <SegmentedField<SizeKey>
                  label="회사 규모"
                  value={sizeKey}
                  onChange={(c) => set({ c })}
                  options={[
                    { value: "p", label: "우선지원대상기업" },
                    { value: "l", label: "대규모기업" },
                  ]}
                  hint="중소기업이거나 상시 근로자가 업종별 기준(제조업 500명, 그 밖의 업종 100~300명) 이하면 우선지원대상기업이에요."
                />
                <DateField
                  label="휴가 시작일"
                  value={formatYMD(birthStart)}
                  onChange={(md) => set({ md })}
                  min={MATERNITY_MIN}
                  max={DATE_MAX}
                  hint="상한액은 휴가를 시작한 해의 기준을 적용해요."
                />
                {tab === "m" ? (
                  <CheckboxField
                    label="주 40시간보다 적게 일해요 (단시간 근로자)"
                    checked={s.pt}
                    onChange={(pt) => set({ pt })}
                    hint="단시간 근로자는 최저임금 하한도 근로시간에 비례해 낮아져서, 하한을 적용하지 않고 계산해요."
                  />
                ) : null}
              </>
            )}
          </>
        }
        result={
          tab === "p" ? (
            parental ? (
              <ParentalStatement r={parental} start={leaveStart} house={houseKey} withinEighteen={s.e} />
            ) : (
              wageNotice
            )
          ) : tab === "m" ? (
            maternity ? (
              <MaternityStatement r={maternity} start={birthStart} size={sizeKey} />
            ) : (
              wageNotice
            )
          ) : spouse ? (
            <SpouseStatement r={spouse} size={sizeKey} />
          ) : (
            wageNotice
          )
        }
      />
      {tab === "p" && parental ? <MonthTable r={parental} first={parental.paidLater > 0} /> : null}
    </>
  );
}

type Group = { from: number; to: number; amount: number; row: ParentalRow };

/** Consecutive months with the same rate and cap, e.g. 1~3개월째 100% 250만원. */
function groupRows(rows: ParentalRow[]): Group[] {
  const out: Group[] = [];
  for (const r of rows) {
    const last = out[out.length - 1];
    if (last && last.row.rule === r.rule && last.row.ratePct === r.ratePct && last.row.cap === r.cap) {
      last.to = r.n;
      last.amount += r.amount;
    } else {
      out.push({ from: r.n, to: r.n, amount: r.amount, row: r });
    }
  }
  return out;
}

function ruleLabel(r: ParentalResult, house: HouseKey, withinEighteen: boolean): string {
  if (house === "s") return "한부모 특례";
  if (r.sixSixMonths > 0) return `6+6 특례 ${r.sixSixMonths}개월 + 일반`;
  if (house === "y" && !withinEighteen) return "일반 (6+6 요건 아님)";
  return "일반 육아휴직";
}

function ParentalStatement({
  r,
  start,
  house,
  withinEighteen,
}: {
  r: ParentalResult;
  start: YMD;
  house: HouseKey;
  withinEighteen: boolean;
}) {
  const months = r.rows.length;
  const first = r.paidLater > 0;
  const groups = groupRows(r.rows);
  const sub = first
    ? `휴직 중 ${formatWon(r.paidDuring)} + 배우자 휴직 후 ${formatWon(r.paidLater)}`
    : `월 평균 ${formatWon(r.average)} · ${months}개월`;
  return (
    <Statement title="육아휴직 급여 명세" caption={`${formatKoreanDate(start, false)} 시작 · ${months}개월`}>
      <StatementHero label="총 예상 수령액" value={formatWon(r.total)} sub={sub} stamp="급여" />
      <StatementSection title="적용 기준">
        <StatementRow label="월 통상임금" note="휴직 시작일 기준" value={formatWon(r.rows[0].raw)} />
        <StatementRow label="적용 제도" value={ruleLabel(r, house, withinEighteen)} />
      </StatementSection>
      <StatementSection title="구간별 합계">
        {groups.map((g) => (
          <StatementRow
            key={g.from}
            label={g.from === g.to ? `${g.from}개월째` : `${g.from}~${g.to}개월째`}
            note={`${g.row.ratePct}% · 월 상한 ${manwon(g.row.cap)}${g.row.rule === "sixsix" ? " (6+6)" : ""}`}
            value={formatWon(g.amount)}
          />
        ))}
      </StatementSection>
      {r.sixSixMonths > 0 ? (
        <StatementSection title="6+6 특례로 달라지는 돈">
          <StatementRow label="일반 기준이었다면" value={formatWon(r.baselineTotal)} />
          <StatementRow label="6+6으로 더 받는 돈" value={`+${formatWon(r.sixSixGain)}`} emphasis />
          {first ? (
            <>
              <StatementRow label="휴직 중 매달 받는 돈" note="일반 기준" value={formatWon(r.paidDuring)} />
              <StatementRow label="배우자 휴직 시작 후 추가로" note="차액 한꺼번에" value={formatWon(r.paidLater)} />
            </>
          ) : null}
        </StatementSection>
      ) : null}
      <StatementTotal label={`${months}개월 합계`} value={formatWon(r.total)} />
      {r.extended && !r.extensionOk ? (
        <StatementFootnote>
          육아휴직은 1년이 기본이에요. 13개월째부터는 부모가 각각 3개월 이상 쓰거나 한부모·장애아동 부모일 때만 쓸 수 있어서,
          요건을 채운다고 보고 계산했어요.
        </StatementFootnote>
      ) : null}
      <StatementFootnote>
        2025년부터 사후지급금이 없어져 매달 전액을 받아요. 휴직 시작 1개월 뒤부터 고용24에서 매달 신청하고, 휴직이 끝난 날부터
        12개월 안에 신청해야 해요. 육아휴직 급여는 비과세예요. 휴직 중 회사에서 받은 돈과 급여를 더해 통상임금을 넘으면 넘는 만큼
        줄어들어요.
        {start.y >= 2027 ? " 2027년 이후 시작분도 지금 시행령 기준이 그대로라고 보고 계산했어요." : ""}
      </StatementFootnote>
    </Statement>
  );
}

function MaternityStatement({ r, start, size }: { r: MaternityResult; start: YMD; size: SizeKey }) {
  const end = r.end ?? start;
  return (
    <Statement title="출산전후휴가 급여 명세" caption={`${dot(start)}~${dot(end)} · ${r.days}일`}>
      <StatementHero
        label={`출산휴가 ${r.days}일 동안 받는 돈`}
        value={formatWon(r.total)}
        sub={`고용보험 ${formatWon(r.insurance)} + 회사 ${formatWon(r.employer)}`}
        stamp="급여"
      />
      <StatementSection title="누가 얼마를 주나요">
        <StatementRow
          label="고용보험 출산전후휴가 급여"
          note={`${r.insuredDays}일분 · 30일 ${formatWon(r.insuredMonthly)}`}
          value={formatWon(r.insurance)}
        />
        <StatementRow
          label="회사 지급"
          note={
            size === "p"
              ? `최초 ${r.employerPaidDays}일 중 상한 넘는 부분`
              : `최초 ${r.employerPaidDays}일 통상임금 전액`
          }
          value={formatWon(r.employer)}
        />
      </StatementSection>
      <StatementSection title="구간별 지급">
        {r.segments.map((g) => (
          <StatementRow
            key={g.fromDay}
            label={`${g.fromDay}~${g.toDay}일`}
            note={`고용보험 ${formatNumber(g.insurance)} · 회사 ${formatNumber(g.employer)}`}
            value={formatWon(g.total)}
          />
        ))}
      </StatementSection>
      <StatementSection title="적용 기준">
        <StatementRow
          label="고용보험 상한 (30일)"
          note={r.cap.estimated ? `${r.cap.year}년 예상, 고시 전` : `${r.cap.year}년 시작분`}
          value={formatWon(r.cap.cap)}
        />
        {r.floorApplied ? (
          <StatementRow label="최저임금 하한 적용" note="주 40시간 월 환산" value={formatWon(r.floor)} />
        ) : null}
      </StatementSection>
      <StatementFootnote>
        30일을 월 통상임금 한 달분으로 보고 계산했어요. 실제로는 일 통상임금으로 일할 계산해 조금 다를 수 있어요. 고용보험
        급여는 고용24에서 휴가가 끝난 날부터 12개월 안에 신청하고 비과세예요. 회사가 주는 몫은 근로소득이라 세금이 붙어요.
        {r.cap.estimated
          ? " 2027년 상한액은 아직 고시되지 않아, 2027년 최저임금 월 환산액보다 낮아지지 않는다고 보고 예상했어요."
          : ""}
      </StatementFootnote>
    </Statement>
  );
}

function SpouseStatement({ r, size }: { r: SpouseLeaveResult; size: SizeKey }) {
  return (
    <Statement title="배우자 출산휴가 급여 명세" caption={`${r.days}일 · 주 40시간 근로자 기준`}>
      <StatementHero
        label="배우자 출산휴가 급여"
        value={formatWon(r.total)}
        sub={`월 통상임금 ÷ 209시간 × 8시간 × ${r.days}일`}
        stamp="급여"
      />
      <StatementSection title="누가 얼마를 주나요">
        <StatementRow
          label="고용보험 지원"
          note={
            size === "p"
              ? `상한 ${formatWon(r.cap.cap)} (${r.days}일분${r.cap.estimated ? ", 예상" : ""})`
              : "대규모기업은 지원 없음"
          }
          value={formatWon(r.government)}
        />
        <StatementRow
          label="회사 지급"
          note={size === "p" ? (r.capApplied ? "상한 넘는 부분" : "없음") : "20일 모두 유급"}
          value={formatWon(r.employer)}
        />
      </StatementSection>
      <StatementSection title="계산 근거">
        <StatementRow label="일 통상임금" note="월 통상임금 ÷ 209시간 × 8시간, 원 미만 버림" value={formatWon(r.daily)} />
        <StatementRow
          label={`${r.days}일분 통상임금`}
          note="일수까지 곱한 뒤 원 미만 버림"
          value={formatWon(r.total)}
        />
      </StatementSection>
      <StatementFootnote>
        배우자 출산휴가 20일은 모두 유급이라 회사 규모와 관계없이 통상임금 전액을 받아요. 2026년 9월 18일부터 출산예정일 50일
        전부터 출산 후 120일 안에 3번까지 나눠(모두 4번에 걸쳐) 쓸 수 있어요.
      </StatementFootnote>
    </Statement>
  );
}

function MonthTable({ r, first }: { r: ParentalResult; first: boolean }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="mt-10 min-w-0">
      <h2 id={id} className="text-xl font-bold text-ink">
        달별 지급표
      </h2>
      <p className="mt-1 text-sm text-muted">
        휴직 시작일부터 한 달씩 나눈 회차예요. 상한이나 하한에 걸린 달은 지급액 옆에 표시했어요.
        {r.sixSixMonths > 0 ? ` 6+6 특례는 처음 ${Math.min(r.sixSixMonths, SIX_SIX_MONTHS)}개월에 적용돼요.` : ""}
      </p>
      <div className="table-wrap mt-3">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">회차</th>
              <th scope="col">{first ? "휴직 중 지급" : "지급액"}</th>
              {first ? <th scope="col">추가 지급</th> : null}
              <th scope="col">지급률 · 월 상한</th>
              <th scope="col">기간</th>
            </tr>
          </thead>
          <tbody>
            {r.rows.map((row) => (
              <tr key={row.n}>
                <td>
                  {row.n}개월째
                  {row.rule === "sixsix" ? <span className="ml-1 text-xs text-muted">6+6</span> : null}
                </td>
                <td>
                  {formatNumber(first ? row.during : row.amount)}
                  {row.capped ? <span className="ml-1 text-xs text-muted">상한</span> : null}
                  {row.floored ? <span className="ml-1 text-xs text-muted">하한</span> : null}
                </td>
                {first ? <td>{row.later > 0 ? formatNumber(row.later) : "-"}</td> : null}
                <td>
                  {row.ratePct}% · {manwon(row.cap)}
                </td>
                <td>{row.from && row.to ? span(row.from, row.to) : "-"}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>합계</td>
              <td>{formatNumber(first ? r.paidDuring : r.total)}</td>
              {first ? <td>{formatNumber(r.paidLater)}</td> : null}
              <td>-</td>
              <td>-</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
