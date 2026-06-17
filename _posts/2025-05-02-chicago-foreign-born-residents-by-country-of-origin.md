---
title: Chicago Foreign-Born Residents by Country of Origin
author: Forest Gregg
layout: post
date: 2025-05-02
description: Chicago foreign-born residents by country of origin over time, from live ACS data, faceted by country.
reactive: true
---

```js
display(md`We can get a sense of international immigration flows by looking at the people living in Chicago who were born in other countries between 2005 and ${last_year}. Increases in these populations are due to immigration, declines are due to emigration and deaths.

[Fourteen foreign countries each contribute more than 1% of the 2020 Chicago foreign-born population](https://censusreporter.org/data/table/?table=B05006&geo_ids=16000US1714000&primary_geo_id=16000US1714000): Mexico, China, Poland, India, Philippines, Guatemala, Ecuador, Nigeria, South Korea, Vietnam, Ukraine, Colombia, Pakistan, and Canada.

The number of Chicago residents born in Mexico has been declining, but they still make up the vast plurality of Chicago's foreign-born residents.`);
```

```js
display(
Plot.plot({
  width: 200,
  height: 200,
  y: {
    grid: true,
    tickFormat: "2s",
    nice: true,
    label: "people"
  },
  marks: [
    Plot.frame(),
    Plot.line(data, {
      filter: (d) => d.country === "Mexico",
      x: (d) => new Date(d.year.toString()),
      y: "value",
      stroke: "country",
      title: "country"
    })
  ]
})
);
```

Here are the trends for the other 13 countries.

```js
display(
Plot.plot({
  y: {
    grid: true,
    tickFormat: "2s",
    nice: true,
    label: "people"
  },
  fx: { axis: null },
  fy: { axis: null },
  marks: [
    Plot.frame(),
    Plot.line(without_mexico, {
      x: (d) => new Date(d.year.toString()),
      y: "value",
      stroke: "country",
      title: "country",
      fx: (d) => fxy(d.country)[0],
      fy: (d) => fxy(d.country)[1],
      tip: true
    }),
    Plot.text(
      without_mexico,
      Plot.selectFirst({
        text: (d) =>
          d.country === "China, excluding Hong Kong and Taiwan"
            ? "China"
            : d.country === "Korea"
            ? "South Korea"
            : d.country,
        x: new Date(last_year.toString()),
        y: 55000,
        dx: -4,
        textAnchor: "end",
        fontWeight: "bold",
        fx: (d) => fxy(d.country)[0],
        fy: (d) => fxy(d.country)[1]
      })
    )
  ]
})
);
```

```js
// Inlined from @fgregg/census-api-helper-functions — live ACS pulls from
// census-api.bunkum.us (proxy that fixes CORS for the Census API).
const fetchCensusGroup = async function (
  year,
  base_var,
  place_fips = "14000",
  state = "17",
  expand_var = false,
) {
  const response = await fetch(
    `https://census-api.bunkum.us/data/${year}/acs/acs1?get=NAME,group(${base_var})&for=place:${place_fips}&in=state:${state}`,
  );
  const data = await response.json();
  const zipped = d3.zip(...data);
  const geography = zipped.find((d) => d[0] === "NAME")[1];
  const vars = zipped
    .filter((d) => d[0] !== "NAME")
    .map(([variable, value]) => ({ year, geography, variable, value: Number(value) }));
  if (expand_var) {
    const var_response = await fetch(
      `https://census-api.bunkum.us/data/${year}/acs/acs1/groups/${base_var}.json`,
    );
    const var_data = await var_response.json();
    return vars.map((d) => ({ ...d, variable_definition: var_data.variables[d.variable] }));
  }
  return vars;
};
```

```js
const censusChicagoGroupYears = async (base_var, start = 2005, stop = 2021, expand_var = false) => {
  const variables_promises = d3
    .range(start, stop + 1)
    .filter((d) => d !== 2020)
    .map((year) => fetchCensusGroup(year, base_var, "14000", "17", expand_var));
  return (await Promise.all(variables_promises)).flat();
};
```

```js
display(
data.filter((d) => d.country === "Mexico")
);
```

```js
const raw_data = censusChicagoGroupYears("B05006", 2005, last_year, true);
```

```js
const data = raw_data
  .map((d) => ({
    ...d,
    country: one_percenters.find((e) =>
      d.variable_definition?.label.endsWith(e)
    )
  }))
  .filter((d) => d.country)
  .filter((d) => d.variable.endsWith("E"));
```

```js
const without_mexico = data.filter((d) => d.country !== "Mexico");
```

```js
const one_percenters = raw_data
  .filter(
    (d) =>
      d.year === last_year &&
      d.value / total >= 0.01 &&
      d.variable.endsWith("E")
  )
  .map(
    (d) =>
      d.variable_definition?.label.split("!!")[
        d.variable_definition?.label.split("!!").length - 1
      ]
  )
  .filter((d) => d && !d?.endsWith(":"));
```

```js
const total = raw_data.find(
  (d) => d.variable_definition?.label === "Estimate!!Total:" && d.year === last_year
).value;
```

```js
const last_year = 2023;
```

```js
// The original used a patched Plot from @fil/plot-early-bird that adds a facet
// "columns" option. Using the built-in Plot instead and wrapping facets by
// hand: order countries by their latest value (matching the original sort) and
// lay them out in a 4-column grid via computed fx/fy.
const facet_cols = 4;
const country_order = Array.from(
  d3.rollup(
    without_mexico,
    (v) => d3.greatest(v, (d) => d.year)?.value ?? 0,
    (d) => d.country,
  ),
)
  .sort((a, b) => b[1] - a[1])
  .map(([country]) => country);
const fxy = (country) => {
  const i = country_order.indexOf(country);
  return [i % facet_cols, Math.floor(i / facet_cols)];
};
```

