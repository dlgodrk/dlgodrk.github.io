import type { Metadata } from "next";
import Link from "next/link";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatKoreanDate } from "@/lib/date";
import { formatNumber, formatWon } from "@/lib/format";
import {
  DISCHARGE_PAGE_MONTHS,
  formatDotDate,
  parseMonthSlug,
  promotionDates,
  reserveSpan,
  SAVINGS_MONTHLY_CAP,
  SERVICE_TYPES,
  serviceEndDate,
  SOLDIER_PAY_2026,
  totalServiceDays,
} from "@/lib/calc/discharge";
import { DischargeCalculator } from "./DischargeCalculator";

export const metadata: Metadata = pageMetadata({
  title: "전역일 계산기 - 육군·해군·공군·사회복무요원 전역일",
  description:
    "입대일만 넣으면 전역일, 남은 날, 복무율, 진급일을 바로 계산합니다. 2026년 복무기간은 육군·해병대 18개월, 해군 20개월, 공군 21개월, 사회복무요원 21개월입니다.",
  path: "/discharge/",
  keywords: ["전역일 계산기", "전역일 계산", "군대 전역일", "육군 전역일", "공군 전역일", "사회복무요원 소집해제일", "진급일 계산"],
});

const FAQ: FaqItem[] = [
  {
    q: "전역일은 어떻게 계산하나요?",
    a: "입대일을 첫날로 세어 복무기간(개월)이 지난 달의 같은 날짜 전날이 전역일입니다. 육군으로 2025년 6월 2일에 입대하면 18개월 뒤인 2026년 12월 2일의 전날, 2026년 12월 1일에 전역합니다. 그 달에 같은 날짜가 없으면(예: 8월 31일 입대) 그 달 말일에 끝납니다.",
  },
  {
    q: "2026년 군 복무기간은 몇 개월인가요?",
    a: "육군과 해병대는 18개월, 해군은 20개월, 공군은 21개월입니다. 상근예비역은 18개월, 사회복무요원은 21개월, 산업기능요원은 현역 34개월·보충역 23개월, 전문연구요원과 대체복무요원은 36개월입니다. 2018년부터 시작된 단축이 끝난 뒤 2026년 10월 현재 추가 단축은 정해진 것이 없습니다.",
  },
  {
    q: "사회복무요원 소집해제일은 어떻게 계산하나요?",
    a: "소집일부터 21개월이 되는 날의 전날이 소집해제일입니다. 2023년 9월 22일에 소집되면 2025년 6월 21일에 소집해제됩니다. 30일 이내의 군사교육소집(기초군사훈련) 기간도 복무기간에 들어갑니다.",
  },
  {
    q: "일병, 상병, 병장 진급은 언제 하나요?",
    a: "진급은 매월 1일에 하고, 이병 2개월·일병 6개월·상병 6개월을 채워야 다음 계급으로 올라갑니다. 1일에 입대하면 두 달 뒤 1일에 일병이 되지만, 2일 이후에 입대하면 두 달 뒤 1일에는 2개월이 다 차지 않아(하루라도 모자라면 진급할 수 없음) 세 달 뒤 1일에 일병이 됩니다(6월 2일이나 6월 30일 입대라면 9월 1일). 진급 심사에서 누락되거나 조기 진급하면 날짜가 달라집니다.",
  },
  {
    q: "2026년 병장 월급은 얼마인가요?",
    a: "2026년 병장 봉급은 월 150만원으로 2025년과 같습니다. 이병 75만원, 일병 90만원, 상병 120만원입니다. 흔히 말하는 205만원은 봉급 150만원에 장병내일준비적금 정부 지원금(최대 월 55만원 상당)을 더한 금액이며, 지원금은 매달이 아니라 적금 만기 때 한꺼번에 받습니다.",
  },
  {
    q: "휴가를 쓰면 전역일이 앞당겨지나요?",
    a: "아니요. 휴가 기간도 복무기간에 포함되므로 전역일은 바뀌지 않습니다. 말년휴가를 전역일까지 이어 쓰면 부대를 떠나는 날이 앞당겨질 뿐입니다. 반대로 형 집행, 군기교육, 복무이탈 기간은 복무기간에 넣지 않아 전역이 늦어집니다.",
  },
];

