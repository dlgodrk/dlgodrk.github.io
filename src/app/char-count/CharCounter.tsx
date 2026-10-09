"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { CheckboxField, NumberField, SegmentedField, TextAreaField } from "@/components/fields";
import { StatementFootnote, StatementHero, StatementRow, StatementSection } from "@/components/Statement";
import { formatNumber, formatPercent } from "@/lib/format";
import { useUrlState } from "@/lib/useUrlState";
import {
  analyzeText,
  basisValue,
  BASIS_LABEL,
  BYTE_LIMIT_PRESETS,
  CHAR_LIMIT_PRESETS,
  durationSeconds,
  formatDuration,
  isByteBasis,
  limitStatus,
  manuscriptLayout,
  manuscriptSheets,
  MANUSCRIPT_CELLS,
  parseBasis,
  READING_CHARS_PER_MIN,
  SPEAKING_CHARS_PER_MIN,
  type Basis,
} from "@/lib/calc/char-count";

/*
 * The text itself never goes into the URL (privacy and length). It lives in React state and,
 * so a refresh does not wipe it, in sessionStorage (this tab only). Ticking "창을 닫아도 보관"
 * moves the draft to localStorage instead. Only the target limit and its basis go into the URL.
 */
const DRAFT_KEY = "semcalc:char-count:draft";
const KEEP_KEY = "semcalc:char-count:keep";

type StoreKind = "local" | "session";

