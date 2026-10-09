/**
 * Text for the programmatic /pyeong/<m2>/ pages. Pure data builders (no React): the page renders
 * the segments, turning link segments into next/link.
 *
 * Every page gets text that depends on its own area: the size band (layout tendencies, labelled as
 * 일반적 경향), estimated 공급/계약면적, which side of the 60㎡ / 85㎡ / 102㎡ / 135㎡ rule lines it sits on,
 * the nearest whole 평, and comparisons with the neighbouring pages. Prose is 합니다체.
 *
 * Rule sources (2026-10-09 확인):
 * - 국민주택규모: 주택법 제2조 제6호 (85㎡, 수도권 밖 도시지역이 아닌 읍·면 100㎡)
 * - 농어촌특별세 비과세(서민주택): 농어촌특별세법 제4조 제9호·제11호, 과세 시 0.2% (제5조) — see src/lib/calc/acquisition-tax.ts
 * - 생애최초 감면 300만원 한도(60㎡ 이하 연립·다세대 등): 지방세특례제한법 제36조의3 — see acquisition-tax.ts
 * - 민영주택 가점제 비율: 주택공급에 관한 규칙 제28조 제2항·제4항 (시행 2026. 6. 15.)
 * - 청약 예치기준금액: 같은 규칙 별표 2
 * - 소형·저가주택 무주택 간주: 같은 규칙 제53조 (2024. 12. 개정 기준) — see src/app/subscription-score/page.tsx
 * - 주거용 오피스텔 중개보수 매매 0.5%·임대차 0.4%: 공인중개사법 시행규칙 제20조 제4항, 별표 2
 * - 국민주택 공급 부가가치세 면제: 조세특례제한법 제106조 제1항 제4호
 * - 오피스텔 취득세 4.6% (취득세 4% + 농어촌특별세 0.2% + 지방교육세 0.4%): 지방세법 제11조 제1항 제7호 나목
 */
import { formatNumber } from "@/lib/format";
import {
  APARTMENT_RATIOS,
  NATIONAL_HOUSING_M2,
  NATIONAL_HOUSING_M2_RURAL,
  OFFICETEL_RATIOS,
  PYEONG_PAGE_M2,
  SMALL_HOUSING_M2,
  SUBSCRIPTION_DEPOSIT_TIERS,
  TYPICAL_EXCLUSIVE_RATIO,
  TYPICAL_OFFICETEL_RATIO,
  areaBand,
  depositTier,
  estimateSupplyPyeong,
  m2ToPyeong,
  privatePointShare,
  pyeongToM2,
  round2,
  typicalLayout,
  type AreaBand,
} from "./pyeong";

/** A text run: plain text, a bold label, or an internal link (href is a site path). */
export type Seg = string | { strong: string } | { text: string; href: string };
export type Para = Seg[];

export const PYEONG_RULES_CHECKED = "2026년 10월 9일";
export const PYEONG_BASIS = `1평 = 400/121㎡ (약 3.3058㎡) 기준 · 청약·세금 기준은 ${PYEONG_RULES_CHECKED} 확인`;

const LINK_ACQ = { text: "취득세 계산기", href: "/acquisition-tax/" };
const LINK_SUB = { text: "청약 가점 계산기", href: "/subscription-score/" };
const LINK_FEE = { text: "중개보수(복비) 계산기", href: "/brokerage-fee/" };
const LINK_MAIN = { text: "평수 계산기", href: "/pyeong/" };
const NATIONAL_PAGE_M2 = 84;

/** 2-decimal display without float drift (46㎡ → "13.92"). */
export function f2(n: number): string {
  return formatNumber(round2(n), 2);
}
const f1 = (n: number) => formatNumber(n, 1);
const man = (n: number) => `${formatNumber(n)}만원`;

/**
 * Hand-written text for each area (합니다체), so no page is the band template with numbers swapped.
 * Only verified facts, arithmetic on the area, or generic tendencies worded as such.
 * 46·55㎡ 신혼희망타운: 한국경제 2021-11-10 · 비즈한국 보도 (46·55㎡ 위주 공급, 사전청약 55㎡ 물량이 59㎡보다
 * 훨씬 많음, 55㎡ 방 3개·욕실 2개 사례), 2022년 '60㎡ 이하 공급' 지침 삭제 (MTN 2022-02-28).
 * Tested: every page in PYEONG_PAGE_M2 has a note.
 */
