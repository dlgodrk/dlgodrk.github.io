# 2026 근로소득 간이세액표 (소득세법 시행령 별표2, 2026.2.27 개정): how to reproduce it in code, verified against all 7,117 cells of the official table

_Researched 2026-10-09 by a research agent with web sources; see source URLs per fact._

## Facts
- **simplified_tax_table_current_version_2026** = 소득세법 시행령 [별표 2] 근로소득 간이세액표 <개정 2026. 2. 27.> (대통령령 제36129호). It applies to withholding on pay given on or after 2026-03-01. The law.go.kr 별표 page for the latest 시행령 (시행 2026.10.1, 대통령령 제36737호, 2026.9.30) still serves the PDF headed '<개정 2026. 2. 27.>', so the table had no further revision as of 2026-10-09. (2026-03-01~(current as of 2026-10-09), high)
  - The PDF was taken from law.go.kr (pdfFlSeq=169798151 on the current 별표 page) and its header was read directly. samili.com lists the same revision: 2026.02.27 대통령령 제36129호, applying from 2026-03-01; the previous revision was 2024.02.29 대통령령 제34265호.
  - sources: https://www.law.go.kr/LSW/lsBylInfoPLinkR.do?lsNm=%EC%86%8C%EB%93%9D%EC%84%B8%EB%B2%95+%EC%8B%9C%ED%96%89%EB%A0%B9&bylNo=0002&bylBrNo=00&bylCls=BE , https://www.law.go.kr/LSW/flDownload.do?flSeq=169798151 , https://www.samili.com/tax/Jaryosil/TaxRate.asp , https://incometax.calculate.co.kr/earned-income-tax-calculator
- **simplified_tax_table_body_unchanged_since_2024_02_29** = The 2026.2.27 revision changed only note 3 (the 8–20세 child amounts). The salary/family body is byte-identical to the 2024.2.29 table: 647 rows × 11 family columns, from 770천원 through the single 10,000천원 row, and the same >10,000천원 formulas. (2024-03-01~ (body); 2026-03-01~ (child amounts), high)
  - Text was extracted from both PDFs with pdftotext and diffed. The only differing lines are the header date and note 3 가/나/다.
  - sources: https://www.law.go.kr/LSW/flDownload.do?flSeq=169798151 , https://mdc.mnd.go.kr/sites/fmc/files/files03.pdf
- **child_deduction_8_to_20_monthly_2026** = Subtract from the table amount: 1 child aged 8–20 → 20,830원; 2 children → 45,830원; 3 or more → 45,830원 + 33,330원 per child beyond 2 (3 = 79,160원, 4 = 112,490원). If the result is negative, the tax is 0원. (2026-03-01~, high)
  - These equal the annual 자녀세액공제 (25만 / 55만 / +40만 per extra child, raised for 2025 income) divided by 12 and cut to 10원. The children are ALSO counted in 공제대상가족 수. The pre-2024 method of adding the child count to the family count is obsolete; incometax.calculate.co.kr's 적용방법 page still describes it, but it is wrong for 2026.
  - sources: https://www.law.go.kr/LSW/flDownload.do?flSeq=169798151 , https://www.samili.com/tax/Jaryosil/TaxRate.asp , https://incometax.calculate.co.kr/earned-income-tax-calculator
- **child_deduction_8_to_20_monthly_before_2026_03** = For pay before 2026-03-01: 12,500원 for 1 child, 29,160원 for 2, and 29,160원 + 25,000원 per child beyond 2. (2024-02-29~2026-02-28, high)
  - Use these only for Jan–Feb 2026 pay. Many blogs and calculators (e.g. glasswallet.com) still show these old amounts.
  - sources: https://mdc.mnd.go.kr/sites/fmc/files/files03.pdf
