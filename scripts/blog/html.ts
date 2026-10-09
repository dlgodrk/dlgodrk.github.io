/**
 * Minimal HTML building blocks for Naver-blog-ready posts (docs/blog/*.html).
 *
 * The output is meant to be opened in a browser, selected with Ctrl+A and pasted into Naver SmartEditor,
 * so it uses only simple semantic tags (h2, p, ul, table border="1", strong, a) with inline styles.
 * No scripts, no <style>, no external CSS. The grey box at the top (title, tags) has user-select:none,
 * so a select-all copy leaves it out.
 */

export const SITE_URL = "https://dlgodrk.github.io";

/** Markers around the non-copyable info box; the tests strip it before counting characters. */
export const META_START = "<!-- blog-meta:start -->";
export const META_END = "<!-- blog-meta:end -->";

const P_STYLE = "margin:0 0 16px;font-size:16px;line-height:1.8;";
const H2_STYLE = "margin:36px 0 14px;font-size:21px;line-height:1.4;";
const LI_STYLE = "margin:0 0 10px;font-size:16px;line-height:1.8;";
const NOTE_STYLE = "margin:6px 0 20px;font-size:13px;line-height:1.7;color:#666666;";
const CAPTION_STYLE = "margin:20px 0 8px;font-size:15px;font-weight:bold;";
const TABLE_STYLE = "border-collapse:collapse;width:100%;font-size:14px;line-height:1.5;";
const TH_STYLE = "padding:7px 8px;background-color:#f1f3f5;font-weight:bold;text-align:center;";
const TD_STYLE = "padding:7px 8px;";

export type Align = "left" | "center" | "right";

/** Escape text for HTML (prose strings below are trusted markup and are not escaped). */
export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Absolute link to a page of the site, e.g. link("/salary/", "연봉 실수령액 계산기"). */
export function link(path: string, text: string): string {
  return `<a href="${SITE_URL}${path}">${text}</a>`;
}

export function h2(text: string): string {
  return `<h2 style="${H2_STYLE}">${text}</h2>`;
}

export function p(html: string): string {
  return `<p style="${P_STYLE}">${html}</p>`;
}

/** Small grey line (table notes, source line). */
export function note(html: string): string {
  return `<p style="${NOTE_STYLE}">${html}</p>`;
}

export function ul(items: string[]): string {
  return `<ul>\n${items.map((i) => `  <li style="${LI_STYLE}">${i}</li>`).join("\n")}\n</ul>`;
}

/** A bold line above a table ("표 1. …"); SmartEditor drops <caption>, so this is a plain paragraph. */
export function caption(text: string): string {
  return `<p style="${CAPTION_STYLE}">${text}</p>`;
}

export type TableSpec = {
  head: string[];
  rows: string[][];
  /** Alignment per column (default: first column center, the rest right). */
  align?: Align[];
  /** Row indexes to print in bold (e.g. the total line). */
  boldRows?: number[];
};

export function table({ head, rows, align, boldRows = [] }: TableSpec): string {
  const al = (i: number): Align => align?.[i] ?? (i === 0 ? "center" : "right");
  const headHtml = head.map((h) => `<th style="${TH_STYLE}">${h}</th>`).join("");
  const body = rows
    .map((r, ri) => {
      const bold = boldRows.includes(ri) ? "font-weight:bold;" : "";
      const cells = r.map((c, i) => `<td style="${TD_STYLE}text-align:${al(i)};${bold}">${c}</td>`).join("");
      return `    <tr>${cells}</tr>`;
    })
    .join("\n");
  return [
    `<table border="1" cellspacing="0" cellpadding="7" style="${TABLE_STYLE}">`,
    `  <thead>\n    <tr>${headHtml}</tr>\n  </thead>`,
    `  <tbody>\n${body}\n  </tbody>`,
    `</table>`,
  ].join("\n");
}

export type PageSpec = {
  title: string;
  category: string;
  tags: string[];
  /** One line about what the numbers are based on (shown only in the non-copyable box). */
  basis: string;
  /** Post body (already HTML). */
  body: string[];
};

/** Full standalone HTML document. */
export function page({ title, category, tags, basis, body }: PageSpec): string {
  const meta = [
    META_START,
    `<div style="user-select:none;-webkit-user-select:none;-ms-user-select:none;margin:0 0 32px;padding:14px 16px;border:1px dashed #999999;background-color:#f6f6f6;font-size:13px;line-height:1.8;color:#555555;">`,
    `<strong>네이버 블로그 원고</strong> · 이 회색 상자는 전체 선택(Ctrl+A)에서 빠지도록 설정했습니다. 붙여넣은 뒤 이 상자가 보이면 지워 주세요. 제목과 태그는 docs/blog/README.md에서 복사하세요.<br>`,
    `제목: ${esc(title)} (${[...title].length}자)<br>`,
    `카테고리: ${esc(category)}<br>`,
    `태그: ${tags.map((t) => `#${esc(t)}`).join(" ")}<br>`,
    `숫자 기준: ${basis}`,
    `</div>`,
    META_END,
  ].join("\n");
  return [
    "<!doctype html>",
    '<html lang="ko">',
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${esc(title)}</title>`,
    "</head>",
    `<body style="max-width:720px;margin:0 auto;padding:24px 16px 48px;background-color:#ffffff;color:#222222;font-family:'Noto Sans KR','Malgun Gothic','Apple SD Gothic Neo',sans-serif;">`,
    meta,
    ...body,
    "</body>",
    "</html>",
    "",
  ].join("\n");
}

/** Visible prose of a post: no info box, no tables, no tags, whitespace collapsed. */
export function proseText(html: string): string {
  const bodyOnly = html.slice(html.indexOf("<body"), html.indexOf("</body>"));
  return bodyOnly
    .replace(new RegExp(`${META_START}[\\s\\S]*?${META_END}`), "")
    .replace(/<table[\s\S]*?<\/table>/g, "")
    .replace(/<body[^>]*>/, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}
