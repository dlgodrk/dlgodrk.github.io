# 2026 Korean 4대보험 employee payroll deductions (국민연금, 건강보험, 장기요양보험, 고용보험) plus 비과세 allowances. Verified 2026-10-09 against official sources and the official 4insure.or.kr simulator API.

_Researched 2026-10-09 by a research agent with web sources; see source URLs per fact._

## Facts
- **national_pension_total_rate_2026** = 9.5% of 기준소득월액 (2026-01-01~2026-12-31, high)
  - The 2025 pension reform (국민연금법 개정, 법률 제20903호, promulgated 2025-04-02) raised the rate from 9% (fixed since 1998). The rate then rises 0.5%p a year until it reaches 13% in 2033.
  - sources: https://www.4insure.or.kr/pbiz/ntcn/inscSmlCalcView.do , https://www.newsis.com/view/NISX20251229_0003457395 , https://www.heraldk.com/article/2026060815500372453
- **national_pension_employee_rate_2026** = 4.75% (근로자 기여금), plus 4.75% employer 부담금 (2026-01-01~2026-12-31, high)
  - A 지역가입자 pays the full 9.5%.
  - sources: https://www.4insure.or.kr/pbiz/ntcn/inscSmlCalcView.do , https://www.newsis.com/view/NISX20251229_0003457395
- **national_pension_rate_2027_scheduled** = 10.0% total (5.0% employee) (2027-01-01~2027-12-31, medium)
  - Inferred from the legislated schedule of +0.5%p a year to 13% in 2033. Not separately confirmed from the law text.
  - sources: https://www.newsis.com/view/NISX20251229_0003457395 , https://bizforms.co.kr/smartblock/view.asp?sm_idx=503
- **national_pension_income_cap_2025_07_to_2026_06** = 기준소득월액 상한 6,370,000원, 하한 400,000원 (2025-07-01~2026-06-30, high)
  - Applies to January-June 2026 payrolls together with the 9.5% rate. Maximum employee 기여금 = floor10(6,370,000 x 4.75%) = 302,570원. Minimum = 400,000 x 4.75% = 19,000원.
  - sources: https://www.bokjiro.go.kr/ssis-tbu/cms/pc/news/news/1309186_1114.html , https://www.heraldk.com/article/2026060815500372453
- **national_pension_income_cap_2026_07_to_2027_06** = 기준소득월액 상한 6,590,000원, 하한 410,000원 (2026-07-01~2027-06-30, high)
  - Raised in line with the 3.4% rise in A값. The 4insure page states: 2026.7.1.~2027.6.30. (최저) 41만원 / (최고) 659만원. The simulator JS has npsLlmtAmt=410000 and npsUpprAmt=6590000. Maximum employee 기여금 = 313,020원; minimum = 19,470원.
  - sources: https://www.4insure.or.kr/pbiz/ntcn/inscSmlCalcView.do , https://www.bokjiro.go.kr/ssis-tbu/cms/pc/news/news/1309186_1114.html , https://www.heraldk.com/article/2026060815500372453
- **national_pension_rounding** = 기준소득월액: 소득월액의 천원 미만 절사. 기여금 and 부담금: each computed separately with 10원 미만 절사. 연금보험료 = 기여금 + 부담금 (= 2 x truncated share). (ongoing (2026), high)
  - The NPS 사업장 실무안내 (2024) says '연금보험료 = 기여금 + 부담금 ... ※ 10원 미만 절사함'. Its example: 1,155,000 x 4.5% = 51,975 is cut to 51,970, so 연금보험료 = 103,940. The official simulator agrees: 3,001,000 gives 142,540 each and 285,080 total, not 285,095. News figures such as a 626,050원 maximum are the untruncated total. The actual 사업장 maximum total is 626,040원.
  - sources: https://pensioner.nps.or.kr/html/download/minwon/2024_nps_company.pdf , https://www.4insure.or.kr/pbiz/ntcn/inscSmlCalcView.do
- **health_insurance_rate_2026** = 7.19% of 보수월액 (employee 3.595%, employer 3.595%) (2026-01-01~2026-12-31, high)
  - Up from 7.09% in 2025 (+0.1%p, +1.48%).
  - sources: https://www.nhis.or.kr/renewal_popup/poster/20260204_poster_longdesc_1.html , https://www.4insure.or.kr/pbiz/ntcn/inscSmlCalcView.do
