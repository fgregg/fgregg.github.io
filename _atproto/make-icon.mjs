// One-time helper: rasterize ../assets/favicon.svg into a 512x512 icon.png for
// the Standard.Site publication card. Run with `npm run icon`; commit icon.png.
// Re-run only when the favicon changes.
//
// The favicon is a full-bleed square (a little data table). Avatars are masked to
// a circle, which clips the square's corners, so we inset the favicon onto a white
// canvas. A square of side s centered in a circle of diameter d has its corners at
// s*sqrt(2)/2 from center, so to keep them inside the circle s <= d/sqrt(2) ~= 0.707d.
// SCALE 0.70 is the largest inset that keeps the corners just inside the circle.

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Resvg } from "@resvg/resvg-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SCALE = 0.7; // fraction of the canvas the favicon occupies
const VIEW = 32; // favicon viewBox size
const CANVAS = 100; // padded canvas units
const BACKGROUND = "#ffffff"; // matches the favicon's own background

const favicon = readFileSync(path.join(__dirname, "..", "assets", "favicon.svg"), "utf8");
// Inner markup of the favicon (drop its outer <svg ...></svg> wrapper).
const inner = favicon.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

const inset = (CANVAS * (1 - SCALE)) / 2;
const factor = (CANVAS * SCALE) / VIEW;
const padded = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CANVAS} ${CANVAS}" shape-rendering="crispEdges">
  <rect width="${CANVAS}" height="${CANVAS}" fill="${BACKGROUND}"/>
  <g transform="translate(${inset} ${inset}) scale(${factor})">
${inner}
  </g>
</svg>`;

const resvg = new Resvg(padded, {
  fitTo: { mode: "width", value: 512 },
  background: BACKGROUND,
});
const png = resvg.render().asPng();

const out = path.join(__dirname, "icon.png");
writeFileSync(out, png);
console.log(`Wrote ${out} (${png.length} bytes, favicon inset to ${SCALE * 100}%).`);
