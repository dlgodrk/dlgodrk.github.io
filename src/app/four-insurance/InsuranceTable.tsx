import type { CSSProperties } from "react";
import { formatNumber } from "@/lib/format";
import { LTC_ROUNDED_FROM, sizeInfo, type FourInsuranceResult, type Share } from "@/lib/calc/four-insurance";

/**
 * 항목 / 근로자 / 사업주 / 합계 table for one 4대보험 result.
 * `compact` is the version inside the result statement (tight cells so it fits a 360px phone);
 * the default is the full-width prose table on the static pages. No hooks: usable from server and client.
 */

type Row = { label: string; note: string; share: Share; employeeOnlyDash?: boolean };

export function insuranceRows(r: FourInsuranceResult): Row[] {
  const pensionNote =
    r.pension.total === 0 && r.pay > 0
      ? "제외"
      : `4.75%${r.pensionLimit === "cap" ? " · 상한" : r.pensionLimit === "floor" ? " · 하한" : ""}`;
  return [
    { label: "국민연금", note: pensionNote, share: r.pension },
    { label: "건강보험", note: "3.595%", share: r.health },
    {
      label: "장기요양보험",
      note: r.payMonth < LTC_ROUNDED_FROM ? "건강보험료의 약 13.14%" : "건강보험료의 13.14%",
      share: r.longTermCare,
    },
    { label: "고용보험", note: r.unemployment.total === 0 && r.pay > 0 ? "실업급여 제외" : "실업급여 0.9%", share: r.unemployment },
    {
      label: "고용보험",
      note: `고용안정·직능 ${formatNumber(sizeInfo(r.size).rate / 100, 2)}%`,
      share: r.jobStability,
      employeeOnlyDash: true,
    },
    {
      label: "산재보험",
      note: `${formatNumber(r.industrialRate, 3)}% · 사업주만`,
      share: r.industrial,
      employeeOnlyDash: true,
    },
  ];
}

const SUB = "mt-0.5 block text-[0.75rem] font-normal text-muted";

export function InsuranceTable({
  r,
  compact = false,
  caption,
}: {
  r: FourInsuranceResult;
  compact?: boolean;
  caption?: string;
}) {
  const rows = insuranceRows(r);
  // The shared .data-table padding is unlayered CSS, so tight cells need inline styles.
  const cell: CSSProperties | undefined = compact ? { padding: "0.5rem 0.375rem" } : undefined;
  const first: CSSProperties | undefined = compact
    ? { padding: "0.5rem 0.375rem 0.5rem 1.25rem", whiteSpace: "normal" }
    : { whiteSpace: "normal" };
  const last: CSSProperties | undefined = compact ? { padding: "0.5rem 1.25rem 0.5rem 0.375rem" } : undefined;

  const table = (
    <table className="data-table" style={compact ? { fontSize: "0.875rem" } : undefined}>
      <caption className={compact ? "sr-only" : undefined}>{caption ?? "4대보험료 월 부담액 (단위: 원)"}</caption>
      <thead>
        <tr>
          <th scope="col" style={first}>
            항목
          </th>
          <th scope="col" style={cell}>
            근로자
          </th>
          <th scope="col" style={cell}>
            사업주
          </th>
          <th scope="col" style={last}>
            합계
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.label}-${row.note}`}>
            <th scope="row" style={{ ...first, fontWeight: 500 }}>
              {row.label}
              <span className={SUB}>{row.note}</span>
            </th>
            <td style={cell}>{row.employeeOnlyDash ? "-" : formatNumber(row.share.employee)}</td>
            <td style={cell}>{formatNumber(row.share.employer)}</td>
            <td style={last}>{formatNumber(row.share.total)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row" style={first}>
            합계
          </th>
          <td style={cell}>{formatNumber(r.employeeTotal)}</td>
          <td style={cell}>{formatNumber(r.employerTotal)}</td>
          <td style={last}>{formatNumber(r.total)}</td>
        </tr>
      </tfoot>
    </table>
  );

  return compact ? <div style={{ overflowX: "auto" }}>{table}</div> : <div className="table-wrap">{table}</div>;
}
