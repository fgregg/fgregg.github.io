---
title: Weakening API Keys With a Proxy
author: Forest Gregg
layout: post
date: 2026-09-10
description: Giving overpowered keys a finer grain
reactive: false
---

Political and organizing software doesn't typically let you create API keys with
fine-grained permissions, and so the key that you have to use for integrating
services often can do things with your data well beyond the narrow syncing you
need.

If you can't reduce the power of the key directly, you can sometimes effectively
reduce the power by using a proxy. The proxy service holds the real,
over-powered key, not the client, and the service allows requests to API routes
that you choose.

Below is a minimal example for a VAN API proxy using a free
[Cloudflare Worker](https://developers.cloudflare.com/workers/) (VAN actually
does offer a fair amount of control over an API key's permissions but API keys
are still often overpowered for organizational reasons).

```js
// Transparenty proxy the VAN API with less power. Clients will interact with the
// proxy exactly as if it was the real API except for the API key they pass will be
// chosen by you

const UPSTREAM = "https://api.securevan.com";

// Allowed routes, note the { drop: true } config so we can silence echoing
// when we don't need it
const ALLOW = [
  ["POST", "/v4/people/findOrCreate"],
  ["POST", "/v4/people/:id(\\d+)", { drop: true }],
  ["POST", "/v4/people/:id(\\d+)/canvassResponses"],
].map(([method, path, opts]) => ({
  method,
  pattern: new URLPattern({ pathname: path }),
  ...opts,
}));

// VAN's error envelope
const refuse = (status, code, text) =>
  Response.json({ errors: [{ code, text }] }, { status });

// extract credentials from header with VAN's shape of
// Basic: "<app name>:<api key>|<db mode>".
function credentials(request) {
  const header = request.headers.get("Authorization") ?? "";
  if (!header.startsWith("Basic ")) return null;
  let decoded;
  // strip out 'Basic '
  try {
    decoded = atob(header.slice(6));
  } catch {
    return null;
  }
  const [user, ...password] = decoded.split(":");
  const [key, ...mode] = password.join(":").split("|");
  return { user, key, suffix: mode.length ? "|" + mode.join("|") : "" };
}

// Constant-time comparison.
async function keyMatches(presented, expected) {
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest("SHA-256", enc.encode(presented)),
    crypto.subtle.digest("SHA-256", enc.encode(expected)),
  ]);
  return crypto.subtle.timingSafeEqual(a, b);
}

export default {
  async fetch(request, env) {
    const creds = credentials(request);
    if (!creds || !(await keyMatches(creds.key, env.PROXY_API_KEY))) {
      return refuse(401, "UNAUTHORIZED", "Invalid API key.");
    }

    const url = new URL(request.url);
    const route = ALLOW.find(
      (r) =>
        r.method === request.method &&
        r.pattern.test({ pathname: url.pathname }),
    );
    if (!route) {
      return refuse(
        403,
        "FORBIDDEN",
        `${request.method} ${url.pathname} is not permitted through this proxy.`,
      );
    }

    // Forward to the VAN API but with the real API key
    const headers = new Headers();
    for (const name of ["Accept", "Content-Type", "User-Agent"]) {
      if (request.headers.has(name))
        headers.set(name, request.headers.get(name));
    }
    headers.set(
      "Authorization",
      "Basic " + btoa(`${creds.user}:${env.VAN_API_KEY}${creds.suffix}`),
    );

    const upstream = await fetch(new URL(url.pathname + url.search, UPSTREAM), {
      method: request.method,
      headers,
      body: request.body,
    });

    // Status passes through so the client sees VAN's success or failure.
    const response = new Headers();
    if (!route.drop && upstream.headers.has("Content-Type")) {
      response.set("Content-Type", upstream.headers.get("Content-Type"));
    }
    return new Response(route.drop ? null : upstream.body, {
      status: upstream.status,
      headers: response,
    });
  },
};
```
