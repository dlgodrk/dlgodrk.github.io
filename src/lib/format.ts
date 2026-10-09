/** Number & money formatting helpers (Korean). Pure functions, safe on server and client. */

const nf0 = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });

/** 1234567 -> "1,234,567" (rounded to integer) */
export function formatNumber(n: number, maxFractionDigits = 0): string {
  if (!Number.isFinite(n)) return "-";
  if (maxFractionDigits === 0) return nf0.format(Math.round(n) === 0 ? 0 : Math.round(n));
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: maxFractionDigits }).format(n);
}

/** 1234567 -> "1,234,567원" */
export function formatWon(n: number): string {
  return `${formatNumber(n)}원`;
}

/**
 * Korean large-number reading with 억/만 units.
 * 123456789 -> "1억 2,345만 6,789원"; 30000000 -> "3,000만원"; 0 -> "0원"
 */
export function koreanWon(n: number): string {
  if (!Number.isFinite(n)) return "-";
  const neg = n < 0;
  let v = Math.round(Math.abs(n));
  if (v === 0) return "0원";
  const jo = Math.floor(v / 1_000_000_000_000);
  v %= 1_000_000_000_000;
  const eok = Math.floor(v / 100_000_000);
  v %= 100_000_000;
  const man = Math.floor(v / 10_000);
  const rest = v % 10_000;
  const parts: string[] = [];
  if (jo) parts.push(`${formatNumber(jo)}조`);
  if (eok) parts.push(`${formatNumber(eok)}억`);
  if (man) parts.push(`${formatNumber(man)}만`);
  if (rest) parts.push(formatNumber(rest));
  return `${neg ? "-" : ""}${parts.join(" ")}원`;
}

/** Amount in 만원 units -> readable string. 3500 -> "3,500만원", 12000 -> "1억 2,000만원" */
export function manwonLabel(manwon: number): string {
  return koreanWon(manwon * 10_000);
}

/** Parse user input like "3,000,000", "3000000원", " 12.5 " -> number (NaN if empty/invalid). */
export function parseNumber(input: string): number {
  const cleaned = input.replace(/[,\s원%]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === ".") return NaN;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

/** Truncate toward zero to a multiple of `unit` (e.g. 10원 미만 절사: floorTo(x, 10)). */
export function floorTo(n: number, unit: number): number {
  return Math.trunc(n / unit) * unit;
}

/** Round half up to a multiple of `unit`. */
export function roundTo(n: number, unit: number): number {
  return Math.round(n / unit) * unit;
}

/** 0.0475 -> "4.75%" */
export function formatPercent(ratio: number, maxFractionDigits = 2): string {
  return `${formatNumber(ratio * 100, maxFractionDigits)}%`;
}