export const AREA_NOTES: Record<number, string> = {
  20: "전용 20㎡는 6평 남짓으로, 침실과 거실, 주방이 한 공간에 모인 원룸 크기입니다. 오피스텔이라면 계약면적 기준 10~12평으로 광고될 수 있어, ‘12평 오피스텔’이 실제로는 이 정도 전용면적일 수 있습니다. 건축물대장에는 전용면적이 따로 적히므로 광고 숫자 대신 이 값으로 비교하는 것이 정확합니다.",
  30: "전용 30㎡는 9평 남짓으로, 원룸보다 조금 넓어 잠자는 공간을 미닫이문이나 가벽으로 나눈 1.5룸 구조도 나오는 크기입니다. 오피스텔 계약면적으로는 15~18평 정도로 표기될 수 있어, 광고의 ‘15평’과 생활 속 ‘9평’이 사실상 같은 집일 수도 있습니다. 이 사이트는 전용 30㎡까지를 원룸·오피스텔 기준으로 안내합니다.",
  33: "‘10평 원룸’이라고 하면 보통 이 정도 전용면적을 가리킵니다. 다만 오피스텔 광고의 ‘10평’은 계약면적일 수 있어, 그때 실제 전용면적은 17~20㎡ 정도로 훨씬 작습니다. 전용 33㎡ 주택은 방 하나에 거실 겸 주방을 따로 둔 1.5룸이나 작은 투룸으로 꾸미는 경우가 많습니다.",
  39: "전용 39㎡는 신축 아파트 단지의 소형 주택형이나 공공임대주택에서 자주 볼 수 있는 크기입니다. 원룸보다 넓지만 59㎡보다는 방이 적어, 방 1~2개에 거실 겸 주방을 둔 구성이 일반적입니다. 아파트 공급면적으로는 15~17평형, 오피스텔 계약면적으로는 20~24평이라 같은 39㎡라도 광고 숫자가 크게 다를 수 있습니다.",
  46: "전용 46㎡와 55㎡는 신혼부부용 공공분양인 신혼희망타운에서 많이 공급된 주택형입니다. 실수요자 사이에서는 46㎡(약 14평)가 부부 둘이 살기에도 빠듯하다는 평가가 나오기도 했고, 이후 신혼희망타운을 전용 60㎡ 이하로만 짓도록 한 기준이 없어져 더 넓은 주택형도 공급할 수 있게 됐습니다.",
  49: "전용 49㎡는 59㎡보다 한 단계 작은 소형 아파트 주택형으로, 흔히 20평형 안팎으로 부릅니다. 59㎡와의 차이는 10㎡(약 3평)라서, 같은 단지라면 방이나 욕실이 하나 적은 구성이 많습니다. 1~2인 가구가 주로 찾고, 전용 60㎡ 이하라서 규제지역 청약에서는 추첨 비율이 60%인 구간에 듭니다.",
  55: "전용 55㎡는 신혼희망타운에서 가장 많이 공급된 주택형 가운데 하나로, 사전청약 때는 55㎡ 물량이 59㎡보다 훨씬 많았습니다. 같은 55㎡라도 방 3개·욕실 2개로 설계된 단지가 있어, 59㎡보다 4㎡(약 1.2평) 작지만 구성은 비슷할 수 있습니다. 평형 숫자보다 평면도를 함께 비교하는 것이 좋습니다.",
  59: "전용 59㎡는 소형 아파트의 대표 주택형으로, 흔히 24~25평형이라고 부릅니다. 신축 단지에서는 방 3개·욕실 2개 구성이 흔하고, 전용 60㎡ 이하라서 규제지역 청약에서는 추첨 비율이 60%인 구간에 들어갑니다. 84㎡보다 25㎡(약 7.6평) 작아 같은 단지 안에서는 분양가와 취득세 부담이 낮은 편입니다.",
  66: "아파트 전용 66㎡는 59㎡와 74㎡ 사이에 있는 주택형으로, 3인 가구가 많이 찾는 크기입니다. 전용 60㎡를 넘기 때문에 규제지역 민영주택 청약에서는 가점제 비율이 40%에서 70%로 높아지는 구간에 들어갑니다. 평 단위로 지은 주택의 ‘20평’이 서류에는 66.12㎡로 적히듯, 66㎡ 안팎 숫자는 평 단위 면적을 옮겨 적은 경우가 있습니다.",
  74: "전용 74㎡는 59㎡와 84㎡ 사이를 메우는 주택형이라 흔히 ‘틈새 평형’이라고 부릅니다. 84㎡보다 10㎡(약 3평) 작지만 방 3개·욕실 2개 평면도 흔해, 분양가 부담을 줄이려는 3~4인 가구가 84㎡와 함께 비교하곤 합니다. 국민주택규모 안이라 취득세와 분양가 부가가치세 조건은 84㎡와 같습니다.",
  84: "전용 84㎡는 국민주택규모 상한(85㎡)을 넘지 않는 범위에서 가장 넓게 설계한 주택형이라 ‘국민평형’이라고 부릅니다. 85㎡ 이하로 두면 집을 살 때 농어촌특별세가 붙지 않고 분양가에 부가가치세도 붙지 않아, 많은 단지가 이 면적을 기준 주택형으로 씁니다. 공급면적으로는 흔히 33~34평형이라고 부르며 3~4인 가구가 많이 찾습니다.",
  85: "국민주택규모 기준은 ‘85㎡ 이하’라서 전용 85.00㎡까지 포함되고, 이를 조금이라도 넘으면 국민주택규모 초과 주택이 됩니다. 실제 분양 주택형이 84㎡대에 몰려 있는 것도 이 경계 때문입니다. 85㎡ 이하 여부는 취득세의 농어촌특별세, 분양가 부가가치세, 민영주택 청약의 가점제 비율과 예치금 구간을 한꺼번에 가르므로 계약 전에 전용면적을 소수점까지 확인하는 것이 좋습니다.",
  90: "전용 90㎡는 국민주택규모를 5㎡ 넘는 크기라, 같은 단지의 84㎡와 비교하면 집을 살 때 농어촌특별세가 붙고 새 아파트 분양가에 부가가치세가 들어간다는 점이 다릅니다. 84㎡와의 면적 차이는 6㎡(약 1.8평)뿐이지만 세금 기준선은 넘는다는 점을 함께 따져 보는 것이 좋습니다.",
  101: "전용 101㎡는 85㎡를 넘는 중대형 가운데 작은 편으로, 흔히 40평형 안팎으로 부릅니다. 102㎡ 이하라서 민영주택 청약 예치금은 85㎡ 초과 주택형 가운데 가장 낮은 구간에 들어가는데, 주택형이 102㎡를 넘으면 서울·부산 기준 필요 금액이 600만원에서 1,000만원으로 뛰니 비슷한 면적끼리도 확인이 필요합니다. 84㎡보다 17㎡(약 5평) 넓어 방 4개, 또는 방 3개에 드레스룸을 둔 평면이 흔합니다.",
  114: "전용 114㎡는 흔히 40평대 중반 평형으로 부르는 중대형 주택형입니다. 102㎡를 넘기 때문에 청약 예치금은 135㎡ 이하 구간 금액을 넣어야 하고, 84㎡보다 30㎡(약 9평) 넓어 방 4개 구성이 흔합니다. 자녀가 둘 이상이거나 부모와 함께 사는 가구가 주로 찾는 크기입니다.",
  135: "민영주택 청약 예치금은 135㎡ 이하까지가 한 구간이고 이를 넘으면 ‘모든 면적’ 금액을 넣어야 해서, 135㎡는 중대형과 대형을 나누는 기준으로 자주 쓰입니다. 전용 135㎡는 공급면적 기준 50평형대로, 84㎡보다 51㎡(약 15평) 넓습니다. 이 크기부터는 방 4개에 욕실 2개 이상, 별도 드레스룸이나 서재를 둔 평면이 많습니다.",
  165: "아파트 전용면적이 165㎡라면 공급면적 기준 60평형대 이상의 대형이고, 단독주택이나 상가·사무실에서 ‘50평’이라고 하면 보통 이 정도 면적을 말합니다. 상가·사무실은 공용면적 비율이 건물마다 크게 달라, 임대료를 비교할 때는 전용면적 기준 평당 금액으로 따지는 것이 정확합니다.",
  200: "200㎡ 안팎의 면적은 아파트보다 단독주택의 대지·연면적이나 상가, 토지 면적을 말할 때 더 자주 나옵니다. 토지에는 전용률이 없으므로 ㎡ × 0.3025로 바로 평을 구하면 됩니다. 단독주택 대지라면 건폐율과 용적률에 따라 지을 수 있는 건물 면적이 정해지므로, 대지 평수만으로 집 크기를 판단하기는 어렵습니다.",
};

