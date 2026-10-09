import type { ReactNode } from "react";

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
      <div className="statement-body" aria-live="polite">
        {children}
      </div>
    </section>
  );
}

/** The headline figure with an optional red seal (도장). Use once per statement. */
export function StatementHero({
  label,
  value,
  sub,
  stamp,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  /** 2–3 Korean characters shown inside the red seal, e.g. "실수령" */
  stamp?: string;
}) {
  return (
    <div className="statement-hero">
      <div className="min-w-0">
        <p className="statement-hero-label">{label}</p>
        <p className="statement-hero-value tabular">{value}</p>
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
