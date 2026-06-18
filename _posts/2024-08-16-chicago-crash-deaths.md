---
title: Chicago Crash Deaths
author: Forest Gregg
layout: post
date: 2024-08-16
description: Cumulative traffic deaths in Chicago by year, live from the city data portal, with each year compared to date.
reactive: true
---

This graph shows the cumulative number of deaths from crashes in Chicago. Each line represents a different year.

The graph is using live data from the [City of Chicago data portal](https://data.cityofchicago.org/Transportation/Traffic-Crashes-People/u6pd-qa9d) and should update daily.

```js
const plot = Plot.plot({
  marginRight: 30,
  caption: "Annual cumulative traffic deaths by day of years.",
  y: {
    grid: true,
    label: "Deaths"
  },
  x: {
    transform: (d) => d3.utcDay.offset(d, (2000 - d.getUTCFullYear()) * 365.24),
    tickFormat: "%b",
    line: true
  },
  color: {
    domain: [false, true],
    range: ["#ccc", "red"]
  },
  marks: [
    Plot.line(
      data,
      Plot.mapY("cumsum", {
        x: "crash_date",
        y: (d) => 1,
        z: (d) => d.crash_date.getFullYear(),
        stroke: (d) => new Date().getFullYear() === d.crash_date.getFullYear(),
        curve: "step-before"
      })
    ),
    Plot.text(
      data,
      Plot.selectLast(
        Plot.mapY("cumsum", {
          x: "crash_date",
          y: (d) => 1,
          z: (d) => d.crash_date.getFullYear(),
          text: (d) => d.crash_date.getFullYear().toString(),
          textAnchor: "start",
          dx: 3,
          dy: -2
        })
      )
    )
  ]
});
```

```js
display(plot);
```

```js
// Was a SQL-over-array summary. Deaths per year: total, plus year-to-date
// through the same calendar day as the most recent crash (like-for-like).
const deaths_by_year = (() => {
  const last = d3.max(data, (d) => d.crash_date);
  const beforeCutoff = (d) =>
    d.getMonth() < last.getMonth() ||
    (d.getMonth() === last.getMonth() && d.getDate() <= last.getDate());
  return d3
    .rollups(
      data,
      (v) => ({
        "year to date": v.filter((d) => beforeCutoff(d.crash_date)).length,
        total: v.length,
      }),
      (d) => d.crash_date.getFullYear(),
    )
    .map(([year, o]) => ({ year, ...o }))
    .sort((a, b) => b.year - a.year);
})();
```

```js
display(htmlTable(deaths_by_year));
```

```js
// Standard HTML table (picks up the site table CSS); wrapped for horizontal
// scroll on narrow screens.
const htmlTable = (rows) => {
  const cols = rows.length ? Object.keys(rows[0]) : [];
  return html`<div style="overflow-x: auto">
    <table>
      <thead>
        <tr>
          ${cols.map((c) => html`<th>${c}</th>`)}
        </tr>
      </thead>
      <tbody>
        ${rows.map(
          (r) => html`<tr>
            ${cols.map((c) => html`<td>${r[c]}</td>`)}
          </tr>`,
        )}
      </tbody>
    </table>
  </div>`;
};
```

```js
// ~5,000 fatal-crash records — too many rows for a plain table, so Tom's.
const table = (await import("/assets/js/toms-table.js")).default;
```

```js
display(table(data));
```

```js
const data = raw_data
  .map((d) => ({
    ...d,
    crash_date: new Date(d.crash_date)
  }))
  .filter((d) => d.crash_date.getFullYear() > 2016)
  .sort((a, b) => a.crash_date - b.crash_date);
```

```js
const raw_data = fetch(
  "https://data.cityofchicago.org/resource/u6pd-qa9d.json?$where=INJURY_CLASSIFICATION='FATAL'&$order=crash_date&$limit=5000"
).then((response) => response.json());
```