export type EstimateRow = {
  kind: "아파트" | "오피스텔";
  basis: "공급면적" | "계약면적";
  ratio: number;
  areaM2: number;
  pyeong: number;
  typical: boolean;
};

/** 전용률별 공급(계약)면적 추정. studio: 오피스텔 50/55/60%; small: 오피스텔 55% + 아파트 70/75/80%; others: 아파트. */
export function estimateRows(m2: number): EstimateRow[] {
  const band = areaBand(m2);
  const offi: readonly number[] = band === "studio" ? OFFICETEL_RATIOS : band === "small" ? [TYPICAL_OFFICETEL_RATIO] : [];
  const apt: readonly number[] = band === "studio" ? [] : APARTMENT_RATIOS;
  const rows: EstimateRow[] = [];
  for (const ratio of offi) {
    rows.push({
      kind: "오피스텔",
      basis: "계약면적",
      ratio,
      areaM2: m2 / ratio,
      pyeong: m2ToPyeong(m2 / ratio),
      typical: band === "studio" && ratio === TYPICAL_OFFICETEL_RATIO,
    });
  }
  for (const ratio of apt) {
    rows.push({
      kind: "아파트",
      basis: "공급면적",
      ratio,
      areaM2: m2 / ratio,
      pyeong: m2ToPyeong(m2 / ratio),
      typical: ratio === TYPICAL_EXCLUSIVE_RATIO,
    });
  }
  return rows;
}

