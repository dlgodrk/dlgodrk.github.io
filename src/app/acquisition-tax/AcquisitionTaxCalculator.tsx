"use client";

import { CalcLayout, CalcNotice } from "@/components/CalcLayout";
import { CheckboxField, NumberField, SegmentedField } from "@/components/fields";
import {
  Statement,
  StatementFootnote,
  StatementHero,
  StatementRow,
  StatementSection,
  StatementTotal,
} from "@/components/Statement";
import { formatPercent, formatWon, koreanWon, manwonLabel } from "@/lib/format";
import {
  computeAcquisitionTax,
  FIRST_HOME_LIMIT,
  FIRST_HOME_LIMIT_SMALL,
  MAN,
  rateLabel,
  totalFor,
  type Buyer,
} from "@/lib/calc/acquisition-tax";
import { useUrlState } from "@/lib/useUrlState";

type BuyerCode = "p" | "c";
type HouseCode = "1" | "2" | "3" | "4";
type AreaCode = "n" | "r";
type SizeCode = "s" | "l";
type LimitCode = "2" | "3";

const BUYERS: Record<BuyerCode, Buyer> = { p: "person", c: "corp" };

const PRICE_PRESETS = [30_000, 50_000, 60_000, 80_000, 90_000, 120_000, 150_000];

