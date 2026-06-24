// Syncs the Slow News blog to the ATmosphere as Standard.Site records.
//
// Publishes directly via @atproto/api (not ATapult): ATapult hardcodes the record
// key to a TID derived from each post's publishedAt, which collides for posts that
// share a date. We instead key each document by its unique filename stem
// (e.g. "2022-11-24-lm30") — collision-proof, readable, and trivially reproduced in
// the Jekyll plugin for the page <link> tags. Record SHAPES match ATapult's
// site.standard.publication / site.standard.document lexicons.
//
// Idempotent: each record is created, updated (only when changed), or skipped.
// Needs ATPROTO_PASSWORD in the env (local: _atproto/.env; CI: GitHub secret).

import { existsSync, readFileSync } from "node:fs";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import frontmatter from "front-matter";
import { Agent, CredentialSession } from "@atproto/api";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const POSTS_DIR = path.join(__dirname, "..", "_posts");

const HANDLE = "bunkum.us";
const PDS_URL = "https://bsky.social";
const SITE_URL = "https://slownews.bunkum.us/";
const PUBLICATION_RKEY = "slow-news"; // stable, readable publication key

const PUB_COLLECTION = "site.standard.publication";
const DOC_COLLECTION = "site.standard.document";

// Jekyll's default permalink for `YYYY-MM-DD-slug.md` is /YYYY/MM/DD/slug.html,
// but Cloudflare Pages serves extensionless canonical URLs (/.html 308-redirects
// to /YYYY/MM/DD/slug), so the record path drops the .html. Month/day may be 1 or
// 2 digits in a filename (e.g. 2022-02-4-weeknotes.md); Jekyll zero-pads them in
// the URL, so we do too.
const POST_FILE_RE = /^(\d{4})-(\d{1,2})-(\d{1,2})-(.+)\.md$/;

// ---- gather posts -> document records -----------------------------------------

const parsePosts = async () => {
  const files = await readdir(POSTS_DIR);
  const docs = [];
  for (const file of files) {
    const m = POST_FILE_RE.exec(file);
    if (!m) continue;
    const [, year, month, day, slug] = m;
    const { attributes } = frontmatter(readFileSync(path.join(POSTS_DIR, file), "utf8"));
    if (attributes.draft === true || attributes.external !== undefined) continue;

    const mm = month.padStart(2, "0");
    const dd = day.padStart(2, "0");
    docs.push({
      rkey: file.replace(/\.md$/, ""), // filename stem == the page's rkey
      title: attributes.title,
      description: attributes.description,
      publishedAt: new Date(Date.UTC(+year, +month - 1, +day)).toISOString(),
      path: `/${year}/${mm}/${dd}/${slug}`,
    });
  }
  return docs;
};

// ---- record shapes (mirror ATapult's lexicons) --------------------------------

const THEME = {
  $type: "site.standard.theme.basic",
  background: { $type: "site.standard.theme.color#rgb", r: 255, g: 254, b: 252 }, // #fffefc
  foreground: { $type: "site.standard.theme.color#rgb", r: 51, g: 51, b: 51 }, // #333333
  accent: { $type: "site.standard.theme.color#rgb", r: 85, g: 34, b: 34 }, // #552222
  accentForeground: { $type: "site.standard.theme.color#rgb", r: 255, g: 255, b: 255 },
};

const docRecord = (publicationUri, doc, coverImage) => ({
  $type: DOC_COLLECTION,
  site: publicationUri,
  title: doc.title,
  publishedAt: doc.publishedAt,
  path: doc.path,
  description: doc.description,
  ...(coverImage ? { coverImage } : {}),
});

// snapshot.mjs renders a social-card PNG of each reactive post's first chart
// into the built site at _site/assets/snapshots/<rkey>/card.png (the snapshot
// slug — the dashed URL path — equals the document rkey). Use it as the
// Standard.Site coverImage. Runs after snapshot.mjs in CI, so the file is
// present; locally (no prior build) it's simply absent and we skip it.
const SITE_DIR = path.join(__dirname, "..", "_site");
const CARD_MAX_BYTES = 1_000_000; // lexicon caps coverImage at < 1MB

const resolveCover = async (agent, doc, existing) => {
  const cardPath = path.join(SITE_DIR, "assets", "snapshots", doc.rkey, "card.png");
  if (!existsSync(cardPath)) return existing?.coverImage; // keep any prior image
  const bytes = readFileSync(cardPath);
  if (bytes.length > CARD_MAX_BYTES) {
    console.warn(
      `document ${doc.rkey}: card is ${(bytes.length / 1e6).toFixed(2)}MB (> 1MB), skipping coverImage.`,
    );
    return existing?.coverImage;
  }
  // Reuse the already-uploaded blob unless the card's byte size changed, so an
  // unchanged chart doesn't churn a new blob + record update every deploy.
  if (existing?.coverImage?.size === bytes.length) return existing.coverImage;
  const res = await agent.com.atproto.repo.uploadBlob(new Uint8Array(bytes), {
    encoding: "image/png",
  });
  const { mimeType, ref, size } = res.data.blob;
  return { $type: "blob", ref: { $link: ref.toString() }, mimeType, size };
};

