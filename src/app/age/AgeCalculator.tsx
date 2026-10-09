"use client";

import { CalcLayout, CalcNotice } from "@/components/CalcLayout";
import { DateField } from "@/components/fields";
import { Statement, StatementFootnote, StatementHero, StatementRow, StatementSection } from "@/components/Statement";
import { formatNumber } from "@/lib/format";
import { compareYMD, diffDays, formatKoreanDate, formatYMD, parseYMD, weekdayKo, type YMD } from "@/lib/date";
import { ageAt, birthdayOfAge, ganjiOfYear, pensionStartAge, ruleStartDate, schoolYears } from "@/lib/calc/age";
import { RULE_YEAR } from "@/lib/site";
import { useToday } from "@/lib/useToday";
import { useUrlState } from "@/lib/useUrlState";

type Milestone = { label: string; threshold: string; date: YMD };

/**
 * Earliest year accepted (matches the DateField min). Years 0–99 can arrive from a shared URL or
 * mid-typing in a date input, and Date.UTC maps them to 1900–1999, which would break day counts.
 */
const MIN_YEAR = 1900;

export function AgeCalculator({ initialBirth = "1990-01-01" }: { initialBirth?: string }) {
  const { today } = useToday();
  // URL keys: b = 생년월일, r = 기준일 (비어 있으면 오늘)
  const [s, set] = useUrlState({ b: initialBirth, r: "" });
  const birth = parseYMD(s.b);
  const customRef = parseYMD(s.r);
  const ref = customRef ?? today;
  const todayStr = formatYMD(today);
  const outOfRange = (birth !== null && birth.y < MIN_YEAR) || ref.y < MIN_YEAR;
  const result = birth && !outOfRange ? ageAt(birth, ref) : null;

  const inputs = (
    <>
      <DateField
        label="생년월일"
        value={s.b}
        onChange={(b) => set({ b })}
        min="1900-01-01"
        max="2100-12-31"
        hint="양력 생일을 넣어 주세요. 음력으로 생일을 쇤다면 태어난 날의 양력 날짜가 기준이에요."
      />
      <DateField
        label="기준일"
        value={customRef ? s.r : todayStr}
        onChange={(r) => set({ r: r === todayStr ? "" : r })}
        min="1900-01-01"
        max="2100-12-31"
        aside={
          customRef ? (
            <button type="button" className="text-link underline underline-offset-2" onClick={() => set({ r: "" })}>
              오늘로 되돌리기
            </button>
          ) : (
            "오늘"
          )
        }
        hint="시험 응시일이나 계약일처럼 특정 날짜 기준 나이가 궁금하면 바꿔 보세요."
      />
    </>
  );

  if (!birth) {
    return <CalcLayout inputs={inputs} result={<CalcNotice>생년월일을 넣으면 바로 만 나이를 계산해 드려요.</CalcNotice>} />;
  }
  if (outOfRange) {
    return (
      <CalcLayout
        inputs={inputs}
        result={
          <CalcNotice>
            {birth.y < MIN_YEAR ? "생년월일" : "기준일"}은 {MIN_YEAR}년 이후 날짜로 넣어 주세요.
          </CalcNotice>
        }
      />
    );
  }
  if (!result) {
    return (
      <CalcLayout
        inputs={inputs}
        result={<CalcNotice>기준일이 생년월일보다 앞서 있어요. 날짜를 다시 확인해 주세요.</CalcNotice>}
      />
    );
  }

  const r = result;
  const g = ganjiOfYear(birth.y);
  const prevG = ganjiOfYear(birth.y - 1);
  const school = schoolYears(birth.y, birth.m);
  const pensionAge = pensionStartAge(birth.y);
  const refLabel = customRef ? "기준일" : "오늘";
  const leapShift = r.leapDayBirth && r.nextBirthday.m === 3;

  const milestones: Milestone[] = [
    { label: "선거권", threshold: "만 18세", date: ruleStartDate(birth, "만", 18) },
    { label: "민법상 성년", threshold: "만 19세", date: ruleStartDate(birth, "만", 19) },
    { label: "술·담배 구매", threshold: "연 19세, 1월 1일부터", date: ruleStartDate(birth, "연", 19) },
    { label: "국민연금 노령연금", threshold: `만 ${pensionAge}세, 가입 10년 이상`, date: birthdayOfAge(birth, pensionAge) },
    { label: "기초연금·경로우대", threshold: "만 65세", date: birthdayOfAge(birth, 65) },
  ];

  return (
    <CalcLayout
      inputs={inputs}
      result={
        <Statement title="나이 계산 명세" caption={`${formatKoreanDate(ref)} 기준`}>
          <StatementHero
            label="만 나이 (법적 나이)"
            value={`만 ${r.man}세`}
            sub={
              r.isBirthday
                ? `${refLabel}이 만 ${r.man}세 생일이에요`
                : r.man === 0
                  ? `태어난 지 ${r.totalMonths}개월 ${r.days}일`
                  : `태어난 지 ${r.man}년 ${r.months}개월 ${r.days}일`
            }
            stamp="만나이"
          />

          <StatementSection title="나이 비교">
            <StatementRow label="만 나이" note="법적 나이, 생일마다 한 살" value={`${r.man}세`} emphasis />
            <StatementRow label="연 나이" note={`${ref.y} − ${birth.y}`} value={`${r.yeon}세`} />
            <StatementRow label="세는 나이" note="참고용, 법적 효력 없음" value={`${r.counting}세`} />
            <StatementRow
              label="띠"
              note={
                birth.m <= 2
                  ? `${g.hanja}年 · 설 전 출생이면 ${prevG.tti}로 보기도 해요`
                  : `${g.hanja}年 · 천간 오행 ${g.element}`
              }
              value={`${g.name}년 ${g.tti}`}
            />
          </StatementSection>

          <StatementSection title="생일과 날 수">
            <StatementRow
              label="다음 생일"
              note={
                leapShift
                  ? `2월 29일이 없는 해라 3월 1일에 만 ${r.nextAge}세`
                  : r.isBirthday
                    ? `만 ${r.nextAge}세가 된 날`
                    : `만 ${r.nextAge}세가 되는 날`
              }
              value={r.isBirthday ? (customRef ? "기준일 당일" : "오늘") : formatKoreanDate(r.nextBirthday)}
            />
            <StatementRow
              label="생일까지"
              value={r.isBirthday ? "D-day" : `D-${formatNumber(r.daysToNextBirthday)}`}
              emphasis
            />
            <StatementRow
              label="살아온 날"
              note={`태어난 날을 1일로 세면 ${formatNumber(r.daysLived + 1)}일째`}
              value={`${formatNumber(r.daysLived)}일`}
            />
            <StatementRow label="태어난 요일" value={`${weekdayKo(birth)}요일`} />
          </StatementSection>

          {school ? (
            <StatementSection title="학교 연도 (조기입학·입학 연기 없을 때)">
              <StatementRow
                label="초등학교 입학"
                note={school.early ? `빠른년생 · 또래와 함께 들어갔다면 ${school.elementaryEntry + 1}년` : undefined}
                value={`${school.elementaryEntry}년 3월`}
              />
              <StatementRow label="초등학교 졸업" value={`${school.elementaryGrad}년 2월`} />
              <StatementRow label="중학교 입학" value={`${school.middleEntry}년 3월`} />
              <StatementRow label="고등학교 입학" value={`${school.highEntry}년 3월`} />
              <StatementRow label="고등학교 졸업" value={`${school.highGrad}년 2월`} />
            </StatementSection>
          ) : null}

          <StatementSection title="지금 법 기준 나이 도달일">
            {milestones.map((m) => {
              const passed = compareYMD(m.date, ref) <= 0;
              return (
                <StatementRow
                  key={m.label}
                  label={m.label}
                  note={passed ? m.threshold : `${m.threshold} · ${formatNumber(diffDays(ref, m.date))}일 남음`}
                  value={passed ? "해당" : formatKoreanDate(m.date, false)}
                />
              );
            })}
          </StatementSection>

          <StatementFootnote>
            만 나이는 출생일을 포함해 계산해요(민법 제158조). 2월 29일생은 평년엔 3월 1일에 한 살 많아져요(민법 제160조).
            띠는 양력 연도 기준이고, 나이 도달일은 {RULE_YEAR}년 현재 법 기준이라 과거에 적용된 나이와 다를 수 있어요.
          </StatementFootnote>
        </Statement>
      }
    />
  );
}
