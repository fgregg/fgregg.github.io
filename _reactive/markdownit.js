// Shared markdown-it configuration, used by BOTH the client renderer (md.js,
// bundled for the browser) and the build-time server renderer (transpile.mjs,
// in Node). A single config guarantees the server-rendered static HTML matches
// the hydrated client DOM — same heading anchors, linkify, typographer, etc.
import slugify from "@sindresorhus/slugify";
import MarkdownIt from "markdown-it";
import MarkdownItAnchor from "markdown-it-anchor";

export function createMarkdownIt() {
  const mi = MarkdownIt({html: true, linkify: true, typographer: true});
  mi.use(MarkdownItAnchor, {
    level: [2, 3],
    slugify: (s) => slugify(s),
    permalink: MarkdownItAnchor.permalink.linkInsideHeader({
      symbol: "#",
      placement: "after",
      class: "header-anchor",
      ariaHidden: true,
    }),
  });
  return mi;
}