/** Whole 평 within 0.1평 of the area (33㎡ → 10), else null. */
export function nearWholePyeong(m2: number): number | null {
  const py = m2ToPyeong(m2);
  const n = Math.round(py);
  return n > 0 && Math.abs(py - n) <= 0.1 ? n : null;
}

/** 평형 range for apartment 전용률 80%→70% and officetel 60%→50%. */
function aptRange(m2: number): [number, number] {
  return [Math.round(m2ToPyeong(m2 / 0.8)), Math.round(m2ToPyeong(m2 / 0.7))];
}
function offiRange(m2: number): [number, number] {
  return [Math.round(m2ToPyeong(m2 / 0.6)), Math.round(m2ToPyeong(m2 / 0.5))];
}

export type AreaFaq = { q: string; a: string };

export type AreaPage = {
  m2: number;
  band: AreaBand;
  py: number;
  /** 흔히 부르는 평형 (전용률 75%) */
  label: number;
  title: string;
  description: string;
  keywords: string[];
  h1: string;
  lead: string;
  /** Nearest whole 평 / 평 bracket and the size relative to 84㎡ (under the formula). */
  numbers: Para;
  /** Size-band description (일반적 경향) plus the area's own note, if any. */
  about: Para[];
  estimateIntro: Para;
  estimates: EstimateRow[];
  estimateNote: string;
  rules: Para[];
  compare: Para[];
  faq: AreaFaq[];
};

function bandIntro(m2: number, band: AreaBand): string {
  const py = f2(m2ToPyeong(m2));
  const { rooms, baths } = typicalLayout(m2);
  switch (band) {
    case "studio":
      return `전용 ${m2}㎡(${py}평)는 ${rooms} 구조가 일반적인 크기입니다. 오피스텔, 도시형생활주택, 다가구주택 원룸, 소형 공공임대에서 흔히 볼 수 있고 주로 1인 가구가 씁니다. 방 구성은 일반적 경향일 뿐 실제 구조는 건물마다 다릅니다.`;
    case "small":
      return `전용 ${m2}㎡(${py}평)는 ${rooms}, ${baths} 구조가 일반적인 소형 주택입니다. 소형 아파트와 투룸 오피스텔, 빌라(다세대주택)에서 흔한 크기로 1~3인 가구가 많이 찾습니다. 방 구성은 일반적 경향일 뿐 실제 평면은 단지와 연식에 따라 다릅니다.`;
    case "mid":
      return `전용 ${m2}㎡(${py}평)는 국민주택규모 안의 중소형 아파트로, ${rooms}, ${baths} 구조가 일반적입니다. 3~4인 가구가 많이 찾는 크기이며, 방 구성은 일반적 경향일 뿐 판상형·타워형 같은 구조와 연식에 따라 달라집니다.`;
    case "large":
      return `전용 ${m2}㎡(${py}평)는 국민주택규모(85㎡)를 넘는 중대형 아파트로, ${rooms}, ${baths} 구조가 일반적입니다. 4인 이상 가구나 서재·드레스룸이 필요한 가구가 주로 찾는 크기이며, 방 구성은 일반적 경향일 뿐 단지마다 다릅니다.`;
    case "xlarge":
      return `전용 ${m2}㎡(${py}평)는 대형 아파트에 해당하며, ${rooms}, ${baths} 구조가 일반적입니다. 이 정도 면적은 아파트 외에도 단독주택, 상가, 사무실 면적을 말할 때 평으로 바꿔 부르는 경우가 많습니다. 방 구성은 일반적 경향일 뿐 건물마다 다릅니다.`;
  }
}

function numberIntro(m2: number): string {
  const near = nearWholePyeong(m2);
  let s: string;
  if (near !== null) {
    s = `${m2}㎡는 ${near}평과 거의 같습니다. 반대로 ${near}평을 ㎡로 바꾸면 ${f2(pyeongToM2(near))}㎡이므로, ‘${near}평’이라고 하면 대략 이 크기를 말합니다.`;
  } else {
    const fl = Math.floor(m2ToPyeong(m2));
    s = `소수점을 버리면 ${fl}평으로, ${fl}평(${f2(pyeongToM2(fl))}㎡)과 ${fl + 1}평(${f2(pyeongToM2(fl + 1))}㎡) 사이의 면적입니다.`;
  }
  // 84·85㎡ are compared directly in the neighbour paragraph; a "101%" line would add nothing.
  if (Math.abs(m2 - NATIONAL_PAGE_M2) > 1) {
    s += ` 국민평형이라고 부르는 전용 84㎡와 비교하면 약 ${Math.round((m2 / NATIONAL_PAGE_M2) * 100)}% 크기입니다.`;
  }
  return s;
}

