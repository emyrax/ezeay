import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";

const MAX_LATEX_LENGTH = 400;
const MAX_SVG_LENGTH = 200_000;
const CACHE_LIMIT = 200;

const UNSAFE_LATEX =
  /\\(?:href|url|style|class|cssId|htmlId|require|includegraphics|def|newcommand|renewcommand|input|include|csname|futurelet|afterassignment)\b/i;

const UNSAFE_SVG = /<script|javascript:|<foreignObject|\son[a-z]+\s*=/i;

export class MathRenderError extends Error {
  constructor(message = "Unable to render equation") {
    super(message);
    this.name = "MathRenderError";
  }
}

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

const tex = new TeX({
  packages: ["base", "ams", "color", "cancel", "noundefined", "noerrors"],
});
const svg = new SVG({ fontCache: "local" });
const document = mathjax.document("", { InputJax: tex, OutputJax: svg });

const cache = new Map<string, string>();

function remember(key: string, value: string): string {
  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, value);
  return value;
}

export function latexToSvg(latex: string, display = true): string {
  if (typeof latex !== "string") throw new MathRenderError("Empty LaTeX");
  const input = latex.trim();
  if (!input) throw new MathRenderError("Empty LaTeX");
  if (input.length > MAX_LATEX_LENGTH) {
    throw new MathRenderError("Equation is too long");
  }
  if (UNSAFE_LATEX.test(input)) {
    throw new MathRenderError("Equation contains an unsafe command");
  }

  const cacheKey = `${display ? "d" : "i"}:${input}`;
  const hit = cache.get(cacheKey);
  if (hit) {
    cache.delete(cacheKey);
    cache.set(cacheKey, hit);
    return hit;
  }

  let output = "";
  try {
    const node = document.convert(input, { display });
    const html = adaptor.outerHTML(node);
    const match = html.match(/<svg[\s\S]*?<\/svg>/i);
    output = match ? match[0] : "";
  } catch (err) {
    throw new MathRenderError(
      err instanceof Error ? err.message : "Unable to render equation",
    );
  }

  if (!output) throw new MathRenderError("MathJax returned no SVG");
  output = output.replace(/\sxlink:href=/g, " href=");
  if (output.length > MAX_SVG_LENGTH) {
    throw new MathRenderError("Rendered equation is too large");
  }
  if (UNSAFE_SVG.test(output)) {
    throw new MathRenderError("Rendered equation contains unsafe markup");
  }

  return remember(cacheKey, output);
}
