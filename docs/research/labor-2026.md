# 2026 Korean labor-law numbers: 최저임금, 주휴수당, 퇴직금 및 퇴직소득세, 연차휴가, 실업급여(구직급여). Researched 2026-10-09.


> **Errata (2026-10-09):** (1) 209h applies only to 주 40시간 + 주휴 8시간; it is NOT a rule to round other schedules up. Other schedules use the exact decimal (주소정 + 주휴) × 365/7/12 for pay, displayed to 0.01h (최저임금법 시행령 제5조①3 has no rounding rule). (2) In the 퇴직소득세 pseudocode, apply the <1,000원 소액부징수 check BEFORE computing 지방소득세; when 소득세 is waived, 지방소득세 is 0. See docs/research/verifier-corrections.md.
_Researched 2026-10-09 by a research agent with web sources; see source URLs per fact._

## Facts
- **minimum_wage_hourly_2026** = 10,320원/시간 (전년 대비 +290원, +2.9%) (2026-01-01~2026-12-31, high)
  - Decided by 최저임금위원회 on 2025-07-10, published (고시) 2025-08-05. Applies to every business with 1 or more workers, regardless of industry.
  - sources: https://www.minimumwage.go.kr/minWage/policy/decisionMain.do , https://www.segye.com/newsView/20260805506126
- **minimum_wage_daily_8h_2026** = 82,560원 (10,320 × 8) (2026-01-01~2026-12-31, high)
  - sources: https://www.minimumwage.go.kr/minWage/policy/decisionMain.do
- **minimum_wage_monthly_209h_2026** = 2,156,880원 (10,320 × 209) (2026-01-01~2026-12-31, high)
  - 209h = (40h of work + 8h 주휴) × 365/7/12 = 208.57, which the 고시 states as 209. 209h is used only for 주 40시간 + 주휴 8시간; other schedules use the exact decimal (주소정 + 주휴) × 365/7/12 for pay, displayed to 0.01h (see Errata).
  - sources: https://www.minimumwage.go.kr/minWage/policy/decisionMain.do , https://www.segye.com/newsView/20260805506126
