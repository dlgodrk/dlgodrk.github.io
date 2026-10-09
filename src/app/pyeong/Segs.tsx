import { Fragment } from "react";
import Link from "next/link";
import type { Para } from "@/lib/calc/pyeong-pages";

/** Renders a text paragraph built by pyeong-pages.ts: plain runs, bold labels and internal links. */
export function Segs({ p }: { p: Para }) {
  return (
    <>
      {p.map((s, i) => {
        if (typeof s === "string") return <Fragment key={i}>{s}</Fragment>;
        if ("strong" in s) return <strong key={i}>{s.strong}</strong>;
        return (
          <Link key={i} href={s.href}>
            {s.text}
          </Link>
        );
      })}
    </>
  );
}
