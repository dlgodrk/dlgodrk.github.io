import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { RULES_CHECKED_AT, RULE_YEAR, SITE_CONTACT, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "셈도장 계산기 소개",
  description: `${SITE_NAME}는 연봉 실수령액, 만 나이, 퇴직금처럼 생활에서 자주 하는 계산을 ${RULE_YEAR}년 기준으로 바로 해 주는 무료 계산기 모음입니다.`,
  path: "/about/",
});

export default function AboutPage() {
  return (
    <article className="page-wrap pt-10 pb-16">
      <div className="prose-ko">
      <h1 className="text-[1.75rem] font-bold text-ink">셈도장 계산기 소개</h1>
      <p>
        {SITE_NAME}는 월급 명세서를 읽거나, 퇴직금을 가늠하거나, 아파트 평수를 따질 때처럼 생활 속에서 자주 하는 계산을 한
        곳에 모은 무료 사이트입니다. 회원가입, 앱 설치, 개인정보 입력 없이 바로 쓸 수 있습니다.
      </p>
      <h2>계산 기준</h2>
      <ul>
        <li>세율과 보험료율은 {RULE_YEAR}년에 시행 중인 법령과 각 기관 공지를 기준으로 합니다.</li>
        <li>각 계산기 페이지 아래에 계산 방법과 출처를 적어 두었습니다.</li>
        <li>요율을 마지막으로 확인한 날은 {RULES_CHECKED_AT}입니다. 제도가 바뀌면 계산식도 고칩니다.</li>
      </ul>
      <h2>개인정보</h2>
      <p>
        입력한 값은 브라우저 안에서만 계산되고 서버로 보내지 않습니다. 글자수 세기만 쓰던 글을 이 브라우저에 잠시 보관하며,
        이 글도 서버로 보내지 않습니다. 자세한 내용은 <Link href="/privacy/">개인정보처리방침</Link>을 보세요.
      </p>
      <h2 id="contact">문의와 오류 제보</h2>
      <p>
        계산 결과가 공식 자료와 다르거나, 바뀐 제도가 아직 반영되지 않았거나, 개인정보와 관련해 묻고 싶은 점이 있으면{" "}
        <a href={SITE_CONTACT.url}>{SITE_CONTACT.channel}</a>에 남겨 주세요. 어느 계산기에서 어떤 값을 넣었는지와 근거 자료를
        함께 적어 주시면 빠르게 확인할 수 있습니다. 확인한 오류는 계산식과 설명에 반영합니다.
      </p>
      <p>
        이슈는 누구나 볼 수 있는 공개 게시판입니다. 이름, 연락처, 주소처럼 개인을 알아볼 수 있는 정보는 적지 마세요. 글을
        남기려면 GitHub 계정이 필요하며, 읽는 데는 필요하지 않습니다.
      </p>
      <h2>결과를 쓸 때 주의할 점</h2>
      <p>
        계산 결과는 일반적인 경우를 가정한 추정치입니다. 회사의 급여 규정, 개인의 공제 항목, 금융기관의 상품 조건에 따라
        실제 금액은 달라질 수 있습니다. 중요한 결정을 내리기 전에는 회사 담당자, 국세청, 국민연금공단, 고용노동부 같은
        담당 기관에 꼭 확인하세요.
      </p>
      </div>
    </article>
  );
}
