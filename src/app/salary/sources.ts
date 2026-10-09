import { pensionBounds } from "@/lib/rates/insurance";
import { DEFAULT_NON_TAXABLE, DEFAULT_PAY_MONTH } from "@/lib/calc/salary";

/** Basis line shown under the lead on every salary page. */
export const SALARY_BASIS = "2026년 4대보험 요율 · 근로소득 간이세액표(2026. 2. 27. 개정) 기준 · 2026년 10월 9일 확인";

/** Official sources cited on the salary pages. */
export const SOURCES = [
  { name: "국민연금공단", url: "https://www.nps.or.kr" },
  { name: "국민건강보험공단", url: "https://www.nhis.or.kr" },
  { name: "4대사회보험 정보연계센터 모의계산", url: "https://www.4insure.or.kr/pbiz/ntcn/inscSmlCalcView.do" },
  {
    name: "소득세법 시행령 별표2 근로소득 간이세액표",
    url: "https://www.law.go.kr/LSW/lsBylInfoPLinkR.do?lsNm=%EC%86%8C%EB%93%9D%EC%84%B8%EB%B2%95+%EC%8B%9C%ED%96%89%EB%A0%B9&bylNo=0002&bylBrNo=00&bylCls=BE",
  },
  { name: "지방세법 제103조의13", url: "https://www.law.go.kr/법령/지방세법/제103조의13" },
] as const;

/** 국민연금 기준소득월액 상한 for the page pay month (2026.7~2027.6: 6,590,000원). */
export const PENSION_CAP = pensionBounds(DEFAULT_PAY_MONTH).high;

/** Table cell whose text may wrap on phones (the shared .data-table no-wraps every cell). */
export const WRAP_CELL = { whiteSpace: "normal" } as const;

/** Class for the small grey second line inside a table cell (계산 기준, 한도). */
export const CELL_SUB = "mt-0.5 block text-[0.8125rem] font-normal text-muted";

/** Smallest 연봉 (만원) whose 과세 급여 reaches the pension cap with 비과세 20만원 (8,148만원). */
export const PENSION_CAP_ANNUAL_MANWON = Math.ceil(((PENSION_CAP + DEFAULT_NON_TAXABLE) * 12) / 10_000);
