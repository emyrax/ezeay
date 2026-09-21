export type FormatTool =
  | "bold"
  | "italic"
  | "underline"
  | "code"
  | "highlight"
  | "heading1"
  | "heading2"
  | "bullet";

export interface TextRange {
  start: number;
  end: number;
}

export interface MarkdownRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  code?: boolean;
  highlight?: boolean;
  heading?: 1 | 2;
  headingGroup?: string;
  bullet?: boolean;
  checkbox?: boolean;
  marker?: boolean;
}

type RunStyle = Omit<MarkdownRun, "text">;

const INLINE_REGEX =
  /\*\*(.+?)\*\*|__(.+?)__|`([^`\n]+)`|\*([^*\n]+)\*|==(.+?)==/g;

export function headingGroupForTitle(title: string): string | undefined {
  const t = title.trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  if (t.startsWith("summary")) return "summary";
  if (t.startsWith("cheat")) return "cheatsheet";
  if (t.startsWith("flashcard")) return "flashcards";
  if (t.startsWith("quiz")) return "quiz";
  return undefined;
}

const MARKER_CHARS = new Set(["*", "_", "=", "`"]);
const WORD_RE = /[\p{L}\p{N}_]/u;

export function parseMarkdownRuns(content: string): MarkdownRun[] {
  const runs: MarkdownRun[] = [];
  const lines = content.split("\n");

  const splitLoose = (t: string, extra: RunStyle) => {
    let i = 0;
    while (i < t.length) {
      const ch = t[i];
      if (MARKER_CHARS.has(ch)) {
        let j = i;
        while (j < t.length && MARKER_CHARS.has(t[j])) j++;
        const before = t[i - 1];
        const after = t[j];
        const insideWord =
          before !== undefined &&
          WORD_RE.test(before) &&
          after !== undefined &&
          WORD_RE.test(after);
        runs.push({ text: t.slice(i, j), ...extra, marker: !insideWord });
        i = j;
      } else {
        let j = i;
        while (j < t.length && !MARKER_CHARS.has(t[j])) j++;
        runs.push({ text: t.slice(i, j), ...extra });
        i = j;
      }
    }
  };

  for (let i = 0; i < lines.length; i++) {
    if (i > 0) runs.push({ text: "\n" });

    let text = lines[i];
    const bulletStyle: RunStyle = {};
    const lineStyle: RunStyle = {};

    if (/^## /.test(text)) {
      lineStyle.heading = 2;
      runs.push({ text: "## ", ...lineStyle, marker: true });
      text = text.slice(3);
      lineStyle.headingGroup = headingGroupForTitle(text);
    } else if (/^# /.test(text)) {
      lineStyle.heading = 1;
      runs.push({ text: "# ", ...lineStyle, marker: true });
      text = text.slice(2);
      lineStyle.headingGroup = headingGroupForTitle(text);
    } else if (/^- \[[ xX]\] /.test(text)) {
      bulletStyle.bullet = true;
      bulletStyle.checkbox = /^- \[[xX]\] /.test(text);
      text = text.slice(6);
    } else if (/^- /.test(text)) {
      bulletStyle.bullet = true;
      text = text.slice(2);
    }

    if (bulletStyle.bullet) {
      const glyph =
        bulletStyle.checkbox === true
          ? "☑ "
          : bulletStyle.checkbox === false
            ? "☐ "
            : "• ";
      runs.push({ text: glyph, ...bulletStyle });
    }

    const segment = (t: string, extra: RunStyle = {}) => {
      if (!t) return;
      splitLoose(t, { ...lineStyle, ...extra });
    };

    let last = 0;
    let m: RegExpExecArray | null;
    INLINE_REGEX.lastIndex = 0;
    while ((m = INLINE_REGEX.exec(text)) !== null) {
      if (m.index > last) segment(text.slice(last, m.index));

      let inner: string;
      let style: RunStyle;
      let openLen: number;
      if (m[1] !== undefined) {
        inner = m[1];
        style = { bold: true };
        openLen = 2;
      } else if (m[2] !== undefined) {
        inner = m[2];
        style = { underline: true };
        openLen = 2;
      } else if (m[3] !== undefined) {
        inner = m[3];
        style = { code: true };
        openLen = 1;
      } else if (m[4] !== undefined) {
        inner = m[4];
        style = { italic: true };
        openLen = 1;
      } else {
        inner = m[5] as string;
        style = { highlight: true };
        openLen = 2;
      }

      const closeLen = m[0].length - openLen - inner.length;
      runs.push({
        text: m[0].slice(0, openLen),
        ...lineStyle,
        ...style,
        marker: true,
      });
      runs.push({ text: inner, ...lineStyle, ...style });
      if (closeLen > 0) {
        runs.push({
          text: m[0].slice(openLen + inner.length),
          ...lineStyle,
          ...style,
          marker: true,
        });
      }
      last = m.index + m[0].length;
      if (m[0].length === 0) INLINE_REGEX.lastIndex += 1;
    }
    if (last < text.length) segment(text.slice(last));
  }

  return runs;
}

