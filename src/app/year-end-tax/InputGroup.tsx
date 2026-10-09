import type { ReactNode } from "react";

/**
 * Collapsible group of inputs (native <details>, works without JavaScript).
 * The summary line shows what is filled in, so a closed group still tells the user its state.
 */
export function InputGroup({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="group/g rounded-lg border border-rule" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3 sm:px-4 [&::-webkit-details-marker]:hidden">
        <span className="font-semibold text-ink">{title}</span>
        <span className="flex min-w-0 items-center gap-2 text-sm text-muted">
          {summary ? <span className="truncate tabular">{summary}</span> : null}
          <span aria-hidden className="text-lg leading-none transition-transform group-open/g:rotate-45">
            +
          </span>
        </span>
      </summary>
      <div className="grid gap-5 border-t border-rule px-3 py-4 sm:px-4">{children}</div>
    </details>
  );
}
