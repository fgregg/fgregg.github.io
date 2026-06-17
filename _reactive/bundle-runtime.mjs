#!/usr/bin/env node
// Bundle self-hosted browser modules so reactive posts have NO live third-party
// dependency at page-load time. Outputs (both gitignored, built in CI):
//   assets/js/reactive-runtime.js  — define, main (notebook-kit) + Plot, Inputs
//   assets/js/datasette-client.js  — DatasetteClient (with d3-dsv inlined)
//
// An esbuild alias swaps notebook-kit's inspect module for our DOM-aware one
// (_reactive/inspect.js), so display() of a string renders as plain text.
import {build} from "esbuild";
import {fileURLToPath} from "node:url";
import {dirname, join} from "node:path";
import {cpSync, mkdirSync, readFileSync, writeFileSync} from "node:fs";

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..");
const ourInspect = join(here, "inspect.js");
const ourMd = join(here, "md.js");

// a tiny entry that re-exports exactly what the plugin's generated script imports
const runtimeEntry = `
export {define, main} from "@observablehq/notebook-kit/runtime";
export * as Plot from "@observablehq/plot";
export * as Inputs from "@observablehq/inputs";
export * as d3 from "d3";
`;

const common = {bundle: true, format: "esm", minify: true, legalComments: "none"};

// 1. the reactive runtime + Plot/Inputs, with our inspector swapped in
await build({
  ...common,
  stdin: {contents: runtimeEntry, resolveDir: here, sourcefile: "reactive-entry.js", loader: "js"},
  outfile: join(repo, "assets", "js", "reactive-runtime.js"),
  plugins: [{
    name: "swap-modules",
    setup(b) {
      // notebook-kit's runtime/display.js and runtime/index.js import "./inspect.js";
      // redirect that to our DOM-aware version. Match the relative path "./inspect.js"
      // whose importer is inside notebook-kit's runtime dir (NOT @observablehq/inspector).
      b.onResolve({filter: /(^|\/)inspect\.js$/}, (args) => {
        if (/notebook-kit[\/\\]dist[\/\\]src[\/\\]runtime[\/\\]/.test(args.importer)) {
          return {path: ourInspect};
        }
      });
      // notebook-kit's stdlib/recommendedLibraries.js does `import("./md.js")`;
      // redirect to our md (hover `#` heading anchor instead of whole-heading link).
      b.onResolve({filter: /(^|\/)md\.js$/}, (args) => {
        if (/notebook-kit[\/\\]dist[\/\\]src[\/\\]runtime[\/\\]stdlib[\/\\]/.test(args.importer)) {
          return {path: ourMd};
        }
      });
    },
  }],
});
console.log("wrote assets/js/reactive-runtime.js");

// 1b. Self-host the Observable Inputs stylesheet. esbuild emits a sidecar
// reactive-runtime.css whose only real content is a remote @import of the
// Inputs CSS from jsDelivr — a live page-load dependency, and a version skew
// risk (the CDN's class hash must match the bundled JS's). Inline the LOCAL
// inputs/dist/index.css instead: same version as the bundled runtime, so the
// generated .inputs-<hash>-table classes match, and no third-party fetch.
// Without this, Inputs.table's `overflow-y:auto` never applies and the table
// overflows its max-height box, overlapping content below it.
{
  const cssPath = join(repo, "assets", "js", "reactive-runtime.css");
  const inputsCss = readFileSync(
    join(here, "node_modules", "@observablehq", "inputs", "dist", "index.css"),
    "utf-8",
  );
  const css = readFileSync(cssPath, "utf-8").replace(
    /@import\s*["']https:\/\/cdn\.jsdelivr\.net\/npm\/@observablehq\/inputs\/dist\/index\.css["'];?/,
    inputsCss,
  );
  writeFileSync(cssPath, css);
  console.log("wrote assets/js/reactive-runtime.css (inputs CSS inlined)");
}

// 2. the standalone DatasetteClient (d3-dsv inlined)
await build({
  ...common,
  entryPoints: [join(here, "datasette-client.js")],
  outfile: join(repo, "assets", "js", "datasette-client.js"),
});
console.log("wrote assets/js/datasette-client.js");

// 2b. Tom MacWright's table component, vendored (htl inlined).
await build({
  ...common,
  entryPoints: [join(here, "toms-table.js")],
  outfile: join(repo, "assets", "js", "toms-table.js"),
});
console.log("wrote assets/js/toms-table.js");

// 3. KaTeX stylesheet + fonts, for the build-time-rendered math.
// The CSS references fonts/ relatively, so they must sit beside it.
const katexDist = join(here, "node_modules", "katex", "dist");
const katexOut = join(repo, "assets", "katex");
mkdirSync(katexOut, {recursive: true});
cpSync(join(katexDist, "katex.min.css"), join(katexOut, "katex.min.css"));
cpSync(join(katexDist, "fonts"), join(katexOut, "fonts"), {recursive: true});
console.log("wrote assets/katex/katex.min.css + fonts");