function estimateIntro(m2: number, band: AreaBand): Para {
  const [olo, ohi] = offiRange(m2);
  const [alo, ahi] = aptRange(m2);
  if (band === "studio") {
    return [
      `오피스텔은 분양 면적을 계약면적(전용 + 주거공용 + 기타공용) 기준으로 표시하는 경우가 많고, 이 기준 전용률은 보통 50~60%입니다. 그래서 전용 ${m2}㎡라도 광고 숫자는 약 ${f1(m2 / 0.6)}~${f1(m2 / 0.5)}㎡(${olo}~${ohi}평)로 커집니다.`,
    ];
  }
  if (band === "small") {
    return [
      `같은 전용 ${m2}㎡라도 아파트는 공급면적(전용 + 주거공용), 오피스텔은 계약면적(공급면적 + 기타공용)으로 표기하는 경우가 많아 광고 숫자가 다릅니다. 아파트 전용률은 보통 70~80%, 오피스텔은 50~60%라서 아파트라면 약 ${alo}~${ahi}평형, 오피스텔이라면 계약면적 약 ${olo}~${ohi}평으로 표기됩니다.`,
    ];
  }
  return [
    `아파트의 ‘평형’은 공급면적(전용 + 계단·복도 같은 주거공용) 기준입니다. 전용률은 보통 70~80%이고 판상형이 높고 타워형이 낮은 편이라, 전용 ${m2}㎡의 공급면적은 약 ${f1(m2 / 0.8)}~${f1(m2 / 0.7)}㎡, ${alo}~${ahi}평형으로 추정됩니다.`,
  ];
}

function nationalRule(m2: number): Para {
  const label = { strong: "국민주택규모" };
  if (m2 < NATIONAL_HOUSING_M2) {
    return [
      label,
      `: 주거전용 85㎡ 이하(주택법 제2조 제6호)라서 국민주택규모에 들어가며, 상한까지 ${NATIONAL_HOUSING_M2 - m2}㎡ 여유가 있습니다.`,
    ];
  }
  if (m2 === NATIONAL_HOUSING_M2) {
    return [
      label,
      `: 기준이 ‘85㎡ 이하’라서 전용 85㎡는 상한에 딱 맞게 포함됩니다. 수도권을 제외한 도시지역이 아닌 읍·면 지역은 기준이 ${NATIONAL_HOUSING_M2_RURAL}㎡입니다.`,
    ];
  }
  const rural =
    m2 <= NATIONAL_HOUSING_M2_RURAL
      ? ` 다만 수도권을 제외한 도시지역이 아닌 읍·면 지역은 기준이 ${NATIONAL_HOUSING_M2_RURAL}㎡라서, 그런 곳의 주택이라면 국민주택규모에 들어갑니다.`
      : "";
  return [label, `: 상한 85㎡보다 ${m2 - NATIONAL_HOUSING_M2}㎡ 넓어 국민주택규모를 넘습니다(주택법 제2조 제6호).${rural}`];
}

function taxRule(m2: number, band: AreaBand): Para {
  const label = { strong: "취득세" };
  if (band === "studio") {
    return [
      label,
      ": 주택이라면 국민주택규모 이하라 농어촌특별세가 붙지 않습니다. 오피스텔은 주택이 아닌 건축물로 취득해 면적과 관계없이 취득세·지방교육세·농어촌특별세를 합쳐 4.6%입니다. 주택 매매가별 세금은 ",
      LINK_ACQ,
      "에서 확인할 수 있습니다.",
    ];
  }
  if (band === "small") {
    return [
      label,
      ": 주택을 살 때 농어촌특별세가 붙지 않아 취득세와 지방교육세만 냅니다. 생애최초로 사는 전용 60㎡ 이하·3억원(수도권 6억원) 이하 연립·다세대·도시형생활주택은 감면 한도가 200만원이 아니라 300만원입니다. 금액은 ",
      LINK_ACQ,
      "로 바로 계산할 수 있습니다.",
    ];
  }
  if (band === "mid") {
    return [
      label,
      ": 주택을 살 때 농어촌특별세가 붙지 않아 취득세와 지방교육세만 냅니다. 1주택 1~3% 세율이라면 같은 값의 85㎡ 초과 주택보다 매매가의 0.2%만큼 세금이 적습니다. 금액은 ",
      LINK_ACQ,
      "로 바로 계산할 수 있습니다.",
    ];
  }
  const rural =
    m2 <= NATIONAL_HOUSING_M2_RURAL
      ? ` 수도권을 제외한 도시지역이 아닌 읍·면의 주택은 ${NATIONAL_HOUSING_M2_RURAL}㎡까지 붙지 않습니다.`
      : "";
  return [
    label,
    `: 국민주택규모를 넘어 농어촌특별세가 더 붙습니다. 1주택 1~3% 세율이면 매매가의 0.2%라서 5억원 집은 100만원, 10억원 집은 200만원입니다.${rural} 금액은 `,
    LINK_ACQ,
    "로 바로 계산할 수 있습니다.",
  ];
}