const uploadIcon = async (agent) => {
  const bytes = new Uint8Array(readFileSync(path.join(__dirname, "icon.png")));
  const res = await agent.com.atproto.repo.uploadBlob(bytes, { encoding: "image/png" });
  const { mimeType, ref, size } = res.data.blob;
  return { icon: { $type: "blob", ref: { $link: ref.toString() }, mimeType, size }, size };
};

// ---- sync helpers --------------------------------------------------------------

const getRecord = async (agent, collection, rkey) => {
  try {
    const res = await agent.com.atproto.repo.getRecord({ repo: agent.did, collection, rkey });
    return res.data.value;
  } catch (e) {
    if (e.error === "RecordNotFound") return undefined;
    throw e;
  }
};

const syncPublication = async (agent, publicationUri) => {
  const existing = await getRecord(agent, PUB_COLLECTION, PUBLICATION_RKEY);

  // Reuse the already-uploaded icon blob unless its size changed.
  const newIconBytes = readFileSync(path.join(__dirname, "icon.png"));
  const iconChanged = existing?.icon?.size !== newIconBytes.length;

  const base = {
    $type: PUB_COLLECTION,
    url: SITE_URL,
    name: "Slow News",
    description: "Slow News — essays and notes by Forest Gregg.",
    basicTheme: THEME,
    preferences: { showInDiscover: true },
  };

  // The PDS reorders object keys canonically, so compare fields, not stringified
  // objects. Theme colors are compared component-wise.
  const themeSame = ["background", "foreground", "accent", "accentForeground"].every((k) => {
    const e = existing?.basicTheme?.[k];
    return e && e.r === THEME[k].r && e.g === THEME[k].g && e.b === THEME[k].b;
  });
  const unchanged =
    existing &&
    existing.url === base.url &&
    existing.name === base.name &&
    existing.description === base.description &&
    !iconChanged &&
    themeSame;

  if (unchanged) {
    console.log(`publication ${PUBLICATION_RKEY} ${SITE_URL} unchanged.`);
    return;
  }

  const icon = iconChanged ? (await uploadIcon(agent)).icon : existing.icon;
  const record = { ...base, icon };
  await agent.com.atproto.repo.putRecord({
    repo: agent.did,
    collection: PUB_COLLECTION,
    rkey: PUBLICATION_RKEY,
    record,
  });
  console.log(`publication ${PUBLICATION_RKEY} ${SITE_URL} ${existing ? "updated" : "created"}.`);
};

const syncDocuments = async (agent, publicationUri, docs) => {
  for (const doc of docs) {
    // A Standard.Site document needs both a title and a description. Many older
    // Slow News posts predate the `description:` front matter, so skip (don't
    // throw) on the ones that lack it — syndicate the rest, and the post gets
    // picked up automatically once a description is added.
    if (!doc.title || !doc.description) {
      console.warn(`document ${doc.rkey}: missing title/description — skipped.`);
      continue;
    }
    const existing = await getRecord(agent, DOC_COLLECTION, doc.rkey);
    const coverImage = await resolveCover(agent, doc, existing);
    const record = docRecord(publicationUri, doc, coverImage);

    if (!existing) {
      await agent.com.atproto.repo.createRecord({
        repo: agent.did,
        collection: DOC_COLLECTION,
        rkey: doc.rkey,
        record,
      });
      console.log(`document ${doc.rkey} ${doc.path} created${coverImage ? " (with card)" : ""}.`);
    } else if (
      existing.title !== record.title ||
      existing.description !== record.description ||
      existing.path !== record.path ||
      existing.site !== record.site ||
      existing.publishedAt !== record.publishedAt ||
      existing.coverImage?.size !== record.coverImage?.size
    ) {
      await agent.com.atproto.repo.putRecord({
        repo: agent.did,
        collection: DOC_COLLECTION,
        rkey: doc.rkey,
        record,
      });
      console.log(`document ${doc.rkey} ${doc.path} updated.`);
    } else {
      console.log(`document ${doc.rkey} ${doc.path} unchanged.`);
    }
  }
};

// ---- main ----------------------------------------------------------------------

const password = process.env.ATPROTO_PASSWORD;
if (!password) {
  console.error("ATPROTO_PASSWORD is not set.");
  process.exit(1);
}

try {
  const session = new CredentialSession(new URL(PDS_URL));
  await session.login({ identifier: HANDLE, password });
  const agent = new Agent(session);
  const publicationUri = `at://${agent.did}/${PUB_COLLECTION}/${PUBLICATION_RKEY}`;
  console.log(`Connected as ${agent.did}\nPublication URI: ${publicationUri}\n`);

  await syncPublication(agent, publicationUri);
  console.log();
  await syncDocuments(agent, publicationUri, await parsePosts());
  console.log("\nDone.");
} catch (error) {
  console.error("ATProto sync failed:", error.status ?? "", error.message ?? error);
  // Syndication is a side-channel; never break the CI deploy over it.
  process.exit(process.env.CI ? 0 : 1);
}
