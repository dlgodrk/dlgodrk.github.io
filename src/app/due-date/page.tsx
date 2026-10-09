import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { RULE_YEAR } from "@/lib/site";
import { addDays, formatKoreanDate, ymd } from "@/lib/date";
import { formatWon } from "@/lib/format";
import {
  daysToDue,
  dueDate,
  monthWeekRange,
  SUPPORT,
  TERM_START_DAYS,
  TRIMESTER_LABEL,
  trimester,
} from "@/lib/calc/due-date";
import { DueDateCalculator } from "./DueDateCalculator";

export const metadata: Metadata = pageMetadata({
  title: "출산 예정일 계산기 - 임신 주수, 시험관 이식일 계산",
  description:
    "마지막 생리 시작일에 280일을 더해 출산 예정일을 계산합니다. 생리 주기 보정, 배란일(+266일), 시험관 5일 배아(+261일)·3일 배아(+263일) 기준과 오늘 임신 주수, 주수별 검사 시기까지 한 번에 확인하세요.",
  path: "/due-date/",
  keywords: [
    "출산 예정일 계산기",
    "출산예정일 계산",
    "임신 주수 계산기",
    "임신 주수 계산",
    "시험관 출산 예정일",
    "배란일 출산 예정일",
    "네겔레 법칙",
    "임신 개월 수",
  ],
});

const EX_LMP = ymd(RULE_YEAR, 1, 1);
const EX_DUE = dueDate("lmp", EX_LMP);
const EX_DUE_32 = dueDate("lmp", EX_LMP, { cycle: 32 });

const FAQ: FaqItem[] = [
  {
    q: "출산 예정일은 어떻게 계산하나요?",
    a: `마지막 생리 시작일에 280일(40주)을 더합니다. 네겔레 법칙이라고 부르며, 마지막 생리 시작일에 9개월과 7일을 더해도 거의 같은 날(최대 3일 차이)이 나옵니다. 예를 들어 ${formatKoreanDate(EX_LMP, false)}이 마지막 생리 시작일이면 예정일은 ${formatKoreanDate(EX_DUE, false)}입니다.`,
  },
  {
    q: "생리 주기가 28일이 아니면 예정일이 달라지나요?",
    a: "네. 280일 계산은 28일 주기에서 14일째에 배란된다고 가정합니다. 주기가 35일이면 배란이 7일 늦으므로 예정일도 7일 늦어지고, 25일이면 3일 빨라집니다. 이 계산기는 예정일이 40주 0일이 되도록 임신 주수도 같은 날수만큼 옮겨 셉니다. 병원에서는 첫 초음파로 예정일을 정하기 전까지 보통 마지막 생리 시작일부터 주수를 세므로 며칠 차이가 날 수 있습니다. 주기가 불규칙하면 임신 초기 초음파로 정한 예정일이 더 정확합니다.",
  },
  {
    q: "시험관(IVF) 아기 출산 예정일은 어떻게 계산하나요?",
    a: "배아 이식일과 배아 일수로 계산합니다. 5일 배아(포배기)는 이식일에 261일, 3일 배아는 263일을 더합니다. 수정일 + 266일에서 배아가 이미 자란 날수를 뺀 값이며, 신선 배아와 동결 배아 모두 같은 방식입니다.",
  },
  {
    q: "임신 주수는 언제부터 세나요?",
    a: "마지막 생리 시작일을 임신 0주 0일로 셉니다(28일 주기 기준). 실제 수정은 보통 그로부터 2주 뒤라서, 임신 4주는 수정 후 약 2주이자 다음 생리 예정일 무렵입니다. 태아의 실제 나이는 임신 주수보다 2주 적습니다.",
  },
  {
    q: "예정일에 아기가 태어날 가능성은 얼마나 되나요?",
    a: "예정일 당일에 태어나는 아기는 많지 않습니다. 임신 37주 0일부터 41주 6일 사이의 출산은 모두 정상 범위(만삭)이고, 37주 전은 조산, 42주 이후는 지연 임신으로 봅니다.",
  },
  {
    q: "병원에서 알려 준 예정일과 계산 결과가 다른데 어느 쪽을 따라야 하나요?",
    a: "병원 예정일을 따르세요. 임신 초기 초음파로 태아 머리엉덩길이를 재서 생리일 기준 예정일과 차이가 크면(임신 9주 전 5일 초과, 9~13주 7일 초과) 초음파 기준으로 예정일을 바꿉니다. 한 번 정한 예정일은 특별한 이유가 없으면 다시 바꾸지 않습니다.",
  },
];

/** Long text cells inside .data-table (which defaults to nowrap, right-aligned). */
const wrapCell: CSSProperties = { whiteSpace: "normal", textAlign: "left", minWidth: "13rem" };

