import Link from "next/link";
import { manwonLabel } from "@/lib/format";
import { salaryPageGroups } from "@/lib/calc/salary-ui";

/** Grouped link grid to every /salary/<만원>/ page (server component). */
export function SalaryLinks({ current }: { current?: number }) {
  return (
    <>
      {salaryPageGroups().map((g) => (
        <section key={g.title} aria-label={g.title}>
          <h3>{g.title}</h3>
          <nav aria-label={`${g.title} 실수령액 페이지`} className="link-grid mt-2">
            {g.items.map((m) => (
              <Link key={m} href={`/salary/${m}/`} aria-current={m === current ? "page" : undefined}>
                {manwonLabel(m)}
              </Link>
            ))}
          </nav>
        </section>
      ))}
    </>
  );
}
