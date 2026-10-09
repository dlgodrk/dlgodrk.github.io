"use client";

import { useId, useState } from "react";
import { formatNumber } from "@/lib/format";
import type { YearRow } from "@/lib/calc/compound-interest";

/** Rows shown before "전체 보기". */
const COLLAPSED_ROWS = 10;

function man(n: number): string {
  return formatNumber(n / 10_000);
}

/**
 * Phones (< sm): tighter cell padding so the four columns fit a 375px screen without sideways scrolling.
 * `.data-table` lives unlayered in globals.css, so the override needs Tailwind's important modifier.
 */
const COMPACT_CELLS = "max-sm:[&_th]:px-3! max-sm:[&_td]:px-3!";

/** Year-by-year table (만원 단위). Shows the first 10 years and the final year until expanded. */
export function YearTable({ rows }: { rows: YearRow[] }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  const collapsible = rows.length > COLLAPSED_ROWS;
  const visible = collapsible && !expanded ? rows.slice(0, COLLAPSED_ROWS) : rows;
  const last = rows[rows.length - 1];
  const hiddenLast = collapsible && !expanded && last;

  return (
    <div>
      <div className="table-wrap">
        <table id={id} className={`data-table ${COMPACT_CELLS}`}>
          <caption>연말 기준 · 단위: 만원 (반올림)</caption>
          <thead>
            <tr>
              <th scope="col">연도</th>
              <th scope="col">누적 납입</th>
              <th scope="col">평가금액</th>
              <th scope="col">수익</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.year}>
                <td>{r.year}년</td>
                <td>{man(r.contributed)}</td>
                <td>{man(r.balance)}</td>
                <td>{man(r.gain)}</td>
              </tr>
            ))}
          </tbody>
          {hiddenLast ? (
            <tfoot>
              <tr>
                <th scope="row">
                  {last.year}년
                  {/* "만기" on its own small line keeps the first column as narrow as "30년". */}
                  <span className="block text-xs font-normal text-muted">만기</span>
                </th>
                <td>{man(last.contributed)}</td>
                <td>{man(last.balance)}</td>
                <td>{man(last.gain)}</td>
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
      {collapsible ? (
        <button
          type="button"
          className="btn-ghost mt-3"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? "처음 10년만 보기" : `전체 ${rows.length}년 보기`}
        </button>
      ) : null}
    </div>
  );
}
