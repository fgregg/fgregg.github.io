#!/usr/bin/env node
// Post-build step: pre-render static fallbacks for reactive posts.
//
// For each built reactive post in _site, load it in headless Chromium, let the
// reactive cells compute against live data, then snapshot:
//   - every chart cell: an inline SVG fallback injected back into the mount div
//     (and a PNG into feed.xml + og:image), so feed readers / no-JS / API-down
//     viewers see the chart instead of a blank gap.
//   - every hydrating prose value: the resolved content of each <span
//     data-reactive> baked into the static HTML, so crawlers / no-JS readers see
//     the actual numbers (not blank gaps), and the live page has no value-fill
//     layout shift (the span already holds the right content).
// When JS runs, the runtime overwrites these fallbacks with the live values.
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
// build, so we keep the rendered artifacts (+ a manifest of content hashes) in
// .snapshot-cache, persisted across CI runs. A post is re-rendered only when its
// built HTML changes; otherwise the cached artifacts are reused. Bump VERSION to
// force a rebuild.
const SNAPSHOT_VERSION = "3";
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

// String replacement that does NOT interpret `$` patterns in the replacement
// (chart tick labels / values can contain "$5B" etc.). First occurrence only —
// each id/ref is unique.
function inject(html, find, replacement) {
  return html.replace(find, () => replacement);
}

const emptyChart = (id) => `<div id="${id}" class="reactive-cell"></div>`;
const emptySpan = (ref) => `<span data-reactive="${ref}"></span>`;

// Bake cached/rendered chart SVGs + span values into a post's HTML.
function bake(html, {charts, spans}, readChart) {
  for (const id of charts) html = inject(html, emptyChart(id), `<div id="${id}" class="reactive-cell">${readChart(id)}</div>`);
  for (const {ref, html: val} of spans) html = inject(html, emptySpan(ref), `<span data-reactive="${ref}">${val}</span>`);
  return html;
}

// Reuse a cached snapshot: copy artifacts back into _site and re-inject the
// fallbacks + social card into the freshly-built HTML, without launching Chromium.
function applyCached(file, slug, builtHtml, cached) {
  copyDir(join(cacheDir, slug), snapDir(slug));
  const spansFile = join(cacheDir, slug, "spans.json");
  const spans = existsSync(spansFile) ? JSON.parse(readFileSync(spansFile, "utf8")) : [];
  let html = bake(builtHtml, {charts: cached.charts, spans},
    (id) => readFileSync(join(cacheDir, slug, `${id}.html`), "utf8"));
  if (cached.card && !html.includes('property="og:image"')) {
    const cardUrl = `${SITE_URL}/${cached.card}`;
    html = inject(html, "</head>",
      `\n  <meta property="og:image" content="${cardUrl}">` +
      `\n  <meta name="twitter:image" content="${cardUrl}">\n</head>`);
  }
  writeFileSync(file, html);
  return {file, charts: cached.charts, chartPngs: cached.chartPngs, card: cached.card, spans};
}

