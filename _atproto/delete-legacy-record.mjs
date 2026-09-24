// Deletes one post's legacy (filename-stem-keyed) site.standard.document record,
// so Bluesky's card service falls back to the page's og: tags. Legacy records
// can't be updated in place anymore — see documentRkey() in records.js.
//
// usage (from _atproto/): node --env-file=.env delete-legacy-record.mjs 2024-10-18-chicago-births-2009-2020

import { Agent, CredentialSession } from "@atproto/api";

const rkey = process.argv[2];
if (!rkey) {
  console.error("usage: node --env-file=.env delete-legacy-record.mjs <post-filename-stem>");
  process.exit(1);
}

const session = new CredentialSession(new URL("https://bsky.social"));
await session.login({ identifier: "bunkum.us", password: process.env.ATPROTO_PASSWORD });
const agent = new Agent(session);
const ref = { repo: agent.did, collection: "site.standard.document", rkey };

const { data } = await agent.com.atproto.repo.getRecord(ref);
console.log(`deleting ${rkey}: "${data.value.title}"`);
await agent.com.atproto.repo.deleteRecord(ref);
console.log("deleted.");