export function AcquisitionTaxCalculator({ initialPrice = 50_000 }: { initialPrice?: number }) {
  // URL keys: p = 취득가액 (만원), b = 취득자, h = 취득 후 주택 수, r = 조정대상지역,
  // t = 일시적 2주택, a = 85㎡ 초과, f = 생애최초 감면, l = 감면 한도 (200/300만원)
  const [s, set] = useUrlState({
    p: initialPrice,
    b: "p" as BuyerCode,
    h: 1,
    r: false,
    t: false,
    a: false,
    f: false,
    l: "2" as LimitCode,
  });

  const buyerCode: BuyerCode = s.b === "c" ? "c" : "p";
  const isCorp = buyerCode === "c";
  const houses = Number.isFinite(s.h) ? Math.min(4, Math.max(1, Math.floor(s.h))) : 1;
  const limit = s.l === "3" ? FIRST_HOME_LIMIT_SMALL : FIRST_HOME_LIMIT;
  const showTemporary = !isCorp && houses === 2 && s.r;
  // 생애최초는 본인·배우자 기준이라 세대 주택 수와 관계없이 개인이면 고를 수 있다.
  const showFirstHome = !isCorp;

  const price = s.p * MAN;
  const input = {
    price,
    houses,
    regulated: s.r,
    over85: s.a,
    buyer: BUYERS[buyerCode],
    temporary2: showTemporary && s.t,
    firstHome: showFirstHome && s.f,
    firstHomeLimit: limit,
  };
  const r = computeAcquisitionTax(input);

  const heavy = r !== null && r.rateCase !== "standard";
  const oneHouseTotal = heavy ? totalFor(r.price, { houses: 1, regulated: s.r, over85: s.a }) : 0;
  const beforeReduction = r ? r.acqBase + r.eduBase + r.ruralBase : 0;
  // 생애최초가 아니었다면 낼 금액 (세대 다주택이면 중과 포함)
  const withoutFirstHome = r?.firstHome.eligible ? totalFor(r.price, { ...input, firstHome: false }) : 0;

  let reductionNote: string | undefined;
  if (r?.firstHome.requested && !r.firstHome.eligible) reductionNote = r.firstHome.reason;
  else if (r?.firstHome.eligible) reductionNote = `생애최초 · 한도 ${koreanWon(limit)}`;

  return (
    <CalcLayout
      inputs={
        <>
          <NumberField
            label="취득가액 (매매가)"
            value={s.p}
            onChange={(p) => set({ p })}
            unit="만원"
            max={10_000_000}
            reading={(n) => manwonLabel(n)}
            presets={PRICE_PRESETS.map((n) => ({ label: manwonLabel(n).replace(/원$/, ""), value: n }))}
            hint="매매계약서에 적힌 실제 거래가격을 넣으세요."
          />
          <SegmentedField<BuyerCode>
            label="사는 사람"
            value={buyerCode}
            onChange={(b) => set({ b })}
            options={[
              { value: "p", label: "개인" },
              { value: "c", label: "법인" },
            ]}
            hint={isCorp ? "법인이 주택을 사면 주택 수와 지역에 관계없이 12%예요." : undefined}
          />
          {!isCorp ? (
            <>
              <SegmentedField<HouseCode>
                label="이 집을 사면 세대 주택 수"
                value={String(houses) as HouseCode}
                onChange={(h) => set({ h: Number(h) })}
                options={[
                  { value: "1", label: "1주택" },
                  { value: "2", label: "2주택" },
                  { value: "3", label: "3주택" },
                  { value: "4", label: "4주택 이상" },
                ]}
                hint="이번에 사는 집을 포함해 세대 전체가 가진 주택 수예요. 분양권·입주권과 주택분 재산세를 내는 오피스텔도 세요. 미혼 30세 미만 자녀는 따로 살아도 보통 부모와 같은 세대예요."
              />
              <SegmentedField<AreaCode>
                label="이번에 사는 집의 지역"
                value={s.r ? "r" : "n"}
                onChange={(v) => set({ r: v === "r" })}
                options={[
                  { value: "n", label: "비조정대상지역" },
                  { value: "r", label: "조정대상지역" },
                ]}
                hint={
                  houses === 1
                    ? "1주택이면 지역과 관계없이 세율이 같아요. 조정대상지역은 2026년 10월 현재 서울 전역과 경기 15곳이에요."
                    : "2026년 10월 현재 서울 전역, 경기 과천·광명·구리·의왕·하남, 성남 분당·수정·중원, 수원 영통·장안·팔달, 안양 동안, 용인 수지·기흥, 화성 동탄이에요."
                }
              />
              {showTemporary ? (
                <CheckboxField
                  label="일시적 2주택이에요"
                  checked={s.t}
                  onChange={(t) => set({ t })}
                  hint="이사 등으로 새집을 먼저 사고 기존 집을 기한(현행 3년) 안에 팔 예정이면 1주택 세율을 적용해요. 못 팔면 중과세율로 추징돼요. 두 집이 모두 조정대상지역이면 2026년 10월 이후 취득분부터 2년으로 줄이는 개편안이 추진 중이에요."
                />
              ) : null}
            </>
          ) : null}
          <SegmentedField<SizeCode>
            label="전용면적"
            value={s.a ? "l" : "s"}
            onChange={(v) => set({ a: v === "l" })}
            options={[
              { value: "s", label: "85㎡ 이하" },
              { value: "l", label: "85㎡ 초과" },
            ]}
            hint="전용 84㎡(흔히 34평형)까지는 85㎡ 이하예요. 85㎡ 이하는 농어촌특별세가 없어요."
          />
          {showFirstHome ? (
            <>
              <CheckboxField
                label="본인·배우자가 집을 가진 적이 없어요 (생애최초 감면)"
                checked={s.f}
                onChange={(f) => set({ f })}
                hint={
                  houses > 1
                    ? "부모 등 같은 세대 가족에게 집이 있어도 본인과 배우자가 집을 가진 적이 없으면 받을 수 있고, 이때는 중과 없이 1~3%를 적용해요. 12억원 이하 집을 본인이 살려고 사야 하고, 3년 안에 팔거나 임대하면 추징돼요."
                    : "본인과 배우자 모두 집을 가져 본 적이 없고, 12억원 이하 집을 본인이 살려고 살 때 받을 수 있어요. 3년 안에 팔거나 임대하면 추징돼요."
                }
              />
              {s.f ? (
                <SegmentedField<LimitCode>
                  label="감면 한도"
                  value={s.l === "3" ? "3" : "2"}
                  onChange={(l) => set({ l })}
                  options={[
                    { value: "2", label: "200만원 (일반)" },
                    { value: "3", label: "300만원 (소형·인구감소지역)" },
                  ]}
                  hint="300만원은 전용 60㎡ 이하·3억원(수도권 6억원) 이하인 연립·다세대·도시형생활주택 등과 인구감소지역 주택이에요. 그 밖의 아파트는 200만원이에요."
                />
              ) : null}
            </>
          ) : null}
        </>
      }
      result={
        r ? (
          <Statement title="취득세 명세" caption={`${r.reason} · 전용 85㎡ ${s.a ? "초과" : "이하"}`}>
            <StatementHero
              label="총 납부세액"
              value={formatWon(r.total)}
              sub={`${koreanWon(r.total)} · 취득가액의 ${formatPercent(r.effectiveRate, 2)}`}
              stamp="취득세"
            />

            <StatementSection title="세율">
              <StatementRow label="적용 세율" value={rateLabel(r.rateUnits)} note={r.reason} emphasis />
              <StatementRow
                label="지방교육세율"
                value={rateLabel(r.eduUnits)}
                note={r.rateCase === "standard" ? "취득세율의 10%" : "중과 시 0.4%"}
              />
              <StatementRow
                label="농어촌특별세율"
                value={s.a ? rateLabel(r.ruralUnits) : "비과세"}
                note={s.a ? "전용 85㎡ 초과" : "전용 85㎡ 이하"}
              />
            </StatementSection>

            <StatementSection title="세액">
              <StatementRow label="취득세" value={formatWon(r.acqBase)} note={`${koreanWon(r.price)} × ${rateLabel(r.rateUnits)}`} />
              <StatementRow
                label="감면액"
                value={r.reduction > 0 ? `−${formatWon(r.reduction)}` : "없음"}
                note={reductionNote}
              />
              <StatementRow
                label="지방교육세"
                value={formatWon(r.edu)}
                note={r.reduction > 0 ? `감면 비율만큼 줄어요 (감면 전 ${formatWon(r.eduBase)})` : undefined}
              />
              <StatementRow
                label="농어촌특별세"
                value={formatWon(r.rural)}
                note={
                  r.ruralOnReduction > 0
                    ? `감면액의 20% ${formatWon(r.ruralOnReduction)} 포함`
                    : s.a
                      ? undefined
                      : "85㎡ 이하 비과세"
                }
              />
            </StatementSection>
            <StatementTotal label="합계" value={formatWon(r.total)} />

            <StatementSection title="참고">
              <StatementRow label="실효세율" value={formatPercent(r.effectiveRate, 2)} note="합계 ÷ 취득가액" />
              {heavy ? (
                <StatementRow
                  label={isCorp ? "개인 1주택이었다면" : "1주택이었다면"}
                  value={formatWon(oneHouseTotal)}
                  note={
                    isCorp
                      ? `법인은 주택 수와 관계없이 12%라 ${formatWon(r.total - oneHouseTotal)} 더 내요`
                      : `중과로 ${formatWon(r.total - oneHouseTotal)} 더 내요`
                  }
                />
              ) : null}
              {r.reduction > 0 ? (
                <StatementRow
                  label="감면 전 합계"
                  value={formatWon(beforeReduction)}
                  note={`감면으로 ${formatWon(beforeReduction - r.total)} 줄었어요`}
                />
              ) : null}
              {withoutFirstHome > beforeReduction ? (
                <StatementRow
                  label="생애최초가 아니었다면"
                  value={formatWon(withoutFirstHome)}
                  note={`중과세율 기준, ${formatWon(withoutFirstHome - r.total)} 아꼈어요`}
                />
              ) : null}
            </StatementSection>

            <StatementFootnote>
              취득일(잔금일과 등기일 중 빠른 날)부터 60일 안에 신고·납부해요. 일시적 2주택 기한, 증여·상속, 분양권·입주권,
              저가주택 중과 제외 같은 예외는 위택스나 관할 시·군·구청에서 확인하세요.
              {r.ruralOnReduction > 0
                ? " 85㎡ 초과 주택의 감면분 농어촌특별세는 넉넉하게 잡은 추정이라 실제로는 조금 적을 수 있어요."
                : ""}
            </StatementFootnote>
          </Statement>
        ) : (
          <CalcNotice>취득가액을 넣으면 취득세와 지방교육세, 농어촌특별세를 바로 계산해 드려요.</CalcNotice>
        )
      }
    />
  );
}
