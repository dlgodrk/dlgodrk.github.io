"use client";

import type { ReactNode } from "react";
import { CalcLayout, CalcNotice } from "@/components/CalcLayout";
import { CheckboxField, NumberField, SegmentedField, SelectField, StepperField } from "@/components/fields";
import {
  Statement,
  StatementFootnote,
  StatementHero,
  StatementRow,
  StatementSection,
  StatementTotal,
} from "@/components/Statement";
import { formatNumber, formatWon, koreanWon, manwonLabel } from "@/lib/format";
import { SEASON_NOTE, settlementSeason, STANDARD_CREDIT, type ExtraPersonal } from "@/lib/calc/year-end-tax";
import {
  clampChildren,
  clampCreditChildren,
  clampFamily,
  clampMembers,
  clampTableChildren,
  DEFAULT_FORM,
  MAX_AMOUNT,
  MAX_FAMILY,
  MAX_TOTAL_PAY_MANWON,
  normalizeBirthOrder,
  normalizeHome,
  normalizeRatio,
  shortWon,
  sumAmounts,
  TOTAL_PAY_PRESETS_MANWON,
  yearEndFromForm,
  type AmountMode,
  type HomeStatus,
} from "@/lib/calc/year-end-tax-ui";
import { useToday } from "@/lib/useToday";
import { useUrlState } from "@/lib/useUrlState";
import { InputGroup } from "./InputGroup";

const D = DEFAULT_FORM;

const EXTRA_OPTIONS: { value: ExtraPersonal; label: string }[] = [
  { value: "n", label: "해당 없음" },
  { value: "w", label: "부녀자 공제 (50만원)" },
  { value: "s", label: "한부모 공제 (100만원)" },
];

const BIRTH_OPTIONS = [
  { value: "0", label: "없음" },
  { value: "1", label: "첫째 (30만원)" },
  { value: "2", label: "둘째 (50만원)" },
  { value: "3", label: "셋째 이상 (70만원)" },
];

const HOME_OPTIONS: { value: HomeStatus; label: string }[] = [
  { value: "n", label: "해당 없음 (집이 있는 세대)" },
  { value: "h", label: "무주택 세대의 세대주 (또는 그 배우자)" },
  { value: "m", label: "무주택 세대의 세대원" },
];

const HOME_SUMMARY: Record<HomeStatus, string> = { n: "해당 없음", h: "무주택 세대주", m: "무주택 세대원" };

const RATIO_OPTIONS = [
  { value: "80", label: "80% (매달 덜 뗌)" },
  { value: "100", label: "100% (기본)" },
  { value: "120", label: "120% (매달 더 뗌)" },
];

const BIRTH_LABEL = ["", "첫째", "둘째", "셋째 이상"];

/** "4,000만" style chip label */
function chipLabel(manwon: number): string {
  return manwon >= 10_000 && manwon % 10_000 === 0 ? `${manwon / 10_000}억` : `${formatNumber(manwon)}만`;
}

function WonField({
  label,
  value,
  onChange,
  hint,
  presets,
}: {
  label: ReactNode;
  value: number;
  onChange: (n: number) => void;
  hint?: ReactNode;
  presets?: { label: string; value: number }[];
}) {
  return (
    <NumberField
      label={label}
      value={value}
      onChange={onChange}
      unit="원"
      max={MAX_AMOUNT}
      reading={(v) => (v >= 10_000 ? koreanWon(v) : null)}
      presets={presets}
      hint={hint}
    />
  );
}

