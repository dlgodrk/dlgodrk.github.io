/**
 * 글자수 세기 — pure text statistics.
 *
 * Character counts use grapheme clusters (Intl.Segmenter) so that an emoji with a
 * skin-tone modifier, a ZWJ family emoji or a decomposed (NFD) Hangul syllable each
 * count as one visible character. Without Intl.Segmenter we fall back to code points.
 *
 * Byte counts come in two flavours because Korean job sites disagree:
 * - "한글 2바이트" (EUC-KR/CP949 style): every UTF-16 code unit >= 0x80 is 2 bytes,
 *   ASCII (including space and line feed) is 1 byte. This reproduces the counters on
 *   사람인 (character_counter.js `lengthMsg`: encodeURIComponent(ch).length > 4 → 2 bytes)
 *   and 잡코리아 (textcount `c >> 7 ? 2 : 1`), both checked 2026-10-09.
 * - UTF-8: Hangul and CJK 3 bytes, ASCII 1 byte, emoji 4 bytes.
 *
 * Line breaks are normalized to LF first, as a browser <textarea> does. Web forms
 * convert each LF to CRLF when submitted, so a server-side counter may see one
 * extra character/byte per line break; `newlines` lets the UI show that variant.
 */

/** Silent-reading speed assumption (대략): Korean characters (excluding spaces) per minute. */
export const READING_CHARS_PER_MIN = 500;
/** Speaking speed assumption (대략) for reading a script aloud, characters (excluding spaces) per minute. */
export const SPEAKING_CHARS_PER_MIN = 300;

/** Standard Korean manuscript paper (원고지): 20 columns × 10 rows = 200 cells per sheet. */
export const MANUSCRIPT_COLS = 20;
export const MANUSCRIPT_ROWS = 10;
export const MANUSCRIPT_CELLS = MANUSCRIPT_COLS * MANUSCRIPT_ROWS;

/** Target-limit quick picks shown as chips. */
export const CHAR_LIMIT_PRESETS = [300, 500, 700, 1000, 1500, 2000];
export const BYTE_LIMIT_PRESETS = [500, 1000, 1500, 2000, 3000, 4000];

/** Which count the target limit is checked against. */
export type Basis = "all" | "nospace" | "byte2" | "utf8";

export const BASIS_LABEL: Record<Basis, string> = {
  all: "공백 포함",
  nospace: "공백 제외",
  byte2: "한글 2바이트",
  utf8: "UTF-8 바이트",
};

export function isByteBasis(b: Basis): boolean {
  return b === "byte2" || b === "utf8";
}

export function parseBasis(raw: string): Basis {
  return raw === "nospace" || raw === "byte2" || raw === "utf8" ? raw : "all";
}

/** CRLF and lone CR → LF (what a <textarea> value already contains). */
export function normalizeNewlines(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

type GraphemeSegmenter = { segment(input: string): Iterable<unknown> };

let cachedSegmenter: GraphemeSegmenter | null | undefined;

function getSegmenter(): GraphemeSegmenter | null {
  if (cachedSegmenter !== undefined) return cachedSegmenter;
  try {
    cachedSegmenter =
      typeof Intl !== "undefined" && typeof Intl.Segmenter === "function"
        ? new Intl.Segmenter("ko", { granularity: "grapheme" })
        : null;
  } catch {
    cachedSegmenter = null;
  }
  return cachedSegmenter;
}

/** Number of Unicode code points (fallback count; an emoji with a modifier counts 2+). */
export function countCodePoints(text: string): number {
  let n = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    // Skip the low half of a valid surrogate pair.
    if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length) {
      const d = text.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) i++;
    }
    n++;
  }
  return n;
}

/**
 * Characters that are always a grapheme cluster on their own and never join their neighbours:
 * tab, LF, printable ASCII, Latin, general punctuation (minus ZWNJ/ZWJ), arrows, enclosed
 * numbers, shapes, CJK punctuation (minus its combining tone marks), compatibility jamo (ㅋ),
 * CJK ideographs, precomposed Hangul syllables and full-width forms. Text made only of these has
 * exactly one grapheme per UTF-16 code unit, so we can skip the segmenter.
 */
const NOT_SIMPLE =
  /[^\t\n -~ -˿‐-‧‰- ←-⇿①-➿　-〩〰-〿㄰-㆏一-鿿가-힣！-｠￠-￮]/;

/** User-perceived characters. Pass `useSegmenter=false` to force the code-point fallback. */
export function countGraphemes(text: string, useSegmenter = true): number {
  if (text === "") return 0;
  if (!NOT_SIMPLE.test(text)) return text.length;
  const seg = useSegmenter ? getSegmenter() : null;
  if (!seg) return countCodePoints(text);
  let n = 0;
  const it = seg.segment(text)[Symbol.iterator]();
  while (!it.next().done) n++;
  return n;
}

/** UTF-8 byte length. Lone surrogates count 3 bytes (encoded as U+FFFD, like TextEncoder). */
export function utf8Bytes(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    if (c < 0x80) bytes += 1;
    else if (c < 0x800) bytes += 2;
    else if (c >= 0xd800 && c <= 0xdbff && i + 1 < text.length) {
      const d = text.charCodeAt(i + 1);
      if (d >= 0xdc00 && d <= 0xdfff) {
        bytes += 4;
        i++;
      } else bytes += 3;
    } else bytes += 3;
  }
  return bytes;
}

/**
 * "한글 2바이트" count used by 사람인·잡코리아: ASCII (including space, tab and LF) = 1 byte,
 * every other UTF-16 code unit = 2 bytes (so an emoji outside the BMP = 4 bytes).
 */
export function korean2Bytes(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) bytes += text.charCodeAt(i) < 0x80 ? 1 : 2;
  return bytes;
}