- **health_insurance_rate_2027** = 7.19% (frozen) (2027-01-01~2027-12-31, medium)
  - Decided at the 15th 건정심 on 2026-09-08 (news reports). Not yet checked against a MOHW 고시.
  - sources: https://biz.sbs.co.kr/amp/article/20000333401 , https://www.wikitree.co.kr/articles/1158094
- **health_insurance_monthly_premium_cap_floor_2026** = 직장가입자 보수월액보험료 상한 9,183,480원 (employee share 4,591,740원), 하한 20,160원 (employee share 10,080원). 소득월액보험료 상한 4,591,740원. (2026-01-01 (2026년 1월분)~2026-12-31, high)
  - 보건복지부고시 제2025-222호 (2025-12-24), effective 2026-01-01. The caps apply to the total premium; each side pays half. 2025 values were 9,008,340 and 19,780. The 4insure JS clamps 보수월액 to 280,528~127,725,730. Because of 10원 truncation, its output at the cap is 4,591,730 instead of 4,591,740.
  - sources: https://www.nhis.or.kr/lm/lmxsrv/law/lawFullContent.do?SEQ=39 , https://www.kukinews.com/article/view/kuk202601050035
- **health_insurance_rounding** = 근로자 건강보험료 = 보수월액 x 7.19% x 50%, 원 단위 절사 (= 10원 미만 절사) (2026, high)
  - The 4insure page text reads: '건강보험료 = 보수월액 x 건강보험료율(7.19%) x 보험료 부담률(50%) (원 단위 절사)'. Example: 2,000,000 gives 71,900. The API confirms 2,500,000 gives 89,870 (89,875 truncated).
  - sources: https://www.4insure.or.kr/pbiz/ntcn/inscSmlCalcView.do
- **long_term_care_rate_2026_income_basis** = 0.9448% of 보수월액 (employee-equivalent 0.4724%). 시행령 제4조: 100만분의 9,448. (2026-01-01 (2026년 1월분)~, high)
  - Up from 0.9182% in 2024-2025. Set by 대통령령 제35987호 (2025-12-30) and applies from the January 2026 monthly premium.
  - sources: https://www.nhis.or.kr/lm/lmxsrv/law/lawFullContent.do?SEQ=31 , https://www.mohw.go.kr/board.es?mid=a10503010100&bid=0027&act=view&list_no=1487817&tag=&nPage=1 , https://www.nhis.or.kr/renewal_popup/poster/20260204_poster_longdesc_1.html
- **long_term_care_rate_2026_as_pct_of_health_premium** = 13.14% of 건강보험료 (exact ratio 0.9448/7.19 = 0.131404728...) (2026-01-01~2026-12-31, high)
  - Was 12.95% in 2025. MOHW publishes it rounded to 13.14%.
  - sources: https://www.mohw.go.kr/board.es?mid=a10503010100&bid=0027&act=view&list_no=1487817&tag=&nPage=1 , https://www.4insure.or.kr/pbiz/ntcn/inscSmlCalcView.do
- **long_term_care_calc_method_2026_jan_to_oct** = 장기요양보험료 = 건강보험료 x (0.9448% / 7.19%), unrounded ratio, 원 단위 절사 (10원 미만). Computed on the employee's own 건강보험료 share. (2026년 1월분 ~ 2026년 10월분, high)
  - 노인장기요양보험법 제9조① before amendment. The official simulator uses the exact ratio: 5,000,000 gives 179,750 health and 23,620 LTC (exact 23,620.0); 10,000,000 gives 47,240. Using 0.1314 would give 23,610 and 47,230. Compute with integer arithmetic. Floating 0.9448/7.19 makes exact-integer results such as 23,620 fall to 23,610.
  - sources: https://www.4insure.or.kr/pbiz/ntcn/inscSmlCalcView.do , https://www.nhis.or.kr/lm/lmxsrv/law/lawFullContent.do?SEQ=30
