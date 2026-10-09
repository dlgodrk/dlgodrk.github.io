import { isValidElement, type CSSProperties, type ReactNode } from "react";
import { longestRunEm } from "@/lib/format";

/** Plain text inside a ReactNode (strings, numbers and element children), for sizing only. */
function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number" || typeof node === "bigint") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

/**
 * The site's signature result view: a printed statement (명세서) with line items,
 * dotted leaders and a stamped headline figure. Use it for the main result of every calculator.
 *
 * <Statement title="월 실수령액 명세" caption="2026년 기준">
 *   <StatementHero label="월 실수령액" value="2,712,340원" sub="연 3,254만원" stamp="실수령" />
 *   <StatementSection title="공제 내역">
 *     <StatementRow label="국민연금" value="133,000원" note="4.75%" />
 *   </StatementSection>
 *   <StatementTotal label="공제액 합계" value="287,660원" />
 *   <StatementFootnote>2026년 1월 기준 요율</StatementFootnote>
 * </Statement>
 */
export function Statement({
  title,
  caption,
  children,
  id,
}: {
  title: string;
  caption?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} aria-label={title} className="statement">
      <header className="statement-head">
        <h2 className="statement-title">{title}</h2>
        {caption ? <p className="statement-caption">{caption}</p> : null}
      </header>
      {/* Not a live region: only the hero figure is announced (see StatementHero), so typing
          in a field does not queue every changed row for screen-reader users. */}
      <div className="statement-body">{children}</div>
    </section>
  );
}

/**
 * The headline figure with an optional red seal (도장). Use once per statement.
 * It is a polite, atomic live region: when the answer changes, screen readers read the
 * label, value and sub line together. Pass `live={false}` for a second, non-primary hero.
 */
export function StatementHero({
  label,
  value,
  sub,
  stamp,
  live = true,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  /** 2–3 Korean characters shown inside the red seal, e.g. "실수령" */
  stamp?: string;
  /** Announce changes to screen readers (default true). */
  live?: boolean;
}) {
  // Width hint for globals.css: long figures (e.g. 14,512,345,678원) shrink to fit a 360px phone.
  const em = longestRunEm(textOf(value));
  const fit = em > 0 ? ({ "--hero-em": String(em) } as CSSProperties) : undefined;
  return (
    <div
      className={stamp ? "statement-hero has-seal" : "statement-hero"}
      aria-live={live ? "polite" : undefined}
      aria-atomic={live ? true : undefined}
    >
      <div className="statement-hero-main">
        <p className="statement-hero-label">{label}</p>
        <p className="statement-hero-value tabular" style={fit}>
          {value}
        </p>
        {sub ? <p className="statement-hero-sub tabular">{sub}</p> : null}
      </div>
      {stamp ? (
        <span className="seal" aria-hidden>
          {stamp}
        </span>
      ) : null}
    </div>
  );
}

export function StatementSection({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="statement-section">
      {title ? <h3 className="statement-section-title">{title}</h3> : null}
      <dl className="statement-rows">{children}</dl>
    </div>
  );
}

/** One line item: label ........ value. `note` is a small grey hint (rate, basis). */
export function StatementRow({
  label,
  value,
  note,
  emphasis,
}: {
  label: ReactNode;
  value: ReactNode;
  note?: ReactNode;
  emphasis?: boolean;
}) {
  return (
    <div className={emphasis ? "statement-row is-emphasis" : "statement-row"}>
      <dt>
        <span className="statement-label">{label}</span>
        {note ? <span className="statement-note">{note}</span> : null}
      </dt>
      <span className="statement-leader" aria-hidden />
      <dd className="tabular">{value}</dd>
    </div>
  );
}

/** Double-ruled total line at the end of a statement. */
export function StatementTotal({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="statement-total">
      <span>{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
}

/** Small print under the statement: basis date, assumptions. */
export function StatementFootnote({ children }: { children: ReactNode }) {
  return <p className="statement-footnote">{children}</p>;
}
