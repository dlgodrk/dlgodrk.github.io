import { describe, expect, it } from "vitest";
import {
  analyzeText,
  basisValue,
  BYTE_LIMIT_PRESETS,
  CHAR_LIMIT_PRESETS,
  countCodePoints,
  countGraphemes,
  durationSeconds,
  formatDuration,
  korean2Bytes,
  limitStatus,
  manuscriptLayout,
  manuscriptSheets,
  maxHangulForBytes,
  normalizeNewlines,
  parseBasis,
  utf8Bytes,
} from "./char-count";

/**
 * Reference behaviour of the two big Korean job-site counters (page scripts read 2026-10-09):
 * - 사람인 https://www.saramin.co.kr/js/tools/character_counter.js `lengthMsg`:
 *   encodeURIComponent(ch).length > 4 → 2 bytes, '\n' → 1 byte, everything else 1 byte.
 * - 잡코리아 https://www.jobkorea.co.kr/service/user/tool/textcount `TextCount`:
 *   bytes += c >> 11 ? 2 : c >> 7 ? 2 : 1  (per UTF-16 code unit); length = value.length.
 */
function saraminBytes(s: string): number {
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s.charAt(i);
    if (encodeURIComponent(ch).length > 4) n += 2;
    else if (ch === "\n") {
      if (s.charAt(i - 1) !== "\r") n += 1;
    } else n += 1;
  }
  return n;
}
function jobkoreaBytes(s: string): number {
  let b = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    b += c >> 11 ? 2 : c >> 7 ? 2 : 1;
  }
  return b;
}

describe("worked example used on the page", () => {
  const s = analyzeText("안녕하세요. 반갑습니다.");
  it("counts characters with and without spaces", () => {
    // 안녕하세요. (6) + space (1) + 반갑습니다. (6)
    expect(s.chars).toBe(13);
    expect(s.charsNoSpace).toBe(12);
    expect(s.charsNoNewline).toBe(13);
    expect(s.words).toBe(2);
  });
  it("counts bytes both ways", () => {
    // 10 Hangul × 2 + 2 periods + 1 space = 23; UTF-8: 10 × 3 + 3 = 33
    expect(s.bytesKorean2).toBe(23);
    expect(s.bytesUtf8).toBe(33);
    expect(s.bytesKorean2NoSpace).toBe(22);
  });
});

describe("한글 2바이트 matches 사람인·잡코리아", () => {
  const samples = [
    "안녕하세요. 반갑습니다.",
    "지원 동기\n저는 2026년 상반기에 SW 개발 직무로…",
    "Hello, world!\tTab\nNew line",
    "café ① ㅋㅋ 漢字 ＡＢＣ “따옴표”",
    "",
  ];
  it.each(samples)("%j", (t) => {
    expect(korean2Bytes(t)).toBe(saraminBytes(t));
    expect(korean2Bytes(t)).toBe(jobkoreaBytes(t));
    expect(analyzeText(t).bytesKorean2).toBe(jobkoreaBytes(t));
  });
  it("emoji outside the BMP is two code units → 4 bytes (잡코리아)", () => {
    expect(korean2Bytes("😀")).toBe(4);
    expect(jobkoreaBytes("😀")).toBe(4);
  });
});

describe("UTF-8 bytes", () => {
  it("matches TextEncoder", () => {
    const enc = new TextEncoder();
    for (const t of ["가", "abc", "é", "😀", "👨‍👩‍👧", "漢字", "가\n나", "\ud800x"]) {
      expect(utf8Bytes(t)).toBe(enc.encode(t).length);
    }
  });
  it("Hangul is 3 bytes, ASCII 1, emoji 4", () => {
    expect(utf8Bytes("가나다")).toBe(9);
    expect(utf8Bytes("abc 1")).toBe(5);
    expect(utf8Bytes("😀")).toBe(4);
    // 👨 (4) + ZWJ (3) + 👩 (4) + ZWJ (3) + 👧 (4)
    expect(utf8Bytes("👨‍👩‍👧")).toBe(18);
  });
});

