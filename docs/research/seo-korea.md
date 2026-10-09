# Korean SEO and free promotion for a new static Next.js calculator site on *.vercel.app, late 2026: Naver, Daum, Google, Bing/IndexNow, structured data, keywords, competitors, promotion channels

_Researched 2026-10-09 by a research agent with web sources; see source URLs per fact._

## Facts
- **kr_search_engine_share_last30d_2026_10** = NAVER 67.9%, Google 26.7%, Bing 2.7%, Daum 2.2% (Zum not listed) (2026-09-08~2026-10-07, medium)
  - InternetTrend (BizSpring) sample of sites that run its logger, not national totals. Bing is now larger than Daum, so IndexNow, which reaches Bing and Naver, is worth more effort than Daum. Another aggregator reported Naver at 64.39% for April 2026 (low confidence).
  - sources: http://www.internettrend.co.kr/trendForward.tsp
- **naver_indexnow_supported** = Supported since July 2023. Endpoint https://searchadvisor.naver.com/indexnow (indexnow.org lists https://searchadvisor.naver.com/indexnow/meta.json) (2023-07~present (still listed 2026-10), high)
  - Naver says IndexNow tells it about new, updated or deleted pages but does not guarantee indexing. The official guide is at searchadvisor.naver.com/guide/indexnow-about; WebFetch is blocked for Naver domains, so the guide page itself was not read.
  - sources: https://www.indexnow.org/searchengines.json , https://news.hada.io/topic?id=19225 , https://blog.naver.com/naver_webmaster/223165612654
- **indexnow_participants_2026** = Bing, Yandex, Seznam, Naver, Yep, Internet Archive, Amazonbot, plus the global endpoint https://api.indexnow.org/indexnow (as of 2026-10, high)
  - A submission to any one endpoint is shared with every participating engine. Google does not take part. Bing's own endpoint is https://www.bing.com/indexnow, and Bing's getstarted page shows POST to https://api.indexnow.org/IndexNow.
  - sources: https://www.indexnow.org/searchengines.json , https://www.indexnow.org/faq
- **indexnow_key_rules** = Key is 8–128 characters from [a-zA-Z0-9-]. Host a UTF-8 file named {key}.txt at the site root containing only the key. A key file in a subfolder (passed as keyLocation) only covers URLs under that folder. (current protocol, high)
  - In Next.js, put the file at public/{key}.txt.
  - sources: https://www.indexnow.org/documentation , https://www.bing.com/indexnow/getstarted
- **indexnow_limits_and_codes** = Up to 10,000 URLs per POST. Responses: 200 OK; 202 Accepted (key validation pending); 400 bad request; 403 key not valid; 422 URLs do not belong to the host or key fails the schema; 429 too many requests (current protocol, high)
  - FAQ guidance: submit only URLs that changed. Wait at least 10 minutes (5 minutes for pages that update often) before resubmitting the same URL, and honour Retry-After on a 429. Exact rate limits are not published.
  - sources: https://www.indexnow.org/documentation , https://www.indexnow.org/faq
- **naver_site_ownership_verification** = Two methods: HTML file upload, or HTML meta tag <meta name="naver-site-verification" content="..."> placed in <head>. Register the site URL with the https:// prefix. (current, high)
  - If both http and https respond, each must be registered. One 2026 summary says HTML-tag verification must be renewed every year; no second source confirmed this (low confidence), so leave the tag in place permanently.
  - sources: https://inblog.ai/ko/docs/seo-tutorial-domain-setup/registering-with-naver-search-advisor , https://support.wix.com/en/article/verifying-your-site-with-naver-webmaster-tools , https://velog.io/@live_in_truth/SEO-적용하기-feat-nextjs-vercel
- **naver_search_advisor_menus** = 요청 > 사이트맵 제출 (sitemap.xml URL); 요청 > RSS 제출 (feed URL); 요청 > 웹 페이지 수집 (request crawl of individual URLs) (current, high)
  - No source confirmed a daily quota for 웹 페이지 수집 (a '50 per day' figure circulates but is unverified). Bloggers report RSS as one feed per site (unverified). Neither submission nor a crawl request guarantees indexing.
  - sources: https://inblog.ai/ko/docs/seo-tutorial-domain-setup/registering-with-naver-search-advisor , https://marketing-help.nhn-commerce.com/traffic-growth-strategies/naver-seo/naver-searchadvisor-inspection
