#!/usr/bin/env node
// Reactive cell transpiler sidecar for the Jekyll plugin.
//
// Reads JSON on stdin: {cells: [...], path: "<doc path>"} where each cell is
// either a bare string (legacy: a ```js block source, treated as mode "js") or
// {mode: "js"|"md", source: "<text>"}. Markdown cells are compiled with
// notebook-kit's transpileTemplate so `${…}` interpolations become reactive
// inputs and the markdown is rendered by `md` at runtime — no display() needed.
//
// Writes JSON {cells: [{id, body, inputs, outputs, output, autodisplay, autoview, automutable}, ...]} on stdout.
// Uses Observable Notebook Kit's transpiler to infer each cell's reactive
// dependencies (inputs) and outputs from its free variables — the same
// machinery Observable Framework uses.
//
// On a parse failure it exits non-zero with a human-readable message on stderr
// naming the document, the cell index, the location, and a source snippet with
// a caret — instead of letting acorn's raw SyntaxError stack trace surface.
import {transpileJavaScript, transpileTemplate} from "@observablehq/notebook-kit";

const input = JSON.parse(await new Promise((resolve) => {
  let s = ""; process.stdin.on("data", (d) => (s += d)); process.stdin.on("end", () => resolve(s));
}));

const where = input.path ? ` in ${input.path}` : "";

// Render a few lines of context around an acorn error location with a caret.
function snippet(source, loc) {
  const lines = source.split("\n");
  if (!loc || !loc.line) {
    // No location info: show the whole (usually short) cell.
    return lines.map((l) => "  | " + l).join("\n");
  }
  const from = Math.max(1, loc.line - 2);
  const to = Math.min(lines.length, loc.line + 1);
  const width = String(to).length;
  const out = [];
  for (let n = from; n <= to; n++) {
    const gutter = `  ${n === loc.line ? ">" : " "} ${String(n).padStart(width)} | `;
    out.push(gutter + lines[n - 1]);
    if (n === loc.line && loc.column != null) {
      out.push(" ".repeat(gutter.length + loc.column) + "^");
    }
  }
  return out.join("\n");
}

const cells = input.cells.map((cell, i) => {
  const mode = typeof cell === "string" ? "js" : (cell.mode ?? "js");
  const source = typeof cell === "string" ? cell : (cell.source ?? "");
  // A markdown cell compiles to a reactive `md`…`` expression; a js cell is its
  // own source. Either way we then run transpileJavaScript to get the runtime
  // definition (inputs, outputs, autodisplay, …).
  const js = mode === "md" ? transpileTemplate(source, "md") : source;
  let t;
  try {
    t = transpileJavaScript(js, {id: i});
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    process.stderr.write(
      `reactive: failed to parse ${mode} cell #${i}${where}: ${msg}\n` +
      snippet(source, err && err.loc) + "\n"
    );
    process.exit(1);
  }
  return {
    id: i,
    body: t.body,
    inputs: t.inputs ?? [],
    outputs: t.outputs ?? [],
    output: t.output ?? null,
    autodisplay: t.autodisplay ?? false,
    autoview: t.autoview ?? false,
    automutable: t.automutable ?? false,
  };
});

process.stdout.write(JSON.stringify({cells}));