function subscriptionRule(m2: number, band: AreaBand): Para {
  const s = privatePointShare(m2);
  if (band === "studio") {
    return [
      { strong: "청약" },
      `: 오피스텔 분양은 청약통장이 필요 없지만, 아파트 전용 ${m2}㎡라면 투기과열지구·조정대상지역(청약과열지역)의 민영주택은 가점제 ${s.overheated}%, 추첨제 ${100 - s.overheated}%로 당첨자를 뽑습니다. 내 가점은 `,
      LINK_SUB,
      "로 확인할 수 있습니다.",
    ];
  }
  if (m2 <= NATIONAL_HOUSING_M2) {
    const range = m2 <= SMALL_HOUSING_M2 ? "전용 60㎡ 이하" : "전용 60㎡ 초과 85㎡ 이하";
    return [
      { strong: "청약 가점제 비율" },
      `: 투기과열지구·조정대상지역(청약과열지역)의 민영주택 ${range}는 가점제 ${s.overheated}%, 추첨제 ${100 - s.overheated}%로 당첨자를 뽑습니다. 그 밖의 지역은 가점제 비율을 ${s.elsewhereMax}% 이하에서 시장·군수·구청장이 정합니다(주택공급에 관한 규칙 제28조). 내 가점은 `,
      LINK_SUB,
      "로 확인할 수 있습니다.",
    ];
  }
  return [
    { strong: "청약 가점제 비율" },
    `: 85㎡ 초과 민영주택은 투기과열지구에서 가점제 ${s.overheated}%, 조정대상지역(청약과열지역)에서 ${s.adjusted}%이고 나머지는 추첨입니다. 규제지역이 아니면 전부 추첨으로 뽑습니다(주택공급에 관한 규칙 제28조). 내 가점은 `,
    LINK_SUB,
    "로 확인할 수 있습니다.",
  ];
}

function depositRule(m2: number): Para {
  const tier = depositTier(m2);
  const idx = SUBSCRIPTION_DEPOSIT_TIERS.indexOf(tier);
  const next = SUBSCRIPTION_DEPOSIT_TIERS[idx + 1];
  const tail = next
    ? ` ${tier.maxM2}㎡를 넘는 주택형에 넣으려면 서울·부산 기준 ${man(next.seoulBusan)}이 필요합니다.`
    : " 이 금액이면 면적과 관계없이 모든 주택형에 신청할 수 있습니다.";
  return [
    { strong: "청약 예치금" },
    `: 민영주택 1순위 예치기준금액은 ${tier.label} 구간이라 서울·부산 ${man(tier.seoulBusan)}, 그 밖의 광역시 ${man(tier.metro)}, 그 밖의 시·군 ${man(tier.other)}입니다(주택공급에 관한 규칙 별표 2, 신청자 주소지 기준).${tail}`,
  ];
}

const SMALL_CHEAP_RULE: Para = [
  { strong: "소형·저가주택" },
  ": 전용 60㎡ 이하이면서 공시가격이 수도권 1억6천만원, 그 밖의 지역 1억원 이하인 주택 1채만 가진 세대는 민영주택 일반공급 청약에서 무주택으로 봅니다(주택공급에 관한 규칙 제53조).",
];

const OFFICETEL_FEE_RULE: Para = [
  { strong: "오피스텔 중개보수" },
  ": 전용 85㎡ 이하이고 입식 부엌·수세식 화장실·목욕시설을 갖춘 주거용 오피스텔은 상한요율이 매매 0.5%, 임대차 0.4%입니다(공인중개사법 시행규칙 제20조). 거래금액별 상한은 ",
  LINK_FEE,
  "로 계산할 수 있습니다.",
];

function vatRule(m2: number): Para {
  if (m2 <= NATIONAL_HOUSING_M2) {
    return [
      { strong: "분양가 부가가치세" },
      ": 국민주택규모 이하 주택은 공급할 때 부가가치세가 면제되어 새 아파트 분양가에 부가세가 붙지 않습니다(조세특례제한법 제106조).",
    ];
  }
  return [
    { strong: "분양가 부가가치세" },
    ": 국민주택규모를 넘는 주택을 새로 분양받으면 분양가 중 건물분에 부가가치세 10%가 포함됩니다. 토지분은 면세입니다(조세특례제한법 제106조).",
  ];
}

function rules(m2: number, band: AreaBand): Para[] {
  const out: Para[] = [nationalRule(m2), taxRule(m2, band), subscriptionRule(m2, band)];
  if (band !== "studio") out.push(depositRule(m2));
  if (band === "small") out.push(SMALL_CHEAP_RULE);
  if (band === "studio" || band === "small") out.push(OFFICETEL_FEE_RULE);
  if (band !== "studio" && band !== "small") out.push(vatRule(m2));
  return out;
}