- **long_term_care_calc_method_from_2026_nov** = Ratio (건강보험료율 대비 장기요양보험료율) rounded at the 5th decimal place, giving 0.1314. 장기요양보험료 = floor10(건강보험료 x 0.1314). (2026년 11월분 장기요양보험료부터 (법 시행 2026-11-27), medium)
  - Set by 노인장기요양보험법 법률 제21690호 (promulgated 2026-05-26, in force 2026-11-27). 부칙 제3조 applies 제9조① from the month that contains the 시행일, i.e. the November 2026 premium. Reading 'round at the 5th decimal' as 4 decimals gives 0.1314, which matches the published 13.14%. Whether 4insure or NHIS systems actually switch to 0.1314 has not been observed yet.
  - sources: https://www.nhis.or.kr/lm/lmxsrv/law/lawFullContent.do?SEQ=30 , https://www.ksw-news.com/news/articleView.html?idxno=3034674
- **employment_insurance_employee_rate_2026** = 0.9% of 월 보수 (실업급여 total 1.8%; employer 0.9% + 고용안정·직능 0.25%/0.45%/0.65%/0.85% by size) (2022-07-01 onward, unchanged through 2026-12-31, high)
  - The employer extra rate is 0.25% for <150인, 0.45% for 150인+ 우선지원대상, 0.65% for 150~1000인, and 0.85% for 1000인+ or 국가/지자체. The employee share has no upper or lower limit. The API confirms 150,000,000 gives 1,350,000.
  - sources: https://www.4insure.or.kr/pbiz/ntcn/inscSmlCalcView.do , https://www.heraldk.com/article/2026090101275427392
- **employment_insurance_rounding** = floor10(보수 x 0.9%) (원 단위 절사) (2026, medium)
  - Confirmed from official simulator outputs: 3,456,789 gives 31,110; 2,345,678 gives 21,110; 3,001,500 gives 27,010. No COMWEL statute text was found.
  - sources: https://www.4insure.or.kr/pbiz/ntcn/inscSmlCalcView.do
- **employment_insurance_2027_proposal** = Proposed 실업급여 2.0% total (employee 1.0%) (proposed for 2027, not finalized as of 2026-10-09, medium)
  - A government plan presented to the 고용보험위원회 on 2026-09-01. It still needs the law and 시행령 to be amended. Do not apply it to 2026.
  - sources: https://www.heraldk.com/article/2026090101275427392 , https://m.etnews.com/20260901000131
- **industrial_accident_insurance_2026** = Average 1.47%, paid entirely by the employer (no employee deduction) (2026-01-01~2026-12-31, high)
  - Rates differ by industry.
  - sources: https://www.heraldk.com/article/2025123016313362622
- **nontaxable_meal_allowance_2026** = 월 200,000원 (식사대, only when no meals are provided in kind) (2023-01-01 onward; still 20만원 in 2026, high)
  - 소득세법 시행령 제17조의2. Proposals to raise it to 30만원 (e.g. 의안 2202419) have not passed. Blog posts claiming '2026년 30만원' are wrong. 비과세 income is excluded from the 4대보험 base (국민연금 소득월액, 건강 보수월액, 고용 보수).
  - sources: https://sootax.co.kr/5503 , https://asiatop.co.kr/office-tips/meal-allowance-tax-exempt/ , https://www.moneynestlab.com/kr-salary/guide/non-taxable-items
- **nontaxable_childcare_allowance_2026** = 6세 이하 자녀 1인당 월 200,000원 (was 근로자 1인당 월 20만원 through 2025) (2026-01-01 지급분부터, medium)
  - 소득세법 개정 passed the plenary on 2025-12-02. The 2026 세제개편안 (Aug 2026) proposes adding 위탁아동 from 2027. No official 국세청 page was fetched.
  - sources: https://www.khan.co.kr/article/202512310900081 , https://studygov.kr/blog/0323-2026-childcare-allowance-tax-free/
- **nontaxable_vehicle_allowance** = 자가운전보조금 월 200,000원 (ongoing 2026, high)
  - Requires the employee's own or leased vehicle used for work in place of actual travel expenses.
  - sources: https://www.moneynestlab.com/kr-salary/guide/non-taxable-items , https://taxly.kr/post/263-자가운전보조금의-과세-문제범위-과세여부-배우자-공동명의차량-등
