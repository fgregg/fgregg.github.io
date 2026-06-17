---
title: CPS Decline and Market Share
author: Forest Gregg
layout: post
date: 2022-09-22
description: Why CPS enrollment is falling — fewer school-age children in Chicago, not a flight to private schools — from ACS, PUMS, and CPS data.
reactive: true
---

```js
display(md`
The decline in CPS enrollment is due mainly to there being fewer children living
in Chicago, and not families choosing to send their children to Catholic or
other private schools. The market share of CPS vs private schools has remained
fairly constant over the past 15 years.

The market share data comes from the American Community Survey, where
respondents are
[asked about about the schooling for each member of their household](https://censusreporter.org/topics/education/).

The survey question is as follows:
<img src="/assets/data/cps-decline-and-market-share/census-school-question.png" alt="drawing" width="400"/>
`);
```

### Census School Age Children vs CPS K-12 Enrollment

```js
display(
  Plot.plot({
    marginRight: 75,
    y: {
      grid: true,
      tickFormat: "2s",
      nice: true,
    },
    x: {
      nice: true,
    },
    marks: [
      Plot.line(
        school_age_years.filter((d) => d.race === "Total"),
        {
          x: (d) => new Date(d.year.toString()),
          y: "count",
          stroke: "type",
        },
      ),
      Plot.text(
        school_age_years.filter((d) => d.race === "Total"),
        Plot.selectMaxX({
          x: (d) => new Date(d.year.toString()),
          y: "count",
          z: "type",
          text: (d) => (d.type === "enrollment" ? "Enrollment" : "Population"),
          textAnchor: "start",
          dy: 5,
          dx: 5,
        }),
      ),
    ],
  }),
);
```

### CPS vs Private Market Share

```js
display(
  Plot.plot({
    color: {
      legend: true,
    },
    y: {
      grid: true,
      nice: true,
      percent: true,
      label: "Market %",
    },
    marks: [
      Plot.areaY(collapse_enrollment, {
        x: (d) => new Date(d.year.toString()),
        y: "count",
        z: "type",
        fill: "type",
        offset: "expand",
      }),
    ],
  }),
);
```

### By Race and Ethnicity

```js
display(
  Plot.plot({
    color: {
      legend: true,
    },
    facet: {
      data: pums_enrolled,
      x: "race",
    },
    y: {
      grid: true,
      nice: true,
      percent: true,
      label: "Market %",
    },
    marks: [
      Plot.areaY(pums_enrolled, {
        x: (d) => new Date(d.year),
        y: "count",
        z: "type",
        fill: "type",
        offset: "expand",
        reverse: true,
      }),
    ],
  }),
);
```

```js
const acs_enrollment_share = school_age_years
  .filter((d) => d.type === "acs")
  .map(({ count, type, ...d }) => ({
    ...d,
    acs: count,
    enrollment: school_age_years.find(
      (e) => e.race === d.race && e.type === "enrollment" && e.race === d.race,
    ).count,
  }))
  .map((d) => ({ ...d, share: d.enrollment / d.acs }));
```

```js
const school_age_years_race = school_age_years.filter(
  (d) => d.race !== "Total",
);
```

```js
const school_age_years = [
  ...total_census.map((d) => ({ ...d, type: "acs" })),
  ...race_totals.map((d) => ({ ...d, type: "enrollment" })),
].filter((d) => d.year > 2004 && d.year < 2022);
```

```js
const total_census = d3
  .flatRollup(
    census_age.filter((d) => d.start > 0),
    (v) => d3.sum(v, (d) => d.count),
    (d) => d.race,
    (d) => d.year,
  )
  .map((d) => Object.fromEntries(d3.zip(["race", "year", "count"], d.flat())));
```

```js
const race_totals = d3
  .flatRollup(
    cps_demo_data.filter((d) =>
      new Set([
        ...d3.range(0, 13),
        "Full-Day Kindergarten",
        "Half-Day Kindergarten",
      ]).has(d.grade),
    ),
    (v) => d3.sum(v, (d) => d.count),
    (d) => d.year,
    (d) =>
      new Set(["African American", "Hispanic", "white", "Total"]).has(d.race)
        ? d.race
        : "other",
  )
  .map(([year, race, count]) => ({ year, race, count }));
```

```js
const census_age = [
  ...census_age_no_other,
  ...d3
    .flatRollup(
      census_age_no_other,
      (v) => d3.sum(v, (d) => (d.race === "Total" ? d.count : -d.count)),
      (d) => d.start,
      (d) => d.end,
      (d) => d.year,
    )
    .map(([start, stop, year, count]) => ({
      race: "other",
      start,
      stop,
      year,
      count,
    })),
];
```

```js
const census_age_no_other = censusAge(census_variables);
```

```js
const census_variables = [
  {
    race: "Total",
    census_group: "B01001",
    age_vars: [
      { sex: "male", start: 0, end: 4, variable: "B01001_003E" },
      { sex: "male", start: 5, end: 9, variable: "B01001_004E" },
      { sex: "male", start: 10, end: 14, variable: "B01001_005E" },
      { sex: "male", start: 15, end: 17, variable: "B01001_006E" },
      { sex: "male", start: 18, end: 19, variable: "B01001_007E" },
      { sex: "female", start: 0, end: 4, variable: "B01001_027E" },
      { sex: "female", start: 5, end: 9, variable: "B01001_028E" },
      { sex: "female", start: 10, end: 14, variable: "B01001_029E" },
      { sex: "female", start: 15, end: 17, variable: "B01001_030E" },
      { sex: "female", start: 18, end: 19, variable: "B01001_031E" },
    ],
  },
  {
    race: "African American",
    census_group: "B01001B",
    age_vars: [
      { sex: "male", start: 0, end: 4, variable: "B01001B_003E" },
      { sex: "male", start: 5, end: 9, variable: "B01001B_004E" },
      { sex: "male", start: 10, end: 14, variable: "B01001B_005E" },
      { sex: "male", start: 15, end: 17, variable: "B01001B_006E" },
      { sex: "male", start: 18, end: 19, variable: "B01001B_007E" },
      { sex: "female", start: 0, end: 4, variable: "B01001B_018E" },
      { sex: "female", start: 5, end: 9, variable: "B01001B_019E" },
      { sex: "female", start: 10, end: 14, variable: "B01001B_020E" },
      { sex: "female", start: 15, end: 17, variable: "B01001B_021E" },
      { sex: "female", start: 18, end: 19, variable: "B01001B_022E" },
    ],
  },
  {
    race: "white",
    census_group: "B01001H",
    age_vars: [
      { sex: "male", start: 0, end: 4, variable: "B01001H_003E" },
      { sex: "male", start: 5, end: 9, variable: "B01001H_004E" },
      { sex: "male", start: 10, end: 14, variable: "B01001H_005E" },
      { sex: "male", start: 15, end: 17, variable: "B01001H_006E" },
      { sex: "male", start: 18, end: 19, variable: "B01001H_007E" },
      { sex: "female", start: 0, end: 4, variable: "B01001H_018E" },
      { sex: "female", start: 5, end: 9, variable: "B01001H_019E" },
      { sex: "female", start: 10, end: 14, variable: "B01001H_020E" },
      { sex: "female", start: 15, end: 17, variable: "B01001H_021E" },
      { sex: "female", start: 18, end: 19, variable: "B01001H_022E" },
    ],
  },
  {
    race: "Hispanic",
    census_group: "B01001I",
    age_vars: [
      { sex: "male", start: 0, end: 4, variable: "B01001I_003E" },
      { sex: "male", start: 5, end: 9, variable: "B01001I_004E" },
      { sex: "male", start: 10, end: 14, variable: "B01001I_005E" },
      { sex: "male", start: 15, end: 17, variable: "B01001I_006E" },
      { sex: "male", start: 18, end: 19, variable: "B01001I_007E" },
      { sex: "female", start: 0, end: 4, variable: "B01001I_018E" },
      { sex: "female", start: 5, end: 9, variable: "B01001I_019E" },
      { sex: "female", start: 10, end: 14, variable: "B01001I_020E" },
      { sex: "female", start: 15, end: 17, variable: "B01001I_021E" },
      { sex: "female", start: 18, end: 19, variable: "B01001I_022E" },
    ],
  },
];
```

```js
const censusAge = async (variables) => {
  const data = await censusGroupYears(variables);
  return collapse_sex(reshapeAge(data));
};
```

```js
const collapse_sex = (ages) =>
  d3
    .flatRollup(
      ages.flat(),
      (v) => d3.sum(v, (d) => d.count),
      (d) => d.race,
      (d) => d.start,
      (d) => d.end,
      (d) => d.year,
    )
    .map(([race, start, stop, year, count]) => ({
      race,
      start,
      stop,
      year,
      count,
    }));
```

```js
const collapse_enrollment = d3
  .flatRollup(
    census_enrollment_by_grade_group,
    (v) => d3.sum(v, (d) => d.count),
    (d) => d.type,
    (d) => d.year,
  )
  .map(([type, year, count]) => ({
    type,
    year,
    count,
  }));
```

```js
const reshapeAge = (data) =>
  data.map((d) =>
    d.age_vars
      .map((age_var) =>
        d.census_data.map((e) => ({
          ...age_var,
          race: d.race,
          year: e.year,
          count: e[age_var.variable],
        })),
      )
      .flat(),
  );
```

```js
const censusGroupYears = async (variables, start = 2005, stop = 2022) => {
  for (const variable of variables) {
    variable.census_data = [];
    for (const year of d3.range(start, stop)) {
      if (year !== 2020) {
        const census_group = await fetchCensusGroup(
          year,
          variable.census_group,
        );
        variable.census_data.push(census_group);
      }
    }
  }
  return variables;
};
```

```js
const fetchCensusGroup = async function (year, base_var = "B01001") {
  const response = await fetch(
    `https://census-api.bunkum.us/data/${year}/acs/acs1?get=NAME,group(${base_var})&for=place:14000&in=state:17`,
  );
  const data = await response.json();
  const data_obj = Object.fromEntries(d3.zip(...data));
  data_obj.year = year;
  return data_obj;
};
```

```js
const census_enrollment_by_grade_group = (() => {
  let d = raw_census_enrollment[0];
  return d.grade_vars
    .map((grade_var) =>
      d.census_data.map((e) => ({
        ...grade_var,
        type: grade_var.type,
        year: e.year,
        count: e[grade_var.variable],
      })),
    )
    .flat();
})();
```

```js
const raw_census_enrollment = censusGroupYears([enrollment_variable]);
```

```js
const enrollment_variable = {
  census_group: "B14002",
  grade_vars: [
    { type: "public", sex: "male", start: 0, end: 0, variable: "B14002_008E" },
    { type: "private", sex: "male", start: 0, end: 0, variable: "B14002_009E" },
    { type: "public", sex: "male", start: 1, end: 4, variable: "B14002_011E" },
    { type: "private", sex: "male", start: 1, end: 4, variable: "B14002_012E" },
    { type: "public", sex: "male", start: 5, end: 8, variable: "B14002_014E" },
    { type: "private", sex: "male", start: 5, end: 8, variable: "B14002_015E" },
    { type: "public", sex: "male", start: 9, end: 12, variable: "B14002_017E" },
    {
      type: "private",
      sex: "male",
      start: 9,
      end: 12,
      variable: "B14002_018E",
    },

    {
      type: "public",
      sex: "female",
      start: 0,
      end: 0,
      variable: "B14002_032E",
    },
    {
      type: "private",
      sex: "female",
      start: 0,
      end: 0,
      variable: "B14002_033E",
    },
    {
      type: "public",
      sex: "female",
      start: 1,
      end: 4,
      variable: "B14002_035E",
    },
    {
      type: "private",
      sex: "female",
      start: 1,
      end: 4,
      variable: "B14002_036E",
    },
    {
      type: "public",
      sex: "female",
      start: 5,
      end: 8,
      variable: "B14002_038E",
    },
    {
      type: "private",
      sex: "female",
      start: 5,
      end: 8,
      variable: "B14002_039E",
    },
    {
      type: "public",
      sex: "female",
      start: 9,
      end: 12,
      variable: "B14002_041E",
    },
    {
      type: "private",
      sex: "female",
      start: 9,
      end: 12,
      variable: "B14002_042E",
    },
  ],
};
```

```js
// Inlined from @fgregg/chicago-public-school-enrollment-projections so the data
// stays live: the CPS demographic CSV straight from its Google Sheet.
const cps_demo_data = d3.csv(
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSlDJgyBRmDGBdhVi_fWU6bxprkLZrKrW2YNvGW1hVToXRz9kWQvAPM2UVh28sGMjqfL_1nBNUrjHbl/pub?gid=1346209997&single=true&output=csv",
  d3.autoType,
);
```

```js
const pums_enrolled = pums_enrollment.filter((d) => d.type !== "not enrolled");
```

```js
const pums_enrollment = d3.csv(
  "/assets/data/cps-decline-and-market-share/pums_enrollment.csv",
  d3.autoType,
);
```
