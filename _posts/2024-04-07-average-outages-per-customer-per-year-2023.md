---
title: Average days of outage per customer per year, 2021-2023
author: Forest Gregg
layout: post
date: 2024-04-07
description: Average days of power outage per customer per year (2021-2023) by US county and state, from a national outage dataset.
reactive: cellular
---

```js
display(
Plot.plot({
  style: {
    backgroundColor: "#293845"
  },
  title: "Average days of outages per customer per year by county, 2021-2023",
  color: {
    legend: true,
    label: "Average days of outage per customer",
    domain: [0, 4],
    scheme: "viridis"
  },
  projection: {
    type: "mercator",
    domain: focal_states,
    insetBottom: 100
  },

  marks: [
    Plot.geo(nation, { fill: "gray" }),
    Plot.geo(canada, { fill: "#696969" }),
    Plot.geo(counties, {
      fill: (d) =>
        average_outages_by_county.find((county) => county.fips_code == d.id)?.[
          "average days of outages per customer"
        ]
    }),
    Plot.geo(states, { stroke: "Gainsboro" }),
    Plot.geo(nation, { stroke: "gray" }),
    Plot.frame()
  ]
})
);
```

```js
display(
Plot.plot({
  title: "Average days of outages per customer per year by state, 2021-2023",
  height: 280,
  x: { domain: [0, 1.7], type: "pow" },
  marks: [
    Plot.textX(
      state_data.filter(
        (d) =>
          !["Puerto Rico", "United States Virgin Islands"].includes(d.state)
      ),
      Plot.dodgeY({
        text: (d) => stateAbbreviations.get(d.state),
        x: "average days of outages per customer",
        r: 5,
        padding: 5,
        title: (d) =>
          `${d.state}\n${d[
            "average days of outages per customer"
          ].toLocaleString()}`,
        sort: (d) => Math.random(),
        tip: true
      })
    )
  ]
})
);
```

Data from ["A dataset of recorded electricity outages by United States county 2014–2022"](https://www.nature.com/articles/s41597-024-03095-5).

```js
const focal_states = ({
  type: "FeatureCollection",
  features: states.features.filter((d) =>
    ["Michigan"].includes(d.properties.name)
  )
});
```

```js
const topojson = await import("https://esm.sh/topojson-client@3");
```

```js
// Was imported from @observablehq/plot-mapping; build from the us-atlas CDN.
const us_atlas = await fetch(
  "https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json",
).then((r) => r.json());
```

```js
const counties = topojson.feature(us_atlas, us_atlas.objects.counties);
```

```js
const states = topojson.feature(us_atlas, us_atlas.objects.states);
```

```js
const nation = topojson.feature(us_atlas, us_atlas.objects.nation);
```

```js
const canada = await fetch("/assets/data/average-outages/canada.geojson").then((r) => r.json());
```

```js
const stateAbbreviations = new Map([
  ["Alabama", "AL"],
  ["Alaska", "AK"],
  ["Arizona", "AZ"],
  ["Arkansas", "AR"],
  ["California", "CA"],
  ["Colorado", "CO"],
  ["Connecticut", "CT"],
  ["Delaware", "DE"],
  ["Florida", "FL"],
  ["Georgia", "GA"],
  ["Hawaii", "HI"],
  ["Idaho", "ID"],
  ["Illinois", "IL"],
  ["Indiana", "IN"],
  ["Iowa", "IA"],
  ["Kansas", "KS"],
  ["Kentucky", "KY"],
  ["Louisiana", "LA"],
  ["Maine", "ME"],
  ["Maryland", "MD"],
  ["Massachusetts", "MA"],
  ["Michigan", "MI"],
  ["Minnesota", "MN"],
  ["Mississippi", "MS"],
  ["Missouri", "MO"],
  ["Montana", "MT"],
  ["Nebraska", "NE"],
  ["Nevada", "NV"],
  ["New Hampshire", "NH"],
  ["New Jersey", "NJ"],
  ["New Mexico", "NM"],
  ["New York", "NY"],
  ["North Carolina", "NC"],
  ["North Dakota", "ND"],
  ["Ohio", "OH"],
  ["Oklahoma", "OK"],
  ["Oregon", "OR"],
  ["Pennsylvania", "PA"],
  ["Rhode Island", "RI"],
  ["South Carolina", "SC"],
  ["South Dakota", "SD"],
  ["Tennessee", "TN"],
  ["Texas", "TX"],
  ["Utah", "UT"],
  ["Vermont", "VT"],
  ["Virginia", "VA"],
  ["Washington", "WA"],
  ["West Virginia", "WV"],
  ["Wisconsin", "WI"],
  ["Wyoming", "WY"]
]);
```


```js
// Named Data-table cell "average_outages_by_county" (source: focal_states@3.csv).
// fips_code kept as a zero-padded string to match the county feature ids.
const average_outages_by_county = await d3
  .csv("/assets/data/average-outages/average_outages_by_county.csv", d3.autoType)
  .then((rows) =>
    rows.map((d) => ({ ...d, fips_code: String(d.fips_code).padStart(5, "0") })),
  );
```

```js
// ~740 counties — too many rows for a plain table, so Tom's.
const table = (await import("/assets/js/toms-table.js")).default;
```

```js
display(table(average_outages_by_county));
```

```js
const state_data = await d3.csv(
  "/assets/data/average-outages/states.csv",
  d3.autoType,
);
```

```js
display(table(state_data));
```