- **nontaxable_other_common** = 연구보조비 월 20만원; 생산직 연장·야간·휴일근로수당 연 240만원 (월정액급여 ≤260만원 and 직전연도 총급여 ≤3,700만원 from 2026-07-01, previously 210만원 / 3,000만원); 국외근로 월 100만원 (원양어선·해외건설 월 500만원); 출산지원금 (출생 후 2년 내 2회) 전액 (2026, low)
  - The 260만원 / 3,700만원 threshold and its 2026-07-01 effective date (시행령 제35349호) come from blog sources only and were not verified against law.go.kr. Use only as informational text, not in core calculator logic.
  - sources: https://www.bizforms.co.kr/365guide/view.asp?number=187 , https://hometax-go.kr/%EA%B7%BC%EB%A1%9C%EC%86%8C%EB%93%9D-%EC%83%9D%EC%82%B0%EC%A7%81-%EC%97%B0%EC%9E%A5%EA%B7%BC%EB%A1%9C%EC%88%98%EB%8B%B9-%EB%B9%84%EA%B3%BC%EC%84%B8-%EC%9A%94%EA%B1%B4-%EC%9B%94%EC%A0%95%EC%95%A1/
- **reference_2025_rates** = 국민연금 9% (4.5%); 건강 7.09% (3.545%); 장기요양 0.9182% (12.95% of 건강보험료); 고용 0.9% (2025-01-01~2025-12-31, high)
  - For year-selector or comparison features.
  - sources: https://www.nhis.or.kr/renewal_popup/poster/20260204_poster_longdesc_1.html , https://www.mohw.go.kr/board.es?mid=a10503010100&bid=0027&act=view&list_no=1487817&tag=&nPage=1

## Formulas

```
All amounts are KRW integers. Use INTEGER arithmetic. Floating point breaks cases: in JS, 2000000*0.03595 can land just below 71900, and 0.9448/7.19 in float gives 23,610 instead of 23,620 for 179,750. floor10(x) = floor(x/10)*10.

Input: monthlyPay = 월 과세 급여 = 총 지급액 − 비과세 (식대 ≤200,000, 자가운전 ≤200,000, 보육수당 ≤200,000 x 6세 이하 자녀 수, etc.)
Input: payMonth (YYYY-MM) and companySize (for the employer share only)

// 1) 국민연금
if payMonth <= 2026-06: LOW=400000, HIGH=6370000 else (2026-07..2027-06): LOW=410000, HIGH=6590000
base = clamp(floor(monthlyPay/1000)*1000, LOW, HIGH)      // 천원 미만 절사, then clamp
npsEmp = floor(base*475/100000)*10                          // floor10(base*4.75%)
npsEmployer = npsEmp; npsTotal = 2*npsEmp                   // NPS: 기여금·부담금 each 10원 미만 절사
(지역가입자 instead: floor10(base*95/1000))

// 2) 건강보험 (2026: 7.19%)
hEmp = floor(monthlyPay*3595/1000000)*10                    // floor10(pay*7.19%*50%)
hEmp = min(max(hEmp, 10080), 4591740)                       // 고시 상·하한 ÷2
hEmployer = hEmp

// 3) 장기요양
if payMonth <= 2026-10: ltcEmp = floor(hEmp*9448/719000)*10   // floor10(hEmp*0.9448/7.19), exact rational
else (2026-11 onward, 법률 제21690호): ltcEmp = floor(hEmp*1314/100000)*10   // ratio rounded to 0.1314
ltcEmployer = ltcEmp

// 4) 고용보험 (근로자 실업급여 0.9%)
eiEmp = floor(monthlyPay*9/10000)*10                         // no cap or floor
eiEmployer = floor(monthlyPay*(90+X)/10000)*10 with X = 25 (<150인), 45 (150인+ 우선지원), 65 (150~999인), 85 (1000인+/국가). Check: 3,000,000 at 1.15% gives 34,500, matching 4insure.

employeeTotal = npsEmp + hEmp + ltcEmp + eiEmp

The 4insure simulator clamps 보수월액 to [280,528, 127,725,730] before multiplying. That gives hEmp 10,080 at the floor and 4,591,730 (not 4,591,740) at the top. Clamping the premium to the 고시 amounts (10,080~4,591,740) is the statute-faithful method. The two differ by 10원 only above about 127.7M/month.
```

