"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TOOLS } from "@/lib/tools";

/** Header search box: filters calculators by name and common search words. */
export function ToolSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase().replace(/\s+/g, "");
    if (!term) return [];
    return TOOLS.filter((t) =>
      [t.name, t.summary, ...t.aliases].some((s) => s.toLowerCase().replace(/\s+/g, "").includes(term)),
    )
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, 7);
  }, [q]);

  const go = (slug: string) => {
    setOpen(false);
    setQ("");
    inputRef.current?.blur();
    router.push(`/${slug}/`);
  };

  return (
    <div className="relative">
      <label htmlFor="tool-search" className="sr-only">
        계산기 찾기
      </label>
      <input
        ref={inputRef}
        id="tool-search"
        type="search"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls="tool-search-list"
        aria-autocomplete="list"
        aria-activedescendant={open && results[active] ? `ts-${results[active].slug}` : undefined}
        placeholder="계산기 찾기 (예: 퇴직금)"
        autoComplete="off"
        className="h-9 w-full rounded-lg border border-rule-strong bg-sheet px-3 text-[0.9375rem] text-ink placeholder:text-muted focus:border-link focus:outline-none"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!results.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % results.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a - 1 + results.length) % results.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            go(results[active].slug);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && q.trim() ? (
        <ul
          id="tool-search-list"
          role="listbox"
          className="absolute right-0 left-0 mt-1 overflow-hidden rounded-lg border border-rule-strong bg-sheet shadow-lg"
        >
          {results.length ? (
            results.map((t, i) => (
              <li
                key={t.slug}
                id={`ts-${t.slug}`}
                role="option"
                aria-selected={i === active}
                className={`cursor-pointer px-3 py-2 ${i === active ? "bg-wash" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  go(t.slug);
                }}
                onMouseEnter={() => setActive(i)}
              >
                <span className="block text-[0.9375rem] font-medium text-ink">{t.name}</span>
                <span className="block text-xs text-muted">{t.summary}</span>
              </li>
            ))
          ) : (
            <li className="px-3 py-2.5 text-sm text-muted">맞는 계산기가 없어요. 다른 낱말로 찾아보세요.</li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
