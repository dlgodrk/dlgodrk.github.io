import Link from "next/link";
import { manwonLabel } from "@/lib/format";
import { monthlyPageGroups, monthlyPagePath } from "@/lib/calc/salary-monthly";

/** Grouped link grid to every /salary/monthly/<만원>/ page (server component). */
export function SalaryMonthlyLinks({ current }: { current?: number }) {
  return (
    <>
      {monthlyPageGroups().map((g) => (
        <section key={g.title} aria-label={g.title}>
          <h3>{g.title}</h3>
          <nav aria-label={`${g.title} 실수령액 페이지`} className="link-grid mt-2">
            {g.items.map((m) => (
              <Link key={m} href={monthlyPagePath(m)} aria-current={m === current ? "page" : undefined}>
                월급 {manwonLabel(m)}
              </Link>
            ))}
          </nav>
        </section>
      ))}
    </>
  );
}