describe("grapheme counting", () => {
  it("counts an emoji sequence as one character", () => {
    expect(countGraphemes("👍🏽")).toBe(1);
    expect(countGraphemes("👨‍👩‍👧")).toBe(1);
    expect(countGraphemes("🇰🇷")).toBe(1);
    expect(countGraphemes("1️⃣")).toBe(1);
  });
  it("counts a decomposed (NFD) Hangul syllable as one character", () => {
    const nfd = "한글".normalize("NFD");
    expect(nfd.length).toBe(6);
    expect(countGraphemes(nfd)).toBe(2);
    expect(analyzeText(nfd).hasDecomposedHangul).toBe(true);
    expect(analyzeText("한글").hasDecomposedHangul).toBe(false);
  });
  it("counts combining accents with their base letter", () => {
    expect(countGraphemes("é")).toBe(1);
  });
  it("fast path agrees with the segmenter on plain Korean text", () => {
    const t = "자기소개서 1번 문항: 지원 동기 (700자 이내) — ㅋㅋ ① 漢字 ＡＢＣ\n둘째 줄\t탭";
    const it2 = new Intl.Segmenter("ko", { granularity: "grapheme" }).segment(t)[Symbol.iterator]();
    let n = 0;
    while (!it2.next().done) n++;
    expect(countGraphemes(t)).toBe(n);
    expect(countGraphemes(t)).toBe(t.length);
  });
  it("falls back to code points without Intl.Segmenter", () => {
    expect(countGraphemes("😀a", false)).toBe(2);
    expect(countGraphemes("👍🏽", false)).toBe(2);
    expect(countCodePoints("가😀")).toBe(2);
    expect(countCodePoints("\ud800")).toBe(1);
  });
  it("JS length differs from graphemes for emoji", () => {
    const s = analyzeText("좋아요👍");
    expect(s.chars).toBe(4);
    expect(s.codeUnits).toBe(5);
  });
});

describe("whitespace and structure", () => {
  it("returns zeros for empty text", () => {
    const s = analyzeText("");
    expect(s.chars).toBe(0);
    expect(s.words).toBe(0);
    expect(s.lines).toBe(0);
    expect(s.paragraphs).toBe(0);
    expect(s.bytesUtf8).toBe(0);
  });
  it("공백 제외 removes spaces, tabs, line breaks, no-break and ideographic spaces", () => {
    const s = analyzeText("a b\tc\nd e　f");
    expect(s.chars).toBe(11);
    expect(s.charsNoSpace).toBe(6);
    expect(s.charsNoNewline).toBe(10);
  });
  it("normalizes CRLF to a single line break", () => {
    expect(normalizeNewlines("가\r\n나\r다")).toBe("가\n나\n다");
    const crlf = analyzeText("가\r\n나");
    const lf = analyzeText("가\n나");
    expect(crlf).toEqual(lf);
    expect(lf.chars).toBe(3);
    expect(lf.charsNoSpace).toBe(2);
    expect(lf.charsNoNewline).toBe(2);
    expect(lf.newlines).toBe(1);
    expect(lf.bytesUtf8).toBe(7);
    expect(lf.bytesKorean2).toBe(5);
  });
  it("counts words, lines and paragraphs", () => {
    const s = analyzeText("첫 문단입니다.\n\n둘째 문단\n   \n셋째");
    expect(s.lines).toBe(5);
    expect(s.paragraphs).toBe(3);
    expect(s.words).toBe(5);
    expect(analyzeText("  hello   world \n 셈도장 ").words).toBe(3);
    expect(analyzeText("   ").words).toBe(0);
    expect(analyzeText("   ").paragraphs).toBe(0);
    expect(analyzeText("   ").lines).toBe(1);
  });
});