const CHECK_TABLE: { when: string; tests: string }[] = [
  { when: "첫 방문", tests: "초음파(임신 확인), 빈혈·혈액형·풍진 항체·B형 간염·에이즈 검사, 소변 검사, 자궁경부 세포검사" },
  { when: "9~13주", tests: "목덜미 투명대(NT) 초음파(보통 11~13주), 1차 기형아 선별 검사, 필요 시 융모막 융모 검사" },
  { when: "15~20주", tests: "쿼드(사중 표지물질) 검사, 필요 시 양수 검사(보통 16~18주)" },
  { when: "20~24주", tests: "임신 중기 정밀 초음파, 필요 시 태아 심장 초음파" },
  { when: "24~28주", tests: "임신성 당뇨 선별 검사(50g 당부하), 빈혈 검사" },
  { when: "28주", tests: "Rh 음성 산모라면 면역글로불린 주사" },
  { when: "32~36주", tests: "후기 초음파(태아 체중, 태반 위치, 양수량), 병원에 따라 분만 전 검사" },
  { when: "41주~", tests: "출산 전이라면 주 2회 태아 감시 검사 권장" },
];

export default function DueDatePage() {
  const lmpTable = Array.from({ length: 12 }, (_, i) => ymd(RULE_YEAR, i + 1, 1));
  const ivf5 = ymd(RULE_YEAR, 3, 10);

  return (
    <ToolShell
      slug="due-date"
      h1="출산 예정일 계산기 (임신 주수 계산)"
      lead="마지막 생리 시작일에 280일을 더해 출산 예정일을 알려 드려요. 배란일이나 시험관 이식일로도 계산하고, 오늘 몇 주 며칠인지와 주수별 검사 시기까지 함께 보여 드려요."
      basis="네겔레 법칙(마지막 생리 시작일 + 280일)·미국산부인과학회(ACOG) 기준 · 2026년 10월 9일 확인"
      calculator={<DueDateCalculator />}
      faq={FAQ}
      appCategory="HealthApplication"
    >
      <h2>출산 예정일 계산 방법</h2>
      <p>
        출산 예정일은 마지막 생리 시작일에 280일(40주)을 더해 구합니다. 독일 산과의사 네겔레의 이름을 딴 계산법으로,
        생리 주기가 28일이고 14일째에 배란·수정된다고 가정합니다. 주기가 다르면 배란일이 달라지므로 그 차이만큼
        예정일을 옮깁니다.
      </p>
      <p className="formula">출산 예정일 = 마지막 생리 시작일 + 280일 + (생리 주기 − 28일)</p>
      <p>
        예를 들어 마지막 생리 시작일이 {formatKoreanDate(EX_LMP)}이고 주기가 28일이면 예정일은{" "}
        <strong>{formatKoreanDate(EX_DUE)}</strong>입니다. 주기가 32일이라면 4일을 더해{" "}
        <strong>{formatKoreanDate(EX_DUE_32)}</strong>이 됩니다. 시험관 시술로 {formatKoreanDate(ivf5, false)}에 5일 배아를
        이식했다면 261일을 더한 <strong>{formatKoreanDate(dueDate("ivf", ivf5, { embryoDay: 5 }))}</strong>이 예정일입니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>알고 있는 날짜별 계산식</caption>
          <thead>
            <tr>
              <th scope="col">기준 날짜</th>
              <th scope="col">더하는 날수</th>
              <th scope="col">근거</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>마지막 생리 시작일 (28일 주기)</td>
              <td>+{daysToDue("lmp")}일</td>
              <td>네겔레 법칙, 40주</td>
            </tr>
            <tr>
              <td>마지막 생리 시작일 (주기 N일)</td>
              <td>+280일 + (N − 28)일</td>
              <td>배란일 차이 보정</td>
            </tr>
            <tr>
              <td>수정일 (배란일)</td>
              <td>+{daysToDue("con")}일</td>
              <td>수정 후 38주</td>
            </tr>
            <tr>
              <td>시험관 3일 배아 이식일</td>
              <td>+{daysToDue("ivf", { embryoDay: 3 })}일</td>
              <td>266일 − 배아 3일</td>
            </tr>
            <tr>
              <td>시험관 5일 배아 이식일</td>
              <td>+{daysToDue("ivf", { embryoDay: 5 })}일</td>
              <td>266일 − 배아 5일</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="note">
        ‘9개월 더하고 7일 더하기’처럼 달 단위로 세는 방법은 달마다 날수가 달라 280일 계산과 최대 3일까지 차이가 날 수
        있습니다. 이 계산기는 날수(280일)로 계산합니다.
      </p>

      <h2>마지막 생리 시작일별 출산 예정일 ({RULE_YEAR}년)</h2>
      <p>생리 주기 28일 기준입니다. 마지막 생리가 매달 1일에 시작했다고 할 때의 예정일과 만삭이 시작되는 37주 0일입니다.</p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">마지막 생리 시작일</th>
              <th scope="col">출산 예정일</th>
              <th scope="col">만삭 시작 (37주)</th>
            </tr>
          </thead>
          <tbody>
            {lmpTable.map((lmp) => (
              <tr key={lmp.m}>
                <td>{formatKoreanDate(lmp, false)}</td>
                <td>{formatKoreanDate(dueDate("lmp", lmp))}</td>
                <td>{formatKoreanDate(addDays(lmp, TERM_START_DAYS), false)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>임신 주수와 개월 수 세는 법</h2>
      <p>
        임신 주수는 마지막 생리 시작일을 0주 0일로 세는 재태 연령입니다. 실제 수정은 약 2주 뒤에 일어나므로 태아의 실제
        나이는 임신 주수보다 2주 적습니다. 생리 주기를 보정해 계산하면 이 계산기는 마지막 생리 시작일에서 (주기 −
        28)일만큼 옮긴 날을 0주 0일로 보고 주수와 검사 시기를 셉니다. 병원에서는 첫 초음파로 예정일을 정하기 전까지 보통
        마지막 생리 시작일부터 세므로 며칠 다를 수 있습니다. 임신 기간은 세 시기로 나눕니다.
      </p>
      <ul>
        <li>
          <strong>임신 초기(1분기)</strong>: 0주 0일 ~ 13주 6일
        </li>
        <li>
          <strong>임신 중기(2분기)</strong>: 14주 0일 ~ 27주 6일
        </li>
        <li>
          <strong>임신 후기(3분기)</strong>: 28주 0일 이후
        </li>
      </ul>
      <p>개월 수는 4주를 한 달로 세어 40주를 10개월로 봅니다. 달력의 개월 수와는 다릅니다.</p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">임신 개월</th>
              <th scope="col">임신 주수</th>
              <th scope="col">시기</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((month) => {
              const [from, to] = monthWeekRange(month);
              const t1 = trimester(from * 7);
              const t2 = trimester(to * 7 + 6);
              const label = (t: 1 | 2 | 3) => TRIMESTER_LABEL[t].split(" (")[0];
              return (
                <tr key={month}>
                  <td>{month}개월</td>
                  <td>
                    {from}주 ~ {to}주
                  </td>
                  <td>{t1 === t2 ? label(t1) : `${label(t1)} → ${label(t2)}`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <h2>주수별 검사 시기</h2>
      <p>
        대한산부인과학회는 임신 28주까지는 4주마다, 36주까지는 2주마다, 그 이후에는 매주 정기 진찰을 받도록 안내합니다.
        정기 진찰 때 하는 주요 검사와 시기는 아래와 같습니다. 계산기 결과에는 이 시기를 내 예정일에 맞춘 날짜로 보여
        드립니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">시기</th>
              <th scope="col" style={wrapCell}>
                주요 검사
              </th>
            </tr>
          </thead>
          <tbody>
            {CHECK_TABLE.map((row) => (
              <tr key={row.when}>
                <td>{row.when}</td>
                <td style={wrapCell}>{row.tests}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        일반적인 권장 시기이며 진단 기준이 아닙니다. 나이, 이전 임신 경과, 검사 결과에 따라 검사 종류와 시기가 달라질 수
        있으니 다니는 병원의 안내를 따르세요. 보건소에 임신을 등록하면 산전 검사비, 엽산제, 철분제(임신 16주 이상, 5개월분)
        등을 지원받을 수 있으며 지원 항목은 지역마다 다릅니다.
      </p>

      <h2>예정일은 추정치입니다</h2>
      <p>
        예정일은 ‘이날 태어난다’가 아니라 ‘40주가 되는 날’이라는 뜻입니다. 실제로는 예정일 당일에 태어나는 아기가 많지
        않고, <strong>임신 37주 0일부터 41주 6일 사이</strong>의 출산을 모두 정상 범위(만삭)로 봅니다. 미국산부인과학회는
        이 만삭 기간을 다시 셋으로 나눠 부르며, 그중 39주 0일~40주 6일을 완전 만삭이라고 합니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">구분</th>
              <th scope="col">임신 주수</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>조산</td>
              <td>37주 0일 미만</td>
            </tr>
            <tr>
              <td>조기 만삭</td>
              <td>37주 0일 ~ 38주 6일</td>
            </tr>
            <tr>
              <td>완전 만삭</td>
              <td>39주 0일 ~ 40주 6일</td>
            </tr>
            <tr>
              <td>후기 만삭</td>
              <td>41주 0일 ~ 41주 6일</td>
            </tr>
            <tr>
              <td>지연 임신</td>
              <td>42주 0일(294일) 이상</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        생리 주기가 불규칙하거나 마지막 생리일이 확실하지 않으면 임신 초기 초음파가 더 정확합니다. 초음파로 잰 주수와
        생리일 기준 주수가 임신 9주 전에는 5일, 9~13주에는 7일보다 많이 차이 나면 초음파 기준으로 예정일을 바꿉니다.
        병원에서 예정일을 정해 주었다면 그 날짜를 기준으로 삼으세요.
      </p>

      <h2>{RULE_YEAR}년 임신·출산 정부 지원</h2>
      <p>예정일이 정해지면 함께 챙길 지원입니다. 신청 전에 정부24나 국민건강보험공단에서 최신 기준을 한 번 더 확인하세요.</p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">지원</th>
              <th scope="col" style={wrapCell}>
                금액
              </th>
              <th scope="col" style={wrapCell}>
                신청·사용
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>임신·출산 진료비 바우처</td>
              <td style={wrapCell}>
                단태아 {formatWon(SUPPORT.voucherSingle)}, 다태아 {formatWon(SUPPORT.voucherMultiBase)}(태아당{" "}
                {formatWon(SUPPORT.voucherPerFetusMulti)}이 되도록 추가 지급), 분만취약지 거주 시{" "}
                {formatWon(SUPPORT.voucherRemoteAreaExtra)} 추가
              </td>
              <td style={wrapCell}>
                임신 확인 후 국민행복카드로 신청. 분만예정일(출산일)로부터 {SUPPORT.voucherYears}년까지 사용, 남은 금액은 소멸
              </td>
            </tr>
            <tr>
              <td>첫만남이용권</td>
              <td style={wrapCell}>
                첫째 {formatWon(SUPPORT.firstMeetFirst)}, 둘째 이상 {formatWon(SUPPORT.firstMeetSecondPlus)}
              </td>
              <td style={wrapCell}>출생신고 후 출생일로부터 2년 이내 신청(복지로·정부24·주민센터)</td>
            </tr>
            <tr>
              <td>보건소 임산부 등록</td>
              <td style={wrapCell}>산전 검사비, 엽산제, 철분제(임신 16주 이상, 5개월분) 등</td>
              <td style={wrapCell}>주소지 보건소에 임신 등록. 지원 항목은 지역마다 다름</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="note">
        2026년 10월 9일 확인. 진료비 바우처: 정부24 「건강보험 임신·출산 진료비 지원」(2026년 7월 30일 수정), 첫만남이용권:
        정부24 「첫만남이용권 지원」, 보건소 지원: 찾기쉬운 생활법령정보 「임산부」. 의료급여 수급자는 별도 기준이 적용됩니다.
      </p>

      <h2>참고한 자료</h2>
      <ul>
        <li>
          <a href="https://www.ksog.org/public/index.php?sub=1&third=2" rel="noopener">
            대한산부인과학회 일반인 의학정보 「산전 진단 검사」
          </a>
          ,{" "}
          <a href="https://www.ksog.org/public/index.php?sub=1&third=8" rel="noopener">
            「임신성 당뇨」
          </a>
          ,{" "}
          <a href="https://www.ksog.org/public/index.php?sub=1&third=5" rel="noopener">
            「지연임신」
          </a>
        </li>
        <li>
          <a
            href="https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2017/05/methods-for-estimating-the-due-date"
            rel="noopener"
          >
            미국산부인과학회(ACOG) Committee Opinion No. 700, Methods for Estimating the Due Date
          </a>
        </li>
        <li>
          <a
            href="https://www.acog.org/clinical/clinical-guidance/committee-opinion/articles/2013/11/definition-of-term-pregnancy"
            rel="noopener"
          >
            미국산부인과학회(ACOG) Committee Opinion No. 579, Definition of Term Pregnancy
          </a>
        </li>
        <li>
          <a href="https://www.gov.kr/portal/rcvfvrSvc/dtlEx/SD0000007672" rel="noopener">
            정부24 「건강보험 임신·출산 진료비 지원」
          </a>
          ,{" "}
          <a href="https://www.gov.kr/portal/rcvfvrSvc/dtlEx/135200005015" rel="noopener">
            「첫만남이용권 지원」
          </a>
        </li>
        <li>
          <a
            href="https://www.easylaw.go.kr/CSP/CnpClsMain.laf?popMenu=ov&csmSeq=735&ccfNo=2&cciNo=1&cnpClsNo=2"
            rel="noopener"
          >
            찾기쉬운 생활법령정보 「임산부」 임신 신고·임산부 건강관리 지원
          </a>
        </li>
      </ul>
      <p className="note">
        이 페이지의 계산과 일정은 일반적인 정보이며 의학적 진단이나 진료를 대신하지 않습니다. 몸 상태가 걱정되면 바로
        산부인과에 문의하세요.
      </p>
    </ToolShell>
  );
}
