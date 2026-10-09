import Link from "next/link";
import { CATEGORIES, TOOLS } from "@/lib/tools";
import { RULE_YEAR } from "@/lib/site";
import { SalaryMini } from "./salary/SalaryMini";

/** Long-tail pages people search for most, linked from the home page. */
const POPULAR: { href: string; label: string }[] = [
  { href: "/salary/3000/", label: "연봉 3,000만원 실수령액" },
  { href: "/salary/4000/", label: "연봉 4,000만원 실수령액" },
  { href: "/salary/5000/", label: "연봉 5,000만원 실수령액" },
  { href: "/salary/10000/", label: "연봉 1억 실수령액" },
  { href: "/minimum-wage/", label: "2027 최저임금 월급" },
  { href: "/hourly-wage/20/", label: "주 20시간 알바 월급" },
  { href: "/age/1990/", label: "1990년생 나이" },
  { href: "/age/2000/", label: "2000년생 나이" },
  { href: "/pyeong/84/", label: "84㎡ 몇 평" },
  { href: "/pyeong/59/", label: "59㎡ 몇 평" },
  { href: "/bmi/170/", label: "키 170 표준체중" },
  { href: "/bmi/160/", label: "키 160 표준체중" },
  { href: "/dday/suneung/", label: "수능 D-day" },
  { href: "/dday/christmas/", label: "크리스마스 D-day" },
  { href: "/loan/10000/", label: "1억 대출 이자" },
  { href: "/deposit/10000/", label: "1억 예금 이자" },
  { href: "/savings/50/", label: "월 50만원 적금 이자" },
  { href: "/discharge/2026-01/", label: "2026년 1월 입대 전역일" },
];

export default function HomePage() {
  return (
    <div className="page-wrap pt-10 pb-16 sm:pt-14">
      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <header>
          <h1 className="text-[2rem] leading-[1.2] font-bold tracking-tight text-ink sm:text-[2.75rem]">
            월급부터 만 나이, 평수까지
            <br />
            생활 계산기 모음
          </h1>
          <p className="mt-4 text-[1.0625rem] leading-relaxed text-ink-soft">
            {RULE_YEAR}년 요율과 법령으로 계산합니다. 회원가입이나 앱 설치 없이 바로 쓰고, 결과는 링크로 공유할 수 있어요.
          </p>
          <p className="mt-3 text-sm text-muted">
            연봉 실수령액은 국세청 간이세액표와 4대보험 공식 모의계산 결과에 맞춰 검증했습니다.
          </p>
        </header>
        <SalaryMini />
      </div>

      <div className="mt-16 grid gap-x-12 gap-y-10 md:grid-cols-2">
        {CATEGORIES.map((c) => {
          const tools = TOOLS.filter((t) => t.category === c.id).sort((a, b) => b.popularity - a.popularity);
          return (
            <section key={c.id} id={c.id} aria-labelledby={`cat-${c.id}`} className="scroll-mt-20">
              <h2 id={`cat-${c.id}`} className="border-b-2 border-ink pb-2 text-lg font-bold text-ink">
                {c.name}
              </h2>
              <ul>
                {tools.map((t) => (
                  <li key={t.slug} className="border-b border-rule">
                    <Link href={`/${t.slug}/`} className="group flex items-baseline gap-3 py-3.5">
                      <span className="shrink-0 font-medium text-ink group-hover:text-link">{t.name}</span>
                      <span aria-hidden className="mb-1 min-w-4 flex-1 border-b border-dotted border-rule-strong" />
                      <span className="max-w-[55%] text-right text-sm text-muted">{t.summary}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <section aria-labelledby="popular-title" className="mt-16">
        <h2 id="popular-title" className="border-b-2 border-ink pb-2 text-lg font-bold text-ink">
          많이 찾는 계산
        </h2>
        <nav aria-label="많이 찾는 계산" className="link-grid mt-2" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(11rem, 1fr))" }}>
          {POPULAR.map((p) => (
            <Link key={p.href} href={p.href}>
              {p.label}
            </Link>
          ))}
        </nav>
      </section>
    </div>
  );
}