- **naver_yeti_robots** = robots.txt token is 'Yeti'. User-Agent: Mozilla/5.0 (compatible; Yeti/1.1; +https://naver.me/spd), sometimes with a Chrome build appended. Verify real Yeti traffic by reverse DNS ending in .naver.com (current, high)
  - Official crawler page: searchadvisor.naver.com/guide/seo-basic-firewall. Other Naver bots: Ads-Naver (ad quality checks; Naver says it ignores robots.txt) and Blueno (link previews). Search Advisor offers a 'robots.txt 간단 생성' tool.
  - sources: https://51degrees.com/blog/naver-crawlers-2026 , https://chrisleverseo.com/user-agents/yeti/ , https://jab-guyver.co.kr/1818
- **naver_rendering_guidance** = Server-side rendering (SSR or static generation) is recommended, so all text must be in the initial HTML. Use descriptive path URLs, 301 for moved pages, 404/410 for removed pages, rel=canonical for duplicates (guide summary dated 2026-05-29, medium)
  - No source confirms whether Yeti executes JavaScript. Static Next.js export or SSG satisfies this. The same summary says a new site takes about 14–16 days to appear in Naver.
  - sources: https://inblog.ai/ko/blog/naver-official-seo-guide
- **naver_structured_data_support** = Naver supports a subset of schema.org (one 2025-04-30 article says 14 types vs Google's 35). For Organization, Naver's table lists name, url and sameAs as required (2025-04, low)
  - The full list of Naver types was not found, and the official Naver guide could not be fetched. JSON-LD for Organization/WebSite/BreadcrumbList is harmless. Do not expect rich results on Naver from it.
  - sources: https://ditoday.com/?p=124530
- **daum_webmaster_tool_registration** = https://webmaster.daum.net. Issue a PIN code, add the issued line to robots.txt, run '로봇 룰 테스트', then confirm. During signup you set an 8–12 character alphanumeric PIN that also serves as the tool's login password (tool launched 2020-08 (beta); procedure confirmed by a 2025-07-14 blog post, medium)
  - Features: 수집요청/문서 등록 (one blogger saw results in about 2 minutes), sitemap and RSS submission (added around 2022), collection/index/search statistics, document analysis. Ownership is proved through robots.txt, not a meta tag. Copy the exact robots.txt line from the tool; the format commonly seen is '#DaumWebMasterTool:<hash>:<id>' (unverified). WebFetch of webmaster.daum.net failed on its TLS certificate.
  - sources: https://iter.kr/다음-웹마스터도구-등록 , https://jab-guyver.co.kr/1868 , https://www.kakaocorp.com/page/detail/8807
- **google_sitemap_ping_deprecated** = Ping endpoint deprecated (announced 2023-06-26). Requests now return 404. Submit through the Search Console Sitemaps report, the Search Console API, or a 'Sitemap:' line in robots.txt (stopped working about late 2023 / early 2024, high)
  - Sitemap limits are 50MB uncompressed or 50,000 URLs. Google ignores <priority> and <changefreq>, and uses <lastmod> only when it is consistently accurate.
  - sources: https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping , https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- **bing_sitemap_ping_removed** = Anonymous sitemap ping (bing.com/ping?sitemap=) ended 2022-05-13 and the endpoint returns HTTP 410. Use Bing Webmaster Tools, a robots.txt Sitemap line, or IndexNow (2022-05-13~, high)
  - sources: https://searchengineland.com/microsoft-bing-drops-anonymous-sitemap-submission-due-to-spam-issues-385178 , https://www.ctrl.blog/entry/sitemap-ping-indexnow/
- **gsc_verification_methods** = URL-prefix property: HTML file upload, HTML tag <meta name="google-site-verification" content="...">, Google Analytics, Google Tag Manager. Domain property: DNS record only (current, high)
  - You cannot add DNS records for vercel.app, so use a URL-prefix property such as https://<project>.vercel.app/. The tag must sit in <head> within the first 2MB of a home page that needs no login, and must stay there or verification is lost.
  - sources: https://support.google.com/webmasters/answer/9008080?hl=en
- **google_faq_rich_result_status** = FAQ rich results are no longer shown in Google Search for any site from 2026-05-07. Documentation was removed 2026-06-15. They had been limited to well-known government and health sites since August 2023 (2026-05-07~, high)
  - Secondary sources report Search Console FAQ reporting and Rich Results Test support were dropped in June 2026 and API data in August 2026. Google says unused markup does not cause problems.
  - sources: https://developers.google.com/search/updates , https://developers.google.com/search/docs/appearance/structured-data/faqpage
- **google_howto_rich_result_status** = HowTo rich results are deprecated. Mobile display was cut in August 2023 and desktop display ended 2023-09-13. HowTo no longer appears in the search gallery (2023-09-13~, high)
  - sources: https://www.searchenginejournal.com/google-completely-removes-how-to-rich-results/496479/ , https://developers.google.com/search/docs/appearance/structured-data/search-gallery
- **google_structured_data_deprecations_2025_2026** = Announced 2025-06-12 (7 types: Book Actions, Course Info, ClaimReview, Estimated Salary, Learning Video, Special Announcement, Vehicle Listing); documentation for 5 of them removed 2025-09-09. Practice problem phased out 2025-11-05 and its documentation removed 2026-01-06. Dataset markup is used only by Dataset Search (2025-11-05). FAQ ended 2026-05-07 (2025-06-12~2026-06-15, high)
  - Dataset markup brings no Google Search benefit to a calculator site.
  - sources: https://developers.google.com/search/updates , https://developers.google.com/search/blog/2025/06/simplifying-search-results
- **google_supported_features_2026** = Search gallery lists: Article, Breadcrumb, Carousel, Course list, Dataset, Discussion forum, Education Q&A, Employer aggregate rating, Event, Image metadata, Job posting, Local business, Math solver, Movie carousel, Organization, Product, Profile page, Q&A, Recipe, Review snippet, Software app, Speakable, Subscription/paywalled content, Vacation rental, Video (as of 2026-10, high)
  - Site names come from WebSite markup (name, url, alternateName) on the home page and work for subdomain-level sites.
  - sources: https://developers.google.com/search/docs/appearance/structured-data/search-gallery
- **google_software_app_requirements** = @type SoftwareApplication, WebApplication or MobileApplication. Required: name; offers.price (0 for free); and aggregateRating or review. Recommended: applicationCategory (one of 22 supported values, e.g. FinanceApplication, UtilitiesApplication, HealthApplication, ReferenceApplication), operatingSystem (current, high)
  - Without real ratings or reviews the page cannot get a Software app rich result. Never invent ratings, since violations can bring a manual action. WebApplication markup without ratings is valid but shows nothing.
  - sources: https://developers.google.com/search/docs/appearance/structured-data/software-app
- **google_spam_policies_relevant** = Scaled content abuse (many pages made mainly to manipulate rankings with little value). Doorway abuse (substantially similar pages targeting similar queries, closer to search results than a browseable hierarchy) (current (policies introduced 2024-03), high)
  - Mass pages such as '연봉 2,510만원 실수령액' … '연봉 15,000만원 실수령액' carry this risk. Prefer one hub table page, or a limited set of genuinely distinct pages.
  - sources: https://developers.google.com/search/docs/essentials/spam-policies
- **vercel_hobby_commercial_ban** = Hobby teams are limited to non-commercial personal use. Commercial use explicitly includes 'The inclusion of advertisements, including … Google AdSense', affiliate linking as the main purpose, and taking payments. Donations are allowed (docs last_updated 2026-09-14, high)
  - Running AdSense or Coupang Partners on a Hobby project breaks the policy. Use a Pro plan or another free host before adding ads. Hobby includes 100GB Fast Data Transfer and 1M function invocations per month.
  - sources: https://vercel.com/docs/limits/fair-use-guidelines
- **vercel_indexing_behavior** = Preview deployments get the header X-Robots-Tag: noindex automatically; previous production deployments become noindex after a new promotion. The current production *.vercel.app URL is indexable (current, high)
  - After moving to a custom domain, add rel=canonical pointing to it and 301-redirect *.vercel.app to it. Otherwise both hosts get indexed as duplicates.
  - sources: https://vercel.com/kb/guide/are-vercel-preview-deployment-indexed-by-search-engines , https://vercel.com/kb/guide/avoiding-duplicate-content-with-vercel-app-urls
- **adsense_on_vercel_app_subdomain** = Effectively not approvable. You do not control the vercel.app root, and AdSense reportedly stopped allowing subdomains to be added separately on 2023-03-20 (only platform partners like blogspot are exempt) (2023-03-20~, medium)
  - Based on a third-party guide and forum reports, not an explicit Google statement. A custom domain is needed before applying.
  - sources: https://www.webnots.com/how-to-add-subdomains-in-google-adsense-account/ , https://answers.netlify.com/t/can-i-use-adsense-in-netlify-blog/20789 , https://support.google.com/adsense/answer/12169212?hl=en
- **portal_builtin_calculators** = Naver: age calculator rebuilt 2023-06-28 (만 나이, 띠, 연 나이, legal age thresholds such as voting, driving, part-time work, working holiday), 글자수 세기 (공백 포함/제외), interest calculator in 'direct search'. Daum (since 2016-02): 10 calculators — 연봉, 대출이자, 부동산중개수수료, 퇴직금, 예적금, 비만도(BMI), 복부비만도, 일반, 퍼센트, 학점 (Naver 2023-06-28; Daum 2016-02, medium)
  - For head terms such as 만나이 계산기, 글자수 세기, 대출이자 계산기 and BMI, the portal widget answers the query on the results page, so clicks to outside sites are limited. Target long-tail queries instead (e.g. '육군 전역일 계산기 2026 입대', '권고사직 실업급여 계산', '2026 연봉 4000 실수령액 표').
  - sources: https://news.mtn.co.kr/news-detail/2023062714074465619 , https://www.kakaocorp.com/page/detail/7916 , https://mimmi.co.kr/%EC%8B%A4%EC%8B%9C%EA%B0%84-%EA%B8%80%EC%9E%90%EC%88%98-%EA%B3%84%EC%82%B0%EA%B8%B0-%EB%84%A4%EC%9D%B4%EB%B2%84-%EA%B8%80%EC%9E%90%EC%88%98%EC%84%B8%EA%B8%B0/
- **calculator_keyword_volumes** = No verifiable Naver keyword-tool figures were found. One unsourced claim (policy.ambitstock.com/calculators, 2026): 퇴직금 계산기 ~80,000+/mo, 종합소득세 계산기 ~60,000+, 실업급여 계산기 ~50,000+, 건강보험료 계산기 ~40,000+, 부동산 취득세 계산기 ~40,000+, 자동차세 계산기 ~35,000+, 주택청약 가점 계산기 ~35,000+, 근로장려금 계산기 ~30,000+, 기초연금 자격 계산기 ~30,000+, 전월세 전환율 계산기 ~25,000+, 청년도약계좌 ~25,000+, 월세 세액공제/부가세/재산세/연금저축·IRP 세액공제 계산기 ~20,000+ each (unknown date, low)
  - No source or date is given for these numbers; treat them as relative hints only. No usable figures were found for 연봉 실수령액, 만나이 계산기, 평수 계산기, 글자수 세기, 주휴수당, 전역일, 대출이자, 적금이자, 연차, 출산예정일, BMI, D-day or 복비. Get real numbers from the free 네이버 검색광고 키워드도구 (searchad.naver.com > 도구 > 키워드 도구; PC and mobile monthly counts over the last 30 days; up to 5 keywords per query; requires an ad account but no spend) or its API, and query spacing variants separately (만나이계산기 / 만나이 계산기 / 만 나이 계산기). Naver DataLab gives only a relative index.
  - sources: https://policy.ambitstock.com/calculators/
- **naver_keywordtool_api_fields** = /keywordstool returns relKeyword, monthlyPcQcCnt, monthlyMobileQcCnt, compIdx, among others. Low-volume terms return the string '< 10' instead of an integer (current, medium)
  - Parse '< 10' as a flag, not as 10.
  - sources: https://pypi.org/project/naver-search-ad , https://aboda.kr/entry/%ea%b2%80%ec%83%89%ec%96%b4-%eb%b6%84%ec%84%9d-%ed%8a%b8%eb%a0%8c%eb%93%9c-%ed%8c%8c%ec%9d%b4%ec%8d%ac-%ec%bd%94%eb%93%9c-%eb%a7%8c%eb%93%a4%ea%b8%b0-with-streamlit-1%ed%8e%b8 , https://github.com/naver/searchad-apidoc/issues/1060
- **competitor_landscape** = Job portals: saramin (연봉계산기; 글자수세기 with 공백 포함/제외, bytes, and spell check up to 4,000 characters), jobkorea, incruit, career.co.kr. Fintech and banks: toss feed, finda, banksalad, bank calculators. Calculator collections: calcnara.com, tools.devcomma.com (hundreds of tools in 14 categories), oursupporter.com, demoday.co.kr/tools, k-calc.com, ezloan.io, braindetox.kr, job.cosmosfarm.com, mannae.org, superkts.com, policy.ambitstock.com. Real estate: realty.daangn.com brokerage-fee tool (기준일 2026-05-19) (observed 2026-10, medium)
  - What competitors do: calcnara shows a basis card (legal source, base year, last review 2026-06, golden-test verification), fee matrix tables, worked examples, 13+6 FAQs and source links, but has internal contradictions (12억+ tier listed as 0.6% in one place and 0.6/0.7% in another; rent multiplier ×100 vs ×70/×200; '2025 현행' vs '2026 현행'). devcomma has no sources or update dates and earns from Coupang Partners. mannae.org has a 12-item FAQ, legal-age table, yearly age table and PNG/PDF share, but cites no sources. cosmosfarm has a 2026 salary table (₩10M–150M in ₩1M steps) with no assumptions stated and a non-monotonic row (₩123M nets less than ₩122M). Gaps to exploit: cite official sources with effective dates; show formulas and rounding rules; state assumptions (비과세 식대 20만원, 부양가족 수); keep tables consistent; date-aware rates (e.g. the National Pension cap that changes each July); worked examples tested against official tables; fast static pages with no login.
  - sources: https://www.saramin.co.kr/zf_user/tools/character-counter , https://tools.devcomma.com/ , https://calcnara.com/calculators/realtor-fee , https://mannae.org/ , https://job.cosmosfarm.com/ko/calculator/salary , https://realty.daangn.com/tools/brokerage-fee , https://tools.devcomma.com/calculators/army-discharge
- **promo_geeknews_show_gn** = Show GN accepts only things people can use now that the poster built or helped build; the poster must answer feedback. Banned: blog posts, landing or pre-launch pages, newsletters, YouTube links, reposting the same project within a set period, posting several projects in a row, asking friends for upvotes, multiple accounts. Title format 'Name - core feature' ('Show GN:' is added automatically). New accounts wait one week before posting news links (current guidelines (read 2026-10), high)
  - Good fit for a free, no-signup calculator collection. Post once, with the motivation and how accuracy was verified in the description.
  - sources: https://news.hada.io/guidelines , https://news.hada.io/blog/show
- **promo_clien_rules** = Site rules (last revised 2026-05-18) ban promotion disguised as an ordinary member, viral or professional promotion of blogs/videos/apps, and referral-code spam. There is a 직접홍보 board. The 개발한당 group notice '홍보에 관한 공지' (2020-07-22, edited 2024-07-03) lets established members promote their own software or blogs with links; a new account whose first post is promotion, or that only promotes, may be deleted without notice; copy-paste promo is discouraged (2026-05-18 rules; 2024-07-03 notice, high)
  - Admin notice: revenue-linked links and PPL can lead to deletion. A link to a site with ads is a grey area; disclose that you made it and post in 개발한당 or 직접홍보.
  - sources: https://www.clien.net/service/board/rule/10707403 , https://www.clien.net/service/board/cm_app , https://www.clien.net/service/board/cm_app/15199283
- **promo_dcinside_rules** = No site-wide self-promotion rule; each gallery's managers set rules. Example: the 데스크탑 minor gallery rules (revised 2026-03-02) class obvious commercial ads or promotion as a serious violation, allowing an immediate 30-day block or permanent ban without warning, and an earlier version deleted posts that steer users to external links. The 독서 gallery requires a fixed nickname and real activity (2026-03-02 (one gallery), medium)
  - High risk. Only share where a gallery's pinned notice allows it, and as a useful answer in context.
  - sources: https://gall.dcinside.com/m/desktopcomputer/2643 , https://gall.dcinside.com/m/reading/459728 , https://gall.dcinside.com/m/chartanalysis/1792956
- **promo_ppomppu_rules** = Official 뽐뿌 self-promotion rules were not found (unknown, low)
  - Read the pinned notice of each board before posting. Contact listed in the App Store entry: aired@ppomppu.co.kr.
  - sources: https://v.daum.net/v/YTYqnESrRb
- **promo_reddit** = r/korea's own self-promotion page is linked from its wiki but could not be read. Reddit's common guideline keeps self-promotion to about 10% of a user's activity. A mirror thread reports that r/InternetIsBeautiful banned the vercel.app domain (2026, low)
  - WebFetch is blocked on reddit.com. Reddit's audience is mostly English-speaking and a poor fit for Korean salary or tax tools. Use a custom domain before posting there.
  - sources: https://lr.us.psf.lt/r/korea/wiki , https://redlib.hbubli.cc/r/cybersecurity/wiki/rules/promotion , https://rl.klein.ruhr/r/InternetIsBeautiful/comments/1v3oss6/sub_news_new_banned_domain_vercelapp/
- **promo_kakao_openchat** = Unsolicited promotion to people who did not want it is grounds for restriction. The policy revision effective 2025-06-16 added bans in grooming contexts, and illegal investment-advice promotion can bring a permanent ban. Enforcement is report-based (2025-06-16 revision, medium)
  - Share only in rooms whose host allows links, e.g. part-time-worker or job-seeker rooms where a 주휴수당 or 실업급여 calculator answers a question.
  - sources: https://www.i-boss.co.kr/ab-1486505-28925 , https://aboda.kr/entry/%ec%b9%b4%ec%b9%b4%ec%98%a4%ed%86%a1-%ec%98%a4%ed%94%88%ec%b1%84%ed%8c%85-%ec%a0%95%ec%a7%80-%ec%82%ac%ec%9c%a0%ec%99%80-%ed%95%b4%ec%a0%9c-%eb%b0%a9%eb%b2%95-%ec%99%84%eb%b2%bd-%ea%b0%80%ec%9d%b4
- **promo_disquiet** = Disquiet (disquiet.io) is a Korean maker community with product pages (/products/), maker logs and a '인기 프로덕트' list. Posting and liking require login (observed 2026-10, medium)
  - Promotion rules and ranking criteria were not found on the page.
  - sources: https://disquiet.io/ , https://yozm.wishket.com/magazine/product-valley/products/disquiet/
- **promo_owned_channels** = Channels you own: Naver Blog (indexed by Naver; heavy repeated ad links get restricted under 2025 quality policy), Tistory (Kakao), Brunch (needs writer approval), velog, Naver Cafe (each cafe sets rules, usually needs membership upgrade). 지식iN 'marketing' answers have been restricted (2015 notice) and companies disclosing themselves report deletions (various, low)
  - The search quota ran out before Brunch and Naver Cafe rules could be checked. The safest pattern is informational posts (e.g. '2026 실업급여 하한액 66,048원 계산법') that link to the tool as a citation.
  - sources: https://www.i-boss.co.kr/ab-6141-66374 , https://www.i-boss.co.kr/ab-1486505-4676

## Formulas

```
1) IndexNow submission (Naver + Bing + others via one endpoint)
- KEY: random 32 chars from [a-zA-Z0-9-] (allowed length 8–128). Serve public/{KEY}.txt with body exactly KEY, UTF-8, at https://HOST/{KEY}.txt.
- Single URL: GET https://searchadvisor.naver.com/indexnow?url=<RFC3986-encoded URL>&key=KEY
  (or https://api.indexnow.org/indexnow?..., or https://www.bing.com/indexnow?...)
- Batch: POST https://api.indexnow.org/IndexNow
  Content-Type: application/json; charset=utf-8
  {"host":"HOST","key":"KEY","keyLocation":"https://HOST/KEY.txt","urlList":[ ≤10,000 absolute URLs on HOST ]}
- Run once after each deploy, with only the URLs whose content changed (diff of the build manifest). Never resubmit an unchanged URL within 10 minutes.
- Response handling: 200 or 202 = success. 403 = fix the key file. 422 = a URL's host differs from 'host' (for example vercel.app vs a custom domain). 429 = wait for the Retry-After header, then retry with backoff. 400 = fix the JSON.
- Moving from *.vercel.app to a custom domain needs a new host value. The key file must exist on the new host.

2) robots.txt template (static file at /robots.txt)
User-agent: *
Allow: /
User-agent: Yeti
Allow: /
Sitemap: https://HOST/sitemap.xml
# Paste the exact PIN line issued by Daum 웹마스터도구 here (format per tool; Daum verifies via robots.txt)
Rule: never ship 'Disallow: /' from staging. Vercel previews are already noindexed by header.

3) <head> per page (Next.js metadata)
<meta name="google-site-verification" content="...">   (home page; keep permanently)
<meta name="naver-site-verification" content="...">    (home page; keep permanently)
<link rel="canonical" href="https://CANONICAL_HOST/path">  (after a custom domain exists, canonical points to it and *.vercel.app 301-redirects)
Unique <title> and meta description per calculator. og:title, og:description, og:url and og:image consistent with the title.
All explanatory text, tables and FAQ answers must be in the server-rendered or static HTML (SSG). Do not rely on client-side JavaScript for indexable text.

4) sitemap.xml
- Absolute canonical URLs only; at most 50,000 URLs or 50MB uncompressed per file, otherwise use a sitemap index.
- lastmod = date the content actually changed (e.g. 2026-10-09 or 2026-10-09T09:00:00+09:00). Do not bump it on every build. Google ignores priority and changefreq.
- Submit in GSC (Sitemaps report), Naver (요청>사이트맵 제출), Daum, and Bing Webmaster Tools; also add the robots.txt Sitemap line. Google's ping endpoint returns 404 and Bing's returns 410, so neither works.
- RSS: a /rss.xml of new or updated guide pages for Naver's 요청>RSS 제출 (bloggers report one feed per site).

5) JSON-LD plan (safe in 2026)
- Home page: {"@context":"https://schema.org","@type":"WebSite","name":"<site name>","alternateName":["<short name>","<host>"],"url":"https://HOST/"} plus Organization {name, url, logo, sameAs:[social URLs]} (Naver's Organization table requires name, url, sameAs).
- Each calculator: BreadcrumbList (positions from 1, absolute item URLs, matching the visible breadcrumb).
- Optional: {"@type":"WebApplication","name":...,"applicationCategory":"FinanceApplication|UtilitiesApplication|HealthApplication|ReferenceApplication","operatingSystem":"Any","offers":{"@type":"Offer","price":"0","priceCurrency":"KRW"}}. This gives no rich result without genuine aggregateRating or review. Never fabricate ratings.
- FAQPage: no Google rich result since 2026-05-07. Use it only if it matches visible Q&A (it may still help Bing or AI parsers). Skip HowTo (deprecated 2023-09-13) and Dataset (used only by Dataset Search).

6) Keyword data ingestion (Naver 검색광고 키워드도구 / API)
vol(x) = (x == "< 10") ? {value: null, lt10: true} : int(x)
total = monthlyPcQcCnt + monthlyMobileQcCnt, valid only when both are integers; otherwise report a lower bound and flag it.
Query each spacing variant separately and sum the results; do not treat them as duplicates.

7) Anti-doorway rule for programmatic pages
Create '연봉 N만원 실수령액'-style pages only if each page adds distinct value (its own explanation, a breakdown table, links to adjacent bands). Otherwise use one hub table page with anchor links and a canonical pointing to the hub. This avoids Google's scaled-content and doorway policies.

8) Cross-check formulas inferred from competitor 2026 salary table (cosmosfarm; rates confirmed by back-calculation)
taxable_monthly = annual/12 − 200,000 (비과세 식대)
국민연금 = floor10( floor1000(taxable_monthly) × 4.75% ), capped at 기준소득월액 상한 6,370,000 → 302,570. The cap changes every July, so verify the value for 2026-07~2027-06.
건강보험 = floor10(taxable_monthly × 3.595%)
장기요양 = floor10(taxable_monthly × 0.4724%)  (equivalently health premium × 0.9448/7.19)
고용보험 = floor10(taxable_monthly × 0.9%)
floor10(x) = 10원 미만 절사; floor1000(x) = 1,000원 미만 절사.

9) Military discharge (competitor formula): 전역일 = 입대일 + 복무개월 − 1일. 복무개월: 육군/해병/상근 18, 해군 20, 공군 21, 사회복무 21, 대체복무 36.

10) Housing brokerage fee (경기도 조례 table, 2021 tiers)
fee = min(amount × rate, cap). For 월세: 거래금액 = 보증금 + 월세×100, and if that is under 5천만원 use 보증금 + 월세×70.
VAT: +10% for a 일반과세자, +4% for a 간이과세자.
Rates vary by 시·도 within ±0.1%p, so show the region selector and the source.
```

## Test vectors
- GET https://www.google.com/ping?sitemap=https://HOST/sitemap.xml => HTTP 404 (endpoint retired; does nothing) [https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping]
- GET https://www.bing.com/ping?sitemap=https://HOST/sitemap.xml => HTTP 410 Gone [https://www.ctrl.blog/entry/sitemap-ping-indexnow/]
- POST https://api.indexnow.org/IndexNow {host:'HOST', key:K, keyLocation:'https://HOST/K.txt', urlList:['https://HOST/salary']} where K.txt serves K => 200 OK or 202 Accepted [https://www.indexnow.org/documentation]
- Same POST but https://HOST/K.txt returns 404 or a different string => 403 Forbidden [https://www.indexnow.org/documentation]
- POST with host:'myapp.vercel.app' but urlList containing https://example.com/page => 422 Unprocessable Entity [https://www.indexnow.org/documentation]
- IndexNow key 'abc123' (6 chars) => Invalid: key must be 8–128 chars of [a-zA-Z0-9-] [https://www.indexnow.org/documentation]
- curl -I https://<project>-git-<branch>-<team>.vercel.app (preview deployment) => response header x-robots-tag: noindex [https://vercel.com/kb/guide/are-vercel-preview-deployment-indexed-by-search-engines]
- Validate WebApplication JSON-LD with name + offers.price 0 but no aggregateRating/review in the Rich Results Test => Not eligible for the Software app rich result (missing required aggregateRating or review); no error penalty [https://developers.google.com/search/docs/appearance/structured-data/software-app]
- Annual salary ₩30,000,000 (2026 rates, 비과세 20만원 assumed) => Monthly: 국민연금 109,250; 건강보험 82,680; 장기요양 10,860; 고용보험 20,700; 소득세 28,760; 지방소득세 2,870; 공제계 255,120; 실수령 2,244,880 [https://job.cosmosfarm.com/ko/calculator/salary (insurance lines re-derived with 4.75% / 3.595% / 0.4724% / 0.9% and 10원 절사)]
- Annual salary ₩40,000,000 (2026 rates, 비과세 20만원 assumed) => Monthly: 국민연금 148,810 (=floor10(3,133,000×4.75%)); 건강보험 112,640; 장기요양 14,800; 고용보험 28,190; 소득세 93,330; 지방소득세 9,330; 공제계 407,100; 실수령 2,926,233 [https://job.cosmosfarm.com/ko/calculator/salary]
- Annual salary ≥ ₩80,000,000 (pension cap) => 국민연금 302,570 (= floor10(6,370,000 × 4.75%)); cap valid 2025-07~2026-06, so verify the cap for 2026-07~ [https://job.cosmosfarm.com/ko/calculator/salary]
- 만나이: birth 1990-03-15, reference 2026-01-01 / 2026-03-15 / 2026-12-31 => 만나이 35 / 36 / 36; 세는나이 37 on all three dates [https://mannae.org/]
- 전역일: 육군 18개월, 입대일 2026-01-05 => 2027-07-04 (입대일 + 18개월 − 1일) [https://tools.devcomma.com/calculators/army-discharge (formula); date computed]
- 중개보수: 주택 매매 5억원 (경기도 조례 tiers) => 0.4% → 2,000,000원 (일반과세자 VAT 포함 2,200,000원) [https://www.suwon.go.kr/sw-www/deptHome/dep_city/city03/city03_04.jsp (rate table; arithmetic computed)]
- 중개보수: 주택 월세 보증금 2억 + 월 50만원 => 거래금액 2.5억 → 0.3% → 750,000원 [https://www.suwon.go.kr/sw-www/deptHome/dep_city/city03/city03_04.jsp (rate table; arithmetic computed)]
- Naver keyword API row {monthlyPcQcCnt:'< 10', monthlyMobileQcCnt:40} => pc flagged <10, mobile 40, total reported as '40~49' (lower bound 40), not 50 [https://aboda.kr/entry/%ea%b2%80%ec%83%89%ec%96%b4-%eb%b6%84%ec%84%9d-%ed%8a%b8%eb%a0%8c%eb%93%9c-%ed%8c%8c%ec%9d%b4%ec%8d%ac-%ec%bd%94%eb%93%9c-%eb%a7%8c%eb%93%a4%ea%b8%b0-with-streamlit-1%ed%8e%b8]

## Caveats

1. Naver primary sources could not be read. WebFetch refuses searchadvisor.naver.com, blog.naver.com and developers.naver.com, and the in-app browser blocks searchadvisor.naver.com. Naver facts come from indexnow.org, the GeekNews post, and Korean third-party guides (inblog, NHN Commerce, 51Degrees), cross-checked across them. Still unconfirmed: a daily quota for 웹 페이지 수집, whether RSS is limited to one feed, the claimed yearly re-verification of ownership, Naver's list of supported schema types, and whether Yeti executes JavaScript.

2. Daum: webmaster.daum.net failed TLS verification under WebFetch. The PIN-in-robots.txt procedure is confirmed by blogs from 2021 and 2025-07, but the exact robots.txt line format is not. Copy it from the tool.

3. Keyword volumes: no trustworthy Naver keyword-tool numbers were found for any of the 15 keywords requested. The only figures, from policy.ambitstock.com, have no source or date and may be invented. Pull real numbers from the free 네이버 검색광고 키워드도구 before choosing priorities.

4. Competitor rankings: WebSearch is US-only, so actual Google.co.kr and Naver result orders could not be observed. The competitor list comes from sites that appear repeatedly for the Korean queries and from fetched pages.

5. Hosting and ads: Vercel's Hobby plan forbids ads, and AdSense effectively cannot approve a *.vercel.app subdomain. Monetising with ads therefore needs a custom domain and either Vercel Pro or another host. This conflicts with the brief's "no budget, *.vercel.app" setup and should be decided before adding ad code.

6. Salary test vectors: these come from a competitor table whose deduction lines match the 2026 rates (4.75% pension, 3.595% health, 0.4724% LTC, 0.9% employment, 10원 절사). The income-tax lines and the 6,370,000 pension cap were not checked against official tables. The cap is reset every July, so the 2026-07~2027-06 value must be checked with NPS.

7. Unverified items: Reddit and Brunch rules, 뽐뿌 rules, and the reported vercel.app ban on r/InternetIsBeautiful (seen only through a third-party mirror that failed to load).

8. The session's WebSearch quota (200 calls) ran out near the end, so a few items, including Brunch writer approval and 지식iN's current policy, were not searched further. A follow-up run can continue them.

9. Google dates are confirmed on developers.google.com/search/updates: FAQ ended 2026-05-07 and its documentation was removed 2026-06-15; the 2025-06-12 and 2025-11-05 deprecations; practice problem documentation removed 2026-01-06. The Search Console FAQ report and API removal months (June and August 2026) come from secondary sources.