## Test vectors
- 월 과세급여 3,000,000원, 2026-07~10 => 국민연금 142,500 / 건강 107,850 / 장기요양 14,170 / 고용 27,000 / 근로자 합계 291,520 (employer: NPS 142,500, 건강 107,850, LTC 14,170, 고용 34,500 at <150인) [4insure.or.kr official simulator API selectInscSmlCalcAjax.do, queried 2026-10-09]
- 월 과세급여 4,000,000원, 2026-07~10 => 국민연금 190,000 / 건강 143,800 / 장기요양 18,890 / 고용 36,000 / 합계 388,690 [4insure.or.kr official simulator API, 2026-10-09]
- 월 과세급여 7,000,000원, 2026-07~10 => 국민연금 313,020 (기준소득월액 capped at 6,590,000) / 건강 251,650 / 장기요양 33,060 / 고용 63,000 / 합계 660,730 [4insure.or.kr official simulator API, 2026-10-09]
- 월 과세급여 7,000,000원, 2026-01~06 (NPS cap 6,370,000) => 국민연금 302,570 (6,370,000 x 4.75% = 302,575, cut to 10원) / 건강 251,650 / 장기요양 33,060 / 고용 63,000 / 합계 650,280 [Derived from the NPS rule (10원 미만 절사, NPS 2024 사업장 실무안내) and the 2025.7~2026.6 cap. The calculator site cited in research also shows 302,570. Other items are from the 4insure API.]
- 월 과세급여 2,000,000원, 2026-07~10 => 국민연금 95,000 / 건강 71,900 / 장기요양 9,440 / 고용 18,000 [4insure page worked example (건강 71,900 + 장기요양 9,440 = 81,340) and API]
- 월 과세급여 5,000,000원, 2026-07~10 => 국민연금 237,500 / 건강 179,750 / 장기요양 23,620 / 고용 45,000 / 합계 485,870. From 2026-11 with ratio 0.1314: 장기요양 23,610. [4insure API (exact-ratio case; floating-point implementations wrongly give 23,610 before Nov)]
- 월 과세급여 10,000,000원, 2026-07~10 => 국민연금 313,020 / 건강 359,500 / 장기요양 47,240 / 고용 90,000 / 합계 809,760. From 2026-11 with ratio 0.1314: 장기요양 47,230. [4insure API]
- 월 과세급여 6,590,000원, 2026-07~10 => 국민연금 313,020 / 건강 236,910 / 장기요양 31,130 / 고용 59,310 / 합계 640,370. From 2026-11: 장기요양 31,120. [4insure API]
- 월 과세급여 3,001,000원 => 국민연금 142,540 (total 285,080, not 285,095) / 건강 107,880 / 장기요양 14,170 / 고용 27,000 [4insure API (shows per-share 10원 truncation for NPS)]
- 월 과세급여 3,001,500원 => 국민연금 142,540 (기준소득월액 3,001,000) / 건강 107,900 / 장기요양 14,170 / 고용 27,010 [4insure API]
- 월 과세급여 3,456,789원 => 국민연금 164,160 (base 3,456,000) / 건강 124,270 / 장기요양 16,320 / 고용 31,110 / 합계 335,860 [4insure API]
- 월 과세급여 1,234,567원 => 국민연금 58,610 / 건강 44,380 / 장기요양 5,830 / 고용 11,110 [4insure API]
- 월 과세급여 2,156,880원 (2026 최저임금 월 환산 approx.) => 국민연금 102,410 / 건강 77,530 / 장기요양 10,180 / 고용 19,410 / 합계 209,530 [4insure API]
- 월 과세급여 2,500,000원 => 국민연금 118,750 / 건강 89,870 / 장기요양 11,800 / 고용 22,500 / 합계 242,920 [4insure API]
- 월 과세급여 2,345,678원 => 국민연금 111,380 / 건강 84,320 / 장기요양 11,080 / 고용 21,110. From 2026-11: 장기요양 11,070. [4insure API]
- 월 과세급여 4,321,987원 => 국민연금 205,240 / 건강 155,370 / 장기요양 20,410 / 고용 38,890 [4insure API]
- 월 과세급여 3,333,333원 => 국민연금 158,310 / 건강 119,830 / 장기요양 15,740 / 고용 29,990 [4insure API]
- 월 과세급여 350,000원 (below NPS floor) => 국민연금 19,470 (base 410,000) / 건강 12,580 / 장기요양 1,650 / 고용 3,150 [4insure API]
- 월 과세급여 200,000원 (below 건강 floor) => 국민연금 19,470 / 건강 10,080 (floor) / 장기요양 1,320 / 고용 1,800 [4insure API]
- 월 과세급여 9,999,999원 => 국민연금 313,020 / 건강 359,490 / 장기요양 47,230 / 고용 89,990 [4insure API]
- 월 과세급여 150,000,000원 => 국민연금 313,020 / 건강 4,591,740 by 고시 cap (4insure shows 4,591,730) / 장기요양 603,370 / 고용 1,350,000 [4insure API plus 보건복지부고시 제2025-222호 (cap 9,183,480 / 2)]
- 기준소득월액 6,590,000원, 지역가입자 국민연금 => 626,050 (full 9.5%) [heraldk.com 2026-06-08 (max total 626,050)]