describe("target limit", () => {
  it("reports remaining and over", () => {
    expect(limitStatus(950, 1000)).toEqual({ remaining: 50, over: false, ratio: 0.95 });
    expect(limitStatus(1010, 1000)).toEqual({ remaining: -10, over: true, ratio: 1 });
    expect(limitStatus(1000, 1000)?.over).toBe(false);
    expect(limitStatus(10, NaN)).toBeNull();
    expect(limitStatus(10, 0)).toBeNull();
  });
  it("picks the value for each basis", () => {
    const s = analyzeText("안녕하세요. 반갑습니다.");
    expect(basisValue(s, "all")).toBe(13);
    expect(basisValue(s, "nospace")).toBe(12);
    expect(basisValue(s, "byte2")).toBe(23);
    expect(basisValue(s, "utf8")).toBe(33);
  });
  it("parses the basis from the URL safely", () => {
    expect(parseBasis("byte2")).toBe("byte2");
    expect(parseBasis("nonsense")).toBe("all");
  });
  it("preset lists are sorted and unique", () => {
    for (const list of [CHAR_LIMIT_PRESETS, BYTE_LIMIT_PRESETS]) {
      expect([...list].sort((a, b) => a - b)).toEqual(list);
      expect(new Set(list).size).toBe(list.length);
    }
  });
  it("converts byte limits to the most Hangul that fits", () => {
    expect(maxHangulForBytes(1000, 2)).toBe(500);
    expect(maxHangulForBytes(1000, 3)).toBe(333);
    expect(maxHangulForBytes(4000, 2)).toBe(2000);
    expect(maxHangulForBytes(4000, 3)).toBe(1333);
    expect(maxHangulForBytes(0, 2)).toBe(0);
  });
});

describe("원고지", () => {
  it("simple sheet count is ceil(chars / 200)", () => {
    expect(manuscriptSheets(0)).toBe(0);
    expect(manuscriptSheets(1)).toBe(1);
    expect(manuscriptSheets(200)).toBe(1);
    expect(manuscriptSheets(201)).toBe(2);
    expect(manuscriptSheets(1600)).toBe(8);
    expect(manuscriptSheets(1600, 400)).toBe(4);
  });
  it("layout estimate indents each paragraph and starts it on a new row", () => {
    // 19 chars + 1 indent = exactly one 20-cell row
    expect(manuscriptLayout("가".repeat(19))).toEqual({ rows: 1, sheets: 1 });
    // 20 chars + indent spill into a second row
    expect(manuscriptLayout("가".repeat(20))).toEqual({ rows: 2, sheets: 1 });
    // 11 short paragraphs → 11 rows → 2 sheets, although only 11 × 5 = 55 characters
    expect(manuscriptLayout(Array(11).fill("다섯글자다").join("\n"))).toEqual({ rows: 11, sheets: 2 });
    // a blank line still takes a row
    expect(manuscriptLayout("가\n\n나").rows).toBe(3);
    expect(manuscriptLayout("   ")).toEqual({ rows: 0, sheets: 0 });
    expect(manuscriptLayout("\n \n")).toEqual({ rows: 0, sheets: 0 });
  });
  it("ignores blank lines before the first and after the last paragraph", () => {
    // pasted text often ends with a line break; it must not add a row
    expect(manuscriptLayout("가\n")).toEqual({ rows: 1, sheets: 1 });
    expect(manuscriptLayout("가\r\n")).toEqual({ rows: 1, sheets: 1 });
    expect(manuscriptLayout("\n\n가\n \n\n")).toEqual({ rows: 1, sheets: 1 });
    // 10 one-row paragraphs + trailing line break = exactly one sheet
    expect(manuscriptLayout(`${Array(10).fill("다섯글자다").join("\n")}\n`)).toEqual({ rows: 10, sheets: 1 });
    // blank lines between paragraphs still count
    expect(manuscriptLayout("\n가\n\n나\n").rows).toBe(3);
  });
});

describe("reading time", () => {
  it("rounds to 5 seconds", () => {
    expect(durationSeconds(0, 500)).toBe(0);
    expect(durationSeconds(1, 500)).toBe(5);
    expect(durationSeconds(500, 500)).toBe(60);
    expect(durationSeconds(1000, 500)).toBe(120);
    expect(durationSeconds(1234, 500)).toBe(150); // 148.08 s → 150 s
    expect(durationSeconds(300, 300)).toBe(60);
  });
  it("formats durations in Korean", () => {
    expect(formatDuration(0)).toBe("0초");
    expect(formatDuration(45)).toBe("45초");
    expect(formatDuration(120)).toBe("2분");
    expect(formatDuration(150)).toBe("2분 30초");
    expect(formatDuration(3720)).toBe("1시간 2분");
    expect(formatDuration(3600)).toBe("1시간");
  });
});
