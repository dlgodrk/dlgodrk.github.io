# 셈셈 계산기

2026년 기준 생활 계산기 모음입니다. 연봉 실수령액, 만 나이, 퇴직금, 실업급여, 주휴수당, 평수, 대출 이자, 전역일 등
20개 계산기와 검색어별 안내 페이지 약 430개로 이루어져 있습니다.

- 사이트: https://dlgodrk.github.io/
- 스택: Next.js 16 (App Router, 정적 내보내기), React 19, Tailwind CSS 4, TypeScript, Vitest
- 호스팅: GitHub Pages. `main`에 push하면 `.github/workflows/deploy.yml`이 테스트, 빌드, 배포합니다. 매일 00:05(KST)에도 다시 빌드합니다.

## 계산 정확도

- 근로소득 간이세액표: 소득세법 시행령 [별표 2] (2026.2.27 개정) 7,117칸 전부와 일치하는지 테스트합니다 (`src/lib/rates/withholding.test.ts`).
- 4대보험: 4insure.or.kr 공식 모의계산 결과와 일치하는지 테스트합니다 (`src/lib/rates/insurance.test.ts`).
- 요율과 법령 근거, 검증 기록은 `docs/research/`에 있습니다.

## 개발

```bash
npm install
npm run dev        # 개발 서버
npm test           # 단위 테스트
npm run build      # 정적 사이트를 out/ 에 생성하고 sitemap.xml, robots.txt, rss.xml 작성
node scripts/audit.mjs      # 링크·제목·canonical 점검
node scripts/indexnow.mjs   # 배포 후 IndexNow(네이버·Bing)에 URL 제출
```

새 계산기를 만들 때는 `docs/CONVENTIONS.md`를 따릅니다. 홍보·SEO 계획은 `docs/PROMOTION.md`에 있습니다.

## 주의

계산 결과는 공개된 법령과 요율을 바탕으로 한 추정치입니다. 실제 금액은 회사 규정이나 개인 사정에 따라 다를 수 있습니다.
