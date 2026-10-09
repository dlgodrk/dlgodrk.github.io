import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/seo";
import { SITE_CONTACT, SITE_NAME } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "개인정보처리방침",
  description: `${SITE_NAME}는 계산에 입력한 값을 서버로 보내지 않습니다. 글자수 세기의 브라우저 임시 보관, 접속 기록과 쿠키 사용 범위, 문의 방법을 안내합니다.`,
  path: "/privacy/",
});

export default function PrivacyPage() {
  return (
    <article className="page-wrap pt-10 pb-16">
      <div className="prose-ko">
      <h1 className="text-[1.75rem] font-bold text-ink">개인정보처리방침</h1>
      <p>시행일: 2026년 10월 9일</p>
      <h2>1. 입력한 값</h2>
      <p>
        계산기에 입력한 연봉, 생년월일, 날짜, 글 등은 사용자의 브라우저 안에서만 계산됩니다. {SITE_NAME}는 이 값을 서버로
        전송하지 않으며, 서버에 저장하지도 않습니다. 다만 결과 공유를 위해 입력값이 주소창의 링크(URL)에 담길 수 있으며, 그
        링크를 다른 사람에게 보내면 받은 사람도 같은 값을 볼 수 있습니다.
      </p>
      <h2>2. 브라우저에 보관하는 정보 (글자수 세기)</h2>
      <p>
        <Link href="/char-count/">글자수 세기</Link>는 새로고침해도 쓰던 글이 사라지지 않도록, 입력한 글을 이 브라우저의
        세션 저장소(sessionStorage)에 잠시 보관합니다. 이 글은 탭을 닫으면 지워집니다. ‘창을 닫아도 이 브라우저에 보관’을
        켜면 글과 이 설정을 로컬 저장소(localStorage)에 남겨, 창을 닫았다가 다시 열어도 불러옵니다. 어느 경우든 글은 서버로
        보내지 않으며 주소(URL)에도 담기지 않습니다. 지금 브라우저 저장소를 쓰는 기능은 글자수 세기뿐입니다.
      </p>
      <p>
        보관된 글은 글자수 세기에서 ‘지우기’를 누르면 바로 지워집니다. 보관 설정까지 없애려면 ‘창을 닫아도 이 브라우저에
        보관’을 끄거나, 브라우저 설정에서 이 사이트의 쿠키 및 사이트 데이터를 삭제하면 됩니다. 같은 브라우저를 쓰는 사람은
        보관된 글을 볼 수 있으니, 공용 PC에서는 다 쓴 뒤 ‘지우기’를 눌러 주세요.
      </p>
      <h2>3. 자동으로 수집될 수 있는 정보</h2>
      <p>
        사이트를 호스팅하는 GitHub Pages는 보안과 장애 대응을 위해 접속 IP, 브라우저 종류, 방문 시각 같은 접속 기록을 일정
        기간 보관할 수 있습니다. 방문 통계를 위해 개인을 식별하지 않는 분석 도구를 쓸 수 있습니다.
      </p>
      <h2>4. 광고와 쿠키</h2>
      <p>
        향후 사이트 운영비를 위해 Google AdSense 같은 광고를 게재할 수 있습니다. 이 경우 광고 업체는 쿠키를 사용해 관심사에
        맞는 광고를 보여 줄 수 있으며, 사용자는 브라우저 설정이나 광고 설정 페이지에서 맞춤 광고를 끌 수 있습니다.
      </p>
      <h2>5. 문의</h2>
      <p>
        개인정보와 관련한 문의는 <a href={SITE_CONTACT.url}>{SITE_CONTACT.channel}</a>에 남겨 주세요. 이슈는 누구나 볼 수
        있는 공개 게시판이므로 이름, 연락처, 주소처럼 개인을 알아볼 수 있는 정보는 적지 마세요. 글을 남기려면 GitHub 계정이
        필요합니다. {SITE_NAME}는 입력값을 서버에 저장하지 않으므로, 따로 열람하거나 삭제해 드릴 개인정보를 갖고 있지
        않습니다.
      </p>
      </div>
    </article>
  );
}
