---
title: The Cranes at Haehnle 
author: Forest Gregg
layout: post
date: 2026-10-05
description: Counting Cranes 
reactive: true
---

Most years, thousands of sandhill cranes stage at the Mud Lake Marsh in the [Phyllis Haehnle Memorial Sanctuary](https://www.jacksonaudubon.org/haehnlesanctuary) 
in late fall before their migration south. 

If the cranes decide to roost at Mud Lake, their numbers usually peak in late October or in November. Some years, 
only a handful show up, apparently preferring other roosting sites in the region.

Here are charts of the weekly crane counts at Haehnle carried out by volunteers from the [Jackson Audubon Society](https://www.jacksonaudubon.org/).

```js
display(
  Plot.plot({
    marginLeft: 50,
    marginRight: 10,
    fx: { axis: null },
    fy: { axis: null },
    x: {
      tickFormat: "%b",
      ticks: d3.utcMonth.range(
        new Date(Date.UTC(2001, 8, 1)),
        new Date(Date.UTC(2001, 11, 2)),
      ),
      label: null,
    },
    y: {
      grid: true,
      label: "cranes roosting",
    },
    marks: [
      Plot.frame({ strokeOpacity: 0.15 }),
      Plot.lineY(counts, {
        x: "season_date",
        y: "roosting",
        fx: (d) => seasons.indexOf(d.season) % 4,
        fy: (d) => Math.floor(seasons.indexOf(d.season) / 4),
        strokeWidth: 1.5,
      }),
      Plot.dot(
        season_ends.filter((d) => d.ended_at_high),
        {
          x: "season_date",
          y: "roosting",
          fx: (d) => seasons.indexOf(d.season) % 4,
          fy: (d) => Math.floor(seasons.indexOf(d.season) / 4),
          fill: "currentColor",
          r: 4,
        },
      ),
      Plot.text(
        season_ends.filter((d) => d.ended_at_high),
        {
          x: "season_date",
          y: "roosting",
          fx: (d) => seasons.indexOf(d.season) % 4,
          fy: (d) => Math.floor(seasons.indexOf(d.season) / 4),
          text: (d) =>
            complete_seasons.includes(d.season) ? "last count" : "so far",
          textAnchor: "end",
          dx: -6,
          fontSize: 9,
        },
      ),
      Plot.text(seasons, {
        fx: (d) => seasons.indexOf(d) % 4,
        fy: (d) => Math.floor(seasons.indexOf(d) / 4),
        frameAnchor: "top-left",
        dx: 6,
        dy: 6,
        text: (d) => String(d),
        fontWeight: "bold",
      }),
      Plot.tip(
        counts,
        Plot.pointerX({
          x: "season_date",
          y: "roosting",
          fx: (d) => seasons.indexOf(d.season) % 4,
          fy: (d) => Math.floor(seasons.indexOf(d.season) / 4),
          title: (d) =>
            `${d3.utcFormat("%b %-d, %Y")(d.date)}\n` +
            `${d.roosting.toLocaleString()} cranes` +
            (d.date_exact ? "" : "\n(week of)"),
        }),
      ),
    ],
  }),
);
```

### Data

Counts from 2015 on are from the weekly posts on the
[Jackson Audubon Society blog](https://jacksonaudubon.org/page-18108). Counts
from 2007 through 2014 are from Jackson Audubon's
[weekly crane count table](https://jacksonaudubon.org/resources/Documents/Haehnle/CraneCountTable-Web.pdf).

```js
const raw_counts = d3.csv(
  "/assets/data/haehnle-cranes/weekly_combined.csv",
  d3.autoType,
);
```

```js
// put every season on the same calendar so seasons line up
const to_season_date = (date) =>
  new Date(Date.UTC(2001, date.getUTCMonth(), date.getUTCDate()));
```

```js
const counts = raw_counts.map((d) => ({
  ...d,
  season_date: to_season_date(d.date),
}));
```

```js
// completed seasons only; the current one is still under way
const seasons = Array.from(new Set(counts.map((d) => d.season))).sort();
const complete_seasons = seasons.filter((s) => s < new Date().getFullYear());
```

```js
const big_seasons = complete_seasons.filter((s) =>
  counts.some((d) => d.season === s && d.roosting >= 1000),
);
```

```js
// seven-day windows starting September 1
const season_start = new Date(Date.UTC(2001, 8, 1));
const week_index = (d) =>
  Math.floor((d.season_date - season_start) / (7 * 864e5));
```

```js
const by_week = d3
  .rollups(
    counts.filter(
      (d) =>
        complete_seasons.includes(d.season) && d.season_date >= season_start,
    ),
    // a season may have two counts in one window (Sunday and Monday); take the larger
    (v) =>
      d3.rollups(
        v,
        (w) => d3.max(w, (d) => d.roosting),
        (d) => d.season,
      ),
    week_index,
  )
  .map(([i, per_season]) => ({
    start: d3.utcDay.offset(season_start, 7 * i),
    end: d3.utcDay.offset(season_start, 7 * (i + 1)),
    n: per_season.length,
    big: per_season.filter(([, c]) => c >= 1000).length,
    share: per_season.filter(([, c]) => c >= 1000).length / per_season.length,
  }))
  .filter((d) => d.n >= 5)
  .sort((a, b) => a.start - b.start);
```

```js
const peaks = complete_seasons.map((s) => {
  const peak = d3.greatest(
    counts.filter((d) => d.season === s),
    (d) => d.roosting,
  );
  return {
    ...peak,
    ended_at_high: season_ends.find((e) => e.season === s).ended_at_high,
  };
});
```

```js
// each season's last count, and whether counting stopped at the season's high
const season_ends = seasons.map((s) => {
  const rows = counts.filter((d) => d.season === s);
  const last = d3.greatest(rows, (d) => d.date);
  return {
    ...last,
    ended_at_high:
      last.roosting === d3.max(rows, (d) => d.roosting) && last.roosting > 0,
  };
});
```

```js
const mean_date = (rows) => new Date(d3.mean(rows, (d) => +d.season_date));
```