- **minimum_wage_hourly_2027** = 10,700원/시간 (+380원, +3.7%) (2027-01-01~2027-12-31, high)
  - Decided by vote at the 14th plenary meeting on 2026-07-14 (the employer side's revised proposal). MOEL published the final notice on 2026-08-05. The objections filed by 민주노총 and 소상공인연합회 were rejected. One outlet reported a lawsuit to cancel the notice; this is unverified and does not change the effective rate.
  - sources: https://www.minimumwage.go.kr/minWage/policy/decisionMain.do , https://www.segye.com/newsView/20260805506126 , https://www.taxnet.co.kr/contents/taxnetpost/post-detail?id=4905 , https://v.daum.net/v/20260715085108633
- **minimum_wage_daily_8h_2027** = 85,600원 (2027-01-01~2027-12-31, high)
  - sources: https://www.minimumwage.go.kr/minWage/policy/decisionMain.do
- **minimum_wage_monthly_209h_2027** = 2,236,300원 (10,700 × 209; +79,420원 vs 2026) (2027-01-01~2027-12-31, high)
  - sources: https://www.minimumwage.go.kr/minWage/policy/decisionMain.do , https://www.taxnet.co.kr/contents/taxnetpost/post-detail?id=4905
- **minimum_wage_2025_reference** = 10,030원/시간, 월 2,096,270원 (2025-01-01~2025-12-31, high)
  - Needed when 이직일 or 퇴직일 falls in 2025.
  - sources: https://www.minimumwage.go.kr/minWage/policy/decisionMain.do
- **probation_min_wage_2026_2027** = 2026: 9,288원 (90%), 2027: 9,630원 (90%) (2026/2027, medium)
  - Allowed only when all of these hold: a contract of 1 year or more, within 3 months from the start of probation, and not 단순노무 work. The 2026 figure is computed as 10,320 × 0.9.
  - sources: https://v.daum.net/v/8WdIVcNdTu
- **juhyu_eligibility** = 4주 평균 1주 소정근로시간 15시간 이상 AND 1주 소정근로일 개근 (현행 (2026), high)
  - 근로기준법 제55조 ①: at least one paid holiday per week on average. 시행령 제30조: the holiday is given to a worker who attends every 소정근로일 of the week. 제18조 ③: 제55조 and 제60조 do not apply to workers averaging under 15h/week over 4 weeks (or over the shorter period worked). MOEL card news (2025-02): a contract that ends after one week still earns 주휴 if every scheduled day was worked. Temporary extra or substitute hours do not count as 소정근로시간. Applies to workplaces with fewer than 5 employees too. Extending 주휴 to 초단시간 workers is a government roadmap (law changes from 2027), not enacted as of 2026-10.
  - sources: https://casenote.kr/법령/근로기준법/제18조 , https://casenote.kr/법령/근로기준법/제55조 , https://www.bokjiro.go.kr/ssis-tbu/cms/pc/news/promotion/1307833_1118.html
- **juhyu_formula** = 주휴수당 = min(1주 소정근로시간, 40)/40 × 8 × 시급 (최대 8시간분) (현행 (2026), high)
  - Official form (시행령 별표2): (4주 총 소정근로시간 ÷ 4주간 통상근로자 총 소정근로일수) × 시급. With 5-day full-time workers this equals 주소정/5 = 주소정/40 × 8. If the workplace has no full-time workers, MOEL prorates to 40h.
  - sources: https://www.bokjiro.go.kr/ssis-tbu/cms/pc/news/promotion/1307833_1118.html , https://wikidocs.net/blog/@mythos/21366/
- **juhyu_weekly_full_2026** = 82,560원/주 (주 40시간, 10,320원) (2026, high)
  - sources: https://www.minimumwage.go.kr/minWage/policy/decisionMain.do
- **severance_eligibility** = 계속근로기간 1년 이상 AND 4주 평균 1주 소정근로시간 15시간 이상 (2012-07-26~현행, high)
  - 근로자퇴직급여 보장법 제4조 ① proviso. Applies to workplaces with fewer than 5 employees as well. The MOEL calculator rejects input when 입사일 > 퇴직일 − 1년.
  - sources: https://casenote.kr/법령/근로자퇴직급여_보장법/제4조
- **severance_formula** = 퇴직금 = 1일 평균임금 × 30 × (재직일수 / 365) (현행 (2026), high)
  - 근로자퇴직급여 보장법 제8조: at least 30 days of average wage per year of continuous service.
  - sources: https://www.moel.go.kr/retirementpayCal.do , https://casenote.kr/법령/근로기준법/제2조
- **average_wage_definition** = 1일 평균임금 = (퇴직일 이전 3개월 임금총액 + 연간상여금×3/12 + 연차수당×3/12) ÷ 퇴직일 이전 3개월 총 역일수(89~92일) (현행, high)
  - 근로기준법 제2조 ①6. 퇴직일 = the day after the last working day, and the 3 months end the day before 퇴직일. The 연차수당 included is pay for leave that arose in the year before last and went unused in the previous year. Pay for leave that is unused only because of the separation itself is excluded. Periods excluded under 시행령 제2조 (수습, 사용자 귀책 휴업, 출산휴가, 산재요양, 육아휴직, 쟁의, 병역, 승인된 업무외 질병휴업) are removed from both days and wages.
  - sources: https://casenote.kr/법령/근로기준법/제2조 , https://www.moel.go.kr/retirementpayCal.do
- **average_wage_ordinary_wage_floor** = 평균임금 < 통상임금이면 통상임금을 평균임금으로 사용 (현행, high)
  - 근로기준법 제2조 ②. 1일 통상임금 = 통상시급 × 1일 소정근로시간.
  - sources: https://casenote.kr/법령/근로기준법/제2조 , https://www.moel.go.kr/retirementpayCal.do
- **moel_severance_calc_rounding** = 1일 평균임금: 소수 셋째자리에서 올림(0.01원 단위 ceil); 퇴직금: 원 단위 반올림(Math.round) (MOEL calculator as of 2026-10, high)
  - From MOEL's own JS: rounding = myCeil(totalPay/sumday, 2) and reCalcSal = Math.round(calPay*30*termDays/365). termDays = 퇴직일 − 입사일 in days. When there is a 미산입기간, bonus×0.25 and leave×0.25 are scaled by (counted days / total 3-month days). The MOEL example shows 88,641원 31전.
  - sources: https://www.moel.go.kr/assets/calc/js/retire_cal.js , https://www.moel.go.kr/retirementpayCal.do
- **retirement_tax_service_years_deduction** = 근속연수공제: ≤5년 100만×n; 5<n≤10 500만+200만×(n−5); 10<n≤20 1,500만+250만×(n−10); n>20 4,000만+300만×(n−20) (2023-01-01~현행 (2026 귀속 동일), high)
  - 소득세법 제48조 ①1 (법률 제19196호). 근속연수: any period under 1 year counts as 1 year (round up). The deduction is capped at 퇴직소득금액 (제48조 ②). No change for 2026 was found.
  - sources: https://casenote.kr/법령/소득세법/제48조 , https://www.moneynestlab.com/retirement-income-tax/guide/calculation-method
- **retirement_tax_converted_salary_deduction** = 환산급여공제: ≤800만 전액; 800만~7,000만 800만+(초과분×60%); 7,000만~1억 4,520만+(초과분×55%); 1억~3억 6,170만+(초과분×45%); 3억 초과 1억5,170만+(초과분×35%) (2023-01-01~현행, high)
  - sources: https://casenote.kr/법령/소득세법/제48조
- **income_tax_basic_rates_2026** = ≤1,400만 6%; ≤5,000만 84만+15%(초과분) [=15%−126만]; ≤8,800만 624만+24% [=24%−576만]; ≤1.5억 1,536만+35% [=35%−1,544만]; ≤3억 3,706만+38% [=38%−1,994만]; ≤5억 9,406만+40% [=40%−2,594만]; ≤10억 1억7,406만+42% [=42%−3,594만]; >10억 3억8,406만+45% [=45%−6,594만] (2023-01-01~현행 (2026 귀속), high)
  - 소득세법 제55조 ①. The 2026 세제개편안 (Aug 2026) reportedly proposes raising the 8,800만 bracket to 9,200만. That would take effect in 2027 at the earliest, only if the National Assembly passes it, so it does not apply to 2026.
  - sources: https://casenote.kr/법령/소득세법/제55조
- **retirement_tax_yeonbun_yeonseung** = 퇴직소득 산출세액 = (퇴직소득과세표준 × 기본세율) ÷ 12 × 근속연수 (현행, high)
  - 소득세법 제55조 ②. 과세표준 = 환산급여 − 환산급여공제, where 환산급여 = (퇴직소득금액 − 근속연수공제) × 12 ÷ 근속연수. The pre-2016 method was fully phased out by 2020, so 2026 uses only the new method.
  - sources: https://casenote.kr/법령/소득세법/제55조 , https://casenote.kr/법령/소득세법/제14조
- **retirement_local_income_tax** = 퇴직소득세 × 10% (현행, high)
  - sources: https://glasswallet.com/calculate/retirement-tax/calculation-method/ , https://www.moneynestlab.com/retirement-income-tax/guide/calculation-method
- **retirement_tax_rounding** = 중간단계 원 미만 절사; 원천징수(납부) 세액 10원 미만 절사(국고금관리법 제47조); 원천징수세액 1,000원 미만 소액부징수(소득세법 제86조) (현행, medium)
  - No official NTS statement on intermediate rounding was found. The published examples come out to whole won, so the rounding choice does not affect them.
  - sources: https://www.moneynestlab.com/retirement-income-tax
- **annual_leave_under_1yr** = 1개월 개근 시 1일, 최대 11일 (1년 미만 또는 출근율 80% 미만) (현행 (근로기준법 제60조 ②, 2026-08-20 시행본), high)
  - Since the MOEL interpretation of 2021-12-16, each day accrues only if employment continues on the day after the month is completed. Leave from ② expires when the first year of service ends (제60조 ⑦).
  - sources: https://casenote.kr/법령/근로기준법/제60조
- **annual_leave_1yr** = 1년간 80% 이상 출근 시 15일 (현행, high)
  - The 15 days arise only if employment continues on the 366th day (Supreme Court 2021-10-14, MOEL interpretation 2021-12-16). A one-year contract ending at day 365 gets at most 11 days.
  - sources: https://casenote.kr/법령/근로기준법/제60조 , https://mobile.newsis.com/view/NISX20211216_0001690217
- **annual_leave_seniority_addition** = 3년 이상 근속 시 최초 1년 초과 근속연수 매 2년마다 1일 가산, 총 25일 한도 → 연차 = min(25, 15 + floor((근속연수−1)/2)) (현행, high)
  - 제60조 ④. Pending amendment (법률 제21784호, 2026-06-09, in force 2027-06-10) allows taking leave in hourly units. It does not change the number of days.
  - sources: https://casenote.kr/법령/근로기준법/제60조
- **annual_leave_fiscal_year_proration** = 입사연도 다음 회계연도 첫날 비례연차 = 15 × (입사일~회계연도 말일 재직일수) / 365, 퇴직 시 입사일 기준과 비교해 부족분 수당 정산 (행정해석 (근기 68207-620, 2003.5.23 등), medium)
  - Fiscal-year management is allowed only if it is never worse for the worker than the 입사일 basis. Monthly leave under ② accrues separately. Fractions should not be truncated: MOEL recommends granting 1 full day or paying the fraction as allowance. Workplaces with fewer than 5 employees are exempt from 제60조.
  - sources: https://www.bizforms.co.kr/365guide/view.asp?number=142 , https://www.findsemusa.com/labor/consult/consultView.do?qidx=13498
- **unemployment_daily_cap_2026** = 1일 68,100원 (기초일액 상한 113,500원 × 60%) (2026-01-01 시행 (2026년 이직자부터; 종전 66,000원/기초일액 110,000원), high)
  - 고용보험법 시행령 amendment approved by the Cabinet on 2025-12-16. That the cap applies by 이직일 comes from press reports; the 부칙 text was not seen. Monthly (×30) = 2,043,000원.
  - sources: https://www.moel.go.kr/news/enews/report/enewsView.do?news_seq=18736 , https://www.segye.com/newsView/20251216507484 , https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=722&ccfNo=2&cciNo=3&cnpClsNo=2 , https://www.newsis.com/view/NISX20251216_0003442535
- **unemployment_daily_floor_2026** = 1일 66,048원 (10,320 × 8h × 80%) (2026-01-01~2026-12-31 이직자, high)
  - General form: 최저기초일액 = 이직 전 1일 소정근로시간 (cap 8h, actual hours, no 4h minimum since 2023-12-01) × 이직일 당시 시간급 최저임금. 하한 = 최저기초일액 × 80%. Values by hours: 1h 8,256 / 2h 16,512 / 3h 24,768 / 4h 33,024 / 5h 41,280 / 6h 49,536 / 7h 57,792 / 8h 66,048. Monthly (×30, 8h) = 1,981,440원.
  - sources: https://www.segye.com/newsView/20251216507484 , https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=722&ccfNo=2&cciNo=3&cnpClsNo=2
- **unemployment_floor_2027_computed** = 1일 68,480원 (10,700 × 8 × 80%) — 현행 상한 68,100원 초과(역전) (2027-01-01 이후 이직자 (예정), medium)
  - The floor follows the minimum wage automatically. The cap for 2027 is NOT set yet; see the next fact.
  - sources: https://www.asiatoday.co.kr/kn/view.php?key=20260715010005430 , https://www.minimumwage.go.kr/minWage/policy/decisionMain.do
- **unemployment_reform_2027_proposal** = 정부안(2026-09-01 고용보험위원회): 상한 = 하한 × 103% (2027 추정 1일 ≈70,534원), 지급 주7일→주6일(무급휴일 제외, 총액·120~270일 유지), 산정기준 '이직 전 3개월 평균임금'→'1년 평균 월 보수', 실업급여 보험료율 각 0.9%→1.0%(2027) (미확정 (법률·시행령 개정 필요; 정부는 연내 개정 목표), low)
  - As of 2026-10-09 no 입법예고 of a 2027 cap amount was found. The 70,534 figure is my own arithmetic (68,480 × 1.03), not an official number. Reported monthly figures under the proposal: 하한 176만, 상한 181만.
  - sources: https://nocutnews.co.kr/news/6571682 , https://www.segye.com/newsView/20260902501238
- **unemployment_daily_benefit_formula** = 구직급여일액 = 기초일액(평균임금, 통상임금 floor, 상한 113,500원) × 60%; 최저기초일액이 적용되면 × 80%; 결과가 최저구직급여일액보다 낮으면 최저구직급여일액 (2019-10-01~현행, high)
  - 고용보험법 제45조 and 제46조. If insurance status was acquired 2 or more times within the 3 months before separation, 기초일액 = 3-month wages ÷ days. Total = 구직급여일액 × 소정급여일수. Benefits are paid within 12 months from the day after 이직일. The first 7 days after the unemployment report are an unpaid waiting period.
  - sources: https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=722&ccfNo=2&cciNo=3&cnpClsNo=2
- **unemployment_eligibility** = 이직일 이전 18개월(기준기간) 중 피보험단위기간 합산 180일 이상 + 비자발적 이직(정당한 사유 포함) + 근로의사·능력 있으나 미취업 + 재취업 노력 (현행, high)
  - 피보험단위기간 counts days that were the basis of wage payment, including paid holidays (unpaid weekends do not count). The base period is extended for 30 or more consecutive unpaid days (illness, leave, etc.), up to 3 years. Special rule for 초단시간 workers (under 15h/week and 2 days or fewer/week): 24 months instead of 18.
  - sources: https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=722&ccfNo=2&cciNo=1&cnpClsNo=1
- **unemployment_benefit_days_table** = 50세 미만: <1년 120 / 1~3년 150 / 3~5년 180 / 5~10년 210 / ≥10년 240일; 50세 이상·장애인: 120 / 180 / 210 / 240 / 270일 (2019-10-01~현행, high)
  - 고용보험법 제50조 ① 별표1. Age and 피보험기간 are taken as of 이직일. The 2027 proposal keeps these day counts.
  - sources: https://easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=722&ccfNo=2&cciNo=3&cnpClsNo=1 , https://wikidocs.net/blog/@Insight_Lab/32020/

## Formulas

```
// ===== 1. 최저임금 =====
MW = {2025:10030, 2026:10320, 2027:10700}            // 원/시간, effective Jan 1 - Dec 31
daily8h(y)  = MW[y]*8                                 // 2026: 82,560; 2027: 85,600
monthly(y)  = MW[y]*209                               // 2026: 2,156,880; 2027: 2,236,300
// Monthly hours: 209h ONLY for 주 40시간 + 주휴 8시간 ((40 + 8) * 365/7/12 = 208.57 -> 고시 209).
// Every other schedule: exact decimal (weeklyHrs + weeklyHolidayHrs) * 365/7/12 for pay (no rounding rule in
//   최저임금법 시행령 제5조①3), displayed to 0.01h; pay = round(MW * exactHours) to the won.
//   2026: 15h -> 78.2142…h (shown 78.21) -> 807,171원; 20h -> 104.2857…h (shown 104.29) -> 1,076,229원
probation(y) = MW[y]*0.9                              // 2026: 9,288; 2027: 9,630 (strict conditions apply)
overtime_min(y) = MW[y]*1.5                           // 2026: 15,480

// ===== 2. 주휴수당 (근로기준법 제55조, 시행령 제30조, 제18조③) =====
avgWeekly = sum(scheduled hours over 4 weeks, or the shorter period worked) / weeks
if avgWeekly < 15 or not 개근(all scheduled days of the week): juhyu = 0
else juhyu = (min(avgWeekly,40) / 40) * 8 * hourlyWage   // at most 8 hours' pay
// Official equivalent: (4-week scheduled hours / full-time workers' 4-week scheduled days [20]) * hourlyWage
// Display: round to whole won (all values with integer hours come out exact)

// ===== 3. 퇴직금 (근로자퇴직급여 보장법 제4조, 제8조; 근로기준법 제2조) =====
// 퇴직일 = the day AFTER the last working day
eligible = (퇴직일 - 입사일 >= 1 year) and (4-week avg weekly scheduled hours >= 15)
termDays = days(퇴직일 - 입사일) - 근무제외기간 days
period   = [퇴직일 - 3 calendar months, 퇴직일 - 1 day]          // 89..92 days
D        = days(period) - 미산입기간 days                        // 미산입: 시행령 제2조 exclusions
W        = wages paid for days in the period (기본급 + 수당, 세전), excluding wages for 미산입 days
B        = (bonuses paid in the 12 months before 퇴직) * 3/12
L        = (연차수당 paid for leave from the year before last, unused last year) * 3/12
           // pay for leave left unused because of the separation is NOT included
if 미산입 exists: B *= D/days(period); L *= D/days(period)        // MOEL calculator behaviour
avgDaily = ceil((W + B + L) / D, 2 decimals)                      // MOEL: ceil at 0.01원
ordDaily = 통상시급 * 1일 소정근로시간
baseDaily = max(avgDaily, ordDaily)                               // 근로기준법 제2조②
severance = round(baseDaily * 30 * termDays / 365)                // MOEL: Math.round to 1원

// ===== 3b. 퇴직소득세 (소득세법 제14조⑥, 제48조, 제55조②) - 2026 =====
I  = 퇴직급여 - 비과세                                          // 퇴직소득금액
n  = ceil(근속기간 in years)   // any part-year counts as 1 year. Practice: months (a partial month counts as 1), then n = ceil(months/12)
SD = n<=5 ? 1,000,000*n
   : n<=10 ? 5,000,000 + 2,000,000*(n-5)
   : n<=20 ? 15,000,000 + 2,500,000*(n-10)
   :          40,000,000 + 3,000,000*(n-20)
SD = min(SD, I)
C  = floor((I - SD) * 12 / n)                                    // 환산급여
CD = C<=8e6 ? C
   : C<=7e7 ? 8e6 + (C-8e6)*0.60
   : C<=1e8 ? 45.2e6 + (C-7e7)*0.55
   : C<=3e8 ? 61.7e6 + (C-1e8)*0.45
   :          151.7e6 + (C-3e8)*0.35
CD = floor(CD)
T  = max(0, C - CD)                                               // 퇴직소득과세표준 (환산)
taxConv = floor(basicRate(T))                                     // 환산산출세액
  basicRate(T): T<=14e6: T*0.06 | <=50e6: T*0.15-1.26e6 | <=88e6: T*0.24-5.76e6 | <=150e6: T*0.35-15.44e6
              | <=300e6: T*0.38-19.94e6 | <=500e6: T*0.40-25.94e6 | <=1e9: T*0.42-35.94e6 | else T*0.45-65.94e6
tax   = floor(taxConv * n / 12)                                   // 퇴직소득 산출세액 (연분연승)
taxW  = floor(tax/10)*10                                          // 10원 미만 절사 at withholding (medium confidence)
local = floor(taxW*0.10/10)*10                                    // 지방소득세 10%
if taxW < 1,000: taxW = 0 (소액부징수)
total = taxW + local

// ===== 4. 연차유급휴가 (근로기준법 제60조) =====
// Excluded: workplaces with fewer than 5 employees; workers averaging under 15h/week (제18조③)
// (a) Under 1 year, or under 80% attendance: +1 day for each fully attended month, max 11.
//     A day accrues only if employment continues on the day after the month ends.
// (b) Completed years k (employment continues on day 365k+1) with >=80% attendance:
//     days(k) = min(25, 15 + floor((k-1)/2))   // k=1,2:15  k=3,4:16  k=5:17 ... k>=21:25
// (c) Fiscal-year basis (e.g. Jan 1):
//     At the first FY start after hire: prorated = 15 * daysEmployedInHireYear / 365
//       daysEmployedInHireYear = (FY end - hire date) + 1, both days inclusive
//     Do not truncate the fraction: round up or pay the fraction (MOEL recommendation). Show 2 decimals.
//     Plus the separate monthly leave from (a) until the first anniversary.
//     From the next FY: 15 days, plus (b) additions counted by FY.
//     At separation: recompute on the hire-date basis; if FY basis gave fewer days, pay the difference.
// 연차수당 = 1일 통상임금 * 미사용일수

// ===== 5. 실업급여 (구직급여) - 고용보험법 제40·45·46·50조 =====
eligible = 피보험단위기간 within 18 months before 이직일 >= 180 days
           // 24 months for 초단시간: under 15h/week and 2 days or fewer/week
           && involuntary separation (or a recognised 정당한 사유) && able and willing to work
h   = min(8, 1일 소정근로시간 as stated in 이직확인서)            // actual hours, no 4h minimum since 2023-12-01
mwY = minimum wage of the year containing 이직일
minBase = h * mwY                                                 // 최저기초일액
base = max(avgWage3m, ordinaryWageDaily)                          // 기초일액
base = min(base, 113,500)                                         // cap for 이직일 >= 2026-01-01 (110,000 before)
if base < minBase: daily = minBase * 0.8
else daily = base * 0.6
floor80 = minBase * 0.8                                            // 2026, 8h: 66,048
daily = max(daily, floor80)
daily = floor(daily)                                               // 원 미만 절사 (practice; not verified)
// Resulting range for 2026, 8h: 66,048 <= daily <= 68,100
days = table[age>=50 || disabled][insuredYearsBucket]
   // <50:  [<1y:120, 1-3y:150, 3-5y:180, 5-10y:210, >=10y:240]
   // >=50 or disabled: [120,180,210,240,270]
total = daily * days    // paid within 12 months of the day after 이직일; first 7 days are an unpaid wait
// 2027 이직 (pending): floor80 = 68,480 > the current cap 68,100. Flag this: the proposed cap = floor80 * 1.03 (~70,534) is not enacted.
// Under current law the floor wins, so daily >= 68,480 for 8h workers.
```

## Test vectors
- 최저임금 월환산 2026: 10,320원 × 209h => 2,156,880원 [https://www.minimumwage.go.kr/minWage/policy/decisionMain.do]
- 최저임금 월환산 2027: 10,700원 × 209h => 2,236,300원 (일급 85,600원) [https://www.minimumwage.go.kr/minWage/policy/decisionMain.do]
- 최저임금 2025: 10,030원 × 209h => 2,096,270원 [https://www.minimumwage.go.kr/minWage/policy/decisionMain.do]
- 주휴수당 2026, 주 40h, 시급 10,320, 개근 => 82,560원/주 [formula: 40/40×8×10,320 (bokjiro MOEL card news formula)]
- 주휴수당 2026, 주 20h, 시급 10,320, 개근 => 41,280원/주 [formula; matches the example structure in https://wikidocs.net/blog/@mythos/21366/]
- 주휴수당 2026, 주 15h (5일×3h), 시급 10,320, 개근 => 30,960원/주 (eligible, exactly 15h) [https://www.bokjiro.go.kr/ssis-tbu/cms/pc/news/promotion/1307833_1118.html (5일×3h=15h eligible) + formula]
- 주휴수당 2026, 주 30h (5일×6h), 시급 10,320 => 61,920원/주 [formula: 120h/20일=6h × 10,320]
- 주휴수당, 주 14h => 0원 (15h 미만) [근로기준법 제18조③ https://casenote.kr/법령/근로기준법/제18조]
- 주휴수당 2027, 주 40h, 시급 10,700 => 85,600원/주; 주 15h → 32,100원; 주 20h → 42,800원 [formula]
- 주휴수당 example: 4주 소정 60h, 통상근로자 20일, 시급 10,000 => 30,000원 [https://www.bokjiro.go.kr/ssis-tbu/cms/pc/news/promotion/1307833_1118.html]
- 퇴직금 MOEL 예제: 입사 2014-10-02, 퇴직일 2017-09-16 (재직 1,080일), 3개월(2017-06-16~09-15, 92일) 임금 7,080,000, 연간상여 4,000,000, 연차수당 300,000 (60,000×5일) => 1일 평균임금 88,641.31원 (MOEL page: 88,641원 31전); 퇴직금 7,868,434원 (MOEL calculator logic: round(88,641.31×30×1080/365)) [https://www.moel.go.kr/retirementpayCal.do + https://www.moel.go.kr/assets/calc/js/retire_cal.js]
- 퇴직금: 3개월 임금 9,000,000, 92일, 상여/연차 0, 재직 1,095일 => 평균임금 97,826.09원, 퇴직금 8,804,348원 [computed with MOEL calculator rounding (ceil 0.01, round 1원)]
- 퇴직금: 3개월 임금 6,000,000, 92일, 재직 365일 => 평균임금 65,217.40원, 퇴직금 1,956,522원 [computed with MOEL calculator rounding]
- 퇴직금 통상임금 floor: 3개월 5,400,000/90일 = 평균 60,000; 통상일급 82,560 (10,320×8); 재직 730일 => 82,560 사용 → 퇴직금 4,953,600원 [근로기준법 제2조② + MOEL calculator logic]
- 퇴직금: 3개월 임금 10,500,000, 92일, 연간상여 6,000,000, 재직 1,826일 => 평균임금 130,434.79원, 퇴직금 19,575,939원 [computed with MOEL calculator rounding]
- 퇴직금 재직 364일 또는 주 14h => 지급 의무 없음 (0원) [https://casenote.kr/법령/근로자퇴직급여_보장법/제4조]
- 퇴직소득세: 퇴직급여 5,000만, 근속 10년 => 근속연수공제 1,500만, 환산급여 4,200만, 환산급여공제 2,840만, 과표 1,360만, 환산산출세액 816,000, 퇴직소득세 680,000, 지방세 68,000, 합계 748,000원 [https://glasswallet.com/calculate/retirement-tax/calculation-method/ (recomputed identically)]
- 퇴직소득세: 퇴직급여 1억, 근속 10년 => 환산급여 1억200만, 환산급여공제 6,260만, 과표 3,940만, 환산산출세액 4,650,000, 퇴직소득세 3,875,000, 지방세 387,500, 합계 4,262,500원 [https://www.moneynestlab.com/retirement-income-tax/guide/calculation-method]
- 퇴직소득세: 1억/20년, 1억/30년 => 1,232,000원 (소득세 1,120,000 + 지방 112,000); 264,000원 (240,000 + 24,000) [moneynestlab summary table (123만, 26만) + own recomputation]
- 퇴직소득세: 2억/10년, 2억/20년, 2억/30년 => 19,662,500 / 7,727,500 / 3,795,000원 (합계, 지방세 포함) [moneynestlab summary (1,966만/773만/380만) + glasswallet (1억 10년 ≈426만, 2억 ≈1,966만)]
- 퇴직소득세: 3억/10년, 3억/20년, 3억/30년 => 42,889,000 / 19,844,000 / 10,848,750원 (합계) [moneynestlab summary (4,289만/1,984만/1,085만) + recomputation]
- 퇴직소득세: 3,000만/10년; 5,000만/20년 => 220,000원 (200,000+20,000); 0원 [glasswallet (≈22만) / moneynestlab (0원) + recomputation]
- 퇴직소득세: 5억/10년 => 환산산출세액 106,700,000; 산출세액 88,916,666 → 10원 절사 88,916,660; 지방세 8,891,660; 합계 97,808,320원 [glasswallet (≈9,780만) + recomputation with 10원 절사]
- 퇴직소득세: 퇴직급여 7,868,434원 (MOEL 예제), 근속 3년 (35개월+14일 → 36개월 → 3년) => 환산급여 19,473,736; 공제 14,884,241; 과표 4,589,495; 환산산출세액 275,369; 산출 68,842 → 68,840; 지방세 6,880; 합계 75,720원 [own computation per 소득세법 제48·55조 (rounding medium confidence)]
- 연차: 근속 완료연수 k=1,2,3,4,5,10,11,15,19,21,25 (80% 이상 출근) => 15,15,16,16,17,19,20,22,24,25,25일 [근로기준법 제60조①④ https://casenote.kr/법령/근로기준법/제60조]
- 연차: 입사 2026-01-02, 개근, 2026-12-02 시점 / 2027-01-02 재직 중 => 월차 11일 / 2027-01-02에 15일 추가 발생 [근로기준법 제60조② + MOEL 2021-12-16 interpretation]
- 연차: 1년 계약직 365일 근무 후 계약 종료 (개근) => 최대 11일 (15일 미발생) [https://mobile.newsis.com/view/NISX20211216_0001690217]
- 연차 회계연도(1/1) 기준: 입사 2026-07-01 → 2026 재직 184일 => 2027-01-01 비례연차 15×184/365 = 7.56일 (+ 별도 월차); 2028-01-01 15일 [formula per 행정해석 (근기 68207-620); example method in https://www.bizforms.co.kr/365guide/view.asp?number=142]
- 연차 회계연도 기준: 입사 2026-03-02 → 재직 305일 => 15×305/365 = 12.53일 [formula]
- 구직급여 2026 이직: 기초일액 150,000 (8h), 45세, 피보험 4년 => 기초일액 상한 113,500 → 일액 68,100원 × 180일 = 12,258,000원 [easylaw (상한 113,500/68,100, 별표1)]
- 구직급여 2026 이직: 기초일액 100,000 (8h), 52세, 피보험 12년 => 60,000 < 66,048 → 66,048원 × 270일 = 17,832,960원 [easylaw + 별표1]
- 구직급여 2026 이직: 기초일액 112,000 (8h), 30세, 피보험 2년 => 67,200원 × 150일 = 10,080,000원 [formula]
- 구직급여 2026 이직: 1일 소정 4h, 기초일액 45,000, 25세, 피보험 10개월 (180일 이상 충족 가정) => 27,000 < 하한 33,024 (10,320×4×0.8) → 33,024원 × 120일 = 3,962,880원 [formula; 하한 by hours per https://policy.ambitstock.com/posts/unemployment-benefit-amount-parttime-hours-floor-prescribed-hours-2026/ (corrected 4h value)]
- 구직급여 2026 이직: 장애인 35세, 피보험 6년, 기초일액 90,000 (8h) => 54,000 → 66,048원 × 240일 = 15,851,520원 [별표1 (장애인 row) + formula]
- 구직급여 2026 월 환산 (30일) => 하한 1,981,440원 (≈198만), 상한 2,043,000원 (204만3천원) [https://www.segye.com/newsView/20251216507484, https://nocutnews.co.kr/news/6571682]
- 구직급여 하한 2027 이직 (8h, 10,700원) => 68,480원/일 (현행 상한 68,100원보다 380원 높음; 상한 미확정) [https://www.asiatoday.co.kr/kn/view.php?key=20260715010005430]
- 구직급여 하한 2026 by 1일 소정근로시간 1~8h => 8,256 / 16,512 / 24,768 / 33,024 / 41,280 / 49,536 / 57,792 / 66,048원 [10,320 × h × 0.8]

## Caveats

Every task item was researched. Here is what is only medium or low confidence, and what is pending:

1. **Minimum wage.** The 2026 rate (10,320) and the 2027 rate (10,700) are confirmed by the official Minimum Wage Commission table at minimumwage.go.kr and by news reports. The 2027 rate was decided 2026-07-14 and published 2026-08-05. I did not confirm the 고시 number "제2026-60호", which appears only in a blog.

2. **Unemployment benefit cap.**
   - **2026:** The cap of 68,100 (기초일액 cap 113,500) is confirmed by MOEL's 2025-12-16 press release and by easylaw. News says it applies from 2026-01-01, by 이직일. I could not read the 부칙 text.
   - **2027:** The cap is NOT set. The 2027 floor of 68,480 is higher than the current cap of 68,100. On 2026-09-01 the government proposed tying the cap to 103% of the floor (about 70,534, my arithmetic), paying 6 days a week instead of 7, and basing the benefit on 1-year average pay. That needs law and decree changes, and no 입법예고 was found as of 2026-10-09.
   - **Calculator advice:** for 이직일 on or after 2027-01-01, show a "미확정" notice. Under the current formula the floor wins, so daily is at least 68,480 for an 8h worker. Re-check MOEL press releases in Nov-Dec 2026.

3. **Unemployment benefit rounding.** No official rule was found for rounding 구직급여일액 below 1원. I used 원 미만 절사. An old EI mobile calculator for the self-employed applied a 10원 floor, but it is outdated. Every floor value with integer hours comes out to an exact won amount.

4. **1일 소정근로시간 for the floor.** Use the hours on the 이직확인서, capped at 8. The 3h→4h minimum was abolished on 2023-12-01. I could not find the exact way averaged hours are computed for irregular schedules; sources disagree.

5. **Severance rounding.** This comes straight from MOEL's own calculator code (retire_cal.js): the daily average is rounded up to 0.01원, and the final amount is rounded to the nearest won. The law itself has no rounding rule, and company rules may round differently.

6. **Retirement income tax.**
   - The tables are from 소득세법 제48·55조 (in force since 2023-01-01). I found no change for the 2026 tax year.
   - The 2026 tax reform proposal reportedly raises the 8,800만 bracket to 9,200만. It is unverified, would apply to 2027 at the earliest, and needs the National Assembly to pass it.
   - Rounding (truncate below 1원 at intermediate steps, cut 10원 units at withholding, no tax under 1,000원) is standard practice, but I found no NTS document stating it, so confidence is medium. The published examples are whole-won amounts, so they cannot reveal rounding differences.
   - 근속연수 is rounded up to whole years. Some private sites (glasswallet) wrongly use fractional years.
   - The 2026 change on 퇴직소득 (a 50% cut when a pension is drawn for more than 20 years) only affects pension withdrawals, not the lump-sum tax.

7. **Annual leave on a fiscal-year basis.** The proration (15 × days employed / 365) comes from MOEL 행정해석, not the statute. The rule for handling fractions (round up to a whole day, or pay the fraction) is a recommendation. Counting days of employment can differ by one day depending on whether both ends are included; one 2021 example used 185 days for a 07-01 hire where an inclusive count gives 184.

8. **Pending law changes.**
   - An amendment (법률 제21784호) lets workers take annual leave in hourly units from 2027-06-10. The number of days is unchanged.
   - Extending 주휴수당 and 연차 to workers under 15h/week is a government plan with law changes from 2027. It is not law as of 2026-10.
   - Changing employment insurance coverage from an hours basis to a pay basis (월 보수 80만원) is planned for 2027-01-01.
   - easylaw mentions a 고용보험법 version in force 2026-11-27. I could not find its content; it may not affect these numbers.

9. **Sources not read directly.** law.go.kr pages render with JavaScript and could not be fetched. I quoted statute text through casenote.kr mirrors instead: 근로기준법 제2·18·55·60조, 근퇴법 제4조, and 소득세법 제14·48·55조.
