#!/usr/bin/env node
// Reactive cell transpiler sidecar for the Jekyll plugin.
// Reads JSON {cells: ["<js source>", ...]} on stdin.
// Writes JSON {cells: [{id, body, inputs, outputs, output, autodisplay, autoview, automutable}, ...]} on stdout.
// Uses Observable Notebook Kit's transpiler to infer each cell's reactive
// dependencies (inputs) and outputs from its free variables — the same
// machinery Observable Framework uses.
import {transpileJavaScript} from "@observablehq/notebook-kit";

const input = JSON.parse(await new Promise((resolve) => {
  let s = ""; process.stdin.on("data", (d) => (s += d)); process.stdin.on("end", () => resolve(s));
}));

const cells = input.cells.map((source, i) => {
  const t = transpileJavaScript(source, {id: i});
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
