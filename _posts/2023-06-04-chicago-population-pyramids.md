---
title: Chicago Population Pyramids
author: Forest Gregg
layout: post
date: 2023-06-04
description: Age-sex population pyramids for Chicago over time, overall and by race/ethnicity, from live ACS data.
reactive: true
---

This notebook shows the [population pyramids](https://en.wikipedia.org/wiki/Population_pyramid) for different racial and ethnic groups in Chicago. The default year is for 2021, but you can select previous years back to 2005.<sup>*</sup>

The data comes from the [American Community Survey](https://censusreporter.org/tables/B01001/). 


<sup>*</sup> Data from the survey is not available for 2020, so data for that year duplicates the 2021 data.

## Population pyramid for all Chicagoans

```js
const year_total = view(Inputs.range([2005, 2021], {
  label: "Year",
  step: 1,
  value: 2021
}));
```

```js
display(
Plot.plot({
  x: {
    label: "← men · population · women →",
    labelAnchor: "center",
    tickFormat: Math.abs,
    domain: [-30000, 30000]
  },
  y: { grid: true },
  width: 300,
  marks: [
    Plot.rectX(ages, {
      y: "ageLower",
      y2: "ageUpper",
      x: (d) =>
        (d.value / (d.ageUpper - d.ageLower)) * (d.sex === "Male" ? -1 : 1),
      filter: (d) =>
        (year_total === 2020 ? d.year === 2021 : d.year === year_total) &&
        d.race === "total",
      fill: "#989D9E"
    }),
    Plot.ruleY([0]),
    Plot.ruleX([0], { stroke: "white" })
  ]
})
);
```

## Population Pyramids for Black, Latino and white Chicagoans

```js
const year = view(Inputs.range([2005, 2021], {
  label: "Year",
  step: 1,
  value: 2021
}));
```

```js
display(
Plot.plot({
  facet: { data: ages_san_asians, x: "race" },
  fx: { axis: "top", padding: 0.4, label: "" },
  x: {
    label: "← men · population · women →",
    labelAnchor: "center",
    tickFormat: Math.abs,
    domain: [-10000, 10000]
  },
  y: { grid: true, label: "age" },
  marks: [
    Plot.rectX(ages_san_asians, {
      y: "ageLower",
      y2: "ageUpper",
      x: (d) =>
        (d.value / (d.ageUpper - d.ageLower)) * (d.sex === "Male" ? -1 : 1),
      filter: (d) => (year === 2020 ? d.year === 2021 : d.year === year),
      fill: "#989D9E"
    }),
    Plot.ruleY([0]),
    Plot.ruleX([0], { stroke: "white" })
  ]
})
);
```

## Population Pyramid for Asian Chicagoans

```js
const year_asian = view(Inputs.range([2005, 2021], {
  label: "Year",
  step: 1,
  value: 2021
}));
```

```js
display(
Plot.plot({
  x: {
    label: "← men · population · women →",
    labelAnchor: "center",
    tickFormat: Math.abs,
    domain: [-2500, 2500]
  },
  y: { grid: true },
  width: 300,
  marks: [
    Plot.rectX(ages, {
      y: "ageLower",
      y2: "ageUpper",
      x: (d) =>
        (d.value / (d.ageUpper - d.ageLower)) * (d.sex === "Male" ? -1 : 1),
      filter: (d) =>
        (year_asian === 2020 ? d.year === 2021 : d.year === year_asian) &&
        d.race === "Asian",
      fill: "#989D9E"
    }),
    Plot.ruleY([0]),
    Plot.ruleX([0], { stroke: "white" })
  ]
})
);
```

```js
const ages_san_asians = ages.filter((d) => d.race !== "Asian" && d.race != "total");
```

```js
const ages = ages_raw
  .filter(
    (d) =>
      d.variable.endsWith("E") && d.variable_definition.label.includes("year")
  )
  .map((d) => ({ ...d, ...parseLabel(d.variable_definition.label) }));
```

```js
const ages_raw = [
  ...white_ages_raw.map((d) => ({ ...d, race: "white" })),
  ...black_ages_raw.map((d) => ({ ...d, race: "Black" })),
  ...latino_ages_raw.map((d) => ({ ...d, race: "Latino" })),
  ...asian_ages_raw.map((d) => ({ ...d, race: "Asian" })),
  ...total_ages_raw.map((d) => ({ ...d, race: "total" }))
];
```

```js
const black_ages_raw = censusChicagoGroupYears("B01001B", 2005, 2021, true);
```

```js
const white_ages_raw = censusChicagoGroupYears("B01001H", 2005, 2021, true);
```

```js
const latino_ages_raw = censusChicagoGroupYears("B01001I", 2005, 2021, true);
```

```js
const asian_ages_raw = censusChicagoGroupYears("B01001D", 2005, 2021, true);
```

```js
const total_ages_raw = censusChicagoGroupYears("B01001", 2005, 2021, true);
```

```js
const parseLabel = (label) => {
  const elements = label.split("!!");
  const sex = elements[2].replace(":", "");
  const ageString = elements[3];

  var ageLower;
  var ageUpper;
  if (ageString === "Under 5 years") {
    ageLower = 0;
    ageUpper = 5;
  } else if (ageString === "85 years and over") {
    ageLower = 85;
    ageUpper = 100;
  } else if (ageString.includes(" to ")) {
    const ageElements = ageString.split(" to ");
    ageLower = parseInt(ageElements[0]);
    ageUpper = parseInt(ageElements[1].split(" ")[0]) + 1;
  } else if (ageString.includes(" and ")) {
    const ageElements = ageString.split(" and ");
    ageLower = parseInt(ageElements[0]);
    ageUpper = parseInt(ageElements[1].split(" ")[0]) + 1;
  } else {
    ageLower = parseInt(ageString.split(" ")[0]);
    ageUpper = ageLower + 1;
  }
  return { sex, ageLower, ageUpper };
};
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
    return vars.map((d) => ({
      ...d,
      variable_definition: var_data.variables[d.variable],
    }));
  }
  return vars;
};
```

```js
const censusChicagoGroupYears = async (
  base_var,
  start = 2005,
  stop = 2021,
  expand_var = false,
) => {
  const variables_promises = d3
    .range(start, stop + 1)
    .filter((d) => d !== 2020)
    .map((year) => fetchCensusGroup(year, base_var, "14000", "17", expand_var));
  return (await Promise.all(variables_promises)).flat();
};
```

