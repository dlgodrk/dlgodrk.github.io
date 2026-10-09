/** Basis line and official links shared by /acquisition-tax/ pages. */

export const BASIS =
  "지방세법 제11조·제13조의2·제151조, 지방세특례제한법 제36조의3, 농어촌특별세법 제4조·제5조 기준 · 조정대상지역 2026년 10월 9일 현황 · 2026년 10월 9일 확인";

export const SOURCE_LINKS = {
  wetax: "https://www.wetax.go.kr/",
  /** 서울 전역·경기 12곳 규제지역 지정 (2025. 10. 15. 발표, 10. 16. 효력) */
  regulated2025: "https://www.korea.kr/news/policyNewsView.do?newsId=148950973",
  /** 화성 동탄구·용인 기흥구·구리시 추가 지정 (2026. 6. 30. 발표, 7. 1. 효력) */
  regulated2026: "https://www.korea.kr/news/policyNewsView.do?newsId=148967354",
  /** 지방 저가주택 중과 제외 기준 1억 → 2억원 (2025. 1. 2. 취득분부터) */
  lowPriceHomes: "https://www.korea.kr/news/policyNewsView.do?newsId=148942460",
  /** 법제처 생활법령정보: 부동산 매매 세금 */
  easylaw: "https://www.easylaw.go.kr/CSP/CnpClsMainBtr.laf?popMenu=ov&csmSeq=649&ccfNo=4&cciNo=3&cnpClsNo=2",
} as const;

export const LAW_LINKS: { name: string; href: string; detail: string }[] = [
  {
    name: "지방세법",
    href: "https://www.law.go.kr/법령/지방세법",
    detail:
      "제11조 제1항 제8호(주택 유상거래 1~3%), 제13조의2(다주택·법인 중과), 제13조의3(주택 수 판단), 제20조(신고·납부), 제151조(지방교육세). 현행은 2026. 7. 1. 시행본(법률 제21308호)입니다. 세대 기준은 같은 법 시행령 제28조의3입니다.",
  },
  {
    name: "지방세특례제한법",
    href: "https://www.law.go.kr/법령/지방세특례제한법",
    detail:
      "제36조의3(생애최초 주택 구입에 대한 취득세 감면), 2026. 6. 2. 시행본 기준. 2026. 1. 1. 시행 개정(법률 제21309호)으로 3개월 내 상시거주·추가 주택 취득 추징 요건이 삭제되었습니다.",
  },
  {
    name: "농어촌특별세법",
    href: "https://www.law.go.kr/법령/농어촌특별세법",
    detail:
      "제4조 제9호·제11호(비과세: 서민주택), 제5조(과세표준과 세율: 0.2%, 감면세액의 20%). 서민주택은 같은 법 시행령 제4조 제5항에 따라 주택법 제2조 제6호의 국민주택규모 이하 주택으로, 전용 85㎡ 이하이고 수도권 밖 도시지역이 아닌 읍·면은 100㎡ 이하입니다.",
  },
  {
    name: "주택법",
    href: "https://www.law.go.kr/법령/주택법",
    detail: "제2조 제6호(국민주택규모: 주거전용면적 85㎡ 이하, 수도권을 제외한 도시지역이 아닌 읍·면 지역은 100㎡ 이하).",
  },
  {
    name: "법제처 생활법령정보 - 부동산 매매 세금",
    href: SOURCE_LINKS.easylaw,
    detail: "취득세·지방교육세·농어촌특별세 계산 방법과 신고 기한.",
  },
];
