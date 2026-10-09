"use client";

import { CalcLayout, CalcNotice } from "@/components/CalcLayout";
import { DateField, SegmentedField, SelectField, StepperField } from "@/components/fields";
import {
  Statement,
  StatementFootnote,
  StatementHero,
  StatementRow,
  StatementSection,
  StatementTotal,
} from "@/components/Statement";
import {
  calcByBrackets,
  calcByDates,
  checkDateInputs,
  DEPENDENTS_CAP,
  formatMonths,
  HOMELESS_BRACKETS,
  HOMELESS_MAX,
  maxScoreByDependents,
  SAVINGS_BRACKETS,
  SAVINGS_MAX,
  SCORE_MAX,
  SPOUSE_BRACKETS,
  type HomelessStartBasis,
  type Ownership,
} from "@/lib/calc/subscription-score";
import { formatKoreanDate, formatYMD, parseYMD } from "@/lib/date";
import { useToday } from "@/lib/useToday";
import { useUrlState } from "@/lib/useUrlState";

type Mode = "d" | "p";
type Own = "n" | "p" | "c";

const OWNERSHIP: Record<Own, Ownership> = { n: "none", p: "past", c: "now" };

const START_LABEL: Record<HomelessStartBasis, string> = {
  age30: "만 30세가 되는 날",
  marriage: "만 30세 전 혼인신고일",
  disposal: "주택을 처분해 무주택이 된 날",
};

/** 부적격 당첨 안내 (제58조: 다시 계산한 가점이 그 주택형 당첨 가점 이상이면 당첨 유지). */
const VERIFY_NOTE =
  "가점은 신청할 때 직접 입력하고 당첨 뒤 서류로 검증해요. 실제와 다르면 부적격 당첨으로 취소될 수 있고(다시 계산한 점수가 그 주택형의 당첨 가점 이상이면 유지), 취소되면 일정 기간 다른 청약에 당첨될 수 없어요.";

const DEPENDENTS_HINT =
  "본인은 빼고 세요. 배우자(세대가 달라도 인정), 3년 이상 같은 등본에 오른 양가 부모·조부모(본인이 세대주이고 그 부부가 모두 무주택일 때), 미혼 자녀(만 30세 이상은 1년 이상 같은 등본)가 들어가요.";

/** "2018. 5. 12." */
function dot(v: { y: number; m: number; d: number }): string {
  return `${v.y}. ${v.m}. ${v.d}.`;
}

function dependentsLabel(n: number): string {
  return n >= DEPENDENTS_CAP ? `${DEPENDENTS_CAP}명 이상` : `${n}명`;
}

