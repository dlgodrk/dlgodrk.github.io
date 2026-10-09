"use client";

import { useState, type PointerEvent } from "react";
import { approxWon, axisLabel, niceStep, type YearRow } from "@/lib/calc/compound-interest";

const W = 600;
const H = 200;

type Point = { year: number; contributed: number; balance: number };

/** X-axis tick years: about 4–6 labels, always including 0 and the last year. */
function xTicks(years: number): number[] {
  const step = years <= 5 ? 1 : years <= 12 ? 2 : years <= 25 ? 5 : 10;
  const ticks: number[] = [];
  for (let y = 0; y < years; y += step) ticks.push(y);
  // Drop a tick that would crowd the final (right-aligned) label. Judged by its share of the axis, not
  // the step: on a ~230px phone plot two labels need about 20% of the width (e.g. 11y: 10 and 11 collide).
  // 5, 6, 10, 25 and 50 years keep their evenly spaced ticks.
  if (ticks.length > 1 && (years - ticks[ticks.length - 1]) / years < 0.2) ticks.pop();
  ticks.push(years);
  return ticks;
}

/**
 * Stacked area chart: 누적 납입 원금 (bottom, --ink) + 수익 (top, --link) by year.
 * The SVG stretches to the container width (preserveAspectRatio="none"); text, dots and labels
 * are HTML overlays so they stay crisp at any width. Hover or tap a year to read its values.
 */
export function GrowthChart({ rows, principal }: { rows: YearRow[]; principal: number }) {
  const [active, setActive] = useState<number | null>(null);
  const years = rows.length;
  if (years === 0) return null;

  const points: Point[] = [{ year: 0, contributed: principal, balance: principal }, ...rows];
  const maxBalance = Math.max(...points.map((p) => p.balance), 1);
  const step = niceStep(maxBalance, 4);
  const top = Math.ceil(maxBalance / step) * step;
  const yTicks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) yTicks.push(v);

  const x = (year: number) => (year / years) * W;
  const y = (v: number) => H - (v / top) * H;
  const line = (key: "contributed" | "balance") => points.map((p) => `${x(p.year).toFixed(2)},${y(p[key]).toFixed(2)}`);
  const contributedLine = line("contributed");
  const balanceLine = line("balance");
  const principalArea = `M0,${H} L${contributedLine.join(" L")} L${W},${H} Z`;
  const gainArea = `M${balanceLine.join(" L")} L${[...contributedLine].reverse().join(" L")} Z`;

  // The period can shrink while a year is selected; fall back to the last year.
  const idx = active !== null && active <= years ? active : years;
  const cur = points[idx];
  const last = points[years];

  const pick = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) return;
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setActive(Math.round(ratio * years));
  };

  const summary = `${years}년 동안 누적 납입 원금 ${approxWon(last.contributed)}이 평가금액 ${approxWon(last.balance)}으로 늘어나는 그래프. 수익은 ${approxWon(last.balance - last.contributed)}입니다.`;
  const pct = (v: number) => `${(v * 100).toFixed(3)}%`;

  return (
    <figure className="m-0">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm" aria-hidden>
        <span className="font-semibold text-ink tabular">{idx === 0 ? "시작" : `${idx}년차`}</span>
        <span className="inline-flex items-center gap-1.5 text-ink-soft tabular">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--ink)" }} />
          원금 {approxWon(cur.contributed)}
        </span>
        <span className="inline-flex items-center gap-1.5 text-ink-soft tabular">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--link)" }} />
          수익 {approxWon(cur.balance - cur.contributed)}
        </span>
        <span className="text-ink tabular">평가금액 {approxWon(cur.balance)}</span>
      </div>

      <div className="mt-3 grid grid-cols-[3.25rem_minmax(0,1fr)] gap-x-2">
        {/* Y-axis labels */}
        <div className="relative h-[200px] text-right text-xs text-muted tabular" aria-hidden>
          {yTicks.map((v) => (
            <span key={v} className="absolute right-0 -translate-y-1/2 leading-none" style={{ top: pct(1 - v / top) }}>
              {axisLabel(v)}
            </span>
          ))}
        </div>

        {/* Plot */}
        <div
          className="relative h-[200px] cursor-crosshair touch-pan-y select-none"
          onPointerMove={pick}
          onPointerDown={pick}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") setActive(null);
          }}
        >
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="block h-full w-full overflow-visible"
            role="img"
            aria-label={summary}
          >
            {yTicks.map((v) => (
              <line
                key={v}
                x1={0}
                x2={W}
                y1={y(v)}
                y2={y(v)}
                stroke="var(--rule)"
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <path d={principalArea} fill="var(--ink)" fillOpacity={0.16} />
            <path d={gainArea} fill="var(--link)" fillOpacity={0.24} />
            <polyline
              points={contributedLine.join(" ")}
              fill="none"
              stroke="var(--ink)"
              strokeWidth={2}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <polyline
              points={balanceLine.join(" ")}
              fill="none"
              stroke="var(--link)"
              strokeWidth={2}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1={x(idx)}
              x2={x(idx)}
              y1={0}
              y2={H}
              stroke="var(--ink)"
              strokeOpacity={0.35}
              strokeWidth={1}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {/* Markers at the active year (HTML so they stay round when the SVG stretches) */}
          {(
            [
              ["contributed", "var(--ink)"],
              ["balance", "var(--link)"],
            ] as const
          ).map(([key, color]) => (
            <span
              key={key}
              aria-hidden
              className="pointer-events-none absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                left: pct(idx / years),
                top: pct(1 - cur[key] / top),
                background: color,
                boxShadow: "0 0 0 2px var(--sheet)",
              }}
            />
          ))}
        </div>

        {/* X-axis labels */}
        <div aria-hidden />
        <div className="relative mt-1.5 h-4 text-xs text-muted tabular" aria-hidden>
          {xTicks(years).map((t) => (
            <span
              key={t}
              className="absolute top-0 whitespace-nowrap leading-none"
              style={{
                left: pct(t / years),
                transform: t === 0 ? "none" : t === years ? "translateX(-100%)" : "translateX(-50%)",
              }}
            >
              {t === 0 ? "시작" : `${t}년`}
            </span>
          ))}
        </div>
      </div>
      <figcaption className="mt-3 text-xs text-muted">
        그래프를 누르거나 마우스를 올리면 그해 금액을 보여 드려요. 연도별 숫자는 아래 표에 있어요.
      </figcaption>
    </figure>
  );
}