- **table_salary_brackets** = Monthly pay (월급여액, 천원, excluding 비과세 and 학자금), with each bracket running from its lower bound (이상) up to but excluding its upper bound (미만): 770~1,500 in 5천원 steps; 1,500~3,000 in 10천원 steps; 3,000~10,000 in 20천원 steps; then one row for exactly 10,000천원. Below 770천원 the tax is 0. The first non-zero cells are: family 1 at 1,060~1,065 (1,040원), family 2 at 1,340~1,345 (1,060원), family 3 at 1,720~1,730, family 11 at 3,040~3,060. (2024-03-01~, high)
  - Parsed from the official PDF: 647 contiguous rows. The smallest positive cell anywhere is 1,030원, which shows the 1,000원 소액부징수 floor is built into the table.
  - sources: https://www.law.go.kr/LSW/flDownload.do?flSeq=169798151
- **special_deduction_formula_in_table** = For 총급여 G and family n: n=1: 310만 + G×4% (G≤3천만); 310만 + G×4% − (G−3천만)×5% (3천만<G≤4천5백만); 310만 + G×1.5% (≤7천만); 310만 + G×0.5% (≤1억2천만). n=2: 360만 with the same steps at 4% / 4%−5% / 2% / 1%. n≥3: 500만 with 7% / 7%−5% / 5% / 3%, PLUS (G − 4천만)×4% whenever G > 4천만. This combined amount is deducted from income. (2024-03-01~, high)
  - Read from the rendered PDF page 1 (note 1). The '+4,000만원 초과 금액의 4%' cell spans all four rows of the 3명 이상 column only. Secondary sites garble where this term sits.
  - sources: https://www.law.go.kr/LSW/flDownload.do?flSeq=169798151 , https://incometax.calculate.co.kr/earned-income-tax-calculator/earned-income-tax-outline
- **annual_gross_from_bracket_midpoint** = 총급여 G = (midpoint of the monthly bracket in 원) × 12; for the 10,000천원 row, G = 120,000,000. (2024-03-01~, high)
  - Confirmed by exact reproduction of every cell. Example: the 3,500~3,520 row uses 3,510,000×12 = 42,120,000.
  - sources: https://incometax.calculate.co.kr/earned-income-tax-calculator/earned-income-tax-apply
- **earned_income_deduction_used_in_table** = 근로소득공제 (소득세법 §47): G≤500만 → 70%; ≤1,500만 → 350만 + (G−500만)×40%; ≤4,500만 → 750만 + (G−1,500만)×15%; ≤1억 → 1,200만 + (G−4,500만)×5%; above that → 1,475만 + (G−1억)×2%; capped at 2,000만. (2020~ (current law), high)
  - Part of the model that reproduces 7,117/7,117 cells. The 2,000만 cap never binds inside the table, which stops at G = 1.2억.
  - sources: https://www.law.go.kr/LSW/flDownload.do?flSeq=169798151
- **personal_deduction_in_table** = 기본공제 1,500,000원 × 공제대상가족 수 n (self and spouse each count as 1). (2024-03-01~, high)
  - Note 2 of the 별표. The table does not apply 추가공제 or a separate 표준세액공제; the model without them matches every cell.
  - sources: https://www.law.go.kr/LSW/flDownload.do?flSeq=169798151
- **pension_deduction_embedded_in_table** = 연금보험료공제 = floor10( clamp(floor(M/1000)×1000, 290,000, 4,490,000) × 4.5% ) × 12, where M is the bracket midpoint. The table uses a 4.5% employee rate with the 2017.7–2018.6 국민연금 기준소득월액 cap of 4,490,000; the floor of 290,000 never matters. (embedded in table body 2024-03-01~ (still in 2026), medium)
  - Reverse-engineered, not published. With these parameters the model matches all 7,117 cells. Caps of 4,340,000 / 4,680,000 / 5,900,000 give 3,000+ mismatches, and dropping the 천원 truncation of 기준소得월액 gives 7. The table does NOT use the real 2026 국민연금 rate (4.75% employee share) or the 2026 cap, so payroll's actual pension figure is irrelevant to 간이세액. Confidence is 'high' for reproducing the table and 'medium' only because it is undocumented.
  - sources: https://www.law.go.kr/LSW/flDownload.do?flSeq=169798151
