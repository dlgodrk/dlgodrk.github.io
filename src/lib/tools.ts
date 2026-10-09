/**
 * Registry of every calculator on the site. The home page, header search,
 * related-tool links and breadcrumbs all read from here.
 * Each tool lives at /<slug>/ (src/app/<slug>/page.tsx).
 */
export type CategoryId = "work" | "money" | "date" | "home" | "health" | "text";

export const CATEGORIES: { id: CategoryId; name: string; blurb: string }[] = [
  { id: "work", name: "월급·근로", blurb: "실수령액, 퇴직금, 실업급여, 연차" },
  { id: "money", name: "돈·금융", blurb: "대출 이자, 예금·적금, 복리, 자동차세, 부가세" },
  { id: "date", name: "날짜·나이", blurb: "만 나이, 디데이, 전역일, 출산 예정일" },
  { id: "home", name: "집·부동산", blurb: "평수, 취득세, 청약 가점, 전월세 전환, 중개보수" },
  { id: "health", name: "건강", blurb: "BMI, 표준체중" },
  { id: "text", name: "글쓰기", blurb: "글자수, 원고지 매수" },
];

export type Tool = {
  slug: string;
  /** Short display name used in lists, e.g. "연봉 실수령액 계산기" */
  name: string;
  /** One-line plain description shown under the name in lists */
  summary: string;
  category: CategoryId;
  /** Extra words people type when searching the site's own search box */
  aliases: string[];
  /** Higher = shown earlier on the home page */
  popularity: number;
};

