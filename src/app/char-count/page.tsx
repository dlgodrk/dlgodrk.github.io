import type { Metadata } from "next";
import { ToolShell } from "@/components/ToolShell";
import { pageMetadata, type FaqItem } from "@/lib/seo";
import { formatNumber } from "@/lib/format";
import { analyzeText, manuscriptSheets, maxHangulForBytes, READING_CHARS_PER_MIN, SPEAKING_CHARS_PER_MIN } from "@/lib/calc/char-count";
import { CharCounter } from "./CharCounter";

export const metadata: Metadata = pageMetadata({
  title: "글자수 세기 - 공백 포함·제외, 바이트, 원고지 매수",
  description:
    "자기소개서 글자수를 공백 포함·제외로 바로 셉니다. 사람인·잡코리아와 같은 한글 2바이트 방식과 UTF-8 바이트, 원고지 매수, 읽는 시간까지. 1,000바이트는 한글 2바이트 기준 500자, UTF-8 기준 333자입니다.",
  path: "/char-count/",
  keywords: ["글자수 세기", "글자수 계산기", "자소서 글자수", "공백 제외 글자수", "바이트 계산기", "원고지 매수 계산"],
});

const FAQ: FaqItem[] = [
  {
    q: "자소서 글자수는 공백 포함인가요?",
    a: "대부분 공백(띄어쓰기) 포함 글자수로 제한합니다. 다만 공백 제외로 세는 기업도 있으니 문항 옆 안내 문구를 확인하고, 안내가 없다면 지원서 입력창에 표시되는 글자수를 기준으로 삼으세요.",
  },
  {
    q: "1,000바이트는 몇 글자인가요?",
    a: "한글을 2바이트로 세는 방식이면 한글만으로 500자, UTF-8 방식이면 333자입니다. 띄어쓰기·영문·숫자는 1바이트라 실제로는 이보다 조금 더 쓸 수 있습니다.",
  },
  {
    q: "엔터(줄바꿈)도 글자수에 들어가나요?",
    a: "공백 포함 글자수에는 줄바꿈이 1자로 들어가고, 공백 제외 글자수에서는 빠집니다. 일부 지원서 시스템은 제출된 뒤 줄바꿈을 2자(2바이트)로 세므로 문단을 많이 나눴다면 여유를 두는 편이 안전합니다.",
  },
  {
    q: "사이트마다 글자수가 조금씩 다르게 나오는 이유는 무엇인가요?",
    a: "줄바꿈, 이모지·특수문자, 바이트를 세는 기준이 서로 달라서입니다. 셈도장은 눈에 보이는 글자 단위로 세고, 이모지 같은 문자가 있으면 사람인·잡코리아처럼 2자 이상으로 센 값과 줄바꿈을 2바이트로 셀 때의 차이도 따로 보여 줍니다.",
  },
  {
    q: "원고지 1매는 몇 자인가요?",
    a: "보통 가로 20칸, 세로 10줄인 200자 원고지를 1매로 칩니다. 공백 포함 글자수를 200으로 나눠 올림하면 매수가 나오고, 400자 원고지는 그 절반입니다. 실제로는 문단 들여쓰기와 문단 끝 빈칸 때문에 조금 더 듭니다.",
  },
  {
    q: "입력한 글이 저장되거나 전송되나요?",
    a: "글은 서버로 보내지 않고 브라우저 안에서만 셉니다. 새로고침에 대비해 지금 탭에만 잠시 저장하고, ‘창을 닫아도 보관’을 켜면 이 기기 브라우저에 남습니다. ‘지우기’를 누르면 저장된 글도 함께 지워집니다.",
  },
];

const EXAMPLE = "안녕하세요. 반갑습니다.";

