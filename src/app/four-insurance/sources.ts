/** Basis line under the lead on the main 4대보험 page. */
export const FOUR_INSURANCE_BASIS =
  "2026년 4대보험 요율 · 예시는 2026년 10월분, 150명 미만, 산재 평균 1.47% 기준 · 2026년 10월 9일 확인";

/** Basis line on every /four-insurance/<만원>/ page. */
export const FOUR_INSURANCE_PAGE_BASIS =
  "가정: 비과세 없음 · 150명 미만 사업장 · 산재 평균 1.47% · 2026년 10월분 요율 (2026년 10월 9일 확인)";

/** Official sources cited on the 4대보험 pages. */
export const SOURCES = [
  { name: "4대사회보험 정보연계센터 모의계산", url: "https://www.4insure.or.kr/pbiz/ntcn/inscSmlCalcView.do" },
  { name: "국민연금공단", url: "https://www.nps.or.kr" },
  { name: "국민건강보험공단", url: "https://www.nhis.or.kr" },
  { name: "근로복지공단", url: "https://www.comwel.or.kr" },
  {
    name: "고용보험 및 산업재해보상보험의 보험료징수 등에 관한 법률",
    url: "https://www.law.go.kr/법령/고용보험및산업재해보상보험의보험료징수등에관한법률",
  },
  { name: "노인장기요양보험법", url: "https://www.law.go.kr/법령/노인장기요양보험법" },
] as const;
