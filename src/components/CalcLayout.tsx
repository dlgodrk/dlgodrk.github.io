"use client";

import { useState, type ReactNode } from "react";

/**
 * Two-column calculator layout: inputs on the left, the result statement on the right
 * (sticky on wide screens). On phones the result follows the inputs.
 */
export function CalcLayout({
  inputs,
  result,
  actions,
  share = true,
}: {
  inputs: ReactNode;
  result: ReactNode;
  actions?: ReactNode;
  /** Set false when inputs are not kept in the URL (e.g. private text), so a share link would be misleading. */
  share?: boolean;
}) {
  return (
    <div className="calc-grid">
      <form className="calc-inputs" onSubmit={(e) => e.preventDefault()} aria-label="계산 입력">
        {inputs}
      </form>
      <div className="calc-result">
        {result}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {share ? <ShareButton /> : null}
          {actions}
        </div>
      </div>
    </div>
  );
}

/** Copies the current URL (which carries the inputs) to the clipboard. */
export function ShareButton() {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost"
      onClick={async () => {
        const url = window.location.href;
        try {
          if (navigator.share && /Mobi|Android/i.test(navigator.userAgent)) {
            await navigator.share({ title: document.title, url });
            return;
          }
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // User cancelled the share sheet or clipboard is blocked; nothing to do.
        }
      }}
    >
      {copied ? "링크를 복사했어요" : "결과 링크 복사"}
    </button>
  );
}

/** Inline validation message shown inside the result area. */
export function CalcNotice({ children }: { children: ReactNode }) {
  return (
    <p role="status" className="calc-notice">
      {children}
    </p>
  );
}