export default function CharCountPage() {
  const ex = analyzeText(EXAMPLE);
  const byteLimits = [500, 1000, 1500, 2000, 3000, 4000];
  return (
    <ToolShell
      slug="char-count"
      h1="글자수 세기 (공백 포함·제외, 바이트)"
      lead="글을 붙여 넣으면 공백 포함·제외 글자수와 바이트, 원고지 매수를 바로 세어 드려요. 입력한 글은 서버로 보내지 않고 이 브라우저 안에서만 계산해요."
      basis="한글 2바이트(사람인·잡코리아 방식)와 UTF-8 바이트를 함께 표시 · 2026년 10월 9일 확인"
      calculator={<CharCounter />}
      faq={FAQ}
    >
      <h2>공백 포함과 공백 제외, 무엇이 다른가요</h2>
      <p>
        <strong>공백 포함</strong>은 띄어쓰기·탭·줄바꿈까지 모두 1자로 센 값이고, <strong>공백 제외</strong>는 이것들을 빼고 남은
        글자만 센 값입니다. 같은 문장이라도 기준에 따라 숫자가 달라집니다. 아래는 ‘{EXAMPLE}’를 센 결과입니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <caption>예시 문장: {EXAMPLE}</caption>
          <thead>
            <tr>
              <th scope="col">기준</th>
              <th scope="col">결과</th>
              <th scope="col">계산</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>공백 포함</td>
              <td>{ex.chars}자</td>
              <td>한글 10 + 마침표 2 + 띄어쓰기 1</td>
            </tr>
            <tr>
              <td>공백 제외</td>
              <td>{ex.charsNoSpace}자</td>
              <td>띄어쓰기 1자 뺌</td>
            </tr>
            <tr>
              <td>한글 2바이트</td>
              <td>{ex.bytesKorean2}바이트</td>
              <td>10 × 2 + 3 × 1</td>
            </tr>
            <tr>
              <td>UTF-8</td>
              <td>{ex.bytesUtf8}바이트</td>
              <td>10 × 3 + 3 × 1</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>자소서 글자수 기준이 회사마다 다른 이유</h2>
      <p>
        지원서는 회사가 직접 만든 채용 사이트나 채용 대행 솔루션에 입력하기 때문에, 글자를 세는 방식도 시스템마다 다릅니다.
        차이가 나는 지점은 대개 네 가지입니다.
      </p>
      <ul>
        <li>
          <strong>공백 포함·제외</strong>: 대부분 공백 포함이지만 공백 제외로 제한하는 곳도 있습니다. 문항 옆의 ‘띄어쓰기 포함’
          같은 문구를 먼저 확인하세요.
        </li>
        <li>
          <strong>줄바꿈</strong>: 입력창에서는 줄바꿈을 1자로 세다가도, 웹 양식이 제출될 때 줄바꿈은 CR·LF 두 글자로 바뀌어
          전송됩니다. 서버에서 다시 세는 시스템이라면 줄바꿈마다 1자(1바이트)가 더 붙어, 문단을 많이 나눈 글일수록 차이가
          커집니다.
        </li>
        <li>
          <strong>글자와 바이트</strong>: 바이트 제한은 저장 공간을 기준으로 한 것이라, 한글 1자를 2바이트로 보느냐 3바이트로
          보느냐에 따라 같은 1,000바이트가 한글 500자도, 333자도 됩니다.
        </li>
        <li>
          <strong>이모지·특수문자</strong>: 눈에는 1글자로 보여도 컴퓨터 내부에서는 2자 이상으로 저장되는 문자가 있어, 이모지를
          2자 이상으로 세는 입력창이 많습니다. 사람인·잡코리아의 글자수 세기도 이렇게 셉니다.
        </li>
      </ul>
      <p>
        결국 최종 기준은 <strong>지원서 입력창에 표시되는 숫자</strong>입니다. 이 계산기로 분량을 맞춘 뒤, 제출 전에 입력창에
        붙여 넣어 한 번 더 확인하고 10~20자 정도 여유를 두는 것이 안전합니다.
      </p>

      <h2>바이트 계산 방식: 한글 2바이트와 UTF-8</h2>
      <p>
        사람인과 잡코리아의 글자수 세기 도구는 영문·숫자·띄어쓰기·줄바꿈을 1바이트, 한글을 비롯한 나머지 글자를 2바이트로
        셉니다(2026년 10월 두 사이트의 계산 스크립트 확인). 한글 1자가 2바이트였던 옛 완성형 인코딩(EUC-KR, CP949)에서 온
        방식입니다. 반면 요즘 웹과 데이터베이스가 주로 쓰는 UTF-8에서는 한글 1자가 3바이트입니다. 학교생활기록부(나이스)도 한글
        1자를 3바이트로 세는 것으로 알려져 있어 UTF-8 값과 비슷하게 보면 됩니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">문자</th>
              <th scope="col">한글 2바이트 방식</th>
              <th scope="col">UTF-8</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>한글 (가)</td>
              <td>2</td>
              <td>3</td>
            </tr>
            <tr>
              <td>영문·숫자 (A, 1)</td>
              <td>1</td>
              <td>1</td>
            </tr>
            <tr>
              <td>띄어쓰기</td>
              <td>1</td>
              <td>1</td>
            </tr>
            <tr>
              <td>줄바꿈</td>
              <td>1 (서버에서 세면 2)</td>
              <td>1 (서버에서 세면 2)</td>
            </tr>
            <tr>
              <td>한자·특수기호 (漢, ①)</td>
              <td>2</td>
              <td>3</td>
            </tr>
            <tr>
              <td>이모지</td>
              <td>4</td>
              <td>4</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        지원서 사이트가 어느 방식인지 모르겠다면 입력창에 ‘가’를 10자 넣어 보세요. 20바이트로 나오면 한글 2바이트 방식,
        30바이트로 나오면 UTF-8 방식입니다. 바이트 제한별로 한글만 쓸 때 넣을 수 있는 최대 글자수는 다음과 같습니다.
      </p>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">바이트 제한</th>
              <th scope="col">한글 2바이트 방식</th>
              <th scope="col">UTF-8</th>
            </tr>
          </thead>
          <tbody>
            {byteLimits.map((b) => (
              <tr key={b}>
                <td>{formatNumber(b)}바이트</td>
                <td>{formatNumber(maxHangulForBytes(b, 2))}자</td>
                <td>{formatNumber(maxHangulForBytes(b, 3))}자</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">띄어쓰기·영문·숫자는 1바이트라, 섞어 쓰면 표보다 조금 더 많은 글자를 넣을 수 있습니다.</p>

      <h2>원고지 매수 계산과 원고지 쓰는 법</h2>
      <p>
        원고지 매수는 보통 가로 20칸, 세로 10줄인 <strong>200자 원고지</strong>를 기준으로 셉니다. 가로·세로 20칸인 400자
        원고지라면 매수가 절반이 됩니다.
      </p>
      <p className="formula">원고지 매수 = 공백 포함 글자수 ÷ 200 (올림)</p>
      <p>
        예를 들어 1,500자 독후감은 1,500 ÷ 200 = 7.5이므로 200자 원고지 <strong>{manuscriptSheets(1500)}매</strong>, 400자
        원고지로는 {manuscriptSheets(1500, 400)}매입니다. 실제 원고지에는 문단 첫 칸 들여쓰기와 문단 끝 빈칸이 생겨 이보다 조금 더
        들기 때문에, 계산기의 ‘문단 나눔 반영’ 값도 함께 참고하세요. 원고지에 옮겨 쓸 때의 기본 규칙은 다음과 같습니다.
      </p>
      <ul>
        <li>
          제목은 첫 줄을 비우고 둘째 줄 가운데에 씁니다. 제목 아래 한 줄을 비운 뒤 소속과 이름을 오른쪽 끝 두 칸을 남기고
          쓰고, 본문은 이름 아래 한 줄을 비우고 시작합니다.
        </li>
        <li>문단을 시작할 때마다 첫 칸을 비웁니다. 한 칸에는 한 글자를 쓰고, 띄어쓰기도 한 칸을 차지합니다.</li>
        <li>문장부호도 한 칸에 씁니다. 마침표·쉼표 뒤는 띄우지 않고, 물음표·느낌표 뒤는 한 칸 띄웁니다.</li>
        <li>아라비아 숫자와 알파벳 소문자는 한 칸에 두 자씩 씁니다.</li>
        <li>줄 끝에서 띄어 써야 할 때는 다음 줄 첫 칸을 비우지 않고 바로 이어 씁니다.</li>
      </ul>

      <h2>흔한 글자수 제한 예시</h2>
      <p>
        <strong>대학 입시</strong>: 대입 자기소개서 공통양식은 2021학년도까지 4개 문항 최대 5,000자(1,000·1,500·1,000자와 대학
        자율문항 1,500자)였고, 2022학년도에 3개 문항 최대 3,100자(1,500·800자와 자율문항 800자)로 줄었습니다(
        <a href="https://www.etoday.co.kr/news/view/1902122" target="_blank" rel="noopener noreferrer">
          이투데이 보도
        </a>
        ). 이어 2024학년도 대입부터 학생부종합전형의 자기소개서가 폐지되어(
        <a href="https://www.newsis.com/view/NISX20230120_0002166746" target="_blank" rel="noopener noreferrer">
          뉴시스 보도
        </a>
        ) 일반 수시 전형에서는 쓰지 않습니다. 다만 외국인 전형 등 일부 전형은 대학별 양식으로 자기소개서를 받기도 하니
        지원하는 전형의 모집요강을 확인하세요.
      </p>
      <p>
        <strong>취업·공공기관</strong>: 문항별로 500자, 700자, 1,000자처럼 100자 단위로 제한하는 경우가 흔하고, 바이트로
        제한할 때는 1,000바이트, 2,000바이트처럼 표시합니다. 같은 회사라도 공고마다 문항과 분량이 바뀌므로 해당 채용 공고의
        안내를 기준으로 삼으세요.
      </p>

      <h2>읽는 시간과 발표 시간</h2>
      <p>
        읽는 시간은 공백 제외 글자수를 눈으로 읽을 때 분당 {formatNumber(READING_CHARS_PER_MIN)}자, 소리 내어 읽을 때 분당{" "}
        {formatNumber(SPEAKING_CHARS_PER_MIN)}자로 가정해 계산한 대략적인 값입니다. 읽는 속도는 사람과 글의 난도에 따라 크게
        달라지므로, 1분 자기소개나 발표 원고는 소리 내어 시간을 재 보며 다듬는 것이 가장 정확합니다.
      </p>
    </ToolShell>
  );
}