- **tax_rates_used_in_table** = 기본세율 (2023 and later): ≤1,400만 6%; ≤5,000만 84만 + 15%; ≤8,800만 624만 + 24%; ≤1.5억 1,536만 + 35%; ≤3억 3,706만 + 38%; ≤5억 9,406만 + 40%; ≤10억 1억7,406만 + 42%; above 10억 3억8,406만 + 45%. (2023-01-01~, high)
  - Part of the exact-fit model. Inside the table body the taxable base never exceeds the 24% bracket.
  - sources: https://www.law.go.kr/LSW/flDownload.do?flSeq=169798151
- **earned_income_tax_credit_embedded_in_table** = Credit = 산출세액 C × 55% if C ≤ 500,000; otherwise 275,000 + (C − 500,000) × 30%. Limit: G ≤ 5,500만 → 660,000; G ≤ 7,000만 → max(630,000, 660,000 − (G−5,500만)/2); above that → max(500,000, 630,000 − (G−7,000만)/2). (embedded in table body 2024-03-01~ (still in 2026), medium)
  - Reverse-engineered: it fits every cell. Current 소득세법 §59 instead uses a 130만 threshold and 74만 / 66만 / 50만 / 20만 limits. With the current-law credit the model gives 693–3,800 mismatches, so the table deliberately keeps these older parameters. Use the embedded version only to reproduce the table, never for 연말정산.
  - sources: https://www.law.go.kr/LSW/flDownload.do?flSeq=169798151 , https://www.law.go.kr/법령/소득세법/제59조
- **monthly_cell_rounding_and_min** = Cell = floor((결정세액 / 12) to 10원), where 결정세액 = max(산출세액 − credit, 0); a cell below 1,000원 is shown as '-' (0). (2024-03-01~, high)
  - Checked with exact rational arithmetic: 0 mismatches. Many cells land exactly on a multiple of 10 (e.g. family 1, 3,760~5,820천원), so float code needs integer math or a small epsilon (1e-7) before floor. The nearest non-integer fraction is 0.001 of a 10원 unit. The 1,000원 rule is 소득세법 §86(1) 소액부징수: 원천징수세액이 1천원 미만이면 징수하지 않음.
  - sources: https://www.law.go.kr/LSW/flDownload.do?flSeq=169798151 , https://www.law.go.kr/법령/소득세법/제86조