function clampRange(value: string, range: TextRange): TextRange {
  const max = value.length;
  const start = Math.max(0, Math.min(range.start, max));
  const end = Math.max(start, Math.min(range.end, max));
  return { start, end };
}

const INLINE_TOOLS: Record<
  "bold" | "italic" | "underline" | "code" | "highlight",
  { open: string; close: string; placeholder: string }
> = {
  bold: { open: "**", close: "**", placeholder: "bold" },
  italic: { open: "*", close: "*", placeholder: "italic" },
  underline: { open: "__", close: "__", placeholder: "underline" },
  code: { open: "`", close: "`", placeholder: "code" },
  highlight: { open: "==", close: "==", placeholder: "highlight" },
};

export interface FormatResult {
  content: string;
  start: number;
  end: number;
}

function findLineInfo(
  content: string,
  index: number,
): { lineStart: number; lineEnd: number; line: string } {
  const clamped = Math.max(0, Math.min(index, content.length));
  const lineStart = content.lastIndexOf("\n", clamped - 1) + 1;
  const nextNl = content.indexOf("\n", clamped);
  const lineEnd = nextNl === -1 ? content.length : nextNl;
  return {
    lineStart,
    lineEnd,
    line: content.slice(lineStart, lineEnd),
  };
}

function toggleLinePrefix(
  content: string,
  sel: TextRange,
  tool: "heading1" | "heading2" | "bullet",
): FormatResult {
  const pos = sel.start;
  const { lineStart, lineEnd, line } = findLineInfo(content, pos);
  const prefix = tool === "heading1" ? "# " : tool === "heading2" ? "## " : "- ";

  let newLine: string;
  if (line.startsWith(prefix)) {
    newLine = tool === "bullet" ? line.replace(/^-\s*(?:\[[ xX]\]\s+)?/, "") : line.slice(prefix.length);
  } else {
    const base =
      tool === "bullet"
        ? line.replace(/^-\s*(?:\[[ xX]\]\s+)?/, "")
        : line.replace(/^(#{1,2} )/, "");
    newLine = prefix + base;
  }

  const delta = newLine.length - line.length;
  const next = content.slice(0, lineStart) + newLine + content.slice(lineEnd);
  const adjust = (v: number) => (v >= lineStart ? v + delta : v);
  const range = clampRange(next, {
    start: adjust(sel.start),
    end: adjust(sel.end),
  });
  return { content: next, ...range };
}

export function toggleMarkdown(
  content: string,
  range: TextRange,
  tool: FormatTool,
): FormatResult {
  const sel = clampRange(content, range);
  const { start, end } = sel;

  if (tool === "heading1" || tool === "heading2" || tool === "bullet") {
    return toggleLinePrefix(content, sel, tool);
  }

  const def = INLINE_TOOLS[tool];
  const selected = content.slice(start, end);

  if (start === end) {
    const ph = def.placeholder;
    const next = `${content.slice(0, start)}${def.open}${ph}${def.close}${content.slice(end)}`;
    const innerStart = start + def.open.length;
    return { content: next, start: innerStart, end: innerStart + ph.length };
  }

  const before = content.slice(0, start);
  const after = content.slice(end);

  const enclosedBefore = before.endsWith(def.open);
  const enclosedAfter = after.startsWith(def.close);
  if (enclosedBefore && enclosedAfter) {
    const next =
      before.slice(0, before.length - def.open.length) +
      selected +
      after.slice(def.close.length);
    return { content: next, start: start - def.open.length, end: end - def.open.length };
  }

  const selectedWrapped =
    selected.startsWith(def.open) &&
    selected.endsWith(def.close) &&
    selected.length >= def.open.length + def.close.length;
  if (selectedWrapped) {
    const inner = selected.slice(def.open.length, selected.length - def.close.length);
    const next = `${before}${inner}${after}`;
    return { content: next, start, end: start + inner.length };
  }

  const next = `${before}${def.open}${selected}${def.close}${after}`;
  return { content: next, start: start + def.open.length, end: end + def.open.length };
}

const INLINE_SPAN_REGEX =
  /\*\*([^*\n]+)\*\*|__([^_\n]+)__|`([^`\n]+)`|\*([^*\n]+)\*|==([^=\n]+)==/g;

interface LineStyleFlags {
  heading?: 1 | 2;
  bullet?: boolean;
}

function scanLineStyle(line: string): { style: LineStyleFlags; prefixLen: number } {
  if (line.startsWith("## ")) return { style: { heading: 2 }, prefixLen: 3 };
  if (line.startsWith("# ")) return { style: { heading: 1 }, prefixLen: 2 };
  if (/^- \[[ xX]\] /.test(line)) return { style: { bullet: true }, prefixLen: 6 };
  if (line.startsWith("- ")) return { style: { bullet: true }, prefixLen: 2 };
  return { style: {}, prefixLen: 0 };
}

function inlineToolsAt(
  line: string,
  prefixLen: number,
  lineStart: number,
  absStart: number,
  absEnd: number,
  collapsed: boolean,
): Record<"bold" | "italic" | "underline" | "code" | "highlight", boolean> {
  const active = { bold: false, italic: false, underline: false, code: false, highlight: false };
  const seg = line.slice(prefixLen);
  const segBase = lineStart + prefixLen;

  INLINE_SPAN_REGEX.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = INLINE_SPAN_REGEX.exec(seg)) !== null) {
    const group: "bold" | "underline" | "code" | "italic" | "highlight" =
      m[1] !== undefined
        ? "bold"
        : m[2] !== undefined
          ? "underline"
          : m[3] !== undefined
            ? "code"
            : m[4] !== undefined
              ? "italic"
              : "highlight";
    const openLen =
      group === "bold" || group === "underline" || group === "highlight" ? 2 : 1;
    const closeLen = openLen;
    const innerStart = segBase + m.index + openLen;
    const innerEnd = segBase + m.index + m[0].length - closeLen;

    if (collapsed
      ? absStart >= innerStart && absStart < innerEnd
      : absStart < innerEnd && absEnd > innerStart) {
      active[group] = true;
    }
    if (m[0].length === 0) INLINE_SPAN_REGEX.lastIndex += 1;
  }
  return active;
}

export function getActiveTools(
  content: string,
  range: TextRange,
): Record<FormatTool, boolean> {
  const sel = clampRange(content, range);
  const absStart = Math.min(sel.start, sel.end);
  const absEnd = Math.max(sel.start, sel.end);
  const collapsed = absStart === absEnd;
  const active = {
    bold: false,
    italic: false,
    underline: false,
    code: false,
    highlight: false,
    heading1: false,
    heading2: false,
    bullet: false,
  };

  const lastInfo = findLineInfo(content, Math.max(absStart, absEnd - 1));

  let { lineStart, lineEnd } = findLineInfo(content, absStart);

  while (lineStart <= lastInfo.lineStart) {
    const line = content.slice(lineStart, lineEnd);
    const { style, prefixLen } = scanLineStyle(line);
    if (style.heading === 1) active.heading1 = true;
    else if (style.heading === 2) active.heading2 = true;
    if (style.bullet) active.bullet = true;

    const lineTouched = collapsed
      ? absStart >= lineStart && absStart <= lineEnd
      : absStart < lineEnd && absEnd > lineStart;
    if (lineTouched) {
      const inline = inlineToolsAt(line, prefixLen, lineStart, absStart, absEnd, collapsed);
      active.bold = active.bold || inline.bold;
      active.italic = active.italic || inline.italic;
      active.underline = active.underline || inline.underline;
      active.code = active.code || inline.code;
      active.highlight = active.highlight || inline.highlight;
    }

    if (lineStart >= lastInfo.lineStart) break;
    lineStart = lineEnd + 1;
    const info = findLineInfo(content, lineStart);
    lineStart = info.lineStart;
    lineEnd = info.lineEnd;
  }

  return active;
}