// Persist a freshly-rendered post's artifacts into the cache for next time.
function persistToCache(slug, r, hash) {
  copyDir(snapDir(slug), join(cacheDir, slug));
  manifest[slug] = {hash, charts: r.charts, chartPngs: r.chartPngs, card: r.card, spanCount: r.spans.length};
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

  // Wait for something to render: a chart SVG, or — for hydrating prose — every
  // value span to fill. Live data cells (BLS/NLRB) can take several seconds.
  try {
    await page.waitForFunction(() => {
      const spans = [...document.querySelectorAll("[data-reactive]")];
      const spansReady = spans.length > 0 && spans.every((s) => s.textContent.trim() !== "");
      return document.querySelector(".reactive-cell svg") || spansReady;
    }, {timeout: 30000});
  } catch {
    return null; // nothing rendered within budget
  }
  // Charts mount at different times (a slow NLRB SQL chart can lag ~8s); span
  // values fill as data resolves. Poll until BOTH the SVG count and the filled-
  // span count hold steady before capturing.
  let prev = "", stable = 0;
  for (let i = 0; i < 80; i++) {
    const sig = await page.evaluate(() => {
      const svgs = document.querySelectorAll(".reactive-cell svg").length;
      const filled = [...document.querySelectorAll("[data-reactive]")].filter((s) => s.textContent.trim() !== "").length;
      return svgs + ":" + filled;
    });
    stable = sig === prev ? stable + 1 : 0;
    if (i >= 28 && stable >= 8) break;
    prev = sig;
    await page.waitForTimeout(500);
  }

  // Collect chart SVGs and filled prose value spans.
  const {cells, spans} = await page.evaluate(() => {
    const cells = [];
    for (const div of document.querySelectorAll(".reactive-cell")) {
      // Bake the whole rendered cell — the Plot <figure> (title + legend + chart
      // + its scoped <style>) — not just the first <svg>, which for a legended
      // chart is a tiny 15x15 legend swatch.
      const chart = div.querySelector("svg") ? div.innerHTML : null;
      cells.push({id: div.id, chart});
    }
    const spans = [];
    for (const el of document.querySelectorAll("[data-reactive]")) {
      const html = el.innerHTML;
      if (html.trim() !== "") spans.push({ref: el.getAttribute("data-reactive"), html});
    }
    return {cells, spans};
  });

  const withCharts = cells.filter((c) => c.chart);
  if (!withCharts.length && !spans.length) return null; // nothing to bake

  const slug = relative(site, file).replace(/\.html$/, "").replace(/[\/\\]/g, "-");
  const outDir = snapDir(slug);
  mkdirSync(outDir, {recursive: true});

  let html = readFileSync(file, "utf8");

  // Chart SVG fallbacks + per-chart PNGs (for the feed / social card).
  const chartPngs = {};
  for (const {id, chart} of withCharts) {
    writeFileSync(join(outDir, `${id}.html`), chart);
    html = inject(html, emptyChart(id), `<div id="${id}" class="reactive-cell">${chart}</div>`);
    const el = await page.$(`#${id}`);
    if (el) {
      const pngRel = `assets/snapshots/${slug}/${id}.png`;
      await el.screenshot({path: join(site, pngRel)});
      chartPngs[id] = pngRel;
    }
  }

  // Prose value spans: bake the resolved content + persist for the cache.
  for (const {ref, html: val} of spans) html = inject(html, emptySpan(ref), `<span data-reactive="${ref}">${val}</span>`);
  writeFileSync(join(outDir, "spans.json"), JSON.stringify(spans));

  // Social card = the first chart's PNG (chart posts only).
  let cardRel = null;
  if (withCharts.length) {
    const firstId = withCharts[0].id;
    cardRel = chartPngs[firstId] ?? `assets/snapshots/${slug}/card.png`;
    if (!chartPngs[firstId]) {
      const el = await page.$(`#${firstId}`);
      if (el) await el.screenshot({path: join(site, cardRel)});
    }
    if (!html.includes('property="og:image"')) {
      const cardUrl = `${SITE_URL}/${cardRel}`;
      html = inject(html, "</head>",
        `\n  <meta property="og:image" content="${cardUrl}">` +
        `\n  <meta name="twitter:image" content="${cardUrl}">`);
    }
  }

  writeFileSync(file, html);
  return {file, charts: withCharts.map((c) => c.id), chartPngs, card: cardRel, spans};
}

// Inject fallbacks into feed.xml: chart PNGs as hosted-<img> (inline SVG is too
// big — past Cloudflare Pages' 25 MiB limit — and feed readers strip it), and
// baked span values inline (so feed readers see the numbers in the prose).
function patchFeed(results) {
  const feed = join(site, "feed.xml");
  if (!existsSync(feed)) return;
  let xml = readFileSync(feed, "utf8");
  for (const r of results) {
    for (const id of r.charts) {
      const pngRel = r.chartPngs?.[id];
      if (!pngRel) continue;
      const img = `<div id="${id}" class="reactive-cell"><img src="${SITE_URL}/${pngRel}" alt="chart" style="max-width:100%"></div>`;
      xml = xml.split(emptyChart(id)).join(img);
    }
    for (const {ref, html: val} of r.spans ?? []) {
      xml = xml.split(emptySpan(ref)).join(`<span data-reactive="${ref}">${val}</span>`);
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
    cached.charts.every((id) => existsSync(join(cacheDir, slug, `${id}.html`))) &&
    (!cached.spanCount || existsSync(join(cacheDir, slug, "spans.json")));

  if (cacheHit) {
    results.push(applyCached(file, slug, builtHtml, cached));
    reused++;
    console.log(`snapshot: ${relative(site, file)} — reused cache (${cached.charts.length} charts, ${cached.spanCount ?? 0} values)`);
    continue;
  }

  const r = await snapshotPost(page, file, baseUrl);
  if (r) {
    persistToCache(slug, r, hash);
    results.push(r);
    rendered++;
    console.log(`snapshot: ${relative(site, r.file)} — rendered ${r.charts.length} charts, ${r.spans.length} values`);
  } else {
    // Don't cache "nothing rendered" — it may be a transient timeout; retry next build.
    console.log(`snapshot: ${relative(site, file)} — nothing rendered (skipped)`);
  }
}
await browser.close();
server.close();
mkdirSync(cacheDir, {recursive: true});
writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));
patchFeed(results);
console.log(`snapshot: ${rendered} rendered, ${reused} reused; patched ${results.length} post(s) + feed.xml`);