function storage(kind: StoreKind): Storage | null {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

function readStore(kind: StoreKind, key: string): string | null {
  try {
    return storage(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

function writeStore(kind: StoreKind, key: string, value: string | null) {
  try {
    const s = storage(kind);
    if (!s) return;
    if (value === null || value === "") s.removeItem(key);
    else s.setItem(key, value);
  } catch {
    // Quota exceeded or storage blocked (private mode): counting still works without saving.
  }
}

type CountMode = "all" | "nospace" | "byte";
type ByteMode = "byte2" | "utf8";

const n = (v: number) => formatNumber(v);

export function CharCounter() {
  // URL keys: l = target limit (0 = no target), b = basis of the limit
  const [s, set] = useUrlState({ l: 1000, b: "all" });
  const basis = parseBasis(s.b);
  const limit = s.l;
  const byteBasis = isByteBasis(basis);
  const unit = byteBasis ? "바이트" : "자";

  const [text, setText] = useState("");
  const [keep, setKeep] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [restored, setRestored] = useState(false);
  const [lastCleared, setLastCleared] = useState<string | null>(null);
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);

  // Restore a draft once after mount (storage is not available during prerender).
  useEffect(() => {
    const keepPref = readStore("local", KEEP_KEY) === "1";
    const draft = readStore(keepPref ? "local" : "session", DRAFT_KEY) ?? "";
    /* eslint-disable react-hooks/set-state-in-effect -- one-time sync from browser storage after hydration */
    setKeep(keepPref);
    if (draft) {
      setText(draft);
      setRestored(true);
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Save the draft shortly after typing stops.
  useEffect(() => {
    if (!hydrated) return;
    const id = window.setTimeout(() => {
      writeStore(keep ? "local" : "session", DRAFT_KEY, text);
      writeStore(keep ? "session" : "local", DRAFT_KEY, null);
    }, 300);
    return () => window.clearTimeout(id);
  }, [text, keep, hydrated]);

  // Counting a long text on every keystroke can lag on old phones; let typing win.
  const deferred = useDeferredValue(text);
  const stats = useMemo(() => analyzeText(deferred), [deferred]);
  const layout = useMemo(() => manuscriptLayout(deferred), [deferred]);

  const value = basisValue(stats, basis);
  const status = limitStatus(value, limit);
  const empty = stats.chars === 0;

  const countMode: CountMode = byteBasis ? "byte" : basis === "nospace" ? "nospace" : "all";
  const byteMode: ByteMode = basis === "utf8" ? "utf8" : "byte2";

  function setBasis(b: Basis) {
    set({ b });
  }

  function clearText() {
    if (text) setLastCleared(text);
    setText("");
    setRestored(false);
    writeStore("local", DRAFT_KEY, null);
    writeStore("session", DRAFT_KEY, null);
  }

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied("ok");
    } catch {
      setCopied("fail");
    }
    window.setTimeout(() => setCopied(null), 2000);
  }

  const readSec = durationSeconds(stats.charsNoSpace, READING_CHARS_PER_MIN);
  const speakSec = durationSeconds(stats.charsNoSpace, SPEAKING_CHARS_PER_MIN);

  return (
    <div className="grid items-start gap-5 min-[900px]:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] min-[900px]:gap-8">
      <form className="calc-inputs" onSubmit={(e) => e.preventDefault()} aria-label="글자수 세기 입력">
        <TextAreaField
          label="글 입력"
          value={text}
          onChange={(v) => {
            setText(v);
            if (lastCleared !== null) setLastCleared(null);
            if (restored) setRestored(false);
          }}
          rows={12}
          placeholder="자기소개서나 과제 글을 붙여 넣거나 바로 써 보세요. 쓰는 동안 글자수를 세어 드려요."
          aside={`공백 포함 ${n(stats.chars)}자`}
        />

        {status ? (
          <LimitMeter value={value} limit={limit} unit={unit} basisLabel={BASIS_LABEL[basis]} over={status.over} remaining={status.remaining} ratio={status.ratio} />
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className="btn-ghost disabled:opacity-50" onClick={copyText} disabled={!text}>
            {copied === "ok" ? "복사했어요" : copied === "fail" ? "복사하지 못했어요" : "전체 복사"}
          </button>
          {lastCleared !== null && !text ? (
            <button
              type="button"
              className="btn-ghost"
              onClick={() => {
                setText(lastCleared);
                setLastCleared(null);
              }}
            >
              지운 글 되돌리기
            </button>
          ) : (
            <button type="button" className="btn-ghost disabled:opacity-50" onClick={clearText} disabled={!text}>
              지우기
            </button>
          )}
          {restored ? (
            <span role="status" className="text-sm text-muted">
              저장해 둔 글을 불러왔어요.
            </span>
          ) : null}
        </div>

        <CheckboxField
          label="창을 닫아도 이 브라우저에 보관"
          checked={keep}
          onChange={(v) => {
            setKeep(v);
            writeStore("local", KEEP_KEY, v ? "1" : null);
            if (v) {
              writeStore("local", DRAFT_KEY, text);
              writeStore("session", DRAFT_KEY, null);
            } else {
              writeStore("local", DRAFT_KEY, null);
              writeStore("session", DRAFT_KEY, text);
            }
          }}
          hint={
            keep
              ? "이 기기의 브라우저에만 저장돼요. 공용 PC라면 다 쓴 뒤 ‘지우기’를 눌러 주세요."
              : "새로고침해도 글이 남도록 이 탭에만 잠시 저장해요. 탭을 닫으면 사라져요."
          }
        />

        <SegmentedField<CountMode>
          label="목표 분량 기준"
          value={countMode}
          onChange={(m) => setBasis(m === "byte" ? byteMode : m)}
          options={[
            { value: "all", label: "공백 포함" },
            { value: "nospace", label: "공백 제외" },
            { value: "byte", label: "바이트" },
          ]}
          hint={countMode === "all" ? "자기소개서는 대부분 공백 포함 글자수로 제한해요. 지원서 안내 문구를 확인하세요." : undefined}
        />
        {byteBasis ? (
          <SegmentedField<ByteMode>
            label="바이트 계산 방식"
            value={byteMode}
            onChange={(m) => setBasis(m)}
            options={[
              { value: "byte2", label: "한글 2바이트" },
              { value: "utf8", label: "UTF-8 (한글 3)" },
            ]}
            hint="사람인·잡코리아 글자수 세기는 한글 2바이트 방식이에요. 지원서 사이트가 어느 쪽인지 모르면 ‘가’를 10자 넣어 20바이트인지 30바이트인지 확인해 보세요."
          />
        ) : null}

        <NumberField
          label="목표 분량"
          value={limit > 0 ? limit : NaN}
          // An empty field is stored as l=0 ("no target"); NaN would be dropped from the URL and
          // come back as the default 1,000 after a reload.
          onChange={(l) => set({ l: Number.isFinite(l) && l > 0 ? l : 0 })}
          unit={unit}
          max={1000000}
          placeholder="제한 없음"
          presets={(byteBasis ? BYTE_LIMIT_PRESETS : CHAR_LIMIT_PRESETS).map((p) => ({ label: `${n(p)}${unit}`, value: p }))}
          hint="비워 두면 목표 없이 글자수만 세요."
        />
      </form>

      <div className="calc-result">
        <section aria-label="글자수 명세" className="statement">
          <header className="statement-head">
            <h2 className="statement-title">글자수 명세</h2>
            <p className="statement-caption">이 브라우저 안에서 계산</p>
          </header>
          <div className="statement-body">
            <StatementHero
              label="공백 포함 글자수"
              value={`${n(stats.chars)}자`}
              sub={empty ? "글을 넣으면 바로 세어 드려요." : `공백 제외 ${n(stats.charsNoSpace)}자`}
            />

            {status ? (
              <StatementSection title="목표 분량">
                <StatementRow
                  label={`${n(limit)}${unit} 중`}
                  note={`${BASIS_LABEL[basis]} ${n(value)}${unit}, ${formatPercent(value / limit, 0)}`}
                  value={status.over ? `${n(-status.remaining)}${unit} 초과` : `${n(status.remaining)}${unit} 남음`}
                  emphasis
                />
              </StatementSection>
            ) : null}

            <StatementSection title="글자수">
              <StatementRow label="공백 포함" value={`${n(stats.chars)}자`} />
              <StatementRow label="공백 제외" note="띄어쓰기·탭·줄바꿈 제외" value={`${n(stats.charsNoSpace)}자`} />
              <StatementRow label="줄바꿈 제외" note="띄어쓰기는 셈" value={`${n(stats.charsNoNewline)}자`} />
              {stats.codeUnits !== stats.chars ? (
                <StatementRow
                  label="사람인·잡코리아 글자수"
                  note="이모지·결합 문자를 2자 이상으로 셈"
                  value={`${n(stats.codeUnits)}자`}
                />
              ) : null}
            </StatementSection>

            <StatementSection title="바이트">
              <StatementRow label="한글 2바이트" note="사람인·잡코리아 방식" value={`${n(stats.bytesKorean2)}바이트`} />
              <StatementRow label="UTF-8" note="한글 3바이트" value={`${n(stats.bytesUtf8)}바이트`} />
              {stats.newlines > 0 ? (
                <StatementRow
                  label="줄바꿈을 2바이트로 세면"
                  note={`줄바꿈 ${n(stats.newlines)}개`}
                  value={`+${n(stats.newlines)}바이트`}
                />
              ) : null}
            </StatementSection>

            <StatementSection title="구성">
              <StatementRow label="단어" note="띄어쓰기 기준" value={`${n(stats.words)}개`} />
              <StatementRow label="줄" value={`${n(stats.lines)}줄`} />
              <StatementRow label="문단" note="내용이 있는 줄" value={`${n(stats.paragraphs)}개`} />
            </StatementSection>

            <StatementSection title="원고지·시간 (대략)">
              <StatementRow
                label="200자 원고지"
                note={empty ? "공백 포함 ÷ 200" : `${formatNumber(stats.chars / MANUSCRIPT_CELLS, 1)}매 분량`}
                value={`${n(manuscriptSheets(stats.chars))}매`}
              />
              <StatementRow label="문단 나눔 반영" note="문단마다 들여쓰기·새 줄" value={`약 ${n(layout.sheets)}매`} />
              <StatementRow
                label="눈으로 읽기"
                note={`분당 ${n(READING_CHARS_PER_MIN)}자 가정`}
                value={empty ? "0초" : `약 ${formatDuration(readSec)}`}
              />
              <StatementRow
                label="소리 내어 읽기"
                note={`분당 ${n(SPEAKING_CHARS_PER_MIN)}자 가정`}
                value={empty ? "0초" : `약 ${formatDuration(speakSec)}`}
              />
            </StatementSection>

            <StatementFootnote>
              입력한 글은 이 브라우저 밖으로 전송되지 않아요. 이모지·결합 문자는 눈에 보이는 1글자로 셉니다. 읽는 시간은 공백
              제외 글자수를 기준으로 한 대략적인 값이에요.
              {stats.hasDecomposedHangul ? (
                <>
                  {" "}
                  <strong>자음·모음이 분리된 한글(NFD)이 섞여 있어요.</strong> 맥에서 복사한 파일명 등에서 생기며, 사이트에
                  따라 한 글자를 2~3자로 셀 수 있어요.
                </>
              ) : null}
            </StatementFootnote>
          </div>
        </section>
      </div>
    </div>
  );
}

function LimitMeter({
  value,
  limit,
  unit,
  basisLabel,
  over,
  remaining,
  ratio,
}: {
  value: number;
  limit: number;
  unit: string;
  basisLabel: string;
  over: boolean;
  remaining: number;
  ratio: number;
}) {
  const remainText = over ? `${n(-remaining)}${unit} 초과` : `${n(remaining)}${unit} 남음`;
  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm">
        <span className="text-ink-soft tabular">
          {basisLabel} <strong className="font-semibold text-ink">{n(value)}</strong> / {n(limit)}
          {unit}
        </span>
        <span className={over ? "font-semibold text-seal tabular" : "font-medium text-ink tabular"}>{remainText}</span>
      </div>
      <div
        role="progressbar"
        aria-label={`목표 분량 대비 ${basisLabel}`}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={Math.min(value, limit)}
        aria-valuetext={`${n(value)}${unit} / ${n(limit)}${unit}, ${remainText}`}
        className="h-2 overflow-hidden rounded-full bg-wash"
      >
        <div
          className={over ? "h-full rounded-full bg-seal" : "h-full rounded-full bg-link"}
          style={{ width: `${(ratio * 100).toFixed(1)}%` }}
        />
      </div>
    </div>
  );
}
