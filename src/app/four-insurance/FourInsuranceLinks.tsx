import Link from "next/link";
import { manwonLabel } from "@/lib/format";
import { FOUR_INSURANCE_PAGE_MANWON } from "@/lib/calc/four-insurance";

/** Link grid to every /four-insurance/<만원>/ page (server component). */
export function FourInsuranceLinks({ current }: { current?: number }) {
  return (
    <nav aria-label="월급별 4대보험료 페이지" className="link-grid">
      {FOUR_INSURANCE_PAGE_MANWON.map((m) => (
        <Link key={m} href={`/four-insurance/${m}/`} aria-current={m === current ? "page" : undefined}>
          월급 {manwonLabel(m)}
        </Link>
      ))}
    </nav>
  );
}
