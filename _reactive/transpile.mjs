#!/usr/bin/env node
// Reactive cell transpiler sidecar for the Jekyll plugin.
//
// Reads JSON on stdin: {cells: [...], path: "<doc path>"} where each cell is a
// bare string (legacy js block) or {mode: "js"|"md", source: "<text>"}.
// Writes JSON {cells: [...]} on stdout, one entry per input cell, classified:
//
//   js cell        → {id, kind:"cell", mode:"js", body, inputs, outputs, output, autodisplay, autoview, automutable}
//   static md      → {id, kind:"static", html}                      (no interpolation; pure static HTML)
//   hydrating md   → {id, kind:"hydrate", html, exprs:[{ref, inputs, body}]}
//                      html has <span data-reactive="ref"></span> placeholders at each inline ${…};
//                      each expr is a tiny reactive variable that fills only its span (true hydration).
//   fallback md    → {id, kind:"cell", mode:"md", body, inputs, …, fallbackHtml}
//                      used when a cell has a BLOCK-level ${…} (its value is re-parsed as markdown
//                      block structure, e.g. generated table rows) that can't be an inline span;
//                      rendered whole-cell, with a static SSR fallback in the mount div.
//
// Static rendering uses the SAME markdown-it config as the client md.js (shared
// markdownit.js), so the server HTML matches the hydrated client DOM.
import {transpileJavaScript, transpileTemplate, parseTemplate} from "@observablehq/notebook-kit";
import {createMarkdownIt} from "./markdownit.js";

const mi = createMarkdownIt();

const input = JSON.parse(await new Promise((resolve) => {
  let s = ""; process.stdin.on("data", (d) => (s += d)); process.stdin.on("end", () => resolve(s));
}));
const where = input.path ? ` in ${input.path}` : "";

function snippet(source, loc) {
  const lines = source.split("\n");
  if (!loc || !loc.line) return lines.map((l) => "  | " + l).join("\n");
  const from = Math.max(1, loc.line - 2), to = Math.min(lines.length, loc.line + 1);
  const width = String(to).length, out = [];
  for (let n = from; n <= to; n++) {
    const g = `  ${n === loc.line ? ">" : " "} ${String(n).padStart(width)} | `;
    out.push(g + lines[n - 1]);
    if (n === loc.line && loc.column != null) out.push(" ".repeat(g.length + loc.column) + "^");
  }
  return out.join("\n");
}
function die(kind, i, source, err) {
  const msg = err && err.message ? err.message : String(err);
  process.stderr.write(`reactive: failed to parse ${kind} cell #${i}${where}: ${msg}\n` + snippet(source, err && err.loc) + "\n");
  process.exit(1);
}
function js(source, i, kind) {
  try { return transpileJavaScript(source, {id: i}); }
  catch (err) { die(kind, i, source, err); }
}

// Raw markdown between expressions (drop the ${…}), for static rendering / fallback.
function staticMarkdown(src, tmpl) {
  return tmpl.quasis.map((q) => src.slice(q.start, q.end)).join("");
}

// Is expression k alone on its line(s) — i.e. its value lands in BLOCK position?
// quasis[k].end is the `$` of `${`; quasis[k+1].start-1 is the `}`.
function isBlockExpr(src, tmpl, k) {
  const open = tmpl.quasis[k].end, close = tmpl.quasis[k + 1].start - 1;
  let i = open; while (i > 0 && src[i - 1] !== "\n") i--;
  let j = close + 1; while (j < src.length && src[j] !== "\n") j++;
  return /^\s*$/.test(src.slice(i, open)) && /^\s*$/.test(src.slice(close + 1, j));
}

function compile(cell, i) {
  const mode = typeof cell === "string" ? "js" : (cell.mode ?? "js");
  const source = typeof cell === "string" ? cell : (cell.source ?? "");

  if (mode !== "md") {
    const t = js(source, i, "js");
    return {id: i, kind: "cell", mode: "js", body: t.body, inputs: t.inputs ?? [], outputs: t.outputs ?? [],
      output: t.output ?? null, autodisplay: t.autodisplay ?? false, autoview: t.autoview ?? false, automutable: t.automutable ?? false};
  }

  let tmpl;
  try { tmpl = parseTemplate(source); }
  catch (err) { die("md", i, source, err); }

  // No interpolation → fully static HTML.
  if (tmpl.expressions.length === 0) {
    return {id: i, kind: "static", html: mi.render(source)};
  }

  // Any block-level interpolation → fall back to whole-cell md`` rendering with
  // a static SSR fallback (the value is re-parsed as markdown block structure).
  const hasBlock = tmpl.expressions.some((_, k) => isBlockExpr(source, tmpl, k));
  if (hasBlock) {
    const t = js(transpileTemplate(source, "md"), i, "md");
    return {id: i, kind: "cell", mode: "md", body: t.body, inputs: t.inputs ?? [], outputs: t.outputs ?? [],
      output: t.output ?? null, autodisplay: t.autodisplay ?? false, autoview: t.autoview ?? false, automutable: t.automutable ?? false,
      fallbackHtml: mi.render(staticMarkdown(source, tmpl))};
  }

  // Hydrate: render the markdown with a <span> placeholder per inline ${…}, and
  // emit one reactive variable per expression that fills only its span.
  let md = "", exprs = [];
  tmpl.quasis.forEach((q, k) => {
    md += source.slice(q.start, q.end);
    if (k < tmpl.expressions.length) {
      const e = tmpl.expressions[k];
      const ref = `${i}-${k}`;
      md += `<span data-reactive="${ref}"></span>`;
      const t = js(source.slice(e.start, e.end), i, "md");
      exprs.push({ref, inputs: t.inputs ?? [], body: t.body});
    }
  });
  return {id: i, kind: "hydrate", html: mi.render(md), exprs};
}

const cells = input.cells.map(compile);
process.stdout.write(JSON.stringify({cells}));
