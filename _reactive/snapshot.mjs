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
import {readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, copyFileSync} from "node:fs";
import {createHash} from "node:crypto";
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

// Incremental cache: rendering every post in Chromium is the slow part of a
// build, so we keep the rendered SVG/PNG snapshots (+ a manifest of content
// hashes) in .snapshot-cache, persisted across CI runs. A post is re-rendered
// only when its built HTML changes; otherwise the cached artifacts are reused.
// (Live-data charts get a slightly stale *fallback*, which is fine — the live
// page re-renders with fresh data when JS runs.) Bump VERSION to force a rebuild.
const SNAPSHOT_VERSION = "1";
const cacheDir = join(repo, ".snapshot-cache");
const manifestPath = join(cacheDir, "manifest.json");
const manifest = existsSync(manifestPath)
  ? JSON.parse(readFileSync(manifestPath, "utf8"))
  : {};
const hashHtml = (html) =>
  createHash("sha256").update(SNAPSHOT_VERSION + "\n" + html).digest("hex");
const snapDir = (slug) => join(site, "assets", "snapshots", slug);

function copyDir(from, to) {
  mkdirSync(to, {recursive: true});
  for (const name of readdirSync(from)) copyFileSync(join(from, name), join(to, name));
}

// Reuse a cached snapshot: copy artifacts back into _site and re-inject the SVG
// fallbacks + social card into the freshly-built HTML, without launching Chromium.
function applyCached(file, slug, builtHtml, cached) {
  copyDir(join(cacheDir, slug), snapDir(slug));
  let html = builtHtml;
  for (const id of cached.charts) {
    const svg = readFileSync(join(cacheDir, slug, `${id}.svg`), "utf8");
    const empty = `<div id="${id}" class="reactive-cell"></div>`;
    html = html.replace(empty, `<div id="${id}" class="reactive-cell">${svg}</div>`);
  }
  if (cached.card && !html.includes('property="og:image"')) {
    const cardUrl = `${SITE_URL}/${cached.card}`;
    html = html.replace(
      "</head>",
      `\n  <meta property="og:image" content="${cardUrl}">` +
        `\n  <meta name="twitter:image" content="${cardUrl}">\n</head>`,
    );
  }
  writeFileSync(file, html);
  return {file, charts: cached.charts, chartPngs: cached.chartPngs, card: cached.card};
}

// Persist a freshly-rendered post's artifacts into the cache for next time.
function persistToCache(slug, r, hash) {
  copyDir(snapDir(slug), join(cacheDir, slug));
  manifest[slug] = {hash, charts: r.charts, chartPngs: r.chartPngs, card: r.card};
}

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
  const chartPngs = {}; // id -> relative PNG path (for the feed)
  for (const {id, svg} of withCharts) {
    writeFileSync(join(outDir, `${id}.svg`), svg);
    // page fallback: inline the SVG as the mount div's initial content (crisp,
    // scalable, works with no JS).
    const empty = `<div id="${id}" class="reactive-cell"></div>`;
    html = html.replace(empty, `<div id="${id}" class="reactive-cell">${svg}</div>`);
    // feed fallback: a rasterized PNG. Feeds reference it by URL (so the feed
    // stays tiny) and feed readers render <img> reliably, unlike inline SVG
    // which many of them strip. Screenshot the mount div, not the bare SVG.
    const el = await page.$(`#${id}`);
    if (el) {
      const pngRel = `assets/snapshots/${slug}/${id}.png`;
      await el.screenshot({path: join(site, pngRel)});
      chartPngs[id] = pngRel;
    }
  }

  // social card = the first chart's PNG (reuse the per-chart raster above).
  const firstId = withCharts[0].id;
  const cardRel = chartPngs[firstId] ?? `assets/snapshots/${slug}/card.png`;
  if (!chartPngs[firstId]) {
    const el = await page.$(`#${firstId}`);
    if (el) await el.screenshot({path: join(site, cardRel)});
  }
  const cardUrl = `${SITE_URL}/${cardRel}`;
  // add og:image / twitter:image to <head> if not already present
  if (!html.includes('property="og:image"')) {
    const tags =
      `\n  <meta property="og:image" content="${cardUrl}">` +
      `\n  <meta name="twitter:image" content="${cardUrl}">`;
    html = html.replace("</head>", `${tags}\n</head>`);
  }

  writeFileSync(file, html);
  return {file, charts: withCharts.map((c) => c.id), chartPngs, card: cardRel};
}

// Inject chart fallbacks into feed.xml as hosted-PNG <img> references (not inline
// SVG): the feed aggregates every post into one file — inlining the SVGs pushed
// it past Cloudflare Pages' 25 MiB limit (a dot-density map alone is several
// MiB) — and many feed readers strip inline <svg> anyway. A URL-referenced PNG
// keeps the feed tiny and renders reliably in readers.
function patchFeed(results) {
  const feed = join(site, "feed.xml");
  if (!existsSync(feed)) return;
  let xml = readFileSync(feed, "utf8");
  for (const r of results) {
    for (const id of r.charts) {
      const pngRel = r.chartPngs?.[id];
      if (!pngRel) continue;
      // feed content is CDATA-wrapped HTML, so a raw string replace works
      const empty = `<div id="${id}" class="reactive-cell"></div>`;
      const img = `<div id="${id}" class="reactive-cell"><img src="${SITE_URL}/${pngRel}" alt="chart" style="max-width:100%"></div>`;
      xml = xml.split(empty).join(img);
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
let rendered = 0, reused = 0;
for (const file of posts) {
  const slug = relative(site, file).replace(/\.html$/, "").replace(/[\/\\]/g, "-");
  const builtHtml = readFileSync(file, "utf8");
  const hash = hashHtml(builtHtml);
  const cached = manifest[slug];
  const cacheHit =
    cached &&
    cached.hash === hash &&
    cached.charts.every((id) => existsSync(join(cacheDir, slug, `${id}.svg`)));

  if (cacheHit) {
    results.push(applyCached(file, slug, builtHtml, cached));
    reused++;
    console.log(`snapshot: ${relative(site, file)} — reused cache (${cached.charts.length} charts)`);
    continue;
  }

  const r = await snapshotPost(page, file, baseUrl);
  if (r) {
    persistToCache(slug, r, hash);
    results.push(r);
    rendered++;
    console.log(`snapshot: ${relative(site, r.file)} — rendered ${r.charts.length} charts, card ${r.card}`);
  } else {
    // Don't cache "no charts" — it may be a transient render timeout; retry next build.
    console.log(`snapshot: ${relative(site, file)} — no charts rendered (skipped)`);
  }
}
await browser.close();
server.close();
mkdirSync(cacheDir, {recursive: true});
writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
patchFeed(results);
console.log(`snapshot: ${rendered} rendered, ${reused} reused; patched ${results.length} post(s) + feed.xml`);
