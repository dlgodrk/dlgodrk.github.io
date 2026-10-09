/** Pieces shared by /freelance-tax/ and its /freelance-tax/<만원>/ pages (server components). */

export const FREELANCE_BASIS = "2026년 10월 지급분 기준 · 소득세법 제129조 원천징수세율 · 2026년 10월 9일 확인";

const LAWS: { href: string; label: string }[] = [
  { href: "https://www.law.go.kr/법령/소득세법/제129조", label: "소득세법 제129조 (원천징수세율: 사업소득 3%, 기타소득 20%, 일용근로 6%)" },
  { href: "https://www.law.go.kr/법령/소득세법/제86조", label: "소득세법 제86조 (소액 부징수, 2024년 7월 인적용역 사업소득 제외)" },
  { href: "https://www.law.go.kr/법령/소득세법/제84조", label: "소득세법 제84조 (기타소득의 과세최저한)" },
  { href: "https://www.law.go.kr/법령/소득세법시행령/제87조", label: "소득세법 시행령 제87조 (기타소득 필요경비 60%)" },
  { href: "https://www.law.go.kr/법령/소득세법/제47조", label: "소득세법 제47조 (일용근로자 근로소득공제 1일 15만원)" },
  { href: "https://www.law.go.kr/법령/소득세법/제59조", label: "소득세법 제59조 (일용근로자 근로소득세액공제 55%)" },
  { href: "https://www.law.go.kr/법령/지방세법/제103조의13", label: "지방세법 제103조의13 (지방소득세 특별징수, 소득세의 10%)" },
  { href: "https://www.law.go.kr/법령/국고금관리법/제47조", label: "국고금 관리법 제47조 (10원 미만 끝수 계산 안 함)" },
];

export function LawLinks() {
  return (
    <ul>
      {LAWS.map((l) => (
        <li key={l.href}>
          <a href={l.href} target="_blank" rel="noopener noreferrer">
            {l.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