export const TOOLS: Tool[] = [
  { slug: "salary", name: "연봉 실수령액 계산기", summary: "4대보험과 소득세를 떼고 매달 통장에 들어오는 돈", category: "work", aliases: ["월급", "실수령", "세후", "4대보험", "연봉표"], popularity: 100 },
  { slug: "hourly-wage", name: "시급·주휴수당 계산기", summary: "2026 최저시급 기준 알바 주급과 월급, 주휴수당까지", category: "work", aliases: ["알바", "최저임금", "주휴", "시급", "주급"], popularity: 90 },
  { slug: "minimum-wage", name: "최저임금 계산기", summary: "2026년 10,320원, 2027년 10,700원 기준 일급·주급·월급 환산", category: "work", aliases: ["최저시급", "최저임금", "2027 최저임금", "최저월급"], popularity: 88 },
  { slug: "severance", name: "퇴직금 계산기", summary: "입사일과 최근 3개월 급여로 퇴직금과 퇴직소득세 계산", category: "work", aliases: ["퇴직", "퇴직소득세", "평균임금"], popularity: 85 },
  { slug: "unemployment", name: "실업급여 계산기", summary: "하루 지급액, 받는 기간, 총액을 한 번에", category: "work", aliases: ["구직급여", "실업", "고용보험"], popularity: 80 },
  { slug: "annual-leave", name: "연차 계산기", summary: "입사일 기준으로 올해 발생한 연차 일수", category: "work", aliases: ["연차휴가", "연차수당", "휴가"], popularity: 70 },
  { slug: "loan", name: "대출 이자 계산기", summary: "원리금균등, 원금균등, 만기일시 상환 비교", category: "money", aliases: ["대출", "이자", "상환", "주담대", "원리금"], popularity: 80 },
  { slug: "savings", name: "적금 이자 계산기", summary: "매달 넣으면 만기에 받는 세후 금액", category: "money", aliases: ["적금", "이자", "만기"], popularity: 65 },
  { slug: "deposit", name: "예금 이자 계산기", summary: "목돈을 맡기면 붙는 세후 이자", category: "money", aliases: ["예금", "정기예금", "이자"], popularity: 60 },
  { slug: "vat", name: "부가세 계산기", summary: "공급가액과 부가세, 합계금액 서로 변환", category: "money", aliases: ["부가가치세", "공급가액", "VAT"], popularity: 50 },
  { slug: "percent", name: "퍼센트 계산기", summary: "몇 퍼센트인지, 몇 퍼센트 올랐는지 바로 계산", category: "money", aliases: ["백분율", "퍼센트", "증감률", "할인율"], popularity: 55 },
  { slug: "compound-interest", name: "복리 계산기", summary: "원금과 매월 적립액이 복리로 얼마나 불어나는지", category: "money", aliases: ["복리", "투자 수익", "적립식", "72법칙", "수익률"], popularity: 62 },
  { slug: "stock-average", name: "주식 평단가 계산기", summary: "추가 매수(물타기·불타기) 후 평균 단가와 손익", category: "money", aliases: ["물타기", "평단가", "평균단가", "불타기", "주식"], popularity: 66 },
  { slug: "car-tax", name: "자동차세 계산기", summary: "배기량과 차령으로 연간 자동차세와 연납 할인액", category: "money", aliases: ["자동차세", "연납", "배기량", "전기차 세금"], popularity: 64 },
  { slug: "subscription-score", name: "청약 가점 계산기", summary: "무주택 기간, 부양가족, 통장 가입 기간으로 84점 만점 가점", category: "home", aliases: ["청약", "가점", "주택청약", "무주택"], popularity: 72 },
  { slug: "rent-conversion", name: "전월세 전환율 계산기", summary: "전세↔월세 전환 금액과 법정 전환율 상한", category: "home", aliases: ["전월세", "전환율", "월세 전환", "보증금"], popularity: 58 },
  { slug: "acquisition-tax", name: "취득세 계산기", summary: "주택 매매 취득세와 지방교육세, 농어촌특별세", category: "home", aliases: ["취득세", "부동산 세금", "생애최초", "다주택"], popularity: 70 },
  { slug: "age", name: "만 나이 계산기", summary: "생년월일로 만 나이, 연 나이, 띠까지", category: "date", aliases: ["나이", "만나이", "몇살", "띠", "년생"], popularity: 95 },
  { slug: "dday", name: "디데이 계산기", summary: "날짜까지 남은 날, 지난 날, 며칠 뒤 날짜", category: "date", aliases: ["D-day", "디데이", "날짜", "며칠", "기념일", "100일", "수능", "크리스마스", "설날", "추석", "새해", "올해 남은 날"], popularity: 75 },
  { slug: "discharge", name: "전역일 계산기", summary: "입대일로 전역일과 복무율, 남은 날 계산", category: "date", aliases: ["군대", "전역", "입대", "복무", "사회복무요원"], popularity: 70 },
  { slug: "due-date", name: "출산 예정일 계산기", summary: "마지막 생리 시작일로 출산 예정일과 임신 주수", category: "date", aliases: ["출산", "임신", "주수", "예정일"], popularity: 60 },
  { slug: "pyeong", name: "평수 계산기", summary: "제곱미터(㎡)와 평을 서로 변환", category: "home", aliases: ["평", "제곱미터", "㎡", "면적", "아파트 평수"], popularity: 85 },
  { slug: "brokerage-fee", name: "중개보수(복비) 계산기", summary: "매매, 전세, 월세 중개수수료 상한", category: "home", aliases: ["복비", "중개수수료", "부동산 수수료"], popularity: 60 },
  { slug: "bmi", name: "BMI 계산기", summary: "키와 몸무게로 비만도와 표준체중 확인", category: "health", aliases: ["비만도", "표준체중", "체질량지수"], popularity: 70 },
  { slug: "char-count", name: "글자수 세기", summary: "공백 포함·제외 글자수, 바이트, 원고지 매수", category: "text", aliases: ["글자수", "자소서", "바이트", "원고지"], popularity: 90 },
];

export function getTool(slug: string): Tool {
  const t = TOOLS.find((x) => x.slug === slug);
  if (!t) throw new Error(`Unknown tool slug: ${slug}`);
  return t;
}

export function getCategory(id: CategoryId) {
  return CATEGORIES.find((c) => c.id === id)!;
}

/** Related tools: same category first, then most popular others. */
export function relatedTools(slug: string, count = 6): Tool[] {
  const self = getTool(slug);
  const same = TOOLS.filter((t) => t.slug !== slug && t.category === self.category);
  const others = TOOLS.filter((t) => t.slug !== slug && t.category !== self.category).sort((a, b) => b.popularity - a.popularity);
  return [...same, ...others].slice(0, count);
}
