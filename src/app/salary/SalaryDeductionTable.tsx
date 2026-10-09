import { formatNumber } from "@/lib/format";
import type { SalaryResult } from "@/lib/calc/salary";
import { longTermCareMultiplier, pensionLimit, taxBracketLabel } from "@/lib/calc/salary-ui";
import { CELL_SUB, WRAP_CELL } from "./sources";

/** Monthly 공제 내역 table (항목 + 계산 기준, 월 금액) shared by the 연봉 and 월급 pages (server component). */
export function SalaryDeductionTable({ r, payMonth, caption }: { r: SalaryResult; payMonth: string; caption: string }) {
  const limit = pensionLimit(r.monthlyTaxable, payMonth);
  const rows: { label: string; basis: string; amount: number; strong?: boolean; current?: boolean }[] = [
    {
      label: "국민연금",
      basis: `${formatNumber(r.insurance.pensionBase)} × 4.75%${limit === "cap" ? " (상한)" : limit === "floor" ? " (하한)" : ""}`,
      amount: r.insurance.pension,
    },
    { label: "건강보험", basis: `${formatNumber(r.monthlyTaxable)} × 3.595%`, amount: r.insurance.health },
    {
      label: "장기요양보험",
      basis: `${formatNumber(r.insurance.health)} × ${longTermCareMultiplier(payMonth)}`,
      amount: r.insurance.longTermCare,
    },
    { label: "고용보험", basis: `${formatNumber(r.monthlyTaxable)} × 0.9%`, amount: r.insurance.employment },
    { label: "소득세", basis: `간이세액표 ${taxBracketLabel(r.monthlyTaxable)}`, amount: r.tax.incomeTax },
    { label: "지방소득세", basis: "소득세 × 10%", amount: r.tax.localTax },
    {
      label: "공제 합계",
      basis: `세전 월급의 ${formatNumber(r.deductionRate * 100, 1)}%`,
      amount: r.deductions,
      strong: true,
    },
    { label: "월 실수령액", basis: `${formatNumber(r.monthlyGross)} − 공제 합계`, amount: r.monthlyNet, current: true },
  ];

  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">항목 (계산 기준)</th>
            <th scope="col">월 금액</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className={row.current ? "is-current" : undefined}>
              <td style={WRAP_CELL}>
                {row.strong ? <strong>{row.label}</strong> : row.label}
                <span className={CELL_SUB}>{row.basis}</span>
              </td>
              <td>{row.strong ? <strong>{formatNumber(row.amount)}</strong> : formatNumber(row.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