export default function DischargePage() {
  const example = { y: 2025, m: 6, d: 2 };
  const exampleEnd = serviceEndDate(example, 18);
  const promo = promotionDates(example);
  const reserve = reserveSpan(exampleEnd);
  const years = Array.from(new Set(DISCHARGE_PAGE_MONTHS.map((s) => s.slice(0, 4))));

  return (
    <ToolShell
      slug="discharge"
      h1="전역일 계산기 (2026 군별 복무기간)"
      lead="2026년 복무기간은 육군·해병대 18개월, 해군 20개월, 공군 21개월, 사회복무요원 21개월이에요. 입대일과 복무 형태를 고르면 전역일, 남은 날, 복무율, 진급 예정일과 전역 후 예비군 연차까지 바로 계산해 드려요."
      basis="병무청 복무기간·2026년 병 봉급 기준 · 2026년 10월 9일 확인"
      calculator={<DischargeCalculator />}
      faq={FAQ}
    >
      <h2>전역일 계산 방법</h2>
      <p>
        전역일은 입대일을 복무 첫날로 세어, 복무기간만큼 지난 달의 같은 날짜(대응일) 바로 전날입니다. 기간 계산은 법에 따로
        정한 것이 없으면 민법의 기간 규정을 따르고, 마지막 달에 같은 날짜가 없으면 그 달 말일에 기간이 끝납니다.
      </p>
      <p className="formula">전역일 = 입대일 + 복무기간(개월) − 1일</p>
      <p>
        예를 들어 육군으로 {formatKoreanDate(example)}에 입대하면 18개월 뒤 대응일은 2026년 12월 2일이고, 그 전날인{" "}
        <strong>{formatKoreanDate(exampleEnd)}</strong>에 전역합니다. 입대일과 전역일을 모두 포함한 전체 복무일수는{" "}
        {formatNumber(totalServiceDays(example, exampleEnd))}일입니다. 8월 31일에 입대하면 18개월 뒤 2월에는 31일이 없으므로
        2월 말일에 전역합니다.
      </p>

      <h2>2026년 복무 형태별 복무기간</h2>
      <p>
        병무청이 안내하는 2026년 복무기간입니다. 오른쪽 열은 {formatKoreanDate(example, false)}에 복무를 시작했을 때의
        만료일입니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">복무 형태</th>
              <th scope="col">복무기간</th>
              <th scope="col">2025.6.2 시작 시</th>
            </tr>
          </thead>
          <tbody>
            {SERVICE_TYPES.map((t) => (
              <tr key={t.id}>
                <td>{t.name}</td>
                <td>{t.months}개월</td>
                <td>{formatDotDate(serviceEndDate(example, t.months))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        현역병 복무기간은 2018년 10월부터 2주에 하루씩 단계적으로 단축되어, 육군과 상근예비역은 2020년 6월 2일
        입영자부터 21개월에서 18개월이 되었습니다. 사회복무요원은 24개월에서 21개월로, 보충역 산업기능요원은 26개월에서 23개월로
        줄었습니다. 2026년 10월 현재 병사 복무기간을 더 줄이는 방안은 확정된 것이 없습니다. 의무경찰과 의무소방원은 제도가
        폐지되어 새로 복무하는 사람이 없습니다. 산업기능요원·전문연구요원은 병무청 편입일부터 세고, 30일 이내의
        군사교육소집 기간도 복무기간에 들어갑니다.
      </p>

      <h2>진급 예정일 계산 (현역병)</h2>
      <p>
        병 진급은 매월 1일에 하며, 계급별 최저 복무기간은 이병 2개월, 일병 6개월, 상병 6개월입니다. 이병 2개월은 입대일부터
        꽉 채운 두 달이라서 1일에 입대하면 두 달 뒤 1일에 일병이 되지만, 2일 이후 입대자는 두 달 뒤 1일에 아직 2개월이
        차지 않아(하루라도 모자라면 진급할 수 없음) 그다음 달 1일에 일병이 됩니다. 군별로 진급 기간은 같고, 복무기간이 긴 만큼 병장 기간이 길어집니다(육군·해병대 약 3~4개월, 해군 약
        5~6개월, 공군 약 6~7개월).
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>육군 2025년 6월 2일 입대, 정상 진급 기준</caption>
          <thead>
            <tr>
              <th scope="col">계급</th>
              <th scope="col">시작일</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>이병</td>
              <td>{formatDotDate(example)}</td>
            </tr>
            <tr>
              <td>일병</td>
              <td>{formatDotDate(promo.일병)}</td>
            </tr>
            <tr>
              <td>상병</td>
              <td>{formatDotDate(promo.상병)}</td>
            </tr>
            <tr>
              <td>병장</td>
              <td>{formatDotDate(promo.병장)}</td>
            </tr>
            <tr>
              <td>전역</td>
              <td>{formatDotDate(exampleEnd)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="note">
        진급 심사에서 기준에 못 미쳐 누락되거나 포상으로 조기 진급하면 날짜가 달라집니다. 정확한 진급일은 소속 부대에서
        확인하세요.
      </p>

      <h2>2026년 병 봉급과 장병내일준비적금</h2>
      <p>2026년 병 봉급은 2025년과 같은 금액으로 동결되었습니다. 병 봉급은 호봉이 없어 같은 계급이면 모두 같습니다.</p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">계급</th>
              <th scope="col">2026년 월 봉급</th>
              <th scope="col">정상 진급 시 기간</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>이병</td>
              <td>{formatWon(SOLDIER_PAY_2026.이병)}</td>
              <td>약 2~3개월</td>
            </tr>
            <tr>
              <td>일병</td>
              <td>{formatWon(SOLDIER_PAY_2026.일병)}</td>
              <td>6개월</td>
            </tr>
            <tr>
              <td>상병</td>
              <td>{formatWon(SOLDIER_PAY_2026.상병)}</td>
              <td>6개월</td>
            </tr>
            <tr>
              <td>병장</td>
              <td>{formatWon(SOLDIER_PAY_2026.병장)}</td>
              <td>전역까지 (육군 약 3~4개월)</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        장병내일준비적금은 모든 은행을 합쳐 월 {formatNumber(SAVINGS_MONTHLY_CAP / 10_000)}만원까지 이자에 세금이 붙지 않고, 만기까지
        유지하면 넣은 원금의 100%를 정부가 재정지원금으로 더해 줍니다. 55만원씩 18번 넣었다면 원금 990만원에 지원금
        990만원이 붙어 이자를 빼고도 1,980만원이 됩니다. 흔히 말하는 ‘병장 월급 205만원’은 봉급 150만원에 이 지원금 55만원을
        더한 금액이고, 지원금은 매달이 아니라 만기 때 한꺼번에 받습니다. 중도에 해지하면 지원금을 받지 못합니다.
      </p>

      <h2>전역일이 달라지는 경우</h2>
      <ul>
        <li>
          <strong>복무기간 불산입</strong>: 형의 집행일수, 군기교육 일수, 복무이탈 일수는 현역 복무기간에 넣지 않아 그 일수만큼
          전역이 늦어집니다.
        </li>
        <li>
          <strong>휴가</strong>: 연가·포상휴가·말년휴가는 모두 복무기간에 들어갑니다. 휴가를 써도 전역일은 그대로입니다.
        </li>
        <li>
          <strong>단축 경과 기간 입대자</strong>: 2018년 10월 시행된 단축은 이미 복무 중이던 사람에게도 적용되어(육군은
          2017년 1월 3일 입대자부터) 2주에 하루꼴로 복무기간이 줄었습니다. 그래서 2017년~2020년 상반기 입대자는 개인별
          복무기간이 달라 이 계산과 차이가 납니다. 육군·해병대·상근예비역은 2020년 6월 2일 입영자부터 18개월로 확정되어 그
          뒤 입대자는 이 계산과 같습니다. 해군·공군·사회복무요원 등은 단축이 끝난 시점이 달라, 2021년 이전에 복무를
          시작했다면 병무청에서 확인하세요.
        </li>
        <li>
          <strong>앞선 복무기간이 있는 경우</strong>: 현역으로 복무하다 보충역으로 편입되었거나 사회복무요원 복무를 중단한
          뒤 산업기능요원이 되면 앞서 복무한 기간을 반영해 남은 기간을 다시 정합니다.
        </li>
      </ul>

      <h2>전역 후 예비군 연차</h2>
      <p>
        예비군법 제3조에 따라 현역병·상근예비역과 사회복무요원은 복무를 마친 다음 날부터 8년이 되는 해의 12월 31일까지
        예비군에 편성됩니다. 연차는 해 단위로 세어 전역한 해는 넣지 않고 다음 해가 1년차입니다. 예를 들어{" "}
        {formatKoreanDate(exampleEnd, false)}에 전역하는 육군은 {reserve.firstYear}년이 1년차, {reserve.lastYear}년이 8년차이고{" "}
        {formatKoreanDate(reserve.endDate, false)}에 예비군이 끝납니다. 현역병 출신은 보통 1~4년차에 동원훈련 대상이 되고,
        5~6년차에는 거주지 예비군 훈련장에서 기본훈련과 작계훈련을 받습니다. 연차별 훈련 종류와 시간은 해마다 국방부 예비군
        훈련 계획으로 정해지므로 소집 통지서로 확인하세요. 위 계산기는 전역일과 함께 예비군 1년차와 끝나는 날도 보여 줍니다.
      </p>

      <h2>입대 월별 전역일 바로 보기</h2>
      {years.map((y) => (
        <div key={y}>
          <h3>{y}년 입대</h3>
          <nav aria-label={`${y}년 입대 월별 전역일`} className="link-grid">
            {DISCHARGE_PAGE_MONTHS.filter((s) => s.startsWith(y)).map((s) => {
              const { m } = parseMonthSlug(s)!;
              return (
                <Link key={s} href={`/discharge/${s}/`}>
                  {m}월 입대
                </Link>
              );
            })}
          </nav>
        </div>
      ))}

      <h2>근거와 공식 안내</h2>
      <ul>
        <li>
          <a href="https://www.mma.go.kr/contents.do?mc=usr0000041" target="_blank" rel="noopener noreferrer">
            병무청 병역이행안내 개요
          </a>
          : 군별·복무 형태별 복무기간
        </li>
        <li>
          <a href="https://www.mma.go.kr/contents.do?mc=mma0000728" target="_blank" rel="noopener noreferrer">
            병무청 현역병 복무제도
          </a>
          ,{" "}
          <a href="https://www.mma.go.kr/contents.do?mc=mma0000744" target="_blank" rel="noopener noreferrer">
            사회복무요원
          </a>
          ,{" "}
          <a href="https://www.mma.go.kr/contents.do?mc=mma0000760" target="_blank" rel="noopener noreferrer">
            전문연구·산업기능요원
          </a>
        </li>
        <li>
          <a href="https://www.law.go.kr/법령/병역법" target="_blank" rel="noopener noreferrer">
            병역법
          </a>
          ,{" "}
          <a href="https://www.law.go.kr/법령/민법/제160조" target="_blank" rel="noopener noreferrer">
            민법 제160조
          </a>
          (기간의 만료),{" "}
          <a href="https://www.law.go.kr/법령/예비군법" target="_blank" rel="noopener noreferrer">
            예비군법
          </a>
          (예비군 편성 기간),{" "}
          <a href="https://www.law.go.kr/법령/공무원보수규정" target="_blank" rel="noopener noreferrer">
            공무원보수규정
          </a>
          (병 봉급)
        </li>
      </ul>
      <p className="note">
        이 계산기는 법정 복무기간으로 계산한 예정일입니다. 개인별 확정 전역일은 소속 부대 인사담당이나 병무청
        병무민원포털에서 확인하세요.
      </p>
    </ToolShell>
  );
}
