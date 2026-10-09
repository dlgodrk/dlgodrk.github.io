# Corrections from the adversarial fact-check (2026-10-09)

Independent verifiers re-checked docs/research/*.md against official sources. Core numbers were CONFIRMED
(간이세액표 7,117 cells; 4대보험 2026 rates & rounding vs live 4insure API; 최저임금 2026/2027; 퇴직금 MOEL rounding;
구직급여 2026 상·하한; 퇴직소득세 NTS worked example 1억/20년 → 1,120,000원). Apply these corrections:

## Payroll / tax
1. **자녀세액공제 switch date** — 20,830 / 45,830 / +33,330 apply to withholding performed on or after 2026-03-01
   (부칙 대통령령 제36129호 제15조), i.e. by payment date, not pay month. Old amounts (12,500 / 29,160 / +25,000) apply
   to withholding 2024-03-01 ~ 2026-02-28.
2. **Float hazard example** — `3000000*0.009 = 26999.999999999996` in IEEE doubles (floor10 → 26,990, wrong). Always use
   integer arithmetic for 10원 절사 (`Math.floor(pay*9/10000)*10`).
3. **비과세 (informational text only)**: 생산직 연장·야간·휴일근로수당 연 240만원, eligible if 월정액급여 ≤ 260만원 and
   직전 과세기간 총급여 ≤ 3,700만원 — applies to all 2026 pay (대통령령 제36129호 부칙 제3조); before: 210만 / 3,000만.
   국외근로 월 100만원 (원양어업·국외 항행 선박·국외 건설현장 월 500만원). 출산지원금 전액 (출생 후 2년 내, 2회 이내).

## Severance / 퇴직소득세
4. **소액부징수 order bug** — apply `if 소득세 < 1,000 → 0` FIRST, then 지방소득세 = floor10(소득세 × 10%).
   When 소득세 is waived, 지방소득세 must be 0 (지방세법 제103조의13①: 10% of tax actually withheld).

## Hourly wage
5. **Do not ceil monthly hours for part-timers.** Only the 40h case is the official 209h (208.57 → 209). For other
   schedules use the decimal `(주소정 + 주휴시간) × 365/7/12` (e.g. 15h → 78.21h, 20h → 104.29h) or state the convention.

## Unemployment (구직급여)
6. **Hours behind 최저기초일액** — governed by 고용보험법 시행규칙 제91조의2① (for 이직 on/after its effective date);
   verify the rule for part-timers instead of simply using min(8, hours on 이직확인서).
7. **Enacted 2028 change** — 법률 제21473호 (2026-03-17): 기초일액 = 이직 전 1년간 월 보수 합 ÷ 산정기간 일수 for
   이직일 ≥ 2028-01-01 only. Before 2028 the 3개월 평균임금 basis stays. The 2027 cap (하한×103%), 주6일 지급 and
   보험료 1.0% are still only a government proposal (2026-09-01).

## Savings / deposit taxation
8. **조합 예탁금 (농협·수협·산림조합·신협·새마을금고, 1인 3천만원 한도)** — rate is set by the account OPENING date
   (조특법 제89조의3, 전문개정 2025-12-23):
   - opened ≤ 2025-12-31: 비과세 (농특세 1.4% only)
   - opened 2026: 소득세 5% + 농특세 0.9% = **5.9%**, no 지방소득세 — but the exempt group (all 농·수·산림조합 조합원;
     others with 총급여 ≤ 7천만원 or 종합소득 ≤ 6천만원) stays 비과세 for accounts opened 2026-01-01~2028-12-31
   - opened 2027+: 9% + 0.5% = 9.5%
   The legacy "세금우대 9.5%" label should be described accurately (it is the 2027+ 조합 rate), and a 5.9% option is valid.

## VAT
9. **간이과세자** — 납부의무 면제: 해당 과세기간 공급대가 < 4,800만원. 세금계산서 발급 의무: decided by **직전 연도**
   공급대가 ≥ 4,800만원 (부가세법 제36조①2, 제36조의2). 업종별 부가가치율 (시행령 제111조②): 소매·재생용재료·음식점 15%;
   제조·농림어업·소화물전문운송 20%; 숙박 25%; 건설·운수창고·정보통신·그 밖의 서비스 30%; 금융보험·전문과학기술·
   사업시설관리임대·부동산관련서비스·부동산임대 40%.
10. **부가세 역산 rounding is a convention** — 합계 10,000원 → 9,091/909 (반올림) vs 9,090/910 (절사). Label it.

## Brokerage fee
11. 월세 보증금 5,000만 + 월세 30만 → 거래금액 8,000만 × 0.4% = 320,000 > 한도 300,000 → **300,000원**.

## Dates / misc (conventions, not statute)
12. 표준체중 (남 키²×22, 여 ×21), 띠 boundary (설날 vs 입춘), 아파트 전용률 — conventions; label as such.
13. 전역일 for month-end enlistment follows 민법 제160조③ (e.g. 육군 입대 2026-08-31 → 2028-02-29). 병 진급 일정 and
    장병내일준비적금 bank rates are not officially confirmed; present as 참고.