export function SubscriptionScoreCalculator() {
  const { today } = useToday();
  // URL keys: m 입력 방식, r 기준일("" = 오늘), b 생년월일, w 기혼, md 혼인신고일, o 주택 소유 이력,
  // hd 무주택이 된 날, f 부양가족, j 통장 가입일, sp 배우자 통장 있음, sj 배우자 가입일,
  // hy·sm·pm 기간 모드의 무주택(년)·통장(개월)·배우자 통장(개월) 구간
  const [s, set] = useUrlState({
    m: "d" as Mode,
    r: "",
    b: "1990-03-15",
    w: true,
    md: "2018-05-12",
    o: "n" as Own,
    hd: "",
    f: 2,
    j: "2014-06-02",
    sp: true,
    sj: "2020-03-02",
    hy: 8,
    sm: 144,
    pm: 24,
  });
  const mode: Mode = s.m === "p" ? "p" : "d";
  const own: Own = s.o === "p" || s.o === "c" ? s.o : "n";
  const married = s.w;
  const dependents = Math.min(DEPENDENTS_CAP, Math.max(0, Math.floor(Number.isFinite(s.f) ? s.f : 0)));
  const todayStr = formatYMD(today);
  const ref = s.r ? parseYMD(s.r) : today;

  const modeField = (
    <SegmentedField<Mode>
      label="입력 방식"
      value={mode}
      onChange={(m) => set({ m })}
      options={[
        { value: "d", label: "날짜로 계산" },
        { value: "p", label: "기간으로 고르기" },
      ]}
      hint={
        mode === "d"
          ? "날짜를 넣으면 기산일과 점수가 오르는 날까지 알려 드려요."
          : "무주택기간과 통장 가입기간을 이미 안다면 구간만 골라도 돼요."
      }
    />
  );

  const marriedField = (
    <SegmentedField<"0" | "1">
      label="혼인 여부"
      value={married ? "1" : "0"}
      onChange={(v) => set({ w: v === "1" })}
      options={[
        { value: "0", label: "미혼" },
        { value: "1", label: "기혼 (혼인신고)" },
      ]}
      hint="결혼식이 아니라 혼인신고가 기준이에요. 신고 전이면 미혼으로 계산해요."
    />
  );

  const dependentsField = (
    <StepperField
      label={dependents >= DEPENDENTS_CAP ? "부양가족 수 (6명 이상)" : "부양가족 수"}
      value={dependents}
      onChange={(f) => set({ f })}
      min={0}
      max={DEPENDENTS_CAP}
      unit="명"
      hint={DEPENDENTS_HINT}
    />
  );

  if (mode === "p") {
    const r = calcByBrackets(s.hy, dependents, s.sm, married ? s.pm : -1);
    return (
      <CalcLayout
        inputs={
          <>
            {modeField}
            {marriedField}
            <SelectField
              label="무주택기간"
              value={String(r.homeless.value)}
              onChange={(v) => set({ hy: Number(v) })}
              options={HOMELESS_BRACKETS.map((b) => ({ value: String(b.value), label: `${b.label} · ${b.points}점` }))}
              hint="만 30세가 되는 날(그 전에 혼인신고했다면 혼인신고일)부터 계속 무주택인 기간이에요. 같은 등본의 부모·자녀 등 세대원 중 누구라도 지금 집이 있으면(만 60세 이상 부모는 제외) ‘해당 없음’이에요."
            />
            {dependentsField}
            <SelectField
              label="청약통장 가입기간"
              value={String(r.own.value)}
              onChange={(v) => set({ sm: Number(v) })}
              options={SAVINGS_BRACKETS.map((b) => ({ value: String(b.value), label: `${b.label} · ${b.points}점` }))}
              hint="최초 가입일부터 공고일까지예요. 미성년 때 가입한 기간은 2023년까지 분은 최대 2년, 2024년 이후 분을 합쳐도 최대 5년만 인정돼요. 미성년 때 가입했다면 ‘날짜로 계산’이 정확해요."
            />
            {married ? (
              <SelectField
                label="배우자 청약통장 가입기간"
                value={String(r.spouse.value)}
                onChange={(v) => set({ pm: Number(v) })}
                options={SPOUSE_BRACKETS.map((b) => ({ value: String(b.value), label: `${b.label} · ${b.points}점` }))}
                hint="배우자 가입기간의 절반을 점수로 바꿔 최대 3점까지 더해요."
              />
            ) : null}
          </>
        }
        result={
          <Statement title="청약 가점 명세" caption="민영주택 가점제 · 별표 1 기준">
            <StatementHero
              label="내 청약 가점"
              value={`${r.total}점`}
              sub={`${SCORE_MAX}점 만점 · 부양가족 ${dependentsLabel(dependents)}이면 최고 ${maxScoreByDependents(dependents)}점`}
              stamp="가점"
            />
            <StatementSection title="항목별 점수">
              <StatementRow
                label="무주택기간"
                note={`${r.homeless.value < 0 ? "산정 대상 아님" : r.homeless.label} · 최대 ${HOMELESS_MAX}점`}
                value={`${r.homeless.points}점`}
              />
              <StatementRow
                label="부양가족"
                note={`${dependentsLabel(dependents)} · 최대 35점`}
                value={`${r.dependentsPoints}점`}
              />
              <StatementRow label="청약통장 (본인)" note={r.own.label} value={`${r.own.points}점`} />
              {married ? (
                <StatementRow
                  label="배우자 통장 가산"
                  note={
                    r.spouse.value < 0
                      ? "배우자 미가입"
                      : r.spouseApplied < r.spouse.points
                        ? `${r.spouse.label} · 17점 한도로 ${r.spouseApplied}점만 인정`
                        : `${r.spouse.label} · 최대 3점`
                  }
                  value={`${r.spouseApplied}점`}
                />
              ) : null}
              <StatementRow
                label="청약통장 합계"
                note={`최대 ${SAVINGS_MAX}점`}
                value={`${r.savings}점`}
                emphasis
              />
            </StatementSection>
            <StatementTotal label="가점 합계" value={`${r.total}점 / ${SCORE_MAX}점`} />
            <StatementFootnote>가점은 입주자모집공고일 현재로 따져요. {VERIFY_NOTE}</StatementFootnote>
          </Statement>
        }
      />
    );
  }

  const birth = parseYMD(s.b);
  const inputsCheck = {
    ref,
    birth,
    married,
    marriage: parseYMD(s.md),
    ownership: OWNERSHIP[own],
    homelessSince: parseYMD(s.hd),
    dependents,
    join: parseYMD(s.j),
    spouseHasSavings: s.sp,
    spouseJoin: parseYMD(s.sj),
  };
  const error = checkDateInputs(inputsCheck);
  const r = error ? null : calcByDates(inputsCheck);

  const inputs = (
    <>
      {modeField}
      <DateField
        label="입주자모집공고일"
        value={s.r || todayStr}
        onChange={(v) => set({ r: v === todayStr ? "" : v })}
        min="1900-01-01"
        max="2100-12-31"
        aside={
          s.r ? (
            <button type="button" className="text-link underline underline-offset-2" onClick={() => set({ r: "" })}>
              오늘로 되돌리기
            </button>
          ) : (
            "오늘"
          )
        }
        hint="가점은 모두 공고일 현재로 따져요. 청약할 단지의 공고일을 넣으면 정확해요."
      />
      <DateField
        label="생년월일"
        value={s.b}
        onChange={(b) => set({ b })}
        min="1900-01-01"
        max="2100-12-31"
        hint="만 30세가 되는 날과 미성년 때 가입한 통장 기간을 따지는 데 써요."
      />
      {marriedField}
      {married ? (
        <DateField
          label="혼인신고일"
          value={s.md}
          onChange={(md) => set({ md })}
          min="1900-01-01"
          max="2100-12-31"
          hint="혼인관계증명서에 적힌 날이에요. 만 30세 전이면 이 날부터 무주택기간을 세요."
        />
      ) : null}
      <SegmentedField<Own>
        label="주택 소유 (세대원 포함)"
        value={own}
        onChange={(o) => set({ o })}
        options={[
          { value: "n", label: "없어요" },
          { value: "p", label: "처분했어요" },
          { value: "c", label: "지금 있어요" },
        ]}
        hint={
          own === "c"
            ? "본인·배우자나 같은 등본의 부모·자녀 중 누구라도 집이 있으면 무주택기간이 0점이에요. 만 60세 이상 부모의 집은 빼고, 분양권·입주권은 주택으로 봐요."
            : own === "p"
              ? "본인·배우자가 집을 처분해 무주택이 된 날부터 다시 세요. 여러 번 가졌다면 마지막으로 처분한 날이에요. 지금 같은 등본의 세대원 중 집이 있는 사람이 있으면 ‘지금 있어요’예요."
              : "본인·배우자는 물론 같은 등본의 부모·자녀 중 누구라도 지금 집이 있으면(만 60세 이상 부모는 제외) ‘지금 있어요’를 골라 주세요. 분양권·입주권도 주택이고, 공시가격이 낮은 소형 주택 1채 등은 무주택으로 봐요."
        }
      />
      {own === "p" ? (
        <DateField
          label="무주택이 된 날"
          value={s.hd}
          onChange={(hd) => set({ hd })}
          min="1900-01-01"
          max="2100-12-31"
          hint="처분한 집의 등기접수일이에요. 건축물대장 처리일이 더 빠르면 그 날이에요."
        />
      ) : null}
      {dependentsField}
      <DateField
        label="청약통장 가입일"
        value={s.j}
        onChange={(j) => set({ j })}
        min="1900-01-01"
        max="2100-12-31"
        hint="최초 가입일이에요. 미성년 때 가입했다면 인정 한도(2023년까지 최대 2년, 합쳐서 최대 5년)를 자동으로 반영해요."
      />
      {married ? (
        <SegmentedField<"0" | "1">
          label="배우자 청약통장"
          value={s.sp ? "1" : "0"}
          onChange={(v) => set({ sp: v === "1" })}
          options={[
            { value: "0", label: "없어요" },
            { value: "1", label: "있어요" },
          ]}
          hint="공고일 현재 배우자가 가입해 있으면 가입기간의 절반을 점수로 바꿔 최대 3점 더해요."
        />
      ) : null}
      {married && s.sp ? (
        <DateField
          label="배우자 통장 가입일"
          value={s.sj}
          onChange={(sj) => set({ sj })}
          min="1900-01-01"
          max="2100-12-31"
          hint="배우자가 2년 이상 가입했다면 3점을 모두 받아요."
        />
      ) : null}
    </>
  );

  if (error || !r || !ref) {
    return <CalcLayout inputs={inputs} result={<CalcNotice>{error ?? "날짜를 다시 확인해 주세요."}</CalcNotice>} />;
  }

  const h = r.homeless;
  const sv = r.savings;
  const spouseRow = married && r.spouseMonths !== null;

  const homelessNote = h.owner
    ? "주택 소유 세대"
    : h.counting
      ? `${formatMonths(h.months)} · 최대 ${HOMELESS_MAX}점`
      : "아직 세기 전 (만 30세 미만 미혼)";

  const savingsNote =
    sv.applied > 0
      ? `본인 ${sv.own}점 + 배우자 ${sv.applied}점 · 최대 ${SAVINGS_MAX}점`
      : `${formatMonths(r.own.months)} · 최대 ${SAVINGS_MAX}점`;

  return (
    <CalcLayout
      inputs={inputs}
      result={
        <Statement title="청약 가점 명세" caption={`${formatKoreanDate(ref)} 공고 기준`}>
          <StatementHero
            label="내 청약 가점"
            value={`${r.total}점`}
            sub={`${SCORE_MAX}점 만점 · 부양가족 ${dependentsLabel(r.dependents)}이면 최고 ${maxScoreByDependents(r.dependents)}점`}
            stamp="가점"
          />

          <StatementSection title="항목별 점수">
            <StatementRow label="무주택기간" note={homelessNote} value={`${h.points}점`} />
            <StatementRow
              label="부양가족"
              note={`${dependentsLabel(r.dependents)} · 본인 제외 · 최대 35점`}
              value={`${r.dependentsPoints}점`}
            />
            <StatementRow label="청약통장 가입기간" note={savingsNote} value={`${sv.total}점`} />
          </StatementSection>
          <StatementTotal label="가점 합계" value={`${r.total}점 / ${SCORE_MAX}점`} />

          <StatementSection title="산정 근거">
            {h.owner ? (
              <StatementRow label="무주택기간" note="공고일 현재 주택을 가진 세대" value="0점" />
            ) : (
              <StatementRow
                label="무주택 기산일"
                note={h.startBasis ? START_LABEL[h.startBasis] : undefined}
                value={dot(h.start!)}
              />
            )}
            <StatementRow
              label="통장 가입일"
              note={
                r.own.minorCapped
                  ? `미성년 기간 한도 반영, ${formatMonths(r.own.months)} 인정`
                  : r.own.joinedAsMinor
                    ? `미성년 가입분 포함 ${formatMonths(r.own.months)}`
                    : `가입기간 ${formatMonths(r.own.months)}`
              }
              value={dot(r.own.join)}
            />
            {r.own.minorCapped ? (
              <StatementRow label="통장 점수 기산일" note="인정 기간을 날짜로 환산" value={dot(r.own.start)} />
            ) : null}
            {spouseRow ? (
              <StatementRow
                label="배우자 통장"
                note={
                  !sv.spouseAllowed
                    ? "2024. 3. 25. 전 공고라 합산하지 않아요"
                    : sv.applied < sv.bonus
                      ? `절반 기간 ${sv.bonus}점 중 17점 한도로 ${sv.applied}점`
                      : `절반 기간으로 ${sv.bonus}점 (최대 3점)`
                }
                value={formatMonths(r.spouseMonths!)}
              />
            ) : null}
          </StatementSection>

          <StatementSection title="점수가 오르는 날">
            {h.owner ? null : h.next ? (
              <StatementRow
                label="무주택기간"
                note={h.counting ? `${h.next.points}점이 돼요` : "이 날부터 2점으로 세기 시작해요"}
                value={formatKoreanDate(h.next.date)}
              />
            ) : (
              <StatementRow label="무주택기간" note="15년 이상" value={`만점 ${HOMELESS_MAX}점`} />
            )}
            {r.savingsNext ? (
              <StatementRow
                label="청약통장"
                note={`${r.savingsNext.points}점이 돼요`}
                value={formatKoreanDate(r.savingsNext.date)}
              />
            ) : sv.total >= SAVINGS_MAX ? (
              <StatementRow label="청약통장" note="본인·배우자 합산" value={`만점 ${SAVINGS_MAX}점`} />
            ) : (
              <StatementRow label="청약통장" note="만 19세 이후 다시 계산해 보세요" value="미성년" />
            )}
          </StatementSection>

          <StatementFootnote>
            {h.owner
              ? "주택을 가진 세대는 투기과열지구·청약과열지역 등에서는 가점제로 뽑히지 않고 추첨제로만 경쟁해요. 그 밖의 지역 85㎡ 이하에서는 1주택 세대도 가점제에 들어갈 수 있지만 무주택기간은 0점이에요. "
              : ""}
            {VERIFY_NOTE}
          </StatementFootnote>
        </Statement>
      }
    />
  );
}
