import { File } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import type { NoteImage } from "../../types/note";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sanitizeTitle(title: string): string {
  const cleaned = title
    .replace(/[/\\?%*:|"<>\x00-\x1F]/g, "")
    .trim()
    .slice(0, 60);
  const joined = cleaned.split(/\s+/).join("");
  return joined || "note";
}

const INLINE_REGEX =
  /\*\*(.+?)\*\*|__(.+?)__|`([^`\n]+)`|\*([^*\n]+)\*|==(.+?)==/g;

function inlineHtml(text: string): string {
  const esc = escapeHtml(text);
  INLINE_REGEX.lastIndex = 0;
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = INLINE_REGEX.exec(esc)) !== null) {
    out += esc.slice(last, m.index);
    if (m[1] !== undefined) out += `<strong>${m[1]}</strong>`;
    else if (m[2] !== undefined) out += `<u>${m[2]}</u>`;
    else if (m[3] !== undefined) out += `<code>${m[3]}</code>`;
    else if (m[4] !== undefined) out += `<em>${m[4]}</em>`;
    else if (m[5] !== undefined) out += `<mark>${m[5]}</mark>`;
    last = m.index + m[0].length;
    if (m[0].length === 0) INLINE_REGEX.lastIndex += 1;
  }
  out += esc.slice(last);
  return out;
}

function markdownBody(content: string): string {
  const lines = content.split("\n");
  const html: string[] = [];
  let listOpen = false;

  const closeList = () => {
    if (listOpen) {
      html.push("</ul>");
      listOpen = false;
    }
  };

  for (const raw of lines) {
    const text = raw.replace(/\s+$/, "");
    if (/^## /.test(text)) {
      closeList();
      html.push(`<h2>${inlineHtml(text.slice(3))}</h2>`);
    } else if (/^# /.test(text)) {
      closeList();
      html.push(`<h1>${inlineHtml(text.slice(2))}</h1>`);
    } else if (/^- \[[ xX]\] /i.test(text)) {
      const checked = /^- \[[xX]\] /i.test(text);
      const inner = text.replace(/^- \[[ xX]\] /i, "");
      if (!listOpen) {
        html.push('<ul class="tasks">');
        listOpen = true;
      }
      html.push(
        `<li class="task${checked ? " done" : ""}"><input type="checkbox" disabled${
          checked ? " checked" : ""
        } /> <span>${inlineHtml(inner)}</span></li>`,
      );
    } else if (/^- /.test(text)) {
      if (!listOpen) {
        html.push("<ul>");
        listOpen = true;
      }
      html.push(`<li>${inlineHtml(text.slice(2))}</li>`);
    } else if (text.trim() === "") {
      closeList();
      html.push("<p></p>");
    } else {
      closeList();
      html.push(`<p>${inlineHtml(text)}</p>`);
    }
  }
  closeList();
  return html.join("\n");
}

function imageSrc(uri: string): string {
  const ext = uri.split(".").pop()?.toLowerCase() ?? "";
  const mime =
    ext === "png"
      ? "image/png"
      : ext === "webp"
        ? "image/webp"
        : ext === "heic"
          ? "image/heic"
          : "image/jpeg";
  return `data:${mime};base64,`;
}

async function imagesHtml(images: NoteImage[]): Promise<string> {
  const blocks: string[] = [];
  for (const image of images) {
    try {
      const file = new File(image.uri);
      if (!file.exists) continue;
      const base64 = await file.base64();
      blocks.push(`<div class="note-image"><img src="${imageSrc(image.uri)}${base64}" /></div>`);
    } catch {
      // skip unreachable image
    }
  }
  return blocks.join("\n");
}

function buildHtml(title: string, content: string, images: string, tags: string[]): string {
  const tagChips = tags.length
    ? `<div class="tags">${tags.map((t) => `<span class="tag">#${escapeHtml(t)}</span>`).join("")}</div>`
    : "";
  const updatedAt = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body {
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 13px;
    line-height: 1.6;
    color: #111827;
    margin: 0;
    padding: 32px;
  }
  .title { font-size: 26px; font-weight: 800; margin: 0 0 4px; color: #0f172a; }
  .meta { font-size: 12px; color: #6b7280; margin-bottom: 16px; }
  h1 { font-size: 20px; margin: 20px 0 8px; color: #0f172a; }
  h2 { font-size: 16px; margin: 18px 0 6px; color: #0f172a; }
  p { margin: 8px 0; }
  strong { font-weight: 700; }
  em { font-style: italic; }
  u { text-decoration: underline; }
  code {
    background: #f1f5f9;
    padding: 1px 5px;
    border-radius: 4px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
  }
  mark { background: #fde047; padding: 0 2px; border-radius: 2px; }
  ul { margin: 8px 0; padding-left: 22px; }
  li { margin: 3px 0; }
  ul.tasks { list-style: none; padding-left: 4px; }
  ul.tasks li.task { margin: 4px 0; }
  ul.tasks li.task.done span { color: #9ca3af; text-decoration: line-through; }
  .tags { margin: 12px 0 4px; }
  .tag {
    display: inline-block;
    background: #eef2ff;
    color: #4338ca;
    border-radius: 999px;
    padding: 2px 10px;
    font-size: 11px;
    font-weight: 600;
    margin-right: 6px;
  }
  .note-image { margin: 14px 0; }
  .note-image img { max-width: 100%; border-radius: 8px; }
</style>
</head>
<body>
  <h1 class="title">${escapeHtml(title)}</h1>
  <div class="meta">Yuinx · ${updatedAt}</div>
  ${tagChips}
  <div class="content">
    ${content}
    ${images}
  </div>
</body>
</html>`;
}

export async function exportNoteAsPdf(params: {
  title: string;
  content: string;
  images?: NoteImage[];
  tags?: string[];
}): Promise<string> {
  const title = params.title || "Untitled note";
  const imagesHtmlText = await imagesHtml(params.images ?? []);
  const html = buildHtml(title, markdownBody(params.content), imagesHtmlText, params.tags ?? []);

  // expo-print writes the PDF to the global cache dir, which expo-sharing cannot
  // read on Android (scoped file permissions). Render to base64 and write the
  // file into expo-file-system's own cache dir so the share URI is allowed.
  const { base64 } = await Print.printToFileAsync({ html, base64: true });
  if (!base64) {
    throw new Error("Could not generate PDF data.");
  }
  const dir = FileSystem.cacheDirectory;
  if (!dir) {
    throw new Error("No cache directory available for the PDF.");
  }
  const uri = `${dir}${sanitizeTitle(title)}-${Date.now()}.pdf`;
  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return uri;
}