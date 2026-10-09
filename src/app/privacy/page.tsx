import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = pageMetadata({
  title: "개인정보처리방침",
  description: `${SITE_NAME}는 계산에 입력한 값을 서버로 보내거나 저장하지 않습니다. 수집하는 정보와 쿠키 사용 범위를 안내합니다.`,
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
        전송하거나 저장하지 않습니다. 다만 결과 공유를 위해 입력값이 주소창의 링크(URL)에 담길 수 있으며, 그 링크를 다른
        사람에게 보내면 받은 사람도 같은 값을 볼 수 있습니다.
      </p>
      <h2>2. 자동으로 수집될 수 있는 정보</h2>
      <p>
        사이트를 운영하는 호스팅 업체는 보안과 장애 대응을 위해 접속 IP, 브라우저 종류, 방문 시각 같은 접속 기록을 일정
        기간 보관할 수 있습니다. 방문 통계를 위해 개인을 식별하지 않는 분석 도구를 쓸 수 있습니다.
      </p>
      <h2>3. 광고와 쿠키</h2>
      <p>
        향후 사이트 운영비를 위해 Google AdSense 같은 광고를 게재할 수 있습니다. 이 경우 광고 업체는 쿠키를 사용해 관심사에
        맞는 광고를 보여 줄 수 있으며, 사용자는 브라우저 설정이나 광고 설정 페이지에서 맞춤 광고를 끌 수 있습니다.
      </p>
      <h2>4. 문의</h2>
      <p>개인정보와 관련한 문의는 사이트 소개 페이지에 안내된 연락처로 보내 주세요.</p>
      </div>
    </article>
  );
}
