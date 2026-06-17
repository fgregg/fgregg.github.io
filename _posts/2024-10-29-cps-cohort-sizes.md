---
title: CPS Cohort sizes
author: Forest Gregg
layout: post
date: 2024-10-29
description: CPS enrollment cohorts traced from kindergarten through 12th grade by race/ethnicity, showing where cohorts shrink (and the grade-retention bumps).
reactive: true
---

Each line represents a cohort of students that started kindergarten in a given year.

```js
const radio = view(Inputs.radio(
  ["Total", "African American", "Hispanic", "other", "white"],
  { label: "Select ar racial or ethnic group", value: "Total" }
));
```

```js
const normalize = view(Inputs.toggle({
  label: "Normalize on first grade",
  value: false
}));
```

```js
display(
Plot.plot({
  marginRight: 50,
  y: {
    grid: true,
    tickFormat: "2s",
    label: normalize ? "relative cohort size" : "cohort size"
  },
  x: {
    domain: [0, 12],
    nice: true
  },
  marks: [
    Plot.line(
      cohort_data.filter((d) =>
        d.race === radio && d.cohort > 2011 && d.grade >= normalize ? 1 : 0
      ),
      normalizer({
        x: "grade",
        y: "count",
        z: "cohort",
        stroke: "cohort",
        tip: true
      })
    ),
    Plot.text(
      cohort_data.filter((d) =>
        d.race === radio && d.cohort > 2011 && d.grade >= normalize ? 1 : 0
      ),
      Plot.selectLast(
        normalizer({
          x: "grade",
          y: "count",
          z: "cohort",
          text: (d) => d.cohort.toString(),
          textAnchor: "start",
          dx: 3
        })
      )
    )
  ]
})
);
```

There's a peak at 3rd grade and 10th grade due to grade-retention. Here's the same data with 3rd grade and 10th grade excluded.

```js
display(
Plot.plot({
  y: {
    grid: true,
    tickFormat: "2s",
    label: normalize ? "relative cohort size" : "cohort size"
  },
  x: {
    domain: [0, 12],
    nice: true
  },
  marks: [
    Plot.line(
      cohort_data.filter((d) =>
        d.race === radio &&
        d.cohort > 2011 &&
        d.grade !== 3 &&
        d.grade !== 10 &&
        d.grade >= normalize
          ? 1
          : 0
      ),
      normalizer({
        x: "grade",
        y: "count",
        z: "cohort",
        stroke: "cohort"
      })
    ),
    Plot.text(
      cohort_data.filter((d) =>
        d.race === radio &&
        d.cohort > 2011 &&
        d.grade != 3 &&
        d.grade !== 10 &&
        d.grade >= normalize
          ? 1
          : 0
      ),
      Plot.selectLast(
        normalizer({
          x: "grade",
          y: "count",
          z: "cohort",
          text: (d) => d.cohort.toString(),
          textAnchor: "start",
          dx: 3
        })
      )
    )
  ]
})
);
```

Comparison of relative cohort trajectories by race and ethnicity.

```js
display(
Plot.plot({
  y: {
    grid: true,
    tickFormat: "2s",
    label: "relative cohort size"
  },
  x: {
    domain: [0, 12],
    nice: true
  },
  marks: [
    Plot.line(
      cohort_data.filter((d) =>
        d.race !== "Total" &&
        d.cohort > 2011 &&
        d.grade !== 3 &&
        d.grade !== 10 &&
        d.grade >= normalize
          ? 1
          : 0
      ),
      Plot.normalizeY({
        x: "grade",
        y: "count",
        z: "cohort",
        stroke: "cohort",
        fx: "race"
      })
    )
  ]
})
);
```

```js
const normalizer = normalize ? Plot.normalizeY : (x) => x;
```

```js
const cohort_data = Array.from(new Set(grade_data.map((d) => d.year)))
  .map((cohort_year) =>
    d3
      .range(cohort_year, cohort_year + 13)
      .map((year, i) =>
        grade_data
          .filter((e) => e.year == year && e.grade == i)
          .map((f) => ({ cohort: cohort_year, ...f }))
      )
      .flat()
  )
  .flat();
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