- **over_10m_monthly_formulas** = For 월급여 W above 10,000천원 the base is T10 (the family's 10,000천원 row): W ≤ 14,000천원 → T10 + (W − 10,000,000)×98%×35% + 25,000; W ≤ 28,000천원 → T10 + 1,397,000 + (W − 14,000,000)×98%×38%; W ≤ 30,000천원 → T10 + 6,610,600 + (W − 28,000,000)×98%×40%; W ≤ 45,000천원 → T10 + 7,394,600 + (W − 30,000,000)×40%; W ≤ 87,000천원 → T10 + 13,394,600 + (W − 45,000,000)×42%; above 87,000천원 → T10 + 31,034,600 + (W − 87,000,000)×45%. (2024-03-01~, high)
  - Read from the rendered last page of the official PDF. The constants chain continuously (1,397,000 = 4,000,000×0.98×0.35 + 25,000, and so on). The 10,000천원 row values are 1,507,400 / 1,431,570 / 1,200,840 / 1,170,840 / 1,140,840 / 1,110,840 / 1,080,840 / 1,050,840 / 1,020,840 / 990,840 / 960,840 for families 1–11.
  - sources: https://www.law.go.kr/LSW/flDownload.do?flSeq=169798151 , https://mdc.mnd.go.kr/sites/fmc/files/files03.pdf
- **over_10m_rounding** = The 별표 sets no rounding for the >10M formulas. Recommended: 10원 미만 절사 (floor to 10원) of the final amount. (2026, medium)
  - 국고금관리법 §47①: 10원 미만 끝수는 계산하지 아니함. devcomma's calculator states it floors both 소득세 and 지방소득세 to 10원. I could not reach the Hometax calculator to confirm.
  - sources: https://www.law.go.kr/법령/국고금관리법/제47조 , https://tools.devcomma.com/calculators/earned-income-tax
- **family_over_11_rule** = For more than 11 family members: tax(11) − (tax(10) − tax(11)) × (n − 11). (2024-03-01~, high)
  - Note 4 of the 별표. The result can go negative; floor it at 0.
  - sources: https://www.law.go.kr/LSW/flDownload.do?flSeq=169798151 , https://www.samili.com/tax/Jaryosil/TaxRate.asp
- **withholding_ratio_80_100_120** = The default is 100% of the 해당란 세액. At the employee's request the employer withholds 120% or 80% instead (시행령 §194①). The employee files a 소득세 원천징수세액 조정신청서 (or states the ratio on the 소득·세액공제신고서), and the ratio applies from the next pay through 31 December of that year. (2015-07-01~ (current, ③ amended 2025.12.30), high)
  - Order and rounding: the child-adjusted amount is the 해당란 세액 under note 3, so apply the ratio after the child deduction, then floor to 10원. devcomma applies the ratio after the child deduction. The 10원 floor follows 국고금관리법 §47 and is medium confidence. §194② (종된 근무지): treat the employee as having only 본인 기본공제 and 표준세액공제, i.e. use the 1-person column.
  - sources: https://www.law.go.kr/법령/소득세법시행령/제194조
- **local_income_tax_withholding** = 개인지방소득세 특별징수 = 원천징수 소득세 × 10%, floored to 10원. (current, high)
  - The 10% comes from 지방세법 §103-13①, computed on the 소득세 actually withheld (after the child deduction and the 80/120% ratio). The 10원 floor comes from 국고금관리법 §47③, which lets 지방자치단체 apply the same rule, and matches common payroll practice; treat the floor as medium confidence.
  - sources: https://www.law.go.kr/법령/지방세법/제103조의13 , https://www.law.go.kr/법령/국고금관리법/제47조
- **monthly_pay_definition** = 월급여액 = monthly pay excluding 비과세소득 and excluding any 학자금 treated as 근로소득 (note 5 lets the employer exclude 학자금). The lookup uses this taxable monthly amount, not gross pay. (2024-03-01~, high)
  - Example: 350만 gross with 20만 비과세 식대 → look up 330만.
  - sources: https://www.law.go.kr/LSW/flDownload.do?flSeq=169798151
- **child_eligibility_8_20** = Count only 공제대상가족 children aged 8–20. A child with 연간 소득금액 over 100만원 is excluded. (2024-03-01~, medium)
  - The 별표 says only '8세 이상 20세 이하 자녀'; the income limit comes from the 기본공제 requirement as explained by secondary sites. incometax.calculate.co.kr's form label says '7세 이상', which contradicts the 별표's 8세.
  - sources: https://incometax.calculate.co.kr/earned-income-tax-calculator , https://www.samili.com/tax/Jaryosil/TaxRate.asp

## Formulas

```
// Inputs: W = 월급여액 in 원 (excluding 비과세 and 학자금), n = 공제대상가족 수 including self (≥1),
//         k = children aged 8–20 (counted inside n), ratio ∈ {0.8, 1.0, 1.2}
// Verified: tableCell() reproduces all 647×11 = 7,117 official cells (2026.2.27 별표2) with 0 mismatches.
// Also checked at each bracket's lower bound, midpoint and upper−1, in Python (exact rationals) and JS (doubles).

floor10(x) = floor(x/10 + 1e-7) * 10          // the epsilon protects cells that land exactly on 10원 multiples

// 1) Bracket midpoint (천원 brackets, 이상~미만)
bracketMid(W):
  kk = floor(W / 1000)                        // 천원
  if kk < 1500: start=770,  width=5
  elif kk < 3000: start=1500, width=10
  else:            start=3000, width=20
  lo = start + floor((kk - start)/width)*width
  return (lo + width/2) * 1000                // 원 (may end in 500)

// 2) One table cell (M = midpoint in 원; the 10,000천원 row uses M = 10,000,000)
tableCell(M, n):
  G = 12*M
  E = earnedDed(G)          // 70% / 350만+40% / 750만+15% / 1200만+5% / 1475만+2%; cap 2000만
  base = clamp(floor(M/1000)*1000, 290000, 4490000)
  P = floor(base*0.045/10)*10 * 12            // embedded pension: 4.5%, 10원 truncation, ×12
  S = special(G, n)                           // see below
  T = max(G - E - 1_500_000*n - P - S, 0)
  C = basicTax(T)                             // 6/15/24/35/38/40/42/45% with 1,400만/5,000만/8,800만/1.5억/3억/5억/10억 brackets
  credit = (C <= 500000) ? C*0.55 : 275000 + (C-500000)*0.30
  limit  = (G <= 55e6) ? 660000
         : (G <= 70e6) ? max(630000, 660000 - (G-55e6)/2)
         :               max(500000, 630000 - (G-70e6)/2)
  D = max(C - min(credit, limit), 0)
  m = floor10(D/12)
  return (m < 1000) ? 0 : m                   // 소액부징수: shown as '-'

special(G, n):
  (a, r) = n==1 ? (3_100_000, [.04,.04,.015,.005])
         : n==2 ? (3_600_000, [.04,.04,.02,.01])
         :        (5_000_000, [.07,.07,.05,.03])
  if G <= 30e6:  s = a + G*r0
  elif G <= 45e6: s = a + G*r1 - (G-30e6)*0.05
  elif G <= 70e6: s = a + G*r2
  else:           s = a + G*r3                // defined only up to G = 1.2억
  if n >= 3 and G > 40e6: s += (G-40e6)*0.04
  return s

// 3) Table lookup (해당란 세액) for any W
tableAmount(W, n):
  if n > 11: return tableAmount(W,11) - (tableAmount(W,10) - tableAmount(W,11))*(n-11)   // note 4
  if W < 770_000: return 0
  if W < 10_000_000: return tableCell(bracketMid(W), n)
  T10 = tableCell(10_000_000, n)              // the 10,000천원 row
  if W == 10_000_000: return T10
  if W <= 14e6: add = (W-10e6)*0.98*0.35 + 25_000
  elif W <= 28e6: add = 1_397_000 + (W-14e6)*0.98*0.38
  elif W <= 30e6: add = 6_610_600 + (W-28e6)*0.98*0.40
  elif W <= 45e6: add = 7_394_600 + (W-30e6)*0.40
  elif W <= 87e6: add = 13_394_600 + (W-45e6)*0.42
  else:           add = 31_034_600 + (W-87e6)*0.45
  return floor10(T10 + add)                   // rounding not stated in the 별표; 10원 floor recommended

// 4) Child deduction (2026-03-01 onward). For pay before 2026-03-01 use 12,500 / 29,160 / +25,000.
childDed(k) = k<=0 ? 0 : k==1 ? 20_830 : 45_830 + max(k-2,0)*33_330      // k==2 → 45,830

// 5) Monthly withholding
base   = max(tableAmount(W, n) - childDed(k), 0)                         // note 3: a negative result becomes 0
incomeTax = floor10(base * ratio)                                        // ratio 0.8/1.0/1.2 (시행령 §194); applied after the child deduction
if incomeTax < 1000: incomeTax = 0                                       // 소득세법 §86 소액부징수 (applied to the final withholding)
localTax  = floor10(incomeTax * 0.10)                                    // 지방세법 §103-13; 10원 floor

// Simplest robust alternative: ship the official 647×11 table as JSON (법령 text is not copyright-protected)
// and use the formula only for W > 10,000,000.
```

## Test vectors
- W=2,000,000 (bracket 2,000~2,010천원), n=1 / 2 / 3 / 4 => 19,520 / 14,750 / 6,600 / 3,220원 [Official 별표2 PDF (law.go.kr flSeq=169798151), row 2,000~2,010]
- W=3,000,000 (3,000~3,020), n=1 / 2 / 3 / 4 / 11 => 74,350 / 56,850 / 31,940 / 26,690 / 0원 [Official 별표2 PDF, row 3,000~3,020]
- W=3,500,000 (3,500~3,520), n=1..6 => 127,220 / 102,220 / 62,460 / 49,340 / 37,630 / 32,380원 [Official 별표2 PDF; same row shown on incometax.calculate.co.kr]
- W=4,000,000 (4,000~4,020), n=1 / 2 / 3 / 4 => 195,960 / 167,950 / 109,590 / 91,670원 [Official 별표2 PDF, row 4,000~4,020]
- W=5,000,000 (5,000~5,020), n=1 / 2 / 3 / 4 / 11 => 335,470 / 306,710 / 237,850 / 219,100 / 87,850원 [Official 별표2 PDF, row 5,000~5,020]
- W=6,000,000 (6,000~6,020), n=1 / 2 / 4 => 505,900 / 466,060 / 376,970원 [Official 별표2 PDF, row 6,000~6,020]
- W=7,000,000 (7,000~7,020), n=1 / 2 / 3 / 4 / 6 => 732,700 / 684,290 / 557,350 / 527,350 / 471,470원 [Official 별표2 PDF, row 7,000~7,020]
- W=8,000,000 (8,000~8,020), n=1 / 2 / 4 => 959,500 / 909,890 / 738,550원 [Official 별표2 PDF, row 8,000~8,020]
- W=9,000,000 (9,000~9,020), n=1 / 2 / 4 => 1,191,180 / 1,140,360 / 954,620원 [Official 별표2 PDF, row 9,000~9,020]
- W=10,000,000 (10,000천원 row), n=1..11 => 1,507,400 / 1,431,570 / 1,200,840 / 1,170,840 / 1,140,840 / 1,110,840 / 1,080,840 / 1,050,840 / 1,020,840 / 990,840 / 960,840원 [Official 별표2 PDF, last page]
- W=1,500,000 (1,500~1,510), n=1 / 2 => 8,920 / 4,420원 [Official 별표2 PDF]
- W=1,060,000, n=1 and W=1,059,999, n=1 => 1,040원 and 0원 (first non-zero cell for n=1 is 1,060~1,065) [Official 별표2 PDF]
- W=1,160,000~1,164,999 (bracket 1,160~1,165), n=1 => 2,440원 (needs 기준소득월액 천원 truncation; without it the model gives 2,430) [Official 별표2 PDF; reverse-engineering check]
- W=3,500,000, n=4 including 2 children aged 8–20, ratio 100% => 49,340 − 45,830 = 3,510원 소득세; 지방소득세 350원 [incometax.calculate.co.kr worked example (2026 amounts) + official table; local tax by 10% with 10원 floor]
- W=2,500,000 (2,500~2,510), n=3 including 1 child aged 8–20 => 16,530 − 20,830 < 0 → 0원 [Official table cell + note 3 (negative → 0)]
- W=5,000,000, n=4 including 3 children aged 8–20 => 219,100 − 79,160 = 139,940원; 지방소득세 13,990원 [Official table + note 3 다목 (45,830 + 33,330)]
- W=3,000,000, n=1, ratio 80% / 120% => 59,480 / 89,220원 (74,350 × 0.8 / 1.2) [시행령 §194① ratio applied to the official cell; exact, no rounding needed]
- W=2,000,000, n=1, ratio 80% => 15,616 → 15,610원 (10원 floor, recommended) [Derived; the floor rule is medium confidence]
- W=5,000,000, n=12 / 13 (more than 11 family) => 87,850 − 18,750 = 69,100원 / 50,350원 [Note 4 applied to official cells (n10 = 106,600, n11 = 87,850)]
- W=12,000,000, n=1 => 1,507,400 + 2,000,000×0.98×0.35 + 25,000 = 2,218,400원 [Official >10,000천원 formula (derived arithmetic)]
- W=15,000,000, n=1 / n=4 => 3,276,800 / 2,940,240원 [Official >10,000천원 formula: T10 + 1,397,000 + 1,000,000×0.98×0.38]
- W=20,000,000, n=2 => 1,431,570 + 1,397,000 + 6,000,000×0.98×0.38 = 5,062,970원 [Official >10,000천원 formula (derived arithmetic)]
- W=29,000,000, n=1 => 1,507,400 + 6,610,600 + 1,000,000×0.98×0.40 = 8,510,000원 [Official >10,000천원 formula (derived arithmetic)]
- W=40,000,000, n=3 => 1,200,840 + 7,394,600 + 10,000,000×0.40 = 12,595,440원 [Official >10,000천원 formula (derived arithmetic)]
- W=50,000,000, n=1 => 1,507,400 + 13,394,600 + 5,000,000×0.42 = 17,002,000원 [Official >10,000천원 formula (derived arithmetic)]
- W=100,000,000, n=1 => 1,507,400 + 31,034,600 + 13,000,000×0.45 = 38,392,000원 [Official >10,000천원 formula (derived arithmetic)]
- W=10,123,456, n=1 => 1,574,745.408 → 1,574,740원 with the recommended 10원 floor [Official formula; rounding is the assumed 10원 floor (medium confidence)]
- W=3,000,000, n=1, local income tax => 소득세 74,350 → 지방소득세 7,435 → 7,430원 [지방세법 §103-13 (10%) + 10원 floor]

## Caveats

1. **Status of the result.** The algorithm was reverse-engineered, not published by the government. It reproduces all 7,117 official cells (647 rows × 11 columns) exactly, checked with exact rational arithmetic in Python and with doubles in JS, at each bracket's lower bound, midpoint and upper−1. No official document states the internal parameters.

2. **The table uses old, frozen parameters that differ from 2026 law. Do not "update" them.**
   - 국민연금 at 4.5% with a 기준소득월액 cap of 4,490,000 (the cap was in force 2017.7–2018.6).
   - 근로소득세액공제 with a 50만원 kink and limits of 66만 / 63만 / 50만.
   - Current law: 4.75% pension in 2026, a 130만원 kink and limits of 74만 / 66만 / 50만 / 20만 (소득세법 §59).
   - Using the current values breaks hundreds to thousands of cells.
   - Only the tax brackets (2023 law), 근로소득공제, 1.5M 인적공제 and the special-deduction lines from note 1 are current.

3. **Where the 2026 changes are.** The 2026.2.27 revision (from 2026-03-01) changed only the child amounts: 20,830 / 45,830 / +33,330. Pay dated 2026-01-01 to 2026-02-28 should use 12,500 / 29,160 / +25,000 if the site supports past months. The law.go.kr version history shows no 별표2 change after 2026.2.27 up to the 시행 2026.10.1 version.

4. **Unconfirmed rounding rules.** The 별표 does not specify rounding in three places:
   - the >10,000천원 formulas,
   - the 80%/120% amounts,
   - 지방소득세.

   10원 truncation is recommended, based on 국고금관리법 §47 and calculator practice. I could not get the Hometax calculator to compute a value to confirm this, so these are medium confidence.

5. **Two more order-of-operations assumptions.**
   - The 1,000원 소액부징수 rule (소득세법 §86) is already built into the table cells. Applying it again after the child deduction or the ratio is an assumption; the statute supports it.
   - Applying 80%/120% after the child deduction follows from note 3's definition of 세액. This is medium confidence.

6. **Bad data on secondary sites.** Several blogs and calculators publish wrong or outdated numbers:
   - glasswallet.com lists 3,000,000 / 1인 = 61,110 (official: 74,350), plus the old child amounts.
   - incometax.calculate.co.kr's 적용방법 page still describes the obsolete "+자녀수" family-count method.
   - Use only the law.go.kr PDF or the generator above.

7. **Practical recommendation for the site.** The safest implementation is to embed the official 647×11 table as JSON. 법령 and 별표 are not copyright-protected under 저작권법 §7. Use the generator as a cross-check, and use the formula only for 월급여 > 10,000천원.

8. **Float precision.** Many cells land exactly on a multiple of 10원. Use integer arithmetic, or add a tiny epsilon (1e-7) before floor. The nearest non-integer fraction is 0.001 of a 10원 unit.

9. **Scope of the inputs.**
   - 월급여액 must exclude 비과세 (e.g. 식대 up to 20만) and may exclude 학자금.
   - For 종된 근무지, use the 1-person column (시행령 §194②).
   - Only children aged 8–20 who qualify as 공제대상가족 count, so a child with 소득금액 over 100만 is excluded.

10. **Unreachable sources.** nts.go.kr, the PwC and Crowe PDFs, and the Hometax calculator UI could not be fetched (403 errors, or the shared browser pane was taken over by another tab). The official law.go.kr PDF was used as the primary source.