/** Any whitespace: space, tab, line breaks, no-break space, ideographic space (U+3000) and so on. */
const WHITESPACE = /\s/g;

export type TextStats = {
  /** 공백 포함 글자수 (graphemes) */
  chars: number;
  /** 공백 제외: spaces, tabs and line breaks removed */
  charsNoSpace: number;
  /** 줄바꿈 제외: spaces counted, line breaks not */
  charsNoNewline: number;
  /** JavaScript string length after LF normalization (what most web forms' maxlength / .length see) */
  codeUnits: number;
  /** Whitespace-separated words (어절) */
  words: number;
  /** Lines including empty ones; 0 for empty text */
  lines: number;
  /** Lines that contain something other than whitespace */
  paragraphs: number;
  /** Number of line breaks (LF) */
  newlines: number;
  /** UTF-8 bytes with LF line breaks */
  bytesUtf8: number;
  /** 한글 2바이트 bytes with LF line breaks */
  bytesKorean2: number;
  /** 공백 제외 text in 한글 2바이트 bytes (사람인·잡코리아 also show this) */
  bytesKorean2NoSpace: number;
  /** Text contains conjoining Hangul jamo (NFD, e.g. pasted from a macOS file name) */
  hasDecomposedHangul: boolean;
};

export const EMPTY_STATS: TextStats = {
  chars: 0,
  charsNoSpace: 0,
  charsNoNewline: 0,
  codeUnits: 0,
  words: 0,
  lines: 0,
  paragraphs: 0,
  newlines: 0,
  bytesUtf8: 0,
  bytesKorean2: 0,
  bytesKorean2NoSpace: 0,
  hasDecomposedHangul: false,
};

export function analyzeText(raw: string): TextStats {
  const text = normalizeNewlines(raw);
  if (text === "") return EMPTY_STATS;
  const noSpace = text.replace(WHITESPACE, "");
  const lineList = text.split("\n");
  const trimmed = text.trim();
  return {
    chars: countGraphemes(text),
    charsNoSpace: countGraphemes(noSpace),
    charsNoNewline: countGraphemes(text.replace(/\n/g, "")),
    codeUnits: text.length,
    words: trimmed === "" ? 0 : trimmed.split(/\s+/).length,
    lines: lineList.length,
    paragraphs: lineList.filter((l) => l.trim() !== "").length,
    newlines: lineList.length - 1,
    bytesUtf8: utf8Bytes(text),
    bytesKorean2: korean2Bytes(text),
    bytesKorean2NoSpace: korean2Bytes(noSpace),
    hasDecomposedHangul: /[ᄀ-ᇿힰ-퟿]/.test(text),
  };
}

/** The value the target limit is compared with. */
export function basisValue(stats: TextStats, basis: Basis): number {
  switch (basis) {
    case "nospace":
      return stats.charsNoSpace;
    case "byte2":
      return stats.bytesKorean2;
    case "utf8":
      return stats.bytesUtf8;
    default:
      return stats.chars;
  }
}

export type LimitStatus = {
  /** limit − value; negative when over */
  remaining: number;
  over: boolean;
  /** value / limit, clamped to [0, 1] for drawing a bar */
  ratio: number;
};

export function limitStatus(value: number, limit: number): LimitStatus | null {
  if (!Number.isFinite(limit) || limit <= 0) return null;
  const remaining = limit - value;
  return { remaining, over: remaining < 0, ratio: Math.min(1, Math.max(0, value / limit)) };
}

/** 원고지 매수 by simple division: ceil(chars / cellsPerSheet). 0 chars → 0 sheets. */
export function manuscriptSheets(chars: number, cellsPerSheet = MANUSCRIPT_CELLS): number {
  if (!(chars > 0)) return 0;
  return Math.ceil(chars / cellsPerSheet);
}

/**
 * 원고지 매수 estimate that follows the basic layout rules: every paragraph (line) starts on a
 * new row with one indented cell, and an empty line between paragraphs still uses a row. Blank
 * lines before the first and after the last paragraph (such as the trailing line break of pasted
 * text) are not part of the text and take no row. Ignores finer rules such as two digits per
 * cell, so it stays an estimate. Returns rows used and sheets.
 */
export function manuscriptLayout(
  raw: string,
  cols = MANUSCRIPT_COLS,
  rowsPerSheet = MANUSCRIPT_ROWS,
): { rows: number; sheets: number } {
  const lines = normalizeNewlines(raw).split("\n");
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim() === "") start++;
  while (end > start && lines[end - 1].trim() === "") end--;
  if (start === end) return { rows: 0, sheets: 0 };
  let rows = 0;
  for (let i = start; i < end; i++) {
    const body = lines[i].trim();
    rows += body === "" ? 1 : Math.ceil((1 + countGraphemes(body)) / cols);
  }
  return { rows, sheets: Math.ceil(rows / rowsPerSheet) };
}

/** Seconds needed at `perMinute` characters per minute, rounded to 5 s (at least 5 s for non-empty text). */
export function durationSeconds(chars: number, perMinute: number): number {
  if (!(chars > 0) || !(perMinute > 0)) return 0;
  const sec = (chars / perMinute) * 60;
  return Math.max(5, Math.round(sec / 5) * 5);
}

/** 150 → "2분 30초", 45 → "45초", 120 → "2분", 3720 → "1시간 2분" */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s}초`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  return sec > 0 ? `${m}분 ${sec}초` : `${m}분`;
}

/** Most Hangul characters that fit in a byte limit: 2 bytes each (한글 2바이트) or 3 (UTF-8). */
export function maxHangulForBytes(limitBytes: number, bytesPerHangul: 2 | 3): number {
  if (!(limitBytes > 0)) return 0;
  return Math.floor(limitBytes / bytesPerHangul);
}
