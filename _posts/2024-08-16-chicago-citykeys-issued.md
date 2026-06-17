---
title: Chicago CityKeys issued
author: Forest Gregg
layout: post
date: 2024-08-16
description: Cumulative CityKeys (Chicago municipal ID cards) issued by year, from public-records data — and how this year tracks against prior years to date.
reactive: true
---

This chart shows the cumulative number of CityKeys—Chicago municipal id cards—issued by the City Clerk by year.

Texas started paying for busses to take asylum seekers to Chicago in August 2022, and tens of thousands of asylum seekers have come to Chicago since then.

Thus data comes from a [couple of](https://www.muckrock.com/foi/chicago-169/2024-budget-request-153214/#comm-1593169) [public records requests](https://www.muckrock.com/foi/chicago-169/number-of-citykey-cards-issued-pre-2021-153395/?#comm-1596706) to the Clerk’s office. 

The CityKey program exists to provide government-issued identification to all Chicago residents, regardless of immigration status. In order to protect Chicagoans, no personally identifying information is recorded in a database when the CityKey is created. 

As a consequence, detailed data on the types of people who have received a CityKey is not possible to calculate because that potentially risky information is purposefully not recorded.

```js
display(
Plot.plot({
  title: "City Keys printed, cumulative by year",
  color: { type: "categorical", legend: true },
  y: { grid: true },
  x: {
    transform: (d) => d3.utcDay.offset(d, (2000 - d.getUTCFullYear()) * 365.24),
    tickFormat: "%b",
    line: true
  },
  marginLeft: 50,
  marginRight: 30,
  marks: [
    Plot.ruleY([0]),
    Plot.lineY(
      citykeys,
      Plot.mapY("cumsum", {
        x: "date",
        y: "# of cards printed in year",
        z: ({ date }) => date.getUTCFullYear(),
        curve: "step-before",
        stroke: ({ date }) => date.getUTCFullYear().toString(),
        tip: true
      })
    ),
    Plot.text(
      citykeys,
      Plot.selectLast(
        Plot.mapY("cumsum", {
          x: "date",
          y: "# of cards printed in year",
          z: ({ date }) => date.getUTCFullYear(),
          text: ({ date }) => date.getUTCFullYear().toString(),
          textAnchor: "start",
          dx: 3,
          dy: -2
        })
      )
    )
  ]
})
);
```

```js
// Was a SQL summary table. Cards per year: the full-year total, plus the
// year-to-date count through the same calendar day as the latest data point
// (so the current, partial year compares like-for-like with past years).
const citykeys_by_year = (() => {
  const last = d3.max(citykeys, (d) => d.date);
  const beforeCutoff = (d) =>
    d.getUTCMonth() < last.getUTCMonth() ||
    (d.getUTCMonth() === last.getUTCMonth() &&
      d.getUTCDate() <= last.getUTCDate());
  return d3
    .rollups(
      citykeys,
      (v) => ({
        "year to date": d3.sum(
          v.filter((d) => beforeCutoff(d.date)),
          (d) => d["# of cards printed in year"],
        ),
        total: d3.sum(v, (d) => d["# of cards printed in year"]),
      }),
      (d) => d.date.getUTCFullYear(),
    )
    .map(([year, o]) => ({ year, ...o }))
    .sort((a, b) => b.year - a.year);
})();
```

```js
display(table(citykeys_by_year));
```

```js
// Tom MacWright's table component, vendored in the reactive runtime build.
const table = (await import("/assets/js/toms-table.js")).default;
```

```js
display(
Plot.plot({
  y: { grid: true, label: "total cards issued" },
  x: { grid: true },
  marginLeft: 50,
  marginRight: 30,
  marks: [
    Plot.ruleY([0]),
    Plot.lineY(
      citykeys.sort((a, b) => a.date.getTime() - b.date.getTime()),
      Plot.mapY("cumsum", {
        x: "date",
        y: "# of cards printed in year",
        curve: "step-before"
      })
    )
  ]
})
);
```

```js
const citykeys = d3.csv(
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRLE--30syJggc-fvgMBthVPj_hu7jRQJAJaFmtEZL83qsPi8AjQ51WEOgrRZd_SDlzWGRea_SIyTJp/pub?gid=435023903&single=true&output=csv",
  d3.autoType
);
```

```js
display(
citykeys[citykeys.length - 1]
);
```

