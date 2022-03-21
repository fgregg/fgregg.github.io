---
title: January 28, 2022 - Weeknotes
layout: post
description: Weeknotes for January 28, 2022
---

### Labor Data
I want to do a little analysis that decomposes the decline of overall
labor density into sectoral changes in overall employment and within
sector changes in union density.

The Bureau of Labor Statistics has the [data on union density broken
down by sector, over
time](https://www.bls.gov/webapps/legacy/cpslutab3.htm). They even
have a pretty nice [web API](https://www.bls.gov/bls/api_features.htm)
to get that data in convenient format.

Unfortunately, the web api does not have
[CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) set up,
so I can't pull that data into Observable. This is, unfortunately, a
common problem of many government web APIs.

If an API does not have CORS set up, then that effectively blocks any
other website from using that data, without complicated workarounds. It 
negate the main purpose of setting up a web API in the first place.

In a overwrought digression, I'm setting up a [proxy to the BLS
API](https://bls-api.bunkum.us) that sets right the CORS headers so that
data from the BLS can be pulled into other sites.

Prompted by a [suggestion by David Eads](https://twitter.com/eads/status/1486027015861985282), the proxy is a [Cloudflare worker](https://workers.cloudflare.com/). It was pretty easy to get set up, because Cloudflare already had a recipe
for making a [CORS proxy](https://developers.cloudflare.com/workers/examples/cors-header-proxy). 

I'm adapting this recipe to specialize it for the BLS site and to
cache queries so that I can share it with others without feeling
worried that the project will put too big a load on the BLS's API.

I have the guts of it working, and [got the code on
Github](https://github.com/fgregg/bls-proxy). I need to write a
landing page, refactor the code a little bit, add some docs, and then
I'll be good to push it out.


