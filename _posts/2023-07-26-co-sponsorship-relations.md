---
title: Co-sponsorship relations
author: Forest Gregg
layout: post
date: 2023-07-26
description: A co-sponsorship matrix of the 2019–2023 Chicago City Council, with aldermen ordered by an SVD factor analysis of bill sponsorship.
reactive: cellular
---

This notebook shows the co-sponsor relation among the Chicago 2019-2023 legislative session alderman.

Each row is represents the primary sponsor of the bill, and the columns are the co-sponsors. 

You can sort the alders from factors extracted from a factor analysis of bill sponsoring. Factor 0 appears to be measuring overall propensity to co-sponsor. Factor 1 looks to be ideology.

```js
const factor = view(Inputs.range([0, 10], { label: "Factor", step: 1, value: 1 }));
```

```js
display(
Plot.plot({
  padding: 0,
  width: 900,
  x: { tickRotate: -90, axis: "top", domain: sorted_domain },
  y: { domain: sorted_domain },
  marginLeft: 200,
  marginTop: 200,
  marks: [
    Plot.cell(co_sponsorships, {
      x: "cosponsor",
      y: "primary",
      fill: "count",
      tip: true
    })
  ]
})
);
```

```js
const co_sponsorships_sparse = await chicago_council(`
  with co_sponsored_bills as (
    select A.name as lead, B.name as cosponsor, bill_id
    from billsponsorship as A
      inner join bill on bill.id = bill_id
      inner join legislativesession on legislative_session_id = legislativesession.id
      join billsponsorship as B using (bill_id)
    where A."primary" and not B."primary"
      and A.name not like '%vacancy%' and A.name not like '%rahm%'
      and A.name not like '%lightfoot%' and A.name not like '%valencia%'
      and legislativesession.identifier = '2019'
  )
  select lead as "primary", cosponsor, count(*) as cnt
  from co_sponsored_bills
  group by lead, cosponsor
  order by cnt desc;
`);
```

```js
const sorted_domain = (() => {
  const alders = d3.union(co_sponsorships.map((d) => d.primary));
  const reduced_factors = factors.filter((d) => alders.has(d.name));
  return reduced_factors
    .sort((a, b) => a[`factor ${factor}`] - b[`factor ${factor}`])
    .map((d) => d.name);
})();
```

```js
const co_sponsorships = (() => {
  const weight_lookup = d3.rollup(
    co_sponsorships_sparse,
    (v) => v[0],
    (d) => d.primary,
    (d) => d.cosponsor
  );
  const alders = Array.from(
    new Set(co_sponsorships_sparse.map((d) => d.primary))
  );
  return alders
    .map((d) =>
      alders.map((e) => ({
        primary: d,
        cosponsor: e,
        count: weight_lookup.get(d).get(e)?.cnt || 0
      }))
    )
    .flat();
})();
```

```js
// Datasette truncates JSON at 1000 rows, so stream the full result set as CSV
// (what the original client did) and parse it.
const chicago_council = (sql) =>
  fetch(
    "https://puddle.datamade.us/chicago_council.csv?_stream=on&sql=" +
      encodeURIComponent(sql),
  )
    .then((r) => r.text())
    .then((csv) => d3.csvParse(csv, d3.autoType));
```

```js
// Inlined from @fgregg/city-council-ideology: an SVD factor analysis of which
// aldermen co-sponsor the same bills, giving each an ideology-like score used
// to order the matrix below.
const co_sponsored_bills_sparse = await chicago_council(`
  with co_sponsored_bills as (
    select bill_id
    from billsponsorship as sponsorship
      inner join bill on bill.id = bill_id
      inner join legislativesession on legislative_session_id = legislativesession.id
    where legislativesession.identifier = '2023'
    group by bill_id having count(*) > 1
  )
  select bill.identifier, sponsorship.name, 1 as sponsoring
  from billsponsorship as sponsorship
    inner join bill on bill.id = bill_id
  where bill_id in (select bill_id from co_sponsored_bills);
`);
```

```js
const cci_alders = Array.from(
  new Set(co_sponsored_bills_sparse.map((d) => d.name)),
);
```

```js
const cci_bills = Array.from(
  new Set(co_sponsored_bills_sparse.map((d) => d.identifier)),
);
```

```js
const A = (() => {
  const lookup = d3.rollup(
    co_sponsored_bills_sparse,
    (v) => 1,
    (d) => d.name,
    (d) => d.identifier,
  );
  return new ml.Matrix(
    cci_alders.map((d) => cci_bills.map((e) => lookup.get(d).get(e) || 0)),
  );
})();
```

```js
const SVD = new ml.SingularValueDecomposition(A);
```

```js
const factors = d3
  .zip(cci_alders, ...SVD.U.transpose().data)
  .map((d) =>
    Object.fromEntries(
      d3.zip(["name", ...d3.range(63).map((i) => `factor ${i}`)], d),
    ),
  )
  .sort((a, b) => a["factor 1"] - b["factor 1"]);
```

```js
const ml = await import("https://esm.sh/ml-matrix");
```