function pageLink(n: number) {
  return { text: `${n}㎡`, href: `/pyeong/${n}/` };
}

function compare(m2: number): Para[] {
  const i = PYEONG_PAGE_M2.indexOf(m2);
  const prev = i > 0 ? PYEONG_PAGE_M2[i - 1] : null;
  const next = i >= 0 && i < PYEONG_PAGE_M2.length - 1 ? PYEONG_PAGE_M2[i + 1] : null;
  const p: Para = [];
  if (prev !== null) {
    p.push(
      "한 단계 작은 ",
      pageLink(prev),
      `(${f2(m2ToPyeong(prev))}평)보다 ${m2 - prev}㎡, 약 ${f2(m2ToPyeong(m2 - prev))}평 넓습니다.`,
    );
  }
  if (next !== null) {
    p.push(
      prev !== null ? " 한 단계 큰 " : "한 단계 큰 ",
      pageLink(next),
      `(${f2(m2ToPyeong(next))}평)보다는 ${next - m2}㎡, 약 ${f2(m2ToPyeong(next - m2))}평 좁습니다.`,
    );
  }
  return [
    p,
    ["다른 숫자는 ", LINK_MAIN, "에서 ㎡와 평을 바로 바꿀 수 있습니다. 1㎡는 0.3025평, 1평은 약 3.3058㎡입니다."],
  ];
}

function faq(m2: number, band: AreaBand): AreaFaq[] {
  const py = m2ToPyeong(m2);
  const label = Math.round(estimateSupplyPyeong(m2));
  const [olo, ohi] = offiRange(m2);
  const [alo, ahi] = aptRange(m2);
  const items: AreaFaq[] = [
    {
      q: `${m2}㎡는 몇 평인가요?`,
      a: `${m2}㎡ × 0.3025 = ${f2(py)}평입니다. 소수점을 버리면 ${Math.floor(py)}평이고, 거꾸로 평에 3.3058을 곱하면 ㎡가 됩니다.`,
    },
  ];
  if (band === "studio") {
    items.push({
      q: `${m2}㎡ 오피스텔은 광고에서 몇 평으로 나오나요?`,
      a: `오피스텔은 계약면적 기준 전용률이 보통 50~60%라서 전용 ${m2}㎡의 계약면적은 약 ${f1(m2 / 0.6)}~${f1(m2 / 0.5)}㎡, ${olo}~${ohi}평으로 표기될 수 있습니다. 정확한 면적은 분양 공고나 건축물대장에서 확인해야 합니다.`,
    });
  } else {
    items.push({
      q: `전용 ${m2}㎡ 아파트는 몇 평형인가요?`,
      a: `아파트 평형은 공급면적 기준이라 전용면적보다 큽니다. 전용률 75%를 가정하면 공급면적은 약 ${f1(m2 / TYPICAL_EXCLUSIVE_RATIO)}㎡, 약 ${label}평형이고, 전용률 70~80% 범위로 보면 ${alo}~${ahi}평형입니다.`,
    });
  }

  let national: string;
  if (band === "studio") {
    national = `네. 국민주택규모는 주거전용 85㎡ 이하라서 전용 ${m2}㎡ 주택은 여기에 들어갑니다. 다만 오피스텔은 주택이 아니어서 국민주택규모에 따른 취득세·부가가치세 혜택을 받지 않습니다.`;
  } else if (m2 < NATIONAL_HOUSING_M2) {
    national = `네. 국민주택규모는 주거전용 85㎡ 이하(수도권 밖 도시지역이 아닌 읍·면은 100㎡ 이하)라서 ${m2}㎡는 국민주택규모에 해당합니다.`;
  } else if (m2 === NATIONAL_HOUSING_M2) {
    national = "네. 기준이 ‘85㎡ 이하’라서 전용 85㎡도 국민주택규모에 들어갑니다. 85㎡를 조금이라도 넘으면 국민주택규모 초과입니다.";
  } else if (m2 <= NATIONAL_HOUSING_M2_RURAL) {
    national = `수도권과 도시지역에서는 아닙니다. 국민주택규모는 주거전용 85㎡ 이하이고, 수도권을 제외한 도시지역이 아닌 읍·면 지역만 100㎡ 이하라서 그런 곳의 ${m2}㎡ 주택은 국민주택규모에 들어갑니다.`;
  } else {
    national = `아니요. 국민주택규모는 주거전용 85㎡ 이하(수도권 밖 도시지역이 아닌 읍·면은 100㎡ 이하)라서 ${m2}㎡는 이를 넘는 면적입니다.`;
  }
  items.push({ q: `${m2}㎡는 국민주택규모인가요?`, a: national });

  if (band === "studio") {
    items.push({
      q: `${m2}㎡ 오피스텔 중개보수 요율은 얼마인가요?`,
      a: "전용 85㎡ 이하이고 입식 부엌·수세식 화장실·목욕시설을 갖춘 주거용 오피스텔은 매매 0.5%, 임대차 0.4%가 상한입니다. 이 요건을 갖추지 못하면 0.9% 이내에서 협의합니다.",
    });
  } else if (m2 <= NATIONAL_HOUSING_M2) {
    const s = privatePointShare(m2);
    items.push({
      q: `전용 ${m2}㎡ 청약은 가점제로 몇 %를 뽑나요?`,
      a: `투기과열지구와 조정대상지역(청약과열지역)의 민영주택은 가점제 ${s.overheated}%, 추첨제 ${100 - s.overheated}%입니다. 그 밖의 지역은 가점제 비율을 ${s.elsewhereMax}% 이하에서 시장·군수·구청장이 정하므로 입주자모집공고에서 확인해야 합니다.`,
    });
  } else {
    const t = depositTier(m2);
    items.push({
      q: `전용 ${m2}㎡에 청약하려면 예치금이 얼마 필요한가요?`,
      a: `민영주택은 ${t.label} 구간이라 서울·부산 ${man(t.seoulBusan)}, 그 밖의 광역시 ${man(t.metro)}, 그 밖의 시·군 ${man(t.other)}이 입주자모집공고일 기준으로 청약통장에 들어 있어야 합니다. 지역은 신청자의 주민등록상 주소지 기준입니다.`,
    });
  }
  return items;
}

