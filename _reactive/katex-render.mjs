#!/usr/bin/env node
// Build-time LaTeX renderer for the Jekyll math plugin.
//
// Reads HTML on stdin, replaces \[...\] (display) and \(...\) (inline) math with
// KaTeX-rendered static HTML, writes the result to stdout. No client-side JS:
// the math is fully typeset at build time, so it renders in feeds and with
// JavaScript disabled.
//
// Delimiters are \(...\) and \[...\] (NOT $...$) to avoid colliding with the
// ${...} template literals inside reactive js cells.
import katex from "katex";

const html = await new Promise((resolve) => {
  let s = "";
  process.stdin.on("data", (d) => (s += d));
  process.stdin.on("end", () => resolve(s));
});

function render(tex, displayMode) {
  try {
    return katex.renderToString(tex.trim(), {displayMode, throwOnError: false});
  } catch (e) {
    return `<code class="katex-error">${tex}</code>`;
  }
}

// Display math \[ ... \] first (so its inner content isn't caught by inline),
// then inline \( ... \). Non-greedy, across newlines.
let out = html
  .replace(/\\\[([\s\S]*?)\\\]/g, (_, tex) => render(tex, true))
  .replace(/\\\(([\s\S]*?)\\\)/g, (_, tex) => render(tex, false));

process.stdout.write(out);