## Caveats

1. 장기요양 rounding changes mid-year. 노인장기요양보험법 법률 제21690호 (promulgated 2026-05-26, in force 2026-11-27, applies from the November 2026 premium) requires the 건강보험료율 대비 장기요양보험료율 ratio to be rounded at the 5th decimal place. I read that as 0.1314. Until then, the official simulator uses the exact ratio 0.9448/7.19. The two methods give different results for some salaries (5,000,000; 6,590,000; 10,000,000). The calculator should switch by pay month, or show a note. I could not confirm how NHIS systems or 4insure implement it after November, so that part is medium confidence.

2. Integer math. Use exact integer arithmetic as shown. Float math gives off-by-10원 errors on 'exact' products, e.g. 179,750 x 0.9448/7.19 = 23,620 exactly.

3. NPS rounds each share separately. 기여금 and 부담금 are each truncated to 10원, so the 사업장 total is 2 x share. News headline totals such as 626,050 and 605,150 are untruncated full-rate figures; they are correct only for 지역가입자.

4. These calculators are monthly approximations. Actual 국민연금 기준소득월액 is set each July from the prior year's 소득총액 (or the 취득 신고). 건강보험 보수월액 is settled in April (연말정산), and 고용보험 is settled through 보수총액 신고. A website calculator should use 월 과세급여 (gross minus 비과세) as the standard approximation, as 4insure does.

5. Exclusions not modeled: 소득월액보험료 (보수 외 소득 over 2,000만원/yr), 두루누리 subsidies, age rules. Under the age rules, 국민연금 사업장가입자 status generally ends at 만 60세, and 실업급여 premiums are not levied on workers newly hired at 65 or older. Also not modeled: 건강보험 경감 (섬·벽지, etc.) and 산재 (employer-only).

6. Changes ahead. The 2027 건강보험료율 stays at 7.19% (건정심 2026-09-08, news only). The 2027 국민연금 rate is scheduled at 10% (5% employee). The 2027 고용보험 rise to 2.0% (1.0% employee) is only a government proposal as of 2026-10-09. The 2027 장기요양보험료율 had not yet been decided (usually decided around November).

7. 비과세 items. 식대 remains 20만원 in 2026; claims of 30만원 are false. The 보육수당 per-child basis (2026~) is backed by news and blog sources only; no 국세청 page was fetched. The 생산직 야간수당 thresholds are low confidence.

8. 4insure cap glitch. The 4insure simulator clamps 보수월액 rather than the premium. That yields 4,591,730 instead of the statutory 4,591,740 at the 건강 cap. Choose one approach and document it.

9. Source of the test vectors. All 4insure vectors come from the live official API: POST https://www.4insure.or.kr/pbiz/ntcn/selectInscSmlCalcAjax.do with JSON {salAmt, wrkrCntSeCd:'A'} and the page's CSRF header, queried 2026-10-09. A cleaned copy is saved at src/lib/rates/__fixtures__/4insure-2026-10.json. The integer formulas above reproduce every vector exactly, checked by scratchpad\verify2.py. The one exception is the 150M cap case explained in item 8.
