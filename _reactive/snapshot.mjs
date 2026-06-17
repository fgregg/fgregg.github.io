#!/usr/bin/env node
// Post-build step: pre-render static fallbacks for reactive posts.
//
// For each built reactive post in _site, load it in headless Chromium, let the
// reactive cells compute against live data, then snapshot every chart cell:
//   - an inline SVG fallback injected back into the mount div (and into
//     feed.xml), so feed readers / no-JS / API-down viewers see the chart
//     instead of a blank gap. When JS does run, the runtime's clear() wipes the
//     fallback and mounts the live chart.
//   - a PNG of the first chart, used as the og:image / twitter:image social card.
//
// Usage: node snapshot.mjs <site-dir>   (defaults to ../_site)
import {chromium} from "playwright";
import {readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync} from "node:fs";
import {fileURLToPath} from "node:url";
import {dirname, join, relative, extname} from "node:path";
import {createServer} from "node:http";

// Minimal static file server for _site. Charts must load over http:// — under
// file:// the ESM runtime imports and live fetch() calls are blocked by the
// file origin, so nothing mounts.
const MIME = {".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".svg": "image/svg+xml", ".xml": "application/xml",
  ".png": "image/png", ".ico": "image/x-icon"};
function serve(root) {
  const server = createServer((req, res) => {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p.endsWith("/")) p += "index.html";
    const file = join(root, p);
    try {
      const body = readFileSync(file);
      res.writeHead(200, {"content-type": MIME[extname(file)] ?? "application/octet-stream"});
      res.end(body);
    } catch {
      res.writeHead(404); res.end("not found");
    }
  });
  return new Promise((resolve) => server.listen(0, () => resolve({server, port: server.address().port})));
}

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, "..");
const site = process.argv[2] ? join(process.cwd(), process.argv[2]) : join(repo, "_site");
const SITE_URL = process.env.SITE_URL || "https://labordata.github.io";

// A built post is "reactive" if it imports the reactive runtime bundle.
function findReactivePosts(dir, found = []) {
  for (const name of readdirSync(dir, {withFileTypes: true})) {
    const p = join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === "assets" || name.name.startsWith(".")) continue;
      findReactivePosts(p, found);
    } else if (name.name.endsWith(".html")) {
      const html = readFileSync(p, "utf8");
      if (html.includes("/assets/js/reactive-runtime.js")) found.push(p);
    }
  }
  return found;
}

async function snapshotPost(page, file, baseUrl) {
  const url = baseUrl + "/" + relative(site, file).replace(/[\\]/g, "/");
  await page.goto(url, {waitUntil: "load", timeout: 60000});
  // Wait for the reactive cells to actually mount charts. Data cells fetch live
  // (BLS windows + NLRB SQL) and can take several seconds, so poll until the
  // number of rendered SVGs stops growing rather than guessing a fixed delay.
  try {
    await page.waitForFunction(() => document.querySelector(".reactive-cell svg"), {timeout: 30000});
  } catch {
    return null; // nothing rendered within budget
  }
  // Charts mount at different times — the NLRB-dependent chart resolves only
  // after its slow SQL fetch, so the SVG count can sit at a false plateau for
  // seconds before the last chart appears. Poll for a generous minimum, then
  // require the count to hold steady across several consecutive checks.
  let prev = -1, stable = 0;
  for (let i = 0; i < 80; i++) {
    const n = await page.evaluate(() => document.querySelectorAll(".reactive-cell svg").length);
    stable = n === prev ? stable + 1 : 0;
    // The NLRB charts depend on the DatasetteClient (extra module load + a slow
    // CSV query), so they can sit at a false plateau for ~8s before appearing.
    // Require ~14s elapsed AND 8 stable checks (~4s) before declaring it settled.
    if (i >= 28 && stable >= 8) break;
    prev = n;
    await page.waitForTimeout(500);
  }

  // collect, per mount div, the rendered SVG markup (if any)
  const cells = await page.evaluate(() => {
    const out = [];
    for (const div of document.querySelectorAll(".reactive-cell")) {
      const svg = div.querySelector("svg");
      out.push({id: div.id, svg: svg ? svg.outerHTML : null});
    }
    return out;
  });

  const withCharts = cells.filter((c) => c.svg);
  if (!withCharts.length) return null;

  // write SVG fallbacks into _site (the deploy artifact), under assets/snapshots/
  const slug = relative(site, file).replace(/\.html$/, "").replace(/[\/\\]/g, "-");
  const outDir = join(site, "assets", "snapshots", slug);
  mkdirSync(outDir, {recursive: true});

  let html = readFileSync(file, "utf8");
  for (const {id, svg} of withCharts) {
    const svgPath = join(outDir, `${id}.svg`);
    writeFileSync(svgPath, svg);
    // inject the SVG as the mount div's initial content (the fallback)
    const empty = `<div id="${id}" class="reactive-cell"></div>`;
    const filled = `<div id="${id}" class="reactive-cell">${svg}</div>`;
    html = html.replace(empty, filled);
  }

  // social card: PNG of the first chart cell. Screenshot the mount div (not the
  // bare SVG — SVG elements often lack the layout box needed for a raster grab),
  // and write into _site so it deploys.
  const firstId = withCharts[0].id;
  const cardRel = `assets/snapshots/${slug}/card.png`;
  const cardAbs = join(site, cardRel);
  const el = await page.$(`#${firstId}`);
  if (el) await el.screenshot({path: cardAbs});
  const cardUrl = `${SITE_URL}/${cardRel}`;
  // add og:image / twitter:image to <head> if not already present
  if (!html.includes('property="og:image"')) {
    const tags =
      `\n  <meta property="og:image" content="${cardUrl}">` +
      `\n  <meta name="twitter:image" content="${cardUrl}">`;
    html = html.replace("</head>", `${tags}\n</head>`);
  }

  writeFileSync(file, html);
  return {file, charts: withCharts.map((c) => c.id), card: cardRel};
}

// Inject the same SVG fallbacks into feed.xml content (CDATA-escaped HTML).
function patchFeed(results) {
  const feed = join(site, "feed.xml");
  if (!existsSync(feed)) return;
  let xml = readFileSync(feed, "utf8");
  for (const r of results) {
    const slug = relative(site, r.file).replace(/\.html$/, "").replace(/[\/\\]/g, "-");
    for (const id of r.charts) {
      const svg = readFileSync(join(site, "assets", "snapshots", slug, `${id}.svg`), "utf8");
      // feed content escapes HTML; jekyll-feed CDATA-wraps, so raw replace works
      const empty = `<div id="${id}" class="reactive-cell"></div>`;
      xml = xml.split(empty).join(`<div id="${id}" class="reactive-cell">${svg}</div>`);
    }
  }
  writeFileSync(feed, xml);
}

const posts = findReactivePosts(site);
if (!posts.length) {
  console.log("snapshot: no reactive posts found in", site);
  process.exit(0);
}

const {server, port} = await serve(site);
const baseUrl = `http://localhost:${port}`;
const browser = await chromium.launch();
const page = await browser.newPage({viewport: {width: 900, height: 1400}, deviceScaleFactor: 2});
const results = [];
for (const file of posts) {
  const r = await snapshotPost(page, file, baseUrl);
  if (r) {
    results.push(r);
    console.log(`snapshot: ${relative(site, r.file)} — ${r.charts.length} charts, card ${r.card}`);
  } else {
    console.log(`snapshot: ${relative(site, file)} — no charts rendered (skipped)`);
  }
}
await browser.close();
server.close();
patchFeed(results);
console.log(`snapshot: patched ${results.length} post(s) + feed.xml`);