export function YearEndTaxCalculator() {
  // URL keys: g 총급여(만원) · f 기본공제 인원 · k 20세 이하 자녀 · kc 자녀세액공제 대상 · kw 2017·2018년생
  //   o 70세 이상 · dp 장애인 · x 부녀자/한부모 · b 출산·입양 순서 · w 2026 혼인신고
  //   cc/cd/cu/cm/ct 신용·체크·문화·전통시장·대중교통
  //   hh 주택 상황(n/h 세대주/m 세대원) · hs 주택청약 · rt 월세 · ps 연금저축 · pi IRP · ip 보장성 보험료
  //   ms/mo 의료비(본인 등/그 밖) · ed 교육비 · dn 기부금 · dr 종교단체 · dh 고향사랑
  //   im 4대보험 입력 방식 · np/nh 직접 입력 · wm 기납부 방식 · wr 원천징수 비율 · wp 기납부 소득세
  const [s, set] = useUrlState({
    g: D.totalPayManwon,
    f: D.family,
    k: D.children,
    kc: D.creditChildren,
    kw: D.tableChildren,
    o: D.seniors,
    dp: D.disabled,
    x: D.extra,
    b: D.birthOrder,
    w: D.married,
    cc: D.credit,
    cd: D.debit,
    cu: D.culture,
    cm: D.market,
    ct: D.transit,
    hh: D.home,
    hs: D.housingSubscription,
    rt: D.rent,
    ps: D.pensionSavings,
    pi: D.irp,
    ip: D.insurancePremium,
    ms: D.medicalSelf,
    mo: D.medicalOther,
    ed: D.education,
    dn: D.donation,
    dr: D.religiousDonation,
    dh: D.hometownDonation,
    im: D.insuranceMode,
    np: D.pensionManual,
    nh: D.healthManual,
    wm: D.prepaidMode,
    wr: D.ratio,
    wp: D.prepaidManual,
  });
  const { today } = useToday();
  const season = settlementSeason(today);

  const family = clampFamily(s.f);
  const children = clampChildren(s.k, family);
  const creditChildren = clampCreditChildren(s.kc, children);
  const tableChildren = clampTableChildren(s.kw, children, creditChildren);
  const home = normalizeHome(s.hh);
  const overSeventy = Number.isFinite(s.g) && Math.round(s.g * 10_000) > 70_000_000;
  const insMode: AmountMode = s.im === "m" ? "m" : "a";
  const prepaidMode: AmountMode = s.wm === "m" ? "m" : "a";
  const ratio = normalizeRatio(s.wr);
  const birthOrder = normalizeBirthOrder(s.b);
  const extra: ExtraPersonal = s.x === "w" || s.x === "s" ? s.x : "n";

  const out = yearEndFromForm({
    totalPayManwon: s.g,
    family,
    children,
    creditChildren,
    tableChildren,
    seniors: s.o,
    disabled: s.dp,
    extra,
    birthOrder,
    married: s.w,
    credit: s.cc,
    debit: s.cd,
    culture: s.cu,
    market: s.cm,
    transit: s.ct,
    home,
    housingSubscription: s.hs,
    rent: s.rt,
    pensionSavings: s.ps,
    irp: s.pi,
    insurancePremium: s.ip,
    medicalSelf: s.ms,
    medicalOther: s.mo,
    education: s.ed,
    donation: s.dn,
    religiousDonation: s.dr,
    hometownDonation: s.dh,
    insuranceMode: insMode,
    pensionManual: s.np,
    healthManual: s.nh,
    prepaidMode,
    ratio,
    prepaidManual: s.wp,
  });

  const cardSum = sumAmounts(s.cc, s.cd, s.cu, s.cm, s.ct);
  const savingSum = sumAmounts(s.ps, s.pi, s.ip);
  const careSum = sumAmounts(s.ms, s.mo, s.ed, s.dn, s.dr, s.dh);
  const extraCount = clampMembers(s.o, family) + clampMembers(s.dp, family) + (extra !== "n" ? 1 : 0) + (birthOrder ? 1 : 0) + (s.w ? 1 : 0);

  return (
    <CalcLayout
      inputs={
        <>
          <NumberField
            label="총급여 (2026년, 비과세 제외)"
            value={s.g}
            onChange={(g) => set({ g })}
            unit="만원"
            max={MAX_TOTAL_PAY_MANWON}
            reading={(v) => (v > 0 ? manwonLabel(v) : null)}
            presets={TOTAL_PAY_PRESETS_MANWON.map((v) => ({ label: chipLabel(v), value: v }))}
            hint="1년 치 세전 급여·상여에서 식대 같은 비과세를 뺀 금액이에요. 식대 월 20만원이면 연봉에서 240만원을 빼세요."
          />

          <InputGroup title="가족 (인적공제·자녀)" summary={`${family}명${children ? ` · 자녀 ${children}명` : ""}`} defaultOpen>
            <StepperField
              label="기본공제 받는 인원 (본인 포함)"
              value={family}
              onChange={(f) => {
                const k = clampChildren(children, f);
                const kc = clampCreditChildren(creditChildren, k);
                set({ f, k, kc, kw: clampTableChildren(tableChildren, k, kc) });
              }}
              min={1}
              max={MAX_FAMILY}
              unit="명"
              hint="본인에, 연 소득금액 100만원 이하(근로소득만 있으면 총급여 500만원 이하)인 배우자, 60세 이상 부모님(1966년 이전 출생), 20세 이하 자녀를 더해요. 맞벌이라면 한 사람만 올릴 수 있어요."
            />
            <StepperField
              label="그중 20세 이하 자녀 (2006년 이후 출생)"
              value={children}
              onChange={(k) => {
                const kk = clampChildren(k, family);
                const kc = clampCreditChildren(creditChildren, kk);
                set({ k: kk, kc, kw: clampTableChildren(tableChildren, kk, kc) });
              }}
              min={0}
              max={Math.max(family - 1, 0)}
              unit="명"
              hint={
                family === 1
                  ? "자녀를 넣으려면 먼저 기본공제 인원을 늘려 주세요."
                  : "2026년부터 자녀 1명당 신용카드 공제 한도가 50만원(총급여 7천만원 초과는 25만원) 늘어나요. 2명까지 반영해요."
              }
            />
            <StepperField
              label="그중 2006~2016년생 자녀"
              value={creditChildren}
              onChange={(kc) => {
                const c = clampCreditChildren(kc, children);
                set({ kc: c, kw: clampTableChildren(tableChildren, children, c) });
              }}
              min={0}
              max={children}
              unit="명"
              hint="2026년 귀속 자녀세액공제 대상이에요. 9세 이상이 기준이지만 2017년생은 아동수당을 받아 빠져요. 1명 25만원, 2명 55만원, 3명부터 1명당 40만원 더해요."
            />
            {children > creditChildren ? (
              <StepperField
                label="그중 2017·2018년생 자녀"
                value={tableChildren}
                onChange={(kw) => set({ kw: clampTableChildren(kw, children, creditChildren) })}
                min={0}
                max={children - creditChildren}
                unit="명"
                hint="매달 월급에서 세금을 뗄 때(간이세액표)는 8세 이상 자녀로 공제받았지만 2026년 귀속 자녀세액공제에서는 빠져요. 이미 낸 세금을 추정할 때만 써요."
              />
            ) : null}
          </InputGroup>

          <InputGroup title="추가 공제 (경로·장애인·출산·결혼)" summary={extraCount ? `${extraCount}개 선택` : "해당 없음"}>
            <StepperField
              label="70세 이상 가족 (1956년 이전 출생)"
              value={clampMembers(s.o, family)}
              onChange={(o) => set({ o: clampMembers(o, family) })}
              min={0}
              max={family}
              unit="명"
              hint="기본공제 인원 중 1명당 100만원을 더 빼 줘요."
            />
            <StepperField
              label="장애인 (본인 포함)"
              value={clampMembers(s.dp, family)}
              onChange={(dp) => set({ dp: clampMembers(dp, family) })}
              min={0}
              max={family}
              unit="명"
              hint="기본공제 인원 중 1명당 200만원을 더 빼 줘요. 중증질환자도 해당될 수 있어요."
            />
            <SelectField<ExtraPersonal>
              label="부녀자·한부모"
              value={extra}
              onChange={(x) => set({ x })}
              options={EXTRA_OPTIONS}
              hint="부녀자 공제는 근로소득금액 3천만원 이하 여성만 받을 수 있어요. 둘 다 해당하면 한부모 공제를 골라요."
            />
            <SelectField
              label="2026년에 태어나거나 입양한 자녀"
              value={String(birthOrder)}
              onChange={(b) => set({ b: Number(b) })}
              options={BIRTH_OPTIONS}
              hint="출산·입양 세액공제예요. 몇째 자녀인지에 따라 30만·50만·70만원이에요."
            />
            <CheckboxField
              label="2026년에 혼인신고를 했어요"
              checked={s.w}
              onChange={(w) => set({ w })}
              hint="결혼세액공제 50만원. 2024~2026년 혼인신고분, 1번만 받을 수 있고 부부가 각각 받아요."
            />
          </InputGroup>

          <InputGroup title="신용카드 등 사용액" summary={cardSum ? shortWon(cardSum) : "입력 없음"} defaultOpen>
            <WonField
              label="신용카드"
              value={s.cc}
              onChange={(cc) => set({ cc })}
              hint={
                overSeventy
                  ? "전통시장·대중교통에 쓴 금액은 빼고 넣어 주세요. 신용카드로 낸 도서·공연·체육시설 금액은 여기 포함해요. 공제율 15%."
                  : "전통시장·대중교통·도서·공연에 쓴 금액은 빼고 넣어 주세요. 공제율 15%."
              }
            />
            <WonField
              label="체크카드·현금영수증"
              value={s.cd}
              onChange={(cd) => set({ cd })}
              hint={
                overSeventy
                  ? "직불·선불카드, 제로페이 포함. 체크카드·현금으로 낸 도서·공연·체육시설 금액도 여기 넣어요. 공제율 30%."
                  : "직불·선불카드, 제로페이 포함. 공제율 30%."
              }
            />
            <WonField label="전통시장" value={s.cm} onChange={(cm) => set({ cm })} hint="결제 수단과 관계없이 40%." />
            <WonField label="대중교통" value={s.ct} onChange={(ct) => set({ ct })} hint="버스·지하철·기차 요금. 40%." />
            <WonField
              label="도서·신문·공연·영화·체육시설"
              value={s.cu}
              onChange={(cu) => set({ cu })}
              hint={
                overSeventy
                  ? "총급여 7천만원을 넘으면 따로 나누지 않아요. 이 칸 대신 결제 수단에 맞춰 신용카드나 체크카드·현금영수증 칸에 넣어 주세요. 이 칸에 넣은 금액은 신용카드(15%)로 계산해요."
                  : "박물관·미술관, 수영장·헬스장 이용료 포함. 결제 수단과 관계없이 30%(총급여 7천만원 이하만)."
              }
            />
          </InputGroup>

          <InputGroup title="연금저축·IRP·보험" summary={savingSum ? shortWon(savingSum) : "입력 없음"}>
            <WonField
              label="연금저축 납입액"
              value={s.ps}
              onChange={(ps) => set({ ps })}
              presets={[{ label: "600만원", value: 6_000_000 }]}
              hint="연 600만원까지 세액공제 대상이에요."
            />
            <WonField
              label="IRP(개인형 퇴직연금) 납입액"
              value={s.pi}
              onChange={(pi) => set({ pi })}
              presets={[{ label: "300만원", value: 3_000_000 }]}
              hint="연금저축과 합쳐 900만원까지. 총급여 5,500만원 이하면 15%, 넘으면 12%를 돌려받아요."
            />
            <WonField
              label="보장성 보험료"
              value={s.ip}
              onChange={(ip) => set({ ip })}
              hint="실손·종신·자동차보험 등. 연 100만원까지 12%."
            />
          </InputGroup>

          <InputGroup
            title="주택청약·월세"
            summary={`${HOME_SUMMARY[home]}${home !== "n" && sumAmounts(s.hs, s.rt) ? ` · ${shortWon(sumAmounts(s.hs, s.rt))}` : ""}`}
          >
            <SelectField<HomeStatus>
              label="2026년 말 주택 상황"
              value={home}
              onChange={(hh) => set({ hh })}
              options={HOME_OPTIONS}
              hint="세대원 모두 집이 없는 세대인지가 기본 요건이에요. 주택청약은 세대주와 그 배우자만, 월세는 세대주가 주택청약·주택자금 공제를 받지 않으면 세대원도 받을 수 있어요."
            />
            <WonField
              label="주택청약종합저축 납입액"
              value={s.hs}
              onChange={(hs) => set({ hs })}
              presets={[{ label: "300만원", value: 3_000_000 }]}
              hint="무주택 세대주(배우자 포함), 총급여 7천만원 이하만. 연 300만원까지 40%를 소득에서 빼요."
            />
            <WonField
              label="월세 지급액 (1년)"
              value={s.rt}
              onChange={(rt) => set({ rt })}
              hint="총급여 8천만원 이하, 전용 85㎡ 이하 또는 기준시가 4억원 이하 주택에 전입한 경우. 1,000만원까지 15%(총급여 5,500만원 이하 17%)."
            />
          </InputGroup>

          <InputGroup title="의료비·교육비·기부금" summary={careSum ? shortWon(careSum) : "입력 없음"}>
            <WonField
              label="의료비 (본인·65세 이상·장애인·6세 이하)"
              value={s.ms}
              onChange={(ms) => set({ ms })}
              hint="한도 없이 공제돼요. 산후조리원은 1회 200만원까지, 실손보험으로 돌려받은 금액은 빼고 넣어 주세요."
            />
            <WonField
              label="그 밖의 가족 의료비"
              value={s.mo}
              onChange={(mo) => set({ mo })}
              hint="총급여의 3%를 넘는 금액부터, 연 700만원까지 15%."
            />
            <WonField
              label="교육비"
              value={s.ed}
              onChange={(ed) => set({ ed })}
              hint="본인은 전액, 자녀는 1명당 연 300만원(대학생 900만원)까지만 넣어 주세요. 15%."
            />
            <WonField label="기부금 (종교단체 외)" value={s.dn} onChange={(dn) => set({ dn })} hint="1천만원까지 15%, 넘는 부분 30%." />
            <WonField
              label="종교단체 기부금"
              value={s.dr}
              onChange={(dr) => set({ dr })}
              hint="근로소득금액의 10%(종교단체 외 기부금이 있으면 최대 30%)까지 인정되고, 넘는 금액은 10년 동안 이월돼요."
            />
            <WonField
              label="고향사랑기부금"
              value={s.dh}
              onChange={(dh) => set({ dh })}
              presets={[
                { label: "10만원", value: 100_000 },
                { label: "20만원", value: 200_000 },
              ]}
              hint="10만원까지 전액(지방소득세 포함), 10만원 넘고 20만원까지 40%, 그 위 15%."
            />
          </InputGroup>

          <InputGroup
            title="4대보험료·이미 낸 세금"
            summary={`${insMode === "a" ? "보험료 자동" : "보험료 직접"} · ${prepaidMode === "a" ? "세금 추정" : "세금 직접"}`}
          >
            <SegmentedField<AmountMode>
              label="국민연금·건강·고용보험료"
              value={insMode}
              onChange={(im) => {
                if (im === insMode) return;
                // Start the manual boxes from the estimate so the result does not jump.
                if (im === "m" && out) set({ im, np: out.insuranceEstimate.pension, nh: out.insuranceEstimate.healthEmployment });
                else set({ im });
              }}
              options={[
                { value: "a", label: "급여로 계산" },
                { value: "m", label: "직접 입력" },
              ]}
              hint={
                insMode === "a" && out
                  ? `2026년 요율로 계산하면 국민연금 ${formatWon(out.insuranceEstimate.pension)}, 건강·장기요양·고용 ${formatWon(out.insuranceEstimate.healthEmployment)}이에요.`
                  : "급여명세서의 1~12월 근로자 부담분을 더해 넣어 주세요."
              }
            />
            {insMode === "m" ? (
              <>
                <WonField label="국민연금 (1년)" value={s.np} onChange={(np) => set({ np })} />
                <WonField label="건강·장기요양·고용보험료 (1년)" value={s.nh} onChange={(nh) => set({ nh })} />
              </>
            ) : null}
            <SegmentedField<AmountMode>
              label="이미 낸 소득세 (기납부세액)"
              value={prepaidMode}
              onChange={(wm) => {
                if (wm === prepaidMode) return;
                if (wm === "m" && out) set({ wm, wp: out.prepaidEstimate.incomeTax });
                else set({ wm });
              }}
              options={[
                { value: "a", label: "간이세액표로 추정" },
                { value: "m", label: "직접 입력" },
              ]}
              hint={
                prepaidMode === "a"
                  ? "매달 같은 급여를 받고 간이세액표대로(8세 이상 자녀 공제 포함) 뗐다고 보고 계산해요. 상여가 있었다면 직접 입력이 정확해요."
                  : "급여명세서의 소득세(지방소득세 제외)를 1~12월 더한 금액이에요. 남은 달은 같은 금액으로 채워 주세요."
              }
            />
            {prepaidMode === "a" ? (
              <SelectField
                label="원천징수 비율"
                value={String(ratio)}
                onChange={(v) => set({ wr: Number(v) })}
                options={RATIO_OPTIONS}
              />
            ) : (
              <WonField label="이미 낸 소득세 (1년)" value={s.wp} onChange={(wp) => set({ wp })} />
            )}
          </InputGroup>
        </>
      }
      result={out ? <YearEndStatement out={out} season={season} prepaidMode={prepaidMode} ratio={ratio} birthOrder={birthOrder} /> : <CalcNotice>총급여를 0보다 큰 금액으로 넣으면 환급액이나 추가 납부액을 바로 계산해 드려요.</CalcNotice>}
    />
  );
}