/** Everything the /pyeong/<m2>/ page prints, built from the area alone. */
export function buildAreaPage(m2: number): AreaPage {
  const band = areaBand(m2);
  const py = m2ToPyeong(m2);
  const pyS = f2(py);
  const label = Math.round(estimateSupplyPyeong(m2));
  const [olo, ohi] = offiRange(m2);

  let lead =
    band === "studio"
      ? `${m2}제곱미터를 평으로 바꾸면 ${pyS}평입니다. 원룸·오피스텔 크기라서 분양 광고의 계약면적으로는 약 ${olo}~${ohi}평으로 표기될 수 있습니다.`
      : `${m2}제곱미터를 평으로 바꾸면 ${pyS}평입니다. 아파트 전용면적이라면 흔히 약 ${label}평형이라고 부릅니다.`;
  if (m2 === NATIONAL_HOUSING_M2) lead += " 국민주택규모의 상한이 바로 전용 85㎡입니다.";

  let description: string;
  if (band === "studio") {
    description = `${m2}㎡는 ${pyS}평입니다. 원룸·오피스텔 전용 ${m2}㎡의 계약면적 추정(약 ${olo}~${ohi}평)과 방 구성의 일반적 경향, 비슷한 면적과의 비교를 정리했습니다.`;
  } else if (m2 <= NATIONAL_HOUSING_M2) {
    description = `${m2}㎡는 ${pyS}평이고, 아파트 전용 ${m2}㎡는 흔히 약 ${label}평형으로 부릅니다. 전용률별 공급면적과 국민주택규모·청약 가점제 기준을 함께 정리했습니다.`;
  } else {
    description = `${m2}㎡는 ${pyS}평이고, 아파트 전용 ${m2}㎡는 흔히 약 ${label}평형으로 부릅니다. 전용률별 공급면적과 청약 예치금·취득세 기준을 함께 정리했습니다.`;
  }

  const about: Para[] = [[bandIntro(m2, band)]];
  const note = AREA_NOTES[m2];
  if (note) about.push([note]);

  return {
    m2,
    band,
    py,
    label,
    title: `${m2}㎡ 몇 평? ${m2}제곱미터는 ${pyS}평`,
    description,
    keywords: [
      `${m2}제곱미터 평수`,
      `${m2}㎡ 몇평`,
      band === "studio" ? `${m2}㎡ 원룸 평수` : `전용 ${m2} 평형`,
      "평수 계산기",
    ],
    h1: `${m2}㎡는 몇 평? ${pyS}평`,
    lead,
    numbers: [numberIntro(m2)],
    about,
    estimateIntro: estimateIntro(m2, band),
    estimates: estimateRows(m2),
    estimateNote:
      "전용률은 업계에서 통용되는 범위로 잡은 추정치입니다. 실제 공급·계약면적은 분양 공고나 건축물대장에서 확인할 수 있습니다.",
    rules: rules(m2, band),
    compare: compare(m2),
    faq: faq(m2, band),
  };
}

/** Plain text of a paragraph (for tests and length checks). */
export function paraText(p: Para): string {
  return p.map((s) => (typeof s === "string" ? s : "strong" in s ? s.strong : s.text)).join("");
}
