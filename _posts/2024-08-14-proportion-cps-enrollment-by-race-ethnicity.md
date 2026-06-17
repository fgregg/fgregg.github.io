---
title: Proportion CPS Enrollment by Race / Ethnicity
author: Forest Gregg
layout: post
date: 2024-08-14
description: Chicago Public Schools enrollment by race/ethnicity over time, by grade — as counts or as proportions.
reactive: true
---

# Proportion CPS Enrollment by Race / Ethnicity

```js
const grade = view(
  Inputs.range([0, 12], {
    label: "Grade (0 is Kindergarten)",
    step: 1,
    value: 0,
  }),
);
```

```js
const offset = view(
  Inputs.radio(["count", "proportion"], { label: "Select one", value: "proportion" }),
);
```

```js
display(
  Plot.plot({
    color: { legend: true },
    marginLeft: 50,
    marks: [
      Plot.areaY(
        grade_data.filter((d) => d.grade === grade && d.race !== "Total"),
        {
          x: (d) => new Date(d.year.toString()),
          y: "count",
          fill: "race",
          tip: true,
          offset: offset === "proportion" ? "expand" : null,
        },
      ),
    ],
  }),
);
```

```js
// Inlined from @fgregg/chicago-public-school-enrollment-projections so the data
// stays live: pull the CPS demographic CSV straight from its Google Sheet.
const cps_demo_data = d3.csv(
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSlDJgyBRmDGBdhVi_fWU6bxprkLZrKrW2YNvGW1hVToXRz9kWQvAPM2UVh28sGMjqfL_1nBNUrjHbl/pub?gid=1346209997&single=true&output=csv",
  d3.autoType,
);
```

```js
// Reshape into per-grade/race/year counts (kindergarten folded into grade 0).
const grade_data = [
  ...d3
    .flatRollup(
      cps_demo_data,
      (v) => d3.sum(v, (d) => d.count),
      (d) => d.year,
      (d) =>
        new Set(["African American", "Hispanic", "white", "Total"]).has(d.race)
          ? d.race
          : "other",
      (d) => d.grade,
    )
    .map(([year, race, grade, count]) => ({ year, race, grade, count }))
    .filter((d) => new Set(d3.range(13)).has(d.grade)),
  ...d3
    .flatRollup(
      cps_demo_data.filter((d) =>
        new Set(["Full-Day Kindergarten", "Half-Day Kindergarten"]).has(d.grade),
      ),
      (v) => d3.sum(v, (d) => d.count),
      (d) => d.year,
      (d) =>
        new Set(["African American", "Hispanic", "white", "Total"]).has(d.race)
          ? d.race
          : "other",
    )
    .map(([year, race, count]) => ({ year, race, grade: 0, count })),
];
```