function YearEndStatement({
  out,
  season,
  prepaidMode,
  ratio,
  birthOrder,
}: {
  out: NonNullable<ReturnType<typeof yearEndFromForm>>;
  season: ReturnType<typeof settlementSeason>;
  prepaidMode: AmountMode;
  ratio: number;
  birthOrder: number;
}) {
  const { input, result: r, tableChildren, cultureAsCredit } = out;
  const c = r.chosen;
  const cr = c.credits;
  const refund = r.settleTotal < 0;
  const due = r.settleTotal > 0;
  const determinedTotal = c.determinedTax + r.determinedLocalTax;
  const prepaidTotal = r.prepaidIncomeTax + r.prepaidLocalTax;
  const extraPersonal = r.personal.senior + r.personal.disabled + r.personal.extra;
  const creditsApplied = c.creditsTotal - c.creditsUnused;
  const g = r.totalPay;

  const notes: string[] = [];
  if (c.standard) {
    notes.push(
      `표준세액공제 ${formatNumber(STANDARD_CREDIT / 10_000)}만원을 받는 쪽이 유리해서 그렇게 계산했어요. 이때는 건강·고용보험료 소득공제와 보험료·의료비·교육비·기부금·월세 세액공제를 함께 받을 수 없어요(항목별로 받으면 결정세액 ${formatWon(r.alternative.determinedTax)}).`,
    );
  }
  const rent = input.rent ?? 0;
  if (rent > 0 && !r.rentEligible)
    notes.push("월세 세액공제는 무주택 세대의 세대주(세대주가 주택 관련 공제를 받지 않으면 세대원)만 받을 수 있어 넣지 않았어요.");
  else if (rent > 0 && g > 80_000_000) notes.push("총급여가 8천만원을 넘어 월세 세액공제 대상이 아니에요.");
  else if (rent > 0 && input.homelessMember && cr.rent > 0)
    notes.push("세대원의 월세 세액공제는 세대주가 주택청약·주택자금 공제를 받지 않을 때만 받을 수 있어요.");
  if ((input.housingSubscription ?? 0) > 0 && (!input.homelessHead || g > 70_000_000))
    notes.push("주택청약 공제는 총급여 7천만원 이하 무주택 세대주(배우자 포함)만 받을 수 있어 넣지 않았어요.");
  if (cultureAsCredit)
    notes.push(
      "총급여가 7천만원을 넘어 도서·공연·체육시설 사용액은 신용카드(15%)로 계산했어요. 체크카드·현금영수증으로 냈다면 그 칸에 넣어야 30%가 적용돼요.",
    );
  if (tableChildren > 0)
    notes.push(
      `2017·2018년생 자녀 ${tableChildren}명은 매달 원천징수 때 자녀 공제를 받았지만 2026년 귀속 자녀세액공제에서는 빠져서, 그만큼 환급이 줄거나 추가 납부가 생겨요.`,
    );
  if (r.donation.eligible < (input.donation ?? 0) + (input.religiousDonation ?? 0))
    notes.push(`기부금 중 ${formatWon((input.donation ?? 0) + (input.religiousDonation ?? 0) - r.donation.eligible)}은 한도를 넘어 다음 해로 이월돼요.`);
  if (c.creditsUnused > 0) notes.push("세액공제가 산출세액보다 많아 남는 부분은 돌려받지 못해요.");
  notes.push(SEASON_NOTE[season]);
  notes.push("간이 예상이라 실제 금액과 다를 수 있어요. 홈택스 연말정산 미리보기와 간소화 자료로 꼭 확인하세요.");

  return (
    <Statement title="연말정산 예상 명세" caption="2026년 귀속 · 2027년 1~2월 정산">
      <StatementHero
        label={refund ? "예상 환급액" : due ? "예상 추가 납부액" : "환급·추가 납부 없음"}
        value={formatWon(Math.abs(r.settleTotal))}
        sub={`결정세액 ${formatWon(determinedTotal)} · 이미 낸 세금 ${formatWon(prepaidTotal)} (지방소득세 포함)`}
        stamp={refund ? "환급" : due ? "납부" : undefined}
      />
      <StatementSection title="근로소득금액">
        <StatementRow label="총급여" value={formatWon(g)} />
        <StatementRow label="근로소득공제" note="총급여 구간별, 2,000만원 한도" value={formatWon(r.earnedDeduction)} />
        <StatementRow label="근로소득금액" value={formatWon(r.earnedIncome)} emphasis />
      </StatementSection>
      <StatementSection title="소득공제">
        <StatementRow label="기본공제" note={`${input.family}명 × 150만원`} value={formatWon(r.personal.basic)} />
        {extraPersonal > 0 ? (
          <StatementRow label="추가공제" note="경로우대·장애인·부녀자·한부모" value={formatWon(extraPersonal)} />
        ) : null}
        <StatementRow label="국민연금보험료" value={formatWon(r.pensionDeduction)} />
        <StatementRow
          label="건강·고용보험료"
          note={c.standard ? "표준세액공제를 골라 제외" : "장기요양 포함"}
          value={formatWon(c.insuranceDeduction)}
        />
        {r.card.spending > 0 ? (
          <StatementRow
            label="신용카드 등"
            note={
              r.card.total > 0
                ? `${formatWon(r.card.threshold)}(총급여 25%) 넘게 쓴 부분 · 한도 ${shortWon(r.card.baseLimit)}${r.card.extra ? ` + 추가 ${shortWon(r.card.extra)}` : ""}`
                : `총급여의 25%(${formatWon(r.card.threshold)})를 넘게 써야 공제돼요`
            }
            value={formatWon(r.card.total)}
          />
        ) : null}
        {r.housing > 0 ? <StatementRow label="주택청약" note="납입액 × 40%" value={formatWon(r.housing)} /> : null}
        <StatementRow label="소득공제 합계" value={formatWon(c.incomeDeductions)} emphasis />
      </StatementSection>
      <StatementSection title="산출세액">
        <StatementRow label="과세표준" note="근로소득금액 − 소득공제" value={formatWon(c.taxBase)} />
        <StatementRow label="산출세액" note={`기본세율 ${c.marginalRate}% 구간`} value={formatWon(c.calculatedTax)} emphasis />
      </StatementSection>
      <StatementSection title="세액공제">
        <StatementRow label="근로소득세액공제" note={`한도 ${formatWon(c.earned.limit)}`} value={formatWon(cr.earned)} />
        {cr.child ? <StatementRow label="자녀세액공제" note={`${input.creditChildren}명`} value={formatWon(cr.child)} /> : null}
        {cr.birth ? <StatementRow label="출산·입양" note={BIRTH_LABEL[birthOrder]} value={formatWon(cr.birth)} /> : null}
        {cr.marriage ? <StatementRow label="결혼세액공제" note="2026년 혼인신고" value={formatWon(cr.marriage)} /> : null}
        {cr.pension ? (
          <StatementRow
            label="연금계좌"
            note={`${formatWon(r.pensionAccount.eligible)} × ${r.pensionAccount.rate}%`}
            value={formatWon(cr.pension)}
          />
        ) : null}
        {cr.insurance ? <StatementRow label="보장성 보험료" note="100만원 한도 × 12%" value={formatWon(cr.insurance)} /> : null}
        {cr.medical ? (
          <StatementRow label="의료비" note={`총급여 3%(${formatWon(r.medical.threshold)}) 넘는 부분 × 15%`} value={formatWon(cr.medical)} />
        ) : null}
        {cr.education ? <StatementRow label="교육비" note="15%" value={formatWon(cr.education)} /> : null}
        {cr.donation ? <StatementRow label="기부금" note={`인정액 ${formatWon(r.donation.eligible)}`} value={formatWon(cr.donation)} /> : null}
        {cr.hometown ? <StatementRow label="고향사랑기부금" value={formatWon(cr.hometown)} /> : null}
        {cr.rent ? <StatementRow label="월세" note={`${r.rentRate}%`} value={formatWon(cr.rent)} /> : null}
        {cr.standard ? <StatementRow label="표준세액공제" note="특별공제 대신" value={formatWon(cr.standard)} /> : null}
        {c.creditsUnused > 0 ? (
          <StatementRow label="산출세액을 넘는 공제" note="적용되지 않아요" value={`−${formatWon(c.creditsUnused)}`} />
        ) : null}
        <StatementRow label="세액공제 합계" value={formatWon(creditsApplied)} emphasis />
      </StatementSection>
      <StatementSection title="정산">
        <StatementRow label="결정세액" note="산출세액 − 세액공제" value={formatWon(c.determinedTax)} />
        <StatementRow label="지방소득세" note="결정세액의 10%" value={formatWon(r.determinedLocalTax)} />
        <StatementRow
          label="이미 낸 소득세"
          note={prepaidMode === "a" ? `간이세액표 ${ratio}% 추정` : "직접 입력"}
          value={formatWon(r.prepaidIncomeTax)}
        />
        <StatementRow label="이미 낸 지방소득세" note={prepaidMode === "a" ? "추정" : "소득세의 10%"} value={formatWon(r.prepaidLocalTax)} />
      </StatementSection>
      <StatementTotal
        label={refund ? "돌려받을 세금" : due ? "더 낼 세금" : "정산할 세금"}
        value={formatWon(Math.abs(r.settleTotal))}
      />
      <StatementFootnote>{notes.join(" ")}</StatementFootnote>
    </Statement>
  );
}
